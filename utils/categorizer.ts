
import { Category, LearnedRule } from '../types';

export const MERCHANT_DATA: Record<string, [string, string?, string?]> = {
  // Продукты и супермаркеты (Центр, Северо-Запад, Поволжье, Урал, Сибирь, Юг)
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
  'дикси': ['Дикси', undefined, '#F58220'],
  'vkusvill': ['ВкусВилл', 'vkusvill', '#00704A'],
  'вкусвилл': ['ВкусВилл', 'vkusvill', '#00704A'],
  'metro': ['Metro', 'metro', '#002D72'],
  'okey': ['О’КЕЙ', undefined, '#DA291C'],
  'окей': ['О’КЕЙ', undefined, '#DA291C'],
  'chizhik': ['Чижик', undefined, '#FFCC00'],
  'чижик': ['Чижик', undefined, '#FFCC00'],
  'svetofor': ['Светофор', undefined, '#FFED00'],
  'светофор': ['Светофор', undefined, '#FFED00'],
  'vernyi': ['Верный', undefined, '#DA291C'],
  'верный': ['Верный', undefined, '#DA291C'],
  'bristol': ['Бристоль', undefined, '#DA291C'],
  'бристоль': ['Бристоль', undefined, '#DA291C'],
  'krasnoe': ['Красное & Белое', undefined, '#DA291C'],
  'красное': ['Красное & Белое', undefined, '#DA291C'],
  'kib': ['Красное & Белое', undefined, '#DA291C'],
  'fix price': ['Fix Price', 'fixprice', '#0056A3'],
  'fixprice': ['Fix Price', 'fixprice', '#0056A3'],
  'фикс прайс': ['Fix Price', 'fixprice', '#0056A3'],
  'monetka': ['Монетка', 'monetka', '#FF8C00'],
  'монетка': ['Монетка', 'monetka', '#FF8C00'],
  'globus': ['Глобус', 'globus', '#F08000'],
  'глобус': ['Глобус', 'globus', '#F08000'],
  'yarche': ['Ярче!', 'yarche', '#FF8C00'],
  'ярче': ['Ярче!', 'yarche', '#FF8C00'],
  'komandor': ['Командор', undefined, '#ED1C24'],
  'командор': ['Командор', undefined, '#ED1C24'],
  'alleya': ['Аллея', undefined, '#ED1C24'],
  'аллея': ['Аллея', undefined, '#ED1C24'],
  'krasny yar': ['Красный Яр', undefined, '#E30613'],
  'красный яр': ['Красный Яр', undefined, '#E30613'],
  'tabris': ['Табрис', undefined, '#005BBB'],
  'табрис': ['Табрис', undefined, '#005BBB'],
  'kirovsky': ['Кировский', undefined, '#003399'],
  'кировский': ['Кировский', undefined, '#003399'],
  'samberi': ['Самбери', undefined, '#00A651'],
  'самбери': ['Самбери', undefined, '#00A651'],
  'remi': ['Реми', undefined, '#E30613'],
  'реми': ['Реми', undefined, '#E30613'],
  'aniks': ['Аникс', undefined, '#FF6600'],
  'аникс': ['Аникс', undefined, '#FF6600'],
  'bayram': ['Байрам', undefined, '#00A651'],
  'байрам': ['Байрам', undefined, '#00A651'],
  'gulliver': ['Гулливер', undefined, '#00A651'],
  'гулливер': ['Гулливер', undefined, '#00A651'],
  'begemag': ['Бегемаг', undefined, '#ED1C24'],
  'бегемаг': ['Бегемаг', undefined, '#ED1C24'],
  'absolut': ['Абсолют', undefined, '#003399'],
  'абсолют': ['Абсолют', undefined, '#003399'],
  'titan': ['Титан', undefined, '#E30613'],
  'титан': ['Титан', undefined, '#E30613'],
  'chelnikhleb': ['Челны-Хлеб', undefined, '#00A651'],
  'челны-хлеб': ['Челны-Хлеб', undefined, '#00A651'],
  'evropa': ['Европа', undefined, '#003399'],
  'европа': ['Европа', undefined, '#003399'],
  'liniya': ['Линия', undefined, '#E30613'],
  'линия': ['Линия', undefined, '#E30613'],
  'pobeda': ['Победа', undefined, '#FFCC00'],
  'победа': ['Победа', undefined, '#FFCC00'],
  'nahodka': ['Находка', undefined, '#00A651'],
  'находка': ['Находка', undefined, '#00A651'],

  // Доставка и маркетплейсы
  'samokat': ['Самокат', 'samokat', '#FF4D6D'],
  'самокат': ['Самокат', 'samokat', '#FF4D6D'],
  'kuper': ['Купер', 'sber', '#21A038'],
  'купер': ['Купер', 'sber', '#21A038'],
  'sbermarket': ['Купер', 'sber', '#21A038'],
  'сбермаркет': ['Купер', 'sber', '#21A038'],
  'spar': ['Spar', undefined, '#006233'],
  'спар': ['Spar', undefined, '#006233'],
  'wildberries': ['Wildberries', 'wildberries', '#CB11AB'],
  'вайлдберриз': ['Wildberries', 'wildberries', '#CB11AB'],
  'wb': ['Wildberries', 'wildberries', '#CB11AB'],
  'ozon': ['Ozon', 'ozon', '#005BFF'],
  'озон': ['Ozon', 'ozon', '#005BFF'],
  'aliexpress': ['AliExpress', undefined, '#FF6600'],
  'алиэкспресс': ['AliExpress', undefined, '#FF6600'],

  // Общепит и кафе
  'burger king': ['Burger King', 'burgerking', '#D62300'],
  'burgerking': ['Burger King', 'burgerking', '#D62300'],
  'бургер кинг': ['Burger King', 'burgerking', '#D62300'],
  'kfc': ['KFC', 'kfc', '#E4002B'],
  'rostics': ['Rostics', 'kfc', '#E4002B'],
  'ростикс': ['Rostics', 'kfc', '#E4002B'],
  'vnoit': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'vkusnoitochka': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'vkusno i tochka': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'vkusno_i_tochka': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'vkusno-i-tochka': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'вкусно и точка': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'вкусноиточка': ['Вкусно и точка', 'vnoit', '#FB542B'],
  'dodo': ['Додо Пицца', 'dodo', '#FF6900'],
  'dodopizza': ['Додо Пицца', 'dodo', '#FF6900'],
  'додо': ['Додо Пицца', 'dodo', '#FF6900'],
  'teremok': ['Теремок', undefined, '#D62300'],
  'теремок': ['Теремок', undefined, '#D62300'],
  'kroshka kartoshka': ['Крошка Картошка', undefined, '#00A651'],
  'крошка картошка': ['Крошка Картошка', undefined, '#00A651'],
  'tanuki': ['Тануки', undefined, '#E30613'],
  'тануки': ['Тануки', undefined, '#E30613'],
  'yakitoriya': ['Якитория', undefined, '#E30613'],
  'якитория': ['Якитория', undefined, '#E30613'],
  'sushiwok': ['Суши Wok', undefined, '#FF6600'],
  'суши вок': ['Суши Wok', undefined, '#FF6600'],
  'mnogolososya': ['Много Лосося', undefined, '#FF6600'],
  'много лосося': ['Много Лосося', undefined, '#FF6600'],
  'papa johns': ['Папа Джонс', undefined, '#00A651'],
  'папа джонс': ['Папа Джонс', undefined, '#00A651'],
  'cofix': ['Cofix', undefined, '#000000'],
  'кофикс': ['Cofix', undefined, '#000000'],

  // Аптеки
  'aprel': ['Аптека Апрель', undefined, '#E30613'],
  'апрель': ['Аптека Апрель', undefined, '#E30613'],
  'vita': ['Аптека Вита', undefined, '#00A651'],
  'вита': ['Аптека Вита', undefined, '#00A651'],
  'rigla': ['Аптека Ригла', undefined, '#00A651'],
  'ригла': ['Аптека Ригла', undefined, '#00A651'],
  'planeta zdorovya': ['Планета Здоровья', undefined, '#00A651'],
  'планета здоровья': ['Планета Здоровья', undefined, '#00A651'],
  'stolichki': ['Аптека Столички', undefined, '#E30613'],
  'столички': ['Аптека Столички', undefined, '#E30613'],
  'farmlend': ['Фармленд', undefined, '#00A651'],
  'фармленд': ['Фармленд', undefined, '#00A651'],
  'zhivika': ['Живика', undefined, '#00A651'],
  'живика': ['Живика', undefined, '#00A651'],
  'eapteka': ['Сбер Еаптека', 'sber', '#21A038'],
  'еаптека': ['Сбер Еаптека', 'sber', '#21A038'],
  'apteka.ru': ['Аптека.ру', undefined, '#E30613'],
  'аптека.ру': ['Аптека.ру', undefined, '#E30613'],

  // АЗС и Авто
  'lukoil': ['Лукойл', 'lukoil', '#ED1C24'],
  'лукойл': ['Лукойл', 'lukoil', '#ED1C24'],
  'rosneft': ['Роснефть', undefined, '#FFCC00'],
  'роснефть': ['Роснефть', undefined, '#FFCC00'],
  'gazprom': ['Газпромнефть', undefined, '#005BBB'],
  'газпромнефть': ['Газпромнефть', undefined, '#005BBB'],
  'gpn': ['Газпромнефть', undefined, '#005BBB'],
  'tatneft': ['Татнефть', undefined, '#00A651'],
  'татнефть': ['Татнефть', undefined, '#00A651'],
  'bashneft': ['Башнефть', undefined, '#00A651'],
  'башнефть': ['Башнефть', undefined, '#00A651'],
  'neftmagistral': ['Нефтьмагистраль', undefined, '#003399'],
  'нефтьмагистраль': ['Нефтьмагистраль', undefined, '#003399'],
  'teboil': ['Teboil', undefined, '#E30613'],
  'тебоил': ['Teboil', undefined, '#E30613'],

  // Строительство, Электроника и Косметика
  'leroy': ['Лемана ПРО', undefined, '#00A651'],
  'lemana': ['Лемана ПРО', undefined, '#00A651'],
  'леруа': ['Лемана ПРО', undefined, '#00A651'],
  'mvideo': ['М.Видео', undefined, '#E30613'],
  'мвидео': ['М.Видео', undefined, '#E30613'],
  'eldorado': ['Эльдорадо', undefined, '#E30613'],
  'эльдорадо': ['Эльдорадо', undefined, '#E30613'],
  'dns': ['ДНС', undefined, '#FF6600'],
  'днс': ['ДНС', undefined, '#FF6600'],
  'citilink': ['Ситилинк', undefined, '#FF6600'],
  'ситилинк': ['Ситилинк', undefined, '#FF6600'],
  'vseinstrumenti': ['ВсеИнструменты.ру', undefined, '#E30613'],
  'всеинструменты': ['ВсеИнструменты.ру', undefined, '#E30613'],
  'petrovich': ['СТД Петрович', undefined, '#FF6600'],
  'петрович': ['СТД Петрович', undefined, '#FF6600'],
  'goldapple': ['Золотое Яблоко', undefined, '#000000'],
  'золотое яблоко': ['Золотое Яблоко', undefined, '#000000'],
  'letu': ['Л’Этуаль', undefined, '#003399'],
  'лэтуаль': ['Л’Этуаль', undefined, '#003399'],
  'rivegauche': ['Рив Гош', undefined, '#0056A3'],
  'рив гош': ['Рив Гош', undefined, '#0056A3'],
  'podruzhka': ['Подружка', undefined, '#FF4D6D'],
  'подружка': ['Подружка', undefined, '#FF4D6D'],
  'ulybka radugi': ['Улыбка радуги', undefined, '#E7292C'],
  'улыбка радуги': ['Улыбка радуги', undefined, '#E7292C'],

  // Транспорт и Каршеринг
  'yandex.go': ['Яндекс Go', 'yandex', '#FC3F1D'],
  'yandex_go': ['Яндекс Go', 'yandex', '#FC3F1D'],
  'yandex.taxi': ['Яндекс Такси', 'yandex', '#FC3F1D'],
  'yandex taxi': ['Яндекс Такси', 'yandex', '#FC3F1D'],
  'яндекс такси': ['Яндекс Такси', 'yandex', '#FC3F1D'],
  'yandex.eda': ['Яндекс Еда', 'yandex', '#FC3F1D'],
  'яндекс еда': ['Яндекс Еда', 'yandex', '#FC3F1D'],
  'yandex.lavka': ['Яндекс Лавка', 'yandex', '#FC3F1D'],
  'яндекс лавка': ['Яндекс Лавка', 'yandex', '#FC3F1D'],
  'yandex.market': ['Яндекс Маркет', 'yandex', '#FC3F1D'],
  'яндекс маркет': ['Яндекс Маркет', 'yandex', '#FC3F1D'],
  'yandex': ['Яндекс', 'yandex', '#FC3F1D'],
  'яндекс': ['Яндекс', 'yandex', '#FC3F1D'],
  'delimobil': ['Делимобиль', undefined, '#FF6600'],
  'делимобиль': ['Делимобиль', undefined, '#FF6600'],
  'citydrive': ['Ситидрайв', undefined, '#00A651'],
  'ситидрайв': ['Ситидрайв', undefined, '#00A651'],
  'belkacar': ['BelkaCar', undefined, '#005BBB'],
  'белкакар': ['BelkaCar', undefined, '#005BBB'],
  'aeroflot': ['Аэрофлот', undefined, '#003399'],
  'аэрофлот': ['Аэрофлот', undefined, '#003399'],
  'pobeda aero': ['Победа Авиа', undefined, '#005BBB'],
  'победа авиа': ['Победа Авиа', undefined, '#005BBB'],
  'rzd': ['РЖД', undefined, '#E21A1A'],
  'ржд': ['РЖД', undefined, '#E21A1A'],

  // Банки и Финансы
  'sber': ['Сбербанк', 'sber', '#21A038'],
  'сбер': ['Сбербанк', 'sber', '#21A038'],
  'сбербанк': ['Сбербанк', 'sber', '#21A038'],
  'tinkoff': ['Т-Банк', 'tinkoff', '#FFDD2D'],
  't-bank': ['Т-Банк', 'tinkoff', '#FFDD2D'],
  'т-банк': ['Т-Банк', 'tinkoff', '#FFDD2D'],
  'тинькофф': ['Т-Банк', 'tinkoff', '#FFDD2D'],
  'alfa': ['Альфа-Банк', 'alfa', '#EF3124'],
  'альфа': ['Альфа-Банк', 'alfa', '#EF3124'],
  'vtb': ['ВТБ', 'vtb', '#002882'],
  'втб': ['ВТБ', 'vtb', '#002882'],
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
  if (!rawNote || !rawNote.trim()) return "Банковская операция";
  let name = rawNote.trim();
  const lowNote = name.toLowerCase();

  for (const rule of learnedRules) {
    if (rule.keyword && lowNote.includes(rule.keyword.toLowerCase())) return rule.cleanName;
  }

  // SBP Recognition logic
  if (lowNote.includes('сбп') || lowNote.includes('sbp') || lowNote.includes('перевод') || lowNote.includes('transfer') || lowNote.includes('client')) {
      const phoneRegex = /(?:\b(?:7|8|\+7)[\s\-(]*)?\(?9\d{2}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/g;
      const allMatches = Array.from(name.matchAll(phoneRegex));
      let bestPhone = '';
      for (const match of allMatches) {
          const raw = match[0];
          const digits = raw.replace(/\D/g, '');
          if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
              bestPhone = digits.substring(1);
              break;
          }
          if (digits.length === 10 && digits.startsWith('9')) {
              if (!bestPhone) bestPhone = digits;
          }
      }

      if (bestPhone) {
          const formattedPhone = `+7 ${bestPhone.slice(0, 3)} ${bestPhone.slice(3, 6)}-${bestPhone.slice(6, 8)}-${bestPhone.slice(8)}`;
          const nameMatch = name.match(/([А-ЯЁ][а-яё]+)\s([А-ЯЁ])\./);
          const person = nameMatch ? ` (${nameMatch[1]} ${nameMatch[2]}.)` : '';
          return `Перевод по СБП ${formattedPhone}${person}`;
      }
      
      if (lowNote.includes('сбп') || lowNote.includes('sbp')) {
          return "Перевод по СБП";
      }
      return "Перевод средств";
  }

  // Extract location/merchant field if string contains structured bank metadata keys
  const locationPatterns = [
    /место\s+(?:совершения|проведения|оплаты)\s*(?:операции|транзакции)?\s*:\s*([^,;\n]+)/i,
    /место\s*:\s*([^,;\n]+)/i,
    /торговая\s+точка\s*:\s*([^,;\n]+)/i,
    /получатель\s*:\s*([^,;\n]+)/i,
    /merchant\s*:\s*([^,;\n]+)/i,
    /описание\s*:\s*([^,;\n]+)/i
  ];

  for (const pat of locationPatterns) {
    const match = name.match(pat);
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }

  // Strip location/country/city prefixes like RU/Yaroslavl/, RU/MOSCOW/, RUS/SPB/
  name = name.replace(/^(?:RU|RUS|RUSSIA)\/[A-Za-z0-9_-]+\//i, '');
  name = name.replace(/^(?:RU|RUS|RUSSIA)[/_]/i, '');
  name = name.replace(/^(?:MOSCOW|SPB|YAROSLAVL|KAZAN|EKATERINBURG|SAMARA|OMSK|ROSTOV|UFA|PERM|VOLGOGRAD|KRASNODAR|CHELYABINSK|NOVOSIBIRSK)\//i, '');

  // Strip trailing MCC, dates, terminal IDs
  name = name.replace(/,?\s*MCC\s*:\s*\d{4}/gi, '');
  name = name.replace(/,?\s*дата\s+создания.*$/gi, '');
  name = name.replace(/,?\s*операция\s+по.*$/gi, '');
  name = name.replace(/[_-]\d{3,}$/, ''); // e.g. Vkusnoitochka_24108 -> Vkusnoitochka
  name = name.replace(/\s+\d{3,}$/, '');
  name = name.replace(/^(Retail|Rus|Oplata|Покупка|Оплата|Списание|Зачисление|C2C|Card2Card|Transfer|Card to Card|Retail Rus|RUS)\s+/gi, '');

  // Direct brand dictionary match
  const extractedLow = name.toLowerCase().replace(/[\s_-]/g, '');
  for (const [key, data] of Object.entries(MERCHANT_DATA)) {
    const cleanKey = key.toLowerCase().replace(/[\s_-]/g, '');
    if (extractedLow.includes(cleanKey) || lowNote.includes(key.toLowerCase())) {
      return data[0];
    }
  }

  // General cleaning
  const cityNoise = /\s(MOSCOW|RU|RUS|SPB|EKATERINBURG|KAZAN|SAMARA|OMSK|ROSTOV|UFA|PERM|VOLGOGRAD|KRASNODAR|CHELYABINSK|NOVOSIBIRSK|YAROSLAVL)$/i;
  name = name
    .replace(cityNoise, '')
    .replace(/\d{2}\.\d{2}\.\d{2}\s\d{2}:\d{2}/g, '')
    .replace(/[*/]{1,}\d{4}/g, '')
    .replace(/\s[A-Z0-9]{6,}\s?/g, ' ')
    .replace(/\s(OOO|IP|ООО|ИП|AO)\s/gi, ' ')
    .replace(/[>|_\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
