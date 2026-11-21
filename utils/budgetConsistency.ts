/** Pure helpers: avoid overwriting another family member's unrelated settings. */
export function diffSettings<T extends object>(
  previous: T,
  next: Partial<T>
): Partial<T> {
  const changes: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    const value=next[key];
    if (value === undefined) continue;
    if (JSON.stringify(value) === JSON.stringify(previous[key])) continue;
    if (key === 'manualPaidExpenses' && value && typeof value === 'object'
        && !Array.isArray(value)) {
      const oldMonths = (previous[key] || {}) as Record<string, unknown>;
      const nextMonths = value as Record<string, unknown>;
      const changedMonths = Object.fromEntries(Object.entries(nextMonths).filter(
        ([month, items]) => JSON.stringify(items) !== JSON.stringify(oldMonths[month])
      ));
      if (Object.keys(changedMonths).length) changes[key] = changedMonths as T[keyof T];
      continue;
    }
    changes[key]=value;
  }
  return changes;
}

/** A missing family-member link must not silently expose family-wide totals in personal mode. */
export function personalTransactions<T extends {memberId:string}>(
  transactions: readonly T[],
  mode: 'personal'|'family',
  memberId: string|undefined
): T[] {
  if (mode==='family') return [...transactions];
  if (!memberId) return [];
  return transactions.filter(tx=>tx.memberId===memberId);
}
