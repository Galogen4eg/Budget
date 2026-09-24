import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, X, ChevronDown, ChevronRight, Calendar, 
  ArrowUpRight, ArrowDownRight, Check, ShoppingBag, Store,
  Utensils, Car, Sparkles, Tag, Layers, ExternalLink
} from 'lucide-react';
import { Category, AppSettings, Transaction } from '../types';
import { getIconById } from '../constants';
import { fixPrepositions } from '../utils/typography';

export interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  transactions: Transaction[];
  currentMonth: Date;
  settings: AppSettings;
  initialCategoryId?: string | null;
  onSaveCategoryLimit?: (categoryId: string, limit: number) => void;
  onAddCategory?: () => void;
  onSelectCategory?: (categoryId: string) => void;
}

type PeriodFilter = 'week' | 'month' | 'quarter' | 'year';

interface SubcategoryStat {
  id: string;
  label: string;
  spent: number;
  count: number;
  percentOfParent: number;
  trendText: string;
  trendType: 'positive' | 'negative' | 'neutral';
  color?: string;
  icon?: string;
}

interface CategoryCardStat {
  parentCat: Category;
  children: Category[];
  catSpent: number;
  prevSpent: number;
  percentage: number;
  txCount: number;
  activeSubcatsCount: number;
  subcategories: SubcategoryStat[];
  trendText: string;
  trendType: 'positive' | 'negative' | 'neutral';
  accentColor: string;
  bgLight: string;
}

/**
 * Mobile-first Expense Categories Modal.
 * - Clicking category opens the category card (drilldown).
 * - Clicking the chevron button expands/collapses subcategories.
 * - Empty categories (0 expenses) and empty subcategories are hidden.
 */
const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  transactions,
  currentMonth,
  settings,
  initialCategoryId,
  onSelectCategory
}) => {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialCategoryId) {
        setExpandedCatIds({ [initialCategoryId]: true });
      } else {
        setExpandedCatIds({});
      }
    }
  }, [isOpen, initialCategoryId]);

  const { currentExpenses, prevExpenses } = useMemo(() => {
    const expenseList = transactions.filter(t => t.type === 'expense');

    if (periodFilter === 'week') {
      const ref = new Date(currentMonth);
      const day = ref.getDay();
      const diffToMon = ref.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(ref.setDate(diffToMon));
      mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon);
      sun.setDate(sun.getDate() + 6);
      sun.setHours(23, 59, 59, 999);

      const prevMon = new Date(mon);
      prevMon.setDate(prevMon.getDate() - 7);
      const prevSun = new Date(sun);
      prevSun.setDate(prevSun.getDate() - 7);

      return {
        currentExpenses: expenseList.filter(t => {
          const d = new Date(t.date);
          return d >= mon && d <= sun;
        }),
        prevExpenses: expenseList.filter(t => {
          const d = new Date(t.date);
          return d >= prevMon && d <= prevSun;
        })
      };
    }

    if (periodFilter === 'quarter') {
      const qStartMonth = Math.floor(currentMonth.getMonth() / 3) * 3;
      const qStart = new Date(currentMonth.getFullYear(), qStartMonth, 1);
      const qEnd = new Date(currentMonth.getFullYear(), qStartMonth + 3, 0, 23, 59, 59);

      const prevQStart = new Date(currentMonth.getFullYear(), qStartMonth - 3, 1);
      const prevQEnd = new Date(currentMonth.getFullYear(), qStartMonth, 0, 23, 59, 59);

      return {
        currentExpenses: expenseList.filter(t => {
          const d = new Date(t.date);
          return d >= qStart && d <= qEnd;
        }),
        prevExpenses: expenseList.filter(t => {
          const d = new Date(t.date);
          return d >= prevQStart && d <= prevQEnd;
        })
      };
    }

    if (periodFilter === 'year') {
      const yr = currentMonth.getFullYear();
      return {
        currentExpenses: expenseList.filter(t => new Date(t.date).getFullYear() === yr),
        prevExpenses: expenseList.filter(t => new Date(t.date).getFullYear() === yr - 1)
      };
    }

    // Default: 'month'
    const curYear = currentMonth.getFullYear();
    const curMonthIdx = currentMonth.getMonth();
    const prevDate = new Date(curYear, curMonthIdx - 1, 1);

    return {
      currentExpenses: expenseList.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === curMonthIdx && d.getFullYear() === curYear;
      }),
      prevExpenses: expenseList.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === prevDate.getMonth() && d.getFullYear() === prevDate.getFullYear();
      })
    };
  }, [transactions, currentMonth, periodFilter]);

  const totalSpent = useMemo(() => {
    return Math.round(currentExpenses.reduce((sum, t) => sum + t.amount, 0));
  }, [currentExpenses]);

  const parentCategories = useMemo(() => {
    return categories.filter(c => !c.parentId);
  }, [categories]);

  const categoryStats: CategoryCardStat[] = useMemo(() => {
    const defaultPalettes = [
      { color: '#4A7C59', bg: '#EDF5EF' },
      { color: '#548293', bg: '#EEF5F8' },
      { color: '#C2794C', bg: '#FAF1EA' },
      { color: '#7C6992', bg: '#F4EEFA' },
      { color: '#D95C48', bg: '#FDE8E8' },
      { color: '#C4A66A', bg: '#FEF3C7' },
      { color: '#2563EB', bg: '#DBEAFE' },
      { color: '#9333EA', bg: '#F3E8FF' },
      { color: '#DC2626', bg: '#FEE2E2' }
    ];

    return parentCategories.map((parentCat, idx) => {
      const children = categories.filter(c => c.parentId === parentCat.id);
      const familyIds = [parentCat.id, ...children.map(c => c.id)];

      const catCurrentTxs = currentExpenses.filter(t => familyIds.includes(t.category));
      const catPrevTxs = prevExpenses.filter(t => familyIds.includes(t.category));

      const catSpent = Math.round(catCurrentTxs.reduce((sum, t) => sum + t.amount, 0));
      const prevSpent = Math.round(catPrevTxs.reduce((sum, t) => sum + t.amount, 0));
      const percentage = totalSpent > 0 ? (catSpent / totalSpent) * 100 : 0;

      let trendText = 'В норме';
      let trendType: 'positive' | 'negative' | 'neutral' = 'neutral';

      if (catSpent === 0 && prevSpent === 0) {
        trendText = 'Нет трат';
        trendType = 'neutral';
      } else if (prevSpent > 0 && catSpent > 0) {
        const diffPercent = Math.round(((catSpent - prevSpent) / prevSpent) * 100);
        if (diffPercent < 0) {
          trendText = `${diffPercent}% к пред. пер.`;
          trendType = 'positive';
        } else if (diffPercent > 0) {
          trendText = `+${diffPercent}% к пред. пер.`;
          trendType = 'negative';
        }
      } else if (catSpent > 0 && prevSpent === 0) {
        trendText = 'Новые траты';
        trendType = 'negative';
      } else if (catSpent === 0 && prevSpent > 0) {
        trendText = 'Без расходов';
        trendType = 'positive';
      }

      let subcategories: SubcategoryStat[] = [];

      if (children.length > 0) {
        subcategories = children.map(child => {
          const childTxs = currentExpenses.filter(t => t.category === child.id);
          const childSpent = Math.round(childTxs.reduce((sum, t) => sum + t.amount, 0));
          const percentOfParent = catSpent > 0 ? Math.round((childSpent / catSpent) * 100) : 0;

          const childPrevTxs = prevExpenses.filter(t => t.category === child.id);
          const childPrevSpent = Math.round(childPrevTxs.reduce((sum, t) => sum + t.amount, 0));

          let subTrend = 'В норме';
          let subTrendType: 'positive' | 'negative' | 'neutral' = 'neutral';

          if (childPrevSpent > 0 && childSpent > 0) {
            const diff = Math.round(((childSpent - childPrevSpent) / childPrevSpent) * 100);
            subTrend = diff > 0 ? `+${diff}%` : `${diff}%`;
            subTrendType = diff < 0 ? 'positive' : 'negative';
          } else if (childSpent === 0) {
            subTrend = '0 ₽';
            subTrendType = 'neutral';
          }

          return {
            id: child.id,
            label: child.label,
            spent: childSpent,
            count: childTxs.length,
            percentOfParent,
            trendText: subTrend,
            trendType: subTrendType,
            color: child.color || parentCat.color,
            icon: child.icon
          };
        }).filter(sub => sub.spent > 0).sort((a, b) => b.spent - a.spent); // Hide empty subcategories
      }

      // If no explicit children or transactions exist directly on parent with notes, add merchant note grouping
      const parentDirectTxs = currentExpenses.filter(t => t.category === parentCat.id);
      if (children.length === 0 && parentDirectTxs.length > 0) {
        const merchantMap: Record<string, { sum: number; count: number }> = {};
        parentDirectTxs.forEach(t => {
          const noteKey = (t.note || t.rawNote || parentCat.label).trim();
          if (!merchantMap[noteKey]) {
            merchantMap[noteKey] = { sum: 0, count: 0 };
          }
          merchantMap[noteKey].sum += Math.round(t.amount);
          merchantMap[noteKey].count += 1;
        });

        subcategories = Object.entries(merchantMap).map(([noteName, data], idx) => {
          const percentOfParent = catSpent > 0 ? Math.round((data.sum / catSpent) * 100) : 0;
          return {
            id: `${parentCat.id}-note-${idx}`,
            label: noteName,
            spent: data.sum,
            count: data.count,
            percentOfParent,
            trendText: `${data.count} оп.`,
            trendType: 'neutral'
          };
        }).filter(sub => sub.spent > 0).sort((a, b) => b.spent - a.spent); // Hide empty
      }

      const activeSubcatsCount = subcategories.length;
      const palette = defaultPalettes[idx % defaultPalettes.length];
      const accentColor = parentCat.color || palette.color;

      return {
        parentCat,
        children,
        catSpent,
        prevSpent,
        percentage,
        txCount: catCurrentTxs.length,
        activeSubcatsCount,
        subcategories,
        trendText,
        trendType,
        accentColor,
        bgLight: palette.bg
      };
    })
    // Hide empty categories (only show categories with spend > 0)
    .filter(stat => stat.catSpent > 0)
    .sort((a, b) => {
      if (b.catSpent !== a.catSpent) {
        return b.catSpent - a.catSpent;
      }
      return a.parentCat.label.localeCompare(b.parentCat.label, 'ru');
    });
  }, [parentCategories, categories, currentExpenses, prevExpenses, totalSpent]);

  if (!isOpen) return null;

  const toggleExpand = (catId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedCatIds(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleOpenCategoryCard = (categoryId: string) => {
    if (onSelectCategory) {
      onSelectCategory(categoryId);
      onClose();
    }
  };

  const currentPeriodName = (() => {
    if (periodFilter === 'week') return 'Неделя';
    if (periodFilter === 'month') {
      const monthStr = currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      return monthStr.charAt(0).toUpperCase() + monthStr.slice(1).replace(/\s*г\.?/gi, '');
    }
    if (periodFilter === 'quarter') {
      const q = Math.floor(currentMonth.getMonth() / 3) + 1;
      return `${q}-й квартал ${currentMonth.getFullYear()}`;
    }
    return `${currentMonth.getFullYear()} год`;
  })();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2500] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto no-scrollbar font-body select-none">
        <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />
        <motion.main 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-[430px] sm:max-w-xl md:max-w-2xl bg-[#FBF9F5] dark:bg-[#121214] rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[860px] overflow-hidden text-[#1E2420] dark:text-gray-100 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="pt-3 px-5 pb-4 bg-[#FBF9F5] dark:bg-[#121214] border-b border-[#EAE4D6]/60 dark:border-white/10 shrink-0 z-10">
            <div className="flex justify-center mb-3 sm:hidden">
              <div className="w-11 h-1.5 bg-[#D6CFC1] dark:bg-gray-600 rounded-full" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#EDE8DF] dark:bg-white/10 flex items-center justify-center shrink-0 shadow-xs border border-[#E2DBCE]/50 dark:border-white/10 text-[#4A7C59] dark:text-emerald-400">
                  <PieChart className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-[#1E2420] dark:text-white leading-tight">
                    Категории расходов
                  </h1>
                  <p className="text-xs text-[#68736A] dark:text-stone-400 mt-0.5 font-medium leading-relaxed">
                    {fixPrepositions("Аналитика и структура расходов по категориям за месяц")}
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={onClose}
                aria-label="Закрыть" 
                className="w-9 h-9 rounded-full bg-[#EEE9DF] dark:bg-white/10 hover:bg-[#E4DED2] dark:hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-[#1E2420] dark:text-white shrink-0 shadow-xs cursor-pointer"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          </header>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-5 py-4 space-y-3.5">
            <section className="bg-white/85 dark:bg-[#1C1C1E] backdrop-blur-sm border border-[#EAE4D6] dark:border-white/10 rounded-2xl p-3 px-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#68736A] dark:text-stone-400">Расходы:</span>
                <span className="text-base font-extrabold text-[#4A7C59] dark:text-emerald-400 tracking-tight">
                  {settings.privacyMode ? '•••' : `${totalSpent.toLocaleString('ru-RU')} ₽`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F4EFE6] dark:bg-white/10 px-3 py-1.5 rounded-full border border-[#EAE4D6] dark:border-white/10 text-xs font-bold text-[#1E2420] dark:text-white shadow-xs">
                <Calendar size={13} className="text-[#68736A] dark:text-stone-400" />
                <span>{currentPeriodName}</span>
              </div>
            </section>

            {/* Segmented Filter */}
            <nav className="w-full bg-[#ECE6DA] dark:bg-white/10 p-1 rounded-2xl grid grid-cols-4 gap-1 shadow-inner">
              {(['week', 'month', 'quarter', 'year'] as const).map(p => {
                const labels = { week: 'Неделя', month: 'Месяц', quarter: 'Квартал', year: 'Год' };
                const isActive = periodFilter === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodFilter(p)}
                    className={`w-full flex items-center justify-center py-2 text-xs transition rounded-xl text-center cursor-pointer ${
                      isActive
                        ? 'font-bold text-[#1E2420] dark:text-white bg-white dark:bg-[#252528] shadow-xs'
                        : 'font-semibold text-[#68736A] dark:text-stone-400 hover:text-[#1E2420] dark:hover:text-white'
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </nav>

            {/* Category Cards List */}
            <section className="space-y-3 pt-1">
              {categoryStats.length === 0 ? (
                <div className="py-12 px-4 text-center bg-white/70 dark:bg-white/5 rounded-2xl border border-dashed border-[#EAE4D6] dark:border-white/10 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#EDE8DF] dark:bg-white/10 text-[#4A7C59] dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <PieChart size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-[#1E2420] dark:text-white">Нет расходов в этом периоде</h3>
                  <p className="text-xs text-[#68736A] dark:text-stone-400">
                    {fixPrepositions("Траты по категориям появятся здесь автоматически после добавления операций")}
                  </p>
                </div>
              ) : (
                categoryStats.map(stat => {
                  const hasSubcategories = stat.subcategories.length > 0;
                  const isExpanded = hasSubcategories && !!expandedCatIds[stat.parentCat.id];
                  const catSpentFormatted = settings.privacyMode 
                    ? '•••' 
                    : `${stat.catSpent.toLocaleString('ru-RU')} ₽`;
                  const percentNumber = Math.round(stat.percentage);

                  return (
                    <article 
                      key={stat.parentCat.id}
                      className="bg-white dark:bg-[#1C1C1E] border border-[#EAE4D6]/90 dark:border-white/10 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all"
                    >
                      {/* Header Row: Click on Category opens category card; Click on Chevron toggles subcategories */}
                      <div className="flex items-center justify-between gap-2 select-none">
                        <div 
                          onClick={() => handleOpenCategoryCard(stat.parentCat.id)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                        >
                          <div 
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs font-bold text-white group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: stat.accentColor }}
                          >
                            {getIconById(stat.parentCat.icon, 20)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-[#1E2420] dark:text-white text-base leading-tight truncate group-hover:text-[#4A7C59] dark:group-hover:text-emerald-400 transition-colors">
                                {stat.parentCat.label}
                              </h3>
                              {stat.activeSubcatsCount > 0 && (
                                <span 
                                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                                  style={{ backgroundColor: `${stat.accentColor}1A`, color: stat.accentColor }}
                                >
                                  {stat.activeSubcatsCount} активные
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#68736A] dark:text-stone-400 mt-0.5 truncate">
                              {hasSubcategories 
                                ? `${stat.subcategories.length} подкатегорий • ${stat.txCount} операций`
                                : `${stat.txCount} операций`}
                            </p>
                          </div>
                        </div>

                        {/* Chevron Button for Expand / Collapse - only visible if subcategories exist */}
                        {hasSubcategories && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              type="button" 
                              onClick={(e) => toggleExpand(stat.parentCat.id, e)}
                              aria-label={isExpanded ? 'Свернуть подкатегории' : 'Развернуть подкатегории'}
                              className="w-8 h-8 rounded-full bg-[#F4EFE6] dark:bg-white/10 hover:bg-[#EDE6DA] dark:hover:bg-white/20 text-[#1E2420] dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            >
                              <ChevronDown 
                                className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                                strokeWidth={2.5} 
                              />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Amount, Share and Trend (Clicking opens category card) */}
                      <div 
                        onClick={() => handleOpenCategoryCard(stat.parentCat.id)}
                        className="flex items-baseline justify-between mt-3 mb-2 flex-wrap gap-2 cursor-pointer"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-[#1E2420] dark:text-white tracking-tight tabular-nums">
                            {catSpentFormatted}
                          </span>
                          <span className="text-xs font-bold" style={{ color: stat.accentColor }}>
                            ({percentNumber}% расходов)
                          </span>
                        </div>
                        
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                          stat.trendType === 'positive' 
                            ? 'text-[#4A7C59] dark:text-emerald-400 bg-[#4A7C59]/10' 
                            : stat.trendType === 'negative' 
                              ? 'text-[#C2794C] dark:text-amber-400 bg-[#C2794C]/10' 
                              : 'text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-white/5'
                        }`}>
                          {stat.trendText}
                        </span>
                      </div>

                      <div 
                        onClick={() => handleOpenCategoryCard(stat.parentCat.id)}
                        className="w-full bg-[#ECE5D8] dark:bg-white/10 h-1.5 rounded-full overflow-hidden mb-3 cursor-pointer"
                      >
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, percentNumber)}%`, backgroundColor: stat.accentColor }}
                        />
                      </div>

                      {/* Subcategories */}
                      {isExpanded && stat.subcategories.length > 0 ? (
                        <div className="mt-3 pt-3 border-t border-[#EAE4D6]/80 dark:border-white/10 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-[#68736A] dark:text-stone-400 mb-1">
                            <span className="tracking-wide">Подкатегории</span>
                            <span className="text-[11px] font-normal">Сортировка по сумме</span>
                          </div>

                          {stat.subcategories.map(sub => (
                            <div 
                              key={sub.id}
                              onClick={() => handleOpenCategoryCard(sub.id.startsWith(stat.parentCat.id) ? stat.parentCat.id : sub.id)}
                              className="bg-[#F4EFE6]/70 dark:bg-white/5 hover:bg-[#F4EFE6] dark:hover:bg-white/10 p-3 rounded-xl border border-[#EAE4D6]/60 dark:border-white/5 transition cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-sm text-[#1E2420] dark:text-white truncate">
                                      {sub.label}
                                    </span>
                                    <span className="text-[11px] text-[#68736A] dark:text-stone-400 shrink-0">
                                      • {sub.count} {sub.count === 1 ? 'операция' : sub.count < 5 ? 'операции' : 'операций'}
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-sm font-black text-[#1E2420] dark:text-white tabular-nums">
                                      {settings.privacyMode ? '•••' : `${sub.spent.toLocaleString('ru-RU')} ₽`}
                                    </span>
                                    <span className="text-[11px] font-semibold" style={{ color: stat.accentColor }}>
                                      ({sub.percentOfParent}% от категории)
                                    </span>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                                  sub.trendType === 'positive' 
                                    ? 'text-[#4A7C59] dark:text-emerald-400 bg-[#4A7C59]/10' 
                                    : sub.trendType === 'negative' 
                                      ? 'text-[#C2794C] dark:text-amber-400 bg-[#C2794C]/10' 
                                      : 'text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-white/10'
                                }`}>
                                  {sub.trendText}
                                </span>
                              </div>

                              <div className="w-full bg-[#E2DBCE] dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                                <div 
                                  className="h-full rounded-full transition-all duration-300" 
                                  style={{ width: `${Math.min(100, sub.percentOfParent)}%`, backgroundColor: stat.accentColor }}
                                />
                              </div>
                            </div>
                          ))}

                          <button 
                            type="button" 
                            onClick={() => handleOpenCategoryCard(stat.parentCat.id)}
                            className="w-full py-2.5 text-center text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 mt-1 border border-[#EAE4D6]/70 dark:border-white/10 hover:bg-[#F4EFE6] dark:hover:bg-white/5"
                            style={{ color: stat.accentColor }}
                          >
                            <span>Открыть карточку категории «{stat.parentCat.label}»</span>
                            <span className="text-sm">›</span>
                          </button>
                        </div>
                      ) : (
                        stat.subcategories.length > 0 && (
                          <div 
                            className="pt-2.5 border-t border-[#EAE4D6]/60 dark:border-white/10 flex items-center justify-between gap-2"
                          >
                            <div 
                              onClick={() => handleOpenCategoryCard(stat.parentCat.id)}
                              className="flex flex-wrap gap-1.5 items-center min-w-0 flex-1 cursor-pointer"
                            >
                              {stat.subcategories.slice(0, 2).map((sub, sIdx) => (
                                <div 
                                  key={sIdx}
                                  className="flex items-center text-[11px] bg-[#F4EFE6] dark:bg-white/5 px-2.5 py-1 rounded-lg text-[#1E2420] dark:text-gray-200"
                                >
                                  <span className="text-[#68736A] dark:text-stone-400 mr-1.5 truncate max-w-[90px]">
                                    {sub.label}:
                                  </span>
                                  <span className="font-bold tabular-nums">
                                    {settings.privacyMode ? '•••' : `${sub.spent.toLocaleString('ru-RU')} ₽`}
                                  </span>
                                </div>
                              ))}
                              {stat.subcategories.length > 2 && (
                                <span className="text-[11px] text-[#68736A] dark:text-stone-400 font-medium">
                                  +{stat.subcategories.length - 2}
                                </span>
                              )}
                            </div>
                            <button 
                              type="button"
                              onClick={(e) => toggleExpand(stat.parentCat.id, e)}
                              className="text-[11px] font-semibold flex items-center gap-0.5 shrink-0 hover:opacity-80 transition cursor-pointer" 
                              style={{ color: stat.accentColor }}
                            >
                              <span>Развернуть</span>
                              <ChevronDown size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                        )
                      )}
                    </article>
                  );
                })
              )}
            </section>
          </div>

          {/* Sticky Footer */}
          <footer className="p-4 sm:px-6 bg-gradient-to-t from-[#FBF9F5] via-[#FBF9F5] to-[#FBF9F5]/90 dark:from-[#121214] dark:via-[#121214] dark:to-[#121214]/90 border-t border-[#EAE4D6]/60 dark:border-white/10 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="w-full bg-[#4A7C59] hover:bg-[#3F6B4D] active:scale-[0.99] text-white font-bold text-base py-3.5 px-6 rounded-2xl shadow-md transition duration-200 flex items-center justify-center tracking-wide cursor-pointer"
            >
              Закрыть
            </button>
          </footer>
        </motion.main>
      </div>
    </AnimatePresence>
  );
};

export default CategoriesModal;
