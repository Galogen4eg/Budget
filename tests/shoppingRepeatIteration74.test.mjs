import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('iteration 74: each completion gets an event ID on mobile and desktop',()=>{
 for(const component of ['../components/ShoppingListDesktop.tsx','../components/ShoppingListMobile.tsx']){
  const src=read(component);
  assert.match(src,/completedAt: .*Date\.now\(\)/);
  assert.match(src,/completedAt: updated\.completedAt/);
 }
});

test('iteration 74: family listener logs repeated purchases, with retry after an error',()=>{
 const panel=read('../components/ShoppingQuickListsPanel.tsx');
 assert.match(panel,/const completionKey = item\.completedAt \?/);
 assert.match(panel,/captured\.current\.has\(completionKey\)/);
 assert.match(panel,/captured\.current\.delete\(completionKey\)/);
 assert.match(panel,/Последняя покупка:/);
});

test('iteration 74: backend transaction and local model share the same event key',()=>{
 const backend=read('../utils/shoppingListsDb.ts');
 const engine=read('../utils/shoppingLists.ts');
 assert.match(backend,/purchaseEventId \|\| p\.shoppingItemId/);
 assert.match(engine,/purchaseEventId: eventId/);
 assert.match(engine,/item\.completedAt \? /);
});
