'use strict';
const crypto=require('node:crypto');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {getMessaging}=require('firebase-admin/messaging');
const {dueForDevice}=require('./reminderEngine.cjs');
const {prepareTransition}=require('./budgetMigration.cjs');

initializeApp();
const region='europe-west1';
const hash=(value)=>crypto.createHash('sha256').update(value).digest('hex');

function assertTimezone(timezone){
  if(typeof timezone!=='string'||timezone.length>80)throw new HttpsError('invalid-argument','Некорректный часовой пояс');
  try{new Intl.DateTimeFormat('en',{timeZone:timezone});}
  catch{throw new HttpsError('invalid-argument','Неизвестный часовой пояс');}
}
function assertToken(token){
  if(typeof token!=='string'||token.length<20||token.length>4096||!/^[-A-Za-z0-9_:.]+$/.test(token))
    throw new HttpsError('invalid-argument','Некорректный push-токен');
}
async function requireFamily(uid) {
  const db=getFirestore();
  const user=await db.doc(`users/${uid}`).get();
  const familyId=user.data()?.familyId;
  if(typeof familyId!=='string'||!familyId)throw new HttpsError('failed-precondition','Нет семейного пространства');
  const family=await db.doc(`families/${familyId}`).get();
  if(!family.exists||!Array.isArray(family.data()?.members)||!family.data().members.includes(uid))
    throw new HttpsError('permission-denied','Нет доступа к семейному пространству');
  return familyId;
}

exports.registerCalendarPush=onCall({region},async(request)=>{
  const uid=request.auth?.uid;
  if(!uid)throw new HttpsError('unauthenticated','Необходимо войти в Budget');
  const token=request.data?.token, timezone=request.data?.timezone;
  assertToken(token);assertTimezone(timezone);
  const familyId=await requireFamily(uid);
  const deviceId=hash(token);
  await getFirestore().doc(`calendarPushDevices/${deviceId}`).set({
    uid,familyId,timezone,token,enabled:true,updatedAt:FieldValue.serverTimestamp()
  });
  return {enabled:true};
});
exports.unregisterCalendarPush=onCall({region},async(request)=>{
  const uid=request.auth?.uid;
  if(!uid)throw new HttpsError('unauthenticated','Необходимо войти в Budget');
  const token=request.data?.token;
  assertToken(token);
  const reference=getFirestore().doc(`calendarPushDevices/${hash(token)}`);
  const device=await reference.get();
  if(device.exists && device.data()?.uid===uid)await reference.delete();
  return {enabled:false};
});

exports.sendCalendarReminders=onSchedule({
  schedule:'every 1 minutes',timeZone:'Etc/UTC',region,
  timeoutSeconds:120,memory:'256MiB',maxInstances:1
},async()=>{
  const db=getFirestore();
  const devices=await db.collection('calendarPushDevices').where('enabled','==',true).get();
  const familyCache=new Map();
  const userCache=new Map();
  for(const deviceSnap of devices.docs){
    const device=deviceSnap.data();
    if(!device.uid||!device.familyId||!device.token||!device.timezone)continue;
    try{assertTimezone(device.timezone);}catch{continue;}
    try{
      if(!userCache.has(device.uid))userCache.set(device.uid,await db.doc(`users/${device.uid}`).get());
      if(userCache.get(device.uid).data()?.familyId!==device.familyId)continue;
      if(!familyCache.has(device.familyId)){
        const familyRef=db.doc(`families/${device.familyId}`);
        const [family,events,members,settings]=await Promise.all([
          familyRef.get(),familyRef.collection('events').get(),
          familyRef.collection('members').get(),familyRef.collection('config').doc('settings').get()
        ]);
        familyCache.set(device.familyId,{
          policy:family.data()?.budgetPolicy??'family',
          members:family.data()?.members||[],
          events:events.docs.map(doc=>({id:doc.id,...doc.data()})),
          profiles:members.docs.map(doc=>({id:doc.id,...doc.data()})),
          payments:settings.data()?.mandatoryExpenses||[],
          paid:settings.data()?.manualPaidExpenses||{}
        });
      }
      const info=familyCache.get(device.familyId);
      if(!info.members.includes(device.uid))continue;
      const profiles=new Set(info.profiles.filter(p=>p.userId===device.uid).map(p=>p.id));
      let payments=info.payments,paid=info.paid;
      if(info.policy==='personal'){
        const own=await db.doc(`families/${device.familyId}/members/${device.uid}/config/settings`).get();
        payments=profiles.size===1?(own.data()?.personalMandatoryExpenses||[]).filter(p=>profiles.has(p.memberId)):[];
        paid=own.data()?.personalManualPaidExpenses||{};
      }
      const due=dueForDevice(info.events,payments,paid,device,profiles);
      for(const item of due){
        const claimId=hash([deviceSnap.id,item.id,item.date,item.lead,item.triggerMinute].join('|'));
        const claim=db.doc(`families/${device.familyId}/pushDelivery/${claimId}`);
        try{
          await claim.create({uid:device.uid,createdAt:FieldValue.serverTimestamp()});
        }catch(error){
          if(error.code===6||error.code==='already-exists')continue;
          throw error;
        }
        try{
          await getMessaging().send({
            token:device.token,
            data:{
              title:'Budget: напоминание',
              body:item.title.slice(0,180),
              tag:claimId,
              url:'/'
            },
            webpush:{headers:{TTL:'180'}}
          });
        }catch(error){
          if(['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(error.code)){
            await deviceSnap.ref.delete();
          }else{
            // The claim can be retried in the following scheduler invocation.
            await claim.delete();
          }
          console.error('Calendar push delivery failed',error.code||error.message);
        }
      }
    }catch(error){
      console.error('Calendar reminder scheduler failed for device',deviceSnap.id,error.code||error.message);
    }
  }
});


// SET-12: trusted migration; preview and actual commit use the same checks.
// Deployment must explicitly opt in after the rules/emulator release gate.
exports.changeHouseholdBudgetPolicy=onCall({region,timeoutSeconds:120},async(request)=>{
 const uid=request.auth?.uid;
 if(!uid)throw new HttpsError('unauthenticated','Войдите в Budget');
 const target=request.data?.target, preview=request.data?.preview===true;
 if(!['family','personal'].includes(target))throw new HttpsError('invalid-argument','Неизвестный режим');
 const familyId=await requireFamily(uid);
 if(request.data?.familyId!==familyId)throw new HttpsError('permission-denied','Семья изменилась');
 const db=getFirestore(), familyRef=db.doc(`families/${familyId}`);
 const sharedRef=familyRef.collection('config').doc('settings');
 const archiveRef=familyRef.collection('serverBudgetArchive').doc('shared');
 const enabled=process.env.BUDGET_SET12_ENABLED==='true';
 if(!preview&&!enabled)throw new HttpsError('failed-precondition','SET-12 ещё не активирован на сервере');
 return db.runTransaction(async tx=>{
   const familySnap=await tx.get(familyRef), family=familySnap.data();
   if(!family||family.ownerId!==uid||!Array.isArray(family.members)||!family.members.includes(uid))throw new HttpsError('permission-denied','Только администратор');
   const current=family.budgetPolicy??'family';
   if(current===target)return {policy:current,enabled,issues:[]};
   const [profiles,shared,archive,transactions,goals,debts,accounts,subscriptions,meterReadings]=await Promise.all([
      tx.get(familyRef.collection('members')),tx.get(sharedRef),tx.get(archiveRef),
      tx.get(familyRef.collection('transactions')),tx.get(familyRef.collection('goals')),tx.get(familyRef.collection('debts')),
      tx.get(familyRef.collection('accounts').limit(1)),tx.get(familyRef.collection('subscriptions').limit(1)),tx.get(familyRef.collection('meterReadings').limit(1))
   ]);
   const configs=Object.create(null),refs=Object.create(null);
   for(const memberUid of family.members){
     const ref=familyRef.collection('members').doc(memberUid).collection('config').doc('settings');
     refs[memberUid]=ref;configs[memberUid]=(await tx.get(ref)).data()??{};
   }
   let result;
   try{
     result=prepareTransition({family,actor:uid,target,profiles:profiles.docs.map(p=>({...p.data(),id:p.id})),configs,shared:shared.data()??{},archive:archive.data(),records:[...transactions.docs,...goals.docs,...debts.docs].map(p=>p.data()),unsupported:[['accounts',accounts],['subscriptions',subscriptions],['meterReadings',meterReadings]].filter(([,snap])=>!snap.empty).map(([name])=>name)});
   }catch(error){
     if(preview)return {policy:current,enabled,issues:[error.message]};
     throw new HttpsError('failed-precondition','Миграция заблокирована: '+error.message);
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
});
