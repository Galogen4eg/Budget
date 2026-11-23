/** Calculate the next shopping quantity using tenths to avoid floating-point drift. */
export function nextShoppingAmount(current: string | number | undefined, delta: number, minimum = 1): string {
  if (!Number.isFinite(delta) || !Number.isFinite(minimum) || minimum <= 0) {
    throw new Error('Invalid shopping quantity adjustment');
  }
  const parsed = Number.parseFloat(String(current ?? '1').replace(',', '.'));
  const safeCurrent = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const nextTenths = Math.max(Math.round(minimum * 10), Math.round(safeCurrent * 10) + Math.round(delta * 10));
  return String(nextTenths / 10);
}

/** Same quantity increment on desktop and mobile; fractional food/liquid, whole packaged goods. */
export function shoppingQuantityStep(unit: string | undefined): number {
  const normalized=(unit || 'шт').trim().toLocaleLowerCase('ru-RU');
  return normalized === 'кг' || normalized === 'л' ? 0.5 : 1;
}

/** Validate form quantities before Firestore writes; rejects text with trailing garbage. */
export function parseShoppingQuantity(value: string | number): string | null {
  const normalized=String(value).trim().replace(',', '.');
  if (!/^\d+(?:\.\d)?$/.test(normalized)) return null;
  const parsed=Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 10000) return null;
  return String(Math.round(parsed * 10) / 10);
}
