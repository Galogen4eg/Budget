import test from 'node:test';
import assert from 'node:assert/strict';
import {privateAmount,privatePercentage} from '../utils/financialPrivacy.ts';
import {readFileSync} from 'node:fs';
test('private amount never invokes formatter or exposes numeric value',()=>{
 assert.equal(privateAmount(987654.32,true,()=>{throw Error('must not format')}),'•••');
 assert.equal(privateAmount(987654.32,false,String),'987654.32');
 assert.equal(privatePercentage(83,true),0);
 assert.equal(privatePercentage(83,false),83);
});
test('debt UI masks balances, status strings, ratios and payoff results',()=>{
 const s=readFileSync(new URL('../components/DebtSnowball.tsx',import.meta.url),'utf8');
 assert.match(s,/privateAmount\(value,Boolean\(settings.privacyMode\)/);
 assert.match(s,/settings.privacyMode\?\(paymentStatus.isPaid/);
 assert.match(s,/settings.privacyMode\?'•••':overallProgress/);
 assert.match(s,/settings.privacyMode\?<p role="status"/);
 assert.match(s,/!settings.privacyMode && mode === 'auto' && scheduleData.length/);
});
