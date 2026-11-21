import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cents, money, sumMoney, budgetDailyLimit, monthlyMoneyTotals,
  mandatoryPaymentStates
} from '../utils/budgetFinancialMath.ts';

test('money arithmetic keeps kopecks and avoids binary floating point drift', () => {
  assert.equal(cents(0.1), 10);
  assert.equal(cents(0.2), 20);
  assert.equal(sumMoney([0.1, 0.2, 10.55]), 10.85);
  assert.equal(money(101), 1.01);
});

test('monthly totals preserve kopecks, and transfers are not lost', () => {
  assert.deepEqual(monthlyMoneyTotals([
    {type:'income',amount:100.05},{type:'expense',amount:0.1},
    {type:'expense',amount:0.2}
  ]),{income:100.05,expense:0.3,net:99.75});
});

test('daily limit uses carried balance and reserved obligations, not just this month income', () => {
  assert.equal(budgetDailyLimit(100000, 30000, 10),7000);
  assert.equal(budgetDailyLimit(100, 10, 3),30);
  assert.equal(budgetDailyLimit(100, 150, 2),0);
  assert.equal(budgetDailyLimit(100.01, 0, 3),33.33);
});

test('explicit linked transaction credits only its target even when names overlap', () => {
  const bills=[{id:'phone',name:'Мобильная связь',amount:400,keywords:['связь']},
    {id:'internet',name:'Интернет и связь',amount:700,keywords:['связь']}];
  const txs=[{id:'tx-1',type:'expense',amount:400,note:'Интернет и связь',
    linkedExpenseId:'phone'}];
  const states=mandatoryPaymentStates(bills,txs,[]);
  assert.equal(states[0].paidAmount,400);
  assert.equal(states[1].paidAmount,0);
  assert.equal(states[1].amountNeeded,700);
});

test('ambiguous keywords do not credit the same transaction to two bills', () => {
  const bills=[{id:'phone',name:'Мобильная связь',amount:400,keywords:['связь']},
    {id:'internet',name:'Интернет и связь',amount:700,keywords:['связь']}];
  const states=mandatoryPaymentStates(bills,[
    {id:'t',type:'expense',amount:500,note:'Оплата связь'}
  ],[]);
  assert.equal(states[0].paidAmount,0);
  assert.equal(states[1].paidAmount,0);
});

test('unambiguous unlinked payment and partial payment are counted once', () => {
  const bills=[{id:'phone',name:'Мобильная связь',amount:400,keywords:['телефон']},
    {id:'internet',name:'Интернет',amount:700,keywords:['интернет']}];
  const states=mandatoryPaymentStates(bills,[
    {id:'t1',type:'expense',amount:200,note:'телефон'},
    {id:'t2',type:'expense',amount:100,note:'магазин',linkedExpenseId:'phone'},
    {id:'t3',type:'income',amount:5000,note:'интернет'}
  ],[]);
  assert.deepEqual(states.map(s=>[s.paidAmount,s.amountNeeded]),[[300,100],[0,700]]);
});

test('transactions with explicit links to other obligations never fuzzy-match', () => {
  const states=mandatoryPaymentStates([
    {id:'a',name:'Страховка',amount:500,keywords:['страховка']}
  ],[
    {id:'t',type:'expense',amount:500,note:'Страховка',linkedExpenseId:'unknown'}
  ],[]);
  assert.equal(states[0].paidAmount,0);
});

test('manual-paid status suppresses remaining amount without inventing a bank payment', () => {
  const states=mandatoryPaymentStates([{id:'a',name:'Ипотека',amount:33000}],[],['a']);
  assert.equal(states[0].isPaid,true);
  assert.equal(states[0].paidAmount,0);
  assert.equal(states[0].amountNeeded,0);
});
