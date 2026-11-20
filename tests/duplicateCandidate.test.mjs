import test from 'node:test';
import assert from 'node:assert/strict';
import { arePotentialDuplicates } from '../utils/duplicateCandidate.ts';

const base={
 id:'first', date:'2026-11-20T10:00:00Z', amount:500, type:'expense',
 memberId:'person-one',note:'Покупка хлеба',rawNote:''
};
test('empty raw notes cannot turn different purchases into duplicates',()=>{
 assert.equal(arePotentialDuplicates(base,{...base,id:'second',note:'Транспорт'}),false);
});
test('different family member purchases cannot be treated as one duplicate',()=>{
 assert.equal(arePotentialDuplicates(base,{...base,id:'second',memberId:'person-two'}),false);
});
test('exactly matching description and member identify plausible duplicates',()=>{
 assert.equal(arePotentialDuplicates(base,{...base,id:'second'}),true);
});
test('matching nonblank raw bank description also identifies plausible duplicates',()=>{
 const first={...base,rawNote:'POS 12345'};
 assert.equal(arePotentialDuplicates(first,{...first,id:'second',note:'Другое имя'}),true);
});
test('different amounts, directions, long gaps, and missing owner are not duplicates',()=>{
 assert.equal(arePotentialDuplicates(base,{...base,id:'second',amount:501}),false);
 assert.equal(arePotentialDuplicates(base,{...base,id:'second',type:'income'}),false);
 assert.equal(arePotentialDuplicates(base,{...base,id:'second',date:'2026-11-23T10:00:00Z'}),false);
 assert.equal(arePotentialDuplicates({...base,memberId:''},{...base,id:'second',memberId:''}),false);
});
