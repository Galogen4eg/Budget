import type { ShoppingItem } from '../types';

export type ListProduct = Pick<ShoppingItem, 'title'|'amount'|'unit'|'category'|'priority'|'estimatedPrice'>;
export interface SavedShoppingList { id: string; name: string; items: ListProduct[]; createdAt: number; }
export interface PurchasedProduct extends ListProduct { shoppingItemId: string; purchaseEventId?: string; purchasedAt: number; }

function snapshot(item: ShoppingItem): ListProduct {
  return {
    title: item.title.trim(),
    amount: item.amount || '1',
    unit: item.unit || 'шт',
    category: item.category || 'other',
    priority: item.priority || 'medium',
    ...(Number.isFinite(item.estimatedPrice) ? { estimatedPrice: item.estimatedPrice } : {})
  };
}

export function createShoppingListTemplate(
  name: string, items: readonly ShoppingItem[], id: string, createdAt: number
): SavedShoppingList {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Введите название быстрого списка');
  if (normalizedName.length > 60) throw new Error('Название списка не может превышать 60 символов');
  const active = items.filter(item => !item.completed && item.title?.trim()).map(snapshot);
  if (active.length === 0) throw new Error('Нет товаров для сохранения в быстрый список');
  if (active.length > 100) throw new Error('В один шаблон можно сохранить не более 100 товаров');
  return { id, name: normalizedName, items: active, createdAt };
}

export function mergePurchaseHistory(
  history: readonly PurchasedProduct[], item: ShoppingItem, purchasedAt: number
): PurchasedProduct[] {
  if (!item.id || !item.title?.trim()) return [...history];
  const eventId = item.completedAt ? `${item.id}@${item.completedAt}` : item.id;
  if (history.some(p => (p.purchaseEventId || p.shoppingItemId) === eventId)) return [...history];
  return [
    { ...snapshot(item), shoppingItemId: item.id, purchaseEventId: eventId, purchasedAt },
    ...history
  ].sort((a,b) => b.purchasedAt - a.purchasedAt).slice(0,60);
}

export function recentRepeatItems(history: readonly PurchasedProduct[], max = 20): ListProduct[] {
  const seen = new Set<string>();
  const result: ListProduct[] = [];
  for(const item of [...history].sort((a,b)=>b.purchasedAt-a.purchasedAt)){
    const key = item.title.trim().toLocaleLowerCase('ru-RU')+'|'+(item.unit || 'шт').trim().toLowerCase();
    if(seen.has(key)) continue;
    seen.add(key);
    result.push({title:item.title,amount:item.amount,unit:item.unit,category:item.category,
      priority:item.priority,...(item.estimatedPrice!==undefined?{estimatedPrice:item.estimatedPrice}:{})});
    if(result.length>=max) break;
  }
  return result;
}

/** Merge a snapshot of completed items with one read/write of the family history. */
export function mergeCompletedPurchaseHistory(
  history: PurchasedProduct[], items: readonly ShoppingItem[], observedAt: number
): PurchasedProduct[] {
  const known = new Set(history.map(p => p.purchaseEventId || p.shoppingItemId));
  const additions: PurchasedProduct[] = [];
  for (const item of items) {
    if (!item.completed || !item.id || !item.title?.trim()) continue;
    const eventId = item.completedAt ? `${item.id}@${item.completedAt}` : item.id;
    if (known.has(eventId)) continue;
    known.add(eventId);
    const purchasedAt = typeof item.completedAt === 'number' && Number.isFinite(item.completedAt) && item.completedAt > 0
      ? item.completedAt : observedAt;
    additions.push({ ...snapshot(item), shoppingItemId: item.id, purchaseEventId: eventId, purchasedAt });
  }
  if (!additions.length) return history;
  const next = [...additions.reverse(), ...history].sort((a,b) => b.purchasedAt - a.purchasedAt).slice(0,60);
  return next.length === history.length && next.every((p,i) => p === history[i]) ? history : next;
}

/** Same search for active and purchased rows on both devices. */
export function filterShoppingItems(items:readonly ShoppingItem[],query:string):ShoppingItem[]{
 const q=query.trim().toLocaleLowerCase('ru-RU');
 return items.filter(item=>!q||[item.title,item.note,item.category].some(value=>String(value||'').toLocaleLowerCase('ru-RU').includes(q)));
}

/** Counts actual, distinct completion events in the existing bounded family history. */
export function frequentFamilyPurchases(history:readonly PurchasedProduct[],limit=8):Array<ListProduct&{purchaseCount:number}>{
 const seen=new Set<string>();
 const counts=new Map<string,ListProduct&{purchaseCount:number;purchasedAt:number}>();
 for(const purchase of [...history].sort((a,b)=>b.purchasedAt-a.purchasedAt)){
  const eventId=purchase.purchaseEventId||purchase.shoppingItemId;
  if(!eventId||!purchase.title?.trim()||seen.has(eventId))continue;
  seen.add(eventId);
  const key=purchase.title.trim().toLocaleLowerCase('ru-RU')+'|'+(purchase.unit||'шт').trim().toLowerCase();
  const prior=counts.get(key);
  if(prior){prior.purchaseCount++;continue;}
  counts.set(key,{title:purchase.title,amount:purchase.amount,unit:purchase.unit,category:purchase.category,priority:purchase.priority,
   ...(purchase.estimatedPrice!==undefined?{estimatedPrice:purchase.estimatedPrice}:{}),purchaseCount:1,purchasedAt:purchase.purchasedAt});
 }
 return [...counts.values()].filter(item=>item.purchaseCount>=2)
  .sort((a,b)=>b.purchaseCount-a.purchaseCount||b.purchasedAt-a.purchasedAt||a.title.localeCompare(b.title,'ru-RU'))
  .slice(0,Math.max(0,limit)).map(({purchasedAt,...product})=>product);
}
