
import React from 'react';
import { motion } from 'framer-motion';
import { AppSettings } from '../types';
import { Wallet, Coins, Lock, Eye, EyeOff } from 'lucide-react';

interface SmartHeaderProps {
  balance: number;
  savingsRate: number;
  settings: AppSettings;
  onTogglePrivacy?: () => void;
}

const SmartHeader: React.FC<SmartHeaderProps> = ({ balance, savingsRate, settings, onTogglePrivacy }) => {
  const now = new Date();
  
  // Logic to find closest salary date
  const salaryDates = settings.salaryDates && settings.salaryDates.length > 0 
    ? settings.salaryDates 
    : [settings.startOfMonthDay]; // Fallback

  // Sort dates to be sure
  const sortedDates = [...salaryDates].sort((a, b) => a - b);
  
  let nextSalaryDate: Date | null = null;
  
  // Find first date in current month that is upcoming
  for (const day of sortedDates) {
      if (day > now.getDate()) {
          nextSalaryDate = new Date(now.getFullYear(), now.getMonth(), day);
          break;
      }
  }

  // If no date found in current month, take the first date of next month
  if (!nextSalaryDate) {
      nextSalaryDate = new Date(now.getFullYear(), now.getMonth() + 1, sortedDates[0]);
  }
  
  const diffTime = Math.abs(nextSalaryDate.getTime() - now.getTime());
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  // Calculate Mandatory Costs (Fixed Expenses)
  const fixedExpensesTotal = (settings.mandatoryExpenses || []).reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate Available Balance for Daily Budget
  // Formula: Balance - (Balance * Savings%) - FixedExpenses
  // Note: We assume Fixed Expenses haven't been paid yet from this balance. 
  // If they are paid, they should be transactions, and balance would lower naturally.
  // Ideally, this logic tracks "Reserved" funds.
  
  const savingsAmount = balance * (savingsRate / 100);
  const reservedAmount = savingsAmount + fixedExpensesTotal;
  const availableBalance = Math.max(0, balance - reservedAmount);
  
  const dailyBudget = availableBalance / daysRemaining;

  return (
    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="relative overflow-hidden bg-white rounded-[3rem] p-10 md:p-12 shadow-soft border border-white transition-all flex flex-col justify-center min-h-[220px]">
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Wallet size={16} className="text-blue-500" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Общий баланс</p>
            {onTogglePrivacy && (
              <button 
                onClick={onTogglePrivacy} 
                className="ml-1 p-1 text-gray-300 hover:text-blue-500 transition-colors"
                title={settings.privacyMode ? "Показать" : "Скрыть"}
              >
                {settings.privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className={`transition-all duration-500 ${settings.privacyMode ? 'blur-2xl hover:blur-none' : ''}`}>
              <motion.div 
                key={balance}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl md:text-7xl font-black text-[#1C1C1E] text-center tracking-tighter tabular"
              >
                {balance.toLocaleString('ru-RU')}
              </motion.div>
            </div>
            <span className="text-4xl md:text-5xl font-black text-blue-500/20">{settings.currency}</span>
          </div>
          
          {/* Reserved Indicator */}
          {(savingsRate > 0 || fixedExpensesTotal > 0) && (
              <div className="flex justify-center mt-4">
                  <div className="bg-gray-50 px-4 py-2 rounded-2xl flex items-center gap-2 border border-gray-100">
                      <Lock size={12} className="text-gray-400" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
                          Резерв: {Math.round(reservedAmount).toLocaleString()} {settings.currency}
                      </span>
                  </div>
              </div>
          )}
        </div>
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-tr from-blue-50/40 via-transparent to-purple-50/40 pointer-events-none" />
      </div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-blue-600 to-blue-500 p-8 rounded-[2.5rem] shadow-[0_20px_40px_rgba(59,130,246,0.3)] relative overflow-hidden flex flex-col justify-center min-h-[220px]"
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
