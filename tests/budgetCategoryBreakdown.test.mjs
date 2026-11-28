import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBudgetCategoryBreakdown } from '../utils/budgetCategoryBreakdown.ts';
import {readFileSync} from 'node:fs';

const categories=[
 {id:'food',label:'Продукты',color:'#4A7C59'},
 {id:'shops',label:'Магазины',parentId:'food'},
 {id:'market',label:'Супермаркеты',parentId:'shops'},
 {id:'cafe',label:'Кафе'}
];
const tx=(id,category,amount,type='expense')=>({id,category,amount,type});

test('three levels of descendants aggregate under top category without lost kopecks',()=>{
 const rows=buildBudgetCategoryBreakdown([
  tx('1','market',0.1),tx('2','shops',0.2),tx('3','food',10.05),
  tx('4','cafe',3.1),tx('5','food',200,'income')
 ],categories);
 assert.deepEqual(rows.map(x=>[x.id,x.sum]),[['food',10.35],['cafe',3.1]]);
 assert.equal(rows.reduce((sum,x)=>Math.round((sum+x.sum)*100)/100,0),13.45);
});
test('expense without a known category stays visible instead of vanishing from totals',()=>{
 const rows=buildBudgetCategoryBreakdown([
  tx('1','market',100),tx('2','deleted-category',55.25),tx('3','',1.05)
 ],categories);
 assert.deepEqual(rows.map(x=>[x.id,x.sum]),[['food',100],['uncategorized',56.3]]);
 assert.equal(rows[1].label,'Без категории');
});
test('orphaned child category is displayed rather than discarded',()=>{
 const rows=buildBudgetCategoryBreakdown([tx('1','orphan',20.2)],[
  {id:'orphan',label:'Старая категория',parentId:'removed-parent'}
 ]);
 assert.deepEqual(rows.map(x=>[x.id,x.sum]),[['orphan',20.2]]);
});
test('zero, income and invalid amounts are excluded; sorting deterministic',()=>{
 const rows=buildBudgetCategoryBreakdown([
  tx('1','food',0),tx('2','cafe',-20),tx('3','food',NaN),
  tx('4','cafe',11.5),tx('5','food',11.5)
 ],categories);
 assert.deepEqual(rows.map(x=>x.id),['food','cafe']);
 assert.deepEqual(rows.map(x=>x.sum),[11.5,11.5]);
});
test('financial result is not labelled available cash or always declared normal',()=>{
 const budget=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');
 assert.match(budget,/Результат месяца/);
 assert.doesNotMatch(budget,/block">В норме<\/span>/);
 assert.match(budget,/buildBudgetCategoryBreakdown\(monthTransactions, categories\)/);
 assert.match(budget,/cat.id === 'uncategorized' \? undefined/);
 assert.match(budget,/Результат месяца<\/dt><dd[^>]*>\{settings\.privacyMode \? '•••'/);
});
