import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alfaBankCategoryToCanonicalId as classify } from '../utils/alfaBankCategory.ts';
for (const [label, expected] of [
  ['Супермаркеты', 'food'],
  ['Продукты', 'food'],
  ['Кафе и рестораны', 'restaurants'],
  ['Переводы', 'transfer'],
  ['Переводы по СБП', 'transfer'],
  ['Общественный транспорт', 'transport'],
  ['Такси', 'taxi'],
  ['АЗС', 'fuel'],
  ['Зарплата', 'salary'],
  ['Выплата больничного', 'benefits'],
  ['Пособия', 'benefits'],
  ['Кэшбэк', 'income_cashback'],
  ['Начисление процентов по вкладу', 'income_interest'],
  ['Аптеки', 'pharmacy'],
  ['Одежда', 'clothes'],
  ['Электроника', 'electronics'],
  ['Цветы', 'gifts'],
  ['Налоги', 'taxes'],
  ['Прочее', undefined],
  ['Финансовые операции', undefined],
  ['Платежи', undefined],
  ['', undefined],
  ['Кафе и транспорт', undefined],
]) test('bank category: '+label, () => assert.equal(classify(label), expected));
