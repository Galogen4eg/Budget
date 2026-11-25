import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('production and emulator reuse navigation actions',()=>{
 for(const path of ['tests/productionNavigation.mjs','tests/fullApplicationCrudBrowser.mjs'])assert.match(read(path),/import \{runNavigationAudit\} from '\.\/navigationAudit\.mjs'/);
});
test('emulator navigation is a separate isolated CI run',()=>{
 assert.match(read('.github/workflows/budget-firestore-crud.yml'),/--project demo-budget --only auth,firestore[^\n]+--navigation/);
 const suite=read('tests/fullApplicationCrudBrowser.mjs');
 assert.ok(suite.indexOf('Requires isolated auth and Firestore emulators')<suite.indexOf('await runNavigationAudit'));
 assert.match(suite,/return allowed\?route\.continue\(\):route\.abort\(\)/);
});
