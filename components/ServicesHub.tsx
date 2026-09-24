import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ChevronLeft, Wallet, MoreHorizontal } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TerraMobileHeader from './TerraMobileHeader';

import DebtSnowball from './DebtSnowball';
import WalletApp from './Wallet';

type ServiceType = 'menu' | 'debts' | 'wallet';

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
  const [activeService, setActiveService] = useState<ServiceType>(() => (initialService as ServiceType) || 'menu');
  const { 
    settings, 
    debts, setDebts,
    loyaltyCards, setLoyaltyCards,
    transactions
  } = useData();

  useEffect(() => {
    if (initialService && initialService !== activeService) {
      setActiveService(initialService as ServiceType);
    }
    if (initialService && onClearService) {
      onClearService();
    }
  }, [initialService, onClearService]);
  
  const SERVICES = [
    { 
      id: 'debts', 
      label: 'Долги', 
      desc: 'Управление выплатами, кредитами и стратегией', 
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
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 w-full h-full overflow-hidden">
      {/* Mobile Top Header */}
      <div className="md:hidden shrink-0">
        <TerraMobileHeader 
          title="Сервисы" 
          onOpenSettings={onOpenSettings} 
        />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar w-full max-w-5xl mx-auto p-4 md:p-8 pt-3 md:pt-6 pb-16 md:pb-8 space-y-4">
        {activeService === 'menu' ? (
          <div className="flex flex-col space-y-4">
            {/* Desktop-only SectionHeaderCard */}
            <div className="hidden md:flex flex-col space-y-4">
              <div className="bg-white dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/10 rounded-2xl p-5 shadow-[0_2px_8px_rgba(50,40,30,0.03)]" data-purpose="services-header">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h1 className="text-[22px] font-bold tracking-tight text-stone-900 dark:text-white leading-tight">
                    Финансовые сервисы
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f1ede6] dark:bg-white/10 text-stone-600 dark:text-stone-300 border border-stone-200/60 dark:border-white/10 whitespace-nowrap">
                    {SERVICES.length} сервиса
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
                  Специализированные инструменты управления задолженностями, ликвидностью и картами
                </p>
              </div>
            </div>

            {/* BEGIN: ServicesList */}
            <div className="flex flex-col space-y-3.5" data-purpose="service-cards-stack">
              {SERVICES.map(app => (
                <article
                  key={app.id}
                  onClick={() => setActiveService(app.id as ServiceType)}
                  className="touch-bounce bg-white dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/10 rounded-2xl p-5 shadow-[0_3px_10px_rgba(40,35,30,0.04)] relative transition-all duration-200 hover:border-[#3B7A57]/40 hover:shadow-[0_4px_16px_rgba(59,122,87,0.08)] active:scale-[0.985] cursor-pointer"
                >
                  {/* Card Top Bar: Icon and Direct Action */}
                  <div className="flex items-start justify-between mb-4">
                    {/* Icon with Sage/Mint Rounded Container */}
                    <div className="w-12 h-12 rounded-xl bg-[#EBF4EE] dark:bg-[#243628] border border-[#D8E8DE] dark:border-green-800/40 flex items-center justify-center text-[#3B7A57] dark:text-emerald-400 shadow-xs">
                      {app.icon}
                    </div>

                    {/* "Открыть →" Link */}
                    <div className="inline-flex items-center text-[13px] font-medium text-stone-700 dark:text-stone-300 hover:text-[#3B7A57] dark:hover:text-emerald-400 transition-colors py-1 group">
                      <span>Открыть</span>
                      <span className="ml-1 text-sm font-semibold transition-transform group-hover:translate-x-0.5">→</span>
                    </div>
                  </div>

                  {/* Title and Description with Attention Indicator */}
                  <div className="mb-5 relative">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">
                        {app.label}
                      </h2>
                      {app.hasAttention && (
                        <span className="w-2 h-2 rounded-full bg-[#E15241] animate-pulse" title="Требуется внимание" />
                      )}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                      {app.desc}
                    </p>
                  </div>

                  {/* Card Footer Action Separator */}
                  <div className="pt-3 border-t border-stone-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-[#3B7A57] dark:hover:text-emerald-400 transition-colors">
                      Перейти в модуль
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
                  </div>
                </article>
              ))}
            </div>
            {/* END: ServicesList */}
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {activeService !== 'debts' && (
              <div className="flex items-center gap-3 mb-2">
                <button 
                  type="button"
                  onClick={() => setActiveService('menu')} 
                  className="px-3.5 py-1.5 bg-white dark:bg-[#1C1C1E] hover:bg-stone-50 dark:hover:bg-[#2C2C2E] rounded-xl shadow-xs border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
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
