import type { FamilyMember } from '../types';

/** A bank statement may only be attributed to the authenticated family profile. */
export function resolveImportMemberId(
  members: readonly FamilyMember[],
  signedInUserId: string | null | undefined
): string {
  if (!signedInUserId) throw new Error('Войдите в аккаунт перед импортом выписки');
  const linked = members.filter(member => member.userId === signedInUserId);
  if (linked.length === 0)
    throw new Error('Ваш аккаунт не привязан к профилю семьи. Откройте Настройки → Семья и доступ и выберите свой профиль перед импортом.');
  if (linked.length > 1)
    throw new Error('Обнаружено несколько профилей, связанных с вашим аккаунтом. Исправьте привязку участников перед импортом.');
  return linked[0].id;
}

/** Recheck after reviewing the preview; never trust an old selected member. */
export function assertImportRowsBelongToMember(
  items: readonly {memberId?: string | null}[],
  memberId: string
): void {
  if (!memberId || items.some(item => item.memberId !== memberId))
    throw new Error('В выписке указан другой участник семьи. Повторно откройте файл после выбора своего профиля.');
}
