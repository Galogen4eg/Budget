import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLocalCalendarDate, formatLocalCalendarDate, eventDateTime, filterEventsForCalendarMonth } from '../utils/calendarDates.ts';

test('parses a YYYY-MM-DD calendar day as local midnight, not UTC',()=>{
  const date=parseLocalCalendarDate('2026-11-21');
  assert.equal(date.getFullYear(),2026);
  assert.equal(date.getMonth(),10);
  assert.equal(date.getDate(),21);
  assert.equal(date.getHours(),0);
});
test('roundtrips month and leap day calendar dates',()=>{
  assert.equal(formatLocalCalendarDate(parseLocalCalendarDate('2028-02-29')),'2028-02-29');
  assert.equal(formatLocalCalendarDate(new Date(2026,0,1,23,50)),'2026-01-01');
});
test('rejects rolled-over and malformed calendar dates',()=>{
  assert.throws(()=>parseLocalCalendarDate('2026-02-29'),/дат/);
  assert.throws(()=>parseLocalCalendarDate('2026-13-01'),/дат/);
  assert.throws(()=>parseLocalCalendarDate('2026-1-01'),/дат/);
});
test('event time is local on selected calendar date',()=>{
  const date=eventDateTime('2026-11-21','17:45');
  assert.equal(date.getHours(),17);
  assert.equal(date.getMinutes(),45);
  assert.equal(date.getDate(),21);
});
test('upcoming/past month lists do not shift dates and preserve event order',()=>{
  const events=[
    {id:'old',date:'2026-11-01',time:'09:00',title:'Old'},
    {id:'now',date:'2026-11-21',time:'17:00',title:'Now'},
    {id:'soon',date:'2026-11-22',time:'09:00',title:'Soon'},
    {id:'other',date:'2026-12-01',time:'09:00',title:'December'}
  ];
  const now=new Date(2026,10,21,12,0);
  assert.deepEqual(filterEventsForCalendarMonth(events,new Date(2026,10,1),'upcoming',now).map(e=>e.id),['now','soon']);
  assert.deepEqual(filterEventsForCalendarMonth(events,new Date(2026,10,1),'past',now).map(e=>e.id),['old']);
});
