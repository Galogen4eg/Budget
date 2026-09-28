import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Trash2, ShoppingBag, Utensils, Car, Star, QrCode, 
  Loader2, Camera, Edit2, Barcode, ScanLine, AlertCircle, 
  Coffee, Tv, Zap, Briefcase, Gift, CreditCard, Sparkles, 
  Check, ChevronLeft, ChevronRight, Search, Grid, List, Copy, Sun, Moon, 
  ShieldCheck, Smartphone, Wifi, Tag, Store, HeartHandshake,
  CheckCircle2, AlertTriangle, Upload, Eye, ShoppingCart, 
  Activity, Dumbbell, Baby, Pill, Layers, ArrowUp, ArrowDown, Folder
} from 'lucide-react';
import { LoyaltyCard } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem } from '../utils/db';
import { useData } from '../contexts/DataContext';
import { LoyaltyCardMobileModal } from './LoyaltyCardMobileModal';

interface WalletProps {
  cards: LoyaltyCard[];
  setCards: (cards: LoyaltyCard[]) => void;
  onClose?: () => void;
}

export const COLOR_PALETTES = [
  { id: 'terra', name: 'Шалфей Terra', bg: 'from-[#4a7c59] via-[#3d6849] to-[#2c4d35]', hex: '#4a7c59' },
  { id: 'emerald', name: 'Изумруд', bg: 'from-[#277848] via-[#21683e] to-[#174e2d]', hex: '#277848' },
  { id: 'sapphire', name: 'Сапфир', bg: 'from-[#1d62cd] via-[#154fa9] to-[#0c3677]', hex: '#1d62cd' },
  { id: 'crimson', name: 'Красный', bg: 'from-[#dc2626] via-[#b91c1c] to-[#7f1d1d]', hex: '#dc2626' },
  { id: 'terracotta', name: 'Терракота', bg: 'from-[#ea580c] via-[#c2410c] to-[#9a3412]', hex: '#ea580c' },
  { id: 'teal', name: 'Тиловый', bg: 'from-[#0d9488] via-[#0f766e] to-[#115e59]', hex: '#0d9488' },
  { id: 'purple', name: 'Аметист', bg: 'from-[#7c3aed] via-[#6d28d9] to-[#4c1d95]', hex: '#7c3aed' },
  { id: 'slate', name: 'Графит', bg: 'from-[#334155] via-[#1e293b] to-[#0f172a]', hex: '#334155' },
  { id: 'amber', name: 'Янтарь', bg: 'from-[#d97706] via-[#b45309] to-[#78350f]', hex: '#d97706' },
  { id: 'indigo', name: 'Индиго', bg: 'from-[#4338ca] via-[#3730a3] to-[#312e81]', hex: '#4338ca' }
];

export const CATEGORIES = [
  { id: 'all', name: 'Все карты' },
  { id: 'groceries', name: 'Продукты' },
  { id: 'sport', name: 'Спорт и отдых' },
  { id: 'pharma', name: 'Аптеки' },
  { id: 'kids', name: 'Детям и одежда' },
  { id: 'cafe', name: 'Кафе и еда' },
  { id: 'auto', name: 'Авто и АЗС' },
  { id: 'other', name: 'Другое' }
];

export const ICON_LIST = [
  { id: 'ShoppingBag', name: 'Покупки', icon: ShoppingBag },
  { id: 'ShoppingCart', name: 'Корзина', icon: ShoppingCart },
  { id: 'Utensils', name: 'Ресторан', icon: Utensils },
  { id: 'Car', name: 'Авто', icon: Car },
  { id: 'Star', name: 'Звезда', icon: Star },
  { id: 'Coffee', name: 'Кофе', icon: Coffee },
  { id: 'Dumbbell', name: 'Спорт', icon: Dumbbell },
  { id: 'Pill', name: 'Аптека', icon: Pill },
  { id: 'Baby', name: 'Детям', icon: Baby },
  { id: 'CreditCard', name: 'Карта', icon: CreditCard }
];

// Helper to render dynamic Lucide icon safely
export const getCardIcon = (iconName?: string) => {
  switch (iconName) {
    case 'ShoppingCart': return <ShoppingCart className="w-6 h-6" />;
    case 'Utensils': return <Utensils className="w-6 h-6" />;
    case 'Car': return <Car className="w-6 h-6" />;
    case 'Star': return <Star className="w-6 h-6" />;
    case 'Coffee': return <Coffee className="w-6 h-6" />;
    case 'Dumbbell': return <Dumbbell className="w-6 h-6" />;
    case 'Pill': return <Pill className="w-6 h-6" />;
    case 'Baby': return <Baby className="w-6 h-6" />;
    case 'CreditCard': return <CreditCard className="w-6 h-6" />;
    case 'ShoppingBag':
    default:
      return <ShoppingBag className="w-6 h-6" />;
  }
};

export const getCategoryIcon = (catId: string) => {
  switch (catId) {
    case 'groceries': return <ShoppingCart className="w-4 h-4 text-[#4A7C59]" />;
    case 'sport': return <Dumbbell className="w-4 h-4 text-[#2A9D8F]" />;
    case 'pharma': return <Pill className="w-4 h-4 text-[#4A7C59]" />;
    case 'kids': return <Baby className="w-4 h-4 text-[#F4A261]" />;
    case 'cafe': return <Coffee className="w-4 h-4 text-[#A2845E]" />;
    case 'auto': return <Car className="w-4 h-4 text-[#457B9D]" />;
    case 'other':
    default:
      return <CreditCard className="w-4 h-4 text-[#E07A5F]" />;
  }
};

// Pure vector realistic SVG barcode generator
export const BarcodeSvgRenderer: React.FC<{ code: string; format?: string; height?: number }> = ({ 
  code, 
  format = 'code128', 
  height = 80 
}) => {
  const cleanCode = (code || '123456789012').replace(/\s+/g, '');

  if (format === 'qr') {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl">
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(cleanCode)}`} 
          alt={cleanCode}
          className="w-44 h-44 object-contain"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Deterministic bar widths calculated from code digits/hash for realistic scan representation
  const bars: { width: number; isSpace: boolean }[] = [];
  let sum = 0;
  for (let i = 0; i < cleanCode.length; i++) {
    sum = (sum * 31 + cleanCode.charCodeAt(i)) % 1000;
  }

  // Generate standard start guard
  bars.push({ width: 3, isSpace: false });
  bars.push({ width: 2, isSpace: true });
  bars.push({ width: 3, isSpace: false });
  bars.push({ width: 2, isSpace: true });

  const numChars = cleanCode.length || 10;
  for (let i = 0; i < numChars; i++) {
    const charCode = cleanCode.charCodeAt(i % cleanCode.length);
    const w1 = ((charCode * 3 + i) % 4) + 1;
    const w2 = ((charCode * 7 + i * 2) % 3) + 1;
    const w3 = ((charCode * 5 + i * 3) % 4) + 1;
    const w4 = ((charCode * 11 + i * 5) % 3) + 1;

    bars.push({ width: w1, isSpace: false });
    bars.push({ width: w2, isSpace: true });
    bars.push({ width: w3, isSpace: false });
    bars.push({ width: w4, isSpace: true });
  }

  // Stop guard
  bars.push({ width: 3, isSpace: false });
  bars.push({ width: 2, isSpace: true });
  bars.push({ width: 3, isSpace: false });

  let currentX = 10;
  const barElements = bars.map((b, idx) => {
    const x = currentX;
    currentX += b.width + 1;
    if (b.isSpace) return null;
    return (
      <rect 
        key={idx} 
        x={x} 
        y="0" 
        width={b.width} 
        height={height} 
        fill="currentColor" 
      />
    );
  });

  const totalWidth = currentX + 10;

  return (
    <svg 
      className="w-full text-stone-900 overflow-visible" 
      style={{ height: `${height}px`, maxHeight: '100px' }}
      viewBox={`0 0 ${totalWidth} ${height}`} 
      preserveAspectRatio="none"
    >
      {barElements}
    </svg>
  );
};

export const formatCardNumberSpaced = (num?: string): string => {
  if (!num) return '•••• •••• ••••';
  const clean = num.replace(/\s+/g, '');
  return clean.replace(/(\d{4})/g, '$1 ').trim();
};

export const formatCardNumberDotted = (num?: string): string => {
  if (!num) return '•••• • •••• • ••••';
  const clean = num.replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  const chunks = clean.match(/.{1,4}/g) || [clean];
  return chunks.join(' • ');
};

const DEFAULT_SAMPLE_CARDS: LoyaltyCard[] = [
  {
    id: 'sample-1',
    name: 'Пятёрочка',
    number: '778900012345',
    color: '#277848',
    icon: 'ShoppingCart',
    category: 'groceries',
    subtitle: 'Карта Выручайка • Семья',
    discount: '5% кэшбэк',
    balance: '450 ₽ скидки',
    barcodeFormat: 'ean13'
  },
  {
    id: 'sample-2',
    name: 'Спортмастер',
    number: '990011223344',
    color: '#1d62cd',
    icon: 'Dumbbell',
    category: 'sport',
    subtitle: 'Клубная карта Синяя',
    discount: 'Скидка 10%',
    balance: '1 200 ₽ (до 15 ноя)',
    barcodeFormat: 'code128'
  },
  {
    id: 'sample-3',
    name: 'Магнит Плюс',
    number: '700345128890',
    color: '#dc2626',
    icon: 'Store',
    category: 'groceries',
    subtitle: 'Семейная программа',
    discount: 'Уровень 2',
    balance: 'Скидка 5%',
    barcodeFormat: 'ean13'
  },
  {
    id: 'sample-4',
    name: 'ВкусВилл',
    number: '452089113201',
    color: '#4a7c59',
    icon: 'ShoppingBag',
    category: 'groceries',
    subtitle: 'Любимый продукт -20%',
    discount: 'Разнообразное',
    balance: 'Выбрано: Сыр Пармезан 200г',
    barcodeFormat: 'code128'
  },
  {
    id: 'sample-5',
    name: 'Ригла Аптека',
    number: '551200419923',
    color: '#0d9488',
    icon: 'Pill',
    category: 'pharma',
    subtitle: 'Программа «Ригла Плюс»',
    discount: 'Здоровье',
    balance: '320 ₽ скидки',
    barcodeFormat: 'code128'
  },
  {
    id: 'sample-6',
    name: 'Детский Мир',
    number: '220488316542',
    color: '#ea580c',
    icon: 'Baby',
    category: 'kids',
    subtitle: 'Семейная карта родителя',
    discount: 'Скидка ×2',
    balance: '640 ₽ скидки',
    barcodeFormat: 'code128'
  }
];

const WalletApp: React.FC<WalletProps> = ({ cards, setCards, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Modals state
  const [activeBarcodeCard, setActiveBarcodeCard] = useState<LoyaltyCard | null>(null);
  const [editingCard, setEditingCard] = useState<Partial<LoyaltyCard> | null>(null);
  const [cardToDelete, setCardToDelete] = useState<LoyaltyCard | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMaxBrightness, setIsMaxBrightness] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('groceries');
  const [formNumber, setFormNumber] = useState('');
  const [formColor, setFormColor] = useState(COLOR_PALETTES[0].hex);
  const [formIcon, setFormIcon] = useState('ShoppingBag');
  const [formFormat, setFormFormat] = useState<'code128' | 'ean13' | 'qr'>('code128');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formDiscount, setFormDiscount] = useState('');
  const [formBalance, setFormBalance] = useState('');

  const { familyId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize sample cards if empty on first load so user immediately sees rich UI
  useEffect(() => {
    if (cards.length === 0) {
      setCards(DEFAULT_SAMPLE_CARDS);
    }
  }, []);

  // Counts for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cards.length };
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'all') {
        counts[cat.id] = cards.filter(c => (c.category || 'other') === cat.id).length;
      }
    });
    return counts;
  }, [cards]);

  // Visible categories (hide empty categories except 'all')
  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter(cat => cat.id === 'all' || (categoryCounts[cat.id] || 0) > 0);
  }, [categoryCounts]);

  // If selected category has become empty, fallback to 'all'
  useEffect(() => {
    if (selectedCategory !== 'all' && (categoryCounts[selectedCategory] || 0) === 0) {
      setSelectedCategory('all');
    }
  }, [selectedCategory, categoryCounts]);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const matchesSearch = !searchQuery.trim() || 
        card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.number.includes(searchQuery.trim());

      const matchesCat = selectedCategory === 'all' || 
        (card.category || 'other') === selectedCategory ||
        (selectedCategory === 'groceries' && !card.category);

      return matchesSearch && matchesCat;
    });
  }, [cards, searchQuery, selectedCategory]);

  // Open Edit/Add Modal
  const handleOpenAddModal = () => {
    setEditingCard({
      id: undefined,
      name: '',
      number: '',
      color: '#4a7c59',
      icon: 'ShoppingBag',
      category: 'groceries',
      barcodeFormat: 'code128',
      subtitle: '',
      discount: '',
      balance: ''
    });
    setFormName('');
    setFormCategory('groceries');
    setFormNumber('');
    setFormColor('#4a7c59');
    setFormIcon('ShoppingBag');
    setFormFormat('code128');
    setFormSubtitle('');
    setFormDiscount('');
    setFormBalance('');
  };

  const handleOpenEditModal = (card: LoyaltyCard) => {
    setEditingCard(card);
    setFormName(card.name);
    setFormCategory(card.category || 'groceries');
    setFormNumber(card.number);
    setFormColor(card.color || '#4a7c59');
    setFormIcon(card.icon || 'ShoppingBag');
    setFormFormat((card.barcodeFormat as any) || 'code128');
    setFormSubtitle(card.subtitle || '');
    setFormDiscount(card.discount && card.discount.toLowerCase() !== 'активна' ? card.discount : '');
    setFormBalance(card.balance && card.balance.toLowerCase() !== 'активна' ? card.balance : '');
    if (activeBarcodeCard?.id === card.id) {
      setActiveBarcodeCard(null);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const cleanNumber = formNumber.replace(/\s+/g, '');

    const cardData: LoyaltyCard = {
      id: editingCard?.id || Date.now().toString() + Math.random().toString(36).substring(2, 7),
      name: formName.trim(),
      number: cleanNumber,
      color: formColor,
      icon: formIcon,
      category: formCategory,
      barcodeFormat: formFormat,
      subtitle: formSubtitle.trim() || 'Карта лояльности',
      discount: formDiscount.trim(),
      balance: formBalance.trim()
    };

    if (editingCard?.id) {
      setCards(cards.map(c => c.id === editingCard.id ? cardData : c));
      if (familyId) await updateItem(familyId, 'loyalty', editingCard.id, cardData);
    } else {
      setCards([cardData, ...cards]);
      if (familyId) await addItem(familyId, 'loyalty', cardData);
    }

    setEditingCard(null);
  };

  const confirmDelete = async (id: string) => {
    setCards(cards.filter(c => c.id !== id));
    if (familyId) await deleteItem(familyId, 'loyalty', id);
    setCardToDelete(null);
    if (activeBarcodeCard?.id === id) setActiveBarcodeCard(null);
    if (editingCard?.id === id) setEditingCard(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const getCardGradient = (colorHex?: string) => {
    const found = COLOR_PALETTES.find(p => p.hex.toLowerCase() === colorHex?.toLowerCase());
    return found ? found.bg : 'from-[#4a7c59] via-[#3d6849] to-[#2c4d35]';
  };

  return (
    <div className="space-y-6 w-full text-stone-800 dark:text-stone-100 font-sans pb-12">
      
      {/* 1. Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="hidden sm:flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">
            {onClose ? (
              <button 
                type="button"
                onClick={onClose}
                className="hover:text-[#4a7c59] dark:hover:text-green-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Сервисы</span>
              </button>
            ) : (
              <span>Сервисы</span>
            )}
            <span className="text-stone-300 dark:text-stone-600">•</span>
            <span className="text-stone-800 dark:text-white font-bold">Wallet</span>
          </nav>

          <div className="flex items-baseline gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              Мои карты
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400">
              {cards.length}
            </span>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl bg-[#4a7c59] hover:bg-[#3d6749] text-white text-xs sm:text-sm font-bold tracking-wide shadow-sm active:scale-98 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Добавить карту</span>
        </button>
      </div>

      {/* 2. Filter Bar & View Toggle */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 border border-stone-200/90 dark:border-white/10 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Category Badges Horizontal Ribbon */}
          <div className="relative flex items-center min-w-0 flex-1">
            <button 
              type="button"
              onClick={() => scrollCategories('left')}
              className="hidden sm:flex w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-white/10 shadow-2xs items-center justify-center shrink-0 hover:bg-[#4a7c59] hover:text-white transition cursor-pointer mr-1 z-10"
              title="Прокрутить влево"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            <div 
              ref={categoryScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto py-0.5 scroll-smooth no-scrollbar flex-1 min-w-0 -mx-1 px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {visibleCategories.map(cat => {
                const count = categoryCounts[cat.id] || 0;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#4a7c59] text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className={`text-[10px] ${isActive ? 'opacity-90' : 'text-stone-400'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <button 
              type="button"
              onClick={() => scrollCategories('right')}
              className="hidden sm:flex w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-white/10 shadow-2xs items-center justify-center shrink-0 hover:bg-[#4a7c59] hover:text-white transition cursor-pointer ml-1 z-10"
              title="Прокрутить вправо"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Search Input & Grid/List switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Фильтр карт..."
                className="w-full h-9 pl-8 pr-7 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#4a7c59] transition"
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5 gap-0.5">
              <button 
                type="button"
                onClick={() => setViewMode('grid')}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#4a7c59] dark:text-green-400 shadow-xs' 
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
                title="Сетка"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('list')}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#4a7c59] dark:text-green-400 shadow-xs' 
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
                title="Список"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Cards Display (Bento Grid vs List) */}
      {filteredCards.length === 0 ? (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-dashed border-stone-300 dark:border-white/10 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-green-400 mx-auto flex items-center justify-center mb-3">
            <CreditCard className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-display font-bold text-stone-900 dark:text-white">
            Карты не найдены
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? `По запросу «${searchQuery}» ничего не найдено.` : 'В этой категории пока нет карт.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#4a7c59] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить карту</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {filteredCards.map((card) => {
            const gradient = getCardGradient(card.color);
            return (
              <div 
                key={card.id}
                onClick={() => setActiveBarcodeCard(card)}
                className={`group relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gradient-to-br ${gradient} text-white shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[175px] sm:min-h-[240px] overflow-hidden cursor-pointer active:scale-[0.985]`}
              >
                {/* Ambient watermark curves */}
                <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute right-12 top-4 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

                <div>
                  {/* Top Row: Store Icon, Name & Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xs shrink-0">
                        {getCardIcon(card.icon)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-extrabold text-base sm:text-xl tracking-tight text-white leading-tight truncate">
                          {card.name}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-white/80 font-medium truncate mt-0.5">
                          {card.subtitle || 'Карта лояльности'}
                        </p>
                      </div>
                    </div>

                    {card.discount && card.discount.toLowerCase() !== 'активна' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-[11px] font-bold text-white tracking-wide shrink-0">
                        <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                        <span>{card.discount}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Card Number & Balance */}
                <div className="mt-3.5 sm:mt-5 mb-3 sm:mb-4 flex items-end justify-between gap-2">
                  <div>
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/70 block mb-0.5">
                      Номер карты
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm sm:text-lg font-extrabold tracking-wider text-white select-all">
                        {formatCardNumberDotted(card.number)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(card.number);
                        }}
                        title="Скопировать номер"
                        className="p-1 rounded-lg hover:bg-white/20 text-white/75 hover:text-white transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {card.balance && card.balance.toLowerCase() !== 'активна' && (
                    <span className="px-2 sm:px-2.5 py-0.5 rounded-lg bg-black/25 text-[10px] sm:text-xs font-semibold tracking-wide text-white/95 backdrop-blur-xs">
                      {card.balance}
                    </span>
                  )}
                </div>

                {/* Footer Action Bar */}
                <div className="pt-2.5 sm:pt-3.5 flex items-center justify-between bg-black/20 -mx-4 -mb-4 px-4 py-2.5 sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-3 backdrop-blur-sm">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBarcodeCard(card);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white text-stone-900 font-display font-bold text-xs hover:bg-white/90 transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#4a7c59]" />
                    <span>Показать код</span>
                  </button>

                  <div className="flex items-center gap-0.5 sm:gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(card);
                      }}
                      title="Редактировать"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-white/20 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardToDelete(card);
                      }}
                      title="Удалить карту"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-white/20 flex items-center justify-center text-white/90 hover:text-rose-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode View */
        <div className="space-y-2.5">
          {filteredCards.map((card) => {
            const gradient = getCardGradient(card.color);
            return (
              <div 
                key={card.id}
                onClick={() => setActiveBarcodeCard(card)}
                className="bg-white dark:bg-[#1C1C1E] p-3 sm:p-4 rounded-2xl border border-stone-200/90 dark:border-white/10 shadow-xs flex items-center justify-between gap-3 hover:border-[#4a7c59]/40 active:scale-[0.99] transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-xs shrink-0`}>
                    {getCardIcon(card.icon)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display font-bold text-sm sm:text-base text-stone-900 dark:text-white truncate">
                        {card.name}
                      </h3>
                      {card.discount && card.discount.toLowerCase() !== 'активна' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 text-[10px] font-bold shrink-0">
                          {card.discount}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                      {formatCardNumberSpaced(card.number)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {card.balance && card.balance.toLowerCase() !== 'активна' && (
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 hidden sm:inline-block">
                      {card.balance}
                    </span>
                  )}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBarcodeCard(card);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#edf4ef] dark:bg-[#243628] hover:bg-[#4a7c59] hover:text-white text-[#4a7c59] dark:text-emerald-400 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Код</span>
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(card);
                    }}
                    className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 transition cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCardToDelete(card);
                    }}
                    className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-500 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Editorial Family Insights Section (Bottom) */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Family Access Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 sm:p-8 border border-stone-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#4a7c59] dark:text-green-400 font-extrabold">
                  Семейный доступ
                </span>
                <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white mt-1">
                  Единый кошелек карт
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                  Все карты мгновенно синхронизируются в реальном времени между смартфонами всех членов семьи.
                </p>
              </div>

              {/* Family Avatar Rings */}
              <div className="flex items-center -space-x-2 shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-stone-900">
                  Я
                </div>
                <div className="w-10 h-10 rounded-full bg-[#705c30] text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-stone-900">
                  МС
                </div>
                <div className="w-10 h-10 rounded-full bg-[#1d62cd] text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-stone-900">
                  ДС
                </div>
                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-stone-900">
                  +1
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-100 dark:border-white/5 text-center">
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-white/5">
              <span className="block text-[11px] text-stone-500 dark:text-stone-400 font-medium">Офлайн-доступ</span>
              <span className="font-display font-extrabold text-[#4a7c59] dark:text-green-400 text-sm mt-0.5 block">100%</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-white/5">
              <span className="block text-[11px] text-stone-500 dark:text-stone-400 font-medium">Apple Wallet</span>
              <span className="font-display font-extrabold text-stone-800 dark:text-white text-sm mt-0.5 block">Подключен</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-white/5">
              <span className="block text-[11px] text-stone-500 dark:text-stone-400 font-medium">Автоввод на кассе</span>
              <span className="font-display font-extrabold text-stone-800 dark:text-white text-sm mt-0.5 block">Вкл ✓</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-white/5">
              <span className="block text-[11px] text-stone-500 dark:text-stone-400 font-medium">Безопасность</span>
              <span className="font-display font-extrabold text-[#4a7c59] dark:text-green-400 text-sm mt-0.5 block">AES-256</span>
            </div>
          </div>
        </div>

        {/* Quick Scan Card / Action */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 sm:p-8 border border-stone-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#f0e8db] dark:bg-[#332a1e] text-[#705c30] dark:text-[#dcc48e] flex items-center justify-center mb-4">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              Быстрое сканирование
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
              Сфотографируйте пластиковую карту или выберите фото из галереи — система мгновенно определит штрихкод.
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <button 
                type="button"
                onClick={handleOpenAddModal}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-bold text-xs transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#4a7c59] dark:text-green-400" />
                <span>Сканировать камерой</span>
              </button>
              <button 
                type="button"
                onClick={handleOpenAddModal}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-bold text-xs transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#705c30]" />
                <span>Загрузить фото карты</span>
              </button>
            </div>
          </div>

          <div className="mt-5 p-3.5 rounded-2xl bg-[#edf4ef]/60 dark:bg-[#243628] border border-[#d1dbd1] dark:border-green-800/40 flex items-start gap-2.5 text-xs text-stone-600 dark:text-stone-300">
            <Sparkles className="w-4 h-4 text-[#4a7c59] dark:text-green-400 shrink-0 mt-0.5" />
            <span>
              <b>Совет Terra:</b> Нажмите «Показать код» на кассе, чтобы открыть штрихкод на максимальной контрастности.
            </span>
          </div>
        </div>

      </div>

      {/* 5. Barcode View Modal (Terra Mobile Loyalty Card Spec matching Mockup 2) */}
      {activeBarcodeCard && (
        <LoyaltyCardMobileModal
          card={activeBarcodeCard}
          onClose={() => {
            setActiveBarcodeCard(null);
            setIsMaxBrightness(false);
          }}
          onEdit={(card) => {
            setActiveBarcodeCard(null);
            handleOpenEditModal(card);
          }}
          onDelete={(card) => {
            setActiveBarcodeCard(null);
            setCardToDelete(card);
          }}
          currentUserInitial="Я"
        />
      )}

      {/* 6. Add / Edit Card Modal (Terra Design Prototype 3) */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-[490px] my-auto bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-stone-200 dark:border-white/10 max-h-[95vh] overflow-y-auto no-scrollbar">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-3 flex items-center justify-between border-b border-stone-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-xl font-extrabold text-stone-900 dark:text-white tracking-tight">
                  {editingCard.id ? 'Редактировать карту' : 'Новая карта'}
                </h2>
                <span className="w-2 h-2 rounded-full bg-[#4a7c59]" />
              </div>

              <button 
                type="button"
                onClick={() => setEditingCard(null)}
                className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-500 flex items-center justify-center transition cursor-pointer"
                title="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveCard} className="p-6 flex flex-col gap-4 font-sans text-stone-800 dark:text-stone-100">
              
              {/* AI Camera Scanning Banner */}
              <div 
                onClick={() => {
                  // Pre-fill demo fast scan simulation
                  if (!formName) {
                    setFormName('Перекрёсток');
                    setFormNumber('778920345519');
                    setFormCategory('groceries');
                    setFormSubtitle('Клубная карта');
                    setFormDiscount('5% кэшбэк');
                    setFormBalance('560 баллов');
                  }
                }}
                className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-[#edf4ef] via-[#f0e8db] to-[#edf4ef] dark:from-[#243628] dark:via-[#332a1e] dark:to-[#243628] cursor-pointer hover:shadow-md transition-all group border border-[#d1dbd1] dark:border-green-800/40"
              >
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-[#4a7c59] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#4a7c59] dark:text-green-400">
                        Автосканирование
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#705c30] text-white">
                        AI Vision
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 font-medium mt-0.5 leading-snug">
                      Нажмите, чтобы распознать карту по фото или штрихкоду
                    </p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-stone-400 rotate-180 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Section Divider */}
              <div className="flex items-center gap-3 my-0.5">
                <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1" />
                <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                  или введите вручную
                </span>
                <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1" />
              </div>

              {/* Store Name Field */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-1.5">
                  Название магазина / сети
                </label>
                <input 
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Магазин (Лента, Перекрёсток, FixPrice...)"
                  className="w-full h-11 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 text-sm font-bold text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#4a7c59] transition"
                />
              </div>

              {/* Category & Subtitle Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-1.5">
                    Категория
                  </label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a7c59] transition"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-1.5">
                    Программа / Тип
                  </label>
                  <input 
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="Клубная карта"
                    className="w-full h-11 px-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#4a7c59] transition"
                  />
                </div>
              </div>

              {/* Card Number Field */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-1.5">
                  Номер карты / штрихкода
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="7789 2034 5519..."
                    className="w-full h-11 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 text-sm font-mono tracking-wider font-bold text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#4a7c59] transition"
                  />
                  <Barcode className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                </div>
              </div>

              {/* Barcode Format Selector */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-1.5">
                  Формат штрихкода
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button"
                    onClick={() => setFormFormat('code128')}
                    className={`flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      formFormat === 'code128' 
                        ? 'bg-[#4a7c59] text-white shadow-xs' 
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    <Barcode className="w-4 h-4" />
                    <span>BAR</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setFormFormat('ean13')}
                    className={`flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      formFormat === 'ean13' 
                        ? 'bg-[#4a7c59] text-white shadow-xs' 
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    <Barcode className="w-4 h-4" />
                    <span>EAN-13</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setFormFormat('qr')}
                    className={`flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      formFormat === 'qr' 
                        ? 'bg-[#4a7c59] text-white shadow-xs' 
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR</span>
                  </button>
                </div>
              </div>

              {/* Barcode Live Preview Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400">
                    Предпросмотр кода
                  </label>
                  <span className="text-[11px] text-[#4a7c59] dark:text-green-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] animate-pulse" />
                    Готов к сканированию
                  </span>
                </div>

                <div 
                  className="relative w-full rounded-2xl bg-stone-100 dark:bg-stone-800/80 p-4 flex flex-col items-center justify-center border border-stone-200/80 dark:border-white/5"
                  style={{ backgroundImage: 'radial-gradient(circle, rgba(116, 121, 110, 0.25) 1px, transparent 1px)', backgroundSize: '10px 10px' }}
                >
                  <div className="bg-white px-5 py-3 rounded-xl shadow-xs flex flex-col items-center w-full max-w-[340px]">
                    <div className="w-full flex justify-center py-1">
                      <BarcodeSvgRenderer 
                        code={formNumber || '778920345519'} 
                        format={formFormat} 
                        height={52} 
                      />
                    </div>
                    <p className="font-mono text-xs font-extrabold text-stone-900 tracking-[0.25em] mt-1">
                      {formatCardNumberSpaced(formNumber || '778920345519')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Color Swatches Picker (10 colors from Prototype) */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-2">
                  Цвет карты
                </label>
                <div className="grid grid-cols-10 gap-1.5">
                  {COLOR_PALETTES.map(palette => {
                    const isSelected = formColor.toLowerCase() === palette.hex.toLowerCase();
                    return (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => setFormColor(palette.hex)}
                        title={palette.name}
                        style={{ backgroundColor: palette.hex }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                          isSelected ? 'ring-2 ring-stone-900 dark:ring-white scale-110 shadow-sm' : ''
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Selector (10 Icons from Prototype) */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-2">
                  Иконка карты
                </label>
                <div className="grid grid-cols-10 gap-1.5">
                  {ICON_LIST.map(item => {
                    const IconComp = item.icon;
                    const isSelected = formIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormIcon(item.id)}
                        title={item.name}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer ${
                          isSelected 
                            ? 'bg-[#4a7c59] text-white shadow-xs' 
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional: Cashback & Balance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-1">
                    Скидка / Статус
                  </label>
                  <input 
                    type="text"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                    placeholder="5% кэшбэк"
                    className="w-full h-10 px-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#4a7c59] transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-1">
                    Баланс / Заметка
                  </label>
                  <input 
                    type="text"
                    value={formBalance}
                    onChange={(e) => setFormBalance(e.target.value)}
                    placeholder="450 ₽ или Скидка 10%"
                    className="w-full h-10 px-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#4a7c59] transition"
                  />
                </div>
              </div>

              {/* Submit Primary Action */}
              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-[#4a7c59] hover:bg-[#3d6749] text-white font-display font-bold text-sm tracking-wide shadow-md shadow-[#4a7c59]/20 transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  <span>{editingCard.id ? 'СОХРАНИТЬ КАРТУ' : 'ДОБАВИТЬ В КОШЕЛЁК'}</span>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Dialog (Terra Design Spec) */}
      {cardToDelete && (
        <div 
          id="deleteConfirmDialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-xl flex flex-col items-center text-center border border-[#ECE5DB] dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <h3 className="font-serif font-bold text-lg text-[#2E3230] dark:text-white">
              Удалить карту?
            </h3>
            
            <p className="text-stone-500 dark:text-stone-400 text-sm font-sans mt-2">
              Карта «{cardToDelete.name}» будет удалена из общего семейного доступа для всех членов семьи.
            </p>

            <div className="flex items-center gap-3 w-full mt-6">
              <button 
                type="button"
                id="cancelDeleteBtn"
                onClick={() => setCardToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#E4E0D8] dark:bg-stone-800 text-[#2E3230] dark:text-stone-200 font-sans text-sm font-semibold hover:bg-[#D5CDC2] dark:hover:bg-stone-700 transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button 
                type="button"
                id="confirmDeleteBtn"
                onClick={() => confirmDelete(cardToDelete.id)}
                className="flex-1 py-2.5 rounded-xl bg-[#B83230] text-white font-sans text-sm font-semibold hover:bg-[#A32B29] transition-all cursor-pointer shadow-xs"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WalletApp;
