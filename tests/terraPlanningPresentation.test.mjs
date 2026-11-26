import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('archive or unknown opening balance does not present a zero daily target as a real calculation',()=>{
 const s=read('components/TerraBudget.tsx');
 assert.equal((s.match(/!isCurrentMonthView\|\|!personalOpeningKnown\?'—'/g)||[]).length,2);
 assert.match(s,/isCurrentMonthView&&personalOpeningKnown&&<p/);
});
test('limits have unique form identities and use the canonical category classifier',()=>{
 const s=read('components/BudgetPlanningPanel.tsx');
 assert.match(s,/useId\(\)/);
 assert.match(s,/categoriesForType\(categories,'expense'\)/);
 assert.match(s,/aria-controls=\{formId\}/);
 assert.match(s,/htmlFor=\{amountId\}/);
 assert.match(s,/id=\{amountId\}/);
 assert.match(s,/onClick=\{\(\)=>openLimit\(row.categoryId\)\}/);
 assert.match(s,/mutationPending.current/);
});
test('reserve and linked obligation keep kopecks, and private limit and reserve charts do not disclose amounts',()=>{
 const r=read('components/ReserveDetailsModal.tsx'),m=read('components/MandatoryExpenseModal.tsx'),p=read('components/BudgetPlanningPanel.tsx');
 assert.match(r,/return formatBudgetMoney\(val\)/);
 assert.doesNotMatch(r,/val.toFixed\(1\)/);
 assert.match(m,/setAmount\(String\(payment\)\)/);
 assert.doesNotMatch(m,/Math.round\(payment\)/);
 assert.match(p,/!settings.privacyMode&&<div[^>]*data-testid="category-limit-progress"/);
 assert.match(r,/privacyMode\?<span[^>]*>••••<\/span>:/);
});
