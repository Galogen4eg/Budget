
import React from 'react';
import { 
  Utensils, Car, Home, ShoppingBag, 
  Heart, Zap, Plane, Briefcase, 
  PiggyBank, Coffee, Tv, MoreHorizontal,
  ArrowRightLeft, Fuel, Bus, ShoppingBasket,
  Shirt, Music, Gamepad2, Baby, Dog, Cat, 
  Flower2, Hammer, Wrench, BookOpen, GraduationCap, 
  Palmtree, Gift, Smartphone, Wifi, Scissors, 
  Bath, Bed, Sofa, Bike, Drumstick
} from 'lucide-react';
import { Category, FamilyMember } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'food', label: 'Продукты', icon: 'ShoppingBasket', color: '#34C759' }, // Зеленый для свежести
  { id: 'restaurants', label: 'Кафе и еда', icon: 'Utensils', color: '#FF9500' }, // Оранжевый для аппетита
  { id: 'auto', label: 'Авто', icon: 'Car', color: '#FF3B30' }, // Красный (важное/дорогое)
  { id: 'transport', label: 'Транспорт', icon: 'Bus', color: '#007AFF' }, // Синий (общественный)
  { id: 'housing', label: 'Жилье', icon: 'Home', color: '#AF52DE' },
  { id: 'shopping', label: 'Покупки', icon: 'ShoppingBag', color: '#FF2D55' },
  { id: 'health', label: 'Здоровье', icon: 'Heart', color: '#FF3B30' },
  { id: 'utilities', label: 'Коммунальные', icon: 'Zap', color: '#FFCC00' },
  { id: 'transfer', label: 'Переводы', icon: 'ArrowRightLeft', color: '#8E8E93' },
  { id: 'travel', label: 'Путешествия', icon: 'Plane', color: '#5856D6' },
  { id: 'work', label: 'Работа', icon: 'Briefcase', color: '#34C759' },
  { id: 'savings', label: 'Накопления', icon: 'PiggyBank', color: '#5AC8FA' },
  { id: 'leisure', label: 'Отдых', icon: 'Coffee', color: '#8E8E93' },
  { id: 'entertainment', label: 'Развлечения', icon: 'Tv', color: '#4CD964' },
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
    // New Icons
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
