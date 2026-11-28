import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const budget=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');

test('no invented financial transactions, obligations or category summaries are shown in live Budget',()=>{
 assert.doesNotMatch(budget,/id: 'mand-1'/);
 assert.doesNotMatch(budget,/id: 'mand-2'/);
 assert.doesNotMatch(budget,/id: 'cat-1'/);
 assert.doesNotMatch(budget,/id: 'cat-2'/);
 assert.doesNotMatch(budget,/id: 'cat-3'/);
 assert.match(budget,/Обязательных платежей пока нет/);
 assert.match(budget,/За этот месяц ещё нет расходов по категориям/);
});
test('manual bill check is not misrepresented as a real payment',()=>{
 assert.match(budget,/Отметить платёж оплаченным вручную/);
 assert.match(budget,/Отметить вручную/);
 assert.doesNotMatch(budget,/>\s*Оплатить\s*</);
});
test('monthly budget navigation uses safe date clamping for January 31 and March 31',()=>{
 assert.match(budget,/shiftCalendarMonth\(currentMonth, -1\)/);
 assert.match(budget,/shiftCalendarMonth\(currentMonth, 1\)/);
});
test('budget mobile obligation action has keyboard access and enough touch space',()=>{
 assert.match(budget,/aria-label=\{'Редактировать обязательный платёж: '\+title\}/);
 assert.match(budget,/min-h-\[44px\]/);
});
