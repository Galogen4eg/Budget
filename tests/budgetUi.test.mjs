import test from 'node:test';
import assert from 'node:assert/strict';
import {groupBudgetTransactions, filterBudgetPeriod, clampBudgetDay, visibleBudgetTransactions, formatBudgetMonthLabel, formatBudgetCalendarMagnitude} from '../utils/budgetUi.ts';

const transactions=[
  {id:'a',date:'2026-11-20T09:00:00',amount:0.1,type:'expense'},
  {id:'b',date:'2026-11-20T10:00:00',amount:0.2,type:'expense'},
  {id:'c',date:'2026-11-21T10:00:00',amount:15.03,type:'income'},
];

test('desktop and mobile share a stable group ordering and exact day net',()=>{
  const groups=groupBudgetTransactions(transactions);
  assert.deepEqual(groups.map(g=>g.transactions.map(t=>t.id)),[['c'],['b','a']]);
  assert.equal(groups[1].dayExpense,0.3);
  assert.equal(groups[1].net,-0.3);
  assert.deepEqual(transactions.map(t=>t.id),['a','b','c']);
});

test('calendar day clamps when switching from a longer month to February',()=>{
  assert.equal(clampBudgetDay(new Date(2027,1,1),31),28);
  assert.equal(clampBudgetDay(new Date(2028,1,1),31),29);
  assert.equal(clampBudgetDay(new Date(2026,10,1),15),15);
});

test('last seven days means today plus previous six calendar days',()=>{
  const now=new Date(2026,10,21,15);
  const rows=[14,15,16,21,22].map(day=>({id:String(day),date:new Date(2026,10,day,9).toISOString()}));
  assert.deepEqual(filterBudgetPeriod(rows,'7_days',now).map(r=>r.id),['15','16','21']);
});

test('custom date range includes both local calendar boundaries',()=>{
  const rows=[
    {id:'start',date:new Date(2026,10,18,0,1).toISOString()},
    {id:'end',date:new Date(2026,10,19,23,59).toISOString()},
    {id:'out',date:new Date(2026,10,20,0,1).toISOString()},
  ];
  assert.deepEqual(filterBudgetPeriod(rows,'custom',new Date(), '2026-11-18','2026-11-19').map(r=>r.id),['start','end']);
  assert.deepEqual(filterBudgetPeriod(rows,'custom',new Date(),'2026-11-20','2026-11-18'),[]);
});

test('mobile default list is limited, filters show matches, and view all is reversible',()=>{
  const rows=Array.from({length:21},(_,i)=>({id:String(i)}));
  assert.equal(visibleBudgetTransactions(rows,false,false,false).length,15);
  assert.equal(visibleBudgetTransactions(rows,false,true,false).length,21);
  assert.equal(visibleBudgetTransactions(rows,false,false,true).length,21);
  assert.equal(visibleBudgetTransactions(rows,true,false,false).length,21);
});

test('all Russian budget month labels keep their complete name and omit the year suffix',()=>{
  const months=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  months.forEach((month,index)=>assert.equal(formatBudgetMonthLabel(new Date(2026,index,1)),month+' 2026'));
});
test('calendar amounts share Russian compact formatting without integer-thousand rounding',()=>{
  assert.equal(formatBudgetCalendarMagnitude(1500),'1,5к');
  assert.equal(formatBudgetCalendarMagnitude(-1500),'1,5к');
  assert.equal(formatBudgetCalendarMagnitude(0.15),'0,15');
  assert.equal(formatBudgetCalendarMagnitude(1250000),'1,3м');
  assert.equal(formatBudgetCalendarMagnitude(999950),'1м');
});
