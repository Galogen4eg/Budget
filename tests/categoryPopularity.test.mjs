import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countCategoryUsage, sortCategoriesByPopularity } from '../utils/categoryPopularity.ts';

const categories = [
  { id: 'food', label: 'Продукты' },
  { id: 'restaurants', label: 'Рестораны' },
  { id: 'magnit', label: 'Магнит', parentId: 'food' },
  { id: 'pyaterochka', label: 'Пятерочка', parentId: 'food' },
  { id: 'pizza', label: 'ПиццаФабрика', parentId: 'restaurants' },
  { id: 'other', label: 'Прочее' }
];
test('parent popularity includes its child transactions', () => {
  const ranked = sortCategoriesByPopularity(categories, {
    magnit: 8, pyaterochka: 3, pizza: 4, restaurants: 1
  }).filter(c => !c.parentId && c.id !== 'other');
  assert.deepEqual(ranked.map(c => c.id), ['food', 'restaurants']);
});
test('subcategories are sorted by their own use', () => {
  const ranked = sortCategoriesByPopularity(categories, {
    magnit: 2, pyaterochka: 7
  }).filter(c => c.parentId === 'food');
  assert.deepEqual(ranked.map(c => c.id), ['pyaterochka', 'magnit']);
});
test('usage counts one operation once, preferring a valid subcategory', () => {
  const counts = countCategoryUsage([
    { category: 'food', subcategory: 'magnit' },
    { category: 'food', subcategory: 'magnit' },
    { category: 'food', subcategory: 'unknown' },
    { category: 'other' }
  ], categories);
  assert.deepEqual(counts, { magnit: 2, food: 1 });
});
test('equal popularity uses stable Russian alphabetical order without mutating input', () => {
  const input = [categories[1], categories[0]];
  const result = sortCategoriesByPopularity(input, {});
  assert.deepEqual(result.map(c => c.id), ['food', 'restaurants']);
  assert.equal(input[0].id, 'restaurants');
});
