
import { Category, LearnedRule } from '../types';

// [Pretty Name, Brand Key (optional), Brand Color (optional)]
export const MERCHANT_DATA: Record<string, [string, string?, string?]> = {
  // --- GROCERIES ---
  'lotos': ['Лотос', undefined, '#00A651'],
  'vysshaya liga': ['Высшая Лига', undefined, '#ED1C24'],
  'atrus': ['Атрус', undefined, '#ED1C24'],
  'broiler': ['Яр. Бройлер', undefined, '#F39200'],
  'maksi': ['Макси', undefined, '#00A651'],
  
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
  'kuper': ['Купер', 'sber', '#21A038'], // Using Sber generic
  'sbermarket': ['Купер', 'sber', '#21A038'],
  'spar': ['Spar', undefined, '#006233'],

  // --- RESTAURANTS ---
  'burger king': ['Burger King', 'burgerking', '#D62300'],
  'kfc': ['KFC', 'kfc', '#E4002B'],
  'rostics': ['Rostics', 'kfc', '#E4002B'],
  'vnoit': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'вкусно и точка': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'dodo': ['Додо Пицца', 'dodo', '#FF6900'],
  'teremok': ['Теремок', undefined, '#DA291C'],
  'shokoladnitsa': ['Шоколадница', undefined, '#6B4C4F'],
  'cofix': ['Cofix', undefined, '#000000'],
  'starbucks': ['Starbucks', undefined, '#00704A'],
  'papa johns': ['Папа Джонс', undefined, '#00923F'],
  'dominospizza': ['Dominos', undefined, '#006491'],
  'yakitoriya': ['Якитория', undefined, '#DA291C'],
  'tanuki': ['Тануки', undefined, '#DA291C'],

  // --- MARKETPLACES & SHOPS ---
  'wildberries': ['Wildberries', 'wildberries', '#CB11AB'],
  'wb': ['Wildberries', 'wildberries', '#CB11AB'],
  'ozon': ['Ozon', 'ozon', '#005BFF'],
  'aliexpress': ['AliExpress', undefined, '#E62E04'],
  'lamoda': ['Lamoda', undefined, '#000000'],
  'mvideo': ['М.Видео', undefined, '#DA291C'],
  'eldorado': ['Эльдорадо', undefined, '#74AC00'],
  'dns': ['DNS', undefined, '#F48220'],
  'leroy': ['Лемана ПРО', undefined, '#66CC00'],
  'lemana': ['Лемана ПРО', undefined, '#66CC00'],
  'sportmaster': ['Спортмастер', undefined, '#0055AA'],
  'detmir': ['Детский Мир', undefined, '#0099CC'],
  'zara': ['Zara', undefined, '#000000'],
  'hm': ['H&M', undefined, '#DA291C'],

  // --- SERVICES & TRANSPORT ---
  'yandex.go': ['Яндекс Go', 'yandex', '#FC3F1D'],
  'yandex.taxi': ['Яндекс Такси', 'yandex', '#FC3F1D'],
  'uber': ['Uber', undefined, '#000000'],
  'rzd': ['РЖД', undefined, '#E21A1A'],
  'aeroflot': ['Аэрофлот', undefined, '#0055AA'],
  's7': ['S7 Airlines', undefined, '#97C93D'],
  'mts': ['МТС', undefined, '#E30613'],
  'beeline': ['Билайн', undefined, '#FFCC00'],
  'megafon': ['Мегафон', undefined, '#00B956'],
  'tele2': ['Tele2', undefined, '#1F2229'],
  'rostelecom': ['Ростелеком', undefined, '#7700FF'],
  'yandex plus': ['Яндекс Плюс', 'yandex', '#FC3F1D'],

  // --- FINANCE ---
  'sber': ['Сбербанк', 'sber', '#21A038'],
  'tinkoff': ['Т-Банк', 'tinkoff', '#FFDD2D'],
  'alfa': ['Альфа-Банк', 'alfa', '#EF3124'],
  'vtb': ['ВТБ', undefined, '#002882'],

  // --- FUEL ---
  'lukoil': ['Лукойл', 'lukoil', '#ED1C24'],
  'rosneft': ['Роснефть', undefined, '#FFCC00'],
  'gazprom': ['Газпром', 'gazprom', '#007CC3'],
  'gpn': ['Газпромнефть', 'gazprom', '#007CC3'],
  'shell': ['Shell', undefined, '#FFD500'],
  'teboil': ['Teboil', 'lukoil', '#ED1C24'], // Often rebranded
  'tatneft': ['Татнефть', undefined, '#009139'],
};

/**
 * Получает ключ бренда (brandKey) для логотипа.
 * Возвращает undefined, если бренд не найден или нет специфичного лого.
 */
export const getMerchantBrandKey = (name: string): string | undefined => {
  const lowName = name.toLowerCase();
  
  if (lowName.includes('yandex') || lowName.includes('яндекс')) return 'yandex';
  if (lowName.includes('sber') || lowName.includes('сбер')) return 'sber';

  for (const [key, data] of Object.entries(MERCHANT_DATA)) {
    if (lowName.includes(key)) return data[1];
  }
  return undefined;
};

/**
 * Очищает название транзакции с учетом базы знаний и пользовательских правил
 */
export const cleanMerchantName = (rawNote: string, learnedRules: LearnedRule[] = []): string => {
  let name = rawNote.trim();
  const lowNote = name.toLowerCase();

  // 0. Сначала проверяем пользовательские правила (Learned Rules)
  for (const rule of learnedRules) {
    if (lowNote.includes(rule.keyword.toLowerCase())) {
      return rule.cleanName;
    }
  }

  // 1. Обработка транспорта
  if (lowNote.includes('transport') || (lowNote.includes('metro') && !lowNote.includes('metro moscow'))) {
    return "Оплата проезда";
  }

  // 2. Проверка на СБП
  if (lowNote.includes('сбп') || lowNote.includes('sbp') || lowNote.includes('перевод')) {
    const phoneMatch = name.match(/(?:7|8|9)\d{9,10}/);
    if (phoneMatch) {
      let rawPhone = phoneMatch[0].replace(/\D/g, '');
      let formattedPhone = '';
      if (rawPhone.length === 10 && rawPhone.startsWith('9')) {
        formattedPhone = `+7${rawPhone}`;
      } else if (rawPhone.length === 11 && (rawPhone.startsWith('7') || rawPhone.startsWith('8'))) {
        formattedPhone = `+7${rawPhone.slice(1)}`;
      }
      if (formattedPhone) return `СБП: ${formattedPhone}`;
    }
    if (lowNote.includes('сбп') || lowNote.includes('sbp')) return "Перевод по СБП";
  }

  // 3. Поиск в базе брендов
  for (const [key, data] of Object.entries(MERCHANT_DATA)) {
    if (lowNote.includes(key)) {
      return data[0];
    }
  }

  // 4. Общая очистка
  name = name.replace(/^(Retail|Rus|Oplata|Покупка|Оплата|Списание|Зачисление|C2C|Card2Card|Transfer|Card to Card|Retail Rus|RUS)\s+/gi, '');
  const cityNoise = /\s(MOSCOW|RU|RUS|SPB|EKATERINBURG|KAZAN|SAMARA|OMSK|ROSTOV|UFA|PERM|VOLGOGRAD|KRASNODAR|CHELYABINSK|NOVOSIBIRSK|YAROSLAVL)$/i;
  name = name.replace(cityNoise, '');
  name = name.replace(/\d{2}\.\d{2}\.\d{2}\s\d{2}:\d{2}/g, ''); 
  name = name.replace(/[*/]{1,}\d{4}/g, ''); 
  name = name.replace(/\s[A-Z0-9]{8,}\s/g, ' '); 
  name = name.replace(/\s(OOO|IP|ООО|ИП)\s/gi, ' '); 
  name = name.replace(/[>|_\\/]/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  return name.length < 2 ? "Банковская операция" : name;
};

/**
 * Умная категоризация (без изменений логики, только типы)
 */
export const getSmartCategory = (note: string, learnedRules: LearnedRule[] = [], categories: Category[], mcc?: string, bankCategory?: string): string => {
  const cleanNote = note.toLowerCase();
  
  for (const rule of learnedRules) {
    if (cleanNote.includes(rule.keyword.toLowerCase())) {
      return rule.categoryId;
    }
  }

  if (cleanNote.includes('сбп') || cleanNote.includes('sbp') || cleanNote.includes('перевод')) {
    return 'transfer';
  }

  // Словари ключевых слов для категорий
  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'food': [
      'magnit', 'магнит', 'pyaterochka', 'пятерочка', 'perekrestok', 'перекресток', 
      'ashan', 'auchan', 'ашан', 'lenta', 'лента', 'dixy', 'дикси', 'vkusvill', 'вкусвилл',
      'globus', 'глобус', 'metro', 'метро', 'okey', 'окей', 'chizhik', 'чижик',
      'svetofor', 'светофор', 'vernyi', 'верный', 'bristol', 'krasnoe', 'spar', 'atack',
      'lotos', 'лотос', 'vysshaya liga', 'высшая лига', 'atrus', 'атрус', 'broiler', 'maksi',
      'samokat', 'самокат'
    ],
    'restaurants': [
      'burger king', 'kfc', 'rostics', 'vnoit', 'dodo', 'teremok', 'shokoladnitsa', 
      'cofix', 'coffee', 'yakitoriya', 'tanuki', 'subway', 'starbucks', 'papa johns', 
      'shaurma', 'stolovaya', 'bakery', 'restaurant', 'cafe', 'кафе', 'ресторан',
      'mamuka', 'maneki', 'pizzafabrika', 'tashir', 'bazar', 'dudki', 'rogi', 'skazka', 
      'kuzevan', 'shesh-besh', 'ioann', 'lapsha', 'noodles', 'steak', 'cheez'
    ],
    'auto': [
      'lukoil', 'лукойл', 'rosneft', 'роснефть', 'gazprom', 'gpn', 'shell', 'teboil',
      'tatneft', 'neft', 'azs', 'азс', 'autodoc', 'exist', 'emex', 'kolesa', 'shina',
      'parking', 'parkovka', 'car wash', 'moyka', 'auto', 'авто'
    ],
    'transport': [
      'yandex.go', 'yandex.taxi', 'uber', 'citymobil', 'taxi', 'такси',
      'metro', 'метро', 'transport', 'mosgortrans', 'rzd', 'ржд', 'train', 'bus', 
      'troyka', 'strelka'
    ],
    'shopping': [
      'wildberries', 'wb', 'ozon', 'aliexpress', 'lamoda', 'dns', 'mvideo', 'eldorado',
      'leroy', 'lemana', 'sportmaster', 'hm', 'zara', 'detmir',
      'aura', 'altair', 'rio', 'vernisazh'
    ],
    'utilities': [
       'tns', 'тнс', 'energo', 'энерго', 'eirc', 'еирц', 'gaz', 'газ'
    ],
    'health': [
      'apteka', 'аптека', 'doctor', 'clinic', 'med', 'фарм', 'pharm', 'vita', 'aprel', 'planeta'
    ]
  };

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => cleanNote.includes(k))) return catId;
  }

  const MCC_MAP: Record<string, string> = {
    '5411': 'food', '5499': 'food', '5441': 'food', '5451': 'food', '5331': 'food',
    '5812': 'restaurants', '5813': 'restaurants', '5814': 'restaurants',
    '4121': 'transport', '4111': 'transport',
    '5541': 'auto', '5542': 'auto', '7523': 'auto', '7538': 'auto',
    '5912': 'health', '8099': 'health', '8011': 'health', '8021': 'health',
    '5311': 'shopping', '5621': 'shopping', '5651': 'shopping', '5691': 'shopping', '5944': 'shopping', '5200': 'shopping',
    '4812': 'utilities', '4814': 'utilities', '4900': 'utilities',
    '7832': 'entertainment', '7996': 'entertainment', '7997': 'entertainment',
    '4511': 'travel', '4722': 'travel', '7011': 'travel',
  };

  if (mcc && MCC_MAP[mcc]) return MCC_MAP[mcc];

  const cleanBankCat = bankCategory?.toLowerCase() || '';
  for (const cat of categories) {
    if (cleanBankCat.includes(cat.label.toLowerCase())) return cat.id;
  }

  return 'other';
};
