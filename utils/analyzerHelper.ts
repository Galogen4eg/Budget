import { Category, LearnedRule } from '../types';
import { cleanMerchantName } from './categorizer';

export interface AnalysisResult {
  suggestedCategoryId: string;
  confidence: number; // 0..100
  reason: string;
  cleanName: string;
  ruleKeyword: string;
  source: 'learned_rule' | 'mcc' | 'brand' | 'keyword' | 'sbp' | 'fallback';
}

const MCC_MAP: Record<string, { categoryId: string; label: string }> = {
  '5411': { categoryId: 'food', label: 'Супермаркеты и продукты' },
  '5499': { categoryId: 'food', label: 'Продуктовые магазины' },
  '5812': { categoryId: 'restaurants', label: 'Рестораны и кафе' },
  '5814': { categoryId: 'restaurants', label: 'Фастфуд и заведения' },
  '5813': { categoryId: 'restaurants', label: 'Бары и клубы' },
  '5541': { categoryId: 'auto', label: 'АЗС / Топливо' },
  '5542': { categoryId: 'auto', label: 'Автоматические АЗС' },
  '5533': { categoryId: 'auto', label: 'Автозапчасти' },
  '7538': { categoryId: 'auto', label: 'Автосервис и ремонт' },
  '5912': { categoryId: 'health', label: 'Аптеки и фармация' },
  '8011': { categoryId: 'health', label: 'Медицинские услуги' },
  '8021': { categoryId: 'health', label: 'Стоматология' },
  '8099': { categoryId: 'health', label: 'Медицинские центры' },
  '4121': { categoryId: 'transport', label: 'Такси и каршеринг' },
  '4111': { categoryId: 'transport', label: 'Пассажирский транспорт' },
  '4131': { categoryId: 'transport', label: 'Автобусные перевозки' },
  '4011': { categoryId: 'transport', label: 'Железная дорога' },
  '4511': { categoryId: 'transport', label: 'Авиабилеты' },
  '5311': { categoryId: 'shopping', label: 'Универмаги и маркетплейсы' },
  '5651': { categoryId: 'shopping', label: 'Одежда и обувь' },
  '5732': { categoryId: 'shopping', label: 'Электроника' },
  '5200': { categoryId: 'shopping', label: 'Товары для дома' },
  '5211': { categoryId: 'shopping', label: 'Строительные материалы' },
  '5942': { categoryId: 'shopping', label: 'Книги и канцелярия' },
  '5977': { categoryId: 'shopping', label: 'Косметика и парфюмерия' },
  '5995': { categoryId: 'shopping', label: 'Зоотовары' },
  '7997': { categoryId: 'health', label: 'Фитнес и спорт' },
  '7832': { categoryId: 'shopping', label: 'Развлечения и кино' },
  '4814': { categoryId: 'utilities', label: 'Связь и интернет' },
  '4816': { categoryId: 'utilities', label: 'Онлайн-сервисы и IT' },
  '4900': { categoryId: 'utilities', label: 'Коммунальные платежи (ЖКХ)' },
};

export function extractCleanRuleKeyword(rawNote: string = '', note: string = ''): string {
  const fullText = (rawNote || note).trim();
  if (!fullText) return '';

  // 1. Look for explicit place of operation / merchant / recipient in bank statement format
  const locationPatterns = [
    /(?:место\s+совершения\s+операции|место\s+проведения\s+операции|место\s+операции|торговая\s+точка|место|получатель|заведение|организация)\s*:\s*([^,;\n]+)/i,
    /(?:покупка|оплата|списание|транзакция)\s+в\s+([^,;\n]+)/i,
  ];

  let extracted = '';
  for (const pat of locationPatterns) {
    const match = fullText.match(pat);
    if (match && match[1]) {
      extracted = match[1].trim();
      break;
    }
  }

  if (!extracted) {
    extracted = fullText;
  }

  // 2. Clean out technical bank noise, dates, card masks, MCC, and trailing suffixes (.ruFr)
  extracted = extracted
    .replace(/,?\s*MCC\s*:\s*\d{4}/gi, '')
    .replace(/,?\s*дата\s+создания.*$/gi, '')
    .replace(/,?\s*операция\s+по.*$/gi, '')
    .replace(/\.?ruFr$/gi, '') // E.g., Pizzafabrika.ruFr -> Pizzafabrika
    .replace(/\.?ruRu$/gi, '')
    .replace(/\.?ruEn$/gi, '')
    .replace(/^(Операция|Оплата|Покупка|Списание|Retail|Rus|C2C|Transfer|Card|Карта)[^:]*:\s*/gi, '')
    .replace(/\b\d{4,6}\*+\d{4}\b/g, '') // Card mask 220015******3271
    .replace(/\b\d{2}[.-]\d{2}[.-]\d{2,4}\b/g, '') // Dates
    .replace(/\s+/g, ' ')
    .trim();

  // Remove leading/trailing commas or colons
  extracted = extracted.replace(/^[:,;\s]+|[:,;\s]+$/g, '');

  if (extracted.length >= 3) {
    return extracted;
  }

  const cleanName = cleanMerchantName(fullText);
  return cleanName.length >= 3 ? cleanName : fullText;
}

export function analyzeTransaction(
  rawNote: string = '',
  note: string = '',
  mcc: string | undefined,
  learnedRules: LearnedRule[] = [],
  categories: Category[] = []
): AnalysisResult {
  const fullText = `${rawNote} ${note}`.trim();
  const lowerFull = fullText.toLowerCase();

  // 1. Check existing Learned Rules first
  for (const rule of learnedRules) {
    if (rule.keyword && lowerFull.includes(rule.keyword.toLowerCase())) {
      const matchCat = categories.find(c => c.id === rule.categoryId) ? rule.categoryId : 'other';
      return {
        suggestedCategoryId: matchCat,
        confidence: 100,
        reason: `Совпадение по ранее созданному правилу «${rule.keyword}»`,
        cleanName: rule.cleanName || cleanMerchantName(fullText, learnedRules),
        ruleKeyword: rule.keyword,
        source: 'learned_rule'
      };
    }
  }

  // Extract clean candidate keyword for saving a new rule
  const candidateKeyword = extractCleanRuleKeyword(rawNote, note);
  const cleanName = cleanMerchantName(fullText, learnedRules);

  // 2. Check SBP / Transfer
  if (lowerFull.includes('сбп') || lowerFull.includes('sbp') || lowerFull.includes('перевод') || lowerFull.includes('transfer')) {
    const transferCat = categories.find(c => c.id === 'transfer') ? 'transfer' : 'other';
    return {
      suggestedCategoryId: transferCat,
      confidence: 95,
      reason: 'Система распознала банковский перевод по СБП / карте',
      cleanName: cleanName || 'Перевод по СБП',
      ruleKeyword: candidateKeyword,
      source: 'sbp'
    };
  }

  // 3. Check MCC Code if present
  if (mcc) {
    const cleanMcc = mcc.trim();
    if (MCC_MAP[cleanMcc]) {
      const mapped = MCC_MAP[cleanMcc];
      const targetCat = categories.find(c => c.id === mapped.categoryId) ? mapped.categoryId : 'shopping';
      return {
        suggestedCategoryId: targetCat,
        confidence: 92,
        reason: `Определено по MCC-коду ${cleanMcc} (${mapped.label})`,
        cleanName,
        ruleKeyword: candidateKeyword,
        source: 'mcc'
      };
    }
  }

  // 4. Check Specific Brand Networks & Subcategories
  const BRAND_SUBCATEGORIES: Array<{ keywords: string[]; subCategoryId: string; parentCategoryId: string; brandName: string }> = [
    // Grocery chains
    { keywords: ['пятерочка', 'pyaterochka'], subCategoryId: 'grocery_pyaterochka', parentCategoryId: 'food', brandName: 'Пятерочка' },
    { keywords: ['магнит', 'magnit'], subCategoryId: 'grocery_magnit', parentCategoryId: 'food', brandName: 'Магнит' },
    { keywords: ['перекресток', 'perekrestok'], subCategoryId: 'grocery_perekrestok', parentCategoryId: 'food', brandName: 'Перекресток' },
    { keywords: ['вкусвилл', 'vkusvill'], subCategoryId: 'grocery_vkusvill', parentCategoryId: 'food', brandName: 'ВкусВилл' },
    { keywords: ['лента', 'lenta'], subCategoryId: 'grocery_lenta', parentCategoryId: 'food', brandName: 'Лента' },
    { keywords: ['самокат', 'samokat'], subCategoryId: 'grocery_samokat', parentCategoryId: 'food', brandName: 'Самокат' },
    { keywords: ['ашан', 'auchan'], subCategoryId: 'grocery_ashan', parentCategoryId: 'food', brandName: 'Ашан' },
    { keywords: ['глобус', 'globus'], subCategoryId: 'grocery_globus', parentCategoryId: 'food', brandName: 'Глобус' },
    { keywords: ['чижик', 'chizhik'], subCategoryId: 'grocery_chizhik', parentCategoryId: 'food', brandName: 'Чижик' },
    { keywords: ['дикси', 'dixy'], subCategoryId: 'grocery_dixy', parentCategoryId: 'food', brandName: 'Дикси' },
    { keywords: ['спар', 'spar'], subCategoryId: 'grocery_spar', parentCategoryId: 'food', brandName: 'Спар' },
    { keywords: ['светофор', 'svetoform'], subCategoryId: 'grocery_svetoform', parentCategoryId: 'food', brandName: 'Светофор' },
    { keywords: ['высшая лига'], subCategoryId: 'grocery_vysshaya_liga', parentCategoryId: 'food', brandName: 'Высшая Лига' },

    // Fast Food chains
    { keywords: ['вкусно и точка', 'vnoit', 'mcdonalds', 'макдоналдс'], subCategoryId: 'fastfood_vnoit', parentCategoryId: 'restaurants', brandName: 'Вкусно и точка' },
    { keywords: ['бургер кинг', 'burger king'], subCategoryId: 'fastfood_bk', parentCategoryId: 'restaurants', brandName: 'Бургер Кинг' },
    { keywords: ['rostics', 'ростикс', 'kfc'], subCategoryId: 'fastfood_rostics', parentCategoryId: 'restaurants', brandName: 'Ростикс / KFC' },
    { keywords: ['додо', 'dodo'], subCategoryId: 'fastfood_dodo', parentCategoryId: 'restaurants', brandName: 'Додо Пицца' },
    { keywords: ['pizzafabrika', 'пиццафабрика'], subCategoryId: 'fastfood_pizzafabrika', parentCategoryId: 'restaurants', brandName: 'ПиццаФабрика' },
    { keywords: ['теремок', 'teremok'], subCategoryId: 'fastfood_teremok', parentCategoryId: 'restaurants', brandName: 'Теремок' },
    { keywords: ['крошка картошка'], subCategoryId: 'fastfood_kroshka', parentCategoryId: 'restaurants', brandName: 'Крошка Картошка' },
    { keywords: ['шоколадница'], subCategoryId: 'fastfood_shokoladnitsa', parentCategoryId: 'restaurants', brandName: 'Шоколадница' },
    { keywords: ['cofix', 'кофикс'], subCategoryId: 'fastfood_cofix', parentCategoryId: 'restaurants', brandName: 'Cofix' },
  ];

  for (const brand of BRAND_SUBCATEGORIES) {
    if (brand.keywords.some(k => lowerFull.includes(k))) {
      const subExists = categories.some(c => c.id === brand.subCategoryId);
      const targetCat = subExists 
        ? brand.subCategoryId 
        : (categories.some(c => c.id === brand.parentCategoryId) ? brand.parentCategoryId : 'food');
      
      return {
        suggestedCategoryId: targetCat,
        confidence: 95,
        reason: subExists
          ? `Определена подкатегория «${brand.brandName}»`
          : `Распознана сеть «${brand.brandName}»`,
        cleanName: brand.brandName || cleanName,
        ruleKeyword: candidateKeyword,
        source: 'brand'
      };
    }
  }

  // 5. Check Brand Networks (fallback general)
  const BRAND_RULES: Array<{ keywords: string[]; categoryId: string; brandName: string }> = [
    { keywords: ['пятерочка', 'pyaterochka', 'магнит', 'magnit', 'перекресток', 'perekrestok', 'ашан', 'auchan', 'лента', 'lenta', 'дикси', 'dixy', 'вкусвилл', 'vkusvill', 'самокат', 'samokat', 'купер', 'спар', 'spar', 'чижик', 'светофор', 'верный', 'атрус', 'высшая лига', 'лотос', 'монетка', 'monetka', 'глобус', 'globus', 'ярче', 'yarche', 'командор', 'аллея', 'красный яр', 'табрис', 'кировский', 'самбери', 'реми', 'аникс', 'байрам', 'гулливер', 'бегемаг', 'абсолют', 'титан', 'челны-хлеб', 'европа', 'линия', 'победа', 'находка'], categoryId: 'food', brandName: 'Продуктовый ритейл' },
    { keywords: ['бургер кинг', 'burger king', 'kfc', 'rostics', 'ростикс', 'вкусно и точка', 'vnoit', 'додо', 'dodo', 'теремок', 'шоколадница', 'cofix', 'кафе', 'ресторан', 'столовая', 'пиццерия', 'кофейня', 'крошка картошка', 'тануки', 'якитория', 'суши вок', 'много лосося', 'папа джонс'], categoryId: 'restaurants', brandName: 'Кафе и общепит' },
    { keywords: ['лукойл', 'lukoil', 'роснефть', 'rosneft', 'газпромнефть', 'gpn', 'татнефть', 'башнефть', 'нефтьмагистраль', 'teboil', 'тебоил', 'azs', 'азс', 'шиномонтаж', 'автомойка', 'автосервис', 'автозапчасти'], categoryId: 'auto', brandName: 'Авто и заправки' },
    { keywords: ['wildberries', 'wb', 'ozon', 'озон', 'алиэкспресс', 'aliexpress', 'яндекс маркет', 'dns', 'мвидео', 'эльдорадо', 'леруа', 'лемана', 'ситилинк', 'всеинструменты', 'петрович', 'золотое яблоко', 'лэтуаль', 'рив гош', 'подружка', 'улыбка радуги', 'fix price', 'фикс прайс'], categoryId: 'shopping', brandName: 'Маркетплейсы, электроника и товары' },
    { keywords: ['яндекс такси', 'yandex.go', 'yandex.taxi', 'uber', 'такси', 'метрополитен', 'метро', 'ржд', 'пассажиравтотранс', 'делимобиль', 'ситидрайв', 'белкакар', 'аэрофлот', 'победа авиа'], categoryId: 'transport', brandName: 'Транспорт и такси' },
    { keywords: ['аптека', 'вита', 'апрель', 'ригла', '36.6', 'столички', 'клиника', 'медси', 'инвитро', 'гемотест', 'стоматология', 'больница', 'планета здоровья', 'фармленд', 'живика', 'еаптека', 'аптека.ру'], categoryId: 'health', brandName: 'Здоровье и аптеки' },
    { keywords: ['мосэнергосбыт', 'ростелеком', 'мтс', 'мегафон', 'билайн', 'tele2', 'т-мобайл', 'жкх'], categoryId: 'utilities', brandName: 'Связь и коммунальные услуги' },
  ];

  for (const brand of BRAND_RULES) {
    if (brand.keywords.some(k => lowerFull.includes(k))) {
      const matchCat = categories.find(c => c.id === brand.categoryId) ? brand.categoryId : 'shopping';
      return {
        suggestedCategoryId: matchCat,
        confidence: 88,
        reason: `Распознан бренд сеть «${brand.brandName}»`,
        cleanName,
        ruleKeyword: candidateKeyword,
        source: 'brand'
      };
    }
  }

  // 5. Keyword analysis
  if (lowerFull.includes('продукт') || lowerFull.includes('гастроном') || lowerFull.includes('пекарня') || lowerFull.includes('хлеб')) {
    const matchCat = categories.find(c => c.id === 'food') ? 'food' : 'shopping';
    return {
      suggestedCategoryId: matchCat,
      confidence: 78,
      reason: 'Анализ контекста: ключевое слово «Продукты»',
      cleanName,
      ruleKeyword: candidateKeyword,
      source: 'keyword'
    };
  }

  if (lowerFull.includes('кафе') || lowerFull.includes('кофе') || lowerFull.includes('столовая') || lowerFull.includes('выпечка')) {
    const matchCat = categories.find(c => c.id === 'restaurants') ? 'restaurants' : 'shopping';
    return {
      suggestedCategoryId: matchCat,
      confidence: 78,
      reason: 'Анализ контекста: ключевое слово «Кафе/Кофе»',
      cleanName,
      ruleKeyword: candidateKeyword,
      source: 'keyword'
    };
  }

  // Fallback default
  const defaultCat = categories.find(c => c.id === 'shopping') ? 'shopping' : (categories.find(c => c.id !== 'other')?.id || 'other');
  return {
    suggestedCategoryId: defaultCat,
    confidence: 60,
    reason: 'Автоподбор: категория «Покупки» (перепроверьте перед сохранением)',
    cleanName: cleanName || 'Банковская операция',
    ruleKeyword: candidateKeyword,
    source: 'fallback'
  };
}
