import type { FamilyEvent } from '../types';

/** Calendar-only dates are local wall dates, never UTC timestamps. */
export function parseLocalCalendarDate(dateKey: string): Date {
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if(!match) throw new Error('Некорректная календарная дата');
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  const date=new Date(year,month-1,day);
  if(date.getFullYear()!==year || date.getMonth()!==month-1 || date.getDate()!==day) {
    throw new Error('Некорректная календарная дата');
  }
  return date;
}

export function formatLocalCalendarDate(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error('Некорректная календарная дата');
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}

export function eventDateTime(dateKey: string,time:string='00:00'):Date {
  const day=parseLocalCalendarDate(dateKey);
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Некорректное время события');
  const [hours,minutes]=time.split(':').map(Number);
  day.setHours(hours,minutes,0,0);
  return day;
}

export function filterEventsForCalendarMonth<T extends Pick<FamilyEvent,'date'|'time'>>(
  events: readonly T[], monthDate: Date, tab: 'upcoming'|'past', now: Date = new Date()
):T[] {
  return events.filter(event => {
    try {
      const date=parseLocalCalendarDate(event.date);
      if(date.getFullYear()!==monthDate.getFullYear() || date.getMonth()!==monthDate.getMonth()) return false;
      const eventMoment=eventDateTime(event.date,event.time || '00:00').getTime();
      // An untimed event remains upcoming throughout its local calendar day.
      const upcoming=event.time ? eventMoment>=now.getTime() : event.date>=formatLocalCalendarDate(now);
      return tab==='upcoming' ? upcoming : !upcoming;
    } catch {
      return false;
    }
  }).sort((a,b)=>{
    const delta=eventDateTime(a.date,a.time||'00:00').getTime()-eventDateTime(b.date,b.time||'00:00').getTime();
    return tab==='upcoming'?delta:-delta;
  });
}

/** Local wall-clock end, including the day offset for overnight events. */
export function calendarEndTime(time:string,duration:number):string {
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!Number.isFinite(duration)||duration<=0)return '';
 const [h,m]=time.split(':').map(Number);
 const total=h*60+m+Math.round(duration*60);
 const dayOffset=Math.floor(total/1440);
 const clock=String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
 return clock+(dayOffset?' (+'+dayOffset+' дн.)':'');
}

/** A named member filter matches explicit assignments; common is the shared-event view. */
export function matchesCalendarMember(event: Pick<FamilyEvent,'memberIds'>, filter: string, memberIds: readonly string[]): boolean {
  const assigned=event.memberIds||[];
  if(filter==='all')return true;
  if(filter==='common')return assigned.length===0 || (memberIds.length>0 && memberIds.every(id=>assigned.includes(id)));
  return assigned.includes(filter);
}

/** Inclusive local dates for the visible calendar mode, independent of the recurrence buffer. */
export function calendarViewPeriod(currentDate:Date,selectedDate:Date,view:'month'|'week'|'day'|'list'):{from:string;to:string}{
 const first=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),selectedDate.getDate());
 let last=new Date(first);
 if(view==='month'||view==='list'){
  first.setFullYear(currentDate.getFullYear(),currentDate.getMonth(),1);
  last=new Date(first.getFullYear(),first.getMonth()+1,0);
 }else if(view==='week'){
  first.setDate(first.getDate()-(first.getDay()+6)%7);
  last=new Date(first);last.setDate(last.getDate()+6);
 }
 return {from:formatLocalCalendarDate(first),to:formatLocalCalendarDate(last)};
}
