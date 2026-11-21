const test=require('node:test');
const assert=require('node:assert/strict');
const {toUTC,nextReminder,definition,slotKey}=require('../lib/calendarScheduleEngine.cjs');
const member={id:'a',userId:'one'};
const user='one',tz='Europe/Moscow';
const event={id:'e',title:'Оплата',date:'2026-11-25',time:'18:00',memberIds:['a'],reminders:[60]};
const snapshot=(events=[event],payments=[],paid={})=>({members:[member],events,payments,paid});
test('local 18:00 Moscow yields a 14:00 UTC reminder one hour before',()=>{
 const due=nextReminder(snapshot(),user,tz,Date.parse('2026-11-21T00:00:00Z'));
 assert.equal(due.length,1);
 assert.equal(new Date(due[0].when).toISOString(),'2026-11-25T14:00:00.000Z');
 assert.equal(definition(user,due[0]).expression.at,'2026-11-25T14:00');
});
test('does not send a private plan to another user or a completed task',()=>{
 assert.equal(nextReminder(snapshot(), 'two',tz,Date.parse('2026-11-21T00:00:00Z')).length,0);
 assert.equal(nextReminder(snapshot([{...event,kind:'task',completed:true}]),user,tz,Date.parse('2026-11-21T00:00:00Z')).length,0);
});
test('monthly recurring reminders skip exception and select next occurrence',()=>{
 const ev={...event,date:'2026-11-25',recurrence:'monthly',recurrenceExceptions:['2026-12-25']};
 const due=nextReminder(snapshot([ev]),user,tz,Date.parse('2026-11-25T19:00:00Z'));
 assert.equal(due[0].date,'2027-01-25');
});
test('paid mandatory bills are not scheduled',()=>{
 const payment={id:'electric',name:'Свет',day:31,remind:true};
 const due=nextReminder(snapshot([],[payment],{'2027-02':['electric']}),user,tz,Date.parse('2027-01-31T18:00:00Z'));
 assert.equal(due[0].date,'2027-03-31');
});
test('timezone conversion is DST aware and rejects nonexistent local hour',()=>{
 assert.equal(toUTC('2027-03-28','03:30','Europe/Berlin'),Date.parse('2027-03-28T01:30:00Z'));
 assert.equal(toUTC('2027-03-28','02:30','Europe/Berlin'),null);
});
test('edited instance keeps the same logical slot but uses a new immutable schedule ID',()=>{
 const first=nextReminder(snapshot(),user,tz,Date.parse('2026-11-21T00:00:00Z'))[0];
 const next=nextReminder(snapshot([{...event,time:'20:00'}]),user,tz,Date.parse('2026-11-21T00:00:00Z'))[0];
 assert.equal(slotKey(first),slotKey(next));
 assert.notEqual(definition(user,first).name,definition(user,next).name);
 assert.notEqual(first.when,next.when);
});

test('next recurring occurrence gets a new one-time schedule name',()=>{
 const recurring={...event,recurrence:'daily'};
 const first=nextReminder(snapshot([recurring]),user,tz,Date.parse('2026-11-21T00:00:00Z'))[0];
 const next=nextReminder(snapshot([recurring]),user,tz,first.when+1000)[0];
 assert.equal(slotKey(first),slotKey(next));
 assert.notEqual(definition(user,first).name,definition(user,next).name);
});
