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
 assert.match(modal,/if \(!committed\) return/);
 assert.match(app,/return false;/);
 assert.match(app,/return true;/);
});
test('mobile review has usable action targets and semantically accessible row edits',()=>{
 assert.match(modal,/min-h-\[44px\]/);
 assert.match(modal,/aria-label=\{\x60Редактировать операцию/);
 assert.match(modal,/role="status"/);
});
