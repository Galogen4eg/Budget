import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendarOccurrences, markOccurrenceSkipped, assertCalendarVersion, upcomingAgenda } from '../utils/familyPlanEngine.ts';

const e = (patch={}) => ({id:'event-1',title:'Тренировка',description:'',date:'2026-11-02',time:'19:00',duration:1,memberIds:['a'],...patch});
test('weekly recurrence crosses months without UTC shifts',()=>{
 const result=buildCalendarOccurrences([e({recurrence:'weekly'})], '2026-11-01','2026-12-06');
 assert.deepEqual(result.map(x=>x.date),['2026-11-02','2026-11-09','2026-11-16','2026-11-23','2026-11-30']);
 assert.equal(result[1].seriesId,'event-1');
});
test('monthly recurrence clamps on 31st rather than skipping February',()=>{
 const result=buildCalendarOccurrences([e({date:'2027-01-31',recurrence:'monthly'})], '2027-01-01','2027-04-01');
 assert.deepEqual(result.map(x=>x.date),['2027-01-31','2027-02-28','2027-03-31']);
});
test('yearly recurrence respects leap day and end date',()=>{
 const result=buildCalendarOccurrences([e({date:'2028-02-29',recurrence:'yearly',recurrenceUntil:'2030-12-31'})], '2028-01-01','2031-01-01');
 assert.deepEqual(result.map(x=>x.date),['2028-02-29','2029-02-28','2030-02-28']);
});
test('skipping single occurrence keeps future series untouched',()=>{
 const original=e({recurrence:'weekly'});
 const changed=markOccurrenceSkipped(original,'2026-11-09');
 assert.deepEqual(changed.recurrenceExceptions,['2026-11-09']);
 assert.equal(buildCalendarOccurrences([changed],'2026-11-01','2026-11-16').length,2);
 assert.deepEqual(original.recurrenceExceptions,undefined);
});
test('one-off overrides do not show duplicate series occurrence',()=>{
 const original=e({recurrence:'weekly',recurrenceExceptions:['2026-11-09']});
 const replacement=e({id:'event-1::2026-11-09',date:'2026-11-10',recurrence:'none'});
 const result=buildCalendarOccurrences([original,replacement],'2026-11-01','2026-11-16');
 assert.deepEqual(result.map(x=>x.date),['2026-11-02','2026-11-10']);
});
test('two-account stale edits are rejected without clobbering another member changes',()=>{
 const original=e();
 assert.doesNotThrow(()=>assertCalendarVersion(original,{...original}));
 assert.throws(()=>assertCalendarVersion(original,{...original,title:'Встреча'}),/другом устройстве/);
 assert.throws(()=>assertCalendarVersion(null,original),/другом устройстве/);
});
test('task is included in agenda until completed, and sorting is stable',()=>{
 const done=e({id:'done',kind:'task',completed:true});
 const pending=e({id:'todo',kind:'task',completed:false,time:'08:00'});
 const output=upcomingAgenda([done,pending,e()],'2026-11-01',20);
 assert.deepEqual(output.map(x=>x.id),['todo','event-1']);
});
