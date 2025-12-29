
import React from 'react';
import { motion } from 'framer-motion';
import { AppSettings } from '../types';
import { Wallet, Coins } from 'lucide-react';

interface SmartHeaderProps {
  balance: number;
  savingsRate: number;
  settings: AppSettings;
}

const SmartHeader: React.FC<SmartHeaderProps> = ({ balance, savingsRate, settings }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  let targetDate = new Date(currentYear, currentMonth, settings.startOfMonthDay);
  if (now.getDate() >= settings.startOfMonthDay) {
    targetDate = new Date(currentYear, currentMonth + 1, settings.startOfMonthDay);
  }
  
  const diffTime = Math.abs(targetDate.getTime() - now.getTime());
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const dailyBudget = Math.max(0, (balance * (1 - savingsRate / 100)) / daysRemaining);

  return (
    <div className="mb-12 space-y-6">
      <div className="relative overflow-hidden bg-white rounded-[3rem] p-12 shadow-soft border border-white transition-all">
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Wallet size={16} className="text-blue-500" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Общий баланс</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className={`transition-all duration-500 ${settings.privacyMode ? 'blur-2xl hover:blur-none' : ''}`}>
              <motion.div 
                key={balance}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-7xl font-black text-[#1C1C1E] text-center tracking-tighter tabular"
              >
                {balance.toLocaleString('ru-RU')}
              </motion.div>
            </div>
            <span className="text-5xl font-black text-blue-500/20">{settings.currency}</span>
          </div>
        </div>
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-tr from-blue-50/40 via-transparent to-purple-50/40 pointer-events-none" />
      </div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-blue-600 to-blue-500 p-8 rounded-[2.5rem] shadow-[0_20px_40px_rgba(59,130,246,0.3)] relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-1.5">
            <Coins size={14} className="text-blue-100" />
            <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Бюджет на сегодня</p>
          </div>
          <div className={`transition-all duration-500 ${settings.privacyMode ? 'blur-md' : ''}`}>
            <p className="text-5xl font-black text-white tracking-tighter tabular">
              {dailyBudget.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} {settings.currency}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            <div className="bg-white/15 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <span className="text-[10px] text-white font-black uppercase tracking-wide">{daysRemaining} дней до ЗП</span>
            </div>
            <div className="bg-white/15 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <span className="text-[10px] text-white font-black uppercase tracking-wide">Копим {savingsRate}%</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SmartHeader;
