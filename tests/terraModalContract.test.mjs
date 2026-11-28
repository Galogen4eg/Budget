import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('registered main and nested dialogs share focus management and names',()=>{
 for(const name of ['AddTransactionModal','EventModal','SettingsModal','ConfirmationModal','ImportModal','ReserveDetailsModal','DrillDownModal','DrillDownMobile','DesktopCategoryPickerModal','MobileCategoryPickerModal','UnrecognizedAnalyzerModal','MandatoryExpenseModal','AIChatModal']){
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

test('editors and confirmation avoid viewport-scale animation and use shared keyboard viewport',()=>{
 for(const name of ['AddTransactionModal','EventModal','MandatoryExpenseModal','AIChatModal'])assert.match(read('components/'+name+'.tsx'),/useMobileViewport\(/,name);
 const confirm=read('components/ConfirmationModal.tsx');assert.doesNotMatch(confirm,/scale:\s*0\.95/);assert.match(confirm,/terraTransition\(reduced/);
 const tx=read('components/AddTransactionModal.tsx');assert.match(tx,/<button type="button" aria-label="Исполнитель"/);assert.match(tx,/<button type="button" aria-label="Привязать к платежу"/);
});

test('manual reserve has explicit save and no implicit blur commit',()=>{
 const s=read('components/ReserveDetailsModal.tsx');
 assert.doesNotMatch(s,/onBlur=\{handleManualBlur\}/);
 assert.match(s,/aria-label="Сохранить ручной резерв"/);
 assert.match(s,/onClick=\{saveManualDraft\}/);
 assert.match(s,/useMobileViewport\(/);
});

test('mandatory payment dialog has one focus owner so the opener is captured before input focus',()=>{
 const s=read('components/MandatoryExpenseModal.tsx');
 assert.match(s,/useModalSurface\(requestClose,\{initialSelector:/);
 assert.doesNotMatch(s,/<input\b[^>]*\bautoFocus\b/s);
});
