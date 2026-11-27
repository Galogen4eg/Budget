import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('settings show actual account identity and no fictional category composition',()=>{
 const s=read('components/SettingsModal.tsx'),c=read('components/CategoriesSettings.tsx');
 assert.doesNotMatch(s,/926\) •••|14 октября 2023|Администратор пространства|Пароль надежно зашифрован/);
 assert.match(s,/currentUser\?\.phoneNumber/);
 assert.match(s,/currentUser\?\.metadata\?\.creationTime/);
 assert.doesNotMatch(c,/width: '60%'|width: '25%'|width: '15%'/);
 assert.match(c,/settings-categories-count/);
});
test('settings layout uses workspace width and invites independent of layout',()=>{
 const f=read('components/MembersSettingsSection.tsx'),css=read('public/terra-ui.css'),s=read('components/SettingsModal.tsx');
 assert.equal((f.match(/setIsInviteModalOpen\(true\)/g)||[]).length,1);
 assert.ok(f.indexOf('setIsInviteModalOpen(true)')<f.indexOf('className="terra-members-wide'));
 assert.match(s,/data-settings-section=\{currentSection.id\}/);
 assert.match(css,/\.terra-members-workspace,\.terra-categories-workspace\{container-type:inline-size/);
 assert.match(css,/\.terra-settings-salary-grid\{grid-template-columns:repeat\(auto-fill,minmax\(44px,1fr\)\)/);
});
test('history deletion range is explicit and changing it clears confirmation',()=>{
 const s=read('components/BudgetSettingsSection.tsx');
 assert.match(s,/Операций за период: \$\{matchedCount\}/);
 assert.match(s,/setArchiveStart\(e.target.value\);setIsConfirmingDelete\(false\)/);
 assert.match(s,/setArchiveEnd\(e.target.value\);setIsConfirmingDelete\(false\)/);
 assert.match(s,/deletePending.current=true/);
 assert.match(s,/await onDeleteTransactionsByPeriod\(archiveStart, archiveEnd\)/);
});

test('settings separate actual scope and do not show member expense totals in profile management',()=>{
 const s=read('components/SettingsModal.tsx'),f=read('components/MembersSettingsSection.tsx');
 assert.match(s,/householdPersonal\?\[personalFields,commonFields\]:\[commonFields,personalFields\]/);
 assert.doesNotMatch(f,/formatCurrencyRub\(stats.totalExpense\)/);
 assert.match(s,/terra-settings-switch-track shrink-0/);
});

test('mobile category editor and rule search use actual form and group data',()=>{
 const s=read('components/CategoriesSettings.tsx');
 assert.match(s,/mobile-category-editor/);assert.match(s,/await onUpdateCategories\(updated\)/);assert.match(s,/mobileRuleGroups.map/);assert.match(s,/Правила не найдены/);assert.match(s,/savePending.current=true/);
});
test('integration configuration and diagnostic confirmation stay distinct',()=>{
 const s=read('components/SettingsModal.tsx');assert.match(s,/telegram-config-status/);assert.match(s,/gemini-config-status/);assert.match(s,/syncAttempt/);assert.match(s,/confirmedSync.pending\?/);
});
