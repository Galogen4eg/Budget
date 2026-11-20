import type { FamilyMember } from '../types';

/** Store family profile IDs, never Firebase auth UIDs or a guessed first member. */
export function resolveShoppingMemberId(
  members: readonly Pick<FamilyMember,'id'|'userId'>[],
  uid: string | null | undefined,
  selectedMemberId: string = 'all'
): string {
  if (!uid) throw new Error('Войдите в аккаунт, чтобы добавить покупку');
  if (selectedMemberId && selectedMemberId !== 'all') {
    if (!members.some(member => member.id === selectedMemberId)) {
      throw new Error('Выбранный участник семьи не найден');
    }
    return selectedMemberId;
  }
  const linked = members.filter(member => member.userId === uid);
  if (linked.length === 0) {
    throw new Error('Ваш аккаунт не привязан к профилю семьи. Выберите свой профиль в настройках');
  }
  if (linked.length > 1) {
    throw new Error('Найдено несколько профилей, привязанных к аккаунту. Исправьте привязку');
  }
  return linked[0].id;
}
