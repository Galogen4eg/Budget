import test from 'node:test';
import assert from 'node:assert/strict';
import { transactionSaveError } from '../utils/transactionSaveError.ts';

test('quota exhaustion is distinguishable from a generic transaction failure and does not encourage retries', () => {
  const message = transactionSaveError({ code: 'firestore/resource-exhausted', message: 'private-id' });
  assert.match(message, /resource-exhausted/);
  assert.match(message, /лимит/);
  assert.doesNotMatch(message, /private-id|TX-SAVE|Повторите попытку/);
});

test('every documented previously unclassified Firestore failure has a safe diagnostic code', () => {
  for (const code of ['invalid-argument', 'already-exists', 'cancelled', 'internal', 'unknown', 'data-loss', 'out-of-range', 'unimplemented']) {
    const message = transactionSaveError({ code, message: 'private-id' });
    assert.ok(message.includes('(' + code + ')'), code);
    assert.doesNotMatch(message, /private-id|TX-SAVE/);
  }
});

test('ambiguous server failures do not claim that the write definitely failed', () => {
  for (const code of ['unavailable', 'deadline-exceeded', 'internal', 'unknown', 'cancelled', 'data-loss']) {
    const message = transactionSaveError({ code });
    assert.match(message, /проверьте историю/i, code);
    assert.doesNotMatch(message, /^Операция не сохранена/, code);
  }
});

test('local form and post-submit failures are distinguished without leaking arbitrary exception data', () => {
  assert.match(transactionSaveError(new RangeError('private-id'), 'prepare'), /TX-PREPARE-RANGE/);
  assert.match(transactionSaveError(new TypeError('private-id'), 'submit'), /TX-SAVE-TYPE/);
  assert.match(transactionSaveError(new Error('private-id'), 'after-submit'), /TX-AFTER-SAVE/);
  assert.match(transactionSaveError(new Error('private-id'), 'after-submit'), /сохранена/);
  for (const phase of ['prepare', 'submit', 'after-submit']) {
    const message = transactionSaveError({ code: 'private-id', message: 'private-id' }, phase);
    assert.doesNotMatch(message, /private-id/);
  }
});

test('existing permission and consistency diagnostics remain intact', () => {
  assert.match(transactionSaveError({ code: 'permission-denied', message: 'private-id' }), /permission-denied/);
  assert.match(transactionSaveError(new Error('Накопительная цель недоступна')), /Накопительная цель недоступна/);
  assert.match(transactionSaveError(new Error('private-id')), /TX-SAVE/);
  assert.doesNotMatch(transactionSaveError(new Error('private-id')), /private-id/);
});
