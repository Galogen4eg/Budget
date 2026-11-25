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
const marker='QA CRUD '+randomUUID();
const original=marker+' расход',renamed=marker+' проверено',mobileName=marker+' мобильный';
const titles=[original,renamed,mobileName];
let token,uid,browser,page,recordId,stage='preflight',failure,writeAttempted=false;
let saveError='unknown';
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
async function queryMarker(){
 const response=await request(path('families',familyId)+':runQuery',{method:'POST',body:{structuredQuery:{from:[{collectionId:'transactions'}],where:{fieldFilter:{field:{fieldPath:'rawNote'},op:'EQUAL',value:{stringValue:marker}}}}}});
 check(Array.isArray(response),'Invalid query response');
 return response.flatMap(x=>x.document?[x.document]:[]);
}
function own(doc){
 const f=doc?.fields??{};
 return scalar(doc,'rawNote')===marker&&titles.includes(scalar(doc,'note'))&&
  scalar(doc,'userId')===uid&&scalar(doc,'memberId')===uid&&scalar(doc,'type')==='expense'&&
  scalar(doc,'category')==='food'&&[123.45,234.56].includes(number(doc,'amount'))&&
  !f.linkedGoalId?.stringValue&&!f.linkedExpenseId?.stringValue&&!f.linkedDebtId?.stringValue&&!f.externalSavingsConfirmed?.booleanValue;
}
async function verify(title,amount){
 const docs=await queryMarker();
 check(docs.length===1,'Expected exactly one marked server transaction; got '+docs.length);
 const doc=docs[0];
 check(own(doc),'Marked record failed ownership/financial safety check');
 check(scalar(doc,'note')===title,'Server title did not match');
 check(Math.round(number(doc,'amount')*100)===Math.round(amount*100),'Server amount did not match in kopecks');
 const id=doc.name.split('/').at(-1);
 check(doc.name==='projects/'+project+'/databases/(default)/documents/families/'+familyId+'/transactions/'+id,'Unexpected document path');
 if(recordId)check(id===recordId,'Update created a different record');
 recordId=id;
 return doc;
}
const visible=locator=>locator.filter({visible:true}).first();
const heading=name=>page.getByRole('heading',{name,exact:true});
const edit=title=>visible(page.getByRole('button',{name:'Редактировать операцию: '+title,exact:true}));
const titleField=()=>page.getByText('Название в истории',{exact:true}).locator('..').locator('input[type=text]');
const amountField=()=>page.getByRole('textbox',{name:'Сумма операции'});
async function budget(){
 await visible(page.locator('nav').getByRole('button',{name:'Бюджет',exact:true})).click({timeout:45000});
 await page.locator('[data-tab-panel="budget"]').waitFor({state:'visible',timeout:30000});
 await visible(page.getByRole('button',{name:'Добавить операцию',exact:true})).waitFor({state:'visible',timeout:30000});
}
async function save(editing){
 await guard();
 saveError='unknown';
 writeAttempted=true;
 const name=editing?'Редактирование операции':'Новая операция';
 const form=heading(name).locator('../..');
 await form.getByRole('button',{name:editing?'Сохранить изменения':'Добавить операцию',exact:true}).click();
 try{await heading(name).waitFor({state:'hidden',timeout:25000});}
 catch{throw new Error('Editor did not close after save; Firebase error: '+saveError);}
}
async function cleanup(){
 if(!writeAttempted||!token)return;
 await guard();
 const docs=await queryMarker();
 if(!docs.length){console.log('PASS no marked QA records remain');return;}
 check(docs.length===1&&own(docs[0]),'Cleanup refused unexpected record(s)');
 const doc=docs[0],id=doc.name.split('/').at(-1);
 check(!recordId||id===recordId,'Cleanup refused mismatched ID');
 check(doc.name==='projects/'+project+'/databases/(default)/documents/families/'+familyId+'/transactions/'+id,'Cleanup refused unexpected path');
 check(doc.updateTime,'Cleanup refused missing revision');
 // Emergency cleanup after a failed UI step only; conditional delete prevents
 // removing anything that has changed since we verified its exact marker.
 await request(path('families',familyId,'transactions',id)+'?currentDocument.updateTime='+encodeURIComponent(doc.updateTime),{method:'DELETE'});
 check((await queryMarker()).length===0,'Cleanup could not confirm deletion');
 console.log('PASS emergency cleanup of this run’s marked QA transaction');
}
try{
 const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true}),signal:AbortSignal.timeout(25000)});
 const auth=await response.json();
 check(response.ok&&auth.idToken&&auth.localId,'Production auth failed: '+safeCode(auth.error?.message));
 token=auth.idToken;uid=auth.localId;
 await guard();
 check((await queryMarker()).length===0,'Run marker unexpectedly exists');
 console.log('PASS read-only QA account/family guard');
 stage='browser login';
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block',timezoneId:'UTC'});
 page.setDefaultTimeout(20000);
 page.on('console',message=>{
  const text=message.text();
  if(/Save transaction error|Delete transaction error/.test(text)){
   const match=text.match(/permission-denied|failed-precondition|unavailable|aborted|invalid-argument|not-found|deadline-exceeded|unauthenticated|PERMISSION_DENIED|FAILED_PRECONDITION/i);
   saveError=match?.[0]??'unclassified';
   console.log('Observed transaction error code: '+saveError);
  }
 });
 // Disable unrelated external integrations and third-party writes.
 await page.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  const app=url.origin===origin&&!url.pathname.startsWith('/api/');
  const firebase=['identitytoolkit.googleapis.com','securetoken.googleapis.com','firestore.googleapis.com','budg-1d5e0.firebaseapp.com'].includes(url.hostname)&&url.protocol==='https:';
  const staticAsset=req.method()==='GET'&&['cdn.tailwindcss.com','fonts.googleapis.com','fonts.gstatic.com','www.gstatic.com'].includes(url.hostname);
  return app||firebase||staticAsset?route.continue():route.abort();
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.getByPlaceholder('например: alexander или family1').fill(email);
 await page.locator('input[type=password]').fill(password);
 const signed=page.waitForResponse(r=>r.url().startsWith('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword')&&r.request().method()==='POST',{timeout:30000});
 await page.getByRole('button',{name:'Войти',exact:true}).click();
 const browserAuth=await signed;
 const identity=await browserAuth.json();
 check(browserAuth.ok()&&identity.localId===uid,'Browser auth not the guarded QA account');
 await budget();
 // Production readiness signal confirms family/transaction/category/settings data.
 await page.waitForFunction(()=>window.__budgetAlfaSyncProtocol===2,null,{timeout:45000});
 console.log('PASS actual production login and budget panel at 1440px');
 stage='create expense';
 await visible(page.getByRole('button',{name:'Добавить операцию',exact:true})).click();
 await heading('Новая операция').waitFor({state:'visible'});
 await titleField().fill(original);
 await page.getByPlaceholder('Добавить заметку семьи (чек, комментарий...)').fill(marker);
 await amountField().fill('0');
 const form=heading('Новая операция').locator('../..');
 await form.getByRole('button',{name:'Добавить операцию',exact:true}).click();
 await page.getByText('Введите положительную сумму с точностью до копейки или корректное выражение.',{exact:true}).waitFor({state:'visible'});
 check((await queryMarker()).length===0,'Invalid zero amount created a document');
 console.log('PASS invalid zero amount rejected without database write');
 await amountField().fill('123.45');
 await save(false);
 const created=await verify(original,123.45);
 console.log('PASS create expense via production UI and server reread (12345 kopecks)');
 stage='rename expense';
 await edit(original).click();
 check(await titleField().inputValue()===original,'Wrong edit form title');
 await titleField().fill(renamed);
 await save(true);
 const changed=await verify(renamed,123.45);
 for(const key of ['date','category','memberId','userId','type','rawNote'])check(scalar(changed,key)===scalar(created,key),'Rename changed '+key);
 console.log('PASS rename via production UI; same ID, amount, date, category, owner and bank note');
 stage='mobile reload';
 await page.setViewportSize({width:390,height:844});
 await page.reload({waitUntil:'domcontentloaded'});
 await budget();
 await page.waitForFunction(()=>window.__budgetAlfaSyncProtocol===2,null,{timeout:45000});
 await edit(renamed).click();
 check(await titleField().inputValue()===renamed,'Reloaded title mismatch');
 check(Number(await amountField().inputValue())===123.45,'Reloaded amount mismatch');
 console.log('PASS saved operation reopened after reload at 390px');
 stage='mobile edit amount';
 await titleField().fill(mobileName);
 await amountField().fill('234.56');
 await save(true);
 await verify(mobileName,234.56);
 console.log('PASS mobile edit and exact server amount (23456 kopecks)');
 stage='delete expense';
 await edit(mobileName).click();
 check(await titleField().inputValue()===mobileName,'Wrong delete target title');
 await guard();
 await verify(mobileName,234.56);
 await page.getByRole('button',{name:'Удалить операцию',exact:true}).click();
 await page.getByRole('button',{name:'Подтвердить удаление',exact:true}).click();
 await heading('Редактирование операции').waitFor({state:'hidden',timeout:25000});
 check((await queryMarker()).length===0,'Deleted record remains in server query');
 check(await request(path('families',familyId,'transactions',recordId),{allowMissing:true})===null,'Deleted document still exists');
 await edit(mobileName).waitFor({state:'hidden',timeout:15000});
 console.log('PASS confirmed UI deletion and absence of server document');
 console.log('PASS production transaction CRUD at 1440px and 390px');
}catch(error){
 // Never log arbitrary browser output, credentials, tokens, IDs or private data.
 failure=true;
 const reason=String(error?.message??'');
 console.error('FAIL stage: '+stage+'; '+(/^(QA |Invalid |Unexpected |Missing |Production auth failed: |Firestore HTTP |Expected exactly |Marked record |Server |Update created |Editor did not |Browser auth |Run marker |Invalid zero |Wrong |Rename changed |Reloaded |Deleted )/.test(reason)?reason.split('\n')[0].slice(0,200):'browser or network action failed'));
 if(saveError!=='unknown')console.error('Firebase error: '+saveError);
}finally{
 await browser?.close();
 try{await cleanup();}
 catch{failure=true;console.error('FAIL cleanup: marked QA record may remain; do not delete unrelated records');}
 if(failure)process.exitCode=1;
}
