import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const overview = readFileSync(new URL('../components/TerraOverview.tsx', import.meta.url), 'utf8');

test('mobile balance never presents a fabricated percentage or unverified month-on-month growth', () => {
  assert.doesNotMatch(overview, /\+8\.4%/);
  assert.doesNotMatch(overview, /к прошлому месяцу рост/);
  assert.doesNotMatch(overview, /dynamicsData\.avg\s*\|\|\s*1420/);
  assert.doesNotMatch(overview, /dynamicsData\.max\s*\|\|\s*3150/);
  assert.doesNotMatch(overview, /dailyLimit\s*\*\s*30\s*:\s*50540/);
  assert.doesNotMatch(overview, /Доступно до конца\s*\{/);
});
test('mobile overview supports safe-area insets and long balance values', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/terra-ui.css', import.meta.url), 'utf8');
  assert.match(app, /data-terra-tabbar className="md:hidden shrink-0/);
  assert.match(css, /\.terra-shell \{padding-top:env\(safe-area-inset-top,0px\);\}/);
  assert.doesNotMatch(overview,/pb-\[calc\(6rem\+env/);
  const balanceClass = overview.match(/data-testid="overview-balance-value-mobile"\s+className="([^"]+)"/)?.[1];
  assert.ok(balanceClass, 'mobile balance value must be present');
  const tokens = balanceClass.split(/\s+/);
  assert.ok(tokens.includes('tabular-nums'), 'mobile balance must use tabular figures');
  assert.ok(tokens.includes('[overflow-wrap:anywhere]'), 'mobile balance must wrap long values');
});
test('mobile header and spending scale controls expose touch-size targets', () => {
  assert.match(overview, /addTitle="Добавить операцию"/);
  assert.match(overview, /aria-expanded=\{isMonthPickerOpen\}/);
  assert.match(overview, /onOpenSettings=\{onOpenSettings\}/);
  assert.match(overview, /min-h-\[44px\]/);
});
test('switching personal and family budget is identifiable by assistive technology', () => {
  assert.match(overview, /aria-pressed=\{budgetMode === 'family'\}/);
  assert.match(overview, /aria-pressed=\{budgetMode === 'personal'\}/);
});
