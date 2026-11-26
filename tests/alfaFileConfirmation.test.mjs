import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmAlfaFile} from '../utils/alfaFileConfirmation.ts';
const digest='a'.repeat(64);
const ids=['alfa_one','alfa_two'];
test('all original operations must be acknowledged before file completion',async()=>{
 let checked;
 const result=await confirmAlfaFile(digest,async()=>ids,async values=>{checked=values;return true;},()=>true);
 assert.deepEqual(checked,ids);
 assert.deepEqual(result,{status:'confirmed',requested:2,fileSha256:digest});
 assert.deepEqual(await confirmAlfaFile(digest,async()=>ids,async()=>false,()=>true),{status:'incomplete'});
});
test('verification failure is distinct from a failed financial write',async()=>{
 for(const [read,check] of [[async()=>{throw Error('parse failure')},async()=>true],[async()=>ids,async()=>{throw Error('network failure')}]] ){
  assert.deepEqual(await confirmAlfaFile(digest,read,check,()=>true),{status:'unverified'});
 }
});
test('empty or invalid identity cannot produce deletion acknowledgment',async()=>{
 let calls=0;
 const check=async()=>{calls++;return true;};
 assert.deepEqual(await confirmAlfaFile(digest,async()=>[],check,()=>true),{status:'unverified'});
 assert.deepEqual(await confirmAlfaFile('',async()=>ids,check,()=>true),{status:'unverified'});
 assert.equal(calls,0);
});
test('account or file replacement while awaiting verification cancels acknowledgment',async()=>{
 let current=true,calls=0;
 const check=async()=>{calls++;return true;};
 assert.deepEqual(await confirmAlfaFile(digest,async()=>{current=false;return ids;},check,()=>current),{status:'superseded'});
 assert.equal(calls,0);
 current=true;
 assert.deepEqual(await confirmAlfaFile(digest,async()=>ids,async()=>{current=false;return true;},()=>current),{status:'superseded'});
});
