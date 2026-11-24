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
