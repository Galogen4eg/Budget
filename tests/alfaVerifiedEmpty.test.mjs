import test from 'node:test';
import assert from 'node:assert/strict';
import { isVerifiedEmptyAlfaSheets } from '../utils/alfaRowValidation.ts';
import { assertAlfaReviewResult } from '../utils/alfaReviewPlan.ts';
const header=['Дата','Время','Сумма','Тип','Описание','Номер карты','Номер счета','Валюта','MCC код','Категория'];
test('only an exact recognized bank header and blank rows are verified empty',()=>{
 assert.equal(isVerifiedEmptyAlfaSheets([[header], [[],['','']]]),true);
 assert.equal(isVerifiedEmptyAlfaSheets([[[],header,['','']]]),true);
 for(const sheets of [[],[[]],[[['Дата','Сумма']]],[ [header,['','',0]] ],[[header,['bad row']]],[[header],[['unexpected']]],[[['intro'],header]],[[[...header,'unknown']]],[[[...header,'Дата']]],[[header,['Итого','',100]]]])assert.equal(isVerifiedEmptyAlfaSheets(sheets),false,JSON.stringify(sheets));
});
test('a zero-row acknowledgment needs explicit verified-empty proof and matching hash',()=>{
 const sha='a'.repeat(64),zero={fileSha256:sha,requested:0,created:0,existing:0,queued:0,unverified:0};
 assert.throws(()=>assertAlfaReviewResult(zero,sha));
 assert.doesNotThrow(()=>assertAlfaReviewResult({...zero,emptyVerified:true},sha));
 assert.throws(()=>assertAlfaReviewResult({...zero,emptyVerified:true},'b'.repeat(64)));
 assert.throws(()=>assertAlfaReviewResult({...zero,emptyVerified:true,requested:1,existing:1},sha));
 assert.throws(()=>assertAlfaReviewResult({...zero,emptyVerified:true,created:1},sha));
});
