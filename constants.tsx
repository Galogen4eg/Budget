
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
  Wine, GlassWater
} from 'lucide-react';
import { Category, FamilyMember, PantryItem, Transaction, ShoppingItem, FamilyEvent, SavingsGoal, Debt, Project, LoyaltyCard } from './types';

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

export const FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'papa', name: 'Папа', avatar: 'https://picsum.photos/seed/papa/200', color: '#007AFF' },
  { id: 'mama', name: 'Мама', avatar: 'https://picsum.photos/seed/mama/200', color: '#FF2D55' },
  { id: 'junior', name: 'Дети', avatar: 'https://picsum.photos/seed/junior/200', color: '#34C759' },
];

// Generate dates for demo data
const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const threeDaysAgo = new Date(today); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

export const DEMO_TRANSACTIONS: Transaction[] = [
    { id: 'd1', amount: 85000, type: 'income', category: 'transfer', memberId: 'papa', note: 'Зарплата', date: new Date(today.getFullYear(), today.getMonth(), 10).toISOString() },
    { id: 'd2', amount: 3500, type: 'expense', category: 'food', memberId: 'mama', note: 'Пятерочка', date: today.toISOString() },
    { id: 'd3', amount: 450, type: 'expense', category: 'taxi', memberId: 'papa', note: 'Yandex Go', date: today.toISOString() },
    { id: 'd4', amount: 1200, type: 'expense', category: 'restaurants', memberId: 'junior', note: 'Вкусно и точка', date: yesterday.toISOString() },
    { id: 'd5', amount: 5000, type: 'expense', category: 'fuel', memberId: 'papa', note: 'Лукойл АЗС', date: yesterday.toISOString() },
    { id: 'd6', amount: 2300, type: 'expense', category: 'pharmacy', memberId: 'mama', note: 'Аптека Вита', date: twoDaysAgo.toISOString() },
    { id: 'd7', amount: 890, type: 'expense', category: 'subscriptions', memberId: 'papa', note: 'Яндекс Плюс', date: twoDaysAgo.toISOString() },
    { id: 'd8', amount: 15000, type: 'expense', category: 'housing', memberId: 'papa', note: 'Ипотека', date: new Date(today.getFullYear(), today.getMonth(), 15).toISOString() },
    { id: 'd9', amount: 650, type: 'expense', category: 'coffee', memberId: 'mama', note: 'Кофе с собой', date: threeDaysAgo.toISOString() },
    { id: 'd10', amount: 3200, type: 'expense', category: 'shopping', memberId: 'mama', note: 'Wildberries', date: threeDaysAgo.toISOString() },
];

export const DEMO_SHOPPING_ITEMS: ShoppingItem[] = [
    { id: 's1', title: 'Молоко', amount: '2', unit: 'л', category: 'dairy', completed: false, memberId: 'mama', priority: 'high' },
    { id: 's2', title: 'Хлеб', amount: '1', unit: 'шт', category: 'bakery', completed: false, memberId: 'papa', priority: 'medium' },
    { id: 's3', title: 'Яйца', amount: '10', unit: 'шт', category: 'dairy', completed: true, memberId: 'mama', priority: 'high' },
    { id: 's4', title: 'Сыр', amount: '0.3', unit: 'кг', category: 'dairy', completed: false, memberId: 'mama', priority: 'medium' },
];

export const DEMO_EVENTS: FamilyEvent[] = [
    { id: 'e1', title: 'Семейный ужин', description: 'Заказать пиццу', date: today.toISOString().split('T')[0], time: '19:00', duration: 2, memberIds: ['papa', 'mama', 'junior'], checklist: [] },
    { id: 'e2', title: 'Оплата интернета', description: 'До 20 числа', date: tomorrow.toISOString().split('T')[0], time: '10:00', duration: 0.5, memberIds: ['papa'], checklist: [] },
];

export const DEMO_GOALS: SavingsGoal[] = [
    { id: 'g1', title: 'Отпуск', targetAmount: 150000, currentAmount: 45000, icon: 'Plane', color: '#007AFF' },
    { id: 'g2', title: 'Новый ноутбук', targetAmount: 80000, currentAmount: 20000, icon: 'Monitor', color: '#AF52DE' },
];

export const DEMO_DEBTS: Debt[] = [
    { id: 'db1', name: 'Ипотека', totalAmount: 3500000, currentBalance: 2800000, color: '#FF3B30' },
];

export const DEMO_PROJECTS: Project[] = [
    { id: 'p1', title: 'Ремонт кухни', totalBudget: 500000, currency: '₽', status: 'active', startDate: today.toISOString(), color: '#FF9500', icon: 'Hammer', expenses: [] },
];

export const DEMO_LOYALTY_CARDS: LoyaltyCard[] = [
    { id: 'l1', name: 'Пятерочка', number: '7789000123456789', color: '#2FAC66', icon: 'ShoppingBag', barcodeFormat: 'ean13' },
    { id: 'l2', name: 'Спортмастер', number: '12345678', color: '#007AFF', icon: 'Dumbbell', barcodeFormat: 'code128' },
    { id: 'l3', name: 'Лента', number: '9876543210123', color: '#003399', icon: 'ShoppingBag', barcodeFormat: 'ean13' },
    { id: 'l4', name: 'Красное & Белое', number: '2200112233', color: '#DA291C', icon: 'Wine', barcodeFormat: 'qr' },
    { id: 'l5', name: 'Аэрофлот', number: 'SU 123 456 789', color: '#003366', icon: 'Plane', barcodeFormat: 'code128' },
];

export const getIconById = (id: string, size = 20) => {
  switch (id) {
    case 'Utensils': return <Utensils size={size} />;
    case 'ShoppingBasket': return <ShoppingBasket size={size} />;
    case 'Car': return <Car size={size} />;
    case 'Bus': return <Bus size={size} />;
    case 'Fuel': return <Fuel size={size} />;
    case 'Home': return <Home size={size} />;
    case 'ShoppingBag': return <ShoppingBag size={size} />;
    case 'Heart': return <Heart size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Plane': return <Plane size={size} />;
    case 'Briefcase': return <Briefcase size={size} />;
    case 'PiggyBank': return <PiggyBank size={size} />;
    case 'Coffee': return <Coffee size={size} />;
    case 'Tv': return <Tv size={size} />;
    case 'ArrowRightLeft': return <ArrowRightLeft size={size} />;
    case 'Shirt': return <Shirt size={size} />;
    case 'Music': return <Music size={size} />;
    case 'Gamepad2': return <Gamepad2 size={size} />;
    case 'Baby': return <Baby size={size} />;
    case 'Dog': return <Dog size={size} />;
    case 'Cat': return <Cat size={size} />;
    case 'Flower2': return <Flower2 size={size} />;
    case 'Hammer': return <Hammer size={size} />;
    case 'Wrench': return <Wrench size={size} />;
    case 'BookOpen': return <BookOpen size={size} />;
    case 'GraduationCap': return <GraduationCap size={size} />;
    case 'Palmtree': return <Palmtree size={size} />;
    case 'Gift': return <Gift size={size} />;
    case 'Smartphone': return <Smartphone size={size} />;
    case 'Wifi': return <Wifi size={size} />;
    case 'Scissors': return <Scissors size={size} />;
    case 'Bath': return <Bath size={size} />;
    case 'Bed': return <Bed size={size} />;
    case 'Sofa': return <Sofa size={size} />;
    case 'Bike': return <Bike size={size} />;
    case 'Drumstick': return <Drumstick size={size} />;
    case 'Sparkles': return <Sparkles size={size} />;
    case 'Pill': return <Pill size={size} />;
    case 'Stethoscope': return <Stethoscope size={size} />;
    case 'Dumbbell': return <Dumbbell size={size} />;
    case 'Ticket': return <Ticket size={size} />;
    case 'Monitor': return <Monitor size={size} />;
    case 'Footprints': return <Footprints size={size} />;
    case 'Smile': return <Smile size={size} />;
    case 'HeartHandshake': return <HeartHandshake size={size} />;
    case 'FileText': return <FileText size={size} />;
    case 'ShieldCheck': return <ShieldCheck size={size} />;
    case 'Landmark': return <Landmark size={size} />;
    case 'SmartphoneCharging': return <SmartphoneCharging size={size} />;
    case 'Armchair': return <Armchair size={size} />;
    case 'Watch': return <Watch size={size} />;
    case 'Sun': return <Sun size={size} />;
    case 'Umbrella': return <Umbrella size={size} />;
    case 'Wine': return <Wine size={size} />;
    case 'GlassWater': return <GlassWater size={size} />;
    default: return <MoreHorizontal size={size} />;
  }
};

export const MemberMarker = ({ member, size = 'md' }: { member: FamilyMember, size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-xl'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-[1.2rem] flex items-center justify-center text-white shadow-sm border-2 border-white relative overflow-hidden flex-shrink-0 transition-transform`} style={{ backgroundColor: member.color }}>
      {member.avatar ? (
        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-black uppercase">{member.name.charAt(0)}</span>
      )}
    </div>
  );
};

export const BASIC_FRIDGE_ITEMS: Omit<PantryItem, 'id' | 'addedDate'>[] = [
    { title: 'Молоко', amount: '1', unit: 'л', category: 'dairy' },
    { title: 'Яйца', amount: '10', unit: 'шт', category: 'dairy' },
    { title: 'Хлеб', amount: '1', unit: 'шт', category: 'bakery' },
    { title: 'Масло сливочное', amount: '1', unit: 'уп', category: 'dairy' },
    { title: 'Сыр', amount: '1', unit: 'уп', category: 'dairy' },
    { title: 'Куриное филе', amount: '1', unit: 'кг', category: 'meat' },
    { title: 'Картофель', amount: '2', unit: 'кг', category: 'produce' },
    { title: 'Макароны', amount: '1', unit: 'уп', category: 'grocery' },
    { title: 'Рис', amount: '1', unit: 'уп', category: 'grocery' },
    { title: 'Чай', amount: '1', unit: 'уп', category: 'drinks' },
    { title: 'Кофе', amount: '1', unit: 'уп', category: 'drinks' },
    { title: 'Сахар', amount: '1', unit: 'кг', category: 'grocery' },
];
