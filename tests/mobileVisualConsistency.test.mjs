import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(name)=>readFileSync(new URL('../components/'+name,import.meta.url),'utf8');
const plans=read('FamilyPlans.tsx');
const plansMobile=read('FamilyPlansMobile.tsx');
const agenda=read('FamilyAgendaPanel.tsx');
const overview=read('TerraOverview.tsx');
const budget=read('TerraBudget.tsx');

test('mobile plans share one vertical scroll container, not two nested scroll panes',()=>{
 assert.match(plans,/overflow-y-auto overscroll-y-contain touch-pan-y md:overflow-hidden/);
 assert.match(plans,/flex-none min-h-0 md:flex-1 md:overflow-hidden/);
 assert.match(plansMobile,/overflow-visible/);
});
test('nearby agenda is collapsible on mobile and calendar does not include payments',()=>{
 assert.match(agenda,/aria-expanded=\{expanded\}/);
 assert.match(agenda,/md:hidden/);
 assert.doesNotMatch(agenda,/paymentAgenda\(/);
 assert.doesNotMatch(plans, /payments=\{settings\.mandatoryExpenses/);
});
test('overview chart uses restrained focus handling with a text alternative',()=>{
 assert.match(overview,/accessibilityLayer=\{false\}/);
 assert.match(overview,/aria-label=\{\x60График расходов/);
 assert.doesNotMatch(overview,/complianceRate \|\| 87/);
 assert.match(overview,/Лимит не задан/);
});
test('overview and budget share mobile surface and minimum 44px actions',()=>{
 assert.match(overview,/bg-\[#FAF6F0\]/);
 assert.match(budget,/min-h-\[44px\]/);
 assert.match(budget,/flex-wrap/);
});
