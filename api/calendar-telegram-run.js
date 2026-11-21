import {handleSchedule} from '@vercel/schedules';
import {redis} from '../lib/redis.js';
import {decryptSecret,SUBSCRIBERS,userKey,familyKey,deliveryKey} from '../lib/calendarTelegramBackend.js';
import reminderEngine from '../functions/reminderEngine.cjs';

const {dueForDevice}=reminderEngine;
async function sendTelegram(botToken,chatId,text){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:chatId,text}),signal:controller.signal
    });
    const result=await response.json();
    if(!response.ok||!result.ok)throw new Error('Telegram refused a calendar reminder');
  }finally{clearTimeout(timeout);}
}
const formatText=item=>{
  const when=item.lead===0?'Сейчас':`За ${item.lead} мин до начала`;
  return `🔔 Budget: ${item.title}\n📅 ${item.date}\n⏰ ${when}`;
};

export const POST=handleSchedule(async()=>{
  const users=await redis.smembers(SUBSCRIBERS);
  let attempted=0,delivered=0;
  const families=new Map();
  const now=Date.now();
  for(const uid of users){
    try{
      const subscription=await redis.get(userKey(uid));
      if(!subscription){await redis.srem(SUBSCRIBERS,uid);continue;}
      if(!families.has(subscription.familyId)){
        families.set(subscription.familyId,await redis.get(familyKey(subscription.familyId)));
      }
      const family=families.get(subscription.familyId);
      if(!family)continue;
      const profileIds=new Set(family.members.filter(p=>p.userId===uid).map(p=>p.id));
      const reminders=dueForDevice(
        family.events,family.payments,family.paid,
        {uid,timeZone:subscription.timeZone,timezone:subscription.timeZone},
        profileIds,now,20
      );
      const botToken=decryptSecret(subscription.encryptedToken);
      for(const reminder of reminders){
        const marker=deliveryKey(botToken,subscription.chatId,reminder);
        const claimed=await redis.set(marker,'claimed',{nx:true,ex:86400});
        if(claimed===null)continue;
        attempted++;
        try{
          await sendTelegram(botToken,subscription.chatId,formatText(reminder));
          delivered++;
        }catch(error){
          await redis.del(marker);
          console.warn('Calendar Telegram send failed:',error.message);
        }
      }
    }catch(error){
      console.warn('Calendar Telegram schedule failed for a subscriber:',error.message);
    }
  }
  console.info('Calendar Telegram scheduled check',{subscribers:users.length,attempted,delivered});
});
