import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveQuickExpenseMember } from '../utils/quickExpenseMember.ts';

const members = [
  {id:'first',userId:'uid-1',name:'Первый'},
  {id:'second',userId:'uid-2',name:'Второй'}
];
test('all-members filter credits the signed-in member, not the first profile',()=>{
  assert.equal(resolveQuickExpenseMember(members,'uid-2','all'),'second');
});
test('explicit member selection is honored only for existing member',()=>{
  assert.equal(resolveQuickExpenseMember(members,'uid-2','first'),'first');
  assert.throws(()=>resolveQuickExpenseMember(members,'uid-2','absent'),/не найден/);
});
test('unbound account never attributes expense to another user',()=>{
  assert.throws(()=>resolveQuickExpenseMember(members,'unbound','all'),/привязан/);
  assert.throws(()=>resolveQuickExpenseMember(members,null,'all'),/Войдите/);
});
test('ambiguous bindings do not silently select a profile',()=>{
  assert.throws(()=>resolveQuickExpenseMember([...members,{id:'another',userId:'uid-2'}],'uid-2','all'),/несколько/);
});
