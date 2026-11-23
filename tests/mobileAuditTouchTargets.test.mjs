import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../components/'+name,import.meta.url),'utf8');
const plans=read('FamilyPlans.tsx');
const plansMobile=read('FamilyPlansMobile.tsx');
const shopping=read('ShoppingListMobile.tsx');
const budget=read('TerraBudget.tsx');

test('mobile plans scroll until desktop component activates at 1024px, not 768px',()=>{
 assert.match(plans,/lg:overflow-hidden/);
 assert.match(plans,/lg:flex-1 lg:overflow-hidden/);
 assert.doesNotMatch(plans,/md:flex-1 md:overflow-hidden/);
});
test('calendar participant filters are accessible 44px targets',()=>{
 assert.match(plansMobile,/aria-pressed=\{isSelected\}/);
 assert.match(plansMobile,/min-h-\[44px\].*rounded-full/);
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
