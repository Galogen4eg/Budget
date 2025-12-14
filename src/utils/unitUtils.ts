export const getUnitLabel = (unit: string, count: number): string => {
  if (unit === 'pcs') {
    if (count % 10 === 1 && count % 100 !== 11) return 'штука';
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'штуки';
    return 'штук';
  }
  return unit; // For other units without declension
};

export const getDefaultUnitValue = (unit: string): number => {
  switch (unit) {
    case 'liters':
      return 1;
    case 'grams':
    case 'kg':
      return 100;
    default:
      return 1; // pcs
  }
};