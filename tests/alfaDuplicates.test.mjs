import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAlfaOperationDuplicate } from '../utils/alfaDuplicates.ts';

const operation = {
  id: 'alfa_1111111111111111111111111111111111111111',
  amount: 500,
  type: 'expense',
  date: '2026-11-21T09:30:00.000Z',
  note: 'Пятёрочка',
  rawNote: 'Пятёрочка',
};

test('same bank operation ID is a duplicate regardless of renamed merchant', () => {
  assert.equal(isAlfaOperationDuplicate([{...operation,note:'Продукты'}],operation),true);
});

test('different bank operation IDs remain separate even with identical time, sum, and merchant', () => {
  const other = {...operation,id:'alfa_2222222222222222222222222222222222222222'};
  assert.equal(isAlfaOperationDuplicate([other],operation),false);
});

test('legacy manual transactions without bank IDs still use conservative fallback', () => {
  const legacy = {...operation,id:'manual-legacy'};
  assert.equal(isAlfaOperationDuplicate([legacy],operation),true);
});

test('legacy fallback requires matching type, amount, time and merchant', () => {
  const legacy = {...operation,id:'legacy',type:'income'};
  assert.equal(isAlfaOperationDuplicate([legacy],operation),false);
});

test('no existing transaction means not a duplicate', () => {
  assert.equal(isAlfaOperationDuplicate([],operation),false);
});
