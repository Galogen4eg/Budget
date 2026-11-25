import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDebtAmount,parseDebtAmounts,planDebtExpenseLink} from '../utils/debtEdit.ts';
test('strict debt money: Russian decimal separator, grouped digits, zero, and kopecks',()=>{
 for(const [raw,value] of [['12,34',12.34],['1\u00a0234,56',1234.56],['0',0],['0.01',0.01],['12.3',12.3]])assert.equal(parseDebtAmount(raw),value);
});
test('reject trailing text, scientific notation, negatives, precision overflow and empty input',()=>{
 for(const raw of ['12abc','1e3','-1','1.234','Infinity','NaN','','1 2','1,2.3','90071992547409999'])assert.throws(()=>parseDebtAmount(raw),/сумм/i,raw);
});
test('balance is exact in kopecks and overpayment is rejected',()=>{
 assert.deepEqual(parseDebtAmounts('1000,50','100,25','100'),{totalAmount:1000.5,currentBalance:900.25,monthlyPayment:100});
 assert.deepEqual(parseDebtAmounts('0,30','0,10','0'),{totalAmount:0.3,currentBalance:0.2,monthlyPayment:0});
 assert.throws(()=>parseDebtAmounts('100','100,01','1'),/выплачено/i);
});
const bills=[{id:'a',name:'Old',amount:25,day:1,remind:true,linkedDebtId:'d'},{id:'b',name:'Other',amount:30,day:2,remind:false}];
const debt={id:'d',name:'New',monthlyPayment:100.25,dueDate:'2027-01-09',linkedExpenseId:'b'};
test('link switch and unlink update both backlinks without changing other fields',()=>{
 const switched=planDebtExpenseLink(bills,debt);
 assert.equal(switched[0].linkedDebtId,null);assert.equal(switched[1].linkedDebtId,'d');assert.equal(switched[1].amount,100.25);assert.equal(switched[1].day,9);assert.equal(switched[1].remind,false);
 assert.equal(bills[0].linkedDebtId,'d');assert.equal(planDebtExpenseLink(switched,{...debt,linkedExpenseId:null})[1].linkedDebtId,null);
});
test('missing, occupied, and zero linked payment are refused without mutating inputs',()=>{
 assert.throws(()=>planDebtExpenseLink(bills,{...debt,linkedExpenseId:'missing'}),/не найден/);
 assert.throws(()=>planDebtExpenseLink(bills.map(x=>x.id==='b'?{...x,linkedDebtId:'other'}:x),debt),/другим долгом/);
 assert.throws(()=>planDebtExpenseLink(bills,{...debt,monthlyPayment:0}),/положительн/);
});
