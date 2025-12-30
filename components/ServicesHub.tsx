
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Box, CreditCard, Repeat, Bot, ChevronLeft, Wallet } from 'lucide-react';
import { AppSettings, FamilyEvent, FamilyMember, Subscription, Debt, PantryItem, MeterReading, Transaction, SavingsGoal, LoyaltyCard } from '../types';
import SubscriptionTracker from './SubscriptionTracker';
import DebtSnowball from './DebtSnowball';
import SmartPantry from './SmartPantry';
import MeterReadings from './MeterReadings';
import AIChat from './AIChat';
import WalletApp from './Wallet';

interface ServicesHubProps {
  events: FamilyEvent[];
  // Adjusted to accept a functional update or direct array for easier sync
  setEvents: (e: FamilyEvent[] | ((prev: FamilyEvent[]) => FamilyEvent[])) => void;
  settings: AppSettings;
  members: FamilyMember[];
  subscriptions: Subscription[];
  setSubscriptions: (s: Subscription[]) => void;
  debts: Debt[];
  setDebts: (d: Debt[]) => void;
  pantry: PantryItem[];
  setPantry: (p: PantryItem[]) => void;
  meterReadings: MeterReading[];
  setMeterReadings: (m: MeterReading[]) => void;
  transactions: Transaction[];
  goals: SavingsGoal[];
  loyaltyCards: LoyaltyCard[];
  setLoyaltyCards: (c: LoyaltyCard[]) => void;
}

type ServiceType = 'menu' | 'subs' | 'debts' | 'pantry' | 'meters' | 'chat' | 'wallet';

const ServicesHub: React.FC<ServicesHubProps> = (props) => {
  const [activeService, setActiveService] = useState<ServiceType>('menu');

  const handleCreateEvent = (newEvent: FamilyEvent) => {
     // Using functional update to ensure we have latest state if passed
     props.setEvents((prev) => [...prev, newEvent]);
  };

  const ALL_APPS = [
    { id: 'wallet', label: 'Wallet', desc: 'Карты лояльности', icon: <Wallet size={24} />, color: '#1C1C1E', component: <WalletApp cards={props.loyaltyCards} setCards={props.setLoyaltyCards} /> },
    { id: 'subs', label: 'Подписки', desc: 'Регулярные платежи', icon: <Repeat size={24} />, color: '#AF52DE', component: <SubscriptionTracker subscriptions={props.subscriptions} setSubscriptions={props.setSubscriptions} settings={props.settings} /> },
    { id: 'chat', label: 'AI Советник', desc: 'Анализ и Календарь', icon: <Bot size={24} />, color: '#1C1C1E', component: <AIChat transactions={props.transactions} goals={props.goals} debts={props.debts} settings={props.settings} onCreateEvent={handleCreateEvent} /> },
    { id: 'meters', label: 'Счетчики', desc: 'Вода, Свет, Газ', icon: <Zap size={24} />, color: '#FF9500', component: <MeterReadings readings={props.meterReadings} setReadings={props.setMeterReadings} settings={props.settings} /> },
    { id: 'pantry', label: 'Кладовка', desc: 'Учет продуктов', icon: <Box size={24} />, color: '#34C759', component: <SmartPantry items={props.pantry} setItems={props.setPantry} /> },
    { id: 'debts', label: 'Долги', desc: 'Метод снежного кома', icon: <CreditCard size={24} />, color: '#FF3B30', component: <DebtSnowball debts={props.debts} setDebts={props.setDebts} settings={props.settings} /> },
  ];

  const visibleApps = ALL_APPS.filter(app => props.settings.enabledServices?.includes(app.id));

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {activeService === 'menu' ? (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-2 gap-4"
          >
            {visibleApps.map(app => (
              <button
                key={app.id}
                onClick={() => setActiveService(app.id as ServiceType)}
                className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white flex flex-col items-center text-center gap-3 hover:bg-gray-50 transition-all ios-btn-active"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: app.color }}>
                  {app.icon}
                </div>
                <div>
                  <h3 className="font-black text-[#1C1C1E] text-sm">{app.label}</h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">{app.desc}</p>
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
              <button onClick={() => setActiveService('menu')} className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-500">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black text-[#1C1C1E]">
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
