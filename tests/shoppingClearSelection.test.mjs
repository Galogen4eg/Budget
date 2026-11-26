import test from 'node:test';
import assert from 'node:assert/strict';
import { captureCompletedSelection, resolveCompletedDeletion } from '../utils/shoppingClearSelection.ts';
const rows=[{id:'a',completed:true},{id:'b',completed:true},{id:'c',completed:false}];
test('bulk clear targets only the completed rows actually shown and confirmed',()=>{
 const selection=captureCompletedSelection([rows[1],rows[2]]);
 assert.deepEqual(selection,['b']);
 assert.deepEqual(resolveCompletedDeletion(selection,[rows[1],rows[2]]),['b']);
 assert.equal(resolveCompletedDeletion(selection,rows),null,'must not widen a filtered selection');
});
test('restored, missing or newly completed products require confirmation again',()=>{
 const selection=captureCompletedSelection(rows);
 assert.equal(resolveCompletedDeletion(selection,[{...rows[0],completed:false},rows[1]]),null);
 assert.equal(resolveCompletedDeletion(selection,[rows[0]]),null);
 assert.equal(resolveCompletedDeletion(selection,[...rows,{id:'d',completed:true}]),null);
});
test('order does not change confirmation; empty and repeated IDs are safe',()=>{
 const selection=captureCompletedSelection([rows[1],rows[0],rows[0],{id:'',completed:true},{id:'legacy'}]);
 assert.deepEqual(selection,['a','b']);
 assert.deepEqual(resolveCompletedDeletion(selection,[rows[0],rows[1]]),['a','b']);
 assert.equal(resolveCompletedDeletion([],[]),null);
 assert.equal(resolveCompletedDeletion(null,rows),null);
});
