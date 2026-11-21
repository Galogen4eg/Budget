import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCategoryBudgetRows, forecastUntilSalary, normalizeCategoryBudget } from '../utils/budgetPlanning.ts';

const categories=[
  {id:'food',label:'Продукты'},
  {id:'market',label:'Супермаркеты',parentId:'food'},
  {id:'cafe',label:'Кафе'},
];
const rows=[
  {type:'expense',category:'market',amount:100.15,date:'2026-11-19T09:00:00',id:'a'},
  {type:'expense',category:'food',amount:50.05,date:'2026-11-20T09:00:00',id:'b'},
  {type:'expense',category:'cafe',amount:100,date:'2026-11-20T09:00:00',id:'c'},
  {type:'income',category:'food',amount:1000,date:'2026-11-20T09:00:00',id:'d'}
];
test('parent category limit includes children exactly once and preserves kopecks',()=>{
 const result=buildCategoryBudgetRows(rows,categories,{food:200,cafe:80});
 assert.deepEqual(result.map(r=>[r.categoryId,r.spent,r.limit,r.remaining,r.overLimit]),[
  ['food',150.2,200,49.8,false],['cafe',100,80,0,true]
 ]);
});
test('unused limits still appear and invalid entries are ignored',()=>{
 const result=buildCategoryBudgetRows([],categories,{food:250,cafe:-3,unknown:600});
 assert.deepEqual(result.map(r=>r.categoryId),['food']);
});
test('category budgets use ruble amounts with two decimal places',()=>{
 assert.equal(normalizeCategoryBudget(5000.199),5000.2);
 assert.equal(normalizeCategoryBudget(-100),null);
 assert.equal(normalizeCategoryBudget(Number.NaN),null);
 assert.equal(normalizeCategoryBudget(0),null);
});
test('forecast uses last 14 calendar days, excludes transfers to savings and income',()=>{
 const now=new Date(2026,10,21,12);
 const estimate=forecastUntilSalary({
   transactions:[
     {type:'expense',category:'food',amount:1400,date:'2026-11-14T12:00:00',id:'a'},
     {type:'expense',category:'savings',amount:9000,date:'2026-11-15T12:00:00',id:'b'},
     {type:'income',category:'salary',amount:100000,date:'2026-11-18T12:00:00',id:'c'}
   ],
   now,daysRemaining:4,totalBalance:50000,reservedAmount:10000
 });
 assert.equal(estimate.averageDaily,100);
 assert.equal(estimate.projectedSpending,400);
 assert.equal(estimate.projectedFreeBalance,39600);
 assert.equal(estimate.hasHistory,true);
});
test('zero expense history gives no forecast instead of falsely promising zero future spending',()=>{
 const value=forecastUntilSalary({
   transactions:[],now:new Date(2026,10,21),daysRemaining:4,
   totalBalance:10000,reservedAmount:2500
 });
 assert.equal(value.hasHistory,false);
 assert.equal(value.projectedFreeBalance,null);
});
test('forecast does not double-subtract bank transfers to goals',()=>{
 const value=forecastUntilSalary({
   transactions:[{type:'expense',category:'savings',linkedGoalId:'g',amount:10000,date:'2026-11-20T11:00:00',id:'x'}],
   now:new Date(2026,10,21),daysRemaining:2,totalBalance:70000,reservedAmount:10000
 });
 assert.equal(value.hasHistory,false);
 assert.equal(value.availableToday,60000);
});

test('fixed paid bills linked to mandatory expenses are not projected again as variable spending',()=>{
 const result=forecastUntilSalary({
  transactions:[
   {type:'expense',category:'housing',amount:25000,linkedExpenseId:'rent',id:'rent',date:'2026-11-20T10:00:00'},
   {type:'expense',category:'food',amount:1400,id:'food',date:'2026-11-18T10:00:00'}
  ],
  now:new Date(2026,10,21),daysRemaining:5,totalBalance:50000,reservedAmount:10000
 });
 assert.equal(result.averageDaily,100);
 assert.equal(result.projectedSpending,500);
 assert.equal(result.projectedFreeBalance,39500);
});
