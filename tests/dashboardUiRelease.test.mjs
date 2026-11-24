import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('dashboard charts share card and tooltip tokens, stable plot geometry and no replayed area animations',()=>{
 const overview=read('components/TerraOverview.tsx');
 const tokens=read('components/filterUiTokens.ts');
 assert.match(tokens,/DASHBOARD_CARD = SURFACE_CARD/);
 assert.match(overview,/data-testid="overview-chart-mobile" className=\{.*DASHBOARD_CARD/);
 assert.match(overview,/data-testid="overview-chart-desktop" className=\{DASHBOARD_CARD\}/);
 assert.equal((overview.match(/className=\{\x60\$\{CHART_TOOLTIP\}/g)||[]).length,2);
 assert.equal((overview.match(/dataKey="amount"\s+isAnimationActive=\{false\}/g)||[]).length,2);
 assert.match(overview,/h-\[184px\]/);
 assert.match(overview,/h-\[240px\] lg:h-\[264px\]/);
});
test('motion respects OS preferences without changing scroll or data',()=>{
 assert.match(read('index.tsx'),/MotionConfig reducedMotion="user"/);
 assert.match(read('index.html'),/href="\/terra-ui.css"/);
 const css=read('public/terra-ui.css');
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
 assert.match(css,/transition: none !important; animation: none !important/);
 assert.match(css,/\.terra-press:active \{ transform: none; \}/);
 assert.doesNotMatch(css,/overflow|touch-action|position:\s*fixed/);
});
test('toolbar and navigation use stable touch targets and shared colors',()=>{
 const tokens=read('components/filterUiTokens.ts');
 assert.match(tokens,/TOOLBAR_ACTION = .*h-11 min-w-\[44px\]/);
 assert.match(read('components/TerraMobileHeader.tsx'),/TOOLBAR_ACTION_IDLE/);
 assert.match(read('components/overview/OverviewHeaderBar.tsx'),/TOOLBAR_ACTION_PRIMARY/);
 const app=read('App.tsx');
 assert.match(app,/min-w-\[44px\] min-h-\[48px\]/);
 assert.doesNotMatch(app,/group-hover:scale-105/);
});
