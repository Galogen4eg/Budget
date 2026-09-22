import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, X, PieChart, Bell, Calendar, CreditCard, Clock, Trash2, 
  CheckCircle2, RotateCcw, AlertTriangle, Smile,
  Calculator, Lock, CalendarCheck, ShieldCheck, TrendingUp,
  ChevronLeft, Sparkles, Check
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Debt, AppSettings, Transaction } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem } from '../utils/db';

interface Props {
  debts: Debt[];
  setDebts: (d: Debt[]) => void;
  settings: AppSettings;
  transactions?: Transaction[];
  onClose?: () => void;
}

type CalculationMode = 'manual' | 'auto';

interface ExtendedDebt extends Omit<Debt, 'strategy'> {
  strategy?: string; 
}

const DebtSnowball: React.FC<Props> = ({ debts, setDebts, settings, transactions = [], onClose }) => {
  const [showNotifySettings, setShowNotifySettings] = useState<Debt | null>(null);
  const [showDebtStats, setShowDebtStats] = useState<ExtendedDebt | null>(null);
  const [showEarlyRepaymentCalc, setShowEarlyRepaymentCalc] = useState<boolean>(false);
  const [extraPaymentAmount, setExtraPaymentAmount] = useState<number>(5000);
  const [editingDebt, setEditingDebt] = useState<Partial<ExtendedDebt> | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [mode, setMode] = useState<CalculationMode>('manual');
  
  const { familyId } = useAuth();

  // Синхронизация режима расчета при открытии модального окна
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

  // Расчет безопасного месячного бюджета на основе транзакций
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

    const totalAmount = Number(target.totalAmount.value);
    const paidAmount = Number(target.paidAmount.value);
    const currentBalance = Math.max(0, totalAmount - paidAmount);

    const updatedDebt: Partial<ExtendedDebt> = {
      ...editingDebt,
      name: target.title.value,
      totalAmount: totalAmount,
      currentBalance: currentBalance,
      monthlyPayment: Number(target.monthlyPayment.value),
      dueDate: target.dueDate.value,
      finalClosingDate: target.finalClosingDate.value,
      channels: editingDebt?.channels || ['site'],
      notifyBefore: editingDebt?.notifyBefore || 3,
      notifyIfOverdue: editingDebt?.notifyIfOverdue ?? true,
      color: '#4a7c59',
      strategy: mode
    };
    
    if (editingDebt?.id) {
      const newDebt = { ...updatedDebt, id: editingDebt.id } as unknown as Debt;
      setDebts(debts.map(d => d.id === editingDebt.id ? newDebt : d));
      if (familyId) await updateItem(familyId, 'debts', editingDebt.id, newDebt);
    } else {
      const newId = Date.now().toString();
      const newDebt = { ...updatedDebt, id: newId, paidThisMonth: false } as unknown as Debt;
      setDebts([...debts, newDebt]);
      if (familyId) await addItem(familyId, 'debts', newDebt);
    }
    setEditingDebt(null);
  };

  const togglePaidStatus = async (id: string) => {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;

    const isCurrentlyPaid = debt.paidThisMonth;
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

  return (
    <div className="space-y-6 w-full text-stone-800 dark:text-stone-100 font-sans pb-10">
      
      {/* Верхняя навигация и статус синхронизации */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          <button 
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#1C1C1E] rounded-full border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300 hover:text-[#4a7c59] dark:hover:text-green-400 hover:border-[#adc0ae] font-medium transition shadow-xs text-xs sm:text-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-[#4a7c59] dark:text-green-400" />
            <span>Ко всем сервисам</span>
          </button>
          <span className="text-stone-300 dark:text-stone-600">/</span>
          <span className="font-bold text-stone-800 dark:text-white">Долги</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 bg-white/80 dark:bg-[#1C1C1E]/80 px-3 py-1.5 rounded-full border border-stone-200/80 dark:border-white/10 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#4a7c59] animate-pulse"></span>
          <span>Данные актуализированы сегодня в {currentTimeSync}</span>
        </div>
      </div>

      {/* Заголовок страницы с кнопкой добавления */}
      <header className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 md:p-7 shadow-xs border border-stone-200/90 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-green-400 flex items-center justify-center shrink-0 border border-[#d1dbd1] dark:border-green-800/40 shadow-xs">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-extrabold text-stone-900 dark:text-white tracking-tight">
              Мои долги
            </h1>
            <p className="text-xs uppercase font-bold tracking-widest text-[#4a7c59] dark:text-green-400 mt-0.5">
              УПРАВЛЕНИЕ ВЫПЛАТАМИ И КРЕДИТАМИ
            </p>
          </div>
        </div>

        <div>
          <button 
            type="button"
            onClick={() => {
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
            }}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4a7c59] hover:bg-[#3d6749] text-white rounded-2xl font-display font-bold text-sm tracking-wide shadow-md shadow-[#4a7c59]/20 active:scale-98 transition cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Добавить долг</span>
          </button>
        </div>
      </header>

      {/* 3 карточки аналитической сводки */}
      <section aria-label="Сводка по долгам" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Карточка 1: Общий остаток долга */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 md:p-6 border border-stone-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Остаток долга</span>
              <span className="p-1.5 rounded-xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-display font-extrabold text-stone-900 dark:text-white tracking-tight">
              {totalRemaining.toLocaleString('ru-RU')} <span className="text-lg font-medium text-stone-500 dark:text-stone-400">₽</span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Выплачено {totalPaid.toLocaleString('ru-RU')} ₽ из {totalOriginal.toLocaleString('ru-RU')} ₽ · {overallProgress}%
            </p>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-[#4a7c59] dark:bg-green-500 h-2.5 rounded-full transition-all duration-700" 
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Карточка 2: Ближайший платёж */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 md:p-6 border border-stone-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Ближайший платёж</span>
              <span className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-display font-extrabold text-stone-900 dark:text-white tracking-tight">
              {(nextUpcomingDebt?.monthlyPayment || 0).toLocaleString('ru-RU')} <span className="text-lg font-medium text-stone-500 dark:text-stone-400">₽</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#4a7c59] dark:text-green-400 font-semibold mt-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {nextUpcomingDebt?.name || 'Платежи закрыты'} · {nextUpcomingDebt?.dueDate ? `До ${formatDate(nextUpcomingDebt.dueDate)}` : 'Нет активных дат'} {daysToNextPayment !== null && daysToNextPayment >= 0 ? `(через ${daysToNextPayment} дн.)` : ''}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
              Автосписание с зарплатной карты настроено
            </div>
          </div>
        </div>

        {/* Карточка 3: Ежемесячная нагрузка */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 md:p-6 border border-stone-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Нагрузка в месяц</span>
              <span className="p-1.5 rounded-xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-green-400">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-display font-extrabold text-stone-900 dark:text-white tracking-tight">
              {monthlyDebtLoad.toLocaleString('ru-RU')} <span className="text-lg font-medium text-stone-500 dark:text-stone-400">₽ / мес</span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {debts.length} {debts.length === 1 ? 'активное обязательство' : debts.length < 5 ? 'активных обязательства' : 'активных обязательств'} · Без просрочек
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-[#4a7c59] dark:text-green-400">
            <span>Безопасный уровень выплат</span>
            <span className="text-emerald-600 dark:text-emerald-400">В норме ✓</span>
          </div>
        </div>

      </section>

      {/* Список карточек долгов в 2 колонки */}
      <section aria-label="Список кредитных обязательств">
        {debts.length === 0 ? (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-dashed border-stone-300 dark:border-white/10 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-green-400 mx-auto flex items-center justify-center mb-4">
              <Smile className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-display font-bold text-stone-900 dark:text-white">Долгов нет! 🎉</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              Все кредиты и рассрочки закрыты или еще не добавлены в систему. Нажмите кнопку ниже, чтобы внести новый долг.
            </p>
            <button
              type="button"
              onClick={() => {
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
              }}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#4a7c59] text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить первый долг</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {debts.map((debt) => {
              const overdue = isOverdue(debt.dueDate, debt.paidThisMonth);
              const paidAmt = getPaidAmount(debt);
              const progress = debt.totalAmount > 0 ? Math.min(100, Math.round((paidAmt / debt.totalAmount) * 100)) : 0;
              const extendedDebt = debt as unknown as ExtendedDebt; 

              return (
                <article 
                  key={debt.id} 
                  className={`bg-white dark:bg-[#1C1C1E] rounded-3xl border-l-[5px] border border-stone-200/90 dark:border-white/10 shadow-xs hover:shadow-md transition-all duration-300 p-6 md:p-7 flex flex-col justify-between relative overflow-hidden group ${
                    overdue ? 'border-l-rose-500' : debt.paidThisMonth ? 'border-l-emerald-500' : 'border-l-[#4a7c59]'
                  }`}
                >
                  <div>
                    {/* Заголовок карточки с действиями */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight">
                            {debt.name}
                          </h2>
                          {overdue && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                              Просрочено
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 mt-1 uppercase tracking-wider">
                          <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-[#4a7c59] bg-[#edf4ef] dark:bg-green-950"></span>
                          <span>
                            ФИНАЛ: {debt.finalClosingDate ? formatDate(debt.finalClosingDate) : 'Не указан'}
                          </span>
                        </div>
                      </div>

                      {/* Кнопки действий: напоминания, статистика и удаление */}
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => setShowNotifySettings(debt)} 
                          title="Настроить напоминания"
                          className="w-9 h-9 rounded-full bg-stone-50 dark:bg-stone-800 hover:bg-[#edf4ef] dark:hover:bg-[#243628] text-stone-500 dark:text-stone-400 hover:text-[#4a7c59] dark:hover:text-green-400 flex items-center justify-center border border-stone-200 dark:border-white/10 transition-colors cursor-pointer"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowDebtStats(extendedDebt)} 
                          title="Детальный расчет и график"
                          className="w-9 h-9 rounded-full bg-stone-50 dark:bg-stone-800 hover:bg-[#edf4ef] dark:hover:bg-[#243628] text-stone-500 dark:text-stone-400 hover:text-[#4a7c59] dark:hover:text-green-400 flex items-center justify-center border border-stone-200 dark:border-white/10 transition-colors cursor-pointer"
                        >
                          <PieChart className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setDebtToDelete(debt)} 
                          title="Удалить долг"
                          className="w-9 h-9 rounded-full bg-stone-50 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center border border-stone-200 dark:border-white/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Плашка срока платежа */}
                    <div className="mt-5 bg-[#fbf9f5] dark:bg-[#252528] border border-stone-200/90 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-white/10 flex items-center justify-center text-[#4a7c59] dark:text-green-400 shadow-xs shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                            ПЛАТЁЖ ДО
                          </p>
                          <p className="text-stone-800 dark:text-stone-100 font-bold text-sm">
                            {formatDateLong(debt.dueDate)}
                          </p>
                        </div>
                      </div>

                      {debt.paidThisMonth && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          Оплачено в этом месяце
                        </span>
                      )}
                    </div>

                    {/* Строка взноса и кнопка статистики */}
                    <div className="mt-3.5 bg-[#fbf9f5]/60 dark:bg-[#222224] rounded-2xl p-3.5 sm:p-4 border border-stone-200/70 dark:border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 block mb-0.5">
                          ВЗНОС
                        </span>
                        <span className="text-xl sm:text-2xl font-display font-extrabold text-stone-900 dark:text-white">
                          {(debt.monthlyPayment || 0).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowDebtStats(extendedDebt)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-[#adc0ae] dark:border-white/10 hover:bg-[#edf4ef] dark:hover:bg-[#243628] text-[#4a7c59] dark:text-green-400 text-xs font-bold uppercase tracking-wider shadow-xs transition cursor-pointer"
                      >
                        <PieChart className="w-3.5 h-3.5" />
                        <span>Статистика</span>
                      </button>
                    </div>
                  </div>

                  {/* Прогресс и кнопки действий */}
                  <div className="mt-5 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400 mb-2">
                      <span className="uppercase tracking-wider">ПРОГРЕСС</span>
                      <span className="text-[#4a7c59] dark:text-green-400">{progress}%</span>
                    </div>
                    
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${debt.paidThisMonth ? 'bg-emerald-500' : overdue ? 'bg-rose-500' : 'bg-[#4a7c59] dark:bg-green-500'}`} 
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-5 pt-4 border-t border-stone-100 dark:border-white/5 flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => togglePaidStatus(debt.id)}
                        className={`flex-1 py-3 px-4 font-bold rounded-2xl text-xs uppercase tracking-wider transition text-center shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                          debt.paidThisMonth 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100'
                            : 'bg-[#4a7c59] hover:bg-[#3d6749] text-white shadow-sm shadow-[#4a7c59]/20'
                        }`}
                      >
                        {debt.paidThisMonth ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Отменить взнос</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Внести платёж</span>
                          </>
                        )}
                      </button>

                      <button 
                        type="button"
                        onClick={() => setEditingDebt(extendedDebt)}
                        className="py-3 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-2xl text-xs uppercase tracking-wider border border-stone-200 dark:border-white/10 transition cursor-pointer"
                      >
                        Редактировать
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Баннер стратегии Снежного кома */}
      <section className="bg-[#fbf9f5] dark:bg-[#202022] border border-stone-200/90 dark:border-white/10 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#edf4ef] dark:bg-[#243628] text-[#4a7c59] dark:text-green-400 flex items-center justify-center shrink-0 border border-[#d1dbd1] dark:border-green-800/40">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-stone-900 dark:text-white text-base">
              Стратегия «Снежный ком» активна
            </h3>
            <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300 mt-0.5">
              При внесении дополнительных {extraPaymentAmount.toLocaleString('ru-RU')} ₽ в месяц срок закрытия первого кредита сократится до 4 месяцев, а переплата снизится на ~18 400 ₽.
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setShowEarlyRepaymentCalc(true)}
          className="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#4a7c59] dark:text-green-400 hover:text-white hover:bg-[#4a7c59] dark:hover:bg-[#4a7c59] rounded-2xl border border-[#4a7c59] dark:border-green-600/40 transition shadow-xs cursor-pointer"
        >
          Калькулятор досрочного погашения
        </button>
      </section>

      {/* Модальное окно подтверждения удаления долга */}
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
                Вы действительно хотите удалить обязательство <b>«{debtToDelete.name}»</b>? Все расчеты по нему будут аннулированы.
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

      {/* Модальное окно редактирования / создания долга (Terra) */}
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
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#4a7c59] dark:text-green-400 shadow-xs font-extrabold' 
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
                }`}
              >
                <Calculator className="w-4 h-4 text-[#4a7c59] dark:text-green-400" />
                <span>Авто-расчет</span>
              </button>
            </nav>

            <form onSubmit={handleUpdateDebt} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold tracking-wider text-stone-500 dark:text-stone-400 uppercase flex items-center justify-between">
                  <span>Название</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                </label>
                <input 
                  name="title" 
                  defaultValue={editingDebt.name} 
                  placeholder="Ипотека, Кредитка, Рассрочка..." 
                  required 
                  className="w-full bg-[#fbf9f5] dark:bg-[#252528] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-base font-semibold rounded-2xl px-4 py-3.5 focus:bg-white dark:focus:bg-[#1E1E20] focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59] outline-none transition" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold tracking-wider text-[#4a7c59] dark:text-green-400 uppercase">
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
                    step="100"
                    value={editingDebt.totalAmount || ''} 
                    onChange={(e) => setEditingDebt(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
                    placeholder="0" 
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
                    step="100"
                    defaultValue={editingDebt.id ? ((editingDebt.totalAmount || 0) - (editingDebt.currentBalance ?? 0)) : ''} 
                    placeholder="0" 
                    required 
                    className="w-full bg-[#fbf9f5] dark:bg-[#252528] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-base font-semibold rounded-2xl px-4 py-3.5 focus:bg-white dark:focus:bg-[#1E1E20] focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59] outline-none transition" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
                    <span>Месячный взнос</span>
                    {mode === 'auto' && <Lock className="w-3 h-3 text-[#4a7c59] dark:text-green-400" />}
                  </label>
                  <input 
                    name="monthlyPayment" 
                    type="number" 
                    min="0"
                    step="10"
                    value={editingDebt.monthlyPayment || ''} 
                    onChange={(e) => setEditingDebt(prev => ({ ...prev, monthlyPayment: Number(e.target.value) }))}
                    placeholder="0" 
                    readOnly={mode === 'auto'}
                    required 
                    className={`w-full text-base font-bold rounded-2xl px-4 py-3.5 outline-none transition ${
                      mode === 'auto' 
                        ? 'bg-[#edf4ef]/70 dark:bg-[#243628] text-[#3d6749] dark:text-green-400 border border-[#4a7c59]/20 cursor-not-allowed' 
                        : 'bg-[#fbf9f5] dark:bg-[#252528] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white focus:border-[#4a7c59]'
                    }`} 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-wider text-stone-500 dark:text-stone-400 uppercase flex items-center gap-1">
                    <span>Дата взноса</span>
                    {mode === 'auto' && <Lock className="w-3 h-3 text-[#4a7c59] dark:text-green-400" />}
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
                        ? 'bg-[#edf4ef]/70 dark:bg-[#243628] text-[#3d6749] dark:text-green-400 border border-[#4a7c59]/20 cursor-not-allowed' 
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
                      <CalendarCheck className="w-4 h-4 text-[#4a7c59] dark:text-green-400" />
                      <h4 className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                        График погашения
                      </h4>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-white/10 text-[#4a7c59] dark:text-green-400">
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

      {/* Модальное окно детальной статистики долга */}
      {showDebtStats && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-stone-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-display font-bold text-stone-900 dark:text-white">{showDebtStats.name}</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider mt-0.5">
                  Детальный расчет графика
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowDebtStats(null)} 
                className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#edf4ef]/60 dark:bg-[#243628] p-4 rounded-2xl border border-[#d1dbd1] dark:border-green-800/40">
                <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Выплачено</p>
                <p className="text-xl font-display font-bold text-[#4a7c59] dark:text-green-400">{getPaidAmount(showDebtStats).toLocaleString('ru-RU')} ₽</p>
              </div>
              <div className="bg-stone-50 dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-white/10">
                <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Остаток долга</p>
                <p className="text-xl font-display font-bold text-rose-600 dark:text-rose-400">{showDebtStats.currentBalance.toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> 
                {showDebtStats.strategy === 'auto' ? 'Зарплатный график' : 'Календарь платежей'}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                {getForecastDates(showDebtStats, 4).map((item, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      item.isPaid 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' 
                        : i === 0 
                          ? 'bg-[#edf4ef]/50 dark:bg-[#243628]/40 border-[#d1dbd1] dark:border-green-800/40' 
                          : 'bg-white dark:bg-[#252528] border-stone-200 dark:border-white/5'
                    }`}
                  >
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 capitalize">
                      {item.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-stone-900 dark:text-white">{(item.amount || 0).toLocaleString('ru-RU')} ₽</span>
                      {item.isPaid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-stone-300 dark:border-stone-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-white/10 flex justify-between items-center text-xs font-bold">
              <span className="text-stone-500">Дата закрытия:</span>
              <span className="text-[#4a7c59] dark:text-green-400 bg-[#edf4ef] dark:bg-[#243628] px-3 py-1 rounded-xl border border-[#d1dbd1] dark:border-green-800/40">
                {formatDate(showDebtStats.finalClosingDate)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно напоминаний */}
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
              className="w-full py-3.5 bg-[#4a7c59] hover:bg-[#3d6749] text-white rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно калькулятора досрочного погашения */}
      {showEarlyRepaymentCalc && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-[#1C1C1E] border border-stone-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#edf4ef] text-[#4a7c59] flex items-center justify-center">
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
                  <span className="text-base font-bold font-display text-[#4a7c59] whitespace-nowrap min-w-[90px] text-right">
                    {extraPaymentAmount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#edf4ef]/60 dark:bg-[#243628] border border-[#d1dbd1] dark:border-green-800/40 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-600 dark:text-stone-300">Ускорение закрытия:</span>
                  <strong className="text-[#4a7c59] dark:text-green-400">~{Math.max(1, Math.round(extraPaymentAmount / 2000) + 2)} мес. быстрее</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-600 dark:text-stone-300">Экономия на переплате:</span>
                  <strong className="text-[#4a7c59] dark:text-green-400">~{(extraPaymentAmount * 3.6).toLocaleString('ru-RU')} ₽</strong>
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setShowEarlyRepaymentCalc(false)} 
              className="w-full py-3.5 bg-[#4a7c59] hover:bg-[#3d6749] text-white rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer"
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
