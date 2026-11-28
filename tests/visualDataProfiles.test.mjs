import test from 'node:test';
import assert from 'node:assert/strict';
import { makeVisualDataProfiles } from './fixtures/visualDataProfiles.mjs';
const now=new Date('2026-01-01T12:00:00Z');
const members=[{id:'a',userId:'qa-a'},{id:'b',userId:'qa-b'}];
const profiles=makeVisualDataProfiles({now,members});
const byId=id=>profiles.find(p=>p.id===id);
test('visual profiles cover distinct equivalence classes and deterministic data',()=>{
 assert.deepEqual(profiles,makeVisualDataProfiles({now,members}));
 assert.deepEqual(profiles.map(p=>p.id),['empty','income-only','kopeck','skewed','large-and-long','month-boundary']);
 assert.equal(byId('empty').transactions.length,0);
 assert.ok(byId('income-only').transactions.every(t=>t.type==='income'));
 assert.equal(byId('kopeck').transactions[0].amount,.01);
 const skew=byId('skewed').transactions.filter(t=>t.type==='expense');
 assert.ok(skew.length>=16);
 assert.ok(Math.max(...skew.map(t=>t.amount))/skew.reduce((n,t)=>n+t.amount,0)>.6);
 assert.ok(byId('large-and-long').transactions.some(t=>t.amount>=10000000&&t.note.length>80));
 assert.ok(profiles.some(p=>p.categories.some(c=>c.color==='#1e211f')));
 assert.ok(byId('month-boundary').transactions.some(t=>t.date.startsWith('2025-12')));
});
test('all profile records are valid unique synthetic transactions and expectations match exact cents',()=>{
 for(const profile of profiles){
  assert.equal(new Set(profile.transactions.map(t=>t.id)).size,profile.transactions.length);
  for(const t of profile.transactions){
   assert.ok(t.id.startsWith('qa-visual-'));
   assert.ok(members.some(m=>m.id===t.memberId&&m.userId===t.userId));
   assert.ok(Number.isSafeInteger(Math.round(t.amount*100))&&t.amount>0);
   assert.ok(Math.abs(t.amount*100-Math.round(t.amount*100))<.000001);
   assert.ok(new Date(t.date)<=now);
  }
  const current=profile.transactions.filter(t=>t.date.startsWith('2026-01'));
  for(const type of ['income','expense']){
   assert.equal(current.filter(t=>t.type===type).reduce((n,t)=>n+Math.round(t.amount*100),0),profile.expected[type+'Cents']);
  }
 }
 assert.equal(byId('month-boundary').expected.expenseCents,101);
});
