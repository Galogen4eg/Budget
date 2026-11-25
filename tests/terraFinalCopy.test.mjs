import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('reserve contains no synthetic bills and waits for real save',()=>{
 const s=read('components/ReserveDetailsModal.tsx');
 assert.doesNotMatch(s,/DEFAULT_SAMPLE_BILLS|sample-mortgage|setIsSuccessPaid|Оплатить обязательные платежи/);
 assert.match(s,/const rawBillsList=futureExpenses/);
 assert.match(s,/await action\(\)/);
 assert.match(s,/Нет обязательных платежей/);
});
test('startup errors have actionable text without raw exceptions in the UI',()=>{
 for(const p of ['index.html','index.tsx']){
  const s=read(p);
  assert.match(s,/Не удалось загрузить приложение/);
  assert.match(s,/Попробовать снова/);
  assert.doesNotMatch(s,/😔|\$\{detail\}|\{this.state.error\?\.message\}/);
 }
});
