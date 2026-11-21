const test=require('node:test');
const assert=require('node:assert/strict');
const {wallTime,isOccurrence,dueAtMinute,paymentDueAtMinute,memberCanReceive,dueForDevice}=require('../reminderEngine.cjs');
const minute=(iso)=>Date.parse(iso);
const sample={id:'evt',date:'2026-11-21',time:'12:00',title:'Обед',memberIds:[],reminders:[15]};
test('reminders resolve in device timezone without accidental UTC shifts',()=>{
 assert.equal(wallTime(new Date('2026-11-21T08:45:00Z'),'Europe/Moscow').time,'11:45');
 const due=dueAtMinute(sample,minute('2026-11-21T08:45:00Z'),'Europe/Moscow');
 assert.equal(due.length,1);
 assert.equal(due[0].date,'2026-11-21');
 assert.equal(dueAtMinute(sample,minute('2026-11-21T08:45:00Z'),'America/Los_Angeles').length,0);
});
test('repeating dates are clamped and exceptions never produce a duplicate',()=>{
 const monthly={...sample,date:'2026-01-31',recurrence:'monthly'};
 assert.equal(isOccurrence(monthly,'2026-02-28'),true);
 assert.equal(isOccurrence(monthly,'2026-03-31'),true);
 assert.equal(isOccurrence(monthly,'2026-03-30'),false);
 assert.equal(isOccurrence({...monthly,recurrenceExceptions:['2026-02-28']},'2026-02-28'),false);
 const yearly={...sample,date:'2024-02-29',recurrence:'yearly'};
 assert.equal(isOccurrence(yearly,'2025-02-28'),true);
});
test('weekly recurrence respects weekdays and series end date',()=>{
 const weekly={...sample,recurrence:'weekly',recurrenceUntil:'2026-12-01'};
 assert.equal(isOccurrence(weekly,'2026-11-28'),true);
 assert.equal(isOccurrence(weekly,'2026-11-29'),false);
 assert.equal(isOccurrence(weekly,'2026-12-05'),false);
});
test('private tasks only notify their assigned member',()=>{
 const privateTask={...sample,kind:'task',memberIds:['memberA']};
 const device={uid:'userB',timezone:'Europe/Moscow'};
 const timestamp=minute('2026-11-21T08:45:00Z');
 assert.equal(dueForDevice([privateTask],[],{},device,new Set(['memberB']),timestamp).length,0);
 assert.equal(dueForDevice([privateTask],[],{},device,new Set(['memberA']),timestamp).length,1);
 assert.equal(memberCanReceive(privateTask,'userB',new Set()),false);
 assert.equal(dueForDevice([{...privateTask,completed:true}],[],{},device,new Set(['memberA']),timestamp).length,0);
});
test('mandatory paid expenses are excluded and month ends are clamped',()=>{
 const payment={id:'internet',name:'Интернет',day:31,remind:true};
 const instant=minute('2027-02-27T06:00:00Z'); // Moscow Feb 27 09:00, one day before Feb 28 09:00
 assert.equal(paymentDueAtMinute(payment,{},instant,'Europe/Moscow').length,1);
 assert.equal(paymentDueAtMinute(payment,{'2027-02':['internet']},instant,'Europe/Moscow').length,0);
 assert.equal(paymentDueAtMinute(payment,{},instant,'America/Los_Angeles').length,0);
});
test('invalid time and excessive lead never schedule',()=>{
 assert.equal(dueAtMinute({...sample,time:'25:00'},minute('2026-11-21T08:45:00Z'),'Europe/Moscow').length,0);
 assert.equal(dueAtMinute({...sample,reminders:[10081,-1,0.5]},minute('2026-11-21T08:45:00Z'),'Europe/Moscow').length,0);
});
