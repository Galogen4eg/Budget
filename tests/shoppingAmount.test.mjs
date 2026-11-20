import test from 'node:test';
import assert from 'node:assert/strict';
import { nextShoppingAmount } from '../utils/shoppingAmount.ts';

test('adds quantities in tenths without floating drift', () => {
  assert.equal(nextShoppingAmount('1,2', 0.3, 1), '1.5');
  assert.equal(nextShoppingAmount('1.1', 0.2, 1), '1.3');
});

test('minimum differs between mobile and desktop', () => {
  assert.equal(nextShoppingAmount('1', -5, 1), '1');
  assert.equal(nextShoppingAmount('1', -5, 0.5), '0.5');
});

test('invalid persisted amount defaults to one', () => {
  assert.equal(nextShoppingAmount('invalid', 1, 1), '2');
});

test('refuses non-finite deltas', () => {
  assert.throws(() => nextShoppingAmount('1', Number.NaN, 1));
});
