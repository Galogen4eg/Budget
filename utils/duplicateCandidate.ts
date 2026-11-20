import type { Transaction } from '../types';

/** A suggestion only: user must still approve deletion of potential duplicates. */
export function arePotentialDuplicates(
  a: Pick<Transaction,'date'|'amount'|'type'|'memberId'|'note'|'rawNote'>,
  b: Pick<Transaction,'date'|'amount'|'type'|'memberId'|'note'|'rawNote'>
): boolean {
  if (!a.memberId || !b.memberId || a.memberId !== b.memberId) return false;
  if (a.type !== b.type || !Number.isFinite(a.amount) || !Number.isFinite(b.amount)) return false;
  if (Math.abs(a.amount - b.amount) >= 0.01) return false;
  const firstTime = new Date(a.date).getTime();
  const secondTime = new Date(b.date).getTime();
  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime) ||
      Math.abs(firstTime - secondTime) > 86400000) return false;
  const noteA = a.note?.trim().toLocaleLowerCase('ru-RU') || '';
  const noteB = b.note?.trim().toLocaleLowerCase('ru-RU') || '';
  const rawA = a.rawNote?.trim().toLocaleLowerCase('ru-RU') || '';
  const rawB = b.rawNote?.trim().toLocaleLowerCase('ru-RU') || '';
  return Boolean((noteA && noteA === noteB) || (rawA && rawA === rawB));
}
