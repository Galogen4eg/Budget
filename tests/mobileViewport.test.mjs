import test from 'node:test';
import assert from 'node:assert/strict';
import { keyboardViewport } from '../utils/mobileViewport.ts';
const baseline={mobile:true,editable:true,scale:1,baseline:844,height:510};
test('keyboard resizes only the mobile editable viewport',()=>{
 assert.deepEqual(keyboardViewport(baseline),{keyboardOpen:true,height:510});
 for(const input of [{mobile:false},{editable:false},{scale:1.4},{height:780}])assert.deepEqual(keyboardViewport({...baseline,...input}),{keyboardOpen:false,height:null});
});
test('invalid or absent geometry leaves the normal viewport untouched',()=>{
 for(const height of [0,NaN,-10,Infinity])assert.deepEqual(keyboardViewport({...baseline,height}),{keyboardOpen:false,height:null});
});
