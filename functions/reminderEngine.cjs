'use strict';

// Pure calendar rules for the scheduled sender. All wall-clock dates and times
// are resolved in the registered device's IANA time zone.
const MINUTE = 60000;
function daysUTC(value) {
  const [y,m,d] = value.split('-').map(Number);
  const timestamp = Date.UTC(y,m-1,d);
  if (new Date(timestamp).toISOString().slice(0,10)!==value) return NaN;
  return timestamp / 86400000;
}
function wallTime(instant, timezone) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  });
  const parts=Object.fromEntries(fmt.formatToParts(instant).map(x=>[x.type,x.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
}
function isOccurrence(event, date) {
  if (!event || !Number.isFinite(daysUTC(event.date)) || !Number.isFinite(daysUTC(date))) return false;
  if (date < event.date || (event.recurrenceUntil && date > event.recurrenceUntil)) return false;
  if (event.recurrenceExceptions?.includes(date)) return false;
  const repeat=event.recurrence||'none';
  if (repeat==='none') return date===event.date;
  if (repeat==='daily') return true;
  if (repeat==='weekly') return (daysUTC(date)-daysUTC(event.date))%7===0;
  const [y,m,d]=date.split('-').map(Number);
  const [sy,sm,sd]=event.date.split('-').map(Number);
  const months=(y-sy)*12+m-sm;
  if (repeat==='monthly' || repeat==='yearly') {
    if (repeat==='yearly' && months%12!==0) return false;
    const lastDay=new Date(Date.UTC(y,m,0)).getUTCDate();
    return d===Math.min(sd,lastDay);
  }
  return false;
}
function dueAtMinute(event, minute, timezone) {
  if (!event || (event.kind==='task'&&event.completed) || event.isTemplate) return [];
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time||'')) return [];
  const leads=Array.isArray(event.reminders)?event.reminders:[];
  const due=[];
  for (const lead of new Set(leads)) {
    if (!Number.isInteger(lead)||lead<0||lead>10080) continue;
    const occurrence=wallTime(new Date(minute+lead*MINUTE),timezone);
    if (occurrence.time!==event.time || !isOccurrence(event,occurrence.date)) continue;
    due.push({id:event.id,date:occurrence.date,lead,title:String(event.title||'Событие')});
  }
  return due;
}
function paymentDueAtMinute(payment,paid,minute,timezone) {
  if(!payment || !payment.remind || !Number.isInteger(payment.day) || payment.day<1 || payment.day>31)return [];
  const wall=wallTime(new Date(minute+1440*MINUTE),timezone);
  if (wall.time!=='09:00') return [];
  const [year,month,day]=wall.date.split('-').map(Number);
  const max=new Date(Date.UTC(year,month,0)).getUTCDate();
  if(day!==Math.min(payment.day,max))return [];
  if((paid?.[wall.date.slice(0,7)]||[]).includes(payment.id))return [];
  return [{id:`mandatory:${payment.id}`,date:wall.date,lead:1440,title:`Оплатить: ${payment.name}`}];
}
function memberCanReceive(event,uid,profileIds) {
  return !event.memberIds?.length || event.memberIds.some(id=>profileIds.has(id));
}
function dueForDevice(events,payments,paid,device,profileIds,now=Date.now()) {
  const minute=Math.floor(now/MINUTE)*MINUTE;
  const result=[];
  for(let back=0;back<=2;back++){
    const time=minute-back*MINUTE;
    for(const event of events){
      if(!memberCanReceive(event,device.uid,profileIds))continue;
      for(const reminder of dueAtMinute(event,time,device.timezone)) {
        result.push({...reminder,triggerMinute:time});
      }
    }
    for(const payment of payments){
      if(payment.memberId && !profileIds.has(payment.memberId)) continue;
      for(const reminder of paymentDueAtMinute(payment,paid,time,device.timezone)) {
        result.push({...reminder,triggerMinute:time});
      }
    }
  }
  return result;
}
module.exports={wallTime,isOccurrence,dueAtMinute,paymentDueAtMinute,memberCanReceive,dueForDevice};
