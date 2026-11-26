import test from 'node:test';
import assert from 'node:assert/strict';
import { planAlfaReview, assertAlfaReviewResult } from '../utils/alfaReviewPlan.ts';
const id=n=>'alfa_'+n.toString(16).padStart(40,'0');
const row=(n,patch={})=>({id:id(n),memberId:'a',type:'expense',amount:12.34,date:'2026-11-26T10:00:00.000Z',note:'Продукты',category:'food',...patch});
const cats=[{id:'food',transactionType:'expense'},{id:'salary',transactionType:'income'},{id:'savings'}];
test('recognized ordinary rows are ready; unknown, mismatched and savings rows are deferred',()=>{
 const rows=[row(1),row(2,{category:'other'}),row(3,{category:'salary'}),row(4,{category:'savings',note:'Перевод на накопительный счет'}),row(5,{category:'missing'})];
 const planned=planAlfaReview(rows,cats,'a');
 assert.deepEqual(planned.map(p=>[p.row.id,p.reason]),[[id(1),null],[id(2),'category'],[id(3),'category'],[id(4),'savings'],[id(5),'category']]);
 assert.equal(rows[1].category,'other');
 assert.equal(planned[0].row.amount,12.34);
});
test('fail entire batch before any write on invalid identity, amount, date, ownership or duplicate',()=>{
 for(const invalid of [row(2,{id:'legacy'}),row(2,{amount:0}),row(2,{amount:1.001}),row(2,{date:'bad'}),row(2,{memberId:'b'}),row(2,{type:'unknown'}),row(1)])assert.throws(()=>planAlfaReview([row(1),invalid],cats,'a'));
 assert.throws(()=>planAlfaReview([],cats,'a'));
 assert.throws(()=>planAlfaReview([row(1)],cats,''));
});
test('never auto-link or auto-confirm a transfer or preserve preview metadata',()=>{
 const planned=planAlfaReview([row(1,{mcc:'5411',externalSavingsConfirmed:true}),row(2,{linkedGoalId:'g'})],cats,'a');
 assert.deepEqual(planned.map(p=>p.reason),['savings','savings']);
 assert.equal('mcc' in planned[0].row,false);
 assert.equal('externalSavingsConfirmed' in planned[0].row,false);
 assert.equal('linkedGoalId' in planned[1].row,false);
});
test('review result cannot acknowledge missing rows or wrong file',()=>{
 const sha='a'.repeat(64);
 const result={fileSha256:sha,requested:6,created:2,existing:1,queued:2,unverified:1};
 assert.doesNotThrow(()=>assertAlfaReviewResult(result,sha));
 assert.throws(()=>assertAlfaReviewResult({...result,queued:1},sha));
 assert.throws(()=>assertAlfaReviewResult({...result,fileSha256:'b'.repeat(64)},sha));
 assert.throws(()=>assertAlfaReviewResult({...result,created:-1,existing:4},sha));
});
