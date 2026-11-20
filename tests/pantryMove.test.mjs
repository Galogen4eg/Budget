import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePantryMove } from '../utils/pantryMove.ts';

const pantry={id:'pantry-new',title:'Старое название',amount:'1',unit:'шт',category:'other',addedDate:'2026-11-21T00:00:00Z'};
const shopping={id:'shopping-a',title:'Молоко',amount:'2',unit:'л',category:'dairy',completed:true};
test('pantry move copies latest server title, amount and measurement unit',()=>{
  const actual=preparePantryMove(shopping,pantry);
  assert.equal(actual.id,'pantry-new');
  assert.equal(actual.title,'Молоко');
  assert.equal(actual.amount,'2');
  assert.equal(actual.unit,'л');
  assert.equal(actual.category,'dairy');
});
test('already moved shopping product cannot be moved again',()=>{
  assert.throws(()=>preparePantryMove(null,pantry),/уже удалён/);
});
