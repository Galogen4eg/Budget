import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mandatoryPaymentStates } from '../utils/budgetFinancialMath.ts';
import { calculateFamilyBudgetProjection } from '../utils/familyBudgetProjection.ts';
import { computeDebtMonthPaymentStatus, PAYMENT_MATCH_THRESHOLD } from '../utils/debtPaymentSync.ts';

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
  assert.match(source,/const displayMandatoryExpenses = mandatoryExpenses/);
  assert.match(source,/displayMandatoryExpenses\.map\(exp=>\{/);
  assert.match(source,/renderMandatoryPayments\('desktop'\)/);
  assert.match(source,/renderMandatoryPayments\('mobile'\)/);
  assert.match(source,/const state=monthlyPaymentStates\.find\(item=>item\.id===exp\.id\)/);
  assert.match(source,/const paid=state\?\.isPaid\?\?false/);
  assert.doesNotMatch(source,/const isPaid = \(settings\.manualPaidExpenses\?\.\[currentMonthKey\] \|\| \[\]\)\.includes\(expense\.id\)/);
});

test('iteration 66: 99.99% paid is not auto-complete and overpayment does not create negative reserve',()=>{
  const nearly=mandatoryPaymentStates([bill],[payment('p1',1000.24)],[])[0];
  assert.equal(nearly.isPaid,false);
  assert.equal(nearly.amountNeeded,0.01);
  const over=mandatoryPaymentStates([bill],[payment('p1',1001.75)],[])[0];
  assert.equal(over.isPaid,true);
  assert.equal(over.amountNeeded,0);
});

test('iteration 66: mandatory modal waits for confirmed save and exposes errors, not premature success',()=>{
  const src=readFileSync(new URL('../components/MandatoryExpenseModal.tsx',import.meta.url),'utf8');
  assert.match(src,/await onSave\(updatedExpense, isPaidCurrentMonth\)/);
  assert.match(src,/await onDelete\(expense\.id\)/);
  assert.match(src,/setFormError\(error instanceof Error/);
  assert.match(src,/disabled=\{isSaving\}/);
  assert.doesNotMatch(src,/setTimeout\(\(\) => \{\s*onSave/);
  assert.doesNotMatch(src,/isSavedAnimation/);
  assert.match(src,/aria-pressed=\{isPaidCurrentMonth\}/);
});

test('iteration 66: selected month and linked debt persistence follow the settings write',()=>{
  const modal=readFileSync(new URL('../components/MandatoryExpenseModal.tsx',import.meta.url),'utf8');
  const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
  assert.match(modal,/selectedMonth\.getFullYear\(\)/);
  assert.match(app,/selectedMonth=\{currentMonth\}/);
  assert.match(app,/await updateMandatoryPaymentBundle\(\{/);
  assert.doesNotMatch(app,/syncLinkedMandatoryDebt/);
  assert.match(app,/onAddMandatoryExpense=\{\(\) =>/);
  const provider=readFileSync(new URL('../contexts/DataContext.tsx',import.meta.url),'utf8');
  assert.match(provider,/await commitMandatoryPaymentBundle\(/);
});

test('iteration 66: detailed mandatory list uses same paid allocation as family reserve',()=>{
  const source=readFileSync(new URL('../components/MandatoryExpensesList.tsx',import.meta.url),'utf8');
  assert.match(source,/const isPaid = status\.isPaid/);
  assert.doesNotMatch(source,/PAYMENT_MATCH_THRESHOLD/);
  assert.match(source,/const itemPaid = Math\.min\(e\.paidAmount, e\.amount\)/);
  assert.match(source,/await updateMandatoryPaymentBundle\(\{/);
});

test('iteration 66: debt service ignores current-month manual flag when viewing historical period',()=>{
  const debt={id:'loan',name:'Ипотека',monthlyPayment:1000.25,paidThisMonth:true};
  const past=computeDebtMonthPaymentStatus(debt,undefined,[],{manualPaidExpenses:{}},new Date(2025,0,10));
  assert.equal(past.isPaid,false);
  assert.equal(past.status,'unpaid');
  assert.equal(PAYMENT_MATCH_THRESHOLD,1);
});

test('iteration 66: acknowledgment in debt service is not fabricated transaction money',()=>{
  const debt={id:'loan',name:'Ипотека',monthlyPayment:1000.25,paidThisMonth:true};
  const status=computeDebtMonthPaymentStatus(debt,undefined,[],{manualPaidExpenses:{}},new Date());
  assert.equal(status.isPaid,true);
  assert.equal(status.paidAmount,0);
  assert.equal(status.remainingAmount,0);
  assert.equal(status.source,'manual_debt');
});

test('iteration 66: required amount must be a safe positive ruble-and-kopeck sum',()=>{
  const modal=readFileSync(new URL('../components/MandatoryExpenseModal.tsx',import.meta.url),'utf8');
  assert.match(modal,/Number\.isSafeInteger\(Math\.round\(parsedAmount \* 100\)\)/);
  assert.match(modal,/type="text" inputMode="decimal"/);
  assert.match(modal,/normalizedAmount/);
  assert.match(modal,/Math\.abs\(parsedAmount \* 100 - Math\.round\(parsedAmount \* 100\)\)/);
  assert.match(modal,/onClick=\{\(\) => \{ if \(!isSaving\) onClose\(\); \}\}/);
});

test('iteration 66: mobile and desktop distinguish manual acknowledgment and allow undo',()=>{
  const budget=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');
  assert.match(budget,/Оплачено операцией/);
  assert.match(budget,/Снять ручную отметку оплаты/);
  assert.match(budget,/Отметить платёж оплаченным вручную/);
  assert.match(budget,/onAddMandatoryExpense/);
});

test('iteration 66: Firestore updates settings and debts in one transaction',()=>{
  const db=readFileSync(new URL('../utils/db.ts',import.meta.url),'utf8');
  const data=readFileSync(new URL('../contexts/DataContext.tsx',import.meta.url),'utf8');
  assert.match(db,/export const commitMandatoryPaymentBundle = async/);
  assert.match(db,/await runTransaction\(db, async transaction =>/);
  assert.match(db,/transaction\.set\(configRef/);
  assert.match(db,/transaction\.update\(debtRefs\[i\]/);
  assert.match(data,/await commitMandatoryPaymentBundle\(familyId, user\.uid, changes, debtChanges\)/);
});
