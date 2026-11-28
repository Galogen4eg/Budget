import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('dashboard charts share card and tooltip tokens, stable plot geometry and no replayed bar animations',()=>{
 const overview=read('components/TerraOverview.tsx'),chart=read('components/overview/OverviewExpenseChart.tsx');
 const tokens=read('components/filterUiTokens.ts'),css=read('public/terra-ui.css');
 assert.match(tokens,/DASHBOARD_CARD = SURFACE_CARD/);
 assert.match(overview,/data-testid="overview-chart-mobile" className=\{.*DASHBOARD_CARD/);
 assert.match(overview,/data-testid="overview-chart-desktop" className=\{.*DASHBOARD_CARD/);
 assert.equal((overview.match(/<OverviewExpenseChart\b/g)||[]).length,2);
 assert.match(chart,/className=\{CHART_TOOLTIP\}/);
 assert.match(chart,/<Bar dataKey="amount"[^>]*isAnimationActive=\{false\}/);
 assert.match(chart,/terra-overview-chart-plot/);
 assert.match(css,/\.terra-overview-chart-plot\s*\{height:184px;\}/);
 assert.match(css,/@media\(min-width:768px\)\{\.terra-overview-chart-plot\{height:208px;\}\}/);
 assert.match(css,/@media\(min-width:1024px\)\{\.terra-overview-chart-plot\{height:224px;\}\}/);
});
test('motion respects OS preferences without changing scroll or data',()=>{
 assert.match(read('index.tsx'),/MotionConfig reducedMotion="user"/);
 assert.match(read('index.html'),/href="\/terra-ui.css"/);
 const css=read('public/terra-ui.css');
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
 assert.match(css,/transition: none !important; animation: none !important/);
 assert.match(css,/\.terra-press:active \{ transform: none; \}/);
 const motion=css.split('/* Terra semantic color roles')[0];
 assert.doesNotMatch(motion,/overflow|touch-action|position:\s*fixed/);
 for(const block of css.matchAll(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/g))assert.doesNotMatch(block[1],/overflow|touch-action|position:\s*fixed/);
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

test('semantic palette and compact settings apply without removing keyboard focus',()=>{
 const css=read('public/terra-ui.css');
 assert.match(css,/--terra-canvas:#F6F1E8/);
 assert.match(css,/html\.dark \{/);
 assert.match(css,/recharts-wrapper:focus:not\(:focus-visible\)/);
 assert.match(css,/recharts-surface:focus-visible/);
 assert.match(read('components/SettingsModal.tsx'),/md:max-w-\[min\(94vw,1120px\)\]/);
 assert.match(read('components/SettingsModal.tsx'),/data-terra-settings="true"/);
 for(const path of ['TerraBudget','ShoppingListMobile','ShoppingListDesktop','FamilyPlansMobile','FamilyPlansDesktop','FamilyChat','ServicesHub','Wallet','DebtSnowball'])assert.match(read('components/'+path+'.tsx'),/var\(--terra-/);
});

test('settings keeps advanced controls accessible without making them the default view',()=>{
 const settings=read('components/SettingsModal.tsx');
 assert.match(settings,/<details[\s\S]*?<summary className="terra-settings-summary">Разграничение финансового доступа/);
 assert.match(settings,/terra-appearance-grid/);
 assert.match(settings,/visibleMenuTabs\(settings.enabledTabs\)/);
 assert.match(settings,/menuPreferencePatch\(settings.enabledTabs,settings.startTab,id,e.target.checked\)/);
 assert.match(read('public/terra-ui.css'),/\.terra-appearance-grid/);
});
test('primary editors use the shared surface palette',()=>{
 for(const name of ['GoalModal','EventModal','AddTransactionModal','MandatoryExpenseModal','ConfirmationModal','ImportModal','LoyaltyCardMobileModal','NotificationsModal','DrillDownModal'])assert.match(read('components/'+name+'.tsx'),/var\(--terra-(surface|soft)\)/,name);
});


test('desktop metric cards use shared surfaces and readable wrapping labels',()=>{
 const overview=read('components/TerraOverview.tsx');
 const section=overview.split('data-testid="overview-metrics-desktop"')[1]?.split('</section>')[0];
 assert.ok(section);
 assert.match(overview,/data-testid="overview-metrics-desktop" className=\{DASHBOARD_CARD\+/);
 assert.match(section,/terra-overview-summary-main/);
 assert.match(section,/terra-overview-summary-side/);
 assert.match(section,/data-overview-summary-zone="balance"/);
 assert.match(section,/data-overview-summary-zone="period"/);
 assert.match(section,/data-overview-summary-zone="today"/);
 assert.match(section,/\{monthMoneyPair\}/);
 assert.match(section,/data-testid="overview-daily-reserve-desktop"/);
 assert.match(section,/\{monthlySummary\}/);
 assert.match(section,/Открыть подробности семейного резерва/);
 assert.doesNotMatch(section,/whitespace-nowrap|uppercase tracking-wider|shadow-sm/);
 assert.match(section,/focus-visible:ring-2/);
 for(const name of ['sharedLedger','reservedAmount'])assert.match(section,new RegExp('formatAmount\\('+name+'\\)'));
 assert.match(section,/\{dailySummary\}/);
 const summary=overview.split('const dailySummary = (')[1]?.split('return (')[0];
 assert.ok(summary);
 for(const name of ['dailyLimit','spentToday'])assert.match(summary,new RegExp('formatAmount\\('+name+'\\)'));
 assert.equal((summary.match(/role="progressbar"/g)||[]).length,1);
 assert.match(summary,/!settings\.privacyMode&&personalOpeningKnown&&dailyLimit>0/);
});


test('overview transaction history uses compact rows and preserves edit actions',()=>{
 const overview=read('components/TerraOverview.tsx');
 for(const [marker,end] of [['overview-history-mobile','</section>'],['overview-history-desktop','{/* Reserve Details Modal */}']]){
  const section=overview.split('data-testid="'+marker+'"')[1]?.split(end)[0];
  assert.ok(section,marker);
  assert.match(section,/divide-y divide-\[var\(--terra-border\)\]/);
  assert.match(section,marker.endsWith('mobile')?/renderHistoryRows\(recentMobileTransactions\)/:/renderHistoryRows\(recentTransactions\)/);
  assert.doesNotMatch(section,/СЕГОДНЯ|whitespace-nowrap/);
 }
 const row=overview.split('const renderHistoryRows=')[1].split('const renderCategoryRows=')[0];
 assert.match(row,/min-h-\[56px\]/);
 assert.match(row,/<button type="button"/);
 assert.match(row,/onEditTransaction\(tx\)/);
 assert.match(row,/formatAmount\(tx.amount\)/);
 assert.match(row,/data-overview-history-meta/);
 assert.match(row,/data-overview-history-amount/);
});


test('desktop overview widgets retain actions and avoid decorative card clutter',()=>{
 const overview=read('components/TerraOverview.tsx');
 const section=overview.split('{/* Сетка «Категории расходов»')[1]?.split('{/* Reserve Details Modal */}')[0];
 assert.ok(section);
 assert.doesNotMatch(section,/КАТЕГОРИИ РАСХОДОВ|СПИСОК ПОКУПОК|СОБЫТИЯ НА ЭТОЙ НЕДЕЛЕ|Все покупки сделаны!|whitespace-nowrap/);
 for(const action of ['renderCategoryRows()','handleToggleShopping={handleToggleShopping}','handleAddShoppingInline','onEditEvent(ev)'])assert.ok(section.includes(action),action);
 assert.match(section,/<QuickShoppingWidget/);
 assert.match(read('components/QuickShoppingWidget.tsx'),/aria-label=\{desktop\?"Добавить в список покупок":"Добавить покупку"\}/);
 const row=overview.split('const renderCategoryRows=')[1].split('return (')[0];
 assert.match(row,/onDrillDown\(cat.id\|\|'all'\)/);
 assert.match(row,/formatAmount\(cat.amount\)/);
 assert.match(row,/data-overview-category-percent/);
 assert.match(section,/aria-label="Управление категориями"/);
 assert.match(section,/min-h-\[44px\] min-w-\[44px\]/);
});


test('mobile quick shopping uses shared surfaces and stable touch controls',()=>{
 const widget=read('components/QuickShoppingWidget.tsx');
 assert.match(widget,/\$\{DASHBOARD_CARD\}/);
 assert.match(widget,/divide-y divide-\[var\(--terra-border\)\]/);
 assert.doesNotMatch(widget,/animate-pulse-slow|animate-press|after:inset-\[-10px\]/);
 assert.match(widget,/handleToggleShopping\(item as any\)/);
 assert.match(widget,/onSubmit=\{handleAddShoppingInline\}/);
 assert.match(widget,/w-11 h-11/);
});


test('budget metric cards simplify labels and hide derived money in privacy mode',()=>{
 const budget=read('components/TerraBudget.tsx');
 const mobile=budget.split('{/* KPI & Family Overview Card */}')[1]?.split('{/* Family Member Filter Chips')[0];
 const desktop=budget.split('{/* 2. TOP KPI CARDS:')[1]?.split('{/* 3. MAIN WORKSPACE:')[0];
 const shared=budget.split('const renderTodayMetrics=')[1]?.split('  return (')[0];
 assert.ok(mobile && desktop && shared);
 assert.match(mobile,/renderTodayMetrics\(true\)/);
 assert.match(mobile,/renderMonthTotals\(true\)/);
 assert.match(desktop,/renderTodayMetrics\(false\)/);
 assert.match(desktop,/renderMonthTotals\(false\)/);
 assert.doesNotMatch(mobile,/Рассчитан|shadow-xs/);
 assert.doesNotMatch(desktop,/Ориентир рассчитан|>факт<|truncate block|uppercase tracking-wider/);
 assert.ok(shared.includes("safeDailyLimit <= 0 || settings.privacyMode ? ''"));
 assert.ok(shared.includes('!settings.privacyMode && safeDailyLimit > 0 && yesterdaySpent < safeDailyLimit'));
 for(const section of [mobile,desktop]){
  assert.ok(section.includes('formatBudgetMoney(safeDailyLimit)'));
  assert.ok(shared.includes('terra-progress'));
 }
});


test('budget calendar, operations and category cards retain stable actions and precise amounts',()=>{
 const budget=read('components/TerraBudget.tsx');
 const mobile=budget.split('data-testid="budget-calendar-mobile"')[1]?.split('{/* Selected Day Details')[0];
 const desktop=budget.split('data-testid="budget-calendar-desktop"')[1]?.split('{/* Selected Day Detail Box')[0];
 assert.ok(mobile && desktop);
 assert.match(mobile,/min-h-\[44px\] min-w-\[44px\]/);
 for(const calendar of [mobile,desktop]){
  assert.match(calendar,/setSelectedDay\(dayNum\)/);
  assert.match(calendar,/focus-visible:ring-2/);
  assert.doesNotMatch(calendar,/active:scale|transition-all/);
 }
 assert.match(desktop,/title=\{settings\.privacyMode \? undefined :/);
 const detail=budget.split('{/* Selected Day Detail Box')[1]?.split('{/* RIGHT: Analytics Sidebar')[0];
 assert.doesNotMatch(detail,/bg-gradient-to-b|↗ карточка/);
 assert.match(detail,/onEditTransaction\(tx\)/);
 assert.match(detail,/onClick=\{handleQuickAdd\}/);
 const sidebar=budget.split('{/* RIGHT: Analytics Sidebar')[1]?.split('{/* Modals */}')[0];
 assert.match(sidebar,/formatBudgetMoney\(cat.sum\)/);
 assert.doesNotMatch(sidebar,/Math.round\(cat.sum\)/);
 assert.match(sidebar,/renderMandatoryPayments\('desktop'\)/);
 const payments=budget.split('const renderMandatoryPayments=')[1]?.split('const renderTodayMetrics=')[0];
 assert.match(payments,/onToggleMandatoryPaid\(exp.id\)/);
 assert.match(budget,/renderMandatoryPayments\('mobile'\)/);
 const history=budget.split('data-testid="budget-history-desktop"')[1]?.split('</section>')[0];
 assert.match(history,/historySearch=\{historySearch\}/);
 assert.match(history,/historyCategory=\{historyCategory\}/);
 assert.match(history,/onEditTransaction\(tx\)/);
});

 test('monthly metrics use aligned rows and negative results have a distinct semantic color',()=>{
 const s=read('components/TerraBudget.tsx');assert.match(s,/terra-month-totals/);assert.match(s,/monthBalance<0\?'text-\[var\(--terra-danger-text\)\]'/);assert.match(s,/id=\{\x27budget-payments-\x27\+layout\}/);assert.match(s,/renderMandatoryPayments\(\x27mobile\x27\)/);
 });
