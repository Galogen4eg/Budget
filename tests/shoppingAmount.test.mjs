import test from 'node:test';
import assert from 'node:assert/strict';
import { nextShoppingAmount, shoppingQuantityStep, parseShoppingQuantity } from '../utils/shoppingAmount.ts';

test('adds quantities in tenths without floating drift', () => {
  assert.equal(nextShoppingAmount('1,2', 0.3, 1), '1.5');
  assert.equal(nextShoppingAmount('1.1', 0.2, 1), '1.3');
});

test('minimum differs between mobile and desktop', () => {
  assert.equal(nextShoppingAmount('1', -5, 1), '1');
  assert.equal(nextShoppingAmount('1', -5, 0.5), '0.5');
});

test('invalid persisted amount defaults to one', () => {
  assert.equal(nextShoppingAmount('invalid', 1, 1), '2');
});

test('refuses non-finite deltas', () => {
  assert.throws(() => nextShoppingAmount('1', Number.NaN, 1));
});

test('iteration 75: kilograms and litres use 0.5, pieces and packages use 1 everywhere',()=>{
 for(const unit of ['кг','л']) {
  const step=shoppingQuantityStep(unit);
  assert.equal(step,0.5);
  assert.equal(nextShoppingAmount('1', -step, step),'0.5');
  assert.equal(nextShoppingAmount('1', step, step),'1.5');
 }
 for(const unit of ['шт','уп','г','бут',undefined]){
  const step=shoppingQuantityStep(unit);
  assert.equal(step,1);
  assert.equal(nextShoppingAmount('1',-step,step),'1');
  assert.equal(nextShoppingAmount('1',step,step),'2');
 }
});

test('iteration 75: validate only positive shopping quantities with one decimal place',()=>{
 assert.equal(parseShoppingQuantity('1,5'),'1.5');
 assert.equal(parseShoppingQuantity('0.5'),'0.5');
 assert.equal(parseShoppingQuantity('2'),'2');
 for(const invalid of ['','0','-1','0.01','1.01','1abc','Infinity','10001',Number.NaN]){
  assert.equal(parseShoppingQuantity(invalid),null,String(invalid));
 }
});
