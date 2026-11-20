import test from 'node:test';
import assert from 'node:assert/strict';
import { createShoppingListTemplate, recentRepeatItems, mergePurchaseHistory } from '../utils/shoppingLists.ts';

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
