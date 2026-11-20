import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveImportMemberId } from '../utils/importMemberIdentity.ts';

const family = [
  { id: 'first', userId: 'user-one', name: 'Первый', color: '#aaa' },
  { id: 'second', userId: 'user-two', name: 'Второй', color: '#bbb' }
];

test('bank operations belong to the actual signed-in user, never the first family member', () => {
  assert.equal(resolveImportMemberId(family, 'user-two'), 'second');
  assert.equal(resolveImportMemberId(family, 'user-one'), 'first');
});
test('rejects missing or unlinked account instead of assigning another person expenses', () => {
  assert.throws(() => resolveImportMemberId(family, 'unknown'), /профил/i);
  assert.throws(() => resolveImportMemberId(family, null), /Войдите/i);
});
test('rejects duplicated userId mapping instead of silently assigning financial data', () => {
  const wrong = [...family, { id: 'duplicate', userId: 'user-two', name: 'Дубликат', color: '#000' }];
  assert.throws(() => resolveImportMemberId(wrong, 'user-two'), /несколько/i);
});
