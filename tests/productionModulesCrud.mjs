import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
import * as XLSX from 'xlsx';

// Real production, but strictly limited to the explicitly configured QA family.
const origin='https://budget-omega-jade.vercel.app';
const familyId=process.env.QA_FAMILY_ID?.trim();
const login=process.env.QA_EMAIL_1?.trim().toLowerCase();
const email=login?.includes('@')?login:login+'@family.local';
const password=process.env.QA_PASSWORD_1;
assert.ok(familyId&&login&&password,'Missing QA credentials');
const src=readFileSync(new URL('../firebase.ts',import.meta.url),'utf8');
const config=key=>src.match(new RegExp('\\b'+key+'\\s*:\\s*"([^"]+)"'))?.[1];
const project=config('projectId'),apiKey=config('apiKey');
assert.equal(project,'budg-1d5e0');
assert.ok(apiKey);
const base='https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)/documents';
let token,uid,browser;
function check(value,label){if(!value)throw new Error(label);}
function safeCode(v){return typeof v==='string'&&/^[A-Z0-9_]{1,80}$/.test(v)?v:'UNKNOWN';}
async function request(url,{method='GET',body,allowMissing=false}={}){
 const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
 if(allowMissing&&response.status===404)return null;
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error('Firestore HTTP '+response.status+' '+safeCode(data.error?.status));
 return data;
}
const path=(...parts)=>base+'/'+parts.map(encodeURIComponent).join('/');
const scalar=(doc,key)=>doc?.fields?.[key]?.stringValue;
const number=(doc,key)=>Number(doc?.fields?.[key]?.doubleValue??doc?.fields?.[key]?.integerValue);
async function guard(){
 const profile=await request(path('users',uid));
 check(scalar(profile,'familyId')===familyId,'QA user family mismatch');
 const family=await request(path('families',familyId));
 const members=family.fields?.members?.arrayValue?.values??[];
 check(familyId===uid&&scalar(family,'ownerId')===uid&&members.length===1&&members[0].stringValue===uid,'QA isolation guard rejected account');
 const member=await request(path('families',familyId,'members',uid));
 check(scalar(member,'userId')===uid,'QA member mapping mismatch');
}

const marker='QA '+randomUUID().replace(/-/g,'').replace(/[0-9]/g,n=>String.fromCharCode(103+Number(n)));
const original=marker+' запись',renamed=marker+' изменено';
const failures=[],blocked=[],completed=[];
const collections=new Set(['events','shopping','loyalty','debts','chat','transactions']);
let page,phase,apiError='none';
const panel=id=>page.locator('[data-tab-panel="'+id+'"]');
const visible=l=>l.filter({visible:true});
const btn=(scope,name,exact=true)=>visible(scope.getByRole('button',{name,exact})).first();
const unique=async l=>{await l.first().waitFor({state:'visible'});check(await l.count()===1,'Ambiguous action target');return l;};
const array=(doc,key)=>doc?.fields?.[key]?.arrayValue?.values??[];
const fields=v=>v?.mapValue?.fields??{};
const bool=(doc,key)=>doc?.fields?.[key]?.booleanValue;
const familyDoc=(...args)=>path('families',familyId,...args);
const ref=(collection,id)=>familyDoc(collection,id);
function idOf(doc,collection){
 const id=doc.name.split('/').at(-1);
 check(doc.name==='projects/'+project+'/databases/(default)/documents/families/'+familyId+'/'+collection+'/'+id,'Unexpected document path');
 return id;
}
async function query(collection,key,value){
 check(collections.has(collection),'Unexpected collection');
 const data=await request(familyDoc()+':runQuery',{method:'POST',body:{structuredQuery:{from:[{collectionId:collection}],...(key?{where:{fieldFilter:{field:{fieldPath:key},op:'EQUAL',value:{stringValue:value}}}}:{limit:2})}}});
 check(Array.isArray(data)&&!data.some(x=>x.error),'Unexpected query response');return data.flatMap(x=>x.document?[x.document]:[]);
}
async function poll(fn,label){
 for(let n=0;n<30;n++){const result=await fn();if(result)return result;await new Promise(r=>setTimeout(r,300));}
 throw new Error('Server verification failed: '+label);
}
async function created(collection,key,value){
 return poll(async()=>{const docs=await query(collection,key,value);check(docs.length<=1,'Duplicate QA record');return docs[0]||null;},'create '+collection);
}
async function same(collection,doc,predicate,label){
 const id=idOf(doc,collection);
 return poll(async()=>{const current=await request(ref(collection,id),{allowMissing:true});return current&&predicate(current)?current:null;},label);
}
async function absent(collection,doc){
 const id=idOf(doc,collection);await poll(async()=>!(await request(ref(collection,id),{allowMissing:true})),'delete '+collection);
}
async function empty(collection){
 if((await query(collection)).length)throw new Blocked('Nonempty QA collection: '+collection);
}
class Blocked extends Error{}
async function cleanupMarked(collection,key,values){
 await guard();
 for(const title of values){
  const docs=await query(collection,key,title);
  check(docs.length<=1,'Cleanup refused duplicate marker');
  for(const doc of docs){
   check(scalar(doc,key)===title&&title.startsWith(marker)&&doc.updateTime,'Cleanup refused invalid marker');
   if(collection==='events'||collection==='chat')check(scalar(doc,'userId')===uid,'Cleanup owner mismatch');
   if(collection==='debts')await verifyUnlinkedQaDebt(doc);
   if(collection==='transactions')check(scalar(doc,'rawNote')===marker&&scalar(doc,'type')==='income'&&scalar(doc,'userId')===uid&&scalar(doc,'memberId')===uid&&!scalar(doc,'linkedGoalId')&&!scalar(doc,'linkedExpenseId')&&!bool(doc,'externalSavingsConfirmed'),'Cleanup refused unexpected transaction');
   const id=idOf(doc,collection);
   await request(ref(collection,id)+'?currentDocument.updateTime='+encodeURIComponent(doc.updateTime),{method:'DELETE'});
   await absent(collection,doc);
   console.log('PASS cleanup exact marked '+collection+' record');
  }
 }
}
async function loginBrowser(){
 page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block',timezoneId:'UTC'});
 page.setDefaultTimeout(15000);
 page.on('console',m=>{const match=m.text().match(/\b(permission-denied|failed-precondition|unavailable|aborted|invalid-argument|not-found|deadline-exceeded|unauthenticated|PERMISSION_DENIED)\b/i);if(match)apiError=match[0];});
 // External integrations are outside this run: no Telegram, Gemini, banking or push API writes.
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
 const signed=page.waitForResponse(r=>r.url().startsWith('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword')&&r.request().method()==='POST',{timeout:30000});
 await btn(page,'Войти').click();const res=await signed;check(res.ok()&&(await res.json()).localId===uid,'Browser identity mismatch');
 await ready();
}
async function ready(){await page.waitForFunction(()=>window.__budgetAlfaSyncProtocol===2,null,{timeout:45000});}
async function reset(width=1440){await page.setViewportSize({width,height:width===390?844:900});await page.reload({waitUntil:'domcontentloaded'});await ready();}
async function nav(id,name){
 await ready();const tab=btn(page.locator('nav'),name);await tab.click();await panel(id).waitFor({state:'visible'});
 const controls={overview:()=>panel(id).getByRole('group',{name:/Период динамики расходов/}),budget:()=>btn(panel(id),'Добавить операцию'),plans:()=>panel(id).getByTestId('plans-scroll-container'),shopping:()=>btn(panel(id),/Быстрые списки/,false),chat:()=>page.viewportSize().width<768?btn(panel(id),'К спискам чатов'):panel(id).getByRole('heading',{name:'Семейные беседы',exact:true}),services:()=>panel(id).getByTestId('services-scroll-container')};
 await visible(controls[id]()).first().waitFor({state:'visible',timeout:30000});check(await tab.getAttribute('aria-current')==='page','Navigation selected state missing');
}
async function mutation(action){await guard();apiError='none';await action();}
async function run(name,fn,cleanup){
 phase='preflight';apiError='none';let passed=false,skip=false;
 try{await guard();await reset();await fn();passed=true;}
 catch(e){if(e instanceof Blocked){blocked.push({name,phase});skip=true;console.log('BLOCKED LIVE '+name+' at '+phase+' (safety prerequisite)');}else{failures.push({name,phase});const msg=String(e?.message??'');const kind=e?.name==='TimeoutError'?'timeout':msg.startsWith('Firestore HTTP ')?msg.match(/^Firestore HTTP \d{3} [A-Z0-9_]+/)?.[0]??'Firestore HTTP failure':msg.startsWith('Server verification failed:')?'server assertion failed':'assertion/action';const action=msg.match(/locator\.(click|fill|waitFor|selectOption|getAttribute|innerText)/)?.[1]??'unknown';console.log('FAIL LIVE '+name+' at '+phase+' ('+kind+'; action '+action+'; intercepted '+/intercepts pointer events/.test(msg)+'; Firebase '+apiError+')');}}
 finally{
  // Close the active page to stop delayed/retried writes before fallback cleanup.
  if(!skip&&cleanup){try{await page.close();await cleanup();await loginBrowser();}catch{failures.push({name,phase:'cleanup'});console.error('FAIL LIVE '+name+' cleanup; halted to protect QA data');throw new Error('Cleanup failed');}}
 }
 if(passed){completed.push(name);console.log('PASS LIVE '+name);}
}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const sharedSettings=()=>familyDoc('config','settings');
const personalSettings=()=>familyDoc('members',uid,'config','settings');
let billBaseline,billID,themeBaseline,settingsChanged=false;
const settingKeys=['theme','privacyMode'];
const settingSnapshot=(doc,keys)=>Object.fromEntries(keys.filter(k=>doc?.fields?.[k]!==undefined).map(k=>[k,doc.fields[k]]));
async function patchOnly(url,doc,keys,restore){
 await guard();check(doc?.updateTime,'Missing conditional revision');
 const qs=new URLSearchParams();for(const k of keys)qs.append('updateMask.fieldPaths',k);
 qs.set('currentDocument.updateTime',doc.updateTime);
 await request(url+'?'+qs,{method:'PATCH',body:{fields:restore}});
 const after=await request(url);
 check(equal(settingSnapshot(after,keys),restore),'Restore verification mismatch');
}
async function restorePersonal(){
 if(!settingsChanged)return;
 const current=await request(personalSettings(),{allowMissing:true});
 if(equal(settingSnapshot(current,settingKeys),themeBaseline)){console.log('PASS LIVE personal settings unchanged or restored');return;}
 check(current&&['light','dark','system'].includes(scalar(current,'theme'))&&typeof bool(current,'privacyMode')!=='string','Unexpected preference state');
 // Restore only the two deliberately modified keys, not the rest of the profile.
 await patchOnly(personalSettings(),current,settingKeys,themeBaseline);
 console.log('PASS LIVE restored original personal settings');
}
const billFields=['mandatoryExpenses','manualPaidExpenses'];
const bills=doc=>array(doc,'mandatoryExpenses').map(fields);
const billName=x=>x.name?.stringValue;
const paidMap=doc=>doc?.fields?.manualPaidExpenses?.mapValue?.fields??{};
const paidIds=doc=>Object.values(paidMap(doc)).flatMap(x=>(x.arrayValue?.values??[]).map(v=>v.stringValue));
const markedBill=doc=>bills(doc).filter(x=>billName(x)===original||billName(x)===renamed);
async function restoreBills(){
 if(!billBaseline)return;
 const current=await request(sharedSettings());
 const found=markedBill(current);
 check(found.length<=1&&bills(current).length===found.length,'Cleanup refused unrelated obligations');
 if(found.length){const item=found[0];check(!item.linkedDebtId?.stringValue&&(!billID||item.id?.stringValue===billID),'Cleanup refused linked or unexpected obligation');billID=item.id?.stringValue;}
 check(paidIds(current).every(id=>id===billID),'Cleanup refused unrelated paid history');
 if(!equal(settingSnapshot(current,billFields),billBaseline))await patchOnly(sharedSettings(),current,billFields,billBaseline);
 console.log('PASS LIVE restored original mandatory-payment fields');
}
async function openAppearance(){
 await nav('overview','Обзор');
 await btn(page,page.viewportSize().width<768?'Настройки и профиль':'Настройки').click();
 const dialog=page.getByRole('dialog',{name:'Настройки',exact:true});
 await dialog.waitFor({state:'visible'});
 await btn(dialog,/Оформление и приватность/,false).click();
 await dialog.getByRole('group',{name:'Тема приложения'}).waitFor({state:'visible'});
 return dialog;
}
const library=()=>familyDoc('config','shoppingLists');
let quickAttempted=false;
async function cleanupQuick(){
 if(!quickAttempted)return;
 await cleanupMarked('shopping','title',[original]);
 await guard();
 const doc=await request(library(),{allowMissing:true});
 if(!doc)return;
 const templates=array(doc,'templates');
 const matched=templates.filter(x=>fields(x).name?.stringValue===original);
 check(matched.length<=1,'Duplicate QA template');
 if(!matched.length)return;
 const products=fields(matched[0]).items?.arrayValue?.values??[];
 check(products.length===1&&fields(products[0]).title?.stringValue===original,'Unexpected QA template contents');
 await patchOnly(library(),doc,['templates'],{templates:{arrayValue:{values:templates.filter(x=>fields(x).name?.stringValue!==original)}}});
 console.log('PASS LIVE removed exact marked quick-list template');
}
async function verifyUnlinkedQaDebt(doc){
 await guard();const id=idOf(doc,'debts');const owner=scalar(doc,'memberId');
 check((owner===uid||!owner)&&!scalar(doc,'linkedExpenseId')&&number(doc,'totalAmount')===1000.5&&number(doc,'monthlyPayment')===100&&[900.25,800.25].includes(number(doc,'currentBalance')),'Cleanup refused unexpected debt');
 const shared=await request(sharedSettings(),{allowMissing:true}),personal=await request(personalSettings(),{allowMissing:true});
 check(!bills(shared).some(x=>x.linkedDebtId?.stringValue===id)&&!array(personal,'personalMandatoryExpenses').map(fields).some(x=>x.linkedDebtId?.stringValue===id),'Cleanup refused linked obligation');
 check((await query('transactions','linkedDebtId',id)).length===0,'Cleanup refused linked transactions');
}
async function recoverPriorQaDebt(){
 await guard();const records=await query('debts');if(!records.length)return;
 // Match the exact prior test's time window, immutable fixture and absence of references.
 const start=Date.parse('2026-11-25T14:03:04Z'),end=Date.parse('2026-11-25T14:03:11Z');
 const matching=records.filter(d=>{
  const created=Date.parse(d.createTime??''),id=scalar(d,'id'),millis=Number(id);
  return /^QA [a-p]{32} запись$/.test(scalar(d,'name')??'')&&!scalar(d,'memberId')&&number(d,'currentBalance')===900.25&&number(d,'totalAmount')===1000.5&&number(d,'monthlyPayment')===100&&scalar(d,'dueDate')==='2026-12-02'&&scalar(d,'finalClosingDate')==='2027-11-25'&&bool(d,'paidThisMonth')===false&&created>=start&&created<=end&&millis>=start&&millis<=end&&id===d.name.split('/').at(-1)&&d.createTime===d.updateTime;
 });
 if(records.length!==1||matching.length!==1){console.log('BLOCKED LIVE prior debt recovery: exact historical fixture not established');return;}
 const doc=matching[0];await verifyUnlinkedQaDebt(doc);const id=idOf(doc,'debts');
 await request(ref('debts',id)+'?currentDocument.updateTime='+encodeURIComponent(doc.updateTime),{method:'DELETE'});
 await absent('debts',doc);console.log('PASS LIVE recovered exact isolated QA debt from failed run 45629046092');
}
async function inspectDebtResidue(){
 await guard();
 const records=await query('debts');
 const qaLike=records.filter(d=>/^QA [a-p]{32} (?:запись|изменено)$/.test(scalar(d,'name')??'')&&number(d,'totalAmount')===1000.50&&number(d,'monthlyPayment')===100&&!scalar(d,'linkedExpenseId'));
 console.log('SAFE DEBT STATE '+JSON.stringify({nonempty:records.length>0,qaSignatureCount:qaLike.length,matchingOwner:qaLike.filter(d=>scalar(d,'memberId')===uid).length,missingOwner:qaLike.filter(d=>!scalar(d,'memberId')).length}));
}
const eventDialog=()=>page.getByRole('dialog').filter({has:page.locator('#event-title-input')});
async function eventOpen(title){
 phase='event reopen: navigate';await nav('plans','Планы');const p=panel('plans');
 phase='event reopen: day selection';const day=btn(p,'День');await day.click();
 check(await day.getAttribute('aria-pressed')==='true','Calendar day not active');
 phase='event reopen: locate row';
 const event=page.viewportSize().width<1024?btn(p,'Открыть событие: '+title):visible(p.getByRole('button',{name:new RegExp('^(?:Открыть событие: )?'+title+'(?:,|$|\\s)'),exact:false})).first();
 try{await event.waitFor({state:'visible'});}catch(error){
  console.log('SAFE EVENT STATE '+JSON.stringify({mobile:page.viewportSize().width<1024,dayActive:await day.getAttribute('aria-pressed')==='true',titleVisible:await visible(p.getByText(title,{exact:true})).count()>0,storedCount:(await query('events','title',title)).length}));
  throw error;
 }
 phase='event reopen: click row';await event.click();
 phase='event reopen: editor visible';await eventDialog().waitFor({state:'visible'});
}
try{
 const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true}),signal:AbortSignal.timeout(25000)});
 const auth=await response.json();check(response.ok&&auth.idToken&&auth.localId,'Production auth failed');
 token=auth.idToken;uid=auth.localId;await guard();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 await loginBrowser();console.log('PASS LIVE production isolated account authenticated');
 await inspectDebtResidue();
 await recoverPriorQaDebt();
 await run('PLN-event-CRUD',async()=>{
  await empty('events');await nav('plans','Планы');await btn(panel('plans'),'День').click();
  phase='open new event';await btn(panel('plans'),'Добавить событие').click();
  const d=eventDialog();await d.locator('#event-title-input').fill(original);
  const calendarDate=d.locator('input[type=date]');check(await calendarDate.count()===1,'Expected one calendar date field');await calendarDate.fill(new Date().toISOString().slice(0,10));
  await d.getByPlaceholder('Добавить пункт (билеты, термос)...').fill('QA пункт');await btn(d,'Добавить пункт чек-листа').click();
  phase='save event';await mutation(()=>btn(d,'Создать').click());await d.waitFor({state:'hidden'});
  const doc=await created('events','title',original);
  check(scalar(doc,'userId')===uid&&fields(array(doc,'checklist')[0]).text?.stringValue==='QA пункт','Event persistence mismatch');
  phase='mobile reload and rename';await reset(390);await eventOpen(original);await eventDialog().locator('#event-title-input').fill(renamed);
  phase='event rename: save';await mutation(()=>btn(eventDialog(),'Сохранить').click());await eventDialog().waitFor({state:'hidden'});
  await same('events',doc,x=>scalar(x,'title')===renamed&&scalar(x,'date')===scalar(doc,'date'),'event rename');
  phase='delete event';await eventOpen(renamed);await btn(eventDialog(),'Удалить событие').click();await mutation(()=>btn(eventDialog(),'Да, удалить').click());await eventDialog().waitFor({state:'hidden'});await absent('events',doc);
 },()=>cleanupMarked('events','title',[original,renamed]));
 await run('SHP-shopping-CRUD',async()=>{
  await empty('shopping');await nav('shopping','Покупки');
  phase='quick add';await panel('shopping').getByRole('textbox',{name:'Быстрое добавление товаров'}).fill(original);
  await mutation(()=>btn(panel('shopping'),'Добавить товары в общий список').click());
  const doc=await created('shopping','title',original);check(Number(scalar(doc,'amount'))===1,'Initial quantity mismatch');
  phase='mobile edit';await reset(390);await nav('shopping','Покупки');await btn(panel('shopping'),'Редактировать товар: '+original).click();await page.getByPlaceholder('Например: Сыр Российский').fill(renamed);
  await mutation(()=>btn(page,'Сохранить изменения').click());await same('shopping',doc,x=>scalar(x,'title')===renamed,'shopping rename');
  phase='desktop quantity';await reset();await nav('shopping','Покупки');await mutation(()=>btn(panel('shopping'),'Увеличить количество: '+renamed).click());await same('shopping',doc,x=>Number(scalar(x,'amount'))===2,'quantity');
  phase='purchase';const checkbox=page.getByRole('checkbox',{name:'Отметить купленным: '+renamed,exact:true});
  await mutation(()=>checkbox.locator('xpath=..').click());await same('shopping',doc,x=>bool(x,'completed')===true,'purchase');
  phase='restore';await mutation(()=>btn(panel('shopping'),'Вернуть в список: '+renamed).click());await same('shopping',doc,x=>bool(x,'completed')===false,'restore');
  phase='delete product';await mutation(()=>btn(panel('shopping'),'Удалить товар: '+renamed).click());await absent('shopping',doc);
 },()=>cleanupMarked('shopping','title',[original,renamed]));
 await run('CHAT-send-search-reload',async()=>{
  await nav('chat','Чат');phase='send message';await panel('chat').getByPlaceholder('Сообщение семье...').fill(original);
  await mutation(()=>btn(panel('chat'),'Отправить сообщение').click());const doc=await created('chat','text',original);check(scalar(doc,'userId')===uid,'Message owner mismatch');
  phase='reload mobile message';await reset(390);await nav('chat','Чат');await visible(panel('chat').getByText(original,{exact:true})).first().waitFor({state:'visible'});
  phase='search';await btn(panel('chat'),'Поиск').click();await panel('chat').getByPlaceholder('Поиск по сообщениям...').fill(original);await visible(panel('chat').getByText(original,{exact:true})).first().waitFor({state:'visible'});
  // No UI individual-message deletion exists; cleanup uses exact marked document, not Delete chat.
 },()=>cleanupMarked('chat','text',[original]));
 await run('SVC-wallet-CRUD',async()=>{
  await empty('loyalty');await nav('services','Сервисы');await btn(panel('services'),/^Карты лояльности/,false).click();
  phase='add card';await btn(panel('services'),'Добавить карту').click();await page.getByPlaceholder('Магазин (Лента, Перекрёсток, FixPrice...)').fill(original);await page.getByPlaceholder('7789 2034 5519...').fill('1234567890');
  await mutation(()=>btn(page,'Добавить в кошелёк').click());const doc=await created('loyalty','name',original);check(scalar(doc,'number')==='1234567890','Card number mismatch');
  phase='edit card';await visible(panel('services').getByRole('heading',{name:original,exact:true})).first().waitFor({state:'visible'});
  await (await unique(visible(panel('services').getByTitle('Редактировать',{exact:true})))).click();
  await page.getByPlaceholder('Магазин (Лента, Перекрёсток, FixPrice...)').fill(renamed);await mutation(()=>btn(page,'Сохранить карту').click());await same('loyalty',doc,x=>scalar(x,'name')===renamed&&scalar(x,'number')==='1234567890','card rename');
  phase='reload mobile';await reset(390);await nav('services','Сервисы');await btn(panel('services'),/^Карты лояльности/,false).click();await visible(panel('services').getByRole('heading',{name:renamed,exact:true})).first().waitFor({state:'visible'});
  phase='delete card';await (await unique(visible(panel('services').getByTitle('Удалить карту',{exact:true})))).click();const h=page.getByRole('heading',{name:'Удалить карту?',exact:true});await h.waitFor({state:'visible'});await mutation(()=>btn(h.locator('xpath=../..'),'Удалить').click());await absent('loyalty',doc);
 },()=>cleanupMarked('loyalty','name',[original,renamed]));
 await run('SVC-debt-CRUD',async()=>{
  await empty('debts');await nav('services','Сервисы');await btn(panel('services'),/^Долги/,false).click();
  phase='create debt';await btn(panel('services'),'Добавить долг').click();
  await page.locator('input[name="title"]').fill(original);
  const future=new Date();future.setUTCFullYear(future.getUTCFullYear()+1);const due=new Date();due.setUTCDate(due.getUTCDate()+7);
  await page.locator('input[name="finalClosingDate"]').fill(future.toISOString().slice(0,10));await page.locator('input[name="totalAmount"]').fill('1000.50');await page.locator('input[name="paidAmount"]').fill('100.25');await page.locator('input[name="monthlyPayment"]').fill('100.00');await page.locator('input[name="dueDate"]').fill(due.toISOString().slice(0,10));
  const link=page.locator('select[name="linkedExpenseId"]');if(await link.count())await link.selectOption('');
  await mutation(()=>btn(page,'Сохранить').click());const doc=await created('debts','name',original);check(number(doc,'currentBalance')===900.25&&!scalar(doc,'linkedExpenseId')&&scalar(doc,'memberId')===uid,'Debt persistence mismatch');
  const card=title=>panel('services').locator('article').filter({has:page.getByRole('heading',{name:title,exact:true})});
  phase='rename debt';await btn(card(original),'Редактировать параметры долга').click();await page.locator('input[name="title"]').fill(renamed);await mutation(()=>btn(page,'Сохранить').click());await same('debts',doc,x=>scalar(x,'name')===renamed,'debt rename');
  phase='payment';await mutation(()=>btn(card(renamed),'Внести платёж').click());await same('debts',doc,x=>number(x,'currentBalance')===800.25,'payment');
  phase='undo payment';await mutation(()=>btn(card(renamed),'Отменить платёж').click());await same('debts',doc,x=>number(x,'currentBalance')===900.25,'undo');
  phase='delete debt';await btn(card(renamed),'Удалить карточку').click();const h=page.getByRole('heading',{name:'Удалить долг?',exact:true});await h.waitFor({state:'visible'});await mutation(()=>btn(h.locator('xpath=../..'),'Удалить').click());await absent('debts',doc);
 },()=>cleanupMarked('debts','name',[original,renamed]));

 await run('BUD-income-CRUD-history',async()=>{
  await nav('budget','Бюджет');
  phase='create income';await btn(panel('budget'),'Добавить операцию').click();
  const h=page.getByRole('heading',{name:'Новая операция',exact:true});await h.waitFor({state:'visible'});
  const form=h.locator('xpath=../..');
  await btn(form,/ДОХОД/i,false).click();
  await page.getByRole('textbox',{name:'Сумма операции'}).fill('321.09');
  await page.getByRole('textbox',{name:'Название в истории'}).fill(original);
  await page.getByPlaceholder('Добавить заметку семьи (чек, комментарий...)').fill(marker);
  await mutation(()=>btn(form,'Добавить операцию').click());await h.waitFor({state:'hidden'});
  const doc=await created('transactions','note',original);
  check(scalar(doc,'type')==='income'&&number(doc,'amount')===321.09&&scalar(doc,'rawNote')===marker&&scalar(doc,'userId')===uid&&scalar(doc,'memberId')===uid&&!scalar(doc,'linkedGoalId')&&!scalar(doc,'linkedExpenseId'),'Income persistence mismatch');
  phase='history search and type filter';
  const history=panel('budget').getByRole('region',{name:'История операций бюджета'});
  await history.waitFor({state:'visible'});
  const search=history.getByRole('searchbox',{name:'Поиск по истории операций'});
  const type=history.getByLabel('Тип операций в истории');
  const edit=title=>btn(history,'Редактировать операцию: '+title);
  await btn(history,'Весь месяц').click();await search.fill(original);await type.selectOption('income');await edit(original).waitFor({state:'visible'});
  await type.selectOption('expense');await edit(original).waitFor({state:'hidden'});
  await type.selectOption('all');await search.fill('QA несуществующая запись');await edit(original).waitFor({state:'hidden'});
  await search.fill(original);await edit(original).click();
  phase='rename income';await page.getByRole('textbox',{name:'Название в истории'}).fill(renamed);
  const eh=page.getByRole('heading',{name:'Редактирование операции',exact:true});
  await mutation(()=>btn(eh.locator('xpath=../..'),'Сохранить изменения').click());await eh.waitFor({state:'hidden'});
  await same('transactions',doc,x=>scalar(x,'note')===renamed&&number(x,'amount')===321.09&&scalar(x,'type')==='income'&&scalar(x,'rawNote')===marker,'income rename');
  phase='mobile reload and delete income';await reset(390);await nav('budget','Бюджет');
  await btn(panel('budget'),'Редактировать операцию: '+renamed).click();
  await btn(page,'Удалить операцию').click();await mutation(()=>btn(page,'Подтвердить удаление').click());await eh.waitFor({state:'hidden'});await absent('transactions',doc);
 },()=>cleanupMarked('transactions','note',[original,renamed]));
 await run('BUD-mandatory-payment-CRUD',async()=>{
  const family=await request(familyDoc());if(scalar(family,'budgetPolicy')==='personal')throw new Blocked('Personal budget config requires distinct test');
  const initial=await request(sharedSettings());
  if(bills(initial).length||paidIds(initial).length)throw new Blocked('Existing mandatory payments');
  billBaseline=settingSnapshot(initial,billFields);
  await nav('budget','Бюджет');
  phase='new mandatory payment';await btn(panel('budget'),'Добавить обязательный платёж').click();
  const h=page.getByRole('heading',{name:'Новый обязательный платёж',exact:true});await h.waitFor({state:'visible'});
  await page.locator('#paymentName').fill(original);await page.locator('#paymentAmount').fill('1250.45');await page.locator('#paymentDay').fill('18');
  phase='save mandatory payment';await mutation(()=>btn(page,'Добавить платёж').click());await h.waitFor({state:'hidden'});
  const saved=await poll(async()=>{const doc=await request(sharedSettings());const found=markedBill(doc);return found.length===1?found[0]:null;},'new bill');
  billID=saved.id?.stringValue;check(billID&&number({fields:saved},'amount')===1250.45&&!saved.linkedDebtId?.stringValue,'Bill amount or link mismatch');
  phase='edit and mark paid';await btn(panel('budget'),'Редактировать обязательный платёж: '+original).click();
  const eh=page.getByRole('heading',{name:'Редактирование платежа',exact:true});await eh.waitFor({state:'visible'});
  await page.locator('#paymentName').fill(renamed);await page.locator('#paymentAmount').fill('1300.55');
  const mark=btn(page,/Отметить оплаченным вручную/,false);if(await mark.getAttribute('aria-pressed')!=='true')await mark.click();
  await mutation(()=>btn(page,'Сохранить изменения').click());await eh.waitFor({state:'hidden'});
  await poll(async()=>{const doc=await request(sharedSettings());return bills(doc).some(x=>x.id?.stringValue===billID&&billName(x)===renamed&&number({fields:x},'amount')===1300.55)&&paidIds(doc).includes(billID);},'bill edit and paid state');
  phase='mobile reload and undo paid';await reset(390);await nav('budget','Бюджет');
  await btn(panel('budget'),'Редактировать обязательный платёж: '+renamed).click();await eh.waitFor({state:'visible'});
  check(await page.locator('#paymentAmount').inputValue()==='1300.55'&&await mark.getAttribute('aria-pressed')==='true','Persisted payment mismatch');
  await mark.click();await mutation(()=>btn(page,'Сохранить изменения').click());await eh.waitFor({state:'hidden'});
  await poll(async()=>!paidIds(await request(sharedSettings())).includes(billID),'undo payment');
  phase='delete mandatory payment';await btn(panel('budget'),'Редактировать обязательный платёж: '+renamed).click();await btn(page,'Удалить платеж').click();await mutation(()=>btn(page,'Подтвердить удаление').click());await eh.waitFor({state:'hidden'});
  await poll(async()=>{const doc=await request(sharedSettings());return !bills(doc).some(x=>x.id?.stringValue===billID)&&!paidIds(doc).includes(billID);},'bill deletion');
 },restoreBills);
 await run('SET-theme-privacy-persistence',async()=>{
  themeBaseline=settingSnapshot(await request(personalSettings(),{allowMissing:true}),settingKeys);
  const labels={light:'Светлая',dark:'Тёмная',system:'Системная'};
  phase='open appearance';let d=await openAppearance();
  const group=()=>d.getByRole('group',{name:'Тема приложения'});
  const selected=await group().locator('button[aria-pressed="true"]').innerText();
  const initial=Object.keys(labels).find(k=>labels[k]===selected.trim());
  check(initial,'No selected theme');
  const privacy=()=>d.getByRole('switch',{name:/Скрывать суммы/});
  const initialPrivacy=await privacy().getAttribute('aria-checked')==='true';
  const next=initial==='dark'?'light':'dark';
  settingsChanged=true;
  phase='theme: click option';await mutation(()=>btn(group(),labels[next]).click());
  phase='theme: server persistence';await poll(async()=>scalar(await request(personalSettings(),{allowMissing:true}),'theme')===next,'theme write');
  phase='privacy: click switch';await mutation(()=>privacy().click());
  phase='privacy: server persistence';await poll(async()=>bool(await request(personalSettings(),{allowMissing:true}),'privacyMode')===!initialPrivacy,'privacy write');
  phase='reload preferences at mobile width';await reset(390);d=await openAppearance();
  check(await btn(group(),labels[next]).getAttribute('aria-pressed')==='true'&&await privacy().getAttribute('aria-checked')===String(!initialPrivacy),'Personal preferences lost on reload');
  phase='restore preferences in UI';await mutation(()=>btn(group(),labels[initial]).click());
  await poll(async()=>scalar(await request(personalSettings()),'theme')===initial,'theme restore');
  await mutation(()=>privacy().click());await poll(async()=>bool(await request(personalSettings()),'privacyMode')===initialPrivacy,'privacy restore');
 },restorePersonal);

 await run('SHP-quick-list-save-reapply-delete',async()=>{
  await empty('shopping');const before=await request(library(),{allowMissing:true});
  if(array(before,'templates').length>=25)throw new Blocked('Template limit');
  quickAttempted=true;
  await nav('shopping','Покупки');const p=panel('shopping');
  phase='create template product';await p.getByRole('textbox',{name:'Быстрое добавление товаров'}).fill(original);
  await mutation(()=>btn(p,'Добавить товары в общий список').click());
  const doc=await created('shopping','title',original);
  phase='save quick list';await btn(p,/Быстрые списки/,false).click();
  const options=p.locator('#shopping-template-options');
  await options.getByRole('textbox',{name:'Название нового списка'}).fill(original);
  await mutation(()=>btn(options,'Сохранить текущие').click());
  const saved=await poll(async()=>{const x=await request(library());const matches=array(x,'templates').map(fields).filter(t=>t.name?.stringValue===original);check(matches.length<=1,'Duplicate template');return matches[0]||null;},'saved template');
  check(saved.items?.arrayValue?.values?.length===1&&fields(saved.items.arrayValue.values[0]).title?.stringValue===original,'Template item mismatch');
  phase='delete source product';await btn(p,/Быстрые списки/,false).click();await mutation(()=>btn(p,'Удалить товар: '+original).click());await absent('shopping',doc);
  phase='reload and reuse saved template';await reset(390);await nav('shopping','Покупки');await btn(p,/Быстрые списки/,false).click();
  await btn(options,original+' · 1').click();
  const preview=options.getByRole('region',{name:'Состав быстрого списка'});
  await preview.waitFor({state:'visible'});
  check((await preview.innerText()).includes(original),'Wrong template preview');
  await mutation(()=>btn(preview,'Добавить 1 товаров').click());const reapplied=await created('shopping','title',original);
  check(Number(scalar(reapplied,'amount'))===1,'Reapplied quantity mismatch');
  phase='delete saved template';await mutation(()=>btn(options,'Удалить шаблон '+original).click());
  await poll(async()=>!array(await request(library()),'templates').some(x=>fields(x).name?.stringValue===original),'template deletion');
  phase='remove reapplied product';await btn(p,/Быстрые списки/,false).click();await btn(p,'Редактировать товар: '+original).click();
  await mutation(()=>visible(page.getByTitle('Удалить',{exact:true})).first().click());await absent('shopping',reapplied);
 },cleanupQuick);
 await run('BUD-import-preview-cancel',async()=>{
  const raw=original+' выписка';
  const day=new Date();const date=[String(day.getUTCDate()).padStart(2,'0'),String(day.getUTCMonth()+1).padStart(2,'0'),day.getUTCFullYear()].join('.');
  const sheet=XLSX.utils.aoa_to_sheet([['Дата','Сумма','Описание','Тип операции','Валюта'],[date+' 12:00:00','-42,17',raw,'Расход','RUB']]);
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'QA');
  const bytes=XLSX.write(book,{type:'buffer',bookType:'xlsx'});
  phase='upload synthetic statement';await nav('budget','Бюджет');
  await page.locator('#import-input').setInputFiles({name:'qa-statement.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});
  const dialog=page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'Проверка выписки',exact:true})});
  await dialog.waitFor({state:'visible'});
  phase='verify parsed row';await visible(dialog.getByRole('button',{name:/Редактировать операцию /})).first().waitFor({state:'visible'});
  check(await dialog.getByRole('button',{name:/Редактировать операцию /}).count()===1,'Unexpected preview row count');
  phase='cancel import';await btn(dialog,'Отмена').click();await dialog.waitFor({state:'hidden'});
  check((await query('transactions','rawNote',raw)).length===0,'Cancel unexpectedly persisted transaction');
 });
 console.log('LIVE MODULE SUMMARY '+JSON.stringify({completed,failures,blocked,notCovered:['second production account and reactions','goals and category/rule CRUD','bank import and duplicates','quick-list/pantry persistence','external integrations','all nested controls']}));
 if(failures.length||blocked.length)process.exitCode=1;
}catch{console.error('FAIL LIVE suite setup or safety/cleanup guard');process.exitCode=1;}
finally{await browser?.close();}
