import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, Calendar, AlertTriangle, ShieldCheck, 
  DollarSign, ArrowRight, Wallet, CheckCircle2, XCircle,
  HelpCircle, Settings2, RefreshCw, Plus, X, Lock, Calculator, CalendarClock, CreditCard, Trash2, Edit2
} from 'lucide-react';
import { Transaction, Debt, AppSettings } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { addItem, updateItem, deleteItem } from '../utils/db';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { toast } from 'sonner';

interface Props {
  transactions: Transaction[];
  debts: Debt[];
  settings: AppSettings;
}

// Internal Types for Simulation
interface PaymentPlan {
  date: Date;
  debtId: string;
  debtName: string;
  amount: number;
  isCovered: boolean;
  isPartial: boolean;
  sourceIncomeDate: Date | null;
  warnings: string[];
  isPaid: boolean; // Add state for manual completion in this view
}

interface IncomePattern {
  amount: number;
  dayOfMonth: number;
  confidence: 'low' | 'high';
  isManual: boolean;
}

const SmartDebtPlanner: React.FC<Props> = ({ transactions, debts, settings }) => {
  const { familyId } = useAuth();
  const { setDebts } = useData(); // Access global state setter
  
  // -- Settings & State --
  const [safetyBufferPercent, setSafetyBufferPercent] = useState(10);
  const [manualSalaries, setManualSalaries] = useState<{amount: string, day: string}[]>([{ amount: '', day: '' }]);
  const [useManualIncome, setUseManualIncome] = useState(false);
  
  // -- Modal State --
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDebtType, setNewDebtType] = useState<'fixed' | 'flexible'>('fixed');
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({
      name: '',
      currentBalance: 0,
      totalAmount: 0,
      strategy: 'fixed',
      paymentDay: 10,
      monthlyPayment: 0,
      finalClosingDate: '',
  });

  // 1. Analyze Income History
  const incomePatterns = useMemo((): IncomePattern[] => {
    if (useManualIncome) {
        const valid = manualSalaries.filter(m => m.amount && m.day);
        if (valid.length > 0) {
            return valid.map(m => ({
                amount: parseFloat(m.amount),
                dayOfMonth: parseInt(m.day),
                confidence: 'high',
                isManual: true
            }));
        }
    }

    const salaryTxs = transactions.filter(t => 
        t.type === 'income' && 
        (t.category === 'salary' || (t.note || '').toLowerCase().includes('зарплата') || (t.note || '').toLowerCase().includes('salary'))
    );

    if (salaryTxs.length < 2) return [];

    // Simple clustering by day of month
    const dayAmounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};
    
    // look at last 3 months
    const last3Months = salaryTxs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    
    last3Months.forEach(t => {
        const d = new Date(t.date).getDate();
        // find nearest clustered day within 3 days
        let foundKey = Object.keys(dayCounts).map(Number).find(k => Math.abs(k - d) <= 3);
        const key = foundKey !== undefined ? foundKey : d;
        dayCounts[key] = (dayCounts[key] || 0) + 1;
        dayAmounts[key] = (dayAmounts[key] || 0) + t.amount;
    });

    return Object.keys(dayCounts).map(Number).map(k => ({
        amount: Math.floor(dayAmounts[k] / dayCounts[k]),
        dayOfMonth: k,
        confidence: dayCounts[k] > 1 ? 'high' : 'low',
        isManual: false
    })).sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }, [transactions, useManualIncome, manualSalaries]);

  // 2. Simulation Engine
  const simulation = useMemo(() => {
      if (!incomePatterns || incomePatterns.length === 0) return null;

      const activeDebts = debts.filter(d => d.currentBalance > 0);
      const schedule: PaymentPlan[] = [];
      let totalRequired = 0;
      let totalCovered = 0;
      let criticalDate: Date | null = null;

      const now = new Date();
      // Set to start of today for clean comparisons
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 1. Generate Income Instances for the next 6 months
      const incomes: { date: Date; amount: number; available: number }[] = [];
      for (let m = 0; m < 6; m++) {
          for (const inc of incomePatterns) {
              const d = new Date(now.getFullYear(), now.getMonth() + m, inc.dayOfMonth);
              if (d >= today || m === 0) { // Keep if future or current month
                  incomes.push({ 
                      date: d, 
                      amount: inc.amount, 
                      available: inc.amount * (1 - safetyBufferPercent / 100)
                  });
              }
          }
      }
      incomes.sort((a, b) => a.date.getTime() - b.date.getTime());

      // 2. Generate Due Events
      const simDebts = activeDebts.map(d => ({ ...d }));
      const dues: { dueDate: Date; debt: Debt; amount: number }[] = [];

      simDebts.forEach(debt => {
          if (debt.strategy === 'fixed') {
              for (let m = 0; m < 6; m++) {
                  const dDate = new Date(now.getFullYear(), now.getMonth() + m, debt.paymentDay || 1);
                  if (dDate >= today) {
                      dues.push({ dueDate: dDate, debt, amount: debt.monthlyPayment || 0 });
                  }
              }
          } else {
              // Flexible logic
              const targetDate = debt.finalClosingDate ? new Date(debt.finalClosingDate) : null;
              let monthsLeft = 1;
              if (targetDate) {
                  const diffMonths = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
                  monthsLeft = Math.max(1, diffMonths);
              }
              const min10 = debt.currentBalance * 0.1;
              const amortized = debt.currentBalance / monthsLeft;
              const monthlyAmount = Math.max(min10, amortized);

              for (let m = 0; m < monthsLeft && m < 6; m++) {
                  const dDate = new Date(now.getFullYear(), now.getMonth() + m + 1, 0); // End of month
                  if (dDate >= today) {
                      dues.push({ dueDate: dDate, debt, amount: monthlyAmount });
                  }
              }
          }
      });
      // Sort dues chronologically
      dues.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      // 3. Map Dues to Incomes
      for (const due of dues) {
          // Track decreasing balance
          if (due.debt.currentBalance <= 0) continue;
          
          let remainingToPay = Math.min(due.amount, due.debt.currentBalance);
          totalRequired += remainingToPay;

          // Find eligible incomes (<= dueDate), sort by latest first to spend closest to due date
          const eligibleIncomes = incomes
              .filter(inc => inc.date.getTime() <= due.dueDate.getTime())
              .sort((a, b) => b.date.getTime() - a.date.getTime());

          if (eligibleIncomes.length === 0) {
              const futureIncomes = incomes.filter(inc => inc.date.getTime() > due.dueDate.getTime());
              if (futureIncomes.length > 0) {
                  eligibleIncomes.push(futureIncomes[0]);
              }
          }

          let amountCovered = 0;
          let anyWarnings: string[] = [];

          for (const inc of eligibleIncomes) {
              if (remainingToPay <= 0) break;
              if (inc.available > 0) {
                  const take = Math.min(inc.available, remainingToPay);
                  inc.available -= take;
                  remainingToPay -= take;
                  amountCovered += take;
                  
                  if (inc.date.getTime() > due.dueDate.getTime()) {
                      anyWarnings.push(`З/п позже срока: ${inc.date.getDate()}-го`);
                  }

                  schedule.push({
                      date: due.dueDate, // We show it at due date in UI
                      debtId: due.debt.id,
                      debtName: due.debt.name,
                      amount: take,
                      isCovered: true, // partial logic handled below
                      isPartial: false,
                      sourceIncomeDate: inc.date,
                      warnings: [...anyWarnings],
                      isPaid: false
                  });
              }
          }

          if (remainingToPay > 0) {
              anyWarnings.push('Нехватка средств');
              if (!criticalDate) criticalDate = due.dueDate;
              
              schedule.push({
                  date: due.dueDate,
                  debtId: due.debt.id,
                  debtName: due.debt.name,
                  amount: remainingToPay,
                  isCovered: false,
                  isPartial: amountCovered > 0,
                  sourceIncomeDate: null,
                  warnings: anyWarnings,
                  isPaid: false
              });
          }
          
          due.debt.currentBalance -= amountCovered;
          totalCovered += amountCovered;
      }

      schedule.sort((a, b) => a.date.getTime() - b.date.getTime());

      return { schedule, totalRequired, totalCovered, criticalDate };
  }, [incomePatterns, debts, safetyBufferPercent]);

  // -- Handlers --
  const handleSaveDebt = async () => {
      // Final Validation
      if (!newDebt.name || (newDebt.currentBalance || 0) <= 0) return;
      
      const debtId = newDebt.id || Date.now().toString();

      const debtToSave: Debt = {
          id: debtId,
          name: newDebt.name!,
          currentBalance: Number(newDebt.currentBalance),
          totalAmount: Number(newDebt.totalAmount || newDebt.currentBalance),
          color: '#FF3B30',
          strategy: newDebtType,
          paymentDay: newDebtType === 'fixed' ? Number(newDebt.paymentDay) : undefined,
          monthlyPayment: newDebtType === 'fixed' ? Number(newDebt.monthlyPayment) : undefined,
          finalClosingDate: newDebtType === 'flexible' ? newDebt.finalClosingDate : undefined,
          paidThisMonth: false,
          notifyBefore: 3,
          notifyIfOverdue: true
      };

      // 1. Update Local State (Optimistic)
      if (newDebt.id) {
          setDebts(prev => prev.map(d => d.id === newDebt.id ? debtToSave : d));
          toast.success('Долг обновлен');
      } else {
          setDebts(prev => [...prev, debtToSave]);
          toast.success('Долг добавлен');
      }

      // 2. Persist to DB
      if (familyId) {
          if (newDebt.id) {
              await updateItem(familyId, 'debts', newDebt.id, debtToSave);
          } else {
              await addItem(familyId, 'debts', debtToSave);
          }
      }
      
      setIsAddModalOpen(false);
      setNewDebt({ name: '', currentBalance: 0, totalAmount: 0, strategy: 'fixed', paymentDay: 10, monthlyPayment: 0, finalClosingDate: '' });
  };

  const handleEditDebt = (debt: Debt) => {
      setNewDebtType(debt.strategy === 'flexible' ? 'flexible' : 'fixed');
      setNewDebt({ ...debt });
      setIsAddModalOpen(true);
  };

  const handleDeleteDebt = async (id: string) => {
      if (confirm('Удалить этот долг? История выплат не сохранится.')) {
          // 1. Local Update
          setDebts(prev => prev.filter(d => d.id !== id));
          
          // 2. DB Update
          if (familyId) await deleteItem(familyId, 'debts', id);
          
          toast.success('Долг удален');
          setIsAddModalOpen(false);
      }
  };

  const handleMarkPaid = async (item: PaymentPlan) => {
      if (confirm(`Отметить платеж ${item.amount} ₽ как выполненный? Это уменьшит остаток долга.`)) {
          const debt = debts.find(d => d.id === item.debtId);
          if (!debt) return;

          const newBalance = Math.max(0, debt.currentBalance - item.amount);
          
          // 1. Local Update
          setDebts(prev => prev.map(d => d.id === debt.id ? { ...d, currentBalance: newBalance } : d));
          
          // 2. DB Update
          if (familyId) {
              await updateItem(familyId, 'debts', debt.id, { currentBalance: newBalance });
          }
          toast.success(`Остаток обновлен: ${newBalance.toLocaleString()} ₽`);
      }
  };

  const getFlexibleSuggestion = () => {
      if (!newDebt.currentBalance || !newDebt.finalClosingDate) return null;
      const bal = Number(newDebt.currentBalance);
      const target = new Date(newDebt.finalClosingDate);
      const now = new Date();
      const months = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
      
      const min10 = Math.round(bal * 0.1);
      const amortized = Math.round(bal / months);
      const recommended = Math.max(min10, amortized);
      
      return { recommended, months };
  };

  const flexibleSuggestion = getFlexibleSuggestion();

  return (
    <div className="space-y-6 pb-24">
        {/* Header Block */}
        <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#1C1C1E] dark:text-white leading-none">Smart Debt</h2>
                        <p className="text-xs font-medium text-gray-400 mt-1">Планирование выплат</p>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        setNewDebt({ name: '', currentBalance: 0, totalAmount: 0, strategy: 'fixed', paymentDay: 10, monthlyPayment: 0, finalClosingDate: '' });
                        setIsAddModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform flex items-center gap-2"
                >
                    <Plus size={16} /> Добавить
                </button>
            </div>

            {/* Income Config */}
            {incomePatterns.length === 0 ? (
                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="font-bold text-sm text-[#1C1C1E] dark:text-white">Нет данных о доходе</h4>
                            <p className="text-xs text-gray-500 mt-1">Для точного прогноза нужна история зарплат или ручной ввод.</p>
                            <button onClick={() => setUseManualIncome(true)} className="mt-2 text-indigo-600 font-bold text-xs underline">Указать вручную</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/20 flex gap-4 overflow-x-auto no-scrollbar">
                    {incomePatterns.map((inc, i) => (
                        <div key={i} className="min-w-[120px] shrink-0">
                            <div className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Доход {i+1}</div>
                            <div className="text-lg font-black text-[#1C1C1E] dark:text-white mt-0.5">
                                ~{inc.amount.toLocaleString()} ₽ 
                                <div className="text-[10px] text-gray-400 font-medium">{inc.dayOfMonth}-го числа</div>
                            </div>
                        </div>
                    ))}
                    <div className="flex-1 flex justify-end items-center">
                        <button onClick={() => setUseManualIncome(true)} className="p-2 bg-white dark:bg-[#2C2C2E] rounded-xl text-gray-400 hover:text-indigo-500 transition-colors shrink-0">
                            <Settings2 size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Manual Salary Input */}
            {useManualIncome && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-3 animate-in fade-in">
                    {manualSalaries.map((m, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Сумма</label>
                                <input type="number" value={m.amount} onChange={e => {
                                    const next = [...manualSalaries];
                                    next[idx].amount = e.target.value;
                                    setManualSalaries(next);
                                }} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl text-sm font-bold outline-none" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Число</label>
                                <input type="number" min="1" max="31" value={m.day} onChange={e => {
                                    const next = [...manualSalaries];
                                    next[idx].day = e.target.value;
                                    setManualSalaries(next);
                                }} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl text-sm font-bold outline-none" placeholder="10" />
                            </div>
                            {manualSalaries.length > 1 && (
                                <button onClick={() => setManualSalaries(manualSalaries.filter((_, i) => i !== idx))} className="bg-red-50 text-red-500 p-3 rounded-xl mb-0.5">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={() => setManualSalaries([...manualSalaries, { amount: '', day: '' }])} className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] flex items-center justify-center gap-2">
                        <Plus size={14} /> Добавить ещё источник
                    </button>
                </div>
            )}
        </div>

        {/* ACTIVE DEBTS LIST */}
        {debts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {debts.map(debt => (
                    <div key={debt.id} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-sm text-[#1C1C1E] dark:text-white truncate max-w-[150px]">{debt.name}</h4>
                                <p className="text-[10px] font-medium text-gray-400">
                                    {debt.strategy === 'fixed' ? 'Фиксированный' : 'Гибкий'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEditDebt(debt)} className="p-2 text-gray-300 hover:text-blue-500 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl transition-colors"><Edit2 size={14}/></button>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-xl font-black text-[#1C1C1E] dark:text-white">{debt.currentBalance.toLocaleString()}</span>
                            <span className="text-xs font-bold text-gray-400">₽</span>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-white/5 flex justify-between text-[10px] font-bold text-gray-500">
                            {debt.strategy === 'fixed' ? (
                                <span>Платёж: {debt.monthlyPayment} ₽</span>
                            ) : (
                                <span>Финал: {new Date(debt.finalClosingDate || '').toLocaleDateString()}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* SIMULATION RESULTS */}
        {simulation && simulation.schedule.length > 0 && (
            <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-gray-400"><TrendingUp size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Покрытие</span></div>
                        <div className={`text-2xl font-black ${simulation.totalCovered < simulation.totalRequired ? 'text-red-500' : 'text-green-500'}`}>
                            {Math.round((simulation.totalCovered / (simulation.totalRequired || 1)) * 100)}%
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-gray-400"><ShieldCheck size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Подушка</span></div>
                        <div className="text-2xl font-black text-[#1C1C1E] dark:text-white">{safetyBufferPercent}%</div>
                        <input type="range" min="0" max="30" step="5" value={safetyBufferPercent} onChange={(e) => setSafetyBufferPercent(Number(e.target.value))} className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2" />
                    </div>
                </div>

                {/* Critical Warning */}
                {simulation.criticalDate && (
                    <div className="bg-red-500 text-white p-5 rounded-[2rem] shadow-lg shadow-red-500/30 flex items-start gap-4">
                        <div className="p-2 bg-white/20 rounded-xl"><AlertTriangle size={24} /></div>
                        <div>
                            <h4 className="font-bold text-lg leading-tight mb-1">Риск просрочки!</h4>
                            <p className="text-xs font-medium opacity-90 leading-relaxed">
                                Нехватка средств к {simulation.criticalDate.toLocaleDateString()}. Прогноз показывает дефицит.
                            </p>
                        </div>
                    </div>
                )}

                {/* Schedule List */}
                <div className="space-y-3">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                        <Calendar size={14} /> График платежей
                    </h3>
                    {simulation.schedule.slice(0, 10).map((event, idx) => (
                        <div key={idx} className={`relative p-4 rounded-3xl border-2 flex items-center gap-4 transition-all ${event.isCovered ? 'bg-white dark:bg-[#1C1C1E] border-transparent shadow-sm' : event.isPartial ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'}`}>
                            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 font-bold ${event.isCovered ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-500' : event.isPartial ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                                <span className="text-sm">{event.date.getDate()}</span>
                                <span className="text-[9px] uppercase">{event.date.toLocaleString('ru', { month: 'short' })}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-sm text-[#1C1C1E] dark:text-white truncate">{event.debtName}</h4>
                                    <div className="text-[10px] font-black bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-gray-500">
                                        {event.sourceIncomeDate ? `из з/п ${event.sourceIncomeDate.getDate()}-го` : 'Нет средств'}
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Нужно: {event.amount.toLocaleString()}</div>
                                    <div className={`text-sm font-black ${event.isCovered ? 'text-green-500' : event.isPartial ? 'text-yellow-600' : 'text-red-500'}`}>
                                        {event.isCovered ? 'Ок' : 'Не хватает'}
                                    </div>
                                </div>
                                {event.warnings.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {event.warnings.map((w, i) => (
                                            <span key={i} className="text-[9px] font-bold text-red-500 bg-red-100/50 px-2 py-1 rounded-lg">{w}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Pay Button (Visible if date is near or past) */}
                            { (new Date().getTime() >= event.date.getTime() - 86400000 * 3) && (
                                <button 
                                    onClick={() => handleMarkPaid(event)}
                                    className="absolute -top-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors"
                                    title="Отметить оплаченным"
                                >
                                    <CheckCircle2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ADD DEBT MODAL */}
        <AnimatePresence>
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="relative w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[#1C1C1E] dark:text-white">
                                {newDebt.id ? 'Редактировать долг' : 'Добавить долг'}
                            </h3>
                            {newDebt.id && (
                                <button onClick={() => handleDeleteDebt(newDebt.id!)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                                    <Trash2 size={20}/>
                                </button>
                            )}
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full"><X size={20}/></button>
                        </div>

                        {/* Type Selector */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button 
                                onClick={() => setNewDebtType('fixed')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${newDebtType === 'fixed' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent bg-gray-50 dark:bg-[#2C2C2E]'}`}
                            >
                                <div className="mb-2 text-indigo-500"><CalendarClock size={24}/></div>
                                <div className="font-bold text-sm text-[#1C1C1E] dark:text-white">Фиксированный</div>
                                <div className="text-[10px] text-gray-400 mt-1">Регулярный платеж в дату (Кредит, Ипотека)</div>
                            </button>
                            <button 
                                onClick={() => setNewDebtType('flexible')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${newDebtType === 'flexible' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-transparent bg-gray-50 dark:bg-[#2C2C2E]'}`}
                            >
                                <div className="mb-2 text-purple-500"><CreditCard size={24}/></div>
                                <div className="font-bold text-sm text-[#1C1C1E] dark:text-white">Гибкий</div>
                                <div className="text-[10px] text-gray-400 mt-1">Закрыть к дате (Кредитка, Займ)</div>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Название</label>
                                <input type="text" value={newDebt.name} onChange={e => setNewDebt({...newDebt, name: e.target.value})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl font-bold text-sm outline-none" placeholder="Напр: Ипотека Сбер" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Остаток долга</label>
                                    <input type="number" value={newDebt.currentBalance || ''} onChange={e => setNewDebt({...newDebt, currentBalance: Number(e.target.value), totalAmount: newDebt.totalAmount || Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl font-bold text-sm outline-none" placeholder="0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Всего (для справки)</label>
                                    <input type="number" value={newDebt.totalAmount || ''} onChange={e => setNewDebt({...newDebt, totalAmount: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl font-bold text-sm outline-none" placeholder="0" />
                                </div>
                            </div>

                            {/* Conditional Fields based on Type */}
                            {newDebtType === 'fixed' ? (
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/20 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">Ежемесячный платеж</label>
                                        <input type="number" value={newDebt.monthlyPayment || ''} onChange={e => setNewDebt({...newDebt, monthlyPayment: Number(e.target.value)})} className="w-full bg-white dark:bg-[#2C2C2E] p-4 rounded-2xl font-bold text-sm outline-none" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">День платежа (1-31)</label>
                                        <input type="number" min="1" max="31" value={newDebt.paymentDay || ''} onChange={e => setNewDebt({...newDebt, paymentDay: Number(e.target.value)})} className="w-full bg-white dark:bg-[#2C2C2E] p-4 rounded-2xl font-bold text-sm outline-none" placeholder="10" />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-purple-50/50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/20 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-purple-500 uppercase ml-2">Закрыть до</label>
                                        <input type="date" value={newDebt.finalClosingDate || ''} onChange={e => setNewDebt({...newDebt, finalClosingDate: e.target.value})} className="w-full bg-white dark:bg-[#2C2C2E] p-4 rounded-2xl font-bold text-sm outline-none" />
                                    </div>
                                    
                                    {flexibleSuggestion && (
                                        <div className="text-xs text-purple-700 dark:text-purple-300 bg-white dark:bg-purple-900/30 p-3 rounded-xl">
                                            💡 Рекомендуемый минимум: <b>{flexibleSuggestion.recommended.toLocaleString()} ₽</b>
                                            <div className="opacity-70 text-[10px] mt-1">
                                                (Чтобы закрыть за {flexibleSuggestion.months} мес.)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Preview */}
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl text-xs text-gray-500 font-medium leading-relaxed">
                            {newDebt.name && (
                                <>
                                    <span className="block font-bold text-[#1C1C1E] dark:text-white mb-1">Предпросмотр:</span>
                                    {newDebtType === 'fixed' ? (
                                        `Следующий платеж ${newDebt.monthlyPayment?.toLocaleString()} ₽ до ${newDebt.paymentDay}-го числа.`
                                    ) : (
                                        `Цель: закрыть ${newDebt.currentBalance?.toLocaleString()} ₽ до ${newDebt.finalClosingDate ? new Date(newDebt.finalClosingDate).toLocaleDateString() : '...'}`
                                    )}
                                </>
                            )}
                        </div>

                        <button 
                            onClick={handleSaveDebt}
                            disabled={!newDebt.name || !newDebt.currentBalance}
                            className="w-full mt-6 bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                        >
                            Сохранить долг
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default SmartDebtPlanner;