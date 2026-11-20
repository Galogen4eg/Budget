import type { Category } from '../types';

/** Restore only the named shop subcategories and their required parents.
 * Never overwrite existing family categories or create an orphaned child.
 */
export function missingMerchantCategories(defaults: Category[], saved: Category[]): Category[] {
  const wanted = defaults.filter(category =>
    category.id === 'food' || category.id === 'restaurants' ||
    category.id.startsWith('grocery_') || category.id.startsWith('fastfood_')
  );
  const existingIds = new Set(saved.map(category => category.id));
  const seen = new Set(existingIds);
  const missing: Category[] = [];
  for (const category of wanted) {
    if (seen.has(category.id)) continue;
    if (category.parentId && !seen.has(category.parentId)) continue;
    missing.push(category);
    seen.add(category.id);
  }
  return missing;
}
