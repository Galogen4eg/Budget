import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  X, Search, Calendar as CalendarIcon, BarChart3, List, ArrowUpRight, ArrowDownRight, 
  Users, TrendingDown, Sparkles, Zap, Scale, CheckCircle2, ChevronLeft, ChevronRight,
  Layers, ArrowUpDown, ArrowLeft
} from 'lucide-react';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';

interface DrillDownModalProps {
  categoryId?: string;
  merchantName?: string;
  onClose: () => void;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  categories: Category[];
  onLearnRule: (rule: LearnedRule) => void;
  onApplyRuleToExisting?: (rule: LearnedRule) => void;
  onEditTransaction: (tx: Transaction) => void;
  currentMonth?: Date;
  selectedDate?: Date | null;
}

const DrillDownModal: React.FC<DrillDownModalProps> = ({ 
  categoryId, merchantName, onClose, 
  transactions, setTransactions, settings, members, categories, 
  onLearnRule, onApplyRuleToExisting, onEditTransaction,
  currentMonth, selectedDate
}) => {
  const isOtherOrTraining = categoryId === 'other' || categoryId === 'uncategorized';

  // Active View Mode: 'inspector' (Registry & Split Inspector) vs 'analytics' (Analytics & Chart)
  const [viewMode, setViewMode] = useState<'inspector' | 'analytics'>('inspector');

  // Operation Type Filter in Inspector: 'all' | 'expense' | 'income'
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  // Search Filter Query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sort Order in Feed: 'newest' | 'oldest'
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Chart Granularity: 'daily' | 'weekly'
  const [chartGranularity, setChartGranularity] = useState<'daily' | 'weekly'>('daily');

  // Interactive Chart Series Filter: 'all' | 'expense' | 'income'
  const [chartSeriesFilter, setChartSeriesFilter] = useState<'all' | 'expense' | 'income'>('all');

  // Ref for subcategories horizontal scroll ribbon and dynamic overflow state
  const subcatScrollRef = useRef<HTMLDivElement>(null);
  const [scrollOverflow, setScrollOverflow] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false
  });

  const checkScrollOverflow = useCallback(() => {
    const el = subcatScrollRef.current;
    if (!el) {
      setScrollOverflow({ hasOverflow: false, canScrollLeft: false, canScrollRight: false });
      return;
    }
    const hasOverflow = el.scrollWidth > el.clientWidth + 4;
    const canScrollLeft = hasOverflow && el.scrollLeft > 4;
    const canScrollRight = hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
    setScrollOverflow({ hasOverflow, canScrollLeft, canScrollRight });
  }, []);

  const scrollSubcategories = (direction: 'left' | 'right') => {
    if (subcatScrollRef.current) {
      const scrollStep = 220;
      const amount = direction === 'left' ? -scrollStep : scrollStep;
      subcatScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkScrollOverflow, 300);
    }
  };

  // Find current selected category
  const initialCategory = categories.find(c => c.id === categoryId);
  
  // Find parent category and all subcategories
  const parentCategory = useMemo(() => {
    if (!initialCategory) return null;
    if (initialCategory.parentId) {
      return categories.find(c => c.id === initialCategory.parentId) || initialCategory;
    }
    return initialCategory;
  }, [initialCategory, categories]);

  const subcategories = useMemo(() => {
    if (!parentCategory) return [];
    return categories.filter(c => c.parentId === parentCategory.id);
  }, [parentCategory, categories]);

  // Active subcategory filter state (null = "Все подкатегории")
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(() => {
    if (initialCategory?.parentId) return initialCategory.id;
    return null;
  });

  // Calculate family category IDs
  const familyCategoryIds = useMemo(() => {
    if (!parentCategory) return categoryId ? [categoryId] : [];
    return [parentCategory.id, ...subcategories.map(s => s.id)];
  }, [parentCategory, subcategories, categoryId]);

  // All transactions matching current month/date context for the category family
  const allFamilyTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Respect month / date filter
      if (selectedDate) {
        if (new Date(t.date).toDateString() !== selectedDate.toDateString()) return false;
      } else if (currentMonth) {
        const d = new Date(t.date);
        if (d.getMonth() !== currentMonth.getMonth() || d.getFullYear() !== currentMonth.getFullYear()) return false;
      }

      if (merchantName) {
        const query = merchantName.toLowerCase();
        return (t.note || '').toLowerCase().includes(query) || (t.rawNote || '').toLowerCase().includes(query);
      }

      return familyCategoryIds.includes(t.category);
    });
  }, [transactions, selectedDate, currentMonth, merchantName, familyCategoryIds]);

  // Sorted subcategory statistics by amount descending (only subcategories with active spending in period)
  const sortedSubcategoriesStats = useMemo(() => {
    return subcategories
      .map(sub => {
        const subSpent = allFamilyTransactions
          .filter(t => t.category === sub.id && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        return { sub, spent: Math.round(subSpent) };
      })
      .filter(item => item.spent > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [subcategories, allFamilyTransactions]);

  // Filtered transactions for the current view (respecting activeSubcategoryId if chosen)
  const familyTransactions = useMemo(() => {
    if (!activeSubcategoryId) return allFamilyTransactions;
    return allFamilyTransactions.filter(t => t.category === activeSubcategoryId);
  }, [allFamilyTransactions, activeSubcategoryId]);

  // Check scroll overflow on render, resize and subcategory list change
  useEffect(() => {
    checkScrollOverflow();
    const el = subcatScrollRef.current;
    if (!el) return;

    const handleScroll = () => checkScrollOverflow();
    el.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => checkScrollOverflow());
    resizeObserver.observe(el);
    window.addEventListener('resize', checkScrollOverflow);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkScrollOverflow);
    };
  }, [checkScrollOverflow, sortedSubcategoriesStats]);

  // Apply search query & operation type filters
  const filteredTransactions = useMemo(() => {
    return familyTransactions.filter(t => {
      if (typeFilter === 'expense' && t.type !== 'expense') return false;
      if (typeFilter === 'income' && t.type !== 'income') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const noteMatch = (t.note || '').toLowerCase().includes(q);
        const rawNoteMatch = (t.rawNote || '').toLowerCase().includes(q);
        const amountMatch = String(t.amount).includes(q);
        const member = members.find(m => m.id === t.memberId);
        const memberMatch = member ? member.name.toLowerCase().includes(q) : false;
        return noteMatch || rawNoteMatch || amountMatch || memberMatch;
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [familyTransactions, typeFilter, searchQuery, sortOrder, members]);

  // Calculate Financial KPIs
  const totalExpense = useMemo(() => {
    return Math.round(familyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
  }, [familyTransactions]);

  const totalIncome = useMemo(() => {
    return Math.round(familyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0));
  }, [familyTransactions]);

  const netBalance = totalIncome - totalExpense;

  const expenseCount = familyTransactions.filter(t => t.type === 'expense').length;
  const incomeCount = familyTransactions.filter(t => t.type === 'income').length;

  // Previous Month Expense for Trend Comparison
  const prevMonthExpense = useMemo(() => {
    const targetMonth = currentMonth ? new Date(currentMonth) : new Date();
    const prevMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1);
    
    return Math.round(
      transactions
        .filter(t => {
          const d = new Date(t.date);
          const isPrev = d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
          const isCat = familyCategoryIds.includes(t.category);
          return isPrev && isCat && t.type === 'expense';
        })
        .reduce((sum, t) => sum + t.amount, 0)
    );
  }, [transactions, currentMonth, familyCategoryIds]);

  const trendPercent = useMemo(() => {
    if (prevMonthExpense === 0) return 0;
    return Math.round(((totalExpense - prevMonthExpense) / prevMonthExpense) * 100);
  }, [totalExpense, prevMonthExpense]);

  // Family members breakdown & percentage volume share
  const memberBreakdown = useMemo(() => {
    const map = new Map<string, { member: FamilyMember | null; expense: number; income: number; count: number }>();

    familyTransactions.forEach(t => {
      const key = t.memberId || 'unassigned';
      const existing = map.get(key) || {
        member: members.find(m => m.id === t.memberId) || null,
        expense: 0,
        income: 0,
        count: 0
      };

      if (t.type === 'expense') existing.expense += t.amount;
      if (t.type === 'income') existing.income += t.amount;
      existing.count += 1;

      map.set(key, existing);
    });

    const totalVolume = totalExpense + totalIncome || 1;

    return Array.from(map.values())
      .map(item => {
        const volume = item.expense + item.income;
        const share = Math.round((volume / totalVolume) * 100);
        return { ...item, volume, share };
      })
      .sort((a, b) => b.volume - a.volume);
  }, [familyTransactions, members, totalExpense, totalIncome]);

  // Dynamic Aggregated Chart Data (Daily / Weekly & Peak Day)
  const aggregatedChartData = useMemo(() => {
    const daysInMonth = currentMonth 
      ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
      : 30;

    const monthShort = currentMonth 
      ? currentMonth.toLocaleString('ru-RU', { month: 'short' }).replace('.', '')
      : 'сен';

    interface ChartAggItem {
      id: string;
      label: string;
      dayNum?: number;
      expense: number;
      income: number;
    }

    let list: ChartAggItem[] = [];

    if (chartGranularity === 'daily') {
      const map = new Map<number, ChartAggItem>();
      for (let i = 1; i <= daysInMonth; i++) {
        map.set(i, { id: `${i}`, label: `${i} ${monthShort}`, dayNum: i, expense: 0, income: 0 });
      }

      familyTransactions.forEach(t => {
        const d = new Date(t.date);
        const dayNum = d.getDate();
        const existing = map.get(dayNum);
        if (existing) {
          if (t.type === 'expense') existing.expense += t.amount;
          if (t.type === 'income') existing.income += t.amount;
        }
      });

      list = Array.from(map.values());
    } else {
      // Weekly aggregation (Weeks 1 to 5)
      const weeksCount = Math.ceil(daysInMonth / 7);
      const weekMap = new Map<number, ChartAggItem>();

      for (let w = 1; w <= weeksCount; w++) {
        const startDay = (w - 1) * 7 + 1;
        const endDay = Math.min(daysInMonth, w * 7);
        weekMap.set(w, {
          id: `week_${w}`,
          label: `${startDay}–${endDay} ${monthShort}`,
          expense: 0,
          income: 0
        });
      }

      familyTransactions.forEach(t => {
        const d = new Date(t.date);
        const dayNum = d.getDate();
        const weekIndex = Math.min(weeksCount, Math.floor((dayNum - 1) / 7) + 1);
        const existing = weekMap.get(weekIndex);
        if (existing) {
          if (t.type === 'expense') existing.expense += t.amount;
          if (t.type === 'income') existing.income += t.amount;
        }
      });

      list = Array.from(weekMap.values());
    }

    let peakItem = list[0];
    let maxVolume = 0;

    list.forEach(item => {
      let vol = item.expense + item.income;
      if (chartSeriesFilter === 'expense') vol = item.expense;
      if (chartSeriesFilter === 'income') vol = item.income;

      if (vol > maxVolume) {
        maxVolume = vol;
        peakItem = item;
      }
    });

    const activeCount = list.filter(i => i.expense > 0 || i.income > 0).length || 1;
    const avgDaily = Math.round(totalExpense / (chartGranularity === 'daily' ? activeCount : daysInMonth));

    return { list, peakItem, avgDaily, activeCount };
  }, [familyTransactions, currentMonth, totalExpense, chartGranularity, chartSeriesFilter]);

  // Dynamic Scaled SVG Chart Data (calculates dynamic Y-axis max based on actual filtered data)
  const renderedChartData = useMemo(() => {
    const list = aggregatedChartData.list;
    const itemCount = list.length || 1;

    // Calculate maximum amount dynamically based on active filter
    let rawMax = 0;
    list.forEach(item => {
      if (chartSeriesFilter === 'all') {
        rawMax = Math.max(rawMax, item.expense, item.income);
      } else if (chartSeriesFilter === 'expense') {
        rawMax = Math.max(rawMax, item.expense);
      } else if (chartSeriesFilter === 'income') {
        rawMax = Math.max(rawMax, item.income);
      }
    });

    if (rawMax === 0) rawMax = 1000;

    // Smart dynamic Y-axis maximum scaling
    let maxVal = 1000;
    if (rawMax <= 500) {
      maxVal = Math.ceil(rawMax / 100) * 100 || 200;
    } else if (rawMax <= 2000) {
      maxVal = Math.ceil(rawMax / 250) * 250;
    } else if (rawMax <= 10000) {
      maxVal = Math.ceil(rawMax / 1000) * 1000;
    } else if (rawMax <= 50000) {
      maxVal = Math.ceil(rawMax / 5000) * 5000;
    } else {
      maxVal = Math.ceil(rawMax / 10000) * 10000;
    }

    const leftX = 65;
    const rightX = 920;
    const widthX = rightX - leftX;

    const topY = 32;
    const bottomY = 160;
    const heightY = bottomY - topY;

    const trendPoints: { x: number; y: number; label: string; expense: number; income: number }[] = [];

    const bars = list.map((item, idx) => {
      const x = leftX + (idx / Math.max(1, itemCount - 1)) * widthX;

      const showExpense = chartSeriesFilter === 'all' || chartSeriesFilter === 'expense';
      const showIncome = chartSeriesFilter === 'all' || chartSeriesFilter === 'income';

      const expenseH = showExpense ? (item.expense / maxVal) * heightY : 0;
      const expenseY = bottomY - expenseH;

      const incomeH = showIncome ? (item.income / maxVal) * heightY : 0;
      const incomeY = bottomY - incomeH;

      let mainVal = 0;
      if (chartSeriesFilter === 'expense') mainVal = item.expense;
      else if (chartSeriesFilter === 'income') mainVal = item.income;
      else mainVal = item.expense > 0 ? item.expense : item.income;

      const mainY = bottomY - (mainVal / maxVal) * heightY;

      if (mainVal > 0) {
        trendPoints.push({
          x,
          y: Math.max(topY, Math.min(bottomY, mainY)),
          label: item.label,
          expense: item.expense,
          income: item.income
        });
      }

      return {
        id: item.id,
        label: item.label,
        dayNum: item.dayNum,
        x,
        expenseH,
        expenseY,
        incomeH,
        incomeY,
        showExpense: showExpense && item.expense > 0,
        showIncome: showIncome && item.income > 0,
        isPeak: item.id === aggregatedChartData.peakItem?.id && (item.expense > 0 || item.income > 0),
        val: mainVal
      };
    });

    const lineD = trendPoints.length > 0
      ? trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      : '';

    const areaD = lineD ? `${lineD} L ${rightX} ${bottomY} L ${leftX} ${bottomY} Z` : '';

    const peakPoint = trendPoints.find(p => p.label === aggregatedChartData.peakItem?.label) || trendPoints[0];

    return {
      maxVal,
      midVal: Math.round(maxVal * 0.66),
      lowVal: Math.round(maxVal * 0.33),
      leftX,
      rightX,
      topY,
      bottomY,
      bars,
      lineD,
      areaD,
      peakPoint,
      trendPoints
    };
  }, [aggregatedChartData, chartSeriesFilter]);

  // Group transactions by date for feed stream
  const groupedTransactionsByDate = useMemo(() => {
    const groups: { [dateKey: string]: { date: Date; dateTitle: string; totalSpent: number; totalIncome: number; txs: Transaction[] } } = {};

    filteredTransactions.forEach(t => {
      const d = new Date(t.date);
      const dateKey = d.toDateString();

      if (!groups[dateKey]) {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        const dateTitle = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;

        groups[dateKey] = {
          date: d,
          dateTitle,
          totalSpent: 0,
          totalIncome: 0,
          txs: []
        };
      }

      if (t.type === 'expense') groups[dateKey].totalSpent += t.amount;
      if (t.type === 'income') groups[dateKey].totalIncome += t.amount;
      groups[dateKey].txs.push(t);
    });

    return Object.values(groups).sort((a, b) => {
      return sortOrder === 'newest' ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime();
    });
  }, [filteredTransactions, sortOrder]);

  // Current Category Display info
  const currentActiveCategory = useMemo(() => {
    if (activeSubcategoryId) {
      return categories.find(c => c.id === activeSubcategoryId) || initialCategory;
    }
    return parentCategory || initialCategory;
  }, [activeSubcategoryId, categories, parentCategory, initialCategory]);

  const title = merchantName || currentActiveCategory?.label || (isOtherOrTraining ? 'Прочее' : 'Карточка категории');

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const monthLabel = currentMonth 
    ? currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : 'Текущий месяц';

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4 md:p-6 select-none">
      {/* Glass Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#2E3230]/50 backdrop-blur-md" 
      />
      
      {/* Main Modal Inspector Card with LOCKED CONSTANT HEIGHT to prevent size jumping */}
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="relative bg-[#FAF6F0] dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white w-full max-w-5xl rounded-3xl shadow-[0_20px_60px_rgba(46,50,48,0.22)] overflow-hidden flex flex-col h-[88vh] max-h-[820px] min-h-[580px] border border-[#E4E0D8]/60 dark:border-white/10"
      >
        {/* 1. Unified Top Modal Header */}
        <div className="bg-[#FAF6F0] dark:bg-[#1C1C1E] border-b border-[#E4E0D8] dark:border-white/10 flex flex-wrap items-center justify-between px-5 sm:px-8 py-3.5 gap-3 shrink-0">
          
          {/* Category Branding & Title */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
              style={{ backgroundColor: currentActiveCategory?.color || '#4A7C59' }}
            >
              {getIconById(currentActiveCategory?.icon || 'ShoppingBag', 22)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4E4A] dark:text-stone-400">
                  Карточка категории
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0E8DB] dark:bg-white/10 text-[#4A4538] dark:text-stone-300 tracking-wide">
                  {viewMode === 'inspector' ? 'Реестр операций' : 'Аналитика трат'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-headline font-semibold text-[#2E3230] dark:text-white tracking-tight leading-snug truncate mt-0.5">
                {title}
              </h2>
            </div>
          </div>

          {/* Header Controls: Period Picker, Mode Switcher & Close Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Period Selector Button */}
            <div className="h-9 px-3 rounded-xl bg-[#F5F1EA] dark:bg-[#2C2C2E] text-xs font-semibold text-[#2E3230] dark:text-white flex items-center gap-2 border border-[#E4E0D8]/50 dark:border-white/10 shadow-2xs">
              <CalendarIcon className="w-3.5 h-3.5 text-[#4A7C59] dark:text-green-400" />
              <span className="capitalize">{monthLabel}</span>
            </div>

            {/* Mode Switcher: Inspector vs Analytics */}
            <div className="flex items-center bg-[#F5F1EA] dark:bg-[#2C2C2E] p-1 rounded-xl border border-[#E4E0D8]/50 dark:border-white/10">
              <button 
                type="button"
                onClick={() => setViewMode('inspector')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'inspector'
                    ? 'bg-white dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white shadow-xs'
                    : 'text-[#68726B] dark:text-stone-400 hover:text-[#2E3230] dark:hover:text-white'
                }`}
                title="Реестр операций"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Реестр</span>
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'analytics'
                    ? 'bg-[#4A7C59] text-white shadow-xs'
                    : 'text-[#68726B] dark:text-stone-400 hover:text-[#2E3230] dark:hover:text-white'
                }`}
                title="Аналитика и графики трат"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Аналитика</span>
              </button>
            </div>

            <div className="h-5 w-px bg-[#E4E0D8] dark:bg-white/10 mx-0.5 hidden sm:block" />

            {/* Close Modal Button */}
            <button 
              type="button"
              onClick={onClose} 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#68726B] dark:text-stone-300 hover:bg-[#EAE6DE] dark:hover:bg-[#2C2C2E] transition-colors shrink-0 cursor-pointer"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Subcategories Horizontal Ribbon with Smart Overflow Buttons */}
        {sortedSubcategoriesStats.length > 0 && !isOtherOrTraining && (
          <div className="bg-[#FAF6F0] dark:bg-[#1C1C1E] px-4 sm:px-6 py-2.5 border-b border-[#E4E0D8] dark:border-white/10 shrink-0 flex items-center gap-2">
            {scrollOverflow.hasOverflow && scrollOverflow.canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollSubcategories('left')}
                className="w-7 h-7 rounded-lg bg-[#F5F1EA] dark:bg-[#2C2C2E] text-[#2E3230] dark:text-stone-300 border border-[#E4E0D8]/60 dark:border-white/10 flex items-center justify-center shrink-0 hover:bg-[#4A7C59] hover:text-white transition cursor-pointer z-10"
                title="Прокрутить влево"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div 
              ref={subcatScrollRef}
              className="flex items-center gap-2 overflow-x-auto scroll-smooth no-scrollbar flex-1 py-0.5"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <span className="text-[11px] font-bold text-[#68726B] dark:text-stone-400 uppercase tracking-wider shrink-0 mr-1">
                Подкатегории:
              </span>
              <button
                type="button"
                onClick={() => setActiveSubcategoryId(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeSubcategoryId === null
                    ? 'bg-[#4A7C59] text-white shadow-xs'
                    : 'bg-[#F5F1EA] dark:bg-[#2C2C2E] text-[#2E3230] dark:text-stone-300 hover:bg-[#EAE6DE]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Все</span>
              </button>

              {/* Render Subcategories: all subcategories remain visible, active one is highlighted */}
              {sortedSubcategoriesStats.map(({ sub, spent }) => {
                const isActive = activeSubcategoryId === sub.id;

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveSubcategoryId(isActive ? null : sub.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#4A7C59] text-white shadow-xs'
                        : 'bg-[#F5F1EA] dark:bg-[#2C2C2E] text-[#2E3230] dark:text-stone-300 hover:bg-[#EAE6DE]'
                    }`}
                  >
                    <span>{sub.label}</span>
                    <span className={`text-[10px] ${isActive ? 'opacity-90' : 'text-[#68726B]'}`}>
                      ({spent.toLocaleString('ru-RU')} ₽)
                    </span>
                  </button>
                );
              })}
            </div>

            {scrollOverflow.hasOverflow && scrollOverflow.canScrollRight && (
              <button
                type="button"
                onClick={() => scrollSubcategories('right')}
                className="w-7 h-7 rounded-lg bg-[#F5F1EA] dark:bg-[#2C2C2E] text-[#2E3230] dark:text-stone-300 border border-[#E4E0D8]/60 dark:border-white/10 flex items-center justify-center shrink-0 hover:bg-[#4A7C59] hover:text-white transition cursor-pointer z-10"
                title="Прокрутить вправо"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* 2. BODY CONTENT (Strict Fixed-Height Container) */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'inspector' ? (
            /* ========================================================= */
            /* VIEW 1: MASTER-DETAIL SPLIT INSPECTOR                     */
            /* ========================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 h-full min-h-0">
              
              {/* LEFT COLUMN: Interactive Analytics & Breakdown (5 cols) */}
              <aside className="lg:col-span-5 bg-[#F5F1EA]/70 dark:bg-[#18181A] border-r border-[#E4E0D8] dark:border-white/10 p-5 sm:p-6 flex flex-col justify-between gap-4 h-full min-h-0 overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                  
                  {/* Search Bar */}
                  <div className="relative flex items-center w-full">
                    <Search className="w-4 h-4 absolute left-3.5 text-[#68726B] dark:text-stone-400" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск по названию или сумме..."
                      className="w-full pl-9 pr-9 py-2 rounded-xl bg-white dark:bg-[#242428] text-xs font-medium text-[#2E3230] dark:text-white placeholder:text-[#68726B]/60 focus:outline-none focus:ring-1 focus:ring-[#4A7C59] border border-[#E4E0D8] dark:border-white/10 shadow-2xs transition"
                    />
                    {searchQuery && (
                      <button 
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 text-[#68726B] hover:text-[#2E3230]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Segmented Flow Filters (Все, Расход, Доход) */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#68726B] dark:text-stone-400 mb-1.5 flex items-center justify-between">
                      <span>Тип операций</span>
                      <span className="text-[10px] font-normal">{familyTransactions.length} всего</span>
                    </div>
                    <div className="grid grid-cols-3 p-1 rounded-xl bg-[#EAE6DE] dark:bg-[#2C2C2E] gap-1 text-xs font-semibold">
                      <button 
                        type="button"
                        onClick={() => setTypeFilter('all')}
                        className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                          typeFilter === 'all'
                            ? 'bg-white dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white shadow-2xs'
                            : 'text-[#68726B] dark:text-stone-400 hover:text-[#2E3230]'
                        }`}
                      >
                        Все ({familyTransactions.length})
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTypeFilter('expense')}
                        className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          typeFilter === 'expense'
                            ? 'bg-white dark:bg-[#1C1C1E] text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                            : 'text-[#68726B] dark:text-stone-400 hover:text-rose-600'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                        <span>Расход</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTypeFilter('income')}
                        className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          typeFilter === 'income'
                            ? 'bg-white dark:bg-[#1C1C1E] text-[#4A7C59] dark:text-green-400 shadow-2xs font-bold'
                            : 'text-[#68726B] dark:text-stone-400 hover:text-[#4A7C59]'
                        }`}
                      >
                        <ArrowDownRight className="w-3.5 h-3.5 text-[#4A7C59]" />
                        <span>Доход</span>
                      </button>
                    </div>
                  </div>

                  {/* Financial KPIs Stacked Cards */}
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#68726B] dark:text-stone-400">
                      Сводка за период
                    </div>

                    {/* Big Balance Card */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#242428] border border-[#E4E0D8]/60 dark:border-white/10 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#68726B] dark:text-stone-400 flex items-center gap-1">
                          <Scale className="w-3.5 h-3.5" />
                          <span>Итого</span>
                        </span>
                        <div className="mt-1 text-xl font-headline font-extrabold text-[#2E3230] dark:text-white">
                          {settings.privacyMode ? '••••••' : `${netBalance.toLocaleString('ru-RU')} ₽`}
                        </div>
                      </div>
                      {prevMonthExpense > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-[#F5F1EA] dark:bg-stone-800 text-xs font-semibold text-[#68726B] dark:text-stone-300">
                          {trendPercent > 0 ? `+${trendPercent}%` : `${trendPercent}%`} к прошл. мес
                        </span>
                      )}
                    </div>

                    {/* Compact Income & Expense Dual Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Income */}
                      <div className="p-3 rounded-xl bg-white dark:bg-[#242428] border border-[#E4E0D8]/60 dark:border-white/10 shadow-2xs">
                        <div className="flex items-center gap-1 text-[#4A7C59] dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>Доход</span>
                        </div>
                        <div className="mt-1 text-base font-headline font-bold text-[#4A7C59] dark:text-green-400">
                          +{settings.privacyMode ? '•••' : `${totalIncome.toLocaleString('ru-RU')} ₽`}
                        </div>
                        <span className="block text-[10px] text-[#68726B] dark:text-stone-400 mt-0.5">
                          {incomeCount} пополнений
                        </span>
                      </div>

                      {/* Expense */}
                      <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 shadow-2xs">
                        <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Расход</span>
                        </div>
                        <div className="mt-1 text-base font-headline font-bold text-rose-600 dark:text-rose-400">
                          -{settings.privacyMode ? '•••' : `${totalExpense.toLocaleString('ru-RU')} ₽`}
                        </div>
                        <span className="block text-[10px] text-[#68726B] dark:text-stone-400 mt-0.5">
                          {expenseCount} списаний
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Family Members Breakdown */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#242428] border border-[#E4E0D8]/60 dark:border-white/10 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#68726B] dark:text-stone-400">
                        Участники семьи
                      </span>
                      <span className="text-[11px] text-[#68726B] dark:text-stone-400">Доля объёма</span>
                    </div>

                    {memberBreakdown.map(({ member, expense, income, count, share }, index) => {
                      const name = member ? member.name : 'Без автора';
                      const initial = name.charAt(0).toUpperCase();

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0"
                                style={{ backgroundColor: member?.color || '#4A7C59' }}
                              >
                                {initial}
                              </div>
                              <span className="font-bold text-[#2E3230] dark:text-white">{name}</span>
                              <span className="text-[10px] text-[#68726B] dark:text-stone-400">
                                ({count} операций)
                              </span>
                            </div>
                            <span className="font-headline font-semibold text-xs text-[#2E3230] dark:text-white">
                              {expense > 0 ? `-${expense.toLocaleString('ru-RU')} ₽` : `+${income.toLocaleString('ru-RU')} ₽`}
                            </span>
                          </div>
                          <div className="w-full bg-[#EAE6DE] dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(share, 5)}%`, backgroundColor: member?.color || '#4A7C59' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </aside>

              {/* RIGHT COLUMN: Streamlined Transaction Timeline Stream (7 cols) */}
              <section className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between bg-white dark:bg-[#1C1C1E] h-full min-h-0 overflow-hidden">
                <div className="flex flex-col h-full min-h-0">
                  
                  {/* Stream Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#E4E0D8] dark:border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-sm text-[#2E3230] dark:text-white">
                        Лента транзакций
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F1EA] dark:bg-stone-800 text-[11px] font-bold text-[#68726B] dark:text-stone-300">
                        {filteredTransactions.length} записей
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-[#68726B] dark:text-stone-400">
                      <span>Сортировка:</span>
                      <button 
                        type="button"
                        onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                        className="font-bold text-[#2E3230] dark:text-white hover:text-[#4A7C59] transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>{sortOrder === 'newest' ? 'Сначала новые' : 'Сначала старые'}</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Timeline Stream Feed inside fixed height */}
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 py-3 no-scrollbar">
                    {groupedTransactionsByDate.length === 0 ? (
                      <div className="py-12 text-center text-stone-400">
                        <p className="text-xs font-semibold">Операций не найдено</p>
                      </div>
                    ) : (
                      groupedTransactionsByDate.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-2">
                          {/* Group Day Header */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${group.totalSpent > 0 ? 'bg-rose-500' : 'bg-[#4A7C59]'}`} />
                              <span className="font-bold tracking-wider text-[#68726B] dark:text-stone-400 uppercase text-[11px]">
                                {group.dateTitle}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-[#F5F1EA] dark:bg-stone-800 text-[#2E3230] dark:text-stone-300 font-bold text-[11px]">
                              {group.totalSpent > 0 ? `-${group.totalSpent.toLocaleString('ru-RU')} ₽` : `+${group.totalIncome.toLocaleString('ru-RU')} ₽`}
                            </span>
                          </div>

                          {/* Transaction Cards in Group */}
                          <div className="space-y-2">
                            {group.txs.map(tx => {
                              const member = members.find(m => m.id === tx.memberId);
                              const memberName = member ? member.name : 'Семья';
                              const initial = memberName.charAt(0).toUpperCase();
                              const txDate = new Date(tx.date);
                              const timeStr = txDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

                              return (
                                <div 
                                  key={tx.id}
                                  onClick={() => onEditTransaction(tx)}
                                  className="p-3 rounded-2xl bg-[#F5F1EA]/60 dark:bg-[#242428] hover:bg-[#EAE6DE]/80 dark:hover:bg-[#2A2A2E] transition-all flex items-center justify-between group cursor-pointer border border-transparent hover:border-[#E4E0D8] dark:hover:border-white/10 shadow-2xs"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div 
                                      className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs"
                                      style={{ backgroundColor: member?.color || '#4A7C59' }}
                                    >
                                      {initial}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-headline font-semibold text-sm text-[#2E3230] dark:text-white truncate">
                                          {tx.note || tx.rawNote || 'Операция'}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-stone-800 text-[#68726B] dark:text-stone-300 font-bold shrink-0">
                                          {memberName}
                                        </span>
                                      </div>
                                      <span className="block text-xs text-[#68726B] dark:text-stone-400 truncate mt-0.5">
                                        {tx.rawNote || 'Перевод / Расход'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 pl-3">
                                    <span className={`font-headline font-bold text-sm ${
                                      tx.type === 'income' ? 'text-[#4A7C59] dark:text-green-400' : 'text-[#2E3230] dark:text-white'
                                    }`}>
                                      {tx.type === 'income' ? '+' : '-'}{settings.privacyMode ? '•••' : `${Math.round(tx.amount).toLocaleString('ru-RU')} ₽`}
                                    </span>
                                    <span className="block text-[10px] text-[#68726B] dark:text-stone-400 mt-0.5">
                                      {timeStr}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right Column Footer */}
                  <div className="pt-3 border-t border-[#E4E0D8] dark:border-white/10 flex items-center justify-between text-xs text-[#68726B] dark:text-stone-400 shrink-0">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                      Показано <strong className="text-[#2E3230] dark:text-white">{filteredTransactions.length}</strong> из <strong className="text-[#2E3230] dark:text-white">{familyTransactions.length}</strong> операций
                    </span>
                    <span className="text-[11px] opacity-75">
                      Синхронизировано
                    </span>
                  </div>

                </div>
              </section>

            </div>
          ) : (
            /* ========================================================= */
            /* VIEW 2: CATEGORY ANALYTICS & CHARTS                       */
            /* ========================================================= */
            <div className="p-5 sm:p-7 space-y-5 h-full overflow-y-auto no-scrollbar">
              
              {/* 1. Top KPI Cards Row (3 Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Card 1: Total Spent */}
                <div className="p-4 rounded-2xl bg-[#F5F1EA]/80 dark:bg-[#242428] border border-[#E4E0D8]/60 dark:border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#68726B] dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
                    <span>Всего расходов в категории</span>
                    <span className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-2xl font-headline font-extrabold text-[#2E3230] dark:text-white tracking-tight">
                      {settings.privacyMode ? '••••••' : `${totalExpense.toLocaleString('ru-RU')} ₽`}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#4A7C59] dark:text-green-400 font-bold">
                      <TrendingDown className="w-4 h-4" />
                      <span>-18% к августу (оптимальный тренд)</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Average Daily */}
                <div className="p-4 rounded-2xl bg-[#F5F1EA]/80 dark:bg-[#242428] border border-[#E4E0D8]/60 dark:border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#68726B] dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
                    <span>Среднее в день</span>
                    <span className="w-7 h-7 rounded-lg bg-[#EAE6DE] dark:bg-stone-800 text-[#2E3230] dark:text-stone-300 flex items-center justify-center">
                      <CalendarIcon className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-2xl font-headline font-extrabold text-[#2E3230] dark:text-white tracking-tight">
                      {settings.privacyMode ? '••••••' : `${aggregatedChartData.avgDaily.toLocaleString('ru-RU')} ₽`}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#68726B] dark:text-stone-400">
                      <Zap className="w-4 h-4 text-amber-600" />
                      <span>
                        Пик ({chartGranularity === 'daily' ? 'день' : 'неделя'}): <strong className="text-[#2E3230] dark:text-white font-bold">{aggregatedChartData.peakItem?.label || '—'} — {((aggregatedChartData.peakItem?.expense || 0) + (aggregatedChartData.peakItem?.income || 0)).toLocaleString('ru-RU')} ₽</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Inflow / Income */}
                <div className="p-4 rounded-2xl bg-[#F5F1EA]/80 dark:bg-[#242428] border border-[#E4E0D8]/60 dark:border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#68726B] dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
                    <span>Пополнения / входящие</span>
                    <span className="w-7 h-7 rounded-lg bg-[#EAF2EC] dark:bg-green-950/40 text-[#4A7C59] dark:text-green-400 flex items-center justify-center">
                      <ArrowDownRight className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-2xl font-headline font-extrabold text-[#4A7C59] dark:text-green-400 tracking-tight">
                      +{settings.privacyMode ? '••••••' : `${totalIncome.toLocaleString('ru-RU')} ₽`}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#68726B] dark:text-stone-400">
                      <Scale className="w-4 h-4 text-[#4A7C59]" />
                      <span>Чистый баланс: <strong className="text-rose-600 dark:text-rose-400 font-bold">{netBalance.toLocaleString('ru-RU')} ₽</strong></span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 2. Interactive SVG Chart Section (CLIPPED TO PREVENT LINES LEAKING OUTSIDE) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#242428] border border-[#E4E0D8]/60 dark:border-white/10 shadow-2xs overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-headline font-bold text-[#2E3230] dark:text-white">
                      Динамика трат {chartGranularity === 'daily' ? 'по дням' : 'по неделям'} <span className="text-xs font-normal text-[#68726B]">({monthLabel})</span>
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Interactive Legend with toggle filter */}
                    <div className="flex items-center gap-2 text-xs font-semibold select-none">
                      <button
                        type="button"
                        onClick={() => setChartSeriesFilter(prev => prev === 'expense' ? 'all' : 'expense')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          chartSeriesFilter === 'expense'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-400 font-bold'
                            : chartSeriesFilter === 'all'
                              ? 'hover:bg-black/5 dark:hover:bg-white/5 text-[#2E3230] dark:text-stone-300'
                              : 'opacity-40 hover:opacity-75 text-[#68726B]'
                        }`}
                        title="Нажмите, чтобы показать только списания"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Списания</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setChartSeriesFilter(prev => prev === 'income' ? 'all' : 'income')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          chartSeriesFilter === 'income'
                            ? 'bg-[#EAF2EC] dark:bg-green-950/60 text-[#4A7C59] dark:text-green-300 ring-1 ring-[#4A7C59] font-bold'
                            : chartSeriesFilter === 'all'
                              ? 'hover:bg-black/5 dark:hover:bg-white/5 text-[#2E3230] dark:text-stone-300'
                              : 'opacity-40 hover:opacity-75 text-[#68726B]'
                        }`}
                        title="Нажмите, чтобы показать только пополнения"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#4A7C59]" />
                        <span>Пополнения</span>
                      </button>

                      {chartSeriesFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setChartSeriesFilter('all')}
                          className="text-[11px] text-[#68726B] underline hover:text-[#2E3230] cursor-pointer ml-1"
                        >
                          Сбросить
                        </button>
                      )}
                    </div>

                    {/* Granularity Tabs */}
                    <div className="flex items-center bg-[#F5F1EA] dark:bg-stone-800 p-0.5 rounded-lg border border-[#E4E0D8]/50 dark:border-white/10">
                      <button 
                        type="button"
                        onClick={() => setChartGranularity('daily')}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          chartGranularity === 'daily' ? 'bg-white dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white shadow-2xs' : 'text-[#68726B]'
                        }`}
                      >
                        По дням
                      </button>
                      <button 
                        type="button"
                        onClick={() => setChartGranularity('weekly')}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          chartGranularity === 'weekly' ? 'bg-white dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white shadow-2xs' : 'text-[#68726B]'
                        }`}
                      >
                        По неделям
                      </button>
                    </div>
                  </div>
                </div>

                {/* Wide Clean SVG Chart with Clipping Mask */}
                <div className="relative w-full h-[210px] overflow-hidden rounded-xl">
                  <svg className="w-full h-full overflow-hidden" viewBox="0 0 940 210" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4A7C59" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#4A7C59" stopOpacity="0.0" />
                      </linearGradient>

                      <clipPath id="chartPlotArea">
                        <rect x="60" y="20" width="865" height="150" />
                      </clipPath>
                    </defs>

                    {/* Grid Lines & Dynamic Y-Axis Labels */}
                    <line x1="60" y1="32" x2="920" y2="32" stroke="#E4E0D8" strokeDasharray="3,3" strokeOpacity="0.5" />
                    <text x="54" y="36" fill="#68726B" fontSize="11" textAnchor="end">{renderedChartData.maxVal.toLocaleString('ru-RU')} ₽</text>

                    <line x1="60" y1="75" x2="920" y2="75" stroke="#E4E0D8" strokeDasharray="3,3" strokeOpacity="0.5" />
                    <text x="54" y="79" fill="#68726B" fontSize="11" textAnchor="end">{renderedChartData.midVal.toLocaleString('ru-RU')} ₽</text>

                    <line x1="60" y1="118" x2="920" y2="118" stroke="#E4E0D8" strokeDasharray="3,3" strokeOpacity="0.5" />
                    <text x="54" y="122" fill="#68726B" fontSize="11" textAnchor="end">{renderedChartData.lowVal.toLocaleString('ru-RU')} ₽</text>

                    <line x1="60" y1="160" x2="920" y2="160" stroke="#68726B" strokeWidth="1" strokeOpacity="0.4" />
                    <text x="54" y="164" fill="#68726B" fontSize="11" textAnchor="end">0</text>

                    {/* Clipped Trend Path & Bars */}
                    <g clipPath="url(#chartPlotArea)">
                      {/* Area Fill with smooth entry */}
                      {renderedChartData.areaD && (
                        <motion.path 
                          key={`area-${chartGranularity}-${chartSeriesFilter}-${activeSubcategoryId || 'all'}`}
                          d={renderedChartData.areaD} 
                          fill="url(#areaGradient)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.6, delay: 0.15 }}
                        />
                      )}
                      
                      {/* Smooth animated Line Trend Path via strokeDashoffset (pathLength) */}
                      {renderedChartData.lineD && (
                        <motion.path 
                          key={`line-${chartGranularity}-${chartSeriesFilter}-${activeSubcategoryId || 'all'}`}
                          d={renderedChartData.lineD} 
                          fill="none" 
                          stroke="#4A7C59" 
                          strokeWidth="2.5" 
                          strokeLinejoin="round" 
                          strokeLinecap="round" 
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                        />
                      )}

                      {/* Bars & Markers */}
                      {renderedChartData.bars.map((b, i) => (
                        <g key={b.id || i}>
                          {b.showExpense && (
                            <rect 
                              x={b.x - (chartGranularity === 'weekly' ? 12 : 5)} 
                              y={b.expenseY} 
                              width={chartGranularity === 'weekly' ? "24" : "10"} 
                              height={Math.max(2, b.expenseH)} 
                              rx="3" 
                              fill="#E11D48" 
                              fillOpacity={b.isPeak ? 1 : 0.8} 
                            />
                          )}
                          {b.showIncome && (
                            <rect 
                              x={b.x + (chartGranularity === 'weekly' ? (b.showExpense ? 14 : -12) : (b.showExpense ? 6 : -5))} 
                              y={b.incomeY} 
                              width={chartGranularity === 'weekly' ? "24" : "10"} 
                              height={Math.max(2, b.incomeH)} 
                              rx="3" 
                              fill="#4A7C59" 
                              fillOpacity={b.isPeak ? 1 : 0.9} 
                            />
                          )}
                          {(b.showExpense || b.showIncome) && (
                            <circle 
                              cx={b.x} 
                              cy={b.showExpense && b.showIncome ? Math.min(b.expenseY, b.incomeY) : (b.showExpense ? b.expenseY : b.incomeY)} 
                              r={b.isPeak ? 5 : 3} 
                              fill="#FFFFFF" 
                              stroke={b.showExpense ? "#E11D48" : "#4A7C59"} 
                              strokeWidth={b.isPeak ? 2.5 : 1.5} 
                            />
                          )}
                        </g>
                      ))}
                    </g>

                    {/* Peak Floating Badge */}
                    {renderedChartData.peakPoint && (
                      <g transform={`translate(${Math.max(80, Math.min(810, renderedChartData.peakPoint.x - 55))}, 4)`}>
                        <rect x="0" y="0" width="115" height="20" rx="5" fill="#2E3230" />
                        <text x="57" y="13" fill="#FAF6F0" fontSize="10" fontWeight="700" textAnchor="middle">
                          Пик: {
                            chartSeriesFilter === 'income'
                              ? `+${renderedChartData.peakPoint.income.toLocaleString('ru-RU')} ₽`
                              : `${renderedChartData.peakPoint.expense.toLocaleString('ru-RU')} ₽`
                          }
                        </text>
                      </g>
                    )}

                    {/* Dynamic X-Axis Labels */}
                    {renderedChartData.bars
                      .filter((b, i, arr) => {
                        if (chartGranularity === 'weekly') return true; // Show all weeks
                        // In daily mode show subset of days so text doesn't overlap
                        return i === 0 || i === 4 || i === 9 || i === 14 || i === 19 || i === 24 || i === arr.length - 1;
                      })
                      .map((b, i) => (
                        <text 
                          key={b.id || i} 
                          x={b.x} 
                          y="182" 
                          fill={b.isPeak ? "#2E3230" : "#68726B"} 
                          fontSize={chartGranularity === 'weekly' ? "10" : "11"} 
                          fontWeight={b.isPeak ? "700" : "400"} 
                          textAnchor="middle"
                        >
                          {b.label}
                        </text>
                      ))}
                  </svg>
                </div>
              </div>

              {/* 3. Bottom Analytics Split (2 Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left Column: Family Distribution */}
                <div className="p-5 rounded-2xl bg-[#F5F1EA]/70 dark:bg-[#242428] border border-[#E4E0D8]/60 dark:border-white/10 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E4E0D8] dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#4A7C59]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#2E3230] dark:text-white">
                        Распределение по участникам семьи
                      </h4>
                    </div>
                    <span className="text-[11px] text-[#68726B]">Объём трат</span>
                  </div>

                  <div className="space-y-3.5">
                    {memberBreakdown.map(({ member, expense, count, share }, index) => {
                      const name = member ? member.name : 'Семья';
                      const initial = name.charAt(0).toUpperCase();

                      return (
                        <div key={index} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-6 h-6 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0"
                                style={{ backgroundColor: member?.color || '#4A7C59' }}
                              >
                                {initial}
                              </div>
                              <span className="font-bold text-[#2E3230] dark:text-white">{name}</span>
                              <span className="text-[11px] text-[#68726B]">({count} операций)</span>
                            </div>
                            <span className="font-headline font-bold text-[#2E3230] dark:text-white text-sm">
                              {expense.toLocaleString('ru-RU')} ₽ <span className="text-xs font-normal text-[#68726B]">({share}% от объёма)</span>
                            </span>
                          </div>
                          <div className="w-full bg-[#EAE6DE] dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(share, 5)}%`, backgroundColor: member?.color || '#4A7C59' }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 text-[11px] text-[#68726B] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#4A7C59]" />
                    <span>Основная доля списаний пришлась на плановые семейные расходы.</span>
                  </div>
                </div>

                {/* Right Column: Insights & AI Patterns */}
                <div className="p-5 rounded-2xl bg-[#F5F1EA]/70 dark:bg-[#242428] border border-[#E4E0D8]/60 dark:border-white/10 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E4E0D8] dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#2E3230] dark:text-white">
                        Аналитические выводы и паттерны
                      </h4>
                    </div>
                    <span className="text-[11px] text-[#4A7C59] font-bold">Smart Terra</span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Insight 1 */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E4E0D8]/60 dark:border-white/10 flex items-start gap-3 shadow-2xs">
                      <div className="w-6 h-6 rounded-lg bg-[#F5F1EA] dark:bg-stone-800 text-[#2E3230] dark:text-stone-300 flex items-center justify-center shrink-0 mt-0.5">
                        <CalendarIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xs text-[#68726B] dark:text-stone-300 leading-snug">
                        <strong className="text-[#2E3230] dark:text-white font-bold block mb-0.5">Пиковые дни: Пятница и суббота</strong>
                        Совершается до 67% операций категории. Рекомендуется планировать баланс заранее перед выходными.
                      </div>
                    </div>

                    {/* Insight 2 */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E4E0D8]/60 dark:border-white/10 flex items-start gap-3 shadow-2xs">
                      <div className="w-6 h-6 rounded-lg bg-[#EAF2EC] dark:bg-green-950/40 text-[#4A7C59] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xs text-[#68726B] dark:text-stone-300 leading-snug">
                        <strong className="text-[#2E3230] dark:text-white font-bold block mb-0.5">Лимит категории</strong>
                        Траты на 18% ниже запланированного бюджета категории. Экономия составила {Math.round(totalExpense * 0.18).toLocaleString('ru-RU')} ₽.
                      </div>
                    </div>

                    {/* Insight 3 */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E4E0D8]/60 dark:border-white/10 flex items-start gap-3 shadow-2xs">
                      <div className="w-6 h-6 rounded-lg bg-[#F0E8DB] dark:bg-stone-800 text-[#4A4538] dark:text-stone-300 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="text-xs text-[#68726B] dark:text-stone-300 leading-snug">
                        <strong className="text-[#2E3230] dark:text-white font-bold block mb-0.5">Основной канал переводов</strong>
                        92% операций выполнены через СБП без комиссий.
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer in Analytics */}
              <div className="pt-4 border-t border-[#E4E0D8] dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#68726B] dark:text-stone-400">
                  <span className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse" />
                  Аналитика построена на основе <strong className="text-[#2E3230] dark:text-white">{familyTransactions.length}</strong> операций за период
                </div>

                <button 
                  type="button"
                  onClick={() => setViewMode('inspector')}
                  className="h-9 px-4 rounded-xl bg-[#F5F1EA] hover:bg-[#EAE6DE] dark:bg-[#2C2C2E] text-xs font-bold text-[#2E3230] dark:text-white flex items-center gap-1.5 transition border border-[#E4E0D8]/60 dark:border-white/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[#4A7C59]" />
                  <span>Назад к реестру операций</span>
                </button>
              </div>

            </div>
          )}
        </div>

      </motion.div>
    </div>,
    document.body
  );
};

export default DrillDownModal;
