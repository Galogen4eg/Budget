
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
  { id: 'food', label: 'Продукты', icon: 'ShoppingBasket', color: '#34C759' },
  { id: 'restaurants', label: 'Кафе и еда', icon: 'Utensils', color: '#FF9500' },
  { id: 'alcohol', label: 'Алкоголь', icon: 'Wine', color: '#AF52DE' },
  { id: 'coffee', label: 'Кофе', icon: 'Coffee', color: '#A2845E' },
  { id: 'auto', label: 'Авто', icon: 'Car', color: '#FF3B30' },
  { id: 'fuel', label: 'Бензин', icon: 'Fuel', color: '#FF3B30' },
  { id: 'car_service', label: 'Обслуживание', icon: 'Wrench', color: '#8E8E93' },
  { id: 'transport', label: 'Транспорт', icon: 'Bus', color: '#007AFF' },
  { id: 'taxi', label: 'Такси', icon: 'Car', color: '#FFCC00' },
  { id: 'housing', label: 'Аренда/Ипотека', icon: 'Home', color: '#AF52DE' },
  { id: 'utilities', label: 'ЖКХ', icon: 'Home', color: '#FF9500' },
  { id: 'internet', label: 'Связь', icon: 'Wifi', color: '#007AFF' },
  { id: 'taxes', label: 'Налоги', icon: 'Landmark', color: '#5856D6' },
  { id: 'shopping', label: 'Шоппинг', icon: 'ShoppingBag', color: '#FF2D55' },
  { id: 'clothes', label: 'Одежда', icon: 'Shirt', color: '#5856D6' },
  { id: 'shoes', label: 'Обувь', icon: 'Footprints', color: '#FF9500' },
  { id: 'electronics', label: 'Электроника', icon: 'Smartphone', color: '#34C759' },
  { id: 'beauty', label: 'Красота', icon: 'Scissors', color: '#FF2D55' },
  { id: 'furniture', label: 'Мебель', icon: 'Armchair', color: '#A2845E' },
  { id: 'health', label: 'Здоровье', icon: 'Heart', color: '#FF3B30' },
  { id: 'pharmacy', label: 'Аптека', icon: 'Pill', color: '#34C759' },
  { id: 'sport', label: 'Спорт', icon: 'Dumbbell', color: '#007AFF' },
  { id: 'entertainment', label: 'Досуг', icon: 'Ticket', color: '#5856D6' },
  { id: 'subscriptions', label: 'Подписки', icon: 'Zap', color: '#5AC8FA' },
  { id: 'travel', label: 'Путешествия', icon: 'Plane', color: '#007AFF' },
  { id: 'hobbies', label: 'Хобби', icon: 'Palmtree', color: '#FFCC00' },
  { id: 'education', label: 'Обучение', icon: 'GraduationCap', color: '#5856D6' },
  { id: 'books', label: 'Книги', icon: 'BookOpen', color: '#A2845E' },
  { id: 'kids', label: 'Дети', icon: 'Baby', color: '#FFCC00' },
  { id: 'pets', label: 'Питомцы', icon: 'Dog', color: '#FF9500' },
  { id: 'gifts', label: 'Подарки', icon: 'Gift', color: '#FF2D55' },
  { id: 'charity', label: 'Благотв.', icon: 'HeartHandshake', color: '#FF3B30' },
  { id: 'services', label: 'Услуги', icon: 'Briefcase', color: '#8E8E93' },
  { id: 'transfer', label: 'Переводы', icon: 'ArrowRightLeft', color: '#8E8E93' },
  { id: 'other', label: 'Прочее', icon: 'MoreHorizontal', color: '#C7C7CC' },
  { id: 'salary', label: 'Зарплата', icon: 'Briefcase', color: '#34C759' },
];

export const DEFAULT_RULES: LearnedRule[] = [
  { id: 'def_1', keyword: 'пятерочка', cleanName: 'Пятерочка', categoryId: 'food' },
  { id: 'def_2', keyword: 'перекресток', cleanName: 'Перекресток', categoryId: 'food' },
  { id: 'def_3', keyword: 'магнит', cleanName: 'Магнит', categoryId: 'food' },
  { id: 'def_4', keyword: 'вкусно и точка', cleanName: 'Вкусно и Точка', categoryId: 'restaurants' },
  { id: 'def_5', keyword: 'яндекс такси', cleanName: 'Яндекс Такси', categoryId: 'taxi' },
];

export const BASIC_FRIDGE_ITEMS = [
  { title: 'Молоко', amount: '1', unit: 'л', category: 'dairy' },
  { title: 'Яйца', amount: '10', unit: 'шт', category: 'dairy' },
  { title: 'Хлеб', amount: '1', unit: 'шт', category: 'bakery' },
];

export const DEMO_TRANSACTIONS: Transaction[] = [
  // Existing recent expenses for context
  { id: 't_exp_1', amount: 1500, type: 'expense', category: 'food', memberId: 'm1', note: 'Пятерочка', date: new Date(Date.now() - 86400000).toISOString() },
  { id: 't_exp_2', amount: 300, type: 'expense', category: 'transport', memberId: 'm2', note: 'Метро', date: new Date(Date.now() - 172800000).toISOString() },

  // 2023 (Base ~120k)
  { id: 'sal_23_01', date: "2023-01-10T10:00:00.000Z", amount: 118450, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_02', date: "2023-02-08T10:00:00.000Z", amount: 121230, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_03', date: "2023-03-06T10:00:00.000Z", amount: 168900, note: "Зарплата + премия", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_04', date: "2023-04-07T10:00:00.000Z", amount: 119800, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_05', date: "2023-05-05T10:00:00.000Z", amount: 122150, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_06', date: "2023-06-09T10:00:00.000Z", amount: 120400, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_07', date: "2023-07-10T10:00:00.000Z", amount: 117900, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_08', date: "2023-08-08T10:00:00.000Z", amount: 123500, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_09', date: "2023-09-07T10:00:00.000Z", amount: 120100, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_10', date: "2023-10-06T10:00:00.000Z", amount: 121800, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_11', date: "2023-11-09T10:00:00.000Z", amount: 119250, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_23_12', date: "2023-12-08T10:00:00.000Z", amount: 198500, note: "Зарплата + премия", type: 'income', category: 'salary', memberId: 'm1' },

  // 2024 (Indexed +12%, Base ~134.4k)
  { id: 'sal_24_01', date: "2024-01-10T10:00:00.000Z", amount: 132500, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_02', date: "2024-02-07T10:00:00.000Z", amount: 135800, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_03', date: "2024-03-06T10:00:00.000Z", amount: 184200, note: "Зарплата + премия", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_04', date: "2024-04-05T10:00:00.000Z", amount: 133900, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_05', date: "2024-05-08T10:00:00.000Z", amount: 136200, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_06', date: "2024-06-07T10:00:00.000Z", amount: 134500, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_07', date: "2024-07-05T10:00:00.000Z", amount: 131800, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_08', date: "2024-08-09T10:00:00.000Z", amount: 138100, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_09', date: "2024-09-06T10:00:00.000Z", amount: 133400, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_10', date: "2024-10-08T10:00:00.000Z", amount: 135600, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_11', date: "2024-11-07T10:00:00.000Z", amount: 132950, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_24_12', date: "2024-12-06T10:00:00.000Z", amount: 215400, note: "Зарплата + премия", type: 'income', category: 'salary', memberId: 'm1' },

  // 2025 (Indexed +10%, Base ~147.8k)
  { id: 'sal_25_01', date: "2025-01-10T10:00:00.000Z", amount: 145200, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_02', date: "2025-02-07T10:00:00.000Z", amount: 149500, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_03', date: "2025-03-06T10:00:00.000Z", amount: 182800, note: "Зарплата + премия", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_04', date: "2025-04-08T10:00:00.000Z", amount: 147100, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_05', date: "2025-05-07T10:00:00.000Z", amount: 150300, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_06', date: "2025-06-06T10:00:00.000Z", amount: 146800, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_07', date: "2025-07-09T10:00:00.000Z", amount: 144500, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_08', date: "2025-08-08T10:00:00.000Z", amount: 151200, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_09', date: "2025-09-05T10:00:00.000Z", amount: 148600, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_10', date: "2025-10-07T10:00:00.000Z", amount: 149900, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_11', date: "2025-11-06T10:00:00.000Z", amount: 146400, note: "Зарплата", type: 'income', category: 'salary', memberId: 'm1' },
  { id: 'sal_25_12', date: "2025-12-09T10:00:00.000Z", amount: 212800, note: "Зарплата + премия", type: 'income', category: 'salary', memberId: 'm1' }
];

export const DEMO_MANDATORY_EXPENSES: MandatoryExpense[] = [
  { id: 'me1', name: 'Ипотека', amount: 45000, day: 15, remind: true, keywords: ['ипотека', 'domclick'] },
  { id: 'me2', name: 'Интернет', amount: 900, day: 1, remind: false, keywords: ['ростелеком', 'дом.ру', 'провайдер'] },
];

export const DEMO_SHOPPING_ITEMS: ShoppingItem[] = [
  { id: 's1', title: 'Молоко', amount: '1', unit: 'л', completed: false, memberId: 'm1', priority: 'high', category: 'dairy' },
  { id: 's2', title: 'Хлеб', amount: '1', unit: 'шт', completed: false, memberId: 'm1', priority: 'medium', category: 'bakery' },
];

export const DEMO_EVENTS: FamilyEvent[] = [
  { id: 'e1', title: 'Семейный ужин', description: 'В ресторане', date: new Date().toISOString().split('T')[0], time: '19:00', duration: 2, memberIds: ['m1', 'm2'] },
];

export const DEMO_GOALS: SavingsGoal[] = [
  { id: 'g1', title: 'Отпуск', targetAmount: 200000, currentAmount: 45000, icon: 'Plane', color: '#007AFF' },
  { id: 'g2', title: 'Новая машина', targetAmount: 2500000, currentAmount: 900000, icon: 'Car', color: '#FF3B30' },
];

export const FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'm1', name: 'Папа', color: '#007AFF', isAdmin: true, userId: 'demo-user-1' },
  { id: 'm2', name: 'Мама', color: '#FF2D55', isAdmin: true, userId: 'demo-user-2' },
];

export const DEMO_DEBTS: Debt[] = [
  { id: 'd1', name: 'Ипотека', totalAmount: 7000000, currentBalance: 6200000, color: '#FF3B30', strategy: 'fixed', monthlyPayment: 45000, paymentDay: 15 },
];

export const DEMO_PROJECTS: Project[] = [
  { id: 'p1', title: 'Ремонт кухни', totalBudget: 500000, currency: '₽', status: 'active', startDate: new Date().toISOString(), color: '#34C759', icon: 'Hammer', expenses: [] }
];

export const DEMO_LOYALTY_CARDS: LoyaltyCard[] = [
  { id: 'lc1', name: 'Пятерочка', number: '778900012345', color: '#2FAC66', icon: 'ShoppingBag', barcodeFormat: 'code128' },
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
