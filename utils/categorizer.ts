
import { Category, LearnedRule } from '../types';

// Расширенная база данных мерчантов: [Красивое название, Логотип/Эмодзи]
export const MERCHANT_DATA: Record<string, [string, string]> = {
  // --- ЯРОСЛАВЛЬ SPECIFIC (GROCERIES) ---
  'lotos': ['Лотос', '🛒'],
  'лотос': ['Лотос', '🛒'],
  'vysshaya liga': ['Высшая Лига', '🛒'],
  'высшая лига': ['Высшая Лига', '🛒'],
  'atrus': ['Атрус', '🥩'],
  'атрус': ['Атрус', '🥩'],
  'yaroslavskiy broiler': ['Яр. Бройлер', '🍗'],
  'broiler': ['Яр. Бройлер', '🍗'],
  'maksi': ['Макси', '🛒'],
  'maxi': ['Макси', '🛒'],

  // --- ЯРОСЛАВЛЬ SPECIFIC (RESTAURANTS) ---
  'mamuka': ['Мамука', '🥟'],
  'мамука': ['Мамука', '🥟'],
  'maneki': ['Манеки', '🍜'],
  'манеки': ['Манеки', '🍜'],
  'pizzafabrika': ['ПиццаФабрика', '🍕'],
  'пиццафабрика': ['ПиццаФабрика', '🍕'],
  'tashir': ['Ташир Пицца', '🍕'],
  'ташир': ['Ташир Пицца', '🍕'],
  'bazar': ['Базар', '🥗'],
  'gastromarket': ['Гастромаркет', '🥗'],
  'dudki': ['Дудки Бар', '🍸'],
  'дудки': ['Дудки Бар', '🍸'],
  'rogi': ['Рога и Копыта', '🍽️'],
  'рога и копыта': ['Рога и Копыта', '🍽️'],
  'skazka': ['Сказка', '🍽️'],
  'chestniy steak': ['Честный Стейк', '🥩'],
  'steak': ['Стейк Хаус', '🥩'],
  'kuzevan': ['Кузеван', '🥘'],
  'shesh-besh': ['Шеш-Беш', '🍖'],
  'ioann': ['Иоанн Васильевич', '👑'],
  'lapsha': ['Лапша на ушах', '🥡'],
  'noodles': ['Лапша на ушах', '🥡'],
  'bugel': ['Бугель Вугель', '🍻'],
  'pinta': ['Пинта', '🍺'],
  
  // --- ТОРГОВЫЕ ЦЕНТРЫ ЯРОСЛАВЛЯ (SHOPPING/PARKING) ---
  'aura': ['ТЦ Аура', '🛍️'],
  'аура': ['ТЦ Аура', '🛍️'],
  'altair': ['ТЦ Альтаир', '🛍️'],
  'альтаир': ['ТЦ Альтаир', '🛍️'],
  'rio': ['ТЦ РИО', '🛍️'],
  'vernisazh': ['ТЦ Вернисаж', '🛍️'],
  'вернисаж': ['ТЦ Вернисаж', '🛍️'],

  // --- ЖКХ ЯРОСЛАВЛЬ ---
  'tns energo': ['ТНС Энерго', '💡'],
  'тнс энерго': ['ТНС Энерго', '💡'],
  'yarobleirc': ['ЯрОблЕИРЦ', '📄'],
  'eirc': ['ЕИРЦ', '📄'],
  'gazprom mezhregiongaz': ['Газпром Газ', '🔥'],

  // --- ФЕДЕРАЛЬНЫЕ ПРОДУКТЫ ---
  'magnit': ['Магнит', '🔴'],
  'магнит': ['Магнит', '🔴'],
  'pyaterochka': ['Пятерочка', '🍀'],
  'пятерочка': ['Пятерочка', '🍀'],
  'perekrestok': ['Перекресток', '🔵'],
  'перекресток': ['Перекресток', '🔵'],
  'ashan': ['Ашан', '🐦'],
  'ашан': ['Ашан', '🐦'],
  'auchan': ['Ашан', '🐦'],
  'lenta': ['Лента', '🌻'],
  'лента': ['Лента', '🌻'],
  'dixy': ['Дикси', '🟠'],
  'дикси': ['Дикси', '🟠'],
  'vkusvill': ['ВкусВилл', '🌿'],
  'вкусвилл': ['ВкусВилл', '🌿'],
  'globus': ['Глобус', '🌍'],
  'глобус': ['Глобус', '🌍'],
  'metro': ['Metro', 'Ⓜ️'],
  'метро': ['Metro', 'Ⓜ️'],
  'okey': ['Окей', '🆗'],
  'окей': ['Окей', '🆗'],
  'chizhik': ['Чижик', '🐤'],
  'чижик': ['Чижик', '🐤'],
  'svetofor': ['Светофор', '🚦'],
  'светофор': ['Светофор', '🚦'],
  'vernyi': ['Верный', '🔴'],
  'верный': ['Верный', '🔴'],
  'bristol': ['Бристоль', '🍷'],
  'bri': ['Бристоль', '🍷'], 
  'krasnoe i beloe': ['Красное & Белое', '🍷'],
  'krasnoe&beloe': ['Красное & Белое', '🍷'],
  'красное и белое': ['Красное & Белое', '🍷'],
  'kib': ['Красное & Белое', '🍷'],
  'fix price': ['Fix Price', '🔵'],
  'фикс прайс': ['Fix Price', '🔵'],
  'samokat': ['Самокат', '🚲'],
  'самокат': ['Самокат', '🚲'],
  'kuper': ['Купер', '📦'],
  'sbermarket': ['Купер', '📦'],
  'atack': ['Атак', '🐦'],
  'атак': ['Атак', '🐦'],
  'karusel': ['Карусель', '🎠'],
  'spar': ['Spar', '🌲'],
  'eurospar': ['Spar', '🌲'],

  // --- ФЕДЕРАЛЬНЫЕ РЕСТОРАНЫ ---
  'burger king': ['Burger King', '🍔'],
  'бургер кинг': ['Burger King', '🍔'],
  'kfc': ['KFC', '🍗'],
  'rostics': ['Rostics', '🍗'],
  'ростикс': ['Rostics', '🍗'],
  'vnoit': ['Вкусно и точка', '🍟'],
  'вкусно и точка': ['Вкусно и точка', '🍟'],
  'dodo': ['Додо Пицца', '🍕'],
  'додо': ['Додо Пицца', '🍕'],
  'teremok': ['Теремок', '🥞'],
  'теремок': ['Теремок', '🥞'],
  'shokoladnitsa': ['Шоколадница', '☕'],
  'шоколадница': ['Шоколадница', '☕'],
  'cofix': ['Cofix', '☕'],
  'one price coffee': ['One Price', '☕'],
  'coffee like': ['Coffee Like', '💚'],
  'surf coffee': ['Surf Coffee', '🏄'],
  'yakitoriya': ['Якитория', '🍣'],
  'якитория': ['Якитория', '🍣'],
  'tanuki': ['Тануки', '🍣'],
  'тануки': ['Тануки', '🍣'],
  'subway': ['Subway', '🥖'],
  'starbucks': ['Starbucks', '☕'],
  'papa johns': ['Папа Джонс', '🍕'],
  'shaurma': ['Шаурма', '🌯'],
  'шаурма': ['Шаурма', '🌯'],
  'stolovaya': ['Столовая', '🍲'],
  'столовая': ['Столовая', '🍲'],
  'bakery': ['Пекарня', '🥐'],
  'пекарня': ['Пекарня', '🥐'],
  'dominospizza': ['Dominos', '🍕'],
  'kroshka kartoshka': ['Крошка Картошка', '🥔'],

  // --- АВТО (AUTO) ---
  'lukoil': ['Лукойл', '⛽'],
  'лукойл': ['Лукойл', '⛽'],
  'rosneft': ['Роснефть', '⛽'],
  'роснефть': ['Роснефть', '⛽'],
  'gazpromneft': ['Газпромнефть', '⛽'],
  'gpn': ['Газпромнефть', '⛽'],
  'gazprom': ['Газпром', '⛽'],
  'shell': ['Shell', '🐚'],
  'teboil': ['Teboil', '⛽'],
  'tatneft': ['Татнефть', '⛽'],
  'bashneft': ['Башнефть', '⛽'],
  'neftmagistral': ['Нефтьмагистраль', '⛽'],
  'trassa': ['Трасса', '⛽'],
  'azs': ['АЗС', '⛽'],
  'autodoc': ['Autodoc', '🔧'],
  'exist': ['Exist', '🔧'],
  'emex': ['Emex', '🔧'],
  'kolesa': ['Колеса Даром', '🛞'],
  'shinomontazh': ['Шиномонтаж', '🛞'],
  'moyka': ['Автомойка', '💦'],
  'car wash': ['Автомойка', '💦'],
  'parking': ['Парковка', '🅿️'],
  'parkovka': ['Парковка', '🅿️'],
  'avtozapchasti': ['Автозапчасти', '⚙️'],

  // --- ТРАНСПОРТ (PUBLIC TRANSPORT) ---
  'yandex.go': ['Яндекс Go', '🚕'],
  'yandex.taxi': ['Яндекс Такси', '🚕'],
  'яндекс такси': ['Яндекс Такси', '🚕'],
  'uber': ['Uber', '⬛'],
  'citymobil': ['Ситимобил', '🚕'],
  'ситимобил': ['Ситимобил', '🚕'],
  'moscow metro': ['Метро Москвы', '🚇'],
  'метрополитен': ['Метро', '🚇'],
  'transport': ['Оплата проезда', '🚇'],
  'mosgortrans': ['Мосгортранс', '🚌'],
  'мосгортранс': ['Мосгортранс', '🚌'],
  'rzd': ['РЖД', '🚄'],
  'ржд': ['РЖД', '🚄'],
  'aeroflot': ['Аэрофлот', '✈️'],
  's7': ['S7 Airlines', '✈️'],
  'troyka': ['Тройка', '🚇'],
  'strelka': ['Стрелка', '🚌'],

  // --- ШОППИНГ И МАРКЕТПЛЕЙСЫ ---
  'wildberries': ['Wildberries', '🟣'],
  'wb': ['Wildberries', '🟣'],
  'ozon': ['Ozon', '🔵'],
  'озон': ['Ozon', '🔵'],
  'aliexpress': ['AliExpress', '🔴'],
  'lamoda': ['Lamoda', '👗'],
  'mvideo': ['М.Видео', '🟥'],
  'eldorado': ['Эльдорадо', '🟧'],
  'dns': ['DNS', '🟧'],
  'leroy merlin': ['Леруа Мерлен', '🔨'],
  'leroymerlin': ['Леруа Мерлен', '🔨'],
  'lemana': ['Лемана ПРО', '🔨'],
  'sportmaster': ['Спортмастер', '👟'],
  'hm': ['H&M', '👔'],
  'zara': ['Zara', '👗'],
  'detmir': ['Детский Мир', '🧸'],

  // --- СЕРВИСЫ И СВЯЗЬ ---
  'mts': ['МТС', '🔴'],
  'мтс': ['МТС', '🔴'],
  'beeline': ['Билайн', '🐝'],
  'билайн': ['Билайн', '🐝'],
  'megafon': ['Мегафон', '🟢'],
  'мегафон': ['Мегафон', '🟢'],
  'tele2': ['Tele2', '⚫'],
  'теле2': ['Tele2', '⚫'],
  'rostelecom': ['Ростелеком', '📞'],
  'netflix': ['Netflix', '🎬'],
  'spotify': ['Spotify', '🎧'],
  'yandex plus': ['Яндекс Плюс', '➕'],
};

/**
 * Получает логотип для мерчанта
 */
export const getMerchantLogo = (name: string): string => {
  const lowName = name.toLowerCase();
  
  if (lowName.includes('transport') || lowName.includes('metro') || lowName.includes('оплата проезда')) {
    return '🚇';
  }

  for (const [key, data] of Object.entries(MERCHANT_DATA)) {
    if (lowName.includes(key)) return data[1];
  }

  if (lowName.includes('сбп') || lowName.includes('перевод')) return '📲';
  return '';
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
      if (formattedPhone) return `Перевод по СБП: ${formattedPhone}`;
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
 * Умная категоризация
 */
export const getSmartCategory = (note: string, learnedRules: LearnedRule[] = [], categories: Category[], mcc?: string, bankCategory?: string): string => {
  const cleanNote = note.toLowerCase();
  
  // 0. Проверка пользовательских правил
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
      'lotos', 'лотос', 'vysshaya liga', 'высшая лига', 'atrus', 'атрус', 'broiler', 'maksi'
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

  // Проверяем ключевые слова
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => cleanNote.includes(k))) return catId;
  }

  // Маппинг MCC кодов
  const MCC_MAP: Record<string, string> = {
    '5411': 'food', '5499': 'food', '5441': 'food', '5451': 'food', '5331': 'food', // Супермаркеты
    '5812': 'restaurants', '5813': 'restaurants', '5814': 'restaurants', // Общепит
    '4121': 'transport', '4111': 'transport', // Такси и транспорт
    '5541': 'auto', '5542': 'auto', '7523': 'auto', '7538': 'auto', // АЗС, Парковки, СТО
    '5912': 'health', '8099': 'health', '8011': 'health', '8021': 'health', // Аптеки
    '5311': 'shopping', '5621': 'shopping', '5651': 'shopping', '5691': 'shopping', '5944': 'shopping', '5200': 'shopping',
    '4812': 'utilities', '4814': 'utilities', '4900': 'utilities',
    '7832': 'entertainment', '7996': 'entertainment', '7997': 'entertainment',
    '4511': 'travel', '4722': 'travel', '7011': 'travel',
  };

  if (mcc && MCC_MAP[mcc]) return MCC_MAP[mcc];

  // Резервная проверка по категории из банка
  const cleanBankCat = bankCategory?.toLowerCase() || '';
  for (const cat of categories) {
    if (cleanBankCat.includes(cat.label.toLowerCase())) return cat.id;
  }

  return 'other';
};
