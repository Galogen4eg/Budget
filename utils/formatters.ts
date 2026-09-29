/**
 * Financial & Currency Formatting Utilities
 *
 * Provides safe, pure functions for currency formatting, privacy mode redaction,
 * compact amounts (e.g. 1.2M, 50k), and percentage representations.
 */

export interface FormatMoneyOptions {
  /** Currency symbol or code (defaults to '₽') */
  currency?: string;
  /** Whether privacy mode is enabled (returns masked string '•••') */
  privacy?: boolean;
  /** Prepend explicit positive sign '+' if amount > 0 */
  showSign?: boolean;
  /** Format absolute value Math.abs(amount) */
  absolute?: boolean;
  /** Fixed decimal digits (defaults to 0, i.e. integer rounding) */
  decimals?: number;
}

const PRIVACY_MASK = '•••';
const DEFAULT_CURRENCY = '₽';
const LOCALE_RU = 'ru-RU';

/**
 * Safely parses input into a valid finite number, falling back to 0.
 */
function sanitizeNumber(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  return value;
}

/**
 * Formats a numeric monetary amount with locale grouping and privacy support.
 *
 * @example
 * formatMoney(1500) // "1 500 ₽"
 * formatMoney(1500, { showSign: true }) // "+1 500 ₽"
 * formatMoney(-500) // "-500 ₽"
 * formatMoney(2000, { privacy: true }) // "•••"
 */
export function formatMoney(
  amount: number | null | undefined,
  options: FormatMoneyOptions = {}
): string {
  if (options.privacy) {
    return PRIVACY_MASK;
  }

  const raw = sanitizeNumber(amount);
  const target = options.absolute ? Math.abs(raw) : raw;
  const currencySymbol = options.currency ?? DEFAULT_CURRENCY;
  const decimals = options.decimals ?? 0;

  const rounded = decimals === 0 ? Math.round(target) : target;
  const formattedNumber = rounded.toLocaleString(LOCALE_RU, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = options.showSign && raw > 0 ? '+' : '';
  const spacer = currencySymbol ? ` ${currencySymbol}` : '';

  return `${sign}${formattedNumber}${spacer}`.trim();
}

/**
 * Formats large amounts compactly (e.g., "1.5M ₽", "45k ₽", "800 ₽")
 * Ideal for widgets, small cards, and compact charts.
 */
export function formatCompactMoney(
  amount: number | null | undefined,
  options: { privacy?: boolean; currency?: string } = {}
): string {
  if (options.privacy) {
    return PRIVACY_MASK;
  }

  const num = sanitizeNumber(amount);
  const currency = options.currency ?? DEFAULT_CURRENCY;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  let compactStr = '';
  if (abs >= 1_000_000) {
    compactStr = `${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  } else if (abs >= 1_000) {
    compactStr = `${(abs / 1_000).toFixed(0)}k`;
  } else {
    compactStr = `${Math.round(abs)}`;
  }

  return `${sign}${compactStr} ${currency}`.trim();
}

/**
 * Formats a ratio or percentage safely (e.g., 0.245 -> "25%" or "24.5%")
 */
export function formatPercent(
  value: number | null | undefined,
  options: { decimals?: number; isRatio?: boolean } = {}
): string {
  const num = sanitizeNumber(value);
  const percentage = options.isRatio ? num * 100 : num;
  const decimals = options.decimals ?? 0;

  return `${percentage.toFixed(decimals)}%`;
}
