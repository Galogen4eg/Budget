import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingMerchantCategories } from '../utils/merchantCategoryCatalog.ts';

const defaults = [
  { id: 'food', label: 'Продукты', icon: 'Basket', color: '#000' },
  { id: 'restaurants', label: 'Кафе', icon: 'Fork', color: '#111' },
  { id: 'grocery_magnit', label: 'Магнит', parentId: 'food', icon: 'Basket', color: '#000' },
  { id: 'grocery_pyaterochka', label: 'Пятерочка', parentId: 'food', icon: 'Basket', color: '#000' },
  { id: 'fastfood_pizzafabrika', label: 'ПиццаФабрика', parentId: 'restaurants', icon: 'Fork', color: '#111' },
  { id: 'other', label: 'Прочее', icon: 'More', color: '#222' },
  { id: 'custom', label: 'Моя категория', icon: 'Star', color: '#333' }
];

test('restores missing store categories with their parents', () => {
  assert.deepEqual(
    missingMerchantCategories(defaults, [{ id: 'other', label: 'Прочее' }]).map(c => c.id),
    ['food', 'restaurants', 'grocery_magnit', 'grocery_pyaterochka', 'fastfood_pizzafabrika']
  );
});
test('does not replace existing customized categories', () => {
  const saved = [
    { id: 'food', label: 'Моя еда' },
    { id: 'grocery_magnit', label: 'Магнит у дома', parentId: 'food' },
    { id: 'restaurants', label: 'Рестораны' }
  ];
  assert.deepEqual(
    missingMerchantCategories(defaults, saved).map(c => c.id),
    ['grocery_pyaterochka', 'fastfood_pizzafabrika']
  );
});
test('idempotent when family catalog is complete', () => {
  assert.deepEqual(missingMerchantCategories(defaults, defaults), []);
});
test('does not restore unrelated deleted user categories', () => {
  assert.equal(missingMerchantCategories(defaults, []).some(c => c.id === 'custom' || c.id === 'other'), false);
});
