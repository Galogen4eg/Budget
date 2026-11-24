import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateFamilyBudgetProjection} from '../utils/familyBudgetProjection.ts';
import {formatBudgetMoney} from '../utils/budgetFinancialMath.ts';

const src=readFileSync(new URL('../components/TerraOverview.tsx',import.meta.url),'utf8');
const all=[
 {id:'a',date:'2026-11-23',memberId:'a',type:'income',category:'salary',amount:1000.15,note:''},
 {id:'b',date:'2026-11-23',memberId:'b',type:'income',category:'salary',amount:500.25,note:''},
 {id:'c',date:'2026-11-23',memberId:'b',type:'expense',category:'housing',amount:80.15,linkedExpenseId:'rent',note:''}
];
const input={transactions:all,monthTransactions:all,
 bills:[{id:'rent',name:'Аренда',amount:100.2,day:10,remind:false}],
 categories:[{id:'salary',label:'Зарплата'}],manuallyPaidIds:[],
 initialBalance:200,savingsRate:10,manualReservedAmount:0,
 goalSavedAmounts:[],enableSmartReserve:true};

test('iteration 71: overview family ledger and reserve retain two member incomes, expenses and kopecks',()=>{
 const projection=calculateFamilyBudgetProjection(input);
 assert.equal(projection.ledger,1620.25);
 assert.equal(projection.mandatoryReserve,20.05);
 assert.equal(projection.savingsReserve,150.04);
 assert.equal(projection.reservedAmount,170.09);
 assert.equal(projection.availableBalance,1450.16);
 assert.equal(formatBudgetMoney(projection.ledger).includes('620'),true);
});

test('iteration 71: overview computes shared money outside filtered personal history',()=>{
 assert.ok(src.includes('calculateFamilyBudgetProjection({'));
 assert.ok(src.includes('monthTransactions: familyMonthTransactions'));
 assert.ok(src.includes('transactions,'));
 assert.ok(src.includes('const sharedLedger = familyProjection.ledger'));
 assert.ok(src.includes('const reservedAmount = familyProjection.reservedAmount'));
 assert.ok(src.includes('const availableBalance = familyProjection.availableBalance'));
 assert.ok(src.includes('budgetDailyLimit(sharedLedger, reservedAmount, daysRemaining)'));
 assert.ok(src.includes('totalBalance={sharedLedger}'));
});

test('iteration 71: overview manual bill status is shared and atomic with linked debt',()=>{
 assert.ok(src.includes('updateMandatoryPaymentBundle({'));
 assert.ok(src.includes('manualPaidExpenses:{ [currentMonthKey]:updated }'));
 assert.ok(src.includes("const recorded = familyMonthTransactions.some(tx =>"));
 assert.ok(src.includes('const debtChanges = Array.from(debtIds)'));
 assert.ok(!src.includes('const myMemberId = currentMember.id;'));
});

test('iteration 71: reserve UI remains family wide, keyboard accessible, and monetary formatter keeps kopecks',()=>{
 assert.ok(src.includes('СЕМЕЙНЫЙ РЕЗЕРВ'));
 assert.ok(src.includes('Открыть подробности семейного резерва'));
 assert.ok(src.includes("householdPersonal?'ЛИЧНЫЙ РЕЗЕРВ':'СЕМЕЙНЫЙ РЕЗЕРВ'"));
 assert.ok(src.includes('return formatBudgetMoney(num)'));
 assert.ok(!src.includes("return Math.round(num).toLocaleString('ru-RU')"));
});

test('iteration 71: today spend is compared against shared daily allowance',()=>{
 assert.ok(src.includes("return transactions.filter(t => {"));
 assert.ok(src.includes('sumMoney(todayTransactions.map(t => t.amount))'));
 assert.ok(src.includes('budgetDailyLimit(sharedLedger, reservedAmount, daysRemaining)'));
});
