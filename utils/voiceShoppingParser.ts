import { detectProductCategory } from './categorizer';

export interface ParsedVoiceItem {
  title: string;
  amount: string;
  unit: 'шт' | 'кг' | 'л' | 'уп' | 'г';
  category: string;
  estimatedPrice: number;
}

const RUSSIAN_NUMBER_MAP: Record<string, number> = {
  'ноль': 0,
  'один': 1,
  'одна': 1,
  'одно': 1,
  'два': 2,
  'две': 2,
  'три': 3,
  'четыре': 4,
  'пять': 5,
  'шесть': 6,
  'семь': 7,
  'восемь': 8,
  'девять': 9,
  'десять': 10,
  'одиннадцать': 11,
  'двенадцать': 12,
  'тринадцать': 13,
  'четырнадцать': 14,
  'пятнадцать': 15,
  'двадцать': 20,
  'тридцать': 30,
  'сорок': 40,
  'пятьдесят': 50,
  'пол': 0.5,
  'полтора': 1.5,
  'полторы': 1.5,
  'полкило': 0.5,
  'пол-кило': 0.5,
  'полкилограмма': 0.5,
  'десяток': 10,
  'два десятка': 20,
  'дюжина': 12,
  'дюжину': 12,
};

const DEFAULT_CATEGORY_PRICES: Record<string, number> = {
  dairy: 120,
  produce: 150,
  household: 350,
  pharmacy: 400,
  meat: 420,
  bakery: 75,
  grocery: 110,
  drinks: 220,
  sweets: 160,
  frozen: 280,
  clothes: 600,
  electronics: 900,
  other: 150,
};

/**
 * Intelligent Russian Voice Parser for Shopping Items
 * Turns phrases like: "Купи два молока, буханку черного хлеба, полкило сыра и десяток яиц"
 * Into structured shopping items with extracted amount, unit, and auto-categorization.
 */
export const parseVoiceShoppingText = (rawInput: string): ParsedVoiceItem[] => {
  if (!rawInput || !rawInput.trim()) return [];

  let text = rawInput.toLowerCase().trim();

  // Remove common introductory & polite command prefixes
  const prefixRegex = /^(?:купи(?:ть)?|добавь(?:те)?(?:\s+(?:в|к)\s+список(?:\s+покупок)?)?|запиши(?:те)?|возьми(?:те)?|нужно(?:\s+купить)?|надо(?:\s+купить)?|пожалуйста|не\s+забудь(?:те)?(?:\s+купить)?)\s+/i;
  text = text.replace(prefixRegex, '');

  // Split by natural separators: commas, semicolons, conjunctions ("и", "а также", "да еще", "плюс", "затем")
  const delimiters = /[,;\n]|\s+и\s+|\s+а\s+также\s+|\s+да\s+еще\s+|\s+плюс\s+|\s+затем\s+|\s+потом\s+/i;
  const rawSegments = text.split(delimiters)
    .map(s => s.trim())
    .filter(s => s.length > 1);

  const parsedItems: ParsedVoiceItem[] = [];

  for (const segment of rawSegments) {
    let cleanSegment = segment
      .replace(/^(?:еще|также|тоже|заодно|пожалуйста)\s+/i, '')
      .replace(/\s+(?:пожалуйста|срочно)$/i, '')
      .trim();

    if (!cleanSegment) continue;

    let amount = '1';
    let unit: 'шт' | 'кг' | 'л' | 'уп' | 'г' = 'шт';

    // 1. Detect special word quantities like "полкило", "полтора", "десяток"
    if (cleanSegment.includes('полкило') || cleanSegment.includes('пол-кило') || cleanSegment.includes('полкилограмма')) {
      amount = '0.5';
      unit = 'кг';
      cleanSegment = cleanSegment.replace(/пол-?кило(?:грамма)?/g, '').trim();
    } else if (cleanSegment.includes('полтора') || cleanSegment.includes('полторы')) {
      amount = '1.5';
      cleanSegment = cleanSegment.replace(/полтор(?:а|ы)/g, '').trim();
    } else if (cleanSegment.includes('десяток') || cleanSegment.includes('десятка')) {
      amount = '10';
      unit = 'шт';
      cleanSegment = cleanSegment.replace(/десят(?:ок|ка|ков)/g, '').trim();
    } else if (cleanSegment.includes('дюжин')) {
      amount = '12';
      unit = 'шт';
      cleanSegment = cleanSegment.replace(/дюжин[а-я]*/g, '').trim();
    }

    // 2. Extract unit patterns: e.g. "2 кг", "500 г", "1.5 л", "3 пачки", "2 бутылки", "1 шт"
    const unitMatch = cleanSegment.match(/(\d+(?:[.,]\d+)?|\b(?:один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)\b)?\s*(кг|килограмм(?:а|ов)?|кило|г|грамм(?:а|ов)?|л|литр(?:а|ов)?|уп|упаков(?:ка|ки|ок)|пач(?:ка|ки|ек)|пакет(?:а|ов)?|бут(?:ылка|ылки|ылок)?|банк(?:а|и|ек)|шт|штук(?:а|и)?)\b/i);

    if (unitMatch) {
      const rawQty = unitMatch[1];
      const rawUnit = unitMatch[2]?.toLowerCase();

      if (rawQty) {
        if (/^\d+(?:[.,]\d+)?$/.test(rawQty)) {
          amount = rawQty.replace(',', '.');
        } else if (RUSSIAN_NUMBER_MAP[rawQty]) {
          amount = String(RUSSIAN_NUMBER_MAP[rawQty]);
        }
      }

      if (rawUnit) {
        if (rawUnit.startsWith('кг') || rawUnit.startsWith('кило')) {
          unit = 'кг';
        } else if (rawUnit.startsWith('г') || rawUnit.startsWith('грамм')) {
          unit = 'г';
        } else if (rawUnit.startsWith('л') || rawUnit.startsWith('литр')) {
          unit = 'л';
        } else if (rawUnit.startsWith('уп') || rawUnit.startsWith('пач') || rawUnit.startsWith('пакет')) {
          unit = 'уп';
        } else {
          unit = 'шт';
        }
      }

      // Remove the matched quantity and unit from item title
      cleanSegment = cleanSegment.replace(unitMatch[0], ' ').trim();
    } else {
      // 3. Check for standalone numbers: e.g. "яблоки 2", "молоко 3" or words "два молока"
      const numberPrefixMatch = cleanSegment.match(/^(\d+(?:[.,]\d+)?|\b(?:один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)\b)\s+(.+)$/i);
      const numberSuffixMatch = cleanSegment.match(/^(.+?)\s+(\d+(?:[.,]\d+)?|\b(?:один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)\b)$/i);

      if (numberPrefixMatch) {
        const rawQty = numberPrefixMatch[1];
        amount = /^\d+/.test(rawQty) ? rawQty.replace(',', '.') : String(RUSSIAN_NUMBER_MAP[rawQty] || 1);
        cleanSegment = numberPrefixMatch[2].trim();
      } else if (numberSuffixMatch) {
        const rawQty = numberSuffixMatch[2];
        amount = /^\d+/.test(rawQty) ? rawQty.replace(',', '.') : String(RUSSIAN_NUMBER_MAP[rawQty] || 1);
        cleanSegment = numberSuffixMatch[1].trim();
      }
    }

    // Clean up residual words like "буханка", "пачка", "банка", "штук"
    cleanSegment = cleanSegment
      .replace(/\b(?:буханк[а-я]*|пачк[а-я]*|пакет[а-я]*|бутылк[а-я]*|штук[а-я]*)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!cleanSegment) continue;

    // Capitalize first letter
    const title = cleanSegment.charAt(0).toUpperCase() + cleanSegment.slice(1);
    const category = detectProductCategory(title);

    // Default context-aware units if still default 'шт'
    if (unit === 'шт') {
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('молоко') || lowerTitle.includes('сок') || lowerTitle.includes('кефир') || lowerTitle.includes('вода') || lowerTitle.includes('масло растительное')) {
        unit = 'л';
      } else if (lowerTitle.includes('картофель') || lowerTitle.includes('картошка') || lowerTitle.includes('яблок') || lowerTitle.includes('банан') || lowerTitle.includes('помидор') || lowerTitle.includes('огурц') || lowerTitle.includes('мука') || lowerTitle.includes('сахар') || lowerTitle.includes('мясо') || lowerTitle.includes('куриц')) {
        unit = 'кг';
      }
    }

    const estimatedPrice = DEFAULT_CATEGORY_PRICES[category] || 150;

    parsedItems.push({
      title,
      amount,
      unit,
      category,
      estimatedPrice
    });
  }

  return parsedItems;
};
