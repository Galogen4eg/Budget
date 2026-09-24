import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, X, PieChart, Bell, Calendar, CreditCard, Clock, Trash2, 
  CheckCircle2, RotateCcw, AlertTriangle, Smile,
  Calculator, Lock, CalendarCheck, ShieldCheck, TrendingUp,
  ChevronLeft, Sparkles, Check, Home, Car, Laptop, ArrowUpDown, Link2,
  Hourglass, Flag, CalendarDays, CheckCircle, Pencil
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Debt, AppSettings, Transaction, MandatoryExpense } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { addItem, updateItem, deleteItem } from '../utils/db';
import { 
  findLinkedExpenseForDebt, 
  computeDebtMonthPaymentStatus, 
  getMonthKey 
} from '../utils/debtPaymentSync';
import { fixPrepositions, formatCurrencyWithKopecks, formatNumberWithSeparators } from '../utils/typography';

interface Props {
  debts: Debt[];
  setDebts: (d: Debt[]) => void;
  settings: AppSettings;
  transactions?: Transaction[];
  onClose?: () => void;
}

type CalculationMode = 'manual' | 'auto';
type DebtSortOption = 'date' | 'amount' | 'progress';

interface ExtendedDebt extends Omit<Debt, 'strategy'> {
  strategy?: string; 
}

const DebtSnowball: React.FC<Props> = ({ 
  debts, 
  setDebts, 
  settings, 
  transactions = [], 
  onClose 
}) => {
  const [showNotifySettings, setShowNotifySettings] = useState<Debt | null>(null);
  const [showDebtStats, setShowDebtStats] = useState<ExtendedDebt | null>(null);
  const [showEarlyRepaymentCalc, setShowEarlyRepaymentCalc] = useState<boolean>(false);
  const [extraPaymentAmount, setExtraPaymentAmount] = useState<number>(5000);
  const [editingDebt, setEditingDebt] = useState<Partial<ExtendedDebt> | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [mode, setMode] = useState<CalculationMode>('manual');
  const [sortBy, setSortBy] = useState<DebtSortOption>('date');
  
  const { familyId } = useAuth();
  const { updateSettings } = useData();

  // Синхронизация режима расчета при открытии формы редактирования
  useEffect(() => {
    if (editingDebt) {
      if (editingDebt.id) {
        setMode(editingDebt.strategy === 'auto' ? 'auto' : 'manual');
      } else {
        if (editingDebt.strategy === undefined) {
          setMode('manual');
        }
      }
    }
  }, [editingDebt?.id]); 

  // Автоматический пересчет параметров в режиме auto
  useEffect(() => {
    if (mode === 'auto' && editingDebt) {
      calculateAutoParams();
    }
  }, [mode, editingDebt?.totalAmount, editingDebt?.currentBalance, editingDebt?.finalClosingDate]);

  // Расчет безопасного месячного бюджета на основе реальных транзакций
  const safeMonthlyBudget = useMemo(() => {
    if (!transactions || transactions.length < 5) return 0;

    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    const recentTx = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);
    const totalIncome = recentTx.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = recentTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    
    const months = 3;
    const avgIncome = totalIncome / months;
    const avgExpense = totalExpense / months;
    const mandatoryMonthly = (settings.mandatoryExpenses || []).reduce((acc, e) => acc + e.amount, 0);
    const baseExpense = Math.max(avgExpense, mandatoryMonthly);
    const savingsDeduction = avgIncome * ((settings.savingsRate || 10) / 100);
    const freeCashFlow = avgIncome - baseExpense - savingsDeduction;
    
    return Math.max(0, Math.floor(freeCashFlow * 0.7));
  }, [transactions, settings]);

  const getNextSalaryDate = (fromDate: Date): Date => {
    const salaryDates = settings.salaryDates && settings.salaryDates.length > 0 ? settings.salaryDates : [1, 15];
    const currentDay = fromDate.getDate();
    const sortedSalary = [...salaryDates].sort((a, b) => a - b);
    
    let nextSalaryDay = sortedSalary.find(d => d >= currentDay);
    let payMonth = fromDate.getMonth();
    let payYear = fromDate.getFullYear();

    if (!nextSalaryDay) {
      nextSalaryDay = sortedSalary[0];
      payMonth++;
      if (payMonth > 11) {
        payMonth = 0;
        payYear++;
      }
    }
    return new Date(payYear, payMonth, nextSalaryDay);
  };

  const calculateAutoParams = () => {
    if (!editingDebt?.finalClosingDate || !editingDebt.totalAmount) return;

    const total = Number(editingDebt.totalAmount);
    const paid = (editingDebt.totalAmount || 0) - (editingDebt.currentBalance ?? (editingDebt.totalAmount || 0));
    const balance = total - paid;
    
    const today = new Date();
    const targetDate = new Date(editingDebt.finalClosingDate);
    
    let monthsDiff = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
    if (targetDate.getDate() < today.getDate()) monthsDiff--;
    
    const effectiveMonths = Math.max(1, monthsDiff);
    const suggestedPayment = Math.ceil(balance / effectiveMonths);

    const nextDueDate = getNextSalaryDate(today);
    const formattedDueDate = nextDueDate.toISOString().split('T')[0];

    if (editingDebt.monthlyPayment !== suggestedPayment || editingDebt.dueDate !== formattedDueDate) {
      setEditingDebt(prev => ({
        ...prev,
        monthlyPayment: suggestedPayment,
        dueDate: formattedDueDate,
        strategy: 'auto'
      }));
    }
  };

  const applySafeBudget = () => {
    if (!safeMonthlyBudget || !editingDebt?.totalAmount) return;
    
    const total = Number(editingDebt.totalAmount);
    const currentBal = editingDebt.currentBalance ?? total;
    
    const monthsNeeded = Math.ceil(currentBal / safeMonthlyBudget);
    
    const newTargetDate = new Date();
    newTargetDate.setMonth(newTargetDate.getMonth() + monthsNeeded);
    
    setEditingDebt(prev => ({
      ...prev,
      finalClosingDate: newTargetDate.toISOString().split('T')[0],
      monthlyPayment: safeMonthlyBudget
    }));
  };

  const getForecastDates = (debt: ExtendedDebt, count: number = 3) => {
    const dates: { date: Date, amount: number, isPaid: boolean }[] = [];
    const monthly = debt.monthlyPayment || 0;
    
    let baseDate = new Date();
    if (debt.strategy === 'auto') {
      baseDate = getNextSalaryDate(new Date());
    } else {
      if (debt.dueDate) {
        const due = new Date(debt.dueDate);
        if (baseDate > due) {
          baseDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, due.getDate());
        } else {
          baseDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), due.getDate());
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      const isCurrentMonth = i === 0;
      const isPaid = isCurrentMonth && debt.paidThisMonth;

      dates.push({
        date: d,
        amount: monthly,
        isPaid: !!isPaid
      });
    }
    return dates;
  };

  const scheduleData = useMemo(() => {
    if (mode !== 'auto' || !editingDebt?.monthlyPayment || !editingDebt.dueDate || !editingDebt.totalAmount) return [];

    const data = [];
    const total = Number(editingDebt.totalAmount);
    let currentBal = editingDebt.currentBalance ?? total;
    const monthly = Number(editingDebt.monthlyPayment);
    
    data.push({
      month: 'Сейчас',
      balance: currentBal,
      payment: 0
    });

    let simDate = new Date(editingDebt.dueDate);
    let safety = 0;
    
    while (currentBal > 0 && safety < 60) { 
      const payment = Math.min(currentBal, monthly);
      currentBal -= payment;
      
      data.push({
        month: simDate.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
        balance: Math.max(0, Math.round(currentBal)),
        payment: Math.round(payment)
      });
      
      simDate.setMonth(simDate.getMonth() + 1);
      safety++;
    }
    return data;
  }, [mode, editingDebt?.monthlyPayment, editingDebt?.dueDate, editingDebt?.totalAmount, editingDebt?.currentBalance]);

  const parseDecimal = (val: string | number | undefined | null): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val * 100) / 100;
    if (!val) return 0;
    const clean = val.toString().replace(/\s+/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  };

  const handleUpdateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as typeof e.target & {
      title: { value: string };
      totalAmount: { value: string };
      paidAmount: { value: string };
      monthlyPayment: { value: string };
      dueDate: { value: string };
      finalClosingDate: { value: string };
    };

    const totalAmount = parseDecimal(target.totalAmount.value);
    const paidAmount = parseDecimal(target.paidAmount.value);
    const currentBalance = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
    const formTarget = target as any;
    const linkedExpenseId = formTarget.linkedExpenseId?.value || null;

    const updatedDebt: Partial<ExtendedDebt> = {
      ...editingDebt,
      name: target.title.value,
      totalAmount: totalAmount,
      currentBalance: currentBalance,
      monthlyPayment: parseDecimal(target.monthlyPayment.value),
      dueDate: target.dueDate.value,
      finalClosingDate: target.finalClosingDate.value,
      channels: editingDebt?.channels || ['site'],
      notifyBefore: editingDebt?.notifyBefore || 3,
      notifyIfOverdue: editingDebt?.notifyIfOverdue ?? true,
      color: '#4a7c59',
      strategy: mode,
      linkedExpenseId: linkedExpenseId || null
    };
    
    const debtId = editingDebt?.id || Date.now().toString();
    const newDebt = { 
      ...updatedDebt, 
      id: debtId, 
      paidThisMonth: editingDebt?.paidThisMonth ?? false 
    } as unknown as Debt;

    if (editingDebt?.id) {
      setDebts(debts.map(d => d.id === editingDebt.id ? newDebt : d));
      if (familyId) await updateItem(familyId, 'debts', editingDebt.id, newDebt);
    } else {
      setDebts([...debts, newDebt]);
      if (familyId) await addItem(familyId, 'debts', newDebt);
    }

    // Двусторонняя синхронизация с карточкой обязательного платежа
    const expenses = settings.mandatoryExpenses || [];
    const targetLinkedExpense = linkedExpenseId 
      ? expenses.find(exp => exp.id === linkedExpenseId)
      : findLinkedExpenseForDebt(debtId, expenses);

    if (targetLinkedExpense || linkedExpenseId) {
      const targetId = linkedExpenseId || targetLinkedExpense?.id;
      const parsedDay = updatedDebt.dueDate ? new Date(updatedDebt.dueDate).getDate() : undefined;

      const updatedExpenses = expenses.map(exp => {
        if (exp.id === targetId) {
          return {
            ...exp,
            title: updatedDebt.name || exp.title,
            amount: updatedDebt.monthlyPayment !== undefined && updatedDebt.monthlyPayment > 0 ? updatedDebt.monthlyPayment : exp.amount,
            day: (parsedDay && !isNaN(parsedDay)) ? parsedDay : exp.day,
            expenseType: 'debt' as const,
            linkedDebtId: debtId
          };
        }
        if (exp.linkedDebtId === debtId && exp.id !== targetId) {
          return {
            ...exp,
            linkedDebtId: null
          };
        }
        return exp;
      });

      await updateSettings({
        ...settings,
        mandatoryExpenses: updatedExpenses
      });
    }

    setEditingDebt(null);
  };

  const togglePaidStatus = async (id: string) => {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;

    const currentMonth = new Date();
    const linkedExpense = findLinkedExpenseForDebt(debt.id, settings.mandatoryExpenses);
    const paymentStatus = computeDebtMonthPaymentStatus(debt, linkedExpense, transactions, settings, currentMonth);

    const isCurrentlyPaid = paymentStatus.isPaid;
    const payment = debt.monthlyPayment || 0;
    
    let newBalance = debt.currentBalance;
    if (!isCurrentlyPaid) {
      newBalance = Math.max(0, debt.currentBalance - payment);
    } else {
      newBalance = Math.min(debt.totalAmount, debt.currentBalance + payment);
    }

    const updates = { 
      currentBalance: newBalance,
      paidThisMonth: !isCurrentlyPaid 
    };

    setDebts(debts.map(d => d.id === id ? { ...d, ...updates } : d));
    if (familyId) await updateItem(familyId, 'debts', id, updates);

    // Синхронизация статуса с обязательным платежом
    if (linkedExpense) {
      const monthKey = getMonthKey(currentMonth);
      const currentManuals = settings.manualPaidExpenses || {};
      const monthIds = currentManuals[monthKey] || [];
      let newMonthIds: string[];

      if (!isCurrentlyPaid) {
        newMonthIds = Array.from(new Set([...monthIds, linkedExpense.id]));
      } else {
        newMonthIds = monthIds.filter(mid => mid !== linkedExpense.id);
      }

      await updateSettings({
        ...settings,
        manualPaidExpenses: {
          ...currentManuals,
          [monthKey]: newMonthIds
        }
      });
    }
  };

  const confirmDeleteDebt = async (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
    if (familyId) await deleteItem(familyId, 'debts', id);
    setDebtToDelete(null);
    if (editingDebt?.id === id) {
      setEditingDebt(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Не указана';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  const formatDateLong = (dateStr?: string) => {
    if (!dateStr) return 'Не указана';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isOverdue = (dateStr?: string, isPaid?: boolean) => {
    if (!dateStr || isPaid) return false;
    const due = new Date(dateStr);
    due.setHours(23, 59, 59, 999);
    return due < new Date();
  };

  const getPaidAmount = (d: { totalAmount: number, currentBalance: number }) => Math.max(0, d.totalAmount - d.currentBalance);

  // Аналитические агрегаты
  const { totalRemaining, totalOriginal, totalPaid, overallProgress, monthlyDebtLoad, nextUpcomingDebt } = useMemo(() => {
    const totalRemaining = debts.reduce((acc, d) => acc + (d.currentBalance ?? d.totalAmount), 0);
    const totalOriginal = debts.reduce((acc, d) => acc + (d.totalAmount || 0), 0);
    const totalPaid = Math.max(0, totalOriginal - totalRemaining);
    const overallProgress = totalOriginal > 0 ? Math.min(100, Math.round((totalPaid / totalOriginal) * 100)) : 0;
    const monthlyDebtLoad = debts.reduce((acc, d) => acc + (d.monthlyPayment || 0), 0);

    const unpaidDebtsWithDates = debts
      .filter(d => !d.paidThisMonth && d.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    const nextUpcomingDebt = unpaidDebtsWithDates.length > 0 ? unpaidDebtsWithDates[0] : debts[0];

    return {
      totalRemaining,
      totalOriginal,
      totalPaid,
      overallProgress,
      monthlyDebtLoad,
      nextUpcomingDebt
    };
  }, [debts]);

  const daysToNextPayment = useMemo(() => {
    if (!nextUpcomingDebt?.dueDate) return null;
    const due = new Date(nextUpcomingDebt.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [nextUpcomingDebt]);

  const currentTimeSync = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Иконка для каждого типа обязательства
  const getDebtIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('ипотек') || lower.includes('дом') || lower.includes('квартир')) {
      return <Home className="w-5 h-5 text-[#4a7c59] dark:text-emerald-400" />;
    }
    if (lower.includes('авто') || lower.includes('машин')) {
      return <Car className="w-5 h-5 text-[#4a7c59] dark:text-emerald-400" />;
    }
    if (lower.includes('техник') || lower.includes('рассрочк') || lower.includes('телефон')) {
      return <Laptop className="w-5 h-5 text-[#4a7c59] dark:text-emerald-400" />;
    }
    return <CreditCard className="w-5 h-5 text-[#4a7c59] dark:text-emerald-400" />;
  };

  // Текстовый бейдж срока/условий для карточки
  const getDebtBadgeText = (debt: Debt) => {
    const lower = debt.name.toLowerCase();
    if (lower.includes('кредитк') || lower.includes('карт')) {
      return '0% переплаты';
    }
    if (lower.includes('рассрочк')) {
      return '3 взноса';
    }
    if (daysToNextPayment !== null && daysToNextPayment >= 0 && !debt.paidThisMonth) {
      return `Через ${daysToNextPayment} ${daysToNextPayment === 1 ? 'день' : daysToNextPayment < 5 ? 'дня' : 'дней'}`;
    }
    return 'В графике';
  };

  // Сортировка обязательств
  const sortedDebts = useMemo(() => {
    const list = [...debts];
    if (sortBy === 'date') {
      return list.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    }
    if (sortBy === 'amount') {
      return list.sort((a, b) => (b.currentBalance ?? b.totalAmount) - (a.currentBalance ?? a.totalAmount));
    }
    if (sortBy === 'progress') {
      return list.sort((a, b) => {
        const progA = a.totalAmount > 0 ? getPaidAmount(a) / a.totalAmount : 0;
        const progB = b.totalAmount > 0 ? getPaidAmount(b) / b.totalAmount : 0;
        return progB - progA;
      });
    }
    return list;
  }, [debts, sortBy]);

  // Расчет месяцев до полного погашения при текущем темпе
  const monthsToDebtFreedom = useMemo(() => {
    if (monthlyDebtLoad <= 0) return 0;
    return Math.ceil(totalRemaining / monthlyDebtLoad);
  }, [totalRemaining, monthlyDebtLoad]);

  const handleOpenAddModal = () => {
    setEditingDebt({ 
      id: undefined, 
      name: '', 
      totalAmount: 0, 
      currentBalance: 0, 
      monthlyPayment: 0, 
      dueDate: '', 
      finalClosingDate: '', 
      channels: ['site'], 
      notifyBefore: 3, 
      notifyIfOverdue: true, 
      strategy: 'manual' 
    });
  };

  return (
    <div className="space-y-5 md:space-y-7 w-full text-stone-800 dark:text-stone-100 font-sans pb-12 antialiased">
      
      {/* 1. Breadcrumbs & Sync Status (Адаптивный для мобильного и десктопа) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {onClose ? (
            <button 
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#1C1C1E] rounded-full border border-stone-200/90 dark:border-white/10 text-stone-600 dark:text-stone-300 hover:text-[#4a7c59] dark:hover:text-emerald-400 hover:border-[#4a7c59]/40 font-medium transition shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-[#4a7c59] dark:text-emerald-400" />
              <span>Ко всем сервисам</span>
            </button>
          ) : (
            <span className="text-stone-500">Сервисы</span>
          )}
          <span className="text-stone-300 dark:text-stone-600">/</span>
          <span className="font-bold text-stone-900 dark:text-white">Долги</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-stone-200/90 dark:border-white/10 text-[11px] text-stone-500 dark:text-stone-400 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] dark:bg-emerald-400 animate-pulse" />
          <span>Обновлено в {currentTimeSync}</span>
        </div>
      </div>

      {/* 2. Header Banner: Мобильная и десктопная шапка */}
      <header className="bg-white dark:bg-[#1C1C1E] rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-card border border-stone-200/90 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#d1dbd1] dark:border-emerald-800/40 shadow-inner">
            <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-stone-900 dark:text-white tracking-tight leading-tight">
              Мои долги
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm uppercase font-bold tracking-wider text-[#4a7c59] dark:text-emerald-400 mt-0.5">
              УПРАВЛЕНИЕ ВЫПЛАТАМИ И КРЕДИТАМИ
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleOpenAddModal}
          className="min-h-[44px] px-4 py-2.5 sm:px-6 sm:py-3.5 bg-[#4a7c59] hover:bg-[#3d6749] text-white rounded-xl sm:rounded-2xl font-display font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-[#4a7c59]/25 transition transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>Добавить долг</span>
        </button>
      </header>

      {/* 3. KPI Metrics Row: Адаптивная сводка (Остаток + 2 карточки на моб / 3 в ряд на десктопе) */}
      <section aria-label="Сводка по долгам" className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 md:gap-6">
        
        {/* KPI 1: Остаток долга (полная ширина на моб, 1-я колонка на десктопе) */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-6 border border-stone-200/90 dark:border-white/10 shadow-card flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Остаток долга</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 text-[11px] font-bold border border-[#d1dbd1] dark:border-emerald-800/40">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+1.2% в этом мес.</span>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-stone-900 dark:text-white tracking-tight">
              {formatCurrencyWithKopecks(totalRemaining)}
            </div>
          </div>

          <div className="mt-3.5 md:mt-5 space-y-2">
            <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-[#4a7c59] dark:bg-emerald-500 h-2.5 rounded-full transition-all duration-700" 
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400">
              <span className="text-[11px] truncate mr-1">
                Выплачено {formatCurrencyWithKopecks(totalPaid)} из {formatCurrencyWithKopecks(totalOriginal)}
              </span>
              <span className="font-bold text-[#4a7c59] dark:text-emerald-400 shrink-0">
                {overallProgress}%
              </span>
            </div>
          </div>
        </div>

        {/* На мобильном: сетка из 2 колонок. На планшетах и десктопе: колонки 2 и 3 в общем ряду */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:contents">
          {/* KPI 2: Ближайший платёж */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl md:rounded-3xl p-3.5 sm:p-5 md:p-6 border border-stone-200/90 dark:border-white/10 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Ближайший платёж</span>
                <span className="p-1 sm:p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4a7c59] dark:text-emerald-400" />
                </span>
              </div>
              <div className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-stone-900 dark:text-white tracking-tight">
                {formatCurrencyWithKopecks(nextUpcomingDebt?.monthlyPayment || 0)}
              </div>
              <div className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-medium mt-1 truncate">
                {nextUpcomingDebt?.name || 'Нет долгов'} · {nextUpcomingDebt?.dueDate ? formatDate(nextUpcomingDebt.dueDate) : '—'}
              </div>
              {daysToNextPayment !== null && daysToNextPayment >= 0 && (
                <div className="text-[10px] sm:text-xs text-[#4a7c59] dark:text-emerald-400 font-bold mt-0.5">
                  (через {daysToNextPayment} {daysToNextPayment === 1 ? 'день' : daysToNextPayment < 5 ? 'дня' : 'дней'})
                </div>
              )}
            </div>

            <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-stone-100 dark:border-white/5 flex items-center gap-1.5 text-[10px] sm:text-xs text-stone-500 dark:text-stone-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">Автосписание настроено</span>
            </div>
          </div>

          {/* KPI 3: Ежемесячная нагрузка */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl md:rounded-3xl p-3.5 sm:p-5 md:p-6 border border-stone-200/90 dark:border-white/10 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Нагрузка в месяц</span>
                <span className="p-1 sm:p-1.5 rounded-lg bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
              </div>
              <div className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-stone-900 dark:text-white tracking-tight">
                {formatCurrencyWithKopecks(monthlyDebtLoad)}
              </div>
              <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 truncate">
                {debts.length} {debts.length === 1 ? 'активный' : debts.length < 5 ? 'активных' : 'активных'} · Без просрочек
              </p>
            </div>

            <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-stone-100 dark:border-white/5 flex items-center justify-between text-[10px] sm:text-xs font-semibold">
              <span className="text-stone-500 dark:text-stone-400 truncate">Безопасно (24%)</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                В норме ✓
              </span>
            </div>
          </div>
        </div>

      </section>

      {/* 4. Теплый органический баннер «Финансовая гармония» (в стиле Terra) */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-[#f0ede6] dark:bg-[#202022] p-4 sm:p-5 border border-stone-200/80 dark:border-white/10 flex items-center gap-3.5 shadow-2xs">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#4a7c59] text-white flex items-center justify-center shrink-0 shadow-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm font-display font-bold text-stone-900 dark:text-white">
            Финансовая гармония
          </div>
          <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 leading-relaxed mt-0.5">
            Все текущие платежи спланированы. При сохранении текущего темпа до полной ликвидации задолженностей осталось <b>{monthsToDebtFreedom > 0 ? `${monthsToDebtFreedom} мес.` : 'менее месяца'}</b>.
          </p>
        </div>
      </div>

      {/* 5. Секция «Активные обязательства» (Двухколоночная на десктопе, вертикальный стек на смартфонах) */}
      <section aria-label="Список кредитных обязательств" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-display font-bold text-stone-900 dark:text-white">
              Активные обязательства
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400">
              {debts.length}
            </span>
          </div>

          {/* Переключатель сортировки */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1C1C1E] p-1 rounded-xl border border-stone-200 dark:border-white/10 text-xs text-stone-600 dark:text-stone-300 shadow-2xs">
            <button 
              type="button"
              onClick={() => setSortBy(sortBy === 'date' ? 'amount' : sortBy === 'amount' ? 'progress' : 'date')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer font-medium"
              title="Переключить сортировку"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#4a7c59] dark:text-emerald-400" />
              <span>
                {sortBy === 'date' ? 'По дате' : sortBy === 'amount' ? 'По сумме' : 'По прогрессу'}
              </span>
            </button>
          </div>
        </div>

        {debts.length === 0 ? (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-dashed border-stone-300 dark:border-white/10 p-10 sm:p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
              <Smile className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-display font-bold text-stone-900 dark:text-white">Долгов нет! 🎉</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              Все кредиты и рассрочки закрыты или еще не добавлены в систему. Нажмите кнопку ниже, чтобы внести новый долг.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#4a7c59] text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить первый долг</span>
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {sortedDebts.map((debt) => {
                const linkedExpense = findLinkedExpenseForDebt(debt.id, settings.mandatoryExpenses);
                const paymentStatus = computeDebtMonthPaymentStatus(debt, linkedExpense, transactions, settings, new Date());
                const isPaidThisMonth = paymentStatus.isPaid;
                const overdue = isOverdue(debt.dueDate, isPaidThisMonth);
                const paidAmt = getPaidAmount(debt);
                const progress = debt.totalAmount > 0 ? Math.min(100, Math.round((paidAmt / debt.totalAmount) * 100)) : 0;
                const extendedDebt = debt as unknown as ExtendedDebt; 

                return (
                  <article 
                    key={debt.id} 
                    className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-stone-200/90 dark:border-white/10 p-4 sm:p-5 shadow-card flex flex-col space-y-3.5 relative transition-all duration-300"
                  >
                    {/* Header row: Icon, Name & Status, Utility buttons */}
                    <header className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        {/* Sage Badge House / Credit Icon */}
                        <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#4a7c59]/15 dark:border-emerald-800/40 shadow-xs">
                          {getDebtIcon(debt.name)}
                        </div>
                        
                        {/* Title & Badges container */}
                        <div className="flex flex-col items-start space-y-1 min-w-0 flex-1">
                          <h2 className="text-xl font-bold text-stone-900 dark:text-white leading-tight tracking-tight truncate max-w-full">
                            {debt.name}
                          </h2>

                          {/* Status badge: Просрочено / Оплачено */}
                          {overdue ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fdf2f2] dark:bg-rose-950/40 text-[#b02a37] dark:text-rose-300 border border-[#f8d7da] dark:border-rose-900/50">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Просрочено</span>
                            </div>
                          ) : isPaidThisMonth ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <span>Оплачено</span>
                            </div>
                          ) : null}

                          {/* Final payment date info */}
                          <p className="text-[11px] font-semibold tracking-wider text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1.5 pt-0.5">
                            <span className="w-2 h-2 rounded-full border border-[#4a7c59]/60 bg-[#4a7c59]/20 dark:border-emerald-400/60 dark:bg-emerald-400/20 inline-block shrink-0" />
                            <span>ФИНАЛ: {debt.finalClosingDate ? formatDate(debt.finalClosingDate) : 'Не указан'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Utility Icons: Notification, History, Delete */}
                      <div className="flex items-center space-x-1 shrink-0 -mr-1">
                        <button 
                          type="button"
                          onClick={() => setShowNotifySettings(debt)}
                          aria-label="Напоминания" 
                          title="Напоминания" 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:text-[#4a7c59] dark:hover:text-emerald-400 hover:bg-[#edf4ef] dark:hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowDebtStats(extendedDebt)}
                          aria-label="История" 
                          title="История платежей и статистика" 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:text-[#4a7c59] dark:hover:text-emerald-400 hover:bg-[#edf4ef] dark:hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setDebtToDelete(debt)}
                          aria-label="Удалить карточку" 
                          title="Удалить" 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-[#d9534f] hover:bg-red-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </header>

                    {/* Linked mandatory payment info banner */}
                    {linkedExpense && (
                      <div className="bg-[#fef7e6] dark:bg-amber-950/30 rounded-2xl border border-[#fde6b3]/80 dark:border-amber-900/40 px-3.5 py-2.5 flex items-center space-x-2.5 text-[#8f6004] dark:text-amber-300 shadow-xs">
                        <div className="p-1 rounded-md bg-amber-200/50 dark:bg-amber-900/50 text-[#8f6004] dark:text-amber-300 shrink-0">
                          <Link2 className="w-4 h-4" />
                        </div>
                        <div className="text-xs leading-snug">
                          <span className="font-medium text-stone-600 dark:text-stone-300 block">Обязательный платёж:</span>
                          <span className="font-bold text-stone-900 dark:text-white tracking-tight">«{linkedExpense.name}» (до {linkedExpense.day}-го)</span>
                        </div>
                      </div>
                    )}

                    {/* Payment schedule block: ПЛАТЁЖ ДО */}
                    <section className="bg-[#f5f2eb]/70 dark:bg-white/5 border border-stone-200/90 dark:border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2.5">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300 flex items-center justify-center shrink-0 shadow-xs">
                          <Calendar className="w-5 h-5 text-[#4a7c59] dark:text-emerald-400" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">ПЛАТЁЖ ДО</span>
                          <span className="text-sm font-bold text-stone-800 dark:text-stone-100 tracking-tight leading-tight truncate">
                            {debt.dueDate ? formatDateLong(debt.dueDate) : 'Не указана'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1 shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-300/80 dark:border-white/10 shadow-2xs">
                          {getDebtBadgeText(debt)}
                        </span>
                        <button 
                          type="button"
                          onClick={() => setShowDebtStats(extendedDebt)}
                          className="text-xs font-semibold text-[#4a7c59] hover:text-[#3d6749] dark:text-emerald-400 transition-colors inline-flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <PieChart className="w-3.5 h-3.5" />
                          <span>Статистика</span>
                        </button>
                      </div>
                    </section>

                    {/* Installment & Balance block: ВЗНОС & ОСТАТОК */}
                    <section className="bg-white dark:bg-stone-900/50 rounded-2xl border border-stone-200/90 dark:border-white/10 p-3.5 shadow-xs">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">ВЗНОС</span>
                        <div className="text-xs font-medium text-stone-600 dark:text-stone-300">
                          Остаток: <span className="font-bold text-stone-900 dark:text-white ml-0.5 tracking-tight">{formatCurrencyWithKopecks(debt.currentBalance ?? debt.totalAmount)}</span>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                        {formatCurrencyWithKopecks(debt.monthlyPayment || 0)}
                      </div>
                    </section>

                    {/* Warning / Payment status banner */}
                    <div className={`rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-xs font-semibold leading-normal ${
                      isPaidThisMonth
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                        : overdue
                          ? 'bg-[#fdf2f2] dark:bg-rose-950/40 border border-[#f8d7da] dark:border-rose-900/50 text-[#b02a37] dark:text-rose-300'
                          : 'bg-[#fdf2f2] dark:bg-amber-950/30 border border-[#f8d7da] dark:border-amber-900/40 text-[#b02a37] dark:text-amber-300'
                    }`}>
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {isPaidThisMonth ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0 text-[#d9534f]" />
                        )}
                        <span className="truncate">
                          {paymentStatus.displayStatusText}
                        </span>
                      </div>
                      {isPaidThisMonth && paymentStatus.paidAmount > 0 && (
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          {formatCurrencyWithKopecks(paymentStatus.paidAmount)}
                        </span>
                      )}
                    </div>

                    {/* Progress bar block: ПРОГРЕСС ПОГАШЕНИЯ */}
                    <section className="pt-0.5">
                      <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                        <span className="text-stone-500 dark:text-stone-400 uppercase text-[11px] tracking-wider">ПРОГРЕСС ПОГАШЕНИЯ</span>
                        <span className="text-[#4a7c59] dark:text-emerald-400 font-extrabold text-xs">{progress}.0%</span>
                      </div>
                      <div className="w-full bg-stone-200/80 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden p-0.5 flex items-center">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPaidThisMonth 
                              ? 'bg-emerald-500' 
                              : overdue 
                                ? 'bg-[#d9534f]' 
                                : 'bg-[#4a7c59] dark:bg-emerald-500'
                          }`} 
                          style={{ width: `${progress}%`, minWidth: progress > 0 ? 8 : 0 }} 
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-stone-500 dark:text-stone-400 font-medium mt-1.5 px-0.5">
                        <span>Выплачено: {formatCurrencyWithKopecks(paidAmt)}</span>
                        <span>Всего: {formatCurrencyWithKopecks(debt.totalAmount)}</span>
                      </div>
                    </section>

                    {/* Primary & Secondary Action Buttons */}
                    <footer className="grid grid-cols-2 gap-2.5 pt-1">
                      <button 
                        type="button"
                        onClick={() => togglePaidStatus(debt.id)}
                        aria-label={isPaidThisMonth ? 'Отменить платёж' : 'Внести платёж'}
                        className={`w-full py-3 px-3 font-bold rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                          isPaidThisMonth 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100'
                            : 'bg-[#4a7c59] hover:bg-[#3d6749] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isPaidThisMonth ? (
                          <>
                            <RotateCcw className="w-4 h-4" />
                            <span className="tracking-wide text-xs sm:text-sm leading-none uppercase">ОТМЕНИТЬ</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[2.6]" />
                            <span className="tracking-wide text-xs sm:text-sm leading-none uppercase">ВНЕСТИ</span>
                          </>
                        )}
                      </button>

                      <button 
                        type="button"
                        onClick={() => setEditingDebt(extendedDebt)}
                        aria-label="Редактировать параметры долга"
                        className="w-full py-3 px-3 bg-[#f5f2eb] hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold rounded-2xl border border-stone-300/80 dark:border-white/10 active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 stroke-[2.2]" />
                        <span className="tracking-wide text-xs sm:text-sm leading-none uppercase text-stone-700 dark:text-stone-200">РЕДАКТИРОВАТЬ</span>
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>

            {/* Ближайшие платежи (Компактный график / Upcoming preview) */}
            <section className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-stone-200/90 dark:border-white/10 p-4 sm:p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-[#4a7c59] dark:bg-emerald-400" />
                  <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                    Ближайшие платежи
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowEarlyRepaymentCalc(true)}
                  className="text-xs font-semibold text-[#4a7c59] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Весь график
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {sortedDebts.slice(0, 3).map((d) => {
                  const day = d.dueDate ? new Date(d.dueDate).getDate() : 15;
                  const monthName = d.dueDate 
                    ? new Date(d.dueDate).toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
                    : 'Текущий месяц';

                  return (
                    <div 
                      key={d.id} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#f5f2eb]/70 dark:bg-white/5 border border-stone-200/70 dark:border-white/10"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {day}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-800 dark:text-stone-200 truncate capitalize">
                            {monthName}
                          </p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                            {d.name} · {d.paidThisMonth ? 'Оплачено' : 'Плановый платёж'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="font-bold text-stone-900 dark:text-white block">
                          {formatCurrencyWithKopecks(d.monthlyPayment || 0)}
                        </span>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400">
                          до {day.toString().padStart(2, '0')}.{new Date().getMonth() + 1}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </section>

      {/* 6. Полноразмерный баннер: Стратегия «Снежный ком» активна */}
      <section className="bg-white dark:bg-[#1C1C1E] border border-stone-200/90 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#d1dbd1] dark:border-emerald-800/40">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-stone-900 dark:text-white text-sm sm:text-base md:text-lg">
              Стратегия «Снежный ком» активна
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
              При внесении дополнительных <b>{extraPaymentAmount.toLocaleString('ru-RU')} ₽</b> в месяц срок закрытия первого кредита сократится на <b>4 месяца</b>, а переплата снизится на <b>~18 400 ₽</b>.
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setShowEarlyRepaymentCalc(true)}
          className="min-h-[44px] whitespace-nowrap px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-bold uppercase tracking-wider text-[#4a7c59] dark:text-emerald-400 hover:text-white hover:bg-[#4a7c59] bg-[#edf4ef] dark:bg-[#243628] rounded-xl sm:rounded-2xl border border-[#4a7c59]/40 transition shadow-xs cursor-pointer shrink-0 active:scale-95"
        >
          Калькулятор досрочного погашения
        </button>
      </section>

      {/* 7. Нижний аналитический блок: Динамика снижения долга (2024–2028) и Календарь ближайших выплат */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Левые 2 колонки на десктопе: Динамика снижения долговой нагрузки */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-stone-200/90 dark:border-white/10 shadow-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-stone-900 dark:text-white text-sm sm:text-base">
                Динамика снижения долга
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Прогноз до 2028 года с учетом регулярных аннуитетных платежей
              </p>
            </div>
            <span className="inline-block px-2.5 py-1 rounded-full bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 text-xs font-bold border border-[#d1dbd1] dark:border-emerald-800/40 shrink-0">
              Экономия ~248 000 ₽
            </span>
          </div>

          {/* SVG трендлайн с градиентом в стиле Terra */}
          <div className="w-full pt-2">
            <svg className="w-full h-32 overflow-visible" fill="none" viewBox="0 0 320 120">
              <line opacity="0.4" stroke="#c4c8bc" strokeDasharray="3 3" strokeWidth="0.75" x1="0" x2="320" y1="20" y2="20" />
              <line opacity="0.4" stroke="#c4c8bc" strokeDasharray="3 3" strokeWidth="0.75" x1="0" x2="320" y1="60" y2="60" />
              <line opacity="0.4" stroke="#c4c8bc" strokeDasharray="3 3" strokeWidth="0.75" x1="0" x2="320" y1="100" y2="100" />
              
              <path d="M10 24 Q 85 45, 160 68 T 310 98 L 310 110 L 10 110 Z" fill="url(#terraGradFlow)" opacity="0.25" />
              <path d="M10 24 Q 85 45, 160 68 T 310 98" stroke="#4a7c59" strokeLinecap="round" strokeWidth="2.5" />
              
              <circle cx="10" cy="24" fill="#4a7c59" r="3.5" />
              <circle cx="85" cy="46" fill="#4a7c59" r="3.5" />
              <circle cx="160" cy="68" fill="#4a7c59" r="3.5" />
              <circle cx="235" cy="84" fill="#4a7c59" r="3.5" />
              <circle cx="310" cy="98" fill="#faf6f0" r="4.5" stroke="#4a7c59" strokeWidth="2.5" />
              
              <defs>
                <linearGradient id="terraGradFlow" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4a7c59" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4a7c59" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Метки оси времени */}
            <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-semibold text-stone-500 dark:text-stone-400 mt-2 px-1">
              <span>2024 (5.1M)</span>
              <span>2025</span>
              <span>2026 (4.2M)</span>
              <span>2027</span>
              <span className="font-bold text-[#4a7c59] dark:text-emerald-400">2028 (2.1M)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300">
            <CheckCircle2 className="w-4 h-4 text-[#4a7c59] dark:text-emerald-400 shrink-0" />
            <span>{fixPrepositions("Соблюдение графика сокращает общий срок выплат на 1 год и 4 месяца.")}</span>
          </div>
        </div>

        {/* Правая 1 колонка: Ближайшие выплаты */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-stone-200/90 dark:border-white/10 shadow-card flex flex-col justify-between space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#4a7c59] dark:text-emerald-400" />
                <h3 className="font-display font-bold text-stone-900 dark:text-white text-sm sm:text-base">
                  Ближайшие выплаты
                </h3>
              </div>
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Календарь
              </span>
            </div>

            <div className="space-y-2.5">
              {debts.slice(0, 3).map((debt, index) => {
                const dueDay = debt.dueDate ? new Date(debt.dueDate).getDate() : 25;
                const dueMonth = debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('ru-RU', { month: 'short' }) : 'сен';
                return (
                  <div key={debt.id || index} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#f9f8f4] dark:bg-[#252528] border border-stone-200/60 dark:border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 flex flex-col items-center justify-center shrink-0 border border-stone-200/80 dark:border-white/10">
                        <span className="text-[9px] font-bold text-stone-400 uppercase leading-none">{dueMonth}</span>
                        <span className="text-xs font-bold leading-tight">{dueDay}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 dark:text-white leading-tight truncate">
                          {debt.name}
                        </p>
                        <p className="text-[10px] text-[#4a7c59] dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] dark:bg-emerald-400 shrink-0" />
                          <span>{index === 0 ? 'Автоплатёж' : index === 1 ? 'Напоминание' : 'Ручной взнос'}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-stone-900 dark:text-white shrink-0">
                      {formatCurrencyWithKopecks(debt.monthlyPayment || 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-stone-500 dark:text-stone-400 font-medium">Итого в текущем месяце:</span>
            <span className="font-extrabold text-[#4a7c59] dark:text-emerald-400 text-sm">
              {monthlyDebtLoad.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

      </section>

      {/* 8. Вдохновляющий редакционный блок «Маленькие шаги к свободе» */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-card h-28 sm:h-32 bg-stone-800 text-white flex items-end p-4 sm:p-5">
        <div className="absolute inset-0 bg-gradient-to-r from-[#2a4332]/95 via-[#3d6549]/80 to-[#5e8c68]/70" />
        <div className="relative z-10">
          <h4 className="text-xs sm:text-sm font-display font-bold text-white">
            Маленькие шаги к финансовой свободе
          </h4>
          <p className="text-[11px] sm:text-xs text-white/80 mt-0.5 max-w-xl leading-snug">
            Каждый досрочный платёж уменьшает базу начисления процентов и приближает день полного освобождения от кредитов.
          </p>
        </div>
      </div>

      {/* 9. Модальное окно подтверждения удаления долга */}
      {debtToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] border border-stone-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/30">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-display font-bold text-stone-900 dark:text-white">
                Удалить долг?
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1.5 leading-relaxed">
                Вы действительно хотите удалить обязательство <b>«{debtToDelete.name}»</b>? Все графики и история по нему будут аннулированы.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDebtToDelete(null)}
                className="w-1/2 py-3.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteDebt(debtToDelete.id)}
                className="w-1/2 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Модальное окно редактирования / создания долга (Terra) */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-[520px] bg-white dark:bg-[#1C1C1E] rounded-3xl border border-stone-200 dark:border-white/10 shadow-2xl p-6 sm:p-8 flex flex-col gap-5 relative z-50 my-auto max-h-[95vh] overflow-y-auto no-scrollbar text-stone-800 dark:text-stone-100">
            
            <header className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-extrabold text-stone-900 dark:text-white tracking-tight">
                {editingDebt.id ? 'Редактировать' : 'Новый долг'}
              </h2>
              <div className="flex items-center gap-2">
                {editingDebt.id && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const debt = debts.find(d => d.id === editingDebt.id);
                      if (debt) setDebtToDelete(debt);
                    }}
                    title="Удалить этот долг"
                    aria-label="Удалить запись" 
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setEditingDebt(null)}
                  aria-label="Закрыть окно" 
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Переключатель режима расчета */}
            <nav className="grid grid-cols-2 p-1.5 bg-stone-100 dark:bg-stone-800 rounded-2xl gap-1">
              <button 
                type="button"
                onClick={() => setMode('manual')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  mode === 'manual' 
                    ? 'bg-white dark:bg-[#2C2C2E] text-stone-900 dark:text-white shadow-xs font-extrabold' 
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Вручную</span>
              </button>

              <button 
                type="button"
                onClick={() => setMode('auto')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  mode === 'auto' 
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#4a7c59] dark:text-emerald-400 shadow-xs font-extrabold' 
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
                }`}
              >
                <Calculator className="w-4 h-4 text-[#4a7c59] dark:text-emerald-400" />
                <span>Авто-расчет</span>
              </button>
            </nav>

            <form onSubmit={handleUpdateDebt} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold tracking-wider text-stone-500 dark:text-stone-400 uppercase flex items-center justify-between">
                  <span>Название обязательства</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                </label>
                <input 
                  name="title" 
                  defaultValue={editingDebt.name} 
                  placeholder="Ипотека, Кредитная карта, Автокредит..." 
                  required 
                  className="w-full bg-[#fbf9f5] dark:bg-[#252528] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-base font-semibold rounded-2xl px-4 py-3.5 focus:bg-white dark:focus:bg-[#1E1E20] focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59] outline-none transition" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold tracking-wider text-[#4a7c59] dark:text-emerald-400 uppercase">
                  Срок полного закрытия (финал)
                </label>
                <div className="relative flex items-center">
                  <input 
                    name="finalClosingDate" 
                    type="date" 
                    value={editingDebt.finalClosingDate || ''}
                    onChange={(e) => setEditingDebt(prev => ({ ...prev, finalClosingDate: e.target.value }))}
                    required 
                    className="w-full bg-[#fbf9f5] dark:bg-[#252528] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-base font-semibold rounded-2xl px-4 py-3.5 focus:bg-white dark:focus:bg-[#1E1E20] focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59] outline-none transition" 
                  />
                </div>
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  {mode === 'auto' ? 'Система автоматически рассчитает оптимальный ежемесячный платёж.' : 'Планируемая дата полной ликвидации задолженности.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-stone-500 dark:text-stone-400 uppercase">
                    Общая сумма
                  </label>
                  <input 
                    name="totalAmount" 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={editingDebt.totalAmount || ''} 
                    onChange={(e) => setEditingDebt(prev => ({ ...prev, totalAmount: parseDecimal(e.target.value) }))}
                    placeholder="0.00" 
                    required 
                    className="w-full bg-[#fbf9f5] dark:bg-[#252528] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-base font-semibold rounded-2xl px-4 py-3.5 focus:bg-white dark:focus:bg-[#1E1E20] focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59] outline-none transition" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-stone-500 dark:text-stone-400 uppercase">
                    Выплачено
                  </label>
                  <input 
                    name="paidAmount" 
                    type="number" 
                    min="0"
                    step="0.01"
                    defaultValue={editingDebt.id ? ((editingDebt.totalAmount || 0) - (editingDebt.currentBalance ?? 0)) : ''} 
                    placeholder="0.00" 
                    required 
                    className="w-full bg-[#fbf9f5] dark:bg-[#252528] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-base font-semibold rounded-2xl px-4 py-3.5 focus:bg-white dark:focus:bg-[#1E1E20] focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59] outline-none transition" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
                    <span>Месячный взнос</span>
                    {mode === 'auto' && <Lock className="w-3 h-3 text-[#4a7c59] dark:text-emerald-400" />}
                  </label>
                  <input 
                    name="monthlyPayment" 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={editingDebt.monthlyPayment || ''} 
                    onChange={(e) => setEditingDebt(prev => ({ ...prev, monthlyPayment: parseDecimal(e.target.value) }))}
                    placeholder="0.00" 
                    readOnly={mode === 'auto'}
                    required 
                    className={`w-full text-base font-bold rounded-2xl px-4 py-3.5 outline-none transition ${
                      mode === 'auto' 
                        ? 'bg-[#edf4ef]/70 dark:bg-[#243628] text-[#3d6749] dark:text-emerald-400 border border-[#4a7c59]/20 cursor-not-allowed' 
                        : 'bg-[#fbf9f5] dark:bg-[#252528] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white focus:border-[#4a7c59]'
                    }`} 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
                    <span>Дата взноса</span>
                    {mode === 'auto' && <Lock className="w-3 h-3 text-[#4a7c59] dark:text-emerald-400" />}
                  </label>
                  <input 
                    name="dueDate" 
                    type="date" 
                    value={editingDebt.dueDate || ''}
                    onChange={(e) => setEditingDebt(prev => ({ ...prev, dueDate: e.target.value }))}
                    readOnly={mode === 'auto'}
                    required 
                    className={`w-full text-base font-bold rounded-2xl px-4 py-3.5 outline-none transition ${
                      mode === 'auto' 
                        ? 'bg-[#edf4ef]/70 dark:bg-[#243628] text-[#3d6749] dark:text-emerald-400 border border-[#4a7c59]/20 cursor-not-allowed' 
                        : 'bg-[#fbf9f5] dark:bg-[#252528] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white focus:border-[#4a7c59]'
                    }`} 
                  />
                </div>
              </div>

              {mode === 'auto' && safeMonthlyBudget > 0 && (
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  (editingDebt.monthlyPayment || 0) > safeMonthlyBudget 
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30' 
                    : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-0.5">
                      {(editingDebt.monthlyPayment || 0) > safeMonthlyBudget ? (
                        <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Перегрузка бюджета
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Комфортный платеж
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                      Безопасный лимит: <b>{safeMonthlyBudget.toLocaleString('ru-RU')} ₽</b>
                    </div>
                  </div>
                  
                  {(editingDebt.monthlyPayment || 0) > safeMonthlyBudget && (
                    <button 
                      type="button" 
                      onClick={applySafeBudget}
                      className="px-3 py-1.5 bg-white dark:bg-stone-800 border border-amber-200 dark:border-amber-700 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 shadow-xs cursor-pointer"
                    >
                      Исправить
                    </button>
                  )}
                </div>
              )}

              {mode === 'auto' && scheduleData.length > 0 && (
                <div className="bg-[#fbf9f5] dark:bg-[#252528] rounded-2xl p-4 border border-stone-200 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-[#4a7c59] dark:text-emerald-400" />
                      <h4 className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                        График погашения
                      </h4>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-white/10 text-[#4a7c59] dark:text-emerald-400">
                      {scheduleData.length - 1} мес.
                    </span>
                  </div>

                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={scheduleData}>
                        <defs>
                          <linearGradient id="colorTerraBal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4a7c59" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#4a7c59" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.4} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Остаток']}
                        />
                        <Area type="monotone" dataKey="balance" stroke="#4a7c59" strokeWidth={2} fill="url(#colorTerraBal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Связка с обязательным платежом */}
              <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40">
                <label className="text-[11px] font-bold tracking-wider text-amber-900 dark:text-amber-300 uppercase flex items-center gap-1.5" htmlFor="linkedExpenseId">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Связать с регулярным обязательным платежом</span>
                </label>
                <select
                  id="linkedExpenseId"
                  name="linkedExpenseId"
                  value={editingDebt.linkedExpenseId || ''}
                  onChange={(e) => {
                    const selectedExpId = e.target.value;
                    const foundExp = (settings.mandatoryExpenses || []).find(exp => exp.id === selectedExpId);
                    setEditingDebt(prev => ({
                      ...prev,
                      linkedExpenseId: selectedExpId || null,
                      ...(foundExp && (!prev?.monthlyPayment || prev.monthlyPayment === 0) ? { monthlyPayment: foundExp.amount } : {})
                    }));
                  }}
                  className="w-full text-sm font-semibold rounded-xl px-3.5 py-2.5 bg-white dark:bg-[#252528] border border-amber-300/80 dark:border-amber-900/60 text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Без привязки к обязательному платежу --</option>
                  {(settings.mandatoryExpenses || []).map(exp => (
                    <option key={exp.id} value={exp.id}>
                      {exp.name} ({exp.amount.toLocaleString('ru-RU')} ₽, день {exp.day}-й)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-400/80 leading-snug">
                  При оплате связанного обязательного платежа статус погашения долга за текущий месяц отметится автоматически.
                </p>
              </div>

              <footer className="flex items-center gap-3 pt-3 mt-1">
                <button 
                  type="button"
                  onClick={() => setEditingDebt(null)}
                  className="w-1/3 py-3.5 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-2xl text-sm transition-colors text-center cursor-pointer"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="w-2/3 py-3.5 px-6 bg-[#4a7c59] hover:bg-[#3d6749] text-white font-bold rounded-2xl text-sm transition-all shadow-md hover:shadow-lg shadow-[#4a7c59]/20 text-center cursor-pointer"
                >
                  Сохранить
                </button>
              </footer>

            </form>
          </div>
        </div>
      )}

      {/* 11. Модальное окно детального графика и календаря платежей (Terra Desktop & Mobile) */}
      {showDebtStats && (() => {
        const total = Number(showDebtStats.totalAmount) || ((showDebtStats.currentBalance ?? 0) + (getPaidAmount(showDebtStats) || 0)) || 1;
        const currentBal = showDebtStats.currentBalance ?? total;
        const paid = Math.max(0, total - currentBal);
        const progressPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 1000) / 10) : 0;
        const remainingMonths = (showDebtStats.monthlyPayment && showDebtStats.monthlyPayment > 0) 
          ? Math.ceil(currentBal / showDebtStats.monthlyPayment) 
          : 0;
        const startYear = new Date().getFullYear();
        const endYear = showDebtStats.finalClosingDate 
          ? new Date(showDebtStats.finalClosingDate).getFullYear() 
          : (startYear + Math.max(1, Math.ceil(remainingMonths / 12)));
        const timeframeRange = `${startYear} — ${endYear}`;
        const targetMonthYear = showDebtStats.finalClosingDate 
          ? new Date(showDebtStats.finalClosingDate).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }) 
          : (remainingMonths > 0 ? `до ${new Date(new Date().setMonth(new Date().getMonth() + remainingMonths)).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}` : '—');
        const targetClosingDateFormatted = showDebtStats.finalClosingDate 
          ? formatDate(showDebtStats.finalClosingDate) 
          : (remainingMonths > 0 ? formatDate(new Date(new Date().setMonth(new Date().getMonth() + remainingMonths)).toISOString()) : 'Не указана');

        const forecastList = getForecastDates(showDebtStats, 6);

        return (
          <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 lg:p-6 overflow-y-auto">
            <section 
              aria-labelledby="debt-schedule-title"
              aria-modal="true" 
              role="dialog"
              className="relative w-full max-w-[940px] max-h-[94vh] bg-white dark:bg-[#1C1C1E] rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200/90 dark:border-white/10 overflow-hidden flex flex-col transition-all duration-200 text-stone-800 dark:text-stone-100"
            >
              {/* Top Decorative Accent Gradient Bar */}
              <div className="h-2 w-full bg-gradient-to-r from-[#4a7c59] via-[#78a886] to-[#a86b46] shrink-0" />

              {/* Scrollable Content */}
              <div className="overflow-y-auto px-5 py-5 sm:px-8 sm:py-7 space-y-5 sm:space-y-6 no-scrollbar">
                
                {/* 1. Header with Icon, Title, Timeframe & Close */}
                <header className="flex items-start justify-between gap-3 pb-3 border-b border-stone-200/80 dark:border-white/10">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 shrink-0 border border-[#d1dbd1] dark:border-emerald-800/40">
                        {getDebtIcon(showDebtStats.name)}
                      </span>
                      <h2 className="text-lg sm:text-2xl lg:text-3xl font-display font-bold text-stone-900 dark:text-white tracking-tight break-words" id="debt-schedule-title">
                        {showDebtStats.name}
                      </h2>
                      <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-[#c8e8d0]/60 dark:bg-emerald-950/50 text-[#2a6038] dark:text-emerald-300 border border-[#4a7c59]/20 shrink-0">
                        {timeframeRange}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 pl-10 sm:pl-13">
                      {fixPrepositions("Аналитика и календарь погашения")}
                    </p>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setShowDebtStats(null)} 
                    aria-label="Закрыть окно"
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </header>

                {/* 2. KPI Debt Metrics */}
                {/* Desktop 3-Card Grid */}
                <div className="hidden md:grid md:grid-cols-3 gap-4">
                  {/* Card 1: Paid Amount with Donut Ring */}
                  <div className="bg-[#f9f8f4] dark:bg-[#252528] p-4 sm:p-5 rounded-2xl flex items-center justify-between border border-stone-200/80 dark:border-white/5 shadow-2xs">
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Выплачено
                      </span>
                      <div className="text-2xl font-display font-bold text-[#4a7c59] dark:text-emerald-400 tracking-tight">
                        {formatCurrencyWithKopecks(paid)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] dark:bg-emerald-400" />
                        <span>Всего выплачено</span>
                      </div>
                    </div>

                    {/* Mini Progress Ring */}
                    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                      <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" fill="none" r="20" stroke="#e4e0d8" strokeWidth="4.5" className="dark:stroke-stone-700" />
                        <circle 
                          cx="24" 
                          cy="24" 
                          fill="none" 
                          r="20" 
                          stroke="#4a7c59" 
                          strokeWidth="4.5" 
                          strokeDasharray="125.66" 
                          strokeDashoffset={125.66 * (1 - progressPercent / 100)} 
                          strokeLinecap="round" 
                        />
                      </svg>
                      <span className="absolute font-sans font-bold text-xs text-[#4a7c59] dark:text-emerald-400">
                        {progressPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Remaining Balance */}
                  <div className="bg-[#f9f8f4] dark:bg-[#252528] p-4 sm:p-5 rounded-2xl flex flex-col justify-between border border-stone-200/80 dark:border-white/5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Остаток долга
                      </span>
                      <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800">
                        {targetMonthYear}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight">
                        {formatCurrencyWithKopecks(currentBal)}
                      </div>
                      <div className="w-full bg-stone-200/80 dark:bg-stone-700 h-1.5 rounded-full mt-2.5 overflow-hidden">
                        <div 
                          className="bg-[#4a7c59] dark:bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (currentBal / total) * 100)}%` }} 
                        />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
                        <span>Текущий баланс</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">{remainingMonths} мес. осталось</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Monthly Payment */}
                  <div className="bg-[#f9f8f4] dark:bg-[#252528] p-4 sm:p-5 rounded-2xl flex flex-col justify-between border border-stone-200/80 dark:border-white/5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Текущий платеж
                      </span>
                      <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800">
                        Ежемесячно
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight">
                        {formatCurrencyWithKopecks(showDebtStats.monthlyPayment || 0)}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-stone-500 dark:text-stone-400 mt-2.5">
                        <span>{showDebtStats.strategy === 'auto' ? 'Авто-расчет' : 'Фиксированный аннуитет'}</span>
                        <span className="font-medium text-[#4a7c59] dark:text-emerald-400">В графике</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile 2-Card Grid */}
                <div className="grid grid-cols-2 gap-3 md:hidden">
                  {/* Card 1: Paid */}
                  <div className="bg-[#f9f8f4] dark:bg-[#252528] rounded-xl p-3.5 flex flex-col justify-between border border-stone-200/80 dark:border-white/5 shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Выплачено</span>
                      <CheckCircle2 className="w-4 h-4 text-[#4a7c59] dark:text-emerald-400" />
                    </div>
                    <div className="text-lg font-display font-bold text-[#4a7c59] dark:text-emerald-400 tracking-tight">
                      {formatCurrencyWithKopecks(paid)}
                    </div>
                    <div className="mt-2 w-full bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#4a7c59] dark:bg-emerald-500 h-full rounded-full" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>

                  {/* Card 2: Remaining */}
                  <div className="bg-[#f9f8f4] dark:bg-[#252528] rounded-xl p-3.5 flex flex-col justify-between border border-stone-200/80 dark:border-white/5 shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Остаток</span>
                      <Hourglass className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-lg font-display font-bold text-rose-600 dark:text-rose-400 tracking-tight">
                      {formatCurrencyWithKopecks(currentBal)}
                    </div>
                    <div className="mt-2 w-full bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (currentBal / total) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* 3. Section: Upcoming Payments List / Schedule */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-stone-900 dark:text-white">
                      <CalendarCheck className="w-4 h-4 text-[#4a7c59] dark:text-emerald-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                        {fixPrepositions("Календарь и ближайшие платежи")}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                        <span className="w-2 h-2 rounded-full bg-[#4a7c59]" />
                        <span>Оплачен</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                        <span className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-600" />
                        <span>Предстоит</span>
                      </span>
                    </div>
                  </div>

                  {/* Responsive Grid of Upcoming Payments */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[260px] sm:max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                    {forecastList.map((item, idx) => {
                      const isFirst = idx === 0;
                      const dateTitle = item.date.toLocaleDateString('ru-RU', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      });

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isFirst) {
                              togglePaidStatus(showDebtStats.id);
                            }
                          }}
                          role={isFirst ? 'button' : undefined}
                          tabIndex={isFirst ? 0 : undefined}
                          className={`group flex items-center justify-between p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border ${
                            item.isPaid
                              ? 'bg-[#edf4ef]/70 dark:bg-emerald-950/20 border-[#4a7c59]/40'
                              : isFirst
                                ? 'bg-white dark:bg-[#252528] border-[#4a7c59]/30 hover:border-[#4a7c59] cursor-pointer shadow-xs'
                                : 'bg-[#f9f8f4]/90 dark:bg-[#222224] border-stone-200/70 dark:border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              item.isPaid 
                                ? 'bg-[#4a7c59] text-white shadow-xs' 
                                : isFirst
                                  ? 'bg-[#edf4ef] dark:bg-stone-800 text-[#4a7c59] dark:text-emerald-400'
                                  : 'bg-stone-200/70 dark:bg-stone-800 text-stone-400'
                            }`}>
                              {item.isPaid ? (
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              ) : isFirst ? (
                                <Clock className="w-4 h-4" />
                              ) : (
                                <CalendarDays className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-white capitalize truncate">
                                {dateTitle}
                              </div>
                              <div className={`text-[10px] sm:text-[11px] font-medium mt-0.5 ${
                                item.isPaid 
                                  ? 'text-[#4a7c59] dark:text-emerald-400 font-semibold' 
                                  : isFirst 
                                    ? 'text-amber-700 dark:text-amber-400 font-semibold' 
                                    : 'text-stone-500 dark:text-stone-400'
                              }`}>
                                {item.isPaid 
                                  ? 'Оплачен вовремя ✓' 
                                  : isFirst 
                                    ? (daysToNextPayment !== null && daysToNextPayment >= 0 ? `Через ${daysToNextPayment} ${daysToNextPayment === 1 ? 'день' : daysToNextPayment < 5 ? 'дня' : 'дней'}` : 'Ближайший платёж') 
                                    : 'Регулярный взнос'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs sm:text-sm font-bold font-display text-stone-900 dark:text-white tracking-tight">
                              {formatCurrencyWithKopecks(item.amount)}
                            </span>
                            {item.isPaid && (
                              <div className="text-[10px] font-bold text-[#4a7c59] dark:text-emerald-400">
                                Оплачено
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Modal Footer: Closing Date & Impact Insight */}
                <footer className="pt-3.5 border-t border-stone-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-[#4a7c59] dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                      Плановая дата закрытия:
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-[#2a6038] dark:text-emerald-300 bg-[#c8e8d0]/60 dark:bg-emerald-950/50 border border-[#4a7c59]/20">
                      {targetClosingDateFormatted}
                    </span>
                  </div>

                  <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 leading-relaxed text-left sm:text-right max-w-md">
                    {fixPrepositions("Срок первого кредита сократится на 4 месяца при сохранении текущего графика платежей.")}
                  </p>
                </footer>

              </div>
            </section>
          </div>
        );
      })()}

      {/* 12. Модальное окно напоминаний */}
      {showNotifySettings && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] border border-stone-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <h3 className="text-xl font-display font-bold text-stone-900 dark:text-white">Напоминания</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase block mb-2">Напоминать за (дней)</label>
                <input 
                  type="number" 
                  value={showNotifySettings.notifyBefore ?? 3}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value) || 0;
                    const updates = { notifyBefore: val };
                    setDebts(debts.map(d => d.id === showNotifySettings.id ? {...d, ...updates} : d));
                    setShowNotifySettings({...showNotifySettings, ...updates});
                    if (familyId) await updateItem(familyId, 'debts', showNotifySettings.id, updates);
                  }}
                  className="w-full bg-[#fbf9f5] dark:bg-stone-800 border border-stone-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold text-stone-900 dark:text-white outline-none focus:border-[#4a7c59]"
                />
              </div>

              <div 
                onClick={async () => {
                  const newVal = !showNotifySettings.notifyIfOverdue;
                  const updates = { notifyIfOverdue: newVal };
                  setDebts(debts.map(d => d.id === showNotifySettings.id ? {...d, ...updates} : d));
                  setShowNotifySettings({...showNotifySettings, ...updates});
                  if (familyId) await updateItem(familyId, 'debts', showNotifySettings.id, updates);
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                  showNotifySettings.notifyIfOverdue 
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400' 
                    : 'bg-[#fbf9f5] dark:bg-stone-800 border-stone-200 dark:border-white/10 text-stone-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold">О просрочке</span>
                </div>
                <div className={`w-9 h-5 rounded-full relative transition-colors ${showNotifySettings.notifyIfOverdue ? 'bg-rose-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${showNotifySettings.notifyIfOverdue ? 'left-4.5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setShowNotifySettings(null)} 
              className="w-full py-3.5 bg-[#4a7c59] hover:bg-[#3d6749] text-white rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* 13. Модальное окно калькулятора досрочного погашения */}
      {showEarlyRepaymentCalc && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-[#1C1C1E] border border-stone-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-emerald-400 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-bold text-stone-900 dark:text-white">
                  Досрочное погашение
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowEarlyRepaymentCalc(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                  Дополнительный платёж в месяц
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range"
                    min="1000"
                    max="50000"
                    step="1000"
                    value={extraPaymentAmount}
                    onChange={(e) => setExtraPaymentAmount(Number(e.target.value))}
                    className="w-full accent-[#4a7c59]"
                  />
                  <span className="text-base font-bold font-display text-[#4a7c59] dark:text-emerald-400 whitespace-nowrap min-w-[90px] text-right">
                    {extraPaymentAmount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#edf4ef]/60 dark:bg-[#243628] border border-[#d1dbd1] dark:border-emerald-800/40 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-600 dark:text-stone-300">Ускорение закрытия:</span>
                  <strong className="text-[#4a7c59] dark:text-emerald-400">~{Math.max(1, Math.round(extraPaymentAmount / 2000) + 2)} мес. быстрее</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-600 dark:text-stone-300">Экономия на переплате:</span>
                  <strong className="text-[#4a7c59] dark:text-emerald-400">~{(extraPaymentAmount * 3.6).toLocaleString('ru-RU')} ₽</strong>
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setShowEarlyRepaymentCalc(false)} 
              className="w-full py-3.5 bg-[#4a7c59] hover:bg-[#3d6749] text-white rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default DebtSnowball;
