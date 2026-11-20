import type { FamilyMember } from '../types';

/** The "all members" filter is not a valid owner for a newly created expense. */
export function resolveQuickExpenseMember(
  members: readonly Pick<FamilyMember, 'id'|'userId'>[],
  uid: string | null | undefined,
  selectedMember: string
): string {
  if (!uid) throw new Error('Войдите в аккаунт для добавления операции');
  if (selectedMember !== 'all') {
    if (!members.some(member => member.id === selectedMember)) {
      throw new Error('Выбранный участник семьи не найден');
    }
    return selectedMember;
  }
  const matches = members.filter(member => member.userId === uid);
  if (matches.length === 0) {
    throw new Error('Ваш аккаунт не привязан к профилю семьи. Выберите свой профиль в настройках');
  }
  if (matches.length > 1) {
    throw new Error('Обнаружено несколько профилей вашего аккаунта. Исправьте привязку в настройках');
  }
  return matches[0].id;
}
