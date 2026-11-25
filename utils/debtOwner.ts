/** A populated editor draft is new until it has a persisted debt ID. */
export function resolveDebtOwnerForSave(draft: {id?: string; memberId?: string} | null, owner: string | undefined, personal: boolean): string | undefined {
  if (!draft?.id) {
    if (!owner) throw new Error('Долг недоступен: не подтверждён участник семьи');
    return owner;
  }
  if (personal && (!owner || draft.memberId !== owner)) throw new Error('Долг недоступен');
  return draft.memberId || undefined;
}
