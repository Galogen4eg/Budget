/** Shared UI scenarios. Caller owns browser, data and network isolation. */
export async function runNavigationAudit(page,{includeInventoryDetails=false,extraViewports=[[320,568],[768,1024],[1280,800],[1920,1080]]}={}){
page.setDefaultTimeout(10000);
const failures=[],counts=[];
const first=loc=>loc.filter({visible:true}).first();
const button=(scope,name,exact=true)=>first(scope.getByRole('button',{name,exact}));
const panel=id=>page.locator('[data-tab-panel="'+id+'"]');
let label='desktop-1440';
let action='';
const mobile=()=>label.startsWith('mobile');
const settingsButton=()=>button(panel('overview'),mobile()?'Настройки и профиль':'Настройки');
const readyControl={overview:()=>first(panel('overview').getByRole('group',{name:/Период динамики расходов/})),budget:()=>button(panel('budget'),'Добавить операцию'),plans:()=>first(panel('plans').getByTestId('plans-scroll-container')),shopping:()=>button(panel('shopping'),/Быстрые списки/,false),chat:()=>mobile()?button(panel('chat'),'К спискам чатов'):panel('chat').getByRole('heading',{name:'Семейные беседы',exact:true}),services:()=>panel('services').locator('[data-testid="services-scroll-container"]')};
async function openSettings(){action='open settings';await (mobile()?settingsButton():button(page,'Настройки')).click();const d=page.getByRole('dialog',{name:'Настройки',exact:true});await d.waitFor({state:'visible'});return d;}
const nav=async(id,name)=>{
 await button(page.locator('nav'),name).click();
 await panel(id).waitFor({state:'visible'});
 await readyControl[id]().waitFor({state:'visible',timeout:30000});
 if(await button(page.locator('nav'),name).getAttribute('aria-current')!=='page')throw new Error('Navigation selected state missing');
};
const run=async(id,fn)=>{
 action='enter scenario';
 try{await fn();console.log('PASS '+label+' '+id);}
 catch(error){failures.push(label+' '+id);console.error('FAIL '+label+' '+id+' at '+action+' ('+(error?.name==='TimeoutError'?'timeout':'assertion/action')+')');}
};
async function ready(){
 await page.waitForFunction(()=>window.__budgetAlfaSyncProtocol===2,null,{timeout:45000});
 await first(page.locator('nav').getByRole('button',{name:'Бюджет',exact:true})).waitFor({state:'visible'});
}
async function reload(){
 await page.reload({waitUntil:'domcontentloaded'});
 await ready();
}
async function inventory(id){
 const result=await panel(id).evaluate(el=>{
  const visible=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
  const all=[...el.querySelectorAll('button,a[href],input,select,textarea,[role=button],[role=switch]')].filter(visible);
  return {controls:all.length,disabled:all.filter(e=>e.disabled||e.getAttribute('aria-disabled')==='true').length,unnamed:all.filter(e=>!(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.getAttribute('title')||e.getAttribute('placeholder')||e.textContent?.trim()||e.labels?.length)).length};
 });
 if(!result.controls)throw new Error('Mounted panel contains no visible controls');
 counts.push({viewport:label,section:id,...result});
 if(includeInventoryDetails){
  const controls=await panel(id).evaluate(el=>[...el.querySelectorAll('button,a[href],input,select,textarea,[role=button],[role=switch],[role=tab],[role=checkbox]')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>({tag:e.tagName.toLowerCase(),role:e.getAttribute('role'),name:(e.getAttribute('aria-label')||e.getAttribute('title')||e.getAttribute('placeholder')||e.textContent?.trim()||'').replace(/\s+/g,' ').slice(0,120),disabled:!!(e.disabled||e.getAttribute('aria-disabled')==='true'),pressed:e.getAttribute('aria-pressed'),expanded:e.getAttribute('aria-expanded')})));
  console.log('CONTROL INVENTORY '+label+' '+id+' '+JSON.stringify(controls));
 }
 console.log('INVENTORY '+label+' '+id+' '+JSON.stringify(result));
}
const sections=[['overview','Обзор'],['budget','Бюджет'],['plans','Планы'],['shopping','Покупки'],['chat','Чат'],['services','Сервисы']];
const settings=['Профиль и безопасность','Оформление и приватность','Меню и обзор','Семья и доступ','Параметры бюджета','Категории и правила','История операций','Интеграции','Диагностика и установка'];
const expectVisible=loc=>loc.waitFor({state:'visible'});
async function checkSections(){
 for(const [id,name] of sections)await run('NAV-'+id,async()=>{await nav(id,name);await inventory(id);});
 await run('OVR-periods',async()=>{
  await nav('overview','Обзор');
  const periods=first(panel('overview').getByRole('group',{name:/Период динамики расходов/}));
  for(const name of ['День','Неделя','Месяц']){
   const tab=button(periods,name);await tab.click();
   if(await tab.getAttribute('aria-pressed')!=='true')throw new Error('Chart selection missing');
  }
 });
 await run('BUD-months-and-editor-cancel',async()=>{
  await nav('budget','Бюджет');
  const p=panel('budget');
  if(mobile()){
   action='open mobile month picker';
   const picker=button(p,/^Выбрать месяц:/,false);
   await picker.click();
   if(await picker.getAttribute('aria-expanded')!=='true')throw new Error('Month picker did not open');
   const before=await picker.getAttribute('aria-label');
   action='previous month in picker';await button(p,'Предыдущий месяц').click();
   if(await picker.getAttribute('aria-label')===before)throw new Error('Month did not change');
   action='next month in picker';await button(p,'Следующий месяц').click();
   if(await picker.getAttribute('aria-label')!==before)throw new Error('Month did not return');
   await button(p,'Текущий месяц').click();
   action='calendar month arrows';
   for(const name of ['Предыдущий месяц в календаре','Следующий месяц в календаре'])await button(p,name).click();
  }else{
   action='desktop month arrows';
   for(const name of ['Предыдущий месяц','Следующий месяц'])await button(p,name).click();
  }
  action='open transaction editor';
  await button(p,'Добавить операцию').click();
  const heading=page.getByRole('heading',{name:'Новая операция',exact:true});
  action='wait for new transaction heading';await expectVisible(heading);
  action='fill amount without saving';await page.getByRole('textbox',{name:'Сумма операции'}).fill('12.34');
  action='cancel editor';await button(page,'Закрыть модальное окно').click();
  await heading.waitFor({state:'hidden'});
 });
 await reload();
 await run('PLN-views-calendar-and-editor',async()=>{
  await nav('plans','Планы');const p=panel('plans');
  for(const name of ['Месяц','Неделя','День','Расписание']){
   const tab=button(p,name);await tab.click();
   if(await tab.getAttribute('aria-pressed')!=='true')throw new Error('Calendar selection missing');
  }
  await button(p,'День').click();
  for(const name of ['Следующий день','Предыдущий день'])await button(p,name).click();
  await button(p,'Добавить событие').click();
  const dialog=page.getByRole('dialog').filter({has:page.locator('#event-title-input')});
  await expectVisible(dialog);
  await button(dialog,'Закрыть редактор события').click();
  await dialog.waitFor({state:'hidden'});
 });
 await reload();
 await run('SHP-quick-lists-and-repeat',async()=>{
  await nav('shopping','Покупки');
  for(const name of [/Быстрые списки/,/Повторить покупки/]){
   const b=button(panel('shopping'),name,false);await b.click();
   if(await b.getAttribute('aria-expanded')!=='true')throw new Error('Shopping panel did not expand');
   await b.click();
   if(await b.getAttribute('aria-expanded')!=='false')throw new Error('Shopping panel did not collapse');
  }
 });
 await run('CHAT-topic-list',async()=>{
  await nav('chat','Чат');
  const p=panel('chat');
  const back=button(p,'К спискам чатов');
  if(mobile()){action='return to chat list';await back.waitFor({state:'visible'});await back.click();}
  action='wait for topic list';await expectVisible(p.getByRole('heading',{name:'Семейные беседы'}));
  await expectVisible(button(p,'Создать тему'));
  // Topic creation is deliberately not invoked in the navigation-only suite.
  const topics=p.getByTestId('chat-topics-scroll-container').getByRole('button');
  if(await topics.count()){
   action='open existing topic';await first(topics).click();
   action='open message search';await expectVisible(button(p,'Поиск'));
   await button(p,'Поиск').click();
   await expectVisible(p.getByPlaceholder('Поиск по сообщениям...'));
   await p.getByPlaceholder('Поиск по сообщениям...').fill('QA navigation search');
   await button(p,'Закрыть').click();
   await p.getByPlaceholder('Поиск по сообщениям...').waitFor({state:'hidden'});
  }else console.log('BLOCKED '+label+' CHAT-topic-open: no topic fixture');
 });
 for(const [name,target] of [
  ['Долги','debt'],['Карты лояльности','wallet'],['Чеки ФНС и выписки','receipts']
 ])await run('SVC-'+target,async()=>{
  await nav('services','Сервисы');
  const p=panel('services'),grid=p.locator('[data-purpose="service-cards-grid"]');
  await button(grid,new RegExp('^'+name),false).click();
  await grid.waitFor({state:'hidden'});
  if(target==='debt')await expectVisible(p.getByRole('region',{name:'Сводка по долгам'}));
  else{
   await expectVisible(p.getByRole('heading',{name,exact:true}));
   await button(p,'Все сервисы').click();
   await expectVisible(grid);
  }
  if(target==='debt'){await nav('overview','Обзор');await nav('services','Сервисы');await expectVisible(grid);}
 });
 await reload();
 await run('SET-open-search',async()=>{
  await nav('overview','Обзор');const dialog=await openSettings();
  action='settings search';
  const search=first(dialog.getByRole('searchbox',{name:'Поиск настроек'}));
  await search.fill('профиль');
  await expectVisible(button(dialog,/Профиль и безопасность/,false));
  await search.fill('qa-no-match-2026');
  await expectVisible(first(dialog.getByText('Настройки не найдены',{exact:true})));
  await search.fill('');
  await button(dialog,'Закрыть настройки').click();
  await dialog.waitFor({state:'hidden'});
 });
 for(const name of settings)await run('SET-'+name,async()=>{
  await reload();await nav('overview','Обзор');const dialog=await openSettings();
  action='select settings subsection';
  const tab=button(dialog.getByRole('navigation',{name:'Разделы настроек'}),new RegExp('^'+name),false);
  await tab.click();
  action='wait for settings content';await expectVisible(first(dialog.getByTestId('settings-section-scroll-container')));
  if(label.startsWith('mobile')){
   action='check mobile subsection heading';await expectVisible(first(dialog.getByRole('heading',{name,exact:true})));
   action='return to settings menu';await button(dialog,'Назад').click();
   await expectVisible(tab);
  }else if(await tab.getAttribute('aria-current')!=='page')throw new Error('Settings selection missing');
  action='close settings';await button(dialog,'Закрыть настройки').click();
  await dialog.waitFor({state:'hidden'});
 });
 if(!label.startsWith('mobile')){
  await run('GLOBAL-notifications',async()=>{
   await nav('overview','Обзор');await button(page,'Уведомления').click();
   const h=page.getByRole('heading',{name:'Уведомления',exact:true});await expectVisible(h);
   await button(h.locator('xpath=../..'),'Закрыть').click();await h.waitFor({state:'hidden'});
  });
 }
 await run('GLOBAL-AI-open-close',async()=>{
   await nav('overview','Обзор');action='open assistant';await button(page,'AI Ассистент').click();const close=button(page,'Закрыть чат');
   action='close assistant';await expectVisible(close);await close.click();await close.waitFor({state:'hidden'});
 });
}

const controlResults=[];
const unavailable=[];
async function buttonScenario(id,fn){
 await run('BUTTON-'+id,async()=>{
  action='reset to authenticated app';await reload();
  try{await fn();controlResults.push({viewport:label,id,result:'pass'});}
  catch(error){controlResults.push({viewport:label,id,result:'fail',action});throw error;}
 });
}
const check=(condition,msg)=>{if(!condition)throw new Error(msg);};
const clickPressed=async(el)=>{
 await el.click();check(await el.getAttribute('aria-pressed')==='true','Selected control not pressed');
};
const closeEvent=async()=>{
 const d=page.getByRole('dialog').filter({has:page.locator('#event-title-input')});
 await expectVisible(d);await button(d,'Закрыть редактор события').click();await d.waitFor({state:'hidden'});
};
async function checkButtons(){
 if(!mobile())await buttonScenario('NAV-01-sidebar-toggle',async()=>{
  await nav('overview','Обзор');
  action='expand sidebar';const expanded=button(page,'Развернуть боковое меню');const collapsed=button(page,'Свернуть боковое меню');
  if(await collapsed.count()){await collapsed.click();await expectVisible(expanded);}
  await expanded.click();await expectVisible(collapsed);check(await collapsed.getAttribute('aria-expanded')==='true','Sidebar not expanded');
  action='collapse sidebar';await collapsed.click();await expectVisible(expanded);check(await expanded.getAttribute('aria-expanded')==='false','Sidebar not collapsed');
 });
 await buttonScenario('OVR-06-category-analytics',async()=>{
  await nav('overview','Обзор');action='open category analytics';
  await first(panel('overview').getByTitle('Открыть аналитику всех категорий',{exact:true})).click();
  const inspector=first(page.getByTitle('Реестр операций',{exact:true}));
  const analytics=first(page.getByTitle('Аналитика и графики трат',{exact:true}));
  await expectVisible(inspector);await expectVisible(analytics);
  action='switch to analytics';await analytics.click();await expectVisible(first(page.getByText('Аналитика трат',{exact:true})));
  action='switch back to registry';await inspector.click();await expectVisible(first(page.getByText('Реестр операций',{exact:true})));
  action='close drilldown';await first(page.getByTitle('Закрыть',{exact:true})).click();await analytics.waitFor({state:'hidden'});
 });
 await buttonScenario('OVR-report-to-budget',async()=>{
  await nav('overview','Обзор');action='open report via overview';
  await button(panel('overview'),mobile()?/^К бюджету/:/^Подробный отчет/,false).click();
  await expectVisible(panel('budget'));check(await button(page.locator('nav'),'Бюджет').getAttribute('aria-current')==='page','Budget nav not selected');
 });
 if(!mobile())await buttonScenario('OVR-05-reserve-details',async()=>{
  await nav('overview','Обзор');action='open reserve';await button(panel('overview'),/^Открыть подробности (семейного|личного) резерва$/,false).click();
  const h=page.getByRole('heading',{name:'Структура резерва',exact:true});await expectVisible(h);
  action='close reserve';await button(h.locator('xpath=../../..'),'Закрыть').click();await h.waitFor({state:'hidden'});
 });
 await buttonScenario('OVR-11-shopping-shortcut',async()=>{
  await nav('overview','Обзор');const p=panel('overview');
  action='locate shopping widget';const h=first(p.getByRole('heading',{name:'Список покупок',exact:true}));
  // The mobile widget can be conditionally absent. Never invent its presence.
  if(!await h.count()){unavailable.push({viewport:label,id:'OVR-11-shopping-shortcut',reason:'widget not present'});throw new Error('Shopping widget fixture absent');}
  action='open shopping via widget';await button(h.locator('xpath=../../..'),'Все').click();await expectVisible(panel('shopping'));
 });
 await buttonScenario('BUD-02-member-filter',async()=>{
  await nav('budget','Бюджет');const group=first(panel('budget').getByRole('group',{name:'Участник бюджета'}));await expectVisible(group);
  const choices=group.getByRole('button');check(await choices.count()>=2,'No QA member option');
  action='select member';await clickPressed(choices.nth(1));check(await button(group,'Все').getAttribute('aria-pressed')==='false','All filter remained selected');
  action='restore all members';await clickPressed(button(group,'Все'));check(await choices.nth(1).getAttribute('aria-pressed')==='false','Member filter remained selected');
 });
 await buttonScenario('BUD-04-select-calendar-day',async()=>{
  await nav('budget','Бюджет');const p=panel('budget');const calendar=first(p.getByTestId(mobile()?'budget-calendar-mobile':'budget-calendar-desktop'));
  await expectVisible(calendar);action='choose a different date';const choice=first(calendar.locator('[role="button"][aria-pressed="false"][aria-label^="Выбрать"]'));
  const selected=await choice.getAttribute('aria-label');await clickPressed(choice);
  check(await button(calendar,selected).getAttribute('aria-pressed')==='true','Selected date lost');
 });
 await buttonScenario('BUD-05-day-details',async()=>{
  await nav('budget','Бюджет');action='open day details';await button(panel('budget'),mobile()?'Операции за выбранный день':'Операции за день').click();
  const body=first(page.getByText('Финансовые операции и детальный баланс дня',{exact:true}));await expectVisible(body);
  action='close day details';await first(page.getByTitle('Закрыть',{exact:true})).click();await body.waitFor({state:'hidden'});
 });
 await buttonScenario('BUD-16-new-payment-cancel',async()=>{
  await nav('budget','Бюджет');action='open mandatory payment editor';await button(panel('budget'),'Добавить обязательный платёж').click();
  const h=page.getByRole('heading',{name:'Новый обязательный платёж',exact:true});await expectVisible(h);
  action='edit draft without saving';await page.locator('#paymentName').fill('QA unsaved draft');await page.locator('#paymentAmount').fill('123.45');
  action='cancel payment editor';await button(h.locator('xpath=..'),'Закрыть').click();await h.waitFor({state:'hidden'});
 });
 await buttonScenario('PLN-01-agenda-filters',async()=>{
  await nav('plans','Планы');const p=panel('plans');const toggle=first(p.locator('button[aria-controls="family-agenda-content"]'));
  action='expand agenda';if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  check(await toggle.getAttribute('aria-expanded')==='true','Agenda did not expand');
  const group=first(p.getByRole('group',{name:'Период календаря'}));await expectVisible(group);
  for(const name of ['Сегодня','7 дней','30 дней','Задачи']){action='agenda filter '+name;await clickPressed(button(group,name));}
  action='collapse agenda';await toggle.click();check(await toggle.getAttribute('aria-expanded')==='false','Agenda did not collapse');await group.waitFor({state:'hidden'});
 });
 await buttonScenario('PLN-02-member-filter-and-month-date',async()=>{
  await nav('plans','Планы');const p=panel('plans');
  action='calendar member filter';const group=first(p.getByRole('group',{name:mobile()?'Фильтр участников планов':'Участник планов'}));await expectVisible(group);
  const choices=group.locator('button[aria-pressed]');check(await choices.count()>=2,'No member filter');
  const initial=await choices.evaluateAll(nodes=>nodes.findIndex(n=>n.getAttribute('aria-pressed')==='true'));
  check(initial>=0,'Missing active filter');await clickPressed(choices.nth(initial===0?1:0));await clickPressed(choices.nth(initial));
  action='month view';await clickPressed(button(p,'Месяц'));
  action='choose another date';const cell=first(p.locator('[aria-label^="Выбрать"][aria-pressed="false"]'));await clickPressed(cell);
 });
 await buttonScenario('PLN-03-task-editor-cancel',async()=>{
  await nav('plans','Планы');const p=panel('plans');
  if(mobile()){const toggle=first(p.locator('button[aria-controls="family-agenda-content"]'));if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();}
  action='open task editor';await button(p,'Задача').click();
  const d=page.getByRole('dialog').filter({has:page.locator('#event-title-input')});await expectVisible(d);
  const kind=d.locator('select').filter({has:d.locator('option[value="task"]')});
  check(await kind.inputValue()==='task','Task editor opened as event');
  action='cancel unsaved task';await closeEvent();
 });
 await buttonScenario('SHP-06-search-clear',async()=>{
  await nav('shopping','Покупки');const p=panel('shopping');const input=p.getByRole('textbox',{name:'Поиск по товарам в семейном списке'});
  action='search products';await input.fill('QA no match button audit');check(await input.inputValue()==='QA no match button audit','Search input did not update');
  action='clear product search';if(mobile())await button(p,'Очистить поиск товаров').click();else await input.fill('');
  check(await input.inputValue()==='','Shopping search not cleared');
 });
 await buttonScenario('SHP-02-editor-cancel',async()=>{
  await nav('shopping','Покупки');action='open product editor';await button(panel('shopping'),'Добавить товар').click();
  const close=button(page,'Закрыть редактор товара');await expectVisible(close);
  action='cancel product editor';await close.click();await close.waitFor({state:'hidden'});
 });
 await buttonScenario('CHT-01-create-topic-placeholder',async()=>{
  await nav('chat','Чат');const p=panel('chat');if(mobile())await button(p,'К спискам чатов').click();
  action='click create topic';await button(p,'Создать тему').click();
  const notice=first(page.getByText('Создание новых тем временно недоступно до подключения синхронизации.',{exact:true}));
  await expectVisible(notice);
  // A toast proves the button is a placeholder, not a functional topic flow.
  unavailable.push({viewport:label,id:'CHT-01-create-topic',reason:'confirmed placeholder on production'});
  console.log('BUTTON LIMIT '+label+' CHT-01 topic creation explicitly unavailable');
  throw new Error('Topic creation is unavailable');
 });
 await buttonScenario('SRV-04-wallet-editor-cancel',async()=>{
  await nav('services','Сервисы');const p=panel('services');action='open wallet';await button(p,/^Карты лояльности/,false).click();
  action='open card editor';await button(p,'Добавить карту').click();const h=page.getByRole('heading',{name:'Новая карта',exact:true});await expectVisible(h);
  action='close unsaved card';await first(h.locator('xpath=..').getByTitle('Закрыть',{exact:true})).click();await h.waitFor({state:'hidden'});
  action='return to service menu';await button(p,'Все сервисы').click();await expectVisible(p.locator('[data-purpose="service-cards-grid"]'));
 });
 await buttonScenario('SRV-02-debt-editor-cancel',async()=>{
  await nav('services','Сервисы');const p=panel('services');action='open debts';await button(p,/^Долги/,false).click();
  action='open new debt editor';await button(p,'Добавить долг').click();const h=page.getByRole('heading',{name:'Новый долг',exact:true});await expectVisible(h);
  action='cancel debt editor';await button(page,'Закрыть окно').click();await h.waitFor({state:'hidden'});
  action='return to service menu';await button(p,'Все сервисы').click();await expectVisible(p.locator('[data-purpose="service-cards-grid"]'));
 });
 await buttonScenario('SET-01-logout-cancel',async()=>{
  await nav('overview','Обзор');const d=await openSettings();action='select profile';await button(d.getByRole('navigation',{name:'Разделы настроек'}),/^Профиль и безопасность/,false).click();
  action='open logout confirmation without submitting';await button(d,'Выйти из профиля').click();
  const h=page.getByRole('heading',{name:'Выйти из профиля?',exact:true});await expectVisible(h);
  action='cancel logout';await button(page,'Остаться').click();await h.waitFor({state:'hidden'});await expectVisible(d);
  action='close settings';await button(d,'Закрыть настройки').click();await d.waitFor({state:'hidden'});
 });
}
async function extraViewportInventory(){
 for(const [width,height] of extraViewports){
  label='viewport-'+width;await page.setViewportSize({width,height});await reload();
  // At tablet widths the layout may be desktop or mobile per section.
  // Only verify visible navigation and inventory here, not mobile-specific locators.
  for(const [id,name] of sections)await run('MATRIX-NAV-'+id,async()=>{
   action='activate section';const tab=button(page.locator('nav'),name);await tab.click();await expectVisible(panel(id));
   check(await tab.getAttribute('aria-current')==='page','Navigation selected state missing');
   action='wait for at least one visible interactive control';await first(panel(id).getByRole('button')).waitFor({state:'visible'});await inventory(id);
  });
 }
}

 await ready();
 await checkSections();await checkButtons();
 label='mobile-390';await page.setViewportSize({width:390,height:844});await reload();await checkSections();await checkButtons();
 await extraViewportInventory();
 console.log('BUTTON AUDIT SUMMARY '+JSON.stringify({controlResults,unavailable,scope:'explicit named actions; not exhaustive, no external calls or intentional financial writes'}));
 console.log('SUMMARY '+JSON.stringify({failures,counts}));
 return {failures,counts,controlResults,unavailable};
}
