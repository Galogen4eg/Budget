import test from 'node:test';
import assert from 'node:assert/strict';
import { planSavingsGoalChanges } from '../utils/savingsSync.ts';

const goals = [
  { id: 'a', title: 'Копилка А', targetAmount: 5000, currentAmount: 600, icon: 'PiggyBank', color: '#111' },
  { id: 'b', title: 'Копилка Б', targetAmount: 5000, currentAmount: 200, icon: 'PiggyBank', color: '#222' }
];
const tx = (amount, goal, type = 'expense') => ({
  id: 'tx-1', type, amount, category: 'savings', note: 'Перевод',
  memberId: 'a', date: '2026-11-21', linkedGoalId: goal
});

test('editing goal A to B moves the entire amount even with zero amount delta', () => {
  const plan = planSavingsGoalChanges(goals, tx(100, 'a'), tx(100, 'b'));
  assert.equal(plan.updatedGoals.find(g => g.id === 'a').currentAmount, 500);
  assert.equal(plan.updatedGoals.find(g => g.id === 'b').currentAmount, 300);
  assert.deepEqual(plan.changedGoals.map(g => g.id), ['a','b']);
});

test('editing amount within the same goal applies only the difference', () => {
  const plan = planSavingsGoalChanges(goals, tx(100,'a'), tx(160,'a'));
  assert.equal(plan.updatedGoals.find(g => g.id === 'a').currentAmount, 660);
  assert.equal(plan.changedGoals.length, 1);
});

test('deleting a savings transfer reverses its contribution', () => {
  const plan = planSavingsGoalChanges(goals, tx(100,'a'), null);
  assert.equal(plan.updatedGoals.find(g => g.id === 'a').currentAmount, 500);
});

test('changing savings transaction to a normal expense reverses its old goal effect', () => {
  const plan = planSavingsGoalChanges(goals, tx(100,'a'), { ...tx(100,'a'), category:'food', linkedGoalId:undefined, note:'Обычная покупка' });
  assert.equal(plan.updatedGoals.find(g => g.id === 'a').currentAmount, 500);
});

test('cannot redirect an explicitly linked goal to an unrelated first goal', () => {
  assert.throws(() => planSavingsGoalChanges(goals, null, tx(150,'missing')), /цель/i);
});

test('normal transaction edits do not touch savings goals', () => {
  const ordinary={...tx(100,'a'),category:'food',linkedGoalId:undefined,note:'Магазин'};
  const plan=planSavingsGoalChanges(goals, ordinary,{...ordinary,amount:200});
  assert.deepEqual(plan.changedGoals, []);
});
