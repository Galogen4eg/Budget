import { readFileSync } from 'node:fs';
import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, writeBatch, runTransaction, arrayUnion, collection, getDocs } from 'firebase/firestore';

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
    await setDoc(doc(db, 'families', 'otherfamily'), { ownerId: 'otherowner', members: ['otherowner'] });
    await setDoc(doc(db, 'families', 'otherfamily', 'accounts', 'a1'), { balance: 1000 });
  });
};

const createInvite = async () => {
  const db = user();
  const batch = writeBatch(db);
  batch.set(doc(db, 'families', family, 'members', 'pending'), {
    id: 'pending', name: 'Guest', color: '#222', email: 'guest@example.com'
  });
  batch.set(doc(db, 'invitations', 'guest@example.com'), {
    familyId: family, placeholderMemberId: 'pending', email: 'guest@example.com', createdAt: 'now'
  });
  await assertSucceeds(batch.commit());
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
  await createInvite();
  await assertSucceeds(getDoc(doc(invited(), 'invitations', 'guest@example.com')));
  await assertFails(getDoc(doc(invited(false), 'invitations', 'guest@example.com')));
  await assertFails(getDoc(doc(stranger(), 'invitations', 'guest@example.com')));
  // A second family cannot overwrite this email-keyed invitation.
  await assertFails(setDoc(doc(user(), 'invitations', 'guest@example.com'), { email: 'guest@example.com', familyId: family }));
});

const acceptInvite = async () => {
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
  return db;
};

test('verified invitee joins and consumes the invitation transactionally', async () => {
  await createInvite();
  const db = await acceptInvite();
  await assertSucceeds(getDoc(doc(db, 'families', family, 'transactions', 't1')));
  await assertFails(getDoc(doc(stranger(), 'families', family, 'transactions', 't1')));
});

test('unverified recipient cannot claim membership with matching email', async () => {
  await createInvite();
  await assertFails(getDoc(doc(invited(false), 'families', family)));
  await assertFails(setDoc(doc(invited(false), 'families', family), {
    members: arrayUnion('invited1')
  }, { merge: true }));
});

test('legacy owner without verified email can keep using existing family', async () => {
  const db = auth('owner1', 'old@family.local', false);
  await assertSucceeds(getDoc(doc(db, 'families', family, 'transactions', 't1')));
});

test('owner can cancel pending invitation; recipient cannot join afterwards', async () => {
  await createInvite();
  const db = user();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'families', family, 'members', 'pending'));
  batch.delete(doc(db, 'invitations', 'guest@example.com'));
  await assertSucceeds(batch.commit());
  const inviteeDb = invited();
  await assertFails(getDoc(doc(inviteeDb, 'families', family)));
  await assertSucceeds(getDoc(doc(db, 'families', family, 'transactions', 't1')));
});

test('removed user loses family data even if their users document still points to family', async () => {
  await createInvite();
  const inviteeDb = await acceptInvite();
  await assertSucceeds(getDoc(doc(inviteeDb, 'families', family, 'transactions', 't1')));
  await assertSucceeds(setDoc(doc(user(), 'families', family), { members: ['owner1'] }, { merge: true }));
  await assertSucceeds(getDoc(doc(inviteeDb, 'users', 'invited1')));
  await assertFails(getDoc(doc(inviteeDb, 'families', family, 'transactions', 't1')));
});

test('new user can create their personal family and initial documents in a batch', async () => {
  const db = auth('newowner', 'newowner@example.com', false);
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', 'newowner'), { email: 'newowner@example.com', familyId: 'newowner' });
  batch.set(doc(db, 'families', 'newowner'), {
    ownerId: 'newowner', name: 'My family', members: ['newowner']
  });
  batch.set(doc(db, 'families', 'newowner', 'members', 'newowner'), {
    id: 'newowner', userId: 'newowner', name: 'New', isAdmin: true, color: '#111'
  });
  batch.set(doc(db, 'families', 'newowner', 'config', 'settings'), {
    familyName: 'My family', currency: '₽'
  });
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(db, 'families', 'newowner')));
});

test('global learned rule collection is readable but cannot be changed by a member', async () => {
  await assertSucceeds(getDoc(doc(user(), 'global_rules', 'any')));
  await assertFails(setDoc(doc(user(), 'global_rules', 'any'), { keyword: 'poison' }));
});

test('new account can read its absent personal family document before initialization', async () => {
  const db = auth('brandnew', 'brandnew@example.com', false);
  const snapshot = await assertSucceeds(getDoc(doc(db, 'families', 'brandnew')));
  assert.equal(snapshot.exists(), false);
});

test('member can edit shared accounts, goals, transactions, and shopping but outsider cannot', async () => {
  for (const collectionName of ['transactions', 'goals', 'shopping', 'accounts', 'debts', 'events', 'pantry']) {
    const path = ['families', family, collectionName, 'entry'];
    await assertSucceeds(setDoc(doc(user(), ...path), { amount: 10 }));
    await assertFails(getDoc(doc(stranger(), ...path)));
    await assertFails(setDoc(doc(stranger(), ...path), { amount: 900 }));
  }
});

test('member personal settings are private, shared settings are available to family', async () => {
  const memberConfig = ['families', family, 'members', 'owner1', 'config', 'settings'];
  const sharedConfig = ['families', family, 'config', 'settings'];
  await assertSucceeds(setDoc(doc(user(), ...memberConfig), { theme: 'dark' }));
  await assertSucceeds(setDoc(doc(user(), ...sharedConfig), { currency: '₽' }));
  await assertFails(getDoc(doc(stranger(), ...memberConfig)));
  await assertFails(getDoc(doc(stranger(), ...sharedConfig)));
});

test('a stranger cannot read member profiles nor enumerate family invitations', async () => {
  await assertFails(getDocs(collection(stranger(), 'families', family, 'members')));
  await assertFails(getDocs(collection(stranger(), 'invitations')));
});

test('family member cannot overwrite or delete an unrelated family account', async () => {
  await assertFails(getDoc(doc(user(), 'families', 'otherfamily', 'accounts', 'a1')));
  await assertFails(setDoc(doc(user(), 'families', 'otherfamily', 'accounts', 'a1'), { balance: 0 }));
});

test('bulk Alfa import with 450 operations stays available to family member', async () => {
  const db = user();
  const batch = writeBatch(db);
  for (let i = 0; i < 450; i++) {
    batch.set(doc(db, 'families', family, 'transactions', 'alfa_test_' + i), {
      type: 'expense', amount: i + 1, date: '2026-11-20'
    });
  }
  await assertSucceeds(batch.commit());
  const snapshot = await assertSucceeds(getDocs(collection(db, 'families', family, 'transactions')));
  assert.equal(snapshot.size, 451);
});

test('legacy family owner can access its old records while strangers remain excluded', async () => {
  const legacyId = 'legacy-custom-family';
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'families', legacyId), {
      ownerId: 'owner1', name: 'Old family'
    });
    await setDoc(doc(db, 'families', legacyId, 'transactions', 'legacy-tx'), { amount: 350 });
  });
  await assertSucceeds(getDoc(doc(user(), 'families', legacyId)));
  await assertSucceeds(getDoc(doc(user(), 'families', legacyId, 'transactions', 'legacy-tx')));
  await assertFails(getDoc(doc(stranger(), 'families', legacyId, 'transactions', 'legacy-tx')));
});

test('family chat messages are readable and writable by members but inaccessible to outsiders', async () => {
  const messageRef = doc(user(), 'families', family, 'chat', 'msg1');
  await assertSucceeds(setDoc(messageRef, { id: 'msg1', topicId: 'general', text: 'Привет', userId: 'owner1', timestamp: 1 }));
  await assertSucceeds(getDoc(messageRef));
  await assertFails(getDoc(doc(stranger(), 'families', family, 'chat', 'msg1')));
  await assertFails(setDoc(doc(stranger(), 'families', family, 'chat', 'msg1'), { text: 'Чужое' }));
});
