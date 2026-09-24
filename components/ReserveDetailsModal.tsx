
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Lock, ShieldCheck, Receipt, PiggyBank, Box, Coins, 
  Info, Clock, Calendar, Check, ArrowRight, Edit3, CheckCircle2, RotateCcw,
  CreditCard, Home, Link2
} from 'lucide-react';
import { MandatoryExpense } from '../types';

export interface DetailedMandatoryExpense {
  expense: MandatoryExpense;
  amountNeeded: number;
  paidAmount?: number;
  isPaid: boolean;
  isManuallyPaid: boolean;
  isOverdue?: boolean;
  subtitle?: string;
}

export interface ReserveDetailsModalProps {
  isOpen?: boolean;
  onClose: () => void;
  totalBalance?: number;
  reservedAmount?: number;
  savingsAmount?: number;
  manualReserved?: number;
  unpaidMandatoryTotal?: number;
  availableBalance?: number;
  dailyBudget?: number;
  daysRemaining?: number;
  savingsRate?: number;
  futureExpenses?: DetailedMandatoryExpense[];
  onUpdateManualSavings?: (amount: number) => void;
  onTogglePaid?: (expenseId: string, isPaid: boolean) => void;
  onPayExpenses?: (expenseIds: string[]) => void;
  onEditExpense?: (expense: MandatoryExpense) => void;
  privacyMode?: boolean;
  currency?: string;
}

const DEFAULT_SAMPLE_BILLS: DetailedMandatoryExpense[] = [
  {
    expense: { id: 'sample-phone', name: 'Телефон', amount: 448, day: 15, remind: true },
    amountNeeded: 448,
    isPaid: false,
    isManuallyPaid: false,
    isOverdue: true,
    subtitle: 'Мобильная связь и тариф'
  },
  {
    expense: { id: 'sample-camera', name: 'Фотоаппарат', amount: 10640, day: 18, remind: true },
    amountNeeded: 10640,
    isPaid: false,
    isManuallyPaid: false,
    isOverdue: true,
    subtitle: 'Рассрочка на технику (платеж 3/6)'
  },
  {
    expense: { id: 'sample-mortgage', name: 'Ипотека', amount: 27741.9, day: 20, remind: true },
    amountNeeded: 27741.9,
    isPaid: false,
    isManuallyPaid: false,
    isOverdue: true,
    subtitle: 'Ежемесячный обязательный платеж в банк'
  },
  {
    expense: { id: 'sample-internet', name: 'Интернет', amount: 660, day: 25, remind: true },
    amountNeeded: 660,
    isPaid: false,
    isManuallyPaid: false,
    isOverdue: false,
    subtitle: 'Домашний оптоволоконный интернет'
  }
];

export const ReserveDetailsModal: React.FC<ReserveDetailsModalProps> = ({
  onClose,
  totalBalance = 184320,
  reservedAmount = 39490,
  savingsAmount = 0,
  manualReserved = 0,
  unpaidMandatoryTotal = 39490,
  availableBalance = 7911,
  savingsRate = 0,
  futureExpenses,
  onUpdateManualSavings,
  onTogglePaid,
  onPayExpenses,
  onEditExpense,
  privacyMode = false,
  currency = '₽'
}) => {
  const currentMonthName = useMemo(() => {
    const raw = new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const [manualInput, setManualInput] = useState<string>(() => String(manualReserved || 0));
  const [isSuccessPaid, setIsSuccessPaid] = useState<boolean>(false);

  // Use provided expenses or fallback to the sample list
  const rawBillsList = useMemo(() => {
    if (futureExpenses && futureExpenses.length > 0) {
      return futureExpenses;
    }
    return DEFAULT_SAMPLE_BILLS;
  }, [futureExpenses]);

  // Selected bills for payment
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(() => {
    return new Set(rawBillsList.filter(b => !b.isPaid).map(b => b.expense.id));
  });

  useEffect(() => {
    setManualInput(String(manualReserved || 0));
  }, [manualReserved]);

  // Handle manual input change
  const handleManualBlur = () => {
    const num = parseFloat(manualInput.replace(',', '.'));
    const safeVal = isNaN(num) || num < 0 ? 0 : num;
    setManualInput(String(safeVal));
    if (onUpdateManualSavings) {
      onUpdateManualSavings(safeVal);
    }
  };

  const handleToggleBill = (id: string) => {
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Selected count & total sum
  const { selectedCount, selectedTotal } = useMemo(() => {
    let sum = 0;
    let count = 0;
    rawBillsList.forEach(item => {
      if (selectedBillIds.has(item.expense.id)) {
        count++;
        sum += item.amountNeeded > 0 ? item.amountNeeded : item.expense.amount;
      }
    });
    return { selectedCount: count, selectedTotal: sum };
  }, [rawBillsList, selectedBillIds]);

  // Handle cancellation of paid expense
  const handleCancelExpense = (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (onTogglePaid) {
      onTogglePaid(expenseId, false);
    }
  };

  // Handle payment action
  const handlePay = () => {
    const ids = Array.from(selectedBillIds);
    if (onPayExpenses) {
      onPayExpenses(ids);
    } else if (onTogglePaid) {
      ids.forEach(id => onTogglePaid(id, true));
    }
    setIsSuccessPaid(true);
    setTimeout(() => {
      setIsSuccessPaid(false);
    }, 3000);
  };

  const formatMoney = (val: number) => {
    if (privacyMode) return '••••';
    return Number(val.toFixed(1)).toLocaleString('ru-RU');
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-5xl bg-[#FCFAF7] dark:bg-[#1C1C1E] border border-stone-200/90 dark:border-white/10 rounded-3xl shadow-2xl shadow-stone-900/15 overflow-hidden text-stone-800 dark:text-stone-100 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Top Decorative Glow Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-36 bg-primary/10 blur-3xl pointer-events-none rounded-full" />

        {/* Modal Header */}
        <div className="px-6 md:px-8 pt-6 pb-4 border-b border-stone-200/70 dark:border-white/10 flex items-center justify-between relative z-10 bg-white/60 dark:bg-[#1C1C1E]/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF2EC] dark:bg-primary/20 border border-primary/20 flex items-center justify-center text-primary dark:text-green-400 shadow-sm shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-display font-bold tracking-tight text-stone-900 dark:text-white">
                  Структура резерва
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-green-400 border border-primary/20">
                  Активен
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 tracking-wider uppercase mt-0.5">
                ПОЧЕМУ ЭТИ ДЕНЬГИ ВРЕМЕННО НЕДОСТУПНЫ ДЛЯ СВОБОДНЫХ ТРАТ
              </p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onClose}
            aria-label="Закрыть" 
            className="w-10 h-10 rounded-full bg-stone-100 dark:bg-[#2C2C2E] hover:bg-stone-200 dark:hover:bg-[#3A3A3C] text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition flex items-center justify-center border border-stone-200/80 dark:border-white/10 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Two-Column Wide Layout) */}
        <div className="p-5 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 relative z-10 overflow-y-auto no-scrollbar">
          
          {/* Left Column: Summary Banner + 4 Metric Cards + Info Callout */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            
            {/* Top Hero Card: Всего в резерве */}
            <div className="w-full relative overflow-hidden rounded-2xl p-5 sm:p-6 text-stone-900 dark:text-white bg-gradient-to-br from-[#E2EFE5] via-[#EAF3EC] to-[#F1F7F2] dark:from-[#233529] dark:via-[#1F2F24] dark:to-[#19241C] border border-primary/25 dark:border-primary/40 shadow-sm">
              <div className="relative z-10 flex flex-col items-start justify-between">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] uppercase tracking-widest text-[#3d6849] dark:text-green-400 font-bold">
                    Всего в резерве
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-green-400 bg-white/70 dark:bg-black/40 px-2 py-0.5 rounded-full border border-primary/15 dark:border-primary/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Защищено
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-stone-900 dark:text-white mt-2">
                  {formatMoney(reservedAmount)} {currency}
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1.5 font-normal">
                  Сумма заблокирована до даты списания регулярных счетов
                </p>
              </div>
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary/10 rounded-full blur-xl pointer-events-none" />
            </div>

            {/* 4 Breakdown Metric Cards (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-3.5">
              
              {/* 1. Авто-копилка */}
              <div className="bg-white dark:bg-[#252528] border border-stone-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-primary/40 transition group">
                <div>
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 flex items-center justify-center">
                      <PiggyBank className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold tracking-wider uppercase">АВТО-КОПИЛКА</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight">
                    {formatMoney(savingsAmount)} {currency}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-white/10">
                    {savingsRate}%
                  </span>
                </div>
              </div>

              {/* 2. К оплате */}
              <div className="bg-white dark:bg-[#252528] border border-stone-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-primary/40 transition group">
                <div>
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold tracking-wider uppercase">К ОПЛАТЕ</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight">
                    {formatMoney(unpaidMandatoryTotal)} {currency}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FBEFEA] dark:bg-[#3D251D] text-[#B25636] dark:text-[#E8795A] border border-[#F4D9CE] dark:border-[#5A3326]">
                    Обязательные
                  </span>
                </div>
              </div>

              {/* 3. Отложено (Editable Manual Input) */}
              <div className="bg-white dark:bg-[#252528] border border-stone-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-primary/40 transition group">
                <div>
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                      <Box className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold tracking-wider uppercase">ОТЛОЖЕНО</span>
                  </div>
                  
                  {/* Interactive Input */}
                  <div className="relative flex items-center mt-0.5 group/input">
                    <input 
                      type="number"
                      min="0"
                      step="100"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onBlur={handleManualBlur}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualBlur()}
                      className="w-full text-xl sm:text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight bg-stone-50/80 dark:bg-stone-800/80 hover:bg-stone-100/80 dark:hover:bg-stone-800 focus:bg-white dark:focus:bg-[#1E1E20] border border-stone-200/90 dark:border-white/10 hover:border-emerald-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-2.5 py-1 pr-10 transition outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      aria-label="Сумма вручную"
                    />
                    <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none text-stone-400 group-focus-within/input:text-primary transition">
                      <span className="text-base sm:text-lg font-display font-bold text-stone-700 dark:text-stone-300 group-focus-within/input:text-primary">
                        {currency}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                      <Edit3 className="w-3 h-3" />
                      Вручную
                    </span>
                    <span className="text-[10px] text-stone-400">Нажмите для ввода</span>
                  </div>
                </div>
              </div>

              {/* 4. Свободно */}
              <div className="bg-white dark:bg-[#252528] border border-stone-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-primary/40 transition group">
                <div>
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold tracking-wider uppercase">СВОБОДНО</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-display font-bold text-primary dark:text-green-400 tracking-tight">
                    {formatMoney(availableBalance)} {currency}
                  </div>
                </div>
                <div className="mt-3">
                  <button 
                    type="button"
                    onClick={() => {
                      if (onUpdateManualSavings) {
                        const newAmt = (manualReserved || 0) + (availableBalance > 0 ? availableBalance : 0);
                        onUpdateManualSavings(newAmt);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF2EC] dark:bg-primary/20 text-primary dark:text-green-400 border border-primary/30 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition"
                  >
                    Можно в копилку →
                  </button>
                </div>
              </div>
            </div>

            {/* Explanatory Info Card */}
            <div className="p-4 rounded-2xl bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200/90 dark:border-white/5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-white dark:bg-stone-700 text-stone-500 dark:text-stone-300 flex items-center justify-center shrink-0 shadow-xs border border-stone-200 dark:border-white/10">
                <Info className="w-4 h-4" />
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Блок <strong>«Свободно»</strong> показывает остаток средств после вычета всех резервов (Авто + Обязательные + Отложено). Эту сумму безопасно перевести в копилку без риска кассового разрыва.
              </p>
            </div>
          </div>

          {/* Right Column: Mandatory Payments List & Actions */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-stone-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-wider text-stone-700 dark:text-stone-300 uppercase">
                    ОБЯЗАТЕЛЬНЫЕ ПЛАТЕЖИ
                  </h3>
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                    {rawBillsList.length} {rawBillsList.length === 1 ? 'счет' : rawBillsList.length < 5 ? 'счета' : 'счетов'}
                  </span>
                </div>
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  {currentMonthName}
                </span>
              </div>

              {/* List of Bills */}
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 no-scrollbar">
                {rawBillsList.map((item) => {
                  const isChecked = selectedBillIds.has(item.expense.id);
                  const isPaid = item.isPaid;
                  const isDebt = item.expense.expenseType === 'debt' || Boolean(item.expense.linkedDebtId);

                  if (isPaid) {
                    return (
                      <div 
                        key={item.expense.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl border shadow-xs bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/90 dark:border-emerald-800/40 transition"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-300 dark:border-emerald-700">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 line-through decoration-emerald-500/60 flex items-center gap-1.5">
                                <span>{item.expense.name}</span>
                                {onEditExpense && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onEditExpense(item.expense);
                                      onClose();
                                    }}
                                    title="Редактировать обязательный платеж"
                                    className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/10 transition"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}
                              </h4>
                              
                              {/* Type Badge: Кредит/Долг vs Обычный счёт */}
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                isDebt 
                                  ? 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-900/50' 
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10'
                              }`}>
                                {isDebt ? <CreditCard size={11} /> : <Home size={11} />}
                                <span>{isDebt ? 'Кредит / Долг' : 'Бытовой счёт'}</span>
                              </span>

                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                                Оплачено
                              </span>
                            </div>
                            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                              {item.subtitle || `Обязательный регулярный платеж (${item.expense.day} число)`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-sm sm:text-base font-display font-bold text-stone-500 dark:text-stone-400 text-right whitespace-nowrap">
                            {formatMoney(item.expense.amount)} {currency}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleCancelExpense(e, item.expense.id)}
                            title="Отменить отметку об оплате"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#252528] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-600 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 border border-stone-200 dark:border-white/10 hover:border-rose-200 dark:hover:border-rose-800/40 text-xs font-semibold transition active:scale-95 shadow-xs cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Отменить</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <label 
                      key={item.expense.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs transition cursor-pointer select-none ${
                        isChecked 
                          ? 'bg-white dark:bg-[#252528] border-primary/40 dark:border-primary/50 shadow-sm' 
                          : 'bg-white/60 dark:bg-[#202022] hover:bg-white dark:hover:bg-[#252528] border-stone-200/90 dark:border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleBill(item.expense.id)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                              <span>{item.expense.name}</span>
                              {onEditExpense && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onEditExpense(item.expense);
                                    onClose();
                                  }}
                                  title="Редактировать обязательный платеж"
                                  className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/10 transition"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </h4>

                            {/* Type Badge: Кредит/Долг vs Обычный счёт */}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              isDebt 
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/40' 
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10'
                            }`}>
                              {isDebt ? <CreditCard size={11} /> : <Home size={11} />}
                              <span>{isDebt ? 'Кредит / Долг' : 'Бытовой счёт'}</span>
                            </span>
                            
                            {/* Status Badge */}
                            {item.isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/40">
                                <Clock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                Просрочено
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md border border-stone-200 dark:border-white/10">
                                <Calendar className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                                До {item.expense.day} числа
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                            {item.subtitle || `Обязательный регулярный платеж (${item.expense.day} число)`}
                          </p>
                        </div>
                      </div>

                      <div className="text-base font-display font-bold text-stone-900 dark:text-white pl-3 text-right whitespace-nowrap">
                        {formatMoney(item.expense.amount)} {currency}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bottom Action Buttons & Summary */}
            <div className="pt-3 border-t border-stone-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">
                  Выбрано к оплате: <strong className="text-stone-800 dark:text-stone-100">{selectedCount} {selectedCount === 1 ? 'платеж' : selectedCount < 5 ? 'платежа' : 'платежей'}</strong>
                </span>
                <span className="font-display font-bold text-stone-900 dark:text-white text-sm">
                  Итого: {formatMoney(selectedTotal)} {currency}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={handlePay}
                  disabled={selectedCount === 0}
                  className="w-full py-3.5 rounded-2xl bg-primary hover:bg-[#3d6849] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isSuccessPaid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Отмечено как оплачено!</span>
                    </>
                  ) : (
                    <>
                      <span>Оплатить обязательные платежи</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default ReserveDetailsModal;

