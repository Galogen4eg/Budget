import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeGrokAction} from '../utils/grokActions.ts';
const categories=[{id:'food',transactionType:'expense'},{id:'salary',transactionType:'income'}];
const transaction={action:'add_transaction',reply:'Предложение',transaction:{amount:125.45,type:'expense',categoryId:'food',note:'Продукты',date:'2026-11-27'}};
const decode=v=>decodeGrokAction(JSON.stringify(v),categories);
test('Grok accepts a valid kopeck-accurate proposal',()=>{
 assert.equal(decode(transaction).transactionPayload.amount,125.45);
});
test('Grok rejects fabricated category, mismatched type, invalid day, fractions of kopecks, and unrecognized action',()=>{
 for(const patch of [{categoryId:'fake'},{type:'income'},{date:'2026-02-31'},{amount:-1},{amount:1.234},{amount:Infinity}]){
  assert.throws(()=>decode({...transaction,transaction:{...transaction.transaction,...patch}}));
 }
 assert.throws(()=>decode({...transaction,action:'delete_all'}));
});
test('Grok prose is not interpreted as a mutation',()=>{
 const result=decode({action:'general_chat',reply:'Расход 500 рублей'});
 assert.equal(result.actionType,'general_chat');assert.equal(result.transactionPayload,undefined);
 assert.throws(()=>decode({action:'add_shopping',reply:'OK',shoppingItems:[{title:'Молоко',unit:'fake'}]}));
 assert.throws(()=>decode({action:'create_event',reply:'OK',event:{title:'Встреча',date:'2026-11-27',time:'25:00'}}));
});
