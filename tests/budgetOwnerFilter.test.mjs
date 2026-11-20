import test from 'node:test';
import assert from 'node:assert/strict';
import { filterByBudgetOwner, filterMandatoryByBudgetOwner } from '../utils/budgetOwnerFilter.ts';

const transactions = [
  { id: 'a', memberId: 'member-a', amount: 100, type: 'expense' },
  { id: 'b', memberId: 'member-b', amount: 200, type: 'expense' },
  { id: 'shared', amount: 50, type: 'expense' }
];
const members = [
  { id: 'member-a', userId: 'uid-a' },
  { id: 'member-b', userId: 'uid-b' }
];

test('family mode preserves all transactions', () => {
  assert.deepEqual(filterByBudgetOwner(transactions, 'family', members, 'uid-a'), transactions);
});

test('personal mode shows only transactions linked to authenticated profile', () => {
  assert.deepEqual(filterByBudgetOwner(transactions, 'personal', members, 'uid-b').map(x => x.id), ['b']);
});

test('unbound or missing account cannot silently see entire family in personal view', () => {
  assert.deepEqual(filterByBudgetOwner(transactions, 'personal', members, 'missing'), []);
  assert.deepEqual(filterByBudgetOwner(transactions, 'personal', members, null), []);
});

test('personal mandatory expenses include only own and unassigned items when mapped', () => {
  assert.deepEqual(
    filterMandatoryByBudgetOwner(transactions, 'personal', members, 'uid-a').map(x => x.id),
    ['a', 'shared']
  );
});

test('unbound personal mode does not expose every member\'s mandatory expenses', () => {
  assert.deepEqual(filterMandatoryByBudgetOwner(transactions, 'personal', members, 'missing'), []);
});

test('explicit member filter remains strict and higher priority', () => {
  assert.deepEqual(filterMandatoryByBudgetOwner(transactions, 'family', members, 'uid-a', 'member-b').map(x => x.id), ['b']);
  assert.deepEqual(filterMandatoryByBudgetOwner(transactions, 'personal', members, 'uid-a', 'member-b').map(x => x.id), ['b']);
});
