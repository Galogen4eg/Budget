
import React, { useEffect, useState } from 'react';
import { AppSettings, Transaction } from '../types';
import { Wallet, Eye, EyeOff, TrendingUp, Lock, CalendarClock, ArrowDownRight, Users, User, UserPlus } from 'lucide-react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';

interface SmartHeaderProps {
  balance: number;
  spent: number;
  savingsRate: number;
  settings: AppSettings;
  onTogglePrivacy?: () => void;
  budgetMode?: 'personal' | 'family';
  onToggleBudgetMode?: () => void;
  onInvite?: () => void;
  className?: string;
  transactions?: Transaction[];
}

const AnimatedCounter = ({ value, privacyMode }: { value: number, privacyMode: boolean }) => {
    const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
    const displayValue = useTransform(spring, (current) => Math.round(current).toLocaleString('ru-RU'));

    useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    if (privacyMode) return <span className="text-4xl md:text-5xl font-black tracking-tighter">••••••</span>;

    return <motion.span className="text-5xl md:text-7xl font-black tracking-tighter tabular-nums leading-none truncate">{displayValue}</motion.span>;
};

const SmartHeader: React.FC<SmartHeaderProps> = ({ 
    balance, spent, savingsRate, settings, onTogglePrivacy, 
    budgetMode = 'personal', onToggleBudgetMode, onInvite, className = '', transactions = [] 
}) => {
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

  // Days calculations
  const diffTime = Math.abs(nextSalaryDate.getTime() - now.getTime());
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  // Money calculations
  
  // 1. Calculate remaining unpaid mandatory expenses for this month
  const mandatoryExpenses = settings.mandatoryExpenses || [];
  
  // Filter transactions for current month only to check payments
  const currentMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === 'expense';
  });

  const unpaidMandatoryTotal = mandatoryExpenses.reduce((totalNeeded, expense) => {
      // Find payments matching this expense keywords
      const keywords = expense.keywords || [];
      const matches = currentMonthTransactions.filter(tx => {
          if (keywords.length === 0) return false;
          const noteLower = (tx.note || '').toLowerCase();
          const rawLower = (tx.rawNote || '').toLowerCase();
          return keywords.some(k => noteLower.includes(k.toLowerCase()) || rawLower.includes(k.toLowerCase()));
      });

      const paidAmount = matches.reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate remaining needed for this expense
      // Allow small margin (e.g. if 95% paid, count as paid)
      if (paidAmount >= expense.amount * 0.95) {
          return totalNeeded; // Fully paid, need 0 more
      }
      
      return totalNeeded + Math.max(0, expense.amount - paidAmount);
  }, 0);

  const savingsAmount = balance * (savingsRate / 100);
  const reservedAmount = savingsAmount + unpaidMandatoryTotal;
  const availableBalance = Math.max(0, balance - reservedAmount);
  const dailyBudget = availableBalance / daysRemaining;

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className={`relative overflow-hidden rounded-[2.2rem] text-white shadow-xl dark:shadow-white/5 ${className} group flex flex-col justify-between`}
    >
        {/* Premium Dark Gradient Background */}
        <div className="absolute inset-0 bg-[#151517] z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-indigo-600/80 to-purple-800/90 opacity-100 z-0" />
        
        {/* Decorative Blur Effects - Animated */}
        <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-40px] right-[-20px] w-32 h-32 bg-pink-500 rounded-full blur-[60px] mix-blend-screen pointer-events-none" 
        />
        <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[-20px] left-[-20px] w-40 h-40 bg-blue-400 rounded-full blur-[50px] mix-blend-screen pointer-events-none" 
        />

        <div className="relative z-10 flex flex-col h-full p-4 md:p-5">
            
            {/* 1. TOP ROW: Budget Mode Switcher + Privacy + Days */}
            <div className="flex justify-between items-start mb-1 md:mb-2">
                <div className="flex gap-2">
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            if (onToggleBudgetMode) onToggleBudgetMode();
                        }}
                        className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl px-3 py-1.5 border border-white/10 hover:bg-white/20 transition-all active:scale-95"
                    >
                        <AnimatePresence mode="wait">
                            {budgetMode === 'family' ? (
                                <motion.div key="fam" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><Users size={14} className="text-purple-200"/></motion.div>
                            ) : (
                                <motion.div key="pers" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><User size={14} className="text-blue-200"/></motion.div>
                            )}
                        </AnimatePresence>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                            {budgetMode === 'family' ? 'Семья' : 'Личный'}
                        </span>
                    </button>
                </div>
                
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl px-2 py-1 md:px-3 md:py-1.5 flex items-center gap-1.5 border border-white/10">
                        <CalendarClock size={10} className="text-blue-200" />
                        <span className="text-[9px] md:text-[10px] font-bold text-white tabular-nums">
                            {daysRemaining} дн.
                        </span>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTogglePrivacy?.(); }}
                        className="p-1.5 bg-white/10 rounded-full text-blue-100 hover:bg-white/20 transition-colors"
                    >
                        {settings.privacyMode ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                </div>
            </div>

            {/* 2. MIDDLE: Huge Balance */}
            <div className="flex-1 flex items-center min-h-0 mb-2 md:mb-4">
                <div className="flex items-baseline gap-1 md:gap-2 w-full overflow-hidden">
                    <AnimatedCounter value={balance} privacyMode={settings.privacyMode} />
                    <span className="text-xl md:text-3xl font-medium text-blue-200/60 mb-1 md:mb-2">{settings.currency}</span>
                </div>
            </div>

            {/* 3. BOTTOM ROW: 3 Stats Grid */}
            <div className="grid grid-cols-3 gap-2 md:gap-3 h-20 md:h-28 mt-auto">
                {/* Daily Limit - Primary */}
                <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-2 md:p-4 flex flex-col justify-between relative overflow-hidden group/item shadow-lg">
                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-green-400/20 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    <span className="text-[8px] md:text-[10px] font-bold uppercase text-blue-100/80 tracking-wider flex items-center gap-1 truncate">
                        <TrendingUp size={10} className="text-green-300" /> На день
                    </span>
                    <span className="text-base md:text-2xl font-black text-white tabular-nums leading-none truncate mt-auto">
                        {settings.privacyMode ? '•••' : Math.round(dailyBudget).toLocaleString()}
                    </span>
                </div>

                {/* Spent - Alert/Action */}
                <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-2 md:p-4 flex flex-col justify-between group/item">
                    <span className="text-[8px] md:text-[10px] font-bold uppercase text-red-100/70 tracking-wider flex items-center gap-1 truncate">
                        <ArrowDownRight size={10} className="text-red-300" /> Траты
                    </span>
                    <span className="text-base md:text-2xl font-black text-white/95 tabular-nums leading-none truncate mt-auto">
                        {settings.privacyMode ? '•••' : Math.round(spent).toLocaleString()}
                    </span>
                </div>

                {/* Reserve - Secondary */}
                <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-2 md:p-4 flex flex-col justify-between">
                    <span className="text-[8px] md:text-[10px] font-bold uppercase text-indigo-200/60 tracking-wider flex items-center gap-1 truncate">
                        <Lock size={10} /> Резерв
                    </span>
                    <span className="text-base md:text-2xl font-black text-indigo-100/90 tabular-nums leading-none truncate mt-auto">
                        {settings.privacyMode ? '•••' : Math.round(reservedAmount).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    </motion.div>
  );
};

export default SmartHeader;
