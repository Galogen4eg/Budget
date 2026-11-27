import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('overview uses content-width layout and matching dashboard card surfaces',()=>{
 const s=read('components/TerraOverview.tsx'),css=read('public/terra-ui.css');
 assert.match(s,/terra-overview-layout/);
 assert.match(s,/data-testid="overview-balance-mobile" className=\{\x60\$\{DASHBOARD_CARD\}/);
 assert.match(s,/data-testid="overview-chart-mobile" className=\{\x60\$\{DASHBOARD_CARD\}/);
 // The shared layout context replaces the old overview-only container.
 assert.match(s,/className="terra-layout-context[^"]*" data-terra-layout="mobile"/);
 assert.match(s,/data-terra-layout="desktop" className="terra-layout-context[^"]*terra-layout-page/);
 assert.match(s,/data-terra-grid="workspace" className="terra-layout-grid/);
 assert.match(css,/\.terra-layout-context\s*\{[^}]*container-type:\s*inline-size\s*;/);
 assert.match(css,/\.terra-layout-grid\s*\{[^}]*--terra-grid-columns:\s*4\s*;[^}]*grid-template-columns:\s*repeat\(var\(--terra-grid-columns\),minmax\(0,1fr\)\)[^}]*align-items:\s*start/);
 for (const [width, tracks] of [[520,8],[1040,12]]) {
  const breakpoint = new RegExp('@container\\s*\\(min-width:\\s*'+width+'px\\)\\s*\\{\\s*\\.terra-layout-grid\\[data-terra-grid="workspace"\\],\\s*\\.terra-layout-grid\\[data-terra-grid="summary"\\]\\s*\\{[^}]*--terra-grid-columns:\\s*'+tracks+'\\s*;');
  assert.match(css,breakpoint);
 }
 assert.doesNotMatch(s,/fontSize:\s*(9|10)\b/);
 assert.doesNotMatch(s,/Резерв .* бюджета скорректирован/);
});
test('mobile header uses shared icon action tokens with focus and 44px size',()=>{
 const t=read('components/filterUiTokens.ts'),h=read('components/TerraMobileHeader.tsx');
 assert.match(t,/ICON_ACTION = '[^']*h-11 w-11[^']*focus-visible:ring/);
 assert.ok((h.match(/\$\{ICON_ACTION\}/g)||[]).length>=4);
});

test('overview presents only actionable scope switches and preserves important balance explanations',()=>{
 const s=read('components/TerraOverview.tsx'),h=read('components/overview/OverviewHeaderBar.tsx');
 assert.match(s,/\{!personalOnly&&<div[^>]*data-testid="overview-scope-mobile"/);
 assert.match(h,/\{!householdPersonal&&<div[^>]*data-testid="overview-scope-desktop"/);
 assert.match(s,/const balanceExplanation/);assert.match(s,/personalOpeningKnown \? null/);assert.match(s,/Баланс и дневной ориентир остаются семейными/);
 assert.match(s,/data-testid="overview-balance-value-mobile"/);
});
test('overview list actions use readable semantic colors and short shopping previews',()=>{
 const s=read('components/TerraOverview.tsx'),q=read('components/QuickShoppingWidget.tsx'),c=read('components/overview/OverviewExpenseChart.tsx');
 for(const id of ['overview-history-all-mobile','overview-history-all-desktop'])assert.match(s,new RegExp('data-testid="'+id+'"[^>]*text-\\[var\\(--terra-primary-text\\)\\]'));
 assert.doesNotMatch(s,/style=\{\{ color: txMember.color \}\}/);
 assert.match(q,/displayShoppingItems.slice\(0, 4\)/);assert.match(c,/width=\{mobile \? 62 : 80\}/);
});
