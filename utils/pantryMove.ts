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

export function normalizePantryEdit(input: Pick<PantryItem,'amount'|'unit'> & {expiryDate:string}) {
 const amount=input.amount.trim().replace(',','.'), unit=input.unit.trim(), expiryDate=input.expiryDate.trim();
 if(!/^\d+(?:\.\d+)?$/.test(amount)||!Number.isFinite(Number(amount))||Number(amount)<=0)throw Error('Укажите положительное количество');
 if(!unit||unit.length>30)throw Error('Укажите единицу измерения');
 if(expiryDate){const d=new Date(expiryDate+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==expiryDate)throw Error('Проверьте срок годности');}
 return {amount,unit,expiryDate};
}
