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
