import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBudgetDayMoney} from '../utils/budgetDayMoney.ts';
import {parseCategoryBudgetInput, buildCategoryBudgetRows, forecastUntilSalary} from '../utils/budgetPlanning.ts';

test('iteration 69: daily calendar preserves kopecks and family member totals',()=>{
 const rows=[
  {date:'2026-11-20T10:00:00',type:'expense',amount:0.1,memberId:'papa'},
  {date:'2026-11-20T11:00:00',type:'expense',amount:0.2,memberId:'mama'},
  {date:'2026-11-20T12:00:00',type:'income',amount:30.05,memberId:'mama'},
  {date:'2026-10-20T12:00:00',type:'expense',amount:999,memberId:'papa'}
 ];
 const state=buildBudgetDayMoney(rows,new Date(2026,10,1));
 assert.deepEqual(state[20],{income:30.05,expense:0.3,net:29.75,count:3});
 assert.deepEqual(state[21],{income:0,expense:0,net:0,count:0});
 assert.equal(Object.keys(state).length,30);
});

test('iteration 69: calendar presents exact day amounts without privacy leakage',()=>{
 const source=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');
 assert.match(source,/buildBudgetDayMoney\(monthTransactions,currentMonth\)/);
 assert.match(source,/settings\.privacyMode \? undefined/);
 assert.doesNotMatch(source,/map\[d\]\.income = Math\.round/);
 assert.doesNotMatch(source,/map\[d\]\.expense = Math\.round/);
});

test('iteration 69: category limit accepts cents and rejects malformed values',()=>{
 assert.equal(parseCategoryBudgetInput('30 000,50'),30000.5);
 assert.equal(parseCategoryBudgetInput('0,01'),0.01);
 assert.equal(parseCategoryBudgetInput('200'),200);
 for(const invalid of ['','0','-1','1.001','12abc','1e5','Infinity','0,001']){
  assert.equal(parseCategoryBudgetInput(invalid),null,invalid);
 }
});
test('iteration 69: parent and child limits each display spending without double counting within parent',()=>{
 const categories=[{id:'food',label:'Продукты'},{id:'market',label:'Магазин',parentId:'food'}];
 const rows=[{id:'1',date:'2026-11-20',category:'market',type:'expense',amount:10.15}];
 const result=buildCategoryBudgetRows(rows,categories,{food:100,market:50});
 assert.equal(result.find(r=>r.categoryId==='food')?.spent,10.15);
 assert.equal(result.find(r=>r.categoryId==='market')?.spent,10.15);
});
test('iteration 69: family forecast is shown even while filtering a member',()=>{
 const budget=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');
 const occurrences=budget.match(/isCurrentMonth=\{isCurrentMonthView\}/g)||[];
 assert.equal(occurrences.length,2);
 assert.doesNotMatch(budget,/isCurrentMonth=\{isCurrentMonthView && selectedMember === 'all'\}/);
 const projection=forecastUntilSalary({
  transactions:[{id:'food',date:'2026-11-19T12:00:00',amount:140,category:'food',type:'expense'}],
  now:new Date(2026,10,21),daysRemaining:2,totalBalance:1000,reservedAmount:300
 });
 assert.equal(projection.availableToday,700);
 assert.equal(projection.projectedFreeBalance,680);
});
test('iteration 69: category limit panel has an accessible form and saving state',()=>{
 const source=readFileSync(new URL('../components/BudgetPlanningPanel.tsx',import.meta.url),'utf8');
 assert.match(source,/parseCategoryBudgetInput\(amount\)/);
 assert.match(source,/aria-controls="budget-category-limit-form"/);
 assert.match(source,/disabled=\{saving\}/);
 assert.match(source,/cat\.parentId \?/);
});
