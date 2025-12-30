
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
  
  const salaryDates = settings.salaryDates && settings.salaryDates.length > 0 
    ? settings.salaryDates 
    : [settings.startOfMonthDay];

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
    <div className={`relative overflow-hidden bg-white rounded-[2.5rem] p-5 md:p-6 shadow-soft border border-gray-100 flex flex-col justify-between transition-all hover:scale-[1.01] ${className}`}>
        <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Общий баланс</span>
                    {onTogglePrivacy && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onTogglePrivacy(); }}
                            className="text-gray-300 hover:text-blue-500 transition-colors"
                        >
                            {settings.privacyMode ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                    )}
                </div>
                <div className="text-xl md:text-3xl font-black text-[#1C1C1E] tabular-nums tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                    {settings.privacyMode ? '••••••' : balance.toLocaleString('ru-RU')} <span className="text-gray-300 text-lg font-bold">₽</span>
                </div>
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 flex-shrink-0 ml-2">
                <Wallet size={18} className="md:w-5 md:h-5" />
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-2 md:gap-4">
            <div className="min-w-0">
                <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase block mb-1 truncate">На сегодня</span>
                <div className="text-sm md:text-lg font-black text-[#1C1C1E] tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                    {settings.privacyMode ? '•••' : Math.round(dailyBudget).toLocaleString()} ₽
                </div>
            </div>
            <div className="min-w-0 border-l border-gray-50 pl-2 md:pl-4">
                <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase block mb-1 truncate">Резерв</span>
                <div className="text-sm md:text-lg font-black text-gray-300 tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                    {settings.privacyMode ? '•••' : Math.round(reservedAmount).toLocaleString()}
                </div>
            </div>
        </div>
    </div>
  );
};

export default SmartHeader;
