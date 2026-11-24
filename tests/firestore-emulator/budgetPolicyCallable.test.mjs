import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
async function actor(label){
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
 return {uid:user.uid,db,call:async(data)=>(await call(data)).data};
}
const rejected=(promise,code)=>assert.rejects(promise,e=>e?.code===code);
test('SET-12 callable: two authenticated accounts, forward/return migration, owner authorization, failed migration atomicity',{timeout:180000},async()=>{
 const env=await initializeTestEnvironment({projectId,firestore:{host,port:Number(port),rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')}});
 try{
   await env.clearFirestore();
   const a=await actor('owner'),b=await actor('member'),outsider=await actor('outsider');
   const fid='set12-family',f='families/'+fid;
   const settings=f+'/config/settings',privateSettings=uid=>f+'/members/'+uid+'/config/settings';
   const initialBills=[{id:'bill-a',memberId:'a',name:'A',amount:25.15},{id:'bill-b',memberId:'b',name:'B',amount:50.25}];
   const originalShared={currency:'₽',initialBalance:300.35,savingsRate:10,mandatoryExpenses:initialBills,manualPaidExpenses:{'2026-11':['bill-a','bill-b']}};
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
       [f+'/shopping/s1']:{id:'s1',title:'Shared shopping'},
       [f+'/events/e1']:{id:'e1',title:'Shared event'},
       [f+'/chat/c1']:{id:'c1',text:'Shared chat'},
     };
     const batch=writeBatch(db);
     for(const [path,data] of Object.entries(rows))batch.set(doc(db,path),data);
     await batch.commit();
   });
   const request={familyId:fid,target:'personal'};
   await rejected(b.call({...request,preview:true}),'functions/permission-denied');
   await rejected(b.call(request),'functions/permission-denied');
   await rejected(outsider.call(request),'functions/permission-denied');
   await rejected(a.call({...request,familyId:'wrong-family'}),'functions/permission-denied');
   const preview=await a.call({...request,preview:true});
   assert.deepEqual(preview,{policy:'family',enabled:true,issues:[]});
   assert.deepEqual((await getDocFromServer(doc(a.db,settings))).data(),originalShared,'preview changed shared settings');
   assert.equal((await getDocsFromServer(collection(b.db,f+'/transactions'))).size,2);
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
   await assertFails(getDocFromServer(doc(a.db,f+'/debts/d1')));
   await assertFails(getDocFromServer(doc(b.db,f+'/goals/g1')));
   await assertFails(getDocFromServer(doc(a.db,f+'/serverBudgetArchive/shared')));
   await updateDoc(doc(a.db,privateSettings(a.uid)),{personalMandatoryExpenses:[{...initialBills[0],amount:30.55}]});
   await updateDoc(doc(b.db,f+'/transactions/b1'),{amount:21.35});
   await updateDoc(doc(b.db,privateSettings(b.uid)),{personalMandatoryExpenses:[],personalManualPaidExpenses:{}});
   await rejected(b.call({familyId:fid,target:'family'}),'functions/permission-denied');
   assert.deepEqual(await a.call({familyId:fid,target:'family'}),{policy:'family',enabled:true,issues:[]});
   const merged=(await getDocFromServer(doc(b.db,settings))).data();
   assert.equal(merged.initialBalance,300.35);
   assert.deepEqual(merged.mandatoryExpenses,[{...initialBills[0],amount:30.55}]);
   assert.deepEqual(merged.manualPaidExpenses,{'2026-11':['bill-a']});
   assert.equal((await getDocFromServer(doc(a.db,f+'/transactions/b1'))).data().amount,21.35);
   assert.equal((await getDocsFromServer(collection(b.db,f+'/transactions'))).size,2);
   await setDoc(doc(a.db,f+'/transactions/unknown'),{amount:10});
   const blocked=await a.call({...request,preview:true});
   assert.equal(blocked.policy,'family');
   assert.ok(blocked.issues.length>0);
   await rejected(a.call(request),'functions/failed-precondition');
   assert.equal((await getDocFromServer(doc(a.db,f))).data().budgetPolicy,'family');
   assert.deepEqual((await getDocFromServer(doc(b.db,settings))).data(),merged);
   await deleteDoc(doc(a.db,f+'/transactions/unknown'));
   assert.deepEqual(await a.call({...request,preview:true}),{policy:'family',enabled:true,issues:[]});
 }finally{
   await Promise.all(apps.map(deleteApp));
   await env.cleanup();
 }
});
