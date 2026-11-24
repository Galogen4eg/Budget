import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {visibleMenuTabs,menuPreferencePatch,settingsSearchMatches} from '../utils/menuNavigation.ts';
test('menu visibility keeps Overview, rejects unknown IDs and normalizes duplicate IDs',()=>{
 assert.deepEqual(visibleMenuTabs(['chat','chat','unknown']),['overview','chat']);
 assert.equal(visibleMenuTabs().length,6);
 assert.deepEqual(visibleMenuTabs([]),['overview']);
});
test('hiding a startup tab changes startup in the same personal settings patch',()=>{
 assert.deepEqual(menuPreferencePatch(['overview','services'],'services','services',false),{enabledTabs:['overview'],startTab:'overview'});
 assert.deepEqual(menuPreferencePatch(['overview'],'overview','overview',false),{enabledTabs:['overview'],startTab:'overview'});
 assert.deepEqual(menuPreferencePatch(['overview'],'overview','shopping',true),{enabledTabs:['overview','shopping'],startTab:'overview'});
});
test('settings search matches meaningful aliases, multiple words and Russian ё',()=>{
 const item={label:'Оформление',subtitle:'Тёмная тема',keywords:'приватность суммы'};
 assert.equal(settingsSearchMatches(item,'темная суммы'),true);
 assert.equal(settingsSearchMatches(item,'пароль'),false);
});
test('settings separate budget parameters from history tools without removing handlers',()=>{
 const settings=readFileSync(new URL('../components/SettingsModal.tsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
 const budget=readFileSync(new URL('../components/BudgetSettingsSection.tsx',import.meta.url),'utf8');
 assert.match(settings,/case 'navigation'/);
 assert.match(settings,/case 'data'/);
 assert.match(settings,/mode="finance"/);
 assert.match(settings,/mode="history"/);
 assert.match(budget,/onDeleteTransactionsByPeriod\(archiveStart, archiveEnd\)/);
 assert.match(budget,/onClick=\{onOpenDuplicates\}/);
 assert.match(app,/navigateMenu=\(id:string\)/);
 assert.doesNotMatch(app,/if\(!visibleTabs.some\(t=>t.id===activeTab\)\)/);
});

test('controlled settings inputs initiate optimistic updates within the input event',()=>{
 const source=readFileSync(new URL('../components/SettingsModal.tsx',import.meta.url),'utf8');
 const handler=source.split('const saveSettingsPatch = useCallback')[1]?.split('const handleUpdateFamilyId')[0];
 assert.ok(handler);
 assert.match(handler,/try\s*\{\s*await onUpdate\(patch\)/);
 assert.match(handler,/void saveSettingsPatch\(\{ \[key\]: value \}\)/);
 assert.doesNotMatch(handler,/Promise\.resolve\(\)\.then/);
 assert.match(source,/void saveSettingsPatch\(patch\)/);
});
