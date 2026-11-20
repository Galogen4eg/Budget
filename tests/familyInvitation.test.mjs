import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareFamilyMemberInvitation, validateUnclaimedMemberRemoval } from '../utils/familyInvitation.ts';

const member = { id: 'member-2', name: 'Анна', email: '  Anna@Example.com ', color: '#007AFF' };

test('normalizes invitation email and preserves the member ID for joining', () => {
  const result = prepareFamilyMemberInvitation('family-1', member, []);
  assert.equal(result.member.email, 'anna@example.com');
  assert.deepEqual(result.invitation, { familyId: 'family-1', placeholderMemberId: 'member-2', email: 'anna@example.com' });
});

test('creates a family profile without invitation if email is absent', () => {
  const result = prepareFamilyMemberInvitation('family-1', { ...member, email: undefined }, []);
  assert.equal(result.invitation, null);
  assert.equal(result.member.id, 'member-2');
});

test('rejects an existing member email instead of overriding another invitation', () => {
  assert.throws(() => prepareFamilyMemberInvitation('family-1', member, [
    { id: 'existing', name: 'Anna', email: 'anna@example.com', color: '#000000' }
  ]), /уже/i);
});

test('rejects duplicate member IDs, invalid email and missing family', () => {
  assert.throws(() => prepareFamilyMemberInvitation('family-1', member, [member]), /уже/i);
  assert.throws(() => prepareFamilyMemberInvitation('family-1', { ...member, email: 'invalid' }, []), /email/i);
  assert.throws(() => prepareFamilyMemberInvitation('', member, []), /семейн/i);
});

test('remove unclaimed profile and its matching invitation', () => {
  const invitation = { familyId: 'family-1', placeholderMemberId: 'member-2' };
  assert.equal(validateUnclaimedMemberRemoval('family-1', member, invitation), true);
  assert.equal(validateUnclaimedMemberRemoval('family-1', { ...member, email: undefined }, null), false);
});

test('never delete an active or admin family member', () => {
  assert.throws(() => validateUnclaimedMemberRemoval('family-1', { ...member, userId: 'uid2' }, null), /аккаунт/);
  assert.throws(() => validateUnclaimedMemberRemoval('family-1', { ...member, isAdmin: true }, null), /администратор/);
  assert.equal(validateUnclaimedMemberRemoval('family-1', member, { familyId: 'other-family', placeholderMemberId: 'member-2' }), false);
});
