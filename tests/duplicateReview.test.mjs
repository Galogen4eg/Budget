import test from 'node:test';
import assert from 'node:assert/strict';
import { isPotentialDuplicate } from '../utils/duplicateReview.ts';

const base={
 id:'alfa_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 date:'2026-11-21T10:00:00.000Z',amount:400,type:'expense',
 note:'Пятерочка',rawNote:'Пятерочка'
};
test('two stable Alfa IDs represent different purchases even if amount, time and merchant match',()=>{
 const second={...base,id:'alfa_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'};
 assert.equal(isPotentialDuplicate(base,second),false);
});
test('legacy import of same operation can still be shown for MANUAL review',()=>{
 assert.equal(isPotentialDuplicate({...base,id:'manual-1'},base),true);
});
test('different amounts, directions and descriptions are not potential duplicates',()=>{
 assert.equal(isPotentialDuplicate(base,{...base,id:'legacy',amount:401}),false);
 assert.equal(isPotentialDuplicate(base,{...base,id:'legacy',type:'income'}),false);
 assert.equal(isPotentialDuplicate(base,{...base,id:'legacy',note:'Аптека',rawNote:'Аптека'}),false);
});
test('two empty descriptions never qualify',()=>{
 assert.equal(isPotentialDuplicate({...base,id:'a',note:'',rawNote:''},{...base,id:'b',note:'',rawNote:''}),false);
});
test('same merchant 48 hours apart is not a possible duplicate',()=>{
 assert.equal(isPotentialDuplicate(base,{...base,id:'legacy',date:'2026-11-23T10:00:00.000Z'}),false);
});
