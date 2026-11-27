const test=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {createGrokService,sealKey,openKey,GrokError}=require('../grokService.cjs');
const K1='xai-test-key-one-123456',K2='xai-test-key-two-abcdef';
function fixture(){
 const docs=new Map(),calls=[],outcomes=new Map(),secret=randomBytes(32);
 const store={read:async uid=>structuredClone(docs.get(uid)),change:async(uid,fn)=>{const next=fn(structuredClone(docs.get(uid)));docs.set(uid,structuredClone(next));return next;}};
 const request=async(key,input,probe)=>{calls.push({key,input,probe});const result=outcomes.get(key);if(result instanceof Error)throw result;return probe?'OK':result??'{"action":"general_chat","reply":"Ответ"}';};
 return {service:createGrokService({store,secret,request}),docs,calls,outcomes,secret};
}
test('keys are encrypted with independent IV and account binding, and cannot be returned by status',async()=>{
 const {service,docs,secret}=fixture();
 const a=sealKey(secret,'u','id',K1),b=sealKey(secret,'u','id',K1);
 assert.notEqual(a,b);assert.equal(openKey(secret,'u','id',a),K1);
 assert.throws(()=>openKey(secret,'another','id',a));
 const status=await service('u',{action:'add',key:K1});
 assert.equal(status.enabled,true);assert.equal(status.keys[0].state,'ready');
 assert.equal(status.keys[0].last4,K1.slice(-4));assert.equal(status.activeId,status.keys[0].id);
 assert.ok(!JSON.stringify(status).includes(K1));assert.ok(!JSON.stringify(docs.get('u')).includes(K1));
 assert.equal((await service('another',{action:'status'})).keys.length,0);
});
test('failed probe is never saved and successful duplicate does not consume another slot',async()=>{
 const {service,outcomes}=fixture();
 outcomes.set(K1,new GrokError('invalid-key',401));
 await assert.rejects(service('u',{action:'add',key:K1}),{code:'invalid-key'});
 assert.equal((await service('u',{action:'status'})).keys.length,0);
 outcomes.delete(K1);
 await service('u',{action:'add',key:K1});await service('u',{action:'add',key:K1});
 assert.equal((await service('u',{action:'status'})).keys.length,1);
});
test('only verified keys are used; permanent authentication failure selects next verified key',async()=>{
 const {service,calls,outcomes}=fixture();
 await service('u',{action:'add',key:K1});await service('u',{action:'add',key:K2});
 outcomes.set(K1,new GrokError('invalid-key',401));calls.length=0;
 const r=await service('u',{action:'query',messages:[{role:'user',content:'Тест'}]});
 assert.deepEqual(calls.map(x=>x.key),[K1,K2]);
 assert.equal(r.status.keys[0].state,'invalid');
 assert.equal(r.status.activeId,r.status.keys[1].id);
 calls.length=0;await service('u',{action:'query',messages:[{role:'user',content:'Тест'}]});
 assert.deepEqual(calls.map(x=>x.key),[K2]);
});
test('quota, network and unknown failures do not rotate or resend a generation',async()=>{
 for(const error of [new GrokError('quota',429),new GrokError('unavailable',503),new GrokError('billing',402)]){
  const {service,calls,outcomes}=fixture();await service('u',{action:'add',key:K1});await service('u',{action:'add',key:K2});
  outcomes.set(K1,error);calls.length=0;
  await assert.rejects(service('u',{action:'query',messages:[{role:'user',content:'Тест'}]}),{code:error.code});
  assert.deepEqual(calls.map(x=>x.key),[K1]);
 }
});
test('disabled, removed and unverified keys never generate; explicit recheck can restore revoked key',async()=>{
 const {service,calls,outcomes}=fixture();const s=await service('u',{action:'add',key:K1});const id=s.activeId;
 await service('u',{action:'toggle',enabled:false});calls.length=0;
 await assert.rejects(service('u',{action:'query',messages:[{role:'user',content:'Тест'}]}),{code:'disabled'});
 assert.equal(calls.length,0);await service('u',{action:'toggle',enabled:true});
 outcomes.set(K1,new GrokError('invalid-key',401));
 await assert.rejects(service('u',{action:'query',messages:[{role:'user',content:'Тест'}]}),{code:'no-working-key'});
 outcomes.delete(K1);await service('u',{action:'recheck',id});
 assert.equal((await service('u',{action:'status'})).activeId,id);
 await service('u',{action:'remove',id});
 const status=await service('u',{action:'status'});assert.equal(status.enabled,true);assert.equal(status.activeId,null);
 await assert.rejects(service('u',{action:'query',messages:[{role:'user',content:'Тест'}]}),{code:'no-working-key'});
});
test('reject invalid requests and do not call xAI for malformed keys or other account identifiers',async()=>{
 const {service,calls}=fixture();
 await assert.rejects(service('u',{action:'add',key:'bad'}),{code:'bad-request'});
 await assert.rejects(service('u',{action:'query',messages:[{role:'tool',content:'a'}]}),{code:'bad-request'});
 await assert.rejects(service('u',{action:'remove',id:'missing'}),{code:'not-found'});
 assert.equal(calls.length,0);
});
