import React, { useState, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Users, Plus, BrainCircuit, Upload, 
  PieChart, DollarSign, Check, History, Sparkles, Filter, ChevronDown, 
  ChevronUp, CheckCircle2, ArrowRight, ArrowDown, ArrowUp, Sprout, 
  User, Repeat, Calendar as CalendarIcon, Store, ShoppingCart, Train, 
  Wifi, Home, CreditCard, Building, ShieldCheck, List
} from 'lucide-react';
import { 
  Transaction, AppSettings, Category, FamilyMember, MandatoryExpense 
} from '../types';
import { getMerchantBrandKey } from '../utils/categorizer';
import BrandIcon from './BrandIcon';
import CategoriesModal from './CategoriesModal';
import DayDetailModal from './DayDetailModal';
import TerraMobileHeader from './TerraMobileHeader';
import { FILTER_RAIL, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_IDLE, SURFACE_CARD } from './filterUiTokens';
import BudgetPlanningPanel from './BudgetPlanningPanel';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { clampBudgetDay } from '../utils/budgetUi';
import { shiftCalendarMonth } from '../utils/calendarMonthNavigation';
import { buildBudgetCategoryBreakdown } from '../utils/budgetCategoryBreakdown';
import { formatBudgetMoney } from '../utils/budgetFinancialMath';
import { monthlyMoneyTotals, sumMoney, budgetDailyLimit, daysUntilNextSalary } from '../utils/budgetFinancialMath';
import { calculateFamilyBudgetProjection } from '../utils/familyBudgetProjection';
import { filterBudgetHistory } from '../utils/budgetHistory';
import { buildBudgetDayMoney } from '../utils/budgetDayMoney';

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
  onQuickAddTransaction?: (title: string, amount: number, date: Date, memberId: string, categoryId: string) => Promise<boolean>;
  onEditMandatoryExpense?: (expense: MandatoryExpense) => void;
  onAddMandatoryExpense?: () => void;
  onSelectCategory?: (categoryId: string) => void;
  onOpenSettings?: () => void;
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
  onQuickAddTransaction,
  onEditMandatoryExpense,
  onAddMandatoryExpense,
  onSelectCategory,
  onOpenSettings
}) => {
  const { displayGoals:goals, householdPersonal, personalDisplayOnly, personalOpeningKnown, financialSettings, transactions:allTransactions } = useData();
  const personalOnly=householdPersonal||personalDisplayOnly;
  const { user } = useAuth();
  // Member filter: 'all' or memberId
  const [selectedMember, setSelectedMember] = useState<string>('all');
  
  // Mobile calendar scale: 'month' | 'week'
  const [calendarScale, setCalendarScale] = useState<'month' | 'week'>('month');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [historyScope, setHistoryScope] = useState<'day' | 'month'>('day');
  const [historyType, setHistoryType] = useState<'all' | 'expense' | 'income'>('all');
  const [historySearch, setHistorySearch] = useState('');

  // Selected day for interactive calendar detail (defaults to today in current month or 1st)
  const [requestedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date();
    if (today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear()) {
      return today.getDate();
    }
    return 1;
  });

  // Keep the selected day valid when switching from a 31-day month to February.
  const selectedDay = clampBudgetDay(currentMonth, requestedDay);

  // Modals state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  // Quick transaction input
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickAddedSuccess, setQuickAddedSuccess] = useState(false);
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');
  const [quickMemberId, setQuickMemberId] = useState('');
  const [quickCategoryId, setQuickCategoryId] = useState('other');

  // Filter transactions by selected family member
  const memberFilteredTransactions = useMemo(() => {
    if (selectedMember === 'all') return transactions;
    return transactions.filter(t => t.memberId === selectedMember);
  }, [transactions, selectedMember]);

  // Category limits are shared family-wide, regardless of member filter.
  const familyMonthTransactions = useMemo(() => transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth.getMonth()
      && date.getFullYear() === currentMonth.getFullYear();
  }), [transactions, currentMonth]);

  // Current month transactions - sorted chronologically descending (from current/newest to past)
  const monthTransactions = useMemo(() => {
    return memberFilteredTransactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [memberFilteredTransactions, currentMonth]);

  // Money is summed in integer kopecks; full ledger balance carries income
  // and expenses from preceding months rather than resetting on the 1st.
  const {income: monthIncome, expense: monthExpense, net: monthBalance} =
    useMemo(() => monthlyMoneyTotals(monthTransactions), [monthTransactions]);

  const totalDaysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonthView = today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
  const currentDayNum = isCurrentMonthView ? today.getDate() : 1;
  const configuredSalaryDays = settings.salaryDates?.length
    ? settings.salaryDates : [settings.startOfMonthDay || 1];
  const remainingDays = isCurrentMonthView
    ? daysUntilNextSalary(today, configuredSalaryDays) : 0;

  // Shared family cash and commitments must not change when the user filters
  // the transaction history to a single family member.
  const familyProjection = useMemo(() => calculateFamilyBudgetProjection({
    transactions: transactions,
    monthTransactions: familyMonthTransactions,
    bills: mandatoryExpenses,
    categories,
    manuallyPaidIds: settings.manualPaidExpenses?.[`${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2,'0')}`] || [],
    initialBalance: settings.initialBalance,
    initialBalanceDate: settings.initialBalanceDate,
    enableSmartReserve: settings.enableSmartReserve,
    savingsRate: settings.savingsRate || 0,
    manualReservedAmount: settings.manualReservedAmount,
    goalSavedAmounts: goals.map(goal=>goal.currentAmount||0),
    paymentContext:personalDisplayOnly?{bills:financialSettings.mandatoryExpenses,transactions:allTransactions.filter(tx=>tx.date.slice(0,7)===`${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2,'0')}`),manuallyPaidIds:financialSettings.manualPaidExpenses?.[`${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2,'0')}`]||[]}:undefined,
  }), [personalDisplayOnly,financialSettings,allTransactions,transactions, familyMonthTransactions, mandatoryExpenses, categories,
       settings.manualPaidExpenses, currentMonth, settings.initialBalance,
       settings.initialBalanceDate, settings.enableSmartReserve,
       settings.savingsRate, settings.manualReservedAmount, goals]);
  const { monthlyPaymentStates, mandatoryReserve, monthlySalary, savingsReserve,
    manualReserve, reservedAmount, ledger, availableBalance } = familyProjection;
  const safeDailyLimit = isCurrentMonthView && personalOpeningKnown
    ? budgetDailyLimit(ledger,reservedAmount,remainingDays) : 0;

  // Today's spend
  const todaySpent = useMemo(() => {
    return sumMoney(familyMonthTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getDate() === currentDayNum && t.type === 'expense';
    }).map(t => t.amount));
  }, [familyMonthTransactions, currentDayNum]);

  // Yesterday's spend
  const yesterdaySpent = useMemo(() => {
    if (currentDayNum <= 1) return 0;
    return sumMoney(familyMonthTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getDate() === (currentDayNum - 1) && t.type === 'expense';
    }).map(t => t.amount));
  }, [familyMonthTransactions, currentDayNum]);

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

  // History is a view of the current member/month selection; it never
  // changes the family-wide projected balance or the transaction ledger.
  const visibleHistory = useMemo(() => filterBudgetHistory(
    historyScope === 'day' ? selectedDayTransactions : monthTransactions,
    historyType, historySearch, categories, members
  ), [historyScope, historyType, historySearch, selectedDayTransactions, monthTransactions, categories, members]);

  const selectedDayNet = useMemo(() => {
    return monthlyMoneyTotals(selectedDayTransactions).net;
  }, [selectedDayTransactions]);

  // Category donut chart computation
  const categoryBreakdown = useMemo(() =>
    buildBudgetCategoryBreakdown(monthTransactions, categories),
    [monthTransactions, categories]
  );

  // Month navigation handlers
  const handlePrevMonth = useCallback(() => {
    onMonthChange(shiftCalendarMonth(currentMonth, -1));
  }, [currentMonth, onMonthChange]);

  const handleNextMonth = useCallback(() => {
    onMonthChange(shiftCalendarMonth(currentMonth, 1));
  }, [currentMonth, onMonthChange]);

  // Only clear the form and show success after the save is confirmed.
  const handleQuickAdd = useCallback(async () => {
    if (isQuickSaving || !onQuickAddTransaction) return;
    setQuickAddError('');
    const title = quickTitle.trim();
    const normalized=quickAmount.trim().replace(/\s/g, '').replace(',', '.');
    const amount=Number(normalized);
    if (!title || !normalized || !/^\d+(?:\.\d{1,2})?$/.test(normalized) ||
        !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount*100))) {
      setQuickAddError('Введите название и сумму больше нуля с точностью до копейки.');
      return;
    }
    // In family view, never silently assign the expense to the first member.
    const ownMember = members.find(member => member.userId && member.userId === user?.uid);
    const memberId = selectedMember !== 'all' ? selectedMember : (quickMemberId || ownMember?.id);
    if (!memberId || !members.some(member => member.id === memberId)) {
      setQuickAddError('Выберите участника бюджета для этой операции.');
      return;
    }
    setIsQuickSaving(true);
    try {
      const saved = await onQuickAddTransaction(title, amount, activeSelectedDate, memberId, quickCategoryId);
      if (!saved) {
        setQuickAddError('Не удалось записать операцию. Повторите попытку.');
        return;
      }
      setQuickTitle('');
      setQuickAmount('');
      setQuickAddedSuccess(true);
      setTimeout(() => setQuickAddedSuccess(false), 2000);
    } catch {
      setQuickAddError('Ошибка сохранения операции. Проверьте соединение.');
    } finally {
      setIsQuickSaving(false);
    }
  }, [quickTitle, quickAmount, quickCategoryId, onQuickAddTransaction, selectedMember, quickMemberId, members, user?.uid, activeSelectedDate, isQuickSaving]);

  // Calendar grid calculations
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  // Monday = 0, Sunday = 6
  const paddingDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysArray = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);

  // Month label
  const monthTitle = currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(/\s*г\.?/gi, '').toUpperCase();

  // Day statistics map for the calendar
  const dayStatsMap = useMemo(() => {
    const financialDays=buildBudgetDayMoney(monthTransactions,currentMonth);
    const map:Record<number,{income:number;expense:number;net:number;count:number;hasMandatory:boolean}>={};
    for(let day=1;day<=totalDaysInMonth;day++){
      map[day]={
        ...financialDays[day],
        hasMandatory:mandatoryExpenses.some(bill=>(bill.day??(bill as any).dayOfMonth)===day)
      };
    }
    return map;
  }, [monthTransactions,currentMonth,totalDaysInMonth,mandatoryExpenses]);

  // Current month key and manual paid IDs
  const currentMonthKey = useMemo(() => {
    return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [currentMonth]);

  const manuallyPaidIds = useMemo(() => {
    return settings.manualPaidExpenses?.[currentMonthKey] || [];
  }, [settings.manualPaidExpenses, currentMonthKey]);

  // Helper to check if a mandatory expense is paid
  const checkMandatoryPaid = (exp: MandatoryExpense): boolean =>
    monthlyPaymentStates.find(state=>state.id===exp.id)?.isPaid ?? false;

  // Previous month trailing days
  const prevMonthDaysCount = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
  const trailingPrevDays = useMemo(() => {
    const list: number[] = [];
    for (let i = paddingDays - 1; i >= 0; i--) {
      list.push(prevMonthDaysCount - i);
    }
    return list;
  }, [paddingDays, prevMonthDaysCount]);

  // Next month trailing days to complete 35 or 42 slots
  const trailingNextDays = useMemo(() => {
    const totalSlots = paddingDays + totalDaysInMonth;
    const target = totalSlots <= 35 ? 35 : 42;
    const count = Math.max(0, target - totalSlots);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [paddingDays, totalDaysInMonth]);

  // Week scale days (centered around selectedDay)
  const weekDays = useMemo(() => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay);
    const dayOfWeek = (selectedDate.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() - dayOfWeek);
    const list: { dayNum: number; isCurrentMonth: boolean; date: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      list.push({
        dayNum: d.getDate(),
        isCurrentMonth: d.getMonth() === currentMonth.getMonth(),
        date: d
      });
    }
    return list;
  }, [currentMonth, selectedDay]);

  // Display transactions for the selected day card
  const displayTransactions = selectedDayTransactions;

  // Display mandatory expenses
  const displayMandatoryExpenses = mandatoryExpenses;

  // Top spending categories
  const displayTopCategories = useMemo(() => {
    const list = categoryBreakdown.slice(0, 3).map(cat => ({
      ...cat,
      percent: monthExpense > 0 ? Math.round((cat.sum / monthExpense) * 100) : 0
    }));
    return list;
  }, [categoryBreakdown, monthExpense]);

  // Format calendar net badge
  const formatCalendarNetBadge = (net: number, count: number) => {
    if (count === 0 && net === 0) return '—';
    if (net === 0) return '0 ₽';
    const abs = Math.abs(net);
    let formatted = '';
    if (abs >= 1000) {
      const k = abs / 1000;
      formatted = `${k >= 10 ? Math.round(k) : (k % 1 === 0 ? k : k.toFixed(1).replace('.0', ''))}к`;
    } else {
      formatted = `${abs}`;
    }
    return net > 0 ? `+${formatted}` : `-${formatted}`;
  };

  // Helper for mandatory payment icon
  const getMandatoryIcon = (title?: string) => {
    const t = (title || '').toLowerCase();
    if (t.includes('интернет') || t.includes('wifi') || t.includes('связь')) return <Wifi size={18} />;
    if (t.includes('ипотек') || t.includes('аренд') || t.includes('дом') || t.includes('квартир')) return <Home size={18} />;
    if (t.includes('кредит') || t.includes('карт')) return <CreditCard size={18} />;
    return <Building size={18} />;
  };

  // Mobile formatted labels
  const rawMobileMonth = currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(/\s*г\.?/gi, '');
  const mobileMonthName = rawMobileMonth.charAt(0).toUpperCase() + rawMobileMonth.slice(1);
  const rawDayDate = activeSelectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
  const selectedDayDateFormatted = rawDayDate.charAt(0).toUpperCase() + rawDayDate.slice(1);
  const isSelectedDayToday = isCurrentMonthView && selectedDay === today.getDate();

  return (
    <div className="flex flex-col min-h-0 min-w-0 w-full h-full flex-1 overflow-hidden">
      {/* ========================================================= */}
      {/* MOBILE VIEW (Strictly matching user HTML mockup on < md)  */}
      {/* ========================================================= */}
      <div data-testid="budget-scroll-container" className="md:hidden flex flex-col min-w-0 min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain no-scrollbar bg-[var(--terra-canvas)] dark:bg-[var(--terra-canvas)] text-[var(--terra-ink)] dark:text-gray-100 selection:bg-primary/20">
        {/* Unified Mobile Header */}
        <TerraMobileHeader
          title="Бюджет"
          onAdd={onOpenAddModal}
          addTitle="Добавить операцию"
          onImport={onImportClick}
          importTitle="Импорт выписки"
          onOpenSettings={onOpenSettings}
          rightExtra={
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                aria-expanded={isMonthPickerOpen}
                aria-label={`Выбрать месяц: ${mobileMonthName}`}
                className="min-h-[44px] px-3 py-2 rounded-full bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] text-xs font-bold text-[var(--terra-ink)] dark:text-white hover:text-primary transition-colors flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
              >
                <span className="capitalize">{mobileMonthName}</span>
                <ChevronDown size={14} className="text-[var(--terra-muted)] dark:text-gray-400 shrink-0" />
              </button>

              {isMonthPickerOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsMonthPickerOpen(false)} 
                  />
                  <div className="absolute top-full mt-2 right-0 bg-white dark:bg-[var(--terra-soft)] border border-[var(--terra-border)] dark:border-white/10 rounded-2xl shadow-xl p-2 z-50 min-w-[200px] space-y-1">
                    <div className="text-[10px] uppercase font-bold text-[var(--terra-muted)] dark:text-gray-400 px-2 py-1">Выбор месяца</div>
                    <div className="flex items-center justify-between px-2 pb-1 border-b border-[#EAE6DE]/60 dark:border-white/5">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        aria-label="Предыдущий месяц"
                        className="w-11 h-11 flex items-center justify-center hover:bg-[var(--terra-soft)] dark:hover:bg-white/5 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-bold font-headline capitalize">{mobileMonthName}</span>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        aria-label="Следующий месяц"
                        className="w-11 h-11 flex items-center justify-center hover:bg-[var(--terra-soft)] dark:hover:bg-white/5 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onMonthChange(new Date());
                        setIsMonthPickerOpen(false);
                      }}
                      className="min-h-[44px] w-full text-xs font-bold py-2 px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition text-left flex items-center justify-between cursor-pointer"
                    >
                      <span>Текущий месяц</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          }
        />

        {/* Mobile Page Content */}
        <div className="flex flex-col w-full px-3.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 pt-3 space-y-4 max-w-md mx-auto">
          {/* KPI & Family Overview Card */}
          <section className={`${SURFACE_CARD} flex flex-col gap-3.5`}>
            {/* Top Row: Daily Safe Limit & Pace Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[var(--terra-muted)] dark:text-gray-400">{isCurrentMonthView ? (personalOnly?'Личный ориентир в день':'Семейный ориентир в день') : 'История бюджета'}</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span data-testid="family-daily-limit-mobile" className="text-2xl font-headline font-bold text-[var(--terra-ink)] dark:text-white">
                    {isCurrentMonthView&&personalOpeningKnown ? (settings.privacyMode ? '•••' : `${formatBudgetMoney(safeDailyLimit)} ₽`) : '—'}
                  </span>
                  <span className="text-xs text-[var(--terra-muted)] dark:text-gray-400 font-medium">/ день</span>
                </div>
                <span className="text-xs text-[var(--terra-muted)] dark:text-gray-400 mt-0.5">
                  {personalOnly?'Доступно лично до зарплаты':'Доступно семье до зарплаты'} ({remainingDays} {remainingDays === 1 ? 'день' : remainingDays < 5 ? 'дня' : 'дней'}): <strong className="text-[var(--terra-ink)] dark:text-white font-semibold">{!personalOpeningKnown?'—':settings.privacyMode ? '•••' : `${formatBudgetMoney(availableBalance)} ₽`}</strong>
                </span>
              </div>
              <div className={`flex shrink-0 items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                safeDailyLimit > 0
                  ? 'bg-[#4A7C59]/10 text-[var(--terra-primary)] dark:bg-green-950/40 dark:text-green-400'
                  : 'bg-[var(--terra-soft)] text-[var(--terra-muted)] dark:bg-white/10 dark:text-gray-300'
              }`}>
                <Sprout size={15} />
                <span>{!isCurrentMonthView ? 'Архив' : !personalOpeningKnown?'Укажите остаток':safeDailyLimit > 0 ? 'Рассчитан' : 'Нет остатка'}</span>
              </div>
            </div>

            {/* Monthly Budget Progress Bar & Breakdown */}
            <div className="flex flex-col gap-1.5 bg-white dark:bg-[var(--terra-soft)] p-3 rounded-xl shadow-xs border border-[#EAE6DE]/60 dark:border-white/5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-medium">
                <span className="text-[var(--terra-muted)] dark:text-gray-400">
                  {monthIncome > 0 ? `Расходы: ${Math.round((monthExpense / monthIncome) * 100)}% доходов` : "За месяц пока нет доходов"}
                </span>
                <span className={`font-semibold tabular-nums ${monthBalance < 0 ? "text-[#B83230] dark:text-red-400" : "text-[var(--terra-primary)] dark:text-green-400"}`}>
                  Результат месяца: {settings.privacyMode ? '•••' : `${monthBalance > 0 ? '+' : ''}${formatBudgetMoney(monthBalance)} ₽`}
                </span>
              </div>
              <div className="w-full bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className={`${monthIncome > 0 && monthExpense > monthIncome ? "bg-[#B83230]" : "bg-[#4A7C59]"} h-full rounded-full transition-[width] duration-300`}
                  style={{ width: `${monthIncome > 0 ? Math.min(100, Math.round((monthExpense / monthIncome) * 100)) : 0}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1 text-xs text-[var(--terra-muted)] dark:text-gray-400">
                <span className="flex items-center gap-1 font-semibold text-[var(--terra-primary)] dark:text-green-400">
                  <ArrowDown size={13} />
                  Приход: {settings.privacyMode ? '•••' : `${monthIncome.toLocaleString('ru-RU')} ₽`}
                </span>
                <span className="flex items-center gap-1 font-semibold text-[#B83230] dark:text-red-400">
                  <ArrowUp size={13} />
                  Расход: {settings.privacyMode ? '•••' : `${monthExpense.toLocaleString('ru-RU')} ₽`}
                </span>
              </div>
            </div>

            {/* Family Member Filter Chips with safe horizontal scrolling */}
            <div role="group" aria-label="Участник бюджета" className={FILTER_RAIL}>
              <button 
                type="button"
                onClick={() => setSelectedMember('all')}
                aria-pressed={selectedMember === "all"}
                className={`${FILTER_CHIP} cursor-pointer ${
                  selectedMember === 'all'
                    ? FILTER_CHIP_ACTIVE
                    : FILTER_CHIP_IDLE
                }`}
              >
                <Users size={14} className="shrink-0" />
                <span className="whitespace-nowrap">Все</span>
              </button>
              {members.map(m => (
                <button 
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMember(m.id)}
                  aria-pressed={selectedMember === m.id}
                  className={`${FILTER_CHIP} cursor-pointer ${
                    selectedMember === m.id
                      ? FILTER_CHIP_ACTIVE
                      : 'bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] text-[var(--terra-muted)] dark:text-gray-300 hover:text-[var(--terra-ink)]'
                  }`}
                >
                  <span 
                    className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[12rem] truncate" title={m.name}>{m.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Financial Calendar Section */}
          <section className="flex flex-col bg-[var(--terra-soft)] dark:bg-[var(--terra-surface)] p-3.5 rounded-2xl shadow-xs border border-[var(--terra-border)] dark:border-white/10 gap-2.5">
            {/* Header with full-width controls */}
            <div className="w-full flex items-center justify-between p-1 rounded-xl bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)]">
              <button 
                type="button"
                onClick={handlePrevMonth}
                className="h-8 px-3 flex items-center justify-center gap-1 rounded-lg bg-white dark:bg-[var(--terra-surface)] text-[var(--terra-ink)] dark:text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Пред.</span>
              </button>

              <span className="text-sm font-headline font-bold text-[var(--terra-ink)] dark:text-white px-2 capitalize">
                {mobileMonthName}
              </span>

              <button 
                type="button"
                onClick={handleNextMonth}
                className="h-8 px-3 flex items-center justify-center gap-1 rounded-lg bg-white dark:bg-[var(--terra-surface)] text-[var(--terra-ink)] dark:text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>След.</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[var(--terra-muted)] dark:text-gray-400 uppercase tracking-wider py-1">
              <span>Пн</span>
              <span>Вт</span>
              <span>Ср</span>
              <span>Чт</span>
              <span>Пт</span>
              <span className="text-[#C4A66A]">Сб</span>
              <span className="text-[#C4A66A]">Вс</span>
            </div>

            {/* Calendar Grid */}
            {calendarScale === 'month' ? (
              <div className="grid grid-cols-7 gap-1">
                {/* Previous month trailing days */}
                {trailingPrevDays.map(prevDay => (
                  <div key={`prev-${prevDay}`} className="h-12 bg-[#EAE6DE]/40 dark:bg-white/5 rounded-lg p-1 flex flex-col justify-between opacity-35 select-none">
                    <span className="text-[10px] font-semibold text-[var(--terra-muted)]">{prevDay}</span>
                    <span className="text-[9px] text-center text-[var(--terra-muted)] truncate">—</span>
                  </div>
                ))}

                {/* Days of current month */}
                {daysArray.map(dayNum => {
                  const stat = dayStatsMap[dayNum] || { income: 0, expense: 0, net: 0, count: 0, hasMandatory: false };
                  const isToday = isCurrentMonthView && dayNum === today.getDate();
                  const isSelected = dayNum === selectedDay;
                  const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
                  const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                  const badgeText = formatCalendarNetBadge(stat.net, stat.count);

                  return (
                    <div 
                      key={`day-${dayNum}`}
                      onClick={() => setSelectedDay(dayNum)}
                      role="button" tabIndex={0} aria-pressed={isSelected}
                      aria-label={`Выбрать ${dayNum} ${mobileMonthName}`}
                      title={settings.privacyMode ? undefined : `Доходы: ${formatBudgetMoney(stat.income)} ₽, расходы: ${formatBudgetMoney(stat.expense)} ₽, итог: ${formatBudgetMoney(stat.net)} ₽`}
                      onKeyDown={(e) => { if (e.key==='Enter'||e.key===' ') {e.preventDefault();setSelectedDay(dayNum);} }}
                      className={`h-12 rounded-lg p-1 flex flex-col justify-between shadow-2xs relative cursor-pointer active:scale-95 transition-all select-none ${
                        isSelected ? 'ring-2 ring-[#4A7C59] z-10' : ''
                      } ${
                        isToday 
                          ? 'bg-[#DDEFE2] dark:bg-[#1E3325] border border-[#4A7C59]/40' 
                          : 'bg-white dark:bg-[var(--terra-soft)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] ${
                          isToday ? 'font-black text-[var(--terra-primary)] dark:text-green-400' : isWeekend ? 'font-semibold text-[#C4A66A]' : 'font-bold text-[var(--terra-ink)] dark:text-white'
                        }`}>
                          {dayNum}
                        </span>
                        {stat.hasMandatory && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C4A66A] shrink-0" title="Обязательный платёж" />
                        )}
                      </div>

                      <span className={`text-[9px] font-bold rounded px-0.5 text-center leading-tight truncate ${
                        stat.net < 0
                          ? 'text-[#B83230] bg-[#FFDAD8]/50 dark:bg-red-950/40'
                          : stat.net > 0
                          ? 'text-[var(--terra-primary)] bg-[#C8E8D0]/60 dark:bg-green-950/40'
                          : 'text-[var(--terra-muted)] dark:text-gray-400'
                      }`}>
                        {settings.privacyMode ? '•••' : badgeText}
                      </span>
                    </div>
                  );
                })}

                {/* Trailing next days */}
                {trailingNextDays.map(nextDay => (
                  <div key={`next-${nextDay}`} className="h-12 bg-[#EAE6DE]/30 dark:bg-white/5 rounded-lg p-1 flex flex-col justify-between opacity-30 select-none">
                    <span className="text-[10px] font-semibold text-[var(--terra-muted)]">{nextDay}</span>
                    <span className="text-[8px] text-center text-[var(--terra-muted)] truncate">—</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Week View */
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(({ dayNum, isCurrentMonth: inMonth, date }) => {
                  const isToday = today.getDate() === dayNum && today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear();
                  const isSelected = dayNum === selectedDay && inMonth;
                  const stat = inMonth ? (dayStatsMap[dayNum] || { net: 0, count: 0, hasMandatory: false }) : { net: 0, count: 0, hasMandatory: false };
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const badgeText = inMonth ? formatCalendarNetBadge(stat.net, stat.count) : '—';

                  return (
                    <div 
                      key={`week-day-${dayNum}-${date.getMonth()}`}
                      onClick={() => { if (inMonth) setSelectedDay(dayNum); }}
                      role={inMonth?'button':undefined} tabIndex={inMonth?0:-1}
                      aria-pressed={inMonth?isSelected:undefined}
                      aria-label={inMonth?`Выбрать ${dayNum} ${mobileMonthName}`:undefined}
                      onKeyDown={(e) => { if(inMonth&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setSelectedDay(dayNum);} }}
                      className={`h-14 rounded-lg p-1.5 flex flex-col justify-between shadow-2xs relative cursor-pointer active:scale-95 transition-all select-none ${
                        isSelected ? 'ring-2 ring-[#4A7C59] z-10' : ''
                      } ${
                        !inMonth ? 'bg-[#EAE6DE]/30 dark:bg-white/5 opacity-40' :
                        isToday ? 'bg-[#DDEFE2] dark:bg-[#1E3325] border border-[#4A7C59]/40' : 'bg-white dark:bg-[var(--terra-soft)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] ${
                          isToday ? 'font-black text-[var(--terra-primary)] dark:text-green-400' : isWeekend ? 'font-semibold text-[#C4A66A]' : 'font-bold text-[var(--terra-ink)] dark:text-white'
                        }`}>
                          {dayNum}
                        </span>
                        {stat.hasMandatory && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C4A66A] shrink-0" />
                        )}
                      </div>
                      <span className={`text-[9px] font-bold rounded px-0.5 text-center leading-tight truncate ${
                        stat.net < 0 ? 'text-[#B83230] bg-[#FFDAD8]/50' : stat.net > 0 ? 'text-[var(--terra-primary)] bg-[#C8E8D0]/60' : 'text-[var(--terra-muted)]'
                      }`}>
                        {settings.privacyMode ? '•••' : badgeText}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Calendar Legend */}
            <div className="flex items-center justify-center gap-4 pt-1.5 text-[11px] text-[var(--terra-muted)] dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4A7C59]"></span>
                <span>Доход (+)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B83230]"></span>
                <span>Расход (-)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C4A66A]"></span>
                <span>Платеж</span>
              </div>
            </div>
          </section>

          {/* Selected Day Details & Transactions */}
          <section className={`${SURFACE_CARD} flex flex-col gap-3`}>
            {/* Selected Day Banner */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-headline font-bold text-[var(--terra-ink)] dark:text-white">
                    {selectedDayDateFormatted}
                  </span>
                  {isSelectedDayToday && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#4A7C59]/10 text-[var(--terra-primary)] dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded-full">
                      Сегодня
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--terra-muted)] dark:text-gray-400 mt-0.5">
                  Результат дня: <strong className="text-[var(--terra-ink)] dark:text-white font-semibold">{settings.privacyMode ? '•••' : `${selectedDayNet > 0 ? '+' : ''}${formatBudgetMoney(selectedDayNet)} ₽`}</strong> • {personalOnly?'Личные операции':selectedMember === 'all' ? 'Все участники' : 'Выбранный участник'}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setIsDayModalOpen(true)}
                aria-label="Операции за выбранный день"
                className="min-h-[44px] text-xs font-semibold text-[var(--terra-primary)] dark:text-green-400 flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                <span>Операции за день</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Transactions List */}
            <div className="flex flex-col gap-2 pt-1">
              {displayTransactions.length===0 && (
                <div className="rounded-xl border border-dashed border-[var(--terra-border)] dark:border-white/10 p-4 text-center text-xs text-[var(--terra-muted)] dark:text-gray-400">
                  В выбранный день операций нет
                </div>
              )}
              {displayTransactions.map(tx => {
                const txMember = members.find(m => m.id === tx.memberId) || { name: 'Семья', color: '#4A7C59' };
                const isIncome = tx.type === 'income';
                const cat = categories.find(c => c.id === tx.category);
                const catLabel = cat?.label || (isIncome ? 'Доход' : 'Расход');
                const displayTitle = tx.note || catLabel;
                const brandKey = getMerchantBrandKey(displayTitle);
                const txDate = new Date(tx.date);
                const timeFormatted = txDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const dateFormatted = `${txDate.getDate()} ${txDate.toLocaleDateString('ru-RU', { month: 'short' })}`;

                return (
                  <button type="button"
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    aria-label={`Редактировать операцию: ${displayTitle}`}
                    className="min-h-[48px] w-full flex items-center justify-between p-2.5 text-left bg-white dark:bg-[var(--terra-soft)] rounded-xl shadow-xs border border-[#EAE6DE]/60 dark:border-white/5 transition cursor-pointer hover:border-[#4A7C59]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        <BrandIcon name={displayTitle} brandKey={brandKey} category={cat} size="sm" className="w-9 h-9 rounded-xl" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-[var(--terra-ink)] dark:text-white truncate">
                          {displayTitle}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--terra-muted)] dark:text-gray-400 truncate">
                          <span className="font-medium" style={{ color: txMember.color }}>
                            {txMember.name}
                          </span>
                          <span>•</span>
                          <span>{dateFormatted}, {timeFormatted}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-headline font-bold shrink-0 ml-2 ${
                      isIncome ? 'text-[var(--terra-primary)] dark:text-green-400' : 'text-[#B83230] dark:text-red-400'
                    }`}>
                      {settings.privacyMode ? '•••' : `${isIncome ? '+' : '-'}${tx.amount.toLocaleString('ru-RU')} ₽`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Scheduled Monthly Mandatory Payments */}
          <section className={`${SURFACE_CARD} flex flex-col gap-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat size={18} className="text-[#705C30] dark:text-[#C4A66A]" />
                <span className="text-sm font-headline font-bold text-[var(--terra-ink)] dark:text-white">Обязательные платежи</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--terra-muted)] dark:text-gray-400">
                  {displayMandatoryExpenses.length} {displayMandatoryExpenses.length === 1 ? 'платёж' : displayMandatoryExpenses.length < 5 ? 'платежа' : 'платежей'}
                </span>
                {onAddMandatoryExpense && <button type="button" onClick={onAddMandatoryExpense}
                  aria-label="Добавить обязательный платёж"
                  className="min-h-[44px] px-3 rounded-xl bg-[#4A7C59] text-white text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[#4A7C59]">
                  Добавить
                </button>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {displayMandatoryExpenses.length === 0 && (
                <p className="rounded-xl border border-[var(--terra-border)] dark:border-white/10 px-3 py-4 text-sm text-[var(--terra-muted)] dark:text-gray-400">Обязательных платежей пока нет. Добавьте их в настройках бюджета, если они нужны.</p>
              )}
              {displayMandatoryExpenses.map(exp => {
                const title = exp.name || (exp as any).title || 'Обязательный платёж';
                const dayNum = exp.day ?? (exp as any).dayOfMonth ?? 1;
                const paymentState = monthlyPaymentStates.find(state => state.id === exp.id);
                const isPaid = paymentState?.isPaid ?? false;

                return (
                  <div 
                    key={exp.id}
                    className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-[var(--terra-soft)] rounded-xl border border-[#EAE6DE]/60 dark:border-white/5"
                  >
                    <button type="button" onClick={() => onEditMandatoryExpense?.(exp)} aria-label={`Редактировать обязательный платёж: ${title}`}
                      className="min-h-[44px] flex min-w-0 flex-1 items-center gap-3 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59]">
                      <div className="w-8 h-8 rounded-lg bg-[#C4A66A]/20 text-[#705C30] dark:text-[#C4A66A] flex items-center justify-center shrink-0">
                        {getMandatoryIcon(title)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[var(--terra-ink)] dark:text-white break-words">{title}</span>
                        <span className="text-[11px] text-[var(--terra-muted)] dark:text-gray-400">До {dayNum}-го числа</span>
                      </div>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs font-headline font-bold text-[var(--terra-ink)] dark:text-white">
                        {settings.privacyMode ? '•••' : `${exp.amount.toLocaleString('ru-RU')} ₽`}
                      </span>
                      {!isPaid && paymentState && paymentState.paidAmount > 0 && (
                        <span className="text-[11px] text-[var(--terra-muted)] dark:text-gray-400">
                          {settings.privacyMode ? 'Частичная оплата' : `Осталось ${formatBudgetMoney(paymentState.amountNeeded)} ₽`}
                        </span>
                      )}
                      {isPaid && !paymentState?.isManuallyPaid ? (
                        <span className="text-[11px] font-bold text-[var(--terra-primary)] dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          Оплачено операцией
                        </span>
                      ) : onToggleMandatoryPaid ? (
                        <button
                          type="button"
                          onClick={() => void onToggleMandatoryPaid(exp.id)}
                          aria-label={paymentState?.isManuallyPaid ? 'Снять ручную отметку оплаты' : 'Отметить платёж оплаченным вручную'}
                          className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${paymentState?.isManuallyPaid
                            ? 'text-emerald-800 bg-emerald-100 dark:bg-green-950/40 dark:text-green-400'
                            : 'text-white bg-primary hover:bg-primary-dark'}`}
                        >
                          {paymentState?.isManuallyPaid ? 'Снять отметку' : 'Отметить вручную'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top Spending Categories Section */}
          <section className="flex flex-col bg-[var(--terra-soft)] dark:bg-[var(--terra-surface)] p-4 rounded-2xl shadow-xs border border-[var(--terra-border)] dark:border-white/10 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-headline font-bold text-[var(--terra-ink)] dark:text-white">Топ категорий трат</span>
              <span className="text-xs text-[var(--terra-muted)] dark:text-gray-400">
                {settings.privacyMode ? '•••' : `${formatBudgetMoney(monthExpense)} ₽ всего`}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {displayTopCategories.length === 0 && (
                <p className="rounded-xl border border-[var(--terra-border)] dark:border-white/10 px-3 py-4 text-sm text-[var(--terra-muted)] dark:text-gray-400">За этот месяц ещё нет расходов по категориям.</p>
              )}
              {displayTopCategories.map((cat, idx) => (
                <div 
                  key={cat.id || idx} 
                  onClick={cat.id === 'uncategorized' ? undefined : () => onSelectCategory?.(cat.id)}
                  className={`flex flex-col gap-1 p-1.5 -mx-1.5 rounded-xl ${cat.id === 'uncategorized' ? '' : 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer'}`}
                  title={cat.id === 'uncategorized' ? 'Расходы без назначенной категории' : `Аналитика категории «${cat.label || (cat as any).name || ''}»`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--terra-ink)] dark:text-white truncate">
                      {idx + 1}. {cat.label || (cat as any).name || 'Категория'}
                    </span>
                    <div className="flex items-center gap-1.5 font-bold tabular-nums">
                      <span className="text-[var(--terra-ink)] dark:text-white">
                        {settings.privacyMode ? '•••' : `${formatBudgetMoney(cat.sum)} ₽`}
                      </span>
                      <span className="text-[var(--terra-muted)] dark:text-gray-400 text-[11px] font-normal">
                        ({cat.percent}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, cat.percent)}%`, backgroundColor: cat.color || '#4A7C59' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* View All Categories / Analytics & Manage Categories */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button 
                type="button"
                onClick={() => onSelectCategory ? onSelectCategory('all') : undefined}
                className="py-2.5 px-2 rounded-xl bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] text-[var(--terra-primary)] dark:text-green-400 hover:bg-[#E2DDD3] dark:hover:bg-[var(--terra-soft)] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Открыть аналитику всех категорий"
              >
                <PieChart size={14} />
                <span>Аналитика трат</span>
              </button>

              <button 
                type="button"
                onClick={() => onOpenCategoriesModal ? onOpenCategoriesModal() : setIsCatModalOpen(true)}
                className="py-2.5 px-2 rounded-xl bg-[#4A7C59] text-white hover:bg-[#3B6447] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Создать новую категорию или настроить"
              >
                <Plus size={15} />
                <span>Категория</span>
              </button>
            </div>
          </section>
          <div className="mt-4"><BudgetPlanningPanel settings={settings} categories={categories}
            transactions={transactions} monthTransactions={familyMonthTransactions}
            currentMonth={currentMonth} isCurrentMonth={isCurrentMonthView}
            totalBalance={ledger} reservedAmount={reservedAmount} daysToSalary={remainingDays}/></div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP VIEW (Visible on md and up)                       */}
      {/* ========================================================= */}
      <div className="hidden md:flex flex-col min-w-0 min-h-0 flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 pt-6 pb-20 gap-5 text-graphite dark:text-gray-100">
        {/* 1. TOP HEADER: Title, Month, Family Filters, Actions */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border/70 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <h1 className="text-2xl lg:text-3xl font-headline font-bold text-graphite dark:text-white tracking-tight">
            Бюджет
          </h1>

          {/* Month Selector */}
          <div className="flex items-center bg-white dark:bg-[var(--terra-surface)] border border-surface-border dark:border-white/10 rounded-xl px-2.5 py-1.5 shadow-sm gap-2">
            <button 
              onClick={handlePrevMonth}
              aria-label="Предыдущий месяц" 
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" 
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center text-xs font-bold text-graphite dark:text-white font-headline px-1 select-none">
              <span>{monthTitle}</span>
            </div>
            <button 
              onClick={handleNextMonth}
              aria-label="Следующий месяц" 
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" 
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Family Member Filter Pills */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xs font-medium text-graphite-muted dark:text-gray-400 hidden sm:inline">
              Участники:
            </span>
            <div role="group" aria-label="Участник бюджета" className={FILTER_RAIL}>
              <button 
                onClick={() => setSelectedMember('all')}
                aria-pressed={selectedMember === "all"}
                className={`${FILTER_CHIP} cursor-pointer ${
                  selectedMember === 'all' 
                    ? FILTER_CHIP_ACTIVE 
                    : FILTER_CHIP_IDLE
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
                    aria-pressed={isSelected}
                    className={`${FILTER_CHIP} cursor-pointer ${
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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onSelectCategory ? onSelectCategory('all') : undefined}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-graphite dark:text-white bg-white dark:bg-[var(--terra-surface)] hover:bg-[#F3EFE7] dark:hover:bg-[var(--terra-soft)] border border-surface-border dark:border-white/10 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            type="button"
            title="Открыть список всех операций за текущий месяц"
          >
            <List size={15} className="text-[var(--terra-primary)]" />
            <span>Все операции ({monthTransactions.length})</span>
          </button>

          {onImportClick && (
            <button 
              onClick={onImportClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-graphite dark:text-white bg-white dark:bg-[var(--terra-surface)] hover:bg-[#F3EFE7] dark:hover:bg-[var(--terra-soft)] border border-surface-border dark:border-white/10 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              type="button"
            >
              <Upload size={15} className="text-graphite-muted dark:text-gray-400" />
              <span>Импорт</span>
            </button>
          )}

          <button 
            onClick={onOpenAddModal}
            aria-label="Добавить операцию" 
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-primary hover:bg-primary-dark text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" 
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
        <div className={`${SURFACE_CARD} flex min-w-0 flex-col justify-between gap-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-[11px] font-bold tracking-wider uppercase text-primary-dark dark:text-green-400">
                {personalOnly?'Личный ориентир в день':'Семейный ориентир в день'}
              </span>
            </div>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-primary-light text-primary dark:bg-green-950/40 dark:text-green-400 border border-primary-border/60">
              {isCurrentMonthView ? `${remainingDays} дн. до зарплаты` : 'Архив'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span data-testid="family-daily-limit-desktop" className="text-2xl lg:text-3xl font-semibold font-headline text-primary-dark dark:text-green-400 tracking-tight">
                {!personalOpeningKnown?'—':settings.privacyMode ? '•••' : `${formatBudgetMoney(safeDailyLimit)} ₽`}
              </span>
              <span className="text-xs font-semibold text-graphite-muted dark:text-gray-400">/ день</span>
            </div>
            <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
              Расчёт: {!personalOpeningKnown?'—':settings.privacyMode ? '•••' : `${formatBudgetMoney(availableBalance)} ₽`} доступно ÷ {remainingDays} оставшихся дней
            </p>
          </div>

          <div className="pt-1.5 border-t border-primary-border/30 flex items-center justify-between text-[11px]">
            <span className="text-graphite-muted dark:text-gray-400">Дневной ориентир:</span>
            <span className="font-bold text-emerald-800 dark:text-green-400">
              {!isCurrentMonthView ? 'Лимит не рассчитывается' : !personalOpeningKnown?'Укажите личный начальный остаток':safeDailyLimit > 0 ? 'Ориентир рассчитан' : 'Нет доступного остатка'}
            </span>
          </div>
        </div>

        {/* Current-day metrics do not apply to historical months. */}
        {isCurrentMonthView ? (
        <div className={`${SURFACE_CARD} flex min-w-0 flex-col justify-between gap-3`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-graphite-muted dark:text-gray-400">
              {personalOnly?'Личные траты':'Траты семьи'} сегодня ({currentDayNum} {currentMonth.toLocaleDateString('ru-RU', { month: 'short' })})
            </span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
              todayReserve >= 0 
                ? 'bg-emerald-50 text-emerald-800 dark:bg-green-950/40 dark:text-green-400 border border-emerald-200 dark:border-green-800/40' 
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200'
            }`}>
              {safeDailyLimit <= 0 ? 'Ориентир не задан' : todayReserve >= 0 ? 'Ниже ориентира' : 'Выше ориентира'}
            </span>
          </div>

          <div className="my-2 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <div className="text-lg font-bold font-headline text-graphite dark:text-white">
                {personalOnly?'Сегодня (личные)':'Сегодня (семья)'}: {settings.privacyMode ? '•••' : `${todaySpent.toLocaleString('ru-RU')} ₽`}
              </div>
              <div className={`text-xs font-bold ${todayReserve >= 0 ? 'text-primary dark:text-green-400' : 'text-red-500'}`}>
                {safeDailyLimit <= 0 ? 'Ориентир не задан' : todayReserve >= 0 ? `До ориентира: ${formatBudgetMoney(todayReserve)} ₽` : `Выше ориентира на ${formatBudgetMoney(Math.abs(todayReserve))} ₽`}
              </div>
            </div>

            <div className="w-full bg-[var(--terra-soft)] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${todayReserve >= 0 ? 'bg-primary' : 'bg-red-500'}`}
                style={{ width: `${safeDailyLimit > 0 ? Math.min(100, (todaySpent / safeDailyLimit) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="pt-1.5 border-t border-surface-border/70 dark:border-white/5 flex items-center justify-between text-[11px] text-graphite-muted dark:text-gray-400">
            <span>{personalOnly?'Вчера (личные)':'Вчера (семья)'}: {settings.privacyMode?'•••':formatBudgetMoney(yesterdaySpent)+' ₽'}</span>
            <span className="text-emerald-700 dark:text-green-400 font-semibold">
              {yesterdaySpent < safeDailyLimit ? `Ниже ориентира на ${formatBudgetMoney(safeDailyLimit - yesterdaySpent)} ₽` : ''}
            </span>
          </div>
        </div>
        ) : (
          <div className={`${SURFACE_CARD} flex min-w-0 flex-col justify-between gap-3`}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">Расходы выбранного месяца</span>
            <span className="text-2xl font-bold text-graphite dark:text-white tabular-nums">{settings.privacyMode ? '•••' : `${formatBudgetMoney(monthExpense)} ₽`}</span>
            <p className="text-xs text-graphite-muted dark:text-gray-400">Показатели «сегодня» и «вчера» доступны в текущем месяце</p>
          </div>
        )}

                {/* Card 3: Месячный прогресс бюджета */}
        <div className={`${SURFACE_CARD} flex min-w-0 flex-col justify-between gap-3`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-graphite-muted dark:text-gray-400">
              Месячный прогресс бюджета
            </span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-[var(--terra-soft)] dark:bg-white/5 text-graphite dark:text-white">
              {currentDayNum} из {totalDaysInMonth} дней
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 my-1">
            <div className="text-center px-1">
              <span className="text-xs uppercase font-bold text-graphite-muted dark:text-gray-400 block">Приход</span>
              <span className="text-xs lg:text-sm font-semibold font-headline text-primary dark:text-green-400 truncate block">
                {settings.privacyMode ? '•••' : `${monthIncome.toLocaleString('ru-RU')} ₽`}
              </span>
              <span className="text-xs text-emerald-700 dark:text-green-400 block">факт</span>
            </div>

            <div className="text-center px-1 border-x border-surface-border/70 dark:border-white/5">
              <span className="text-xs uppercase font-bold text-graphite-muted dark:text-gray-400 block">Расход</span>
              <span className="text-xs lg:text-sm font-semibold font-headline text-[#D95C48] dark:text-red-400 truncate block">
                {settings.privacyMode ? '•••' : `${monthExpense.toLocaleString('ru-RU')} ₽`}
              </span>
              <span className="text-xs text-graphite-muted dark:text-gray-400 block">
                {monthIncome > 0 ? `${Math.round((monthExpense / monthIncome) * 100)}%` : '—'}
              </span>
            </div>

            <div className="text-center px-1">
              <span className="text-xs font-medium text-graphite-muted dark:text-gray-400 block">Результат месяца</span>
              <span className="text-xs lg:text-sm font-semibold font-headline text-emerald-700 dark:text-green-400 truncate block">
                {settings.privacyMode ? '•••' : `${monthBalance > 0 ? '+' : ''}${monthBalance.toLocaleString('ru-RU')} ₽`}
              </span>
              <span className="text-xs text-graphite-muted dark:text-gray-400 block">Доходы − расходы</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-surface-border/70 dark:border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-graphite-muted dark:text-gray-400">Расходы к доходам:</span>
            <span className="font-bold text-graphite dark:text-white">
              {monthIncome > 0 ? `${Math.round((monthExpense / monthIncome) * 100)}%` : '—'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. MAIN WORKSPACE: 7-col Interactive Calendar + 5-col Analytics Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT / CENTER: Full Calendar & Selected Day Detail (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Full Interactive Calendar Card */}
          <div className="bg-white dark:bg-[var(--terra-surface)] rounded-2xl p-4 sm:p-5 border border-surface-border dark:border-white/10 shadow-sm">
            {/* Calendar Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-border/70 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-light text-primary dark:bg-green-950/40 dark:text-green-400 flex items-center justify-center font-bold">
                  <PieChart size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-headline uppercase tracking-wide text-graphite dark:text-white">
                    Календарь
                  </h3>
                  <p className="text-[11px] text-graphite-muted dark:text-gray-400">
                    {monthTitle} — клик по дню открывает детализацию и список операций
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
                const {income:dayIncome,expense:dayExpense,net:dayNet}=monthlyMoneyTotals(dayTxs);
                const hasTransactions = dayTxs.length > 0;

                // Mandatory payment on this day - only mark after fact of payment
                const paidMandatory = mandatoryExpenses.find(e => (e.day ?? (e as any).dayOfMonth) === dayNum && checkMandatoryPaid(e));

                const isSelected = selectedDay === dayNum;
                const isCurrentToday = isCurrentMonthView && today.getDate() === dayNum;

                // Format number with compact integer suffix (strictly no kopecks or decimal fractions)
                const formatDayAmount = (val: number) => {
                  const absVal = Math.round(Math.abs(val));
                  if (absVal >= 1000000) {
                    return `${Math.round(absVal / 1000000)}M`;
                  }
                  if (absVal >= 1000) {
                    return `${Math.round(absVal / 1000)}k`;
                  }
                  return `${absVal}`;
                };

                // Calculate dynamic heatmap styling based on budget performance (Task 2.2)
                let dayBgClass = '';
                let dayBorderClass = '';
                
                if (isSelected) {
                  dayBgClass = 'bg-primary-light/40 dark:bg-primary/20 border-primary ring-2 ring-primary/20 shadow-sm z-10';
                } else if (dayExpense > 0) {
                  if (safeDailyLimit > 0 && dayExpense > safeDailyLimit) {
                    dayBgClass = 'bg-red-500/[0.04] dark:bg-red-500/[0.06] hover:bg-red-500/[0.08]';
                    dayBorderClass = 'border-red-300/60 dark:border-red-900/40 hover:border-red-400';
                  } else {
                    dayBgClass = 'bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] hover:bg-emerald-500/[0.08]';
                    dayBorderClass = 'border-[#4A7C59]/40 dark:border-[#4A7C59]/20 hover:border-[#4A7C59]/60';
                  }
                } else if (isCurrentToday) {
                  dayBgClass = 'bg-primary-light/[0.15] dark:bg-primary/[0.08] hover:bg-primary-light/[0.25]';
                  dayBorderClass = 'border-primary/40 dark:border-primary/20';
                } else {
                  dayBgClass = 'bg-white dark:bg-[var(--terra-soft)] hover:bg-gray-50 dark:hover:bg-[var(--terra-soft)]';
                  dayBorderClass = 'border-surface-border dark:border-white/5';
                }

                return (
                  <div 
                    key={dayNum}
                    onClick={() => setSelectedDay(dayNum)}
                    role="button" tabIndex={0} aria-pressed={isSelected}
                    aria-label={`Выбрать ${dayNum} ${monthTitle}`}
                    onKeyDown={(e) => { if (e.key==='Enter'||e.key===' ') {e.preventDefault();setSelectedDay(dayNum);} }}
                    className={`h-14 sm:h-16 p-1 sm:p-1.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer active:scale-[0.98] select-none relative ${dayBgClass} ${dayBorderClass}`}
                  >
                    <div className="flex justify-between items-start min-w-0">
                      <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                        <span className={`text-[10px] sm:text-xs ${isSelected ? 'font-black text-primary-dark dark:text-green-400' : 'font-bold text-graphite dark:text-white'}`}>
                          {dayNum}
                        </span>
                        {isCurrentToday && (
                          <span className="text-[6px] sm:text-[7px] uppercase font-bold text-primary bg-white dark:bg-[var(--terra-surface)] px-0.5 sm:px-1 rounded border border-primary/20 hidden min-[360px]:inline">
                            Сегодня
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {paidMandatory && (
                          <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-[#C4A66A]" title={`Оплаченный обязательный платеж: ${paidMandatory.name}`} />
                        )}
                        {dayIncome > 0 && (
                          <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-primary" title="Доход" />
                        )}
                        {dayExpense > 0 && (
                          <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-[#D95C48]" title="Траты" />
                        )}
                      </div>
                    </div>

                    {/* Amount badge on cell: Income minus expense (Day Net) */}
                    {hasTransactions ? (
                      dayNet > 0 ? (
                        <div className="hidden sm:block bg-emerald-50 dark:bg-emerald-950/40 text-primary dark:text-green-400 font-headline text-[9px] font-extrabold px-1 py-0.5 rounded border border-primary/30 truncate text-right">
                          {settings.privacyMode ? '•••' : `+${formatDayAmount(dayNet)} ₽`}
                        </div>
                      ) : dayNet < 0 ? (
                        <div className="hidden sm:block bg-[#FDF2F0] dark:bg-red-950/40 text-[#D95C48] dark:text-red-400 font-headline text-[9px] font-bold px-1 py-0.5 rounded border border-red-200 dark:border-red-900/30 truncate text-right">
                          {settings.privacyMode ? '•••' : `-${formatDayAmount(dayNet)} ₽`}
                        </div>
                      ) : (
                        <div className="hidden sm:block bg-[var(--terra-soft)] dark:bg-white/5 text-graphite-muted dark:text-gray-400 font-headline text-[9px] font-semibold px-1 py-0.5 rounded border border-surface-border/60 dark:border-white/10 truncate text-right">
                          {settings.privacyMode ? '•••' : '0 ₽'}
                        </div>
                      )
                    ) : paidMandatory ? (
                      <div className="hidden sm:block bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-headline text-[9px] font-bold px-1 py-0.5 rounded border border-amber-200 truncate text-right">
                        {settings.privacyMode ? '•••' : `${formatDayAmount(paidMandatory.amount)} ₽`}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Detail Box + Quick Add Form (выровнен по нижнему краю с правой колонкой) */}
          <div className="bg-white dark:bg-[var(--terra-surface)] rounded-2xl p-5 border border-primary/30 bg-gradient-to-b from-white to-[#F8F6F1] dark:from-[#1C1C1E] dark:to-[#222225] shadow-sm flex-1 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-border/70 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center font-headline shadow-xs">
                  {selectedDay}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-graphite dark:text-white uppercase tracking-wide capitalize">
                    {activeSelectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h4>
                  <p className="text-[11px] text-graphite-muted dark:text-gray-400">
                    {selectedDayTransactions.length} {selectedDayTransactions.length === 1 ? 'операция' : 'операций'}, 
                    {selectedDayNet > 0 ? ' зачисление дохода' : selectedDayNet < 0 ? ' расход средств' : ' без трат'}
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
                  Результат выбранного дня
                </span>
                <button 
                  onClick={() => setIsDayModalOpen(true)}
                  className="inline-flex min-h-[44px] items-center px-2 text-xs font-bold text-primary hover:underline ml-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Развернуть ↗
                </button>
              </div>
            </div>

            {/* List of day's operations */}
            <div className="py-3 space-y-2 flex-1">
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
                    <button type="button"
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      aria-label={`Редактировать операцию: ${displayTitle}`}
                      className="min-h-[48px] w-full text-left flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[var(--terra-soft)] border border-surface-border/70 dark:border-white/5 hover:border-primary/50 hover:bg-[var(--terra-surface)] shadow-xs cursor-pointer transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                              <span className="font-medium" style={{ color: member.color }}>
                                {member.name}
                              </span>
                            )}
                            {category && <span>({category.label})</span>}
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
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick Add Form on Selected Day */}
            <div className="pt-2 mt-auto border-t border-surface-border/70 dark:border-white/10 shrink-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400 mb-2">
                Быстрый ввод чека на {selectedDay} {currentMonth.toLocaleDateString('ru-RU', { month: 'short' })}:
              </div>
              {selectedMember === 'all' && (
                <div className="mb-2">
                  <label htmlFor="budget-quick-member" className="block mb-1 text-[11px] font-semibold text-graphite-muted dark:text-gray-400">
                    Кто совершил покупку?
                  </label>
                  <select id="budget-quick-member" value={quickMemberId || members.find(member=>member.userId && member.userId===user?.uid)?.id || ''}
                    onChange={event=>{setQuickMemberId(event.target.value);setQuickAddError('');}}
                    className="min-h-[44px] w-full rounded-xl border border-surface-border bg-white dark:bg-[var(--terra-soft)] px-3 text-xs text-graphite dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <option value="">Выберите участника</option>
                    {members.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                </div>
              )}
              <div className="mb-2">
                <label htmlFor="budget-quick-category" className="block mb-1 text-[11px] font-semibold text-graphite-muted dark:text-gray-400">
                  Категория расхода
                </label>
                <select id="budget-quick-category" value={quickCategoryId}
                  onChange={event=>{setQuickCategoryId(event.target.value);setQuickAddError('');}}
                  className="min-h-[44px] w-full rounded-xl border border-surface-border bg-white dark:bg-[var(--terra-soft)] px-3 text-xs text-graphite dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <option value="other">Другое — разобрать позже</option>
                  {categories.filter(cat=>cat.id!=='other' && cat.transactionType!=='income').map(cat=>(
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input 
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
                  aria-label="Название быстрой операции"
                  className="min-h-[44px] w-full sm:w-1/2 bg-white dark:bg-[var(--terra-soft)] border border-surface-border dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-graphite dark:text-white placeholder-graphite-muted dark:placeholder-white/40 focus:ring-1 focus:ring-primary focus:border-primary" 
                  placeholder="Название (например: Обед, Такси...)" 
                  type="text"
                />
                <input 
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
                  aria-label="Сумма быстрой операции"
                  inputMode="decimal"
                  className="min-h-[44px] w-full sm:w-1/4 bg-white dark:bg-[var(--terra-soft)] border border-surface-border dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-graphite dark:text-white font-semibold placeholder-graphite-muted dark:placeholder-white/40 focus:ring-1 focus:ring-primary focus:border-primary" 
                  placeholder="Сумма ₽" 
                  type="text"
                />
                <button 
                  onClick={handleQuickAdd}
                  disabled={isQuickSaving}
                  className={`min-h-[44px] w-full sm:w-auto px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs whitespace-nowrap cursor-pointer transition-all ${
                    quickAddedSuccess ? 'bg-emerald-700' : 'bg-primary hover:bg-primary-dark active:scale-95'
                  }`}
                  type="button"
                >
                  {isQuickSaving ? 'Сохранение…' : quickAddedSuccess ? '✓ Записано' : '+ Записать'}
                </button>
              </div>
              {quickAddError && (
                <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{quickAddError}</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Analytics Sidebar (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* 1. Category Breakdown Card */}
          <div className="bg-white dark:bg-[var(--terra-surface)] rounded-2xl p-4 border border-surface-border dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-surface-border/70 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <PieChart size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold font-headline uppercase tracking-wide text-graphite dark:text-white">
                    Категории расходов
                  </h3>
                  <p className="text-[10px] text-graphite-muted dark:text-gray-400">
                    {settings.privacyMode ? '•••' : `${monthExpense.toLocaleString('ru-RU')} ₽ израсходовано`}
                  </p>
                </div>
              </div>
            </div>

            {/* Category Bars */}
            <div className="space-y-1 mt-2">
              {categoryBreakdown.length === 0 ? (
                <div className="text-center py-4 text-xs text-graphite-muted dark:text-gray-500 italic">
                  Пока нет расходов для отображения
                </div>
              ) : (
                categoryBreakdown.slice(0, 6).map(cat => {
                  const pct = monthExpense > 0 ? (cat.sum / monthExpense) * 100 : 0;
                  const roundedPct = Math.round(pct);

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onSelectCategory?.(cat.id)}
                      className="w-full text-left space-y-1.5 p-2 -mx-2 rounded-xl hover:bg-[var(--terra-surface)] dark:hover:bg-[var(--terra-soft)] transition cursor-pointer group"
                      title={`Аналитика категории «${cat.label}»`}
                    >
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-graphite dark:text-white group-hover:text-primary dark:group-hover:text-green-400 transition-colors flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          {cat.label}
                        </span>
                        <span className="text-[11px] text-graphite-muted dark:text-gray-400 font-semibold tabular-nums">
                          {settings.privacyMode ? '•••' : `${Math.round(cat.sum).toLocaleString('ru-RU')} ₽`} 
                          <span className="text-primary dark:text-green-400 font-bold ml-1">({roundedPct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-[var(--terra-soft)] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-2 mt-3 border-t border-surface-border/70 dark:border-white/10 grid grid-cols-2 gap-2">
              <button 
                onClick={() => onSelectCategory?.('all')}
                className="py-1.5 px-3 bg-[var(--terra-surface)] dark:bg-[var(--terra-soft)] hover:bg-primary-light/50 dark:hover:bg-white/5 border border-surface-border dark:border-white/5 rounded-xl text-xs font-bold text-primary dark:text-green-400 flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer group"
                type="button"
                title="Подробный отчет и динамика по всем категориям"
              >
                <PieChart size={14} />
                <span>Аналитика трат</span>
              </button>

              <button 
                onClick={() => setIsCatModalOpen(true)}
                className="py-1.5 px-3 bg-[#4A7C59] hover:bg-[#3D684A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer group"
                type="button"
                title="Добавить новую категорию или настроить"
              >
                <Plus size={14} />
                <span>Категория</span>
              </button>
            </div>
          </div>

<BudgetPlanningPanel settings={settings} categories={categories}
            transactions={transactions} monthTransactions={familyMonthTransactions}
            currentMonth={currentMonth} isCurrentMonth={isCurrentMonthView}
            totalBalance={ledger} reservedAmount={reservedAmount} daysToSalary={remainingDays}/>
          
                    {/* 2. Mandatory Payments Card */}
          <div className="bg-white dark:bg-[var(--terra-surface)] rounded-2xl p-4 border border-surface-border dark:border-white/10 shadow-sm">
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

              {onAddMandatoryExpense && <button type="button" onClick={onAddMandatoryExpense}
                aria-label="Добавить обязательный платёж"
                className="min-h-[44px] px-3 rounded-xl bg-[#4A7C59] text-white text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[#4A7C59]">
                Добавить
              </button>}
            </div>

            <div className="space-y-2">
              {mandatoryExpenses.length === 0 ? (
                <div className="text-center py-3 text-xs text-graphite-muted dark:text-gray-500 italic">
                  Обязательные платежи не добавлены
                </div>
              ) : (
                mandatoryExpenses.map(expense => {
                  const paymentState = monthlyPaymentStates.find(state => state.id === expense.id);
                  const isPaid = paymentState?.isPaid ?? false;
                  const isDebt = expense.expenseType === 'debt' || Boolean(expense.linkedDebtId);

                  return (
                    <div 
                      key={expense.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-surface-border dark:border-white/5 hover:border-primary/40 bg-[var(--terra-surface)] dark:bg-[var(--terra-soft)] transition group"
                    >
                      <button type="button"
                        onClick={() => onEditMandatoryExpense?.(expense)}
                        aria-label={`Редактировать обязательный платёж: ${expense.name}`}
                        className="min-h-[44px] flex min-w-0 flex-1 items-center gap-2.5 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <div className={`w-8 h-8 rounded-lg border font-bold text-xs flex items-center justify-center shrink-0 ${
                          isDebt 
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400' 
                            : 'bg-white dark:bg-[var(--terra-surface)] border-surface-border dark:border-white/10 text-graphite-muted dark:text-gray-400'
                        }`}>
                          {expense.day}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-graphite dark:text-white flex items-center gap-1">
                              {isDebt ? <CreditCard size={11} className="text-amber-600 dark:text-amber-400" /> : <Home size={11} className="text-stone-400" />}
                              <span>{expense.name}</span>
                            </span>
                            <span className={`text-[9px] font-bold px-1 rounded ${
                              isPaid ? 'text-emerald-800 bg-emerald-50 dark:bg-green-950/40 dark:text-green-400' : 'text-[#D95C48] bg-red-50 dark:bg-red-950/40'
                            }`}>
                              {isPaid ? 'Оплачено ✓' : `до ${expense.day} числа`}
                            </span>
                            <span className={`text-[9px] font-semibold px-1 rounded border ${
                              isDebt 
                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40' 
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-white/5'
                            }`}>
                              {isDebt ? 'Кредит' : 'Бытовой'}
                            </span>
                          </div>
                          <span className="text-[10px] text-graphite-muted dark:text-gray-400">
                            {expense.remind ? 'С напоминанием' : 'Ежемесячно'}
                          </span>
                        </div>
                      </button>

                      <div className="flex flex-wrap items-center justify-end gap-2.5">
                        <span className="text-xs font-bold font-headline text-graphite dark:text-white tabular-nums">
                          {settings.privacyMode ? '•••' : `${formatBudgetMoney(expense.amount)} ₽`}
                        </span>
                        {!isPaid && paymentState && paymentState.paidAmount > 0 && (
                          <span className="text-[10px] text-[var(--terra-muted)] dark:text-gray-400">
                            {settings.privacyMode ? 'Частичная оплата' : `Осталось ${formatBudgetMoney(paymentState.amountNeeded)} ₽`}
                          </span>
                        )}
                        {isPaid && !paymentState?.isManuallyPaid ? (
                          <span className="text-xs font-semibold text-[var(--terra-primary)] dark:text-green-400">
                            Оплачено операцией
                          </span>
                        ) : onToggleMandatoryPaid ? (
                          <button type="button"
                            onClick={() => void onToggleMandatoryPaid(expense.id)}
                            aria-label={paymentState?.isManuallyPaid ? 'Снять ручную отметку оплаты' : 'Отметить платёж оплаченным вручную'}
                            className={`min-h-[44px] px-3 text-xs font-semibold rounded-xl transition-colors ${
                              paymentState?.isManuallyPaid
                                ? 'text-emerald-800 bg-emerald-100 dark:bg-green-950/40'
                                : 'text-white bg-primary hover:bg-primary-dark'
                            }`}>
                            {paymentState?.isManuallyPaid ? 'Снять отметку' : 'Отметить оплаченным'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Family Operations Feed: explicit day/month scope, never a silent fallback. */}
          <section className="bg-white dark:bg-[var(--terra-surface)] rounded-2xl p-4 border border-surface-border dark:border-white/10 shadow-sm flex flex-col gap-3"
            aria-label="История операций бюджета">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold font-headline uppercase tracking-wide text-graphite dark:text-white">
                История операций
              </h3>
              <span className="text-xs font-semibold text-graphite-muted dark:text-gray-400">
                {visibleHistory.length} из {historyScope === 'day' ? selectedDayTransactions.length : monthTransactions.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Период истории операций">
              {(['day','month'] as const).map(scope => (
                <button key={scope} type="button" onClick={() => setHistoryScope(scope)}
                  aria-pressed={historyScope===scope}
                  className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${historyScope===scope
                    ? 'bg-primary text-white border-primary'
                    : 'bg-[var(--terra-surface)] dark:bg-[var(--terra-soft)] text-graphite dark:text-white border-surface-border'}`}>
                  {scope==='day' ? `День · ${selectedDay}` : 'Весь месяц'}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="search" aria-label="Поиск по истории операций"
                value={historySearch} onChange={event=>setHistorySearch(event.target.value)}
                placeholder="Название, категория или участник"
                className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-surface-border bg-white dark:bg-[var(--terra-soft)] px-3 text-sm text-graphite dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
              <select aria-label="Тип операций в истории" value={historyType}
                onChange={event=>setHistoryType(event.target.value as 'all' | 'expense' | 'income')}
                className="min-h-[44px] rounded-xl border border-surface-border bg-white dark:bg-[var(--terra-soft)] px-3 text-sm text-graphite dark:text-white focus-visible:ring-2 focus-visible:ring-primary">
                <option value="all">Все типы</option>
                <option value="expense">Расходы</option>
                <option value="income">Доходы</option>
              </select>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1.5 overscroll-contain">
              {visibleHistory.length===0 && (
                <p className="rounded-xl border border-dashed border-surface-border p-4 text-xs text-graphite-muted dark:text-gray-400">
                  {historySearch.trim() || historyType!=='all'
                    ? 'По заданным фильтрам операций нет.'
                    : historyScope==='day'
                      ? 'В выбранный день операций нет. Переключитесь на «Весь месяц».'
                      : 'В этом месяце операций нет.'}
                </p>
              )}
              {visibleHistory.map(tx => {
                const member=members.find(m=>m.id===tx.memberId);
                const category=categories.find(cat=>cat.id===tx.category);
                const title=tx.note || category?.label || 'Операция';
                return (
                  <button type="button" key={tx.id} onClick={() => onEditTransaction(tx)}
                    aria-label={`Редактировать операцию: ${title}`}
                    className="min-h-[48px] w-full flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 text-left hover:border-surface-border hover:bg-[var(--terra-surface)] dark:hover:bg-[var(--terra-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-graphite dark:text-white break-words">{title}</span>
                      <span className="block text-[11px] text-graphite-muted dark:text-gray-400">
                        {member?.name || 'Семья'} · {new Date(tx.date).toLocaleDateString('ru-RU', {day:'numeric',month:'short'})}
                      </span>
                    </span>
                    <span className={`shrink-0 text-xs font-bold tabular-nums ${tx.type==='income' ? 'text-primary dark:text-green-400' : 'text-graphite dark:text-white'}`}>
                      {settings.privacyMode ? '•••' : `${tx.type==='income' ? '+' : '-'}${formatBudgetMoney(tx.amount)} ₽`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
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
        onSelectCategory={onSelectCategory}
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
