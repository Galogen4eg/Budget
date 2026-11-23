import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCalendarOccurrences } from '../utils/familyPlanEngine.ts';
import { parseLocalCalendarDate } from '../utils/calendarDates.ts';

const desktop=readFileSync(new URL('../components/FamilyPlansDesktop.tsx',import.meta.url),'utf8');
const modal=readFileSync(new URL('../components/EventModal.tsx',import.meta.url),'utf8');
const evt=(patch={})=>({id:'series-1',title:'План',date:'2027-01-31',time:'12:00',duration:1,memberIds:[],recurrence:'monthly',...patch});

test('iteration 78: monthly series and one-off edits respect leap-month boundaries',()=>{
 const parent=evt({recurrenceExceptions:['2027-02-28']});
 const override={...evt({id:'series-1::2027-02-28',date:'2027-02-27',recurrence:'none'}),seriesId:undefined,occurrenceDate:undefined};
 const result=buildCalendarOccurrences([parent,override],'2027-01-01','2027-04-30');
 assert.deepEqual(result.map(x=>x.date),['2027-01-31','2027-02-27','2027-03-31','2027-04-30']);
 assert.equal(parseLocalCalendarDate('2028-02-29').getDate(),29);
});

test('iteration 78: modal validates recurring end date as a real local calendar date',()=>{
 assert.match(modal,/parseLocalCalendarDate\(recurrenceUntil\)/);
 assert.match(modal,/recurrenceUntil && recurrenceUntil < date/);
 assert.match(modal,/Конец повторения не может быть раньше начала события/);
});

test('iteration 78: desktop calendar day and event actions have keyboard accessibility',()=>{
 assert.match(desktop,/role="button"[\s\S]{0,260}tabIndex=\{0\}/);
 assert.match(desktop,/onKeyDown=\{\(e\) =>/);
 assert.match(desktop,/aria-label=\{\`Открыть событие:/);
 assert.match(desktop,/aria-label=\{\`Добавить событие:/);
 assert.match(desktop,/focus-visible:ring-2/);
});

test('iteration 78: delete confirmation remains cancelable and touch reachable',()=>{
 assert.match(modal,/Да, удалить/);
 assert.match(modal,/onClick=\{\(\) => setIsConfirmingDelete\(false\)\}/);
 assert.match(modal,/disabled=\{isSaving\}/);
 assert.match(modal,/min-h-\[44px\]/);
});

test('iteration 78: desktop month renders all six calendar weeks, including 36th–42nd day cells',()=>{
 assert.match(desktop,/calendarData\.map\(\(d, i\) =>/);
 assert.doesNotMatch(desktop,/calendarData\.slice\(0,\s*35\)/);
});
test('iteration 78: calendar editor never attaches a financial expense ID to a new event',()=>{
 assert.doesNotMatch(modal,/linkedExpenseId:event\?\.linkedExpenseId/);
});

test('iteration 78: recurrence scope and conflict confirmation have clear 44px controls',()=>{
 assert.match(modal,/name="calendar-edit-scope"/);
 assert.match(modal,/Только этот раз/);
 assert.match(modal,/Всю серию/);
 assert.match(modal,/focus-within:ring-2/);
 assert.match(modal,/min-h-\[44px\][^"]*bg-amber-600/);
});
