'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {prepareTransition}=require('../budgetMigration.cjs');
function fixture(){
 return {family:{ownerId:'u1',members:['u1','u2']},actor:'u1',target:'personal',profiles:[{id:'a',userId:'u1'},{id:'b',userId:'u2'}],configs:{u1:{personalInitialBalance:100},u2:{personalInitialBalance:200}},shared:{initialBalance:300,initialBalanceDate:'2026-01-01',savingsRate:10,mandatoryExpenses:[{id:'x',memberId:'a',amount:10},{id:'y',memberId:'b',amount:20}],manualPaidExpenses:{'2026-11':['x','y']},currency:'₽'},records:[{memberId:'a'},{memberId:'b'}]};
}
test('migration isolates bills and retains shared opening without modifying amounts',()=>{
 const f=fixture(),result=prepareTransition(f);
 assert.equal(result.policy,'personal');
 assert.deepEqual(result.userPatches.u1.personalMandatoryExpenses,[f.shared.mandatoryExpenses[0]]);
 assert.deepEqual(result.userPatches.u2.personalManualPaidExpenses,{'2026-11':['y']});
 assert.equal(result.archive.initialBalance,300);
 assert.ok(result.removeShared.includes('initialBalance'));
 assert.ok(!result.removeShared.includes('currency'));
 assert.equal(f.shared.mandatoryExpenses.length,2);
});
test('only actual owner can initiate migration',()=>{
 assert.throws(()=>prepareTransition({...fixture(),actor:'u2'}),/owner/i);
});
test('unassigned transactions, ambiguous profiles and unpaid ownership block migration',()=>{
 const f=fixture();
 assert.throws(()=>prepareTransition({...f,records:[{}]}));
 assert.throws(()=>prepareTransition({...f,profiles:[...f.profiles,{id:'a2',userId:'u1'}]}));
 assert.throws(()=>prepareTransition({...f,shared:{...f.shared,mandatoryExpenses:[{id:'x'}]}}));
});
test('return uses current personal bills and restores shared configuration',()=>{
 const f=fixture(),split=prepareTransition(f);
 const result=prepareTransition({...f,family:{...f.family,budgetPolicy:'personal'},target:'family',archive:split.archive,configs:{u1:{...f.configs.u1,...split.userPatches.u1,personalMandatoryExpenses:[{id:'x',memberId:'a',amount:99}]},u2:{...f.configs.u2,...split.userPatches.u2,personalMandatoryExpenses:[],personalManualPaidExpenses:{}}}});
 assert.deepEqual(result.sharedPatch.mandatoryExpenses,[{id:'x',memberId:'a',amount:99}]);
 assert.deepEqual(result.sharedPatch.manualPaidExpenses,{'2026-11':['x']});
 assert.equal(result.sharedPatch.initialBalance,300);
});
test('missing opening and invalid reverse document block changes',()=>{
 const f=fixture();
 assert.throws(()=>prepareTransition({...f,configs:{...f.configs,u2:{}}}));
 assert.throws(()=>prepareTransition({...f,family:{...f.family,budgetPolicy:'personal'},target:'family'}));
});

test('cannot isolate transfers or debt links shared across owners',()=>{
 const f=fixture();
 assert.throws(()=>prepareTransition({...f,links:{transactions:[{id:'t',memberId:'a',linkedGoalId:'g'}],goals:[{id:'g',memberId:'b'}],debts:[]}}),/goal/i);
 assert.throws(()=>prepareTransition({...f,links:{transactions:[{id:'t',memberId:'a',linkedExpenseId:'y'}],goals:[],debts:[]}}),/obligation/i);
 assert.throws(()=>prepareTransition({...f,links:{transactions:[{id:'t',memberId:'a',category:'savings'}],goals:[],debts:[]}}),/goal/i);
});
test('unknown financial stores must be resolved before migration',()=>{
 assert.throws(()=>prepareTransition({...fixture(),unsupported:['accounts']}),/accounts/);
});

test('preflight identifies exact unlinked records without treating valid owners as missing',()=>{
 const {findUnownedFinancialRecords}=require('../budgetMigration.cjs');
 const f=fixture();
 const input={...f,links:{transactions:[{id:'t1',memberId:'old',note:'Shop',amount:12.5},{id:'t2',memberId:'a'}],goals:[{id:'g1',title:'Goal'}],debts:[{id:'d1',memberId:'b'}]},shared:{...f.shared,mandatoryExpenses:[{id:'x',memberId:'a'},{id:'z',name:'Rent'}]}};
 const rows=findUnownedFinancialRecords(input);
 assert.deepEqual(rows.map(r=>[r.kind,r.id,r.owner]),[['transactions','t1','old'],['goals','g1',null],['mandatoryExpenses','z',null]]);
 assert.equal(rows[0].amount,12.5);
 assert.deepEqual(findUnownedFinancialRecords({...input,profiles:[...f.profiles,{id:'a2',userId:'u1'}]}),[]);
 assert.equal(input.links.transactions[0].memberId,'old');
});

test('legacy subscriptions require explicit ownership and do not change amount or renewal date',()=>{
 const {findUnownedFinancialRecords}=require('../budgetMigration.cjs');
 const f=fixture(),subscription={id:'sub1',name:'Music',amount:199.99,nextPaymentDate:'2026-12-04'};
 const input={...f,links:{transactions:[],goals:[],debts:[],subscriptions:[subscription]},records:[...f.records,subscription]};
 assert.throws(()=>prepareTransition(input),/linked owner/);
 assert.deepEqual(findUnownedFinancialRecords(input).map(({kind,id,owner,amount,date})=>({kind,id,owner,amount,date})),[{kind:'subscriptions',id:'sub1',owner:null,amount:199.99,date:'2026-12-04'}]);
 const owned={...subscription,memberId:'b'};
 assert.equal(prepareTransition({...input,records:[...f.records,owned],links:{...input.links,subscriptions:[owned]}}).policy,'personal');
 assert.deepEqual(owned,{...subscription,memberId:'b'});
});

test('deleted obligations leave historical payment markers that can be archived without affecting live bills',()=>{
 const f=fixture();
 f.shared.manualPaidExpenses={'2026-10':['deleted-bill'],'2026-11':['x','deleted-bill','y']};
 const split=prepareTransition(f);
 assert.deepEqual(split.userPatches.u1.personalManualPaidExpenses,{'2026-11':['x']});
 assert.deepEqual(split.userPatches.u2.personalManualPaidExpenses,{'2026-11':['y']});
 assert.deepEqual(split.archive.__set12OrphanPaid,{'2026-10':['deleted-bill'],'2026-11':['deleted-bill']});
 assert.deepEqual(f.shared.manualPaidExpenses,{'2026-10':['deleted-bill'],'2026-11':['x','deleted-bill','y']});
 const back={...f,family:{...f.family,budgetPolicy:'personal'},target:'family',archive:split.archive,configs:{u1:split.userPatches.u1,u2:split.userPatches.u2}};
 const merged=prepareTransition(back);
 assert.deepEqual(merged.sharedPatch.manualPaidExpenses,{'2026-10':['deleted-bill'],'2026-11':['x','y','deleted-bill']});
 assert.equal('__set12OrphanPaid' in merged.sharedPatch,false);
 assert.deepEqual(merged.sharedPatch.mandatoryExpenses,f.shared.mandatoryExpenses);
 back.configs.u1.personalMandatoryExpenses.push({id:'deleted-bill',memberId:'a',amount:5});
 assert.throws(()=>prepareTransition(back),/повторно|reused/);
});
test('malformed payment history remains blocked rather than silently discarded',()=>{
 const f=fixture();
 for(const paid of [{'bad':['x']},{'2026-11':[null]},{'2026-11':'x'}]){
   assert.throws(()=>prepareTransition({...f,shared:{...f.shared,manualPaidExpenses:paid}}),/Invalid payment history/);
 }
});

test('historical transaction links remain intact without moving money or changing classification',()=>{
 const f=fixture(), t={id:'t',memberId:'a',amount:10,linkedExpenseId:'deleted'};
 const input={...f,links:{transactions:[t],goals:[],debts:[]}};
 const result=prepareTransition(input);
 assert.equal(result.historicalLinkCount,1);
 assert.equal(result.policy,'personal');
 assert.equal(t.linkedExpenseId,'deleted');
 assert.equal(t.amount,10);
});
test('existing cross-owner obligation links remain blocked and identify exact records',()=>{
 const f=fixture(),links={transactions:[{id:'t',memberId:'a',linkedExpenseId:'y',amount:20}],goals:[],debts:[]};
 const {findFinancialLinkIssues}=require('../budgetMigration.cjs');
 assert.throws(()=>prepareTransition({...f,links}),/obligation/i);
 assert.deepEqual(findFinancialLinkIssues(links,f.shared.mandatoryExpenses).map(x=>[x.id,x.targetId,x.owner,x.targetOwner]),[['t','y','a','b']]);
});

test('preflight identifies all savings issues, including missing and removed goals and different owners',()=>{
 const links={goals:[{id:'a1',memberId:'a',title:'A',currentAmount:100},{id:'b1',memberId:'b',title:'B',currentAmount:200}],debts:[],transactions:[{id:'missing',memberId:'a',category:'savings',amount:15,date:'2026-11-01'},{id:'removed',memberId:'a',linkedGoalId:'old',amount:20},{id:'other',memberId:'b',linkedGoalId:'a1',amount:30},{id:'valid',memberId:'a',linkedGoalId:'a1',amount:40},{id:'ordinary',memberId:'a',category:'food',amount:50},{id:'raw',memberId:'b',rawNote:'Пополнение копилки',amount:60}]};
 const before=structuredClone(links);
 const {findSavingsLinkIssues}=require('../budgetMigration.cjs');
 const rows=findSavingsLinkIssues(links);
 assert.deepEqual(rows.map(r=>[r.id,r.reason,r.targetId,r.owner,r.targetOwner]),[['missing','missing',null,'a',null],['removed','deleted','old','a',null],['other','owner','a1','b','a'],['raw','missing',null,'b',null]]);
 assert.deepEqual(rows[0].availableGoals,[{id:'a1',title:'A'}]);
 assert.deepEqual(rows[3].availableGoals,[{id:'b1',title:'B'}]);
 assert.equal(rows[2].targetTitle,'A');
 assert.equal(rows[0].amount,15);
 assert.deepEqual(links,before);
 assert.throws(()=>prepareTransition({...fixture(),links}),/Savings goal/);
 const fixed={...links,transactions:links.transactions.map(row=>row.id==='missing'||row.id==='removed'?{...row,linkedGoalId:'a1'}:row.id==='other'?{...row,memberId:'a'}:row.id==='raw'?{...row,linkedGoalId:'b1'}:row)};
 assert.equal(prepareTransition({...fixture(),links:fixed}).policy,'personal');
 assert.deepEqual(fixed.goals,before.goals);
 assert.deepEqual(fixed.transactions.map(row=>row.amount),before.transactions.map(row=>row.amount));
});
