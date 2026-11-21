import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCalendarICS } from '../utils/calendarExport.ts';
import { dueCalendarNotifications, paymentAgenda } from '../utils/calendarReminders.ts';
import { telegramReminderText, telegramReminderKey, telegramReminderSince } from '../utils/calendarTelegram.ts';

const event={id:'a',title:'Оплата, интернета',description:'Тест\nСообщение',date:'2026-11-21',time:'12:00',duration:1,memberIds:['u'],reminders:[15]};
test('ICS escapes content and contains local timestamp with stable UID',()=>{
 const ics=makeCalendarICS([event]);
 assert.match(ics,/BEGIN:VCALENDAR/);
 assert.match(ics,/SUMMARY:Оплата\\, интернета/);
 assert.match(ics,/DESCRIPTION:Тест\\nСообщение/);
 assert.match(ics,/UID:a@budget/);
});
test('foreground reminder respects lead time and user assignments',()=>{
 const now=new Date(2026,10,21,11,45,0);
 assert.equal(dueCalendarNotifications([event],now,'u').length,1);
 assert.equal(dueCalendarNotifications([event],now,'someone-else').length,0);
 assert.equal(dueCalendarNotifications([event],new Date(2026,10,21,11,30),'u').length,0);
});
test('mandatory payment preview clamps month day without creating expenses',()=>{
 const payments=[{id:'p1',name:'Интернет',amount:500,day:31,remind:true}];
 const preview=paymentAgenda(payments,new Date(2027,1,1));
 assert.equal(preview[0].date,'2027-02-28');
 assert.equal(preview[0].linkedExpenseId,'p1');
});

test('unlinked account receives only family-wide reminders, not another member private plans',()=>{
 const now=new Date(2026,10,21,11,45,0);
 assert.equal(dueCalendarNotifications([event],now,undefined).length,0);
 assert.equal(dueCalendarNotifications([{...event,memberIds:[]}],now,undefined).length,1);
});

test('paid mandatory bills do not appear in reminders or upcoming agenda',()=>{
  const payments=[{id:'paid',name:'Связь',amount:800,day:21,remind:true}];
  assert.equal(paymentAgenda(payments,new Date(2026,10,1),{'2026-11':['paid']}).length,0);
  assert.equal(paymentAgenda(payments,new Date(2026,10,1),{'2026-11':[]}).length,1);
});

test('ICS exports reminder alarms for native phone calendar apps',()=>{
 const ics=makeCalendarICS([event],new Date(2026,10,21,9,0));
 assert.match(ics,/BEGIN:VALARM/);
 assert.match(ics,/TRIGGER:-PT15M/);
 assert.match(ics,/ACTION:DISPLAY/);
});

test('foreground reminder catches a suspended tab without replaying old alerts',()=>{
 const at=new Date(2026,10,21,12,25,0);
 const since=new Date(2026,10,21,11,40,0);
 assert.equal(dueCalendarNotifications([event],at,'u',since).length,1);
 assert.equal(dueCalendarNotifications([event],at,'u',new Date(2026,10,21,12,0)).length,0);
});
test('foreground reminder does not send a notification before its trigger time',()=>{
 const at=new Date(2026,10,21,11,40,0);
 assert.equal(dueCalendarNotifications([event],at,'u',new Date(2026,10,21,11,0)).length,0);
});

test('Telegram reminders format lead time and do not execute before a scheduled trigger',()=>{
 const at=new Date(2026,10,21,11,45,0);
 const items=dueCalendarNotifications([event],at,'u');
 assert.equal(items.length,1);
 assert.match(telegramReminderText(items[0]),/Через 15 мин/);
 assert.match(telegramReminderText(items[0]),/Оплата, интернета/);
 assert.equal(dueCalendarNotifications([event],new Date(2026,10,21,11,44), 'u').length,0);
});
test('Telegram delivery history is scoped to family, authenticated user and chat',()=>{
 assert.notEqual(telegramReminderKey('family1','u1','123'),telegramReminderKey('family1','u2','123'));
 assert.notEqual(telegramReminderKey('family1','u1','123'),telegramReminderKey('family2','u1','123'));
 assert.notEqual(telegramReminderKey('family1','u1','123'),telegramReminderKey('family1','u1','456'));
});
test('Telegram catch-up is capped at one hour and safely resumes the last check',()=>{
 const now=new Date('2026-11-21T12:00:00Z');
 assert.equal(telegramReminderSince(now,Date.parse('2026-11-21T11:40:00Z')).toISOString(),'2026-11-21T11:40:00.000Z');
 assert.equal(telegramReminderSince(now,Date.parse('2026-11-19T12:00:00Z')).toISOString(),'2026-11-21T11:00:00.000Z');
 assert.equal(telegramReminderSince(now,null).toISOString(),'2026-11-21T11:58:00.000Z');
});
