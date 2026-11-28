import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');
const desktopLayout=source.slice(source.indexOf('TOP KPI CARDS'),source.indexOf('MAIN WORKSPACE'));
const sharedMetrics=source.slice(source.indexOf('const renderTodayMetrics='),source.indexOf('  return (\n    <div className="flex flex-col min-h-0'));
const desktop=desktopLayout+sharedMetrics;
test('desktop daily cards use calm shared Terra surfaces, not a decorative AI gradient',()=>{
 assert.doesNotMatch(desktop,/bg-gradient-to-br|border-2 border-primary\/30/);
 assert.match(desktop,/SURFACE_CARD/);
});
test('unspent daily allowance is not mislabeled money saved in the family ledger',()=>{
 assert.doesNotMatch(desktop,/Сэкономлено/);
 assert.match(desktop,/Ниже ориентира на/);
});
test('missing daily budget never renders full progress or asserts no overrun',()=>{
 assert.match(desktop,/safeDailyLimit > 0 \? Math\.min\(100, \(todaySpent \/ safeDailyLimit\) \* 100\) : 0/);
 assert.match(desktop,/safeDailyLimit <= 0 \? 'Ориентир не задан'/);
});
test('desktop section labels remain readable, no 8–9px text',()=>{
 assert.doesNotMatch(desktop,/text-\[8px\]|text-\[9px\]/);
});
test('desktop add-operation action uses accessible touch target',()=>{
 assert.match(source,/aria-label="Добавить операцию"[\s\S]*?min-h-\[44px\]/);
});


test('budget mobile section shortcuts fit without an overflowing rail and desktop summary stays compact',()=>{
 const shortcuts=source.match(/<div role="group" aria-label="Разделы бюджета"[^>]*>/)?.[0]||'';
 assert.match(shortcuts,/grid-cols-4/);
 assert.doesNotMatch(shortcuts,/FILTER_RAIL/);
 assert.match(desktop,/Итоги месяца/);
 assert.match(desktopLayout,/renderTodayMetrics\(false\)/);
 assert.match(desktopLayout,/renderMonthTotals\(false\)/);
 assert.equal((desktop.match(/terra-layout-surface/g)||[]).length,3);
 assert.doesNotMatch(desktop,/!p-/);
 assert.match(source,/data-terra-grid="workspace"/);
});
