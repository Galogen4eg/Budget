import test from 'node:test';
import assert from 'node:assert/strict';
import {parseQuickShoppingInput,parseSingleQuickShoppingText,createShoppingItemsFromQuickText} from '../utils/quickShoppingParser.ts';
const tuple=item=>[item.title,item.amount,item.unit];
test('decimal comma does not split a product and preview matches persisted item quantities',()=>{
 const raw='молоко 1,5 л, сыр 25 г; хлеб 2 шт';
 const expected=[['Молоко','1.5','л'],['Сыр','25','г'],['Хлеб','2','шт']];
 assert.deepEqual(parseQuickShoppingInput(raw).map(tuple),expected);
 assert.deepEqual(createShoppingItemsFromQuickText(raw,'person-a').map(tuple),expected);
});
test('explicit pieces override automatic liquid or weight inference',()=>{
 assert.deepEqual(tuple(parseSingleQuickShoppingText('молоко 2 шт')),['Молоко','2','шт']);
 assert.deepEqual(tuple(parseSingleQuickShoppingText('яблоки 3 шт')),['Яблоки','3','шт']);
});
test('gram quantities remain precise, preserving existing tenth-kg convention',()=>{
 assert.deepEqual(tuple(parseSingleQuickShoppingText('сыр 25 г')),['Сыр','25','г']);
 assert.deepEqual(tuple(parseSingleQuickShoppingText('сыр 125 г')),['Сыр','125','г']);
 assert.deepEqual(tuple(parseSingleQuickShoppingText('сыр 300 г')),['Сыр','0.3','кг']);
 assert.deepEqual(tuple(parseSingleQuickShoppingText('сыр 0,125 кг')),['Сыр','0.125','кг']);
});
