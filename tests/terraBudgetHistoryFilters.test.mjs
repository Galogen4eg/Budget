import test from 'node:test';
import assert from 'node:assert/strict';
import {filterBudgetHistory,budgetHistoryWindow,BUDGET_HISTORY_PAGE_SIZE} from '../utils/budgetHistory.ts';
const categories=[{id:'food',label:'Продукты'},{id:'fuel',label:'Топливо'},{id:'salary',label:'Зарплата'}];
const members=[{id:'a',name:'Анна'},{id:'b',name:'Борис'}];
const rows=Object.freeze([
 Object.freeze({id:'1',date:'2026-11-15T12:00:00Z',type:'expense',category:'food',memberId:'a',note:'Покупка',payee:'Магазин Ромашка',amount:123.45}),
 Object.freeze({id:'2',date:'2026-11-16T12:00:00Z',type:'expense',category:'fuel',memberId:'b',note:'Заправка',amount:50.01}),
 Object.freeze({id:'3',date:'2026-11-17T12:00:00Z',type:'income',category:'salary',memberId:'a',note:'Зарплата',amount:5000}),
 Object.freeze({id:'4',date:'2026-11-18T12:00:00Z',type:'expense',category:'legacy-cat',memberId:'b',note:'Старая операция',rawNote:'Оригинальная строка',amount:0.01})
]);
const find=(type='all',query='',category=null)=>filterBudgetHistory(rows,type,query,categories,members,category).map(t=>t.id);
test('exact category filter includes a legacy id, combines with type and query, and does not widen scope',()=>{
 assert.deepEqual(find('all','','food'),['1']);
 assert.deepEqual(find('all','','legacy-cat'),['4']);
 assert.deepEqual(find('income','','food'),[]);
 assert.deepEqual(find('expense','Борис','fuel'),['2']);
 assert.deepEqual(filterBudgetHistory(rows.slice(0,1),'all','',categories,members,'legacy-cat'),[]);
});
test('search matches payee, raw note and category, but does not search monetary values',()=>{
 assert.deepEqual(find('all','ромашка'),['1']);
 assert.deepEqual(find('all','ОРИГИНАЛЬНАЯ'),['4']);
 assert.deepEqual(find('all','продукты'),['1']);
 assert.deepEqual(find('all','123.45'),[]);
});
test('reset preserves descending date order and does not mutate any ledger row or amount',()=>{
 assert.deepEqual(find(),['4','3','2','1']);
 assert.deepEqual(rows.map(t=>[t.id,t.amount]),[['1',123.45],['2',50.01],['3',5000],['4',0.01]]);
});


test('500-row history displays a bounded prefix after filtering; more rows never change the source or order',()=>{
 const ledger=Object.freeze(Array.from({length:500},(_,i)=>Object.freeze({id:String(i),date:new Date(2026,10,1,0,i).toISOString(),type:'expense',category:i===0?'fuel':'food',memberId:'a',amount:123.45})));
 const full=filterBudgetHistory(ledger,'all','',categories,members);
 assert.equal(BUDGET_HISTORY_PAGE_SIZE,20);
 assert.equal(budgetHistoryWindow(full).length,20);
 assert.deepEqual(budgetHistoryWindow(full,40).slice(0,20),budgetHistoryWindow(full));
 assert.equal(budgetHistoryWindow(full,500).length,500);
 assert.deepEqual(budgetHistoryWindow(filterBudgetHistory(ledger,'all','',categories,members,'fuel')).map(row=>row.id),['0']);
 assert.equal(ledger.length,500);assert.equal(ledger[0].id,'0');assert.equal(ledger[0].amount,123.45);
 assert.deepEqual(budgetHistoryWindow([]),[]);
});
