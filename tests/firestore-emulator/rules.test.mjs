import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,collection,getDoc,getDocs,setDoc,updateDoc,deleteDoc,query,where,writeBatch} from 'firebase/firestore';
const projectId='demo-budget';
let env;
const f='families/f';
const profile=(id)=>f+'/members/'+id;
const config=(uid)=>profile(uid)+'/config/settings';
const db=(uid,claims={})=>env.authenticatedContext(uid,claims).firestore();
before(async()=>{
 env=await initializeTestEnvironment({projectId,firestore:{rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')}});
});
after(async()=>env?.cleanup());
beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
   const admin=ctx.firestore();
   const values={
    [f]:{ownerId:'u1',members:['u1','u2'],name:'Family'},
    [profile('a')]:{id:'a',userId:'u1',name:'A',isAdmin:true},
    [profile('b')]:{id:'b',userId:'u2',name:'B',isAdmin:false},
    [config('u1')]:{personalInitialBalance:100,personalMandatoryExpenses:[]},
    [config('u2')]:{personalInitialBalance:200,personalMandatoryExpenses:[]},
    [f+'/config/settings']:{currency:'₽',initialBalance:300},
    [f+'/transactions/a1']:{memberId:'a',amount:10},
    [f+'/transactions/b1']:{memberId:'b',amount:20},
    [f+'/goals/ga']:{memberId:'a',currentAmount:10},
    [f+'/goals/gb']:{memberId:'b',currentAmount:20},
    [f+'/debts/da']:{memberId:'a',currentBalance:100},
    [f+'/debts/db']:{memberId:'b',currentBalance:200},
    [f+'/shopping/s']:{title:'Milk'},
    [f+'/events/e']:{title:'Plan'},
    [f+'/chat/c']:{text:'Shared message'},
    [f+'/serverBudgetArchive/shared']:{initialBalance:300},
   };
   for(const [path,data] of Object.entries(values))await setDoc(doc(admin,path),data);
 });
});
async function personal(){
 await env.withSecurityRulesDisabled(async ctx=>{
   const d=ctx.firestore();
   await updateDoc(doc(d,f),{budgetPolicy:'personal'});
   await setDoc(doc(d,f+'/config/settings'),{currency:'₽'});
 });
}
test('joint mode permits both members, denies outsiders and private settings remain private',async()=>{
 const a=db('u1'),b=db('u2'),out=db('outsider');
 assert.equal((await assertSucceeds(getDocs(collection(a,f+'/transactions')))).size,2);
 await assertSucceeds(getDoc(doc(b,f+'/transactions/a1')));
 await assertSucceeds(updateDoc(doc(b,f+'/transactions/a1'),{amount:11}));
 await assertFails(getDoc(doc(out,f+'/transactions/a1')));
 await assertFails(setDoc(doc(out,f+'/shopping/x'),{title:'No'}));
 await assertFails(getDoc(doc(a,config('u2'))));
 await assertSucceeds(getDoc(doc(b,config('u2'))));
 await assertFails(getDoc(doc(a,f+'/serverBudgetArchive/shared')));
});
test('personal mode permits constrained queries and denies other owner reads, updates, creates and deletes',async()=>{
 await personal();
 for(const [uid,own,foreign] of [['u1','a','b'],['u2','b','a']]){
   const d=db(uid);
   const results=await assertSucceeds(getDocs(query(collection(d,f+'/transactions'),where('memberId','==',own))));
   assert.equal(results.size,1);
   await assertFails(getDocs(collection(d,f+'/transactions')));
   await assertFails(getDoc(doc(d,f+'/transactions/'+foreign+'1')));
   await assertFails(updateDoc(doc(d,f+'/transactions/'+foreign+'1'),{amount:1}));
   await assertFails(deleteDoc(doc(d,f+'/transactions/'+foreign+'1')));
   await assertFails(setDoc(doc(d,f+'/transactions/new-foreign'),{memberId:foreign,amount:1}));
   await assertSucceeds(getDoc(doc(d,f+'/transactions/missing-'+own)));
   await assertSucceeds(setDoc(doc(d,f+'/transactions/new-'+own),{memberId:own,amount:1}));
   await assertFails(updateDoc(doc(d,f+'/transactions/new-'+own),{memberId:foreign}));
   await assertSucceeds(getDoc(doc(d,f+'/goals/g'+own)));
   await assertFails(getDoc(doc(d,f+'/goals/g'+foreign)));
   await assertFails(getDoc(doc(d,f+'/debts/d'+foreign)));
 }
});
test('personal mode keeps shared sections available and prevents client policy or identity changes',async()=>{
 await personal();
 const a=db('u1'),b=db('u2');
 for(const d of [a,b]){
   await assertSucceeds(getDoc(doc(d,f+'/shopping/s')));
   await assertSucceeds(getDoc(doc(d,f+'/events/e')));
   await assertSucceeds(getDoc(doc(d,f+'/chat/c')));
   await assertFails(updateDoc(doc(d,f),{budgetPolicy:'family'}));
   await assertFails(updateDoc(doc(d,f),{ownerId:'u2'}));
   await assertFails(updateDoc(doc(d,profile('b')),{userId:'u1'}));
   await assertFails(updateDoc(doc(d,f+'/config/settings'),{initialBalance:1}));
 }
 await assertSucceeds(updateDoc(doc(a,config('u1')),{personalInitialBalance:101}));
 await assertFails(updateDoc(doc(a,config('u2')),{personalInitialBalance:1}));
 await assertFails(updateDoc(doc(a,config('u1')),{initialBalance:300}));
 await assertSucceeds(setDoc(doc(a,profile('u1')+'/knowledge/k'),{text:'private'}));
 await assertFails(getDoc(doc(b,profile('u1')+'/knowledge/k')));
});
test('first-time registration can create family, owner profile and shared config atomically',async()=>{
 const d=db('new');
 await assertSucceeds(getDoc(doc(d,'families/new')));
 const batch=writeBatch(d);
 batch.set(doc(d,'users/new'),{familyId:'new'});
 batch.set(doc(d,'families/new'),{ownerId:'new',members:['new'],name:'New'});
 batch.set(doc(d,'families/new/members/new'),{id:'new',userId:'new',isAdmin:true});
 batch.set(doc(d,'families/new/config/settings'),{currency:'₽'});
 await assertSucceeds(batch.commit());
});
test('verified email invitation allows only its intended profile and consumes invitation atomically',async()=>{
 const owner=db('u1');
 const email='third@example.test';
 const invite=doc(owner,'invitations/'+email);
 const batch=writeBatch(owner);
 batch.set(doc(owner,profile('c')),{id:'c',name:'C',email});
 batch.set(invite,{familyId:'f',placeholderMemberId:'c',email});
 await assertSucceeds(batch.commit());
 const unauthenticatedEmail=db('u3',{email,email_verified:false});
 await assertFails(getDoc(doc(unauthenticatedEmail,'invitations/'+email)));
 const outsider=db('u4',{email:'other@example.test',email_verified:true});
 await assertFails(getDoc(doc(outsider,'invitations/'+email)));
 await assertFails(updateDoc(doc(outsider,f),{members:['u1','u2','u4']}));
 const invited=db('u3',{email,email_verified:true});
 await assertSucceeds(getDoc(doc(invited,f)));
 await assertSucceeds(getDoc(doc(invited,profile('c'))));
 await assertFails(getDoc(doc(invited,f+'/transactions/a1')));
 const join=writeBatch(invited);
 join.update(doc(invited,f),{members:['u1','u2','u3']});
 join.set(doc(invited,'users/u3'),{familyId:'f'});
 join.update(doc(invited,profile('c')),{userId:'u3',isAdmin:false});
 join.delete(doc(invited,'invitations/'+email));
 await assertSucceeds(join.commit());
 await assertSucceeds(getDoc(doc(invited,f+'/transactions/a1')));
});

test('actual shopping library config supports both family members in either budget mode, never outsiders',async()=>{
 const a=db('u1'),b=db('u2'),out=db('outsider');
 const path=f+'/config/shoppingLists';
 const data={templates:[{id:'t',name:'Weekly',items:[]}],history:[]};
 await assertSucceeds(getDoc(doc(a,path)));
 await assertSucceeds(setDoc(doc(a,path),data));
 assert.deepEqual((await assertSucceeds(getDoc(doc(b,path)))).data(),data);
 await personal();
 await assertSucceeds(updateDoc(doc(b,path),{history:[{shoppingItemId:'s',title:'Milk'}]}));
 assert.equal((await assertSucceeds(getDoc(doc(a,path)))).data().history.length,1);
 await assertFails(getDoc(doc(out,path)));
 await assertFails(setDoc(doc(out,path),data));
 await assertFails(updateDoc(doc(a,path),{initialBalance:100}));
 await assertFails(getDoc(doc(a,f+'/config/unknown')));
});

test('Alfa review inbox is private, immutable, and removable only after matching saved transaction',async()=>{
 const id='alfa_'+'a'.repeat(40),base=f+'/members/u1/alfaReview/',entry={id,row:{id,memberId:'a',type:'expense',amount:12.34,date:'2026-11-26T10:00:00Z',note:'QA',category:'other'},reason:'category',createdAt:'2026-11-26T10:00:00Z'};
 const a=db('u1'),b=db('u2'),out=db('outsider');
 await assertFails(setDoc(doc(a,base+id),{...entry,row:{...entry.row,memberId:'b'}}));
 await assertFails(setDoc(doc(b,base+id),entry));
 await assertSucceeds(setDoc(doc(a,base+id),entry));
 await assertSucceeds(getDocs(collection(a,base.slice(0,-1))));
 await assertFails(getDoc(doc(b,base+id)));
 await assertFails(getDoc(doc(out,base+id)));
 await assertFails(updateDoc(doc(a,base+id),{reason:'savings'}));
 await assertFails(deleteDoc(doc(a,base+id)));
 await assertSucceeds(setDoc(doc(b,f+'/transactions/'+id),{...entry.row,memberId:'b'}));
 await assertFails(deleteDoc(doc(a,base+id)));
 await assertSucceeds(updateDoc(doc(a,f+'/transactions/'+id),{memberId:'a'}));
 await assertSucceeds(deleteDoc(doc(a,base+id)));
 await personal();
 await assertSucceeds(setDoc(doc(a,base+id),entry));
 await assertFails(getDocs(collection(b,base.slice(0,-1))));
 await assertSucceeds(deleteDoc(doc(a,base+id)));
});
