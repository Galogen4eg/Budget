import test from 'node:test';
import assert from 'node:assert/strict';
import { bindFamilyProfile } from '../utils/familyBinding.ts';

const members = [
  { id: 'owner', userId: 'uid-owner', name: 'Владелец', color: '#123' },
  { id: 'partner', userId: 'uid-partner', name: 'Партнёр', color: '#456' },
  { id: 'available', name: 'Новый', color: '#789' }
];

test('cannot take over another signed-in user profile', () => {
  assert.throws(() => bindFamilyProfile(members, 'uid-owner', 'partner'), /другому пользователю/);
});

test('current user can bind their own profile and an unclaimed profile', () => {
  assert.deepEqual(bindFamilyProfile(members, 'uid-owner', 'owner'), members);
  const result = bindFamilyProfile(members, 'uid-owner', 'available');
  assert.equal(result.find(m => m.id === 'owner').userId, null);
  assert.equal(result.find(m => m.id === 'available').userId, 'uid-owner');
  assert.equal(result.find(m => m.id === 'partner').userId, 'uid-partner');
});

test('placeholder invited by email cannot be claimed by a different account', () => {
  const reserved = [...members, { id: 'invited', email: 'partner@example.com', name: 'Приглашённый', color: '#abc' }];
  assert.throws(() => bindFamilyProfile(reserved, 'uid-owner', 'invited', 'owner@example.com'), /зарезервирован/);
  const updated = bindFamilyProfile(reserved, 'uid-new', 'invited', 'PARTNER@example.com');
  assert.equal(updated.find(m => m.id === 'invited').userId, 'uid-new');
});

test('guest mode clears only the current user mapping', () => {
  const result = bindFamilyProfile(members, 'uid-owner', 'guest');
  assert.equal(result.find(m => m.id === 'owner').userId, null);
  assert.equal(result.find(m => m.id === 'partner').userId, 'uid-partner');
});

test('cannot bind without a user or to a nonexistent profile', () => {
  assert.throws(() => bindFamilyProfile(members, null, 'available'), /Войдите/);
  assert.throws(() => bindFamilyProfile(members, 'uid-owner', 'missing'), /не найден/);
});
