import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Users, Plus, BrainCircuit, Upload, 
  PieChart, DollarSign, Check, History, Sparkles, Filter, ChevronDown, 
  ChevronUp, CheckCircle2, ArrowRight
} from 'lucide-react';
import { 
  Transaction, AppSettings, Category, FamilyMember, MandatoryExpense 
} from '../types';
import { getMerchantBrandKey } from '../utils/categorizer';
import BrandIcon from './BrandIcon';
import CategoriesModal from './CategoriesModal';
import DayDetailModal from './DayDetailModal';

interface TerraBudgetProps {
  transactions: Transaction[];
  categories: Category[];
  members: FamilyMember[];
  mandatoryExpenses: MandatoryExpense[];
  settings: AppSettings;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenAddModal: () => void;
  onOpenCategoriesModal?: () => void;
  onOpenTrainModal?: () => void;
  onImportClick?: () => void;
  onToggleMandatoryPaid?: (expenseId: string) => void;
  onQuickAddTransaction?: (title: string, amount: number, date: Date, memberId: string) => void;
}

/**
 * TerraBudget: Dedicated full-fidelity page for the Budget tab,
 * matching the user's provided HTML/CSS mockups and Terra design system.
 */
const TerraBudget: React.FC<TerraBudgetProps> = ({
  transactions,
  categories,
  members,
  mandatoryExpenses,
  settings,
  currentMonth,
  onMonthChange,
  onEditTransaction,
  onOpenAddModal,
  onOpenCategoriesModal,
  onOpenTrainModal,
  onImportClick,
  onToggleMandatoryPaid,
  onQuickAddTransaction
}) => {
  // Member filter: 'all' or memberId
  const [selectedMember, setSelectedMember] = useState<string>('all');
  
  // Selected day for interactive calendar detail (defaults to today in current month or 1st)
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date();
    if (today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear()) {
      return today.getDate();
    }
    return 1;
  });

  // Modals state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  // Quick transaction input
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickAddedSuccess, setQuickAddedSuccess] = useState(false);

  // Filter transactions by selected family member
  const memberFilteredTransactions = useMemo(() => {
    if (selectedMember === 'all') return transactions;
    return transactions.filter(t => t.memberId === selectedMember);
  }, [transactions, selectedMember]);

  // Current month transactions
  const monthTransactions = useMemo(() => {
    return memberFilteredTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });
  }, [memberFilteredTransactions, currentMonth]);

  // Income, Expense, Balance calculations
  const monthIncome = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  }, [monthTransactions]);

  const monthExpense = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  }, [monthTransactions]);

  const monthBalance = monthIncome - monthExpense;

  // Remaining days in month calculation
  const totalDaysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonthView = today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
  const currentDayNum = isCurrentMonthView ? today.getDate() : 1;
  const remainingDays = Math.max(1, totalDaysInMonth - currentDayNum + 1);

  // Safe daily limit (remaining balance / remaining days)
  const safeDailyLimit = Math.max(0, monthBalance > 0 ? Math.round(monthBalance / remainingDays) : 0);

  // Today's spend
  const todaySpent = useMemo(() => {
    return monthTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getDate() === currentDayNum && t.type === 'expense';
    }).reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions, currentDayNum]);

  // Yesterday's spend
  const yesterdaySpent = useMemo(() => {
    if (currentDayNum <= 1) return 0;
    return monthTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getDate() === (currentDayNum - 1) && t.type === 'expense';
    }).reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions, currentDayNum]);

  const todayReserve = safeDailyLimit - todaySpent;

  // Selected date object
  const activeSelectedDate = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay);
  }, [currentMonth, selectedDay]);

  // Selected day's transactions
  const selectedDayTransactions = useMemo(() => {
    return monthTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getDate() === selectedDay;
    });
  }, [monthTransactions, selectedDay]);

  const selectedDayNet = useMemo(() => {
    const inc = selectedDayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = selectedDayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return inc - exp;
  }, [selectedDayTransactions]);

  // Category donut chart computation
  const categoryBreakdown = useMemo(() => {
    const expenses = monthTransactions.filter(t => t.type === 'expense');
    const parentCats = categories.filter(c => !c.parentId);

    const data = parentCats.map(cat => {
      const childIds = categories.filter(c => c.parentId === cat.id).map(c => c.id);
      const familyIds = [cat.id, ...childIds];
      const sum = expenses.filter(t => familyIds.includes(t.category)).reduce((acc, t) => acc + t.amount, 0);
      return {
        ...cat,
        sum
      };
    }).filter(c => c.sum > 0).sort((a, b) => b.sum - a.sum);

    return data;
  }, [monthTransactions, categories]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() - 1);
    onMonthChange(next);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    onMonthChange(next);
  };

  // Quick Add submit
  const handleQuickAdd = () => {
    const title = quickTitle.trim();
    const amount = parseFloat(quickAmount.replace(',', '.'));
    if (!title || isNaN(amount) || amount <= 0) return;

    if (onQuickAddTransaction) {
      const memberId = selectedMember !== 'all' ? selectedMember : (members[0]?.id || '1');
      onQuickAddTransaction(title, amount, activeSelectedDate, memberId);
    }

    setQuickTitle('');
    setQuickAmount('');
    setQuickAddedSuccess(true);
    setTimeout(() => setQuickAddedSuccess(false), 2000);
  };

  // Calendar grid calculations
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  // Monday = 0, Sunday = 6
  const paddingDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysArray = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);

  // Month label
  const monthTitle = currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase();

  // Status badge label
  const statusBadgeText = selectedMember === 'all' 
    ? 'Показаны траты: Вся семья (общий бюджет)' 
    : `Показаны траты: ${members.find(m => m.id === selectedMember)?.name || 'Участник'}`;

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* 1. TOP HEADER: Title, Month, Family Filters, Actions */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border/70 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <h1 className="text-2xl lg:text-3xl font-headline font-bold text-graphite dark:text-white tracking-tight">
            Бюджет
          </h1>

          {/* Month Selector */}
          <div className="flex items-center bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/10 rounded-xl px-2.5 py-1.5 shadow-sm gap-2">
            <button 
              onClick={handlePrevMonth}
              aria-label="Предыдущий месяц" 
              className="text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white p-0.5 rounded transition" 
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold text-graphite dark:text-white font-headline px-1 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{monthTitle}</span>
            </div>
            <button 
              onClick={handleNextMonth}
              aria-label="Следующий месяц" 
              className="text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white p-0.5 rounded transition" 
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Family Member Filter Pills */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-graphite-muted dark:text-gray-400 uppercase tracking-wide hidden sm:inline">
              Участники:
            </span>
            <div className="flex items-center bg-[#EAE6DE] dark:bg-[#2C2C2E] p-1 rounded-xl gap-1 text-xs">
              <button 
                onClick={() => setSelectedMember('all')}
                className={`cursor-pointer active:scale-95 transition-all inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg ${
                  selectedMember === 'all' 
                    ? 'bg-[#2E3230] text-white shadow-xs dark:bg-white dark:text-[#1C1C1E]' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/10'
                }`}
                type="button"
              >
                <Users size={13} />
                <span>ВСЕ</span>
              </button>

              {members.map(m => {
                const isSelected = selectedMember === m.id;
                return (
                  <button 
                    key={m.id}
                    onClick={() => setSelectedMember(m.id)}
                    className={`cursor-pointer active:scale-95 transition-all inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
                      isSelected 
                        ? 'bg-[#2E3230] text-white shadow-xs dark:bg-white dark:text-[#1C1C1E]' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/10'
                    }`}
                    type="button"
                  >
                    <span 
                      className="w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="uppercase">{m.name}</span>
                  </button>
                );
              })}
            </div>

            <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-semibold text-primary dark:text-green-400 bg-primary-light dark:bg-green-950/30 border border-primary-border/60 dark:border-green-800/40 px-2 py-1 rounded-lg">
              {statusBadgeText}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenTrainModal && (
            <button 
              onClick={onOpenTrainModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-graphite dark:text-white bg-white dark:bg-[#1C1C1E] hover:bg-[#F3EFE7] dark:hover:bg-[#2C2C2E] border border-surface-border dark:border-white/10 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              type="button"
            >
              <BrainCircuit size={15} className="text-purple-600" />
              <span>Обучить</span>
            </button>
          )}

          {onImportClick && (
            <button 
              onClick={onImportClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-graphite dark:text-white bg-white dark:bg-[#1C1C1E] hover:bg-[#F3EFE7] dark:hover:bg-[#2C2C2E] border border-surface-border dark:border-white/10 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              type="button"
            >
              <Upload size={15} className="text-graphite-muted dark:text-gray-400" />
              <span>Импорт</span>
            </button>
          )}

          <button 
            onClick={onOpenAddModal}
            aria-label="Добавить операцию" 
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white shadow-sm transition cursor-pointer" 
            title="Добавить операцию" 
            type="button"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* 2. TOP KPI CARDS: «Темп расходов и дневной лимит» */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Дневной безопасный лимит */}
        <div className="bg-gradient-to-br from-white via-white to-primary-light/40 dark:from-[#1C1C1E] dark:via-[#1C1C1E] dark:to-[#4A7C59]/15 border-2 border-primary/30 rounded-2xl px-4 py-3.5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-primary-dark dark:text-green-400">
                Дневной безопасный лимит
              </span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary-light text-primary dark:bg-green-950/40 dark:text-green-400 border border-primary-border/60">
              {remainingDays} дней ост.
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-black font-headline text-primary-dark dark:text-green-400 tracking-tight">
                {settings.privacyMode ? '•••' : `${safeDailyLimit.toLocaleString('ru-RU')} ₽`}
              </span>
              <span className="text-xs font-semibold text-graphite-muted dark:text-gray-400">/ день</span>
            </div>
            <p className="text-[10px] text-graphite-muted dark:text-gray-400 mt-0.5">
              Расчёт: {settings.privacyMode ? '•••' : `${monthBalance.toLocaleString('ru-RU')} ₽`} остатка ÷ {remainingDays} оставшихся дней
            </p>
          </div>

          <div className="pt-1.5 border-t border-primary-border/30 flex items-center justify-between text-[11px]">
            <span className="text-graphite-muted dark:text-gray-400">Рекомендация ритма:</span>
            <span className="font-bold text-emerald-800 dark:text-green-400">
              {safeDailyLimit > 0 ? 'Идеальный темп' : 'Бюджет исчерпан'}
            </span>
          </div>
        </div>

        {/* Card 2: Индикатор трат сегодня */}
        <div className="bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/10 rounded-2xl px-4 py-3.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-graphite-muted dark:text-gray-400">
              Индикатор трат сегодня ({currentDayNum} {currentMonth.toLocaleDateString('ru-RU', { month: 'short' })})
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
              todayReserve >= 0 
                ? 'bg-emerald-50 text-emerald-800 dark:bg-green-950/40 dark:text-green-400 border border-emerald-200 dark:border-green-800/40' 
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200'
            }`}>
              {todayReserve >= 0 ? 'Без перерасхода' : 'Превышение!'}
            </span>
          </div>

          <div className="my-2 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <div className="text-lg font-bold font-headline text-graphite dark:text-white">
                Сегодня: {settings.privacyMode ? '•••' : `${todaySpent.toLocaleString('ru-RU')} ₽`}
              </div>
              <div className={`text-xs font-bold ${todayReserve >= 0 ? 'text-primary dark:text-green-400' : 'text-red-500'}`}>
                {todayReserve >= 0 ? `Запас: +${todayReserve.toLocaleString('ru-RU')} ₽` : `Перерасход: ${todayReserve.toLocaleString('ru-RU')} ₽`}
              </div>
            </div>

            <div className="w-full bg-[#EAE6DE] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${todayReserve >= 0 ? 'bg-primary' : 'bg-red-500'}`}
                style={{ width: `${safeDailyLimit > 0 ? Math.min(100, (todaySpent / safeDailyLimit) * 100) : 100}%` }}
              />
            </div>
          </div>

          <div className="pt-1.5 border-t border-surface-border/70 dark:border-white/5 flex items-center justify-between text-[11px] text-graphite-muted dark:text-gray-400">
            <span>Вчера: {yesterdaySpent.toLocaleString('ru-RU')} ₽</span>
            <span className="text-emerald-700 dark:text-green-400 font-semibold">
              {yesterdaySpent < safeDailyLimit ? `Сэкономлено ${(safeDailyLimit - yesterdaySpent).toLocaleString('ru-RU')} ₽` : ''}
            </span>
          </div>
        </div>

        {/* Card 3: Месячный прогресс бюджета */}
        <div className="bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/10 rounded-2xl px-4 py-3.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-graphite-muted dark:text-gray-400">
              Месячный прогресс бюджета
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#F5F1EA] dark:bg-white/5 text-graphite dark:text-white">
              {currentDayNum} из {totalDaysInMonth} дней
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 my-1">
            <div className="text-center px-1">
              <span className="text-[9px] uppercase font-bold text-graphite-muted dark:text-gray-400 block">Приход</span>
              <span className="text-xs lg:text-sm font-black font-headline text-primary dark:text-green-400 truncate block">
                {settings.privacyMode ? '•••' : `${monthIncome.toLocaleString('ru-RU')} ₽`}
              </span>
              <span className="text-[8px] text-emerald-700 dark:text-green-400 block">факт</span>
            </div>

            <div className="text-center px-1 border-x border-surface-border/70 dark:border-white/5">
              <span className="text-[9px] uppercase font-bold text-graphite-muted dark:text-gray-400 block">Расход</span>
              <span className="text-xs lg:text-sm font-black font-headline text-[#D95C48] dark:text-red-400 truncate block">
                {settings.privacyMode ? '•••' : `${monthExpense.toLocaleString('ru-RU')} ₽`}
              </span>
              <span className="text-[8px] text-graphite-muted dark:text-gray-400 block">
                {monthIncome > 0 ? `${Math.round((monthExpense / monthIncome) * 100)}%` : '0%'}
              </span>
            </div>

            <div className="text-center px-1">
              <span className="text-[9px] uppercase font-bold text-graphite-muted dark:text-gray-400 block">Свободно</span>
              <span className="text-xs lg:text-sm font-black font-headline text-emerald-700 dark:text-green-400 truncate block">
                {settings.privacyMode ? '•••' : `${monthBalance > 0 ? '+' : ''}${monthBalance.toLocaleString('ru-RU')} ₽`}
              </span>
              <span className="text-[8px] text-emerald-700 dark:text-green-400 block">В норме</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-surface-border/70 dark:border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-graphite-muted dark:text-gray-400">Исполнение бюджета:</span>
            <span className="font-bold text-graphite dark:text-white">
              {monthIncome > 0 ? `${Math.round((monthExpense / monthIncome) * 100)}%` : '0%'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. MAIN WORKSPACE: 7-col Interactive Calendar + 5-col Analytics Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT / CENTER: Full Calendar & Selected Day Detail (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Full Interactive Calendar Card */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 sm:p-5 border border-surface-border dark:border-white/10 shadow-sm">
            {/* Calendar Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-border/70 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-light text-primary dark:bg-green-950/40 dark:text-green-400 flex items-center justify-center font-bold">
                  <PieChart size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-headline uppercase tracking-wide text-graphite dark:text-white">
                    Календарный темп
                  </h3>
                  <p className="text-[11px] text-graphite-muted dark:text-gray-400">
                    {monthTitle} • Клик по дню открывает детализацию и список операций
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-semibold text-graphite-muted dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary" /> Доход
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#D95C48]" /> Траты
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#C4A66A]" /> Платёж
                </span>
              </div>
            </div>

            {/* Calendar Weekday Headers (Пн - Вс) */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-graphite-muted dark:text-gray-400 uppercase tracking-wider py-1 border-b border-surface-border/50 dark:border-white/5">
              <div>Пн</div>
              <div>Вт</div>
              <div>Ср</div>
              <div>Чт</div>
              <div>Пт</div>
              <div className="text-[#D95C48]">Сб</div>
              <div className="text-[#D95C48]">Вс</div>
            </div>

            {/* Calendar Interactive Grid */}
            <div className="grid grid-cols-7 gap-1.5 pt-2">
              {/* Padding offset before month start */}
              {Array.from({ length: paddingDays }).map((_, i) => (
                <div key={`pad-${i}`} className="h-16 rounded-xl bg-[#FAF6F0]/40 dark:bg-white/[0.02] border border-dashed border-surface-border/40 dark:border-white/5" />
              ))}

              {/* Day cells */}
              {daysArray.map(dayNum => {
                const dayTxs = monthTransactions.filter(t => new Date(t.date).getDate() === dayNum);
                const dayExpense = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                const dayIncome = dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const dayNet = dayIncome - dayExpense;
                const hasTransactions = dayTxs.length > 0;

                // Mandatory payment on this day
                const dayMandatory = mandatoryExpenses.find(e => e.day === dayNum);

                const isSelected = selectedDay === dayNum;
                const isCurrentToday = isCurrentMonthView && today.getDate() === dayNum;

                // Format number with compact 'k' suffix if needed
                const formatDayAmount = (val: number) => {
                  const absVal = Math.abs(val);
                  if (absVal >= 1000000) {
                    return `${(absVal / 1000000).toFixed(1).replace('.0', '')}M`;
                  }
                  if (absVal >= 1000) {
                    return `${(absVal / 1000).toFixed(absVal >= 10000 ? 0 : 1).replace('.0', '')}k`;
                  }
                  return `${absVal}`;
                };

                return (
                  <div 
                    key={dayNum}
                    onClick={() => setSelectedDay(dayNum)}
                    className={`h-16 p-1.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer active:scale-[0.98] select-none relative ${
                      isSelected 
                        ? 'border-2 border-primary bg-primary-light/50 dark:bg-primary/20 ring-2 ring-primary/20 shadow-md z-10' 
                        : isCurrentToday 
                          ? 'border-primary/50 bg-[#FBF9F5] dark:bg-[#252528] hover:border-primary/60'
                          : 'border-surface-border dark:border-white/5 bg-white dark:bg-[#252528] hover:border-primary/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1">
                        <span className={`text-xs ${isSelected ? 'font-black text-primary-dark dark:text-green-400' : 'font-bold text-graphite dark:text-white'}`}>
                          {dayNum}
                        </span>
                        {isCurrentToday && (
                          <span className="text-[7px] uppercase font-bold text-primary bg-white dark:bg-[#1C1C1E] px-1 rounded border border-primary/20">
                            Сегодня
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {dayMandatory && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C4A66A]" title={`Обязательный платеж: ${dayMandatory.name}`} />
                        )}
                        {dayIncome > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" title="Доход" />
                        )}
                        {dayExpense > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D95C48]" title="Траты" />
                        )}
                      </div>
                    </div>

                    {/* Amount badge on cell: Income minus expense (Day Net) */}
                    {hasTransactions ? (
                      dayNet > 0 ? (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 text-primary dark:text-green-400 font-headline text-[9px] font-extrabold px-1 py-0.5 rounded border border-primary/30 truncate text-right">
                          {settings.privacyMode ? '•••' : `+${formatDayAmount(dayNet)} ₽`}
                        </div>
                      ) : dayNet < 0 ? (
                        <div className="bg-[#FDF2F0] dark:bg-red-950/40 text-[#D95C48] dark:text-red-400 font-headline text-[9px] font-bold px-1 py-0.5 rounded border border-red-200 dark:border-red-900/30 truncate text-right">
                          {settings.privacyMode ? '•••' : `-${formatDayAmount(dayNet)} ₽`}
                        </div>
                      ) : (
                        <div className="bg-[#F5F1EA] dark:bg-white/5 text-graphite-muted dark:text-gray-400 font-headline text-[9px] font-semibold px-1 py-0.5 rounded border border-surface-border/60 dark:border-white/10 truncate text-right">
                          {settings.privacyMode ? '•••' : '0 ₽'}
                        </div>
                      )
                    ) : dayMandatory ? (
                      <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-headline text-[9px] font-bold px-1 py-0.5 rounded border border-amber-200 truncate text-right">
                        {settings.privacyMode ? '•••' : `${formatDayAmount(dayMandatory.amount)} ₽`}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Detail Box + Quick Add Form */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-primary/30 bg-gradient-to-b from-white to-[#F8F6F1] dark:from-[#1C1C1E] dark:to-[#222225] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-border/70 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center font-headline shadow-xs">
                  {selectedDay}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-graphite dark:text-white uppercase tracking-wide capitalize">
                    {activeSelectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h4>
                  <p className="text-[11px] text-graphite-muted dark:text-gray-400">
                    {selectedDayTransactions.length} {selectedDayTransactions.length === 1 ? 'операция' : 'операций'} • 
                    {selectedDayNet > 0 ? ' Зачисление дохода' : selectedDayNet < 0 ? ' Расход средств' : ' Без трат'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold font-headline ${
                  selectedDayNet > 0 ? 'text-primary dark:text-green-400' : selectedDayNet < 0 ? 'text-[#D95C48]' : 'text-graphite-muted'
                }`}>
                  {settings.privacyMode ? '•••' : `${selectedDayNet > 0 ? '+' : ''}${selectedDayNet.toLocaleString('ru-RU')} ₽`}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-light dark:bg-green-950/40 text-primary dark:text-green-400">
                  Баланс дня
                </span>
                <button 
                  onClick={() => setIsDayModalOpen(true)}
                  className="text-[10px] font-bold text-primary hover:underline ml-1"
                >
                  Развернуть ↗
                </button>
              </div>
            </div>

            {/* List of day's operations */}
            <div className="py-3 space-y-2">
              {selectedDayTransactions.length === 0 ? (
                <div className="text-center py-4 text-xs text-graphite-muted dark:text-gray-500 italic">
                  В этот день операций не найдено
                </div>
              ) : (
                selectedDayTransactions.map(tx => {
                  const category = categories.find(c => c.id === tx.category);
                  const member = members.find(m => m.id === tx.memberId);
                  const displayTitle = tx.note || category?.label || 'Операция';
                  const brandKey = getMerchantBrandKey(displayTitle);

                  return (
                    <div 
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#252528] border border-surface-border/70 dark:border-white/5 hover:border-primary/50 hover:bg-[#FAF9F6] shadow-xs cursor-pointer transition group"
                      title="Нажмите для открытия карточки операции"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="sm" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-bold text-graphite dark:text-white group-hover:text-primary transition">
                              {displayTitle}
                            </h5>
                            <span className="text-[9px] text-graphite-muted opacity-0 group-hover:opacity-100 transition">↗ карточка</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-graphite-muted dark:text-gray-400">
                            {member && (
                              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: member.color }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.color }} />
                                {member.name}
                              </span>
                            )}
                            {category && <span>• {category.label}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className={`text-sm font-bold font-headline tabular-nums ${
                            tx.type === 'income' ? 'text-primary dark:text-green-400' : 'text-graphite dark:text-white'
                          }`}>
                            {settings.privacyMode ? '•••' : `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('ru-RU')} ₽`}
                          </div>
                          <span className="text-[10px] text-graphite-muted dark:text-gray-400">
                            {tx.type === 'income' ? 'Доход' : 'Расход'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Add Form on Selected Day */}
            <div className="pt-2 border-t border-surface-border/70 dark:border-white/10">
              <div className="text-[11px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400 mb-2">
                Быстрый ввод чека на {selectedDay} {currentMonth.toLocaleDateString('ru-RU', { month: 'short' })}:
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input 
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
                  className="w-full sm:w-1/2 bg-white dark:bg-[#252528] border border-surface-border dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-graphite dark:text-white placeholder-graphite-muted focus:ring-1 focus:ring-primary focus:border-primary" 
                  placeholder="Название (например: Обед, Такси...)" 
                  type="text"
                />
                <input 
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
                  className="w-full sm:w-1/4 bg-white dark:bg-[#252528] border border-surface-border dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-graphite dark:text-white font-semibold placeholder-graphite-muted focus:ring-1 focus:ring-primary focus:border-primary" 
                  placeholder="Сумма ₽" 
                  type="text"
                />
                <button 
                  onClick={handleQuickAdd}
                  className={`w-full sm:w-auto px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs whitespace-nowrap cursor-pointer transition-all ${
                    quickAddedSuccess ? 'bg-emerald-700' : 'bg-primary hover:bg-primary-dark active:scale-95'
                  }`}
                  type="button"
                >
                  {quickAddedSuccess ? '✓ Записано' : '+ Записать'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Analytics Sidebar (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Category Breakdown Card */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 border border-surface-border dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-surface-border/70 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <PieChart size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold font-headline uppercase tracking-wide text-graphite dark:text-white">
                    Категории и лимиты
                  </h3>
                  <p className="text-[10px] text-graphite-muted dark:text-gray-400">
                    {settings.privacyMode ? '•••' : `${monthExpense.toLocaleString('ru-RU')} ₽ израсходовано`}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsCatModalOpen(true)}
                className="text-[10px] font-bold text-primary dark:text-green-400 hover:underline cursor-pointer flex items-center gap-1"
                type="button"
              >
                Настроить
              </button>
            </div>

            {/* Category Bars */}
            <div className="space-y-2 mt-2">
              {categoryBreakdown.length === 0 ? (
                <div className="text-center py-4 text-xs text-graphite-muted dark:text-gray-500 italic">
                  Пока нет расходов для отображения
                </div>
              ) : (
                categoryBreakdown.slice(0, 4).map(cat => {
                  const limit = cat.id === 'food' ? 25000 : cat.id === 'transport' ? 5000 : 10000;
                  const pct = Math.min(100, Math.round((cat.sum / limit) * 100));

                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-graphite dark:text-white">
                          {cat.label}
                        </span>
                        <span className="text-[11px] text-graphite-muted dark:text-gray-400 font-semibold tabular-nums">
                          {cat.sum.toLocaleString('ru-RU')} / {limit.toLocaleString('ru-RU')} ₽ 
                          <span className="text-primary dark:text-green-400 font-bold ml-1">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-[#EAE6DE] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 mt-3 border-t border-surface-border/70 dark:border-white/10">
              <button 
                onClick={() => setIsCatModalOpen(true)}
                className="w-full py-1.5 px-3 bg-[#FAF9F6] dark:bg-[#252528] hover:bg-primary-light/50 dark:hover:bg-white/5 border border-surface-border dark:border-white/5 rounded-xl text-xs font-bold text-primary dark:text-green-400 flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer group"
                type="button"
              >
                <span>Все категории и подкатегории ({categories.length})</span>
                <span className="text-[10px] text-graphite-muted group-hover:text-primary transition">→</span>
              </button>
            </div>
          </div>

          {/* 2. Mandatory Payments Card */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 border border-surface-border dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-surface-border/70 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-accent-gold/20 text-[#C4A66A] flex items-center justify-center font-bold">
                  <DollarSign size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold font-headline uppercase tracking-wide text-graphite dark:text-white">
                    Обязательные платежи
                  </h3>
                  <p className="text-[10px] text-graphite-muted dark:text-gray-400">
                    {mandatoryExpenses.length} счетов к контролю
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold text-[#D95C48] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30 px-1.5 py-0.5 rounded">
                {mandatoryExpenses.length} счёта
              </span>
            </div>

            <div className="space-y-2">
              {mandatoryExpenses.length === 0 ? (
                <div className="text-center py-3 text-xs text-graphite-muted dark:text-gray-500 italic">
                  Обязательные платежи не добавлены
                </div>
              ) : (
                mandatoryExpenses.map(expense => {
                  const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                  const isPaid = (settings.manualPaidExpenses?.[currentMonthKey] || []).includes(expense.id);

                  return (
                    <div 
                      key={expense.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-surface-border dark:border-white/5 hover:border-primary/40 bg-[#FAF9F6] dark:bg-[#252528] transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/10 text-graphite-muted dark:text-gray-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {expense.day}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-graphite dark:text-white">
                              {expense.name}
                            </span>
                            <span className={`text-[9px] font-bold px-1 rounded ${
                              isPaid ? 'text-emerald-800 bg-emerald-50 dark:bg-green-950/40 dark:text-green-400' : 'text-[#D95C48] bg-red-50 dark:bg-red-950/40'
                            }`}>
                              {isPaid ? 'Оплачено ✓' : `до ${expense.day} числа`}
                            </span>
                          </div>
                          <span className="text-[10px] text-graphite-muted dark:text-gray-400">
                            {expense.remind ? 'С напоминанием' : 'Ежемесячно'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold font-headline text-graphite dark:text-white tabular-nums">
                          {expense.amount.toLocaleString('ru-RU')} ₽
                        </span>
                        {onToggleMandatoryPaid && (
                          <button 
                            onClick={() => onToggleMandatoryPaid(expense.id)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-xs cursor-pointer transition-all active:scale-95 ${
                              isPaid 
                                ? 'text-emerald-800 bg-emerald-100 border border-emerald-300 dark:bg-green-950/40 dark:text-green-400' 
                                : 'text-white bg-primary hover:bg-primary-dark'
                            }`}
                            type="button"
                          >
                            {isPaid ? 'Оплачено ✓' : 'Оплатить'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Family Operations Feed */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 border border-surface-border dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-border/70 dark:border-white/10">
              <h3 className="text-xs font-bold font-headline uppercase tracking-wide text-graphite dark:text-white">
                Операции участников семьи
              </h3>
              <span className="text-[11px] font-bold text-primary dark:text-green-400">
                {monthTransactions.length} записей
              </span>
            </div>

            <div className="space-y-2">
              {monthTransactions.slice(0, 5).map(tx => {
                const member = members.find(m => m.id === tx.memberId);
                const category = categories.find(c => c.id === tx.category);
                const displayTitle = tx.note || category?.label || 'Операция';

                return (
                  <div 
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-surface-border hover:bg-[#FAF9F6] dark:hover:bg-[#252528] transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span 
                        className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: member?.color || '#4A7C59' }}
                      >
                        {member ? member.name.charAt(0).toUpperCase() : 'С'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-graphite dark:text-white truncate group-hover:text-primary transition">
                          {displayTitle}
                        </div>
                        <span className="text-[10px] text-graphite-muted dark:text-gray-400 truncate block">
                          {member?.name || 'Семья'} • {new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pl-2 shrink-0">
                      <span className={`text-xs font-bold font-headline tabular-nums ${
                        tx.type === 'income' ? 'text-primary dark:text-green-400' : 'text-graphite dark:text-white'
                      }`}>
                        {settings.privacyMode ? '•••' : `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('ru-RU')} ₽`}
                      </span>
                      <span className="text-graphite-muted text-xs group-hover:text-primary transition">›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CategoriesModal 
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        transactions={transactions}
        currentMonth={currentMonth}
        settings={settings}
      />

      <DayDetailModal 
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        date={activeSelectedDate}
        transactions={monthTransactions}
        categories={categories}
        members={members}
        onEditTransaction={onEditTransaction}
        onAddTransactionForDay={onOpenAddModal}
        dailySafeLimit={safeDailyLimit}
        privacyMode={settings.privacyMode}
      />
    </div>
  );
};

export default TerraBudget;
