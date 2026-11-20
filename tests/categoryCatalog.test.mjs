import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoriesForType, isCategoryForType, missingIncomeCategories } from '../utils/categoryCatalog.ts';

const catalog = [
  { id: 'income', label: 'Доходы', transactionType: 'income' },
  { id: 'salary', label: 'Зарплата', parentId: 'income' },
  { id: 'benefits', label: 'Больничные', parentId: 'income' },
  { id: 'food', label: 'Продукты' },
  { id: 'magnit', label: 'Магнит', parentId: 'food' },
  { id: 'transfer', label: 'Переводы' },
  { id: 'transfer_sbp', label: 'СБП', parentId: 'transfer' },
  { id: 'custom_income', label: 'Доход от услуг', transactionType: 'income' },
  { id: 'other', label: 'Прочее' }
];
test('sick leave and salary appear for income, shopping never does', () => {
  const ids = categoriesForType(catalog, 'income').map(c => c.id);
  assert.ok(ids.includes('benefits'));
  assert.ok(ids.includes('salary'));
  assert.ok(ids.includes('custom_income'));
  assert.ok(ids.includes('transfer_sbp'));
  assert.ok(!ids.includes('food'));
  assert.ok(!ids.includes('magnit'));
});
test('expense picker excludes income categories', () => {
  const ids = categoriesForType(catalog, 'expense').map(c => c.id);
  assert.ok(ids.includes('food'));
  assert.ok(ids.includes('magnit'));
  assert.ok(!ids.includes('salary'));
  assert.ok(!ids.includes('benefits'));
});
test('legacy salary ID is still income even when saved without a parent', () => {
  assert.ok(isCategoryForType('salary', [{ id: 'salary', label: 'Зарплата' }], 'income'));
});
test('restore only missing income IDs without rewriting saved family definitions', () => {
  const missing = missingIncomeCategories(catalog, [{ id: 'salary', label: 'Моя зарплата' }]);
  assert.deepEqual(missing.map(c => c.id), ['income', 'benefits']);
});
