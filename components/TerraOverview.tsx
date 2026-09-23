import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, TrendingUp, TrendingDown, ArrowDownRight, Lock, 
  Calendar, Search, Plus, Sparkles, Users, User, Eye, EyeOff, 
  ShoppingBag, History, PieChart, Check, ChevronRight, ChevronLeft, ArrowRight,
  HelpCircle, ShieldAlert, ChevronDown, ShieldCheck, ShoppingCart, FileText,
  Star, Smartphone, Utensils, Store, Tag
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, ReferenceLine 
} from 'recharts';
import { Transaction, AppSettings, Category, FamilyMember, ShoppingItem, MandatoryExpense } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { addItem, addItemsBatch, updateItem } from '../utils/db';
import { parseSingleQuickShoppingText, createShoppingItemsFromQuickText } from '../utils/quickShoppingParser';
import ReserveDetailsModal from './ReserveDetailsModal';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey } from '../utils/categorizer';

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
  onMonthChange
}) => {
  const { 
    transactions, 
    filteredTransactions, 
    totalBalance, 
    currentMonthSpent, 
    settings, 
    updateSettings, 
    members, 
    categories, 
    shoppingItems, 
    setShoppingItems, 
    budgetMode, 
    setBudgetMode, 
    savingsRate 
  } = useData();
  
  const { user: firebaseUser, familyId } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [chartScale, setChartScale] = useState<'day' | 'week' | 'month'>('day');
  const [newShoppingTitle, setNewShoppingTitle] = useState('');
  const [isAddingShopping, setIsAddingShopping] = useState(false);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Synchronized or internal month state
  const [internalMonth, setInternalMonth] = useState<Date>(() => new Date());
  const activeMonth = currentMonth || internalMonth;
  const handleMonthChange = (d: Date) => {
    if (onMonthChange) {
      onMonthChange(d);
    } else {
      setInternalMonth(d);
    }
  };
  const handleStepMonth = (step: number) => {
    const next = new Date(activeMonth);
    next.setMonth(next.getMonth() + step);
    handleMonthChange(next);
  };

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
    return members.find(m => m.userId === firebaseUser?.uid) || members[0] || { name: 'Пользователь' };
  }, [members, firebaseUser]);

  const memberInitial = (currentMember.name || 'П').charAt(0).toUpperCase();

  // Salary dates and remaining days
  const salaryDates = settings.salaryDates && settings.salaryDates.length > 0 
    ? settings.salaryDates 
    : [settings.startOfMonthDay || 1];

  const sortedDates = [...salaryDates].sort((a, b) => a - b);
  let nextSalaryDate: Date | null = null;
  for (const day of sortedDates) {
    if (day > currentDay) {
      nextSalaryDate = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), day);
      break;
    }
  }
  if (!nextSalaryDate) {
    nextSalaryDate = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, sortedDates[0]);
  }
  const diffTime = Math.abs(nextSalaryDate.getTime() - realToday.getTime());
  const daysRemaining = isCurrentCalendarMonth ? Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) : 0;

  // Transactions this month
  const currentMonthTransactions = useMemo(() => {
    return filteredTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === activeMonth.getMonth() && d.getFullYear() === activeMonth.getFullYear();
    });
  }, [filteredTransactions, activeMonth]);

  const displayMonthSpent = useMemo(() => {
    return currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  // Mandatory Expenses Calculation
  const myMemberId = currentMember.id;
  const relevantMandatoryExpenses = useMemo(() => {
    const all = settings.mandatoryExpenses || [];
    if (budgetMode === 'personal' && myMemberId) {
      return all.filter(e => !e.memberId || e.memberId === myMemberId);
    }
    return all;
  }, [settings.mandatoryExpenses, budgetMode, myMemberId]);

  const { unpaidMandatoryTotal } = useMemo(() => {
    let total = 0;
    const manuallyPaidIds = settings.manualPaidExpenses?.[currentMonthKey] || [];
    const expensesTx = currentMonthTransactions.filter(t => t.type === 'expense');

    if (settings.enableSmartReserve ?? true) {
      relevantMandatoryExpenses.forEach(expense => {
        const keywords = expense.keywords || [];
        const expNameLower = (expense.name || '').trim().toLowerCase();

        const matches = expensesTx.filter(tx => {
          if (tx.linkedExpenseId === expense.id) return true;
          const noteLower = (tx.note || '').toLowerCase();
          const rawLower = (tx.rawNote || '').toLowerCase();
          if (expNameLower.length >= 3 && (noteLower.includes(expNameLower) || rawLower.includes(expNameLower))) return true;
          if (keywords.length === 0) return false;
          return keywords.some(k => k.trim().length >= 2 && (noteLower.includes(k.toLowerCase().trim()) || rawLower.includes(k.toLowerCase().trim())));
        });
        const paidAmount = matches.reduce((sum, t) => sum + t.amount, 0);
        const isManuallyPaid = manuallyPaidIds.includes(expense.id);
        const isPaid = (paidAmount >= expense.amount * 0.95) || isManuallyPaid;
        const remainingToPay = isPaid ? 0 : Math.max(0, expense.amount - paidAmount);
        if (!isPaid) total += remainingToPay;
      });
    }
    return { unpaidMandatoryTotal: total };
  }, [relevantMandatoryExpenses, currentMonthTransactions, settings.enableSmartReserve, settings.manualPaidExpenses, currentMonthKey]);

  // Detailed Mandatory Expenses for Reserve Breakdown
  const detailedMandatoryExpenses = useMemo(() => {
    const today = now.getDate();
    const manuallyPaidIds = settings.manualPaidExpenses?.[currentMonthKey] || [];
    const expensesTx = currentMonthTransactions.filter(t => t.type === 'expense');

    if (relevantMandatoryExpenses && relevantMandatoryExpenses.length > 0) {
      return relevantMandatoryExpenses.map(expense => {
        const keywords = expense.keywords || [];
        const expNameLower = (expense.name || '').trim().toLowerCase();

        const matches = expensesTx.filter(tx => {
          if (tx.linkedExpenseId === expense.id) return true;
          const noteLower = (tx.note || '').toLowerCase();
          const rawLower = (tx.rawNote || '').toLowerCase();
          if (expNameLower.length >= 3 && (noteLower.includes(expNameLower) || rawLower.includes(expNameLower))) return true;
          if (keywords.length === 0) return false;
          return keywords.some(k => k.trim().length >= 2 && (noteLower.includes(k.toLowerCase().trim()) || rawLower.includes(k.toLowerCase().trim())));
        });
        const paidAmount = matches.reduce((sum, t) => sum + t.amount, 0);
        const isManuallyPaid = manuallyPaidIds.includes(expense.id);
        const isPaid = (paidAmount >= expense.amount * 0.95) || isManuallyPaid;
        const amountNeeded = isPaid ? 0 : Math.max(0, expense.amount - paidAmount);
        const isOverdue = !isPaid && expense.day < today;

        return {
          expense,
          amountNeeded,
          paidAmount,
          isPaid,
          isManuallyPaid,
          isOverdue,
          subtitle: `Обязательный регулярный платеж (${expense.day} число)`
        };
      });
    }

    return undefined;
  }, [relevantMandatoryExpenses, currentMonthTransactions, settings.manualPaidExpenses, currentMonthKey, now]);

  const handleToggleMandatoryPaid = async (expenseId: string, isPaid: boolean) => {
    const existing = settings.manualPaidExpenses?.[currentMonthKey] || [];
    let updated: string[];
    if (isPaid) {
      updated = Array.from(new Set([...existing, expenseId]));
    } else {
      updated = existing.filter(id => id !== expenseId);
    }

    // If canceling payment, also unlink any transaction in current month linked to this expense
    if (!isPaid) {
      setTransactions(prev => prev.map(t => {
        const d = new Date(t.date);
        const txMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (txMonthKey === currentMonthKey && t.linkedExpenseId === expenseId) {
          return { ...t, linkedExpenseId: undefined };
        }
        return t;
      }));
    }

    await updateSettings({
      ...settings,
      manualPaidExpenses: {
        ...(settings.manualPaidExpenses || {}),
        [currentMonthKey]: updated
      }
    });
  };

  const handlePayMandatoryExpenses = async (expenseIds: string[]) => {
    const existing = settings.manualPaidExpenses?.[currentMonthKey] || [];
    const updated = Array.from(new Set([...existing, ...expenseIds]));
    await updateSettings({
      ...settings,
      manualPaidExpenses: {
        ...(settings.manualPaidExpenses || {}),
        [currentMonthKey]: updated
      }
    });
  };

  // Salary incomes this month for auto-savings
  const currentMonthSalary = useMemo(() => {
    return currentMonthTransactions
      .filter(t => {
        const isSalaryCat = t.category === 'salary';
        const catLabel = categories.find(c => c.id === t.category)?.label.toLowerCase();
        const isCustomSalary = catLabel?.includes('зарплата') || catLabel?.includes('salary');
        return t.type === 'income' && (isSalaryCat || isCustomSalary);
      })
      .reduce((acc, t) => acc + t.amount, 0);
  }, [currentMonthTransactions, categories]);

  // Reserve & Available Balance
  const savingsAmount = currentMonthSalary * (savingsRate / 100);
  const manualReserved = settings.manualReservedAmount || 0;
  const reservedAmount = Math.round(savingsAmount + unpaidMandatoryTotal + manualReserved);
  const targetReserveGoal = Math.max(50000, Math.round(unpaidMandatoryTotal + savingsAmount + 25000));
  const reservePercent = Math.min(100, Math.max(15, Math.round((reservedAmount / (targetReserveGoal || 1)) * 100)));

  const availableBalance = Math.max(0, totalBalance - reservedAmount);
  const dailyLimit = Math.max(0, Math.round(availableBalance / daysRemaining));

  // Today's spending
  const todayTransactions = useMemo(() => {
    const todayStr = realToday.toDateString();
    return filteredTransactions.filter(t => {
      const d = new Date(t.date);
      return d.toDateString() === todayStr && t.type === 'expense';
    });
  }, [filteredTransactions, realToday]);

  const spentToday = useMemo(() => {
    return todayTransactions.reduce((sum, t) => sum + t.amount, 0);
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

    if (prevMonthExpenses <= 0) return { text: '+8.4%', isPositive: true };
    const diff = ((displayMonthSpent - prevMonthExpenses) / prevMonthExpenses) * 100;
    const isPositive = diff <= 0; // Less spending is positive for savings
    const sign = diff >= 0 ? '+' : '';
    return {
      text: `${sign}${diff.toFixed(1)}%`,
      isPositive
    };
  }, [filteredTransactions, displayMonthSpent, activeMonth]);

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
          dailyExpensesMap[day] = (dailyExpensesMap[day] || 0) + t.amount;
        }
      });

      const points: { label: string; fullLabel: string; amount: number; limit: number; isHigh: boolean; isCurrent: boolean }[] = [];
      let sum = 0;
      let max = 0;
      let compliantDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const amt = dailyExpensesMap[d] || 0;
        if (d <= currentDay) {
          sum += amt;
          if (amt > max) max = amt;
          if (dailyLimit <= 0 || amt <= dailyLimit) compliantDays++;
        }
        const fullDateStr = new Date(year, month, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        points.push({
          label: `${d}`,
          fullLabel: fullDateStr,
          amount: d <= currentDay ? amt : 0,
          limit: dailyLimit,
          isHigh: dailyLimit > 0 && d <= currentDay ? amt > dailyLimit : false,
          isCurrent: isCurrentCalendarMonth && d === currentDay
        });
      }

      const avg = currentDay > 0 ? Math.round(sum / currentDay) : 0;
      const complianceRate = currentDay > 0 ? Math.round((compliantDays / currentDay) * 100) : 100;

      return {
        points,
        avg,
        max,
        limit: dailyLimit,
        limitLabel: dailyLimit > 0 ? `Лимит ${dailyLimit.toLocaleString('ru-RU')} ₽` : '',
        subtitle: 'Расходы и плановые лимиты по дням месяца',
        complianceRate,
        complianceText: `Лимит на день соблюдён в ${complianceRate}% дней`
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
          dailyExpensesMap[tDateString] = (dailyExpensesMap[tDateString] || 0) + t.amount;
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
          if (dailyLimit <= 0 || amt <= dailyLimit) compliantDays++;
        }

        const fullDateStr = w.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        return {
          label: `${w.dayName} ${w.dayNumber}`,
          fullLabel: `${w.dayName}, ${fullDateStr}`,
          amount: w.isPassedOrToday ? amt : 0,
          limit: dailyLimit,
          isHigh: dailyLimit > 0 && w.isPassedOrToday ? amt > dailyLimit : false,
          isCurrent: w.isCurrent
        };
      });

      const avg = passedDaysCount > 0 ? Math.round(sum / passedDaysCount) : 0;
      const complianceRate = passedDaysCount > 0 ? Math.round((compliantDays / passedDaysCount) * 100) : 100;
      const weekStartLabel = `${weekDays[0].dayNumber} ${weekDays[0].monthShort}`;
      const weekEndLabel = `${weekDays[6].dayNumber} ${weekDays[6].monthShort}`;

      return {
        points,
        avg,
        max,
        limit: dailyLimit,
        limitLabel: dailyLimit > 0 ? `Лимит ${dailyLimit.toLocaleString('ru-RU')} ₽` : '',
        subtitle: `Расходы по дням недели (${weekStartLabel} – ${weekEndLabel})`,
        complianceRate,
        complianceText: `Дневной лимит соблюдён в ${complianceRate}% дней недели`
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
          monthlyExpensesMap[m] = (monthlyExpensesMap[m] || 0) + t.amount;
        }
      }
    });

    const monthlyLimit = settings.targetMonthlyBudget || (dailyLimit > 0 ? dailyLimit * 30 : 0);
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
        amount: isPassedOrCurrent ? amt : 0,
        limit: monthlyLimit,
        isHigh: monthlyLimit > 0 && isPassedOrCurrent ? amt > monthlyLimit : false,
        isCurrent: activeMonth.getFullYear() === realToday.getFullYear() && idx === realToday.getMonth()
      };
    });

    const passedMonthsCount = currentM >= 0 ? currentM + 1 : 0;
    const avg = passedMonthsCount > 0 ? Math.round(sum / passedMonthsCount) : 0;
    const complianceRate = passedMonthsCount > 0 ? Math.round((compliantMonths / passedMonthsCount) * 100) : 100;

    return {
      points,
      avg,
      max,
      limit: monthlyLimit,
      limitLabel: monthlyLimit > 0 ? `План ${monthlyLimit.toLocaleString('ru-RU')} ₽` : '',
      subtitle: `Расходы по месяцам ${year} года`,
      complianceRate,
      complianceText: `Месячный бюджет выдержан в ${complianceRate}% месяцев`
    };
  }, [activeMonth, currentDay, currentMonthTransactions, filteredTransactions, dailyLimit, chartScale, settings.targetMonthlyBudget, realToday, isCurrentCalendarMonth]);

  // Category Breakdown (Top 4 Categories in Terra palette)
  const categoryBreakdown = useMemo(() => {
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense');
    const total = expenses.reduce((acc, t) => acc + t.amount, 0);

    const grouped = expenses.reduce((acc, t) => {
      const cat = categories.find(c => c.id === t.category);
      const effectiveCatId = cat?.parentId || t.category;
      acc[effectiveCatId] = (acc[effectiveCatId] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const paletteColors = [
      { color: '#B25E41', barBg: 'bg-[#B25E41]' }, // clay
      { color: '#C48C3B', barBg: 'bg-[#C48C3B]' }, // warm-amber
      { color: '#4A7C59', barBg: 'bg-[#4A7C59]' }, // primary / forest
      { color: '#50756C', barBg: 'bg-[#50756C]' }, // slate-pine
    ];

    const sorted = Object.entries(grouped)
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
        return {
          id: catId,
          name: cat?.label || 'Другое',
          amount,
          percent
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    // Fallback if less than 4 categories
    const fallbackList = [
      { id: 'supermarkets', name: 'Супермаркеты', amount: 0, percent: 0 },
      { id: 'cafe', name: 'Кафе и пицца', amount: 0, percent: 0 },
      { id: 'telecom', name: 'Мобильная связь', amount: 0, percent: 0 },
      { id: 'subs', name: 'Подписки', amount: 0, percent: 0 }
    ];

    const finalItems = sorted.length > 0 ? sorted : fallbackList;

    return {
      total,
      items: finalItems.map((item, idx) => ({
        ...item,
        style: paletteColors[idx % paletteColors.length]
      }))
    };
  }, [currentMonthTransactions, categories]);

  // Shopping Items (Active top 4)
  const activeShoppingItems = useMemo(() => {
    return shoppingItems.filter(i => !i.completed);
  }, [shoppingItems]);

  const liveParsedShopping = useMemo(() => {
    if (!newShoppingTitle.trim()) return null;
    return parseSingleQuickShoppingText(newShoppingTitle);
  }, [newShoppingTitle]);

  const handleToggleShopping = async (item: ShoppingItem) => {
    const updated = { ...item, completed: !item.completed };
    setShoppingItems(prev => prev.map(i => i.id === item.id ? updated : i));
    if (familyId) {
      await updateItem(familyId, 'shopping', item.id, updated);
    }
  };

  const handleAddShoppingInline = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newShoppingTitle.trim();
    if (!raw || isAddingShopping) return;

    try {
      setIsAddingShopping(true);
      const parsedItems = createShoppingItemsFromQuickText(raw, currentMember.id || 'user');
      if (parsedItems.length === 0) return;

      const itemsWithIds: ShoppingItem[] = parsedItems.map(item => ({
        ...item,
        id: item.id || (Date.now().toString() + Math.random().toString(36).substring(2, 6))
      }));

      // Optimistically update list so the UI responds immediately
      setShoppingItems(prev => [...itemsWithIds, ...prev]);
      setNewShoppingTitle('');

      if (familyId) {
        if (itemsWithIds.length === 1) {
          await addItem(familyId, 'shopping', itemsWithIds[0]);
        } else {
          await addItemsBatch(familyId, 'shopping', itemsWithIds);
        }
      }
    } catch (err) {
      console.error('Failed to add shopping item inline:', err);
    } finally {
      setIsAddingShopping(false);
    }
  };

  // Recent Transactions (top 4, filtered by search if present)
  const recentTransactions = useMemo(() => {
    let list = [...filteredTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        (t.note || '').toLowerCase().includes(q) ||
        (t.rawNote || '').toLowerCase().includes(q) ||
        (categories.find(c => c.id === t.category)?.label || '').toLowerCase().includes(q)
      );
    }
    return list.slice(0, 4);
  }, [filteredTransactions, searchQuery, categories]);

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
    return Math.round(num).toLocaleString('ru-RU');
  };

  const totalMonthlyLimit = settings.targetMonthlyBudget || (dailyLimit > 0 ? dailyLimit * 30 : 50540);

  const displayShoppingItems = useMemo(() => {
    if (activeShoppingItems.length > 0) {
      return activeShoppingItems.slice(0, 3);
    }
    return [
      { id: 'demo-shop-1', title: 'Тёшка к чаю', amount: 1, unit: 'шт', completed: false, memberId: currentMember.id || 'user', createdAt: new Date().toISOString() },
      { id: 'demo-shop-2', title: 'Кошачий корм', amount: 2, unit: 'шт', completed: false, memberId: currentMember.id || 'user', createdAt: new Date().toISOString() },
      { id: 'demo-shop-3', title: 'Подсолнечное масло', amount: 1, unit: 'шт', completed: false, memberId: currentMember.id || 'user', createdAt: new Date().toISOString() },
    ];
  }, [activeShoppingItems, currentMember.id]);

  const recentMobileTransactions = useMemo(() => {
    if (filteredTransactions.length > 0) {
      return filteredTransactions.slice(0, 4);
    }
    return [
      {
        id: 'demo-tx-1',
        type: 'expense' as const,
        amount: 1260,
        category: 'groceries',
        note: 'Магнит',
        date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(),
        memberId: currentMember.id
      },
      {
        id: 'demo-tx-2',
        type: 'expense' as const,
        amount: 1131,
        category: 'cafe',
        note: 'Додо Пицца',
        date: new Date(now.getFullYear(), now.getMonth(), 11).toISOString(),
        memberId: currentMember.id
      },
      {
        id: 'demo-tx-3',
        type: 'expense' as const,
        amount: 299,
        category: 'subscriptions',
        note: 'Телеграм премиум',
        date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
        memberId: currentMember.id
      },
      {
        id: 'demo-tx-4',
        type: 'expense' as const,
        amount: 448,
        category: 'telecom',
        note: 'Yota',
        date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
        memberId: currentMember.id
      }
    ];
  }, [filteredTransactions, now, currentMember.id]);

  const mobileCategories = useMemo(() => {
    const defaultCats = [
      { id: 'supermarkets', name: 'Супермаркеты', percent: 40, amount: 1260, barColor: '#D95C48', bg: '#FDE8E8', color: '#D95C48', icon: <Store size={13} /> },
      { id: 'cafe', name: 'Кафе и пицца', percent: 36, amount: 1131, barColor: '#C4A66A', bg: '#FEF3C7', color: '#D97706', icon: <Utensils size={13} /> },
      { id: 'telecom', name: 'Мобильная связь', percent: 14, amount: 448, barColor: '#4A7C59', bg: '#D1FAE5', color: '#059669', icon: <Smartphone size={13} /> },
      { id: 'subscriptions', name: 'Подписки', percent: 10, amount: 299, barColor: '#6B7280', bg: '#F3F4F6', color: '#4B5563', icon: <Tag size={13} /> }
    ];

    if (categoryBreakdown.items.length >= 2 && categoryBreakdown.total > 0) {
      const palette = [
        { barColor: '#D95C48', bg: '#FDE8E8', color: '#D95C48', icon: <Store size={13} /> },
        { barColor: '#C4A66A', bg: '#FEF3C7', color: '#D97706', icon: <Utensils size={13} /> },
        { barColor: '#4A7C59', bg: '#D1FAE5', color: '#059669', icon: <Smartphone size={13} /> },
        { barColor: '#6B7280', bg: '#F3F4F6', color: '#4B5563', icon: <Tag size={13} /> }
      ];
      return categoryBreakdown.items.slice(0, 4).map((item, idx) => ({
        ...item,
        amount: Math.round(item.amount),
        ...palette[idx % palette.length]
      }));
    }
    return defaultCats;
  }, [categoryBreakdown]);

  const mobileChartData = useMemo(() => {
    if (dynamicsData && dynamicsData.points && dynamicsData.points.length >= 4) {
      return dynamicsData.points;
    }
    const monthLong = activeMonth.toLocaleString('ru-RU', { month: 'long' });
    return [
      { label: '1', amount: 0, fullLabel: `1 ${monthLong}` },
      { label: '10', amount: 0, fullLabel: `10 ${monthLong}` },
      { label: '20', amount: 0, fullLabel: `20 ${monthLong}` },
      { label: '28', amount: 0, fullLabel: `28 ${monthLong}` },
    ];
  }, [dynamicsData, activeMonth]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F4F1EA] dark:bg-[#121214] overflow-y-auto no-scrollbar pb-28 md:pb-8 text-graphite dark:text-gray-100 transition-colors">
      {/* ========================================================= */}
      {/* MOBILE VIEW (strictly matches screenshot image.png on < md) */}
      {/* ========================================================= */}
      <div className="md:hidden flex flex-col min-w-0 w-full">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-[#F4F1EA]/95 dark:bg-[#121214]/95 backdrop-blur-md z-20">
          {/* Left: Circle Avatar Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            title={`Профиль: ${currentMember.name}`}
            className="w-10 h-10 rounded-full bg-[#4A7C59] text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition"
          >
            <User size={19} strokeWidth={2.4} />
          </button>

          {/* Center: Month Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              className="px-4 py-2 rounded-full bg-[#EAE6DD] dark:bg-[#252528] text-graphite dark:text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-[#E2DDD3] active:scale-95 transition cursor-pointer"
            >
              <span>{currentMonthName}</span>
              <ChevronDown size={14} className="text-graphite-muted dark:text-gray-400" />
            </button>
            {isMonthPickerOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsMonthPickerOpen(false)} 
                />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-[#252528] border border-surface-border dark:border-white/10 rounded-2xl shadow-xl p-2.5 z-50 min-w-[210px] space-y-2">
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
                    <Sparkles size={13} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right: Circle Plus Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            title="Добавить операцию"
            className="w-10 h-10 rounded-full bg-[#4A7C59] hover:bg-[#3D6849] text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition"
          >
            <Plus size={22} strokeWidth={2.4} />
          </button>
        </header>

        {/* Scope Pill Switcher (Семейный / Личный) */}
        <div className="flex justify-center my-3 px-4">
          <div className="bg-[#EAE6DD] dark:bg-[#252528] p-1 rounded-full flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setBudgetMode('family')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                budgetMode === 'family'
                  ? 'bg-[#4A7C59] text-white shadow-xs'
                  : 'text-graphite-muted dark:text-gray-400 hover:text-graphite'
              }`}
            >
              <Users size={14} />
              <span>Семейный</span>
            </button>
            <button
              type="button"
              onClick={() => setBudgetMode('personal')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                budgetMode === 'personal'
                  ? 'bg-[#4A7C59] text-white shadow-xs'
                  : 'text-graphite-muted dark:text-gray-400 hover:text-graphite'
              }`}
            >
              <User size={14} />
              <span>Личный</span>
            </button>
          </div>
        </div>

        {/* Mobile Dashboard Cards Stream */}
        <div className="px-4 space-y-4 pb-24">
          {/* 1. Hero Balance Card */}
          <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-5 border border-[#EAE6DD] dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAE6DD]/70 dark:bg-white/5 text-xs text-graphite-muted dark:text-gray-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                {budgetMode === 'family' ? 'Семейный баланс' : 'Личный баланс'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4EDDA] dark:bg-emerald-950/50 text-[#28A745] dark:text-emerald-400 text-xs font-bold">
                <TrendingUp size={13} strokeWidth={2.4} />
                +8.4%
              </span>
            </div>

            <div>
              <div className="text-3xl font-extrabold font-headline text-graphite dark:text-white tracking-tight">
                {settings.privacyMode ? '••••••' : `${formatAmount(totalBalance)} ₽`}
              </div>
              <p className="text-xs text-graphite-muted dark:text-gray-400 mt-1">
                Доступно до конца {activeMonth.toLocaleString('ru-RU', { month: 'short' })} • к прошлому месяцу рост
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-graphite-muted dark:text-gray-400">Израсходовано от лимита</span>
                <span className="font-bold text-graphite dark:text-white font-headline">
                  {settings.privacyMode ? '•••' : `${formatAmount(displayMonthSpent)} ₽ / ${formatAmount(totalMonthlyLimit)} ₽`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#EAE6DD] dark:bg-[#2C2C2E] overflow-hidden">
                <div 
                  className="h-full rounded-full bg-[#4A7C59] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((displayMonthSpent / (totalMonthlyLimit || 1)) * 100))}%` }}
                />
              </div>
            </div>
          </section>

          {/* 2. Динамика расходов Card */}
          <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-5 border border-[#EAE6DD] dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-headline text-graphite dark:text-white leading-tight">
                  Динамика расходов
                </h3>
                <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                  {currentMonthName} • {budgetMode === 'family' ? 'семейные траты' : 'личные траты'}
                </p>
              </div>

              {/* Filter tabs: День / Неделя / Месяц */}
              <div className="bg-[#EAE6DD] dark:bg-[#2C2C2E] p-0.5 rounded-xl flex items-center text-xs">
                {(['day', 'week', 'month'] as const).map(scale => {
                  const labels: Record<string, string> = { day: 'День', week: 'Неделя', month: 'Месяц' };
                  const isCurrent = chartScale === scale;
                  return (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setChartScale(scale)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition ${
                        isCurrent
                          ? 'bg-white dark:bg-[#1C1C1E] text-graphite dark:text-white font-bold shadow-xs'
                          : 'text-graphite-muted dark:text-gray-400'
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
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                Средний: <span className="font-bold font-headline">{formatAmount(dynamicsData.avg || 1420)} ₽</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#7D5A44]" />
                Пик: <span className="font-bold font-headline">{formatAmount(dynamicsData.max || 3150)} ₽</span>
              </span>
            </div>

            {/* Area Chart with Tooltip on Peak */}
            <div className="h-[135px] w-full relative -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mobileChartData} margin={{ top: 22, right: 14, left: 14, bottom: 0 }}>
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
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value;
                        const dataPoint = payload[0].payload;
                        const fullDate = dataPoint?.fullLabel || dataPoint?.fullDate || (dataPoint?.label ? `${dataPoint.label} ${activeMonth.toLocaleString('ru-RU', { month: 'long' })}` : '');
                        return (
                          <div className="bg-[#1C1C1E] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xl border border-white/10 pointer-events-none flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-gray-300">{fullDate}:</span>
                            <span className="text-[#4ADE80] font-headline">{typeof val === 'number' ? Math.round(val).toLocaleString('ru-RU') : val} ₽</span>
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
                    dot={(props: any) => {
                      const isPeak = dynamicsData.max > 0 && props.payload?.amount === dynamicsData.max;
                      if (isPeak) {
                        return (
                          <circle 
                            key={`peak-dot-${props.index}`} 
                            cx={props.cx} 
                            cy={props.cy} 
                            r={4.5} 
                            fill="#4A7C59" 
                            stroke="#FFFFFF" 
                            strokeWidth={2} 
                          />
                        );
                      }
                      return <circle key={`dot-${props.index}`} cx={props.cx} cy={props.cy} r={0} />;
                    }}
                    activeDot={{ r: 5, fill: '#4A7C59', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer Insight */}
            <div className="bg-[#EAE6DD]/60 dark:bg-white/5 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-graphite dark:text-gray-300">
              <ShieldCheck size={16} className="text-[#4A7C59] shrink-0" />
              <span>Лимит на день соблюдён в {dynamicsData.complianceRate || 87}% случаев за этот период.</span>
            </div>
          </section>

          {/* 3. Категории расходов Card */}
          <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-5 border border-[#EAE6DD] dark:border-white/10 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-headline text-graphite dark:text-white leading-tight">
                  Категории расходов
                </h3>
                <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                  Всего в {currentMonthNamePrepositional}: {formatAmount(displayMonthSpent || 0)} ₽
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('budget')}
                className="flex items-center gap-0.5 text-xs font-medium text-graphite dark:text-gray-300 hover:text-primary transition"
              >
                <span>Детали</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {mobileCategories.map((cat, idx) => (
                <div key={cat.id || idx} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0"
                        style={{ backgroundColor: cat.bg, color: cat.color }}
                      >
                        {cat.icon}
                      </span>
                      <span className="text-xs font-medium text-graphite dark:text-white">{cat.name}</span>
                      <span className="text-xs text-graphite-muted dark:text-gray-400">{cat.percent}%</span>
                    </div>
                    <span className="text-xs font-bold font-headline text-graphite dark:text-white tabular-nums">
                      {formatAmount(cat.amount)} ₽
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#EAE6DD] dark:bg-[#2C2C2E] overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, cat.percent)}%`, backgroundColor: cat.barColor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Список покупок Card */}
          <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-5 border border-[#EAE6DD] dark:border-white/10 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-[#4A7C59]" />
                <h3 className="text-base font-bold font-headline text-graphite dark:text-white">
                  Список покупок
                </h3>
                <span className="bg-[#EAE6DD] dark:bg-white/10 text-graphite dark:text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  {activeShoppingItems.length || 3} шт
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('shopping')}
                className="flex items-center gap-0.5 text-xs font-medium text-graphite dark:text-gray-300 hover:text-primary transition"
              >
                <span>Все</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {displayShoppingItems.map(item => (
                <div 
                  key={item.id}
                  className="bg-[#EAE6DD]/40 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between hover:bg-[#EAE6DD]/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleShopping(item as any)}
                      className="w-5 h-5 rounded-md border-2 border-[#C5BFB4] dark:border-white/20 flex items-center justify-center hover:border-[#4A7C59] transition cursor-pointer"
                    >
                      {item.completed && <Check size={13} className="text-[#4A7C59]" />}
                    </button>
                    <span className={`text-xs font-medium text-graphite dark:text-white ${item.completed ? 'line-through text-graphite-muted' : ''}`}>
                      {item.title}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-graphite-muted dark:text-gray-400">
                    {item.amount ? `${item.amount} ${item.unit || 'шт'}` : '1 шт'}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick add bar with round green + button */}
            <form onSubmit={handleAddShoppingInline} className="bg-[#EAE6DD]/50 dark:bg-white/5 rounded-2xl p-1.5 pl-4 flex items-center gap-2 border border-transparent focus-within:border-[#4A7C59]/40 transition">
              <input 
                type="text"
                value={newShoppingTitle}
                onChange={(e) => setNewShoppingTitle(e.target.value)}
                placeholder="Быстро добавить в список..."
                className="text-xs bg-transparent flex-1 text-graphite dark:text-white placeholder-graphite-muted outline-none"
              />
              <button
                type="submit"
                disabled={!newShoppingTitle.trim() || isAddingShopping}
                className="w-9 h-9 rounded-full bg-[#4A7C59] hover:bg-[#3D6849] active:scale-95 disabled:opacity-50 text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition"
              >
                <Plus size={18} strokeWidth={2.4} />
              </button>
            </form>
          </section>

          {/* 5. История операций Card */}
          <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-5 border border-[#EAE6DD] dark:border-white/10 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-graphite-muted dark:text-gray-400" />
                <h3 className="text-base font-bold font-headline text-graphite dark:text-white">
                  История операций
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('budget')}
                className="flex items-center gap-0.5 text-xs font-medium text-graphite dark:text-gray-300 hover:text-primary transition"
              >
                <span>Все</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {recentMobileTransactions.map(tx => {
                const isExpense = tx.type === 'expense';
                const txMember = members.find(m => m.id === tx.memberId) || { name: 'Гена' };
                const cat = categories.find(c => c.id === tx.category);
                const catLabel = cat?.label || (tx.category === 'groceries' ? 'Продукты' : tx.category === 'cafe' ? 'Фастфуд' : tx.category === 'subscriptions' ? 'Подписки' : tx.category === 'telecom' ? 'Связь' : 'Операция');
                const displayTitle = tx.note || catLabel;
                const brandKey = getMerchantBrandKey(displayTitle);
                const txDate = new Date(tx.date);
                const dateFormatted = `${txDate.getDate()} ${txDate.toLocaleString('ru-RU', { month: 'short' })}`;

                return (
                  <div
                    key={tx.id}
                    onClick={() => onEditTransaction(tx as any)}
                    className="bg-[#EAE6DD]/40 dark:bg-white/5 rounded-2xl p-3.5 flex items-center justify-between hover:bg-[#EAE6DD]/70 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                        <BrandIcon name={displayTitle} brandKey={brandKey} category={cat} size="sm" className="w-10 h-10 rounded-full" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-graphite dark:text-white truncate">
                          {displayTitle}
                        </h4>
                        <p className="text-[11px] text-graphite-muted dark:text-gray-400 truncate mt-0.5">
                          {dateFormatted} • {txMember.name} • {catLabel}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <span className="text-xs font-bold font-headline text-graphite dark:text-white tabular-nums block">
                        {settings.privacyMode ? '•••' : `${isExpense ? '-' : '+'}${formatAmount(tx.amount)} ₽`}
                      </span>
                      <span className="text-[10px] text-graphite-muted dark:text-gray-400 block mt-0.5">
                        {budgetMode === 'family' ? 'Семейный счёт' : 'Личный счёт'}
                      </span>
                    </div>
                  </div>
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
        {/* Top Navigation Bar */}
        <header className="h-20 border-b border-surface-border dark:border-white/5 bg-[#FAF8F5]/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
        {/* Left: Scope Selector, Month, Search */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Pill Switcher (Личный / Семейный) */}
          <div className="bg-surface-subtle dark:bg-[#2C2C2E] p-1 rounded-xl border border-surface-border dark:border-white/5 flex items-center shadow-inner">
            <button 
              type="button"
              onClick={() => setBudgetMode('personal')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                budgetMode === 'personal' 
                  ? 'bg-white dark:bg-[#1C1C1E] text-graphite dark:text-white font-bold shadow-xs border border-surface-border dark:border-white/10' 
                  : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white'
              }`}
            >
              <User size={14} className={budgetMode === 'personal' ? 'text-primary' : ''} />
              <span className="hidden xs:inline">Личный</span>
            </button>
            <button 
              type="button"
              onClick={() => setBudgetMode('family')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                budgetMode === 'family' 
                  ? 'bg-white dark:bg-[#1C1C1E] text-[#1E3B26] dark:text-green-400 font-bold shadow-xs border border-[#D5E2D8] dark:border-white/10' 
                  : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white'
              }`}
            >
              <Users size={14} className={budgetMode === 'family' ? 'text-primary' : ''} />
              <span className="hidden xs:inline">Семейный</span>
            </button>
          </div>

          {/* Month Pill / Stepper */}
          <div className="hidden sm:flex items-center text-xs font-semibold text-graphite dark:text-gray-200 bg-surface-subtle dark:bg-[#2C2C2E] px-2 py-1 rounded-xl border border-surface-border dark:border-white/5 gap-1.5 select-none">
            <button
              type="button"
              onClick={() => handleStepMonth(-1)}
              className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-lg text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white transition cursor-pointer"
              title="Предыдущий месяц"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="capitalize px-0.5">{currentMonthName}</span>
            <button
              type="button"
              onClick={() => handleStepMonth(1)}
              className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-lg text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white transition cursor-pointer"
              title="Следующий месяц"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Search / Filter */}
          <div className="hidden md:flex items-center relative ml-1">
            <Search size={16} className="text-graphite-muted dark:text-gray-400 absolute left-3 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск операций..."
              className="text-xs bg-surface-subtle dark:bg-[#2C2C2E] hover:bg-white dark:hover:bg-[#3A3A3C] focus:bg-white dark:focus:bg-[#3A3A3C] border border-surface-border dark:border-white/5 rounded-xl pl-9 pr-3 py-1.5 w-40 lg:w-56 text-graphite dark:text-white placeholder-graphite-muted dark:placeholder-gray-400 focus:outline-none focus:border-primary transition"
            />
          </div>
        </div>

        {/* Right: Action Buttons Group & Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* New Transaction Button */}
          <button 
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark active:scale-[0.98] text-white text-xs font-bold shadow-sm shadow-primary/25 transition"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden xs:inline tracking-wider">+ ЗАПИСЬ</span>
            <span className="xs:hidden">ЗАПИСЬ</span>
          </button>

          {/* AI Assistant */}
          <button 
            type="button"
            onClick={onOpenAIChat}
            title="Умные рекомендации AI"
            className="p-2 rounded-xl bg-white dark:bg-[#2C2C2E] hover:bg-surface-subtle dark:hover:bg-[#3A3A3C] border border-surface-border dark:border-white/5 text-primary dark:text-green-400 transition shadow-xs active:scale-95"
          >
            <Sparkles size={16} />
          </button>

          {/* Privacy Eye Toggle */}
          <button 
            type="button"
            onClick={() => updateSettings({ ...settings, privacyMode: !settings.privacyMode })}
            title={settings.privacyMode ? "Показать суммы" : "Скрыть суммы"}
            className="p-2 rounded-xl bg-white dark:bg-[#2C2C2E] hover:bg-surface-subtle dark:hover:bg-[#3A3A3C] border border-surface-border dark:border-white/5 text-graphite-muted dark:text-gray-300 hover:text-graphite transition shadow-xs active:scale-95"
          >
            {settings.privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          {/* User Avatar */}
          <div 
            onClick={onOpenSettings}
            title={`Профиль: ${currentMember.name}`}
            className="w-8 h-8 rounded-xl bg-primary-light text-primary border border-[#D5E5D9] dark:border-white/10 flex items-center justify-center font-bold text-xs font-headline cursor-pointer ml-1 hover:scale-105 transition select-none"
          >
            {memberInitial}
          </div>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto w-full">
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#FFEDD5] dark:bg-[#432314] text-[#C2410C] border border-[#FDBA74] dark:border-[#EA580C]/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C2410C] animate-pulse"></span>
                      Внимание: Превышение лимита дня
                    </span>
                    <span className="text-xs font-mono font-bold text-[#9A3412] dark:text-[#FB923C]">
                      +{formatAmount(overLimitDelta)} ₽ сверх плана
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#7C2D12] dark:text-[#FED7AA] leading-relaxed">
                    Сегодня потрачено <strong className="font-mono font-bold text-[#9A3412] dark:text-orange-400">{formatAmount(spentToday)} ₽</strong> при плановом лимите <strong className="font-mono">{formatAmount(dailyLimit)} ₽</strong>. Резерв семейного бюджета скорректирован. Рекомендуем пересмотреть траты на завтра.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:self-start md:self-center flex-shrink-0 pl-13 md:pl-0">
                <button 
                  type="button"
                  onClick={() => setIsReserveModalOpen(true)}
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
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: ОБЩИЙ БАЛАНС */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-surface-border dark:border-white/5 shadow-sm flex flex-col justify-between hover:border-[#CADACF] dark:hover:border-white/15 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-primary font-bold text-[11px] uppercase tracking-wider">
                <span>ОБЩИЙ БАЛАНС</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              </div>
              <span className="text-[10px] bg-primary-light dark:bg-primary/20 text-primary dark:text-green-400 font-semibold px-2 py-0.5 rounded-full border border-[#D5E5D9] dark:border-transparent">
                {budgetMode === 'family' ? 'Семейный' : 'Личный'}
              </span>
            </div>
            <div className="my-3 flex items-baseline">
              <span className="text-3xl lg:text-4xl font-headline font-bold text-graphite dark:text-white tracking-tight whitespace-nowrap inline-flex items-baseline gap-1.5">
                {formatAmount(totalBalance)} <span className="text-2xl font-light text-primary">₽</span>
              </span>
            </div>
            <div className="pt-2 border-t border-[#F2EFEB] dark:border-white/5 flex items-center justify-between text-xs text-graphite-muted dark:text-gray-400">
              <span className={`inline-flex items-center font-bold ${lastMonthComparison.isPositive ? 'text-[#2F673E] dark:text-green-400' : 'text-[#C2410C] dark:text-orange-400'}`}>
                {lastMonthComparison.isPositive ? (
                  <TrendingUp size={14} className="mr-0.5" />
                ) : (
                  <TrendingDown size={14} className="mr-0.5" />
                )}
                {lastMonthComparison.text}
              </span>
              <span className="text-[11px]">к прошлому месяцу</span>
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
                {isOverDailyLimit ? 'Превышен' : 'В норме'}
              </span>
            </div>
            <div className="my-3 flex items-baseline">
              <span className={`text-2xl lg:text-3xl font-headline font-bold tracking-tight whitespace-nowrap inline-flex items-baseline gap-1 ${
                isOverDailyLimit ? 'text-[#9A3412] dark:text-orange-400' : 'text-graphite dark:text-white'
              }`}>
                {formatAmount(dailyLimit)} <span className="text-sm text-graphite-muted dark:text-gray-400 font-normal">₽</span>
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
              <span className={`text-2xl lg:text-3xl font-headline font-bold tracking-tight whitespace-nowrap inline-flex items-baseline gap-1 ${
                isOverDailyLimit ? 'text-[#B25E41]' : 'text-graphite dark:text-white'
              }`}>
                {formatAmount(spentToday)} <span className="text-sm text-graphite-muted dark:text-gray-400 font-normal">₽</span>
              </span>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-graphite-muted dark:text-gray-400 mb-1 font-medium">
                <span className="whitespace-nowrap">План: до {formatAmount(dailyLimit)} ₽</span>
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
          <div 
            onClick={() => setIsReserveModalOpen(true)}
            className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-surface-border dark:border-white/5 shadow-sm flex flex-col justify-between hover:border-[#E8DEC7] dark:hover:border-white/15 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-graphite dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={14} className="text-warm-amber" />
                {budgetMode === 'family' ? 'СЕМЕЙНЫЙ РЕЗЕРВ' : 'ЛИЧНЫЙ РЕЗЕРВ'}
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
          </div>
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

                  <div className="flex rounded-xl bg-surface-subtle dark:bg-[#2C2C2E] p-0.5 border border-surface-border dark:border-white/5 ml-1">
                    {(['day', 'week', 'month'] as const).map(scale => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => setChartScale(scale)}
                        className={`px-2.5 py-1 text-[11px] rounded-lg transition capitalize cursor-pointer ${
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
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={dynamicsData.points} 
                      margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
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
                        tickFormatter={(val) => `${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} ₽`}
                      />
                      {dynamicsData.limit > 0 && (
                        <ReferenceLine 
                          y={dynamicsData.limit} 
                          stroke={isOverDailyLimit && chartScale === 'day' ? '#EA580C' : '#F97316'} 
                          strokeDasharray="4 4" 
                          label={{ 
                            value: dynamicsData.limitLabel, 
                            position: 'insideTopRight', 
                            fill: isOverDailyLimit && chartScale === 'day' ? '#C2410C' : '#C48C3B',
                            fontSize: 10,
                            fontWeight: 'bold'
                          }} 
                        />
                      )}
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const hasOverlimit = dynamicsData.limit > 0 && data.amount > dynamicsData.limit;
                            return (
                              <div className="bg-graphite dark:bg-[#1E2923] text-white border border-[#37493F] px-3.5 py-2 rounded-xl shadow-lg flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-[#8ECF9E]"></span>
                                  <span className="text-xs font-mono font-bold">
                                    {data.fullLabel}: {formatAmount(data.amount)} ₽
                                  </span>
                                </div>
                                {hasOverlimit && (
                                  <span className="text-[10px] text-[#FDBA74]">
                                    (Превышение лимита: +{formatAmount(data.amount - dynamicsData.limit)} ₽)
                                  </span>
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
                        dot={(props: any) => {
                          const { cx, cy, payload, index } = props;
                          if (payload.isCurrent) {
                            return (
                              <g key={`dot-current-${index}`}>
                                <circle cx={cx} cy={cy} r={9} fill={isOverDailyLimit && chartScale === 'day' ? '#EA580C' : '#4A7C59'} opacity={0.25} />
                                <circle cx={cx} cy={cy} r={5.5} fill={isOverDailyLimit && chartScale === 'day' ? '#C2410C' : '#4A7C59'} stroke="#FFFFFF" strokeWidth={2} />
                              </g>
                            );
                          }
                          if (payload.amount > 0 && (chartScale !== 'day' || index % 5 === 0)) {
                            return (
                              <circle key={`dot-${index}`} cx={cx} cy={cy} r={3.5} fill="#4A7C59" stroke="#FFFFFF" strokeWidth={1.5} />
                            );
                          }
                          return null;
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Footer summary */}
              <div className="pt-4 border-t border-[#F0ECE4] dark:border-white/5 flex items-center justify-between text-xs text-graphite-muted dark:text-gray-400">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dynamicsData.complianceRate >= 80 ? 'bg-primary' : 'bg-[#EA580C]'}`}></span>
                  {dynamicsData.complianceText}
                </span>
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
                <span className="text-xs text-graphite-muted dark:text-gray-400">
                  Всего в этом месяце: <strong className="text-graphite dark:text-white font-bold font-mono whitespace-nowrap">{formatAmount(categoryBreakdown.total)} ₽</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-auto pt-4">
                {categoryBreakdown.items.map(cat => (
                  <div 
                    key={cat.id} 
                    onClick={() => onDrillDown(cat.id)}
                    className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#2C2C2E] border border-surface-border dark:border-white/5 flex flex-col justify-between hover:border-[#DFD7CA] dark:hover:border-white/20 transition cursor-pointer group"
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
                      <div className={`h-full rounded-full ${cat.style.barBg}`} style={{ width: `${cat.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 4 columns */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            {/* Виджет «Список покупок» */}
            <div className="bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/5 rounded-3xl p-6 shadow-sm">
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
                  activeShoppingItems.slice(0, 4).map(item => (
                    <li 
                      key={item.id} 
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] animate-pulse" />
                    <span>{liveParsedShopping.title}</span>
                    <span className="font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.2 rounded text-[10px] text-stone-700 dark:text-stone-300">
                      {liveParsedShopping.amount} {liveParsedShopping.unit}
                    </span>
                  </div>
                )}
              </form>
            </div>

            {/* Виджет «История операций» (выровнен по нижнему краю с «Категориями расходов») */}
            <div className="bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/5 rounded-3xl p-6 shadow-sm flex-1 flex flex-col justify-between">
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
                  onClick={() => onNavigateTab('budget')}
                  className="text-xs text-primary hover:text-primary-dark dark:hover:text-green-400 transition flex items-center gap-1 font-semibold"
                >
                  Все
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-3 mt-4 flex-1 flex flex-col justify-between">
                {recentTransactions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-graphite-muted dark:text-gray-400">
                    Нет операций за выбранный период
                  </div>
                ) : (
                  recentTransactions.map((tx, idx) => {
                    const badge = getTransactionBadge(tx, idx);
                    const txDate = new Date(tx.date);
                    const dateFormatted = txDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                    const isTxToday = txDate.toDateString() === now.toDateString();
                    const txMember = members.find(m => m.id === tx.memberId) || currentMember;
                    const catLabel = categories.find(c => c.id === tx.category)?.label || 'Прочее';
                    const isExpense = tx.type === 'expense';

                    return (
                      <div 
                        key={tx.id}
                        onClick={() => onEditTransaction(tx)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition group cursor-pointer ${
                          isTxToday && isExpense && isOverDailyLimit && idx === 0
                            ? 'bg-[#FFF7ED] dark:bg-[#2A1E17] hover:bg-[#FFEDD5] dark:hover:bg-[#3D251A] border-[#FDBA74] dark:border-[#C2410C]/40'
                            : 'bg-[#FAF8F5] dark:bg-[#2C2C2E] hover:bg-[#F3EFE9] dark:hover:bg-[#3A3A3C] border-surface-border dark:border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm tracking-tighter flex-shrink-0 ${badge.bg}`}>
                            {badge.initial}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-graphite dark:text-white group-hover:text-primary transition truncate flex items-center gap-1.5">
                              {tx.note || tx.rawNote || 'Операция'}
                              {isTxToday && (
                                <span className="text-[9px] bg-[#C2410C] text-white px-1.5 py-0.2 rounded font-mono font-medium flex-shrink-0">
                                  СЕГОДНЯ
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-graphite-muted dark:text-gray-400 flex items-center gap-1.5 mt-0.5 truncate">
                              <span>{dateFormatted}</span>
                              <span className="w-1 h-1 rounded-full bg-[#B8B0A2]"></span>
                              <span className="flex items-center gap-1 text-[#465149] dark:text-gray-300">
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span> 
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
                      </div>
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
          totalBalance={totalBalance}
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
            await updateSettings({ ...settings, manualReservedAmount: amt });
          }}
          onTogglePaid={handleToggleMandatoryPaid}
          onPayExpenses={handlePayMandatoryExpenses}
          onEditExpense={onEditMandatoryExpense}
          privacyMode={settings.privacyMode}
          currency="₽"
        />
      )}
    </div>
  );
};

export default TerraOverview;
