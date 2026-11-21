import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const quick=readFileSync(new URL('../components/ShoppingQuickListsPanel.tsx',import.meta.url),'utf8');
const overview=readFileSync(new URL('../components/QuickShoppingWidget.tsx',import.meta.url),'utf8');
const widget=readFileSync(new URL('../components/ShoppingWidget.tsx',import.meta.url),'utf8');

test('quick lists panel keeps shopping items accessible on narrow viewports',()=>{
 assert.match(quick,/max-h-\[min\(32dvh,16rem\)\]/);
 assert.match(quick,/overflow-y-auto/);
 assert.match(quick,/grid grid-cols-2/);
});
test('quick template and repeat actions have usable tap targets and visible keyboard focus',()=>{
 assert.match(quick,/min-h-\[44px\]/);
 assert.match(quick,/focus-visible:ring-2/);
 assert.match(quick,/aria-controls=/);
});
test('overview shopping widget preserves readable long product names and touch actions',()=>{
 assert.match(overview,/min-w-0/);
 assert.match(overview,/break-words/);
 assert.match(overview,/min-h-\[44px\]/);
});
test('dashboard shopping tile is keyboard operable with a semantic button',()=>{
 assert.match(widget,/<button\s+type="button"/);
 assert.match(widget,/aria-label="Открыть список покупок"/);
 assert.match(widget,/focus-visible:ring-2/);
});
