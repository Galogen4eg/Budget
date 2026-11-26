import test from 'node:test';
import assert from 'node:assert/strict';
import {transactionSaveError} from '../utils/transactionSaveError.ts';
test('network and unknown errors do not assert failed writes',()=>{
 for(const code of ['unavailable','deadline-exceeded','unknown','internal','cancelled','resource-exhausted']){
  const message=transactionSaveError({code,message:'PRIVATE TOKEN'});
  assert.doesNotMatch(message,/не сохранена|PRIVATE TOKEN/);
  assert.match(message,/историю/);
 }
 assert.match(transactionSaveError(new Error('PRIVATE TOKEN')),/Сохранение не подтверждено/);
});
test('confirmed denial is distinct from uncertainty',()=>{
 assert.match(transactionSaveError({code:'firestore/permission-denied'}),/нет прав на запись/);
 assert.match(transactionSaveError({code:'unauthenticated'}),/повторный вход/);
});
test('preparation and post-commit failures report the correct phase without leaking payload',()=>{
 assert.match(transactionSaveError(new RangeError('secret'),'prepare'),/TX-PREPARE-RANGE/);
 assert.match(transactionSaveError(new Error('secret'),'after-submit'),/Операция сохранена/);
 assert.doesNotMatch(transactionSaveError(new Error('secret'),'after-submit'),/secret|повторите/);
});
