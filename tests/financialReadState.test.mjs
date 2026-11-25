import test from 'node:test';
import assert from 'node:assert/strict';
import { initialFinancialRead, updateFinancialRead, financialReadStatus } from '../utils/financialReadState.ts';
test('loading and cached empty data are never considered confirmed',()=>{
 let state=initialFinancialRead('a');
 assert.equal(financialReadStatus(state,'a',true),'loading');
 state=updateFinancialRead(state,'a','transactions','stale');
 assert.equal(financialReadStatus(state,'a',true),'stale');
});
test('all three collections and settings must be confirmed, including an empty server snapshot',()=>{
 let state=initialFinancialRead('a');
 for(const key of ['transactions','goals','debts'])state=updateFinancialRead(state,'a',key,'ready');
 assert.equal(financialReadStatus(state,'a',false),'loading');
 assert.equal(financialReadStatus(state,'a',true),'ready');
 assert.equal(financialReadStatus(state,'b',true),'loading');
 assert.equal(financialReadStatus(state,null,false),'ready');
});
test('error takes precedence; obsolete callbacks cannot overwrite another account',()=>{
 let state=initialFinancialRead('b');
 assert.equal(updateFinancialRead(state,'a','transactions','ready'),state);
 state=updateFinancialRead(state,'b','debts','error');
 assert.equal(financialReadStatus(state,'b',false),'error');
});
