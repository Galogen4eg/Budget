import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {telegramPollEnabled,telegramQueueRecordId,TELEGRAM_POLL_MS} from '../utils/telegramSyncPolicy.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('no Telegram poll without configured chat, in personal mode or before settings',()=>{
 assert.equal(telegramPollEnabled(true,false,'',true),false);
 assert.equal(telegramPollEnabled(true,false,'123',false),false);
 assert.equal(telegramPollEnabled(false,false,'123',true),false);
 assert.equal(telegramPollEnabled(true,true,'123',true),false);
 assert.equal(telegramPollEnabled(true,false,'123',true),true);
 assert.equal(TELEGRAM_POLL_MS,30000);
 assert.equal(telegramQueueRecordId('x/y','shop',1),telegramQueueRecordId('x/y','shop',1));
 assert.notEqual(telegramQueueRecordId('x/y','shop',1),telegramQueueRecordId('x/y','shop',2));
 assert.match(telegramQueueRecordId('x/y','shop',1),/^tgq_[a-zA-Z0-9_%.-]+$/);
});
test('manifest exposes actual PNG icons with declared sizes',()=>{
 const manifest=JSON.parse(read('public/manifest.webmanifest'));
 assert.equal(manifest.display,'standalone');
 for(const n of [192,512]){
  const icon=manifest.icons.find(i=>i.type==='image/png'&&i.sizes===n+'x'+n);
  assert.ok(icon);
  const png=readFileSync(new URL('../public'+icon.src,import.meta.url));
  assert.equal(png.readUInt32BE(16),n);assert.equal(png.readUInt32BE(20),n);
 }
 assert.match(read('index.html'),/apple-touch-icon/);
});
test('worker navigates online without cache and offline returns honest fallback; does not intercept APIs',async()=>{
 const listeners={};
 let offline=false,calls=0;
 const context={URL,Response,importScripts(){},firebase:{initializeApp(){},messaging:()=>({onBackgroundMessage(){}})},self:{location:{origin:'https://terra.test'},addEventListener:(name,fn)=>listeners[name]=fn},fetch:async(req,opts)=>{calls++;assert.equal(opts.cache,'no-store');if(offline)throw Error('offline');return new Response('fresh');}};
 vm.runInNewContext(read('public/firebase-messaging-sw.js'),context);
 const dispatch=path=>{let result;listeners.fetch({request:{method:'GET',mode:'navigate',url:'https://terra.test'+path},respondWith:p=>{result=p;}});return result;};
 assert.equal(await (await dispatch('/')).text(),'fresh');
 offline=true;const fallback=await dispatch('/');
 assert.equal(fallback.status,503);assert.match(await fallback.text(),/Нет подключения/);
 assert.equal(dispatch('/api/budget-policy'),undefined);
 assert.equal(dispatch('/__/auth/handler'),undefined);
 assert.equal(calls,2);
});
test('full regression suite includes newly added test files',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.match(pkg.scripts.prebuild,/tests\/\*\.test\.mjs/);
 assert.match(pkg.scripts.prebuild,/functions\/tests\/\*\.test\.cjs/);
});
test('Telegram retries use deterministic create-if-missing writes and ACK only after success',()=>{
 const hook=read('hooks/useTelegramSync.ts');
 assert.match(hook,/String\(item.chatId\?\?''\)!==chatId/);
 assert.match(hook,/await addTelegramItemsIdempotent/);
 assert.match(hook,/processed.add\(item.id\);ackIds.push\(item.id\)/);
 assert.doesNotMatch(hook,/setShoppingItems\(prev|setTransactions\(prev|setEvents\(prev/);
 assert.match(read('utils/db.ts'),/if\(!existing\[i\]\.exists\(\)\)\{tx.set/);
});
