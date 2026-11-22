import test from 'node:test';
import assert from 'node:assert/strict';
import { splitImportReview, learnedRuleChangesSavings, isEligibleForImport } from '../utils/importSafety.ts';

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
