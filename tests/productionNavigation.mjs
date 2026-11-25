import {chromium} from 'playwright';
const origin='https://budget-omega-jade.vercel.app';
const login=process.env.QA_EMAIL_1?.trim().toLowerCase(),password=process.env.QA_PASSWORD_1,family=process.env.QA_FAMILY_ID?.trim();
if(!login||!password||!family)throw new Error('Missing QA credentials');
const email=login.includes('@')?login:login+'@family.local';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block',timezoneId:'UTC'});
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
try{
 await page.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  const app=url.origin===origin&&!url.pathname.startsWith('/api/');
  const firebase=url.protocol==='https:'&&['identitytoolkit.googleapis.com','securetoken.googleapis.com','firestore.googleapis.com','budg-1d5e0.firebaseapp.com'].includes(url.hostname);
  const assets=req.method()==='GET'&&['cdn.tailwindcss.com','fonts.googleapis.com','fonts.gstatic.com','www.gstatic.com'].includes(url.hostname);
  return app||firebase||assets?route.continue():route.abort();
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.getByPlaceholder('например: alexander или family1').fill(email);
 await page.locator('input[type=password]').fill(password);
 const auth=page.waitForResponse(r=>r.url().startsWith('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword')&&r.request().method()==='POST',{timeout:30000});
 await button(page,'Войти').click();const response=await auth;
 const user=await response.json();
 if(!response.ok()||user.localId!==family)throw new Error('QA login mismatch');
 await ready();
 await checkSections();
 label='mobile-390';await page.setViewportSize({width:390,height:844});await reload();await checkSections();
 console.log('SUMMARY '+JSON.stringify({failures,counts}));
 if(failures.length)process.exitCode=1;
}catch{console.error('FAIL production navigation suite setup or reset ('+label+')');process.exitCode=1;}
finally{await browser.close();}
