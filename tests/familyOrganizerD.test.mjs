import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=n=>readFileSync(new URL('../components/'+n+'.tsx',import.meta.url),'utf8');
test('pantry uses shared inventory update and confirmed deletion',()=>{
 const s=read('PantryInventory');
 assert.ok(s.includes("updateItem(id,'pantry',draft.id,normalizePantryEdit(draft))"));
 assert.ok(s.includes("deleteItem(id,'pantry',confirmId)"));
 assert.ok(read('ShoppingQuickListsPanel').includes("key={familyId||'none'}"));
});
test('calendar uses selected day and protects pending writes',()=>{
 assert.ok(read('FamilyPlansMobile').includes('onAdd={() => onOpenEvent(null, { date: selectedDateStr })}'));
 const s=read('EventModal');
 assert.equal(s.split('savePending.current=true;').length-1,2);
 assert.equal(s.split('savePending.current=false;').length-1,2);
 assert.ok(read('FamilyAgendaPanel').includes('disabled={savingId!==null}'));
 assert.ok(read('FamilyChat').includes('if(currentScopeRef.current!==scope)return;'));
});
