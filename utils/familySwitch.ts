/**
 * Data migrations need a separate server-authorized workflow that preserves
 * the target family's members and existing financial records.
 */
export function validateFamilySwitch(
  currentFamilyId: string | null,
  targetFamilyId: string,
  copyData: boolean
): string {
  const target = targetFamilyId.trim();
  if (!target) throw new Error('ID семьи не указан');
  if (currentFamilyId === target) throw new Error('Вы уже находитесь в этой семье');
  if (copyData) {
    throw new Error('Перенос данных между семьями временно отключён: он может перезаписать чужие профили и операции. Присоединение по приглашению доступно без переноса.');
  }
  return target;
}
