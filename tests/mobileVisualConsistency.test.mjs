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
 assert.match(plans,/overflow-y-auto overscroll-y-contain touch-pan-y/);
 assert.doesNotMatch(plans,/pt-\[calc\(64px\+/);
 assert.match(plans,/beforeContent=\{<FamilyAgendaPanel/);
 assert.ok(plansMobile.indexOf('<TerraMobileHeader')<plansMobile.indexOf('{beforeContent}'));
 assert.match(plans,/flex-none min-w-0/);
 assert.doesNotMatch(plans,/lg:overflow-hidden|md:overflow-hidden/);
 assert.match(plansMobile,/overflow-visible/);
});
test('nearby agenda is collapsible on mobile and calendar does not include payments',()=>{
 assert.match(agenda,/aria-expanded=\{panelOpen\}/);
 assert.match(agenda,/md:hidden/);
 assert.doesNotMatch(agenda,/paymentAgenda\(/);
 assert.doesNotMatch(plans, /payments=\{settings\.mandatoryExpenses/);
});
test('overview chart uses restrained focus handling with a text alternative',()=>{
 const chart=read('overview/OverviewExpenseChart.tsx');
 assert.match(chart,/accessibilityLayer=\{false\}/);
 assert.match(chart,/Значения графика/);
 assert.match(chart,/data-testid="overview-chart-values"/);
 assert.match(chart,/onClick=\{\(\) => onPointSelect\(point\)\}/);
 assert.match(chart,/График скрыт в режиме приватности/);
 assert.doesNotMatch(overview,/complianceRate \|\| 87/);
 assert.match(overview,/Лимит на день не задан/);
 assert.match(overview,/Месячный лимит не задан/);
 assert.match(overview,/Семейный лимит не применяется к личному графику/);
 assert.equal((overview.match(/complianceText=\{dynamicsData\.complianceText\}/g)||[]).length,2);
 assert.match(chart,/!privacyMode && <span[^>]*>\{complianceText\}<\/span>/);
});
test('overview and budget share mobile surface and minimum 44px actions',()=>{
 assert.match(overview,/bg-\[var\(--terra-canvas\)\]/);
 assert.match(budget,/bg-\[var\(--terra-canvas\)\]/);
 assert.match(budget,/min-h-\[44px\]/);
 assert.match(budget,/flex-wrap/);
});

test('native scroll is not intercepted by the simulated outer refresh in any tab',()=>{
 assert.doesNotMatch(app,/onTouchStart=\{handleTouchStart\}|onTouchMove=\{handleTouchMove\}|setPullY\(|Данные успешно обновлены/);
 assert.match(app,/w-full flex-1 min-h-0 flex flex-col overflow-hidden/);
});
test('chart does not add invented time points and budget reports real shortfall',()=>{
 assert.doesNotMatch(overview,/label: '10', amount: 0, fullLabel/);
 assert.match(budget,/Результат месяца/);
 assert.doesNotMatch(budget,/monthBalance < 0 \\? "Дефицит" : "Осталось"/);
 assert.match(budget,/Math\.round\(\(monthExpense \/ monthIncome\) \* 100\)/);
});

test('main mobile scroll viewports have explicit shrink bounds and no forced category minimum height',()=>{
 for(const [file,id] of [['TerraOverview.tsx','overview-scroll-container'],['TerraBudget.tsx','budget-scroll-container'],['ServicesHub.tsx','services-scroll-container'],['FamilyChat.tsx','chat-topics-scroll-container'],['FamilyChat.tsx','chat-messages-scroll-container'],['CategoriesSettings.tsx','categories-scroll-container'],['SettingsModal.tsx','settings-menu-scroll-container'],['LoginScreen.tsx','login-scroll-container']]){
  const code=read(file);
  const marker=code.indexOf('data-testid="'+id+'"');
  assert.ok(marker>=0,file);
  const tag=code.slice(marker,code.indexOf('>',marker));
  assert.match(tag,/min-h-0/,file);
  assert.match(tag,/overflow-y-auto/,file);
 }
 assert.doesNotMatch(read('SettingsModal.tsx'),/h-full overflow-hidden min-h-\[500px\]/);
 assert.match(read('LoginScreen.tsx'),/my-auto shrink-0/);
});
