import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
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
   (req.method()==='GET'&&['https://cdn.tailwindcss.com','https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(url.origin));
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
 let notificationFailure=false;
 try{
  const open=visible(b.getByRole('button',{name:'Уведомления',exact:true}));
  await open.click();
  const modal=b.getByRole('dialog',{name:'Уведомления',exact:true});
  await modal.getByText('Нет уведомлений',{exact:true}).waitFor({state:'visible'});
  assert.equal(await modal.getByRole('button',{name:'Прочитать все',exact:true}).isDisabled(),true);
  const unread=modal.getByRole('button',{name:'Новые 0',exact:true});
  await unread.click();
  assert.equal(await unread.getAttribute('aria-pressed'),'true');
  await modal.getByText('Нет новых уведомлений',{exact:true}).waitFor({state:'visible'});
  await modal.getByRole('button',{name:'Закрыть',exact:true}).click();
  await modal.waitFor({state:'hidden'});
  await open.click();
  await modal.getByText('Нет уведомлений',{exact:true}).waitFor({state:'visible'});
  await modal.getByRole('button',{name:'Закрыть',exact:true}).click();
  await modal.waitFor({state:'hidden'});
  console.log('PASS RC-01 authenticated empty notifications, filter and reopen');
 }catch(error){
  notificationFailure=true;
  console.error('FAIL RC-01 notifications:',String(error?.message??error).slice(0,500));
  await b.reload({waitUntil:'domcontentloaded'});
  await visible(b.getByRole('button',{name:'Бюджет',exact:true})).waitFor({state:'visible',timeout:60000});
  await visible(b.getByRole('button',{name:'Бюджет',exact:true})).click();
  await edit(b,original.note).waitFor({state:'visible',timeout:20000});
 }

 // U + R: rename a bank-imported expense from the second account. Verify
 // the actual Firestore document and the first user's subscribed UI.
 await edit(b,original.note).click();
 await nameField(b).fill('QA переименовано');
 await save(b,true);
 let stored=(await rows.doc(original.id).get()).data();
 assert.equal(stored.note,'QA переименовано');
 for(const key of ['amount','type','category','memberId','userId','date','rawNote'])assert.equal(stored[key],original[key],key);
 await edit(a,'QA переименовано').waitFor({state:'visible',timeout:20000});
 await edit(a,'QA переименовано').click();
 assert.equal(await nameField(a).inputValue(),'QA переименовано');
 await a.getByRole('button',{name:'Закрыть модальное окно'}).click();
 // C + R: create a new expense on mobile and confirm it in the other session.
 await visible(a.getByRole('button',{name:'Добавить операцию',exact:true})).click();
 await heading(a,'Новая операция').waitFor({state:'visible'});
 await a.getByRole('textbox',{name:'Сумма операции'}).fill('45.67');
 await nameField(a).fill('QA новая операция');
 await save(a,false);
 const created=await rows.where('note','==','QA новая операция').get();
 assert.equal(created.size,1,'exactly one expense must be stored');
 const createdRef=created.docs[0].ref;
 assert.equal(created.docs[0].data().amount,45.67);
 await edit(b,'QA новая операция').waitFor({state:'visible',timeout:20000});
 // Update the amount then read from Firestore; reopen via the mobile UI.
 await edit(b,'QA новая операция').click();
 await b.getByRole('textbox',{name:'Сумма операции'}).fill('56.78');
 await save(b,true);
 assert.equal((await createdRef.get()).data().amount,56.78);
 await a.waitForFunction(()=>Array.from(document.querySelectorAll('button[aria-label="Редактировать операцию: QA новая операция"]')).some(el=>el.getClientRects().length&&/56[,.]78/.test(el.textContent)),null,{timeout:20000});
 await edit(a,'QA новая операция').click();
 assert.equal(await a.getByRole('textbox',{name:'Сумма операции'}).inputValue(),'56.78');
 // D + R: delete with explicit confirmation and confirm both subscriptions.
 await a.getByRole('button',{name:'Удалить операцию',exact:true}).click();
 await a.getByRole('button',{name:'Подтвердить удаление',exact:true}).click();
 await heading(a,'Редактирование операции').waitFor({state:'hidden'});
 assert.equal((await createdRef.get()).exists,false);
 await edit(b,'QA новая операция').waitFor({state:'hidden'});
 // Persistence across reload is mandatory, not just optimistic React state.
 await b.reload({waitUntil:'domcontentloaded'});
 await visible(b.getByRole('button',{name:'Бюджет',exact:true})).waitFor({state:'visible',timeout:60000});
 await visible(b.getByRole('button',{name:'Бюджет',exact:true})).click();
 await edit(b,'QA переименовано').waitFor({state:'visible'});
 assert.equal((await rows.get()).size,1);
 console.log('PASS authenticated transaction CRUD, imported rename, real rules, two independent sessions, server reread and reload');
 if(notificationFailure)process.exitCode=1;
}catch(error){
 for(const context of browser?.contexts()??[])for(const page of context.pages()){
  console.error('CRUD failure visible UI:',(await page.locator('body').innerText().catch(()=>'' )).slice(0,2500));
 }
 throw error;
}finally{
 await browser?.close();
 server?.kill();
 await deleteApp(admin);
}
