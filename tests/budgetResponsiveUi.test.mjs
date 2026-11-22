import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
const history=readFileSync(new URL('../components/TransactionHistory.tsx',import.meta.url),'utf8');
const mobile=readFileSync(new URL('../components/BudgetMobile.tsx',import.meta.url),'utf8');

test('mobile bottom navigation permits narrow screens without clipped labels',()=>{
  assert.match(app,/aria-label="Основная навигация"[\s\S]{0,350}overflow-x-auto/);
  assert.match(app,/min-w-0[\s\S]{0,220}truncate/);
});
test('desktop navigation exposes collapsed menu state to assistive technology',()=>{
  assert.match(app,/aria-expanded=\{isSidebarExpanded\}/);
  assert.match(app,/aria-label=\{isSidebarExpanded\s*\?/);
});
test('history date picker fits small screens rather than forcing 288px width',()=>{
  assert.match(history,/w-\[min\(18rem,calc\(100vw-2rem\)\)\]/);
});
test('budget summary can use full width for net total on narrow screens',()=>{
  assert.match(history,/grid-cols-2\s+sm:grid-cols-3/);
  assert.match(history,/col-span-2\s+sm:col-span-1/);
});
test('mobile transaction cards have usable focus and touch targets',()=>{
  assert.match(mobile,/focus-visible:ring-2/);
  assert.match(mobile,/min-h-\[56px\]/);
});
