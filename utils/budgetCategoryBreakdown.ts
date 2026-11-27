import { cents, money } from './budgetFinancialMath.ts';

type CategoryLike = {
  id: string;
  label: string;
  parentId?: string;
  color?: string;
};

type ExpenseLike = {
  type: string;
  category: string;
  amount: number;
};

export function resolveBudgetCategoryRoot(categoryId:string,byId:ReadonlyMap<string,{parentId?:string}>):string {
 let id=categoryId;
 const seen=new Set<string>();
 while(true){
  const category=byId.get(id);
  if(!category)return 'uncategorized';
  if(!category.parentId||!byId.has(category.parentId))return id;
  if(seen.has(id)||seen.has(category.parentId))return id;
  seen.add(id);id=category.parentId;
 }
}

export function budgetCategoryDescendantIds(id:string,categories:readonly {id:string;parentId?:string}[]):string[]{
 const ids=new Set([id]);
 let size=0;
 while(size!==ids.size){
  size=ids.size;
  for(const category of categories)if(category.parentId&&ids.has(category.parentId))ids.add(category.id);
 }
 return [...ids];
}

/**
 * A transaction contributes to exactly one root category (or "Без категории").
 * The UI previously lost third-level descendants and used floating-point totals.
 * Keep persisted category IDs and amounts unchanged.
 */
export function buildBudgetCategoryBreakdown(
  transactions: readonly ExpenseLike[],
  categories: readonly CategoryLike[]
): Array<CategoryLike & { sum: number }> {
  const byId = new Map(categories.map(category => [category.id, category]));
  const totals = new Map<string, number>();
  const uncategorizedId = 'uncategorized';

  for (const tx of transactions) {
    if (tx.type !== 'expense' || !Number.isFinite(tx.amount) || tx.amount <= 0) continue;
    const amount = cents(tx.amount);
    if (amount <= 0) continue;
    const id = resolveBudgetCategoryRoot(tx.category, byId);
    totals.set(id, (totals.get(id) || 0) + amount);
  }

  const categoryOrder = new Map(categories.map((category, index) => [category.id, index]));
  return [...totals.entries()]
    .map(([id, sum]) => {
      const category = byId.get(id) || { id: uncategorizedId, label: 'Без категории', color: '#858078' };
      return { ...category, sum: money(sum) };
    })
    .sort((a, b) => cents(b.sum) - cents(a.sum)
      || (categoryOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER)
       - (categoryOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}
