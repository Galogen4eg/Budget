import type { FamilyMember } from '../types';

/**
 * Prepares one family member and its optional email invitation.
 * This function has no Firestore side effects; both documents are saved in one batch by the caller.
 */
export function prepareFamilyMemberInvitation(
  familyId: string,
  member: FamilyMember,
  existingMembers: readonly FamilyMember[]
): { member: FamilyMember; invitation: { familyId: string; placeholderMemberId: string; email: string } | null } {
  if (!familyId.trim()) throw new Error('Семейное пространство недоступно');
  if (!member.id.trim() || !member.name.trim()) throw new Error('Не указан участник семьи');
  const email = member.email?.trim().toLowerCase() || '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Некорректный email участника');
  }
  if (existingMembers.some(existing => existing.id === member.id ||
    (email && existing.email?.trim().toLowerCase() === email))) {
    throw new Error('Участник с таким ID или email уже существует');
  }

  return {
    member: { ...member, email: email || undefined },
    invitation: email ? { familyId, placeholderMemberId: member.id, email } : null
  };
}

/** Ensures cancelling an unclaimed invitation never revokes or silently deletes an active account. */
export function validateUnclaimedMemberRemoval(
  familyId: string,
  member: FamilyMember,
  invitation: { familyId?: string; placeholderMemberId?: string } | null
): boolean {
  if (member.userId) throw new Error('Нельзя удалить профиль, привязанный к аккаунту');
  if (member.isAdmin) throw new Error('Нельзя удалить профиль администратора');
  return Boolean(invitation &&
    invitation.familyId === familyId &&
    invitation.placeholderMemberId === member.id);
}

/** A rejoining member already has a profile: do not create another one. */
export function resolveFamilyJoin(
  existingMemberIds: readonly string[] | unknown,
  uid: string,
  invitation: { placeholderMemberId?: string } | null
): { existingMember: boolean; placeholderMemberId: string | null } {
  const existingMember = Array.isArray(existingMemberIds) && existingMemberIds.includes(uid);
  if (existingMember) return { existingMember: true, placeholderMemberId: null };
  if (invitation) {
    const placeholderMemberId = invitation.placeholderMemberId?.trim();
    if (!placeholderMemberId) throw new Error('Некорректное приглашение: профиль участника не указан');
    return { existingMember, placeholderMemberId };
  }
  if (!existingMember) throw new Error('Для присоединения требуется приглашение на email этого аккаунта');
  return { existingMember: true, placeholderMemberId: null };
}

/** Prevent a global email invitation from being silently overwritten by another family. */
export function assertInvitationAvailable(
  existing: { familyId?: string; placeholderMemberId?: string } | null
): void {
  if (existing) throw new Error('На этот email уже существует приглашение. Сначала отмените предыдущее.');
}
