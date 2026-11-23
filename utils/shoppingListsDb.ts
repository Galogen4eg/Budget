import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import type { ShoppingItem } from '../types';
import {
  createShoppingListTemplate, mergePurchaseHistory,
  type SavedShoppingList, type PurchasedProduct
} from './shoppingLists';

interface ShoppingListLibrary { templates: SavedShoppingList[]; history: PurchasedProduct[]; }
const EMPTY: ShoppingListLibrary = { templates: [], history: [] };
const libraryDoc = (familyId: string) => doc(db, 'families', familyId, 'config', 'shoppingLists');

function readLibrary(data: Record<string, unknown> | undefined): ShoppingListLibrary {
  return {
    templates: Array.isArray(data?.templates) ? data.templates as SavedShoppingList[] : [],
    history: Array.isArray(data?.history) ? data.history as PurchasedProduct[] : []
  };
}

export function subscribeShoppingListLibrary(
  familyId: string,
  callback: (library: ShoppingListLibrary) => void,
  onError: (error: Error) => void
): () => void {
  if (!familyId) { callback(EMPTY); return () => {}; }
  return onSnapshot(libraryDoc(familyId), snapshot => {
    callback(snapshot.exists() ? readLibrary(snapshot.data()) : EMPTY);
  }, onError);
}

export async function saveFamilyShoppingTemplate(
  familyId: string, name: string, items: readonly ShoppingItem[], id: string
): Promise<void> {
  if (!familyId) throw new Error('Семейный аккаунт не подключён');
  const next = createShoppingListTemplate(name, items, id, Date.now());
  await runTransaction(db, async transaction => {
    const ref = libraryDoc(familyId);
    const existing = await transaction.get(ref);
    const data = readLibrary(existing.data());
    if (data.templates.length >= 25) throw new Error('Можно сохранить не более 25 быстрых списков');
    transaction.set(ref, { ...data, templates: [next, ...data.templates] });
  });
}

export async function deleteFamilyShoppingTemplate(familyId: string, templateId: string): Promise<void> {
  await runTransaction(db, async transaction => {
    const ref = libraryDoc(familyId);
    const existing = await transaction.get(ref);
    const data = readLibrary(existing.data());
    transaction.set(ref, { ...data, templates: data.templates.filter(t => t.id !== templateId) });
  });
}

export async function recordFamilyPurchase(familyId: string, item: ShoppingItem): Promise<void> {
  if (!familyId || !item.id) return;
  await runTransaction(db, async transaction => {
    const ref = libraryDoc(familyId);
    const existing = await transaction.get(ref);
    const data = readLibrary(existing.data());
    const eventId = item.completedAt ? `${item.id}@${item.completedAt}` : item.id;
    if (data.history.some(p => (p.purchaseEventId || p.shoppingItemId) === eventId)) return;
    transaction.set(ref, { ...data, history: mergePurchaseHistory(data.history, item, Date.now()) });
  });
}
