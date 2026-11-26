import React, { useState, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Users, Plus, BrainCircuit, Upload, 
  PieChart, DollarSign, Check, History, Sparkles, Filter, ChevronDown, 
  ChevronUp, CheckCircle2, ArrowRight, ArrowDown, ArrowUp, 
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
import BudgetHistoryControls from './BudgetHistoryControls';
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
  onOpenNotifications?: () => void;
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
  onOpenSettings,
  onOpenNotifications
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
  const [historyCategory,setHistoryCategory]=useState<string|null>(null);

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
    historyType, historySearch, categories, members,historyCategory
  ), [historyScope, historyType, historySearch, historyCategory, selectedDayTransactions, monthTransactions, categories, members]);
  const historyCategoryOptions=useMemo(()=>{
    const ids=new Set(monthTransactions.map(tx=>tx.category));
    if(historyCategory!==null)ids.add(historyCategory);
    return Array.from(ids,id=>{
      const category=categories.find(c=>c.id===id);
      const parent=category?.parentId?categories.find(c=>c.id===category.parentId):undefined;
      const label=category?(parent?parent.label+' / '+category.label:category.label):'Неизвестная категория'+(id?' · '+id:'');
      return {id,label};
    }).sort((a,b)=>a.label.localeCompare(b.label,'ru'));
  },[monthTransactions,categories,historyCategory]);
  const hasHistoryFilters=Boolean(historySearch.trim()||historyType!=='all'||historyCategory!==null);
  const historyEmptyText=hasHistoryFilters?'По заданным фильтрам операций нет.':
    historyScope==='day'?'В выбранный день операций нет. Переключитесь на «Весь месяц».':'В этом месяце операций нет.';

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
          onOpenNotifications={onOpenNotifications}
        />
        <div className="px-4 pt-3 space-y-2" data-testid="budget-month-selector">
              <button 
                type="button"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                aria-expanded={isMonthPickerOpen} aria-controls="budget-month-controls"
                aria-label={`Выбрать месяц: ${mobileMonthName}`}
                className="min-h-[44px] px-3 py-2 rounded-full bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] text-xs font-bold text-[var(--terra-ink)] dark:text-white hover:text-primary transition-colors flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
              >
                <span className="capitalize">{mobileMonthName}</span>
                <ChevronDown size={14} className="text-[var(--terra-muted)] dark:text-gray-400 shrink-0" />
              </button>

              {isMonthPickerOpen && (
                <>
                  
                  <div id="budget-month-controls" className="w-full max-w-sm bg-[var(--terra-surface)] border border-[var(--terra-border)] rounded-xl p-2 space-y-1">
                    <div className="text-xs font-medium text-[var(--terra-muted)] px-2 py-1">Выбор месяца</div>
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

        {/* Mobile Page Content */}
        <div className="flex flex-col w-full px-3.5 pb-4 md:pb-6 pt-3 gap-3 max-w-3xl mx-auto">
          {/* KPI & Family Overview Card */}
          <section className={`${SURFACE_CARD} flex flex-col gap-3.5`}>
            {/* Top Row: Daily Safe Limit & Pace Badge */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[var(--terra-muted)] dark:text-gray-400">{isCurrentMonthView ? (personalOnly?'Личный ориентир в день':'Семейный ориентир в день') : 'История бюджета'}</span>
                <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
                  <span data-testid="family-daily-limit-mobile" className="text-2xl font-headline font-bold text-[var(--terra-ink)] dark:text-white tabular-nums [overflow-wrap:anywhere] min-w-0">
                    {!isCurrentMonthView||!personalOpeningKnown?'—':settings.privacyMode ? '•••' : `${formatBudgetMoney(safeDailyLimit)} ₽`}
                  </span>
                  <span className="text-xs text-[var(--terra-muted)] dark:text-gray-400 font-medium">/ день</span>
                </div>
                {isCurrentMonthView&&personalOpeningKnown&&<span className="text-xs text-[var(--terra-muted)] mt-0.5">
                  {personalOnly?'Доступно лично до зарплаты':'Доступно семье до зарплаты'} ({remainingDays} дн.): <strong className="text-[var(--terra-ink)] font-semibold">{settings.privacyMode ? '•••' : `${formatBudgetMoney(availableBalance)} ₽`}</strong>
                </span>}
              </div>
              {(!isCurrentMonthView || !personalOpeningKnown || safeDailyLimit <= 0) && (
                <span className="text-xs text-[var(--terra-muted)] dark:text-gray-400">
                  {!isCurrentMonthView ? 'Архив' : !personalOpeningKnown ? 'Укажите остаток' : 'Нет остатка'}
                </span>
              )}
            </div>

            {/* Monthly Budget Progress Bar & Breakdown */}
            <div className="flex flex-col gap-1.5 pt-3 border-t border-[var(--terra-border)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-medium">
                <span className="text-[var(--terra-muted)] dark:text-gray-400">
                  {settings.privacyMode ? "Расходы к доходам: •••" : monthIncome > 0 ? `Расходы: ${Math.round((monthExpense / monthIncome) * 100)}% доходов` : "За месяц пока нет доходов"}
                </span>
                <span className={`font-semibold tabular-nums ${monthBalance < 0 ? "text-[#B83230] dark:text-red-400" : "text-[var(--terra-primary)] dark:text-green-400"}`}>
                  Результат месяца: {settings.privacyMode ? '•••' : `${monthBalance > 0 ? '+' : ''}${formatBudgetMoney(monthBalance)} ₽`}
                </span>
              </div>
              <div className="w-full bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className={`${monthIncome > 0 && monthExpense > monthIncome ? "bg-[#B83230]" : "bg-[#4A7C59]"} h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none`}
                  style={{ width: `${!settings.privacyMode && monthIncome > 0 ? Math.min(100, Math.round((monthExpense / monthIncome) * 100)) : 0}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1 text-xs text-[var(--terra-muted)] dark:text-gray-400">
                <span className="flex items-center gap-1 font-semibold text-[var(--terra-primary)] dark:text-green-400">
                  <ArrowDown size={13} />
                  Доходы: {settings.privacyMode ? '•••' : `${formatBudgetMoney(monthIncome)} ₽`}
                </span>
                <span className="flex items-center gap-1 font-semibold text-[#B83230] dark:text-red-400">
                  <ArrowUp size={13} />
                  Расходы: {settings.privacyMode ? '•••' : `${formatBudgetMoney(monthExpense)} ₽`}
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

          <div role="group" aria-label="Разделы бюджета" className={FILTER_RAIL}>
            {([['Операции','history'],['Календарь','calendar'],['Лимиты','limits']] as const).map(([label,id])=><button key={id} type="button" className={FILTER_CHIP+' '+FILTER_CHIP_IDLE} onClick={()=>{const target=document.getElementById('budget-'+id+'-mobile');target?.scrollIntoView({block:'start',behavior:'auto'});target?.focus({preventScroll:true});}}>{label}</button>)}
          </div>
          {/* Shared history controls retain day/member context */}
          <section id="budget-history-mobile" tabIndex={-1} aria-label="История операций бюджета" data-testid="budget-history-mobile" className={SURFACE_CARD+' space-y-3'}>
            <BudgetHistoryControls historyScope={historyScope} setHistoryScope={setHistoryScope}
              historyType={historyType} setHistoryType={setHistoryType} historySearch={historySearch} setHistorySearch={setHistorySearch}
              historyCategory={historyCategory} setHistoryCategory={setHistoryCategory} categoryOptions={historyCategoryOptions}
              selectedDay={selectedDay} count={visibleHistory.length} total={historyScope==='day'?selectedDayTransactions.length:monthTransactions.length}/>
            {/* Transactions List */}
            <div className="divide-y divide-[var(--terra-border)] pt-1">
              {visibleHistory.length===0 && (
                <div className="rounded-xl border border-dashed border-[var(--terra-border)] dark:border-white/10 p-4 text-center text-xs text-[var(--terra-muted)] dark:text-gray-400">
                  {historyEmptyText}
                </div>
              )}
              {visibleHistory.map(tx => {
                const txMember = members.find(m => m.id === tx.memberId) || { name: 'Семья', color: '#4A7C59' };
                const isIncome = tx.type === 'income';
                const cat = categories.find(c => c.id === tx.category);
                const catLabel = cat?.label || (isIncome ? 'Доход' : 'Расход');
                const displayTitle = tx.note || tx.payee || catLabel;
                const brandKey = getMerchantBrandKey(displayTitle);
                const txDate = new Date(tx.date);
                const timeFormatted = txDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const dateFormatted = `${txDate.getDate()} ${txDate.toLocaleDateString('ru-RU', { month: 'short' })}`;

                return (
                  <button type="button"
                    key={tx.id} data-history-row={tx.id} data-history-category={tx.category} data-history-type={tx.type}
                    onClick={() => onEditTransaction(tx)}
                    aria-label={`Редактировать операцию: ${displayTitle}`}
                    className="min-h-[48px] w-full flex items-center justify-between gap-2 px-1 py-2.5 text-left hover:bg-[var(--terra-soft)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        <BrandIcon name={displayTitle} brandKey={brandKey} category={cat} size="sm" className="w-9 h-9 rounded-xl" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-[var(--terra-ink)] dark:text-white truncate">
                          {displayTitle}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--terra-muted)] dark:text-gray-400">
                          <span className="font-medium" style={{ color: txMember.color }}>
                            {txMember.name}
                          </span>
                          <span>· {cat?.label || 'Неизвестная категория'}</span>
                          <span>· {dateFormatted}, {timeFormatted}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 min-w-0 max-w-[46%] text-right [overflow-wrap:anywhere] ${
                      isIncome ? 'text-[var(--terra-primary-text)]' : 'text-[var(--terra-ink)]'
                    }`}>
                      {settings.privacyMode ? '•••' : `${isIncome ? '+' : '-'}${formatBudgetMoney(tx.amount)} ₽`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>


          {/* Financial Calendar Section */}
          <section id="budget-calendar-mobile" tabIndex={-1} data-testid="budget-calendar-mobile" className={`${SURFACE_CARD} flex flex-col min-w-0 gap-2.5`}>
            {/* Header with full-width controls */}
            <div className="w-full flex items-center justify-between p-1 rounded-xl bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)]">
              <button 
                type="button"
                onClick={handlePrevMonth}
                aria-label="Предыдущий месяц в календаре"
                className="min-h-[44px] min-w-[44px] px-2 flex items-center justify-center rounded-lg text-[var(--terra-ink)] dark:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-sm font-headline font-bold text-[var(--terra-ink)] dark:text-white px-2 capitalize">
                {mobileMonthName}
              </span>

              <button 
                type="button"
                onClick={handleNextMonth}
                aria-label="Следующий месяц в календаре"
                className="min-h-[44px] min-w-[44px] px-2 flex items-center justify-center rounded-lg text-[var(--terra-ink)] dark:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 text-center text-xs font-medium text-[var(--terra-muted)] dark:text-gray-400 uppercase tracking-wider py-1">
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
                      className={`h-12 rounded-lg p-1 flex flex-col justify-between relative cursor-pointer transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected ? 'ring-2 ring-[var(--terra-focus)] z-10' : ''
                      } ${
                        isToday 
                          ? 'bg-[var(--terra-primary-soft)] border border-[var(--terra-primary-text)]' 
                          : 'bg-white dark:bg-[var(--terra-soft)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${
                          isToday ? 'font-black text-[var(--terra-primary)] dark:text-green-400' : isWeekend ? 'font-semibold text-[var(--terra-offline-text)]' : 'font-bold text-[var(--terra-ink)] dark:text-white'
                        }`}>
                          {dayNum}
                        </span>
                        {stat.hasMandatory && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C4A66A] shrink-0" title="Обязательный платёж" />
                        )}
                      </div>

                      <span className={`text-[9px] font-bold rounded px-0.5 text-center leading-tight truncate ${
                        stat.net < 0
                          ? 'text-[var(--terra-danger-text)] bg-[var(--terra-danger-soft)]'
                          : stat.net > 0
                          ? 'text-[var(--terra-primary-text)] bg-[var(--terra-primary-soft)]'
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
                      className={`h-14 rounded-lg p-1.5 flex flex-col justify-between relative cursor-pointer transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected ? 'ring-2 ring-[var(--terra-focus)] z-10' : ''
                      } ${
                        !inMonth ? 'bg-[#EAE6DE]/30 dark:bg-white/5 opacity-40' :
                        isToday ? 'bg-[var(--terra-primary-soft)] border border-[var(--terra-primary-text)]' : 'bg-white dark:bg-[var(--terra-soft)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${
                          isToday ? 'font-black text-[var(--terra-primary)] dark:text-green-400' : isWeekend ? 'font-semibold text-[var(--terra-offline-text)]' : 'font-bold text-[var(--terra-ink)] dark:text-white'
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
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1.5 text-xs text-[var(--terra-muted)] dark:text-gray-400">
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
                  className="min-h-[44px] px-3 rounded-xl bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
                  Добавить
                </button>}
              </div>
            </div>

            <div className="divide-y divide-[var(--terra-border)]">
              {displayMandatoryExpenses.length === 0 && (
                <p className="rounded-xl border border-[var(--terra-border)] dark:border-white/10 px-3 py-4 text-sm text-[var(--terra-muted)] dark:text-gray-400">Обязательных платежей пока нет.</p>
              )}
              {displayMandatoryExpenses.map(exp => {
                const title = exp.name || (exp as any).title || 'Обязательный платёж';
                const dayNum = exp.day ?? (exp as any).dayOfMonth ?? 1;
                const paymentState = monthlyPaymentStates.find(state => state.id === exp.id);
                const isPaid = paymentState?.isPaid ?? false;

                return (
                  <div 
                    key={exp.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-1 py-2.5"
                  >
                    <button type="button" onClick={() => onEditMandatoryExpense?.(exp)} aria-label={`Редактировать обязательный платёж: ${title}`}
                      className="min-h-[44px] flex min-w-0 flex-1 items-center gap-3 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
                      <div className="w-8 h-8 rounded-lg bg-[#C4A66A]/20 text-[#705C30] dark:text-[#C4A66A] flex items-center justify-center shrink-0">
                        {getMandatoryIcon(title)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[var(--terra-ink)] dark:text-white break-words">{title}</span>
                        <span className="text-xs text-[var(--terra-muted)] dark:text-gray-400">До {dayNum}-го числа</span>
                      </div>
                    </button>
                    <div className="flex min-w-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums [overflow-wrap:anywhere] text-[var(--terra-ink)] dark:text-white">
                        {settings.privacyMode ? '•••' : `${formatBudgetMoney(exp.amount)} ₽`}
                      </span>
                      {!isPaid && paymentState && paymentState.paidAmount > 0 && (
                        <span className="text-xs text-[var(--terra-muted)] dark:text-gray-400">
                          {settings.privacyMode ? 'Частичная оплата' : `Осталось ${formatBudgetMoney(paymentState.amountNeeded)} ₽`}
                        </span>
                      )}
                      {isPaid && !paymentState?.isManuallyPaid ? (
                        <span className="text-xs font-bold text-[var(--terra-primary)] dark:text-green-400 flex items-center gap-1">
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
          <section className={`${SURFACE_CARD} flex flex-col min-w-0 gap-3`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-headline font-bold text-[var(--terra-ink)] dark:text-white">Категории расходов</span>
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
                  role={cat.id!=='uncategorized'&&onSelectCategory?'button':undefined}
                  tabIndex={cat.id!=='uncategorized'&&onSelectCategory?0:undefined}
                  aria-label={cat.id!=='uncategorized'&&onSelectCategory?`Аналитика категории: ${cat.label || (cat as any).name || 'Категория'}`:undefined}
                  onKeyDown={e=>{if(cat.id!=='uncategorized'&&onSelectCategory&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onSelectCategory(cat.id);}}}
                  onClick={cat.id === 'uncategorized' ? undefined : () => onSelectCategory?.(cat.id)}
                  className={`flex flex-col gap-1 min-h-[44px] px-1 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] ${cat.id === 'uncategorized' ? '' : 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer'}`}
                  title={cat.id === 'uncategorized' ? 'Расходы без назначенной категории' : `Аналитика категории «${cat.label || (cat as any).name || ''}»`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-[var(--terra-ink)] dark:text-white truncate">
                      {idx + 1}. {cat.label || (cat as any).name || 'Категория'}
                    </span>
                    <div className="flex items-center gap-1.5 font-bold tabular-nums">
                      <span className="text-[var(--terra-ink)] dark:text-white">
                        {settings.privacyMode ? '•••' : `${formatBudgetMoney(cat.sum)} ₽`}
                      </span>
                      <span className="text-[var(--terra-muted)] dark:text-gray-400 text-[11px] font-normal">
                        {!settings.privacyMode&&`(${cat.percent}%)`}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${settings.privacyMode?0:Math.min(100, cat.percent)}%`, backgroundColor: cat.color || '#4A7C59' }}
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
                className="min-h-[44px] py-2.5 px-2 rounded-xl bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] text-[var(--terra-primary)] dark:text-green-400 hover:bg-[#E2DDD3] dark:hover:bg-[var(--terra-soft)] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Открыть аналитику всех категорий"
              >
                <PieChart size={14} />
                <span>Аналитика трат</span>
              </button>

              <button 
                type="button"
                onClick={() => onOpenCategoriesModal ? onOpenCategoriesModal() : setIsCatModalOpen(true)}
                className="min-h-[44px] py-2.5 px-2 rounded-xl bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] hover:bg-[var(--terra-primary-hover)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Создать новую категорию или настроить"
              >
                <Plus size={15} />
                <span>Категория</span>
              </button>
            </div>
          </section>
          <div id="budget-limits-mobile" tabIndex={-1}><BudgetPlanningPanel settings={settings} categories={categories}
            transactions={transactions} monthTransactions={familyMonthTransactions}
            currentMonth={currentMonth} isCurrentMonth={isCurrentMonthView}
            totalBalance={ledger} reservedAmount={reservedAmount} daysToSalary={remainingDays}/></div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP VIEW (Visible on md and up)                       */}
      {/* ========================================================= */}
      <div className="terra-budget-layout hidden md:flex flex-col min-w-0 min-h-0 flex-1 overflow-y-auto no-scrollbar w-full max-w-[1600px] mx-auto p-6 lg:p-8 pb-8 gap-5 text-[var(--terra-ink)]">
        {/* 1. TOP HEADER: Title, Month, Family Filters, Actions */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border/70 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <h1 className="text-2xl lg:text-3xl font-headline font-bold text-graphite dark:text-white tracking-tight">
            Бюджет
          </h1>

          {/* Month Selector */}
          <div className="flex items-center bg-white dark:bg-[var(--terra-surface)] border border-surface-border dark:border-white/10 rounded-xl px-2.5 py-1.5 gap-2">
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
                <span>Все</span>
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
                    <span className="max-w-[12rem] truncate" title={m.name}>{m.name}</span>
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
            className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 text-sm font-semibold text-graphite dark:text-white bg-white dark:bg-[var(--terra-surface)] hover:bg-[#F3EFE7] dark:hover:bg-[var(--terra-soft)] border border-surface-border dark:border-white/10 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            type="button"
            title="Открыть список всех операций за текущий месяц"
          >
            <List size={15} className="text-[var(--terra-primary)]" />
            <span>Все операции ({monthTransactions.length})</span>
          </button>

          {onImportClick && (
            <button 
              onClick={onImportClick}
              className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 text-sm font-semibold text-graphite dark:text-white bg-white dark:bg-[var(--terra-surface)] hover:bg-[#F3EFE7] dark:hover:bg-[var(--terra-soft)] border border-surface-border dark:border-white/10 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center">
              <span className="text-sm font-semibold text-primary-dark dark:text-green-400">
                {personalOnly?'Личный ориентир в день':'Семейный ориентир в день'}
              </span>
            </div>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-primary-light text-primary dark:bg-green-950/40 dark:text-green-400 border border-primary-border/60">
              {isCurrentMonthView ? `${remainingDays} дн. до зарплаты` : 'Архив'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span data-testid="family-daily-limit-desktop" className="text-2xl lg:text-3xl font-semibold font-headline text-primary-dark dark:text-green-400 tracking-tight tabular-nums [overflow-wrap:anywhere] min-w-0">
                {!isCurrentMonthView||!personalOpeningKnown?'—':settings.privacyMode ? '•••' : `${formatBudgetMoney(safeDailyLimit)} ₽`}
              </span>
              <span className="text-xs font-semibold text-graphite-muted dark:text-gray-400">/ день</span>
            </div>
            {isCurrentMonthView&&personalOpeningKnown&&<p className="text-xs text-[var(--terra-muted)] mt-0.5">
              Доступно до зарплаты: {settings.privacyMode ? '•••' : `${formatBudgetMoney(availableBalance)} ₽`}
            </p>}
          </div>

          {(!isCurrentMonthView || !personalOpeningKnown || safeDailyLimit <= 0) && (
            <p className="text-xs text-graphite-muted dark:text-gray-400">
              {!isCurrentMonthView ? 'Лимит не рассчитывается' : !personalOpeningKnown ? 'Укажите личный начальный остаток' : 'Нет доступного остатка'}
            </p>
          )}
        </div>

        {/* Current-day metrics do not apply to historical months. */}
        {isCurrentMonthView ? (
        <div className={`${SURFACE_CARD} flex min-w-0 flex-col justify-between gap-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-graphite-muted dark:text-gray-400">
              {personalOnly?'Личные траты':'Траты семьи'} сегодня ({currentDayNum} {currentMonth.toLocaleDateString('ru-RU', { month: 'short' })})
            </span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
              settings.privacyMode ? 'bg-[var(--terra-soft)] text-[var(--terra-muted)]' : todayReserve >= 0 
                ? 'bg-emerald-50 text-emerald-800 dark:bg-green-950/40 dark:text-green-400 border border-emerald-200 dark:border-green-800/40' 
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200'
            }`}>
              {settings.privacyMode ? 'Суммы скрыты' : safeDailyLimit <= 0 ? 'Ориентир не задан' : todayReserve >= 0 ? 'Ниже ориентира' : 'Выше ориентира'}
            </span>
          </div>

          <div className="my-2 space-y-1.5">
            <div className="flex flex-wrap justify-between items-baseline gap-2">
              <div className="text-lg font-bold font-headline text-graphite dark:text-white">
                {settings.privacyMode ? '•••' : `${formatBudgetMoney(todaySpent)} ₽`}
              </div>
              <div className={`text-xs font-bold ${todayReserve >= 0 ? 'text-primary dark:text-green-400' : 'text-red-500'}`}>
                {safeDailyLimit <= 0 || settings.privacyMode ? '' : todayReserve >= 0 ? `До ориентира: ${formatBudgetMoney(todayReserve)} ₽` : `Выше ориентира на ${formatBudgetMoney(Math.abs(todayReserve))} ₽`}
              </div>
            </div>

            <div className="w-full bg-[var(--terra-soft)] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${todayReserve >= 0 ? 'bg-primary' : 'bg-red-500'}`}
                style={{ width: `${!settings.privacyMode && safeDailyLimit > 0 ? Math.min(100, (todaySpent / safeDailyLimit) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="pt-1.5 border-t border-surface-border/70 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-graphite-muted dark:text-gray-400">
            <span>{personalOnly?'Вчера (личные)':'Вчера (семья)'}: {settings.privacyMode?'•••':formatBudgetMoney(yesterdaySpent)+' ₽'}</span>
            <span className="text-emerald-700 dark:text-green-400 font-semibold">
              {!settings.privacyMode && yesterdaySpent < safeDailyLimit ? `Ниже ориентира на ${formatBudgetMoney(safeDailyLimit - yesterdaySpent)} ₽` : ''}
            </span>
          </div>
        </div>
        ) : (
          <div className={`${SURFACE_CARD} flex min-w-0 flex-col justify-between gap-3`}>
            <span className="text-sm font-semibold text-graphite-muted dark:text-gray-400">Расходы выбранного месяца</span>
            <span className="text-2xl font-bold text-graphite dark:text-white tabular-nums">{settings.privacyMode ? '•••' : `${formatBudgetMoney(monthExpense)} ₽`}</span>
            <p className="text-xs text-graphite-muted dark:text-gray-400">Показатели «сегодня» и «вчера» доступны в текущем месяце</p>
          </div>
        )}

                {/* Card 3: Итоги месяца */}
        <div className={`${SURFACE_CARD} flex min-w-0 flex-col justify-between gap-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-graphite-muted dark:text-gray-400">
              Месячный прогресс бюджета
            </span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-[var(--terra-soft)] dark:bg-white/5 text-graphite dark:text-white">
              {currentDayNum} из {totalDaysInMonth} дней
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 py-1 my-1">
            <div className="text-center px-1">
              <span className="text-xs font-medium text-graphite-muted dark:text-gray-400 block">Доходы</span>
              <span className="text-xs lg:text-sm font-semibold font-headline text-primary dark:text-green-400 tabular-nums [overflow-wrap:anywhere] block">
                {settings.privacyMode ? '•••' : `${formatBudgetMoney(monthIncome)} ₽`}
              </span>
            </div>

            <div className="text-center px-1 border-y lg:border-y-0 lg:border-x border-surface-border/70 dark:border-white/5">
              <span className="text-xs font-medium text-graphite-muted dark:text-gray-400 block">Расходы</span>
              <span className="text-xs lg:text-sm font-semibold font-headline text-[#D95C48] dark:text-red-400 tabular-nums [overflow-wrap:anywhere] block">
                {settings.privacyMode ? '•••' : `${formatBudgetMoney(monthExpense)} ₽`}
              </span>
            </div>

            <div className="text-center px-1">
              <span className="text-xs font-medium text-graphite-muted dark:text-gray-400 block">Результат месяца</span>
              <span className="text-xs lg:text-sm font-semibold font-headline text-emerald-700 dark:text-green-400 tabular-nums [overflow-wrap:anywhere] block">
                {settings.privacyMode ? '•••' : `${monthBalance > 0 ? '+' : ''}${formatBudgetMoney(monthBalance)} ₽`}
              </span>
              <span className="text-xs text-graphite-muted dark:text-gray-400 block">Доходы − расходы</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-surface-border/70 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-graphite-muted dark:text-gray-400">Расходы к доходам:</span>
            <span className="font-bold text-graphite dark:text-white">
              {settings.privacyMode ? "•••" : monthIncome > 0 ? `${Math.round((monthExpense / monthIncome) * 100)}%` : '—'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. MAIN WORKSPACE: 7-col Interactive Calendar + 5-col Analytics Sidebar */}
      <div className="terra-budget-columns grid gap-5">
        {/* LEFT / CENTER: Full Calendar & Selected Day Detail (7 cols) */}
        <div className="min-w-0 flex flex-col gap-4">
          {/* 3. Family Operations Feed: explicit day/month scope, never a silent fallback. */}
          <section className={`${SURFACE_CARD} min-w-0 flex flex-col gap-3`}
            aria-label="История операций бюджета" data-testid="budget-history-desktop">
            <BudgetHistoryControls historyScope={historyScope} setHistoryScope={setHistoryScope}
              historyType={historyType} setHistoryType={setHistoryType} historySearch={historySearch} setHistorySearch={setHistorySearch}
              historyCategory={historyCategory} setHistoryCategory={setHistoryCategory} categoryOptions={historyCategoryOptions}
              selectedDay={selectedDay} count={visibleHistory.length} total={historyScope==='day'?selectedDayTransactions.length:monthTransactions.length}/>
            <div className="divide-y divide-[var(--terra-border)] terra-desktop-history-list">
              {visibleHistory.length===0 && (
                <p className="rounded-xl border border-dashed border-surface-border p-4 text-xs text-graphite-muted dark:text-gray-400">
                  {historyEmptyText}
                </p>
              )}
              {visibleHistory.map(tx => {
                const member=members.find(m=>m.id===tx.memberId);
                const category=categories.find(cat=>cat.id===tx.category);
                const title=tx.note || tx.payee || category?.label || 'Операция';
                return (
                  <button type="button" key={tx.id} data-history-row={tx.id} data-history-category={tx.category} data-history-type={tx.type} onClick={() => onEditTransaction(tx)}
                    aria-label={`Редактировать операцию: ${title}`}
                    className="min-h-[48px] w-full flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 text-left hover:border-surface-border hover:bg-[var(--terra-surface)] dark:hover:bg-[var(--terra-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-graphite dark:text-white break-words">{title}</span>
                      <span className="block text-[11px] text-graphite-muted dark:text-gray-400">
                        {member?.name || 'Семья'} · {category?.label || 'Неизвестная категория'} · {new Date(tx.date).toLocaleDateString('ru-RU', {day:'numeric',month:'short'})}
                      </span>
                    </span>
                    <span className={`shrink-0 min-w-0 max-w-[46%] text-right text-sm font-semibold tabular-nums [overflow-wrap:anywhere] ${tx.type==='income' ? 'text-primary dark:text-green-400' : 'text-graphite dark:text-white'}`}>
                      {settings.privacyMode ? '•••' : `${tx.type==='income' ? '+' : '-'}${formatBudgetMoney(tx.amount)} ₽`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          {/* Full Interactive Calendar Card */}
          <div data-testid="budget-calendar-desktop" className={`${SURFACE_CARD} min-w-0`}>
            {/* Calendar Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-surface-border/70 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-light text-primary dark:bg-green-950/40 dark:text-green-400 flex items-center justify-center font-bold">
                  <PieChart size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold font-headline text-graphite dark:text-white">
                    Календарь
                  </h3>
                  <p className="text-[11px] text-graphite-muted dark:text-gray-400">
                    {monthTitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-graphite-muted dark:text-gray-400">
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
                    aria-current={isCurrentToday ? "date" : undefined}
                    title={settings.privacyMode ? undefined : `Доходы: ${formatBudgetMoney(dayIncome)} ₽, расходы: ${formatBudgetMoney(dayExpense)} ₽, итог: ${formatBudgetMoney(dayNet)} ₽`}
                    onKeyDown={(e) => { if (e.key==='Enter'||e.key===' ') {e.preventDefault();setSelectedDay(dayNum);} }}
                    className={`h-14 sm:h-16 p-1 sm:p-1.5 rounded-xl border transition-colors flex flex-col justify-between cursor-pointer select-none relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${dayBgClass} ${dayBorderClass}`}
                  >
                    <div className="flex justify-between items-start min-w-0">
                      <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                        <span className={`text-[10px] sm:text-xs ${isSelected ? 'font-black text-primary-dark dark:text-green-400' : 'font-bold text-graphite dark:text-white'}`}>
                          {dayNum}
                        </span>

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
                        <div className="hidden sm:block bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)] font-headline text-xs tabular-nums font-extrabold px-1 py-0.5 rounded border border-primary/30 truncate text-right">
                          {settings.privacyMode ? '•••' : `+${formatDayAmount(dayNet)} ₽`}
                        </div>
                      ) : dayNet < 0 ? (
                        <div className="hidden sm:block bg-[var(--terra-danger-soft)] text-[var(--terra-danger-text)] font-headline text-xs tabular-nums font-bold px-1 py-0.5 rounded border border-red-200 dark:border-red-900/30 truncate text-right">
                          {settings.privacyMode ? '•••' : `-${formatDayAmount(dayNet)} ₽`}
                        </div>
                      ) : (
                        <div className="hidden sm:block bg-[var(--terra-soft)] text-[var(--terra-muted)] font-headline text-xs tabular-nums font-semibold px-1 py-0.5 rounded border border-surface-border/60 dark:border-white/10 truncate text-right">
                          {settings.privacyMode ? '•••' : '0 ₽'}
                        </div>
                      )
                    ) : paidMandatory ? (
                      <div className="hidden sm:block bg-[var(--terra-offline-soft)] text-[var(--terra-offline-text)] font-headline text-xs tabular-nums font-bold px-1 py-0.5 rounded border border-amber-200 truncate text-right">
                        {settings.privacyMode ? '•••' : `${formatDayAmount(paidMandatory.amount)} ₽`}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Detail Box + Quick Add Form (выровнен по нижнему краю с правой колонкой) */}
          <div className={`${SURFACE_CARD} min-w-0 flex-1 flex flex-col justify-between`}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-border/70 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center font-headline shadow-xs">
                  {selectedDay}
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-graphite dark:text-white capitalize">
                    {activeSelectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h4>
                  <p className="text-[11px] text-graphite-muted dark:text-gray-400">
                    Операций: {selectedDayTransactions.length}
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
                  Операции за день
                </button>
              </div>
            </div>

            {/* List of day's operations */}
            <div className="py-3 divide-y divide-[var(--terra-border)] flex-1">
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
                      className="min-h-[48px] w-full text-left flex items-center justify-between gap-2 px-1 py-2.5 hover:bg-[var(--terra-soft)] transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="shrink-0">
                          <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-sm font-semibold text-graphite dark:text-white group-hover:text-primary transition-colors break-words">
                              {displayTitle}
                            </h5>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-graphite-muted dark:text-gray-400">
                            {member && (
                              <span className="font-medium" style={{ color: member.color }}>
                                {member.name}
                              </span>
                            )}
                            {category && <span>({category.label})</span>}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 max-w-[46%] shrink-0">
                        <div className="text-right">
                          <div className={`text-sm font-semibold tabular-nums [overflow-wrap:anywhere] ${
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
              <div className="text-sm font-semibold text-graphite-muted dark:text-gray-400 mb-2">
                Добавить расход за {selectedDay} {currentMonth.toLocaleDateString('ru-RU', { month: 'short' })}:
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
              <div className="flex flex-wrap gap-2">
                <input 
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
                  aria-label="Название быстрой операции"
                  className="min-h-[44px] w-full lg:flex-1 lg:w-auto bg-white dark:bg-[var(--terra-soft)] border border-surface-border dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-graphite dark:text-white placeholder-graphite-muted dark:placeholder-white/40 focus:ring-1 focus:ring-primary focus:border-primary" 
                  placeholder="Название расхода" 
                  type="text"
                />
                <input 
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
                  aria-label="Сумма быстрой операции"
                  inputMode="decimal"
                  className="min-h-[44px] w-full lg:w-28 bg-white dark:bg-[var(--terra-soft)] border border-surface-border dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-graphite dark:text-white font-semibold placeholder-graphite-muted dark:placeholder-white/40 focus:ring-1 focus:ring-primary focus:border-primary" 
                  placeholder="Сумма ₽" 
                  type="text"
                />
                <button 
                  onClick={handleQuickAdd}
                  disabled={isQuickSaving}
                  className={`min-h-[44px] w-full sm:w-auto px-4 py-1.5 text-xs font-bold text-white rounded-xl whitespace-nowrap cursor-pointer transition-colors ${
                    quickAddedSuccess ? 'bg-emerald-700' : 'bg-primary hover:bg-primary-dark'
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
        <div className="min-w-0 flex flex-col gap-4">
          {/* 1. Category Breakdown Card */}
          <div className={`${SURFACE_CARD} min-w-0`}>
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-surface-border/70 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <PieChart size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold font-headline text-graphite dark:text-white">
                    Категории расходов
                  </h3>
                  <p className="text-xs text-graphite-muted dark:text-gray-400">
                    {settings.privacyMode ? '•••' : `${formatBudgetMoney(monthExpense)} ₽ израсходовано`}
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
                      className="min-h-[44px] w-full text-left space-y-1.5 px-1 py-2 rounded-xl hover:bg-[var(--terra-surface)] dark:hover:bg-[var(--terra-soft)] transition cursor-pointer group"
                      title={`Аналитика категории «${cat.label}»`}
                    >
                      <div className="flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-bold text-graphite dark:text-white group-hover:text-primary dark:group-hover:text-green-400 transition-colors flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          {cat.label}
                        </span>
                        <span className="text-[11px] text-graphite-muted dark:text-gray-400 font-semibold tabular-nums">
                          {settings.privacyMode ? '•••' : `${formatBudgetMoney(cat.sum)} ₽`} 
                          <span className="text-primary dark:text-green-400 font-bold ml-1">{!settings.privacyMode&&`(${roundedPct}%)`}</span>
                        </span>
                      </div>
                      <div className="w-full bg-[var(--terra-soft)] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                          style={{ width: `${settings.privacyMode?0:pct}%`, backgroundColor: cat.color }}
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
                className="min-h-[44px] py-1.5 px-3 bg-[var(--terra-surface)] dark:bg-[var(--terra-soft)] hover:bg-primary-light/50 dark:hover:bg-white/5 border border-surface-border dark:border-white/5 rounded-xl text-xs font-bold text-primary dark:text-green-400 flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer group"
                type="button"
                title="Подробный отчет и динамика по всем категориям"
              >
                <PieChart size={14} />
                <span>Аналитика трат</span>
              </button>

              <button 
                onClick={() => setIsCatModalOpen(true)}
                className="min-h-[44px] py-1.5 px-3 bg-[#4A7C59] hover:bg-[#3D684A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer group"
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
          <div className={`${SURFACE_CARD} min-w-0`}>
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-surface-border/70 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-accent-gold/20 text-[#C4A66A] flex items-center justify-center font-bold">
                  <DollarSign size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold font-headline text-graphite dark:text-white">
                    Обязательные платежи
                  </h3>
                  <p className="text-xs text-graphite-muted dark:text-gray-400">
                    {mandatoryExpenses.length} счетов к контролю
                  </p>
                </div>
              </div>

              {onAddMandatoryExpense && <button type="button" onClick={onAddMandatoryExpense}
                aria-label="Добавить обязательный платёж"
                className="min-h-[44px] px-3 rounded-xl bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
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
                      className="flex flex-wrap items-center justify-between gap-2 px-1 py-2.5 group"
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
                          <span className="text-xs text-graphite-muted dark:text-gray-400">
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
