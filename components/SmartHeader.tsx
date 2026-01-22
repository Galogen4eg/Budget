
import React, { useEffect, useState, useMemo } from 'react';
import { AppSettings, Transaction } from '../types';
import { Wallet, Eye, EyeOff, TrendingUp, Lock, CalendarClock, ArrowDownRight, Users, User, UserPlus } from 'lucide-react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import ReserveDetailsModal from './ReserveDetailsModal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

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

    if (privacyMode) return <span className="text-3xl md:text-5xl font-black tracking-tighter">••••••</span>;

    return <motion.span className="text-3xl xs:text-4xl md:text-6xl font-black tracking-tighter tabular-nums leading-none truncate">{displayValue}</motion.span>;
};

const SmartHeader: React.FC<SmartHeaderProps> = ({ 
    balance, spent, savingsRate, settings, onTogglePrivacy, 
    budgetMode = 'personal', onToggleBudgetMode, onInvite, className = '', transactions = [] 
}) => {
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const { updateSettings, members } = useData();
  const { user: firebaseUser } = useAuth();

  const now = new Date();
  const currentDay = now.getDate();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const myMemberId = members.find(m => m.userId === firebaseUser?.uid)?.id;

  const salaryDates = settings.salaryDates && settings.salaryDates.length > 0 
    ? settings.salaryDates 
    : [settings.startOfMonthDay];

  const sortedDates = [...salaryDates].sort((a, b) => a - b);
  let nextSalaryDate: Date | null = null;
  
  for (const day of sortedDates) {
      if (day > currentDay) {
          nextSalaryDate = new Date(now.getFullYear(), now.getMonth(), day);
          break;
      }
  }
  if (!nextSalaryDate) {
      nextSalaryDate = new Date(now.getFullYear(), now.getMonth() + 1, sortedDates[0]);
  }

  const diffTime = Math.abs(nextSalaryDate.getTime() - now.getTime());
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  // Filter relevant mandatory expenses
  // In Personal mode, include items assigned to me OR unassigned (legacy/shared)
  const relevantMandatoryExpenses = useMemo(() => {
      const all = settings.mandatoryExpenses || [];
      if (budgetMode === 'personal' && myMemberId) {
          return all.filter(e => !e.memberId || e.memberId === myMemberId);
      }
      return all;
  }, [settings.mandatoryExpenses, budgetMode, myMemberId]);
  
  const currentMonthTransactions = useMemo(() => transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === 'expense';
  }), [transactions, now]);

  const { unpaidMandatoryTotal, futureExpenses } = useMemo(() => {
      let total = 0;
      const fullList: { expense: any; amountNeeded: number; isManuallyPaid: boolean; isPaid: boolean }[] = [];
      const manuallyPaidIds = settings.manualPaidExpenses?.[currentMonthKey] || [];

      if (settings.enableSmartReserve ?? true) {
          relevantMandatoryExpenses.forEach(expense => {
              const keywords = expense.keywords || [];
              const matches = currentMonthTransactions.filter(tx => {
                  if (tx.linkedExpenseId === expense.id) return true; // Explicit link matches immediately
                  
                  if (keywords.length === 0) return false;
                  const noteLower = (tx.note || '').toLowerCase();
                  const rawLower = (tx.rawNote || '').toLowerCase();
                  return keywords.some(k => noteLower.includes(k.toLowerCase()) || rawLower.includes(k.toLowerCase()));
              });

              const paidAmount = matches.reduce((sum, t) => sum + t.amount, 0);
              const isManuallyPaid = manuallyPaidIds.includes(expense.id);
              const isPaid = (paidAmount >= expense.amount * 0.95) || isManuallyPaid;
              const remainingToPay = isPaid ? 0 : Math.max(0, expense.amount - paidAmount);

              if (!isPaid) total += remainingToPay;
              fullList.push({ expense, amountNeeded: remainingToPay, isManuallyPaid, isPaid });
          });
      }

      fullList.sort((a, b) => {
          if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
          return a.expense.day - b.expense.day;
      });

      return { unpaidMandatoryTotal: total, futureExpenses: fullList };
  }, [relevantMandatoryExpenses, currentMonthTransactions, currentDay, settings.enableSmartReserve, settings.manualPaidExpenses, currentMonthKey]);

  const savingsAmount = balance * (savingsRate / 100);
  const manualReserved = settings.manualReservedAmount || 0;
  const reservedAmount = savingsAmount + unpaidMandatoryTotal + manualReserved;
  const availableBalance = Math.max(0, balance - reservedAmount);
  const dailyBudget = availableBalance / daysRemaining;

  const handleUpdateManualSavings = async (amount: number) => {
      await updateSettings({ ...settings, manualReservedAmount: amount });
  };

  const handleTogglePaid = async (expenseId: string, isPaid: boolean) => {
      const currentManuals = settings.manualPaidExpenses || {};
      const monthIds = currentManuals[currentMonthKey] || [];
      let newMonthIds = isPaid ? [...monthIds, expenseId] : monthIds.filter(id => id !== expenseId);

      const newSettings = { 
          ...settings, 
          manualPaidExpenses: { ...currentManuals, [currentMonthKey]: newMonthIds }
      };
      await updateSettings(newSettings);
  };

  return (
    <>
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className={`relative overflow-hidden rounded-[2.5rem] text-white shadow-2xl dark:shadow-white/5 ${className} group flex flex-col justify-between`}
    >
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[#3B59E9] z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-[#3B59E9] to-indigo-800 opacity-90 z-0" />
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/30 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full p-5 md:p-8">
            {/* Top Row */}
            <div className="flex justify-between items-start mb-4">
                <button 
                    onClick={(e) => {
                        e.preventDefault();
                        if (onToggleBudgetMode) onToggleBudgetMode();
                    }}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full pl-2 pr-3 py-1 border border-white/20 hover:bg-white/20 transition-all active:scale-95"
                >
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <User size={14} className="text-white" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                        {budgetMode === 'family' ? 'Семья' : 'Личный'}
                    </span>
                </button>
                
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onInvite?.(); }} className="w-9 h-9 bg-white/10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors">
                        <UserPlus size={16} />
                    </button>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-1.5 border border-white/10 h-9">
                        <CalendarClock size={14} className="text-blue-200" />
                        <span className="text-xs font-bold text-white tabular-nums">{daysRemaining} дн.</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onTogglePrivacy?.(); }} className="w-9 h-9 bg-white/10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors">
                        {settings.privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            {/* Big Balance */}
            <div className="flex-1 flex flex-col justify-center mb-6">
                <div className="flex items-baseline gap-2">
                    <AnimatedCounter value={balance} privacyMode={settings.privacyMode} />
                    <span className="text-xl md:text-3xl font-medium text-blue-200/80">{settings.currency}</span>
                </div>
            </div>

            {/* Stats Row (Inside Card) */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-[1.5rem] p-3 md:p-4 flex flex-col gap-1 relative overflow-hidden group/item">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase text-blue-100/70 tracking-widest flex items-center gap-1.5 truncate">
                        <TrendingUp size={10} className="text-blue-300" /> На день
                    </span>
                    <span className="text-lg md:text-2xl font-black text-white tabular-nums leading-tight truncate">
                        {settings.privacyMode ? '•••' : Math.round(dailyBudget).toLocaleString()}
                    </span>
                </div>

                <div className="bg-black/20 backdrop-blur-sm border border-white/5 rounded-[1.5rem] p-3 md:p-4 flex flex-col gap-1">
                    <span className="text-[9px] md:text-[10px] font-bold uppercase text-indigo-200/60 tracking-widest flex items-center gap-1.5 truncate">
                        <ArrowDownRight size={10} className="text-indigo-300" /> Траты
                    </span>
                    <span className="text-lg md:text-2xl font-black text-white tabular-nums leading-tight truncate">
                        {settings.privacyMode ? '•••' : Math.round(spent).toLocaleString()}
                    </span>
                </div>

                <button
                    onClick={() => setIsReserveModalOpen(true)}
                    className="bg-black/20 backdrop-blur-sm border border-white/5 rounded-[1.5rem] p-3 md:p-4 flex flex-col gap-1 cursor-pointer hover:bg-black/30 transition-colors text-left"
                >
                    <span className="text-[9px] md:text-[10px] font-bold uppercase text-purple-200/60 tracking-widest flex items-center gap-1.5 truncate">
                        <Lock size={10} /> Резерв
                    </span>
                    <span className="text-lg md:text-2xl font-black text-purple-100/90 tabular-nums leading-tight truncate">
                        {settings.privacyMode ? '•••' : Math.round(reservedAmount).toLocaleString()}
                    </span>
                </button>
            </div>
        </div>
    </motion.div>

    <AnimatePresence>
        {isReserveModalOpen && (
            <ReserveDetailsModal 
                onClose={() => setIsReserveModalOpen(false)}
                totalReserved={reservedAmount}
                savingsAmount={savingsAmount}
                manualReservedAmount={manualReserved}
                mandatoryAmount={unpaidMandatoryTotal}
                availableForSavings={availableBalance}
                settings={settings}
                savingsRate={savingsRate}
                futureExpenses={futureExpenses}
                onUpdateManualSavings={handleUpdateManualSavings}
                onTogglePaid={handleTogglePaid}
            />
        )}
    </AnimatePresence>
    </>
  );
};

export default SmartHeader;
