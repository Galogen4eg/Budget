import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alfaOperationId } from '../utils/alfaIdentity.ts';

const fields = ['2026-11-19T09:00:00.000Z', 500, 'expense', 'Покупка', 'card-one', 'RUB'];
test('stable id for identical operation', async () => {
  assert.equal(await alfaOperationId(fields, 1), await alfaOperationId([...fields], 1));
});
test('different occurrence preserves legitimate identical operations', async () => {
  assert.notEqual(await alfaOperationId(fields, 1), await alfaOperationId(fields, 2));
});
test('different account has different id', async () => {
  assert.notEqual(await alfaOperationId(fields, 1), await alfaOperationId([...fields.slice(0, 4), 'card-two', 'RUB'], 1));
});
test('different type has different id', async () => {
  assert.notEqual(await alfaOperationId(fields, 1), await alfaOperationId([...fields.slice(0, 2), 'income', ...fields.slice(3)], 1));
});
test('does not expose bank identifiers in id', async () => {
  const id = await alfaOperationId(fields, 1);
  assert.match(id, /^alfa_[a-f0-9]{40}$/);
  assert.equal(id.includes('card-one'), false);
});
test('rejects invalid occurrence', async () => {
  await assert.rejects(alfaOperationId(fields, 0), /Invalid operation/);
});
