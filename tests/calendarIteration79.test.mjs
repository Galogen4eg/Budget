import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCustomCalendarReminder,calendarReminderWindow} from '../utils/calendarReminders.ts';
import {formatLocalCalendarDate,calendarEndTime} from '../utils/calendarDates.ts';

test('iteration 79: custom reminders accept only integer amounts from 1 to 365',()=>{
 for(const value of ['','0','-1','1.5','366','2x','1e2'])assert.equal(parseCustomCalendarReminder(value,'day'),null);
 assert.equal(parseCustomCalendarReminder('365','day'),525600);
 assert.equal(parseCustomCalendarReminder('2','hour'),120);
});
test('iteration 79: local reminders cover yesterday and the longest configured lead',()=>{
 const now=new Date(2027,0,1,0,5);
 const since=new Date(2026,11,31,23,55);
 const range=calendarReminderWindow(now,since);
 assert.equal(range.from,'2026-12-31');
 const end=new Date(now.getTime()+525600*60000);
 assert.equal(range.to,formatLocalCalendarDate(end));
});
const modal=readFileSync(new URL('../components/EventModal.tsx',import.meta.url),'utf8');
test('iteration 79: editing a recurring series preserves its exception dates',()=>{
 assert.match(modal,/recurrenceExceptions:baseSeries\?\.recurrenceExceptions/);
});
test('iteration 79: reminder and checklist actions expose accessible names',()=>{
 assert.match(modal,/aria-pressed=\{isActive\}/);
 assert.match(modal,/aria-label="Добавить пункт чек-листа"/);
 assert.match(modal,/aria-label=\{\`Удалить пункт:/);
});

test('iteration 79: fractional and overnight event durations display the correct end',()=>{
 assert.equal(calendarEndTime('12:15',0.5),'12:45');
 assert.equal(calendarEndTime('23:45',0.5),'00:15 (+1 дн.)');
 assert.equal(calendarEndTime('09:30',24),'09:30 (+1 дн.)');
 assert.equal(calendarEndTime('25:00',1),'');
});
const mobile=readFileSync(new URL('../components/FamilyPlansMobile.tsx',import.meta.url),'utf8');
const desktop=readFileSync(new URL('../components/FamilyPlansDesktop.tsx',import.meta.url),'utf8');
test('iteration 79: both calendar layouts expose day navigation and real event end times',()=>{
 for(const source of [mobile,desktop]){
  assert.match(source,/aria-pressed=\{viewMode === 'day'\}/);
  assert.match(source,/changeDay\(1\)/);
  assert.match(source,/calendarEndTime\(/);
 }
 assert.doesNotMatch(mobile,/<span>за 30 мин<\/span>/);
});
