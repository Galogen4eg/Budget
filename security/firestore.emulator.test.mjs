import { readFileSync } from 'node:fs';
import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, writeBatch, runTransaction, arrayUnion } from 'firebase/firestore';

const projectId = 'demo-budget-security';
const family = 'owner1';
const rules = readFileSync(new URL('./firestore.rules.draft', import.meta.url), 'utf8');
let env;

const auth = (uid, email, verified = true) =>
  env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const user = () => auth('owner1', 'owner@example.com');
const stranger = () => auth('stranger', 'stranger@example.com');
const invited = (verified = true) => auth('invited1', 'guest@example.com', verified);

const seed = async () => {
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'families', family), { ownerId: 'owner1', members: ['owner1'], name: 'Family' });
    await setDoc(doc(db, 'families', family, 'members', 'owner1'), {
      id: 'owner1', userId: 'owner1', name: 'Owner', color: '#111', isAdmin: true
    });
    await setDoc(doc(db, 'users', 'owner1'), { familyId: family });
    await setDoc(doc(db, 'families', family, 'transactions', 't1'), { amount: 120, type: 'expense' });
  });
};

before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});
after(async () => {
  if (env) await env.cleanup();
});

test('a family member may access shared transactions, an outsider may not', async () => {
  await assertSucceeds(getDoc(doc(user(), 'families', family, 'transactions', 't1')));
  await assertFails(getDoc(doc(stranger(), 'families', family, 'transactions', 't1')));
  await assertFails(setDoc(doc(stranger(), 'families', family, 'transactions', 't1'), { amount: 1 }));
});

test('outsider may not forge a new family member in a family document', async () => {
  await assertFails(setDoc(doc(stranger(), 'families', family), { members: arrayUnion('stranger') }, { merge: true }));
});

test('owner can create invitation with placeholder in same batch', async () => {
  const db = user();
  const batch = writeBatch(db);
  batch.set(doc(db, 'families', family, 'members', 'pending'), {
    id: 'pending', name: 'Guest', color: '#222', email: 'guest@example.com'
  });
  batch.set(doc(db, 'invitations', 'guest@example.com'), {
    familyId: family, placeholderMemberId: 'pending', email: 'guest@example.com', createdAt: 'now'
  });
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(invited(), 'invitations', 'guest@example.com')));
  await assertFails(getDoc(doc(invited(false), 'invitations', 'guest@example.com')));
  await assertFails(getDoc(doc(stranger(), 'invitations', 'guest@example.com')));
  // A second family cannot overwrite this email-keyed invitation.
  await assertFails(setDoc(doc(user(), 'invitations', 'guest@example.com'), { email: 'guest@example.com', familyId: family }));
});

test('verified invitee joins and consumes the invitation transactionally', async () => {
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'families', family, 'members', 'pending'), {
      id: 'pending', name: 'Guest', color: '#222', email: 'guest@example.com'
    });
    await setDoc(doc(ctx.firestore(), 'invitations', 'guest@example.com'), {
      familyId: family, placeholderMemberId: 'pending', email: 'guest@example.com'
    });
  });
  const db = invited();
  await assertSucceeds(runTransaction(db, async tx => {
    const familyRef = doc(db, 'families', family);
    const inviteRef = doc(db, 'invitations', 'guest@example.com');
    const memberRef = doc(db, 'families', family, 'members', 'pending');
    const userRef = doc(db, 'users', 'invited1');
    await tx.get(familyRef);
    await tx.get(inviteRef);
    await tx.get(userRef);
    await tx.get(memberRef);
    tx.update(familyRef, { members: arrayUnion('invited1') });
    tx.set(userRef, { email: 'guest@example.com', familyId: family });
    tx.set(memberRef, { userId: 'invited1', isAdmin: false }, { merge: true });
    tx.delete(inviteRef);
  }));
  await assertSucceeds(getDoc(doc(db, 'families', family, 'transactions', 't1')));
  await assertFails(getDoc(doc(stranger(), 'families', family, 'transactions', 't1')));
});

test('unverified recipient cannot claim membership with matching email', async () => {
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'invitations', 'guest@example.com'), {
      familyId: family, placeholderMemberId: 'pending', email: 'guest@example.com'
    });
  });
  await assertFails(getDoc(doc(invited(false), 'families', family)));
  await assertFails(setDoc(doc(invited(false), 'families', family), {
    members: arrayUnion('invited1')
  }, { merge: true }));
});

test('legacy owner without verified email can keep using existing family', async () => {
  const db = auth('owner1', 'old@family.local', false);
  await assertSucceeds(getDoc(doc(db, 'families', family, 'transactions', 't1')));
});
