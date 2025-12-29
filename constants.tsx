
import React from 'react';
import { 
  Utensils, Car, Home, ShoppingBag, 
  Heart, Zap, Plane, Briefcase, 
  PiggyBank, Coffee, Tv, MoreHorizontal 
} from 'lucide-react';
import { Category, FamilyMember } from './types';

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Еда', icon: 'Utensils', color: '#FF9500' },
  { id: 'transport', label: 'Транспорт', icon: 'Car', color: '#007AFF' },
  { id: 'housing', label: 'Жилье', icon: 'Home', color: '#AF52DE' },
  { id: 'shopping', label: 'Покупки', icon: 'ShoppingBag', color: '#FF2D55' },
  { id: 'health', label: 'Здоровье', icon: 'Heart', color: '#FF3B30' },
  { id: 'utilities', label: 'Коммунальные', icon: 'Zap', color: '#FFCC00' },
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
    case 'Car': return <Car size={size} />;
    case 'Home': return <Home size={size} />;
    case 'ShoppingBag': return <ShoppingBag size={size} />;
    case 'Heart': return <Heart size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Plane': return <Plane size={size} />;
    case 'Briefcase': return <Briefcase size={size} />;
    case 'PiggyBank': return <PiggyBank size={size} />;
    case 'Coffee': return <Coffee size={size} />;
    case 'Tv': return <Tv size={size} />;
    default: return <MoreHorizontal size={size} />;
  }
};
