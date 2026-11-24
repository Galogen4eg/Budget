import test from 'node:test';
import assert from 'node:assert/strict';
import { splitImportReview, learnedRuleChangesSavings, isEligibleForImport, assertImportBatchReady, assertImportSavingsReady } from '../utils/importSafety.ts';

const categories=[
 {id:'other',label:'Другое',transactionType:'expense'},
 {id:'food',label:'Продукты',transactionType:'expense'},
 {id:'savings',label:'Накопления',transactionType:'expense'},
 {id:'salary',label:'Зарплата',transactionType:'income'}
];
const tx=(id,category,type='expense')=>({id,category,type,note:'Магазин',rawNote:'Магазин',amount:100,date:'2026-11-21',memberId:'m'});
test('manual review separates unassigned rows without dropping them silently',()=>{
 const rows=[tx('a','food'),tx('b','other'),tx('c','salary','income'),tx('d','missing')];
 const result=splitImportReview(rows,categories);
 assert.deepEqual(result.ready.map(t=>t.id),['a','c']);
 assert.deepEqual(result.needsReview.map(t=>t.id),['b','d']);
 assert.equal(rows.length,4);
});
test('wrong transaction type requires manual review',()=>{
 assert.equal(isEligibleForImport(tx('i','salary'),categories),false);
 assert.equal(isEligibleForImport(tx('i','salary','income'),categories),true);
});
test('learning ordinary categories can never silently change savings classification',()=>{
 assert.equal(learnedRuleChangesSavings(tx('a','savings'),{...tx('a','food'),id:'a'}),true);
 assert.equal(learnedRuleChangesSavings(tx('a','food'),{...tx('a','savings'),id:'a'}),true);
 assert.equal(learnedRuleChangesSavings(tx('a','food'),{...tx('a','food'),id:'a',note:'Магазин 2'}),false);
});

test('iteration 67: import rejects unreviewed and wrong-direction categories before writes',()=>{
 const good=tx('a','food');
 assert.doesNotThrow(()=>assertImportBatchReady([good],categories,'m'));
 assert.throws(()=>assertImportBatchReady([good,tx('b','other')],categories,'m'),/категория/);
 assert.throws(()=>assertImportBatchReady([tx('c','salary')],categories,'m'),/категория/);
});
test('iteration 67: import rejects wrong member, invalid dates and kopeck precision',()=>{
 const row=tx('a','food');
 assert.throws(()=>assertImportBatchReady([{...row,memberId:'other'}],categories,'m'),/участник/);
 assert.throws(()=>assertImportBatchReady([{...row,date:'not-a-date'}],categories,'m'),/дат/);
 assert.throws(()=>assertImportBatchReady([{...row,amount:1.001}],categories,'m'),/копейки/);
 assert.throws(()=>assertImportBatchReady([{...row,amount:0}],categories,'m'),/копейки/);
 assert.throws(()=>assertImportBatchReady([{...row,amount:Number.POSITIVE_INFINITY}],categories,'m'),/копейки/);
});
test('iteration 67: accidental duplicate operation IDs are not accepted in the same batch',()=>{
 assert.throws(()=>assertImportBatchReady([tx('same','food'),tx('same','food')],categories,'m'),/идентификаторы/);
});

const savingsRow={id:'bank-1',category:'savings',type:'expense',memberId:'a',amount:120.55,note:'Копилка'};
const importGoals=[{id:'a1',memberId:'a'},{id:'b1',memberId:'b'},{id:'legacy'}];
test('import requires explicit savings disposition even if an owned goal exists',()=>{
 assert.throws(()=>assertImportSavingsReady([savingsRow],importGoals,'a'),/выберите/i);
 assert.doesNotThrow(()=>assertImportSavingsReady([{...savingsRow,linkedGoalId:'a1'}],importGoals,'a'));
 assert.doesNotThrow(()=>assertImportSavingsReady([{...savingsRow,externalSavingsConfirmed:true}],[],'a'));
});
test('reject foreign, unowned, deleted goals and contradictory flags',()=>{
 for(const linkedGoalId of ['b1','legacy','removed'])assert.throws(()=>assertImportSavingsReady([{...savingsRow,linkedGoalId}],importGoals,'a'),/цель/i);
 assert.throws(()=>assertImportSavingsReady([{...savingsRow,linkedGoalId:'a1',externalSavingsConfirmed:true}],importGoals,'a'));
 assert.throws(()=>assertImportSavingsReady([{...savingsRow,memberId:'b',externalSavingsConfirmed:true}],importGoals,'a'),/владелец/i);
});
test('mixed statement checks every savings row without mutating money or category',()=>{
 const rows=[{...savingsRow,id:'food',category:'food',note:'Продукты'},{...savingsRow,externalSavingsConfirmed:true}];
 const before=structuredClone(rows);
 assert.doesNotThrow(()=>assertImportSavingsReady(rows,importGoals,'a'));
 assert.deepEqual(rows,before);
 assert.throws(()=>assertImportSavingsReady([rows[0],savingsRow],importGoals,'a'));
});
