import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReceiptQr} from '../utils/receiptQr.ts';
import {readFileSync} from 'node:fs';
const valid='t=20261126T1435&s=1460.07&fn=9999440300645512&i=18491&fp=293810293&n=1';
test('receipt QR preserves actual kopecks, metadata and local time',()=>{assert.deepEqual(parseReceiptQr(valid),{fn:'9999440300645512',fd:'18491',fp:'293810293',date:'26.11.2026 14:35',amountKopecks:146007,operation:'1'});assert.equal(parseReceiptQr(valid.replace('1460.07','12.3')).amountKopecks,1230)});
test('receipt QR rejects missing, duplicated and malformed fiscal fields',()=>{for(const v of [valid.replace('s=1460.07&',''),valid+'&s=2',valid.replace('1460.07','12abc'),valid.replace('1460.07','0'),valid.replace('20261126','20260230'),valid.replace('T1435','T2535')])assert.throws(()=>parseReceiptQr(v))});
test('receipt UI never writes invented products to ledger',()=>{const src=readFileSync(new URL('../components/FnsReceiptScanner.tsx',import.meta.url),'utf8');assert.doesNotMatch(src,/mockItems|addItemsBatch|addItem\(|ФНС Проверен/);assert.match(src,/Подлинность не проверена/)});
