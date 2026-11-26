import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('active overview uses shared expense chart on both breakpoints, with exact category amounts',()=>{
 const overview=read('components/TerraOverview.tsx'),chart=read('components/overview/OverviewExpenseChart.tsx');
 assert.equal((overview.match(/<OverviewExpenseChart\b/g)||[]).length,2);
 assert.doesNotMatch(overview,/<AreaChart\b/);
 assert.doesNotMatch(overview,/amount:\s*Math\.round\(item\.amount\)/);
 assert.match(chart,/<BarChart\b/);assert.match(chart,/domain=\{\[0,/);
 assert.match(chart,/isAnimationActive=\{false\}/);
 assert.match(chart,/privacyMode\s*\?/);
 assert.match(chart,/data-testid="overview-chart-values"/);
 assert.match(chart,/onPointSelect\(point\)/);
});
test('mobile month selector stays in flow and all its actions use the shared control geometry',()=>{
 const s=read('components/TerraOverview.tsx'),start=s.indexOf('data-testid="overview-month-selector"'),end=s.indexOf('Scope Pill Switcher',start);
 assert.ok(start>=0&&end>start);
 const block=s.slice(start,end);
 assert.match(block,/aria-controls="overview-month-controls-mobile"/);
 assert.doesNotMatch(block,/fixed inset-0|absolute top-full|active:scale-95/);
 assert.match(block,/aria-pressed=\{isSelected\}/);
 assert.match(block,/TOOLBAR_ACTION/);
});
