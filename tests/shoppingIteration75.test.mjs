import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preparePantryMove} from '../utils/pantryMove.ts';
const load=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('iteration 75: both views use same unit-aware transaction adjustment, not local quantity math',()=>{
 for(const path of ['../components/ShoppingListDesktop.tsx','../components/ShoppingListMobile.tsx']){
  const src=load(path);
  assert.match(src,/shoppingQuantityStep\(item\.unit\)/);
  assert.match(src,/adjustShoppingAmount\(familyId, item\.id, delta \* step, step\)/);
  assert.match(src,/setItems\(prev => prev\.map\(i => i\.id === item\.id \? \{ \.\.\.i, amount \} : i\)\)/);
 }
});

test('iteration 75: mass deletion requires a separate explicit confirmation on both devices',()=>{
 for(const path of ['../components/ShoppingListDesktop.tsx','../components/ShoppingListMobile.tsx']){
  const src=load(path);
  assert.match(src,/confirmClearCompleted/);
  assert.match(src,/isClearingCompleted/);
  assert.match(src,/Удалить показанные купленные товары из общего списка/);
  assert.match(src,/setClearSelection\(captureCompletedSelection\(completedItems\)\)/);
  assert.match(src,/resolveCompletedDeletion\(clearSelection,completedItems\)/);
  assert.match(src,/setClearSelection\(null\)/);
  assert.match(src,/Отмена/);
  assert.match(src,/await deleteItemsBatch\(familyId, 'shopping', (completedIds|idsToDelete)\)/);
 }
});

test('iteration 75: mobile actions and completed section are keyboard and touch accessible',()=>{
 const src=load('../components/ShoppingListMobile.tsx');
 assert.match(src,/aria-controls="mobile-completed-shopping-items"/);
 assert.match(src,/aria-label="Поиск по товарам в семейном списке"/);
 assert.match(src,/aria-label="Добавить товары в общий список"/);
 assert.match(src,/min-w-\[44px\] min-h-\[44px\]/);
});

test('iteration 75: desktop completed items and steppers have accessible controls',()=>{
 const src=load('../components/ShoppingListDesktop.tsx');
 assert.match(src,/aria-label=\{\x60Редактировать товар:/);
 assert.match(src,/aria-label=\{\x60Уменьшить количество:/);
 assert.match(src,/aria-label=\{\x60Увеличить количество:/);
 assert.match(src,/aria-label=\{\x60Вернуть в список:/);
 assert.match(src,/min-w-\[44px\] min-h-\[44px\]/);
});

test('iteration 75: pantry transfer takes latest stored data, not stale UI payload',()=>{
 const planned={id:'pantry',title:'Старое',amount:'1',unit:'шт',category:'other',addedDate:'2026-11-23'};
 const latest={id:'shopping',title:'Молоко',amount:'2.5',unit:'л',category:'dairy'};
 const result=preparePantryMove(latest,planned);
 assert.deepEqual({title:result.title,amount:result.amount,unit:result.unit,category:result.category},
  {title:'Молоко',amount:'2.5',unit:'л',category:'dairy'});
 assert.throws(()=>preparePantryMove(null,planned),/удалён|перенесён/);
});
