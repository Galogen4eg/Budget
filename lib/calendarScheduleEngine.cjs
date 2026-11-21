'use strict';
const crypto=require('node:crypto');
const {isOccurrence}=require('../functions/reminderEngine.cjs');
const DAY=86400000, MINUTE=60000;
function dateOf(ms){return new Date(ms).toISOString().slice(0,10);}
function localFields(ms,timezone){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
  timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function toUTC(date,time,timezone){
 const target=`${date}T${time}`;
 if(!/^\d{4}-\d\d-\d\dT([01]\d|2[0-3]):[0-5]\d$/.test(target))return null;
 const parts=target.match(/\d+/g).map(Number);
 const naive=Date.UTC(parts[0],parts[1]-1,parts[2],parts[3],parts[4]);
 if(dateOf(naive)!==date)return null;
 let guess=naive;
 for(let iteration=0;iteration<4;iteration++){
  const wall=localFields(guess,timezone);
  const a=wall.match(/\d+/g).map(Number);
  const delta=naive-Date.UTC(a[0],a[1]-1,a[2],a[3],a[4]);
  if(delta===0)return guess;
  guess+=delta;
 }
 return localFields(guess,timezone)===target?guess:null; // skip nonexistent local DST time
}
function nextReminder(snapshot,uid,timezone,after=Date.now()){
 const profileIds=new Set((snapshot.members||[]).filter(m=>m.userId===uid).map(m=>m.id));
 const reminders=[];
 const firstDay=Math.floor((after-7*DAY)/DAY)*DAY;
 const lastDay=firstDay+400*DAY;
 for(const event of snapshot.events||[]){
  if(event.isTemplate||(event.kind==='task'&&event.completed))continue;
  if(event.memberIds?.length&&!event.memberIds.some(id=>profileIds.has(id)))continue;
  for(const lead of new Set(event.reminders||[])){
   if(!Number.isInteger(lead)||lead<0||lead>10080)continue;
   for(let day=firstDay;day<=lastDay;day+=DAY){
    const date=dateOf(day);
    if(!isOccurrence(event,date))continue;
    const starts=toUTC(date,event.time,timezone);
    const when=starts-lead*MINUTE;
    if(!Number.isFinite(when)||when<=after)continue;
    reminders.push({kind:'event',id:event.id,date,lead,when,title:event.title});
    break;
   }
  }
 }
 const today=new Date(after);
 for(const payment of snapshot.payments||[]){
  if(!payment.remind||(payment.memberId&&!profileIds.has(payment.memberId)))continue;
  if(!Number.isInteger(payment.day)||payment.day<1||payment.day>31)continue;
  for(let offset=0;offset<14;offset++){
   const d=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()+offset,1));
   const y=d.getUTCFullYear(),m=d.getUTCMonth()+1;
   const last=new Date(Date.UTC(y,m,0)).getUTCDate();
   const date=`${y}-${String(m).padStart(2,'0')}-${String(Math.min(payment.day,last)).padStart(2,'0')}`;
   if((snapshot.paid?.[date.slice(0,7)]||[]).includes(payment.id))continue;
   const paymentTime=toUTC(date,'09:00',timezone);
   if(paymentTime===null)continue;
   const when=paymentTime-DAY;
   if(when>after){
    reminders.push({kind:'payment',id:payment.id,date,lead:1440,when,title:`Оплатить: ${payment.name}`});
    break;
   }
  }
 }
 return reminders;
}
function slotKey(reminder){
 return crypto.createHash('sha256').update([reminder.kind,reminder.id,reminder.lead].join('|')).digest('hex').slice(0,24);
}
function scheduleName(uid,reminder){
 return 'budget-tg-'+crypto.createHash('sha256').update(uid+':'+slotKey(reminder)).digest('hex').slice(0,36);
}
function definition(uid,reminder){
 return {name:scheduleName(uid,reminder),expression:{type:'single',at:new Date(reminder.when).toISOString().slice(0,16)},timezone:'Etc/UTC',target:{topic:'budget-calendar-telegram-reminders'},payload:{uid,slot:slotKey(reminder),when:reminder.when}};
}
module.exports={toUTC,nextReminder,slotKey,scheduleName,definition};
