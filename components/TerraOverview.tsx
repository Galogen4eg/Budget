import React, { useState, useMemo, useCallback } from 'react';
import { 
  AlertTriangle, TrendingUp, TrendingDown, ArrowDownRight, Lock, 
  Plus, Sparkles, Users, User, Settings, Eye, EyeOff, 
  Check, ChevronRight, ChevronLeft, ArrowRight,
  HelpCircle, ShieldAlert, ChevronDown, ShoppingCart,
  Star, Smartphone, Utensils, Store, Tag, Gift, Activity, Car, CreditCard
} from 'lucide-react';
import { Transaction, AppSettings, Category, FamilyMember, ShoppingItem, MandatoryExpense, FamilyEvent } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import useQuickShopping from '../hooks/useQuickShopping';
import QuickShoppingWidget from './QuickShoppingWidget';
import ReserveDetailsModal from './ReserveDetailsModal';
import CategoriesModal from './CategoriesModal';
import DayDetailModal from './DayDetailModal';
import BrandIcon from './BrandIcon';
import TerraMobileHeader from './TerraMobileHeader';
import { FILTER_CHIP_ACTIVE, SURFACE_CARD, SECTION_HEADING, DASHBOARD_CARD, TOOLBAR_ACTION, TOOLBAR_ACTION_IDLE, ICON_ACTION } from './filterUiTokens';
import { OverviewHeaderBar } from './overview/OverviewHeaderBar';
import { OverviewMetricsCards } from './overview/OverviewMetricsCards';
import { OverviewExpenseChart } from './overview/OverviewExpenseChart';
import { OverviewCategoriesModal } from './overview/OverviewCategoriesModal';
import { OverviewRecentTransactions } from './overview/OverviewRecentTransactions';
import { getMerchantBrandKey } from '../utils/categorizer';
import { shiftCalendarMonth } from '../utils/calendarMonthNavigation';
import { getIconById } from '../constants';
import { fixPrepositions } from '../utils/typography';
import { budgetDailyLimit, sumMoney, daysUntilNextSalary, formatBudgetMoney, cents, money } from '../utils/budgetFinancialMath';
import { buildBudgetCategoryBreakdown } from '../utils/budgetCategoryBreakdown';
import { calculateFamilyBudgetProjection } from '../utils/familyBudgetProjection';
import { toast } from 'sonner';

interface TerraOverviewProps {
  onOpenAddModal: () => void;
  onOpenAIChat: () => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onNavigateTab: (tabId: string) => void;
  onDrillDown: (categoryId: string) => void;
  onEditMandatoryExpense?: (expense: MandatoryExpense) => void;
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;
  onOpenAddEventModal?: () => void;
  onEditEvent?: (event: FamilyEvent) => void;
}

const OVERVIEW_CATEGORY_PREVIEW_LIMIT = 6;

const TerraOverview: React.FC<TerraOverviewProps> = ({
  onOpenAddModal,
  onOpenAIChat,
  onOpenSettings,
  onOpenNotifications,
  onEditTransaction,
  onNavigateTab,
  onDrillDown,
  onEditMandatoryExpense,
  currentMonth,
  onMonthChange,
  onOpenAddEventModal,
  onEditEvent
}) => {
  const { 
    transactions:allTransactions,
    displayTransactions:transactions,
    setTransactions,
    filteredTransactions, 
    currentMonthSpent, 
    displayGoals:goals,
    financialSettings, displaySettings:settings, householdPersonal, personalDisplayOnly, personalOpeningKnown,
    updateSettings, updateMandatoryPaymentBundle, 
    members, 
    categories, 
    shoppingItems, 
    setShoppingItems, 
    events,
    budgetMode, 
    setBudgetMode, 
    savingsRate 
  } = useData();
  
  const { user: firebaseUser, familyId } = useAuth();
  const personalOnly=householdPersonal||personalDisplayOnly;
  const showShopping=settings.widgets?.find(w=>w.id==='shopping')?.isVisible!==false;
  const showWeekEvents=settings.widgets?.find(w=>w.id==='week_events')?.isVisible!==false;

  const [chartScale, setChartScale] = useState<'day' | 'week' | 'month'>('day');
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [allCategoriesOpen,setAllCategoriesOpen]=useState(false);
  const [selectedCatModalId, setSelectedCatModalId] = useState<string | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [selectedDayDetailDate, setSelectedDayDetailDate] = useState<Date | null>(null);

  // Synchronized or internal month state
  const [internalMonth, setInternalMonth] = useState<Date>(() => new Date());
  const activeMonth = currentMonth || internalMonth;
  const handleMonthChange = useCallback((d: Date) => {
    if (onMonthChange) {
      onMonthChange(d);
    } else {
      setInternalMonth(d);
    }
  }, [onMonthChange]);

  const handleStepMonth = useCallback((step: number) => {
    handleMonthChange(shiftCalendarMonth(activeMonth, step));
  }, [activeMonth, handleMonthChange]);

  const realToday = new Date();
  const now = realToday;
  const isCurrentCalendarMonth = 
    activeMonth.getMonth() === realToday.getMonth() && 
    activeMonth.getFullYear() === realToday.getFullYear();
  
  const currentDay = isCurrentCalendarMonth 
    ? realToday.getDate() 
    : (activeMonth < realToday ? new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0).getDate() : 0);
  
  const currentMonthKey = `${activeMonth.getFullYear()}-${String(activeMonth.getMonth() + 1).padStart(2, '0')}`;
  
  // Russian Month Label (e.g. "Май 2025")
  const currentMonthName = useMemo(() => {
    const raw = activeMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' }).replace(/\s*г\.?/gi, '');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [activeMonth]);

  // Russian Month Prepositional (e.g. "мае", "сентябре")
  const currentMonthNamePrepositional = useMemo(() => {
    const prepositionalMonths = [
      'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
      'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'
    ];
    return prepositionalMonths[activeMonth.getMonth()] || activeMonth.toLocaleString('ru-RU', { month: 'long' });
  }, [activeMonth]);

  // Options list for month picker dropdown
  const monthOptions = useMemo(() => {
    const list: { key: string; label: string; date: Date }[] = [];
    const base = new Date();
    for (let offset = -5; offset <= 1; offset++) {
      const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
      const label = d.toLocaleString('ru-RU', { month: 'long', year: 'numeric' }).replace(/\s*г\.?/gi, '');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      list.push({ key, label, date: d });
    }
    return list.reverse();
  }, []);

  // Current Member Identification
  const currentMember = useMemo(() => {
    // Never present another family member as the current user.
    return members.find(m => m.userId && m.userId === firebaseUser?.uid)
      || { id: 'unlinked', name: 'Профиль не привязан', color: '#4A7C59' };
  }, [members, firebaseUser]);

  // Quick Shopping Management (Managed via Custom Hook)
  const {
    newShoppingTitle,
    setNewShoppingTitle,
    isAddingShopping,
    liveParsedShopping,
    handleToggleShopping,
    handleAddShoppingInline,
  } = useQuickShopping({
    shoppingItems,
    setShoppingItems,
    familyId,
    // Empty means no linked profile; never attribute a purchase to another member.
    currentMemberId: members.find(m => m.userId && m.userId === firebaseUser?.uid)?.id || '',
  });

  const memberInitial = (currentMember.name || 'П').charAt(0).toUpperCase();

  // Salary dates and remaining days
  const salaryDates = settings.salaryDates && settings.salaryDates.length > 0 
    ? settings.salaryDates 
    : [settings.startOfMonthDay || 1];

  const daysRemaining = isCurrentCalendarMonth
    ? daysUntilNextSalary(realToday, salaryDates) : 0;

  // Transactions this month
  const currentMonthTransactions = useMemo(() => {
    return filteredTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === activeMonth.getMonth() && d.getFullYear() === activeMonth.getFullYear();
    });
  }, [filteredTransactions, activeMonth]);

  // Family commitments and spendable cash are shared even when personal
  // history is selected. Never apply the family's opening balance to one member.
  const familyMonthTransactions = useMemo(() => transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === activeMonth.getMonth() && d.getFullYear() === activeMonth.getFullYear();
  }), [transactions, activeMonth]);

  const displayMonthSpent = useMemo(() => {
    return sumMoney(currentMonthTransactions.filter(t=>t.type==='expense').map(t=>t.amount));
  }, [currentMonthTransactions]);

  const displayMonthIncome = useMemo(() => sumMoney(currentMonthTransactions.filter(t=>t.type==='income').map(t=>t.amount)),[currentMonthTransactions]);

  // Always use the same shared projection as the Budget section.
  const relevantMandatoryExpenses = useMemo(() => settings.mandatoryExpenses || [], [settings.mandatoryExpenses]);
  const familyProjection = useMemo(() => calculateFamilyBudgetProjection({
    transactions,
    monthTransactions: familyMonthTransactions,
    bills: relevantMandatoryExpenses,
    categories,
    manuallyPaidIds: settings.manualPaidExpenses?.[currentMonthKey] || [],
    initialBalance: settings.initialBalance,
    initialBalanceDate: settings.initialBalanceDate,
    enableSmartReserve: settings.enableSmartReserve,
    savingsRate: settings.savingsRate ?? savingsRate,
    manualReservedAmount: settings.manualReservedAmount,
    goalSavedAmounts: goals.map(goal => goal.currentAmount || 0),
    paymentContext:personalDisplayOnly?{bills:financialSettings.mandatoryExpenses,transactions:allTransactions.filter(tx=>tx.date.slice(0,7)===currentMonthKey),manuallyPaidIds:financialSettings.manualPaidExpenses?.[currentMonthKey]||[]}:undefined
  }), [personalDisplayOnly,financialSettings,allTransactions,transactions, familyMonthTransactions, relevantMandatoryExpenses, categories,
      settings.manualPaidExpenses, currentMonthKey, settings.initialBalance,
      settings.initialBalanceDate, settings.enableSmartReserve,
      settings.savingsRate, savingsRate, settings.manualReservedAmount, goals]);

  const paymentStates = familyProjection.monthlyPaymentStates;
  const unpaidMandatoryTotal = familyProjection.mandatoryReserve;
  const detailedMandatoryExpenses = useMemo(() => {
    const states = new Map(paymentStates.map(state => [state.id, state]));
    const day = isCurrentCalendarMonth ? now.getDate() : 0;
    return relevantMandatoryExpenses.map(expense => {
      const status = states.get(expense.id)!;
      return {
        expense,
        amountNeeded: status.amountNeeded,
        paidAmount: status.paidAmount,
        isPaid: status.isPaid,
        isManuallyPaid: status.isManuallyPaid,
        isOverdue: !status.isPaid && day > 0 && expense.day < day,
        subtitle: `Обязательный регулярный платёж (${expense.day} число)`
      };
    });
  }, [relevantMandatoryExpenses, paymentStates, isCurrentCalendarMonth, now]);

  const handleToggleMandatoryPaid = useCallback(async (expenseId: string, isPaid: boolean) => {
    const existing = financialSettings.manualPaidExpenses?.[currentMonthKey] || [];
    const updated = isPaid
      ? Array.from(new Set([...existing, expenseId]))
      : existing.filter(id => id !== expenseId);
    if (!isPaid) {
      const recorded = familyMonthTransactions.some(tx =>
        tx.type === 'expense' && tx.linkedExpenseId === expenseId
      );
      if (recorded || (personalDisplayOnly&&allTransactions.some(tx=>tx.type==='expense'&&tx.linkedExpenseId===expenseId&&tx.date.slice(0,7)===currentMonthKey))) {
        toast.info('Платёж связан с финансовой операцией. Измените или удалите её, чтобы снять оплату.');
        return false;
      }
    }
    const bill = relevantMandatoryExpenses.find(expense => expense.id === expenseId);
    const debtChanges = isCurrentCalendarMonth && bill?.linkedDebtId
      ? [{ id:bill.linkedDebtId, changes:{ paidThisMonth:isPaid } }]
      : [];
    try {
      await updateMandatoryPaymentBundle({
        mandatoryExpenses:financialSettings.mandatoryExpenses,
        manualPaidExpenses:{ [currentMonthKey]:updated }
      }, debtChanges);
    } catch {
      toast.error('Не удалось сохранить отметку платежа и связанный долг.');
      return false;
    }
    return true;
  }, [financialSettings.manualPaidExpenses, financialSettings.mandatoryExpenses, currentMonthKey, familyMonthTransactions,
      relevantMandatoryExpenses, isCurrentCalendarMonth, updateMandatoryPaymentBundle, personalDisplayOnly, allTransactions]);

  const handlePayMandatoryExpenses = useCallback(async (expenseIds: string[]) => {
    const existing = financialSettings.manualPaidExpenses?.[currentMonthKey] || [];
    const updated = Array.from(new Set([...existing,...expenseIds]));
    const ids = new Set(expenseIds);
    const debtIds = new Set(relevantMandatoryExpenses.filter(expense =>
      ids.has(expense.id) && isCurrentCalendarMonth && Boolean(expense.linkedDebtId)
    ).map(expense => expense.linkedDebtId!));
    const debtChanges = Array.from(debtIds).map(id => ({id, changes:{paidThisMonth:true}}));
    try {
      await updateMandatoryPaymentBundle({
        mandatoryExpenses:financialSettings.mandatoryExpenses,
        manualPaidExpenses:{ [currentMonthKey]:updated }
      }, debtChanges);
    } catch {
      toast.error('Не удалось записать оплату обязательств и связанных долгов.');
      return false;
    }
    return true;
  }, [financialSettings.manualPaidExpenses, financialSettings.mandatoryExpenses, currentMonthKey, relevantMandatoryExpenses,
      isCurrentCalendarMonth, updateMandatoryPaymentBundle]);

  const sharedLedger = familyProjection.ledger;
  const savingsAmount = familyProjection.savingsReserve;
  const manualReserved = familyProjection.manualReserve;
  const reservedAmount = familyProjection.reservedAmount;
  const availableBalance = familyProjection.availableBalance;
  const dailyLimit = personalOpeningKnown ? budgetDailyLimit(sharedLedger, reservedAmount, daysRemaining) : 0;

  // Today's spending
  const todayTransactions = useMemo(() => {
    const todayStr = realToday.toDateString();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.toDateString() === todayStr && t.type === 'expense';
    });
  }, [transactions, realToday]);

  const spentToday = useMemo(() => {
    return sumMoney(todayTransactions.map(t => t.amount));
  }, [todayTransactions]);

  const isOverDailyLimit = dailyLimit > 0 && spentToday > dailyLimit;
  const overLimitDelta = Math.max(0, spentToday - dailyLimit);
  const dailyUsagePercent = dailyLimit > 0 ? Math.min(100, Math.round((spentToday / dailyLimit) * 100)) : (spentToday > 0 ? 100 : 0);

  // Month-over-month trend comparison
  const lastMonthComparison = useMemo(() => {
    const prevMonthDate = new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1);
    const prevMonthExpenses = filteredTransactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && 
             d.getMonth() === prevMonthDate.getMonth() && 
             d.getFullYear() === prevMonthDate.getFullYear();
    }).reduce((sum, t) => sum + t.amount, 0);

    if (prevMonthExpenses <= 0) return { text: 'Нет данных', isPositive: null };
    const diff = ((displayMonthSpent - prevMonthExpenses) / prevMonthExpenses) * 100;
    const isPositive = diff <= 0; // Less spending is positive for savings
    const sign = diff >= 0 ? '+' : '';
    return {
      text: `${sign}${diff.toFixed(1)}%`,
      isPositive
    };
  }, [filteredTransactions, displayMonthSpent, activeMonth]);

  // A family budget target must not be reported as a personal spending target.
  const chartDailyLimit = budgetMode === 'family' || personalOnly ? dailyLimit : 0;

  // Chart data: dynamics by day, week, or month
  const dynamicsData = useMemo(() => {
    const year = activeMonth.getFullYear();
    const month = activeMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    if (chartScale === 'day') {
      const dailyExpensesMap: Record<number, number> = {};
      currentMonthTransactions.forEach(t => {
        if (t.type === 'expense') {
          const day = new Date(t.date).getDate();
          dailyExpensesMap[day] = sumMoney([dailyExpensesMap[day] || 0, t.amount]);
        }
      });

      const points: { label: string; fullLabel: string; dateObj: Date; amount: number; limit: number; isHigh: boolean; isCurrent: boolean }[] = [];
      let sum = 0;
      let max = 0;
      let compliantDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const amt = dailyExpensesMap[d] || 0;
        if (d <= currentDay) {
          sum += amt;
          if (amt > max) max = amt;
          if (chartDailyLimit <= 0 || amt <= chartDailyLimit) compliantDays++;
        }
        const fullDateStr = new Date(year, month, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        points.push({
          label: `${d}`,
          fullLabel: fullDateStr,
          dateObj: new Date(year, month, d),
          amount: d <= currentDay ? amt : 0,
          limit: chartDailyLimit,
          isHigh: chartDailyLimit > 0 && d <= currentDay ? amt > chartDailyLimit : false,
          isCurrent: isCurrentCalendarMonth && d === currentDay
        });
      }

      const avg = currentDay > 0 ? money(Math.round(cents(sum) / currentDay)) : 0;
      const complianceRate = currentDay > 0 ? Math.round((compliantDays / currentDay) * 100) : 100;

      return {
        points,
        avg,
        max,
        limit: chartDailyLimit,
        limitLabel: chartDailyLimit > 0 ? `Лимит ${chartDailyLimit.toLocaleString('ru-RU')} ₽` : '',
        subtitle: budgetMode === 'family' ? 'Семейные расходы и дневной ориентир' : personalOnly?'Личные расходы и дневной ориентир':'Личные расходы без семейного лимита',
        complianceRate,
        complianceText: chartDailyLimit > 0 ? `Лимит на день соблюдён в ${complianceRate}% дней` : budgetMode === 'personal' && !personalOnly ? 'Семейный лимит не применяется к личному графику' : 'Лимит на день не задан'
      };
    }

    if (chartScale === 'week') {
      // Find Monday of the reference week
      const refDate = isCurrentCalendarMonth ? realToday : new Date(year, month, 15);
      const currentDayOfWeek = refDate.getDay(); // 0 is Sun, 1 is Mon...
      const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
      const monday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - distanceToMonday);

      const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      const weekDays = dayNamesShort.map((dayName, idx) => {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
        return {
          dayName,
          date: d,
          dateString: d.toDateString(),
          dayNumber: d.getDate(),
          monthShort: d.toLocaleString('ru-RU', { month: 'short' }),
          isCurrent: d.toDateString() === realToday.toDateString(),
          isPassedOrToday: d.getTime() <= new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate(), 23, 59, 59).getTime()
        };
      });

      // Sum expenses for each day of this week
      const dailyExpensesMap: Record<string, number> = {};
      filteredTransactions.forEach(t => {
        if (t.type === 'expense') {
          const tDateString = new Date(t.date).toDateString();
          dailyExpensesMap[tDateString] = sumMoney([dailyExpensesMap[tDateString] || 0, t.amount]);
        }
      });

      let sum = 0;
      let max = 0;
      let passedDaysCount = 0;
      let compliantDays = 0;

      const points = weekDays.map((w) => {
        const amt = dailyExpensesMap[w.dateString] || 0;
        if (w.isPassedOrToday) {
          sum += amt;
          if (amt > max) max = amt;
          passedDaysCount++;
          if (chartDailyLimit <= 0 || amt <= chartDailyLimit) compliantDays++;
        }

        const fullDateStr = w.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        return {
          label: `${w.dayName} ${w.dayNumber}`,
          fullLabel: `${w.dayName}, ${fullDateStr}`,
          dateObj: w.date,
          amount: w.isPassedOrToday ? amt : 0,
          limit: chartDailyLimit,
          isHigh: chartDailyLimit > 0 && w.isPassedOrToday ? amt > chartDailyLimit : false,
          isCurrent: w.isCurrent
        };
      });

      const avg = passedDaysCount > 0 ? money(Math.round(cents(sum) / passedDaysCount)) : 0;
      const complianceRate = passedDaysCount > 0 ? Math.round((compliantDays / passedDaysCount) * 100) : 100;
      const weekStartLabel = `${weekDays[0].dayNumber} ${weekDays[0].monthShort}`;
      const weekEndLabel = `${weekDays[6].dayNumber} ${weekDays[6].monthShort}`;

      return {
        points,
        avg,
        max,
        limit: chartDailyLimit,
        limitLabel: chartDailyLimit > 0 ? `Лимит ${chartDailyLimit.toLocaleString('ru-RU')} ₽` : '',
        subtitle: `Расходы по дням недели (${weekStartLabel} – ${weekEndLabel})`,
        complianceRate,
        complianceText: chartDailyLimit > 0 ? `Дневной лимит соблюдён в ${complianceRate}% дней недели` : budgetMode === 'personal' && !personalOnly ? 'Семейный лимит не применяется к личному графику' : 'Лимит на день не задан'
      };
    }

    // chartScale === 'month'
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const monthlyExpensesMap: Record<number, number> = {};

    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        const d = new Date(t.date);
        if (d.getFullYear() === year) {
          const m = d.getMonth();
          monthlyExpensesMap[m] = sumMoney([monthlyExpensesMap[m] || 0, t.amount]);
        }
      }
    });

    const monthlyLimit = budgetMode === 'family' || personalOnly ? (settings.targetMonthlyBudget || (chartDailyLimit > 0 ? chartDailyLimit * 30 : 0)) : 0;
    let sum = 0;
    let max = 0;
    const currentM = activeMonth.getFullYear() === realToday.getFullYear() ? realToday.getMonth() : (activeMonth.getFullYear() < realToday.getFullYear() ? 11 : -1);
    let compliantMonths = 0;

    const points = monthNames.map((mName, idx) => {
      const amt = monthlyExpensesMap[idx] || 0;
      const isPassedOrCurrent = idx <= currentM;
      if (isPassedOrCurrent) {
        sum += amt;
        if (amt > max) max = amt;
        if (monthlyLimit <= 0 || amt <= monthlyLimit) compliantMonths++;
      }
      return {
        label: mName,
        fullLabel: `${mName} ${year}`,
        dateObj: new Date(year, idx, 1),
        amount: isPassedOrCurrent ? amt : 0,
        limit: monthlyLimit,
        isHigh: monthlyLimit > 0 && isPassedOrCurrent ? amt > monthlyLimit : false,
        isCurrent: activeMonth.getFullYear() === realToday.getFullYear() && idx === realToday.getMonth()
      };
    });

    const passedMonthsCount = currentM >= 0 ? currentM + 1 : 0;
    const avg = passedMonthsCount > 0 ? money(Math.round(cents(sum) / passedMonthsCount)) : 0;
    const complianceRate = passedMonthsCount > 0 ? Math.round((compliantMonths / passedMonthsCount) * 100) : 100;

    return {
      points,
      avg,
      max,
      limit: monthlyLimit,
      limitLabel: monthlyLimit > 0 ? `План ${monthlyLimit.toLocaleString('ru-RU')} ₽` : '',
      subtitle: `Расходы по месяцам ${year} года`,
      complianceRate,
      complianceText: monthlyLimit > 0 ? `Месячный бюджет выдержан в ${complianceRate}% месяцев` : budgetMode === 'personal' && !personalOnly ? 'Семейный план не применяется к личному графику' : 'Месячный лимит не задан'
    };
  }, [activeMonth, currentDay, currentMonthTransactions, filteredTransactions, chartDailyLimit, chartScale, settings.targetMonthlyBudget, budgetMode, personalOnly, realToday, isCurrentCalendarMonth]);

  // One common kopeck-accurate root-category allocation for Budget and Overview.
  const categoryBreakdown = useMemo(() => {
    const grouped = buildBudgetCategoryBreakdown(currentMonthTransactions, categories);
    const total = sumMoney(grouped.map(category => category.sum));
    const items = grouped.map(category => {
      const original = categories.find(item=>item.id===category.id);
      const color = category.color || '#4A7C59';
      return {
        id: category.id,
        name: category.label,
        amount: category.sum,
        percent: total > 0 ? Math.round((category.sum / total) * 100) : 0,
        color,
        icon: original?.icon,
        style: { color, barBg: color }
      };
    });
    return { total, items };
  }, [currentMonthTransactions, categories]);

  // Shopping Items (Active top 4)
  const activeShoppingItems = useMemo(() => {
    return shoppingItems.filter(i => !i.completed);
  }, [shoppingItems]);

  // Recent Transactions (top 4)
  const recentTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [filteredTransactions]);

  // Color scheme based on merchant / category for history
  const getTransactionBadge = (tx: Transaction, idx: number) => {
    const title = (tx.note || tx.rawNote || 'Операция').trim();
    const initial = title.charAt(0).toUpperCase() || 'О';
    const styles = [
      { bg: 'bg-[#FAECE7] text-[#B25E41] border-[#EBD2C9]', dot: 'bg-[#B25E41]' },
      { bg: 'bg-[#FCF2E3] text-[#C48C3B] border-[#F2DFC3]', dot: 'bg-[#C48C3B]' },
      { bg: 'bg-[#EDF3F5] text-[#50756C] border-[#D6E3E7]', dot: 'bg-[#50756C]' },
      { bg: 'bg-primary-light text-primary border-[#D2E4D7]', dot: 'bg-primary' },
    ];
    return {
      initial,
      ...styles[idx % styles.length]
    };
  };

  const formatAmount = (num: number) => {
    if (settings.privacyMode) return '••••••';
    return formatBudgetMoney(num);
  };

  const totalMonthlyLimit = budgetMode==='personal'&&!personalOnly?0:(settings.targetMonthlyBudget ?? (dailyLimit > 0 ? dailyLimit * 30 : 0));

  // Never substitute invented financial records for an empty account.
  const displayShoppingItems = activeShoppingItems;
  const recentMobileTransactions = recentTransactions.slice(0, 4);

  const mobileCategories = useMemo(() => {
    if (categoryBreakdown.items.length > 0 && categoryBreakdown.total > 0) {
      return categoryBreakdown.items.map((item) => {
        const cat = categories.find(c => c.id === item.id);
        const color = cat?.color || item.color || '#4A7C59';
        const iconName = cat?.icon || item.icon || 'ShoppingBasket';
        return {
          ...item,
          amount: item.amount,
          barColor: color,
          bg: `${color}1A`,
          color: color,
          icon: getIconById(iconName, 13)
        };
      });
    }

    return [];
  }, [categoryBreakdown, categories]);

  // Display only actual chart points: artificial fallback dates mislead the user.

  // Future / upcoming events for the rest of current week
  const upcomingWeekEvents = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + daysUntilSunday);
    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    return (events || [])
      .filter(e => {
        if (!e.date) return false;
        return e.date >= todayStr && e.date <= sundayStr;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [events]);

  const balanceExplanation = personalOnly
    ? (personalOpeningKnown ? null : 'Начальный остаток не задан. Это итог операций, а не остаток на счетах.')
    : budgetMode==='personal' ? 'Баланс и дневной ориентир остаются семейными.' : null;
  const dailySummary = (
    <div className="space-y-2 min-w-0" data-testid="overview-daily-summary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--terra-ink)]">{!personalOnly&&budgetMode==='personal'?'Сегодня · семья':'Сегодня'}</h3>
        {!settings.privacyMode&&personalOpeningKnown&&dailyLimit>0&&isOverDailyLimit&&<span className="text-xs font-semibold text-[var(--terra-danger-text)]">Выше ориентира</span>}
      </div>
      <dl className="terra-daily-pair">
        <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Ориентир на день</dt><dd className="mt-1 text-xl font-headline font-semibold tabular-nums [overflow-wrap:anywhere]">{personalOpeningKnown?formatAmount(dailyLimit)+' ₽':'—'}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Потрачено</dt><dd className={`mt-1 text-xl font-headline font-semibold tabular-nums [overflow-wrap:anywhere] ${!settings.privacyMode&&isOverDailyLimit?'text-[var(--terra-danger-text)]':'text-[var(--terra-ink)]'}`}>{formatAmount(spentToday)} ₽</dd></div>
      </dl>
      {!settings.privacyMode&&personalOpeningKnown&&dailyLimit>0&&<div className="space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs"><span className={isOverDailyLimit?'text-[var(--terra-danger-text)]':'text-[var(--terra-muted)]'}>{isOverDailyLimit?'Превышение: '+formatAmount(overLimitDelta)+' ₽':'Использовано'}</span><span className="tabular-nums font-semibold">{dailyUsagePercent}%</span></div>
        <div role="progressbar" aria-label="Использование дневного ориентира" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dailyUsagePercent} className="h-2 bg-[var(--terra-soft)] rounded-full overflow-hidden">
          <div className={`h-full rounded-full terra-progress ${isOverDailyLimit?'bg-[var(--terra-danger-text)]':'bg-[var(--terra-primary-solid)]'}`} style={{width:dailyUsagePercent+'%'}}/>
        </div>
      </div>}
      {!personalOpeningKnown&&<p className="text-xs text-[var(--terra-muted)]">Укажите начальный остаток для расчёта ориентира.</p>}
    </div>
  );

  return (
    <div data-testid="overview-scroll-container" className="flex-1 min-h-0 flex flex-col min-w-0 bg-[var(--terra-canvas)] overflow-y-auto overscroll-y-contain no-scrollbar pb-4 md:pb-8 text-graphite dark:text-gray-100 transition-colors">
      {/* ========================================================= */}
      {/* MOBILE VIEW (strictly matches screenshot image.png on < md) */}
      {/* ========================================================= */}
      <div className="md:hidden flex flex-col min-w-0 w-full">
        {/* Shared app header; date selection is a secondary control, not competing navigation. */}
        <TerraMobileHeader
          title="Обзор"
          onAdd={onOpenAddModal}
          addTitle="Добавить операцию"
          onOpenSettings={onOpenSettings}
          onOpenNotifications={onOpenNotifications}
          rightExtra={
            <button type="button" onClick={onOpenAIChat}
              aria-label="AI Ассистент" title="AI Ассистент"
              className={ICON_ACTION+" "+TOOLBAR_ACTION_IDLE+" terra-press"}>
              <Sparkles size={18} />
            </button>
          }
        />
        <div className="px-3 pt-2" data-testid="overview-month-selector">
          <button type="button" onClick={()=>setIsMonthPickerOpen(open=>!open)}
            aria-label={`Выбрать месяц: ${currentMonthName}`} aria-expanded={isMonthPickerOpen} aria-controls="overview-month-controls-mobile"
            className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE+' max-w-full terra-press'}>
            <span className="truncate">{currentMonthName}</span><ChevronDown size={16} aria-hidden="true"/>
          </button>
          {isMonthPickerOpen && <div id="overview-month-controls-mobile" role="group" aria-label="Доступные месяцы" className={SURFACE_CARD+' mt-2 space-y-2'}>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={()=>handleStepMonth(-1)} aria-label="Предыдущий месяц" className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE}><ChevronLeft size={18}/></button>
              <span className="min-w-0 text-center text-sm font-semibold text-[var(--terra-ink)]">{currentMonthName}</span>
              <button type="button" onClick={()=>handleStepMonth(1)} aria-label="Следующий месяц" className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE}><ChevronRight size={18}/></button>
            </div>
            <div className="max-h-48 overflow-y-auto overscroll-y-contain">
              {monthOptions.map(item=>{
                const isSelected=item.date.getMonth()===activeMonth.getMonth()&&item.date.getFullYear()===activeMonth.getFullYear();
                return <button key={item.key} type="button" aria-pressed={isSelected}
                  onClick={()=>{handleMonthChange(item.date);setIsMonthPickerOpen(false);}}
                  className={TOOLBAR_ACTION+' w-full justify-start '+(isSelected?FILTER_CHIP_ACTIVE:TOOLBAR_ACTION_IDLE)}>{item.label}</button>;
              })}
            </div>
            <button type="button" onClick={()=>{handleMonthChange(new Date());setIsMonthPickerOpen(false);}} className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE+' w-full'}>Текущий месяц</button>
          </div>}
        </div>

        {/* Scope Pill Switcher (Семейный / Личный) */}
        {!personalOnly&&<div className="px-3 mt-2 w-full" data-testid="overview-scope-mobile">
          <div role="group" aria-label="Область бюджета" className="w-full bg-[var(--terra-soft)] p-1 rounded-xl grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setBudgetMode('family')}
              aria-pressed={budgetMode === 'family'}
              className={`min-h-[44px] py-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                budgetMode === 'family'
                  ? 'bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)]'
                  : 'text-[#2E3230] dark:text-gray-200 hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              <Users size={15} />
              <span>Семейный</span>
            </button>
            <button
              type="button"
              onClick={() => setBudgetMode('personal')}
              aria-pressed={budgetMode === 'personal'}
              className={`min-h-[44px] py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                budgetMode === 'personal'
                  ? 'bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)]'
                  : 'text-[#2E3230] dark:text-gray-200 hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              <User size={15} />
              <span>Личный</span>
            </button>
          </div>
        </div>}

        {/* Mobile Dashboard Cards Stream */}
        <div className="px-3 pt-3 space-y-3 pb-2">
          {/* 1. Hero Balance Card */}
          <section data-testid="overview-balance-mobile" className={`${DASHBOARD_CARD} terra-overview-balance-card space-y-2.5`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-[var(--terra-muted)]">
                  {personalOnly?(personalOpeningKnown?'Личный баланс':'Итог личных операций'):'Семейный баланс'}
                </h2>
                <div data-testid="overview-balance-value-mobile" className="mt-1 text-[28px] leading-tight font-headline font-bold text-[var(--terra-ink)] tabular-nums [overflow-wrap:anywhere]">
                  {settings.privacyMode?'••••••':formatAmount(sharedLedger)+' ₽'}
                </div>
              </div>
              <button type="button" aria-label={settings.privacyMode?'Показать суммы':'Скрыть суммы'} aria-pressed={settings.privacyMode===true}
                onClick={()=>updateSettings({privacyMode:!settings.privacyMode})} className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE+' terra-press'}>
                {settings.privacyMode?<EyeOff size={18}/>:<Eye size={18}/>}
              </button>
            </div>
            {balanceExplanation&&<p data-testid="overview-balance-explanation" className="text-xs text-[var(--terra-muted)]">{balanceExplanation}</p>}
            <div className="pt-2.5 border-t border-[var(--terra-border)] space-y-1">
              <p className="text-xs text-[var(--terra-muted)]">{!personalOnly&&budgetMode==='personal'?'Личные операции':'За месяц'}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm tabular-nums">
                <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Доходы</dt><dd className="font-semibold text-[var(--terra-primary-text)] [overflow-wrap:anywhere]">{settings.privacyMode?'••••••':formatAmount(displayMonthIncome)+' ₽'}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Расходы</dt><dd className="font-semibold text-[var(--terra-ink)] [overflow-wrap:anywhere]">{settings.privacyMode?'••••••':formatAmount(displayMonthSpent)+' ₽'}</dd></div>
              </dl>
            </div>
            {totalMonthlyLimit>0&&!settings.privacyMode&&<div className="space-y-1 pt-0.5">
              <div className="flex flex-wrap justify-between items-baseline gap-1.5 text-xs">
                <span className="text-graphite-muted dark:text-gray-400">Месячный лимит</span>
                <span className="font-semibold text-graphite dark:text-white tabular-nums break-words">
                  {settings.privacyMode ? '•••' : totalMonthlyLimit > 0
                    ? `${formatAmount(displayMonthSpent)} ₽ / ${formatAmount(totalMonthlyLimit)} ₽`
                    : `${formatAmount(displayMonthSpent)} ₽`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#EAE6DD] dark:bg-[#2C2C2E] overflow-hidden" aria-hidden="true">
                <div 
                  className="h-full rounded-full bg-[#4A7C59] terra-progress"
                  style={{ width: `${!settings.privacyMode && totalMonthlyLimit > 0 ? Math.min(100, Math.round((displayMonthSpent / totalMonthlyLimit) * 100)) : 0}%` }}
                />
              </div>
            </div>}
            {isCurrentCalendarMonth&&<div className="space-y-2 pt-2.5 border-t border-[var(--terra-border)]" data-testid="overview-daily-mobile">
            {dailySummary}
            <button type="button" onClick={()=>personalOpeningKnown?setIsReserveModalOpen(true):onOpenSettings()} aria-label={personalOnly?'Открыть подробности личного резерва':'Открыть подробности семейного резерва'} className="min-h-[44px] w-full flex flex-wrap items-center justify-between gap-2 text-left border-t border-[var(--terra-border)] pt-1 focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
              <span className="text-sm text-[var(--terra-muted)]">{personalOnly?'Личный резерв':'Семейный резерв'}</span><span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-[var(--terra-ink)]">{formatAmount(reservedAmount)} ₽<ChevronRight size={16} aria-hidden="true"/></span>
            </button>
            </div>}
          </section>

          {/* 2. Динамика расходов Card */}
          <section data-testid="overview-chart-mobile" className={`${DASHBOARD_CARD} space-y-4`}>
              <OverviewExpenseChart
                mobile scale={chartScale} setScale={setChartScale} points={dynamicsData.points}
                subtitle={dynamicsData.subtitle} average={dynamicsData.avg} maximum={dynamicsData.max}
                limit={dynamicsData.limit} limitLabel={dynamicsData.limitLabel} complianceText={dynamicsData.complianceText}
                privacyMode={settings.privacyMode===true} formatAmount={formatAmount}
                onPointSelect={point=>{if(chartScale==='month')handleMonthChange(new Date(point.dateObj));else setSelectedDayDetailDate(new Date(point.dateObj));}}
                onOpenBudget={()=>onNavigateTab('budget')}
              />
          </section>

          {/* 6. История операций Card */}
          <section data-testid="overview-history-mobile" className={`${SURFACE_CARD} terra-overview-list-card space-y-1.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-headline text-graphite dark:text-white">
                  История операций
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onDrillDown('all')}
                data-testid="overview-history-all-mobile" aria-label="Все операции" className="min-h-[44px] px-2 flex items-center gap-0.5 text-sm font-medium text-[var(--terra-primary-text)] transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
              >
                <span>Все</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-[var(--terra-border)]">
              {recentMobileTransactions.length === 0 && (
                <div className="py-4 text-center space-y-2">
                  <p className="text-sm text-graphite-muted dark:text-gray-400">Операций пока нет.</p>
                  <button type="button" onClick={onOpenAddModal} className="min-h-[44px] text-sm font-semibold text-[var(--terra-primary-text)] hover:underline">
                    Добавить первую операцию
                  </button>
                </div>
              )}
              {recentMobileTransactions.map((tx, idx) => {
                const isExpense = tx.type === 'expense';
                const txMember = members.find(m => m.id === tx.memberId) || { name: 'Участник', color: '#4A7C59' };
                const cat = categories.find(c => c.id === tx.category);
                const catLabel = cat?.label || (tx.category === 'groceries' ? 'Продукты' : tx.category === 'cafe' ? 'Фастфуд' : tx.category === 'subscriptions' ? 'Подписки' : tx.category === 'telecom' ? 'Связь' : 'Операция');
                const displayTitle = tx.note || tx.rawNote || catLabel;
                const brandKey = getMerchantBrandKey(displayTitle);
                const txDate = new Date(tx.date);
                const dateFormatted = `${txDate.getDate()} ${txDate.toLocaleString('ru-RU', { month: 'short' })}`;

                return (
                  <button type="button"
                    key={tx.id ? `mob-tx-${tx.id}` : `mob-tx-idx-${idx}`}
                    onClick={() => onEditTransaction(tx)}
                    aria-label={`Редактировать операцию: ${displayTitle}`}
                    className="min-h-[56px] w-full text-left px-1 py-2 flex items-center justify-between gap-2 hover:bg-[var(--terra-soft)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        <BrandIcon name={displayTitle} brandKey={brandKey} category={cat} size="sm" className="w-9 h-9 rounded-xl" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[var(--terra-ink)] line-clamp-2 [overflow-wrap:anywhere]">
                          {displayTitle}
                        </h4>
                        <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span>{dateFormatted}</span>
                          {!personalOnly&&budgetMode==='family'&&<span className="font-medium text-[var(--terra-muted)]">{txMember.name}</span>}
                          <span>{catLabel}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right min-w-0 max-w-[46%] shrink-0">
                      <span className={`text-sm font-semibold tabular-nums block [overflow-wrap:anywhere] ${isExpense?'text-[var(--terra-ink)]':'text-[var(--terra-primary-text)]'}`}>
                        {settings.privacyMode ? '•••' : `${isExpense ? '-' : '+'}${formatAmount(tx.amount)} ₽`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
          {/* 3. Категории расходов Card */}
          <section data-testid="overview-categories-mobile" className={`${SURFACE_CARD} terra-overview-list-card space-y-2`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold font-headline text-graphite dark:text-white leading-tight">
                  Категории расходов
                </h3>
                <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                  Всего: {formatAmount(displayMonthSpent || 0)} ₽
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onDrillDown('all')}
                  className="min-h-[44px] flex items-center gap-0.5 text-xs font-semibold text-[var(--terra-primary-text)] transition-colors cursor-pointer px-1 rounded-lg hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                  title="Открыть аналитику всех категорий" aria-label="Аналитика всех категорий"
                >
                  <span>Аналитика</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCatModalId(null);
                    setIsCatModalOpen(true);
                  }}
                  title="Создать новую категорию или настроить"
                  aria-label="Управление категориями" className={`${ICON_ACTION} ${TOOLBAR_ACTION_IDLE} cursor-pointer`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-[var(--terra-border)]">
              {mobileCategories.length === 0 && (
                <p className="text-sm text-graphite-muted dark:text-gray-400 py-3">
                  За выбранный период пока нет расходов по категориям.
                </p>
              )}
              {mobileCategories.slice(0, OVERVIEW_CATEGORY_PREVIEW_LIMIT).map((cat, idx) => (
                <button type="button"
                  key={cat.id ? `mob-cat-${cat.id}` : `mob-cat-idx-${idx}`}
                  onClick={() => onDrillDown(cat.id || 'all')}
                  aria-label={`Аналитика категории: ${cat.name}`}
                  className="min-h-[52px] w-full text-left space-y-1.5 px-1 py-2 rounded-lg hover:bg-[var(--terra-soft)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span 
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0"
                        style={{ backgroundColor: cat.bg, color: cat.color }}
                      >
                        {cat.icon}
                      </span>
                      <span className="text-sm font-medium text-[var(--terra-ink)] line-clamp-2 [overflow-wrap:anywhere] min-w-0">{cat.name}</span>
                      <span className="text-xs text-graphite-muted dark:text-gray-400 shrink-0">{settings.privacyMode?'•••':`${cat.percent}%`}</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--terra-ink)] tabular-nums min-w-0 max-w-[46%] shrink-0 text-right [overflow-wrap:anywhere]">
                      {formatAmount(cat.amount)} ₽
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#EAE6DD] dark:bg-[#2C2C2E] overflow-hidden">
                    <div 
                      className="h-full rounded-full terra-progress"
                      style={{ width: `${settings.privacyMode?0:Math.min(100, cat.percent)}%`, backgroundColor: cat.barColor }}
                    />
                  </div>
                </button>
              ))}
            </div>
            {mobileCategories.length>OVERVIEW_CATEGORY_PREVIEW_LIMIT&&<div className="flex items-center justify-between flex-wrap gap-1 border-t border-[var(--terra-border)] pt-1">
                <p data-testid="overview-category-preview-count" className="text-xs text-[var(--terra-muted)]">Показано {OVERVIEW_CATEGORY_PREVIEW_LIMIT} из {mobileCategories.length}</p>
                <button type="button" onClick={()=>setAllCategoriesOpen(true)} className="min-h-[44px] px-2 text-sm font-semibold text-[var(--terra-primary-text)] rounded-lg hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]" aria-label="Все категории расходов">Все категории <ChevronRight size={14} className="inline" aria-hidden="true"/></button>
              </div>}
          </section>

          {/* 4. Список покупок Card (Extracted Widget) */}
          {showShopping && <QuickShoppingWidget
            activeShoppingItems={activeShoppingItems}
            displayShoppingItems={displayShoppingItems}
            newShoppingTitle={newShoppingTitle}
            setNewShoppingTitle={setNewShoppingTitle}
            isAddingShopping={isAddingShopping}
            handleToggleShopping={handleToggleShopping}
            handleAddShoppingInline={handleAddShoppingInline}
            onNavigateTab={onNavigateTab}
          />}

          {/* 5. События на текущую неделю Card (скрыт, если событий на неделе нет) */}
          {showWeekEvents && upcomingWeekEvents.length > 0 && (
            <section className={`${SURFACE_CARD} space-y-3.5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold font-headline text-graphite dark:text-white">
                    События на этой неделе
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {onOpenAddEventModal && (
                    <button
                      type="button"
                      onClick={onOpenAddEventModal}
                      title="Запланировать событие"
                      aria-label="Создать событие"
                      className={`${TOOLBAR_ACTION} ${TOOLBAR_ACTION_IDLE} cursor-pointer`}
                    >
                      <Plus size={15} strokeWidth={2.4} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigateTab('plans')}
                    className="min-h-[44px] px-2 rounded-lg flex items-center gap-0.5 text-sm font-medium text-primary dark:text-emerald-400 hover:underline focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <span>Все</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[var(--terra-border)]">
                {upcomingWeekEvents.map((ev, idx) => {
                  const evDate = new Date(ev.date);
                  const dayOfWeekNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
                  const dayLabel = dayOfWeekNames[evDate.getDay()];
                  const dayNum = evDate.getDate();

                  const primaryMemberId = ev.memberIds && ev.memberIds[0];
                  const memberMeta = primaryMemberId ? members.find(m => m.id === primaryMemberId) : null;

                  return (
                    <button type="button"
                      key={ev.id ? `mob-ev-${ev.id}` : `mob-ev-idx-${idx}`}
                      onClick={() => onEditEvent ? onEditEvent(ev) : onNavigateTab('plans')}
                      aria-label={`Открыть событие: ${ev.title}`}
                      className="min-h-[48px] w-full text-left px-1 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--terra-soft)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#EAE6DE] dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-graphite-muted dark:text-gray-400 uppercase leading-none">
                            {dayLabel}
                          </span>
                          <span className="text-xs font-bold text-[#2E3230] dark:text-white leading-none mt-0.5">
                            {dayNum}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-graphite dark:text-white truncate">
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-graphite-muted dark:text-gray-400 mt-0.5">
                            <span className="font-semibold text-[#2E3230] dark:text-gray-200">{ev.time}</span>
                            <span className="font-medium" style={{ color: memberMeta?.color }}>
                              {memberMeta?.name || 'Вся семья'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight size={16} className="text-graphite-muted dark:text-gray-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}


        </div>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP VIEW (Visible on md and up)                       */}
      {/* ========================================================= */}
      <div className="hidden md:flex flex-col min-w-0 w-full">
        {/* Main Dashboard Container */}
        <div className="terra-overview-layout p-4 sm:p-5 lg:px-7 lg:py-5 space-y-4 max-w-[1600px] mx-auto w-full">
          <h1 className="font-headline text-2xl font-bold text-[var(--terra-ink)]">Обзор</h1>
          {/* Top Navigation Bar (Extracted Subcomponent) */}
          <OverviewHeaderBar
            budgetMode={budgetMode}
            householdPersonal={personalOnly}
            setBudgetMode={setBudgetMode}
            settings={settings}
            updateSettings={updateSettings}
            currentMemberName={currentMember.name || 'Пользователь'}
            memberInitial={memberInitial}
            currentMonthName={currentMonthName}
            isMonthPickerOpen={isMonthPickerOpen}
            setIsMonthPickerOpen={setIsMonthPickerOpen}
            monthOptions={monthOptions}
            activeMonth={activeMonth}
            onMonthChange={handleMonthChange}
            onStepMonth={handleStepMonth}
            onOpenAddModal={onOpenAddModal}
            onOpenAIChat={onOpenAIChat}
          />
        {/* ALERT BANNER: Daily Limit Exceeded (Terra Warning) */}
        {isCurrentCalendarMonth&&!settings.privacyMode&&isOverDailyLimit && (
          <section 
            aria-label="Предупреждение о бюджете"
            className="rounded-2xl bg-[var(--terra-offline-soft)] border border-[var(--terra-border)] p-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FEEBC8] dark:bg-[#3D251A] border border-[#FBD38D] dark:border-[#C2410C]/40 text-[#C2410C] flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                  <AlertTriangle size={20} className="text-[#C2410C]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#FFEDD5] dark:bg-[#432314] text-[#C2410C] border border-[#FDBA74] dark:border-[#EA580C]/40">
                      Внимание: Превышение лимита дня
                    </span>
                    <span className="text-xs font-mono font-bold text-[#9A3412] dark:text-[#FB923C]">
                      +{formatAmount(overLimitDelta)} ₽ сверх плана
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#7C2D12] dark:text-[#FED7AA] leading-relaxed">
                    Сегодня потрачено <strong className="font-mono font-bold text-[#9A3412] dark:text-orange-400">{formatAmount(spentToday)} ₽</strong> при плановом лимите <strong className="font-mono">{formatAmount(dailyLimit)} ₽</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:self-start md:self-center flex-shrink-0 pl-13 md:pl-0">
                <button 
                  type="button"
                  onClick={() => personalOpeningKnown?setIsReserveModalOpen(true):onOpenSettings()}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C1C1E] hover:bg-[#FFF4E5] dark:hover:bg-[#2C2C2E] border border-[#FDBA74] text-xs font-bold text-[#9A3412] dark:text-[#FB923C] transition shadow-xs whitespace-nowrap active:scale-[0.98]"
                >
                  Покрыть из Резерва
                </button>
                <button 
                  type="button"
                  onClick={onOpenSettings}
                  className="px-3.5 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-xs font-bold text-white transition shadow-sm shadow-[#C2410C]/25 whitespace-nowrap active:scale-[0.98]"
                >
                  Скорректировать лимит
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 1. Верхний ряд метрик (4 сбалансированные карточки) */}
        <section data-testid="overview-metrics-desktop" className="terra-overview-metrics grid gap-3 items-stretch" data-current-period={isCurrentCalendarMonth}>
          {/* Card 1: ОБЩИЙ БАЛАНС */}
          <div className={`${DASHBOARD_CARD} terra-overview-metric-card flex flex-col gap-2`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center text-[var(--terra-muted)] font-semibold text-sm">
                <span>{personalOnly?(personalOpeningKnown?'Личный баланс':'Итог личных операций'):'Семейный баланс'}</span>
              </div>
            </div>
            <div className="flex items-baseline">
              <span className="terra-overview-balance font-headline font-bold text-[var(--terra-ink)] tracking-tight tabular-nums [overflow-wrap:anywhere] min-w-0 inline-flex flex-wrap items-baseline gap-1.5">
                {formatAmount(sharedLedger)} <span className="text-xl font-medium text-[var(--terra-muted)]">₽</span>
              </span>
            </div>
            {balanceExplanation&&<p className="text-xs text-[var(--terra-muted)]">{balanceExplanation}</p>}
            <div className="pt-2 border-t border-[var(--terra-border)] space-y-1">
                <p className="text-xs text-[var(--terra-muted)]">{!personalOnly&&budgetMode==='personal'?'Личные операции':'За месяц'}</p>
                <dl className="grid grid-cols-2 gap-3 text-sm tabular-nums">
                  <div className="min-w-0"><dt className="text-[var(--terra-muted)]">Доходы</dt><dd className="font-semibold text-[var(--terra-primary-text)] [overflow-wrap:anywhere]">{settings.privacyMode?'••••••':formatAmount(displayMonthIncome)+' ₽'}</dd></div>
                  <div className="min-w-0"><dt className="text-[var(--terra-muted)]">Расходы</dt><dd className="font-semibold text-[var(--terra-ink)] [overflow-wrap:anywhere]">{settings.privacyMode?'••••••':formatAmount(displayMonthSpent)+' ₽'}</dd></div>
                </dl>
              </div>
            {!settings.privacyMode&&lastMonthComparison.isPositive!==null&&<div className="pt-2 mt-auto border-t border-[var(--terra-border)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--terra-muted)]">
              <span className={`inline-flex items-center font-bold ${lastMonthComparison.isPositive ? 'text-[#2F673E] dark:text-green-400' : 'text-[#C2410C] dark:text-orange-400'}`}>
                {lastMonthComparison.isPositive === true ? (
                  <TrendingDown size={14} className="mr-0.5" />
                ) : lastMonthComparison.isPositive === false ? (
                  <TrendingUp size={14} className="mr-0.5" />
                ) : null}
                {lastMonthComparison.text}
              </span>
              <span className="text-xs">расходы к прошлому месяцу</span>
            </div>}
          </div>

          {/* Daily comparison: one surface and one progress indicator. */}
          {isCurrentCalendarMonth&&<div className={`${DASHBOARD_CARD} terra-overview-metric-card flex flex-col gap-2`} data-testid="overview-daily-desktop">
            {dailySummary}
          </div>}

          {/* Card 4: Семейный резерв */}
          <button type="button"
            onClick={() => personalOpeningKnown?setIsReserveModalOpen(true):onOpenSettings()}
            aria-label={personalOnly?'Открыть подробности личного резерва':'Открыть подробности семейного резерва'}
            className={`${DASHBOARD_CARD} terra-overview-metric-card w-full text-left flex flex-col gap-3 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer group`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-graphite dark:text-gray-200 flex items-center gap-1.5">
                <Lock size={14} className="text-warm-amber" />
                {personalOnly?'Личный резерв':'Семейный резерв'}
              </span>
              <ChevronRight size={18} className="text-[var(--terra-muted)]" aria-hidden="true"/>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl lg:text-3xl font-headline font-bold text-graphite dark:text-white tracking-tight tabular-nums [overflow-wrap:anywhere] min-w-0 inline-flex items-baseline gap-1">
                {formatAmount(reservedAmount)} <span className="text-sm text-graphite-muted dark:text-gray-400 font-normal">₽</span>
              </span>
            </div>
            <p className="text-xs text-[var(--terra-muted)]">Обязательства и накопления</p>
          </button>
        </section>

        {/* 2. Основная рабочая область (12 колонок: 8 слева + 4 справа, выровненных по нижнему краю) */}
        <div className="terra-overview-columns grid gap-4 lg:gap-5">
          {/* LEFT COLUMN: 8 columns */}
          <div className="min-w-0 flex flex-col gap-4 lg:gap-5">
            {/* Блок «Динамика расходов» */}
            <div data-testid="overview-chart-desktop" className={DASHBOARD_CARD+' space-y-4'}>
              <OverviewExpenseChart
                scale={chartScale} setScale={setChartScale} points={dynamicsData.points}
                subtitle={dynamicsData.subtitle} average={dynamicsData.avg} maximum={dynamicsData.max}
                limit={dynamicsData.limit} limitLabel={dynamicsData.limitLabel} complianceText={dynamicsData.complianceText}
                privacyMode={settings.privacyMode===true} formatAmount={formatAmount}
                onPointSelect={point=>{if(chartScale==='month')handleMonthChange(new Date(point.dateObj));else setSelectedDayDetailDate(new Date(point.dateObj));}}
                onOpenBudget={()=>onNavigateTab('budget')}
              />
            </div>

            {/* Сетка «Категории расходов» (4 карточки, растянута до нижней границы) */}
            <div data-testid="overview-categories-desktop" className={`${DASHBOARD_CARD} flex flex-col`}>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0ECE4] dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  
                  <h3 className="text-base font-semibold font-headline text-graphite dark:text-white">
                    Категории расходов
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-graphite-muted dark:text-gray-400">
                    Всего в этом месяце: <strong className="text-graphite dark:text-white font-bold font-mono [overflow-wrap:anywhere]">{formatAmount(categoryBreakdown.total)} ₽</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCatModalId(null);
                      setIsCatModalOpen(true);
                    }}
                    className="min-h-[44px] flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg bg-[#FAF8F5] dark:bg-[#2C2C2E] border border-surface-border dark:border-white/10 text-graphite dark:text-white hover:text-primary dark:hover:text-green-400 hover:border-primary transition cursor-pointer"
                    title="Создать новую категорию или настроить"
                  >
                    <Plus size={13} />
                    <span>Категория</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDrillDown('all')}
                    className="min-h-[44px] px-2 text-sm text-primary dark:text-green-400 font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                    title="Открыть аналитику всех категорий" aria-label="Аналитика всех категорий"
                  >
                    <span>Аналитика</span>
                    <ChevronRight size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {categoryBreakdown.items.length === 0 && (
                  <p className="col-span-full py-5 text-sm text-graphite-muted dark:text-gray-400">
                    За выбранный период расходов по категориям пока нет.
                  </p>
                )}
                {categoryBreakdown.items.slice(0, OVERVIEW_CATEGORY_PREVIEW_LIMIT).map((cat, idx) => (
                  <button type="button"
                    key={cat.id ? `desk-cat-${cat.id}` : `desk-cat-idx-${idx}`}
                    onClick={() => onDrillDown(cat.id)}
                    aria-label={`Аналитика категории: ${cat.name}`}
                    className="min-h-[44px] w-full text-left p-3 rounded-xl flex flex-col justify-between hover:bg-[var(--terra-soft)] transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-[var(--terra-ink)] min-w-0 line-clamp-2 [overflow-wrap:anywhere]">{cat.name}</span>
                      <span className="text-xs font-semibold tabular-nums text-[var(--terra-ink)] flex-shrink-0">
                        {settings.privacyMode?'•••':`${cat.percent}%`}
                      </span>
                    </div>
                    <p className="text-base font-bold font-headline text-graphite dark:text-white mt-1 [overflow-wrap:anywhere]">
                      {formatAmount(cat.amount)} ₽
                    </p>
                    <div className="w-full bg-[#EAE5DC] dark:bg-black/40 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full terra-progress" 
                        style={{ width: `${settings.privacyMode?0:cat.percent}%`, backgroundColor: cat.color || cat.style?.color || '#4A7C59' }}
                      />
                    </div>
                  </button>
                ))}
              </div>
              {categoryBreakdown.items.length>OVERVIEW_CATEGORY_PREVIEW_LIMIT&&<div className="flex items-center justify-between flex-wrap gap-1 border-t border-[var(--terra-border)] pt-1">
                <p data-testid="overview-category-preview-count" className="text-xs text-[var(--terra-muted)]">Показано {OVERVIEW_CATEGORY_PREVIEW_LIMIT} из {categoryBreakdown.items.length}</p>
                <button type="button" onClick={()=>setAllCategoriesOpen(true)} className="min-h-[44px] px-2 text-sm font-semibold text-[var(--terra-primary-text)] rounded-lg hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]" aria-label="Все категории расходов">Все категории <ChevronRight size={14} className="inline" aria-hidden="true"/></button>
              </div>}
            </div>
          </div>

          {/* RIGHT COLUMN: 4 columns */}
          <div className="min-w-0 flex flex-col gap-4 lg:gap-5">
            {/* Виджет «История операций» (компактный список без пустых разрывов) */}
            <div data-testid="overview-history-desktop" className={`${DASHBOARD_CARD} flex flex-col justify-start`}>
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-[var(--terra-border)] flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-semibold font-headline text-graphite dark:text-white">
                    История операций
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => onDrillDown('all')}
                  data-testid="overview-history-all-desktop" aria-label="Все операции" className="min-h-[44px] px-2 rounded-lg text-sm text-[var(--terra-primary-text)] transition-colors flex items-center gap-1 font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                >
                  Все
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="divide-y divide-[var(--terra-border)] mt-1 flex flex-col justify-start">
                {recentTransactions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-graphite-muted dark:text-gray-400">
                    Нет операций за выбранный период
                  </div>
                ) : (
                  recentTransactions.map((tx, idx) => {
                    const txCat = categories.find(c => c.id === tx.category);
                    const txDate = new Date(tx.date);
                    const dateFormatted = txDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                    const isTxToday = txDate.toDateString() === now.toDateString();
                    const txMember = members.find(m => m.id === tx.memberId) || {name:'Участник',color:'#4A7C59'};
                    const catLabel = txCat?.label || 'Прочее';
                    const displayTitle = tx.note || tx.rawNote || catLabel;
                    const brandKey = getMerchantBrandKey(displayTitle);
                    const isExpense = tx.type === 'expense';

                    return (
                      <button type="button"
                        key={tx.id ? `desk-tx-${tx.id}` : `desk-tx-idx-${idx}`}
                        onClick={() => onEditTransaction(tx)}
                        aria-label={`Редактировать операцию: ${displayTitle}`}
                        className={`min-h-[56px] w-full text-left flex items-center justify-between px-1 py-2 gap-2 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isTxToday && isExpense && isOverDailyLimit && idx === 0
                            ? 'bg-[#FFF7ED] dark:bg-[#2A1E17] hover:bg-[#FFEDD5] dark:hover:bg-[#3D251A]'
                            : 'hover:bg-[var(--terra-soft)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
                            <BrandIcon 
                              name={displayTitle} 
                              brandKey={brandKey} 
                              category={txCat} 
                              size="md" 
                              className="rounded-xl"
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-graphite dark:text-white group-hover:text-primary transition-colors truncate">
                              {displayTitle}
                            </h4>
                            <p className="text-xs text-graphite-muted dark:text-gray-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                              <span>{dateFormatted}</span>
                              {!personalOnly&&budgetMode==='family'&&<span className="font-medium text-[var(--terra-muted)]">{txMember.name}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="text-right min-w-0 max-w-[46%] shrink-0">
                          <span className={`text-sm font-semibold tabular-nums [overflow-wrap:anywhere] block transition-colors ${
                            isExpense 
                              ? 'text-[var(--terra-ink)]'
                              : 'text-[var(--terra-primary-text)]'
                          }`}>
                            {isExpense ? '-' : '+'}{formatAmount(tx.amount)} ₽
                          </span>
                          <p className="text-xs text-graphite-muted dark:text-gray-400 break-words">{catLabel}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            {/* Виджет «Список покупок» */}
            {showShopping && <div className={DASHBOARD_CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0ECE4] dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold font-headline text-graphite dark:text-white">
                      Список покупок
                    </h3>
                    <span className="w-5 h-5 rounded-full bg-primary-light dark:bg-primary/20 text-primary dark:text-green-400 text-[11px] font-bold flex items-center justify-center border border-[#D5E5D9] dark:border-transparent">
                      {activeShoppingItems.length}
                    </span>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => onNavigateTab('shopping')}
                  aria-label="Открыть все покупки" data-testid="overview-shopping-link"
                  className="min-h-[44px] px-2 rounded-lg focus-visible:ring-2 focus-visible:ring-primary text-sm text-primary hover:text-primary-dark dark:hover:text-green-400 transition flex items-center gap-1 font-semibold"
                >
                  Все
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* List Items */}
              <ul className="divide-y divide-[#F2EFEB] dark:divide-white/5 my-2" role="list">
                {activeShoppingItems.length === 0 ? (
                  <li className="py-6 text-center text-xs text-graphite-muted dark:text-gray-400">
                    Список покупок пуст
                  </li>
                ) : (
                  activeShoppingItems.slice(0, 4).map((item, idx) => (
                    <li 
                      key={item.id ? `desk-shop-${item.id}` : `desk-shop-idx-${idx}`} 
                      className="min-w-0"
                    >
                      <button type="button" onClick={() => handleToggleShopping(item)} aria-label={`Отметить покупку «${item.title}» как выполненную`} className="min-h-[44px] w-full text-left py-2 flex items-center justify-between gap-2 group cursor-pointer transition-colors hover:bg-[var(--terra-soft)] px-1 rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
                      <div className="flex items-center gap-3 select-none min-w-0">
                        <div className={`w-5 h-5 rounded-full border-2 border-[#BAC3BB] dark:border-gray-600 flex items-center justify-center transition ${item.completed ? 'bg-primary border-primary text-white' : 'group-hover:border-primary'}`}>
                          {item.completed && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className={`text-sm text-graphite dark:text-white truncate transition font-medium ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'group-hover:text-primary'}`}>
                          {item.title}
                        </span>
                      </div>
                      {(item.amount || item.unit) && (
                        <span className="text-xs font-mono text-graphite-muted dark:text-gray-400 bg-[#FAF8F5] dark:bg-[#2C2C2E] px-2.5 py-0.5 rounded-lg border border-surface-border dark:border-white/5 flex-shrink-0 ml-2">
                          {item.amount || 1} {item.unit || 'шт'}
                        </span>
                      )}
                      </button>
                    </li>
                  ))
                )}
              </ul>

              {/* Quick Inline Add with smart NLP parsing */}
              <form onSubmit={handleAddShoppingInline} className="mt-2 pt-2">
                <div className="relative flex items-center">
                  <input 
                    type="text"
                    value={newShoppingTitle}
                    onChange={(e) => setNewShoppingTitle(e.target.value)}
                    placeholder="Например, молоко 1 л" aria-label="Название новой покупки"
                    className="w-full bg-[#FAF8F5] dark:bg-[#2C2C2E] border border-surface-border dark:border-white/5 rounded-xl text-xs text-graphite dark:text-white placeholder-graphite-muted dark:placeholder-gray-400 min-h-[48px] py-2.5 pl-3 pr-14 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-[#3A3A3C] transition"
                  />
                  <button 
                    type="submit"
                    disabled={!newShoppingTitle.trim() || isAddingShopping}
                    className="absolute right-1 min-h-[44px] min-w-[44px] flex items-center justify-center bg-primary-light dark:bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-lg transition disabled:opacity-40 cursor-pointer"
                    title="Добавить в список покупок" aria-label="Добавить в список покупок"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>

                {liveParsedShopping && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#4a7c59] dark:text-green-400 font-semibold px-1 animate-in fade-in">
                    <span>{liveParsedShopping.title}</span>
                    <span className="font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.2 rounded text-xs text-stone-700 dark:text-stone-300">
                      {liveParsedShopping.amount} {liveParsedShopping.unit}
                    </span>
                  </div>
                )}
              </form>
            </div>}

            {/* Виджет «События на этой неделе» (ПК, скрыт если нет событий) */}
            {showWeekEvents && upcomingWeekEvents.length > 0 && (
              <div className={DASHBOARD_CARD}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0ECE4] dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold font-headline text-graphite dark:text-white">
                        События на этой неделе
                      </h3>
                      <span className="w-5 h-5 rounded-full bg-primary-light dark:bg-primary/20 text-primary dark:text-green-400 text-[11px] font-bold flex items-center justify-center border border-[#D5E5D9] dark:border-transparent">
                        {upcomingWeekEvents.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenAddEventModal && (
                      <button
                        type="button"
                        onClick={onOpenAddEventModal}
                        title="Запланировать событие"
                        aria-label="Создать событие"
                        className="min-h-[44px] min-w-[44px] rounded-full bg-[#FAF8F5] dark:bg-white/10 text-graphite dark:text-white hover:bg-primary hover:text-white transition flex items-center justify-center cursor-pointer"
                      >
                        <Plus size={14} strokeWidth={2.4} />
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => onNavigateTab('plans')}
                      className="min-h-[44px] px-2 rounded-lg focus-visible:ring-2 focus-visible:ring-primary text-sm text-primary hover:text-primary-dark dark:hover:text-green-400 transition flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      Все
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-[var(--terra-border)] mt-1">
                  {upcomingWeekEvents.slice(0, 3).map((ev, idx) => {
                    const evDate = new Date(ev.date);
                    const dayOfWeekNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
                    const dayLabel = dayOfWeekNames[evDate.getDay()];
                    const dayNum = evDate.getDate();

                    const primaryMemberId = ev.memberIds && ev.memberIds[0];
                    const memberMeta = primaryMemberId ? members.find(m => m.id === primaryMemberId) : null;

                    return (
                      <button type="button"
                        key={ev.id ? `desk-ev-${ev.id}` : `desk-ev-idx-${idx}`}
                        onClick={() => onEditEvent ? onEditEvent(ev) : onNavigateTab('plans')}
                        aria-label={`Открыть событие: ${ev.title}`}
                        className="min-h-[48px] w-full text-left px-1 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--terra-soft)] transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#EAE5DC] dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-graphite-muted dark:text-gray-400 uppercase leading-none">
                              {dayLabel}
                            </span>
                            <span className="text-xs font-bold text-[#2E3230] dark:text-white leading-none mt-0.5">
                              {dayNum}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-graphite dark:text-white group-hover:text-primary transition-colors truncate">
                              {ev.title}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-graphite-muted dark:text-gray-400 mt-0.5">
                              <span className="font-semibold text-[#2E3230] dark:text-gray-200">{ev.time}</span>
                              <span className="font-medium" style={{ color: memberMeta?.color }}>
                                {memberMeta?.name || 'Вся семья'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight size={14} className="text-graphite-muted dark:text-gray-400 group-hover:text-primary transition shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>

      {/* Reserve Details Modal */}
      {isReserveModalOpen && (
        <ReserveDetailsModal 
          isOpen={isReserveModalOpen}
          onClose={() => setIsReserveModalOpen(false)}
          totalBalance={sharedLedger}
          reservedAmount={reservedAmount}
          availableBalance={availableBalance}
          dailyBudget={dailyLimit}
          daysRemaining={daysRemaining}
          savingsAmount={savingsAmount}
          savingsRate={settings.savingsRate}
          unpaidMandatoryTotal={unpaidMandatoryTotal}
          futureExpenses={detailedMandatoryExpenses}
          manualReserved={manualReserved}
          onUpdateManualSavings={async (amt) => {
            await updateSettings(personalOnly ? { personalManualReservedAmount: amt } : { manualReservedAmount: amt });
          }}
          onTogglePaid={handleToggleMandatoryPaid}
          onPayExpenses={handlePayMandatoryExpenses}
          onEditExpense={onEditMandatoryExpense}
          privacyMode={settings.privacyMode}
          currency="₽"
        />
      )}

      {allCategoriesOpen&&<OverviewCategoriesModal items={categoryBreakdown.items} total={categoryBreakdown.total} period={currentMonthName} privacyMode={settings.privacyMode===true}
        onClose={()=>setAllCategoriesOpen(false)} onSelect={id=>{setAllCategoriesOpen(false);onDrillDown(id);}}/>}
      {/* Expense Categories Breakdown Modal */}
      {isCatModalOpen && (
        <CategoriesModal
          isOpen={isCatModalOpen}
          onClose={() => {
            setIsCatModalOpen(false);
            setSelectedCatModalId(null);
          }}
          categories={categories}
          transactions={transactions}
          currentMonth={activeMonth}
          settings={settings}
          initialCategoryId={selectedCatModalId}
          onSelectCategory={(catId) => {
            setIsCatModalOpen(false);
            onDrillDown(catId);
          }}
        />
      )}

      {/* Day Detail Interactive Modal from Chart Click */}
      {selectedDayDetailDate && (
        <DayDetailModal 
          isOpen={!!selectedDayDetailDate}
          onClose={() => setSelectedDayDetailDate(null)}
          date={selectedDayDetailDate}
          transactions={filteredTransactions}
          categories={categories}
          members={members}
          onEditTransaction={onEditTransaction}
          onAddTransactionForDay={() => {
            setSelectedDayDetailDate(null);
            onOpenAddModal();
          }}
          dailySafeLimit={dailyLimit}
          privacyMode={settings.privacyMode}
        />
      )}
    </div>
  );
};

export default TerraOverview;
