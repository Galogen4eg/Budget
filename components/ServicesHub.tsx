import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ChevronLeft, ChevronRight, Wallet, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TerraMobileHeader from './TerraMobileHeader';
import { SURFACE_CARD, PAGE_HEADING } from './filterUiTokens';

import DebtSnowball from './DebtSnowball';
import WalletApp from './Wallet';
import FnsReceiptScanner from './FnsReceiptScanner';

type ServiceType = 'menu' | 'debts' | 'wallet' | 'receipts';

interface ServicesHubProps {
  initialService?: string | null;
  onClearService?: () => void;
  onNavigateHome?: () => void;
  onOpenSettings?: () => void;
}

const ServicesHub: React.FC<ServicesHubProps> = ({ 
  initialService, 
  onClearService, 
  onNavigateHome,
  onOpenSettings
}) => {
  const isValidService = (value: string | null | undefined): value is ServiceType =>
    value === 'menu' || value === 'debts' || value === 'wallet' || value === 'receipts';
  const [activeService, setActiveService] = useState<ServiceType>(() => isValidService(initialService) ? initialService : 'menu');
  const scrollRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=0;},[activeService]);
  const { 
    financialSettings: settings, 
    debts, setDebts,
    loyaltyCards, setLoyaltyCards,
    transactions
  } = useData();

  useEffect(() => {
    if (isValidService(initialService) && initialService !== activeService) {
      setActiveService(initialService);
    }
    if (initialService && onClearService) {
      onClearService();
    }
  }, [initialService, onClearService]);
  
  const SERVICES = [
    { 
      id: 'debts', 
      label: 'Долги', 
      desc: 'Кредиты и платежи', 
      hasAttention: debts && debts.length > 0,
      icon: (
        <svg className="w-6 h-6 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect height="14" rx="3" strokeLinecap="round" strokeLinejoin="round" width="20" x="2" y="5" />
          <line strokeLinecap="round" x1="2" x2="22" y1="10" y2="10" />
          <line strokeLinecap="round" x1="6" x2="9" y1="15" y2="15" />
        </svg>
      ),
      component: (
        <DebtSnowball 
          debts={debts} 
          setDebts={setDebts} 
          settings={settings} 
          transactions={transactions} 
          onClose={() => setActiveService('menu')}
        />
      )
    },
    { 
      id: 'wallet', 
      label: 'Wallet', 
      desc: 'Карты лояльности и скидки', 
      hasAttention: false,
      icon: (
        <svg className="w-6 h-6 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 9.5h18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      component: (
        <WalletApp 
          cards={loyaltyCards} 
          setCards={setLoyaltyCards} 
          onClose={() => setActiveService('menu')}
        />
      )
    },
    { 
      id: 'receipts', 
      label: 'Чеки ФНС и выписки', 
      desc: 'Сканирование чеков и импорт покупок', 
      hasAttention: false,
      icon: (
        <ShieldCheck className="w-6 h-6 stroke-[1.8]" />
      ),
      component: (
        <FnsReceiptScanner 
          onClose={() => setActiveService('menu')}
        />
      )
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col min-w-0 w-full h-full overflow-hidden">
      {/* Mobile Top Header */}
      <div className="md:hidden shrink-0">
        <TerraMobileHeader 
          title="Сервисы" 
          onOpenSettings={onOpenSettings} 
        />
      </div>

      <div ref={scrollRef} data-testid="services-scroll-container" className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain no-scrollbar w-full max-w-6xl mx-auto px-3 py-2.5 sm:p-6 md:p-8 pt-2 sm:pt-4 md:pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 space-y-4">
        {activeService === 'menu' ? (
          <div className="flex flex-col space-y-3 sm:space-y-5">
            {/* Desktop-only SectionHeaderCard */}
            <div className="hidden md:flex flex-col space-y-4">
              <div className={SURFACE_CARD} data-purpose="services-header">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h1 className={PAGE_HEADING}>
                    Сервисы
                  </h1>
                  
                </div>
                
              </div>
            </div>

            {/* BEGIN: Services Grid (Compact 2-col on mobile, 3-col on desktop) */}
            <div className="grid grid-cols-1 min-[375px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" data-purpose="service-cards-grid">
              {SERVICES.map(app => (
                <button
                  type="button"
                  key={app.id}
                  onClick={() => setActiveService(app.id as ServiceType)}
                  className={`${SURFACE_CARD} relative flex min-h-[124px] flex-col justify-between text-left transition-colors terra-press hover:border-[#4A7C59]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] group cursor-pointer`}
                >
                  <div>
                    {/* Card Top Bar: Icon and Arrow */}
                    <div className="flex items-start justify-between mb-2 sm:mb-3.5">
                      {/* Icon with Sage/Mint Rounded Container */}
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#EBF4EE] dark:bg-[#243628] border border-[#D8E8DE] dark:border-green-800/40 flex items-center justify-center text-[#3B7A57] dark:text-emerald-400 shadow-2xs shrink-0 [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6">
                        {app.icon}
                      </div>

                      <div className="text-stone-400 dark:text-stone-500 group-hover:text-[#3B7A57] dark:group-hover:text-emerald-400 transition-colors p-0.5 sm:p-1">
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Title and Description */}
                    <div>
                      <h2 className="text-sm sm:text-base font-semibold text-[var(--terra-ink)] dark:text-white leading-snug break-words">
                        {app.label}
                      </h2>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed line-clamp-2">
                        {app.desc}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {/* END: Services Grid */}
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {activeService !== 'debts' && (
              <div className="flex items-center gap-3 mb-2">
                <button 
                  type="button"
                  onClick={() => setActiveService('menu')} 
                  className="min-h-[44px] px-3.5 py-1.5 bg-white dark:bg-[var(--terra-surface)] hover:bg-stone-50 dark:hover:bg-[var(--terra-soft)] rounded-xl shadow-xs border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Ко всем сервисам</span>
                </button>
                <h2 className="text-base font-bold text-stone-800 dark:text-white">
                  {SERVICES.find(a => a.id === activeService)?.label}
                </h2>
              </div>
            )}
            {SERVICES.find(a => a.id === activeService)?.component}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesHub;
