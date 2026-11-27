import test from 'node:test';
import assert from 'node:assert/strict';
import {accountLoginFromEmail,normalizeAccountLogin} from '../utils/accountIdentity.ts';
test('login reflects auth email, including legacy alias',()=>{
 assert.equal(accountLoginFromEmail('qa@example.test'),'qa@example.test');
 assert.equal(accountLoginFromEmail('family-2@family.local'),'family-2');
 assert.equal(accountLoginFromEmail(''),'');
});
test('validate login without accepting display names',()=>{
 for(const [input,expected] of [[' QA@example.test ','qa@example.test'],['Family-2','family-2@family.local'],['QA b',null],['a@@b.test',null],['',null],['a@example',null]])assert.equal(normalizeAccountLogin(input),expected);
});
