import type { Transaction } from '../types';

type AlfaCandidate = Pick<Transaction, 'id' | 'date' | 'amount' | 'type' | 'note' | 'rawNote'>;

/**
 * Bank-issued stable IDs are authoritative. Approximate matching is retained
 * only for older/manual transactions without the stable Alfa ID, so two real
 * purchases with identical merchant, amount and timestamp aren't discarded.
 */
export function isAlfaOperationDuplicate(
  existing: readonly AlfaCandidate[],
  incoming: AlfaCandidate
): boolean {
  return existing.some(saved => {
    if (saved.id === incoming.id) return true;
    if (saved.id.startsWith('alfa_') && incoming.id.startsWith('alfa_')) {
      return false;
    }
    const existingTime = new Date(saved.date).getTime();
    const incomingTime = new Date(incoming.date).getTime();
    return Number.isFinite(existingTime) && Number.isFinite(incomingTime)
      && Math.abs(existingTime - incomingTime) < 2000
      && Math.abs(saved.amount - incoming.amount) < 0.01
      && saved.type === incoming.type
      && (saved.rawNote === incoming.rawNote || saved.note === incoming.note);
  });
}
