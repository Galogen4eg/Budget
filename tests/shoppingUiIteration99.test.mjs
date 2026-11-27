import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../components/'+name+'.tsx',import.meta.url),'utf8');
test('shopping distinguishes an empty active list from a search miss',()=>{
 for(const name of ['ShoppingListMobile','ShoppingListDesktop']){
  const source=read(name);
  assert.ok(source.includes("searchQuery.trim() ? 'Активные товары не найдены' : 'Нет активных покупок'"));
  assert.match(source,/aria-label="Поиск по товарам в семейном списке"/);
  assert.match(source,/onSubmit=\{handleQuickAddSubmit\}/);
  assert.match(source,/aria-label="Добавить товары в общий список"/);
 }
});
test('shopping retains labeled keyboard controls for editing, quantity and restore',()=>{
 for(const name of ['ShoppingListMobile','ShoppingListDesktop']){
  const source=read(name);
  assert.match(source,/aria-label=\{\x60Редактировать товар: \$\{item.title\}\x60\}/);
  assert.match(source,/aria-label=\{\x60Вернуть в список: \$\{item.title\}\x60\}/);
  assert.match(source,/min-h-\[44px\]/);
  assert.match(source,/aria-label="Закрыть редактор товара"/);
 }
 assert.match(read('ShoppingListDesktop'),/aria-expanded=\{isPurchasedOpen\}/);
 assert.match(read('ShoppingListMobile'),/aria-expanded=\{isCompletedOpen\}/);
});


test('quick lists and repeat purchases retain shared actions and bounded panel scrolling',()=>{
 const source=read('ShoppingQuickListsPanel');
 assert.match(source,/aria-expanded=\{section === 'templates'\}/);
 assert.match(source,/aria-expanded=\{section === 'history'\}/);
 assert.match(source,/max-h-\[min\(32dvh,16rem\)\] overflow-y-auto overscroll-contain/);
 for(const action of ['addProducts(previewTemplate.items)','addProducts(recent)','addProducts([p])','saveTemplate()','removeTemplate(t.id)'])assert.ok(source.includes(action),action);
 assert.match(source,/onClick=\{\(\)=>setPreviewId\(t.id\)\}/);
 assert.match(source,/aria-label="Состав быстрого списка"/);
 assert.doesNotMatch(source,/addProducts\(t.items\)/);
 assert.match(source,/saveShoppingMerge\(familyId, changes.itemsToUpdateInDb, changes.itemsToAddInDb\)/);
 assert.match(source,/min-h-\[44px\] min-w-0 flex-1 rounded-xl/);
});

test('shared real purchase frequency and search replace local mock favorites',()=>{
 const library=read('ShoppingQuickListsPanel');
 assert.match(library,/frequentFamilyPurchases\(history\)/);
 assert.match(library,/data-testid="family-frequent-purchases"/);
 for(const name of ['ShoppingListMobile','ShoppingListDesktop']){
  const source=read(name);
  assert.match(source,/filterShoppingItems\(items,searchQuery\)/);
  assert.doesNotMatch(source,/getTopFrequentPurchases|defaultSuggestions/);
  assert.match(source,/Очистить поиск товаров/);
 }
 const pantry=read('PantryInventory');
 assert.doesNotMatch(pantry,/overflow-y-auto/);
 assert.match(pantry,/items.slice\(0,limit\)/);
 assert.match(pantry,/scrollIntoView/);
});
