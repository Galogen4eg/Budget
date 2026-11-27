import { FinancialDataState } from './FinancialDataState';
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
  onOpenNotifications?: () => void;
}

const ServicesHub: React.FC<ServicesHubProps> = ({ 
  initialService, 
  onClearService, 
  onNavigateHome,
  onOpenSettings,
  onOpenNotifications
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
    transactions,financialDataStatus,retryFinancialData,workspaceStatuses,retryWorkspace
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
      desc: 'Кредиты, долги и погашение', 
      hasAttention: debts && debts.length > 0,
      icon: (
        <svg className="w-6 h-6 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect height="14" rx="3" strokeLinecap="round" strokeLinejoin="round" width="20" x="2" y="5" />
          <line strokeLinecap="round" x1="2" x2="22" y1="10" y2="10" />
          <line strokeLinecap="round" x1="6" x2="9" y1="15" y2="15" />
        </svg>
      ),
      component: (
        financialDataStatus!=='ready'?<FinancialDataState status={financialDataStatus} onRetry={retryFinancialData} onSettings={onOpenSettings}/>:<DebtSnowball 
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
      label: 'Карты лояльности', 
      desc: 'Сохранённые дисконтные карты', 
      hasAttention: false,
      icon: (
        <svg className="w-6 h-6 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 9.5h18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      component: (
        workspaceStatuses.wallet!=='ready'?<div className="flex flex-col gap-2"><button type="button" className="min-h-[44px] text-left text-[var(--terra-primary-text)]" onClick={()=>setActiveService('menu')}>Все сервисы</button><FinancialDataState status={workspaceStatuses.wallet} section="карты лояльности" onRetry={retryWorkspace}/></div>:<WalletApp 
          cards={loyaltyCards} 
          setCards={setLoyaltyCards} 
          onClose={() => setActiveService('menu')}
        />
      )
    },
    { 
      id: 'receipts', 
      label: 'Чеки ФНС и выписки', 
      desc: 'Просмотр реквизитов QR-кода чека', 
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
          onOpenNotifications={onOpenNotifications} 
        />
      </div>

      <div ref={scrollRef} data-testid="services-scroll-container" className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain no-scrollbar w-full max-w-[1440px] mx-auto px-4 py-2.5 sm:p-6 md:p-8 pt-2 sm:pt-4 md:pt-6 pb-4 md:pb-8 space-y-4">
        {activeService === 'menu' ? (
          <div className="flex flex-col space-y-3 sm:space-y-5">
            <h1 className={`hidden md:block ${PAGE_HEADING}`}>Сервисы</h1>
            {/* BEGIN: Services Grid (Compact 2-col on mobile, 3-col on desktop) */}
            <div className="terra-service-grid" data-purpose="service-cards-grid">
              {SERVICES.map(app => (
                <button
                  type="button"
                  key={app.id}
                  onClick={() => setActiveService(app.id as ServiceType)}
                  className="terra-service-row min-h-[76px] flex items-center gap-3 px-3 py-3 text-left hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] transition-colors terra-press"
                >
                  <span className="w-11 h-11 rounded-xl bg-[var(--terra-primary-soft)] flex items-center justify-center text-[var(--terra-primary-text)] shrink-0" aria-hidden="true">{app.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-base font-semibold leading-snug break-words">{app.label}</span>
                    <span className="block text-sm text-[var(--terra-muted)] mt-0.5 break-words">{app.desc}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 shrink-0 text-[var(--terra-muted)]" aria-hidden="true"/>
                </button>
              ))}
            </div>
            {/* END: Services Grid */}
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {activeService !== 'debts' && (
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setActiveService('menu')} 
                  className="min-h-[44px] px-3.5 py-1.5 bg-white dark:bg-[var(--terra-surface)] hover:bg-stone-50 dark:hover:bg-[var(--terra-soft)] rounded-xl shadow-xs border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition  cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Все сервисы</span>
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
