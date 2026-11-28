import { useState, useMemo, useCallback } from 'react';
import { ShoppingItem } from '../types';
import { parseQuickShoppingInput, createShoppingItemsFromQuickText } from '../utils/quickShoppingParser';
import { mergeOrRestoreShoppingItems, recordCommittedShoppingEvents, applyCommittedShoppingChanges } from '../utils/shoppingManager';
import { recordPurchaseEvent } from '../utils/frequentPurchases';
import { saveShoppingMerge, updateItem } from '../utils/db';
import { toast } from 'sonner';

export interface UseQuickShoppingInput {
  shoppingItems: ShoppingItem[];
  setShoppingItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  familyId: string | null;
  currentMemberId: string;
}

export interface UseQuickShoppingOutput {
  newShoppingTitle: string;
  setNewShoppingTitle: (val: string) => void;
  isAddingShopping: boolean;
  liveParsedShopping: ReturnType<typeof parseQuickShoppingInput>;
  handleToggleShopping: (item: ShoppingItem) => Promise<void>;
  handleAddShoppingInline: (e: React.FormEvent) => Promise<void>;
}

/**
 * Custom hook to encapsulate the logic for quick parsing and inline additions/mutations of shopping list items.
 */
export function useQuickShopping({
  shoppingItems,
  setShoppingItems,
  familyId,
  currentMemberId,
}: UseQuickShoppingInput): UseQuickShoppingOutput {
  const [newShoppingTitle, setNewShoppingTitle] = useState('');
  const [isAddingShopping, setIsAddingShopping] = useState(false);

  const liveParsedShopping = useMemo(() => {
    return parseQuickShoppingInput(newShoppingTitle);
  }, [newShoppingTitle]);

  const handleToggleShopping = useCallback(async (item: ShoppingItem) => {
    const nextCompleted = !item.completed;
    const completedAt = nextCompleted ? Date.now() : null;

    try {
      if (!familyId) throw new Error('Семейный аккаунт недоступен');
      await updateItem(familyId, 'shopping', item.id, { completed: nextCompleted, completedAt });
      setShoppingItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: nextCompleted, completedAt } : i));
      recordPurchaseEvent(
        item.title,
        nextCompleted ? 'completed' : 'restored',
        { category: item.category, amount: item.amount, unit: item.unit, price: item.estimatedPrice }
      );
    } catch (err) {
      console.error('Failed to toggle shopping item status', err);
      toast.error('Не удалось обновить статус покупки');
    }
  }, [familyId, setShoppingItems]);

  const handleAddShoppingInline = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newShoppingTitle.trim();
    if (!raw || isAddingShopping) return;

    try {
      setIsAddingShopping(true);
      if (!currentMemberId || currentMemberId === 'all') {
        throw new Error('Ваш аккаунт не привязан к семейному профилю. Выберите свой профиль в настройках.');
      }
      const targetMemberId = currentMemberId;
      const parsedItems = createShoppingItemsFromQuickText(raw, targetMemberId);
      if (parsedItems.length === 0) return;

      const {
        itemsToUpdateInDb,
        itemsToAddInDb,
        purchaseEvents
      } = mergeOrRestoreShoppingItems(shoppingItems, parsedItems, targetMemberId);

      if (!familyId) throw new Error('Семейный аккаунт недоступен');
      await saveShoppingMerge(familyId, itemsToUpdateInDb, itemsToAddInDb);
      recordCommittedShoppingEvents(purchaseEvents);
      setShoppingItems(prev => applyCommittedShoppingChanges(prev, itemsToUpdateInDb, itemsToAddInDb));
      setNewShoppingTitle('');
      toast.success('Покупка успешно добавлена!');
    } catch (err) {
      console.error('Failed to add shopping item inline:', err);
      toast.error(err instanceof Error ? err.message : 'Ошибка добавления покупок');
    } finally {
      setIsAddingShopping(false);
    }
  }, [newShoppingTitle, isAddingShopping, shoppingItems, currentMemberId, familyId, setShoppingItems]);

  return {
    newShoppingTitle,
    setNewShoppingTitle,
    isAddingShopping,
    liveParsedShopping,
    handleToggleShopping,
    handleAddShoppingInline,
  };
}

export default useQuickShopping;
