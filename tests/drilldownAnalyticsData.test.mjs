import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAnalyticsSeries,buildPayeeAnalytics} from '../utils/analyticsPresentation.ts';
const month=new Date(2026,1,1);
const today=new Date(2026,1,10);
const rows=[
 {type:'expense',date:'2026-02-01T12:00:00',amount:0.1,category:'leaf',payee:'Магазин'},
 {type:'expense',date:'2026-02-01T12:00:00',amount:0.2,category:'leaf',payee:'Магазин'},
 {type:'expense',date:'2026-02-08T12:00:00',amount:10.05,category:'root',payee:'Аптека'},
 {type:'income',date:'2026-02-08T12:00:00',amount:50.01,category:'salary'},
 {type:'transfer',date:'2026-02-08T12:00:00',amount:100,category:'root'},
 {type:'expense',date:'2026-03-01T12:00:00',amount:1000,category:'root'},
];
test('daily and weekly charts preserve exact totals and average for the same selected month',()=>{
 const daily=buildAnalyticsSeries(rows,month,'daily',null,today);
 const weekly=buildAnalyticsSeries(rows,month,'weekly',null,today);
 assert.equal(daily.list.length,28);
 assert.equal(weekly.list.length,4);
 assert.equal(daily.list[0].expense,0.3);
 assert.equal(weekly.list[0].expense,0.3);
 assert.equal(weekly.list[1].expense,10.05);
 assert.equal(weekly.list[1].income,50.01);
 assert.equal(daily.expense,10.35);
 assert.equal(weekly.expense,10.35);
 assert.equal(daily.income,50.01);
 assert.equal(daily.avgDaily,1.04);
 assert.equal(weekly.avgDaily,daily.avgDaily);
});
test('selected day is not compared to a whole month; leap month has all days',()=>{
 const day=new Date(2026,1,8);
 for(const grouping of ['daily','weekly']){
  const result=buildAnalyticsSeries(rows,month,grouping,day,today);
  assert.equal(result.list.length,1);
  assert.equal(result.avgDaily,10.05);
  assert.equal(result.income,50.01);
 }
 assert.equal(buildAnalyticsSeries([],new Date(2024,1,1),'daily',null,today).list.length,29);
});
test('merchant breakdown uses root categories and exact kopecks, preserving whole-category share after search',()=>{
 const cats=[{id:'root',label:'Корень'},{id:'child',label:'Подкатегория',parentId:'root'},{id:'leaf',label:'Лист',parentId:'child'}];
 const scoped=rows.slice(0,5);
 const groups=buildPayeeAnalytics(scoped,cats,'магазин');
 assert.equal(groups.length,1);
 assert.equal(groups[0].catId,'root');
 assert.equal(groups[0].totalSpent,10.35);
 assert.equal(groups[0].payeesList.length,1);
 assert.equal(groups[0].payeesList[0].spent,0.3);
 assert.equal(groups[0].percentage,100);
 assert.equal(buildPayeeAnalytics(scoped,cats,'не найдено').length,0);
});

import {budgetCategoryDescendantIds} from '../utils/budgetCategoryBreakdown.ts';
test('selected category includes all descendants without unrelated siblings or infinite loops',()=>{
 const cats=[{id:'root'},{id:'child',parentId:'root'},{id:'leaf',parentId:'child'},{id:'other'},{id:'cycle-a',parentId:'cycle-b'},{id:'cycle-b',parentId:'cycle-a'}];
 assert.deepEqual(budgetCategoryDescendantIds('root',cats),['root','child','leaf']);
 assert.deepEqual(budgetCategoryDescendantIds('child',cats),['child','leaf']);
 assert.deepEqual(budgetCategoryDescendantIds('cycle-a',cats),['cycle-a','cycle-b']);
});
