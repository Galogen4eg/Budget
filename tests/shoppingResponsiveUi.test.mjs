import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const quick=readFileSync(new URL('../components/ShoppingQuickListsPanel.tsx',import.meta.url),'utf8');
const overview=readFileSync(new URL('../components/QuickShoppingWidget.tsx',import.meta.url),'utf8');
const widget=readFileSync(new URL('../components/ShoppingWidget.tsx',import.meta.url),'utf8');

test('quick lists panel keeps shopping items accessible on narrow viewports',()=>{
 assert.match(quick,/max-h-\[min\(32dvh,16rem\)\]/);
 assert.match(quick,/overflow-y-auto/);
 assert.match(quick,/grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/);
 assert.match(quick,/break-words/);
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

test('mobile shopping owns a bounded scroll viewport; outer pull-to-refresh cannot intercept it',()=>{
 const list=readFileSync(new URL('../components/ShoppingList.tsx',import.meta.url),'utf8');
 const mobile=readFileSync(new URL('../components/ShoppingListMobile.tsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
 assert.match(list,/className="flex-1 min-h-0 flex flex-col overflow-hidden"/);
 assert.match(mobile,/data-testid="shopping-scroll-container" className="flex-1 min-h-0[^"]*overflow-y-auto[^"]*touch-pan-y/);
 assert.doesNotMatch(app,/onTouchMove=\{handleTouchMove\}|setPullY\(/);
 assert.match(mobile,/drag=\{reducedMotion\?false:"x"\}/);
 assert.match(mobile,/Boolean\(useReducedMotion\(\)\)/);
 assert.match(mobile,/aria-label=\{\x60Вернуть в список:/);
});
