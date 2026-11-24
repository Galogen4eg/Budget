import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveBudgetMode,assertBudgetPolicyOwner,resolveBudgetOpening,visibleBudgetRecords} from '../utils/familyBudgetPolicy.ts';

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
