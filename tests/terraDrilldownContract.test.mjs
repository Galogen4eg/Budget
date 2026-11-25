import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('drilldown layouts expose actual view state and no fabricated claims',()=>{
 for(const path of ['components/DrillDownModal.tsx','components/DrillDownMobile.tsx']){
  const s=read(path);assert.match(s,/data-testid="transaction-drilldown" data-view=\{viewMode\}/);
  assert.doesNotMatch(s,/Синхронизировано минуту назад|Пиковые дни: Пятница и суббота|67%|92% операций|-18% к августу|Траты на 18%|17 сен|В норме графика/);
 }
 const audit=read('tests/navigationAudit.mjs');
 assert.match(audit,/mobile\(\)\?'Назад к операциям':'Реестр операций'/);
 assert.match(audit,/data-view="analytics"/);assert.match(audit,/data-view="inspector"/);
});
