
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Snowflake, CreditCard, Repeat, Bot, ChevronLeft, Wallet, Gauge, Gift, FolderOpen, TrendingUp } from 'lucide-react';
import { useData } from '../contexts/DataContext';

import DebtSnowball from './DebtSnowball';
import SmartPantry from './SmartPantry';
import AIChat from './AIChat';
import WalletApp from './Wallet';
import WishlistApp from './WishlistApp';
import ProjectsApp from './ProjectsApp';
import CashFlowForecast from './CashFlowForecast';

type ServiceType = 'menu' | 'debts' | 'pantry' | 'chat' | 'wallet' | 'wishlist' | 'projects' | 'forecast';

const ServicesHub: React.FC = () => {
  const [activeService, setActiveService] = useState<ServiceType>('menu');
  const { 
    settings, members, 
    debts, setDebts,
    loyaltyCards, setLoyaltyCards,
    wishlist, setWishlist,
    projects, setProjects,
    transactions, totalBalance,
    savingsRate 
  } = useData();
  
  const ALL_APPS = [
    { 
        id: 'forecast', label: 'Прогноз', desc: 'Cash Flow & Анализ', icon: <TrendingUp size={24} />, color: '#AF52DE', 
        component: <CashFlowForecast transactions={transactions} settings={settings} currentBalance={totalBalance} savingsRate={savingsRate} onClose={() => setActiveService('menu')} /> 
    },
    { 
        id: 'projects', label: 'Проекты', desc: 'Временные бюджеты', icon: <FolderOpen size={24} />, color: '#007AFF', 
        component: <ProjectsApp projects={projects} setProjects={setProjects} settings={settings} /> 
    },
    { 
        id: 'wallet', label: 'Wallet', desc: 'Карты лояльности', icon: <Wallet size={24} />, color: '#1C1C1E', 
        component: <WalletApp cards={loyaltyCards} setCards={setLoyaltyCards} /> 
    },
    { 
        id: 'wishlist', label: 'Wishlist', desc: 'Подарки и желания', icon: <Gift size={24} />, color: '#FF2D55', 
        component: <WishlistApp wishlist={wishlist} setWishlist={setWishlist} members={members} settings={settings} /> 
    },
    { 
        id: 'chat', label: 'AI Ассистент', desc: 'Чат, Советы, Управление', icon: <Bot size={24} />, color: '#1C1C1E', 
        component: <AIChat /> 
    },
    { 
        id: 'pantry', label: 'Холодильник', desc: 'Учет продуктов', icon: <Snowflake size={24} />, color: '#34C759', 
        component: <SmartPantry /> 
    },
    { 
        id: 'debts', label: 'Долги', desc: 'Метод снежного кома', icon: <CreditCard size={24} />, color: '#FF3B30', 
        component: <DebtSnowball debts={debts} setDebts={setDebts} settings={settings} /> 
    },
  ];

  // Filter apps based on settings
  const displayedApps = ALL_APPS.filter(app => (settings.enabledServices || []).includes(app.id));

  return (
    <div className="space-y-6 w-full">
      <AnimatePresence mode="wait">
        {activeService === 'menu' ? (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {displayedApps.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-gray-100 dark:border-white/10 rounded-[2.5rem]">
                    Нет активных сервисов.<br/>Включите их в настройках.
                </div>
            ) : (
                displayedApps.map(app => (
                  <button
                    key={app.id}
                    onClick={() => setActiveService(app.id as ServiceType)}
                    className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] shadow-soft dark:shadow-none border border-white dark:border-white/5 flex flex-col items-center text-center gap-3 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-all ios-btn-active"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: app.color }}>
                      {app.icon}
                    </div>
                    <div>
                      <h3 className="font-black text-[#1C1C1E] dark:text-white text-sm">{app.label}</h3>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">{app.desc}</p>
                    </div>
                  </button>
                ))
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="service"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {activeService !== 'forecast' && (
                <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setActiveService('menu')} className="p-2 bg-white dark:bg-[#1C1C1E] rounded-full shadow-sm border border-gray-100 dark:border-white/5 text-gray-500 dark:text-gray-300">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-black text-[#1C1C1E] dark:text-white">
                    {ALL_APPS.find(a => a.id === activeService)?.label}
                </h2>
                </div>
            )}
            {ALL_APPS.find(a => a.id === activeService)?.component}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServicesHub;
