import { ShoppingItem } from '../types';
import { recordPurchaseEvent } from './frequentPurchases';

export interface ProcessShoppingItemsResult {
  updatedList: ShoppingItem[];
  itemsToUpdateInDb: ShoppingItem[];
  itemsToAddInDb: ShoppingItem[];
  restoredCount: number;
  mergedCount: number;
  addedCount: number;
  summaryMessage: string;
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

/**
 * Core engine for adding or restoring shopping items without duplicate cards.
 * 
 * Rules:
 * 1. If an item is in "completed" (куплено), reactivate it (completed: false) and update amount.
 * 2. If an item is already active in shopping list, increment/merge its quantity.
 * 3. If it's a new item, create a new card.
 * 4. Records purchase events for stats.
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

  for (const incoming of incomingItems) {
    const cleanTitle = (incoming.title || '').trim();
    if (!cleanTitle) continue;

    const normalized = normalizeProductTitle(cleanTitle);
    const incomingQty = parseFloat(String(incoming.amount || '1').replace(',', '.')) || 1;

    // Check for existing card in completed list
    const completedIdx = resultList.findIndex(
      i => i.completed && normalizeProductTitle(i.title) === normalized
    );

    // Check for existing card in active list
    const activeIdx = resultList.findIndex(
      i => !i.completed && normalizeProductTitle(i.title) === normalized
    );

    if (completedIdx !== -1) {
      // CASE 1: Item is in "completed" -> Restore to active list, update amount & record stats
      const existing = resultList[completedIdx];
      const restoredItem: ShoppingItem = {
        ...existing,
        completed: false,
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

      recordPurchaseEvent(cleanTitle, 'restored', {
        category: restoredItem.category,
        amount: restoredItem.amount,
        unit: restoredItem.unit
      });
      recordPurchaseEvent(cleanTitle, 'added', {
        category: restoredItem.category,
        amount: restoredItem.amount,
        unit: restoredItem.unit
      });
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

      recordPurchaseEvent(cleanTitle, 'added', {
        category: mergedItem.category,
        amount: String(incomingQty),
        unit: mergedItem.unit
      });
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

      recordPurchaseEvent(cleanTitle, 'added', {
        category: newItem.category,
        amount: newItem.amount,
        unit: newItem.unit
      });
    }
  }

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
    itemsToUpdateInDb,
    itemsToAddInDb,
    restoredCount,
    mergedCount,
    addedCount,
    summaryMessage
  };
}
