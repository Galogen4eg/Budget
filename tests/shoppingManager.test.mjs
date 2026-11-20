import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeOrRestoreShoppingItems, recordCommittedShoppingEvents } from '../utils/shoppingManager.ts';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
  clear: () => storage.clear()
};
const storageKey = 'family_frequent_purchases_stats_v1';
const incoming = title => ({ title, amount: '1', category: 'food', unit: 'шт', memberId: 'a' });

test('shopping merge does not update purchase statistics before persistence', () => {
  storage.clear();
  const result = mergeOrRestoreShoppingItems([], [incoming('Гречка')], 'a');
  assert.equal(storage.has(storageKey), false);
  assert.equal(result.itemsToAddInDb.length, 1);
  assert.equal(result.purchaseEvents.length, 1);
  recordCommittedShoppingEvents(result.purchaseEvents);
  const stats = JSON.parse(storage.get(storageKey));
  assert.equal(stats['гречка'].addedCount, 1);
});

test('failed write leaves purchase events staged and statistics unchanged', () => {
  storage.clear();
  const result = mergeOrRestoreShoppingItems([], [incoming('Молоко')], 'a');
  assert.equal(result.purchaseEvents.length, 1);
  assert.equal(storage.has(storageKey), false);
  // Do not call recordCommittedShoppingEvents when persistence rejects.
  assert.equal(storage.has(storageKey), false);
});

test('restoring bought item records both restored and added only on commit', () => {
  storage.clear();
  const current = [{ ...incoming('Хлеб'), id: 'bread', completed: true }];
  const result = mergeOrRestoreShoppingItems(current, [incoming('Хлеб')], 'a');
  assert.deepEqual(result.purchaseEvents.map(e => e[1]), ['restored', 'added']);
  assert.equal(storage.has(storageKey), false);
  recordCommittedShoppingEvents(result.purchaseEvents);
  const stats = JSON.parse(storage.get(storageKey));
  assert.equal(stats['хлеб'].restoredCount, 1);
  assert.equal(stats['хлеб'].addedCount, 1);
});
