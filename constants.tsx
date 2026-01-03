
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
  Footprints, Smile, HeartHandshake, FileText, ShieldCheck
} from 'lucide-react';
import { Category, FamilyMember } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  // Food & Dining
  { id: 'food', label: 'Продукты', icon: 'ShoppingBasket', color: '#34C759' },
  { id: 'restaurants', label: 'Кафе и еда', icon: 'Utensils', color: '#FF9500' },
  { id: 'alcohol', label: 'Алкоголь', icon: 'GlassWater', color: '#AF52DE' }, // New

  // Transport
  { id: 'auto', label: 'Авто', icon: 'Car', color: '#FF3B30' },
  { id: 'fuel', label: 'Бензин', icon: 'Fuel', color: '#FF3B30' }, // New
  { id: 'car_service', label: 'Обслуживание авто', icon: 'Wrench', color: '#8E8E93' }, // New
  { id: 'parking', label: 'Парковка', icon: 'Car', color: '#999999' }, // New
  { id: 'transport', label: 'Общ. транспорт', icon: 'Bus', color: '#007AFF' },
  { id: 'taxi', label: 'Такси', icon: 'Car', color: '#FFCC00' }, // New

  // Housing & Utilities
  { id: 'housing', label: 'Аренда/Ипотека', icon: 'Home', color: '#AF52DE' },
  { id: 'utilities', label: 'ЖКХ', icon: 'Home', color: '#FF9500' }, // New
  { id: 'internet', label: 'Связь и Интернет', icon: 'Wifi', color: '#007AFF' }, // New
  { id: 'home_improvement', label: 'Ремонт и Дом', icon: 'Hammer', color: '#A2845E' }, // New

  // Shopping & Personal
  { id: 'shopping', label: 'Шоппинг', icon: 'ShoppingBag', color: '#FF2D55' },
  { id: 'clothes', label: 'Одежда', icon: 'Shirt', color: '#5856D6' }, // New
  { id: 'shoes', label: 'Обувь', icon: 'Footprints', color: '#AF52DE' }, // New
  { id: 'electronics', label: 'Техника', icon: 'Monitor', color: '#1C1C1E' }, // New
  { id: 'beauty', label: 'Красота', icon: 'Scissors', color: '#FF2D55' },

  // Health
  { id: 'health', label: 'Здоровье', icon: 'Heart', color: '#FF3B30' },
  { id: 'pharmacy', label: 'Аптека', icon: 'Pill', color: '#34C759' }, // New
  { id: 'doctor', label: 'Врачи', icon: 'Stethoscope', color: '#007AFF' }, // New
  { id: 'sport', label: 'Спорт', icon: 'Dumbbell', color: '#FF9500' }, // New

  // Family & Development
  { id: 'education', label: 'Образование', icon: 'GraduationCap', color: '#5856D6' },
  { id: 'books', label: 'Книги', icon: 'BookOpen', color: '#A2845E' }, // New
  { id: 'kids', label: 'Дети', icon: 'Baby', color: '#FFCC00' }, // New
  { id: 'pets', label: 'Питомцы', icon: 'Dog', color: '#FF9500' },

  // Entertainment
  { id: 'entertainment', label: 'Развлечения', icon: 'Ticket', color: '#5856D6' }, // Updated Icon
  { id: 'subscriptions', label: 'Подписки', icon: 'Zap', color: '#5AC8FA' },
  { id: 'leisure', label: 'Отдых', icon: 'Coffee', color: '#8E8E93' },
  { id: 'travel', label: 'Путешествия', icon: 'Plane', color: '#007AFF' },

  // Finance & Other
  { id: 'savings', label: 'Накопления', icon: 'PiggyBank', color: '#5AC8FA' },
  { id: 'transfer', label: 'Переводы', icon: 'ArrowRightLeft', color: '#8E8E93' },
  { id: 'taxes', label: 'Налоги', icon: 'FileText', color: '#8E8E93' }, // New
  { id: 'insurance', label: 'Страховка', icon: 'ShieldCheck', color: '#34C759' }, // New
  { id: 'charity', label: 'Благотворительность', icon: 'HeartHandshake', color: '#FF2D55' }, // New
  { id: 'gifts', label: 'Подарки', icon: 'Gift', color: '#FF2D55' },
  { id: 'work', label: 'Расходы по работе', icon: 'Briefcase', color: '#34C759' },
  { id: 'other', label: 'Прочее', icon: 'MoreHorizontal', color: '#C7C7CC' },
];

export const FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'papa', name: 'Папа', avatar: 'https://picsum.photos/seed/papa/200', color: '#007AFF' },
  { id: 'mama', name: 'Мама', avatar: 'https://picsum.photos/seed/mama/200', color: '#FF2D55' },
  { id: 'junior', name: 'Дети', avatar: 'https://picsum.photos/seed/junior/200', color: '#34C759' },
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
