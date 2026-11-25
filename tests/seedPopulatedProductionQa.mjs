import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeFamilyFixtures,fixtureSettings,fixtureCategories} from './fixtures/realisticFamily.mjs';

// Explicit, persistent populated QA account. Never use the empty-state QA account.
// The workflow supplies secrets only on reviewed main, not on pull requests.
const env=process.env;
const apply=process.argv.includes('--apply');
const login=env.QA_FILLED_EMAIL?.trim().toLowerCase();
const password=env.QA_FILLED_PASSWORD;
const fid=env.QA_FILLED_FAMILY_ID?.trim();
const emptyFid=env.QA_FAMILY_ID?.trim();
const check=(ok,label)=>{if(!ok)throw new Error(label);};
const safeCode=v=>typeof v==='string'&&/^[A-Z_0-9]{1,80}$/.test(v)?v:'UNKNOWN';
const prefix='qa-fixture-v1-';
let phase='configuration',token;
const scalar=(doc,k)=>doc?.fields?.[k]?.stringValue;
const membersOf=doc=>(doc?.fields?.members?.arrayValue?.values??[]).map(v=>v.stringValue);
function encode(v){
 if(v===null)return {nullValue:null};
 if(typeof v==='string')return {stringValue:v};
 if(typeof v==='boolean')return {booleanValue:v};
 if(typeof v==='number'&&Number.isFinite(v))return Number.isSafeInteger(v)?{integerValue:String(v)}:{doubleValue:v};
 if(Array.isArray(v))return {arrayValue:{values:v.map(encode)}};
 if(v&&typeof v==='object')return {mapValue:{fields:encodeFields(v)}};
 throw new Error('Invalid fixture value');
}
function encodeFields(o){return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,encode(v)]));}
function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
 return v;
}
try{
 check(login&&password&&fid&&emptyFid&&fid!==emptyFid,'Missing isolated populated QA configuration or same family as empty QA');
 const src=readFileSync(new URL('../firebase.ts',import.meta.url),'utf8');
 const config=key=>src.match(new RegExp('\\b'+key+'\\s*:\\s*"([^"]+)"'))?.[1];
 const project=config('projectId'),apiKey=config('apiKey');
 check(project==='budg-1d5e0'&&apiKey,'Unexpected Firebase project');
 const base='https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)/documents';
 const documentName=(...parts)=>'projects/'+project+'/databases/(default)/documents/'+parts.join('/');
 const url=(...parts)=>base+'/'+parts.map(encodeURIComponent).join('/');
 const request=async(path,{method='GET',body,missing=false}={})=>{
  const r=await fetch(path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});
  if(missing&&r.status===404)return null;
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('Firestore HTTP '+r.status+' '+safeCode(data.error?.status));
  return data;
 };
 phase='auth';
 const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:login.includes('@')?login:login+'@family.local',password,returnSecureToken:true}),signal:AbortSignal.timeout(30000)});
 const signed=await response.json();
 check(response.ok&&signed.idToken&&signed.localId,'QA authentication failed');
 token=signed.idToken;const uid=signed.localId;
 phase='isolation';
 const guard=async()=>{
  const [profile,family,member]=await Promise.all([request(url('users',uid)),request(url('families',fid)),request(url('families',fid,'members',uid))]);
  check(fid===uid&&scalar(profile,'familyId')===fid&&scalar(family,'ownerId')===uid&&membersOf(family).length===1&&membersOf(family)[0]===uid&&scalar(member,'userId')===uid,'QA isolation guard rejected account');
  check((scalar(family,'budgetPolicy')||'family')==='family','Expected shared family budget');
 };
 await guard();
 const marker=await request(url('families',fid,'projects',prefix+'project-1'),{missing:true});
 if(marker){
  check(scalar(marker,'id')===prefix+'project-1','Fixture marker mismatch');
  console.log('Dataset marker already exists; no writes performed. Existing fixtures are preserved.');
 }else{
  phase='preflight';
  const member=[{id:uid,userId:uid}];
  const records=makeFamilyFixtures({members:member});
  const settings=await request(url('families',fid,'config','settings'));
  // Never replace existing obligations or custom budget limits.
  const fields=settings.fields??{};
  check((fields.mandatoryExpenses?.arrayValue?.values??[]).length===0,'Existing mandatory payments; refusing to overwrite');
  check(Object.keys(fields.manualPaidExpenses?.mapValue?.fields??{}).length===0,'Existing paid markers; refusing to overwrite');
  check(Object.keys(fields.categoryBudgets?.mapValue?.fields??{}).length===0,'Existing category budgets; refusing to overwrite');
  const target=Number(fields.targetMonthlyBudget?.integerValue??fields.targetMonthlyBudget?.doubleValue??0);
  check(target===0,'Existing monthly budget; refusing to overwrite');
  check(!fields.autoSendEventsToTelegram?.booleanValue,'Disable external event delivery in the QA family');
  check(settings.updateTime,'Settings revision missing');
  const writes=[],expected=[];
  const add=(kind,r)=>{
   const name=documentName('families',fid,kind,r.id), fields=encodeFields(r);
   writes.push({update:{name,fields},currentDocument:{exists:false}});
   expected.push({name,fields});
  };
  for(const [kind,rows] of Object.entries(records))for(const r of rows){
   check(r.id.startsWith(prefix),'Unmarked synthetic record');
   add(kind,r);
  }
  // Keep existing canonical categories intact; create only missing ones.
  const categories=await request(url('families',fid,'categories')+'?pageSize=1000');
  check(!categories.nextPageToken,'Unexpected oversized category catalog');
  const existing=new Set((categories.documents??[]).map(d=>d.name.split('/').at(-1)));
  for(const category of fixtureCategories)if(!existing.has(category.id))add('categories',category);
  const patch=encodeFields(fixtureSettings(member));
  writes.push({update:{name:settings.name,fields:patch},updateMask:{fieldPaths:Object.keys(patch)},currentDocument:{updateTime:settings.updateTime}});
  check(writes.length<=500,'Too many writes for one atomic seed');
  console.log('QA seed plan '+JSON.stringify(Object.fromEntries(Object.entries(records).map(([k,v])=>[k,v.length])))+'; writes '+writes.length);
  if(!apply)console.log('DRY RUN: no writes performed');
  else{
   phase='commit';
   await guard();
   await request(base+':commit',{method:'POST',body:{writes}});
   phase='verify';
   for(let i=0;i<expected.length;i+=75){
    const chunk=expected.slice(i,i+75);
    const response=await request(base+':batchGet',{method:'POST',body:{documents:chunk.map(d=>d.name)}});
    const actual=new Map(response.filter(r=>r.found).map(r=>[r.found.name,r.found.fields]));
    for(const d of chunk)assert.deepEqual(canonical(actual.get(d.name)),canonical(d.fields),'Seeded fields differ');
   }
   const savedSettings=await request(url('families',fid,'config','settings'));
   for(const [k,v] of Object.entries(patch))assert.deepEqual(canonical(savedSettings.fields[k]),canonical(v),'Settings field differs');
   console.log('PASS atomic seed and server reread of '+expected.length+' documents plus settings');
  }
 }
}catch(e){
 const message=String(e?.message??'');
 // Never print a token, password, document path, actual data, or arbitrary server response.
 console.error('FAIL QA seed at '+phase+(message.startsWith('Firestore HTTP ')?': '+message:''));
 process.exitCode=1;
}
