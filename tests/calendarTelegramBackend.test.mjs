import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {encryptSecret,decryptSecret,validateCalendarSnapshot} from '../lib/calendarTelegramBackend.js';

test('Vercel queues have an isolated function glob, preserving standard API routes',()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.ok(config.functions['api/*.js']);
 assert.deepEqual(config.functions['api/queue/*.js']?.experimentalTriggers,
   [{type:'queue/v2beta',topic:'budget-calendar-telegram-reminders'}]);
 assert.ok(existsSync(new URL('../api/queue/calendar-telegram-run.js',import.meta.url)));
 assert.equal(existsSync(new URL('../api/calendar-telegram-run.js',import.meta.url)),false);
});
test('Telegram token encryption is reversible and detects tampering',()=>{
 const previous=process.env.CRON_SECRET;
 process.env.CRON_SECRET='test-secret-should-never-leave-test';
 try{
  const encrypted=encryptSecret('123456:abcDEF');
  assert.notEqual(encrypted,'123456:abcDEF');
  assert.equal(decryptSecret(encrypted),'123456:abcDEF');
  const parts=encrypted.split('.');
  const bytes=Buffer.from(parts[2],'base64url');bytes[0]^=1;
  assert.throws(()=>decryptSecret([parts[0],parts[1],bytes.toString('base64url')].join('.')));
 }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});
test('family calendar snapshots discard unrelated expense fields and private notes',()=>{
 const result=validateCalendarSnapshot({familyId:'family',events:[{
  id:'e1',title:'Appointment',date:'2026-11-22',time:'10:00',reminders:[15],memberIds:[],
  secret:'do-not-send',description:'private note'
 }],members:[{id:'m1',userId:'u1',secret:'x'}],payments:[],paid:{}});
 assert.equal(result.events[0].secret,undefined);
 assert.equal(result.events[0].description,undefined);
 assert.equal(result.members[0].secret,undefined);
});
