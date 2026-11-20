import type { FamilyMember } from '../types';

/** Bind a signed-in user to an unclaimed family profile without taking over another account. */
export function bindFamilyProfile(
  members: readonly FamilyMember[],
  userId: string | null,
  targetMemberId: string
): FamilyMember[] {
  if (!userId) throw new Error('Войдите в аккаунт, чтобы выбрать профиль');
  if (targetMemberId === 'guest') {
    return members.map(m => m.userId === userId ? { ...m, userId: null } : { ...m });
  }
  const target = members.find(m => m.id === targetMemberId);
  if (!target) throw new Error('Профиль участника не найден');
  if (target.userId && target.userId !== userId) {
    throw new Error('Этот профиль уже принадлежит другому пользователю');
  }
  return members.map(m => {
    if (m.id === targetMemberId) return { ...m, userId };
    if (m.userId === userId) return { ...m, userId: null };
    return { ...m };
  });
}
