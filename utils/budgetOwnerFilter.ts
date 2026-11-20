import type { FamilyMember, Transaction, MandatoryExpense } from '../types';

/**
 * The personal view must not silently fall back to the family ledger when the
 * signed-in account has no linked family profile.
 */
export function filterByBudgetOwner<T extends { memberId?: string }>(
  items: readonly T[],
  budgetMode: 'family' | 'personal',
  members: readonly Pick<FamilyMember, 'id' | 'userId'>[],
  signedInUid: string | null | undefined
): T[] {
  if (budgetMode === 'family') return [...items];
  const ownProfile = members.find(member => member.userId && member.userId === signedInUid);
  if (!ownProfile) return [];
  return items.filter(item => item.memberId === ownProfile.id);
}

/** Shared, unassigned mandatory expenses are included only for linked members. */
export function filterMandatoryByBudgetOwner<T extends { memberId?: string }>(
  items: readonly T[],
  budgetMode: 'family' | 'personal',
  members: readonly Pick<FamilyMember, 'id' | 'userId'>[],
  signedInUid: string | null | undefined,
  memberFilter: string = 'all'
): T[] {
  if (memberFilter !== 'all') return items.filter(item => item.memberId === memberFilter);
  if (budgetMode === 'family') return [...items];
  const ownProfile = members.find(member => member.userId && member.userId === signedInUid);
  if (!ownProfile) return [];
  return items.filter(item => !item.memberId || item.memberId === ownProfile.id);
}
