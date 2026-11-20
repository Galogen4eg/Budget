import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingMerchantCategories, matchMerchantBrand } from '../utils/merchantCategoryCatalog.ts';

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

test('recognizes raw Alfa Magnit delivery and in-store strings', () => {
  for (const raw of ['Krasnodar/MAGNIT DOSTAVKA_YM', 'Yaroslavl/MAGNIT MM IPOZHUKA']) {
    assert.deepEqual(matchMerchantBrand(raw, defaults), {
      categoryId: 'grocery_magnit',
      brandName: 'Магнит',
      isSubcategory: true,
      parentCategoryId: 'food'
    });
  }
});
test('recognizes Pyaterochka and PizzaFabrika with separators and case', () => {
  assert.equal(matchMerchantBrand('Yaroslavl/PYATEROCHKA', defaults)?.categoryId, 'grocery_pyaterochka');
  assert.equal(matchMerchantBrand('PIZZA FABRIKA.RU', defaults)?.categoryId, 'fastfood_pizzafabrika');
  assert.equal(matchMerchantBrand('Пицца-Фабрика', defaults)?.categoryId, 'fastfood_pizzafabrika');
});
test('before migration brand falls back to its parent, never Other', () => {
  const saved = defaults.filter(c => c.id === 'food' || c.id === 'restaurants' || c.id === 'other');
  assert.equal(matchMerchantBrand('MAGNIT MM', saved)?.categoryId, 'food');
  assert.equal(matchMerchantBrand('PIZZAFABRIKA', saved)?.categoryId, 'restaurants');
});
test('uses existing custom named subcategory without duplicating it', () => {
  const saved = [
    { id: 'food', label: 'Продукты' },
    { id: 'my_magnit', label: 'Магнит', parentId: 'food' }
  ];
  assert.equal(matchMerchantBrand('MAGNIT DOSTAVKA', saved)?.categoryId, 'my_magnit');
});
test('unknown merchants are not assigned arbitrary categories', () => {
  assert.equal(matchMerchantBrand('C2C TRANSFER UNKNOWN', defaults), undefined);
});

test('does not recreate a shop subcategory when user already named it', () => {
  const saved = [
    { id: 'food', label: 'Продукты' },
    { id: 'restaurants', label: 'Рестораны' },
    { id: 'custom_magnit', label: 'Магнит', parentId: 'food' }
  ];
  assert.equal(missingMerchantCategories(defaults, saved).some(c => c.id === 'grocery_magnit'), false);
});
