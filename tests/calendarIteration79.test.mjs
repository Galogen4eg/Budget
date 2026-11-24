import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCustomCalendarReminder,calendarReminderWindow} from '../utils/calendarReminders.ts';
import {formatLocalCalendarDate} from '../utils/calendarDates.ts';

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
 const end=new Date(now);end.setMinutes(end.getMinutes()+525600);
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
