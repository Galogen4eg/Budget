import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBudgetCategoryBreakdown} from '../utils/budgetCategoryBreakdown.ts';

const source=readFileSync(new URL('../components/TerraOverview.tsx',import.meta.url),'utf8');
const categories=[
 {id:'food',label:'Продукты',color:'#4A7C59'},
 {id:'market',label:'Магазин',parentId:'food'},
 {id:'snacks',label:'Снэки',parentId:'market'},
 {id:'auto',label:'Авто'}
];
const rows=[
 {type:'expense',category:'snacks',amount:0.1},
 {type:'expense',category:'market',amount:0.2},
 {type:'expense',category:'auto',amount:10.05},
 {type:'income',category:'food',amount:100}
];

test('iteration 72: nested expense categories count once and preserve kopecks',()=>{
 const result=buildBudgetCategoryBreakdown(rows,categories);
 assert.equal(result.find(item=>item.id==='food')?.sum,0.3);
 assert.equal(result.find(item=>item.id==='auto')?.sum,10.05);
 assert.equal(result.length,2);
});

test('iteration 72: overview uses same category allocation as Budget',()=>{
 assert.ok(source.includes('buildBudgetCategoryBreakdown(currentMonthTransactions, categories)'));
 assert.ok(source.includes('const total = sumMoney(grouped.map(category => category.sum))'));
 assert.ok(!source.includes('const effectiveCatId = cat?.parentId || t.category'));
});

test('iteration 72: personal chart does not pretend family daily/monthly limit is personal',()=>{
 assert.ok(source.includes("const chartDailyLimit = budgetMode === 'family' ? dailyLimit : 0"));
 assert.ok(source.includes("const monthlyLimit = budgetMode === 'family' ?"));
 assert.ok(source.includes('Семейный лимит не применяется к личному графику'));
 assert.ok(source.includes('Семейный план не применяется к личному графику'));
 assert.ok(source.includes('limit: chartDailyLimit'));
});

test('iteration 72: chart aggregates expenses without floating-point drift',()=>{
 assert.ok(source.includes('sumMoney([dailyExpensesMap[day] || 0, t.amount])'));
 assert.ok(source.includes('sumMoney([dailyExpensesMap[tDateString] || 0, t.amount])'));
 assert.ok(source.includes('sumMoney([monthlyExpensesMap[m] || 0, t.amount])'));
 assert.ok(source.includes('money(Math.round(cents(sum) / currentDay))'));
});

test('iteration 72: categories have real empty states and keyboard navigation',()=>{
 assert.ok(!source.includes('const fallbackList = ['));
 assert.ok(source.includes('За выбранный период расходов по категориям пока нет.'));
 const names=source.match(/aria-label=\{.?Аналитика категории:/g)||[];
 assert.ok(names.length>=2,'mobile and desktop categories should both have labelled controls');
 assert.ok(source.includes('min-h-[44px] w-full text-left'));
});
