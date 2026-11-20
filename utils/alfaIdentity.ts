/**
 * Stable document ID for a bank operation. Card/account identifiers are included
 * only in the SHA-256 input and never written to Firestore in plaintext.
 * An occurrence counter preserves distinct identical purchases in one statement.
 */
export const alfaOperationId = async (fields: readonly (string | number)[], occurrence: number): Promise<string> => {
  if (!Number.isSafeInteger(occurrence) || occurrence < 1) throw new Error('Invalid operation occurrence');
  const encoded = new TextEncoder().encode(JSON.stringify([1, fields, occurrence]));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return 'alfa_' + hex.slice(0, 40);
};
