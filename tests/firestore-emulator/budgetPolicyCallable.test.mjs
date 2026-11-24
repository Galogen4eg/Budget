import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {initializeApp as initializeAdmin,deleteApp as deleteAdmin} from 'firebase-admin/app';
import {getFirestore as getAdminDb,FieldValue} from 'firebase-admin/firestore';
import {getAuth as getAdminAuth} from 'firebase-admin/auth';
import {createBudgetPolicyHandler} from '../../api/budget-policy.js';
import {initializeApp,deleteApp} from 'firebase/app';
import {initializeAuth,inMemoryPersistence,connectAuthEmulator,createUserWithEmailAndPassword} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,collection,getDocFromServer,getDocsFromServer,updateDoc,setDoc,deleteDoc,query,where,writeBatch} from 'firebase/firestore';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';

const projectId='demo-budget';
const authHost=process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost=process.env.FIRESTORE_EMULATOR_HOST;
if(!authHost||!firestoreHost||process.env.BUDGET_SET12_ENABLED!=='true')throw new Error('Only run against the isolated SET-12 emulators');
if(!/^127\.0\.0\.1:\d+$/.test(authHost)||!/^127\.0\.0\.1:\d+$/.test(firestoreHost))throw new Error('Refuse non-loopback emulator endpoints');
const [host,port]=firestoreHost.split(':');
const apps=[];
async function actor(label,endpoint){
 const app=initializeApp({apiKey:'demo-key',projectId,authDomain:'demo-budget.firebaseapp.com',appId:'demo-set12'},'set12-'+label+'-'+Date.now());
 apps.push(app);
 const auth=initializeAuth(app,{persistence:inMemoryPersistence});
 connectAuthEmulator(auth,'http://'+authHost,{disableWarnings:true});
 const {user}=await createUserWithEmailAndPassword(auth,label+'-'+Date.now()+'@example.test','emulator-only-password');
 const db=getFirestore(app);
 connectFirestoreEmulator(db,host,Number(port));
 const functions=getFunctions(app,'europe-west1');
 connectFunctionsEmulator(functions,'127.0.0.1',5001);
 const call=httpsCallable(functions,'changeHouseholdBudgetPolicy',{timeout:120000});
 return {uid:user.uid,db,token:()=>user.getIdToken(),call:async(data)=>{
   if(!endpoint)return (await call(data)).data;
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},body:JSON.stringify({...data,preview:data.preview===true})});
   const result=await response.json();
   if(!response.ok)throw Object.assign(new Error(result.error),{code:({400:'functions/invalid-argument',401:'functions/unauthenticated',403:'functions/permission-denied',409:'functions/failed-precondition'})[response.status]??'functions/internal'});
   return result;
 }};
}
const rejected=(promise,code)=>assert.rejects(promise,e=>e?.code===code);
for(const transport of ['callable','vercel'])test('SET-12 '+transport+': two authenticated accounts, forward/return migration, owner authorization, failed migration atomicity',{timeout:180000},async()=>{
 let server,admin,endpoint;
 let enabled=true;
 if(transport==='vercel'){
   admin=initializeAdmin({projectId},'policy-http-test');
   const handler=createBudgetPolicyHandler(()=>({db:getAdminDb(admin),FieldValue,verifyToken:token=>getAdminAuth(admin).verifyIdToken(token,true),enabled}));
   server=createServer(async(req,res)=>{
     let body='';for await(const chunk of req)body+=chunk;
     req.body=body;
     res.status=code=>{res.statusCode=code;return res;};
     res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
     await handler(req,res);
   });
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
   endpoint='http://127.0.0.1:'+server.address().port;
 }
 const env=await initializeTestEnvironment({projectId,firestore:{host,port:Number(port),rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')}});
 try{
   await env.clearFirestore();
   const a=await actor('owner',endpoint),b=await actor('member',endpoint),outsider=await actor('outsider',endpoint);
   const fid='set12-family',f='families/'+fid;
   const settings=f+'/config/settings',privateSettings=uid=>f+'/members/'+uid+'/config/settings';
   const initialBills=[{id:'bill-a',memberId:'a',name:'A',amount:25.15},{id:'bill-b',memberId:'b',name:'B',amount:50.25}];
   const originalShared={currency:'₽',initialBalance:300.35,savingsRate:10,mandatoryExpenses:initialBills,manualPaidExpenses:{'2026-10':['removed-bill'],'2026-11':['bill-a','bill-b']}};
   await env.withSecurityRulesDisabled(async ctx=>{
     const db=ctx.firestore();
     const rows={
       ['users/'+a.uid]:{familyId:fid},['users/'+b.uid]:{familyId:fid},['users/'+outsider.uid]:{familyId:fid},
       [f]:{ownerId:a.uid,members:[a.uid,b.uid],name:'Demo family'},
       [f+'/members/a']:{id:'a',userId:a.uid,name:'A',isAdmin:true},
       [f+'/members/b']:{id:'b',userId:b.uid,name:'B',isAdmin:false},
       [privateSettings(a.uid)]:{personalInitialBalance:100.1},
       [privateSettings(b.uid)]:{personalInitialBalance:200.25},
       [settings]:originalShared,
       [f+'/transactions/a1']:{id:'a1',memberId:'a',type:'expense',amount:10.15},
       [f+'/transactions/b1']:{id:'b1',memberId:'b',type:'expense',amount:20.25},
       [f+'/goals/g1']:{id:'g1',memberId:'a',currentAmount:25},
       [f+'/debts/d1']:{id:'d1',memberId:'b',currentBalance:100},
       [f+'/subscriptions/sub1']:{id:'sub1',name:'Music',memberId:'a',amount:199.99,nextPaymentDate:'2026-12-04'},
       [f+'/subscriptions/sub2']:{id:'sub2',name:'Video',memberId:'b',amount:299.5,nextPaymentDate:'2026-12-06'},
       [f+'/shopping/s1']:{id:'s1',title:'Shared shopping'},
       [f+'/events/e1']:{id:'e1',title:'Shared event'},
       [f+'/chat/c1']:{id:'c1',text:'Shared chat'},
     };
     const batch=writeBatch(db);
     for(const [path,data] of Object.entries(rows))batch.set(doc(db,path),data);
     await batch.commit();
   });
   const request={familyId:fid,target:'personal'};
   if(endpoint){
     const headers={'Content-Type':'application/json'};
     const body=JSON.stringify({...request,preview:true});
     assert.equal((await fetch(endpoint,{method:'POST',headers,body})).status,401);
     assert.equal((await fetch(endpoint,{method:'POST',headers:{...headers,Authorization:'Bearer invalid'},body})).status,401);
     assert.equal((await fetch(endpoint)).status,405);
     enabled=false;
     assert.equal((await a.call({...request,preview:true})).enabled,false);
     await rejected(a.call(request),'functions/failed-precondition');
     enabled=true;
   }
   await rejected(b.call({...request,preview:true}),'functions/permission-denied');
   await rejected(b.call(request),'functions/permission-denied');
   await rejected(outsider.call(request),'functions/permission-denied');
   await rejected(a.call({...request,familyId:'wrong-family'}),'functions/permission-denied');
   const preview=await a.call({...request,preview:true});
   assert.deepEqual(preview.issues,[]);
   assert.equal(preview.policy,'family');
   assert.equal(preview.enabled,true);
   assert.equal(preview.warnings.length,1);
   assert.deepEqual((await getDocFromServer(doc(a.db,settings))).data(),originalShared,'preview changed shared settings');
   assert.equal((await getDocsFromServer(collection(b.db,f+'/transactions'))).size,2);
   assert.equal((await getDocsFromServer(collection(b.db,f+'/subscriptions'))).size,2);
   assert.deepEqual(await a.call(request),{policy:'personal',enabled:true,issues:[]});
   assert.equal((await getDocFromServer(doc(b.db,f))).data().budgetPolicy,'personal');
   for(const [actor,own,foreign,bill] of [[a,'a','b','bill-a'],[b,'b','a','bill-b']]){
     assert.deepEqual((await getDocFromServer(doc(actor.db,settings))).data(),{currency:'₽'});
     const rows=await getDocsFromServer(query(collection(actor.db,f+'/transactions'),where('memberId','==',own)));
     assert.deepEqual(rows.docs.map(d=>d.id),[own+'1']);
     await assertFails(getDocsFromServer(collection(actor.db,f+'/transactions')));
     await assertFails(getDocFromServer(doc(actor.db,f+'/transactions/'+foreign+'1')));
     await assertFails(updateDoc(doc(actor.db,f+'/transactions/'+foreign+'1'),{amount:1}));
     await assertFails(getDocFromServer(doc(actor.db,privateSettings(actor.uid===a.uid?b.uid:a.uid))));
     const personal=(await getDocFromServer(doc(actor.db,privateSettings(actor.uid)))).data();
     assert.deepEqual(personal.personalMandatoryExpenses.map(x=>x.id),[bill]);
     assert.deepEqual(personal.personalManualPaidExpenses,{'2026-11':[bill]});
     for(const name of ['shopping/s1','events/e1','chat/c1'])assert.equal((await getDocFromServer(doc(actor.db,f+'/'+name))).exists(),true);
     await assertFails(updateDoc(doc(actor.db,f),{budgetPolicy:'family'}));
   }
   for(const [actor,own,ownSub,foreignSub] of [[a,'a','sub1','sub2'],[b,'b','sub2','sub1']]){
     const subs=await getDocsFromServer(query(collection(actor.db,f+'/subscriptions'),where('memberId','==',own)));
     assert.deepEqual(subs.docs.map(s=>s.id),[ownSub]);
     await assertFails(getDocFromServer(doc(actor.db,f+'/subscriptions/'+foreignSub)));
     await assertFails(updateDoc(doc(actor.db,f+'/subscriptions/'+foreignSub),{amount:1}));
   }
   await assertFails(getDocFromServer(doc(a.db,f+'/debts/d1')));
   await assertFails(getDocFromServer(doc(b.db,f+'/goals/g1')));
   await assertFails(getDocFromServer(doc(a.db,f+'/serverBudgetArchive/shared')));
   await updateDoc(doc(a.db,privateSettings(a.uid)),{personalMandatoryExpenses:[{...initialBills[0],amount:30.55}]});
   await updateDoc(doc(b.db,f+'/transactions/b1'),{amount:21.35});
   await updateDoc(doc(b.db,privateSettings(b.uid)),{personalMandatoryExpenses:[],personalManualPaidExpenses:{}});
   await rejected(b.call({familyId:fid,target:'family'}),'functions/permission-denied');
   assert.deepEqual(await a.call({familyId:fid,target:'family'}),{policy:'family',enabled:true,issues:[]});
   const merged=(await getDocFromServer(doc(b.db,settings))).data();
   assert.equal((await getDocFromServer(doc(b.db,f+'/subscriptions/sub1'))).data().amount,199.99);
   assert.equal((await getDocFromServer(doc(a.db,f+'/subscriptions/sub2'))).data().nextPaymentDate,'2026-12-06');
   assert.equal(merged.initialBalance,300.35);
   assert.deepEqual(merged.mandatoryExpenses,[{...initialBills[0],amount:30.55}]);
   assert.deepEqual(merged.manualPaidExpenses,{'2026-10':['removed-bill'],'2026-11':['bill-a']});
   assert.equal((await getDocFromServer(doc(a.db,f+'/transactions/b1'))).data().amount,21.35);
   assert.equal((await getDocsFromServer(collection(b.db,f+'/transactions'))).size,2);
   await setDoc(doc(a.db,f+'/transactions/unknown'),{amount:10,note:'Unknown owner'});
   await setDoc(doc(a.db,f+'/goals/stale'),{title:'Old goal',memberId:'removed-profile',currentAmount:12.5});
   await setDoc(doc(a.db,f+'/subscriptions/old-sub'),{name:'Legacy',amount:100,nextPaymentDate:'2026-12-10'});
   const blocked=await a.call({...request,preview:true});
   assert.equal(blocked.policy,'family');
   assert.ok(blocked.issues.length>0);
   assert.deepEqual(blocked.ownershipIssues.map(({kind,id,owner,amount})=>({kind,id,owner,amount})),[{kind:'transactions',id:'unknown',owner:null,amount:10},{kind:'goals',id:'stale',owner:'removed-profile',amount:12.5},{kind:'subscriptions',id:'old-sub',owner:null,amount:100}]);
   await rejected(b.call({...request,preview:true}),'functions/permission-denied');
   await rejected(a.call(request),'functions/failed-precondition');
   assert.equal((await getDocFromServer(doc(a.db,f))).data().budgetPolicy,'family');
   assert.deepEqual((await getDocFromServer(doc(b.db,settings))).data(),merged);
   await updateDoc(doc(a.db,f+'/transactions/unknown'),{memberId:'a'});
   await updateDoc(doc(a.db,f+'/goals/stale'),{memberId:'b'});
   await updateDoc(doc(a.db,f+'/subscriptions/old-sub'),{memberId:'a'});
   assert.equal((await getDocFromServer(doc(a.db,f+'/transactions/unknown'))).data().amount,10);
   assert.equal((await getDocFromServer(doc(b.db,f+'/goals/stale'))).data().currentAmount,12.5);
   await setDoc(doc(a.db,f+'/transactions/legacy-savings'),{id:'legacy-savings',memberId:'a',category:'savings',type:'expense',amount:12.35});
   const savingsBlocked=await a.call({...request,preview:true});
   assert.equal(savingsBlocked.savingsIssues.length,1);
   assert.equal(savingsBlocked.savingsIssues[0].id,'legacy-savings');
   assert.equal(savingsBlocked.savingsIssues[0].reason,'missing');
   assert.equal(savingsBlocked.savingsIssues[0].owner,'a');
   await rejected(a.call(request),'functions/failed-precondition');
   const oldGoal=(await getDocFromServer(doc(a.db,f+'/goals/g1'))).data();
   await updateDoc(doc(a.db,f+'/transactions/legacy-savings'),{linkedGoalId:'g1'});
   assert.deepEqual((await getDocFromServer(doc(a.db,f+'/goals/g1'))).data(),oldGoal);
   const ready=await a.call({...request,preview:true});
   assert.equal(ready.policy,'family');
   assert.equal(ready.enabled,true);
   assert.deepEqual(ready.issues,[]);
   assert.equal(ready.warnings.length,1);
 }finally{
   await Promise.all(apps.splice(0).map(deleteApp));
   if(server)await new Promise(resolve=>server.close(resolve));
   if(admin)await deleteAdmin(admin);
   await env.cleanup();
 }
});
