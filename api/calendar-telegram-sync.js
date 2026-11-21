import {redis} from '../lib/redis.js';
import {verifyFirebaseToken,verifyFamilyMembership,validateCalendarSnapshot,encryptSecret,
  SUBSCRIBERS,userKey,familyKey} from '../lib/calendarTelegramBackend.js';
import {syncOneUser,disableOneUser} from '../lib/calendarScheduleManager.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(!['POST','DELETE','GET'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  try{
    const authorization=req.headers.authorization||'';
    if(!authorization.startsWith('Bearer '))return res.status(401).json({error:'Sign in to Budget'});
    const identity=await verifyFirebaseToken(authorization.slice(7));
    const key=userKey(identity.uid);
    if(req.method==='GET'){
      const subscription=await redis.get(key);
      return res.status(200).json({enabled:!!subscription,chatId:subscription?.chatId||null});
    }
    if(req.method==='DELETE'){
      await disableOneUser(identity.uid);
      await redis.del(key);
      await redis.srem(SUBSCRIBERS,identity.uid);
      return res.status(200).json({enabled:false});
    }
    const raw=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!raw||JSON.stringify(raw).length>450000)return res.status(413).json({error:'Calendar snapshot too large'});
    const snapshot=validateCalendarSnapshot(raw);
    await verifyFamilyMembership(identity,raw.familyId);
    const token=raw.botToken.trim().replace(/^bot/i,'');
    const chatId=raw.chatId.trim();
    await redis.set(familyKey(raw.familyId),{
      events:snapshot.events,members:snapshot.members,payments:snapshot.payments,
      paid:snapshot.paid,updatedAt:Date.now()
    });
    const subscription={familyId:raw.familyId,uid:identity.uid,chatId,timeZone:raw.timeZone,
      encryptedToken:encryptSecret(token),updatedAt:Date.now()};
    await redis.set(key,subscription);
    await redis.sadd(SUBSCRIBERS,identity.uid);
    // Both family members must receive new/edited events even if one has
    // closed their app. The shared snapshot is refreshed by either user.
    const subscribedUids=await redis.smembers(SUBSCRIBERS);
    let scheduled=0;
    for(const uid of subscribedUids){
      const person=uid===identity.uid?subscription:await redis.get(userKey(uid));
      if(person?.familyId!==raw.familyId)continue;
      const outcome=await syncOneUser(uid,person.timeZone,snapshot);
      scheduled+=outcome.count;
    }
    return res.status(200).json({enabled:true,scheduled});
  }catch(error){
    console.warn('Calendar Telegram registration failed:',error.message);
    return res.status(401).json({error:'Не удалось подтвердить аккаунт или сохранить расписание'});
  }
}
