import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyCommittedShoppingChanges} from '../utils/shoppingManager.ts';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

const item=(id,title)=>({id,title,amount:'1',unit:'шт',memberId:'a',completed:false,priority:'medium',category:'other'});

test('iteration 76: a subscriber update after await is never dropped by full-list replacement',()=>{
 const current=[item('a','Молоко'),item('b','Чай')];
 const changed={...current[0],amount:'2'};
 const additions=[item('c','Хлеб')];
 const next=applyCommittedShoppingChanges(current,[changed],additions);
 assert.deepEqual(next.map(x=>x.id),['c','a','b']);
 assert.equal(next[1].amount,'2');
 assert.equal(next[2].title,'Чай');
 assert.deepEqual(current.map(x=>x.id),['a','b'],'pure reconciliation');
});

test('iteration 76: desktop and mobile use the targeted reconciliation for all batch imports',()=>{
 for(const path of ['../components/ShoppingListMobile.tsx','../components/ShoppingListDesktop.tsx']){
  const src=read(path);
  assert.doesNotMatch(src,/setItems\(updatedList\)/);
  const matches=src.match(/setItems\(prev => applyCommittedShoppingChanges\(prev, itemsToUpdateInDb, itemsToAddInDb\)\)/g)||[];
  assert.equal(matches.length,4,path);
  assert.match(src,/await saveShoppingMerge\(familyId, itemsToUpdateInDb, itemsToAddInDb\)/);
 }
});

test('iteration 76: quick templates and repeat data remain family-scoped',()=>{
 const src=read('../components/ShoppingQuickListsPanel.tsx');
 assert.match(src,/subscribeShoppingListLibrary\(familyId/);
 assert.match(src,/saveFamilyShoppingTemplate\(familyId/);
 assert.match(src,/deleteFamilyShoppingTemplate\(familyId/);
 assert.match(src,/recordFamilyPurchase\(familyId, item\)/);
 assert.match(src,/resolveShoppingMemberId\(members, user\?\.uid\)/);
});

test('iteration 76: Firestore pantry move is atomic and reads latest source item',()=>{
 const db=read('../utils/db.ts');
 assert.match(db,/export const moveShoppingToPantry = async/);
 assert.match(db,/runTransaction\(db, async tx => \{/);
 assert.match(db,/preparePantryMove\(/);
 assert.match(db,/tx\.set\(pantryRef/);
 assert.match(db,/tx\.delete\(shoppingRef\)/);
});

test('iteration 76: responsive browser gate covers Shopping at the existing six widths',()=>{
 const src=read('./budgetBrowserSmoke.mjs');
 assert.match(src,/Shopping quick lists \/ repeat navigation and responsive layout/);
 assert.match(src,/label\+'-shopping\.png'/);
 assert.match(src,/shoppingOverflow\.body<=shoppingOverflow\.viewport\+2/);
});
