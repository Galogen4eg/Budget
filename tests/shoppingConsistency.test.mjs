import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeOrRestoreShoppingItems } from '../utils/shoppingManager.ts';

const item = (id, title, amount, unit, completed=false) => ({
  id, title, amount, unit, completed, memberId:'person-a', category:'grocery', priority:'medium'
});
const incoming = (title, amount, unit) => ({
  title, amount, unit, memberId:'person-b', category:'grocery', priority:'medium'
});

test('merges same name and unit while keeping existing member attribution', () => {
  const result=mergeOrRestoreShoppingItems([item('a','Сахар','1','кг')],[incoming(' САХАР ','2','кг')],'person-b');
  assert.equal(result.itemsToUpdateInDb.length,1);
  assert.equal(result.itemsToAddInDb.length,0);
  assert.equal(result.updatedList[0].amount,'3');
  assert.equal(result.updatedList[0].memberId,'person-a');
});

test('does not merge kilograms with packages or units',()=>{
  const result=mergeOrRestoreShoppingItems([item('a','Сахар','1','кг')],[incoming('сахар','2','уп')],'person-b');
  assert.equal(result.itemsToAddInDb.length,1);
  assert.equal(result.itemsToUpdateInDb.length,0);
  assert.equal(result.updatedList.length,2);
});

test('restores completed item only when unit also matches',()=>{
  const wrong=mergeOrRestoreShoppingItems([item('a','Молоко','1','л',true)],[incoming('Молоко','2','бут')],'person-b');
  assert.equal(wrong.itemsToAddInDb.length,1);
  assert.equal(wrong.updatedList.find(x=>x.id==='a').completed,true);
  const correct=mergeOrRestoreShoppingItems([item('a','Молоко','1','л',true)],[incoming('Молоко','2','л')],'person-b');
  assert.equal(correct.itemsToUpdateInDb.length,1);
  assert.equal(correct.updatedList[0].completed,false);
});

test('multiple identical incoming products produce one final Firestore update',()=>{
  const result=mergeOrRestoreShoppingItems([item('a','Яблоки','1','кг')],[incoming('Яблоки','2','кг'),incoming('яблоки','3','кг')],'person-b');
  assert.equal(result.updatedList[0].amount,'6');
  assert.equal(result.itemsToUpdateInDb.length,1);
  assert.equal(result.itemsToUpdateInDb[0].amount,'6');
});

test('new duplicate incoming products produce a single final Firestore addition',()=>{
  const result=mergeOrRestoreShoppingItems([],[incoming('Хлеб','1','шт'),incoming('хлеб','2','шт')],'person-b');
  assert.equal(result.itemsToAddInDb.length,1);
  assert.equal(result.itemsToAddInDb[0].amount,'3');
});
