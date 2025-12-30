
import React from 'react';
import { motion } from 'framer-motion';
import { AppSettings } from '../types';
import { Wallet, Coins, Lock, Eye, EyeOff } from 'lucide-react';

interface SmartHeaderProps {
  balance: number;
  savingsRate: number;
  settings: AppSettings;
  onTogglePrivacy?: () => void;
  className?: string;
}

const SmartHeader: React.FC<SmartHeaderProps> = ({ balance, savingsRate, settings, onTogglePrivacy, className = '' }) => {
  const now = new Date();
  
  // Logic to find closest salary date
  const salaryDates = settings.salaryDates && settings.salaryDates.length > 0 
    ? settings.salaryDates 
    : [settings.startOfMonthDay]; // Fallback

  const sortedDates = [...salaryDates].sort((a, b) => a - b);
  let nextSalaryDate: Date | null = null;
  
  for (const day of sortedDates) {
      if (day > now.getDate()) {
          nextSalaryDate = new Date(now.getFullYear(), now.getMonth(), day);
          break;
      }
  }

  if (!nextSalaryDate) {
      nextSalaryDate = new Date(now.getFullYear(), now.getMonth() + 1, sortedDates[0]);
  }
  
  const diffTime = Math.abs(nextSalaryDate.getTime() - now.getTime());
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  const fixedExpensesTotal = (settings.mandatoryExpenses || []).reduce((sum, item) => sum + item.amount, 0);
  const savingsAmount = balance * (savingsRate / 100);
  const reservedAmount = savingsAmount + fixedExpensesTotal;
  const availableBalance = Math.max(0, balance - reservedAmount);
  const dailyBudget = availableBalance / daysRemaining;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${className}`}>
      <div className="relative overflow-hidden bg-white rounded-[3rem] p-8 shadow-soft border border-white transition-all flex flex-col justify-center min-h-[200px]">
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wallet size={16} className="text-blue-500" />
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Общий баланс</p>
            {onTogglePrivacy && (
              <button 
                onClick={(e) => { e.stopPropagation(); onTogglePrivacy(); }}
                className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-blue-500 transition-all cursor-pointer"
                title={settings.privacyMode ? "Показать" : "Скрыть"}
              >
                {settings.privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className={`transition-all duration-500 ${settings.privacyMode ? 'blur-xl select-none' : ''}`}>
              <motion.div 
                key={balance}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-6xl font-black text-[#1C1C1E] text-center tracking-tighter tabular"
              >
                {balance.toLocaleString('ru-RU')}
              </motion.div>
            </div>
            <span className="text-3xl font-black text-blue-500/20 mb-2">{settings.currency}</span>
          </div>
          
          {(savingsRate > 0 || fixedExpensesTotal > 0) && (
              <div className="flex justify-center mt-6">
                  <div className="bg-gray-50 px-4 py-2 rounded-2xl flex items-center gap-2 border border-gray-100">
                      <Lock size={12} className="text-gray-400" />
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wide">
                          Резерв: {Math.round(reservedAmount).toLocaleString()}
                      </span>
                  </div>
              </div>
          )}
        </div>
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-tr from-blue-50/30 via-transparent to-purple-50/30 pointer-events-none" />
      </div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-blue-600 to-blue-500 p-8 rounded-[3rem] shadow-[0_20px_40px_rgba(59,130,246,0.3)] relative overflow-hidden flex flex-col justify-center min-h-[200px]"
      >
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <Coins size={14} className="text-blue-100" />
            <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Бюджет на сегодня</p>
          </div>
          <div className={`transition-all duration-500 ${settings.privacyMode ? 'blur-md select-none' : ''}`}>
            <p className="text-5xl font-black text-white tracking-tighter tabular">
              {dailyBudget.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} {settings.currency}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <div className="bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
              <span className="text-[9px] text-white font-black uppercase tracking-wide">{daysRemaining} дней до ЗП</span>
            </div>
            <div className="bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
              <span className="text-[9px] text-white font-black uppercase tracking-wide">Копим {savingsRate}%</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SmartHeader;
