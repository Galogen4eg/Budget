import test from 'node:test';
import assert from 'node:assert/strict';
import { bindFamilyProfile } from '../utils/familyProfileBinding.ts';

const members = [
  {id:'a',name:'Первый',userId:'user-a'},
  {id:'b',name:'Второй',userId:'user-b'},
  {id:'c',name:'Свободный',userId:null}
];

test('cannot silently take over another signed-in account profile',()=>{
 assert.throws(()=>bindFamilyProfile(members,'user-a','b'),/другому аккаунту/i);
 assert.deepEqual(members.map(m=>m.userId),['user-a','user-b',null]);
});
test('can bind unclaimed profile and release only own old profile',()=>{
 const next=bindFamilyProfile(members,'user-a','c');
 assert.deepEqual(next.map(m=>m.userId),[null,'user-b','user-a']);
});
test('selecting currently assigned profile preserves ownership',()=>{
 assert.deepEqual(bindFamilyProfile(members,'user-b','b'),members);
});
test('guest mode unlinks only the current account',()=>{
 const next=bindFamilyProfile(members,'user-a','guest');
 assert.deepEqual(next.map(m=>m.userId),[null,'user-b',null]);
});
test('signed-out session and missing profile never modify mappings',()=>{
 assert.throws(()=>bindFamilyProfile(members,null,'c'),/Войдите/);
 assert.throws(()=>bindFamilyProfile(members,'user-a','does-not-exist'),/не найден/i);
});
test('duplicate stale bindings for current user are cleared when rebinding',()=>{
 const broken=[...members,{id:'d',userId:'user-a'}];
 const next=bindFamilyProfile(broken,'user-a','c');
 assert.deepEqual(next.map(m=>m.userId),[null,'user-b','user-a',null]);
});
