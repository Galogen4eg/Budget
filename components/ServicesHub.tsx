import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ChevronLeft, Wallet } from 'lucide-react';
import { useData } from '../contexts/DataContext';

import DebtSnowball from './DebtSnowball';
import WalletApp from './Wallet';

type ServiceType = 'menu' | 'debts' | 'wallet';

interface ServicesHubProps {
  initialService?: string | null;
  onClearService?: () => void;
}

const ServicesHub: React.FC<ServicesHubProps> = ({ initialService, onClearService }) => {
  const [activeService, setActiveService] = useState<ServiceType>('menu');
  const { 
    settings, 
    debts, setDebts,
    loyaltyCards, setLoyaltyCards,
    transactions
  } = useData();

  useEffect(() => {
    if (initialService) {
      setActiveService(initialService as ServiceType);
      if (onClearService) onClearService();
    }
  }, [initialService, onClearService]);
  
  const SERVICES = [
    { 
      id: 'debts', 
      label: 'Долги', 
      desc: 'Управление выплатами, кредитами и стратегией', 
      icon: <CreditCard className="w-6 h-6" />, 
      color: '#4a7c59',
      bgColor: 'bg-[#edf4ef] dark:bg-[#243628]',
      iconColor: 'text-[#4a7c59] dark:text-[#839f85]',
      borderColor: 'border-[#d1dbd1] dark:border-green-800/40',
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
      icon: <Wallet className="w-6 h-6" />, 
      color: '#3B6E4C',
      bgColor: 'bg-[#EDF5F0] dark:bg-[#1E3024]',
      iconColor: 'text-[#3B6E4C] dark:text-[#6EE7B7]',
      borderColor: 'border-[#D4E8DC] dark:border-[#2C4A35]',
      component: (
        <WalletApp 
          cards={loyaltyCards} 
          setCards={setLoyaltyCards} 
        />
      )
    },
  ];

  return (
    <div className="space-y-6 w-full">
      <AnimatePresence mode="wait">
        {activeService === 'menu' ? (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Header / Intro */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 border border-surface-border dark:border-white/5 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-bold text-graphite dark:text-white">
                  Финансовые сервисы
                </h2>
                <p className="text-xs text-graphite-muted dark:text-gray-400 mt-1">
                  Специализированные инструменты управления задолженностями, ликвидностью и картами
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary dark:text-green-400 text-xs font-bold border border-primary/20">
                <span>{SERVICES.length} сервиса</span>
              </div>
            </div>

            {/* Service Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {SERVICES.map(app => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setActiveService(app.id as ServiceType)}
                  className="group bg-white dark:bg-[#1C1C1E] p-6 rounded-3xl border border-surface-border dark:border-white/5 hover:border-primary/40 dark:hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left relative overflow-hidden active:scale-[0.99] cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${app.bgColor} ${app.iconColor} border ${app.borderColor} shadow-xs group-hover:scale-105 transition-transform duration-200`}>
                        {app.icon}
                      </div>
                      <span className="text-xs font-bold text-graphite-muted dark:text-gray-500 group-hover:text-primary dark:group-hover:text-green-400 transition-colors flex items-center gap-1">
                        Открыть →
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-graphite dark:text-white text-lg group-hover:text-primary dark:group-hover:text-green-400 transition-colors">
                      {app.label}
                    </h3>
                    <p className="text-xs text-graphite-muted dark:text-gray-400 mt-1.5 leading-relaxed">
                      {app.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#F2EFEB] dark:border-white/5 flex items-center justify-between text-[11px] font-semibold text-graphite-muted dark:text-gray-400">
                    <span>Перейти в модуль</span>
                    <span className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-700 group-hover:bg-primary transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="service"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeService !== 'debts' && (
              <div className="flex items-center gap-3 mb-6">
                <button 
                  type="button"
                  onClick={() => setActiveService('menu')} 
                  className="px-3.5 py-2 bg-white dark:bg-[#1C1C1E] hover:bg-surface-subtle dark:hover:bg-[#2C2C2E] rounded-2xl shadow-sm border border-surface-border dark:border-white/5 text-graphite dark:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Ко всем сервисам</span>
                </button>
                <h2 className="text-lg font-display font-bold text-graphite dark:text-white">
                  {SERVICES.find(a => a.id === activeService)?.label}
                </h2>
              </div>
            )}
            {SERVICES.find(a => a.id === activeService)?.component}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServicesHub;
