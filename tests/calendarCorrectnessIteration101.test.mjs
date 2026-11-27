import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterEventsForCalendarMonth,matchesCalendarMember,calendarViewPeriod,formatCalendarWeekRange} from '../utils/calendarDates.ts';
import {selectedDayInMonth} from '../utils/calendarMonthNavigation.ts';
test('selected day follows target month and clamps across February and year boundaries',()=>{
 assert.deepEqual(selectedDayInMonth(new Date(2027,0,31),new Date(2027,1,1)),new Date(2027,1,28));
 assert.deepEqual(selectedDayInMonth(new Date(2028,0,31),new Date(2028,1,1)),new Date(2028,1,29));
 assert.deepEqual(selectedDayInMonth(new Date(2026,11,15),new Date(2027,0,1)),new Date(2027,0,15));
});
test('untimed event remains upcoming all day and becomes past the next local day',()=>{
 const events=[{id:'all-day',date:'2026-11-24',time:''},{id:'early',date:'2026-11-24',time:'09:00'},{id:'late',date:'2026-11-24',time:'20:00'},{id:'invalid',date:'2026-11-24',time:'25:00'}];
 const now=new Date(2026,10,24,12);
 assert.deepEqual(filterEventsForCalendarMonth(events,now,'upcoming',now).map(e=>e.id),['all-day','late']);
 assert.deepEqual(filterEventsForCalendarMonth(events,now,'past',now).map(e=>e.id),['early']);
 const tomorrow=new Date(2026,10,25,0);
 assert.deepEqual(filterEventsForCalendarMonth(events,tomorrow,'past',tomorrow).map(e=>e.id),['late','early','all-day']);
});
test('member filters distinguish explicit assignment and common events',()=>{
 const events=[{id:'a',memberIds:['a']},{id:'b',memberIds:['b']},{id:'both',memberIds:['a','b']},{id:'common',memberIds:[]},{id:'unknown',memberIds:['a','old']}];
 const ids=['a','b'];
 assert.deepEqual(events.filter(e=>matchesCalendarMember(e,'a',ids)).map(e=>e.id),['a','both','unknown']);
 assert.deepEqual(events.filter(e=>matchesCalendarMember(e,'common',ids)).map(e=>e.id),['both','common']);
 assert.equal(matchesCalendarMember({memberIds:undefined},'common',ids),true);
 assert.equal(matchesCalendarMember(events[0],'all',ids),true);
});
test('both calendar layouts use shared schedule and member semantics',()=>{
 for(const name of ['FamilyPlansMobile','FamilyPlansDesktop']){
  const source=readFileSync(new URL('../components/'+name+'.tsx',import.meta.url),'utf8');
  assert.match(source,/setSelectedDate\(selectedDayInMonth\(selectedDate,newDate\)\)/);
  assert.match(source,/filterEventsForCalendarMonth\(currentMonthEvents,currentDate,'upcoming'\)/);
  assert.match(source,/matchesCalendarMember\(e(?:vent)?,filterMemberId,memberIds\)/);
 }
 const desktop=readFileSync(new URL('../components/FamilyPlansDesktop.tsx',import.meta.url),'utf8');
 assert.match(desktop,/filteredDayEvents.map/);
 assert.doesNotMatch(desktop,/isEventDimmed/);
});


test('calendar view counts use the selected period rather than the three-month occurrence buffer',()=>{
 const month=new Date(2026,10,1),day=new Date(2026,10,1);
 assert.deepEqual(calendarViewPeriod(month,day,'month'),{from:'2026-11-01',to:'2026-11-30'});
 assert.deepEqual(calendarViewPeriod(month,day,'list'),{from:'2026-11-01',to:'2026-11-30'});
 assert.deepEqual(calendarViewPeriod(month,day,'week'),{from:'2026-10-26',to:'2026-11-01'});
 assert.deepEqual(calendarViewPeriod(month,day,'day'),{from:'2026-11-01',to:'2026-11-01'});
 assert.deepEqual(calendarViewPeriod(new Date(2028,1,1),day,'month'),{from:'2028-02-01',to:'2028-02-29'});
});


test('week labels use correct Russian month case and preserve both years across New Year',()=>{
 assert.equal(formatCalendarWeekRange(new Date(2026,10,23),new Date(2026,10,29)),'23 — 29 ноября');
 assert.equal(formatCalendarWeekRange(new Date(2026,10,23),new Date(2026,10,29),true),'23 — 29 ноября 2026');
 assert.equal(formatCalendarWeekRange(new Date(2026,11,28),new Date(2027,0,3)),'28 декабря 2026 — 3 января 2027');
});
