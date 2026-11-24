import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../components/'+name+'.tsx',import.meta.url),'utf8');
test('debt UI does not advertise fabricated financial projections or autopay',()=>{assert.doesNotMatch(read('DebtSnowball'),/Безопасно \(24%\)|\+1\.2% в этом мес\.|Автосписание настроено|18 400 ₽|extraPaymentAmount \* 3\.6/);});
test('wallet does not claim unsupported integration or security features',()=>{assert.doesNotMatch(read('Wallet'),/Apple Wallet|AES-256|Family Avatar Rings|Совет Terra/);});
test('logout does not promise unverified sync',()=>{assert.doesNotMatch(read('SettingsModal'),/Все записано|Мобильный\/Веб узел|Локальные данные синхронизированы с облаком/);});
