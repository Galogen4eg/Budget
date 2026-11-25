import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDebtOwnerForSave} from '../utils/debtOwner.ts';
test('new populated debt draft receives the authenticated member in family and personal modes',()=>{
  for(const personal of [false,true]) assert.equal(resolveDebtOwnerForSave({},'member-a',personal),'member-a');
});
test('editing preserves another member in family mode and rejects it in personal mode',()=>{
  const existing={id:'debt-1',memberId:'member-b'};
  assert.equal(resolveDebtOwnerForSave(existing,'member-a',false),'member-b');
  assert.throws(()=>resolveDebtOwnerForSave(existing,'member-a',true),/Долг недоступен/);
});
test('new debt requires a confirmed member; legacy family debt is never silently reassigned',()=>{
  assert.throws(()=>resolveDebtOwnerForSave({},undefined,false),/Долг недоступен/);
  assert.equal(resolveDebtOwnerForSave({id:'legacy'},'member-a',false),undefined);
  assert.throws(()=>resolveDebtOwnerForSave({id:'legacy'},'member-a',true),/Долг недоступен/);
});
