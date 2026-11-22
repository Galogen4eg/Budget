import test from 'node:test';
import assert from 'node:assert/strict';
import {shiftCalendarMonth} from '../utils/calendarMonthNavigation.ts';

test('January 31 moves to February, not March',()=>{
 const next=shiftCalendarMonth(new Date(2027,0,31,16,20),1);
 assert.deepEqual([next.getFullYear(),next.getMonth(),next.getDate()],[2027,1,28]);
});
test('leap year month navigation clamps at 29 February',()=>{
 const next=shiftCalendarMonth(new Date(2028,0,31),1);
 assert.deepEqual([next.getFullYear(),next.getMonth(),next.getDate()],[2028,1,29]);
});
test('going backwards from March 31 lands in February',()=>{
 const next=shiftCalendarMonth(new Date(2027,2,31),-1);
 assert.deepEqual([next.getFullYear(),next.getMonth(),next.getDate()],[2027,1,28]);
});
test('December moves to January of the following year',()=>{
 const next=shiftCalendarMonth(new Date(2026,11,31),1);
 assert.deepEqual([next.getFullYear(),next.getMonth(),next.getDate()],[2027,0,31]);
});
test('month navigation retains time of day',()=>{
 const next=shiftCalendarMonth(new Date(2026,4,15,13,42),1);
 assert.deepEqual([next.getHours(),next.getMinutes()],[13,42]);
});
