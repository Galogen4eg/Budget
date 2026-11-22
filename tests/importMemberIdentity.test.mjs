import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveImportMemberId, assertImportRowsBelongToMember } from '../utils/importMemberIdentity.ts';

const family = [
  { id: 'first', userId: 'user-one', name: 'Первый', color: '#aaa' },
  { id: 'second', userId: 'user-two', name: 'Второй', color: '#bbb' }
];

test('bank statement is always attributed to authenticated family profile', () => {
  assert.equal(resolveImportMemberId(family, 'user-two'), 'second');
  assert.equal(resolveImportMemberId(family, 'user-one'), 'first');
});
test('unlinked or signed-out accounts cannot import other family members bank statements', () => {
  assert.throws(() => resolveImportMemberId(family, 'unknown'), /профил/i);
  assert.throws(() => resolveImportMemberId(family, null), /Войдите/i);
});
test('ambiguous account mapping must not silently select one profile', () => {
  assert.throws(() => resolveImportMemberId([...family, {...family[1],id:'third'}], 'user-two'), /несколько/i);
});
test('preview is revalidated before a Firestore write', () => {
  assert.doesNotThrow(() => assertImportRowsBelongToMember([{memberId:'second'}], 'second'));
  assert.throws(() => assertImportRowsBelongToMember([{memberId:'first'}], 'second'), /другой участник/i);
  assert.throws(() => assertImportRowsBelongToMember([{memberId:''}], 'second'), /другой участник/i);
});
