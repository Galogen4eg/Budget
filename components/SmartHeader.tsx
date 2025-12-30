
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
    <div className={`relative overflow-hidden bg-white rounded-[2.5rem] p-6 shadow-soft border border-gray-100 flex flex-col justify-between transition-all hover:scale-[1.01] ${className}`}>
        <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Общий баланс</span>
                    {onTogglePrivacy && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onTogglePrivacy(); }}
                            className="text-gray-300 hover:text-blue-500 transition-colors"
                        >
                            {settings.privacyMode ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                    )}
                </div>
                <div className="text-3xl font-black text-[#1C1C1E] tabular-nums tracking-tight">
                    {settings.privacyMode ? '••••••' : balance.toLocaleString('ru-RU')} <span className="text-gray-300 text-xl font-bold">{settings.currency}</span>
                </div>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                <Wallet size={20} />
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
            <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">На сегодня</span>
                <div className="text-lg font-black text-[#1C1C1E] tabular-nums">
                    {settings.privacyMode ? '•••' : Math.round(dailyBudget).toLocaleString()} {settings.currency}
                </div>
            </div>
            <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Резерв</span>
                <div className="text-lg font-black text-gray-300 tabular-nums">
                    {settings.privacyMode ? '•••' : Math.round(reservedAmount).toLocaleString()}
                </div>
            </div>
        </div>
    </div>
  );
};

export default SmartHeader;
