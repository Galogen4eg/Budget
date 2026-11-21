import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const overview = readFileSync(new URL('../components/TerraOverview.tsx', import.meta.url), 'utf8');

test('mobile balance never presents a fabricated percentage or unverified month-on-month growth', () => {
  assert.doesNotMatch(overview, /\+8\.4%/);
  assert.doesNotMatch(overview, /к прошлому месяцу рост/);
  assert.doesNotMatch(overview, /Доступно до конца\s*\{/);
});
test('mobile overview supports safe-area insets and long balance values', () => {
  assert.match(overview, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom,0px\)\)\]/);
  assert.match(overview, /break-words.*tabular-nums/);
});
test('mobile header and spending scale controls expose touch-size targets', () => {
  assert.match(overview, /aria-label="Добавить операцию"/);
  assert.match(overview, /aria-expanded=\{isMonthPickerOpen\}/);
  assert.match(overview, /aria-label="Настройки"/);
  assert.match(overview, /min-h-\[44px\]/);
});
test('switching personal and family budget is identifiable by assistive technology', () => {
  assert.match(overview, /aria-pressed=\{budgetMode === 'family'\}/);
  assert.match(overview, /aria-pressed=\{budgetMode === 'personal'\}/);
});
