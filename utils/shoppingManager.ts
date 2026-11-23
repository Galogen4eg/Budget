import type { ShoppingItem } from '../types';
import { recordPurchaseEvent } from './frequentPurchases.ts';

export interface ProcessShoppingItemsResult {
  updatedList: ShoppingItem[];
  itemsToUpdateInDb: ShoppingItem[];
  itemsToAddInDb: ShoppingItem[];
  restoredCount: number;
  mergedCount: number;
  addedCount: number;
  summaryMessage: string;
  purchaseEvents: Array<Parameters<typeof recordPurchaseEvent>>;
}

/**
 * Normalizes title for consistent deduplication comparisons
 */
export const normalizeProductTitle = (title: string): string => {
  return (title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};
/** Two products with identical names but different measurement units are distinct items. */
const comparableUnit = (unit: string | undefined): string => (unit || 'шт').trim().toLowerCase();


/**
 * Core engine for adding or restoring shopping items without duplicate cards.
 * 
 * Rules:
 * 1. If an item is in "completed" (куплено), reactivate it (completed: false) and update amount.
 * 2. If an item is already active in shopping list, increment/merge its quantity.
 * 3. If it's a new item, create a new card.
 * 4. Collects purchase events; caller records them only after durable save.
 */
export function mergeOrRestoreShoppingItems(
  currentList: ShoppingItem[],
  incomingItems: (Omit<ShoppingItem, 'id'> & { id?: string })[],
  defaultMemberId: string = 'user'
): ProcessShoppingItemsResult {
  const resultList: ShoppingItem[] = [...currentList];
  const itemsToUpdateInDb: ShoppingItem[] = [];
  const itemsToAddInDb: ShoppingItem[] = [];

  let restoredCount = 0;
  let mergedCount = 0;
  let addedCount = 0;
  const processedTitles: string[] = [];
  const purchaseEvents: Array<Parameters<typeof recordPurchaseEvent>> = [];

  for (const incoming of incomingItems) {
    const cleanTitle = (incoming.title || '').trim();
    if (!cleanTitle) continue;

    const normalized = normalizeProductTitle(cleanTitle);
    const incomingQty = parseFloat(String(incoming.amount || '1').replace(',', '.')) || 1;

    // Check for existing card in completed list
    const incomingUnit = comparableUnit(incoming.unit);
    const sameProduct = (i: ShoppingItem) =>
      normalizeProductTitle(i.title) === normalized && comparableUnit(i.unit) === incomingUnit;
    const completedIdx = resultList.findIndex(i => i.completed && sameProduct(i));

    // Check for existing card in active list
    const activeIdx = resultList.findIndex(i => !i.completed && sameProduct(i));

    if (completedIdx !== -1 && activeIdx === -1) {
      // CASE 1: Item is in "completed" -> Restore to active list, update amount & record stats
      const existing = resultList[completedIdx];
      const restoredItem: ShoppingItem = {
        ...existing,
        completed: false,
        completedAt: null,
        amount: String(incomingQty),
        unit: incoming.unit || existing.unit || 'шт',
        category: incoming.category && incoming.category !== 'other' ? incoming.category : existing.category,
        priority: incoming.priority || existing.priority || 'medium',
        memberId: incoming.memberId || existing.memberId || defaultMemberId,
        note: incoming.note || existing.note
      };

      resultList[completedIdx] = restoredItem;
      itemsToUpdateInDb.push(restoredItem);
      restoredCount += 1;
      processedTitles.push(cleanTitle);

      purchaseEvents.push([cleanTitle, 'restored', {
        category: restoredItem.category,
        amount: restoredItem.amount,
        unit: restoredItem.unit
      }]);
      purchaseEvents.push([cleanTitle, 'added', {
        category: restoredItem.category,
        amount: restoredItem.amount,
        unit: restoredItem.unit
      }]);
    } else if (activeIdx !== -1) {
      // CASE 2: Item already in active list -> Merge quantities
      const existing = resultList[activeIdx];
      const currentQty = parseFloat(String(existing.amount || '1').replace(',', '.')) || 1;
      const mergedQty = Math.round((currentQty + incomingQty) * 10) / 10;

      const mergedItem: ShoppingItem = {
        ...existing,
        amount: String(mergedQty),
        priority: incoming.priority === 'high' ? 'high' : existing.priority
      };

      resultList[activeIdx] = mergedItem;
      itemsToUpdateInDb.push(mergedItem);
      mergedCount += 1;
      processedTitles.push(cleanTitle);

      purchaseEvents.push([cleanTitle, 'added', {
        category: mergedItem.category,
        amount: String(incomingQty),
        unit: mergedItem.unit
      }]);
    } else {
      // CASE 3: Brand new item -> Add new card
      const newItem: ShoppingItem = {
        id: incoming.id || `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: cleanTitle,
        amount: String(incomingQty),
        unit: incoming.unit || 'шт',
        category: incoming.category || 'other',
        completed: false,
        memberId: incoming.memberId || defaultMemberId,
        priority: incoming.priority || 'medium',
        estimatedPrice: incoming.estimatedPrice || 100,
        note: incoming.note
      };

      resultList.unshift(newItem);
      itemsToAddInDb.push(newItem);
      addedCount += 1;
      processedTitles.push(cleanTitle);

      purchaseEvents.push([cleanTitle, 'added', {
        category: newItem.category,
        amount: newItem.amount,
        unit: newItem.unit
      }]);
    }
  }

  // One document must be written only once per batch. Repeated incoming
  // products may update the same card more than once; keep the final value.
  const finalItemsById = new Map(resultList.map(item => [item.id, item]));
  const finalAdditions = new Map(itemsToAddInDb.map(item => [item.id, finalItemsById.get(item.id)!]));
  const finalUpdates = new Map(itemsToUpdateInDb.map(item => [item.id, finalItemsById.get(item.id)!]));
  for (const id of finalAdditions.keys()) finalUpdates.delete(id);

  // Generate clear user notification
  let summaryMessage = '';
  if (restoredCount > 0 && addedCount === 0 && mergedCount === 0) {
    summaryMessage = restoredCount === 1 
      ? `«${processedTitles[0]}» возвращен из купленных в список` 
      : `Возвращено ${restoredCount} товаров из купленных`;
  } else if (mergedCount > 0 && addedCount === 0 && restoredCount === 0) {
    summaryMessage = mergedCount === 1
      ? `Количество «${processedTitles[0]}» увеличено`
      : `Обновлено количество для ${mergedCount} товаров`;
  } else {
    const total = restoredCount + mergedCount + addedCount;
    if (total === 1) {
      summaryMessage = `Добавлено в список: ${processedTitles[0]}`;
    } else {
      summaryMessage = `Обновлено товаров: ${total}`;
    }
  }

  return {
    updatedList: resultList,
    itemsToUpdateInDb: [...finalUpdates.values()],
    itemsToAddInDb: [...finalAdditions.values()],
    restoredCount,
    mergedCount,
    addedCount,
    summaryMessage,
    purchaseEvents
  };
}

/** Update local suggestions only after the shopping changes were committed. */
export function recordCommittedShoppingEvents(events: Array<Parameters<typeof recordPurchaseEvent>>): void {
  for (const [title, event, options] of events) recordPurchaseEvent(title, event, options);
}
