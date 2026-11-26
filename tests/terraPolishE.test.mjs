import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('history and wallet filters expose selected state and common target geometry',()=>{
 const h=read('components/TransactionHistory.tsx'),w=read('components/Wallet.tsx'),t=read('components/filterUiTokens.ts');
 assert.ok(h.includes('aria-pressed={typeFilter===type}'));
 assert.ok(w.includes('aria-pressed={isActive}'));
 assert.match(t,/FILTER_CHIP = '[^']*min-h-\[44px\]/);
});
test('drilldown uses semantic axis colors, selection and stable chart geometry',()=>{
 const s=read('components/drilldown/DrillDownAnalyticsChart.tsx');
 assert.ok(s.includes('fill="var(--terra-muted)"'));
 assert.ok(s.includes("aria-pressed={chartGranularity==='daily'}"));
 assert.doesNotMatch(s,/className="transition-all duration-300"/);
});
test('shared ripple and controls respect reduced motion',()=>{
 assert.ok(read('components/RippleButton.tsx').includes("(prefers-reduced-motion: reduce)"));
 assert.match(read('public/terra-ui.css'),/\.terra-shell :is\(button,a\[href\]/);
});
