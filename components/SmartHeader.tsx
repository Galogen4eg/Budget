
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

    if (privacyMode) return <span className="text-4xl md:text-6xl font-black tracking-tighter">••••••</span>;

    return <motion.span className="text-4xl xs:text-5xl md:text-6xl font-black tracking-tighter tabular-nums leading-none truncate">{displayValue}</motion.span>;
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
  
  // Релевантные платежи для режима
  const relevantMandatoryExpenses = useMemo(() => {
      const all = settings.mandatoryExpenses || [];
      if (budgetMode === 'personal' && myMemberId) {
          return all.filter(e => e.memberId === myMemberId);
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
        className={`relative overflow-hidden rounded-[2.2rem] text-white shadow-xl dark:shadow-white/5 ${className} group flex flex-col justify-between`}
    >
        <div className="absolute inset-0 bg-[#151517] z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-indigo-600/80 to-purple-800/90 opacity-100 z-0" />
        
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

        <div className="relative z-10 flex flex-col h-full p-4 md:p-6">
            <div className="flex justify-between items-start mb-2">
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
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onInvite?.(); }}
                        className="p-2 bg-white/10 rounded-full text-blue-100 hover:bg-white/20 transition-colors flex items-center justify-center"
                        title="Пригласить"
                    >
                        <UserPlus size={14} />
                    </button>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 border border-white/10">
                        <CalendarClock size={12} className="text-blue-200" />
                        <span className="text-[10px] font-bold text-white tabular-nums">
                            {daysRemaining} дн.
                        </span>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTogglePrivacy?.(); }}
                        className="p-2 bg-white/10 rounded-full text-blue-100 hover:bg-white/20 transition-colors"
                    >
                        {settings.privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex items-center min-h-0 mb-4 overflow-hidden">
                <div className="flex items-baseline gap-1 md:gap-2 w-full overflow-hidden">
                    <AnimatedCounter value={balance} privacyMode={settings.privacyMode} />
                    <span className="text-lg md:text-3xl font-medium text-blue-200/60 mb-1">{settings.currency}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4 h-24 md:h-28 mt-auto shrink-0">
                <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-[1.5rem] md:rounded-[2rem] p-3 md:p-4 flex flex-col justify-between relative overflow-hidden group/item shadow-lg">
                    <span className="text-[8px] md:text-[10px] font-bold uppercase text-blue-100/80 tracking-wider flex items-center gap-1 truncate">
                        <TrendingUp size={10} className="text-green-300" /> На день
                    </span>
                    <span className="text-lg md:text-2xl font-black text-white tabular-nums leading-none truncate mt-auto">
                        {settings.privacyMode ? '•••' : Math.round(dailyBudget).toLocaleString()}
                    </span>
                </div>

                <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-[1.5rem] md:rounded-[2rem] p-3 md:p-4 flex flex-col justify-between group/item">
                    <span className="text-[8px] md:text-[10px] font-bold uppercase text-red-100/70 tracking-wider flex items-center gap-1 truncate">
                        <ArrowDownRight size={10} className="text-red-300" /> Траты
                    </span>
                    <span className="text-lg md:text-2xl font-black text-white/95 tabular-nums leading-none truncate mt-auto">
                        {settings.privacyMode ? '•••' : Math.round(spent).toLocaleString()}
                    </span>
                </div>

                <button
                    onClick={() => setIsReserveModalOpen(true)}
                    className="bg-black/20 backdrop-blur-md border border-white/5 rounded-[1.5rem] md:rounded-[2rem] p-3 md:p-4 flex flex-col justify-between cursor-pointer hover:bg-black/30 transition-colors text-left"
                >
                    <span className="text-[8px] md:text-[10px] font-bold uppercase text-indigo-200/60 tracking-wider flex items-center gap-1 truncate">
                        <Lock size={10} /> Резерв
                    </span>
                    <span className="text-lg md:text-2xl font-black text-indigo-100/90 tabular-nums leading-none truncate mt-auto">
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
