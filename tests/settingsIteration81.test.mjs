import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const modal=read('components/SettingsModal.tsx');
const members=read('components/MembersSettingsSection.tsx');
test('iteration 81: settings controls submit only the modified key and handle failures',()=>{
 assert.match(modal,/onUpdate\(\{ \[key\]: value \}\)/);
 assert.match(modal,/Не удалось сохранить настройку/);
});
test('iteration 81: login update does not change a profile before email succeeds',()=>{
 const handler=modal.slice(modal.indexOf('const handleUpdateAccountLogin'),modal.indexOf('const handleUpdatePassword'));
 assert.ok(handler.indexOf('await updateEmail')<handler.indexOf('await updateProfile'));
 assert.match(handler,/await onUpdateMembers/);
 assert.doesNotMatch(handler,/m\.email === currentUser\.email/);
});
test('iteration 81: member edits wait for persistence before success',()=>{
 const handler=members.slice(members.indexOf('const handleSaveMemberDetails'),members.indexOf('const handleDeleteMember'));
 assert.match(handler,/await onUpdateMembers\(updated\)/);
 assert.ok(handler.indexOf('await onUpdateMembers')<handler.indexOf('toast.success'));
});
test('iteration 81: settings dialog has an accessible name and no fabricated account identity',()=>{
 assert.match(modal,/aria-label="Настройки"/);
 assert.match(modal,/aria-label="Закрыть настройки"/);
 assert.doesNotMatch(modal,/849-01|alexey@semyaplus\.ru/);
});

test('iteration 81: personal appearance preferences are reachable and use existing user-specific keys',()=>{
 assert.match(modal,/case 'appearance'/);
 for(const key of ['theme','privacyMode','defaultBudgetMode']){
  assert.ok(read('utils/db.ts').includes("'"+key+"'"));
  assert.ok(modal.includes("handleChange('"+key+"'"));
 }
 assert.match(modal,/role="switch" aria-checked=\{settings.privacyMode\}/);
});
