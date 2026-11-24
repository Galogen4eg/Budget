import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveBudgetMode,assertBudgetPolicyOwner,resolveBudgetOpening,visibleBudgetRecords,projectPersonalFinance,partitionMandatoryPayments} from '../utils/familyBudgetPolicy.ts';

test('legacy households retain joint budget availability',()=>{
 assert.equal(effectiveBudgetMode(undefined,'family'),'family');
 assert.equal(effectiveBudgetMode(undefined,'personal'),'personal');
});
test('personal household policy overrides every personal preference',()=>{
 assert.equal(effectiveBudgetMode('personal','family'),'personal');
 assert.equal(effectiveBudgetMode('personal','personal'),'personal');
});
test('only the verified owner can change household policy',()=>{
 assert.doesNotThrow(()=>assertBudgetPolicyOwner('owner','owner'));
 assert.throws(()=>assertBudgetPolicyOwner('owner','other'));
 assert.throws(()=>assertBudgetPolicyOwner(undefined,'owner'));
});
test('strict personal visibility never includes unassigned records or another member',()=>{
 const rows=[{memberId:'a',id:1},{memberId:'b',id:2},{id:3}];
 assert.deepEqual(visibleBudgetRecords(rows,'personal','a'),[rows[0]]);
 assert.deepEqual(visibleBudgetRecords(rows,'personal',undefined),[]);
 assert.deepEqual(visibleBudgetRecords(rows,'family','a'),rows);
});
test('personal opening never inherits the shared amount or cutoff',()=>{
 const shared={amount:100000,date:'2026-01-01'};
 const personal={a:{amount:35000,date:'2026-02-01'},b:{amount:65000}};
 assert.deepEqual(resolveBudgetOpening('personal','a',shared,personal),personal.a);
 assert.deepEqual(resolveBudgetOpening('personal','b',shared,personal),personal.b);
 assert.deepEqual(resolveBudgetOpening('personal','missing',shared,personal),{amount:0});
 assert.deepEqual(resolveBudgetOpening('family','a',shared,personal),shared);
});

test('personal financial projection excludes shared balances, limits and payment status',()=>{
 const shared={initialBalance:90000,initialBalanceDate:'2025-01-01',savingsRate:20,targetMonthlyBudget:50000,manualReservedAmount:10000,categoryBudgets:{food:2000},mandatoryExpenses:[{id:'a',memberId:'a'},{id:'b',memberId:'b'},{id:'shared'}],manualPaidExpenses:{'2026-11':['a','b','shared']},personalInitialBalance:1000,personalSavingsRate:5};
 const personal=projectPersonalFinance(shared,'a');
 assert.equal(personal.initialBalance,1000);
 assert.equal(personal.initialBalanceDate,undefined);
 assert.equal(personal.savingsRate,5);
 assert.equal(personal.targetMonthlyBudget,0);
 assert.equal(personal.manualReservedAmount,0);
 assert.deepEqual(personal.categoryBudgets,{});
 assert.deepEqual(personal.mandatoryExpenses,[shared.mandatoryExpenses[0]]);
 assert.deepEqual(personal.manualPaidExpenses,{'2026-11':['a']});
 assert.equal(shared.initialBalance,90000);
 assert.equal(projectPersonalFinance(shared,undefined).initialBalance,0);
});


test('mandatory payment partition preserves amounts and historical months without cross-owner duplication',()=>{
 const expenses=[{id:'a1',memberId:'a',amount:1250},{id:'b1',memberId:'b',amount:700}];
 const paid={'2026-10':['a1','b1'],'2026-11':['b1','b1']};
 const result=partitionMandatoryPayments(expenses,paid,['a','b']);
 assert.deepEqual(result.issues,[]);
 assert.deepEqual(result.byMember.a,{mandatoryExpenses:[expenses[0]],manualPaidExpenses:{'2026-10':['a1']}});
 assert.deepEqual(result.byMember.b,{mandatoryExpenses:[expenses[1]],manualPaidExpenses:{'2026-10':['b1'],'2026-11':['b1']}});
 assert.equal(expenses.length,2);
 assert.deepEqual(paid['2026-11'],['b1','b1']);
});
test('migration detects ambiguous or invalid financial records instead of assigning them arbitrarily',()=>{
 const result=partitionMandatoryPayments([{id:'a1',memberId:'a'},{id:'a1',memberId:'b'},{id:'unknown'},{id:'c1',memberId:'c'}],{'2026-11':['unknown'],'bad':['a1']},['a','b']);
 assert.equal(result.issues.length,5);
 assert.equal(result.byMember.a.mandatoryExpenses.length,1);
 assert.equal(result.byMember.b.mandatoryExpenses.length,0);
});


test('personal payment document is authoritative and never falls back to shared obligations',()=>{
 const shared={initialBalance:90000,savingsRate:20,mandatoryExpenses:[{id:'old',memberId:'a'}],manualPaidExpenses:{'2026-11':['old']}};
 const personal={...shared,personalMandatoryExpenses:[{id:'new',memberId:'a'},{id:'foreign',memberId:'b'}],personalManualPaidExpenses:{'2026-11':['new','foreign']}};
 assert.deepEqual(projectPersonalFinance(personal,'a').mandatoryExpenses,[personal.personalMandatoryExpenses[0]]);
 assert.deepEqual(projectPersonalFinance(personal,'a').manualPaidExpenses,{'2026-11':['new']});
 assert.deepEqual(projectPersonalFinance(shared,'a').mandatoryExpenses,[]);
 assert.deepEqual(projectPersonalFinance(shared,'a').manualPaidExpenses,{});
});
