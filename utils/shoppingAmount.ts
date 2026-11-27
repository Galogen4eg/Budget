/** Preserve quantities to a thousandth (one gram/millilitre) without floating-point drift. */
export function nextShoppingAmount(current: string | number | undefined, delta: number, minimum = 1): string {
  if (!Number.isFinite(delta) || !Number.isFinite(minimum) || minimum <= 0) {
    throw new Error('Invalid shopping quantity adjustment');
  }
  const parsed = Number.parseFloat(String(current ?? '1').replace(',', '.'));
  const safeCurrent = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const nextThousandths = Math.max(Math.round(minimum * 1000), Math.round(safeCurrent * 1000) + Math.round(delta * 1000));
  return String(nextThousandths / 1000);
}

/** Same quantity increment on desktop and mobile; fractional food/liquid, whole packaged goods. */
export function shoppingQuantityStep(unit: string | undefined): number {
  const normalized=(unit || 'шт').trim().toLocaleLowerCase('ru-RU');
  return normalized === 'кг' || normalized === 'л' ? 0.5 : 1;
}

/** Validate form quantities before Firestore writes; rejects text with trailing garbage. */
export function parseShoppingQuantity(value: string | number, unit?: string): string | null {
  const normalized=String(value).trim().replace(',', '.');
  const fractional = unit === 'кг' || unit === 'л';
  if (!(fractional ? /^\d+(?:\.\d{1,3})?$/ : /^\d+(?:\.\d)?$/).test(normalized)) return null;
  const parsed=Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 10000) return null;
  return String(parsed);
}
