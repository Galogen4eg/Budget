import type { FamilyEvent } from '../types';
import { eventDateTime } from './calendarDates.ts';
import { buildCalendarOccurrences } from './familyPlanEngine.ts';

const escapeICS=(s:string)=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const timestamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function makeCalendarICS(events:readonly FamilyEvent[], now:Date=new Date()):string {
 const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const end=new Date(start);end.setFullYear(end.getFullYear()+1);
 const items=buildCalendarOccurrences(events.filter(x=>!x.isTemplate),
   [start.getFullYear(),String(start.getMonth()+1).padStart(2,'0'),String(start.getDate()).padStart(2,'0')].join('-'),
   [end.getFullYear(),String(end.getMonth()+1).padStart(2,'0'),String(end.getDate()).padStart(2,'0')].join('-'));
 const result=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Budget//Family Calendar//RU','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const e of items){
   let startAt:Date;
   try{startAt=eventDateTime(e.date,e.time||'00:00');}catch{continue;}
   const endAt=new Date(startAt.getTime()+Math.round((e.duration||1)*3600000));
   result.push('BEGIN:VEVENT',`UID:${escapeICS(e.id)}@budget`,`DTSTAMP:${timestamp(now)}`,
     `DTSTART:${timestamp(startAt)}`,`DTEND:${timestamp(endAt)}`,
     `SUMMARY:${escapeICS(e.title)}`,`DESCRIPTION:${escapeICS(e.description)}`,
     'END:VEVENT');
 }
 result.push('END:VCALENDAR');
 return result.join('\r\n')+'\r\n';
}
