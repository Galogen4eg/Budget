import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectFirestoreEmulator, terminate, doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { saveTransactionWithGoal, deleteTransactionWithGoal } from '../utils/db';
import { monthlyMoneyTotals } from '../utils/budgetFinancialMath';
import type { Transaction, SavingsGoal } from '../types';

// These tests MUST NEVER contact a real Firebase project.
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') {
  throw new Error('Refusing CRUD test without the local Firestore Emulator');
}
connectFirestoreEmulator(db, '127.0.0.1', 8080);
after(async () => { await terminate(db); });
const createFamily = () => 'crud-ci-' + randomUUID();
const transaction = (id: string, amount: number, memberId='papa'): Transaction => ({
  id, amount, memberId, category: 'food', note: 'Test expense',
  type: 'expense', date: '2026-11-23T12:00:00.000Z'
});
const goal = (id: string, currentAmount=100): SavingsGoal => ({
  id, title: 'Test savings', targetAmount: 1000,
  currentAmount, icon: 'wallet', color: '#4A7C59'
});
const transactionRef = (family: string, id: string) => doc(db, 'families', family, 'transactions', id);
const goalRef = (family: string, id: string) => doc(db, 'families', family, 'goals', id);

test('Firestore emulator: create, edit, delete and recompute family totals in kopecks', async () => {
  const family=createFamily();
  const a=transaction('a', 0.1);
  const b={...transaction('b', 0.2, 'mama'), type:'income' as const};
  await saveTransactionWithGoal(family,a,false);
  await saveTransactionWithGoal(family,b,false);
  assert.equal((await getDoc(transactionRef(family,'a'))).data()?.amount,0.1);
  assert.equal((await getDoc(transactionRef(family,'b'))).data()?.memberId,'mama');
  let rows=(await getDocs(collection(db,'families',family,'transactions'))).docs.map(d=>d.data() as Transaction);
  assert.deepEqual(monthlyMoneyTotals(rows),{income:0.2,expense:0.1,net:0.1});
  await saveTransactionWithGoal(family,{...a,amount:10.55,note:'Edited'},true);
  assert.equal((await getDoc(transactionRef(family,'a'))).data()?.note,'Edited');
  rows=(await getDocs(collection(db,'families',family,'transactions'))).docs.map(d=>d.data() as Transaction);
  assert.deepEqual(monthlyMoneyTotals(rows),{income:0.2,expense:10.55,net:-10.35});
  await deleteTransactionWithGoal(family,'a');
  assert.equal((await getDoc(transactionRef(family,'a'))).exists(),false);
  assert.equal((await getDoc(transactionRef(family,'b'))).exists(),true);
});

test('Firestore emulator: duplicate create and stale edit/delete are rejected without mutation', async () => {
  const family=createFamily();
  const a=transaction('unique',125.25);
  await saveTransactionWithGoal(family,a,false);
  await assert.rejects(saveTransactionWithGoal(family,{...a,amount:999},false),/существует/);
  assert.equal((await getDoc(transactionRef(family,'unique'))).data()?.amount,125.25);
  await assert.rejects(saveTransactionWithGoal(family,transaction('missing',10),true),/удалена/);
  await deleteTransactionWithGoal(family,'unique');
  await assert.rejects(deleteTransactionWithGoal(family,'unique'),/удалена/);
});

test('Firestore emulator: goal transfers move between goals with identical amount and undo on delete', async () => {
  const family=createFamily();
  await setDoc(goalRef(family,'g1'),goal('g1',100));
  await setDoc(goalRef(family,'g2'),goal('g2',200));
  const transfer={...transaction('transfer',20.15),category:'savings',linkedGoalId:'g1'};
  await saveTransactionWithGoal(family,transfer,false);
  assert.equal((await getDoc(goalRef(family,'g1'))).data()?.currentAmount,120.15);
  await saveTransactionWithGoal(family,{...transfer,linkedGoalId:'g2'},true);
  assert.equal((await getDoc(goalRef(family,'g1'))).data()?.currentAmount,100);
  assert.equal((await getDoc(goalRef(family,'g2'))).data()?.currentAmount,220.15);
  await deleteTransactionWithGoal(family,'transfer');
  assert.equal((await getDoc(goalRef(family,'g2'))).data()?.currentAmount,200);
  assert.equal((await getDoc(transactionRef(family,'transfer'))).exists(),false);
});

test('Firestore emulator: missing savings target refuses new write and preserves data', async () => {
  const family=createFamily();
  const t={...transaction('bad-transfer',50),category:'savings',linkedGoalId:'absent-goal'};
  await assert.rejects(saveTransactionWithGoal(family,t,false),/удалена/);
  assert.equal((await getDoc(transactionRef(family,'bad-transfer'))).exists(),false);
});
