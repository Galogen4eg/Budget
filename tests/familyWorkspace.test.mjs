import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { isOwnChatMessage, chatMessageTime, shouldFollowChat, unseenPurchaseCompletions, assertDebtDeletionSafe } from '../utils/familyWorkspace.ts';
test('chat ownership uses account ID, not displayed name',()=>{
 assert.equal(isOwnChatMessage({userId:'b',userName:'Вы'},'a'),false);
 assert.equal(isOwnChatMessage({userId:'a',userName:'Гена'},'a'),true);
 assert.equal(isOwnChatMessage({userId:''},undefined),false);
});
test('message date uses actual timestamp; invalid timestamp is not invented',()=>{
 assert.match(chatMessageTime(new Date(2026,10,24,13,5).getTime()),/24\.11\.2026.*13:05/);
 assert.equal(chatMessageTime(NaN),'');
});
test('new messages do not interrupt reading older history',()=>{
 assert.equal(shouldFollowChat(1200,400,720),true);
 assert.equal(shouldFollowChat(1200,400,200),false);
});
test('purchase history skips known events but accepts a repeated completion',()=>{
 const items=[{id:'a',title:'Хлеб',completed:true,completedAt:10},{id:'b',title:'Молоко',completed:true,completedAt:20},{id:'c',title:'Чай',completed:false}];
 assert.deepEqual(unseenPurchaseCompletions(items,[{shoppingItemId:'a',purchaseEventId:'a@10'}]).map(x=>x.id),['b']);
 assert.deepEqual(unseenPurchaseCompletions([{...items[0],completedAt:30}],[{shoppingItemId:'a',purchaseEventId:'a@10'}]).map(x=>x.id),['a']);
});
test('linked debts cannot be deleted leaving orphaned payment records',()=>{
 assert.throws(()=>assertDebtDeletionSafe({id:'a'},[{id:'bill',linkedDebtId:'a'}],[]),/связан/);
 assert.throws(()=>assertDebtDeletionSafe({id:'a'},[],[{linkedDebtId:'a'}]),/связан/);
 assert.throws(()=>assertDebtDeletionSafe({id:'a',linkedExpenseId:'bill'},[{id:'bill'}],[]),/связан/);
 assert.doesNotThrow(()=>assertDebtDeletionSafe({id:'a'},[{id:'other'}],[]));
});
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('calendar waits for confirmed family data and Telegram status, without financial fields',()=>{
 const plans=read('components/FamilyPlans.tsx');
 assert.match(plans,/!familyCalendarReady\|\|telegramStatusKey!==telegramKey/);
 assert.match(plans,/telegramScopeRef.current!==telegramKey/);
 assert.match(read('contexts/DataContext.tsx'),/loadedEventsScope===memberScope&&loadedMembersScope===memberScope&&settingsReady/);
 assert.match(read('utils/calendarTelegramServer.ts'),/payments:\[\]/);
});
test('wallet does not manufacture cards and only changes shared cards after server confirmation',()=>{
 const wallet=read('components/Wallet.tsx');
 assert.doesNotMatch(wallet,/setCards\(DEFAULT_SAMPLE_CARDS\)/);
 assert.match(wallet,/if\(familyId\)\{\s*if\(editingCard\?\.id\)await updateItem/);
 assert.match(wallet,/else setCards\(/);
 assert.match(wallet,/await navigator.clipboard.writeText/);
});
test('chat is loaded lazily and reactions use atomic field updates',()=>{
 const chat=read('components/FamilyChat.tsx');
 assert.match(chat,/openedScope!==scope/);
 assert.match(chat,/isOwnChatMessage\(msg,user\?\.uid\)/);
 assert.doesNotMatch(chat,/Сегодня, 24 сентября|60fps/);
 assert.match(read('utils/db.ts'),/heartUsers:active\?arrayUnion\(uid\):arrayRemove\(uid\)/);
});

test('shopping history cannot record another family’s stale shopping snapshot',()=>{
 assert.match(read('components/ShoppingQuickListsPanel.tsx'),/!familyId\|\|!shoppingReady\|\|libraryFamily!==familyId/);
 assert.match(read('contexts/DataContext.tsx'),/loadedShoppingScope===memberScope/);
});
