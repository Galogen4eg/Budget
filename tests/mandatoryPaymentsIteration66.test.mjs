import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mandatoryPaymentStates } from '../utils/budgetFinancialMath.ts';
import { calculateFamilyBudgetProjection } from '../utils/familyBudgetProjection.ts';

const bill={id:'rent',name:'Аренда',amount:1000.25,day:10,remind:false};
const payment=(id,amount,memberId='one')=>({
  id,amount,memberId,type:'expense',category:'housing',note:'Оплата аренды',
  date:'2026-11-10T12:00:00.000Z',linkedExpenseId:'rent'
});

test('iteration 66: 95% and all partial amounts leave exact unpaid reserve, never mark full',()=>{
  const first=mandatoryPaymentStates([bill],[payment('p1',950.24)],[])[0];
  assert.equal(first.isPaid,false);
  assert.equal(first.paidAmount,950.24);
  assert.equal(first.amountNeeded,50.01);
  const complete=mandatoryPaymentStates([bill],[payment('p1',950.24),payment('p2',50.01,'two')],[])[0];
  assert.equal(complete.isPaid,true);
  assert.equal(complete.amountNeeded,0);
});

test('iteration 66: manual paid is independent of bank transaction and isolated to supplied month IDs',()=>{
  const partial=[payment('p1',400.2)];
  const november=mandatoryPaymentStates([bill],partial,['rent'])[0];
  const december=mandatoryPaymentStates([bill],[],[])[0];
  assert.equal(november.isManuallyPaid,true);
  assert.equal(november.isPaid,true);
  assert.equal(november.paidAmount,400.2);
  assert.equal(november.amountNeeded,0);
  assert.equal(december.isPaid,false);
  assert.equal(december.amountNeeded,1000.25);
});

test('iteration 66: family reserve drops only by confirmed payments across members',()=>{
  const transactions=[payment('p1',950.24,'one')];
  const base={transactions,monthTransactions:transactions,bills:[bill],categories:[],
    manuallyPaidIds:[],initialBalance:5000,savingsRate:0,goalSavedAmounts:[],manualReservedAmount:0};
  const result=calculateFamilyBudgetProjection(base);
  assert.equal(result.ledger,4049.76);
  assert.equal(result.mandatoryReserve,50.01);
  assert.equal(result.availableBalance,3999.75);
  const paid=calculateFamilyBudgetProjection({...base,manuallyPaidIds:['rent']});
  assert.equal(paid.mandatoryReserve,0);
  assert.equal(paid.availableBalance,4049.76);
});

test('iteration 66: desktop Budget paid presentation reads the shared monthly payment projection',()=>{
  const source=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');
  assert.match(source,/mandatoryExpenses\.map\(expense => \{/);
  assert.match(source,/const isPaid = checkMandatoryPaid\(expense\)/);
  assert.doesNotMatch(source,/const isPaid = \(settings\.manualPaidExpenses\?\.\[currentMonthKey\] \|\| \[\]\)\.includes\(expense\.id\)/);
});
