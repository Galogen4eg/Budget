import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('registered main and nested dialogs share focus management and names',()=>{
 for(const name of ['AddTransactionModal','EventModal','SettingsModal','ConfirmationModal','ImportModal','ReserveDetailsModal','DrillDownModal','DrillDownMobile','DesktopCategoryPickerModal','MobileCategoryPickerModal','UnrecognizedAnalyzerModal']){
  const code=read('components/'+name+'.tsx');
  assert.match(code,/useModalSurface\(/,name);
  assert.match(code,/role="(?:alert)?dialog"/,name);
  assert.match(code,/aria-modal="true"/,name);
 }
 assert.match(read('components/ImportModal.tsx'),/return createPortal\(/);
});
test('nested category control is a real button and browser test verifies retained draft',()=>{
 const code=read('components/AddTransactionModal.tsx'),audit=read('tests/navigationAudit.mjs');
 assert.match(code,/<button type="button" aria-label="Выбрать категорию" aria-haspopup="dialog"/);
 assert.match(audit,/escape only nested category picker/);
 assert.match(audit,/Draft lost when returning from category picker/);
 assert.match(audit,/Focus not restored to editor trigger/);
});
