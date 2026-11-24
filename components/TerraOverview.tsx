import React, { useState, useMemo, useCallback } from 'react';
import { 
  AlertTriangle, TrendingUp, TrendingDown, ArrowDownRight, Lock, 
  Calendar, Plus, Sparkles, Users, User, Settings, Eye, EyeOff, 
  ShoppingBag, History, PieChart, Check, ChevronRight, ChevronLeft, ArrowRight,
  HelpCircle, ShieldAlert, ChevronDown, ShieldCheck, ShoppingCart, FileText,
  Star, Smartphone, Utensils, Store, Tag, Gift, Activity, Car, CreditCard
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, ReferenceLine 
} from 'recharts';
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
import { FILTER_RAIL, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_IDLE, SURFACE_CARD, SECTION_HEADING } from './filterUiTokens';
import { OverviewHeaderBar } from './overview/OverviewHeaderBar';
import { OverviewMetricsCards } from './overview/OverviewMetricsCards';
import { OverviewExpenseChart } from './overview/OverviewExpenseChart';
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
  onEditTransaction: (tx: Transaction) => void;
  onNavigateTab: (tabId: string) => void;
  onDrillDown: (categoryId: string) => void;
  onEditMandatoryExpense?: (expense: MandatoryExpense) => void;
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;
  onOpenAddEventModal?: () => void;
  onEditEvent?: (event: FamilyEvent) => void;
}

const TerraOverview: React.FC<TerraOverviewProps> = ({
  onOpenAddModal,
  onOpenAIChat,
  onOpenSettings,
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
    goalSavedAmounts: goals.map(goal => goal.currentAmount || 0)
  }), [transactions, familyMonthTransactions, relevantMandatoryExpenses, categories,
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
        return;
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
    }
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
    }
  }, [financialSettings.manualPaidExpenses, financialSettings.mandatoryExpenses, currentMonthKey, relevantMandatoryExpenses,
      isCurrentCalendarMonth, updateMandatoryPaymentBundle]);

  const sharedLedger = familyProjection.ledger;
  const savingsAmount = familyProjection.savingsReserve;
  const manualReserved = familyProjection.manualReserve;
  const reservedAmount = familyProjection.reservedAmount;
  const availableBalance = familyProjection.availableBalance;
  const targetReserveGoal = Math.max(50000, Math.round(unpaidMandatoryTotal + savingsAmount + 25000));
  const reservePercent = Math.min(100, Math.max(15, Math.round((reservedAmount / (targetReserveGoal || 1)) * 100)));
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

  const totalMonthlyLimit = settings.targetMonthlyBudget ?? (dailyLimit > 0 ? dailyLimit * 30 : 0);

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
          amount: Math.round(item.amount),
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
  const mobileChartData = dynamicsData.points;
  const hasChartExpenses = dynamicsData.points.some(point => point.amount > 0);

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

  return (
    <div data-testid="overview-scroll-container" className="flex-1 min-h-0 flex flex-col min-w-0 bg-[#FAF6F0] dark:bg-[#121214] overflow-y-auto overscroll-y-contain no-scrollbar pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8 text-graphite dark:text-gray-100 transition-colors">
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
          rightExtra={
            <button type="button" onClick={onOpenAIChat}
              aria-label="AI Ассистент" title="AI Ассистент"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAE6DD] text-[#4A7C59] hover:bg-[#DED8CD] dark:bg-[#252528] dark:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59]">
              <Sparkles size={18} />
            </button>
          }
        />
        <div className="px-4 pt-3">
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              aria-label={`Выбрать месяц: ${currentMonthName}`}
              aria-expanded={isMonthPickerOpen}
              className="max-w-full min-h-[44px] px-3 sm:px-4 py-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-[#EAE6DD] dark:bg-[#252528] text-graphite dark:text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-[#E2DDD3] active:scale-95 transition cursor-pointer"
            >
              <span className="block truncate">{currentMonthName}</span>
              <ChevronDown size={14} className="text-graphite-muted dark:text-gray-400" />
            </button>
            {isMonthPickerOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsMonthPickerOpen(false)} 
                />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[min(17rem,calc(100vw-2rem))] bg-white dark:bg-[#252528] border border-surface-border dark:border-white/10 rounded-2xl shadow-xl p-2.5 z-50 min-w-[210px] space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={() => handleStepMonth(-1)}
                      className="p-1.5 hover:bg-[#F5F1EA] dark:hover:bg-white/5 rounded-lg text-graphite dark:text-gray-200 transition active:scale-95 cursor-pointer"
                      title="Предыдущий месяц"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold font-headline text-graphite dark:text-white capitalize">
                      {currentMonthName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStepMonth(1)}
                      className="p-1.5 hover:bg-[#F5F1EA] dark:hover:bg-white/5 rounded-lg text-graphite dark:text-gray-200 transition active:scale-95 cursor-pointer"
                      title="Следующий месяц"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* List of recent months to quickly select */}
                  <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar border-t border-b border-surface-border/60 dark:border-white/5 py-1">
                    {monthOptions.map((item) => {
                      const isSelected = item.date.getMonth() === activeMonth.getMonth() && item.date.getFullYear() === activeMonth.getFullYear();
                      const isCurrent = item.date.getMonth() === realToday.getMonth() && item.date.getFullYear() === realToday.getFullYear();
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            handleMonthChange(item.date);
                            setIsMonthPickerOpen(false);
                          }}
                          className={`w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl transition flex items-center justify-between text-left cursor-pointer ${
                            isSelected 
                              ? 'bg-primary text-white font-bold' 
                              : 'text-graphite dark:text-gray-300 hover:bg-[#F5F1EA] dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="capitalize">{item.label}</span>
                          {isCurrent && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary font-bold'}`}>
                              тек.
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Jump to current month button */}
                  <button
                    type="button"
                    onClick={() => {
                      handleMonthChange(new Date());
                      setIsMonthPickerOpen(false);
                    }}
                    className="w-full text-xs font-bold py-1.5 px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition flex items-center justify-between cursor-pointer"
                  >
                    <span>Текущий месяц</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Scope Pill Switcher (Семейный / Личный) */}
        <div className="px-4 my-3 w-full">
          <div className={`w-full bg-[#EAE6DD] dark:bg-[#252528] p-1 rounded-xl grid ${personalOnly?'grid-cols-1':'grid-cols-2'} gap-1`}>
            {!personalOnly&&<button
              type="button"
              onClick={() => setBudgetMode('family')}
              aria-pressed={budgetMode === 'family'}
              className={`min-h-[44px] py-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                budgetMode === 'family'
                  ? 'bg-[#4A7C59] text-white'
                  : 'text-[#2E3230] dark:text-gray-200 hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              <Users size={15} />
              <span>Семейный</span>
            </button>}
            <button
              type="button"
              onClick={() => setBudgetMode('personal')}
              aria-pressed={budgetMode === 'personal'}
              className={`min-h-[44px] py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                budgetMode === 'personal'
                  ? 'bg-[#4A7C59] text-white'
                  : 'text-[#2E3230] dark:text-gray-200 hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              <User size={15} />
              <span>Личный</span>
            </button>
          </div>
        </div>

        {/* Mobile Dashboard Cards Stream */}
        <div className="px-4 space-y-4 pb-2">
          {/* 1. Hero Balance Card */}
          <section className={`${SURFACE_CARD} space-y-4`}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#EAE6DD]/70 dark:bg-white/5 text-xs text-graphite-muted dark:text-gray-400 font-medium">
                {personalOnly?(personalOpeningKnown?'Личный баланс':'Итог личных операций'):'Семейный баланс'}
              </span>
              <span className="text-xs text-graphite-muted dark:text-gray-400">{currentMonthName}</span>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold font-headline text-graphite dark:text-white tracking-tight break-words tabular-nums">
                {settings.privacyMode ? '••••••' : `${formatAmount(sharedLedger)} ₽`}
              </div>
              <p className="text-xs text-graphite-muted dark:text-gray-400 mt-1">
                {personalOnly?(personalOpeningKnown?'По вашим операциям и личному начальному остатку.':'Начальный остаток не задан. Указан итог записанных операций, а не остаток на счетах.'):'Общий семейный баланс. Фильтр «Личный» меняет только историю и её показатели.'}
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex flex-wrap justify-between items-baseline gap-1.5 text-xs">
                <span className="text-graphite-muted dark:text-gray-400">{totalMonthlyLimit > 0 ? "Использовано из лимита" : "Расходы за месяц"}</span>
                <span className="font-semibold text-graphite dark:text-white tabular-nums break-words">
                  {settings.privacyMode ? '•••' : totalMonthlyLimit > 0
                    ? `${formatAmount(displayMonthSpent)} ₽ / ${formatAmount(totalMonthlyLimit)} ₽`
                    : `${formatAmount(displayMonthSpent)} ₽`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#EAE6DD] dark:bg-[#2C2C2E] overflow-hidden" aria-hidden="true">
                <div 
                  className="h-full rounded-full bg-[#4A7C59] transition-all duration-500"
                  style={{ width: `${totalMonthlyLimit > 0 ? Math.min(100, Math.round((displayMonthSpent / totalMonthlyLimit) * 100)) : 0}%` }}
                />
              </div>
            </div>
          </section>

          {/* 2. Динамика расходов Card */}
          <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-2xl p-4 sm:p-5 border border-[#EAE5DB] dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className={SECTION_HEADING}>
                  Динамика расходов
                </h3>
                <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                  {currentMonthName}, {budgetMode === 'family' ? 'семейные траты' : 'личные траты'}
                </p>
              </div>

              {/* Filter tabs: День / Неделя / Месяц */}
              <div role="group" aria-label="Период динамики расходов" className={FILTER_RAIL}>
                {(['day', 'week', 'month'] as const).map(scale => {
                  const labels: Record<string, string> = { day: 'День', week: 'Неделя', month: 'Месяц' };
                  const isCurrent = chartScale === scale;
                  return (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setChartScale(scale)}
                      aria-pressed={isCurrent}
                      className={`${FILTER_CHIP} cursor-pointer ${
                        isCurrent
                          ? FILTER_CHIP_ACTIVE
                          : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white'
                      }`}
                    >
                      {labels[scale]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrics Legend */}
            <div className="flex items-center gap-4 text-xs font-medium text-graphite dark:text-gray-300">
              <span className="inline-flex items-center gap-1">
                <span className="text-graphite-muted dark:text-gray-400">Средний:</span>
                <span className="font-bold font-headline text-primary dark:text-green-400">{formatAmount(dynamicsData.avg ?? 0)} ₽</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-graphite-muted dark:text-gray-400">Пик:</span>
                <span className="font-bold font-headline text-[#7D5A44] dark:text-amber-400">{formatAmount(dynamicsData.max ?? 0)} ₽</span>
              </span>
            </div>

            {/* Area Chart with Tooltip on Peak */}
            <div role="img" aria-label={settings.privacyMode ? 'График расходов: суммы скрыты' : `График расходов: средний ${formatAmount(dynamicsData.avg ?? 0)} ₽, максимум ${formatAmount(dynamicsData.max ?? 0)} ₽`} className="h-[156px] w-full relative min-w-0 overflow-hidden rounded-lg">
              {hasChartExpenses ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart accessibilityLayer={false} data={mobileChartData} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mobileWaveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.34} />
                      <stop offset="95%" stopColor="#4A7C59" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    minTickGap={16}
                    tick={{ fontSize: 10, fill: '#8E8E93' }} 
                  />
                  <Tooltip 
                    cursor={{ stroke: '#4A7C59', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                    wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                    isAnimationActive={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value;
                        const dataPoint = payload[0].payload;
                        const fullDate = dataPoint?.fullLabel || dataPoint?.fullDate || (dataPoint?.label ? `${dataPoint.label} ${activeMonth.toLocaleString('ru-RU', { month: 'long' })}` : '');
                        return (
                          <div className="bg-[#1C1C1E] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xl border border-white/10 pointer-events-none flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-gray-300">{fullDate}:</span>
                            <span className="text-[#4ADE80] font-headline">{settings.privacyMode ? '•••' : formatBudgetMoney(typeof val === 'number' ? val : Number(val) || 0)} {settings.privacyMode ? '' : '₽'}</span>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#4A7C59" 
                    strokeWidth={2.6} 
                    fill="url(#mobileWaveGradient)" 
                    dot={false}
                    activeDot={{ r: 5, fill: '#4A7C59', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              ) : (
                <div role="status" className="h-full flex items-center justify-center px-4 text-center text-xs text-graphite-muted dark:text-gray-400">
                  За выбранный период расходов нет
                </div>
              )}
            </div>

            {/* Footer Insight */}
            <div className="bg-[#EAE6DD]/60 dark:bg-white/5 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-graphite dark:text-gray-300">
              <ShieldCheck size={16} className="text-[#4A7C59] shrink-0" />
              <span>{dynamicsData.limit > 0 ? dynamicsData.complianceText : "Лимит не задан — сравнение с лимитом недоступно."}</span>
            </div>
          </section>

          {/* 3. Категории расходов Card */}
          <section className={`${SURFACE_CARD} space-y-3.5`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-headline text-graphite dark:text-white leading-tight">
                  Категории расходов
                </h3>
                <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                  Всего в {currentMonthNamePrepositional}: {formatAmount(displayMonthSpent || 0)} ₽
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onDrillDown('all')}
                  className="flex items-center gap-0.5 text-xs font-semibold text-primary dark:text-green-400 hover:opacity-80 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5"
                  title="Открыть аналитику всех категорий"
                >
                  <span>Все категории</span>
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCatModalId(null);
                    setIsCatModalOpen(true);
                  }}
                  title="Создать новую категорию или настроить"
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#EAE6DD] dark:bg-white/10 text-graphite dark:text-white hover:bg-primary hover:text-white dark:hover:bg-green-600 transition cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {mobileCategories.length === 0 && (
                <p className="text-sm text-graphite-muted dark:text-gray-400 py-3">
                  За выбранный период пока нет расходов по категориям.
                </p>
              )}
              {mobileCategories.map((cat, idx) => (
                <button type="button"
                  key={cat.id ? `mob-cat-${cat.id}` : `mob-cat-idx-${idx}`}
                  onClick={() => onDrillDown(cat.id || 'all')}
                  aria-label={`Аналитика категории: ${cat.name}`}
                  className="min-h-[44px] w-full text-left space-y-1.5 p-2 -mx-1 rounded-xl hover:bg-stone-100/60 dark:hover:bg-white/5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span 
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0"
                        style={{ backgroundColor: cat.bg, color: cat.color }}
                      >
                        {cat.icon}
                      </span>
                      <span className="text-xs font-medium text-graphite dark:text-white truncate">{cat.name}</span>
                      <span className="text-xs text-graphite-muted dark:text-gray-400 shrink-0">{cat.percent}%</span>
                    </div>
                    <span className="text-xs font-bold font-headline text-graphite dark:text-white tabular-nums shrink-0 ml-2">
                      {formatAmount(cat.amount)} ₽
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#EAE6DD] dark:bg-[#2C2C2E] overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, cat.percent)}%`, backgroundColor: cat.barColor }}
                    />
                  </div>
                </button>
              ))}
            </div>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-[#4A7C59]" />
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
                      className="min-h-[44px] min-w-[44px] rounded-full bg-[#EAE6DD] dark:bg-white/10 text-graphite dark:text-white hover:bg-[#4A7C59] hover:text-white transition flex items-center justify-center cursor-pointer"
                    >
                      <Plus size={15} strokeWidth={2.4} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigateTab('plans')}
                    className="flex items-center gap-0.5 text-xs font-medium text-[#4A7C59] dark:text-emerald-400 hover:underline transition cursor-pointer"
                  >
                    <span>Все</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
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
                      className="min-h-[48px] w-full text-left bg-[#EAE6DD]/40 dark:bg-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 hover:bg-[#EAE6DD]/70 dark:hover:bg-white/10 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#EAE6DE] dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-graphite-muted dark:text-gray-400 uppercase leading-none">
                            {dayLabel}
                          </span>
                          <span className="text-xs font-bold text-[#2E3230] dark:text-white leading-none mt-0.5">
                            {dayNum}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-graphite dark:text-white truncate">
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

          {/* 6. История операций Card */}
          <section className={`${SURFACE_CARD} space-y-3.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-graphite-muted dark:text-gray-400" />
                <h3 className="text-base font-bold font-headline text-graphite dark:text-white">
                  История операций
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onDrillDown('all')}
                className="flex items-center gap-0.5 text-xs font-medium text-graphite dark:text-gray-300 hover:text-primary transition"
              >
                <span>Все</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {recentMobileTransactions.length === 0 && (
                <div className="py-4 text-center space-y-2">
                  <p className="text-sm text-graphite-muted dark:text-gray-400">Операций пока нет.</p>
                  <button type="button" onClick={onOpenAddModal} className="text-sm font-semibold text-primary hover:underline">
                    Добавить первую операцию
                  </button>
                </div>
              )}
              {recentMobileTransactions.map((tx, idx) => {
                const isExpense = tx.type === 'expense';
                const txMember = members.find(m => m.id === tx.memberId) || { name: 'Участник', color: '#4A7C59' };
                const cat = categories.find(c => c.id === tx.category);
                const catLabel = cat?.label || (tx.category === 'groceries' ? 'Продукты' : tx.category === 'cafe' ? 'Фастфуд' : tx.category === 'subscriptions' ? 'Подписки' : tx.category === 'telecom' ? 'Связь' : 'Операция');
                const displayTitle = tx.note || catLabel;
                const brandKey = getMerchantBrandKey(displayTitle);
                const txDate = new Date(tx.date);
                const dateFormatted = `${txDate.getDate()} ${txDate.toLocaleString('ru-RU', { month: 'short' })}`;

                return (
                  <button type="button"
                    key={tx.id ? `mob-tx-${tx.id}` : `mob-tx-idx-${idx}`}
                    onClick={() => onEditTransaction(tx)}
                    aria-label={`Редактировать операцию: ${displayTitle}`}
                    className="min-h-[48px] w-full text-left bg-[#EAE6DD]/40 dark:bg-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-2 hover:bg-[#EAE6DD]/70 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                        <BrandIcon name={displayTitle} brandKey={brandKey} category={cat} size="sm" className="w-10 h-10 rounded-full" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-graphite dark:text-white truncate">
                          {displayTitle}
                        </h4>
                        <p className="text-[11px] text-graphite-muted dark:text-gray-400 truncate mt-0.5 flex items-center gap-1.5">
                          <span>{dateFormatted}</span>
                          <span className="font-medium" style={{ color: txMember.color }}>
                            {txMember.name}
                          </span>
                          <span>({catLabel})</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <span className="text-xs font-bold font-headline text-graphite dark:text-white tabular-nums block">
                        {settings.privacyMode ? '•••' : `${isExpense ? '-' : '+'}${formatAmount(tx.amount)} ₽`}
                      </span>
                      <span className="text-[10px] text-graphite-muted dark:text-gray-400 block mt-0.5">
                        {budgetMode === 'family' ? 'Семейная операция' : 'Личная история'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP VIEW (Visible on md and up)                       */}
      {/* ========================================================= */}
      <div className="hidden md:flex flex-col min-w-0 w-full">
        {/* Main Dashboard Container */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">
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
        {isOverDailyLimit && (
          <section 
            aria-label="Предупреждение о бюджете"
            className="relative overflow-hidden rounded-2xl bg-[#FFF7ED] dark:bg-[#2A1E17] border border-[#FDBA74]/60 dark:border-[#EA580C]/40 p-4 sm:p-5 shadow-xs transition-all"
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
                    Сегодня потрачено <strong className="font-mono font-bold text-[#9A3412] dark:text-orange-400">{formatAmount(spentToday)} ₽</strong> при плановом лимите <strong className="font-mono">{formatAmount(dailyLimit)} ₽</strong>. Резерв {personalOnly?'личного':'семейного'} бюджета скорректирован. Рекомендуем пересмотреть траты на завтра.
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
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-5">
          {/* Card 1: ОБЩИЙ БАЛАНС */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-surface-border dark:border-white/5 shadow-sm flex flex-col justify-between hover:border-[#CADACF] dark:hover:border-white/15 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-primary font-bold text-[11px] uppercase tracking-wider">
                <span>{personalOnly?(personalOpeningKnown?'ЛИЧНЫЙ БАЛАНС':'ИТОГ ЛИЧНЫХ ОПЕРАЦИЙ'):'СЕМЕЙНЫЙ БАЛАНС'}</span>
              </div>
              <span className="text-[10px] bg-primary-light dark:bg-primary/20 text-primary dark:text-green-400 font-semibold px-2 py-0.5 rounded-full border border-[#D5E5D9] dark:border-transparent">
                {personalOnly?'Личный':'Общий'}
              </span>
            </div>
            <div className="my-3 flex items-baseline">
              <span className="text-3xl lg:text-4xl font-headline font-bold text-graphite dark:text-white tracking-tight break-words min-w-0 inline-flex flex-wrap items-baseline gap-1.5">
                {formatAmount(sharedLedger)} <span className="text-2xl font-light text-primary">₽</span>
              </span>
            </div>
            <div className="pt-2 border-t border-[#F2EFEB] dark:border-white/5 flex items-center justify-between text-xs text-graphite-muted dark:text-gray-400">
              <span className={`inline-flex items-center font-bold ${lastMonthComparison.isPositive ? 'text-[#2F673E] dark:text-green-400' : 'text-[#C2410C] dark:text-orange-400'}`}>
                {lastMonthComparison.isPositive === true ? (
                  <TrendingDown size={14} className="mr-0.5" />
                ) : lastMonthComparison.isPositive === false ? (
                  <TrendingUp size={14} className="mr-0.5" />
                ) : null}
                {lastMonthComparison.text}
              </span>
              <span className="text-[11px]">расходы к прошлому месяцу</span>
            </div>
          </div>

          {/* Card 2: НА ДЕНЬ */}
          <div className={`bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-all ${
            isOverDailyLimit 
              ? 'border-[#FDBA74] dark:border-[#C2410C]/40 hover:border-[#F97316]' 
              : 'border-surface-border dark:border-white/5 hover:border-[#CADACF] dark:hover:border-white/15'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isOverDailyLimit ? 'text-[#C2410C] dark:text-orange-400' : 'text-graphite dark:text-gray-200'
              }`}>
                <TrendingUp size={14} className={isOverDailyLimit ? 'text-[#C2410C]' : 'text-primary'} />
                НА ДЕНЬ
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                isOverDailyLimit 
                  ? 'bg-[#FFEDD5] dark:bg-[#432314] text-[#C2410C] dark:text-orange-400 border-[#FDBA74] dark:border-transparent' 
                  : 'bg-primary-light dark:bg-primary/20 text-primary dark:text-green-400 border-[#D5E5D9] dark:border-transparent'
              }`}>
                {!personalOpeningKnown?'Укажите остаток':isOverDailyLimit ? 'Превышен' : 'В норме'}
              </span>
            </div>
            <div className="my-3 flex items-baseline">
              <span className={`text-2xl lg:text-3xl font-headline font-bold tracking-tight break-words min-w-0 inline-flex flex-wrap items-baseline gap-1 ${
                isOverDailyLimit ? 'text-[#9A3412] dark:text-orange-400' : 'text-graphite dark:text-white'
              }`}>
                {personalOpeningKnown?formatAmount(dailyLimit):'—'} <span className="text-sm text-graphite-muted dark:text-gray-400 font-normal">₽</span>
              </span>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-graphite-muted dark:text-gray-400 mb-1 font-medium">
                <span>Лимит дня</span>
                <span className="font-mono">{dailyUsagePercent}%</span>
              </div>
              <div className="w-full bg-[#EFEBE3] dark:bg-[#2C2C2E] h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${isOverDailyLimit ? 'bg-[#EA580C]' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, dailyUsagePercent)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Card 3: ТРАТЫ СЕГОДНЯ */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-surface-border dark:border-white/5 shadow-sm flex flex-col justify-between hover:border-[#EDDCD4] dark:hover:border-white/15 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-graphite dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownRight size={14} className="text-clay" />
                ТРАТЫ
              </span>
              <span className="text-[10px] text-graphite-muted dark:text-gray-400">Сегодня</span>
            </div>
            <div className="my-3 flex items-baseline">
              <span className={`text-2xl lg:text-3xl font-headline font-bold tracking-tight break-words min-w-0 inline-flex flex-wrap items-baseline gap-1 ${
                isOverDailyLimit ? 'text-[#B25E41]' : 'text-graphite dark:text-white'
              }`}>
                {formatAmount(spentToday)} <span className="text-sm text-graphite-muted dark:text-gray-400 font-normal">₽</span>
              </span>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-graphite-muted dark:text-gray-400 mb-1 font-medium">
                <span className="whitespace-nowrap">{personalOpeningKnown?`План: до ${formatAmount(dailyLimit)} ₽`:'Начальный остаток не задан'}</span>
                {isOverDailyLimit && (
                  <span className="text-xs font-mono font-bold text-clay">+{formatAmount(overLimitDelta)} ₽</span>
                )}
              </div>
              <div className="w-full bg-[#EFEBE3] dark:bg-[#2C2C2E] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-clay h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(100, dailyUsagePercent)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Card 4: СЕМЕЙНЫЙ РЕЗЕРВ */}
          <button type="button"
            onClick={() => setIsReserveModalOpen(true)}
            aria-label={personalOnly?'Открыть подробности личного резерва':'Открыть подробности семейного резерва'}
            className="w-full text-left bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-surface-border dark:border-white/5 shadow-sm flex flex-col justify-between hover:border-[#E8DEC7] dark:hover:border-white/15 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-graphite dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={14} className="text-warm-amber" />
                {personalOnly?'ЛИЧНЫЙ РЕЗЕРВ':'СЕМЕЙНЫЙ РЕЗЕРВ'}
              </span>
              <span className="text-[10px] bg-[#FAF1E3] dark:bg-[#3D2C1E] text-[#845E20] dark:text-amber-400 font-bold px-2 py-0.5 rounded-md border border-[#EEDFCA] dark:border-transparent">
                {reservePercent}%
              </span>
            </div>
            <div className="my-3 flex items-baseline">
              <span className="text-2xl lg:text-3xl font-headline font-bold text-graphite dark:text-white tracking-tight whitespace-nowrap inline-flex items-baseline gap-1">
                {formatAmount(reservedAmount)} <span className="text-sm text-graphite-muted dark:text-gray-400 font-normal">₽</span>
              </span>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-graphite-muted dark:text-gray-400 mb-1 font-medium">
                <span className="whitespace-nowrap">Цель: {formatAmount(targetReserveGoal)} ₽</span>
                <span className="font-mono text-[#845E20] dark:text-amber-400 font-semibold group-hover:underline">Подробнее →</span>
              </div>
              <div className="w-full bg-[#EFEBE3] dark:bg-[#2C2C2E] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-warm-amber h-full rounded-full transition-all" 
                  style={{ width: `${reservePercent}%` }}
                ></div>
              </div>
            </div>
          </button>
        </section>

        {/* 2. Основная рабочая область (12 колонок: 8 слева + 4 справа, выровненных по нижнему краю) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT COLUMN: 8 columns */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            {/* Блок «Динамика расходов» */}
            <div className="bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/5 rounded-3xl p-6 shadow-sm">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#F0ECE4] dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isOverDailyLimit && chartScale === 'day' ? 'bg-[#FFF7ED] dark:bg-[#3D251A] text-[#C2410C]' : 'bg-primary-light dark:bg-primary/20 text-primary'}`}>
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-headline text-graphite dark:text-white tracking-wide uppercase">ДИНАМИКА РАСХОДОВ</h3>
                    <span className="text-xs text-graphite-muted dark:text-gray-400">{dynamicsData.subtitle}</span>
                  </div>
                </div>

                {/* Controls: AVG / MAX & Day-Week-Month Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#2C2C2E] border border-surface-border dark:border-white/5 text-xs font-semibold text-graphite dark:text-gray-200">
                    <span className="text-[10px] text-graphite-muted dark:text-gray-400 uppercase font-mono">AVG</span>
                    <span className="font-mono">{formatAmount(dynamicsData.avg)} ₽</span>
                  </span>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                    chartScale === 'day' && isOverDailyLimit 
                      ? 'bg-[#FFF7ED] dark:bg-[#3D251A] border-[#FDBA74] text-[#9A3412] dark:text-orange-400' 
                      : 'bg-[#FCF6EE] dark:bg-[#36271A] border-[#ECDCC4] dark:border-transparent text-[#8C5D23] dark:text-amber-400'
                  }`}>
                    <span className="text-[10px] uppercase font-mono font-bold">
                      {chartScale === 'day' && isOverDailyLimit ? 'MAX СЕГОДНЯ' : 'MAX'}
                    </span>
                    <span className="font-mono font-bold">
                      {formatAmount(dynamicsData.max)} ₽
                    </span>
                  </span>

                  <div role="group" aria-label="Период динамики расходов на ПК" className="flex max-w-full overflow-x-auto rounded-xl bg-surface-subtle dark:bg-[#2C2C2E] p-0.5 border border-surface-border dark:border-white/5 ml-1">
                    {(['day', 'week', 'month'] as const).map(scale => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => setChartScale(scale)}
                        aria-pressed={chartScale === scale}
                        className={`min-h-[44px] shrink-0 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                          chartScale === scale
                            ? 'font-semibold text-graphite dark:text-white bg-white dark:bg-[#1C1C1E] shadow-xs'
                            : 'font-medium text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white'
                        }`}
                      >
                        {scale === 'day' ? 'День' : scale === 'week' ? 'Неделя' : 'Месяц'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart Area */}
              <div className="relative py-6 min-h-[300px] flex flex-col justify-end overflow-hidden">
                <div className="w-full h-[220px]">
                  {hasChartExpenses ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={dynamicsData.points} 
                      margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
                      onClick={(e: any) => {
                        const payloadData = e?.activePayload?.[0]?.payload;
                        if (!payloadData?.dateObj) return;
                        if (chartScale === 'month') {
                          handleMonthChange(new Date(payloadData.dateObj));
                        } else {
                          setSelectedDayDetailDate(new Date(payloadData.dateObj));
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <defs>
                        <linearGradient id="terraGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isOverDailyLimit && chartScale === 'day' ? '#C2410C' : '#4A7C59'} stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#4A7C59" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.15)" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#8C948E' }} 
                        dy={6}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#8C948E' }}
                        tickFormatter={(val) => settings.privacyMode ? '•••' : `${val >= 1000 ? `${(val/1000).toFixed(0)}к` : val} ₽`}
                      />
                      {dynamicsData.limit > 0 && (
                        <ReferenceLine 
                          y={dynamicsData.limit} 
                          stroke={isOverDailyLimit && chartScale === 'day' ? '#EA580C' : '#F97316'} 
                          strokeDasharray="4 4" 
                          label={{ 
                            value: settings.privacyMode ? 'Лимит скрыт' : dynamicsData.limitLabel, 
                            position: 'insideTopRight', 
                            fill: isOverDailyLimit && chartScale === 'day' ? '#C2410C' : '#C48C3B',
                            fontSize: 10,
                            fontWeight: 'bold'
                          }} 
                        />
                      )}
                      <Tooltip 
                        cursor={{ stroke: '#4A7C59', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                        wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                        isAnimationActive={false}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const val = payload[0].value;
                            const hasOverlimit = dynamicsData.limit > 0 && data.amount > dynamicsData.limit;
                            return (
                              <div className="bg-[#1C1C1E] dark:bg-[#1C1C1E] text-white border border-white/15 px-3.5 py-2.5 rounded-xl shadow-2xl flex flex-col gap-1.5 pointer-events-none z-50">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-[#4ADE80] shrink-0"></span>
                                  <span className="text-xs font-mono font-bold">
                                    {data.fullLabel || `${data.label} ${activeMonth.toLocaleString('ru-RU', { month: 'long' })}`}: {formatAmount(typeof val === 'number' ? val : data.amount)} ₽
                                  </span>
                                </div>
                                {dynamicsData.limit > 0 && (
                                  <div className="text-[11px] text-gray-300 flex items-center justify-between gap-4 border-t border-white/10 pt-1">
                                    <span>План лимита: {formatAmount(dynamicsData.limit)} ₽</span>
                                    {hasOverlimit ? (
                                      <span className="text-[#F87171] font-bold">+{formatAmount(data.amount - dynamicsData.limit)} ₽</span>
                                    ) : (
                                      <span className="text-[#4ADE80] font-semibold">В норме</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke={isOverDailyLimit && chartScale === 'day' ? '#C2410C' : '#4A7C59'} 
                        strokeWidth={2.8} 
                        fill="url(#terraGradient)" 
                        dot={false}
                        activeDot={{ 
                          r: 6, 
                          fill: isOverDailyLimit && chartScale === 'day' ? '#C2410C' : '#4A7C59', 
                          stroke: '#FFFFFF', 
                          strokeWidth: 2 
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  ) : (
                    <div role="status" className="h-full flex items-center justify-center text-center text-sm text-graphite-muted dark:text-gray-400">
                      За выбранный период расходов нет
                    </div>
                  )}
                </div>
              </div>

              {/* Footer summary */}
              <div className="pt-4 border-t border-[#F0ECE4] dark:border-white/5 flex items-center justify-between text-xs text-graphite-muted dark:text-gray-400">
                <span>{dynamicsData.complianceText}</span>
                <button 
                  type="button"
                  onClick={() => onNavigateTab('budget')}
                  className="text-primary hover:text-primary-dark dark:hover:text-green-400 font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  Подробный отчет →
                </button>
              </div>
            </div>

            {/* Сетка «Категории расходов» (4 карточки, растянута до нижней границы) */}
            <div className="bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/5 rounded-3xl p-6 shadow-sm flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-4 border-b border-[#F0ECE4] dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#FAF1E3] dark:bg-[#3D2C1E] text-warm-amber">
                    <PieChart size={16} />
                  </div>
                  <h3 className="text-sm font-bold font-headline text-graphite dark:text-white uppercase tracking-wide">
                    КАТЕГОРИИ РАСХОДОВ
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-graphite-muted dark:text-gray-400">
                    Всего в этом месяце: <strong className="text-graphite dark:text-white font-bold font-mono whitespace-nowrap">{formatAmount(categoryBreakdown.total)} ₽</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCatModalId(null);
                      setIsCatModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#FAF8F5] dark:bg-[#2C2C2E] border border-surface-border dark:border-white/10 text-graphite dark:text-white hover:text-primary dark:hover:text-green-400 hover:border-primary transition cursor-pointer"
                    title="Создать новую категорию или настроить"
                  >
                    <Plus size={13} />
                    <span>Категория</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDrillDown('all')}
                    className="text-xs text-primary dark:text-green-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                    title="Открыть аналитику всех категорий"
                  >
                    <span>Аналитика</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-auto pt-4">
                {categoryBreakdown.items.length === 0 && (
                  <p className="col-span-full py-5 text-sm text-graphite-muted dark:text-gray-400">
                    За выбранный период расходов по категориям пока нет.
                  </p>
                )}
                {categoryBreakdown.items.map((cat, idx) => (
                  <button type="button"
                    key={cat.id ? `desk-cat-${cat.id}` : `desk-cat-idx-${idx}`}
                    onClick={() => onDrillDown(cat.id)}
                    aria-label={`Аналитика категории: ${cat.name}`}
                    className="min-h-[44px] w-full text-left p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#2C2C2E] border border-surface-border dark:border-white/5 flex flex-col justify-between hover:border-[#DFD7CA] dark:hover:border-white/20 transition cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-graphite dark:text-white truncate group-hover:text-primary transition">{cat.name}</span>
                      <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: cat.style.color }}>
                        {cat.percent}%
                      </span>
                    </div>
                    <p className="text-base font-bold font-headline text-graphite dark:text-white mt-3 whitespace-nowrap">
                      {formatAmount(cat.amount)} ₽
                    </p>
                    <div className="w-full bg-[#EAE5DC] dark:bg-black/40 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300" 
                        style={{ width: `${cat.percent}%`, backgroundColor: cat.color || cat.style?.color || '#4A7C59' }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 4 columns */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            {/* Виджет «Список покупок» */}
            {showShopping && <div className="bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/5 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#F0ECE4] dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary-light dark:bg-primary/20 text-primary">
                    <ShoppingBag size={16} />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-headline text-graphite dark:text-white uppercase tracking-wide">
                      СПИСОК ПОКУПОК
                    </h3>
                    <span className="w-5 h-5 rounded-full bg-primary-light dark:bg-primary/20 text-primary dark:text-green-400 text-[11px] font-bold flex items-center justify-center border border-[#D5E5D9] dark:border-transparent">
                      {activeShoppingItems.length}
                    </span>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => onNavigateTab('shopping')}
                  className="text-xs text-primary hover:text-primary-dark dark:hover:text-green-400 transition flex items-center gap-1 font-semibold"
                >
                  Все ({activeShoppingItems.length})
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* List Items */}
              <ul className="divide-y divide-[#F2EFEB] dark:divide-white/5 my-2" role="list">
                {activeShoppingItems.length === 0 ? (
                  <li className="py-6 text-center text-xs text-graphite-muted dark:text-gray-400">
                    Все покупки сделаны! 🎉
                  </li>
                ) : (
                  activeShoppingItems.slice(0, 4).map((item, idx) => (
                    <li 
                      key={item.id ? `desk-shop-${item.id}` : `desk-shop-idx-${idx}`} 
                      onClick={() => handleToggleShopping(item)}
                      className="py-3 flex items-center justify-between group cursor-pointer transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] px-1 rounded-xl"
                    >
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
                    placeholder="Быстро добавить (чипсы 2 шт, молоко 1 л)..."
                    className="w-full bg-[#FAF8F5] dark:bg-[#2C2C2E] border border-surface-border dark:border-white/5 rounded-xl text-xs text-graphite dark:text-white placeholder-graphite-muted dark:placeholder-gray-400 py-2.5 pl-3 pr-10 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-[#3A3A3C] transition"
                  />
                  <button 
                    type="submit"
                    disabled={!newShoppingTitle.trim() || isAddingShopping}
                    className="absolute right-1.5 p-1.5 bg-primary-light dark:bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-lg transition disabled:opacity-40 cursor-pointer"
                    title="Добавить в список покупок"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>

                {liveParsedShopping && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#4a7c59] dark:text-green-400 font-semibold px-1 animate-in fade-in">
                    <span>{liveParsedShopping.title}</span>
                    <span className="font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.2 rounded text-[10px] text-stone-700 dark:text-stone-300">
                      {liveParsedShopping.amount} {liveParsedShopping.unit}
                    </span>
                  </div>
                )}
              </form>
            </div>}

            {/* Виджет «События на этой неделе» (ПК, скрыт если нет событий) */}
            {showWeekEvents && upcomingWeekEvents.length > 0 && (
              <div className="bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/5 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#F0ECE4] dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary-light dark:bg-primary/20 text-primary">
                      <Calendar size={16} />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold font-headline text-graphite dark:text-white uppercase tracking-wide">
                        СОБЫТИЯ НА ЭТОЙ НЕДЕЛЕ
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
                      className="text-xs text-primary hover:text-primary-dark dark:hover:text-green-400 transition flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      Все
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
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
                        className="min-h-[48px] w-full text-left p-2.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#2C2C2E] border border-surface-border dark:border-white/5 flex items-center justify-between gap-3 hover:border-[#DFD7CA] dark:hover:border-white/20 transition cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#EAE5DC] dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-graphite-muted dark:text-gray-400 uppercase leading-none">
                              {dayLabel}
                            </span>
                            <span className="text-xs font-bold text-[#2E3230] dark:text-white leading-none mt-0.5">
                              {dayNum}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-graphite dark:text-white group-hover:text-primary transition truncate">
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

            {/* Виджет «История операций» (компактный список без пустых разрывов) */}
            <div className="bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col justify-start">
              <div className="flex items-center justify-between pb-4 border-b border-[#F0ECE4] dark:border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#FAF1E3] dark:bg-[#3D2C1E] text-warm-amber">
                    <History size={16} />
                  </div>
                  <h3 className="text-sm font-bold font-headline text-graphite dark:text-white uppercase tracking-wide">
                    ИСТОРИЯ ОПЕРАЦИЙ
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => onDrillDown('all')}
                  className="text-xs text-primary hover:text-primary-dark dark:hover:text-green-400 transition flex items-center gap-1 font-semibold cursor-pointer"
                >
                  Все
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-2.5 mt-4 flex flex-col justify-start">
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
                    const txMember = members.find(m => m.id === tx.memberId) || currentMember;
                    const catLabel = txCat?.label || 'Прочее';
                    const displayTitle = tx.note || tx.rawNote || catLabel;
                    const brandKey = getMerchantBrandKey(displayTitle);
                    const isExpense = tx.type === 'expense';

                    return (
                      <button type="button"
                        key={tx.id ? `desk-tx-${tx.id}` : `desk-tx-idx-${idx}`}
                        onClick={() => onEditTransaction(tx)}
                        aria-label={`Редактировать операцию: ${displayTitle}`}
                        className={`min-h-[48px] w-full text-left flex items-center justify-between p-3 rounded-2xl border transition group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isTxToday && isExpense && isOverDailyLimit && idx === 0
                            ? 'bg-[#FFF7ED] dark:bg-[#2A1E17] hover:bg-[#FFEDD5] dark:hover:bg-[#3D251A] border-[#FDBA74] dark:border-[#C2410C]/40'
                            : 'bg-[#FAF8F5] dark:bg-[#2C2C2E] hover:bg-[#F3EFE9] dark:hover:bg-[#3A3A3C] border-surface-border dark:border-white/5'
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
                            <h4 className="text-sm font-bold text-graphite dark:text-white group-hover:text-primary transition truncate flex items-center gap-1.5">
                              {displayTitle}
                              {isTxToday && (
                                <span className="text-[9px] bg-[#C2410C] text-white px-1.5 py-0.2 rounded font-mono font-medium flex-shrink-0">
                                  СЕГОДНЯ
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-graphite-muted dark:text-gray-400 flex items-center gap-1.5 mt-0.5 truncate">
                              <span>{dateFormatted}</span>
                              <span className="font-medium" style={{ color: txMember.color }}>
                                {txMember.name}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-2">
                          <span className={`text-sm font-bold font-mono whitespace-nowrap block transition ${
                            isExpense 
                              ? (isTxToday && isOverDailyLimit ? 'text-[#C2410C]' : 'text-graphite dark:text-white group-hover:text-clay') 
                              : 'text-[#2F673E] dark:text-green-400'
                          }`}>
                            {isExpense ? '-' : '+'}{formatAmount(tx.amount)} ₽
                          </span>
                          <p className="text-[10px] text-graphite-muted dark:text-gray-400 truncate max-w-[90px]">{catLabel}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
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
          savingsRate={savingsRate}
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
