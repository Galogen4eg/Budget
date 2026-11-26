import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const modal=readFileSync(new URL('../components/ImportModal.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');

test('bank preview must not fabricate card/account details or default to first member',()=>{
 assert.doesNotMatch(modal,/\|\| '••3271'/);
 assert.doesNotMatch(modal,/memberId:\s*item\.memberId \|\| \(members\[0\]/);
 assert.doesNotMatch(modal,/memberId:\s*editingItem\.memberId \|\| members\[0\]/);
});
test('bank transaction owner cannot be reassigned in review UI',()=>{
 assert.doesNotMatch(modal,/handleSetGlobalMember\(/);
 assert.doesNotMatch(modal,/handleItemMemberChange\(/);
 assert.match(modal,/Владелец выписки/);
});
test('rules are learned only after parent reports a committed import',()=>{
 assert.match(modal,/const committed = await onConfirm\(cleanItems\)/);
 assert.match(modal,/if \(!committed\) \{setImportError\([^\n]+\);return;\}/);
 assert.ok(modal.indexOf('if (!committed)')<modal.indexOf('const rules = onlyReady'));
 assert.match(app,/return false;/);
 assert.match(app,/return true;/);
});
test('mobile review has usable action targets and semantically accessible row edits',()=>{
 assert.match(modal,/min-h-\[44px\]/);
 assert.match(modal,/aria-label=\{\x60Редактировать операцию/);
 assert.match(modal,/role="status"/);
});

test('invalid amounts, dates and owner mismatch are rejected before saving',()=>{
 assert.match(modal,/!Number\.isFinite\(item\.amount\) \|\| item\.amount <= 0/);
 assert.match(modal,/Number\.isNaN\(new Date\(item\.date\)\.getTime\(\)\)/);
 assert.match(modal,/item\.memberId !== globalMemberId/);
});

test('iteration 67: full bank import is blocked until all categories are reviewed',()=>{
 assert.match(modal,/!onlyReady && selected.some\(needsCategory\)/);
 assert.match(modal,/disabled=\{isConfirmingImport \|\| items\.length === 0 \|\| unassignedCount > 0 \|\| savingsChoiceCount>0\}/);
 assert.match(app,/assertImportBatchReady\(itemsToImport, categories, importMemberId\)/);
});
test('iteration 67: closing bank preview is disabled during persistent save',()=>{
 assert.match(modal,/if\(!importPending.current\)onCancel\(\)/);
 assert.match(modal,/disabled=\{isConfirmingImport\}/);
 assert.match(modal,/Сохранение…/);
});

test('savings review requires explicit disposition before the first import write',()=>{
 assert.match(modal,/assertImportSavingsReady\(cleanItems,goals,globalMemberId\)/);
 assert.match(modal,/Банковский перевод без цели/);
 assert.match(modal,/goals\.filter\(g=>g\.memberId===globalMemberId\)/);
 const guard=app.indexOf('assertImportSavingsReady(prepared,goals,importMemberId)');
 const firstWrite=app.indexOf('await addAlfaItemsIdempotent(familyId,normalRows)');
 assert.ok(guard>=0&&firstWrite>guard);
 assert.doesNotMatch(app,/savings_import_default/);
 assert.match(app,/const normalRows = prepared\.filter\(t=>!isGoalSavingsTransfer\(t\)\)/);
});
