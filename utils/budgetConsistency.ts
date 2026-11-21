/** Pure helpers: avoid overwriting another family member's unrelated settings. */
export function diffSettings<T extends Record<string, unknown>>(
  previous: T,
  next: Partial<T>
): Partial<T> {
  const changes: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    const value=next[key];
    if (value === undefined) continue;
    if (JSON.stringify(value) !== JSON.stringify(previous[key])) changes[key]=value;
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
