import type { Category, TransactionType } from '../types';

// One classification for every transaction picker (manual, import, analyzer).
// Existing custom categories remain in the family catalog, without rewriting IDs.
const INCOME_IDS = new Set([
  'income', 'salary', 'benefits', 'income_interest', 'income_cashback',
  'income_refund', 'income_other'
]);
const BOTH_IDS = new Set(['transfer', 'savings']);

export function categoryScope(category: Category, all: Category[]): 'income' | 'expense' | 'both' {
  const seen = new Set<string>();
  let current: Category | undefined = category;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.transactionType === 'income' || INCOME_IDS.has(current.id)) return 'income';
    if (BOTH_IDS.has(current.id)) return 'both';
    current = current.parentId ? all.find(c => c.id === current!.parentId) : undefined;
  }
  return 'expense';
}

export function isCategoryForType(id: string, all: Category[], type: TransactionType): boolean {
  const found = all.find(c => c.id === id);
  if (!found) return false;
  const scope = categoryScope(found, all);
  return scope === 'both' || scope === type;
}

export function categoriesForType(all: Category[], type?: TransactionType): Category[] {
  return type ? all.filter(category => isCategoryForType(category.id, all, type)) : all;
}

/** Add only missing income definitions. Existing family docs and custom names win. */
export function missingIncomeCategories(defaults: Category[], saved: Category[]): Category[] {
  const ids = new Set(saved.map(c => c.id));
  return defaults.filter(c => INCOME_IDS.has(c.id) && !ids.has(c.id));
}
