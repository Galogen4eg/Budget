import test from 'node:test';
import assert from 'node:assert/strict';
import { findEventConflicts } from '../utils/eventConflicts.ts';

const event=(id,date,time,duration,memberIds=['a'])=>({
 id,title:id,date,time,duration,memberIds,description:''
});

test('overlapping events for the same person conflict',()=>{
 const x=findEventConflicts([event('a','2026-11-21','15:00',2),event('b','2026-11-21','16:00',1)]);
 assert.equal(x.conflictPairs.length,1);
 assert.deepEqual([...x.conflictingEventIds].sort(),['a','b']);
});
test('different participants do not conflict, but shared event conflicts with each',()=>{
 const distinct=findEventConflicts([event('a','2026-11-21','15:00',2,['a']),event('b','2026-11-21','16:00',1,['b'])]);
 assert.equal(distinct.conflictPairs.length,0);
 const shared=findEventConflicts([event('a','2026-11-21','15:00',2,['a']),event('b','2026-11-21','16:00',1,[])]);
 assert.equal(shared.conflictPairs.length,1);
});
test('detects overnight conflict across adjacent calendar days',()=>{
 const x=findEventConflicts([event('late','2026-11-21','23:30',2),event('early','2026-11-22','00:30',1)]);
 assert.equal(x.conflictPairs.length,1);
});
test('adjacent events meeting at the same minute do not overlap',()=>{
 const x=findEventConflicts([event('a','2026-11-21','09:00',1),event('b','2026-11-21','10:00',1)]);
 assert.equal(x.conflictPairs.length,0);
});


test('range warning includes overnight overlap inside period but not unrelated adjacent-month conflicts',()=>{
 const events=[event('old-a','2026-10-10','10:00',2),event('old-b','2026-10-10','11:00',1),event('late','2026-10-31','23:30',2),event('early','2026-11-01','00:30',1),event('next-a','2026-12-01','10:00',2),event('next-b','2026-12-01','11:00',1)];
 const result=findEventConflicts(events,{from:'2026-11-01',to:'2026-11-30'});
 assert.deepEqual([...result.conflictingEventIds].sort(),['early','late']);
 assert.equal(result.conflictPairs.length,1);
 assert.equal(findEventConflicts(events).conflictPairs.length,3);
});
