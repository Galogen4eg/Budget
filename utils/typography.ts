/**
 * Typography utility for proper Russian text formatting.
 * Prevents orphaned/hanging prepositions and short conjunctions by binding them to the following word
 * with a non-breaking space (\u00A0).
 */

const RUSSIAN_PREPOSITIONS_AND_PARTICLES = [
  'в', 'во', 'по', 'за', 'к', 'ко', 'на', 'с', 'со', 'от', 'до', 'из', 
  'о', 'об', 'обо', 'у', 'и', 'а', 'но', 'не', 'ни', 'для', 'при', 
  'под', 'над', 'без', 'про', 'сквозь', 'через', 'между', 'перед', 'со'
];

// Regex matching words followed by one or more regular spaces
const PREPOSITION_REGEX = new RegExp(
  `(^|[\\s(«"„])(${RUSSIAN_PREPOSITIONS_AND_PARTICLES.join('|')})\\s+`,
  'gi'
);

/**
 * Replaces regular space after Russian prepositions and short particles with non-breaking space (\u00A0)
 * so they wrap to the next line together with the next word instead of hanging at the end of the previous line.
 */
export const fixPrepositions = (text: string | null | undefined): string => {
  if (!text) return '';
  // Apply twice to handle sequences of prepositions like "и в", "а по"
  return text
    .replace(PREPOSITION_REGEX, '$1$2\u00A0')
    .replace(PREPOSITION_REGEX, '$1$2\u00A0');
};

/**
 * Format currency with separated thousands and optional kopecks.
 */
export const formatCurrencyWithKopecks = (amount: number | null | undefined): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₽';
  const hasKopecks = Math.abs(amount % 1) >= 0.005;
  const formatted = amount.toLocaleString('ru-RU', {
    minimumFractionDigits: hasKopecks ? 2 : 0,
    maximumFractionDigits: 2
  });
  return `${formatted} ₽`;
};

/**
 * Format number with space separators for thousands.
 */
export const formatNumberWithSeparators = (num: number | null | undefined): string => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  const hasDecimals = Math.abs(num % 1) >= 0.005;
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
};
