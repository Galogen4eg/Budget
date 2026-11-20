import test from 'node:test';
import assert from 'node:assert/strict';
import { planMemberMutations, validateMemberMutation } from '../utils/memberMutations.ts';

const owner = {id:'owner',userId:'u1',name:'Оля',color:'#111',email:'olya@example.com'};
const partner = {id:'partner',userId:'u2',name:'Ваня',color:'#222'};
const original = [owner,partner];

test('editing one member only changes requested fields, never overwrites other profiles', () => {
  const changes = planMemberMutations(original, [{...owner,name:'Ольга'},partner]);
  assert.deepEqual(changes.map(c=>({id:c.id,updates:c.updates})),[{id:'owner',updates:{name:'Ольга'}}]);
  assert.deepEqual(validateMemberMutation(changes[0], {...owner,color:'#333'}, 'u1','olya@example.com'),{name:'Ольга'});
});
test('rejects stale changes to the same field', () => {
  const [change] = planMemberMutations(original, [{...owner,name:'Ольга'},partner]);
  assert.throws(()=>validateMemberMutation(change,{...owner,name:'Кто-то другой'},'u1','olya@example.com'),/измен/);
});
test('cannot steal the other user identity even with a stale local snapshot', () => {
  const [change]=planMemberMutations([{id:'free',name:'Свободен',color:'#abc'}],[{id:'free',userId:'u1',name:'Свободен',color:'#abc'}]);
  assert.throws(()=>validateMemberMutation(change,{id:'free',userId:'u2',name:'Свободен',color:'#abc'},'u1',null),/измен|принадлеж/);
});
test('only signed-in user may bind or release their own profile', () => {
  const [change]=planMemberMutations(original,[{...owner,userId:null},partner]);
  assert.deepEqual(validateMemberMutation(change,owner,'u1','olya@example.com'),{userId:null});
  assert.throws(()=>validateMemberMutation(change,owner,'u2','other@example.com'),/чужого/);
});
test('cannot claim reserved email profile with another email',()=>{
  const reserved={id:'pending',name:'Приглашённый',color:'#000',email:'invite@example.com'};
  const [change]=planMemberMutations([reserved],[{...reserved,userId:'u1'}]);
  assert.throws(()=>validateMemberMutation(change,reserved,'u1','notinvite@example.com'),/приглаш/);
});
test('rejects adding and deleting members through profile-editor batch',()=>{
  assert.throws(()=>planMemberMutations(original,[owner]),/состав/);
  assert.throws(()=>planMemberMutations(original,[...original,{id:'new',name:'Новый',color:'#000'}]),/состав/);
});
