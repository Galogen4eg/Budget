
import React from 'react';
import { ShoppingBag, Utensils, Car, Home, Heart, Zap, Plane, Briefcase, PiggyBank, Coffee, Tv, MoreHorizontal, Fuel } from 'lucide-react';
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
    <svg viewBox="0 0 512 512" fill="none" className="w-full h-full p-1"><path d="M129.6 123.4h58.8l39.9 191.1 27.6-128.4-43.2-121.2h60.9l51 143.7 51.3-143.7h59.1l-75 210.6H276l-33.3-112.5-32.4 112.5h-24.3l-56.4-252.1zM64.2 123.4h59.1l52.5 252.1H126l-24.9-122.1L71.4 375.5H23.1L64.2 123.4z" fill="white"/></svg>
  ),
  'ozon': (
    <svg viewBox="0 0 128 128" fill="none" className="w-full h-full p-1"><path d="M64 4C30.86 4 4 30.86 4 64s26.86 60 60 60 60-26.86 60-60S97.14 4 64 4zm-9 93.38H39.25V82.62L55 58.75v23.88H47v14.75h8v-14.75zm33.75-29.76c0 16.25-10.88 29.75-26.25 29.75s-26.25-13.5-26.25-29.75S47.13 37.88 62.5 37.88s26.25 13.5 26.25 29.74zM85 30.62h15.75v14.75L85 69.25V45.38h8V30.62z" fill="white"/></svg>
  ),
  'yandex': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2"><path d="M12.92 2H17v20h-4.32v-8.87L5.75 20H1L7.53 11.2 2.22 2h4.52l3.75 7.42L12.92 2z" fill="white"/></svg>
  ),
  'lamoda': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path d="M2 17h4.5l1.5-4 2 4H14L8 6 2 17zm11.5-7l-1 2H16l4-7h-4l-2.5 5z" fill="white"/></svg>
  ),
  
  // --- GROCERIES ---
  'magnit': (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full p-1"><path d="M4 6h4v20H4V6zm8 0h4v20h-4V6zm8 0h4l-2 20h-4L20 6zm6 0h4l-2 20h-4l2-20z" fill="white"/></svg>
  ),
  'pyaterochka': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 7h-6v2h2.5c1.38 0 2.5 1.12 2.5 2.5S14.38 16 13 16H8v-2h5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H8V6h8.5v3z" fill="white"/></svg>
  ),
  'perekrestok': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path fillRule="evenodd" clipRule="evenodd" d="M19.7 3.3a1.5 1.5 0 00-2.12 0L12 8.88 6.42 3.3a1.5 1.5 0 00-2.12 2.12L9.88 11l-5.58 5.58a1.5 1.5 0 002.12 2.12L12 13.12l5.58 5.58a1.5 1.5 0 002.12-2.12L14.12 11l5.58-5.58a1.5 1.5 0 000-2.12z" fill="white"/></svg>
  ),
  'lenta': (
    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full p-2"><path d="M100 20C55.8 20 20 55.8 20 100s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80zm25 120h-50v-15h50v15zm0-35h-50V55h50v50z" fill="#FFC907"/><path d="M125 105H75V55h50v50zm-35 20h20v-10H90v10z" fill="white"/></svg>
  ),
  'vkusvill': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2"><path d="M2.5 2h19v20h-19V2zm3 4l4 11 2-6 2 6 4-11" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  'samokat': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2"><rect x="4" y="4" width="16" height="16" rx="8" fill="white"/><path d="M9 12l2 2 4-4" stroke="#FF4D6D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  'metro': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path d="M2 17h3l3.5-9 3.5 9h3l3.5-9 3.5 9h-2l-2.5-6-2.5 6h-2l-2.5-6-2.5 6H2z" fill="#FFDD00"/></svg>
  ),
  'auchan': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path d="M12 2C8.5 2 5.5 4 4 7l2 1c1-2 3-3 6-3s5 1 6 3l2-1c-1.5-3-4.5-5-8-5zm0 14c-3 0-5.5-2-6-5h12c-.5 3-3 5-6 5zm-7-4h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
  ),
  'fixprice': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2"><path d="M4 4h4v16H4V4zm6 0h9v3h-6v4h5v3h-5v6h-3V4z" fill="white"/></svg>
  ),

  // --- FAST FOOD ---
  'vnoit': ( // Vkusno i Tochka
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2"><circle cx="6" cy="16" r="2.5" fill="#FB542B"/><circle cx="18" cy="10" r="1.5" fill="#FB542B"/><path d="M12 18L18 6" stroke="#FB542B" strokeWidth="3" strokeLinecap="round"/></svg>
  ),
  'burgerking': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6h12c0 3.31-2.69 6-6 6zm6-8H6c0-3.31 2.69-6 6-6s6 2.69 6 6z" fill="white"/></svg>
  ),
  'kfc': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><rect x="4" y="4" width="16" height="16" rx="2" fill="white"/><path d="M6 10h4v8H6v-8zm6 0h2v8h-2v-8zm4 0h2v8h-2v-8z" fill="#E4002B"/></svg>
  ),
  'dodo': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.8L18 8v8l-6 3.3L6 16V8l6-3.2z" fill="white"/><circle cx="12" cy="12" r="2" fill="white"/></svg>
  ),

  // --- BANKS / FINANCE ---
  'sber': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/><path d="M16.5 10.5L12 13l-4.5-2.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  'tinkoff': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path d="M2 7h20M12 7v12M7 11l-3 3M17 11l3 3" stroke="#1C1C1E" strokeWidth="2.5" strokeLinecap="round"/></svg>
  ),
  'alfa': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path d="M12 3L4 21h4l1.5-4h5l1.5 4h4L12 3zm-1.2 11l1.2-3.5 1.2 3.5h-2.4z" fill="white"/></svg>
  ),
  'vtb': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2"><path d="M2 6h6l2.5 8 2.5-8h6L12 20 2 6z" fill="white"/></svg>
  ),

  // --- FUEL ---
  'lukoil': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path d="M10 2L4 22h16L12 2h-2z" fill="white"/><path d="M12 10v7" stroke="#ED1C24" strokeWidth="2"/></svg>
  ),
  'gazprom': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/><path d="M12 6v6h4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
};

const BRAND_COLORS: Record<string, string> = {
  'wildberries': '#CB11AB',
  'ozon': '#005BFF',
  'yandex': '#FC3F1D',
  'lamoda': '#000000',
  'magnit': '#E62E2D',
  'pyaterochka': '#2FAC66',
  'perekrestok': '#003366',
  'lenta': '#003399',
  'vkusvill': '#00704A',
  'samokat': '#FF4D6D',
  'metro': '#002D72',
  'auchan': '#E7292C',
  'fixprice': '#0056A3',
  'vnoit': '#FB542B', // White logo on Orange background
  'burgerking': '#D62300',
  'kfc': '#E4002B',
  'dodo': '#FF6900',
  'sber': '#21A038',
  'tinkoff': '#FFDD2D', // Black logo on Yellow background
  'alfa': '#EF3124',
  'vtb': '#002882',
  'lukoil': '#ED1C24',
  'gazprom': '#007CC3',
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
    
    // Check if branding requires specific handling (like Tinkoff black logo on yellow)
    const isDarkLogo = brandKey === 'tinkoff' || brandKey === 'lenta'; 

    return (
      <div 
        className={`${sizes[size]} flex items-center justify-center shadow-md relative overflow-hidden ${className}`}
        style={{ 
            backgroundColor: bgColor,
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.05) 100%)`
        }}
      >
        <div className={`w-[70%] h-[70%] relative z-10 drop-shadow-sm ${isDarkLogo ? 'text-[#1C1C1E]' : 'text-white'}`}>
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
