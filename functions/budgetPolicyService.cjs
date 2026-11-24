'use strict';
const {prepareTransition,findUnownedFinancialRecords}=require('./budgetMigration.cjs');
class PolicyError extends Error { constructor(code,message){super(message);this.code=code;} }
async function changeHouseholdBudgetPolicy({db,FieldValue,uid,data,enabled=false}){
 if(!uid)throw new PolicyError('unauthenticated','Войдите в Budget');
 const target=data?.target, preview=data?.preview===true;
 if(!['family','personal'].includes(target))throw new PolicyError('invalid-argument','Неизвестный режим');
 const familyId=data?.familyId;
 if(typeof familyId!=='string'||!familyId||familyId.includes('/')||familyId.length>1500)throw new PolicyError('invalid-argument','Некорректная семья');
 const familyRef=db.doc(`families/${familyId}`);
 const sharedRef=familyRef.collection('config').doc('settings');
 const archiveRef=familyRef.collection('serverBudgetArchive').doc('shared');

 if(!preview&&!enabled)throw new PolicyError('failed-precondition','SET-12 ещё не активирован на сервере');
 return db.runTransaction(async tx=>{
   const [userSnap,familySnap]=await Promise.all([tx.get(db.doc(`users/${uid}`)),tx.get(familyRef)]);
   if(userSnap.data()?.familyId!==familyId)throw new PolicyError('permission-denied','Семья изменилась');
   const family=familySnap.data();
   if(!family||family.ownerId!==uid||!Array.isArray(family.members)||!family.members.includes(uid))throw new PolicyError('permission-denied','Только администратор');
   const current=family.budgetPolicy??'family';
   if(current===target)return {policy:current,enabled,issues:[]};
   const [profiles,shared,archive,transactions,goals,debts,accounts,subscriptions,meterReadings]=await Promise.all([
      tx.get(familyRef.collection('members')),tx.get(sharedRef),tx.get(archiveRef),
      tx.get(familyRef.collection('transactions')),tx.get(familyRef.collection('goals')),tx.get(familyRef.collection('debts')),
      tx.get(familyRef.collection('accounts').limit(1)),tx.get(familyRef.collection('subscriptions')),tx.get(familyRef.collection('meterReadings').limit(1))
   ]);
   const configs=Object.create(null),refs=Object.create(null);
   for(const memberUid of family.members){
     const ref=familyRef.collection('members').doc(memberUid).collection('config').doc('settings');
     refs[memberUid]=ref;configs[memberUid]=(await tx.get(ref)).data()??{};
   }
   let result;
   const input={family,actor:uid,target,profiles:profiles.docs.map(p=>({...p.data(),id:p.id})),configs,shared:shared.data()??{},archive:archive.data(),records:[...transactions.docs,...goals.docs,...debts.docs,...subscriptions.docs].map(p=>p.data()),links:{transactions:transactions.docs.map(p=>({...p.data(),id:p.id})),goals:goals.docs.map(p=>({...p.data(),id:p.id})),debts:debts.docs.map(p=>({...p.data(),id:p.id})),subscriptions:subscriptions.docs.map(p=>({...p.data(),id:p.id}))},unsupported:[['accounts',accounts],['meterReadings',meterReadings]].filter(([,snap])=>!snap.empty).map(([name])=>name)};
   try{result=prepareTransition(input);}
   catch(error){
     if(preview){
       const ownershipIssues=current==='family'&&target==='personal'?findUnownedFinancialRecords(input):[];
       return {policy:current,enabled,issues:[ownershipIssues.length?'Записи без подтверждённого владельца: '+ownershipIssues.length+'. Назначьте владельцев ниже.':error.message],...(ownershipIssues.length?{ownershipIssues}:{})};
     }
     throw new PolicyError('failed-precondition','Миграция заблокирована: '+error.message);
   }
   if(preview)return {policy:current,enabled,issues:[]};
   if(target==='personal'){
     tx.set(archiveRef,result.archive);
     for(const [memberUid,patch] of Object.entries(result.userPatches))tx.set(refs[memberUid],patch,{merge:true});
     tx.set(sharedRef,Object.fromEntries(result.removeShared.map(key=>[key,FieldValue.delete()])),{merge:true});
   }else{
     tx.set(sharedRef,result.sharedPatch,{merge:true});
     tx.delete(archiveRef);
   }
   tx.update(familyRef,{budgetPolicy:target});
   return {policy:target,enabled,issues:[]};
 });
}

module.exports={changeHouseholdBudgetPolicy,PolicyError};
