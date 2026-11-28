import test from 'node:test';
import assert from 'node:assert/strict';
import { meetsTouchDimension, meetsTouchTarget } from './touchTargetGeometry.mjs';

test('44 CSS px targets tolerate only floating-point measurement noise',()=>{
 for(const height of [44,43.999996185302734,43.999755859375,48]){
  assert.equal(meetsTouchDimension(height),true);
  assert.equal(meetsTouchTarget({width:44,height}),true);
 }
});
test('genuinely undersized targets remain failures in either dimension',()=>{
 for(const size of [43.99,43.887939453125,42.421875,41.723724365234375,0,NaN,Infinity]){
  assert.equal(meetsTouchDimension(size),false);
  assert.equal(meetsTouchTarget({width:44,height:size}),false);
  assert.equal(meetsTouchTarget({width:size,height:44}),false);
 }
 assert.equal(meetsTouchTarget(null),false);
});
