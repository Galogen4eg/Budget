import React, { useState, useMemo } from 'react';
import { 
  X, Star, Copy, Check, Edit2, Trash2, Lightbulb, 
  ScanLine, User, ShoppingBag, ShoppingCart, Utensils,
  Car, Coffee, Dumbbell, Pill, Baby, CreditCard
} from 'lucide-react';
import { LoyaltyCard } from '../types';

interface LoyaltyCardMobileModalProps {
  card: LoyaltyCard;
  onClose: () => void;
  onEdit: (card: LoyaltyCard) => void;
  onDelete: (card: LoyaltyCard) => void;
  currentUserInitial?: string;
}

const CATEGORY_NAMES: Record<string, string> = {
  groceries: 'Супермаркет',
  sport: 'Спорт и отдых',
  pharma: 'Аптека',
  kids: 'Детям и одежда',
  cafe: 'Кафе и рестораны',
  auto: 'Авто и АЗС',
  other: 'Магазин'
};

const COLOR_GRADIENTS: Record<string, string> = {
  terra: 'from-[#4A7C59] via-[#3D684A] to-[#2C4D35]',
  emerald: 'from-[#277848] via-[#21683E] to-[#174E2D]',
  sapphire: 'from-[#1D62CD] via-[#154FA9] to-[#0C3677]',
  crimson: 'from-[#DC2626] via-[#B91C1C] to-[#7F1D1D]',
  terracotta: 'from-[#EA580C] via-[#C2410C] to-[#9A3412]',
  teal: 'from-[#0D9488] via-[#0F766E] to-[#115E59]',
  purple: 'from-[#7C3AED] via-[#6D28D9] to-[#4C1D95]',
  slate: 'from-[#334155] via-[#1E293B] to-[#0F172A]',
  amber: 'from-[#D97706] via-[#B45309] to-[#78350F]',
  indigo: 'from-[#4338CA] via-[#3730A3] to-[#312E81]'
};

export const getCardIconElement = (iconName?: string) => {
  switch (iconName) {
    case 'ShoppingCart': return <ShoppingCart className="w-6 h-6 text-white" />;
    case 'Utensils': return <Utensils className="w-6 h-6 text-white" />;
    case 'Car': return <Car className="w-6 h-6 text-white" />;
    case 'Star': return <Star className="w-6 h-6 text-white" />;
    case 'Coffee': return <Coffee className="w-6 h-6 text-white" />;
    case 'Dumbbell': return <Dumbbell className="w-6 h-6 text-white" />;
    case 'Pill': return <Pill className="w-6 h-6 text-white" />;
    case 'Baby': return <Baby className="w-6 h-6 text-white" />;
    case 'CreditCard': return <CreditCard className="w-6 h-6 text-white" />;
    case 'ShoppingBag':
    default:
      return <ShoppingBag className="w-6 h-6 text-white" />;
  }
};

export const formatSpacedCardDigits = (num: string): string => {
  const clean = (num || '').replace(/\s+/g, '');
  if (!clean) return '0000 0000 0000';
  return clean.replace(/(\d{4})/g, '$1 ').trim();
};

export const LoyaltyCardMobileModal: React.FC<LoyaltyCardMobileModalProps> = ({
  card,
  onClose,
  onEdit,
  onDelete,
  currentUserInitial = 'Я'
}) => {
  const [isMaxBrightness, setIsMaxBrightness] = useState(false);
  const [copied, setCopied] = useState(false);

  const cleanNumber = useMemo(() => {
    return (card.number || '778900012345').replace(/\s+/g, '');
  }, [card.number]);

  const categoryLabel = useMemo(() => {
    return CATEGORY_NAMES[card.category || ''] || 'Супермаркет';
  }, [card.category]);

  const gradientClass = useMemo(() => {
    if (card.color && COLOR_GRADIENTS[card.color]) {
      return COLOR_GRADIENTS[card.color];
    }
    return COLOR_GRADIENTS.terra;
  }, [card.color]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate deterministic realistic SVG barcode bars from code
  const barcodeBars = useMemo(() => {
    const bars: { x: number; width: number }[] = [];
    let currentX = 10;
    
    // Start guards
    bars.push({ x: currentX, width: 3 }); currentX += 5;
    bars.push({ x: currentX, width: 2 }); currentX += 4;
    bars.push({ x: currentX, width: 3 }); currentX += 6;

    for (let i = 0; i < cleanNumber.length; i++) {
      const charCode = cleanNumber.charCodeAt(i);
      const w1 = ((charCode * 3 + i) % 4) + 1;
      const space1 = ((charCode * 7 + i) % 3) + 2;
      const w2 = ((charCode * 5 + i * 2) % 4) + 1;
      const space2 = ((charCode * 11 + i * 3) % 3) + 2;

      bars.push({ x: currentX, width: w1 });
      currentX += w1 + space1;
      bars.push({ x: currentX, width: w2 });
      currentX += w2 + space2;
    }

    // Stop guards
    bars.push({ x: currentX, width: 3 }); currentX += 5;
    bars.push({ x: currentX, width: 2 }); currentX += 4;
    bars.push({ x: currentX, width: 3 });

    return { bars, totalWidth: currentX + 15 };
  }, [cleanNumber]);

  return (
    <div className="fixed inset-0 z-[2500] bg-[#FAF6F0] dark:bg-[#121214] text-[#2E3230] dark:text-gray-100 flex flex-col font-body select-none overflow-y-auto no-scrollbar">
      
      {/* 1. Fixed Header (Terra blur + safe area) */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top,0px)] bg-[#FAF6F0]/85 dark:bg-[#121214]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(46,50,48,0.04)] border-b border-[#E4E0D8]/60 dark:border-white/10">
        <div className="h-16 px-4 flex items-center justify-between">
          <button 
            type="button"
            onClick={onClose}
            aria-label="Закрыть модальное окно"
            className="w-11 h-11 flex items-center justify-center rounded-full text-[#4A4E4A] dark:text-stone-300 hover:text-[#2E3230] hover:bg-[#F0ECE4] dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
          
          <h1 className="text-lg font-headline font-semibold tracking-tight text-[#2E3230] dark:text-white text-center truncate px-2">
            Карта лояльности
          </h1>
          
          <div className="w-8 h-8 rounded-full bg-[#4A7C59] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {currentUserInitial}
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1 flex flex-col relative w-full pt-[calc(4.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] px-4">
        <div className="flex flex-col w-full pb-6 pt-1">
          
          {/* Main Loyalty Card Surface */}
          <div className="w-full bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-[0_12px_36px_rgba(46,50,48,0.08)] overflow-hidden flex flex-col transition-all duration-300 border border-[#E4E0D8]/70 dark:border-white/10">
            
            {/* Store Header Card Banner */}
            <div className={`relative bg-gradient-to-br ${gradientClass} text-white p-5 overflow-hidden`}>
              {/* Ambient organic shapes */}
              <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/20 pointer-events-none blur-2xl" />
              <div className="absolute -left-12 -bottom-12 w-36 h-36 rounded-full bg-white/10 pointer-events-none blur-xl" />

              {/* Top Bar: Logo, Name & Quick Dismiss */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 backdrop-blur-sm shadow-sm">
                    {getCardIconElement(card.icon)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-white/90">
                      {categoryLabel}
                    </span>
                    <h2 className="text-xl font-headline font-bold text-white truncate tracking-tight">
                      {card.name}
                    </h2>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть карту"
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Card Sub-bar: Status Badge + Bonus Balance */}
              <div className="relative z-10 mt-5 pt-3 flex items-center justify-between border-t border-white/15">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                  <Star size={15} className="text-[#F8E0A8] fill-[#F8E0A8]" />
                  <span className="text-xs font-semibold tracking-wide text-white">
                    {card.subtitle || 'Карта лояльности'}
                  </span>
                </div>

                {card.balance && (
                  <div className="text-xs font-bold text-white bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
                    {card.balance}
                  </div>
                )}
              </div>
            </div>

            {/* Main Barcode Section */}
            <div className="p-5 flex flex-col items-center">
              
              {/* Utility Row: Standard Type & High Brightness Toggle */}
              <div className="w-full flex items-center justify-between text-xs text-[#4A4E4A] dark:text-stone-400 font-medium mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <ScanLine size={18} className="text-[#4A7C59] dark:text-emerald-400" />
                  <span className="tracking-wide uppercase font-semibold text-[11px]">
                    {card.barcodeFormat === 'qr' ? 'QR-КОД' : 'ШТРИХКОД CODE 128'}
                  </span>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsMaxBrightness(!isMaxBrightness)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full active:scale-95 transition-all cursor-pointer ${
                    isMaxBrightness 
                      ? 'bg-[#F8E0A8] text-[#554020] font-bold shadow-xs' 
                      : 'bg-[#F5F1EA] dark:bg-white/10 hover:bg-[#F0ECE4] text-[#4A4E4A] dark:text-stone-300'
                  }`}
                >
                  <Lightbulb size={16} className={isMaxBrightness ? 'text-[#554020]' : 'text-[#705C30] dark:text-amber-400'} />
                  <span className="font-medium text-[11px] tracking-tight">
                    {isMaxBrightness ? 'Яркость: 100%' : 'Макс. яркость'}
                  </span>
                </button>
              </div>

              {/* Scannable Barcode Canvas Tile */}
              <div 
                className={`w-full bg-white rounded-2xl p-5 shadow-[0_4px_24px_rgba(46,50,48,0.06)] flex flex-col items-center transition-all duration-300 ${
                  isMaxBrightness ? 'ring-4 ring-[#C8E8D0] shadow-[0_0_30px_rgba(255,255,255,0.95)] scale-[1.01]' : 'border border-[#E4E0D8]/60'
                }`}
              >
                {card.barcodeFormat === 'qr' ? (
                  <div className="w-full max-w-[220px] aspect-square flex items-center justify-center py-2">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(cleanNumber)}`}
                      alt={cleanNumber}
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-[280px] h-28 flex items-center justify-center py-1">
                    <svg 
                      className="w-full h-full text-[#2E3230]" 
                      fill="currentColor" 
                      viewBox={`0 0 ${barcodeBars.totalWidth} 110`} 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {barcodeBars.bars.map((bar, idx) => (
                        <rect 
                          key={idx} 
                          x={bar.x} 
                          y={0} 
                          width={bar.width} 
                          height={110} 
                        />
                      ))}
                    </svg>
                  </div>
                )}

                {/* Readable Loyalty Digits */}
                <div 
                  onClick={handleCopy}
                  className="mt-4 font-headline tracking-[0.25em] text-lg sm:text-xl font-bold text-[#2E3230] text-center cursor-pointer hover:opacity-80 transition active:scale-95"
                  title="Нажмите, чтобы скопировать"
                >
                  {formatSpacedCardDigits(cleanNumber)}
                </div>
              </div>

              {/* Presentation Hint & Copy Action */}
              <div className="w-full mt-4 flex items-center px-2 justify-end">
                <button 
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6358] dark:text-stone-300 hover:text-[#2E3230] active:scale-95 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={16} className="text-[#4A7C59]" />
                      <span className="text-[#4A7C59] font-bold">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Скопировать</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Bottom Actions Toolbar */}
            <div className="bg-[#F5F1EA] dark:bg-[#18181A] p-4 flex items-center gap-2 mt-auto border-t border-[#E4E0D8]/60 dark:border-white/10">
              <button 
                type="button"
                onClick={() => onEdit(card)}
                className="flex-1 h-12 rounded-xl bg-white dark:bg-[#252528] text-[#4A4E4A] dark:text-stone-200 hover:text-[#2E3230] hover:bg-[#F0ECE4] active:scale-98 transition-all flex items-center justify-center gap-2 text-xs font-bold tracking-wide uppercase shadow-2xs border border-[#E4E0D8]/50 dark:border-white/5 cursor-pointer"
              >
                <Edit2 size={18} />
                <span>Редактировать</span>
              </button>

              <button 
                type="button"
                onClick={() => onDelete(card)}
                aria-label="Удалить карту"
                className="w-12 h-12 rounded-xl bg-white dark:bg-[#252528] text-[#4A4E4A] dark:text-stone-300 hover:text-[#B83230] hover:bg-[#FFDAD8]/40 active:scale-95 transition-all flex items-center justify-center shadow-2xs border border-[#E4E0D8]/50 dark:border-white/5 cursor-pointer"
                title="Удалить карту"
              >
                <Trash2 size={20} />
              </button>

              <button 
                type="button"
                onClick={onClose}
                className="h-12 px-6 rounded-xl bg-[#2E3230] text-[#F5F0E8] hover:opacity-90 active:scale-98 transition-all flex items-center justify-center text-xs font-bold tracking-wide uppercase shadow-2xs cursor-pointer"
              >
                <span>Закрыть</span>
              </button>
            </div>

          </div>

          {/* Micro-interaction Quick Helper */}
          <div className="mt-4 px-2 text-center">
            <p className="text-[11px] text-[#74796E] dark:text-stone-400 font-medium">
              Штрихкод оптимизирован для бесконтактных лазерных и фотосканеров
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default LoyaltyCardMobileModal;
