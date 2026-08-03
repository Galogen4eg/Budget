
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
  Wine, GlassWater, CreditCard, ShoppingCart, Train, Ship,
  Map, Flag, Star, Bell, Mail, Camera, Video, Mic, Speaker,
  Laptop, Printer, HardDrive, Cloud, Droplets, Flame, Key, Lock,
  Anchor, CheckCircle2, AlertTriangle, HelpCircle, Palette, Settings2,
  Beer, Cigarette, Clapperboard, Ghost, Crown, Gem
} from 'lucide-react';
import { Category, FamilyMember, Transaction, ShoppingItem, FamilyEvent, SavingsGoal, Project, LoyaltyCard, LearnedRule, MandatoryExpense, CatalogItem } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  // Food & Dining
  { id: 'food', label: 'Продукты', icon: 'ShoppingBasket', color: '#34C759' },
  { id: 'restaurants', label: 'Кафе и Рестораны', icon: 'Utensils', color: '#FF9500' },
  { id: 'bars', label: 'Бары и Пабы', icon: 'Beer', color: '#AF52DE' },
  { id: 'alcohol', label: 'Алкоголь', icon: 'Wine', color: '#AF52DE' },
  { id: 'coffee', label: 'Кофе', icon: 'Coffee', color: '#A2845E' },
  
  // Yaroslavl Bars (Subcategories)
  { id: 'bar_papin_garage', label: 'Папин Гараж', icon: 'Beer', color: '#AF52DE', parentId: 'bars' },
  { id: 'bar_dudki', label: 'ДудкиБар', icon: 'Beer', color: '#AF52DE', parentId: 'bars' },
  { id: 'bar_jao_da', label: 'Китайский летчик Джао Да', icon: 'Beer', color: '#AF52DE', parentId: 'bars' },
  { id: 'bar_brugge', label: 'Брюгге', icon: 'Beer', color: '#AF52DE', parentId: 'bars' },
  { id: 'bar_pinta', label: 'Пинта', icon: 'Beer', color: '#AF52DE', parentId: 'bars' },
  { id: 'bar_krapiva', label: 'Крапива', icon: 'Beer', color: '#AF52DE', parentId: 'bars' },
  { id: 'bar_hophead', label: 'HopHead', icon: 'Beer', color: '#AF52DE', parentId: 'bars' },
  { id: 'bar_ryumka', label: 'Рюмка', icon: 'Beer', color: '#AF52DE', parentId: 'bars' },
  { id: 'bar_hmel_solod', label: 'Хмель & Солод', icon: 'Beer', color: '#AF52DE', parentId: 'bars' },
  { id: 'bar_afonya', label: 'Афоня', icon: 'Beer', color: '#AF52DE', parentId: 'bars' },

  // Yaroslavl Restaurants (Subcategories)
  { id: 'rest_mamuka', label: 'Мамука', icon: 'Utensils', color: '#FF9500', parentId: 'restaurants' },
  { id: 'rest_penaty', label: 'Пенаты', icon: 'Utensils', color: '#FF9500', parentId: 'restaurants' },
  { id: 'rest_roga_kopita', label: 'Рога и Копыта', icon: 'Utensils', color: '#FF9500', parentId: 'restaurants' },
  { id: 'rest_bulvar', label: 'Бульвар', icon: 'Utensils', color: '#FF9500', parentId: 'restaurants' },
  { id: 'rest_skazka', label: 'Сказка', icon: 'Utensils', color: '#FF9500', parentId: 'restaurants' },
  { id: 'rest_ioann', label: 'Иоанн Васильевич', icon: 'Utensils', color: '#FF9500', parentId: 'restaurants' },
  { id: 'rest_svoi', label: 'Свои да Наши', icon: 'Utensils', color: '#FF9500', parentId: 'restaurants' },
  { id: 'rest_utro', label: 'Утро', icon: 'Utensils', color: '#FF9500', parentId: 'restaurants' },
  { id: 'rest_to_dze', label: 'То Дзе', icon: 'Utensils', color: '#FF9500', parentId: 'restaurants' },

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
  // Yaroslavl Bars
  { id: 'def_yar_1', keyword: 'папин гараж', cleanName: 'Папин Гараж', categoryId: 'bar_papin_garage' },
  { id: 'def_yar_2', keyword: 'papin garage', cleanName: 'Папин Гараж', categoryId: 'bar_papin_garage' },
  { id: 'def_yar_3', keyword: 'дудки', cleanName: 'ДудкиБар', categoryId: 'bar_dudki' },
  { id: 'def_yar_4', keyword: 'джао да', cleanName: 'Китайский Летчик Джао Да', categoryId: 'bar_jao_da' },
  { id: 'def_yar_5', keyword: 'брюгге', cleanName: 'Брюгге', categoryId: 'bar_brugge' },
  { id: 'def_yar_6', keyword: 'пинта', cleanName: 'Пинта', categoryId: 'bar_pinta' },
  { id: 'def_yar_7', keyword: 'крапива', cleanName: 'Крапива', categoryId: 'bar_krapiva' },
  { id: 'def_yar_8', keyword: 'hophead', cleanName: 'HopHead', categoryId: 'bar_hophead' },
  { id: 'def_yar_9', keyword: 'рюмка', cleanName: 'Рюмка', categoryId: 'bar_ryumka' },
  { id: 'def_yar_10', keyword: 'хмель и солод', cleanName: 'Хмель & Солод', categoryId: 'bar_hmel_solod' },
  { id: 'def_yar_11', keyword: 'афоня', cleanName: 'Афоня', categoryId: 'bar_afonya' },
  { id: 'def_yar_12', keyword: 'лапша и бар', cleanName: 'Лапша и Бар', categoryId: 'bars' }, // Or create subcat

  // Yaroslavl Restaurants
  { id: 'def_yar_13', keyword: 'мамука', cleanName: 'Мамука', categoryId: 'rest_mamuka' },
  { id: 'def_yar_14', keyword: 'пенаты', cleanName: 'Пенаты', categoryId: 'rest_penaty' },
  { id: 'def_yar_15', keyword: 'рога и копыта', cleanName: 'Рога и Копыта', categoryId: 'rest_roga_kopita' },
  { id: 'def_yar_16', keyword: 'бульвар', cleanName: 'Бульвар', categoryId: 'rest_bulvar' },
  { id: 'def_yar_17', keyword: 'сказка', cleanName: 'Сказка', categoryId: 'rest_skazka' },
  { id: 'def_yar_18', keyword: 'иоанн', cleanName: 'Иоанн Васильевич', categoryId: 'rest_ioann' },
  { id: 'def_yar_19', keyword: 'свои да наши', cleanName: 'Свои да Наши', categoryId: 'rest_svoi' },
  { id: 'def_yar_20', keyword: 'утро', cleanName: 'Утро', categoryId: 'rest_utro' },
  { id: 'def_yar_21', keyword: 'то дзе', cleanName: 'То Дзе', categoryId: 'rest_to_dze' },
  { id: 'def_yar_22', keyword: 'буратино', cleanName: 'Буратино', categoryId: 'restaurants' },

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

export const DEMO_PROJECTS: Project[] = [
  { id: 'p1', title: 'Ремонт кухни', totalBudget: 500000, currency: '₽', status: 'active', startDate: new Date().toISOString(), color: '#34C759', icon: 'Hammer', expenses: [] }
];

export const DEMO_LOYALTY_CARDS: LoyaltyCard[] = [
  { id: 'lc1', name: 'Пятерочка', number: '778900012345', color: '#2FAC66', icon: 'ShoppingBag', barcodeFormat: 'code128' },
  { id: 'lc2', name: 'Спортмастер', number: '9900112233', color: '#007AFF', icon: 'Dumbbell', barcodeFormat: 'ean13' }
];

export const DEFAULT_PRODUCT_CATALOG: CatalogItem[] = [
  // Молочные продукты и яйца (dairy)
  { id: 'cat_d1', title: 'Молоко 3.2%', category: 'dairy', unit: 'л' },
  { id: 'cat_d2', title: 'Молоко 2.5%', category: 'dairy', unit: 'л' },
  { id: 'cat_d3', title: 'Кефир 2.5%', category: 'dairy', unit: 'шт' },
  { id: 'cat_d4', title: 'Творог 5%', category: 'dairy', unit: 'уп' },
  { id: 'cat_d5', title: 'Сметана 15%', category: 'dairy', unit: 'уп' },
  { id: 'cat_d6', title: 'Масло сливочное 82.5%', category: 'dairy', unit: 'уп' },
  { id: 'cat_d7', title: 'Сыр Российский', category: 'dairy', unit: 'уп' },
  { id: 'cat_d8', title: 'Сыр Гауда', category: 'dairy', unit: 'уп' },
  { id: 'cat_d9', title: 'Яйца куриные С0', category: 'dairy', unit: 'уп' },
  { id: 'cat_d10', title: 'Яйца куриные С1', category: 'dairy', unit: 'уп' },
  { id: 'cat_d11', title: 'Йогурт греческий', category: 'dairy', unit: 'шт' },
  { id: 'cat_d12', title: 'Сливки 10%', category: 'dairy', unit: 'шт' },
  { id: 'cat_d13', title: 'Ряженка 4%', category: 'dairy', unit: 'шт' },
  { id: 'cat_d14', title: 'Сырок творожный глазированный', category: 'dairy', unit: 'шт' },

  // Овощи и фрукты (produce)
  { id: 'cat_p1', title: 'Картофель свежий', category: 'produce', unit: 'кг' },
  { id: 'cat_p2', title: 'Морковь мытая', category: 'produce', unit: 'кг' },
  { id: 'cat_p3', title: 'Лук репчатый', category: 'produce', unit: 'кг' },
  { id: 'cat_p4', title: 'Огурцы среднеплодные', category: 'produce', unit: 'кг' },
  { id: 'cat_p5', title: 'Томаты спелые', category: 'produce', unit: 'кг' },
  { id: 'cat_p6', title: 'Томаты черри', category: 'produce', unit: 'уп' },
  { id: 'cat_p7', title: 'Перец болгарский сладкий', category: 'produce', unit: 'кг' },
  { id: 'cat_p8', title: 'Кабачки свежие', category: 'produce', unit: 'кг' },
  { id: 'cat_p9', title: 'Баклажаны', category: 'produce', unit: 'кг' },
  { id: 'cat_p10', title: 'Капуста белокочанная', category: 'produce', unit: 'кг' },
  { id: 'cat_p11', title: 'Чеснок', category: 'produce', unit: 'шт' },
  { id: 'cat_p12', title: 'Зелень (Укроп/Петрушка)', category: 'produce', unit: 'уп' },
  { id: 'cat_p13', title: 'Салат листовой', category: 'produce', unit: 'уп' },
  { id: 'cat_p14', title: 'Яблоки Семеренко / Гала', category: 'produce', unit: 'кг' },
  { id: 'cat_p15', title: 'Бананы спелые', category: 'produce', unit: 'кг' },
  { id: 'cat_p16', title: 'Лимоны', category: 'produce', unit: 'кг' },
  { id: 'cat_p17', title: 'Апельсины', category: 'produce', unit: 'кг' },
  { id: 'cat_p18', title: 'Мандарины', category: 'produce', unit: 'кг' },
  { id: 'cat_p19', title: 'Авокадо Хасс', category: 'produce', unit: 'шт' },
  { id: 'cat_p20', title: 'Виноград бескосточковый', category: 'produce', unit: 'кг' },

  // Мясо, птица, рыба (meat)
  { id: 'cat_m1', title: 'Филе куриной грудки', category: 'meat', unit: 'кг' },
  { id: 'cat_m2', title: 'Бедро куриное охлажденное', category: 'meat', unit: 'кг' },
  { id: 'cat_m3', title: 'Филе индейки', category: 'meat', unit: 'кг' },
  { id: 'cat_m4', title: 'Фарш домашний (свинина/говядина)', category: 'meat', unit: 'уп' },
  { id: 'cat_m5', title: 'Свинина шея бескостная', category: 'meat', unit: 'кг' },
  { id: 'cat_m6', title: 'Говядина мякоть', category: 'meat', unit: 'кг' },
  { id: 'cat_m7', title: 'Сосиски Молочные', category: 'meat', unit: 'уп' },
  { id: 'cat_m8', title: 'Колбаса Докторская вареная', category: 'meat', unit: 'уп' },
  { id: 'cat_m9', title: 'Колбаса сырокопченая', category: 'meat', unit: 'уп' },
  { id: 'cat_m10', title: 'Семга / Лосось слабосоленый', category: 'meat', unit: 'уп' },
  { id: 'cat_m11', title: 'Минтай / Треска филе', category: 'meat', unit: 'кг' },
  { id: 'cat_m12', title: 'Креветки варено-мороженые', category: 'meat', unit: 'кг' },

  // Хлеб и выпечка (bakery)
  { id: 'cat_b1', title: 'Батон нарезной пшеничный', category: 'bakery', unit: 'шт' },
  { id: 'cat_b2', title: 'Хлеб Дарницкий / ржаной', category: 'bakery', unit: 'шт' },
  { id: 'cat_b3', title: 'Лаваш тонкий армянский', category: 'bakery', unit: 'уп' },
  { id: 'cat_b4', title: 'Булочки для гамбургеров', category: 'bakery', unit: 'уп' },
  { id: 'cat_b5', title: 'Хлебцы зерновые', category: 'bakery', unit: 'уп' },

  // Бакалея и крупы (grocery)
  { id: 'cat_g1', title: 'Рис длиннозерный / круглозерный', category: 'grocery', unit: 'уп' },
  { id: 'cat_g2', title: 'Гречневая крупа', category: 'grocery', unit: 'уп' },
  { id: 'cat_g3', title: 'Макароны Спагетти', category: 'grocery', unit: 'уп' },
  { id: 'cat_g4', title: 'Макароны Перья / Рожки', category: 'grocery', unit: 'уп' },
  { id: 'cat_g5', title: 'Мука пшеничная высший сорт', category: 'grocery', unit: 'уп' },
  { id: 'cat_g6', title: 'Сахар-песок 1 кг', category: 'grocery', unit: 'кг' },
  { id: 'cat_g7', title: 'Соль пищевая 1 кг', category: 'grocery', unit: 'уп' },
  { id: 'cat_g8', title: 'Масло подсолнечное рафинированное 1 л', category: 'grocery', unit: 'л' },
  { id: 'cat_g9', title: 'Масло оливковое Extra Virgin', category: 'grocery', unit: 'шт' },
  { id: 'cat_g10', title: 'Овсяные хлопья «Геркулес»', category: 'grocery', unit: 'уп' },
  { id: 'cat_g11', title: 'Чай черный листовой / в пакетиках', category: 'grocery', unit: 'уп' },
  { id: 'cat_g12', title: 'Кофейные зерна / молотый кофе', category: 'grocery', unit: 'уп' },
  { id: 'cat_g13', title: 'Майонез Провансаль 67%', category: 'grocery', unit: 'уп' },
  { id: 'cat_g14', title: 'Кетчуп томатный', category: 'grocery', unit: 'уп' },
  { id: 'cat_g15', title: 'Томатная паста', category: 'grocery', unit: 'уп' },
  { id: 'cat_g16', title: 'Консервированный зеленый горошек', category: 'grocery', unit: 'шт' },
  { id: 'cat_g17', title: 'Консервированная кукуруза', category: 'grocery', unit: 'шт' },
  { id: 'cat_g18', title: 'Подсолнечные / тыквенные семечки', category: 'grocery', unit: 'уп' },

  // Напитки (drinks)
  { id: 'cat_dr1', title: 'Вода питьевая негазированная 5 л', category: 'drinks', unit: 'шт' },
  { id: 'cat_dr2', title: 'Вода питьевая 1.5 л', category: 'drinks', unit: 'шт' },
  { id: 'cat_dr3', title: 'Минеральная вода Боржоми / Ессентуки', category: 'drinks', unit: 'шт' },
  { id: 'cat_dr4', title: 'Сок апельсиновый / яблочный 1 л', category: 'drinks', unit: 'шт' },
  { id: 'cat_dr5', title: 'Морс клюквенный / брусничный', category: 'drinks', unit: 'шт' },
  { id: 'cat_dr6', title: 'Газированный напиток (Кола / Дюшес)', category: 'drinks', unit: 'шт' },

  // Сладости и снеки (sweets)
  { id: 'cat_s1', title: 'Шоколад молочный / темный 90 г', category: 'sweets', unit: 'шт' },
  { id: 'cat_s2', title: 'Печенье овсяное / сахарное', category: 'sweets', unit: 'уп' },
  { id: 'cat_s3', title: 'Конфеты шоколадные', category: 'sweets', unit: 'уп' },
  { id: 'cat_s4', title: 'Вафли с начинкой', category: 'sweets', unit: 'уп' },
  { id: 'cat_s5', title: 'Чипсы картофельные', category: 'sweets', unit: 'уп' },
  { id: 'cat_s6', title: 'Орехи миндаль / кешью / фундук', category: 'sweets', unit: 'уп' },
  { id: 'cat_s7', title: 'Сухофрукты (курага / изюм)', category: 'sweets', unit: 'уп' },

  // Заморозка (frozen)
  { id: 'cat_f1', title: 'Пельмени Сибирские / Традиционные', category: 'frozen', unit: 'уп' },
  { id: 'cat_f2', title: 'Вареники с картофелем / вишней', category: 'frozen', unit: 'уп' },
  { id: 'cat_f3', title: 'Овощная смесь замороженная', category: 'frozen', unit: 'уп' },
  { id: 'cat_f4', title: 'Ягоды замороженные (клубника/вишня)', category: 'frozen', unit: 'уп' },
  { id: 'cat_f5', title: 'Пицца замороженная', category: 'frozen', unit: 'шт' },
  { id: 'cat_f6', title: 'Мороженое Пломбир', category: 'frozen', unit: 'шт' },

  // Бытовая химия (household)
  { id: 'cat_h1', title: 'Средство для мытья посуды 450 мл', category: 'household', unit: 'шт' },
  { id: 'cat_h2', title: 'Таблетки для посудомоечной машины', category: 'household', unit: 'уп' },
  { id: 'cat_h3', title: 'Гель для стирки / стиральный порошок', category: 'household', unit: 'шт' },
  { id: 'cat_h4', title: 'Кондиционер для белья', category: 'household', unit: 'шт' },
  { id: 'cat_h5', title: 'Туалетная бумага 8 рулонов', category: 'household', unit: 'уп' },
  { id: 'cat_h6', title: 'Бумажные полотенца 2 рулона', category: 'household', unit: 'уп' },
  { id: 'cat_h7', title: 'Губки для посуды 5 шт', category: 'household', unit: 'уп' },
  { id: 'cat_h8', title: 'Пакеты для мусора 30 л', category: 'household', unit: 'уп' },
  { id: 'cat_h9', title: 'Чистящее средство для сантехники', category: 'household', unit: 'шт' },

  // Гигиена и красота (beauty)
  { id: 'cat_bt1', title: 'Мыло жидкое с дозатором 500 мл', category: 'beauty', unit: 'шт' },
  { id: 'cat_bt2', title: 'Зубная паста 100 мл', category: 'beauty', unit: 'шт' },
  { id: 'cat_bt3', title: 'Зубная щетка', category: 'beauty', unit: 'шт' },
  { id: 'cat_bt4', title: 'Шампунь для волос', category: 'beauty', unit: 'шт' },
  { id: 'cat_bt5', title: 'Гель для душа', category: 'beauty', unit: 'шт' },
  { id: 'cat_bt6', title: 'Ватные диски / палочки', category: 'beauty', unit: 'уп' },
  { id: 'cat_bt7', title: 'Влажные салфетки', category: 'beauty', unit: 'уп' },

  // Товары для животных (pets)
  { id: 'cat_pt1', title: 'Корм влажный для кошек (пауч)', category: 'pets', unit: 'шт' },
  { id: 'cat_pt2', title: 'Корм сухой для кошек 1.5 кг', category: 'pets', unit: 'уп' },
  { id: 'cat_pt3', title: 'Корм сухой для собак', category: 'pets', unit: 'уп' },
  { id: 'cat_pt4', title: 'Наполнитель для кошачьего туалета', category: 'pets', unit: 'уп' },
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
    Landmark, SmartphoneCharging, Armchair, Watch, Sun, Umbrella, Wine, GlassWater, CreditCard,
    ShoppingCart, Train, Ship, Map, Flag, Star, Bell, Mail, Camera, Video, Mic, Speaker,
    Laptop, Printer, HardDrive, Cloud, Droplets, Flame, Key, Lock, Anchor, CheckCircle2,
    AlertTriangle, HelpCircle, Palette, Settings2, Beer, Cigarette, Clapperboard, Ghost, Crown, Gem
  };
  const IconComponent = icons[iconName] || ShoppingBag;
  return <IconComponent size={size} />;
};
