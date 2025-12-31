
import { Category, LearnedRule } from '../types';

export const MERCHANT_DATA: Record<string, [string, string?, string?]> = {
  // YAROSLAVL & REGIONAL
  'lotos': ['Лотос', undefined, '#00A651'],
  'vysshaya liga': ['Высшая Лига', undefined, '#ED1C24'],
  'atrus': ['Атрус', undefined, '#ED1C24'],
  'broiler': ['Яр. Бройлер', undefined, '#F39200'],
  'maksi': ['Макси', undefined, '#00A651'],
  'aura': ['ТРЦ Аура', undefined, '#E91E63'],
  'altair': ['ТРК Альтаир', undefined, '#3F51B5'],
  'globus': ['Глобус', undefined, '#FF6600'],
  'rio': ['РИО', undefined, '#FFC107'],
  'vernisazh': ['Вернисаж', undefined, '#9C27B0'],
  'mamuka': ['Мамука', 'restaurants', '#000000'],
  'maneki': ['Манеки', 'restaurants', '#D32F2F'],
  'bazar': ['Базар', 'restaurants', '#4CAF50'],
  'yarneft': ['Ярнефть', 'lukoil', '#FF5722'],
  'apteka 76': ['Аптека 76', 'health', '#4CAF50'],
  'farma': ['Ярославская фармация', 'health', '#2196F3'],
  'yar.energo': ['ТНС Энерго', 'utilities', '#FFC107'],
  'tgk-2': ['ТГК-2', 'utilities', '#FF5722'],
  'vodokanal': ['Водоканал', 'utilities', '#03A9F4'],

  // FEDERAL
  'magnit': ['Магнит', 'magnit', '#E62E2D'],
  'магнит': ['Магнит', 'magnit', '#E62E2D'],
  'pyaterochka': ['Пятерочка', 'pyaterochka', '#2FAC66'],
  'пятерочка': ['Пятерочка', 'pyaterochka', '#2FAC66'],
  'perekrestok': ['Перекресток', 'perekrestok', '#003366'],
  'перекресток': ['Перекресток', 'perekrestok', '#003366'],
  'ashan': ['Ашан', 'auchan', '#E7292C'],
  'auchan': ['Ашан', 'auchan', '#E7292C'],
  'lenta': ['Лента', 'lenta', '#003399'],
  'лента': ['Лента', 'lenta', '#003399'],
  'dixy': ['Дикси', undefined, '#F58220'],
  'vkusvill': ['ВкусВилл', 'vkusvill', '#00704A'],
  'metro': ['Metro', 'metro', '#002D72'],
  'okey': ['Окей', undefined, '#DA291C'],
  'chizhik': ['Чижик', undefined, '#FFCC00'],
  'svetofor': ['Светофор', undefined, '#FFED00'],
  'vernyi': ['Верный', undefined, '#DA291C'],
  'bristol': ['Бристоль', undefined, '#DA291C'],
  'krasnoe': ['Красное & Белое', undefined, '#DA291C'],
  'kib': ['Красное & Белое', undefined, '#DA291C'],
  'fix price': ['Fix Price', 'fixprice', '#0056A3'],
  'samokat': ['Самокат', 'samokat', '#FF4D6D'],
  'kuper': ['Купер', 'sber', '#21A038'],
  'spar': ['Spar', undefined, '#006233'],
  'burger king': ['Burger King', 'burgerking', '#D62300'],
  'kfc': ['KFC', 'kfc', '#E4002B'],
  'rostics': ['Rostics', 'kfc', '#E4002B'],
  'vnoit': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'вкусно и точка': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'dodo': ['Додо Пицца', 'dodo', '#FF6900'],
  'wildberries': ['Wildberries', 'wildberries', '#CB11AB'],
  'ozon': ['Ozon', 'ozon', '#005BFF'],
  'yandex.go': ['Яндекс Go', 'yandex', '#FC3F1D'],
  'sber': ['Сбербанк', 'sber', '#21A038'],
  'tinkoff': ['Т-Банк', 'tinkoff', '#FFDD2D'],
  'alfa': ['Альфа-Банк', 'alfa', '#EF3124'],
  'vtb': ['ВТБ', 'vtb', '#002882'],
  'lukoil': ['Лукойл', 'lukoil', '#ED1C24'],
};

export const getMerchantBrandKey = (name: string): string | undefined => {
  const lowName = name.toLowerCase();
  if (lowName.includes('yandex') || lowName.includes('яндекс')) return 'yandex';
  if (lowName.includes('sber') || lowName.includes('сбер')) return 'sber';
  for (const [key, data] of Object.entries(MERCHANT_DATA)) {
    if (lowName.includes(key)) return data[1];
  }
  return undefined;
};

export const cleanMerchantName = (rawNote: string, learnedRules: LearnedRule[] = []): string => {
  let name = rawNote.trim();
  const lowNote = name.toLowerCase();

  for (const rule of learnedRules) {
    if (lowNote.includes(rule.keyword.toLowerCase())) return rule.cleanName;
  }

  // Improved SBP Recognition
  const sbpRegex = /(?:через|via)?\s*(?:Систему|Система)\s*быстрых\s*платежей.*?(?:\+7|8|7)?\s*(\d{10})/i;
  const sbpMatch = name.match(sbpRegex);

  if (sbpMatch) {
      const phone = sbpMatch[1];
      const formatted = `+7 ${phone.slice(0,3)} ${phone.slice(3,6)}-${phone.slice(6,8)}-${phone.slice(8)}`;
      
      // Try to find a name if present (e.g., Ivan I.)
      const nameMatch = name.match(/([А-ЯЁ][а-яё]+)\s([А-ЯЁ])\./);
      const person = nameMatch ? ` (${nameMatch[1]} ${nameMatch[2]}.)` : '';
      
      return `Перевод СБП ${formatted}${person}`;
  }

  // Generic SBP / Transfer catch
  const phoneRegex = /(?:(?:\+?7|8)[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}|\b\d{10,11}\b/;
  const phoneMatch = name.match(phoneRegex);
  
  if (lowNote.includes('сбп') || lowNote.includes('sbp') || lowNote.includes('перевод') || lowNote.includes('transfer')) {
      if (phoneMatch) {
          const rawPhone = phoneMatch[0].replace(/\D/g, '');
          let clean = rawPhone;
          if (rawPhone.length === 11 && (rawPhone.startsWith('7') || rawPhone.startsWith('8'))) {
              clean = rawPhone.slice(1);
          }
          if (clean.length === 10) {
              const formattedPhone = `+7 ${clean.slice(0, 3)} ${clean.slice(3, 6)}-${clean.slice(6, 8)}-${clean.slice(8)}`;
              return `Перевод ${formattedPhone}`;
          }
      }
      if (lowNote.includes('сбп') || lowNote.includes('sbp')) return "Перевод по СБП";
      return "Перевод средств";
  }

  for (const [key, data] of Object.entries(MERCHANT_DATA)) {
    if (lowNote.includes(key)) return data[0];
  }

  name = name.replace(/^(Retail|Rus|Oplata|Покупка|Оплата|Списание|Зачисление|C2C|Card2Card|Transfer|Card to Card|Retail Rus|RUS)\s+/gi, '');
  const cityNoise = /\s(MOSCOW|RU|RUS|SPB|EKATERINBURG|KAZAN|SAMARA|OMSK|ROSTOV|UFA|PERM|VOLGOGRAD|KRASNODAR|CHELYABINSK|NOVOSIBIRSK|YAROSLAVL)$/i;
  name = name.replace(cityNoise, '').replace(/\d{2}\.\d{2}\.\d{2}\s\d{2}:\d{2}/g, '').replace(/[*/]{1,}\d{4}/g, '').replace(/\s[A-Z0-9]{6,}\s?/g, ' ').replace(/\s(OOO|IP|ООО|ИП|AO)\s/gi, ' ').replace(/[>|_\\/]/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (name.length > 0) name = name.charAt(0).toUpperCase() + name.slice(1);
  return name.length < 2 ? "Банковская операция" : name;
};

export const getSmartCategory = (note: string, learnedRules: LearnedRule[] = [], categories: Category[], mcc?: string, bankCategory?: string): string => {
  const cleanNote = note.toLowerCase();
  for (const rule of learnedRules) {
    if (cleanNote.includes(rule.keyword.toLowerCase())) return rule.categoryId;
  }
  
  // SBP logic for categories
  if (cleanNote.includes('сбп') || cleanNote.includes('sbp') || cleanNote.includes('перевод') || cleanNote.includes('transfer') || cleanNote.includes('систему быстрых платежей')) return 'transfer';

  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'food': ['magnit', 'магнит', 'pyaterochka', 'пятерочка', 'perekrestok', 'перекресток', 'ashan', 'auchan', 'lenta', 'лента', 'dixy', 'дикси', 'vkusvill', 'вкусвилл', 'samokat', 'самокат', 'lotos', 'лотос', 'atrus', 'атрус'],
    'restaurants': ['burger king', 'kfc', 'rostics', 'vnoit', 'dodo', 'teremok', 'shokoladnitsa', 'cofix', 'coffee', 'cafe', 'кафе', 'ресторан', 'mamuka', 'maneki', 'bazar', 'мамука', 'манеки'],
    'auto': ['lukoil', 'лукойл', 'rosneft', 'роснефть', 'gazprom', 'gpn', 'shell', 'tatneft', 'azs', 'азс', 'auto', 'авто', 'yarneft', 'ярнефть'],
    'transport': ['yandex.go', 'yandex.taxi', 'uber', 'taxi', 'такси', 'metro', 'метро', 'rzd', 'ржд'],
    'shopping': ['wildberries', 'wb', 'ozon', 'aliexpress', 'lamoda', 'dns', 'mvideo', 'eldorado', 'leroy', 'lemana', 'aura', 'altair', 'rio', 'аура', 'альтаир'],
    'health': ['apteka', 'аптека', 'doctor', 'clinic', 'med', 'vita', 'aprel', 'farma', 'фармация'],
    'utilities': ['energo', 'энерго', 'vodokanal', 'водоканал', 'tgk', 'тгк', 'dom.ru', 'mts', 'beeline', 'megafon', 'tele2', 'rostelecom']
  };

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => cleanNote.includes(k))) return catId;
  }
  return 'other';
};
