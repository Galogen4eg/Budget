import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAlfaDirection as classify } from '../utils/alfaDirection.ts';

for (const [name, type, expected] of [
  ['purchase', 'Покупка', 'expense'],
  ['writeoff', 'Списание', 'expense'],
  ['payment', 'Оплата', 'expense'],
  ['expense', 'Расход', 'expense'],
  ['income', 'Доход', 'income'],
  ['deposit', 'Пополнение', 'income'],
  ['refund', 'Возврат', 'income'],
  ['incoming', 'Зачисление', 'income'],
  ['cashback', 'Кэшбэк', 'income'],
]) {
  test(name, () => assert.equal(classify(type, 100, 'Сумма', true), expected));
}
test('unknown type fails closed', () => assert.throws(() => classify('Перевод', 100, 'Сумма', true), /Импорт остановлен/));
test('empty type fails closed', () => assert.throws(() => classify('', 100, 'Сумма', true), /Импорт остановлен/));
test('conflicting type fails closed', () => assert.throws(() => classify('Расход / Доход', 100, 'Сумма', true), /Импорт остановлен/));
test('negative signed legacy amount', () => assert.equal(classify('', -100, 'Сумма', false), 'expense'));
test('positive unsigned legacy amount fails closed', () => assert.throws(() => classify('', 100, 'Сумма', false), /Импорт остановлен/));
