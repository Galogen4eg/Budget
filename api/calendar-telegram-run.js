import {QueueClient} from '@vercel/queue';
import {redis} from '../lib/redis.js';
import {decryptSecret,userKey,familyKey,deliveryKey} from '../lib/calendarTelegramBackend.js';
import {getSlot,syncOneUser} from '../lib/calendarScheduleManager.js';

async function sendTelegram(botToken,chatId,text){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`,{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({chat_id:chatId,text}),signal:controller.signal
  });
  const result=await response.json();
  if(!response.ok||!result.ok)throw new Error('Telegram refused a calendar reminder');
 }finally{clearTimeout(timer);}
}

const queue=new QueueClient({region:process.env.VERCEL_REGION||'iad1'});
export default queue.handleNodeCallback(async(message)=>{
 const {uid,slot,when}=message.payload||{};
 if(typeof uid!=='string'||typeof slot!=='string'||!Number.isFinite(when))return;
 const [subscription,record]=await Promise.all([
  redis.get(userKey(uid)),getSlot(uid,slot)
 ]);
 // Edited/removed event, disabled account, or stale queue message: do nothing.
 if(!subscription||!record||record.when!==when)return;
 const snapshot=await redis.get(familyKey(subscription.familyId));
 if(!snapshot)return;
 const reminder=record.reminder;
 const token=decryptSecret(subscription.encryptedToken);
 const marker=deliveryKey(token,subscription.chatId,{...reminder,triggerMinute:when});
 const claimed=await redis.set(marker,'claimed',{nx:true,ex:86400});
 if(claimed!==null){
  try{
   await sendTelegram(token,subscription.chatId,
    `🔔 Budget: ${reminder.title}\n📅 ${reminder.date}\n⏰ ${reminder.lead===0?'Сейчас':`За ${reminder.lead} мин до события`}`);
  }catch(error){
   await redis.del(marker);
   throw error; // Queue retries with its at-least-once semantics
  }
 }
 // Schedules has completed this one-time run. Generate the next occurrence,
 // only for a still enabled subscription and current calendar snapshot.
 await syncOneUser(uid,subscription.timeZone,snapshot,Math.max(Date.now(),when)+60000);
},{retry:(error,metadata)=>{
 if(metadata.deliveryCount>5)return {acknowledge:true};
 return {afterSeconds:Math.min(600,30*metadata.deliveryCount)};
}});
