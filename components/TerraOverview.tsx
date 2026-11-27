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
import {overviewLimitState} from '../utils/overviewLimitState';
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
      text: `${sign}${diff.toLocaleString('ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1})}%`,
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
  const monthLimit=overviewLimitState(displayMonthSpent,totalMonthlyLimit);
  const monthlySummary=!settings.privacyMode&&monthLimit?<div data-testid="overview-month-limit" data-limit-status={monthLimit.status} className="space-y-1.5 min-w-0">
    <div className="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-1 text-xs">
      <span className="text-[var(--terra-muted)]">Месячный лимит</span>
      <span className="font-semibold tabular-nums text-[var(--terra-ink)] [overflow-wrap:anywhere]">{formatAmount(totalMonthlyLimit)} ₽</span>
    </div>
    <div className="h-2 rounded-full bg-[var(--terra-soft)] overflow-hidden" role="progressbar" aria-label="Использование месячного лимита" aria-valuemin={0} aria-valuemax={100} aria-valuenow={monthLimit.barWidth} aria-valuetext={monthLimit.percentage.toLocaleString('ru-RU',{maximumFractionDigits:1})+'% использовано'}>
      <div className={'h-full rounded-full terra-progress '+(monthLimit.status==='over'?'bg-[var(--terra-danger-text)]':monthLimit.status==='near'||monthLimit.status==='exhausted'?'bg-[var(--terra-offline-text)]':'bg-[var(--terra-primary-solid)]')} style={{width:monthLimit.barWidth+'%'}}/>
    </div>
    <div className={'flex flex-wrap justify-between gap-x-2 gap-y-1 text-xs tabular-nums '+(monthLimit.status==='over'?'text-[var(--terra-danger-text)]':monthLimit.status==='near'||monthLimit.status==='exhausted'?'text-[var(--terra-offline-text)]':'text-[var(--terra-muted)]')}>
      <span>{monthLimit.status==='over'?'Превышение: '+formatAmount(monthLimit.difference)+' ₽':monthLimit.status==='exhausted'?'Лимит исчерпан':'Осталось: '+formatAmount(monthLimit.difference)+' ₽'}</span>
      <span className="font-semibold">{monthLimit.percentage.toLocaleString('ru-RU',{maximumFractionDigits:1})}%</span>
    </div>
  </div>:null;
  const monthMoneyPair = <dl data-overview-month-money className="terra-overview-money-pair grid grid-cols-2 gap-3 tabular-nums">
    <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">{!personalOnly&&budgetMode==='personal'?'Личные доходы':'Доходы за месяц'}</dt><dd className="terra-overview-summary-value text-base leading-snug font-semibold text-[var(--terra-primary-text)] [overflow-wrap:anywhere]">{settings.privacyMode?'••••••':formatAmount(displayMonthIncome)+' ₽'}</dd></div>
    <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">{!personalOnly&&budgetMode==='personal'?'Личные расходы':'Расходы за месяц'}</dt><dd className="terra-overview-summary-value text-base leading-snug font-semibold text-[var(--terra-ink)] [overflow-wrap:anywhere]">{settings.privacyMode?'••••••':formatAmount(displayMonthSpent)+' ₽'}</dd></div>
  </dl>;
  const dailySummary = (
    <div className="space-y-1.5 min-w-0" data-testid="overview-daily-summary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 data-overview-summary-heading className="text-sm font-semibold text-[var(--terra-ink)]">{!personalOnly&&budgetMode==='personal'?'Сегодня · семья':'Сегодня'}</h3>
        {!settings.privacyMode&&personalOpeningKnown&&dailyLimit>0&&isOverDailyLimit&&<span className="text-xs font-semibold text-[var(--terra-danger-text)]">Выше ориентира</span>}
      </div>
      <dl className="terra-daily-pair">
        <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Ориентир на день</dt><dd className="terra-overview-summary-value text-base leading-snug font-semibold tabular-nums [overflow-wrap:anywhere]">{personalOpeningKnown?formatAmount(dailyLimit)+' ₽':'—'}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Потрачено</dt><dd className={`terra-overview-summary-value text-base leading-snug font-semibold tabular-nums [overflow-wrap:anywhere] ${!settings.privacyMode&&isOverDailyLimit?'text-[var(--terra-danger-text)]':'text-[var(--terra-ink)]'}`}>{formatAmount(spentToday)} ₽</dd></div>
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

  const renderHistoryRows=(rows:Transaction[])=>rows.map((tx,idx)=>{
    const cat=categories.find(c=>c.id===tx.category);
    const catLabel=cat?.label||'Операция';
    const title=tx.note||tx.rawNote||catLabel;
    const date=new Date(tx.date).toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
    const member=members.find(m=>m.id===tx.memberId)?.name||'Участник';
    const isExpense=tx.type==='expense';
    return <button type="button" key={tx.id||idx} onClick={()=>onEditTransaction(tx)} aria-label={`Редактировать операцию: ${title}`}
      data-overview-history-row className="terra-overview-history-row min-h-[56px] w-full text-left px-1 py-2 hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
      <BrandIcon name={title} brandKey={getMerchantBrandKey(title)} category={cat} size="sm" className="w-9 h-9 rounded-xl"/>
      <span className="min-w-0 flex flex-col gap-1">
        <span data-overview-history-title className="text-sm font-semibold text-[var(--terra-ink)] [overflow-wrap:anywhere] leading-snug">{title}</span>
        <span data-overview-history-meta className="text-xs text-[var(--terra-muted)] [overflow-wrap:anywhere]">{date}{!personalOnly&&budgetMode==='family'?' · '+member:''}</span>
      </span>
      <span className="min-w-0 flex flex-col gap-1 text-right">
        <span data-overview-history-amount className={'text-sm font-semibold tabular-nums [overflow-wrap:anywhere] '+(isExpense?'text-[var(--terra-ink)]':'text-[var(--terra-primary-text)]')}>{settings.privacyMode?'•••':(isExpense?'-':'+')+formatAmount(tx.amount)+' ₽'}</span>
        <span className="text-xs text-[var(--terra-muted)] [overflow-wrap:anywhere]">{catLabel}</span>
      </span>
    </button>;
  });
  const renderCategoryRows=()=>mobileCategories.slice(0,OVERVIEW_CATEGORY_PREVIEW_LIMIT).map((cat,idx)=><button type="button" key={cat.id||idx} onClick={()=>onDrillDown(cat.id||'all')}
    aria-label={`Аналитика категории: ${cat.name}`} data-overview-category-row
    className="min-h-[56px] w-full text-left px-1 py-2 hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] space-y-1.5">
    <span className="terra-overview-category-row">
      <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{backgroundColor:cat.bg,color:cat.color}} aria-hidden="true">{cat.icon}</span>
      <span data-overview-category-title className="text-sm font-medium text-[var(--terra-ink)] min-w-0 [overflow-wrap:anywhere]">{cat.name}</span>
      <span className="min-w-0 text-right flex flex-col gap-0.5">
        <span data-overview-category-amount className="text-sm font-semibold text-[var(--terra-ink)] tabular-nums [overflow-wrap:anywhere]">{formatAmount(cat.amount)} ₽</span>
        <span data-overview-category-percent className="text-xs text-[var(--terra-muted)] tabular-nums">{settings.privacyMode?'•••':cat.percent+'%'}</span>
      </span>
    </span>
    {!settings.privacyMode&&<span className="block h-1.5 rounded-full bg-[var(--terra-soft)] overflow-hidden"><span className="block h-full rounded-full terra-progress" style={{width:Math.min(100,cat.percent)+'%',backgroundColor:cat.barColor}}/></span>}
  </button>);

  return (
    <div data-testid="overview-scroll-container" className="flex-1 min-h-0 flex flex-col min-w-0 bg-[var(--terra-canvas)] overflow-y-auto overscroll-y-contain no-scrollbar pb-4 md:pb-8 text-graphite dark:text-gray-100 transition-colors">
      {/* ========================================================= */}
      {/* MOBILE VIEW (strictly matches screenshot image.png on < md) */}
      {/* ========================================================= */}
      <div className="terra-layout-context md:hidden flex flex-col min-w-0 w-full" data-terra-layout="mobile">
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
        <div data-overview-mobile-controls className="terra-overview-mobile-controls terra-layout-inset pt-2">
        <div className={isMonthPickerOpen?'terra-overview-month-open':'min-w-0'} data-testid="overview-month-selector">
          <button type="button" onClick={()=>setIsMonthPickerOpen(open=>!open)}
            aria-label={`Выбрать месяц: ${currentMonthName}`} aria-expanded={isMonthPickerOpen} aria-controls="overview-month-controls-mobile"
            className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE+' w-full max-w-full terra-press'}>
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
        {!personalOnly&&<div className="min-w-0 w-full" data-testid="overview-scope-mobile">
          <div role="group" aria-label="Область бюджета" className="terra-overview-scope w-full bg-[var(--terra-soft)] rounded-xl grid grid-cols-2 gap-0.5">
            <button
              type="button"
              onClick={() => setBudgetMode('family')}
              aria-pressed={budgetMode === 'family'}
              className={`h-11 min-w-0 px-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] text-sm font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                budgetMode === 'family'
                  ? 'bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)]'
                  : 'text-[#2E3230] dark:text-gray-200 hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              <span>Семейный</span>
            </button>
            <button
              type="button"
              onClick={() => setBudgetMode('personal')}
              aria-pressed={budgetMode === 'personal'}
              className={`h-11 min-w-0 px-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] text-sm font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                budgetMode === 'personal'
                  ? 'bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)]'
                  : 'text-[#2E3230] dark:text-gray-200 hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              <span>Личный</span>
            </button>
          </div>
        </div>}

        </div>
        {/* Mobile Dashboard Cards Stream */}
        <div data-terra-grid="mobile" className="terra-layout-grid terra-layout-inset pt-3 pb-2">
          {/* 1. Hero Balance Card */}
          <section data-testid="overview-balance-mobile" className={`${DASHBOARD_CARD} terra-layout-surface terra-overview-balance-card space-y-2`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 data-overview-summary-heading className="text-sm font-semibold text-[var(--terra-ink)]">
                  {personalOnly?(personalOpeningKnown?'Личный баланс':'Итог личных операций'):'Семейный баланс'}
                </h2>
                <div data-testid="overview-balance-value-mobile" className="mt-0.5 terra-overview-main-amount text-[30px] leading-tight font-headline font-bold text-[var(--terra-ink)] tabular-nums [overflow-wrap:anywhere]" data-negative={!settings.privacyMode&&sharedLedger<0}>
                  {settings.privacyMode?'••••••':formatAmount(sharedLedger)+' ₽'}
                </div>
              </div>
              <button type="button" aria-label={settings.privacyMode?'Показать суммы':'Скрыть суммы'} aria-pressed={settings.privacyMode===true}
                onClick={()=>updateSettings({privacyMode:!settings.privacyMode})} className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE+' terra-press'}>
                {settings.privacyMode?<EyeOff size={18}/>:<Eye size={18}/>}
              </button>
            </div>
            {balanceExplanation&&<p data-testid="overview-balance-explanation" className="text-xs text-[var(--terra-muted)]">{balanceExplanation}</p>}
            <div className="pt-2 border-t border-[var(--terra-border)]">{monthMoneyPair}</div>
            {monthlySummary}
            {isCurrentCalendarMonth&&<div className="space-y-1.5 pt-2 border-t border-[var(--terra-border)]" data-testid="overview-daily-mobile">
            {dailySummary}
            <button type="button" onClick={() => personalOpeningKnown?setIsReserveModalOpen(true):onOpenSettings()} aria-label={personalOnly?'Открыть подробности личного резерва':'Открыть подробности семейного резерва'} className="terra-overview-reserve-link min-h-[44px] w-full flex flex-wrap items-center justify-between gap-2 text-left border-t border-[var(--terra-border)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
              <span className="text-sm text-[var(--terra-muted)]">{personalOnly?'Личный резерв':'Семейный резерв'}</span><span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-[var(--terra-ink)]">{formatAmount(reservedAmount)} ₽<ChevronRight size={16} aria-hidden="true"/></span>
            </button>
            </div>}
          </section>

          {/* 2. Динамика расходов Card */}
          <section data-testid="overview-chart-mobile" className={`${DASHBOARD_CARD} terra-layout-surface terra-overview-chart-card space-y-2`}>
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
          <section data-testid="overview-history-mobile" className={`${SURFACE_CARD} terra-layout-surface terra-overview-list-card space-y-2`}>
            <div data-overview-section-head className="terra-overview-section-head flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className={SECTION_HEADING}>
                  История операций
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onDrillDown('all')}
                data-testid="overview-history-all-mobile" aria-label="Все операции" className="terra-overview-link min-h-[44px] px-2 flex items-center gap-1 text-sm font-semibold text-[var(--terra-primary-text)] transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
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
              {renderHistoryRows(recentMobileTransactions)}
            </div>
          </section>
          {/* 3. Категории расходов Card */}
          <section data-testid="overview-categories-mobile" className={`${SURFACE_CARD} terra-layout-surface terra-overview-list-card space-y-2`}>
            <div data-overview-section-head className="terra-overview-section-head terra-overview-category-header flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className={SECTION_HEADING}>
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
                  className="terra-overview-link min-h-[44px] flex items-center gap-1 text-sm font-semibold text-[var(--terra-primary-text)] transition-colors cursor-pointer px-2 rounded-lg hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
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
              {renderCategoryRows()}
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
            liveParsedShopping={liveParsedShopping}
          />}

          {/* 5. События на текущую неделю Card (скрыт, если событий на неделе нет) */}
          {showWeekEvents && upcomingWeekEvents.length > 0 && (
            <section data-testid="overview-events-mobile" className={`${SURFACE_CARD} terra-layout-surface space-y-2`}>
              <div data-overview-section-head className="terra-overview-section-head terra-overview-event-head flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className={SECTION_HEADING}>
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
                    className="terra-overview-link min-h-[44px] px-2 rounded-lg flex items-center gap-1 text-sm font-semibold text-[var(--terra-primary-text)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] cursor-pointer"
                  >
                    <span>Все</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[var(--terra-border)]">
                {upcomingWeekEvents.slice(0,3).map((ev, idx) => {
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
                          <p className="text-sm font-semibold text-[var(--terra-ink)] [overflow-wrap:anywhere]">
                            {ev.title}
                          </p>
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-[var(--terra-muted)] mt-0.5">
                            <span className="font-semibold text-[#2E3230] dark:text-gray-200">{ev.time}</span>
                            <span className="font-medium text-[var(--terra-muted)]">
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
        <div data-terra-layout="desktop" className="terra-layout-context terra-overview-layout terra-layout-page max-w-[1600px] mx-auto w-full">
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
        {isCurrentCalendarMonth&&!settings.privacyMode&&isOverDailyLimit&&dailyLimit>0&&<div role="status" aria-label="Предупреждение о бюджете" className="terra-overview-warning flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--terra-border)] bg-[var(--terra-danger-soft)] px-3 py-1 text-sm">
          <span className="font-medium text-[var(--terra-danger-text)]">Сегодня сверх ориентира: {formatAmount(overLimitDelta)} ₽</span>
          <button type="button" onClick={onOpenSettings} className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE}>Настройки бюджета</button>
        </div>}
        {/* 1. Верхний ряд метрик (4 сбалансированные карточки) */}
        <section data-testid="overview-metrics-desktop" className={DASHBOARD_CARD+' terra-layout-grid terra-overview-metrics terra-overview-summary terra-layout-surface'} data-terra-grid="summary" data-current-period={isCurrentCalendarMonth}>
          <div className="terra-overview-summary-main terra-overview-summary-zone min-w-0 flex flex-col gap-2" data-overview-summary-zone="balance">
            <h2 data-overview-summary-heading className="text-sm font-semibold text-[var(--terra-ink)]">{personalOnly?(personalOpeningKnown?'Личный баланс':'Итог личных операций'):'Семейный баланс'}</h2>
            <div className="terra-overview-balance terra-overview-main-amount font-headline font-bold text-[var(--terra-ink)] tracking-tight tabular-nums [overflow-wrap:anywhere] min-w-0" data-negative={!settings.privacyMode&&sharedLedger<0}>{formatAmount(sharedLedger)} ₽</div>
            {balanceExplanation&&<p className="text-xs text-[var(--terra-muted)]">{balanceExplanation}</p>}
            <button type="button" onClick={() => personalOpeningKnown?setIsReserveModalOpen(true):onOpenSettings()} aria-label={personalOnly?'Открыть подробности личного резерва':'Открыть подробности семейного резерва'}
              className="terra-overview-reserve-link min-h-[44px] w-full text-left flex flex-wrap items-center justify-between gap-1 border-t border-[var(--terra-border)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] hover:bg-[var(--terra-soft)]">
              <span className="text-xs text-[var(--terra-muted)] inline-flex items-center gap-1"><Lock size={14} aria-hidden="true"/>{personalOnly?'Личный резерв':'Семейный резерв'}</span>
              <span className="text-sm font-semibold text-[var(--terra-ink)] tabular-nums flex items-center gap-1 [overflow-wrap:anywhere]">{formatAmount(reservedAmount)} ₽<ChevronRight size={16} aria-hidden="true"/></span>
            </button>
          </div>
          <div className="terra-overview-summary-period terra-overview-summary-zone min-w-0 flex flex-col gap-2" data-overview-summary-zone="period">
            <h3 data-overview-summary-heading className="text-sm font-semibold text-[var(--terra-ink)]">{!personalOnly&&budgetMode==='personal'?'Личные операции':'За месяц'}</h3>
            {monthMoneyPair}
            {monthlySummary&&<div className="border-t border-[var(--terra-border)] pt-2">{monthlySummary}</div>}
            {!settings.privacyMode&&lastMonthComparison.isPositive!==null&&<p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--terra-muted)]"><span className={'font-semibold tabular-nums '+(lastMonthComparison.isPositive?'text-[var(--terra-primary-text)]':'text-[var(--terra-danger-text)]')}>{lastMonthComparison.text}</span><span>к прошлому полному месяцу</span></p>}
          </div>
          {isCurrentCalendarMonth&&<div className="terra-overview-summary-side terra-overview-summary-zone min-w-0" data-overview-summary-zone="today" data-testid="overview-daily-reserve-desktop">
            <div data-testid="overview-daily-desktop">{dailySummary}</div>
            {!settings.privacyMode&&personalOpeningKnown&&dailyLimit<=0&&<p className="mt-2 text-xs text-[var(--terra-muted)]">Дневной ориентир сейчас равен нулю.</p>}
          </div>}
        </section>

        {/* 2. Основная рабочая область (12 колонок: 8 слева + 4 справа, выровненных по нижнему краю) */}
        <div data-terra-grid="workspace" className="terra-layout-grid terra-overview-columns">
          {/* LEFT COLUMN: 8 columns */}
          <div data-terra-stack="main" className="terra-layout-stack min-w-0">
            {/* Блок «Динамика расходов» */}
            <div data-testid="overview-chart-desktop" className={DASHBOARD_CARD+' terra-layout-surface terra-overview-chart-card space-y-2'}>
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
            <div data-testid="overview-categories-desktop" className={`${DASHBOARD_CARD} terra-layout-surface flex flex-col gap-2`}>
              <div data-overview-section-head className="terra-overview-section-head terra-overview-category-header flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className={SECTION_HEADING}>Категории расходов</h3>
                  <p className="text-xs text-[var(--terra-muted)] mt-0.5">Всего: {formatAmount(categoryBreakdown.total)} ₽</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={()=>onDrillDown('all')} aria-label="Аналитика всех категорий" className="terra-overview-link min-h-[44px] px-2 text-sm font-semibold text-[var(--terra-primary-text)] flex items-center gap-1 rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">Аналитика <ChevronRight size={14} aria-hidden="true"/></button>
                  <button type="button" onClick={()=>{setSelectedCatModalId(null);setIsCatModalOpen(true);}} title="Управление категориями" aria-label="Управление категориями" className={ICON_ACTION+' '+TOOLBAR_ACTION_IDLE}><Plus size={16} aria-hidden="true"/></button>
                </div>
              </div>

              <div className="terra-overview-category-grid divide-y divide-[var(--terra-border)]">
                {mobileCategories.length===0&&<p className="py-4 text-sm text-[var(--terra-muted)]">За выбранный период пока нет расходов по категориям.</p>}
                {renderCategoryRows()}
              </div>
              {categoryBreakdown.items.length>OVERVIEW_CATEGORY_PREVIEW_LIMIT&&<div className="flex items-center justify-between flex-wrap gap-1 border-t border-[var(--terra-border)] pt-1">
                <p data-testid="overview-category-preview-count" className="text-xs text-[var(--terra-muted)]">Показано {OVERVIEW_CATEGORY_PREVIEW_LIMIT} из {categoryBreakdown.items.length}</p>
                <button type="button" onClick={()=>setAllCategoriesOpen(true)} className="min-h-[44px] px-2 text-sm font-semibold text-[var(--terra-primary-text)] rounded-lg hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]" aria-label="Все категории расходов">Все категории <ChevronRight size={14} className="inline" aria-hidden="true"/></button>
              </div>}
            </div>
          </div>

          {/* RIGHT COLUMN: 4 columns */}
          <div data-terra-stack="aside" className="terra-layout-stack min-w-0">
            {/* Виджет «История операций» (компактный список без пустых разрывов) */}
            <div data-testid="overview-history-desktop" className={`${DASHBOARD_CARD} terra-layout-surface flex flex-col gap-2 justify-start`}>
              <div data-overview-section-head className="terra-overview-section-head flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className={SECTION_HEADING}>
                    История операций
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => onDrillDown('all')}
                  data-testid="overview-history-all-desktop" aria-label="Все операции" className="terra-overview-link min-h-[44px] px-2 rounded-lg text-sm text-[var(--terra-primary-text)] transition-colors flex items-center gap-1 font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                >
                  Все
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="divide-y divide-[var(--terra-border)] flex flex-col justify-start">
                {recentTransactions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-graphite-muted dark:text-gray-400">
                    Нет операций за выбранный период
                  </div>
                ) : (
                  renderHistoryRows(recentTransactions)
                )}
              </div>
            </div>
            {/* Виджет «Список покупок» */}
            {showShopping && <QuickShoppingWidget
              activeShoppingItems={activeShoppingItems}
              displayShoppingItems={displayShoppingItems}
              newShoppingTitle={newShoppingTitle}
              setNewShoppingTitle={setNewShoppingTitle}
              isAddingShopping={isAddingShopping}
              handleToggleShopping={handleToggleShopping}
              handleAddShoppingInline={handleAddShoppingInline}
              onNavigateTab={onNavigateTab}
              liveParsedShopping={liveParsedShopping}
              desktop
            />}

            {/* Виджет «События на этой неделе» (ПК, скрыт если нет событий) */}
            {showWeekEvents && upcomingWeekEvents.length > 0 && (
              <div data-testid="overview-events-desktop" className={DASHBOARD_CARD+" terra-layout-surface space-y-2"}>
                <div data-overview-section-head className="terra-overview-section-head terra-overview-event-head flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    
                    <div className="flex items-center gap-2">
                      <h3 className={SECTION_HEADING}>
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
                        className={ICON_ACTION+" "+TOOLBAR_ACTION_IDLE+" min-h-[44px] min-w-[44px]"}
                      >
                        <Plus size={14} strokeWidth={2.4} />
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => onNavigateTab('plans')}
                      className="terra-overview-link min-h-[44px] px-2 rounded-lg flex items-center gap-1 text-sm font-semibold text-[var(--terra-primary-text)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] cursor-pointer"
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
                            <p className="text-sm font-semibold text-[var(--terra-ink)] [overflow-wrap:anywhere]">
                              {ev.title}
                            </p>
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-[var(--terra-muted)] mt-0.5">
                              <span className="font-semibold text-[#2E3230] dark:text-gray-200">{ev.time}</span>
                              <span className="font-medium text-[var(--terra-muted)]">
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
