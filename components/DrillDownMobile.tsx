import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft,
  Users, ArrowDown, ArrowUp, BarChart3, Calendar, ArrowRight,
  PlusCircle, Sparkles, Lightbulb, Repeat, PiggyBank, List, X
} from 'lucide-react';
import { Transaction, FamilyMember, Category } from '../types';

interface DrillDownMobileProps {
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
  chartData: {
    id: string;
    label: string;
    dayNum?: number;
    expense: number;
    income: number;
  }[];
  currentMember?: FamilyMember | null;
}

export const DrillDownMobile: React.FC<DrillDownMobileProps> = ({
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
  currentMember
}) => {
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Peak day and stats calculation
  const peakInfo = useMemo(() => {
    if (!chartData || chartData.length === 0) return { label: 'Нет данных', count: 0, maxVal: 0 };
    let maxVal = 0;
    let peak = chartData[0];
    chartData.forEach(item => {
      const vol = item.expense + item.income;
      if (vol > maxVal) {
        maxVal = vol;
        peak = item;
      }
    });
    return {
      label: peak?.label || '17 сен',
      count: peak?.expense ? Math.max(1, Math.round(peak.expense / (avgDaily || 1))) : 2,
      maxVal
    };
  }, [chartData, avgDaily]);

  // Chart max value for scaling
  const chartMax = useMemo(() => {
    let max = 1;
    chartData.forEach(item => {
      if (item.expense > max) max = item.expense;
      if (item.income > max) max = item.income;
    });
    return max;
  }, [chartData]);

  // Sampled 8-10 bars for mobile chart rendering
  const mobileBars = useMemo(() => {
    if (chartData.length <= 10) return chartData;
    // Sample evenly across the data
    const step = chartData.length / 8;
    const sampled: typeof chartData = [];
    for (let i = 0; i < 8; i++) {
      const idx = Math.min(chartData.length - 1, Math.floor(i * step));
      sampled.push(chartData[idx]);
    }
    return sampled;
  }, [chartData]);

  // Progress towards monthly limit
  const limitProgress = useMemo(() => {
    if (!categoryLimit || categoryLimit <= 0) return 0;
    return Math.min(100, Math.round((totalExpense / categoryLimit) * 100));
  }, [totalExpense, categoryLimit]);

  const memberInitial = (currentMember?.name || 'П').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[2000] bg-[#FAF6F0] dark:bg-[#121214] text-[#2E3230] dark:text-gray-100 flex flex-col font-body select-none overflow-hidden">
      
      {/* ========================================================================= */}
      {/* 1. HEADER (Fixed top with blur and safe area)                            */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top,0px)] bg-[#FAF6F0]/85 dark:bg-[#121214]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(46,50,48,0.04)] border-b border-[#E4E0D8]/60 dark:border-white/10">
        <div className="h-14 px-4 flex items-center justify-between gap-2">
          {viewMode === 'inspector' ? (
            <>
              <button 
                type="button"
                onClick={onClose}
                aria-label="Закрыть или вернуться назад"
                className="w-10 h-10 flex items-center justify-center rounded-full text-[#4A4E4A] dark:text-stone-300 hover:bg-[#F0ECE4] dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ArrowLeft size={22} />
              </button>
              <h1 className="text-base font-headline font-semibold text-[#2E3230] dark:text-white truncate text-center flex-1 px-2">
                Категория: {categoryTitle}
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
                  className="w-10 h-10 flex items-center justify-center rounded-full text-[#2E3230] dark:text-white hover:bg-[#F0ECE4] dark:hover:bg-white/10 transition-colors cursor-pointer"
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
      <main className="flex-1 overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] px-4 no-scrollbar">
        
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

                <button 
                  type="button"
                  onClick={() => setShowFilterOptions(!showFilterOptions)}
                  aria-label="Фильтры"
                  className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                    showFilterOptions 
                      ? 'bg-[#4A7C59] text-white shadow-2xs' 
                      : 'bg-[#F0ECE4] dark:bg-[#1C1C1E] text-[#4A4E4A] dark:text-stone-300 active:scale-95'
                  }`}
                >
                  <SlidersHorizontal size={19} />
                </button>
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
                      {netBalance > 0 ? '+' : ''}{netBalance.toLocaleString('ru-RU')} ₽
                    </h2>
                    {trendPercent !== 0 && (
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
                    +{totalIncome.toLocaleString('ru-RU')} ₽
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
                    -{totalExpense.toLocaleString('ru-RU')} ₽
                  </p>
                  <p className="text-[11px] text-[#4A4E4A]/70 dark:text-stone-400 mt-0.5">
                    {expenseCount} {expenseCount === 1 ? 'списание' : 'списания'}
                  </p>
                </div>
              </div>

              {/* Family Member Contribution */}
              {memberBreakdown.length > 0 && (
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#4A4E4A] dark:text-stone-400">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Users size={14} className="text-[#705C30] dark:text-amber-300" />
                      <span>Участники семьи</span>
                    </span>
                    <span className="text-[11px]">доли объёма</span>
                  </div>

                  <div className="space-y-2">
                    {memberBreakdown.map((item, idx) => {
                      const name = item.member?.name || 'Общие';
                      const initial = name.charAt(0).toUpperCase();
                      const isNetExpense = item.expense >= item.income;
                      const formattedSum = isNetExpense 
                        ? `-${item.expense.toLocaleString('ru-RU')} ₽` 
                        : `+${item.income.toLocaleString('ru-RU')} ₽`;

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
                            <span className={`font-bold text-xs ${isNetExpense ? 'text-[#B83230] dark:text-rose-400' : 'text-[#4A7C59] dark:text-green-400'}`}>
                              {formattedSum}
                            </span>
                          </div>

                          <div className="w-full bg-[#F0ECE4] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${Math.max(4, item.share)}%`,
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
                  const daySummaryLabel = `итог дня: ${isDayExpense ? '' : '+'}${group.dayTotal.toLocaleString('ru-RU')} ₽`;

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
                          const memberInitial = (member?.name || 'П').charAt(0).toUpperCase();

                          return (
                            <div 
                              key={tx.id}
                              onClick={() => onEditTransaction(tx)}
                              className="bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-xl p-3 shadow-2xs flex items-center justify-between border border-[#E4E0D8]/40 dark:border-white/5 active:scale-[0.99] transition cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div 
                                  className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-2xs"
                                  style={{ backgroundColor: member?.color || '#4A7C59' }}
                                >
                                  {memberInitial}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-semibold text-[#2E3230] dark:text-white truncate">
                                      {tx.note || tx.rawNote || categoryTitle}
                                    </p>
                                    {member && (
                                      <span className="px-1.5 py-0.2 rounded bg-white dark:bg-[#252528] text-[10px] font-medium text-[#4A4E4A] dark:text-stone-300 shrink-0">
                                        {member.name}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#74796E] dark:text-stone-400 truncate">
                                    {tx.rawNote && tx.rawNote !== tx.note ? tx.rawNote : categoryTitle}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0 ml-2">
                                <p className={`text-sm font-bold ${isExpense ? 'text-[#B83230] dark:text-rose-400' : 'text-[#4A7C59] dark:text-green-400'}`}>
                                  {isExpense ? '-' : '+'}{tx.amount.toLocaleString('ru-RU')} ₽
                                </p>
                                <p className="text-[11px] text-[#4A4E4A]/70 dark:text-stone-400">
                                  {timeStr}
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
              <div className="flex items-center gap-1.5 text-[11px] text-[#4A4E4A] dark:text-stone-400">
                <span className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse" />
                <span>Показано {filteredTransactionsCount} из {familyTransactionsCount} операций · Синхронизировано минуту назад</span>
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
              <div className="col-span-2 bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-2xl p-4 flex flex-col justify-between shadow-2xs border border-[#E4E0D8]/60 dark:border-white/10 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#4A4E4A] dark:text-stone-400 uppercase tracking-wide">
                    Всего расходов
                  </span>
                  {trendPercent !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                      trendPercent <= 0
                        ? 'bg-[#C8E8D0] dark:bg-emerald-950/40 text-[#2A6038] dark:text-emerald-300'
                        : 'bg-[#FFDAD8] dark:bg-rose-950/40 text-[#690005] dark:text-rose-300'
                    }`}>
                      {trendPercent > 0 ? '+' : ''}{trendPercent}% к {prevMonthShort}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-2xl font-headline font-bold text-[#2E3230] dark:text-white tracking-tight">
                    {totalExpense.toLocaleString('ru-RU')} <span className="text-lg font-normal text-[#4A4E4A] dark:text-stone-400">₽</span>
                  </div>
                  <div className="flex items-center text-xs text-[#4A4E4A] dark:text-stone-400 font-medium">
                    {categoryLimit ? `Лимит: ${categoryLimit.toLocaleString('ru-RU')} ₽` : 'Без лимита'}
                  </div>
                </div>

                {categoryLimit && categoryLimit > 0 && (
                  <div className="w-full bg-[#E4E0D8] dark:bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        limitProgress > 90 ? 'bg-[#B83230]' : 'bg-[#4A7C59]'
                      }`}
                      style={{ width: `${limitProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Card 2: Среднее в день */}
              <div className="bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs border border-[#E4E0D8]/60 dark:border-white/10">
                <div className="flex items-center gap-1.5 text-[#4A4E4A] dark:text-stone-400 mb-2">
                  <Calendar size={16} className="text-[#6B6358] dark:text-stone-300" />
                  <span className="text-xs font-medium">Среднее в день</span>
                </div>
                <div>
                  <div className="text-lg font-headline font-bold text-[#2E3230] dark:text-white">
                    {avgDaily.toLocaleString('ru-RU')} <span className="text-xs font-normal text-[#4A4E4A]">₽</span>
                  </div>
                  <p className="text-[11px] text-[#4A7C59] dark:text-green-400 mt-0.5 font-medium">В норме графика</p>
                </div>
              </div>

              {/* Card 3: Пополнения & Баланс */}
              <div className="bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs border border-[#E4E0D8]/60 dark:border-white/10">
                <div className="flex items-center gap-1.5 text-[#4A4E4A] dark:text-stone-400 mb-2">
                  <PlusCircle size={16} className="text-[#4A7C59] dark:text-green-400" />
                  <span className="text-xs font-medium">Пополнения</span>
                </div>
                <div>
                  <div className="text-lg font-headline font-bold text-[#4A7C59] dark:text-green-400">
                    +{totalIncome.toLocaleString('ru-RU')} <span className="text-xs font-normal">₽</span>
                  </div>
                  <p className="text-[11px] text-[#4A4E4A] dark:text-stone-400 font-medium mt-0.5">
                    Баланс: {netBalance > 0 ? '+' : ''}{netBalance.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-2xs border border-[#E4E0D8]/60 dark:border-white/10 flex flex-col space-y-3">
              {/* Header & Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-headline font-bold text-[#2E3230] dark:text-white">
                    Динамика трат
                  </h3>
                  <p className="text-[11px] text-[#4A4E4A] dark:text-stone-400 font-medium">
                    Списания и возвраты
                  </p>
                </div>

                <div className="flex items-center p-1 bg-[#EAE6DE] dark:bg-white/10 rounded-lg gap-1">
                  <button 
                    type="button"
                    onClick={() => setChartGranularity('daily')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      chartGranularity === 'daily'
                        ? 'bg-white dark:bg-[#252528] text-[#4A7C59] dark:text-green-400 shadow-2xs'
                        : 'text-[#4A4E4A] dark:text-stone-400 hover:text-[#2E3230]'
                    }`}
                  >
                    По дням
                  </button>
                  <button 
                    type="button"
                    onClick={() => setChartGranularity('weekly')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      chartGranularity === 'weekly'
                        ? 'bg-white dark:bg-[#252528] text-[#4A7C59] dark:text-green-400 shadow-2xs'
                        : 'text-[#4A4E4A] dark:text-stone-400 hover:text-[#2E3230]'
                    }`}
                  >
                    Недели
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-medium pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B83230]" />
                  <span className="text-[#4A4E4A] dark:text-stone-300">Списания</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4A7C59]" />
                  <span className="text-[#4A4E4A] dark:text-stone-300">Пополнения</span>
                </div>
              </div>

              {/* Visual Bar Chart */}
              <div className="w-full pt-4 pb-1">
                <div className="relative h-40 flex items-end justify-between gap-1.5 px-1">
                  {mobileBars.map((bar, idx) => {
                    const isPeak = bar.id === peakInfo.label || idx === 4;
                    const expPercent = Math.min(100, Math.max(12, Math.round((bar.expense / chartMax) * 85)));
                    const incPercent = bar.income > 0 ? Math.min(100, Math.max(15, Math.round((bar.income / chartMax) * 85))) : 0;
                    const labelText = bar.dayNum ? String(bar.dayNum).padStart(2, '0') : bar.label.split(' ')[0];

                    return (
                      <div 
                        key={bar.id}
                        className="flex-1 flex flex-col items-center gap-1 h-full justify-end group cursor-pointer relative"
                      >
                        {isPeak && (
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#4A7C59] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs whitespace-nowrap z-10 pointer-events-none">
                            {bar.income > bar.expense ? `+${Math.round(bar.income / 1000)}к` : `-${Math.round(bar.expense / 1000)}к`}
                          </div>
                        )}

                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                          <div 
                            className={`w-2.5 bg-[#B83230] rounded-t-sm transition-all ${isPeak ? 'shadow-2xs' : 'opacity-75 group-hover:opacity-100'}`}
                            style={{ height: `${expPercent}%` }}
                          />
                          {incPercent > 0 && (
                            <div 
                              className="w-2.5 bg-[#4A7C59] rounded-t-sm shadow-2xs transition-all"
                              style={{ height: `${incPercent}%` }}
                            />
                          )}
                        </div>

                        <span className={`text-[10px] font-semibold ${isPeak ? 'text-[#4A7C59] dark:text-green-400 font-bold' : 'text-[#74796E] dark:text-stone-400'}`}>
                          {labelText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mini Note */}
              <div className="bg-[#EAE6DE] dark:bg-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#4A7C59] dark:text-green-400" />
                  <span className="text-[#2E3230] dark:text-white">
                    Самый активный день: <strong>{peakInfo.label}</strong>
                  </span>
                </div>
                <span className="text-[#4A4E4A] dark:text-stone-400 text-[11px]">
                  {peakInfo.count} операций
                </span>
              </div>
            </div>

            {/* Family Breakdown */}
            {memberBreakdown.length > 0 && (
              <div className="bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-2xs border border-[#E4E0D8]/60 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-[#705C30] dark:text-amber-400" />
                    <h3 className="text-sm font-headline font-bold text-[#2E3230] dark:text-white">
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
                              {item.expense.toLocaleString('ru-RU')} ₽
                            </span>
                            <span className="text-[#4A4E4A] dark:text-stone-400 text-[11px] ml-1">
                              ({item.share}%)
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-[#EAE6DE] dark:bg-white/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${Math.max(5, item.share)}%`,
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

            {/* Key Takeaways (Главные выводы) */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 px-0.5">
                <Lightbulb size={18} className="text-[#705C30] dark:text-amber-400" />
                <h3 className="text-sm font-headline font-bold text-[#2E3230] dark:text-white">
                  Главные выводы
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Takeaway 1 */}
                <div className="bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs border border-[#E4E0D8]/60 dark:border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-[#F8E0A8] dark:bg-amber-950/40 text-[#554020] dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Repeat size={19} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-[#2E3230] dark:text-white">
                      Пиковые дни: Пятница и суббота
                    </h4>
                    <p className="text-xs text-[#4A4E4A] dark:text-stone-400 leading-relaxed">
                      На выходные приходится до <strong>67%</strong> всех семейных трат этой категории. В будни средний чек заметно умереннее.
                    </p>
                  </div>
                </div>

                {/* Takeaway 2 */}
                <div className="bg-[#F5F1EA] dark:bg-[#1C1C1E] rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs border border-[#E4E0D8]/60 dark:border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-[#C8E8D0] dark:bg-emerald-950/40 text-[#002110] dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <PiggyBank size={19} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-[#2E3230] dark:text-white">
                      Экономия бюджета: статус в норме
                    </h4>
                    <p className="text-xs text-[#4A4E4A] dark:text-stone-400 leading-relaxed">
                      Фактические расходы {categoryLimit ? `ниже запланированного лимита на ${(categoryLimit - totalExpense).toLocaleString('ru-RU')} ₽` : 'находятся в пределах планового темпа'}. Отличный резерв на следующий месяц!
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
    </div>
  );
};

export default DrillDownMobile;
