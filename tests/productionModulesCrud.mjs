import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';

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
const collections=new Set(['events','shopping','loyalty','debts','chat']);
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
 check(Array.isArray(data),'Unexpected query response');return data.flatMap(x=>x.document?[x.document]:[]);
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
   if(collection==='debts')check(!scalar(doc,'linkedExpenseId')&&scalar(doc,'memberId')===uid,'Cleanup refused linked debt');
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
async function nav(id,name){await btn(page.locator('nav'),name).click();await panel(id).waitFor({state:'visible'});}
async function mutation(action){await guard();apiError='none';await action();}
async function run(name,fn,cleanup){
 phase='preflight';apiError='none';let passed=false,skip=false;
 try{await guard();await reset();await fn();passed=true;}
 catch(e){if(e instanceof Blocked){blocked.push({name,phase});skip=true;console.log('BLOCKED LIVE '+name+' at '+phase+' (safety prerequisite)');}else{failures.push({name,phase});console.log('FAIL LIVE '+name+' at '+phase+' ('+(e?.name==='TimeoutError'?'timeout':'assertion/action')+'; Firebase '+apiError+')');}}
 finally{
  // Close the active page to stop delayed/retried writes before fallback cleanup.
  if(!skip&&cleanup){try{await page.close();await cleanup();await loginBrowser();}catch{failures.push({name,phase:'cleanup'});console.error('FAIL LIVE '+name+' cleanup; halted to protect QA data');throw new Error('Cleanup failed');}}
 }
 if(passed){completed.push(name);console.log('PASS LIVE '+name);}
}
const eventDialog=()=>page.getByRole('dialog').filter({has:page.locator('#event-title-input')});
async function eventOpen(title){await nav('plans','Планы');await btn(panel('plans'),'День').click();await btn(panel('plans'),new RegExp('^Открыть событие: '+title+'(?:,|$)'),false).click();await eventDialog().waitFor({state:'visible'});}
try{
 const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true}),signal:AbortSignal.timeout(25000)});
 const auth=await response.json();check(response.ok&&auth.idToken&&auth.localId,'Production auth failed');
 token=auth.idToken;uid=auth.localId;await guard();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 await loginBrowser();console.log('PASS LIVE production isolated account authenticated');
 await run('PLN-event-CRUD',async()=>{
  await empty('events');await nav('plans','Планы');await btn(panel('plans'),'День').click();
  phase='open new event';await btn(panel('plans'),'Добавить событие').click();
  const d=eventDialog();await d.locator('#event-title-input').fill(original);
  await d.getByPlaceholder('Добавить пункт (билеты, термос)...').fill('QA пункт');await btn(d,'Добавить пункт чек-листа').click();
  phase='save event';await mutation(()=>btn(d,'Создать').click());await d.waitFor({state:'hidden'});
  const doc=await created('events','title',original);
  check(scalar(doc,'userId')===uid&&fields(array(doc,'checklist')[0]).text?.stringValue==='QA пункт','Event persistence mismatch');
  phase='mobile reload and rename';await reset(390);await eventOpen(original);await eventDialog().locator('#event-title-input').fill(renamed);
  await mutation(()=>btn(eventDialog(),'Сохранить').click());await eventDialog().waitFor({state:'hidden'});
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
 console.log('LIVE MODULE SUMMARY '+JSON.stringify({completed,failures,blocked,notCovered:['second production account and reactions','settings write/restore','mandatory payments config mutation','external integrations','all nested controls']}));
 if(failures.length||blocked.length)process.exitCode=1;
}catch{console.error('FAIL LIVE suite setup or safety/cleanup guard');process.exitCode=1;}
finally{await browser?.close();}
