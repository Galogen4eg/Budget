import React, { useState } from 'react';
import { 
  ShoppingBag, Utensils, Car, Home, Heart, Zap, Plane, Briefcase, 
  PiggyBank, Coffee, Tv, MoreHorizontal, Fuel, Store, ShoppingCart 
} from 'lucide-react';
import { Category } from '../types';
import { getIconById } from '../constants';
import { getMerchantBrandKey } from '../utils/categorizer';

interface BrandIconProps {
  brandKey?: string;
  name: string;
  category?: Category;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Domain map for fetching real high-res brand logos
const BRAND_DOMAINS: Record<string, string> = {
  'wildberries': 'wildberries.ru',
  'ozon': 'ozon.ru',
  'yandex': 'yandex.ru',
  'lamoda': 'lamoda.ru',
  'magnit': 'magnit.ru',
  'pyaterochka': '5ka.ru',
  'perekrestok': 'perekrestok.ru',
  'lenta': 'lenta.com',
  'vkusvill': 'vkusvill.ru',
  'samokat': 'samokat.ru',
  'metro': 'metro-cc.ru',
  'auchan': 'auchan.ru',
  'fixprice': 'fix-price.com',
  'vnoit': 'vkusnoitochka.ru',
  'burgerking': 'burgerking.ru',
  'kfc': 'rostics.ru',
  'dodo': 'dodopizza.ru',
  'sber': 'sberbank.ru',
  'tinkoff': 'tbank.ru',
  'alfa': 'alfabank.ru',
  'vtb': 'vtb.ru',
  'lukoil': 'lukoil.ru',
  'gazprom': 'gpncard.ru',
  'dns': 'dns-shop.ru',
  'mvideo': 'mvideo.ru',
  'eldorado': 'eldorado.ru',
  'citilink': 'citilink.ru',
  'sportmaster': 'sportmaster.ru',
  'goldenapple': 'goldapple.ru',
  'detmir': 'detmir.ru',
  'teremok': 'teremok.ru',
  'shokoladnitsa': 'shoko.ru',
  'dixy': 'dixy.ru',
  'krasnoebeloe': 'krasnoeibeloe.ru',
  'bristol': 'bristol.ru',
  'spar': 'spar.ru',
  'globus': 'globus.ru',
  'chizhik': 'chizhik.club'
};

// SVG Vector fallbacks for brands
const BRAND_LOGOS: Record<string, React.ReactNode> = {
  'wildberries': (
    <svg viewBox="0 0 512 512" fill="none" className="w-full h-full p-1"><path d="M129.6 123.4h58.8l39.9 191.1 27.6-128.4-43.2-121.2h60.9l51 143.7 51.3-143.7h59.1l-75 210.6H276l-33.3-112.5-32.4 112.5h-24.3l-56.4-252.1zM64.2 123.4h59.1l52.5 252.1H126l-24.9-122.1L71.4 375.5H23.1L64.2 123.4z" fill="white"/></svg>
  ),
  'ozon': (
    <svg viewBox="0 0 128 128" fill="none" className="w-full h-full p-1"><path d="M64 4C30.86 4 4 30.86 4 64s26.86 60 60 60 60-26.86 60-60S97.14 4 64 4zm-9 93.38H39.25V82.62L55 58.75v23.88H47v14.75h8v-14.75zm33.75-29.76c0 16.25-10.88 29.75-26.25 29.75s-26.25-13.5-26.25-29.75S47.13 37.88 62.5 37.88s26.25 13.5 26.25 29.74zM85 30.62h15.75v14.75L85 69.25V45.38h8V30.62z" fill="white"/></svg>
  ),
  'yandex': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2"><path d="M12.92 2H17v20h-4.32v-8.87L5.75 20H1L7.53 11.2 2.22 2h4.52l3.75 7.42L12.92 2z" fill="white"/></svg>
  ),
  'alfa': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path d="M12 3L4 21h4l1.5-4h5l1.5 4h4L12 3zm-1.2 11l1.2-3.5 1.2 3.5h-2.4z" fill="white"/></svg>
  ),
  'sber': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/><path d="M16.5 10.5L12 13l-4.5-2.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  'tinkoff': (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1"><path d="M2 7h20M12 7v12M7 11l-3 3M17 11l3 3" stroke="#1C1C1E" strokeWidth="2.5" strokeLinecap="round"/></svg>
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
  'vnoit': '#FB542B',
  'burgerking': '#D62300',
  'kfc': '#E4002B',
  'dodo': '#FF6900',
  'sber': '#21A038',
  'tinkoff': '#FFDD2D',
  'alfa': '#EF3124',
  'vtb': '#002882',
  'lukoil': '#ED1C24',
  'gazprom': '#007CC3',
};

export const BrandIcon: React.FC<BrandIconProps> = ({ brandKey, name, category, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);

  // Dimensions
  const sizes = {
    sm: 'w-8 h-8 rounded-[0.6rem] text-xs',
    md: 'w-12 h-12 rounded-[1rem] text-lg',
    lg: 'w-16 h-16 rounded-[1.2rem] text-2xl',
    xl: 'w-20 h-20 rounded-[1.5rem] text-3xl'
  };

  const resolvedBrandKey = brandKey || getMerchantBrandKey(name);
  const domain = resolvedBrandKey ? BRAND_DOMAINS[resolvedBrandKey] : null;

  // 1. Try real brand logo image via Google Favicons API (high-resolution)
  if (domain && !imgError) {
    const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    const bgColor = BRAND_COLORS[resolvedBrandKey] || category?.color || '#1C1C1E';

    return (
      <div 
        className={`${sizes[size]} flex items-center justify-center shadow-xs relative overflow-hidden bg-white dark:bg-[#2C2C2E] border border-stone-200/80 dark:border-white/10 ${className}`}
      >
        <img 
          src={logoUrl} 
          alt={name} 
          onError={() => setImgError(true)}
          className="w-3/4 h-3/4 object-contain rounded-md"
        />
      </div>
    );
  }

  // 2. Vector SVG logo fallback
  if (resolvedBrandKey && BRAND_LOGOS[resolvedBrandKey]) {
    const bgColor = BRAND_COLORS[resolvedBrandKey] || '#1C1C1E';
    const isDarkLogo = resolvedBrandKey === 'tinkoff' || resolvedBrandKey === 'lenta';

    return (
      <div 
        className={`${sizes[size]} flex items-center justify-center shadow-xs relative overflow-hidden ${className}`}
        style={{ 
          backgroundColor: bgColor,
          backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.05) 100%)`
        }}
      >
        <div className={`w-[70%] h-[70%] relative z-10 drop-shadow-xs ${isDarkLogo ? 'text-[#1C1C1E]' : 'text-white'}`}>
          {BRAND_LOGOS[resolvedBrandKey]}
        </div>
      </div>
    );
  }

  // 3. Fallback: Category Icon or Initial
  const cleanName = name.trim();
  const firstLetter = cleanName.charAt(0).toUpperCase();
  const bgColor = category?.color || '#8E8E93';
  const icon = category ? getIconById(category.icon, size === 'sm' ? 16 : 24) : null;
  const showInitial = !category || category.id === 'other' || category.id === 'transfer';

  return (
    <div 
      className={`${sizes[size]} flex items-center justify-center text-white shadow-xs relative overflow-hidden ${className}`}
      style={{ 
        backgroundColor: bgColor,
        backgroundImage: `linear-gradient(135deg, ${bgColor}dd, ${bgColor})`
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
      
      {showInitial ? (
        <span className="font-extrabold drop-shadow-xs relative z-10">{firstLetter}</span>
      ) : (
        <div className="relative z-10 drop-shadow-xs">
          {icon}
        </div>
      )}
    </div>
  );
};

export default BrandIcon;
