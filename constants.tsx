
import React from 'react';
import { 
  Utensils, Car, Home, ShoppingBag, 
  Heart, Zap, Plane, Briefcase, 
  PiggyBank, Coffee, Tv, MoreHorizontal,
  ArrowRightLeft, Fuel, Bus, ShoppingBasket,
  Shirt, Music, Gamepad2, Baby, Dog, Cat, 
  Flower2, Hammer, Wrench, BookOpen, GraduationCap, 
  Palmtree, Gift, Smartphone, Wifi, Scissors, 
  Bath, Bed, Sofa, Bike, Drumstick, Sparkles,
  Pill, Stethoscope, Dumbbell, Ticket, Monitor, 
  Footprints, Smile, HeartHandshake, FileText, ShieldCheck,
  Landmark, SmartphoneCharging, Armchair, Watch, Sun, Umbrella,
  Wine, GlassWater, CreditCard
} from 'lucide-react';
import { Category, FamilyMember, PantryItem, Transaction, ShoppingItem, FamilyEvent, SavingsGoal, Debt, Project, LoyaltyCard, LearnedRule, MandatoryExpense } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  // Food & Dining
  { id: 'food', label: 'Продукты', icon: 'ShoppingBasket', color: '#34C759' },
  { id: 'restaurants', label: 'Кафе и еда', icon: 'Utensils', color: '#FF9500' },
  { id: 'alcohol', label: 'Алкоголь', icon: 'Wine', color: '#AF52DE' },
  { id: 'coffee', label: 'Кофе', icon: 'Coffee', color: '#A2845E' },

  // Transport
  { id: 'auto', label: 'Авто', icon: 'Car', color: '#FF3B30' },
  { id: 'fuel', label: 'Бензин', icon: 'Fuel', color: '#FF3B30' },
  { id: 'car_service', label: 'Обслуживание', icon: 'Wrench', color: '#8E8E93' },
  { id: 'transport', label: 'Транспорт', icon: 'Bus', color: '#007AFF' },
  { id: 'taxi', label: 'Такси', icon: 'Car', color: '#FFCC00' },

  // Housing & Bills
  { id: 'housing', label: 'Аренда/Ипотека', icon: 'Home', color: '#AF52DE' },
  { id: 'utilities', label: 'ЖКХ', icon: 'Home', color: '#FF9500' },
  { id: 'internet', label: 'Связь', icon: 'Wifi', color: '#007AFF' },
  { id: 'taxes', label: 'Налоги', icon: 'Landmark', color: '#5856D6' },

  // Shopping
  { id: 'shopping', label: 'Шоппинг', icon: 'ShoppingBag', color: '#FF2D55' },
  { id: 'clothes', label: 'Одежда', icon: 'Shirt', color: '#5856D6' },
  { id: 'shoes', label: 'Обувь', icon: 'Footprints', color: '#FF9500' },
  { id: 'electronics', label: 'Электроника', icon: 'Smartphone', color: '#34C759' },
  { id: 'beauty', label: 'Красота', icon: 'Scissors', color: '#FF2D55' },
  { id: 'furniture', label: 'Мебель', icon: 'Armchair', color: '#A2845E' },

  // Health
  { id: 'health', label: 'Здоровье', icon: 'Heart', color: '#FF3B30' },
  { id: 'pharmacy', label: 'Аптека', icon: 'Pill', color: '#34C759' },
  { id: 'sport', label: 'Спорт', icon: 'Dumbbell', color: '#007AFF' },

  // Personal & Leisure
  { id: 'entertainment', label: 'Досуг', icon: 'Ticket', color: '#5856D6' },
  { id: 'subscriptions', label: 'Подписки', icon: 'Zap', color: '#5AC8FA' },
  { id: 'travel', label: 'Путешествия', icon: 'Plane', color: '#007AFF' },
  { id: 'hobbies', label: 'Хобби', icon: 'Palmtree', color: '#FFCC00' },
  { id: 'education', label: 'Обучение', icon: 'GraduationCap', color: '#5856D6' },
  { id: 'books', label: 'Книги', icon: 'BookOpen', color: '#A2845E' },

  // Family
  { id: 'kids', label: 'Дети', icon: 'Baby', color: '#FFCC00' },
  { id: 'pets', label: 'Питомцы', icon: 'Dog', color: '#FF9500' },
  
  // Other
  { id: 'gifts', label: 'Подарки', icon: 'Gift', color: '#FF2D55' },
  { id: 'charity', label: 'Благотв.', icon: 'HeartHandshake', color: '#FF3B30' },
  { id: 'services', label: 'Услуги', icon: 'Briefcase', color: '#8E8E93' },
  { id: 'transfer', label: 'Переводы', icon: 'ArrowRightLeft', color: '#8E8E93' },
  { id: 'other', label: 'Прочее', icon: 'MoreHorizontal', color: '#C7C7CC' },
];

export const DEFAULT_RULES: LearnedRule[] = [
  // Supermarkets
  { id: 'def_1', keyword: 'пятерочка', cleanName: 'Пятерочка', categoryId: 'food' },
  { id: 'def_2', keyword: 'pyaterochka', cleanName: 'Пятерочка', categoryId: 'food' },
  { id: 'def_3', keyword: 'перекресток', cleanName: 'Перекресток', categoryId: 'food' },
  { id: 'def_4', keyword: 'perekrestok', cleanName: 'Перекресток', categoryId: 'food' },
  { id: 'def_5', keyword: 'магнит', cleanName: 'Магнит', categoryId: 'food' },
  { id: 'def_6', keyword: 'magnit', cleanName: 'Магнит', categoryId: 'food' },
  { id: 'def_7', keyword: 'лента', cleanName: 'Лента', categoryId: 'food' },
  { id: 'def_8', keyword: 'lenta', cleanName: 'Лента', categoryId: 'food' },
  { id: 'def_9', keyword: 'ашан', cleanName: 'Ашан', categoryId: 'food' },
  { id: 'def_10', keyword: 'auchan', cleanName: 'Ашан', categoryId: 'food' },
  { id: 'def_11', keyword: 'вкусвилл', cleanName: 'ВкусВилл', categoryId: 'food' },
  { id: 'def_12', keyword: 'vkusvill', cleanName: 'ВкусВилл', categoryId: 'food' },
  { id: 'def_13', keyword: 'самокат', cleanName: 'Самокат', categoryId: 'food' },
  { id: 'def_14', keyword: 'samokat', cleanName: 'Самокат', categoryId: 'food' },
  { id: 'def_15', keyword: 'дикси', cleanName: 'Дикси', categoryId: 'food' },
  { id: 'def_16', keyword: 'dixy', cleanName: 'Дикси', categoryId: 'food' },
  { id: 'def_17', keyword: 'метро', cleanName: 'Metro', categoryId: 'food' },
  { id: 'def_18', keyword: 'metro', cleanName: 'Metro', categoryId: 'food' },
  { id: 'def_19', keyword: 'окей', cleanName: 'Окей', categoryId: 'food' },
  { id: 'def_20', keyword: 'okey', cleanName: 'Окей', categoryId: 'food' },
  { id: 'def_21', keyword: 'светофор', cleanName: 'Светофор', categoryId: 'food' },
  { id: 'def_22', keyword: 'чижик', cleanName: 'Чижик', categoryId: 'food' },
  { id: 'def_23', keyword: 'верный', cleanName: 'Верный', categoryId: 'food' },
  { id: 'def_24', keyword: 'спар', cleanName: 'Spar', categoryId: 'food' },
  { id: 'def_25', keyword: 'spar', cleanName: 'Spar', categoryId: 'food' },
  { id: 'def_26', keyword: 'красное&белое', cleanName: 'Красное & Белое', categoryId: 'alcohol' },
  { id: 'def_27', keyword: 'к&б', cleanName: 'Красное & Белое', categoryId: 'alcohol' },
  { id: 'def_28', keyword: 'krasnoe', cleanName: 'Красное & Белое', categoryId: 'alcohol' },
  { id: 'def_29', keyword: 'бристоль', cleanName: 'Бристоль', categoryId: 'alcohol' },
  { id: 'def_30', keyword: 'bristol', cleanName: 'Бристоль', categoryId: 'alcohol' },

  // Fast Food & Restaurants
  { id: 'def_31', keyword: 'вкусно и точка', cleanName: 'Вкусно и Точка', categoryId: 'restaurants' },
  { id: 'def_32', keyword: 'vnoit', cleanName: 'Вкусно и Точка', categoryId: 'restaurants' },
  { id: 'def_33', keyword: 'mcdonalds', cleanName: 'McDonalds', categoryId: 'restaurants' },
  { id: 'def_34', keyword: 'бургер кинг', cleanName: 'Burger King', categoryId: 'restaurants' },
  { id: 'def_35', keyword: 'burger king', cleanName: 'Burger King', categoryId: 'restaurants' },
  { id: 'def_36', keyword: 'kfc', cleanName: 'KFC', categoryId: 'restaurants' },
  { id: 'def_37', keyword: 'rostics', cleanName: 'Rostics', categoryId: 'restaurants' },
  { id: 'def_38', keyword: 'додо', cleanName: 'Додо Пицца', categoryId: 'restaurants' },
  { id: 'def_39', keyword: 'dodo', cleanName: 'Додо Пицца', categoryId: 'restaurants' },
  { id: 'def_40', keyword: 'теремок', cleanName: 'Теремок', categoryId: 'restaurants' },
  { id: 'def_41', keyword: 'teremok', cleanName: 'Теремок', categoryId: 'restaurants' },
  { id: 'def_42', keyword: 'шоколадница', cleanName: 'Шоколадница', categoryId: 'restaurants' },
  { id: 'def_43', keyword: 'ресторан', cleanName: 'Ресторан', categoryId: 'restaurants' },
  { id: 'def_44', keyword: 'кафе', cleanName: 'Кафе', categoryId: 'restaurants' },
  { id: 'def_45', keyword: 'бар', cleanName: 'Бар', categoryId: 'restaurants' },
  { id: 'def_46', keyword: 'кофе', cleanName: 'Кофейня', categoryId: 'coffee' },
  { id: 'def_47', keyword: 'coffee', cleanName: 'Кофейня', categoryId: 'coffee' },
  { id: 'def_48', keyword: 'starbucks', cleanName: 'Starbucks', categoryId: 'coffee' },
  { id: 'def_49', keyword: 'cofix', cleanName: 'Cofix', categoryId: 'coffee' },

  // Marketplaces & Shopping
  { id: 'def_50', keyword: 'wildberries', cleanName: 'Wildberries', categoryId: 'shopping' },
  { id: 'def_51', keyword: 'wb', cleanName: 'Wildberries', categoryId: 'shopping' },
  { id: 'def_52', keyword: 'ozon', cleanName: 'Ozon', categoryId: 'shopping' },
  { id: 'def_53', keyword: 'озон', cleanName: 'Ozon', categoryId: 'shopping' },
  { id: 'def_54', keyword: 'яндекс маркет', cleanName: 'Яндекс Маркет', categoryId: 'shopping' },
  { id: 'def_55', keyword: 'ym', cleanName: 'Яндекс Маркет', categoryId: 'shopping' },
  { id: 'def_56', keyword: 'lamoda', cleanName: 'Lamoda', categoryId: 'shopping' },
  { id: 'def_57', keyword: 'aliexpress', cleanName: 'AliExpress', categoryId: 'shopping' },
  { id: 'def_58', keyword: 'leroy merlin', cleanName: 'Леруа Мерлен', categoryId: 'housing' },
  { id: 'def_59', keyword: 'леруа', cleanName: 'Леруа Мерлен', categoryId: 'housing' },
  { id: 'def_60', keyword: 'obi', cleanName: 'OBI', categoryId: 'housing' },
  { id: 'def_61', keyword: 'ikea', cleanName: 'IKEA', categoryId: 'housing' },
  { id: 'def_62', keyword: 'hoff', cleanName: 'Hoff', categoryId: 'housing' },
  { id: 'def_63', keyword: 'fix price', cleanName: 'Fix Price', categoryId: 'shopping' },
  { id: 'def_64', keyword: 'фикс прайс', cleanName: 'Fix Price', categoryId: 'shopping' },
  { id: 'def_65', keyword: 'детский мир', cleanName: 'Детский Мир', categoryId: 'kids' },
  { id: 'def_66', keyword: 'летуаль', cleanName: 'Лэтуаль', categoryId: 'beauty' },
  { id: 'def_67', keyword: 'золотое яблоко', cleanName: 'Золотое Яблоко', categoryId: 'beauty' },
  { id: 'def_68', keyword: 'рив гош', cleanName: 'Рив Гош', categoryId: 'beauty' },

  // Transport & Auto
  { id: 'def_70', keyword: 'яндекс такси', cleanName: 'Яндекс Такси', categoryId: 'taxi' },
  { id: 'def_71', keyword: 'yandex.go', cleanName: 'Яндекс Go', categoryId: 'taxi' },
  { id: 'def_72', keyword: 'uber', cleanName: 'Uber', categoryId: 'taxi' },
  { id: 'def_73', keyword: 'ситимобил', cleanName: 'Ситимобил', categoryId: 'taxi' },
  { id: 'def_74', keyword: 'лукойл', cleanName: 'Лукойл', categoryId: 'fuel' },
  { id: 'def_75', keyword: 'lukoil', cleanName: 'Лукойл', categoryId: 'fuel' },
  { id: 'def_76', keyword: 'газпромнефть', cleanName: 'Газпром Нефть', categoryId: 'fuel' },
  { id: 'def_77', keyword: 'gpn', cleanName: 'Газпром Нефть', categoryId: 'fuel' },
  { id: 'def_78', keyword: 'роснефть', cleanName: 'Роснефть', categoryId: 'fuel' },
  { id: 'def_79', keyword: 'rosneft', cleanName: 'Роснефть', categoryId: 'fuel' },
  { id: 'def_80', keyword: 'shell', cleanName: 'Shell', categoryId: 'fuel' },
  { id: 'def_81', keyword: 'татнефть', cleanName: 'Татнефть', categoryId: 'fuel' },
  { id: 'def_82', keyword: 'азс', cleanName: 'АЗС', categoryId: 'fuel' },
  { id: 'def_83', keyword: 'метрополитен', cleanName: 'Метро', categoryId: 'transport' },
  { id: 'def_84', keyword: 'мосгортранс', cleanName: 'Транспорт', categoryId: 'transport' },
  { id: 'def_85', keyword: 'тройка', cleanName: 'Тройка', categoryId: 'transport' },
  { id: 'def_86', keyword: 'ржд', cleanName: 'РЖД', categoryId: 'travel' },
  { id: 'def_87', keyword: 'rzd', cleanName: 'РЖД', categoryId: 'travel' },
  { id: 'def_88', keyword: 'аэрофлот', cleanName: 'Аэрофлот', categoryId: 'travel' },
  { id: 'def_89', keyword: 's7', cleanName: 'S7 Airlines', categoryId: 'travel' },
  { id: 'def_90', keyword: 'победа', cleanName: 'Победа', categoryId: 'travel' },
  { id: 'def_91', keyword: 'мойка', cleanName: 'Автомойка', categoryId: 'auto' },
  { id: 'def_92', keyword: 'шиномонтаж', cleanName: 'Шиномонтаж', categoryId: 'auto' },
  { id: 'def_93', keyword: 'парковка', cleanName: 'Парковка', categoryId: 'auto' },

  // Health
  { id: 'def_94', keyword: 'аптека', cleanName: 'Аптека', categoryId: 'pharmacy' },
  { id: 'def_95', keyword: 'apteka', cleanName: 'Аптека', categoryId: 'pharmacy' },
  { id: 'def_96', keyword: 'планета здоровья', cleanName: 'Планета Здоровья', categoryId: 'pharmacy' },
  { id: 'def_97', keyword: 'вита', cleanName: 'Вита', categoryId: 'pharmacy' },
  { id: 'def_98', keyword: 'ригла', cleanName: 'Ригла', categoryId: 'pharmacy' },
  { id: 'def_99', keyword: 'инвитро', cleanName: 'Инвитро', categoryId: 'health' },
  { id: 'def_100', keyword: 'гемотест', cleanName: 'Гемотест', categoryId: 'health' },
  { id: 'def_101', keyword: 'клиника', cleanName: 'Клиника', categoryId: 'health' },
  { id: 'def_102', keyword: 'стоматолог', cleanName: 'Стоматология', categoryId: 'health' },
  { id: 'def_103', keyword: 'медси', cleanName: 'Медси', categoryId: 'health' },

  // Services & Communications
  { id: 'def_104', keyword: 'мтс', cleanName: 'МТС', categoryId: 'internet' },
  { id: 'def_105', keyword: 'mts', cleanName: 'МТС', categoryId: 'internet' },
  { id: 'def_106', keyword: 'билайн', cleanName: 'Билайн', categoryId: 'internet' },
  { id: 'def_107', keyword: 'beeline', cleanName: 'Билайн', categoryId: 'internet' },
  { id: 'def_108', keyword: 'мегафон', cleanName: 'Мегафон', categoryId: 'internet' },
  { id: 'def_109', keyword: 'megafon', cleanName: 'Мегафон', categoryId: 'internet' },
  { id: 'def_110', keyword: 'tele2', cleanName: 'Tele2', categoryId: 'internet' },
  { id: 'def_111', keyword: 'теле2', cleanName: 'Tele2', categoryId: 'internet' },
  { id: 'def_112', keyword: 'ростелеком', cleanName: 'Ростелеком', categoryId: 'internet' },
  { id: 'def_113', keyword: 'дом.ру', cleanName: 'Дом.ру', categoryId: 'internet' },
  { id: 'def_114', keyword: 'жкх', cleanName: 'ЖКХ', categoryId: 'utilities' },
  { id: 'def_115', keyword: 'мосэнерго', cleanName: 'Мосэнерго', categoryId: 'utilities' },
  { id: 'def_116', keyword: 'петроэлектросбыт', cleanName: 'Петроэлектросбыт', categoryId: 'utilities' },
  { id: 'def_117', keyword: 'газпром межрегионгаз', cleanName: 'Газ', categoryId: 'utilities' },

  // Electronics
  { id: 'def_118', keyword: 'м.видео', cleanName: 'М.Видео', categoryId: 'electronics' },
  { id: 'def_119', keyword: 'mvideo', cleanName: 'М.Видео', categoryId: 'electronics' },
  { id: 'def_120', keyword: 'эльдорадо', cleanName: 'Эльдорадо', categoryId: 'electronics' },
  { id: 'def_121', keyword: 'eldorado', cleanName: 'Эльдорадо', categoryId: 'electronics' },
  { id: 'def_122', keyword: 'днс', cleanName: 'DNS', categoryId: 'electronics' },
  { id: 'def_123', keyword: 'dns', cleanName: 'DNS', categoryId: 'electronics' },
  { id: 'def_124', keyword: 'ситилинк', cleanName: 'Ситилинк', categoryId: 'electronics' },
  { id: 'def_125', keyword: 'citilink', cleanName: 'Ситилинк', categoryId: 'electronics' },
  { id: 'def_126', keyword: 're:store', cleanName: 're:Store', categoryId: 'electronics' },

  // Subscriptions
  { id: 'def_127', keyword: 'яндекс плюс', cleanName: 'Яндекс Плюс', categoryId: 'subscriptions' },
  { id: 'def_128', keyword: 'yandex plus', cleanName: 'Яндекс Плюс', categoryId: 'subscriptions' },
  { id: 'def_129', keyword: 'youtube', cleanName: 'YouTube', categoryId: 'subscriptions' },
  { id: 'def_130', keyword: 'netflix', cleanName: 'Netflix', categoryId: 'subscriptions' },
  { id: 'def_131', keyword: 'app store', cleanName: 'App Store', categoryId: 'subscriptions' },
  { id: 'def_132', keyword: 'itunes', cleanName: 'iTunes', categoryId: 'subscriptions' },
  { id: 'def_133', keyword: 'google', cleanName: 'Google', categoryId: 'subscriptions' },
  { id: 'def_134', keyword: 'okko', cleanName: 'Okko', categoryId: 'subscriptions' },
  { id: 'def_135', keyword: 'ivi', cleanName: 'Ivi', categoryId: 'subscriptions' },
  { id: 'def_136', keyword: 'kinopoisk', cleanName: 'Кинопоиск', categoryId: 'subscriptions' },
  { id: 'def_137', keyword: 'кинопоиск', cleanName: 'Кинопоиск', categoryId: 'subscriptions' },
  { id: 'def_138', keyword: 'spotify', cleanName: 'Spotify', categoryId: 'subscriptions' },
  { id: 'def_139', keyword: 'vk music', cleanName: 'VK Музыка', categoryId: 'subscriptions' },

  // Other
  { id: 'def_140', keyword: 'сбер', cleanName: 'Сбербанк', categoryId: 'transfer' },
  { id: 'def_141', keyword: 'sber', cleanName: 'Сбербанк', categoryId: 'transfer' },
  { id: 'def_142', keyword: 'тинькофф', cleanName: 'Тинькофф', categoryId: 'transfer' },
  { id: 'def_143', keyword: 'tinkoff', cleanName: 'Тинькофф', categoryId: 'transfer' },
  { id: 'def_144', keyword: 'альфа-банк', cleanName: 'Альфа-Банк', categoryId: 'transfer' },
  { id: 'def_145', keyword: 'alfa', cleanName: 'Альфа-Банк', categoryId: 'transfer' },
  { id: 'def_146', keyword: 'vtb', cleanName: 'ВТБ', categoryId: 'transfer' },
  { id: 'def_147', keyword: 'втб', cleanName: 'ВТБ', categoryId: 'transfer' },
  { id: 'def_148', keyword: 'перевод', cleanName: 'Перевод', categoryId: 'transfer' },
  { id: 'def_149', keyword: 'transfer', cleanName: 'Перевод', categoryId: 'transfer' },
  { id: 'def_150', keyword: 'сбп', cleanName: 'Перевод СБП', categoryId: 'transfer' },
];

export const BASIC_FRIDGE_ITEMS = [
  { title: 'Молоко', amount: '1', unit: 'л', category: 'dairy' },
  { title: 'Яйца', amount: '10', unit: 'шт', category: 'dairy' },
  { title: 'Хлеб', amount: '1', unit: 'шт', category: 'bakery' },
  { title: 'Масло сливочное', amount: '1', unit: 'уп', category: 'dairy' },
  { title: 'Сыр', amount: '1', unit: 'уп', category: 'dairy' },
  { title: 'Курица', amount: '1', unit: 'кг', category: 'meat' },
  { title: 'Картофель', amount: '2', unit: 'кг', category: 'produce' },
  { title: 'Лук', amount: '1', unit: 'кг', category: 'produce' },
  { title: 'Морковь', amount: '1', unit: 'кг', category: 'produce' },
  { title: 'Макароны', amount: '1', unit: 'уп', category: 'grocery' },
  { title: 'Рис', amount: '1', unit: 'уп', category: 'grocery' },
  { title: 'Гречка', amount: '1', unit: 'уп', category: 'grocery' },
  { title: 'Масло растительное', amount: '1', unit: 'л', category: 'grocery' },
  { title: 'Чай', amount: '1', unit: 'уп', category: 'grocery' },
  { title: 'Кофе', amount: '1', unit: 'уп', category: 'grocery' },
  { title: 'Сахар', amount: '1', unit: 'кг', category: 'grocery' },
  { title: 'Соль', amount: '1', unit: 'уп', category: 'grocery' }
];

export const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 't1', amount: 50000, type: 'income', category: 'salary', memberId: 'm1', note: 'Зарплата', date: new Date().toISOString() },
  { id: 't2', amount: 1500, type: 'expense', category: 'food', memberId: 'm1', note: 'Пятерочка', date: new Date(Date.now() - 86400000).toISOString() },
  { id: 't3', amount: 300, type: 'expense', category: 'transport', memberId: 'm2', note: 'Метро', date: new Date(Date.now() - 172800000).toISOString() },
];

export const DEMO_MANDATORY_EXPENSES: MandatoryExpense[] = [
  { id: 'me1', name: 'Ипотека', amount: 35000, day: 15, remind: true, keywords: ['ипотека', 'domclick'] },
  { id: 'me2', name: 'Интернет', amount: 800, day: 1, remind: false, keywords: ['ростелеком', 'дом.ру', 'мтс'] },
];

export const DEMO_SHOPPING_ITEMS: ShoppingItem[] = [
  { id: 's1', title: 'Молоко', amount: '1', unit: 'л', completed: false, memberId: 'm1', priority: 'high', category: 'dairy' },
  { id: 's2', title: 'Хлеб', amount: '1', unit: 'шт', completed: false, memberId: 'm1', priority: 'medium', category: 'bakery' },
  { id: 's3', title: 'Яйца', amount: '10', unit: 'шт', completed: true, memberId: 'm2', priority: 'medium', category: 'dairy' },
];

export const DEMO_EVENTS: FamilyEvent[] = [
  { id: 'e1', title: 'Семейный ужин', description: 'В ресторане', date: new Date().toISOString().split('T')[0], time: '19:00', duration: 2, memberIds: ['m1', 'm2'] },
];

export const DEMO_GOALS: SavingsGoal[] = [
  { id: 'g1', title: 'Отпуск', targetAmount: 100000, currentAmount: 25000, icon: 'Plane', color: '#007AFF' },
  { id: 'g2', title: 'Машина', targetAmount: 1500000, currentAmount: 300000, icon: 'Car', color: '#FF3B30' },
];

export const FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'm1', name: 'Папа', color: '#007AFF', isAdmin: true, userId: 'demo-user-1' },
  { id: 'm2', name: 'Мама', color: '#FF2D55', isAdmin: true, userId: 'demo-user-2' },
];

export const DEMO_DEBTS: Debt[] = [
  { id: 'd1', name: 'Ипотека', totalAmount: 5000000, currentBalance: 4200000, color: '#FF3B30' },
  { id: 'd2', name: 'Кредитка', totalAmount: 100000, currentBalance: 15000, color: '#FF9500' }
];

export const DEMO_PROJECTS: Project[] = [
  { id: 'p1', title: 'Ремонт кухни', totalBudget: 500000, currency: '₽', status: 'active', startDate: new Date().toISOString(), color: '#34C759', icon: 'Hammer', expenses: [] }
];

export const DEMO_LOYALTY_CARDS: LoyaltyCard[] = [
  { id: 'lc1', name: 'Пятерочка', number: '778900012345', color: '#2FAC66', icon: 'ShoppingBag', barcodeFormat: 'code128' },
  { id: 'lc2', name: 'Спортмастер', number: '9900112233', color: '#007AFF', icon: 'Dumbbell', barcodeFormat: 'ean13' }
];

export const MemberMarker = ({ member, size = 'md' }: { member: FamilyMember, size?: 'sm' | 'md' }) => (
  <div 
    className={`${size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-10 h-10 text-xs'} rounded-full flex items-center justify-center font-bold text-white shadow-sm border-2 border-white dark:border-[#1C1C1E]`} 
    style={{ backgroundColor: member.color }}
  >
    {member.avatar ? (
      <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
    ) : (
      member.name.charAt(0).toUpperCase()
    )}
  </div>
);

export const getIconById = (iconName: string, size: number = 24) => {
  const icons: any = {
    ShoppingBag, Utensils, Car, Home, Heart, Zap, Plane, Briefcase, 
    PiggyBank, Coffee, Tv, MoreHorizontal, Fuel, Bus, ShoppingBasket,
    Shirt, Music, Gamepad2, Baby, Dog, Cat, Flower2, Hammer, Wrench,
    BookOpen, GraduationCap, Palmtree, Gift, Smartphone, Wifi, Scissors,
    Bath, Bed, Sofa, Bike, Drumstick, Sparkles, Pill, Stethoscope, Dumbbell,
    Ticket, Monitor, Footprints, Smile, HeartHandshake, FileText, ShieldCheck,
    Landmark, SmartphoneCharging, Armchair, Watch, Sun, Umbrella, Wine, GlassWater, CreditCard
  };
  const IconComponent = icons[iconName] || ShoppingBag;
  return <IconComponent size={size} />;
};
