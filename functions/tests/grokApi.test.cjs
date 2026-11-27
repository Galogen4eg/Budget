const test=require('node:test');
const assert=require('node:assert/strict');
const {requestXai,GrokError,MODEL}=require('../grokService.cjs');
test('real xAI transport sends only a bearer key and stateless bounded Responses API request',async()=>{
 const input=[{role:'user',content:'Return OK'}];let called;
 const value=await requestXai('xai-fake-test-key',input,true,1000,async(url,options)=>{
  called={url,headers:options.headers,body:JSON.parse(options.body),signal:options.signal};
  return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'OK'}]}]})};
 });
 assert.equal(value,'OK');assert.equal(called.url,'https://api.x.ai/v1/responses');
 assert.equal(called.headers.Authorization,'Bearer xai-fake-test-key');assert.equal(called.body.model,MODEL);
 assert.equal(called.body.store,false);assert.equal(called.body.reasoning.effort,'none');assert.ok(called.body.max_output_tokens<=24);
 assert.deepEqual(called.body.input,input);assert.equal(JSON.stringify(called.body).includes('xai-fake-test-key'),false);
});
test('upstream raw error body is never echoed; incomplete results fail closed',async()=>{
 for(const [status,code] of [[401,'invalid-key'],[403,'invalid-key'],[429,'quota'],[402,'billing'],[500,'unavailable'],[400,'model-error']]){
  await assert.rejects(requestXai('test-secret',[],false,1000,async()=>({ok:false,status,json:async()=>({error:'test-secret'})})),{code});
 }
 await assert.rejects(requestXai('test-secret',[],false,1000,async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})})),{code:'model-error'});
});
test('HTTP handler requires verified Firebase identity and ignores caller supplied uid',async()=>{
 const {createGrokHandler}=await import('../../api/grok.js');
 let call;
 const handler=createGrokHandler(()=>({verifyToken:async token=>{if(token!=='valid')throw Error('invalid');return {uid:'owner'};},service:async(uid,body)=>{call={uid,body};return {enabled:false,keys:[]};}}));
 async function invoke(headers,body){
  const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(v){this.body=v;return this;},end(){return this;}};
  await handler({method:'POST',headers,body},res);return res;
 }
 assert.equal((await invoke({}, {action:'status'})).code,401);assert.equal(call,undefined);
 assert.equal((await invoke({authorization:'Bearer invalid'}, {action:'status'})).code,401);assert.equal(call,undefined);
 const result=await invoke({authorization:'Bearer valid'},{action:'status',uid:'victim'});
 assert.equal(result.code,200);assert.equal(call.uid,'owner');assert.equal(result.headers['Cache-Control'],'no-store');
});
