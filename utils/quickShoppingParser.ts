import { detectProductCategory } from './categorizer';
import { ShoppingItem } from '../types';

export interface ParsedQuickShoppingItem {
  title: string;
  amount: string;
  unit: 'шт' | 'кг' | 'уп' | 'л';
  category: string;
  rawInput: string;
}

const RUSSIAN_NUMBER_WORDS: Record<string, number> = {
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
  'полтора': 1.5,
  'полторы': 1.5,
  'пол': 0.5,
  'полкило': 0.5,
  'полкилограмма': 0.5,
  'десяток': 10,
  'дюжина': 12,
};

/**
 * Parses a single item text (e.g., "чипсы 2 шт", "2 пачки чипсов", "молоко 1.5 л", "бананы 2кг")
 * and extracts name, amount, unit, and category.
 */
export const parseSingleQuickShoppingText = (rawInput: string): ParsedQuickShoppingItem | null => {
  if (!rawInput || !rawInput.trim()) return null;

  let text = rawInput.trim();

  // Clean introductory polite prefixes
  text = text.replace(/^(?:купи(?:ть)?|добавь(?:те)?|возьми(?:те)?|запиши(?:те)?|надо|нужно|пожалуйста)\s+/i, '').trim();
  if (!text) return null;

  let amount = '1';
  let unit: 'шт' | 'кг' | 'уп' | 'л' = 'шт';
  let cleanTitle = text;

  // 1. Check special Russian word quantities: "полкило", "полтора", "десяток"
  if (/пол-?кило(?:грамм[а-я]*)?/i.test(cleanTitle)) {
    amount = '0.5';
    unit = 'кг';
    cleanTitle = cleanTitle.replace(/пол-?кило(?:грамм[а-я]*)?/gi, '').trim();
  } else if (/полтор(?:а|ы)/i.test(cleanTitle)) {
    amount = '1.5';
    cleanTitle = cleanTitle.replace(/полтор(?:а|ы)/gi, '').trim();
  } else if (/десят(?:ок|ка|ков)/i.test(cleanTitle)) {
    amount = '10';
    unit = 'шт';
    cleanTitle = cleanTitle.replace(/десят(?:ок|ка|ков)/gi, '').trim();
  } else if (/дюжин[а-я]*/i.test(cleanTitle)) {
    amount = '12';
    unit = 'шт';
    cleanTitle = cleanTitle.replace(/дюжин[а-я]*/gi, '').trim();
  }

  // 2. Look for pattern: <Number> + <Unit> anywhere in string, or attached e.g. "2шт", "1.5л", "2кг", "500г"
  // Example matches: "2 шт", "2 штуки", "2штуки", "1.5 л", "1,5л", "300 г", "300грамм", "2 пачки", "1 уп", "1уп"
  const unitRegex = /(?:^|\s|,)(\d+(?:[.,]\d+)?|\b(?:один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)\b)?\s*(кг|килограмм(?:а|ов)?|кило|г|грамм(?:а|ов)?|гр|л|литр(?:а|ов|е)?|уп|упаков(?:ка|ки|ок|ку)|пач(?:ка|ки|ек|ку)|пакет(?:а|ов|ик)?|бут(?:ылка|ылки|ылок|ылку)?|банк(?:а|и|ек|у)?|шт|штук(?:а|и|ек|у)?)(?:\s|$|,)/i;

  const match = cleanTitle.match(unitRegex);

  if (match) {
    const rawQty = match[1];
    const rawUnit = match[2]?.toLowerCase();

    if (rawQty) {
      if (/^\d+(?:[.,]\d+)?$/.test(rawQty)) {
        amount = rawQty.replace(',', '.');
      } else if (RUSSIAN_NUMBER_WORDS[rawQty.toLowerCase()]) {
        amount = String(RUSSIAN_NUMBER_WORDS[rawQty.toLowerCase()]);
      }
    }

    if (rawUnit) {
      if (rawUnit.startsWith('кг') || rawUnit.startsWith('кило')) {
        unit = 'кг';
      } else if (rawUnit.startsWith('г') || rawUnit.startsWith('гр') || rawUnit.startsWith('грамм')) {
        // If grams specified, convert >= 100g to kg (e.g. 300g -> 0.3 кг)
        const numericVal = parseFloat(amount) || 0;
        if (numericVal >= 50) {
          amount = String(parseFloat((numericVal / 1000).toFixed(3)));
          unit = 'кг';
        } else {
          unit = 'шт';
        }
      } else if (rawUnit.startsWith('л') || rawUnit.startsWith('литр')) {
        unit = 'л';
      } else if (rawUnit.startsWith('уп') || rawUnit.startsWith('пач') || rawUnit.startsWith('пакет') || rawUnit.startsWith('бут') || rawUnit.startsWith('банк')) {
        unit = 'уп';
      } else {
        unit = 'шт';
      }
    }

    // Remove the matched unit and quantity from title
    cleanTitle = cleanTitle.replace(match[0], ' ').trim();
  } else {
    // 3. Check for trailing standalone number: e.g. "чипсы 2", "молоко 3"
    const trailingNumMatch = cleanTitle.match(/^(.*?)(?:\s+)(\d+(?:[.,]\d+)?)$/i);
    // 4. Check for leading standalone number: e.g. "2 чипсы", "3 молоко"
    const leadingNumMatch = cleanTitle.match(/^(\d+(?:[.,]\d+)?)(?:\s+)(.*?)$/i);

    if (trailingNumMatch) {
      amount = trailingNumMatch[2].replace(',', '.');
      cleanTitle = trailingNumMatch[1].trim();
    } else if (leadingNumMatch) {
      amount = leadingNumMatch[1].replace(',', '.');
      cleanTitle = leadingNumMatch[2].trim();
    }
  }

  // Clean residual punctuation & excess whitespace
  cleanTitle = cleanTitle
    .replace(/[^\w\sа-яёА-ЯЁ0-9%.-]/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleanTitle) return null;

  // Capitalize first letter
  const title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const category = detectProductCategory(title);

  // Context-aware unit adjustment if unit is default 'шт'
  if (unit === 'шт') {
    const lower = title.toLowerCase();
    if (lower.includes('молоко') || lower.includes('сок') || lower.includes('кефир') || lower.includes('вода') || lower.includes('квас') || lower.includes('вино') || lower.includes('пиво')) {
      unit = 'л';
    } else if (lower.includes('картофель') || lower.includes('картошка') || lower.includes('яблок') || lower.includes('банан') || lower.includes('помидор') || lower.includes('огурц') || lower.includes('мука') || lower.includes('сахар') || lower.includes('мясо') || lower.includes('куриц') || lower.includes('фарш') || lower.includes('говядин') || lower.includes('свинин')) {
      unit = 'кг';
    }
  }

  return {
    title,
    amount,
    unit,
    category,
    rawInput
  };
};

/**
 * Parses user input that may contain multiple items separated by commas, semicolons, newlines, or "и"
 * e.g. "чипсы 2 шт, молоко 1.5 л, сыр 300г"
 */
export const parseQuickShoppingInput = (input: string): ParsedQuickShoppingItem[] => {
  if (!input || !input.trim()) return [];

  // Split by commas, semicolons, newlines, or conjunction "и" surrounded by spaces
  const segments = input
    .split(/[,;\n]|\s+и\s+/i)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const results: ParsedQuickShoppingItem[] = [];

  for (const seg of segments) {
    const parsed = parseSingleQuickShoppingText(seg);
    if (parsed) {
      results.push(parsed);
    }
  }

  // Fallback: If nothing was parsed from splitting, try entire input as single item
  if (results.length === 0) {
    const fallback = parseSingleQuickShoppingText(input);
    if (fallback) results.push(fallback);
  }

  return results;
};

/**
 * Helper to generate full ShoppingItem objects ready for database saving
 */
export const createShoppingItemsFromQuickText = (
  text: string, 
  memberId: string = 'user'
): Omit<ShoppingItem, 'id'>[] => {
  const parsedItems = parseQuickShoppingInput(text);
  
  return parsedItems.map(item => ({
    title: item.title,
    amount: item.amount,
    unit: item.unit,
    category: item.category,
    completed: false,
    memberId: memberId,
    priority: 'medium' as const,
    estimatedPrice: 150
  }));
};
