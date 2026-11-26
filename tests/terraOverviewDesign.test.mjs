import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('overview uses content-width layout and matching dashboard card surfaces',()=>{
 const s=read('components/TerraOverview.tsx'),css=read('public/terra-ui.css');
 assert.match(s,/terra-overview-layout/);
 assert.match(s,/data-testid="overview-balance-mobile" className=\{\x60\$\{DASHBOARD_CARD\}/);
 assert.match(s,/data-testid="overview-chart-mobile" className=\{\x60\$\{DASHBOARD_CARD\}/);
 assert.match(css,/\.terra-overview-layout \{container-type:inline-size;\}/);
 assert.match(css,/@container \(min-width:1120px\)/);
 assert.doesNotMatch(s,/fontSize:\s*(9|10)\b/);
 assert.doesNotMatch(s,/Резерв .* бюджета скорректирован/);
});
test('mobile header uses shared icon action tokens with focus and 44px size',()=>{
 const t=read('components/filterUiTokens.ts'),h=read('components/TerraMobileHeader.tsx');
 assert.match(t,/ICON_ACTION = '[^']*h-11 w-11[^']*focus-visible:ring/);
 const shared=read('components/TerraPageHeader.tsx');
 assert.ok((h.match(/<TerraHeaderAction\b/g)||[]).length>=4);
 assert.match(shared,/showLabel \? TOOLBAR_ACTION : ICON_ACTION/);
 assert.match(shared,/aria-label=\{label\}/);
});
