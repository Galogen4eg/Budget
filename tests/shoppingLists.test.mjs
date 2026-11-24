import test from 'node:test';
import assert from 'node:assert/strict';
import { createShoppingListTemplate, recentRepeatItems, mergePurchaseHistory, mergeCompletedPurchaseHistory } from '../utils/shoppingLists.ts';

const items=[
 {id:'1',title:'Молоко',amount:'2',unit:'л',memberId:'a',priority:'medium',category:'dairy',completed:false},
 {id:'2',title:'Хлеб',amount:'1',unit:'шт',memberId:'b',priority:'medium',category:'bakery',completed:true}
];
test('template snapshots only active products and removes old ownership',()=>{
 const t=createShoppingListTemplate(' Продукты на неделю ',items,'id-1',1234);
 assert.equal(t.name,'Продукты на неделю');
 assert.deepEqual(t.items.map(i=>i.title),['Молоко']);
 assert.equal('memberId' in t.items[0],false);
 assert.equal('completed' in t.items[0],false);
});
test('empty template names and empty lists cannot be saved',()=>{
 assert.throws(()=>createShoppingListTemplate('',items,'id',1),/название/i);
 assert.throws(()=>createShoppingListTemplate('Пустой',items.filter(i=>i.completed),'id',1),/товар/i);
});
test('completion history is deduplicated per original shopping item and bounded',()=>{
 const first=mergePurchaseHistory([],items[0],100);
 const second=mergePurchaseHistory(first,items[0],200);
 assert.equal(second.length,1);
 assert.equal(second[0].purchasedAt,100);
 const many=Array.from({length:90},(_,i)=>({...items[0],id:String(i),title:'Товар '+i}));
 let history=[];
 for(const entry of many)history=mergePurchaseHistory(history,entry,Number(entry.id)+100);
 assert.equal(history.length,60);
 assert.equal(history[0].shoppingItemId,'89');
});
test('repeat purchases deduplicates by name and unit, preserving last quantity',()=>{
 const a={...items[0],title:'Молоко',amount:'1',unit:'л'};
 const b={...a,id:'2',amount:'3'};
 const c={...a,id:'3',unit:'уп'};
 let history=mergePurchaseHistory([],a,100);
 history=mergePurchaseHistory(history,b,200);
 history=mergePurchaseHistory(history,c,300);
 const latest=recentRepeatItems(history);
 assert.equal(latest.length,2);
 assert.equal(latest.find(x=>x.unit==='л').amount,'3');
 assert.equal(latest.find(x=>x.unit==='уп').amount,'1');
});

test('iteration 74: one shopping item bought twice is recorded as two distinct purchase events',()=>{
 const first={...items[0],completed:true,completedAt:1000};
 const second={...first,completedAt:2000,amount:'3'};
 let history=mergePurchaseHistory([],first,1000);
 history=mergePurchaseHistory(history,first,1000);
 assert.equal(history.length,1,'the same completion event must be idempotent');
 history=mergePurchaseHistory(history,second,2000);
 assert.equal(history.length,2,'a later completion is another real purchase');
 assert.equal(recentRepeatItems(history)[0].amount,'3','repeat uses the latest quantity');
});
test('iteration 74: legacy completed item without completion timestamp stays deduplicated',()=>{
 const current=mergePurchaseHistory([],items[0],100);
 assert.equal(mergePurchaseHistory(current,items[0],200).length,1);
 const afterTimestamp=mergePurchaseHistory(current,{...items[0],completedAt:300},300);
 assert.equal(afterTimestamp.length,2);
});

const completedItem=(id,completedAt)=>({id,title:'Товар '+id,amount:'1',unit:'шт',category:'other',priority:'medium',completed:true,completedAt});
test('one batch keeps recent completed events, without duplicating or changing saved entries',()=>{
 const old={...completedItem('a',100),shoppingItemId:'a',purchaseEventId:'a@100',purchasedAt:100};
 const history=[old];
 const next=mergeCompletedPurchaseHistory(history,[completedItem('a',100),completedItem('a',200),completedItem('a',200),completedItem('b',300),{...completedItem('c',400),completed:false}],999);
 assert.deepEqual(next.map(p=>p.purchaseEventId),['b@300','a@200','a@100']);
 assert.equal(next[2],old);
 assert.equal(mergeCompletedPurchaseHistory(next,[completedItem('a',100),completedItem('b',300)],1000),next);
});
test('old completed events outside the latest 60 do not churn the stored history',()=>{
 const history=mergeCompletedPurchaseHistory([],Array.from({length:60},(_,i)=>completedItem('new'+i,1000+i)),2000);
 assert.equal(mergeCompletedPurchaseHistory(history,[completedItem('old',1)],3000),history);
 assert.equal(history.length,60);
});
test('legacy completions still deduplicate by item id and use observation time',()=>{
 const old=completedItem('legacy',undefined);
 const next=mergeCompletedPurchaseHistory([], [old,old],500);
 assert.equal(next[0].purchaseEventId,'legacy');
 assert.equal(next[0].purchasedAt,500);
 assert.equal(mergeCompletedPurchaseHistory(next,[old],700),next);
});
