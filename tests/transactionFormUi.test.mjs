import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/AddTransactionModal.tsx', import.meta.url), 'utf8');

test('new transaction never defaults to another family member', () => {
  assert.doesNotMatch(source, /myMember \? myMember\.id : \(members\[0\]\?\.id \|\| ''\)/);
  assert.match(source, /return myMember\?\.id \|\| ''/);
  assert.match(source, /if \(!members\.some\(m => m\.id === memberId\)\)/);
});
test('transaction dialog fits a short phone viewport', () => {
  assert.doesNotMatch(source, /min-h-\[580px\]/);
  assert.match(source, /min-h-0/);
  assert.match(source, /overflow-y-auto/);
});
test('amount and date fields have accessible names', () => {
  assert.match(source, /aria-label="Сумма операции"/);
  assert.match(source, /aria-label="Дата операции"/);
});
test('save and cancellation controls are usable on touch devices', () => {
  assert.match(source, /min-h-\[44px\]/);
  assert.match(source, /focus-visible:ring-2/);
});
