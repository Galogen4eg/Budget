import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyBudgetReport } from '../utils/budgetMonthlyReport.ts';

const categories = [
  {id:'food',label:'Продукты'}, {id:'market',label:'Супермаркеты',parentId:'food'},
  {id:'cafe',label:'Кафе'}, {id:'fuel',label:'Бензин'}
];
const tx = (id,date,type,category,amount) => ({id,date,type,category,amount});

test('monthly report separates income, expenses, and current month net in kopecks', () => {
  const report=buildMonthlyBudgetReport([
    tx('1','2026-11-03T12:00:00','income','salary',1000.05),
    tx('2','2026-11-05T12:00:00','expense','market',150.2),
    tx('3','2026-11-07T12:00:00','expense','cafe',20.05),
    tx('4','2026-10-21T12:00:00','expense','market',300)
  ],categories,{food:200,cafe:40},new Date(2026,10,1));
  assert.deepEqual([report.income,report.expense,report.net], [1000.05,170.25,829.8]);
  assert.deepEqual([report.planned,report.plannedSpent,report.plannedRemaining],[240,170.25,69.75]);
  assert.equal(report.previousMonthExpense,300);
  assert.equal(report.expenseChange, -129.75);
  assert.equal(report.expenseChangePercent,-43.25);
  assert.equal(report.month,'2026-11');
});

test('unbudgeted categories counted separately without making them free money', () => {
 const report=buildMonthlyBudgetReport([
  tx('a','2026-11-02T10:00:00','expense','food',60),
  tx('b','2026-11-02T10:00:00','expense','fuel',70)
 ],categories,{food:100},new Date(2026,10,1));
 assert.equal(report.planned,100);
 assert.equal(report.plannedSpent,60);
 assert.equal(report.unplannedSpent,70);
 assert.equal(report.overBudget,0);
});

test('parent and child budgets cannot double count the same expense in plan-fact summary',()=>{
 const report=buildMonthlyBudgetReport([
  tx('a','2026-11-02T10:00:00','expense','market',80)
 ],categories,{food:200,market:100},new Date(2026,10,1));
 assert.equal(report.planned,200);
 assert.equal(report.plannedSpent,80);
 assert.equal(report.unplannedSpent,0);
 assert.deepEqual(report.overlappingLimitIds,['market']);
});

test('overspending is visible as positive over-budget amount and zero remaining',()=>{
 const report=buildMonthlyBudgetReport([
  tx('a','2026-11-02T10:00:00','expense','cafe',125)
 ],categories,{cafe:100},new Date(2026,10,1));
 assert.equal(report.overBudget,25);
 assert.equal(report.plannedRemaining,0);
});

test('a missing prior month is not reported as zero-percent growth',()=>{
 const report=buildMonthlyBudgetReport([
  tx('a','2026-11-02T10:00:00','expense','food',75)
 ],categories,{food:100},new Date(2026,10,1));
 assert.equal(report.previousMonthExpense,0);
 assert.equal(report.expenseChangePercent,null);
});

test('other months and income are not included in tracked plan/fact spending',()=>{
 const report=buildMonthlyBudgetReport([
  tx('a','2026-10-30T10:00:00','expense','food',100),
  tx('b','2026-11-03T10:00:00','income','food',200),
  tx('c','2026-12-01T10:00:00','expense','food',50),
 ],categories,{food:300},new Date(2026,10,1));
 assert.equal(report.plannedSpent,0);
 assert.equal(report.income,200);
 assert.equal(report.expense,0);
});
