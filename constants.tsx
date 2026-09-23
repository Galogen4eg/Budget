
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
import { Category, FamilyMember, PantryItem, Transaction, ShoppingItem, FamilyEvent, SavingsGoal, Debt, Project, LoyaltyCard, LearnedRule, MandatoryExpense } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  // Food & Dining (Main & Subcategories)
  { id: 'food', label: 'Продукты', icon: 'ShoppingBasket', color: '#4A7C59' },
  { id: 'restaurants', label: 'Кафе и Рестораны', icon: 'Utensils', color: '#E07A5F' },
  { id: 'bars', label: 'Бары и Пабы', icon: 'Beer', color: '#9A5A88' },
  { id: 'alcohol', label: 'Алкоголь', icon: 'Wine', color: '#9A5A88' },
  { id: 'coffee', label: 'Кофе', icon: 'Coffee', color: '#A2845E' },
  
  // Сетевые продуктовые магазины (Подкатегории "Продукты")
  { id: 'grocery_pyaterochka', label: 'Пятерочка', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_magnit', label: 'Магнит', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_perekrestok', label: 'Перекресток', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_vkusvill', label: 'ВкусВилл', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_lenta', label: 'Лента', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_ashan', label: 'Ашан', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_samokat', label: 'Самокат', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_globus', label: 'Глобус', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_chizhik', label: 'Чижик', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_dixy', label: 'Дикси', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_spar', label: 'Спар', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_svetoform', label: 'Светофор', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },
  { id: 'grocery_vysshaya_liga', label: 'Высшая Лига', icon: 'ShoppingBasket', color: '#4A7C59', parentId: 'food' },

  // Сети фастфуда и общепита (Подкатегории "Кафе и Рестораны")
  { id: 'fastfood_vnoit', label: 'Вкусно и точка', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'fastfood_bk', label: 'Бургер Кинг', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'fastfood_rostics', label: 'Ростикс / KFC', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'fastfood_dodo', label: 'Додо Пицца', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'fastfood_pizzafabrika', label: 'ПиццаФабрика', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'fastfood_teremok', label: 'Теремок', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'fastfood_kroshka', label: 'Крошка Картошка', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'fastfood_shokoladnitsa', label: 'Шоколадница', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'fastfood_cofix', label: 'Cofix', icon: 'Coffee', color: '#A2845E', parentId: 'restaurants' },
  
  // Yaroslavl Bars (Subcategories)
  { id: 'bar_papin_garage', label: 'Папин Гараж', icon: 'Beer', color: '#9A5A88', parentId: 'bars' },
  { id: 'bar_dudki', label: 'ДудкиБар', icon: 'Beer', color: '#9A5A88', parentId: 'bars' },
  { id: 'bar_jao_da', label: 'Китайский летчик Джао Да', icon: 'Beer', color: '#9A5A88', parentId: 'bars' },
  { id: 'bar_brugge', label: 'Брюгге', icon: 'Beer', color: '#9A5A88', parentId: 'bars' },
  { id: 'bar_pinta', label: 'Пинта', icon: 'Beer', color: '#9A5A88', parentId: 'bars' },
  { id: 'bar_krapiva', label: 'Крапива', icon: 'Beer', color: '#9A5A88', parentId: 'bars' },
  { id: 'bar_hophead', label: 'HopHead', icon: 'Beer', color: '#9A5A88', parentId: 'bars' },
  { id: 'bar_ryumka', label: 'Рюмка', icon: 'Beer', color: '#9A5A88', parentId: 'bars' },
  { id: 'bar_hmel_solod', label: 'Хмель & Солод', icon: 'Beer', color: '#9A5A88', parentId: 'bars' },
  { id: 'bar_afonya', label: 'Афоня', icon: 'Beer', color: '#9A5A88', parentId: 'bars' },

  // Yaroslavl Restaurants (Subcategories)
  { id: 'rest_mamuka', label: 'Мамука', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'rest_penaty', label: 'Пенаты', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'rest_roga_kopita', label: 'Рога и Копыта', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'rest_bulvar', label: 'Бульвар', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'rest_skazka', label: 'Сказка', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'rest_ioann', label: 'Иоанн Васильевич', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'rest_svoi', label: 'Свои да Наши', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'rest_utro', label: 'Утро', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },
  { id: 'rest_to_dze', label: 'То Дзе', icon: 'Utensils', color: '#E07A5F', parentId: 'restaurants' },

  // Transport
  { id: 'auto', label: 'Авто', icon: 'Car', color: '#457B9D' },
  { id: 'fuel', label: 'Бензин', icon: 'Fuel', color: '#E76F51' },
  { id: 'car_service', label: 'Обслуживание', icon: 'Wrench', color: '#6B705C' },
  { id: 'transport', label: 'Транспорт', icon: 'Bus', color: '#457B9D' },
  { id: 'taxi', label: 'Такси', icon: 'Car', color: '#E76F51' },

  // Housing & Bills
  { id: 'housing', label: 'Аренда/Ипотека', icon: 'Home', color: '#2A9D8F' },
  { id: 'utilities', label: 'ЖКХ', icon: 'Home', color: '#2A9D8F' },
  { id: 'internet', label: 'Связь', icon: 'Wifi', color: '#457B9D' },
  { id: 'taxes', label: 'Налоги', icon: 'Landmark', color: '#3D405B' },

  // Shopping
  { id: 'shopping', label: 'Шоппинг', icon: 'ShoppingBag', color: '#D4A373' },
  { id: 'clothes', label: 'Одежда', icon: 'Shirt', color: '#D4A373' },
  { id: 'shoes', label: 'Обувь', icon: 'Footprints', color: '#D4A373' },
  { id: 'electronics', label: 'Электроника', icon: 'Smartphone', color: '#4A7C59' },
  { id: 'beauty', label: 'Красота', icon: 'Scissors', color: '#E07A5F' },
  { id: 'furniture', label: 'Мебель', icon: 'Armchair', color: '#A2845E' },

  // Health
  { id: 'health', label: 'Здоровье', icon: 'Heart', color: '#E63946' },
  { id: 'pharmacy', label: 'Аптека', icon: 'Pill', color: '#4A7C59' },
  { id: 'sport', label: 'Спорт', icon: 'Dumbbell', color: '#2A9D8F' },

  // Personal & Leisure
  { id: 'entertainment', label: 'Досуг', icon: 'Ticket', color: '#52796F' },
  { id: 'subscriptions', label: 'Подписки', icon: 'Zap', color: '#457B9D' },
  { id: 'travel', label: 'Путешествия', icon: 'Plane', color: '#2A9D8F' },
  { id: 'hobbies', label: 'Хобби', icon: 'Palmtree', color: '#F4A261' },
  { id: 'education', label: 'Обучение', icon: 'GraduationCap', color: '#52796F' },
  { id: 'books', label: 'Книги', icon: 'BookOpen', color: '#A2845E' },

  // Family
  { id: 'kids', label: 'Дети', icon: 'Baby', color: '#F4A261' },
  { id: 'pets', label: 'Питомцы', icon: 'Dog', color: '#E07A5F' },
  
  // Other
  { id: 'gifts', label: 'Подарки', icon: 'Gift', color: '#E07A5F' },
  { id: 'charity', label: 'Благотв.', icon: 'HeartHandshake', color: '#E63946' },
  { id: 'services', label: 'Услуги', icon: 'Briefcase', color: '#6B705C' },
  { id: 'transfer', label: 'Переводы', icon: 'ArrowRightLeft', color: '#6B705C' },
  { id: 'other', label: 'Прочее', icon: 'MoreHorizontal', color: '#8D99AE' },
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

  // Supermarkets & Grocery Chains (Subcategories)
  { id: 'def_1', keyword: 'пятерочка', cleanName: 'Пятерочка', categoryId: 'grocery_pyaterochka' },
  { id: 'def_2', keyword: 'pyaterochka', cleanName: 'Пятерочка', categoryId: 'grocery_pyaterochka' },
  { id: 'def_3', keyword: 'перекресток', cleanName: 'Перекресток', categoryId: 'grocery_perekrestok' },
  { id: 'def_4', keyword: 'perekrestok', cleanName: 'Перекресток', categoryId: 'grocery_perekrestok' },
  { id: 'def_5', keyword: 'магнит', cleanName: 'Магнит', categoryId: 'grocery_magnit' },
  { id: 'def_6', keyword: 'magnit', cleanName: 'Магнит', categoryId: 'grocery_magnit' },
  { id: 'def_7', keyword: 'лента', cleanName: 'Лента', categoryId: 'grocery_lenta' },
  { id: 'def_8', keyword: 'lenta', cleanName: 'Лента', categoryId: 'grocery_lenta' },
  { id: 'def_9', keyword: 'ашан', cleanName: 'Ашан', categoryId: 'grocery_ashan' },
  { id: 'def_10', keyword: 'auchan', cleanName: 'Ашан', categoryId: 'grocery_ashan' },
  { id: 'def_11', keyword: 'вкусвилл', cleanName: 'ВкусВилл', categoryId: 'grocery_vkusvill' },
  { id: 'def_12', keyword: 'vkusvill', cleanName: 'ВкусВилл', categoryId: 'grocery_vkusvill' },
  { id: 'def_13', keyword: 'самокат', cleanName: 'Самокат', categoryId: 'grocery_samokat' },
  { id: 'def_14', keyword: 'samokat', cleanName: 'Самокат', categoryId: 'grocery_samokat' },
  { id: 'def_15', keyword: 'дикси', cleanName: 'Дикси', categoryId: 'grocery_dixy' },
  { id: 'def_16', keyword: 'dixy', cleanName: 'Дикси', categoryId: 'grocery_dixy' },
  { id: 'def_17', keyword: 'глобус', cleanName: 'Глобус', categoryId: 'grocery_globus' },
  { id: 'def_18', keyword: 'globus', cleanName: 'Глобус', categoryId: 'grocery_globus' },
  { id: 'def_19', keyword: 'чижик', cleanName: 'Чижик', categoryId: 'grocery_chizhik' },
  { id: 'def_20', keyword: 'светофор', cleanName: 'Светофор', categoryId: 'grocery_svetoform' },
  { id: 'def_21', keyword: 'высшая лига', cleanName: 'Высшая Лига', categoryId: 'grocery_vysshaya_liga' },
  { id: 'def_24', keyword: 'спар', cleanName: 'Спар', categoryId: 'grocery_spar' },
  { id: 'def_25', keyword: 'spar', cleanName: 'Спар', categoryId: 'grocery_spar' },
  { id: 'def_26', keyword: 'красное&белое', cleanName: 'Красное & Белое', categoryId: 'alcohol' },
  { id: 'def_27', keyword: 'к&б', cleanName: 'Красное & Белое', categoryId: 'alcohol' },
  { id: 'def_28', keyword: 'krasnoe', cleanName: 'Красное & Белое', categoryId: 'alcohol' },
  { id: 'def_29', keyword: 'бристоль', cleanName: 'Бристоль', categoryId: 'alcohol' },
  { id: 'def_30', keyword: 'bristol', cleanName: 'Бристоль', categoryId: 'alcohol' },

  // Fast Food & Chain Restaurants (Subcategories)
  { id: 'def_31', keyword: 'вкусно и точка', cleanName: 'Вкусно и Точка', categoryId: 'fastfood_vnoit' },
  { id: 'def_32', keyword: 'vnoit', cleanName: 'Вкусно и Точка', categoryId: 'fastfood_vnoit' },
  { id: 'def_33', keyword: 'mcdonalds', cleanName: 'Вкусно и Точка', categoryId: 'fastfood_vnoit' },
  { id: 'def_34', keyword: 'бургер кинг', cleanName: 'Бургер Кинг', categoryId: 'fastfood_bk' },
  { id: 'def_35', keyword: 'burger king', cleanName: 'Бургер Кинг', categoryId: 'fastfood_bk' },
  { id: 'def_36', keyword: 'kfc', cleanName: 'Ростикс / KFC', categoryId: 'fastfood_rostics' },
  { id: 'def_37', keyword: 'rostics', cleanName: 'Ростикс / KFC', categoryId: 'fastfood_rostics' },
  { id: 'def_38', keyword: 'додо', cleanName: 'Додо Пицца', categoryId: 'fastfood_dodo' },
  { id: 'def_39', keyword: 'dodo', cleanName: 'Додо Пицца', categoryId: 'fastfood_dodo' },
  { id: 'def_40', keyword: 'теремок', cleanName: 'Теремок', categoryId: 'fastfood_teremok' },
  { id: 'def_41', keyword: 'teremok', cleanName: 'Теремок', categoryId: 'fastfood_teremok' },
  { id: 'def_42', keyword: 'шоколадница', cleanName: 'Шоколадница', categoryId: 'fastfood_shokoladnitsa' },
  { id: 'def_43', keyword: 'pizzafabrika', cleanName: 'ПиццаФабрика', categoryId: 'fastfood_pizzafabrika' },
  { id: 'def_44', keyword: 'пиццафабрика', cleanName: 'ПиццаФабрика', categoryId: 'fastfood_pizzafabrika' },
  { id: 'def_45', keyword: 'крошка картошка', cleanName: 'Крошка Картошка', categoryId: 'fastfood_kroshka' },
  { id: 'def_49', keyword: 'cofix', cleanName: 'Cofix', categoryId: 'fastfood_cofix' },

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
    Landmark, SmartphoneCharging, Armchair, Watch, Sun, Umbrella, Wine, GlassWater, CreditCard,
    ShoppingCart, Train, Ship, Map, Flag, Star, Bell, Mail, Camera, Video, Mic, Speaker,
    Laptop, Printer, HardDrive, Cloud, Droplets, Flame, Key, Lock, Anchor, CheckCircle2,
    AlertTriangle, HelpCircle, Palette, Settings2, Beer, Cigarette, Clapperboard, Ghost, Crown, Gem
  };
  const IconComponent = icons[iconName] || ShoppingBag;
  return <IconComponent size={size} />;
};
