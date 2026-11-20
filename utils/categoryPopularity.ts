import type { Category, Transaction } from '../types';

/** Count saved operations by the most specific valid category ID. */
export function countCategoryUsage(transactions: Transaction[], categories: Category[]): Record<string, number> {
  const valid = new Set(categories.map(category => category.id));
  const counts: Record<string, number> = {};
  for (const tx of transactions) {
    const id = tx.subcategory && valid.has(tx.subcategory) ? tx.subcategory : tx.category;
    if (!id || !valid.has(id) || id === 'other') continue;
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

/** Sort by saved transaction frequency, aggregating subcategories into parents. */
export function sortCategoriesByPopularity(
  categories: Category[],
  usage: Record<string, number>
): Category[] {
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const siblings = children.get(category.parentId) || [];
    siblings.push(category.id);
    children.set(category.parentId, siblings);
  }
  const score = (id: string): number => {
    const direct = usage[id] || 0;
    return direct + (children.get(id) || []).reduce((sum, childId) => sum + (usage[childId] || 0), 0);
  };
  return [...categories].sort((a, b) =>
    score(b.id) - score(a.id) || a.label.localeCompare(b.label, 'ru')
  );
}
