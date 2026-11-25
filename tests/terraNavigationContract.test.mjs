import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('mobile month picker is an in-flow disclosure after the shared header',()=>{
 const s=read('components/TerraBudget.tsx');const p=s.indexOf('data-testid="budget-month-selector"');
 assert.ok(p>s.indexOf('<TerraMobileHeader'));const block=s.slice(p,s.indexOf('Mobile Page Content',p));
 assert.match(block,/aria-controls="budget-month-controls"/);assert.match(block,/id="budget-month-controls"/);assert.doesNotMatch(block,/fixed inset-0|absolute top-full/);
});
test('reserve and service exit controls are named and real',()=>{
 assert.match(read('components/ReserveDetailsModal.tsx'),/role="dialog" aria-modal="true" aria-labelledby="terra-reserve-heading"/);
 assert.match(read('components/DebtSnowball.tsx'),/<span>Все сервисы<\/span>/);
 assert.doesNotMatch(read('components/DebtSnowball.tsx'),/Обновлено в \{currentTimeSync\}/);
});
test('shopping shortcut and task creation share accessible labels across layouts',()=>{
 for(const p of ['components/TerraOverview.tsx','components/QuickShoppingWidget.tsx'])assert.match(read(p),/aria-label="Открыть все покупки"/);
 assert.equal((read('components/FamilyAgendaPanel.tsx').match(/aria-label="Создать задачу"/g)||[]).length,2);
});
