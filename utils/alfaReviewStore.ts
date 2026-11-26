import {collection,doc,getDocsFromServer,getDocFromServer,onSnapshot,runTransaction} from 'firebase/firestore';
import {auth,db} from '../firebase';
import type {Transaction} from '../types';
import type {AlfaReviewEntry,AlfaReviewPlanRow} from './alfaReviewPlan';

const inbox=(fid:string,uid:string)=>collection(db,'families',fid,'members',uid,'alfaReview');
const transactionRef=(fid:string,id:string)=>doc(db,'families',fid,'transactions',id);
function assertAuth(uid:string){if(!uid||auth.currentUser?.uid!==uid)throw new Error('ALFA_REVIEW_AUTH');}
function assertOwner(row:Transaction,memberId:string){if(row.memberId!==memberId)throw new Error('ALFA_REVIEW_OWNER');}
export function subscribeAlfaReview(fid:string,uid:string,receive:(rows:AlfaReviewEntry[])=>void,failed:()=>void){
 return onSnapshot(inbox(fid,uid),{includeMetadataChanges:true},snapshot=>{
  if(!snapshot.metadata.fromCache&&!snapshot.metadata.hasPendingWrites)receive(snapshot.docs.map(d=>d.data() as AlfaReviewEntry));
 },failed);
}
// Read both records before writing; an existing saved transaction always wins.
// Previously queued rows are not silently recategorized or duplicated on retries.
export async function stageAlfaReview(fid:string,uid:string,memberId:string,plan:readonly AlfaReviewPlanRow[],assertScope:()=>void=()=>{}){
 assertAuth(uid);
 const created:Transaction[]=[];
 for(const {row,reason} of plan){
  assertScope();assertAuth(uid);assertOwner(row,memberId);
  const savedRef=transactionRef(fid,row.id),pendingRef=doc(inbox(fid,uid),row.id);
  const outcome=await runTransaction(db,async tx=>{
   assertScope();assertAuth(uid);
   const [saved,pending]=await Promise.all([tx.get(savedRef),tx.get(pendingRef)]);
   if(saved.exists()){
    assertOwner(saved.data() as Transaction,memberId);
    if(pending.exists())tx.delete(pendingRef);
    return 'existing';
   }
   if(pending.exists()){
    assertOwner((pending.data() as AlfaReviewEntry).row,memberId);
    return 'queued';
   }
   if(reason){
    const entry:AlfaReviewEntry={id:row.id,row,reason,createdAt:new Date().toISOString()};
    tx.set(pendingRef,entry);return 'queued';
   }
   tx.set(savedRef,{...row,userId:uid});return 'created';
  });
  if(outcome==='created')created.push({...row,userId:uid});
 }
 return created;
}
// Reconcile only the exact bank IDs whose saved transaction is verified on the server.
// Missing stable IDs (including possible legacy duplicates) are NOT acknowledged.
export async function verifyAlfaReview(fid:string,uid:string,memberId:string,ids:readonly string[],createdIds:ReadonlySet<string>,assertScope:()=>void=()=>{}){
 assertAuth(uid);
 let created=0,existing=0,queued=0,unverified=0;
 for(let i=0;i<ids.length;i+=10){
  assertScope();assertAuth(uid);
  const pairs=await Promise.all(ids.slice(i,i+10).map(async id=>({
   id,saved:await getDocFromServer(transactionRef(fid,id)),
   pending:await getDocFromServer(doc(inbox(fid,uid),id))
  })));
  for(const {id,saved,pending} of pairs){
   if(saved.exists()){assertOwner(saved.data() as Transaction,memberId);if(createdIds.has(id))created++;else existing++;}
   else if(pending.exists()){assertOwner((pending.data() as AlfaReviewEntry).row,memberId);queued++;}
   else unverified++;
  }
 }
 return {requested:ids.length,created,existing,queued,unverified};
}
export async function removeSavedAlfaReview(fid:string,uid:string,memberId:string,ids:readonly string[]){
 for(const id of ids){
  if(!/^alfa_[a-f0-9]{40}$/.test(id))continue;
  assertAuth(uid);
  const pendingRef=doc(inbox(fid,uid),id);
  await runTransaction(db,async tx=>{
   assertAuth(uid);
   const pending=await tx.get(pendingRef);
   if(!pending.exists())return;
   const saved=await tx.get(transactionRef(fid,id));
   assertOwner((pending.data() as AlfaReviewEntry).row,memberId);
   if(saved.exists()){assertOwner(saved.data() as Transaction,memberId);tx.delete(pendingRef);}
  });
 }
}
export async function readAlfaReviewCount(fid:string,uid:string){
 assertAuth(uid);
 const snapshot=await getDocsFromServer(inbox(fid,uid));
 return snapshot.size;
}
