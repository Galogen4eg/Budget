import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCalendarICS } from '../utils/calendarExport.ts';
import { dueCalendarNotifications, paymentAgenda } from '../utils/calendarReminders.ts';

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
