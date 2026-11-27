import { DASHBOARD_CARD, SECTION_HEADING } from './filterUiTokens';
import DrillDownAnalyticsChart from './drilldown/DrillDownAnalyticsChart';
import type {AnalyticsPoint,AnalyticsSeriesFilter} from '../utils/analyticsPresentation';
import { chartBarPercent } from '../utils/analyticsPresentation';
import { formatBudgetMoney, sumMoney } from '../utils/budgetFinancialMath';
import { useModalSurface } from '../hooks/useDialogFocus';
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft,
  Users, ArrowDown, ArrowUp, BarChart3, Calendar, ArrowRight,
  PlusCircle, Sparkles, Lightbulb, Repeat, PiggyBank, List, X
} from 'lucide-react';
import { Transaction, FamilyMember, Category } from '../types';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey } from '../utils/categorizer';

interface DrillDownMobileProps {
  privacyMode:boolean;
  categoryTitle: string;
  categoryIcon: React.ReactNode;
  currentMonthFormatted: string;
  prevMonthShort: string;
  totalExpense: number;
  totalIncome: number;
  netBalance: number;
  expenseCount: number;
  incomeCount: number;
  trendPercent: number;
  categoryLimit: number | null;
  avgDaily: number;
  memberBreakdown: {
    member: FamilyMember | null;
    expense: number;
    income: number;
    count: number;
    volume: number;
    share: number;
  }[];
  groupedTransactionsByDay: {
    label: string;
    dateObj: Date;
    dayTotal: number;
    txs: Transaction[];
  }[];
  familyTransactionsCount: number;
  filteredTransactionsCount: number;
  typeFilter: 'all' | 'expense' | 'income';
  setTypeFilter: (t: 'all' | 'expense' | 'income') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortOrder: 'newest' | 'oldest';
  setSortOrder: (s: 'newest' | 'oldest') => void;
  onClose: () => void;
  onEditTransaction: (tx: Transaction) => void;
  viewMode: 'inspector' | 'analytics';
  setViewMode: (v: 'inspector' | 'analytics') => void;
  chartGranularity: 'daily' | 'weekly';
  setChartGranularity: (g: 'daily' | 'weekly') => void;
  chartData:AnalyticsPoint[];
  chartSeriesFilter:AnalyticsSeriesFilter;
  setChartSeriesFilter:(value:AnalyticsSeriesFilter)=>void;
  familyTransactions:Transaction[];
  monthLabel:string;
  currentMember?: FamilyMember | null;
  categories?: Category[];
}

export const DrillDownMobile: React.FC<DrillDownMobileProps> = ({
  privacyMode,
  categoryTitle,
  categoryIcon,
  currentMonthFormatted,
  prevMonthShort,
  totalExpense,
  totalIncome,
  netBalance,
  expenseCount,
  incomeCount,
  trendPercent,
  categoryLimit,
  avgDaily,
  memberBreakdown,
  groupedTransactionsByDay,
  familyTransactionsCount,
  filteredTransactionsCount,
  typeFilter,
  setTypeFilter,
  searchQuery,
  setSearchQuery,
  sortOrder,
  setSortOrder,
  onClose,
  onEditTransaction,
  viewMode,
  setViewMode,
  chartGranularity,
  setChartGranularity,
  chartData,
  chartSeriesFilter,
  setChartSeriesFilter,
  familyTransactions,
  monthLabel,
  currentMember,
  categories = []
}) => {
  const formatAmount=(value:number)=>privacyMode?'•••':formatBudgetMoney(value);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const surface=useModalSurface(()=>{if(viewMode==='analytics')setViewMode('inspector');else onClose();},{initialSelector:'[aria-label="Закрыть или вернуться назад"]'});

  // Progress towards monthly limit
  const limitProgress = useMemo(() => {
    if (!categoryLimit || categoryLimit <= 0) return 0;
    return Math.min(100, Math.round((totalExpense / categoryLimit) * 100));
  }, [totalExpense, categoryLimit]);

  const memberInitial = (currentMember?.name || 'П').charAt(0).toUpperCase();

  return (
    <motion.div {...surface} role="dialog" aria-modal="true" aria-label="Аналитика операций" data-testid="transaction-drilldown" data-view={viewMode}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="fixed inset-0 z-[2000] bg-[var(--terra-canvas)] text-[var(--terra-ink)] flex flex-col font-body overflow-hidden"
    >
      
      {/* ========================================================================= */}
      {/* 1. HEADER (Fixed top with blur and safe area)                            */}
      {/* ========================================================================= */}
      <header className="shrink-0 z-50 pt-[env(safe-area-inset-top,0px)] bg-[var(--terra-canvas)] border-b border-[var(--terra-border)]">
        <div className="min-h-14 px-3 py-1 flex flex-wrap items-center justify-between gap-2">
          {viewMode === 'inspector' ? (
            <>
              <button 
                type="button"
                onClick={onClose}
                aria-label="Закрыть или вернуться назад"
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] text-[#4A4E4A] dark:text-stone-300 hover:bg-[#F0ECE4] dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ArrowLeft size={22} />
              </button>
              <h1 className="text-base font-headline font-semibold text-[#2E3230] dark:text-white truncate text-center flex-1 px-2">
                {categoryTitle?.toLowerCase().includes('все операции') || categoryTitle?.toLowerCase().includes('все категории') || categoryTitle === 'Все' ? 'Список операций' : `Категория: ${categoryTitle}`}
              </h1>
              <div 
                className="w-8 h-8 rounded-full bg-[#4A7C59] text-white flex items-center justify-center text-xs font-bold shadow-2xs shrink-0"
              >
                {memberInitial}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <button 
                  type="button"
                  onClick={() => setViewMode('inspector')}
                  aria-label="Назад к операциям"
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] text-[#2E3230] dark:text-white hover:bg-[#F0ECE4] dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={22} />
                </button>
                <h1 className="text-base font-headline font-semibold text-[#2E3230] dark:text-white truncate">
                  Аналитика: {categoryTitle}
                </h1>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="h-9 px-3 flex items-center gap-1.5 rounded-full bg-[#F0ECE4] dark:bg-white/10 text-xs font-semibold text-[#2E3230] dark:text-white">
                  <Calendar size={14} className="text-[#4A7C59]" />
                  <span>{currentMonthFormatted}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#4A7C59] text-white flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                  {memberInitial}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN SCROLLABLE CONTAINER                                              */}
      {/* ========================================================================= */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] px-4">
        
        {viewMode === 'inspector' ? (
          /* ===================================================================== */
          /* SCREEN 1: КАРТОЧКА КАТЕГОРИИ (РЕЕСТР И САЛЬДО)                        */
          /* ===================================================================== */
          <div className="flex flex-col space-y-4 pt-2">
            
            {/* Search & Filter Controls */}
            <div className="flex flex-col space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search size={18} className="absolute left-3.5 text-[#74796E] dark:text-stone-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию или сумме..."
                    className="w-full h-11 pl-10 pr-9 bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-xl text-sm placeholder:text-[#74796E]/70 text-[#2E3230] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4A7C59] transition-colors shadow-2xs border border-[#E4E0D8]/60 dark:border-white/10"
                  />
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 text-stone-400 hover:text-stone-700"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Operation Type Segmented Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-xl overflow-x-auto border border-[#E4E0D8]/40 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    typeFilter === 'all'
                      ? 'bg-white dark:bg-[#2A2A2E] text-[#4A7C59] shadow-2xs'
                      : 'text-[#4A4E4A] dark:text-stone-400 hover:text-[#2E3230]'
                  }`}
                >
                  <span>Все</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[#C8E8D0] dark:bg-[#4A7C59]/30 text-[#002110] dark:text-green-300 font-bold">
                    {familyTransactionsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTypeFilter('expense')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    typeFilter === 'expense'
                      ? 'bg-white dark:bg-[#2A2A2E] text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                      : 'text-[#4A4E4A] dark:text-stone-400 hover:text-rose-600'
                  }`}
                >
                  <ArrowUpRight size={15} className="text-rose-600 dark:text-rose-400" />
                  <span>Расход</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTypeFilter('income')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    typeFilter === 'income'
                      ? 'bg-white dark:bg-[#2A2A2E] text-[#4A7C59] dark:text-green-400 shadow-2xs font-bold'
                      : 'text-[#4A4E4A] dark:text-stone-400 hover:text-[#4A7C59]'
                  }`}
                >
                  <ArrowDownLeft size={15} className="text-[#4A7C59] dark:text-green-400" />
                  <span>Доход</span>
                </button>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-[#F0ECE4] dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm space-y-3.5 border border-[#E4E0D8]/70 dark:border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-[#4A4E4A]/80 dark:text-stone-400">
                    Сальдо категории за {currentMonthFormatted.toLowerCase()}
                  </p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <h2 className="text-2xl font-headline font-bold text-[#2E3230] dark:text-white tracking-tight">
                      {!privacyMode && netBalance > 0 ? '+' : ''}{formatAmount(netBalance)} ₽
                    </h2>
                    {!privacyMode&&trendPercent !== 0 && (
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        trendPercent < 0
                          ? 'bg-[#C8E8D0] dark:bg-emerald-950/40 text-[#2A6038] dark:text-emerald-300'
                          : 'bg-[#FFDAD8] dark:bg-rose-950/40 text-[#690005] dark:text-rose-300'
                      }`}>
                        {trendPercent > 0 ? '+' : ''}{trendPercent}% к {prevMonthShort}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-[#EAE6DE] dark:bg-white/10 flex items-center justify-center text-[#4A7C59] dark:text-green-400 shrink-0">
                  {categoryIcon}
                </div>
              </div>

              {/* Income / Expense Mini Bento Panels */}
              <div className="grid grid-cols-2 gap-2">
                {/* Income Bento */}
                <div className="bg-[#C8E8D0]/40 dark:bg-emerald-950/30 rounded-xl p-2.5 flex flex-col justify-between border border-[#C8E8D0]/50 dark:border-emerald-800/30">
                  <div className="flex items-center gap-1.5 text-[#4A7C59] dark:text-emerald-400 mb-1">
                    <span className="w-5 h-5 rounded-full bg-[#4A7C59]/10 flex items-center justify-center">
                      <ArrowDownLeft size={13} />
                    </span>
                    <span className="text-xs font-semibold text-[#4A4E4A] dark:text-stone-300">Доход</span>
                  </div>
                  <p className="text-base font-headline font-bold text-[#4A7C59] dark:text-emerald-400">
                    +{formatAmount(totalIncome)} ₽
                  </p>
                  <p className="text-[11px] text-[#4A4E4A]/70 dark:text-stone-400 mt-0.5">
                    {incomeCount} {incomeCount === 1 ? 'пополнение' : 'пополнения'}
                  </p>
                </div>

                {/* Expense Bento */}
                <div className="bg-[#FFDAD8]/35 dark:bg-rose-950/30 rounded-xl p-2.5 flex flex-col justify-between border border-[#FFDAD8]/50 dark:border-rose-800/30">
                  <div className="flex items-center gap-1.5 text-[#B83230] dark:text-rose-400 mb-1">
                    <span className="w-5 h-5 rounded-full bg-[#B83230]/10 flex items-center justify-center">
                      <ArrowUpRight size={13} />
                    </span>
                    <span className="text-xs font-semibold text-[#4A4E4A] dark:text-stone-300">Расход</span>
                  </div>
                  <p className="text-base font-headline font-bold text-[#B83230] dark:text-rose-400">
                    -{formatAmount(totalExpense)} ₽
                  </p>
                  <p className="text-[11px] text-[#4A4E4A]/70 dark:text-stone-400 mt-0.5">
                    {expenseCount} {expenseCount === 1 ? 'списание' : 'списания'}
                  </p>
                </div>
              </div>

              {/* Family Member Contribution */}
              {!privacyMode&&memberBreakdown.length > 0 && (
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#4A4E4A] dark:text-stone-400">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Users size={14} className="text-[#705C30] dark:text-amber-300" />
                      <span>Участники семьи</span>
                    </span>
                    <span className="text-[11px]">Доля оборота</span>
                  </div>

                  <div className="space-y-2">
                    {memberBreakdown.map((item, idx) => {
                      const name = item.member?.name || 'Общие';
                      const initial = name.charAt(0).toUpperCase();
                      const formattedSum=`${formatAmount(item.volume)} ₽ · ${item.share}%`;

                      return (
                        <div key={item.member?.id || idx} className="bg-white dark:bg-[#252528] rounded-xl p-2.5 flex flex-col gap-1.5 shadow-2xs border border-[#E4E0D8]/40 dark:border-white/5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-6 h-6 rounded-full text-white font-bold flex items-center justify-center text-[10px] shadow-2xs"
                                style={{ backgroundColor: item.member?.color || '#4A7C59' }}
                              >
                                {initial}
                              </div>
                              <span className="font-semibold text-[#2E3230] dark:text-white">{name}</span>
                              <span className="text-[11px] text-[#4A4E4A]/70 dark:text-stone-400">
                                ({item.count} оп.)
                              </span>
                            </div>
                            <span className="font-semibold text-sm text-[var(--terra-ink)] tabular-nums">
                              {formattedSum}
                            </span>
                          </div>

                          <div className="w-full bg-[#F0ECE4] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full terra-progress"
                              style={{ 
                                width: `${chartBarPercent(item.share,100)}%`,
                                backgroundColor: item.member?.color || (idx === 0 ? '#4A7C59' : '#C4A66A')
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Transactions Section */}
            <div className="flex flex-col space-y-3 pt-1">
              {/* Header of Feed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline font-semibold text-base text-[#2E3230] dark:text-white">
                    Лента транзакций
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#F0ECE4] dark:bg-white/10 text-[#4A4E4A] dark:text-stone-300 text-[11px] font-medium">
                    {filteredTransactionsCount} записей
                  </span>
                </div>

                <button 
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                  className="flex items-center gap-1 text-xs text-[#4A7C59] dark:text-green-400 font-semibold hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <span>{sortOrder === 'newest' ? 'Сначала новые' : 'Сначала старые'}</span>
                  {sortOrder === 'newest' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                </button>
              </div>

              {/* Grouped Day Feeds */}
              {groupedTransactionsByDay.length === 0 ? (
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 text-center border border-[#E4E0D8]/60 dark:border-white/10 shadow-2xs">
                  <p className="text-sm font-semibold text-[#2E3230] dark:text-white">Операции не найдены</p>
                  <p className="text-xs text-[#74796E] dark:text-stone-400 mt-1">Попробуйте изменить запрос или фильтры</p>
                </div>
              ) : (
                groupedTransactionsByDay.map(group => {
                  const isDayExpense = group.dayTotal <= 0;
                  const daySummaryLabel = `итог дня: ${isDayExpense ? '' : '+'}${formatAmount(group.dayTotal)} ₽`;

                  return (
                    <div key={group.label} className="flex flex-col space-y-1.5 pt-1">
                      <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-[#4A4E4A] dark:text-stone-400 tracking-wider uppercase">
                        <span>{group.label}</span>
                        <span className={`font-semibold lowercase ${isDayExpense ? 'text-[#B83230] dark:text-rose-400' : 'text-[#4A7C59] dark:text-green-400'}`}>
                          {daySummaryLabel}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {group.txs.map(tx => {
                          const isExpense = tx.type === 'expense';
                          const timeStr = tx.date ? new Date(tx.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '12:00';
                          const member = memberBreakdown.find(m => m.member?.id === tx.memberId)?.member;
                          const txCat = categories.find(c => c.id === tx.category);
                          const displayTitle = tx.note || tx.rawNote || txCat?.label || categoryTitle;
                          const brandKey = getMerchantBrandKey(displayTitle);

                          return (
                            <div 
                              key={tx.id}
                              onClick={() => onEditTransaction(tx)}
                              className="bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-xl p-3 shadow-2xs flex items-center justify-between border border-[#E4E0D8]/40 dark:border-white/5 active:scale-[0.99] transition cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0">
                                  <BrandIcon 
                                    name={displayTitle}
                                    brandKey={brandKey}
                                    category={txCat}
                                    size="md"
                                    className="rounded-xl shadow-2xs"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-semibold text-[#2E3230] dark:text-white truncate">
                                      {displayTitle}
                                    </p>
                                    {member && (
                                      <span 
                                        className="px-1.5 py-0.2 rounded bg-white dark:bg-[#252528] text-[10px] font-bold shrink-0"
                                        style={{ color: member.color || undefined }}
                                      >
                                        <span>{member.name}</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#74796E] dark:text-stone-400 truncate">
                                    {tx.rawNote && tx.rawNote !== tx.note ? tx.rawNote : (txCat?.label || categoryTitle)}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0 ml-2">
                                <p className={`text-sm font-bold ${isExpense ? 'text-[#B83230] dark:text-rose-400' : 'text-[#4A7C59] dark:text-green-400'}`}>
                                  {isExpense ? '-' : '+'}{formatAmount(tx.amount)} ₽
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions & Sync Info */}
            <div className="pt-3 pb-2 flex flex-col items-center space-y-3">
              <div className="text-[11px] text-[#4A4E4A] dark:text-stone-400 text-center">
                <span>Показано {filteredTransactionsCount} из {familyTransactionsCount} операций</span>
              </div>

              <button 
                type="button"
                onClick={() => setViewMode('analytics')}
                className="w-full h-12 rounded-xl bg-[#4A7C59] hover:bg-[#3D684A] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition cursor-pointer"
              >
                <BarChart3 size={18} />
                <span>Аналитика и график трат</span>
              </button>
            </div>

          </div>
        ) : (
          /* ===================================================================== */
          /* SCREEN 2: АНАЛИТИКА КАТЕГОРИИ (KPI, ГРАФИК, ВЫВОДЫ)                   */
          /* ===================================================================== */
          <div className="flex flex-col space-y-4 pt-2">
            
            {/* Header Info / Category Card */}
            <div className="bg-[#F0ECE4] dark:bg-[#1C1C1E] rounded-2xl p-4 flex items-center justify-between shadow-sm border border-[#E4E0D8]/70 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#C8E8D0] dark:bg-emerald-950/40 flex items-center justify-center text-[#4A7C59] dark:text-emerald-400 shrink-0 shadow-2xs">
                  {categoryIcon}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-lg font-headline font-bold text-[#2E3230] dark:text-white">
                      {categoryTitle}
                    </h2>
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#4A7C59]/10 text-[#4A7C59] dark:text-green-300 rounded-full">
                      Семья
                    </span>
                  </div>
                  <p className="text-xs text-[#4A4E4A] dark:text-stone-400 font-medium">
                    {currentMonthFormatted} • {familyTransactionsCount} операций
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setViewMode('inspector')}
                className="px-3.5 py-2 rounded-xl bg-[#EAE6DE] dark:bg-white/10 hover:bg-[#E4E0D8] text-[#2E3230] dark:text-white text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <span>Операции</span>
                <ArrowRight size={16} className="text-[#4A7C59] dark:text-green-400" />
              </button>
            </div>

            {/* Key KPI Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Расходы (Span 2) */}
              <div className={DASHBOARD_CARD+" col-span-2 flex flex-col justify-between"}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--terra-muted)]">
                    Расходы
                  </span>
                  {!privacyMode&&trendPercent !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                      trendPercent <= 0
                        ? 'bg-[#C8E8D0] dark:bg-emerald-950/40 text-[#2A6038] dark:text-emerald-300'
                        : 'bg-[#FFDAD8] dark:bg-rose-950/40 text-[#690005] dark:text-rose-300'
                    }`}>
                      {trendPercent > 0 ? '+' : ''}{trendPercent}% к {prevMonthShort}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2 mt-1">
                  <div className="text-2xl font-semibold tabular-nums text-[var(--terra-ink)] [overflow-wrap:anywhere]">
                    {formatAmount(totalExpense)} <span className="text-lg font-normal text-[#4A4E4A] dark:text-stone-400">₽</span>
                  </div>
                  <div className="flex items-center text-xs text-[#4A4E4A] dark:text-stone-400 font-medium">
                    {privacyMode?'Лимит скрыт':categoryLimit ? `Лимит: ${formatAmount(categoryLimit)} ₽` : 'Без лимита'}
                  </div>
                </div>

                {!privacyMode&&categoryLimit && categoryLimit > 0 && (
                  <div className="w-full bg-[#E4E0D8] dark:bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full terra-progress ${
                        limitProgress > 90 ? 'bg-[#B83230]' : 'bg-[#4A7C59]'
                      }`}
                      style={{ width: `${limitProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Card 2: Среднее в день */}
              <div className={DASHBOARD_CARD+" flex flex-col justify-between"}>
                <div className="flex items-center gap-1.5 text-[#4A4E4A] dark:text-stone-400 mb-2">
                  <Calendar size={16} className="text-[#6B6358] dark:text-stone-300" />
                  <span className="text-xs font-medium">Среднее в день</span>
                </div>
                <div>
                  <div className="text-xl font-semibold tabular-nums text-[var(--terra-ink)] [overflow-wrap:anywhere]">
                    {formatAmount(avgDaily)} <span className="text-xs font-normal text-[#4A4E4A]">₽</span>
                  </div>

                </div>
              </div>

              {/* Card 3: Доходы & Баланс */}
              <div className={DASHBOARD_CARD+" flex flex-col justify-between"}>
                <div className="flex items-center gap-1.5 text-[#4A4E4A] dark:text-stone-400 mb-2">
                  <PlusCircle size={16} className="text-[#4A7C59] dark:text-green-400" />
                  <span className="text-xs font-medium">Пополнения</span>
                </div>
                <div>
                  <div className="text-xl font-semibold tabular-nums text-[var(--terra-primary-text)] [overflow-wrap:anywhere]">
                    +{formatAmount(totalIncome)} <span className="text-xs font-normal">₽</span>
                  </div>
                  <p className="text-[11px] text-[#4A4E4A] dark:text-stone-400 font-medium mt-0.5">
                    Баланс: {!privacyMode && netBalance > 0 ? '+' : ''}{formatAmount(netBalance)} ₽
                  </p>
                </div>
              </div>
            </div>

            {/* Shared chart and merchant details */}
            {privacyMode?<p role="status" className="p-4 rounded-xl bg-[var(--terra-surface)] text-sm text-[var(--terra-muted)]">График скрыт в режиме приватности</p>:<DrillDownAnalyticsChart
              familyTransactions={familyTransactions} chartData={chartData}
              chartGranularity={chartGranularity} setChartGranularity={setChartGranularity}
              chartSeriesFilter={chartSeriesFilter} setChartSeriesFilter={setChartSeriesFilter}
              monthLabel={monthLabel} categories={categories} mobile
            />}

            {/* Family Breakdown */}
            {!privacyMode&&memberBreakdown.length > 0 && (
              <div className={DASHBOARD_CARD+" space-y-3"}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-[#705C30] dark:text-amber-400" />
                    <h3 className={SECTION_HEADING}>
                      Участники семьи
                    </h3>
                  </div>
                  <span className="text-xs text-[#4A4E4A] dark:text-stone-400 font-medium">
                    {memberBreakdown.length} {memberBreakdown.length === 1 ? 'участник' : 'участника'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {memberBreakdown.map((item, idx) => {
                    const name = item.member?.name || 'Общие расходы';
                    const initial = name.charAt(0).toUpperCase();

                    return (
                      <div key={item.member?.id || idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                              style={{ backgroundColor: item.member?.color || '#4A7C59' }}
                            >
                              {initial}
                            </div>
                            <span className="font-semibold text-[#2E3230] dark:text-white">{name}</span>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-[#2E3230] dark:text-white">
                              {formatAmount(sumMoney([item.expense,item.income]))} ₽
                            </span>
                            <span className="text-[#4A4E4A] dark:text-stone-400 text-[11px] ml-1">
                              ({item.share}% оборота)
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-[#EAE6DE] dark:bg-white/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full terra-progress"
                            style={{ 
                              width: `${chartBarPercent(item.share,100)}%`,
                              backgroundColor: item.member?.color || (idx === 0 ? '#4A7C59' : '#C4A66A')
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Primary Bottom Action */}
            <div className="pt-2 pb-2">
              <button 
                type="button"
                onClick={() => setViewMode('inspector')}
                className="w-full py-3.5 px-4 bg-[#4A7C59] hover:bg-[#3D684A] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer"
              >
                <List size={18} />
                <span>К списку операций</span>
              </button>
            </div>

          </div>
        )}

      </main>
    </motion.div>
  );
};

export default DrillDownMobile;
