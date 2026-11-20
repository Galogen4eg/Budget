import type { ShoppingItem, PantryItem } from '../types';

/** Move the latest committed shopping state, not a stale UI copy. */
export function preparePantryMove(
  existing: ShoppingItem | null,
  plannedPantry: PantryItem
): PantryItem {
  if (!existing) {
    throw new Error('Товар уже удалён или перенесён в кладовую на другом устройстве');
  }
  return {
    ...plannedPantry,
    title: existing.title,
    amount: existing.amount || '1',
    unit: existing.unit,
    category: existing.category
  };
}
