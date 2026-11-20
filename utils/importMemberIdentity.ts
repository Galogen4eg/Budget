import type { FamilyMember } from '../types';

/**
 * Never infer the payer from member ordering. In a shared family, an unbound
 * account must link its own profile before importing bank transactions.
 */
export function resolveImportMemberId(
  members: readonly FamilyMember[],
  signedInUserId: string | null | undefined
): string {
  if (!signedInUserId) throw new Error('Войдите в аккаунт перед импортом выписки');
  const linked = members.filter(member => member.userId === signedInUserId);
  if (linked.length === 0) {
    throw new Error('Ваш аккаунт не привязан к профилю семьи. Откройте Настройки → Семья и доступ и выберите свой профиль перед импортом.');
  }
  if (linked.length > 1) {
    throw new Error('Обнаружено несколько профилей, связанных с вашим аккаунтом. Исправьте привязку участников перед импортом.');
  }
  return linked[0].id;
}
