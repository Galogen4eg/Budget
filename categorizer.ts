
import { Category, LearnedRule } from '../types';

export const MERCHANT_DATA: Record<string, [string, string?, string?]> = {
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

  // SBP Recognition logic
  if (lowNote.includes('сбп') || lowNote.includes('sbp') || lowNote.includes('перевод') || lowNote.includes('transfer') || lowNote.includes('client')) {
      // Improved Regex:
      // 1. Matches optional prefix: +7, 7, 8
      // 2. Matches area code starting with 9 (strictly 3 digits)
      // 3. Matches rest of the number (3 + 2 + 2 digits)
      // 4. Global flag to find ALL occurrences
      const phoneRegex = /(?:\b(?:7|8|\+7)[\s\-(]*)?\(?9\d{2}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/g;
      
      const allMatches = Array.from(name.matchAll(phoneRegex));
      
      let bestPhone = '';
      
      // Iterate through matches to find the most "phone-like" candidate
      for (const match of allMatches) {
          const raw = match[0];
          const digits = raw.replace(/\D/g, ''); // Extract only digits
          
          // Priority 1: 11 digits starting with 7 or 8 (Standard RU mobile)
          if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
              bestPhone = digits.substring(1); // Keep 10 significant digits
              break; // Found perfect match, stop looking
          }
          
          // Priority 2: 10 digits starting with 9 (Short format)
          // Only accept if we haven't found a Priority 1 match yet
          if (digits.length === 10 && digits.startsWith('9')) {
              if (!bestPhone) {
                  bestPhone = digits;
              }
          }
      }

      if (bestPhone) {
          const formattedPhone = `+7 ${bestPhone.slice(0, 3)} ${bestPhone.slice(3, 6)}-${bestPhone.slice(6, 8)}-${bestPhone.slice(8)}`;
          
          // Try to find a name pattern (Cyrillic Name + Initial)
          // e.g. "Ivan I." or "Иван И."
          const nameMatch = name.match(/([А-ЯЁ][а-яё]+)\s([А-ЯЁ])\./);
          const person = nameMatch ? ` (${nameMatch[1]} ${nameMatch[2]}.)` : '';
          
          return `Перевод по СБП ${formattedPhone}${person}`;
      }
      
      if (lowNote.includes('сбп') || lowNote.includes('sbp')) {
          return "Перевод по СБП";
      }
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

// Keywords for Shopping List Items (Products)
const PRODUCT_KEYWORDS: Record<string, string[]> = {
  'produce': [
      'яблок', 'банан', 'картоф', 'томат', 'помидор', 'огур', 'лук', 'чеснок', 'морков', 'фрукт', 'овощ', 'зелень', 
      'капуст', 'перец', 'лимон', 'апельсин', 'мандарин', 'груш', 'виноград', 'ягод', 'свекл', 'кабач', 'баклажан', 
      'салат', 'укроп', 'петрушк', 'кинз', 'редис', 'авокадо', 'киви', 'манго', 'гриб', 'шампиньон', 'ананас', 'персик',
      'абрикос', 'слива', 'вишн', 'черешн', 'клубник', 'малин', 'смородин', 'черник', 'голубик', 'базилик', 'мята',
      'руккол', 'шпинат', 'сельдерей', 'тыква', 'редьк', 'имбирь', 'лайм', 'грейпфрут', 'помело', 'гранат', 'хурма',
      'дыня', 'арбуз', 'фасоль струч', 'брокколи', 'цветн', 'пекинск'
  ],
  'dairy': [
      'молок', 'кефир', 'творог', 'сыр', 'сметан', 'йогурт', 'масло сливоч', 'сливки', 'яйц', 'яйцо', 'ряженк', 'снежок',
      'масса творож', 'сырок', 'маргарин', 'сгущен', 'простокваш', 'айран', 'тан', 'морожен', 'пудинг', 'рикотта',
      'моцарелл', 'пармезан', 'гауда', 'сулугуни', 'брынза', 'фета', 'маскарпоне', 'творожн', 'актимель', 'иммунеле', 'данон'
  ],
  'meat': [
      'куриц', 'филе', 'говядин', 'свинин', 'фарш', 'колбас', 'сосиск', 'рыба', 'форель', 'семга', 'мясо', 'котлет', 
      'ветчин', 'грудк', 'крыл', 'индейк', 'паштет', 'сардельк', 'бекон', 'ребр', 'стейк', 'карбонад', 'сало', 
      'сельдь', 'скумбри', 'креветк', 'краб', 'икра', 'тушенк', 'баранин', 'кролик', 'утка', 'гусь', 'печень', 'сердц',
      'желудк', 'язык', 'окорок', 'шейк', 'вырезк', 'шпик', 'купаты', 'колбаск', 'буженин', 'суджук', 'бастурма',
      'минтай', 'треск', 'хек', 'горбуш', 'кета', 'лосось', 'шпрот', 'кальмар', 'мидии', 'осьминог', 'сардин', 'тунец'
  ],
  'bakery': [
      'хлеб', 'батон', 'булк', 'выпечк', 'пирог', 'лаваш', 'печень', 'сушки', 'пряник', 'торт', 'пирож', 'круассан',
      'вафл', 'сухар', 'лепешк', 'бублик', 'кекс', 'пончик', 'пирожен', 'чиабатта', 'багет', 'слойк', 'ватрушк', 'корж',
      'хлебц', 'галет', 'крекер', 'бисквит', 'рулет', 'эклер', 'зефир', 'пастил', 'мармелад', 'халва', 'козинак', 'безе'
  ],
  'grocery': [
      'макарон', 'спагетти', 'рис', 'гречк', 'крупа', 'масло подсол', 'мука', 'сахар', 'соль', 'чай', 'кофе', 'шоколад', 
      'конфет', 'соус', 'майонез', 'кетчуп', 'приправ', 'специ', 'хлопья', 'мюсли', 'каша', 'консерв', 'горош', 
      'кукуруз', 'чипсы', 'суп', 'лапша', 'орех', 'сухофрукт', 'мед', 'джем', 'варень', 'уксус', 'горчиц', 'хрен',
      'оливк', 'маслин', 'фасоль', 'чечевиц', 'булгур', 'кускус', 'манка', 'пшен', 'перловк', 'овсянк', 'геркулес',
      'масло оливк', 'масло растит', 'томатн паст', 'аджик', 'соевый', 'батончик', 'жеват', 'жвачк', 'кириешк', 'сухарик',
      'попкорн', 'семечк', 'фисташк', 'арахис', 'фундук', 'миндаль', 'кешью', 'изюм', 'курага', 'чернослив', 'финик',
      'дрожж', 'ванилин', 'разрыхлител', 'крахмал', 'сода',
      // Brands & Snacks
      'lays', 'pringles', 'cheetos', 'doritos', 'snickers', 'mars', 'twix', 'bounty', 'milka', 'alpen gold', 'nescafe', 'jacobs', 'greenfield', 'lipton'
  ],
  'drinks': [
      'вода', 'сок', 'кола', 'лимонад', 'пиво', 'вино', 'напиток', 'квас', 'энергетик', 'минералк', 'морс', 'компот',
      'кисель', 'фанта', 'спрайт', 'пепси', 'тархун', 'боржоми', 'ессентуки', 'святой источник', 'аква', 'bonaqua',
      'nestea', 'lipton', 'адреналин', 'red bull', 'flash', 'шампанск', 'водка', 'коньяк', 'виски', 'ром', 'джин',
      'мартини', 'сидр', 'медовух', 'коктейл', 'смузи', 'цикорий', 'какао', 'несквик',
      // Brands
      'coca-cola', 'pepsi', 'fanta', 'sprite', 'schweppes', 'mountain dew', 'dobry', 'j7', 'rich'
  ],
  'household': [
      'мыло', 'порошок', 'гель', 'шампунь', 'паста', 'бумага', 'салфет', 'губк', 'пакет', 'средство', 
      'фольга', 'перчатк', 'бритв', 'деодорант', 'крем', 'щетк', 'ватн', 'диски', 'прокладк', 'тампон', 
      'памперс', 'подгузник', 'батарейк', 'лампочк', 'освежитель', 'тряпк', 'пленка', 'кондиционер', 'отбеливатель',
      'пятновыводител', 'чистящ', 'моющ', 'для посуд', 'для пол', 'для стекл', 'для унитаз', 'дез', 'антисептик',
      'маск', 'пластырь', 'бин', 'йод', 'зеленк', 'спичк', 'свеч', 'зубочистк', 'никт', 'иголк', 'клей', 'скотч',
      'корм', 'вискас', 'китикет', 'pedigree', 'наполнитель', 'шариков', 'фольг', 'пергамент', 'рукав',
      // Brands
      'fairy', 'domestos', 'ariel', 'tide', 'persil', 'lenor', 'vanish', 'colgate', 'blend-a-med', 'splat', 'listerine',
      'gillette', 'nivea', 'dove', 'rexona', 'axe', 'old spice', 'pantene', 'head & shoulders', 'syoss', 'fa',
      'whiskas', 'kitekat', 'felix', 'royal canin', 'pro plan', 'chappi', 'pedigree'
  ],
};

// Determine category for Shopping Items
export const detectProductCategory = (name: string): string => {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(PRODUCT_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'other';
};

// Determine category for Transactions (Merchants)
export const getSmartCategory = (note: string, learnedRules: LearnedRule[] = [], categories: Category[], mcc?: string, bankCategory?: string): string => {
  const cleanNote = note.toLowerCase();
  for (const rule of learnedRules) {
    if (cleanNote.includes(rule.keyword.toLowerCase())) return rule.categoryId;
  }
  if (cleanNote.includes('сбп') || cleanNote.includes('sbp') || cleanNote.includes('перевод') || cleanNote.includes('transfer')) return 'transfer';

  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'food': ['magnit', 'магнит', 'pyaterochka', 'пятерочка', 'perekrestok', 'перекресток', 'ashan', 'auchan', 'lenta', 'лента', 'dixy', 'дикси', 'vkusvill', 'вкусвилл', 'samokat', 'самокат', 'продукты', 'супермаркет', 'гастроном'],
    'restaurants': ['burger king', 'kfc', 'rostics', 'vnoit', 'dodo', 'teremok', 'shokoladnitsa', 'cofix', 'coffee', 'cafe', 'кафе', 'ресторан', 'бар', 'паб', 'пицц', 'суши', 'роллы'],
    'auto': ['lukoil', 'лукойл', 'rosneft', 'роснефть', 'gazprom', 'gpn', 'shell', 'tatneft', 'azs', 'азс', 'auto', 'авто', 'бензин', 'топливо', 'парковк', 'мойка', 'шиномонт'],
    'transport': ['yandex.go', 'yandex.taxi', 'uber', 'taxi', 'такси', 'metro', 'метро', 'rzd', 'ржд', 'автобус', 'проезд'],
    'shopping': ['wildberries', 'wb', 'ozon', 'aliexpress', 'lamoda', 'dns', 'mvideo', 'eldorado', 'leroy', 'lemana', 'одежда', 'обувь', 'магазин'],
    'health': ['apteka', 'аптека', 'doctor', 'clinic', 'med', 'vita', 'aprel', 'врач', 'клиник', 'больниц', 'анализ', 'стоматолог']
  };

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => cleanNote.includes(k))) return catId;
  }
  return 'other';
};
