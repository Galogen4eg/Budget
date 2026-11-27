import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFamilyFixtures, fixtureSettings, fixtureCategories } from './fixtures/realisticFamily.mjs';

const now=new Date('2026-11-26T12:00:00Z');
const members=[{id:'a',userId:'qa-a'},{id:'b',userId:'qa-b'}];
const fixture=()=>makeFamilyFixtures({now,members});
test('realistic family has six past months and current month, expenses and income for both members',()=>{
 const rows=fixture().transactions;
 assert.ok(rows.length>=180);
 assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
 assert.deepEqual([...new Set(rows.map(r=>r.date.slice(0,7)))].sort(),['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11']);
 for(const row of rows){
  assert.ok(row.date<=now.toISOString()); 
  assert.ok(Number.isSafeInteger(Math.round(row.amount*100))&&row.amount>0&&Math.abs(row.amount*100-Math.round(row.amount*100))<1e-6);
  const m=members.find(m=>m.id===row.memberId);
  assert.ok(m);
  if(row.userId!==undefined)assert.equal(row.userId,m.userId);
 }
 for(const m of members)for(const type of ['income','expense'])assert.ok(rows.some(r=>r.memberId===m.id&&r.type===type));
 assert.ok(rows.some(r=>r.rawNote!==r.note&&r.payee));
 assert.ok(rows.some(r=>r.id.endsWith('-legacy')&&r.userId===undefined&&r.rawNote===undefined));
});
test('plans span past, present and future without financial links; related goal totals reconcile in kopecks',()=>{
 const f=fixture();
 assert.ok(f.events.some(e=>e.date<'2026-11-26'&&e.completed));
 assert.ok(f.events.some(e=>e.date==='2026-11-26'));
 assert.ok(f.events.some(e=>e.date>'2026-11-26'&&e.recurrence==='weekly'));
 assert.ok(f.events.some(e=>e.kind==='task'&&e.checklist?.length));
 for(const e of f.events)assert.ok(!('linkedExpenseId' in e));
 for(const g of f.goals){
  const sum=f.transactions.filter(r=>r.linkedGoalId===g.id).reduce((n,r)=>n+Math.round(r.amount*100)*(r.type==='expense'?1:-1),0);
  assert.equal(Math.round(g.currentAmount*100),sum);
 }
 assert.ok(f.shopping.some(r=>r.completed)&&f.shopping.some(r=>!r.completed));
 for(const kind of ['pantry','debts','subscriptions','loyalty','meterReadings','projects','wishlist','chat'])assert.ok(f[kind].length>0,kind);
});
test('repeatable dataset, stable IDs and safe month rollover; single-member QA remains supported',()=>{
 assert.deepEqual(fixture(),fixture());
 const f=makeFamilyFixtures({now:new Date('2027-01-01T00:05:00Z'),members:[members[0]]});
 assert.ok(f.transactions.every(r=>r.memberId==='a'&&r.date<='2027-01-01T00:05:00.000Z'));
 assert.ok(f.transactions.some(r=>r.date.startsWith('2027-01')));
 assert.throws(()=>makeFamilyFixtures({now,members:[]}));
 assert.throws(()=>makeFamilyFixtures({now,members:[{id:'a'}]}));
 for(const [kind,rows] of Object.entries(f))if(Array.isArray(rows))assert.ok(rows.every(r=>r.id.startsWith('qa-fixture-v1-')),kind);
});

test('every operation uses a known category and every bill link is defined in the fixture settings',()=>{
 const f=fixture(), settings=fixtureSettings(members);
 const ids=new Set(fixtureCategories.map(c=>c.id));
 const bills=new Map(settings.mandatoryExpenses.map(b=>[b.id,b]));
 for(const r of f.transactions){
  assert.ok(ids.has(r.category),r.category);
  if(r.linkedExpenseId){
   const b=bills.get(r.linkedExpenseId);
   assert.ok(b&&b.memberId===r.memberId);
   assert.equal(Math.round(b.amount*100),Math.round(r.amount*100));
  }
 }
 assert.ok(f.transactions.some(r=>r.externalSavingsConfirmed&&!r.linkedGoalId));
 assert.ok(f.transactions.some(r=>r.linkedGoalId&&r.type==='income'));
 assert.ok(f.transactions.some(r=>r.subcategory));
 assert.ok(Object.values(f).reduce((n,rows)=>n+rows.length,0)+fixtureCategories.length+1<=500);
});


test('dense current-month profile has exactly 500 synthetic operations, varied categories and two owners',()=>{
 for(const instant of ['2026-11-26T12:00:00Z','2027-01-01T00:05:00Z','2027-02-28T22:30:00Z']){
  const now=new Date(instant),month=instant.slice(0,7);
  const f=makeFamilyFixtures({now,members,currentMonthTarget:500});
  const rows=f.transactions.filter(r=>r.date.startsWith(month));
  assert.equal(rows.length,500);
  assert.ok(new Set(rows.filter(r=>r.type==='expense').map(r=>r.category)).size>=20);
  assert.equal(new Set(f.transactions.map(r=>r.id)).size,f.transactions.length);
  assert.ok(f.transactions.every(r=>r.date<=now.toISOString()));
  assert.ok(rows.every(r=>fixtureCategories.some(c=>c.id===r.category)&&members.some(m=>m.id===r.memberId)));
  assert.ok(f.events.length>=24&&f.shopping.length>=18);
  assert.deepEqual(f,makeFamilyFixtures({now,members,currentMonthTarget:500}));
 }
 assert.throws(()=>makeFamilyFixtures({now,members,currentMonthTarget:501}));
});
