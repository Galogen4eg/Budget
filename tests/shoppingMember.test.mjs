import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveShoppingMemberId } from '../utils/shoppingMember.ts';

const members=[
 {id:'person-a',userId:'firebase-a',name:'А'},
 {id:'person-b',userId:'firebase-b',name:'Б'}
];
test('selects logged-in profile when shopping view shows all members',()=>{
 assert.equal(resolveShoppingMemberId(members,'firebase-b'),'person-b');
 assert.equal(resolveShoppingMemberId(members,'firebase-a','all'),'person-a');
});
test('permits explicitly selected known member for shared shopping',()=>{
 assert.equal(resolveShoppingMemberId(members,'firebase-b','person-a'),'person-a');
});
test('rejects missing signed-in account and unknown or ambiguous family profiles',()=>{
 assert.throws(()=>resolveShoppingMemberId(members,null),/Войдите/);
 assert.throws(()=>resolveShoppingMemberId(members,'other'),/привязан/);
 assert.throws(()=>resolveShoppingMemberId(members,'firebase-b','no-such-person'),/не найден/);
 assert.throws(()=>resolveShoppingMemberId([...members,{id:'dup',userId:'firebase-b'}],'firebase-b'),/несколько/);
});
