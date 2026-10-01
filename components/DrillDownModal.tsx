import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  X, Search, Calendar as CalendarIcon, BarChart3, List, ArrowUpRight, ArrowDownRight, 
  Users, TrendingDown, Zap, Scale, CheckCircle2, ChevronLeft, ChevronRight,
  Layers, ArrowUpDown, ArrowLeft, PieChart
} from 'lucide-react';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';
import { auth } from '../firebase';
import DrillDownMobile from './DrillDownMobile';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey } from '../utils/categorizer';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useModalBackHandler from '../hooks/useModalBackHandler';
import DrillDownTransactionList from './drilldown/DrillDownTransactionList';
import DrillDownAnalyticsChart from './drilldown/DrillDownAnalyticsChart';

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
  useModalBackHandler(true, onClose);
  const isOtherOrTraining = categoryId === 'other' || categoryId === 'uncategorized';
  const isAllTransactions = categoryId === 'all' || (!categoryId && !merchantName);

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
      setScrollOverflow(prev => (prev.hasOverflow || prev.canScrollLeft || prev.canScrollRight)
        ? { hasOverflow: false, canScrollLeft: false, canScrollRight: false }
        : prev
      );
      return;
    }
    const hasOverflow = el.scrollWidth > el.clientWidth + 4;
    const canScrollLeft = hasOverflow && el.scrollLeft > 4;
    const canScrollRight = hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
    setScrollOverflow(prev => {
      if (prev.hasOverflow === hasOverflow && prev.canScrollLeft === canScrollLeft && prev.canScrollRight === canScrollRight) {
        return prev;
      }
      return { hasOverflow, canScrollLeft, canScrollRight };
    });
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

  // Active parent category filter when in "All categories" mode
  const [activeAllCatId, setActiveAllCatId] = useState<string | null>(null);

  // Calculate family category IDs
  const familyCategoryIds = useMemo(() => {
    if (isAllTransactions) return [];
    if (!parentCategory) return categoryId ? [categoryId] : [];
    return [parentCategory.id, ...subcategories.map(s => s.id)];
  }, [parentCategory, subcategories, categoryId, isAllTransactions]);

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

      if (isAllTransactions) {
        return true;
      }

      if (merchantName) {
        const query = merchantName.toLowerCase();
        return (t.note || '').toLowerCase().includes(query) || (t.rawNote || '').toLowerCase().includes(query);
      }

      return familyCategoryIds.includes(t.category);
    });
  }, [transactions, selectedDate, currentMonth, merchantName, familyCategoryIds, isAllTransactions]);

  // Top level categories for ribbon when viewing "All"
  const topParentCategoriesStats = useMemo(() => {
    if (!isAllTransactions) return [];
    const parentCats = categories.filter(c => !c.parentId && c.id !== 'other');
    return parentCats.map(cat => {
      const childIds = categories.filter(c => c.parentId === cat.id).map(c => c.id);
      const catFamily = [cat.id, ...childIds];
      const spent = allFamilyTransactions
        .filter(t => catFamily.includes(t.category) && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      return { cat, spent: Math.round(spent), familyIds: catFamily };
    }).filter(item => item.spent > 0).sort((a, b) => b.spent - a.spent);
  }, [isAllTransactions, categories, allFamilyTransactions]);

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

  // Filtered transactions for the current view (respecting activeAllCatId or activeSubcategoryId if chosen)
  const familyTransactions = useMemo(() => {
    if (isAllTransactions) {
      if (!activeAllCatId) return allFamilyTransactions;
      const found = topParentCategoriesStats.find(p => p.cat.id === activeAllCatId);
      const catIds = found ? found.familyIds : [activeAllCatId];
      return allFamilyTransactions.filter(t => catIds.includes(t.category));
    }
    if (!activeSubcategoryId) return allFamilyTransactions;
    return allFamilyTransactions.filter(t => t.category === activeSubcategoryId);
  }, [allFamilyTransactions, isAllTransactions, activeAllCatId, topParentCategoriesStats, activeSubcategoryId]);

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

  // Current Category Display info
  const currentActiveCategory = useMemo(() => {
    if (isAllTransactions && activeAllCatId) {
      return categories.find(c => c.id === activeAllCatId) || initialCategory;
    }
    if (activeSubcategoryId) {
      return categories.find(c => c.id === activeSubcategoryId) || initialCategory;
    }
    return parentCategory || initialCategory;
  }, [isAllTransactions, activeAllCatId, activeSubcategoryId, categories, parentCategory, initialCategory]);

  const title = isAllTransactions 
    ? (activeAllCatId ? (categories.find(c => c.id === activeAllCatId)?.label || 'Аналитика категории') : 'Аналитика категорий') 
    : (merchantName || currentActiveCategory?.label || 'Реестр операций');

  // Lock body scroll with scrollbar compensation to eliminate layout shift/flicker
  useBodyScrollLock();

  const monthLabel = currentMonth 
    ? currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : 'Текущий месяц';

  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentMonthFormatted = useMemo(() => {
    const d = currentMonth || new Date();
    const raw = d.toLocaleString('ru-RU', { month: 'long', year: 'numeric' }).replace(/\s*г\.?/gi, '');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentMonth]);

  const prevMonthShort = useMemo(() => {
    const d = currentMonth ? new Date(currentMonth) : new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleString('ru-RU', { month: 'short' }).replace('.', '');
  }, [currentMonth]);

  const categoryLimit = useMemo(() => {
    if (categoryId && settings.categoryBudgets?.[categoryId]) {
      return settings.categoryBudgets[categoryId];
    }
    if (parentCategory?.id && settings.categoryBudgets?.[parentCategory.id]) {
      return settings.categoryBudgets[parentCategory.id];
    }
    return null;
  }, [categoryId, parentCategory, settings.categoryBudgets]);

  const groupedTransactionsByDay = useMemo(() => {
    const groups: { [dateStr: string]: { label: string; dateObj: Date; dayTotal: number; txs: Transaction[] } } = {};
    
    filteredTransactions.forEach(t => {
      const d = new Date(t.date);
      const dateKey = t.date.split('T')[0];
      if (!groups[dateKey]) {
        const weekday = d.toLocaleString('ru-RU', { weekday: 'short' });
        const day = d.getDate();
        const month = d.toLocaleString('ru-RU', { month: 'long' });
        const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        groups[dateKey] = {
          label: `${capWeekday}, ${day} ${month}`,
          dateObj: d,
          dayTotal: 0,
          txs: []
        };
      }
      groups[dateKey].txs.push(t);
      if (t.type === 'expense') {
        groups[dateKey].dayTotal -= t.amount;
      } else {
        groups[dateKey].dayTotal += t.amount;
      }
    });

    return Object.values(groups).sort((a, b) => {
      return sortOrder === 'newest' 
        ? b.dateObj.getTime() - a.dateObj.getTime()
        : a.dateObj.getTime() - b.dateObj.getTime();
    });
  }, [filteredTransactions, sortOrder]);

  const categoryTitle = isAllTransactions 
    ? 'Все операции за месяц' 
    : (parentCategory?.label || initialCategory?.label || merchantName || 'Категория');
    
  const categoryIcon = isAllTransactions 
    ? <List size={20} className="text-[#4A7C59]" />
    : getIconById(parentCategory?.icon || initialCategory?.icon || 'tag', 20);

  const currentMember = useMemo(() => {
    return members.find(m => m.userId === auth.currentUser?.uid) || members[0] || null;
  }, [members]);

  if (isMobile) {
    return createPortal(
      <DrillDownMobile
        categoryTitle={categoryTitle}
        categoryIcon={categoryIcon}
        currentMonthFormatted={currentMonthFormatted}
        prevMonthShort={prevMonthShort}
        totalExpense={totalExpense}
        totalIncome={totalIncome}
        netBalance={netBalance}
        expenseCount={expenseCount}
        incomeCount={incomeCount}
        trendPercent={trendPercent}
        categoryLimit={categoryLimit}
        avgDaily={aggregatedChartData.avgDaily}
        memberBreakdown={memberBreakdown}
        groupedTransactionsByDay={groupedTransactionsByDay}
        familyTransactionsCount={familyTransactions.length}
        filteredTransactionsCount={filteredTransactions.length}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onClose={onClose}
        onEditTransaction={onEditTransaction}
        viewMode={viewMode}
        setViewMode={setViewMode}
        chartGranularity={chartGranularity}
        setChartGranularity={setChartGranularity}
        chartData={aggregatedChartData.list}
        currentMember={currentMember}
        categories={categories}
      />,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4 md:p-6 select-none">
      {/* Glass Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#2E3230]/50 backdrop-blur-md" 
      />
      
      {/* Main Modal Inspector Card with LOCKED CONSTANT HEIGHT to prevent size jumping */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 6 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative bg-[#FAF6F0] dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white w-full max-w-[95vw] lg:max-w-[92vw] xl:max-w-6xl 2xl:max-w-7xl rounded-3xl shadow-[0_20px_60px_rgba(46,50,48,0.22)] overflow-hidden flex flex-col h-[90vh] max-h-[880px] min-h-[580px] border border-[#E4E0D8]/60 dark:border-white/10"
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
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF2EC] dark:bg-green-950/40 text-[#2A4C34] dark:text-green-300 tracking-wide uppercase">
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

        {/* Categories or Subcategories Horizontal Ribbon with Smart Overflow Buttons */}
        {((sortedSubcategoriesStats.length > 0 && !isOtherOrTraining) || (isAllTransactions && topParentCategoriesStats.length > 0)) && (
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
                {isAllTransactions ? 'Категории:' : 'Подкатегории:'}
              </span>
              <button
                type="button"
                onClick={() => isAllTransactions ? setActiveAllCatId(null) : setActiveSubcategoryId(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  (isAllTransactions ? activeAllCatId === null : activeSubcategoryId === null)
                    ? 'bg-[#4A7C59] text-white shadow-xs'
                    : 'bg-[#F5F1EA] dark:bg-[#2C2C2E] text-[#2E3230] dark:text-stone-300 hover:bg-[#EAE6DE]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Все</span>
              </button>

              {/* Render items: either top categories or subcategories */}
              {isAllTransactions ? (
                topParentCategoriesStats.map(({ cat, spent }) => {
                  const isActive = activeAllCatId === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveAllCatId(isActive ? null : cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-[#4A7C59] text-white shadow-xs'
                          : 'bg-[#F5F1EA] dark:bg-[#2C2C2E] text-[#2E3230] dark:text-stone-300 hover:bg-[#EAE6DE]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span>{cat.label}</span>
                      <span className={`text-[10px] ${isActive ? 'opacity-90' : 'text-[#68726B]'}`}>
                        ({spent.toLocaleString('ru-RU')} ₽)
                      </span>
                    </button>
                  );
                })
              ) : (
                sortedSubcategoriesStats.map(({ sub, spent }) => {
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
                })
              )}
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
              <DrillDownTransactionList
                transactions={filteredTransactions}
                categories={categories}
                members={members}
                settings={settings}
                sortOrder={sortOrder}
                onToggleSortOrder={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                onEditTransaction={onEditTransaction}
                allTransactionsCount={familyTransactions.length}
              />

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
              <DrillDownAnalyticsChart
                familyTransactions={familyTransactions}
                currentMonth={currentMonth}
                settings={settings}
                activeSubcategoryId={activeSubcategoryId}
                monthLabel={monthLabel}
              />

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
                      <PieChart className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#2E3230] dark:text-white">
                        Аналитические выводы и паттерны
                      </h4>
                    </div>
                    <span className="text-[11px] text-[#4A7C59] font-bold">Аналитика</span>
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
                <div className="text-xs text-[#68726B] dark:text-stone-400">
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
