import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, X, PieChart, Bell, Calendar, CreditCard, Clock, Trash2, 
  CheckCircle2, Send, Globe, RotateCcw, Target, AlertTriangle, Smile,
  Calculator, Lock, TrendingDown, CalendarCheck, ShieldCheck, TrendingUp
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Debt, AppSettings, Transaction } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem } from '../utils/db';

interface Props {
  debts: Debt[];
  setDebts: (d: Debt[]) => void;
  settings: AppSettings;
  transactions?: Transaction[]; // Added for analysis
}

type CalculationMode = 'manual' | 'auto';

// Relaxed type for local component usage to handle legacy/mixed strategy values
interface ExtendedDebt extends Omit<Debt, 'strategy'> {
    strategy?: string; 
}

const DebtSnowball: React.FC<Props> = ({ debts, setDebts, settings, transactions = [] }) => {
  const [showNotifySettings, setShowNotifySettings] = useState<Debt | null>(null);
  const [showDebtStats, setShowDebtStats] = useState<ExtendedDebt | null>(null);
  const [editingDebt, setEditingDebt] = useState<Partial<ExtendedDebt> | null>(null);
  const [mode, setMode] = useState<CalculationMode>('manual');
  
  const { familyId } = useAuth();

  // Mode Switching Logic
  useEffect(() => {
      if (editingDebt) {
          if (editingDebt.id) {
              // Existing debt: strict check of strategy
              setMode(editingDebt.strategy === 'auto' ? 'auto' : 'manual');
          } else {
              // New debt: default to manual
              if (editingDebt.strategy === undefined) {
                  setMode('manual');
              }
          }
      }
  }, [editingDebt?.id]); 

  // Auto-calculation logic
  useEffect(() => {
      if (mode === 'auto' && editingDebt) {
          calculateAutoParams();
      }
  }, [mode, editingDebt?.totalAmount, editingDebt?.currentBalance, editingDebt?.finalClosingDate]);

  // --- Budget Analysis Logic ---
  const safeMonthlyBudget = useMemo(() => {
      if (!transactions || transactions.length < 10) return 0;

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
    const currentBalance = totalAmount - paidAmount;

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
      color: '#FF3B30',
      strategy: mode // Persist the strategy
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

  const handleDelete = async (id: string) => {
      if(confirm('Удалить этот долг?')) {
          setDebts(debts.filter(d => d.id !== id));
          if (familyId) await deleteItem(familyId, 'debts', id);
          setEditingDebt(null);
      }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Не указана';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  const isOverdue = (dateStr?: string, isPaid?: boolean) => {
    if (!dateStr || isPaid) return false;
    const due = new Date(dateStr);
    due.setHours(23, 59, 59, 999);
    return due < new Date();
  };

  const getPaidAmount = (d: { totalAmount: number, currentBalance: number }) => d.totalAmount - d.currentBalance;

  return (
    <div className="flex w-full h-full bg-transparent font-sans overflow-hidden">
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="px-6 py-5 flex items-center justify-between bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-md border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <CreditCard size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1C1C1E] dark:text-white tracking-tight">Мои долги</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Управление выплатами</p>
            </div>
          </div>
          <button 
            onClick={() => {
                setEditingDebt({ id: undefined, name: '', totalAmount: 0, currentBalance: 0, monthlyPayment: 0, dueDate: '', finalClosingDate: '', channels: ['site'], notifyBefore: 3, notifyIfOverdue: true, strategy: 'manual' });
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Добавить</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
          {debts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
                  <Smile size={48} className="mb-4 opacity-30" />
                  <p className="font-bold text-xs uppercase tracking-widest">Долгов нет! 🎉</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                {debts.map((debt) => {
                  const overdue = isOverdue(debt.dueDate, debt.paidThisMonth);
                  const paidAmt = getPaidAmount(debt);
                  const progress = Math.min(100, (paidAmt / debt.totalAmount) * 100);
                  const extendedDebt = debt as unknown as ExtendedDebt; 

                  return (
                    <div key={debt.id} className={`bg-white dark:bg-[#1C1C1E] rounded-[32px] border p-5 relative overflow-hidden group transition-all ${overdue ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : 'border-gray-100 dark:border-white/5 hover:border-indigo-500/40'}`}>
                      {/* Status Bar */}
                      <div className={`absolute top-0 left-0 w-1.5 h-full transition-all ${debt.paidThisMonth ? 'bg-emerald-500' : (overdue ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500')}`}></div>
                      
                      <div className="flex justify-between items-start mb-6 pl-2">
                        <div onClick={() => setEditingDebt(extendedDebt)} className="cursor-pointer flex-1 mr-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold text-[#1C1C1E] dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors truncate">{debt.name}</h4>
                            {overdue && <AlertTriangle size={16} className="text-rose-500 shrink-0" />}
                            {extendedDebt.strategy === 'auto' && <div className="text-[9px] font-black text-white bg-indigo-500 px-1.5 py-0.5 rounded ml-1">AUTO</div>}
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                              <Target size={12} className="text-indigo-500 dark:text-indigo-400" /> 
                              <span>Финал: {formatDate(debt.finalClosingDate)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setShowNotifySettings(debt)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${(debt.notifyBefore || 0) > 0 ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-500'}`}>
                            <Bell size={16} />
                          </button>
                          <button 
                            onClick={() => togglePaidStatus(debt.id)} 
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${debt.paidThisMonth ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 hover:text-white hover:bg-emerald-500'}`}
                          >
                            {debt.paidThisMonth ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4 pl-2">
                        <div className={`p-3 rounded-2xl border flex items-center justify-between ${overdue ? 'bg-rose-500/5 border-rose-500/20' : 'bg-gray-50 dark:bg-[#2C2C2E] border-gray-100 dark:border-white/5'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${overdue ? 'bg-rose-500/20 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                              <Calendar size={18} />
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase">Платёж до</p>
                              <p className={`text-sm font-bold ${overdue ? 'text-rose-500' : 'text-[#1C1C1E] dark:text-white'}`}>{formatDate(debt.dueDate)}</p>
                            </div>
                          </div>
                          {overdue && <span className="text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full animate-bounce">ПРОСРОЧЕНО</span>}
                        </div>

                        <div className={`flex justify-between p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 items-center`}>
                          <div>
                            <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Взнос</p>
                            <p className="text-xl font-black text-indigo-900 dark:text-white">{(debt.monthlyPayment || 0).toLocaleString()} ₽</p>
                          </div>
                          <button 
                            onClick={() => setShowDebtStats(debt as unknown as ExtendedDebt)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-100 dark:bg-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 rounded-xl text-[10px] font-black transition-all uppercase tracking-tighter"
                          >
                            <PieChart size={14} /> Статистика
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 px-1">
                            <span>Прогресс</span>
                            <span className="text-indigo-500 dark:text-indigo-400">{progress.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ease-out ${debt.paidThisMonth ? 'bg-emerald-500' : (overdue ? 'bg-rose-500' : 'bg-indigo-500')}`} style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          )}
        </div>
      </main>

      {/* DEBT INDIVIDUAL STATS MODAL */}
      {showDebtStats && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setShowDebtStats(null)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-[#1C1C1E] dark:text-white">{showDebtStats.name}</h3>
                  <p className="text-sm text-gray-500 font-bold uppercase mt-1">Детальный расчет</p>
                </div>
                <button onClick={() => setShowDebtStats(null)} className="w-10 h-10 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-[#2C2C2E] p-5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Выплачено</p>
                  <p className="text-lg font-black text-emerald-500">{getPaidAmount(showDebtStats).toLocaleString()} ₽</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#2C2C2E] p-5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Остаток</p>
                  <p className="text-lg font-black text-rose-500">{showDebtStats.currentBalance.toLocaleString()} ₽</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-500 uppercase flex items-center gap-2">
                  <Clock size={14} /> 
                  {showDebtStats.strategy === 'auto' ? 'Зарплатный график' : 'Календарь платежей'}
                </h4>
                <div className="space-y-2">
                  {getForecastDates(showDebtStats).map((item, i) => (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${item.isPaid ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20' : i === 0 ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-500/30' : 'bg-gray-50 dark:bg-[#2C2C2E] border-gray-100 dark:border-white/5'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 capitalize">
                              {item.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-bold text-[#1C1C1E] dark:text-white">{(item.amount || 0).toLocaleString()} ₽</p>
                          {item.isPaid ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                          )}
                        </div>
                      </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                 <div className="flex justify-between items-center text-xs font-bold">
                   <span className="text-gray-500">Дата полного закрытия</span>
                   <span className="text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">{formatDate(showDebtStats.finalClosingDate)}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFY MODAL */}
      {showNotifySettings && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowNotifySettings(null)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] border border-white/10 rounded-[32px] p-8 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-[#1C1C1E] dark:text-white">Уведомления</h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-3">Напоминать за (дней)</label>
                <input 
                  type="number" 
                  value={showNotifySettings.notifyBefore ?? 3}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value) || 0;
                    const updates = { notifyBefore: val };
                    setDebts(debts.map(d => d.id === showNotifySettings.id ? {...d, ...updates} : d));
                    setShowNotifySettings({...showNotifySettings, ...updates});
                    if(familyId) await updateItem(familyId, 'debts', showNotifySettings.id, updates);
                  }}
                  className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 font-bold text-[#1C1C1E] dark:text-white outline-none"
                />
              </div>

              <div 
                onClick={async () => {
                  const newVal = !showNotifySettings.notifyIfOverdue;
                  const updates = { notifyIfOverdue: newVal };
                  setDebts(debts.map(d => d.id === showNotifySettings.id ? {...d, ...updates} : d));
                  setShowNotifySettings({...showNotifySettings, ...updates});
                  if(familyId) await updateItem(familyId, 'debts', showNotifySettings.id, updates);
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${showNotifySettings.notifyIfOverdue ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30 text-rose-500' : 'bg-gray-50 dark:bg-[#2C2C2E] border-transparent text-gray-500'}`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} />
                  <span className="text-xs font-bold">О просрочке</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${showNotifySettings.notifyIfOverdue ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showNotifySettings.notifyIfOverdue ? 'left-6' : 'left-1'}`} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-3">Каналы</label>
                <div className="space-y-2">
                  {[
                    { id: 'site', label: 'Push-уведомления', icon: <Globe size={14}/> },
                    { id: 'telegram', label: 'Telegram Бот', icon: <Send size={14}/> }
                  ].map(ch => {
                    const currentChannels = showNotifySettings.channels || [];
                    const isSelected = currentChannels.includes(ch.id);
                    return (
                        <div 
                        key={ch.id}
                        onClick={async () => {
                            const newChannels = isSelected 
                            ? currentChannels.filter(c => c !== ch.id)
                            : [...currentChannels, ch.id];
                            const updates = { channels: newChannels };
                            setDebts(debts.map(d => d.id === showNotifySettings.id ? {...d, ...updates} : d));
                            setShowNotifySettings({...showNotifySettings, ...updates});
                            if(familyId) await updateItem(familyId, 'debts', showNotifySettings.id, updates);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-white' : 'bg-gray-50 dark:bg-[#2C2C2E] border-transparent text-gray-500 hover:border-gray-200 dark:hover:border-gray-700'}`}
                        >
                        <div className="flex items-center gap-2 text-xs font-bold">
                            {ch.icon} {ch.label}
                        </div>
                        <div className={`w-4 h-4 rounded-sm border ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-400 dark:border-gray-600'}`} />
                        </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <button onClick={() => setShowNotifySettings(null)} className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/30">Закрыть</button>
          </div>
        </div>
      )}

      {/* EDIT/ADD MODAL */}
      {editingDebt && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setEditingDebt(null)}></div>
          <form onSubmit={handleUpdateDebt} className="relative w-full max-w-md bg-white dark:bg-[#1C1C1E] border border-white/10 rounded-[32px] p-8 animate-in zoom-in-95 max-h-[95vh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1C1C1E] dark:text-white">{editingDebt.id ? 'Редактировать' : 'Новый долг'}</h3>
              {editingDebt.id && (
                <button type="button" onClick={() => handleDelete(editingDebt.id!)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-gray-100 dark:bg-[#2C2C2E] p-1 rounded-2xl mb-6">
                <button 
                    type="button"
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${mode === 'manual' ? 'bg-white dark:bg-[#3A3A3C] shadow-sm text-black dark:text-white' : 'text-gray-400'}`}
                >
                    <CreditCard size={14} /> Вручную
                </button>
                <button 
                    type="button"
                    onClick={() => setMode('auto')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${mode === 'auto' ? 'bg-white dark:bg-[#3A3A3C] shadow-sm text-indigo-500' : 'text-gray-400'}`}
                >
                    <Calculator size={14} /> Авто-расчет
                </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Название</label>
                <input name="title" defaultValue={editingDebt.name} placeholder="Кредит, Ипотека..." required className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent focus:border-indigo-500 text-[#1C1C1E] dark:text-white rounded-xl px-4 py-3.5 text-sm font-bold outline-none" />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-1 text-indigo-500">Срок полного закрытия (финал)</label>
                <div className="min-h-[52px]"> {/* Fixed container height to prevent jump */}
                    <input 
                        name="finalClosingDate" 
                        type="date" 
                        value={editingDebt.finalClosingDate || ''}
                        onChange={(e) => setEditingDebt(prev => ({ ...prev, finalClosingDate: e.target.value }))}
                        required 
                        className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent focus:border-indigo-500 text-[#1C1C1E] dark:text-white rounded-xl px-4 py-3.5 text-sm font-bold outline-none" 
                    />
                    {mode === 'auto' && (
                        <p className="text-[9px] text-gray-400 px-2 pt-1 animate-in fade-in">Система рассчитает оптимальный платеж.</p>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Общая сумма</label>
                  <input 
                    name="totalAmount" 
                    type="number" 
                    value={editingDebt.totalAmount || ''} 
                    onChange={(e) => setEditingDebt(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
                    placeholder="0" 
                    required 
                    className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent focus:border-indigo-500 text-[#1C1C1E] dark:text-white rounded-xl px-4 py-3.5 text-sm font-bold outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Выплачено</label>
                  <input 
                    name="paidAmount" 
                    type="number" 
                    // Use editingDebt.currentBalance if set, otherwise calculate.
                    // If opening existing, assume paid = total - current.
                    defaultValue={editingDebt.id ? ((editingDebt.totalAmount || 0) - (editingDebt.currentBalance ?? 0)) : ''} 
                    placeholder="0" 
                    required 
                    className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent focus:border-indigo-500 text-[#1C1C1E] dark:text-white rounded-xl px-4 py-3.5 text-sm font-bold outline-none" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-1 flex items-center gap-1">
                      Месячный взнос
                      {mode === 'auto' && <Lock size={10} />}
                  </label>
                  <input 
                    name="monthlyPayment" 
                    type="number" 
                    value={editingDebt.monthlyPayment || ''} 
                    onChange={(e) => setEditingDebt(prev => ({ ...prev, monthlyPayment: Number(e.target.value) }))}
                    placeholder="0" 
                    readOnly={mode === 'auto'}
                    required 
                    className={`w-full border border-transparent rounded-xl px-4 py-3.5 text-sm font-bold outline-none transition-colors ${mode === 'auto' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 cursor-not-allowed' : 'bg-gray-50 dark:bg-[#2C2C2E] focus:border-indigo-500 text-[#1C1C1E] dark:text-white'}`} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-1 flex items-center gap-1">
                      Дата взноса
                      {mode === 'auto' && <Lock size={10} />}
                  </label>
                  <input 
                    name="dueDate" 
                    type="date" 
                    value={editingDebt.dueDate || ''}
                    onChange={(e) => setEditingDebt(prev => ({ ...prev, dueDate: e.target.value }))}
                    readOnly={mode === 'auto'}
                    required 
                    className={`w-full border border-transparent rounded-xl px-4 py-3.5 text-sm font-bold outline-none transition-colors ${mode === 'auto' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 cursor-not-allowed' : 'bg-gray-50 dark:bg-[#2C2C2E] focus:border-indigo-500 text-[#1C1C1E] dark:text-white'}`} 
                  />
                </div>
              </div>

              {/* Safe Budget Suggestion in Auto Mode */}
              {mode === 'auto' && safeMonthlyBudget > 0 && (
                  <div className={`mt-2 p-3 rounded-xl border flex items-center justify-between ${
                      (editingDebt.monthlyPayment || 0) > safeMonthlyBudget 
                      ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30' 
                      : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30'
                  }`}>
                      <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider mb-0.5">
                              { (editingDebt.monthlyPayment || 0) > safeMonthlyBudget 
                                  ? <><AlertTriangle size={12} className="text-orange-500"/> Перегрузка бюджета</>
                                  : <><ShieldCheck size={12} className="text-green-500"/> Комфортный платеж</>
                              }
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              Безопасно до: <b>{safeMonthlyBudget.toLocaleString()} ₽</b>
                          </div>
                      </div>
                      
                      {(editingDebt.monthlyPayment || 0) > safeMonthlyBudget && (
                          <button 
                              type="button" 
                              onClick={applySafeBudget}
                              className="px-3 py-1.5 bg-white dark:bg-black/20 rounded-lg text-[10px] font-bold shadow-sm hover:shadow-md transition-all text-orange-600 dark:text-orange-400"
                          >
                              Исправить
                          </button>
                      )}
                  </div>
              )}

              {/* Schedule Preview for Auto Mode */}
              {mode === 'auto' && scheduleData.length > 0 && (
                  <div className="bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl p-4 border border-gray-100 dark:border-white/5 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                              <CalendarCheck size={14} className="text-indigo-500" />
                              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">График погашения</h4>
                          </div>
                          <div className="text-[9px] font-bold text-gray-400 bg-white dark:bg-white/5 px-2 py-1 rounded-lg">
                              {scheduleData.length - 1} мес.
                          </div>
                      </div>

                      {/* Info Text about floating payment */}
                      <div className="mb-4 bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/20 flex gap-2 items-start">
                          <div className="p-1 bg-white dark:bg-white/10 rounded-full text-indigo-500 mt-0.5 shrink-0">
                              <TrendingDown size={10} />
                          </div>
                          <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                              Это обязательный плавающий платеж. Он будет автоматически пересчитываться каждый месяц, чтобы вы успели закрыть долг к <b>{formatDate(editingDebt.finalClosingDate)}</b>.
                          </p>
                      </div>

                      {/* Area Chart Visualization */}
                      <div className="h-32 w-full -ml-2">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={scheduleData}>
                                  <defs>
                                      <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                                  <XAxis 
                                      dataKey="month" 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fontSize: 9, fill: '#9CA3AF' }} 
                                      interval="preserveStartEnd"
                                  />
                                  <YAxis hide />
                                  <Tooltip 
                                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                      labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase' }}
                                      itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#1C1C1E' }}
                                      formatter={(value: number) => [`${value.toLocaleString()} ₽`, 'Остаток']}
                                  />
                                  <Area 
                                      type="monotone" 
                                      dataKey="balance" 
                                      stroke="#6366f1" 
                                      strokeWidth={2}
                                      fillOpacity={1} 
                                      fill="url(#colorBal)" 
                                  />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              )}

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setEditingDebt(null)} className="flex-1 py-4 bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-2xl text-xs font-bold transition-colors">Отмена</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all">
                  {editingDebt.id ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DebtSnowball;