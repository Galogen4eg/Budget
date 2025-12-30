
import React from 'react';
import { ShoppingBag, Utensils, Car, Home, Heart, Zap, Plane, Briefcase, PiggyBank, Coffee, Tv, MoreHorizontal } from 'lucide-react';
import { Category } from '../types';
import { getIconById } from '../constants';

interface BrandIconProps {
  brandKey?: string;
  name: string;
  category?: Category;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Map of SVG logos for popular brands
const BRAND_LOGOS: Record<string, React.ReactNode> = {
  // --- MARKETPLACES ---
  'wildberries': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M4.6 4h3.8l1.4 6.8L11.2 4h3.6l1.4 6.8 1.4-6.8h3.8L18.6 20h-4l-1.8-8-1.8 8h-4L4.6 4z" fill="white"/></svg>
  ),
  'ozon': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 9v-9h-2v5.5l-4-5.5v9h-2z" fill="white"/></svg>
  ),
  'yandex': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1.5"><path d="M11.5 2H15v20h-3.5v-8.5L7.7 20H3.5l5.8-8.2L4.2 2h3.9l3.4 6.8V2z" fill="white"/></svg>
  ),
  
  // --- GROCERIES ---
  'magnit': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M3 5h3v14H3V5zm6 0h3v14H9V5zm6 0h3l-1.5 14h-3L15 5zm4.5 0H21l-1.5 14h-3l1.5-14z" fill="white"/></svg>
  ),
  'pyaterochka': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 15a4 4 0 01-4-4h2.5a1.5 1.5 0 101.5-1.5 1.5 1.5 0 00-1.5 1.5H7a4 4 0 014-4V7h4v2.5h-4v2.1A4 4 0 0111 17z" fill="white"/></svg>
  ),
  'perekrestok': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M20 4l-8 8-8-8h16zm0 16l-8-8-8 8h16z" fill="white"/></svg>
  ),
  'lenta': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16h-4v-2h4v2zm0-4h-4V6h4v8zm5 4h-3V6h3v12z" fill="white"/></svg>
  ),
  'vkusvill': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1.5"><path d="M12 2L2 22h20L12 2zm0 4.5l6 12H6l6-12z" fill="white"/></svg>
  ),
  'samokat': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1.5"><circle cx="7" cy="17" r="3" fill="white"/><circle cx="17" cy="17" r="3" fill="white"/><path d="M8 17h8M7 17V8l10-3v12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
  ),

  // --- FAST FOOD ---
  'vnoit': ( // Vkusno i Tochka
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-2"><circle cx="6" cy="12" r="2" fill="white"/><path d="M12 18L18 6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
  ),
  'burgerking': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M4 12h16c0 4.42-3.58 8-8 8s-8-3.58-8-8zm0-2c0-3.31 2.69-6 6-6h4c3.31 0 6 2.69 6 6H4z" fill="white"/></svg>
  ),
  'kfc': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><rect x="4" y="4" width="16" height="16" rx="2" stroke="white" strokeWidth="2"/><path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2"/></svg>
  ),
  'dodo': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 14h-7v-8h7c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2z" fill="white"/></svg>
  ),

  // --- BANKS / FINANCE ---
  'sber': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/><path d="M16.5 10.5L12 13l-4.5-2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  'tinkoff': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M4 6h16M12 6v14M8 10l-4 4M16 10l4 4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  'alfa': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M12 4L4 20h3l2-4h6l2 4h3L12 4zm-1.5 9L12 9l1.5 4h-3z" fill="white"/></svg>
  ),

  // --- FUEL ---
  'lukoil': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M12 2L4.5 20h15L12 2z" fill="white"/><path d="M12 8v8" stroke="black" strokeWidth="2"/></svg>
  ),
  'gazprom': (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14v-4H8l4-6 4 6h-3v4h-2z" fill="white"/></svg>
  ),
};

const BRAND_COLORS: Record<string, string> = {
  'wildberries': '#CB11AB',
  'ozon': '#005BFF',
  'yandex': '#FC3F1D',
  'magnit': '#E62E2D',
  'pyaterochka': '#2FAC66',
  'perekrestok': '#003366',
  'lenta': '#003399',
  'vkusvill': '#00704A',
  'samokat': '#FF4D6D',
  'vnoit': '#FB542B',
  'burgerking': '#D62300',
  'kfc': '#E4002B',
  'dodo': '#FF6900',
  'sber': '#21A038',
  'tinkoff': '#FFDD2D',
  'alfa': '#EF3124',
  'lukoil': '#ED1C24',
  'gazprom': '#007CC3',
  'metro': '#002D72',
  'auchan': '#E7292C',
  'fixprice': '#0056A3',
};

const BrandIcon: React.FC<BrandIconProps> = ({ brandKey, name, category, size = 'md', className = '' }) => {
  // Dimensions
  const sizes = {
    sm: 'w-8 h-8 rounded-[0.6rem] text-xs',
    md: 'w-12 h-12 rounded-[1rem] text-lg',
    lg: 'w-16 h-16 rounded-[1.2rem] text-2xl',
    xl: 'w-20 h-20 rounded-[1.5rem] text-3xl'
  };

  const cleanName = name.trim();
  const firstLetter = cleanName.charAt(0).toUpperCase();
  
  // 1. Try to find explicit brand logo
  if (brandKey && BRAND_LOGOS[brandKey]) {
    const bgColor = BRAND_COLORS[brandKey] || '#1C1C1E';
    return (
      <div 
        className={`${sizes[size]} flex items-center justify-center shadow-md relative overflow-hidden ${className}`}
        style={{ 
            backgroundColor: bgColor,
            // Add a subtle gradient for "Apple" feel
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.05) 100%)`
        }}
      >
        <div className="w-[70%] h-[70%] relative z-10 text-white drop-shadow-sm">
            {BRAND_LOGOS[brandKey]}
        </div>
      </div>
    );
  }

  // 2. Fallback: Category Icon or Initial
  const bgColor = category?.color || '#8E8E93';
  const icon = category ? getIconById(category.icon, size === 'sm' ? 16 : 24) : null;

  // Use initial if no category icon or if it's "Other"
  const showInitial = !category || category.id === 'other' || category.id === 'transfer';

  return (
    <div 
        className={`${sizes[size]} flex items-center justify-center text-white shadow-md relative overflow-hidden ${className}`}
        style={{ 
            backgroundColor: bgColor,
            backgroundImage: `linear-gradient(135deg, ${bgColor}dd, ${bgColor})`
        }}
    >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
        
        {showInitial ? (
            <span className="font-black drop-shadow-md relative z-10">{firstLetter}</span>
        ) : (
            <div className="relative z-10 drop-shadow-md">
                {icon}
            </div>
        )}
    </div>
  );
};

export default BrandIcon;
