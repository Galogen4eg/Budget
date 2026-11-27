import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Terra visual acceptance is a documented prerequisite for every section',()=>{
 assert.match(read('AGENTS.md'),/docs\/ui-design-contract.md/);
 assert.match(read('docs/ui-design-contract.md'),/VA-01[\s\S]*VA-08/);
 assert.match(read('docs/ci-release-gates.md'),/Visual acceptance/);
});
test('chart semantics are separate from destructive actions and match their legends',()=>{
 const css=read('public/terra-ui.css');
 for(const role of ['income-chart','expense-chart','danger-solid','danger-hover','on-danger'])assert.match(css,new RegExp('--terra-'+role+':'));
 const chart=read('components/drilldown/DrillDownAnalyticsChart.tsx');
 assert.match(chart,/fill="var\(--terra-expense-chart\)"/);
 assert.match(chart,/fill="var\(--terra-income-chart\)"/);
 assert.match(chart,/bg-\[var\(--terra-expense-chart\)\]/);
 assert.match(chart,/bg-\[var\(--terra-income-chart\)\]/);
 assert.match(read('components/overview/OverviewExpenseChart.tsx'),/fill="var\(--terra-expense-chart\)"/);
});
