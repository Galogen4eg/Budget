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
      return tab==='upcoming' ? eventMoment >= now.getTime() : eventMoment < now.getTime();
    } catch {
      return false;
    }
  }).sort((a,b)=>{
    const delta=eventDateTime(a.date,a.time||'00:00').getTime()-eventDateTime(b.date,b.time||'00:00').getTime();
    return tab==='upcoming'?delta:-delta;
  });
}
