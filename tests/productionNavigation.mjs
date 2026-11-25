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
const nav=async(id,name)=>{
 await button(page.locator('nav'),name).click();
 await panel(id).waitFor({state:'visible'});
 if(await button(page.locator('nav'),name).getAttribute('aria-current')!=='page')throw new Error('Navigation selected state missing');
};
let label='desktop-1440';
const run=async(id,fn)=>{
 try{await fn();console.log('PASS '+label+' '+id);}
 catch(error){failures.push(label+' '+id);console.error('FAIL '+label+' '+id+' ('+(error?.name==='TimeoutError'?'timeout':'assertion/action')+')');}
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
  for(const name of ['Предыдущий месяц','Следующий месяц'])await button(panel('budget'),name).click();
  await button(panel('budget'),'Добавить операцию').click();
  const heading=page.getByRole('heading',{name:'Новая операция',exact:true});
  await expectVisible(heading);
  await page.getByRole('textbox',{name:'Сумма операции'}).fill('12.34');
  await button(page,'Закрыть модальное окно').click();
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
  if(await back.isVisible())await back.click();
  await expectVisible(p.getByRole('heading',{name:'Семейные беседы'}));
  await expectVisible(button(p,'Создать тему'));
  // Topic creation is deliberately not invoked in the navigation-only suite.
  const topics=p.getByTestId('chat-topics-scroll-container').getByRole('button');
  if(await topics.count()){
   await first(topics).click();
   await expectVisible(button(p,'Поиск'));
   await button(p,'Поиск').click();
   await expectVisible(p.getByRole('textbox').filter({visible:true}).first());
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
  await nav('overview','Обзор');await button(page,'Настройки').click();
  const dialog=page.getByRole('dialog',{name:'Настройки',exact:true});
  await expectVisible(dialog);
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
  await reload();await nav('overview','Обзор');await button(page,'Настройки').click();
  const dialog=page.getByRole('dialog',{name:'Настройки',exact:true});
  const tab=button(dialog.getByRole('navigation',{name:'Разделы настроек'}),new RegExp('^'+name),false);
  await tab.click();
  await expectVisible(first(dialog.getByTestId('settings-section-scroll-container')));
  if(label.startsWith('mobile')){
   await expectVisible(dialog.getByRole('heading',{name,exact:true}));
   await button(dialog,'Назад').click();
   await expectVisible(tab);
  }else if(await tab.getAttribute('aria-current')!=='page')throw new Error('Settings selection missing');
  await button(dialog,'Закрыть настройки').click();
  await dialog.waitFor({state:'hidden'});
 });
 if(!label.startsWith('mobile')){
  await run('GLOBAL-notifications',async()=>{
   await nav('overview','Обзор');await button(page,'Уведомления').click();
   const h=page.getByRole('heading',{name:'Уведомления',exact:true});await expectVisible(h);
   await button(h.locator('xpath=../..'),'Закрыть').click();await h.waitFor({state:'hidden'});
  });
  await run('GLOBAL-AI-open-close',async()=>{
   await button(page,'AI Ассистент').click();const close=button(page,'Закрыть чат');
   await expectVisible(close);await close.click();await close.waitFor({state:'hidden'});
  });
 }
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
