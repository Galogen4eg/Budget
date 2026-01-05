
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Snowflake, CreditCard, Repeat, Bot, ChevronLeft, Wallet, Gauge, Gift, FolderOpen } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { updateItemsBatch } from '../utils/db';

import SubscriptionTracker from './SubscriptionTracker';
import DebtSnowball from './DebtSnowball';
import SmartPantry from './SmartPantry';
import AIChat from './AIChat';
import WalletApp from './Wallet';
import MeterReadings from './MeterReadings';
import WishlistApp from './WishlistApp';
import ProjectsApp from './ProjectsApp';

type ServiceType = 'menu' | 'subs' | 'debts' | 'pantry' | 'chat' | 'wallet' | 'meters' | 'wishlist' | 'projects';

const ServicesHub: React.FC = () => {
  const [activeService, setActiveService] = useState<ServiceType>('menu');
  const { 
    settings, members, 
    subscriptions, setSubscriptions,
    debts, setDebts,
    loyaltyCards, setLoyaltyCards,
    meterReadings: readings, setMeterReadings: setReadings,
    wishlist, setWishlist,
    projects, setProjects
  } = useData();
  
  const { familyId } = useAuth();

  // Helper to sync updates to DB
  const handleUpdate = async (collection: string, items: any[], setter: (val: any) => void) => {
      setter(items);
      if (familyId) {
          await updateItemsBatch(familyId, collection, items);
      }
  };

  const ALL_APPS = [
    { 
        id: 'projects', label: 'Проекты', desc: 'Временные бюджеты', icon: <FolderOpen size={24} />, color: '#007AFF', 
        component: <ProjectsApp projects={projects} setProjects={(p) => handleUpdate('projects', p, setProjects)} settings={settings} /> 
    },
    { 
        id: 'wallet', label: 'Wallet', desc: 'Карты лояльности', icon: <Wallet size={24} />, color: '#1C1C1E', 
        component: <WalletApp cards={loyaltyCards} setCards={(c) => handleUpdate('loyalty', c, setLoyaltyCards)} /> 
    },
    { 
        id: 'meters', label: 'Счетчики', desc: 'Показания ЖКХ', icon: <Gauge size={24} />, color: '#FF9500', 
        component: <MeterReadings readings={readings} setReadings={(r) => handleUpdate('readings', r, setReadings)} settings={settings} /> 
    },
    { 
        id: 'subs', label: 'Подписки', desc: 'Регулярные платежи', icon: <Repeat size={24} />, color: '#AF52DE', 
        component: <SubscriptionTracker subscriptions={subscriptions} setSubscriptions={(s) => handleUpdate('subscriptions', s, setSubscriptions)} settings={settings} /> 
    },
    { 
        id: 'wishlist', label: 'Wishlist', desc: 'Подарки и желания', icon: <Gift size={24} />, color: '#FF2D55', 
        component: <WishlistApp wishlist={wishlist} setWishlist={(w) => handleUpdate('wishlist', w, setWishlist)} members={members} settings={settings} /> 
    },
    { 
        id: 'chat', label: 'AI Советник', desc: 'Анализ, Холодильник', icon: <Bot size={24} />, color: '#1C1C1E', 
        component: <AIChat /> 
    },
    { 
        id: 'pantry', label: 'Холодильник', desc: 'Учет продуктов', icon: <Snowflake size={24} />, color: '#34C759', 
        component: <SmartPantry /> 
    },
    { 
        id: 'debts', label: 'Долги', desc: 'Метод снежного кома', icon: <CreditCard size={24} />, color: '#FF3B30', 
        component: <DebtSnowball debts={debts} setDebts={(d) => handleUpdate('debts', d, setDebts)} settings={settings} /> 
    },
  ];

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
            {ALL_APPS.filter(app => settings.enabledServices.includes(app.id)).map(app => (
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
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="service"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setActiveService('menu')} className="p-2 bg-white dark:bg-[#1C1C1E] rounded-full shadow-sm border border-gray-100 dark:border-white/5 text-gray-500 dark:text-gray-300">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black text-[#1C1C1E] dark:text-white">
                {ALL_APPS.find(a => a.id === activeService)?.label}
              </h2>
            </div>
            {ALL_APPS.find(a => a.id === activeService)?.component}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServicesHub;
