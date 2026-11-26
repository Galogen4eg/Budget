import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePantryMove, normalizePantryEdit } from '../utils/pantryMove.ts';

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

test('pantry edit validates quantity and date, permits clearing expiry',()=>{
 assert.deepEqual(normalizePantryEdit({amount:'1,5',unit:' кг ',expiryDate:''}),{amount:'1.5',unit:'кг',expiryDate:''});
 assert.equal(normalizePantryEdit({amount:'2',unit:'шт',expiryDate:'2028-02-29'}).expiryDate,'2028-02-29');
 for(const amount of ['0','-1','abc','Infinity',''])assert.throws(()=>normalizePantryEdit({amount,unit:'шт',expiryDate:''}),/количество/);
 assert.throws(()=>normalizePantryEdit({amount:'1',unit:'шт',expiryDate:'2027-02-29'}),/годности/);
});
