import test from 'node:test';
import assert from 'node:assert/strict';
import { savingsContributionKopecks, nextSavingsGoalAmount, assertBulkDeleteSafe, savingsLinkRepairPatch } from '../utils/transactionSavingsConsistency.ts';

const expense=(id,amount,linkedGoalId='goal-1')=>({id,amount,type:'expense',category:'savings',linkedGoalId,note:'Копилка'});

test('two users contributions add to latest server-side balance without overwriting',()=>{
  let current=100;
  current=nextSavingsGoalAmount(current,0,savingsContributionKopecks(expense('a',25.1)));
  current=nextSavingsGoalAmount(current,0,savingsContributionKopecks(expense('b',10.2)));
  assert.equal(current,135.3);
});

test('editing a transaction changes only the delta from its stored server version',()=>{
  const prev=expense('a',20);
  const next=expense('a',35);
  assert.equal(nextSavingsGoalAmount(120,savingsContributionKopecks(prev),savingsContributionKopecks(next)),135);
});

test('retry of same transaction state must be idempotent',()=>{
 const tx=expense('a',55.55);
 assert.equal(nextSavingsGoalAmount(155.55,savingsContributionKopecks(tx),savingsContributionKopecks(tx)),155.55);
});

test('reversing an expense after a second user deposited money keeps second contribution',()=>{
 assert.equal(nextSavingsGoalAmount(140.5,savingsContributionKopecks(expense('a',20)),0),120.5);
});

test('withdrawals have negative savings contribution',()=>{
 const tx={id:'withdraw',amount:20.15,type:'income',category:'savings',note:'Из накоплений'};
 assert.equal(savingsContributionKopecks(tx),-2015);
});

test('bulk deletion of savings transfers must not silently orphan goal balances',()=>{
 assert.throws(()=>assertBulkDeleteSafe([expense('a',100),{id:'b',amount:30,type:'expense',category:'food',note:'Обед'}],['a','b']),/накоплен/i);
 assert.doesNotThrow(()=>assertBulkDeleteSafe([expense('a',100),{id:'b',amount:30,type:'expense',category:'food',note:'Обед'}],['b']));
});

test('new savings targets cannot go below zero when correcting older balances',()=>{
 assert.equal(nextSavingsGoalAmount(5,1000,0),0);
});

test('repairing a legacy link is metadata-only and refuses changed amounts, owners or balances',()=>{
 const row={...expense('t',12.35),memberId:'a',date:'2026-01-01',linkedGoalId:'old'};
 const expected={id:'t',owner:'a',previousGoalId:'old',amount:12.35,type:'expense',date:'2026-01-01'};
 const goal={id:'new',memberId:'a',currentAmount:132.35};
 assert.deepEqual(savingsLinkRepairPatch(row,expected,goal,goal),{linkedGoalId:'new'});
 assert.throws(()=>savingsLinkRepairPatch({...row,amount:12.36},expected,goal,goal));
 assert.throws(()=>savingsLinkRepairPatch(row,expected,{...goal,memberId:'b'},goal));
 assert.throws(()=>savingsLinkRepairPatch(row,expected,{...goal,currentAmount:132.36},goal));
 assert.throws(()=>savingsLinkRepairPatch({...row,linkedGoalId:'new'},expected,goal,goal));
 assert.equal(goal.currentAmount,132.35);
});
