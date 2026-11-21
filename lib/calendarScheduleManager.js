import {Schedules} from '@vercel/schedules';
import {redis} from './redis.js';
import scheduleEngine from './calendarScheduleEngine.cjs';
const {nextReminder,slotKey,definition}=scheduleEngine;
const slotsKey=uid=>`budget:calendar:telegram:schedule-slots:v1:${uid}`;
export async function syncOneUser(uid,timezone,snapshot,now=Date.now()){
 const target=nextReminder(snapshot,uid,timezone,now);
 const desired=new Map(target.map(item=>[slotKey(item),item]));
 const previous=await redis.get(slotsKey(uid))||{};
 const updated={};
 for(const [slot,old] of Object.entries(previous)){
  if(desired.has(slot))continue;
  try{await Schedules.delete({name:old.name,namespace:uid});}
  catch(error){if(!isMissing(error))throw error;}
 }
 for(const [slot,reminder] of desired){
  const def=definition(uid,reminder);
  const old=previous[slot];
  if(old?.when===reminder.when){updated[slot]=old;continue;}
  if(old){
   try{await Schedules.delete({name:old.name,namespace:uid});}
   catch(error){if(!isMissing(error))throw error;}
  }
  await Schedules.create({...def,namespace:uid});
  updated[slot]={name:def.name,when:reminder.when,reminder};
 }
 await redis.set(slotsKey(uid),updated);
 return {count:Object.keys(updated).length};
}
export async function disableOneUser(uid){
 const old=await redis.get(slotsKey(uid))||{};
 for(const slot of Object.values(old)){
  try{await Schedules.delete({name:slot.name,namespace:uid});}
  catch(error){if(!isMissing(error))throw error;}
 }
 await redis.del(slotsKey(uid));
}
export async function getSlot(uid,slot){
 const all=await redis.get(slotsKey(uid))||{};
 return all[slot]||null;
}
export function isMissing(error){
 return error?.code==='schedule_not_found'||error?.status===404||error?.statusCode===404;
}
