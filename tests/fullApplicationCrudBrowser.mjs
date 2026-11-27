import {meetsTouchTarget} from './touchTargetGeometry.mjs';
import {runTerraV2Pilot} from './terraV2PilotBrowser.mjs';
import {makeFamilyFixtures,fixtureSettings,fixtureCategories} from './fixtures/realisticFamily.mjs';
import {runNavigationAudit} from './navigationAudit.mjs';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import * as XLSX from 'xlsx';
import {chromium} from 'playwright';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';

// Never connect to real accounts or to production data.
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Requires isolated auth and Firestore emulators');
const admin=initializeApp({projectId:'demo-budget'},'crud-browser-'+randomUUID());
const db=getFirestore(admin);
const auth=getAuth(admin);
const origin='http://127.0.0.1:4174';
const id=randomUUID();
const fid='crud-'+id;
const password='emulator-only-password';
const users=await Promise.all(['a','b'].map(label=>auth.createUser({email:label+'-'+id+'@example.test',password,emailVerified:true,displayName:'QA '+label})));
const family=db.collection('families').doc(fid);
const rows=family.collection('transactions');
const date=new Date().toISOString();
const original={id:'imported',amount:123.45,type:'expense',category:'food',memberId:'a',userId:users[0].uid,date,note:'QA исходная операция',payee:'QA исходная операция',rawNote:'BANK ORIGINAL QA'};
await family.set({ownerId:users[0].uid,members:users.map(u=>u.uid),name:'CRUD QA',budgetPolicy:'family'});
for(const [i,u] of users.entries()){
 await db.collection('users').doc(u.uid).set({familyId:fid,email:u.email});
 await family.collection('members').doc(i?'b':'a').set({id:i?'b':'a',userId:u.uid,name:i?'QA B':'QA A',color:'#4A7C59',isAdmin:!i});
 await family.collection('members').doc(u.uid).collection('config').doc('settings').set({defaultBudgetMode:'family',startTab:'overview',theme:'light'});
}
await family.collection('config').doc('settings').set({currency:'₽',familyName:'CRUD QA',initialBalance:5000});
await family.collection('categories').doc('food').set({id:'food',label:'Продукты',color:'#4A7C59',icon:'tag',transactionType:'expense'});
await rows.doc(original.id).set(original);
// Keep empty-state CRUD isolated. A separate populated run tests realistic history and layout.
const populated=process.argv.includes('--populated');
if(populated){
 const fixtureMembers=users.map((u,i)=>({id:i?'b':'a',userId:u.uid}));
 const fixtures=makeFamilyFixtures({now:new Date(date),members:fixtureMembers,currentMonthTarget:500});
 // Seed once in the emulator, never in the production database.
 // Firestore batches stay below 500 writes; local emulator only.
 let batch=db.batch(),writes=0;
 const flush=async()=>{if(writes){await batch.commit();batch=db.batch();writes=0;}};
 batch.set(family.collection('config').doc('settings'),fixtureSettings(fixtureMembers),{merge:true});
 writes++;
 for(const category of fixtureCategories)if(category.id!=='food'){
  batch.create(family.collection('categories').doc(category.id),category);writes++;
  if(writes>=400)await flush();
 }
 for(const [kind,records] of Object.entries(fixtures)){
  for(const record of records){
   batch.create(family.collection(kind).doc(record.id),record);writes++;
   if(writes>=400)await flush();
  }
 }
 await flush();
 assert.equal(fixtures.transactions.filter(r=>r.date.startsWith(date.slice(0,7))).length,500,'dense current month');
 for(const [kind,records] of Object.entries(fixtures)){
  const snapshot=await family.collection(kind).get();
  assert.equal(snapshot.size,records.length+(kind==='transactions'?1:0),'fixture count '+kind);
 }
 console.log('PASS populated family fixture '+JSON.stringify(Object.fromEntries(Object.entries(fixtures).map(([k,v])=>[k,v.length]))));
}

let server,browser;
const visible=(locator)=>locator.filter({visible:true}).first();
const heading=(page,name)=>page.getByRole('heading',{name,exact:true});
const edit=(page,title)=>visible(page.getByRole('button',{name:'Редактировать операцию: '+title,exact:true}));
const nameField=(page)=>page.getByRole('textbox',{name:'Название в истории',exact:true});
async function waitServer(){
 for(let i=0;i<80;i++){
  try{if((await fetch(origin,{signal:AbortSignal.timeout(1500)})).ok)return;}catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 throw new Error('CRUD Vite server did not start');
}
async function openUser(user,viewport){
 const page=await browser.newPage({viewport,serviceWorkers:'block',hasTouch:viewport.width<768});
 // These are disposable emulator users only; report errors, never tokens or request bodies.
 page.on('pageerror',error=>console.error('CRUD page error:',error.message));
 page.on('console',message=>{
  if(message.type()==='error'||message.type()==='warning')console.error('CRUD browser:',message.text().slice(0,1000));
 });
 page.on('response',response=>{
  const url=new URL(response.url());
  if(['127.0.0.1','localhost'].includes(url.hostname)&&response.status()>=400)
   console.error('CRUD HTTP:',url.origin,url.pathname,response.status());
 });
 await page.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  // API routes require real integrations, not the isolated client test.
  const allowed=(url.origin===origin&&!url.pathname.startsWith('/api/'))||['http://127.0.0.1:8080','http://127.0.0.1:9099'].includes(url.origin)||
   (req.method()==='GET'&&['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(url.origin));
  return allowed?route.continue():route.abort();
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.getByPlaceholder('например: alexander или family1').fill(user.email);
 await page.locator('input[type=password]').fill(password);
 const signed=page.waitForResponse(r=>r.url().startsWith('http://127.0.0.1:9099/')&&r.url().includes('accounts:signInWithPassword')&&r.request().method()==='POST',{timeout:30000});
 await page.getByRole('button',{name:'Войти',exact:true}).click();
 const result=await signed;
 const identity=await result.json();
 assert.equal(result.ok(),true,'Emulator sign-in failed');
 assert.equal(identity.localId,user.uid,'Browser did not authenticate the expected disposable user');
 console.log('PASS isolated emulator sign-in at '+viewport.width+'px');
 // The bank-import readiness flag depends on unrelated category restoration.
 // Gate this CRUD scenario on the actual authenticated UI and stored record.
 await visible(page.getByRole('button',{name:'Бюджет',exact:true})).waitFor({state:'visible',timeout:60000});
 await visible(page.getByRole('button',{name:'Бюджет',exact:true})).click();
 await edit(page,original.note).waitFor({state:'visible',timeout:20000});
 return page;
}
async function save(page,editing){
 const button=page.getByRole('button',{name:editing?'Сохранить изменения':'Добавить операцию',exact:true}).filter({visible:true}).last();
 await button.click();
 // An actual failure must fail CI; never close the form on behalf of the app.
 try{
  await heading(page,editing?'Редактирование операции':'Новая операция').waitFor({state:'hidden',timeout:20000});
 }catch(error){
  const alerts=await page.getByRole('alert').allTextContents();
  console.error('CRUD save failed:',alerts.join(' | '));
  throw error;
 }
}
try{
 // Build once and serve immutable assets: the previous Vite dev server logged
 // optimized dependency changes and reloaded during the second user's sign-in.
 const build=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','tests/fixtures/viteCrud.config.ts','--outDir','dist-crud-test'],{stdio:'inherit',timeout:240000});
 if(build.error||build.status!==0)throw new Error('Isolated CRUD production bundle build failed');
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--config','tests/fixtures/viteCrud.config.ts','--outDir','dist-crud-test','--host','127.0.0.1','--port','4174','--strictPort'],{stdio:'inherit'});
 await waitServer();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const a=await openUser(users[0],{width:390,height:844});
 const b=await openUser(users[1],{width:1440,height:900});

if(process.argv.includes('--navigation')){
 if(populated){
  // Edit a known imported transaction while both sessions have hundreds of records.
  const title='QA импорт в наполненной семье';
  await edit(b,original.note).click();
  await nameField(b).fill(title);
  await save(b,true);
  const stored=(await rows.doc(original.id).get()).data();
  assert.equal(stored.note,title);
  for(const k of ['amount','date','category','memberId','userId','rawNote','type'])assert.equal(stored[k],original[k],k);
  await edit(a,title).waitFor({state:'visible',timeout:20000});
  console.log('PASS edit imported operation with populated family, server reread and second user');
  const legacy=await rows.where('note','==','Старая банковская операция (QA)').get();
  assert.equal(legacy.size,1);
  const legacyRef=legacy.docs[0].ref;
  const legacyBefore=legacy.docs[0].data();
  await edit(a,legacyBefore.note).click();
  await nameField(a).fill('QA старая операция изменена');
  await a.getByRole('textbox',{name:'Сумма операции'}).fill('84.21');
  await save(a,true);
  const legacyAfter=(await legacyRef.get()).data();
  assert.equal(legacyAfter.note,'QA старая операция изменена');
  assert.equal(Math.round(legacyAfter.amount*100),8421);
  assert.equal(legacyAfter.memberId,legacyBefore.memberId);
  assert.equal(legacyAfter.userId,undefined);
  assert.equal(legacyAfter.date,legacyBefore.date);
  await edit(b,legacyAfter.note).waitFor({state:'visible',timeout:20000});
  console.log('PASS legacy transaction edit with missing optional metadata');
  // Exercise actual shared category-limit editing on both independent sessions.
  const limitSettings=family.collection('config').doc('settings');
  const beforeLimits=(await limitSettings.get()).data().categoryBudgets;
  const beforeLedger=JSON.stringify((await rows.get()).docs.map(doc=>[doc.id,doc.data()]));
  assert.ok(beforeLimits.food>0,'Expected populated food limit');
  const planning=page=>visible(page.getByTestId('budget-planning'));
  const food=page=>planning(page).locator('button[data-limit-category="food"]');
  for(const page of [a,b]){
   await visible(page.locator('nav').getByRole('button',{name:'Бюджет',exact:true})).click();
   await planning(page).waitFor({state:'visible'});
  }
  const amount=page=>planning(page).getByRole('textbox',{name:/Лимит в месяц/});
  const select=page=>planning(page).getByRole('combobox',{name:'Категория',exact:true});
  const close=page=>planning(page).getByRole('button',{name:'Закрыть',exact:true});
  const savedLimit=async(page,value)=>{
   await amount(page).fill(value);
   await planning(page).getByRole('button',{name:'Сохранить лимит',exact:true}).click();
   await amount(page).waitFor({state:'hidden',timeout:20000});
  };
  await food(b).waitFor({state:'visible',timeout:20000}).catch(async error=>{console.error('TERRA planning evidence',await planning(b).innerText().catch(()=>''));throw error;});
  await food(b).click();
  assert.equal(await select(b).inputValue(),'food');
  assert.equal(Number(await amount(b).inputValue()),beforeLimits.food);
  const targetIds=await b.locator('[data-testid="budget-planning"] [id]').evaluateAll(nodes=>nodes.map(el=>el.id));
  assert.equal(new Set(targetIds).size,targetIds.length,'Duplicate planning form IDs');
  await amount(b).fill('12abc');
  await planning(b).getByRole('button',{name:'Сохранить лимит',exact:true}).click();
  await planning(b).getByRole('alert').waitFor({state:'visible'});
  assert.equal(await amount(b).inputValue(),'12abc');
  assert.deepEqual((await limitSettings.get()).data().categoryBudgets,beforeLimits);
  await savedLimit(b,'12345,67');
  assert.deepEqual((await limitSettings.get()).data().categoryBudgets,{...beforeLimits,food:12345.67});
  await a.waitForFunction(()=>Array.from(document.querySelectorAll('[data-testid="budget-planning"]')).some(el=>el.getClientRects().length&&/12[\s\u00a0\u202f]345,67/.test(el.textContent??'')),null,{timeout:20000});
  await food(a).click();
  assert.equal(Number(await amount(a).inputValue()),12345.67);
  await savedLimit(a,String(beforeLimits.food));
  assert.deepEqual((await limitSettings.get()).data().categoryBudgets,beforeLimits);
  await food(b).click();
  await close(b).click();
  assert.equal(JSON.stringify((await rows.get()).docs.map(doc=>[doc.id,doc.data()])),beforeLedger,'Limit editor changed financial ledger');
  console.log('PASS TERRA category limit invalid input, exact decimal save, other account update and restored ledger');
  await runTerraV2Pilot(b,{settingsRef:family.collection('members').doc(users[1].uid).collection('config').doc('settings'),transactionsRef:rows});
 }
 const result=await runNavigationAudit(b,{captureScreens:true,includeInventoryDetails:true,extraViewports:[[320,568],[360,800],[375,812],[768,1024],[1024,768],[1280,800],[1920,1080]]});
 if(result.failures.length)process.exitCode=1;
 await family.collection('members').doc(users[1].uid).collection('config').doc('settings').set({theme:'dark'},{merge:true});
 await b.waitForFunction(()=>document.documentElement.classList.contains('dark'));
 const dark=await runNavigationAudit(b,{captureScreens:true,includeInventoryDetails:true,inventoryOnly:true,extraViewports:[[360,800],[375,812],[390,844],[768,1024],[1024,768],[1280,800],[1920,1080]]});
 if(dark.failures.length)process.exitCode=1;
}else{
const failures=[];
let phase='';
const panel=(p,id)=>p.locator('[data-tab-panel="'+id+'"]');
const btn=(p,name,exact=true)=>visible(p.getByRole('button',{name,exact}));
const currentDoc=async(ref,predicate,label)=>{
 for(let i=0;i<40;i++){const snap=await ref.get();if(predicate(snap))return snap;await new Promise(r=>setTimeout(r,250));}
 throw new Error('Server assertion timed out: '+label);
};
const findOne=async(collection,key,value)=>{
 const ref=family.collection(collection);
 for(let i=0;i<40;i++){const found=await ref.where(key,'==',value).get();if(found.size===1)return found.docs[0];if(found.size>1)throw new Error('Duplicate '+collection+' record');await new Promise(r=>setTimeout(r,250));}
 throw new Error('No saved '+collection+' record');
};
async function nav(p,id,name){
 phase='navigate '+id;await btn(p.locator('nav'),name).click();
 await panel(p,id).waitFor({state:'visible'});
}
async function reset(p){
 await p.reload({waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.__budgetAlfaSyncProtocol===2,null,{timeout:60000});
 await btn(p.locator('nav'),'Бюджет').waitFor({state:'visible',timeout:45000});
}
async function scenario(name,fn){
 try{phase='reset';await reset(a);await reset(b);await fn();console.log('PASS FULL '+name);}
 catch(error){failures.push({name,phase});console.error('FAIL FULL '+name+' at '+phase+': '+String(error?.message??error).slice(0,800));}
}
const eventDialog=p=>p.getByRole('dialog').filter({has:p.locator('#event-title-input')});
const openEvent=async(p,title)=>{
 await nav(p,'plans','Планы');
 await btn(panel(p,'plans'),'День').click();
 const row=p.viewportSize().width<1024?btn(panel(p,'plans'),'Открыть событие: '+title):btn(panel(p,'plans'),new RegExp('^(?:Открыть событие: )?'+title+'(?:,|$|\\s)'),false);await row.click();
 await eventDialog(p).waitFor({state:'visible'});
};
await scenario('ALFA partial import, replay, mobile review action and persistence',async()=>{
 phase='wait for review capability';
 const owner=users[0],inbox=family.collection('members').doc(owner.uid).collection('alfaReview');
 await a.waitForFunction(()=>window.__budgetAlfaReviewProtocol===1&&typeof window.__budgetAlfaReviewFinish==='function',null,{timeout:60000});
 const makeFile=(data)=>{
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Дата','Сумма','Тип','Описание','MCC код','Категория'],...data]),'QA');
  return XLSX.write(wb,{type:'buffer',bookType:'xlsx'});
 };
 const date='2026-11-25 12:34:56';
 const xlsx=makeFile([[date,'12.34','Расход','QA продукты','5411','Продукты'],[date,'23.45','Расход','ZZQXVJ7U3','9999','']]);
 const send=async(buffer,{acceptEmpty=false,expectError=false}={})=>{
  const sha=createHash('sha256').update(buffer).digest('hex');
  await a.evaluate(({sha,acceptEmpty})=>{
   window.__budgetAlfaReviewRun=true;
   window.__qaReviewOutcome=null;
   window.addEventListener('budget:import-review-result',e=>{window.__qaReviewOutcome={kind:'result',detail:e.detail}},{once:true});
   window.addEventListener('budget:import-review-error',e=>{window.__qaReviewOutcome={kind:'error',detail:e.detail}},{once:true});
   window.__budgetAlfaReviewRequest={fileSha256:sha,scope:window.__budgetAlfaReviewScope,acceptEmpty};
  },{sha,acceptEmpty});
  await a.locator('#import-input').setInputFiles({name:'alfa_qa.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
  await a.waitForFunction(()=>window.__qaReviewOutcome,null,{timeout:90000});
  const result=await a.evaluate(()=>window.__qaReviewOutcome);
  assert.equal(result.kind,expectError?'error':'result',JSON.stringify(result));assert.equal(result.detail.fileSha256,sha);
  assert.equal(await a.evaluate(()=>window.__budgetAlfaReviewRequest),undefined);
  return result.detail;
 };
 phase='verified empty XLSX';
 const beforeEmpty=(await rows.get()).size;
 const empty=await send(makeFile([]),{acceptEmpty:true});
 assert.deepEqual([empty.requested,empty.created,empty.existing,empty.queued,empty.unverified,empty.emptyVerified],[0,0,0,0,0,true]);
 assert.equal((await rows.get()).size,beforeEmpty);
 assert.equal((await inbox.get()).size,0);
 phase='verified actual bank export layout';
 const realBook=XLSX.utils.book_new();
 const realHeader=['Дата операции','Дата проводки','Название счета','Номер счета','Название карты','Номер карты','Описание операции','Сумма','Валюта','Статус','Категория','MCC код','Тип','','Комментарий','Кэшбэк','Тип кэшбэка'];
 const realSheet=XLSX.utils.aoa_to_sheet([realHeader,['',...Array(12).fill(null)]]);
 realSheet['!ref']='A1:Q2';
 XLSX.utils.book_append_sheet(realBook,realSheet,'Выписка');
 const realEmpty=await send(XLSX.write(realBook,{type:'buffer',bookType:'xlsx'}),{acceptEmpty:true});
 assert.deepEqual([realEmpty.requested,realEmpty.created,realEmpty.existing,realEmpty.queued,realEmpty.unverified,realEmpty.emptyVerified],[0,0,0,0,0,true]);
 assert.equal((await rows.get()).size,beforeEmpty);
 assert.equal((await inbox.get()).size,0);
 console.log('PASS ALFA actual export layout verified empty');
 phase='old client still defers empty';
 const old=await send(makeFile([]),{expectError:true});
 assert.equal(old.code,'EMPTY_STATEMENT');
 phase='unrecognized blank XLSX retained';
 const blankBook=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(blankBook,XLSX.utils.aoa_to_sheet([['']]),'QA');
 const blank=await send(XLSX.write(blankBook,{type:'buffer',bookType:'xlsx'}),{acceptEmpty:true,expectError:true});
 assert.equal(blank.code,'EMPTY_STATEMENT');
 assert.equal((await rows.get()).size,beforeEmpty);
 assert.equal((await inbox.get()).size,0);
 phase='mixed XLSX';
 const first=await send(xlsx);
 assert.deepEqual([first.requested,first.created,first.existing,first.queued,first.unverified],[2,1,0,1,0]);
 const pending=await inbox.get();assert.equal(pending.size,1);
 const item=pending.docs[0];assert.equal(item.data().row.amount,23.45);
 assert.equal((await rows.doc(item.id).get()).exists,false,'pending row must not enter transactions');
 const saved=await rows.where('rawNote','==','QA продукты').get();assert.equal(saved.size,1);assert.equal(saved.docs[0].data().amount,12.34);
 phase='replay';
 await reset(a);await a.waitForFunction(()=>window.__budgetAlfaReviewProtocol===1);
 const repeat=await send(xlsx);
 assert.deepEqual([repeat.requested,repeat.created,repeat.existing,repeat.queued,repeat.unverified],[2,0,1,1,0]);
 assert.equal((await inbox.get()).size,1);assert.equal((await rows.where('rawNote','==','QA продукты').get()).size,1);
 phase='review after reload';
 await reset(a);await a.waitForFunction(()=>window.__budgetAlfaReviewProtocol===1);
 const action=a.getByTestId('alfa-review-open');
 await action.waitFor({state:'visible',timeout:20000});assert.match(await action.textContent(),/На разбор: 1/);
 assert.equal(await b.getByTestId('alfa-review-open').count(),0);
 await action.click();
 const dialog=a.getByRole('dialog',{name:'Операции на разбор',exact:true});await dialog.waitFor({state:'visible'});
 phase='review filters and consistent counts';
 const filters=dialog.getByRole('group',{name:'Фильтр операций выписки'});
 const without=filters.getByRole('button',{name:'Без категории 1',exact:true});
 const all=filters.getByRole('button',{name:'Все 1',exact:true});
 const search=dialog.getByRole('searchbox',{name:'Поиск по выписке'});
 for(const control of [without,all,search]){
  const rect=await control.boundingBox();assert.ok(meetsTouchTarget(rect),'Import control target too small');
 }
 await without.click();
 assert.equal(await without.getAttribute('aria-pressed'),'true');
 assert.equal(await dialog.locator('[data-import-row][data-needs-category="true"]').count(),1);
 assert.equal(await btn(dialog,'Импортировать все (1)').isDisabled(),true);
 await search.fill('QA_NO_MATCH_98473201');
 assert.equal(await dialog.locator('[data-import-row]').count(),0);
 await dialog.getByText('Операций по выбранным фильтрам не найдено',{exact:true}).waitFor({state:'visible'});
 await search.fill('');
 assert.equal(await dialog.locator('[data-import-row]').count(),1);
 await all.click();
 await btn(dialog,'Выбрать категорию').click();
 await dialog.getByPlaceholder('Поиск категории или подкатегории...').fill('Продукты');
 await btn(dialog,'Продукты').click();
 assert.equal(await dialog.locator('[data-import-row][data-needs-category="false"]').count(),1);
 assert.equal(await filters.getByRole('button',{name:'Без категории 0',exact:true}).count(),1);
 assert.equal(await btn(dialog,'Импортировать все (1)').isEnabled(),true);
 await btn(dialog,'Импортировать все (1)').evaluate(button=>{button.click();button.click();});
 console.log('PASS TERRA import filter counts, search, category readiness and duplicate click');
 await dialog.waitFor({state:'hidden',timeout:30000});
 const resolved=await currentDoc(rows.doc(item.id),x=>x.exists,'resolved bank transaction');
 assert.equal(resolved.data().amount,23.45);assert.equal(resolved.data().memberId,'a');assert.equal(resolved.data().category,'food');
 await currentDoc(item.ref,x=>!x.exists,'queue removed only after save');
 await action.waitFor({state:'hidden'});
 phase='replay after resolution';
 await reset(a);await a.waitForFunction(()=>window.__budgetAlfaReviewProtocol===1);
 const final=await send(xlsx);
 assert.deepEqual([final.requested,final.created,final.existing,final.queued,final.unverified],[2,0,2,0,0]);
 assert.equal((await inbox.get()).size,0);
 phase='defer savings';
 const saving=await send(makeFile([[date,'34.56','Расход','Перевод на накопительный счет','','']]));
 assert.deepEqual([saving.requested,saving.created,saving.existing,saving.queued,saving.unverified],[1,0,0,1,0]);
 const transfers=await inbox.get();assert.equal(transfers.size,1);assert.equal(transfers.docs[0].data().reason,'savings');
 assert.equal((await rows.doc(transfers.docs[0].id).get()).exists,false);
 // Emulator-only cleanup, no real data touched. Leave finance state unchanged for other tests.
 await transfers.docs[0].ref.delete();await rows.doc(item.id).delete();await saved.docs[0].ref.delete();
 console.log('PASS ALFA review end to end; no duplicate, manual resolution, savings deferred');
});
await scenario('PLN-03/04/06 event create, cross-user edit, checklist, delete',async()=>{
 await nav(b,'plans','Планы');
 await btn(panel(b,'plans'),'День').click();
 phase='event create editor';await btn(panel(b,'plans'),'Добавить событие').click();
 const d=eventDialog(b);await d.waitFor({state:'visible'});
 await d.locator('#event-title-input').fill('QA событие');
 await d.getByPlaceholder('Добавить пункт (билеты, термос)...').fill('QA пункт');
 await btn(d,'Добавить пункт чек-листа').click();
 phase='event save';await btn(d,'Создать').click();await d.waitFor({state:'hidden'});
 const saved=await findOne('events','title','QA событие');
 assert.equal(saved.data().checklist[0].text,'QA пункт');
 const date=saved.data().date;
 phase='event edit from other user';await openEvent(a,'QA событие');
 await eventDialog(a).locator('#event-title-input').fill('QA событие изменено');
 await btn(eventDialog(a),'Сохранить').click();await eventDialog(a).waitFor({state:'hidden'});
 await currentDoc(saved.ref,x=>x.exists&&x.data().title==='QA событие изменено','event rename');
 assert.equal((await saved.ref.get()).data().date,date);
 phase='event reload and delete';await reset(b);await openEvent(b,'QA событие изменено');
 await btn(eventDialog(b),'Удалить событие').click();await btn(eventDialog(b),'Да, удалить').click();
 await eventDialog(b).waitFor({state:'hidden'});
 await currentDoc(saved.ref,x=>!x.exists,'event deletion');
});
await scenario('OVR quick shopping decimal units and two-account completion',async()=>{
 const shopping=family.collection('shopping');
 const ledgerBefore=JSON.stringify((await rows.get()).docs.map(doc=>[doc.id,doc.data()]));
 await nav(b,'overview','Обзор');
 const card=panel(b,'overview').getByTestId('overview-shopping-card').filter({visible:true}).first();
 const input=card.getByRole('textbox',{name:'Название новой покупки'});
 phase='overview decimal preview';
 await input.fill('QA молоко точность 1,5 л; QA сыр точность 25 г');
 const preview=card.getByTestId('overview-shopping-preview');
 await preview.getByText('1,5 л',{exact:true}).waitFor({state:'visible'});
 await preview.getByText('25 г',{exact:true}).waitFor({state:'visible'});
 phase='save both quantities';
 await btn(card,'Добавить в список покупок').click();
 const milk=await findOne('shopping','title','QA молоко точность');
 const cheese=await findOne('shopping','title','QA сыр точность');
 assert.equal(milk.data().amount,'1.5');assert.equal(milk.data().unit,'л');
 assert.equal(cheese.data().amount,'25');assert.equal(cheese.data().unit,'г');
 phase='other account sees and completes item';
 await nav(a,'shopping','Покупки');
 await btn(panel(a,'shopping'),'Редактировать товар: QA молоко точность').waitFor({state:'visible'});
 await btn(card,'Отметить покупку «QA молоко точность» как выполненную').click();
 await currentDoc(milk.ref,s=>s.exists&&s.data().completed===true&&typeof s.data().completedAt==='number','overview completion timestamp');
 await btn(panel(a,'shopping'),'Редактировать товар: QA молоко точность').waitFor({state:'hidden'});
 assert.equal(JSON.stringify((await rows.get()).docs.map(doc=>[doc.id,doc.data()])),ledgerBefore,'Quick shopping changed ledger');
 await Promise.all([milk.ref.delete(),cheese.ref.delete()]);
});
await scenario('SHP-02/03 shopping create, mobile rename, quantity, bought/restore, delete',async()=>{
 await nav(b,'shopping','Покупки');let p=panel(b,'shopping');
 phase='shopping quick add';
 await p.getByRole('textbox',{name:'Быстрое добавление товаров'}).fill('QA молоко');
 await btn(p,'Добавить товары в общий список').click();
 const saved=await findOne('shopping','title','QA молоко');
 phase='mobile shopping edit';await nav(a,'shopping','Покупки');
 await btn(panel(a,'shopping'),'Редактировать товар: QA молоко').click();
 await a.getByPlaceholder('Например: Сыр Российский').fill('QA молоко изменено');
 await btn(a,'Сохранить изменения').click();
 await currentDoc(saved.ref,x=>x.exists&&x.data().title==='QA молоко изменено','shopping rename');
 phase='desktop quantity and complete';
 const prior=(await saved.ref.get()).data();
 const step=['кг','л'].includes(String(prior.unit??'шт').trim().toLowerCase())?0.5:1;
 const expectedAmount=(Math.round(Number(prior.amount)*10)+Math.round(step*10))/10;
 await btn(p,'Увеличить количество: QA молоко изменено').click();
 await currentDoc(saved.ref,x=>x.exists&&Number(x.data().amount)===expectedAmount,'shopping quantity');
 await p.getByRole('checkbox',{name:'Отметить купленным: QA молоко изменено',exact:true}).locator('xpath=..').click();
 await currentDoc(saved.ref,x=>x.exists&&x.data().completed===true,'shopping purchased');
 phase='restore from completed';await btn(p,'Вернуть в список: QA молоко изменено').click();
 await currentDoc(saved.ref,x=>x.exists&&x.data().completed===false,'shopping restore');
 phase='delete exact product';await btn(p,'Удалить товар: QA молоко изменено').click();
 await currentDoc(saved.ref,x=>!x.exists,'shopping deletion');
 await btn(panel(a,'shopping'),'Редактировать товар: QA молоко изменено').waitFor({state:'hidden'});
});
await scenario('SHP Terra filtered clear, template preview and pantry transfer',async()=>{
 const shopping=family.collection('shopping'),stock=family.collection('pantry');
 const ledgerBefore=JSON.stringify((await rows.get()).docs.map(doc=>[doc.id,doc.data()]));
 const titles=['QA clear visible','QA keep hidden','QA pantry move'];
 const ids=['terra-clear-visible','terra-keep-hidden','terra-pantry-move'];
 await Promise.all(ids.map((id,i)=>shopping.doc(id).set({id,title:titles[i],amount:'2.5',unit:'л',category:'drinks',priority:'medium',memberId:'a',completed:true,completedAt:Date.now()})));
 await nav(b,'shopping','Покупки');await nav(a,'shopping','Покупки');
 const p=panel(b,'shopping'),q=panel(a,'shopping');
 const search=p.getByRole('textbox',{name:'Поиск по товарам в семейном списке'});
 phase='filtered clear on desktop';await search.fill(titles[0]);
 await btn(p,'Вернуть в список: '+titles[0]).waitFor({state:'visible'});
 await btn(p,'Очистить купленные товары').click();
 await btn(p,'Подтвердить удаление 1 купленных товаров').click();
 await currentDoc(shopping.doc(ids[0]),snap=>!snap.exists,'filtered row deleted');
 assert.equal((await shopping.doc(ids[1]).get()).exists,true,'Hidden completed row was deleted');
 assert.equal((await shopping.doc(ids[2]).get()).exists,true);
 phase='pantry move on desktop';await search.fill(titles[2]);
 const move=btn(p,'В кладовку: '+titles[2]);await move.waitFor({state:'visible'});
 const box=await move.boundingBox();assert.ok(meetsTouchTarget(box));
 await move.evaluate(button=>{button.click();button.click();});
 await currentDoc(shopping.doc(ids[2]),snap=>!snap.exists,'moved source removed');
 const moved=await findOne('pantry','title',titles[2]);assert.equal(moved.data().amount,'2.5');assert.equal(moved.data().unit,'л');
 phase='other account pantry view';
 await btn(q,/^Кладовая/,false).click();
 const stockRow=q.locator('[data-pantry-id="'+moved.id+'"]');await stockRow.waitFor({state:'visible',timeout:20000});assert.match(await stockRow.innerText(),/2\.5 л/);
 phase='edit inventory quantity, unit and expiry on mobile';
 await btn(stockRow,'Редактировать запас: '+titles[2]).click();
 const editor=q.getByRole('form',{name:'Редактирование запаса'});
 await editor.waitFor({state:'visible'});
 await editor.getByLabel('Количество',{exact:true}).fill('1,25');
 await editor.getByLabel('Единица',{exact:true}).fill('кг');
 await editor.getByLabel('Годен до',{exact:true}).fill('2028-02-29');
 await btn(editor,'Сохранить').click();
 await currentDoc(moved.ref,snap=>snap.data()?.amount==='1.25'&&snap.data()?.unit==='кг'&&snap.data()?.expiryDate==='2028-02-29','inventory edit persisted');
 await btn(p,/^Кладовая/,false).click();
 const peerStock=p.locator('[data-pantry-id="'+moved.id+'"]');
 await peerStock.waitFor({state:'visible',timeout:20000});
 await b.waitForFunction(id=>Array.from(document.querySelectorAll('[data-pantry-id]')).some(el=>el.getAttribute('data-pantry-id')===id&&el.textContent.includes('1.25 кг')&&el.getClientRects().length),moved.id).catch(async()=>{assert.match(await peerStock.innerText(),/1\.25 кг/);});
 await btn(p,/^Кладовая/,false).click();
 await btn(q,/^Кладовая/,false).click();
 phase='template preview does not write';
 const before=JSON.stringify((await shopping.get()).docs.map(doc=>[doc.id,doc.data()]));
 await btn(p,/Быстрые списки/,false).click();
 await btn(p,'Продукты на неделю · 4').click();
 const preview=p.getByRole('region',{name:'Состав быстрого списка'});await preview.waitFor({state:'visible'});
 assert.equal(await preview.locator('li').count(),4);assert.match(await preview.innerText(),/Молоко/);
 assert.equal(JSON.stringify((await shopping.get()).docs.map(doc=>[doc.id,doc.data()])),before);
 await btn(preview,'Отмена').click();await preview.waitFor({state:'hidden'});
 await btn(p,/Быстрые списки/,false).click();await search.fill('');
 // Remove only disposable emulator fixtures.
 await shopping.doc(ids[1]).delete();
 await btn(q,/^Кладовая/,false).click();
 await btn(stockRow,'Удалить запас: '+titles[2]).click();
 const confirmation=q.getByRole('group',{name:'Подтверждение удаления запаса'});
 await confirmation.waitFor({state:'visible'});
 assert.equal((await moved.ref.get()).exists,true,'Opening confirmation removed inventory');
 await btn(confirmation,'Удалить').click();
 await currentDoc(moved.ref,snap=>!snap.exists,'inventory deletion confirmed');
 await stockRow.waitFor({state:'hidden',timeout:20000});
 assert.equal(JSON.stringify((await rows.get()).docs.map(doc=>[doc.id,doc.data()])),ledgerBefore,'Shopping changed the financial ledger');
 console.log('PASS TERRA shopping filtered clear, exact pantry transfer, other account inventory, template preview and unchanged ledger');
});
await scenario('SHP shared frequent history and note search',async()=>{
 const shopping=family.collection('shopping');
 const ids=['terra-real-frequency-1','terra-real-frequency-2','terra-note-active'];
 const name='QA повторный продукт',note='QA уникальная заметка';
 const baseline=JSON.stringify((await rows.get()).docs.map(doc=>[doc.id,doc.data()]));
 try{
  await Promise.all(ids.map((id,i)=>shopping.doc(id).set({id,title:i===2?'QA активный товар':name,note,amount:'1',unit:'шт',category:'other',priority:'medium',memberId:i===1?'b':'a',completed:i!==2,...(i!==2?{completedAt:Date.now()+i}:{})})));
  for(const page of [a,b]){
   await nav(page,'shopping','Покупки');
   const p=panel(page,'shopping'),search=p.getByRole('textbox',{name:'Поиск по товарам в семейном списке'});
   phase='note filter '+page.viewportSize().width;
   await search.fill('  QA УНИКАЛЬНАЯ ЗАМЕТКА  ');
   await btn(p,'Редактировать товар: QA активный товар').waitFor({state:'visible',timeout:20000});
   await btn(p,'Вернуть в список: '+name).first().waitFor({state:'visible'});
   await btn(p,'Очистить поиск товаров').click();assert.equal(await search.inputValue(),'');
   phase='actual shared purchase frequency '+page.viewportSize().width;
   const repeat=btn(p,'Повторить покупки');
   if(await repeat.getAttribute('aria-expanded')!=='true')await repeat.click();
   const frequent=p.getByTestId('family-frequent-purchases');
   const item=btn(frequent,'Повторить частую покупку: '+name+' шт');
   await item.waitFor({state:'visible',timeout:20000});
   assert.equal(await item.getByTestId('frequency-count').innerText(),'2×');
   await repeat.click();
  }
  assert.equal(JSON.stringify((await rows.get()).docs.map(doc=>[doc.id,doc.data()])),baseline);
 }finally{await Promise.all(ids.map(id=>shopping.doc(id).delete()));}
});
await scenario('CHAT message and other-account heart reaction',async()=>{
 await nav(b,'chat','Чат');await nav(a,'chat','Чат');
 const p=panel(b,'chat'),q=panel(a,'chat');
 phase='send message';await p.getByPlaceholder('Сообщение семье...').fill('QA сообщение');
 await btn(p,'Отправить сообщение').click();
 const saved=await findOne('chat','text','QA сообщение');
 assert.equal(saved.data().userId,users[1].uid);
 phase='second account receives message';const received=q.locator('[data-chat-message-id="'+saved.id+'"]');
 await received.getByTestId('chat-message-text').waitFor({state:'visible'});
 assert.equal(await received.getByTestId('chat-message-text').textContent(),'QA сообщение');
 const search=btn(q,'Поиск');await search.click();
 const searchInput=q.getByRole('textbox',{name:'Поиск по сообщениям'});
 await searchInput.fill('QA отсутствующий запрос');
 await received.waitFor({state:'hidden'});
 await search.click();await searchInput.waitFor({state:'hidden'});await received.waitFor({state:'visible'});
 const heart=btn(received,'Реакция сердце');
 await heart.click();await currentDoc(saved.ref,x=>x.exists&&x.data().heartUsers?.includes(users[0].uid),'heart set');
 phase='heart undo';await heart.click();await currentDoc(saved.ref,x=>x.exists&&!x.data().heartUsers?.includes(users[0].uid),'heart removed');
});
await scenario('SET-02 personal theme persistence and isolation',async()=>{
 phase='open desktop settings';await btn(b,'Настройки').click();
 const d=b.getByRole('dialog',{name:'Настройки',exact:true});
 await btn(d,/^Оформление и приватность/,false).click();
 const theme=d.getByRole('group',{name:'Тема приложения'});
 const ref=family.collection('members').doc(users[1].uid).collection('config').doc('settings');
 const other=family.collection('members').doc(users[0].uid).collection('config').doc('settings');
 phase='dark theme';await btn(theme,'Тёмная').click();
 await currentDoc(ref,x=>x.exists&&x.data().theme==='dark','personal dark theme');
 assert.equal((await other.get()).data().theme,'light');
 await btn(d,'Закрыть настройки').click();
 phase='reload dark theme';await reset(b);await b.waitForFunction(()=>document.documentElement.classList.contains('dark'));
 phase='restore light theme';await btn(b,'Настройки').click();await btn(d,/^Оформление и приватность/,false).click();
 await btn(theme,'Системная').click();await currentDoc(ref,x=>x.exists&&x.data().theme==='system','personal system theme');
 await btn(d,'Закрыть настройки').click();
 try{
  await b.emulateMedia({colorScheme:'dark'});await b.waitForFunction(()=>document.documentElement.classList.contains('dark'));
  await b.emulateMedia({colorScheme:'light'});await b.waitForFunction(()=>!document.documentElement.classList.contains('dark'));
  assert.equal((await other.get()).data().theme,'light');
  await nav(b,'overview','Обзор');await btn(panel(b,'overview'),'Скрыть суммы').click();
  await currentDoc(ref,x=>x.data()?.privacyMode===true,'personal privacy');
  assert.notEqual((await other.get()).data()?.privacyMode,true);
  await reset(b);await nav(b,'overview','Обзор');await btn(panel(b,'overview'),'Показать суммы').waitFor({state:'visible'});
  await btn(panel(b,'overview'),'Показать суммы').click();await currentDoc(ref,x=>x.data()?.privacyMode===false,'restore privacy');
 }finally{
  await ref.set({theme:'light',privacyMode:false},{merge:true});await b.emulateMedia({colorScheme:null});
 }
});
await scenario('OVR-drilldown privacy on desktop and mobile',async()=>{
 const refs=users.map(u=>family.collection('members').doc(u.uid).collection('config').doc('settings'));
 const record=rows.doc('qa-privacy-amount');
 await record.set({...original,id:'qa-privacy-amount',amount:987654.32,date:new Date().toISOString(),note:'QA приватная сумма',payee:'QA приватная сумма'});
 try{
  await Promise.all(refs.map(ref=>ref.set({privacyMode:true},{merge:true})));
  for(const page of [a,b]){
   phase='privacy overview '+page.viewportSize().width;
   await reset(page);await nav(page,'overview','Обзор');
   await btn(panel(page,'overview'),'Аналитика всех категорий').click();
   const dialog=page.getByTestId('transaction-drilldown');
   await dialog.getByText('QA приватная сумма',{exact:true}).first().waitFor({state:'visible'});
   const inspect=async()=>{
    const text=(await dialog.innerText()).replace(/[\s\u00a0\u202f]/g,'');
    assert.doesNotMatch(text,/987654(?:[,.]32)?/,'Raw amount leaked from private drilldown');
    assert.match(text,/•••/,'Expected masked financial amounts');
   };
   await inspect();
   phase='privacy analytics '+page.viewportSize().width;
   await btn(dialog,page.viewportSize().width<768?'Аналитика и график трат':'Аналитика и графики трат').click();
   await dialog.getByText('График скрыт в режиме приватности',{exact:true}).waitFor({state:'visible'});
   await inspect();
   await btn(dialog,page.viewportSize().width<768?'Назад к операциям':'Реестр операций').click();
   await btn(dialog,page.viewportSize().width<768?'Закрыть или вернуться назад':'Закрыть').click();
   await dialog.waitFor({state:'hidden'});
  }
 }finally{await Promise.all(refs.map(ref=>ref.set({privacyMode:false},{merge:true})));await record.delete();}
});
await scenario('SVC-wallet create, rename, second-user read, delete',async()=>{
 await nav(b,'services','Сервисы');
 await btn(panel(b,'services'),/^Карты лояльности/,false).click();
 phase='new loyalty card';await btn(panel(b,'services'),'Добавить карту').click();
 await b.getByPlaceholder('Магазин (Лента, Перекрёсток, FixPrice...)').fill('QA карта');
 await b.getByPlaceholder('7789 2034 5519...').fill('1234567890');
 await btn(b,'Добавить в кошелёк').click();
 const saved=await findOne('loyalty','name','QA карта');assert.equal(saved.data().number,'1234567890');
 phase='loyalty rename';await visible(b.getByTitle('Редактировать',{exact:true})).click();
 await b.getByPlaceholder('Магазин (Лента, Перекрёсток, FixPrice...)').fill('QA карта изменена');
 await btn(b,'Сохранить карту').click();
 await currentDoc(saved.ref,x=>x.exists&&x.data().name==='QA карта изменена','wallet rename');
 phase='mobile sees saved loyalty card';await nav(a,'services','Сервисы');await btn(panel(a,'services'),/^Карты лояльности/,false).click();
 await visible(panel(a,'services').getByText('QA карта изменена',{exact:true})).waitFor({state:'visible'});
 phase='delete card';await visible(b.getByTitle('Удалить карту',{exact:true})).click();
 await b.getByRole('heading',{name:'Удалить карту?'}).waitFor({state:'visible'});
 await btn(b,'Удалить').click();await currentDoc(saved.ref,x=>!x.exists,'wallet delete');
});
await scenario('SVC-debts create, edit, payment toggle, delete',async()=>{
 await nav(b,'services','Сервисы');await btn(panel(b,'services'),/^Долги/,false).click();
 phase='debt create';await btn(b,'Добавить долг').click();
 await b.locator('input[name="title"]').fill('QA долг');
 const future=new Date();future.setUTCFullYear(future.getUTCFullYear()+1);
 const due=new Date();due.setUTCDate(due.getUTCDate()+7);
 await b.locator('input[name="finalClosingDate"]').fill(future.toISOString().slice(0,10));
 await b.locator('input[name="totalAmount"]').fill('12abc');
 await b.locator('input[name="paidAmount"]').fill('100.25');
 await b.locator('input[name="monthlyPayment"]').fill('100.00');
 await b.locator('input[name="dueDate"]').fill(due.toISOString().slice(0,10));
 await btn(b,'Сохранить').click();
 await b.getByRole('alert').filter({hasText:'Введите корректную сумму'}).first().waitFor({state:'visible'});
 assert.equal(await b.locator('input[name="totalAmount"]').inputValue(),'12abc','Invalid draft must remain editable');
 assert.equal((await family.collection('debts').where('name','==','QA долг').get()).empty,true,'Invalid debt must not be written');
 await b.locator('input[name="totalAmount"]').fill('1000,50');
 await b.locator('input[name="paidAmount"]').fill('100,25');
 await btn(b,'Сохранить').click();
 const saved=await findOne('debts','name','QA долг');assert.equal(saved.data().currentBalance,900.25);assert.equal(saved.data().memberId,'b','New debt must have creator member');
 phase='debt edit';await btn(b,'Редактировать параметры долга').click();
 await b.locator('input[name="title"]').fill('QA долг изменён');
 await btn(b,'Сохранить').click();
 await currentDoc(saved.ref,x=>x.exists&&x.data().name==='QA долг изменён'&&x.data().memberId==='b','debt rename preserves owner');
 phase='debt payment';await btn(b,'Внести платёж').click();
 await currentDoc(saved.ref,x=>x.exists&&x.data().currentBalance===800.25,'debt payment');
 phase='undo debt payment';await btn(b,'Отменить платёж').click();
 await currentDoc(saved.ref,x=>x.exists&&x.data().currentBalance===900.25,'debt payment undo');
 phase='debt delete';await btn(b,'Удалить карточку').click();
 await b.getByRole('heading',{name:'Удалить долг?'}).waitFor({state:'visible'});
 await btn(b,'Удалить').click();await currentDoc(saved.ref,x=>!x.exists,'debt delete');
});
await scenario('BUD-16/17/18 mandatory payments persistence',async()=>{
 await nav(b,'budget','Бюджет');
 phase='mandatory payment create';await visible(b.getByRole('button',{name:'Добавить обязательный платёж'})).click();
 await b.locator('#paymentName').fill('QA обязательство');
 await b.locator('#paymentAmount').fill('1250.45');
 await b.locator('#paymentDay').fill('18');
 await btn(b,'Добавить платёж').click();
 const ref=family.collection('config').doc('settings');
 const entry=doc=>doc.data()?.mandatoryExpenses?.find(x=>x.name==='QA обязательство');
 await currentDoc(ref,x=>entry(x)?.amount===1250.45,'mandatory create');
 phase='mandatory edit';await btn(b,'Редактировать обязательный платёж: QA обязательство').click();
 await b.locator('#paymentAmount').fill('1300.55');
 await btn(b,'Сохранить изменения').click();
 await currentDoc(ref,x=>entry(x)?.amount===1300.55,'mandatory update');
 phase='mandatory delete';await btn(b,'Редактировать обязательный платёж: QA обязательство').click();
 await btn(b,'Удалить платеж').click();await btn(b,'Подтвердить удаление').click();
 await currentDoc(ref,x=>!entry(x),'mandatory delete');
});
await scenario('OVR-reserve actual empty state and confirmed mark',async()=>{
 const ref=family.collection('config').doc('settings');
 await ref.set({mandatoryExpenses:[],manualPaidExpenses:{},manualReservedAmount:0},{merge:true});
 await nav(b,'overview','Обзор');
 phase='empty reserve';await btn(panel(b,'overview'),/^Открыть подробности (семейного|личного) резерва$/,false).click();
 const dialog=b.getByRole('dialog',{name:'Структура резерва'});
 await dialog.getByText('Нет обязательных платежей',{exact:true}).waitFor({state:'visible'});
 assert.equal(await btn(dialog,'Отметить выбранные как оплаченные').isDisabled(),true);
 assert.equal(await dialog.getByRole('checkbox').count(),0);
 const reserveInput=dialog.getByRole('textbox',{name:'Сумма вручную',exact:true});
 const saveReserve=btn(dialog,'Сохранить ручной резерв');
 phase='invalid reserve remains unchanged';
 await reserveInput.fill('12.345');await saveReserve.click();
 await dialog.getByRole('alert').waitFor({state:'visible'});
 assert.equal((await ref.get()).data().manualReservedAmount,0,'invalid reserve committed');
 phase='cancel reserve draft without saving';
 await reserveInput.fill('43,21');await btn(dialog,'Закрыть').click();
 await dialog.waitFor({state:'hidden'});
 assert.equal((await ref.get()).data().manualReservedAmount,0,'cancel committed draft');
 phase='explicit reserve save';
 await btn(panel(b,'overview'),/^Открыть подробности (семейного|личного) резерва$/,false).click();
 await reserveInput.fill('43,21');await saveReserve.click();
 await currentDoc(ref,x=>x.data()?.manualReservedAmount===43.21,'reserve saved exact kopecks');
 await saveReserve.waitFor({state:'visible'});
 await btn(dialog,'Закрыть').click();
 await dialog.waitFor({state:'hidden'});
 phase='real reserve payment';await ref.set({mandatoryExpenses:[{id:'qa-reserve',name:'QA резерв',amount:100.25,day:10,remind:false}]},{merge:true});
 await btn(panel(b,'overview'),/^Открыть подробности (семейного|личного) резерва$/,false).click();
 const checkbox=dialog.getByRole('checkbox',{name:'Выбрать платёж: QA резерв',exact:true});
 await checkbox.waitFor({state:'visible'});
 const editPayment=btn(dialog,'Редактировать обязательный платеж: QA резерв');
 phase='nested payment editor returns to reserve';
 await editPayment.click();
 const paymentEditor=b.getByRole('dialog',{name:'Редактирование платежа',exact:true});
 await paymentEditor.waitFor({state:'visible'});
 await b.keyboard.press('Escape');
 await paymentEditor.waitFor({state:'hidden'});
 await dialog.waitFor({state:'visible'});
 assert.equal(await editPayment.evaluate(el=>document.activeElement===el),true,'reserve edit focus return');
 phase='confirm reserve payment';
 await checkbox.check();
 await btn(dialog,'Отметить выбранные как оплаченные').click();
 await currentDoc(ref,snapshot=>Object.values(snapshot.data()?.manualPaidExpenses??{}).some(ids=>Array.isArray(ids)&&ids.includes('qa-reserve')),'confirmed reserve paid mark');
 await dialog.getByText('Оплачено',{exact:true}).waitFor({state:'visible'});
 await btn(dialog,'Закрыть').click();
});
await scenario('SVC-debt linked obligation create, edit, unlink and conflict rejection',async()=>{
 const ref=family.collection('config').doc('settings');
 await ref.set({mandatoryExpenses:[{id:'qa-link',name:'QA связанный платёж',amount:90,day:8,remind:true},{id:'qa-occupied',name:'QA занятый платёж',amount:50,day:4,remind:false,linkedDebtId:'other-debt'}]},{merge:true});
 await nav(b,'services','Сервисы');await btn(panel(b,'services'),/^Долги/,false).click();
 phase='create linked debt';await btn(b,'Добавить долг').click();
 await b.locator('input[name="title"]').fill('QA связанный долг');
 const due=new Date();due.setUTCDate(due.getUTCDate()+7);
 const future=new Date();future.setUTCFullYear(future.getUTCFullYear()+1);
 await b.locator('input[name="finalClosingDate"]').fill(future.toISOString().slice(0,10));
 await b.locator('input[name="totalAmount"]').fill('1000,50');
 await b.locator('input[name="paidAmount"]').fill('0');
 await b.locator('input[name="monthlyPayment"]').fill('100,25');
 await b.locator('input[name="dueDate"]').fill(due.toISOString().slice(0,10));
 await b.locator('#linkedExpenseId option[value="qa-link"]').waitFor({state:'attached'});
 assert.equal(await b.locator('#linkedExpenseId option[value="qa-occupied"]').isDisabled(),true);
 await b.locator('#linkedExpenseId').selectOption('qa-link');
 await btn(b,'Сохранить').click();
 const saved=await findOne('debts','name','QA связанный долг');
 assert.equal(saved.data().linkedExpenseId,'qa-link');
 const linked=x=>x.data()?.mandatoryExpenses?.find(e=>e.id==='qa-link');
 await currentDoc(ref,x=>linked(x)?.linkedDebtId===saved.id&&linked(x)?.amount===100.25,'linked obligation create');
 phase='edit linked debt';await btn(b,'Редактировать параметры долга').click();
 await b.locator('input[name="monthlyPayment"]').fill('125,50');
 await btn(b,'Сохранить').click();
 await currentDoc(saved.ref,x=>x.exists&&x.data().monthlyPayment===125.5,'linked debt edit');
 await currentDoc(ref,x=>linked(x)?.linkedDebtId===saved.id&&linked(x)?.amount===125.5,'linked obligation edit');
 phase='unlink debt';await btn(b,'Редактировать параметры долга').click();
 await b.locator('#linkedExpenseId').selectOption('');
 await btn(b,'Сохранить').click();
 await currentDoc(saved.ref,x=>x.exists&&x.data().linkedExpenseId===null,'debt unlink');
 await currentDoc(ref,x=>linked(x)?.linkedDebtId===null,'obligation unlink');
 phase='delete unlinked debt';await btn(b,'Удалить карточку').click();
 await b.getByRole('heading',{name:'Удалить долг?'}).waitFor({state:'visible'});
 await btn(b,'Удалить').click();await currentDoc(saved.ref,x=>!x.exists,'linked debt delete after unlink');
});
await scenario('ACCOUNT actual login and password changes preserve family identity',async()=>{
 phase='capture unchanged records';
 const beforeA=(await family.collection('members').doc('a').get()).data();
 const beforeB=(await family.collection('members').doc('b').get()).data();
 const beforeLedger=JSON.stringify((await rows.get()).docs.map(doc=>[doc.id,doc.data()]));
 await nav(b,'overview','Обзор');
 await btn(b,'Настройки').click();
 const settings=b.getByRole('dialog',{name:'Настройки',exact:true});
 await btn(settings.getByRole('navigation',{name:'Разделы настроек'}),/^Профиль и безопасность/,false).click();
 const login=settings.locator('#settings-account-login');
 assert.equal(await login.inputValue(),users[1].email);
 await login.fill('QA B');
 assert.equal(await btn(settings,'Сохранить логин').isDisabled(),true);
 const newEmail='changed-'+id+'@example.test';
 await login.fill(newEmail);
 phase='change login on Auth emulator';await btn(settings,'Сохранить логин').click();
 await currentDoc(family.collection('members').doc('b'),snap=>snap.data()?.email===newEmail,'own member email confirmed');
 assert.equal((await auth.getUser(users[1].uid)).email,newEmail);
 assert.deepEqual((await family.collection('members').doc('b').get()).data(),{...beforeB,email:newEmail});
 assert.deepEqual((await family.collection('members').doc('a').get()).data(),beforeA);
 assert.equal((await auth.getUser(users[1].uid)).displayName,users[1].displayName);
 phase='validate password mismatch';
 const nextPassword='emulator-new-password-'+id;
 const current=settings.locator('#settings-password-current'),newPass=settings.locator('#settings-password-new'),confirm=settings.locator('#settings-password-confirm');
 await current.fill(password);await newPass.fill(nextPassword);await confirm.fill('mismatch');
 assert.equal(await btn(settings,'Обновить пароль').isDisabled(),true);
 await confirm.fill(nextPassword);
 phase='save password on Auth emulator';await btn(settings,'Обновить пароль').click();
 await b.waitForFunction(()=>document.querySelector('#settings-password-new')?.value==='',null,{timeout:20000});
 const signIn=async(email,pass)=>fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass,returnSecureToken:true})});
 const verified=await signIn(newEmail,nextPassword);assert.equal(verified.ok,true,'new login and password rejected');
 assert.equal((await verified.json()).localId,users[1].uid);
 assert.equal((await signIn(newEmail,password)).ok,false,'old password still accepted');
 assert.equal((await signIn(users[0].email,password)).ok,true,'other account affected');
 assert.equal((await db.collection('users').doc(users[1].uid).get()).data().familyId,fid);
 assert.equal(JSON.stringify((await rows.get()).docs.map(doc=>[doc.id,doc.data()])),beforeLedger);
 await btn(settings,'Закрыть настройки').click();
});
console.log('FULL APPLICATION SUMMARY '+JSON.stringify({failures,scenarios:11,passed:11-failures.length}));
if(failures.length)process.exitCode=1;
}

}catch(error){
 console.error('FAIL FULL setup',error);process.exitCode=1;
}finally{
 await browser?.close();server?.kill();await deleteApp(admin);
}
