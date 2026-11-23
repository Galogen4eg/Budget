import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateFamilyBudgetProjection} from '../utils/familyBudgetProjection.ts';

const tx=(id,memberId,type,amount,category,date='2026-11-23',extra={})=>({
 id,memberId,type,amount,category,date,note:'',...extra
});
const transactions=[
 tx('s1','a','income',5000,'salary'),
 tx('s2','b','income',3000,'salary'),
 tx('g1','a','expense',1000,'food'),
 tx('g2','b','expense',500,'food'),
 tx('paid','b','expense',500,'utilities', '2026-11-23',{linkedExpenseId:'internet'})
];
const bills=[
 {id:'rent',name:'Аренда',amount:2500,day:1,remind:true},
 {id:'internet',name:'Интернет',amount:500,day:3,remind:true,memberId:'b'}
];
const categories=[{id:'salary',label:'Зарплата'}];
const base={transactions,monthTransactions:transactions,bills,categories,manuallyPaidIds:[],
 initialBalance:10000, initialBalanceDate:'2026-11-01',savingsRate:10,manualReservedAmount:200,
 goalSavedAmounts:[],enableSmartReserve:true};

test('family ledger and reserve count all members, all bills and saved kopecks once',()=>{
 const result=calculateFamilyBudgetProjection(base);
 assert.equal(result.ledger,16000);
 assert.equal(result.monthlySalary,8000);
 assert.equal(result.mandatoryReserve,2500);
 assert.equal(result.savingsReserve,800);
 assert.equal(result.manualReserve,200);
 assert.equal(result.reservedAmount,3500);
 assert.equal(result.availableBalance,12500);
});
test('family projections use all family rows rather than a selected member filter',()=>{
 const result=calculateFamilyBudgetProjection(base);
 const personalIncome=transactions.filter(t=>t.memberId==='a');
 assert.equal(personalIncome.length,2);
 assert.equal(result.availableBalance,12500);
 assert.equal(result.monthlyPaymentStates.find(x=>x.id==='internet')?.isPaid,true);
});
test('manually paid shared bills stop consuming family reserve and avoid duplicate subtraction',()=>{
 const result=calculateFamilyBudgetProjection({...base,manuallyPaidIds:['rent']});
 assert.equal(result.mandatoryReserve,0);
 assert.equal(result.availableBalance,15000);
});
test('Budget uses family projection for shared available money, independent of member filter',()=>{
 const source=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');
 assert.match(source,/calculateFamilyBudgetProjection\(/);
 assert.match(source,/monthTransactions: familyMonthTransactions/);
 assert.match(source,/transactions: transactions/);
 assert.match(source,/Семейный ориентир в день/);
 assert.match(source,/Доступно семье до зарплаты/);
});
