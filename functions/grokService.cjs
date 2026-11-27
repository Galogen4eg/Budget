const {createCipheriv,createDecipheriv,randomBytes,randomUUID}=require('node:crypto');

const MODEL='grok-4.3';
const MAX_KEYS=3;
class GrokError extends Error{
 constructor(code,status){super(code);this.code=code;this.status=status;}
}
const err=(code,status)=>new GrokError(code,status);
function sealKey(secret,uid,id,key){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,iv);
 cipher.setAAD(Buffer.from(uid+':'+id));
 const encrypted=Buffer.concat([cipher.update(key,'utf8'),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');
}
function openKey(secret,uid,id,value){
 const buf=Buffer.from(value,'base64'),decipher=createDecipheriv('aes-256-gcm',secret,buf.subarray(0,12));
 decipher.setAAD(Buffer.from(uid+':'+id));decipher.setAuthTag(buf.subarray(12,28));
 return Buffer.concat([decipher.update(buf.subarray(28)),decipher.final()]).toString('utf8');
}
function stateOf(value){
 return {enabled:value?.enabled===true,activeId:value?.activeId??null,keys:Array.isArray(value?.keys)?value.keys:[]};
}
function readyState(value){
 const s=stateOf(value);
 const active=s.keys.find(k=>k.id===s.activeId&&k.state==='ready')??s.keys.find(k=>k.state==='ready');
 return {...s,activeId:active?.id??null};
}
function publicStatus(value){
 const s=readyState(value);
 return {enabled:s.enabled,activeId:s.activeId,model:MODEL,keys:s.keys.map(({id,last4,state,checkedAt})=>({id,last4,state,checkedAt}))};
}
function keyValue(value){
 const k=typeof value==='string'?value.trim():'';
 if(k.length<12||k.length>512||/\s|[\x00-\x1f\x7f]/.test(k))throw err('bad-request',400);
 return k;
}
function messagesValue(value){
 if(!Array.isArray(value)||!value.length||value.length>8||value.some((m,i)=>!m||!['user','assistant','system'].includes(m.role)||(m.role==='system'&&i!==0)||typeof m.content!=='string'||!m.content.trim())||value.at(-1)?.role!=='user')throw err('bad-request',400);
 if(value.reduce((n,m)=>n+m.content.length,0)>60000)throw err('bad-request',400);
 return value.map(({role,content})=>({role,content}));
}
async function requestXai(key,input,probe,timeout=probe?12000:22000,fetcher=fetch){
 let response;
 try{
  response=await fetcher('https://api.x.ai/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,input,store:false,reasoning:{effort:'none'},max_output_tokens:probe?24:1800,...(probe?{}:{text:{format:{type:'json_object'}}})}),signal:AbortSignal.timeout(timeout)});
 }catch{throw err('unavailable',503);}
 if(!response.ok){
  if(response.status===401||response.status===403)throw err('invalid-key',response.status);
  if(response.status===429)throw err('quota',429);
  if(response.status===402)throw err('billing',402);
  if(response.status>=500)throw err('unavailable',503);
  throw err('model-error',422);
 }
 let data;
 try{data=await response.json();}catch{throw err('model-error',422);}
 const text=(Array.isArray(data.output)?data.output:[]).filter(o=>o.type==='message').flatMap(o=>Array.isArray(o.content)?o.content:[]).filter(c=>c.type==='output_text'&&typeof c.text==='string').map(c=>c.text).join('').trim();
 if(data.status!=='completed'||!text)throw err('model-error',422);
 return text;
}
const isAuthError=e=>e instanceof GrokError&&e.code==='invalid-key';
function createGrokService({store,secret,request=requestXai,now=Date.now}){
 if(!Buffer.isBuffer(secret)||secret.length!==32)throw Error('Missing encryption configuration');
 return async function grok(uid,body){
  if(typeof uid!=='string'||!uid||!body||typeof body!=='object'||Array.isArray(body))throw err('bad-request',400);
  const read=async()=>readyState(await store.read(uid));
  const change=async fn=>readyState(await store.change(uid,raw=>readyState(fn(readyState(raw)))));
  const lookup=(s,id)=>{const k=s.keys.find(k=>k.id===id);if(!k)throw err('not-found',404);return k;};
  const decrypted=k=>openKey(secret,uid,k.id,k.encrypted);
  const probe=async key=>{
   const text=await request(key,[{role:'user',content:'Return only the two uppercase letters OK.'}],true,12000);
   if(text.trim()!=='OK')throw err('model-error',422);
  };
  if(body.action==='status')return publicStatus(await read());
  if(body.action==='add'){
   const key=keyValue(body.key),before=await read();
   if(before.keys.length>=MAX_KEYS&&!before.keys.some(k=>decrypted(k)===key))throw err('key-limit',409);
   await probe(key);
   const id=randomUUID(),encrypted=sealKey(secret,uid,id,key),checkedAt=now();
   return publicStatus(await change(s=>{
    const duplicate=s.keys.find(k=>decrypted(k)===key);
    if(duplicate)return {...s,enabled:true,keys:s.keys.map(k=>k.id===duplicate.id?{...k,state:'ready',checkedAt}:k)};
    if(s.keys.length>=MAX_KEYS)throw err('key-limit',409);
    return {...s,enabled:true,keys:[...s.keys,{id,last4:key.slice(-4),encrypted,state:'ready',checkedAt}]};
   }));
  }
  if(body.action==='toggle'){
   if(typeof body.enabled!=='boolean')throw err('bad-request',400);
   return publicStatus(await change(s=>{
    if(body.enabled&&!s.activeId)throw err('no-working-key',409);
    return {...s,enabled:body.enabled};
   }));
  }
  if(body.action==='remove'){
   return publicStatus(await change(s=>{lookup(s,body.id);return {...s,keys:s.keys.filter(k=>k.id!==body.id)};}));
  }
  if(body.action==='recheck'){
   const k=lookup(await read(),body.id);
   try{await probe(decrypted(k));}
   catch(e){
    if(isAuthError(e))await change(s=>({...s,keys:s.keys.map(v=>v.id===k.id?{...v,state:'invalid',checkedAt:now()}:v)}));
    throw e;
   }
   return publicStatus(await change(s=>({...s,keys:s.keys.map(v=>v.id===k.id?{...v,state:'ready',checkedAt:now()}:v)})));
  }
  if(body.action==='query'){
   const input=messagesValue(body.messages),s=await read();
   if(!s.enabled)throw err('disabled',409);
   const keys=s.keys.filter(k=>k.state==='ready').sort((a,b)=>Number(b.id===s.activeId)-Number(a.id===s.activeId));
   const deadline=now()+23500;
   for(const k of keys){
    const time=deadline-now();if(time<500)throw err('unavailable',503);
    let text;
    try{text=await request(decrypted(k),input,false,Math.min(time,22000));}
    catch(e){
     if(!isAuthError(e))throw e;
     await change(current=>({...current,keys:current.keys.map(v=>v.id===k.id?{...v,state:'invalid',checkedAt:now()}:v)}));
     continue;
    }
    const latest=await change(current=>({...current,activeId:current.keys.some(v=>v.id===k.id&&v.state==='ready')?k.id:current.activeId}));
    return {text,status:publicStatus(latest)};
   }
   throw err('no-working-key',409);
  }
  throw err('bad-request',400);
 };
}
module.exports={MODEL,MAX_KEYS,GrokError,sealKey,openKey,createGrokService,requestXai};
