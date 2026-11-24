'use strict';
const {prepareTransition,findUnownedFinancialRecords,findFinancialLinkIssues,findSavingsLinkIssues}=require('./budgetMigration.cjs');
class PolicyError extends Error { constructor(code,message){super(message);this.code=code;} }
async function changeHouseholdBudgetPolicy({db,FieldValue,uid,data,enabled=false,timing=()=>{}}){
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
   timing('transaction-start');
   // Start the transaction with one BatchGet rather than two independent initial requests.
   const [userSnap,familySnap]=await tx.getAll(db.doc(`users/${uid}`),familyRef);
   timing('membership-read');
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
   timing('financial-snapshots-read');
   const configs=Object.create(null),refs=Object.create(null);
   for(const memberUid of family.members){
     refs[memberUid]=familyRef.collection('members').doc(memberUid).collection('config').doc('settings');
   }
   const memberConfigs=await tx.getAll(...family.members.map(memberUid=>refs[memberUid]));
   family.members.forEach((memberUid,i)=>{configs[memberUid]=memberConfigs[i].data()??{};});
   timing('member-configs-read');
   let result;
   const input={family,actor:uid,target,profiles:profiles.docs.map(p=>({...p.data(),id:p.id})),configs,shared:shared.data()??{},archive:archive.data(),records:[...transactions.docs,...goals.docs,...debts.docs,...subscriptions.docs].map(p=>p.data()),links:{transactions:transactions.docs.map(p=>({...p.data(),id:p.id})),goals:goals.docs.map(p=>({...p.data(),id:p.id})),debts:debts.docs.map(p=>({...p.data(),id:p.id})),subscriptions:subscriptions.docs.map(p=>({...p.data(),id:p.id}))},unsupported:[['accounts',accounts],['meterReadings',meterReadings]].filter(([,snap])=>!snap.empty).map(([name])=>name)};
   try{result=prepareTransition(input);}
   catch(error){
     if(preview){
       const ownershipIssues=current==='family'&&target==='personal'?findUnownedFinancialRecords(input):[];
       const linkIssues=current==='family'&&target==='personal'?findFinancialLinkIssues(input.links,input.shared.mandatoryExpenses??[]):[];
       const savingsLinkIssues=current==='family'&&target==='personal'?findSavingsLinkIssues(input.links):[];
       const issues=[];
       if(ownershipIssues.length)issues.push('Записи без подтверждённого владельца: '+ownershipIssues.length+'. Назначьте владельцев ниже.');
       if(linkIssues.length)issues.push('Связанные операции разных владельцев: '+linkIssues.length+'. Проверьте список ниже.');
       if(savingsLinkIssues.length)issues.push('Проблемы со связями накоплений: '+savingsLinkIssues.length+'. Проверьте операции ниже.');
       const described=(error.message==='Financial record without linked owner'&&ownershipIssues.length)||(error.message==='Savings goal link missing or belongs to another owner'&&savingsLinkIssues.length)||(['Transaction obligation belongs to another owner','Transaction debt belongs to another owner'].includes(error.message)&&linkIssues.length);
       if(!described)issues.push(error.message);
       return {policy:current,enabled,issues,...(ownershipIssues.length?{ownershipIssues}:{}),...(linkIssues.length?{linkIssues}:{}),...(savingsLinkIssues.length?{savingsLinkIssues}:{})};
     }
     throw new PolicyError('failed-precondition','Миграция заблокирована: '+error.message);
   }
   if(preview){const warnings=[];if(result.archivedPaymentCount)warnings.push('Исторические отметки оплаты без действующих обязательств ('+result.archivedPaymentCount+') будут сохранены в закрытом архиве и восстановлены при возврате к совместному бюджету.');if(result.historicalLinkCount)warnings.push('Исторические связи с удалёнными обязательствами ('+result.historicalLinkCount+') сохранены без изменения операций.');return {policy:current,enabled,issues:[],...(warnings.length?{warnings}:{})};}
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
 // A preview needs a consistent snapshot, not write locks. Revalidate in a read-write
 // transaction when the user explicitly applies the migration.
 },preview?{readOnly:true}:{maxAttempts:3});
}

module.exports={changeHouseholdBudgetPolicy,PolicyError};
