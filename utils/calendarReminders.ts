import type { FamilyEvent, MandatoryExpense } from '../types';
import { eventDateTime, formatLocalCalendarDate } from './calendarDates.ts';

export interface DueReminder { id:string;title:string;date:string;leadMinutes:number; }
export function dueCalendarNotifications(
 events:readonly FamilyEvent[],now:Date,memberId?:string,since:Date=new Date(now.getTime()-120000)
):DueReminder[]{
 const start=now.getTime();
 const beginning=since.getTime();
 return events.flatMap(event=>{
   if(event.kind==='task'&&event.completed)return [];
   if(event.memberIds?.length && (!memberId || !event.memberIds.includes(memberId)))return [];
   let time:number;
   try{time=eventDateTime(event.date,event.time||'00:00').getTime();}catch{return [];}
   return (event.reminders||[]).filter(lead=>Number.isFinite(lead)&&lead>=0)
     .filter(lead=>{const trigger=time-lead*60000;return trigger<=start&&trigger>beginning;})
     .map(lead=>({id:`${event.id}:${event.date}:${lead}`,title:event.title,date:event.date,leadMinutes:lead}));
 });
}
export function paymentAgenda(payments:readonly MandatoryExpense[],month:Date,paidByMonth:Record<string,string[]>={}):FamilyEvent[]{
 const year=month.getFullYear(),m=month.getMonth();
 const days=new Date(year,m+1,0).getDate();
 const monthKey=`${year}-${String(m+1).padStart(2,'0')}`;
 const paid=new Set(paidByMonth[monthKey]||[]);
 return payments.filter(p=>Number.isFinite(p.day)&&p.day>0&&!paid.has(p.id)).map(p=>({
  id:`mandatory:${p.id}:${year}:${m+1}`,date:formatLocalCalendarDate(new Date(year,m,Math.min(p.day,days))),
  title:`Оплатить: ${p.name}`,description:`Плановый платёж: ${p.amount} ₽`,
  time:'09:00',duration:0.25,memberIds:p.memberId?[p.memberId]:[],
  linkedExpenseId:p.id,kind:'task' as const,reminders:p.remind?[1440]:[]
 }));
}

export function parseCustomCalendarReminder(value:string,unit:'min'|'hour'|'day'):number|null {
 const amount=Number(value);
 if(!/^\d+$/.test(value.trim())||!Number.isInteger(amount)||amount<1||amount>365)return null;
 return amount*(unit==='day'?1440:unit==='hour'?60:1);
}
export function calendarReminderWindow(now:Date,since:Date):{from:string;to:string}{
 const end=new Date(now.getTime()+365*1440*60000);
 return {from:formatLocalCalendarDate(since),to:formatLocalCalendarDate(end)};
}
