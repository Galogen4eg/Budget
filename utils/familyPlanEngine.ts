import type { FamilyEvent } from '../types';
import { parseLocalCalendarDate, formatLocalCalendarDate, eventDateTime } from './calendarDates.ts';

export type PlanRecurrence = 'none'|'daily'|'weekly'|'monthly'|'yearly';
const dateKey=(d:Date)=>formatLocalCalendarDate(d);

function addOccurrence(start: Date, interval: number, kind: PlanRecurrence): Date {
  const base = new Date(start.getFullYear(),start.getMonth(),start.getDate());
  if(kind==='daily') base.setDate(base.getDate()+interval);
  else if(kind==='weekly') base.setDate(base.getDate()+7*interval);
  else if(kind==='monthly' || kind==='yearly'){
    const month=start.getMonth()+(kind==='monthly'?interval:12*interval);
    const first=new Date(start.getFullYear(),month,1);
    const last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
    first.setDate(Math.min(start.getDate(),last));
    return first;
  }
  return base;
}

export function buildCalendarOccurrences(
  events: readonly FamilyEvent[],from:string,to:string
): FamilyEvent[] {
  const first=parseLocalCalendarDate(from).getTime(),last=parseLocalCalendarDate(to).getTime();
  if(last<first) return [];
  const visible:FamilyEvent[]=[];
  for(const event of events){
    let start:Date;
    try{ start=parseLocalCalendarDate(event.date); }catch{continue;}
    const repeat=event.recurrence||'none';
    const maxDate=event.recurrenceUntil ? parseLocalCalendarDate(event.recurrenceUntil).getTime() : last;
    const count=repeat==='none'?1:Math.min(2000,Math.ceil((last-start.getTime())/86400000)+2);
    const skipped=new Set(event.recurrenceExceptions||[]);
    for(let n=0;n<count;n++){
      const date=repeat==='none'?start:addOccurrence(start,n,repeat);
      const time=date.getTime();
      if(time>last || time>maxDate)break;
      if(time<first || skipped.has(dateKey(date))) continue;
      if(n===0||repeat==='none')visible.push(event);
      else visible.push({
        ...event,id:`${event.id}::${dateKey(date)}`,date:dateKey(date),
        seriesId:event.id,occurrenceDate:dateKey(date)
      });
    }
  }
  return visible.sort((a,b)=>{
    try{return eventDateTime(a.date,a.time||'00:00').getTime()-eventDateTime(b.date,b.time||'00:00').getTime();}
    catch{return a.date.localeCompare(b.date);}
  });
}

export function markOccurrenceSkipped(event: FamilyEvent,date:string): FamilyEvent {
  parseLocalCalendarDate(date);
  return {...event,recurrenceExceptions:[...new Set([...(event.recurrenceExceptions||[]),date])].sort()};
}

function versionShape(event: FamilyEvent): string {
  const {id,title,description,date,time,duration,memberIds,userId,isTemplate,checklist,reminders,
    recurrence,recurrenceUntil,recurrenceExceptions,kind,completed,completedAt,linkedExpenseId}=event;
  return JSON.stringify([id,title,description,date,time,duration||1,[...(memberIds||[])].sort(),
    userId||null,Boolean(isTemplate),checklist||[],reminders||[],recurrence||'none',
    recurrenceUntil||null,[...(recurrenceExceptions||[])].sort(),
    kind||'event',Boolean(completed),completedAt||null,linkedExpenseId||null]);
}

export function assertCalendarVersion(expected: FamilyEvent|null,actual:FamilyEvent|null):void {
  if((!expected&&actual)||(expected&&!actual)||
    (expected&&actual&&versionShape(expected)!==versionShape(actual))) {
    throw new Error('Событие изменено на другом устройстве. Обновите календарь и повторите действие.');
  }
}

export function upcomingAgenda(events:readonly FamilyEvent[],from:string,days:number=30):FamilyEvent[] {
  const start=parseLocalCalendarDate(from);
  const end=new Date(start);end.setDate(end.getDate()+Math.max(1,Math.min(days,90))-1);
  return buildCalendarOccurrences(events,from,dateKey(end)).filter(event=>event.kind!=='task'||!event.completed);
}
