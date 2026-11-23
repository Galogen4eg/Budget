import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(name)=>readFileSync(new URL('../components/'+name,import.meta.url),'utf8');
const plans=read('FamilyPlans.tsx');
const plansMobile=read('FamilyPlansMobile.tsx');
const agenda=read('FamilyAgendaPanel.tsx');
const overview=read('TerraOverview.tsx');
const budget=read('TerraBudget.tsx');
const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');

test('mobile plans share one vertical scroll container, not two nested scroll panes',()=>{
 assert.match(plans,/overflow-y-auto overscroll-y-contain touch-pan-y pt-\[calc\(64px\+env\(safe-area-inset-top\)\)\] md:pt-0 lg:overflow-hidden/);
 assert.match(plans,/flex-none min-h-0 lg:flex-1 lg:overflow-hidden/);
 assert.match(plansMobile,/overflow-visible/);
});
test('nearby agenda is collapsible on mobile and calendar does not include payments',()=>{
 assert.match(agenda,/aria-expanded=\{panelOpen\}/);
 assert.match(agenda,/md:hidden/);
 assert.doesNotMatch(agenda,/paymentAgenda\(/);
 assert.doesNotMatch(plans, /payments=\{settings\.mandatoryExpenses/);
});
test('overview chart uses restrained focus handling with a text alternative',()=>{
 assert.match(overview,/accessibilityLayer=\{false\}/);
 assert.match(overview,/aria-label=\{settings\.privacyMode \? 'График расходов: суммы скрыты'/);
 assert.match(overview,/График расходов: средний/);
 assert.doesNotMatch(overview,/complianceRate \|\| 87/);
 assert.match(overview,/Лимит не задан/);
});
test('overview and budget share mobile surface and minimum 44px actions',()=>{
 assert.match(overview,/bg-\[#FAF6F0\]/);
 assert.match(budget,/min-h-\[44px\]/);
 assert.match(budget,/flex-wrap/);
});

test('outer touch refresh does not interfere with plans vertical gestures',()=>{
 assert.match(app,/if \(activeTab === 'plans'\) \{/);
 assert.match(app,/touchStartY\.current = 0;/);
});
test('chart does not add invented time points and budget reports real shortfall',()=>{
 assert.doesNotMatch(overview,/label: '10', amount: 0, fullLabel/);
 assert.match(budget,/Результат месяца/);
 assert.doesNotMatch(budget,/monthBalance < 0 \\? "Дефицит" : "Осталось"/);
 assert.match(budget,/Math\.round\(\(monthExpense \/ monthIncome\) \* 100\)/);
});
