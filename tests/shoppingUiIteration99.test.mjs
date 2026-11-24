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
