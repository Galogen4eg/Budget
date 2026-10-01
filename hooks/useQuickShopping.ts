import { useState, useMemo, useCallback } from 'react';
import { ShoppingItem } from '../types';
import { parseSingleQuickShoppingText, createShoppingItemsFromQuickText } from '../utils/quickShoppingParser';
import { mergeOrRestoreShoppingItems } from '../utils/shoppingManager';
import { recordPurchaseEvent } from '../utils/frequentPurchases';
import { addItem, addItemsBatch, updateItem } from '../utils/db';
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
  liveParsedShopping: ReturnType<typeof parseSingleQuickShoppingText> | null;
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
    if (!newShoppingTitle.trim()) return null;
    return parseSingleQuickShoppingText(newShoppingTitle);
  }, [newShoppingTitle]);

  const handleToggleShopping = useCallback(async (item: ShoppingItem) => {
    const nextCompleted = !item.completed;
    const updated = { ...item, completed: nextCompleted };
    setShoppingItems(prev => prev.map(i => i.id === item.id ? updated : i));

    try {
      if (familyId) {
        await updateItem(familyId, 'shopping', item.id, updated);
      }
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
      const targetMemberId = currentMemberId || 'user';
      const parsedItems = createShoppingItemsFromQuickText(raw, targetMemberId);
      if (parsedItems.length === 0) return;

      const {
        updatedList,
        itemsToUpdateInDb,
        itemsToAddInDb
      } = mergeOrRestoreShoppingItems(shoppingItems, parsedItems, targetMemberId);

      setShoppingItems(updatedList);
      setNewShoppingTitle('');

      if (familyId) {
        for (const item of itemsToUpdateInDb) {
          await updateItem(familyId, 'shopping', item.id, item);
        }
        if (itemsToAddInDb.length === 1) {
          await addItem(familyId, 'shopping', itemsToAddInDb[0]);
        } else if (itemsToAddInDb.length > 1) {
          await addItemsBatch(familyId, 'shopping', itemsToAddInDb);
        }
      }
      toast.success('Покупка успешно добавлена!');
    } catch (err) {
      console.error('Failed to add shopping item inline:', err);
      toast.error('Ошибка добавления покупок');
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
