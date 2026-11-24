import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../components/'+name,import.meta.url),'utf8');
const plans=read('FamilyPlans.tsx');
const plansMobile=read('FamilyPlansMobile.tsx');
const shopping=read('ShoppingListMobile.tsx');
const budget=read('TerraBudget.tsx');

test('plans retain native scroll across the 1024px desktop breakpoint',()=>{
 assert.match(plans,/window.innerWidth >= 1024/);
 assert.match(plans,/overflow-y-auto overscroll-y-contain touch-pan-y/);
 assert.doesNotMatch(plans,/lg:overflow-hidden|md:overflow-hidden/);
});
test('calendar participant filters are accessible 44px targets',()=>{
 assert.match(plansMobile,/aria-pressed=\{isSelected\}/);
 assert.match(plansMobile,/FILTER_CHIP/);
 const chipTokens=readFileSync(new URL('../components/filterUiTokens.ts',import.meta.url),'utf8');
 assert.match(chipTokens,/min-h-\[44px\]/);
 assert.match(chipTokens,/shrink-0/);
});
test('shopping checkbox and steppers have 44px targets and labelled amounts',()=>{
 assert.match(shopping,/aria-label="Уменьшить количество"/);
 assert.match(shopping,/aria-label="Увеличить количество"/);
 assert.match(shopping,/min-w-\[44px\] min-h-\[44px\]/);
});
test('budget month select and day-details controls are touch sized',()=>{
 assert.match(budget,/aria-expanded=\{isMonthPickerOpen\}/);
 assert.match(budget,/aria-label="Операции за выбранный день"/);
 assert.match(budget,/min-h-\[44px\]/);
});
