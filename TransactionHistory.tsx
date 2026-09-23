
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { Search, X, History, ChevronRight, ArrowDownCircle, ArrowUpCircle, LayoutList, Calendar, ChevronDown, Check } from 'lucide-react';
import BudgetMobile from './BudgetMobile';
import BudgetDesktop from './BudgetDesktop';
import { useClickAway } from 'react-use';
import { RippleButton } from './RippleButton';

interface TransactionHistoryProps {
  transactions: Transaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onLearnRule?: (rule: LearnedRule) => void;
  onApplyRuleToExisting?: (rule: LearnedRule) => void;
  categories: Category[];
  filterMode?: 'day' | 'month';
  onEditTransaction?: (tx: Transaction) => void;
  initialSearch?: string;
  selectedCategoryId?: string;
  selectedMerchantName?: string;
  onClearFilters?: () => void;
  onViewAll?: () => void;
  hideActiveFilterBadge?: boolean;
  onAddCategory?: (category: Category) => void;
  selectedDate?: Date | null;
  currentMonth?: Date;
  hideTitle?: boolean;
  hideFilters?: boolean; 
}

type PeriodFilter = 'context' | 'all' | 'current_month' | 'last_month' | '7_days' | '30_days' | 'custom';

const PERIOD_LABELS: Record<PeriodFilter, string> = {
    'context': 'Текущий выбор',
    'all': 'За все время',
    'current_month': 'Этот месяц',
    'last_month': 'Прошлый месяц',
    '7_days': 'Последние 7 дней',
    '30_days': 'Последние 30 дней',
    'custom': 'Свой диапазон'
};

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
    transactions, setTransactions, settings, members, categories, filterMode = 'month', 
    onEditTransaction, initialSearch = '', selectedCategoryId, 
    selectedMerchantName, onClearFilters, onViewAll, 
    selectedDate, currentMonth, hideTitle = false,
    hideFilters = false, onLearnRule, onApplyRuleToExisting, onAddCategory, hideActiveFilterBadge
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('context');
  
  // Custom Date Range State
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Dropdown State
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  useClickAway(filterMenuRef, () => setIsFilterMenuOpen(false));

  const [showAll, setShowAll] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Responsive Check
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
      if (initialSearch) setSearchQuery(initialSearch);
  }, [initialSearch]);

  // Reset period filter when external filters change (to respect the "context" initially)
  useEffect(() => {
      setPeriodFilter('context');
  }, [selectedDate, currentMonth, selectedCategoryId]);

  const searchedTransactions = useMemo(() => {
    let result = transactions;

    // 1. Date/Period Filtering
    if (periodFilter === 'context') {
        // Use external props (standard behavior)
        if (selectedDate) {
            const targetStr = selectedDate.toDateString();
            result = result.filter(tx => new Date(tx.date).toDateString() === targetStr);
        } else if (currentMonth && filterMode === 'month') {
            result = result.filter(tx => {
                const d = new Date(tx.date);
                return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
            });
        }
    } else {
        // Override with internal period presets
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (periodFilter) {
            case 'current_month':
                result = result.filter(tx => {
                    const d = new Date(tx.date);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
                break;
            case 'last_month':
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                result = result.filter(tx => {
                    const d = new Date(tx.date);
                    return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
                });
                break;
            case '7_days': {
                const limit = new Date(today);
                limit.setDate(limit.getDate() - 7);
                result = result.filter(tx => new Date(tx.date) >= limit);
                break; 
            }
            case '30_days': {
                const limit = new Date(today);
                limit.setDate(limit.getDate() - 30);
                result = result.filter(tx => new Date(tx.date) >= limit);
                break;
            }
            case 'custom': {
                if (customStartDate && customEndDate) {
                    const start = new Date(customStartDate);
                    start.setHours(0,0,0,0);
                    const end = new Date(customEndDate);
                    end.setHours(23,59,59,999);
                    
                    result = result.filter(tx => {
                        const tDate = new Date(tx.date);
                        return tDate >= start && tDate <= end;
                    });
                }
                break;
            }
            case 'all':
            default:
                // No date filtering
                break;
        }
    }

    // 2. Category Filtering
    if (selectedCategoryId && selectedCategoryId !== 'all') {
        const targetCat = categories.find(c => c.id === selectedCategoryId);
        if (targetCat) {
            const childCats = categories.filter(c => c.parentId === targetCat.id);
            if (childCats.length > 0) {
                const familyIds = [targetCat.id, ...childCats.map(c => c.id)];
                result = result.filter(tx => familyIds.includes(tx.category));
            } else {
                result = result.filter(tx => tx.category === selectedCategoryId);
            }
        } else {
            result = result.filter(tx => tx.category === selectedCategoryId);
        }
    }
    
    // 3. Merchant Name Filtering (Drill down)
    if (selectedMerchantName) {
        const target = selectedMerchantName.toLowerCase();
        result = result.filter(tx => 
            (tx.note || '').toLowerCase().includes(target) || 
            (tx.rawNote || '').toLowerCase().includes(target)
        );
    }

    // 4. Type Filtering (Income/Expense)
    if (typeFilter !== 'all') {
        result = result.filter(tx => tx.type === typeFilter);
    }

    // 5. Text Search
    if (!searchQuery.trim()) return result;
    
    const query = searchQuery.toLowerCase();
    return result.filter(tx => {
        const category = categories.find(c => c.id === tx.category)?.label || '';
        return (tx.note || '').toLowerCase().includes(query) || 
               (tx.rawNote || '').toLowerCase().includes(query) ||
               category.toLowerCase().includes(query) ||
               tx.amount.toString().includes(query);
    });
  }, [transactions, searchQuery, categories, selectedCategoryId, selectedMerchantName, selectedDate, currentMonth, filterMode, typeFilter, periodFilter, customStartDate, customEndDate]);

  // Calculate stats for the filtered result
  const stats = useMemo(() => {
      const income = searchedTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = searchedTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return { income, expense, net: income - expense };
  }, [searchedTransactions]);

  // Limit items for initial view on mobile unless Show All is clicked or filtering is active
  const visibleTransactions = useMemo(() => {
    if (isDesktop || searchQuery.trim() || filterMode === 'day' || showAll || selectedCategoryId || selectedDate || typeFilter !== 'all' || periodFilter !== 'context') {
      return searchedTransactions;
    }
    // Sort and slice for mobile initial view
    return [...searchedTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);
  }, [searchedTransactions, searchQuery, filterMode, showAll, selectedCategoryId, selectedDate, isDesktop, typeFilter, periodFilter]);

  const handleCategoryChange = (txId: string, newCategoryId: string) => {
    if (!setTransactions) return;
    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        const updated = { ...t, category: newCategoryId };
        const merchantKey = t.note || t.rawNote || '';
        if (merchantKey && onLearnRule) {
          onLearnRule({
            id: 'rule-' + Date.now(),
            pattern: merchantKey,
            categoryId: newCategoryId,
            exactMatch: false
          });
        }
        return updated;
      }
      return t;
    }));
  };

  const FilterControls = (
      <div className="flex gap-2.5 mb-4 flex-wrap items-center relative z-[100]">
          {/* Period Dropdown matching screenshot */}
          <div className="relative" ref={filterMenuRef}>
              <button 
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all border ${
                    isFilterMenuOpen || periodFilter !== 'context' 
                      ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-black border-transparent shadow-sm' 
                      : 'bg-white dark:bg-[#1C1C1E] text-graphite dark:text-gray-200 border-surface-border dark:border-white/10 hover:bg-[#FAF8F5] dark:hover:bg-[#2C2C2E]'
                  }`}
              >
                  <Calendar size={13} className="text-primary dark:text-green-400" />
                  <span>{PERIOD_LABELS[periodFilter]}</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${isFilterMenuOpen ? 'rotate-180' : ''}`}/>
              </button>

              {isFilterMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl border border-surface-border dark:border-white/10 p-2 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                      {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((key) => {
                          if (key === 'context' && !selectedDate && !currentMonth) return null;
                          return (
                              <button
                                  key={key}
                                  onClick={() => {
                                      setPeriodFilter(key);
                                      if (key === 'custom') {
                                          setTimeout(() => {
                                              if (startDateInputRef.current) {
                                                  try {
                                                      startDateInputRef.current.showPicker();
                                                  } catch (e) {
                                                      startDateInputRef.current.focus();
                                                  }
                                              }
                                          }, 50);
                                      } else {
                                          setIsFilterMenuOpen(false);
                                      }
                                  }}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-colors ${
                                    periodFilter === key 
                                      ? 'bg-primary/10 text-primary dark:text-green-400 font-bold' 
                                      : 'text-graphite dark:text-white hover:bg-[#FAF8F5] dark:hover:bg-white/5'
                                  }`}
                              >
                                  {PERIOD_LABELS[key]}
                                  {periodFilter === key && <Check size={14} />}
                              </button>
                          );
                      })}
                      
                      {periodFilter === 'custom' && (
                          <div className="p-3 bg-[#FAF8F5] dark:bg-[#2C2C2E] rounded-xl mt-2 border border-surface-border dark:border-white/5 space-y-2">
                              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">Диапазон дат</span>
                              <div className="flex gap-2">
                                  <div className="flex-1">
                                      <input 
                                          ref={startDateInputRef}
                                          type="date" 
                                          value={customStartDate} 
                                          onChange={(e) => setCustomStartDate(e.target.value)}
                                          onClick={(e) => {
                                              try {
                                                  e.currentTarget.showPicker();
                                              } catch {}
                                          }}
                                          className="w-full bg-white dark:bg-[#1C1C1E] rounded-lg px-2.5 py-2 text-xs font-bold outline-none border border-surface-border dark:border-white/10 focus:border-primary text-graphite dark:text-white cursor-pointer"
                                          placeholder="С"
                                      />
                                  </div>
                                  <div className="flex-1">
                                      <input 
                                          type="date" 
                                          value={customEndDate} 
                                          onChange={(e) => setCustomEndDate(e.target.value)}
                                          onClick={(e) => {
                                              try {
                                                  e.currentTarget.showPicker();
                                              } catch {}
                                          }}
                                          className="w-full bg-white dark:bg-[#1C1C1E] rounded-lg px-2.5 py-2 text-xs font-bold outline-none border border-surface-border dark:border-white/10 focus:border-primary text-graphite dark:text-white cursor-pointer"
                                          placeholder="По"
                                      />
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>

          <div className="h-5 w-px bg-surface-border dark:bg-white/10 mx-0.5" />

          {/* Type Filters (ВСЕ, РАСХОД, ДОХОД) */}
          <div className="flex bg-[#F2EFEB] dark:bg-[#2C2C2E] p-1 rounded-xl">
              <RippleButton 
                  onClick={() => setTypeFilter('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-headline font-bold uppercase transition-all ${
                    typeFilter === 'all' 
                      ? 'bg-white dark:bg-[#1C1C1E] shadow-sm text-graphite dark:text-white' 
                      : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white'
                  }`}
              >
                  Все
              </RippleButton>
              <RippleButton 
                  onClick={() => setTypeFilter('expense')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-headline font-bold uppercase transition-all flex items-center gap-1.5 ${
                    typeFilter === 'expense' 
                      ? 'bg-white dark:bg-[#1C1C1E] shadow-sm text-[#E05252] dark:text-red-400' 
                      : 'text-graphite-muted dark:text-gray-400 hover:text-[#E05252]'
                  }`}
              >
                  <ArrowUpCircle size={13} className="text-[#E05252]" />
                  <span>Расход</span>
              </RippleButton>
              <RippleButton 
                  onClick={() => setTypeFilter('income')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-headline font-bold uppercase transition-all flex items-center gap-1.5 ${
                    typeFilter === 'income' 
                      ? 'bg-white dark:bg-[#1C1C1E] shadow-sm text-[#4A7C59] dark:text-green-400' 
                      : 'text-graphite-muted dark:text-gray-400 hover:text-[#4A7C59]'
                  }`}
              >
                  <ArrowDownCircle size={13} className="text-[#4A7C59] dark:text-green-400" />
                  <span>Доход</span>
              </RippleButton>
          </div>
      </div>
  );

  const SummaryBlock = (
      <div className="grid grid-cols-3 gap-3 mb-5 shrink-0">
          {/* Доход (Green card) */}
          <div className="bg-[#EAF2EC] dark:bg-[#4A7C59]/15 rounded-2xl p-3.5 border border-[#D5E6D8] dark:border-[#4A7C59]/25">
              <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownCircle size={14} className="text-[#4A7C59] dark:text-green-400" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4A7C59] dark:text-green-400">
                    Доход
                  </span>
              </div>
              <span className="text-base md:text-xl font-headline font-bold text-[#4A7C59] dark:text-green-400 whitespace-nowrap block">
                  {settings.privacyMode ? '•••' : `+${stats.income.toLocaleString('ru-RU')}`}
              </span>
          </div>

          {/* Расход (Red card) */}
          <div className="bg-[#FDF2F2] dark:bg-red-950/20 rounded-2xl p-3.5 border border-[#FADCDD] dark:border-red-900/25">
              <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUpCircle size={14} className="text-[#E05252] dark:text-red-400" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E05252] dark:text-red-400">
                    Расход
                  </span>
              </div>
              <span className="text-base md:text-xl font-headline font-bold text-[#E05252] dark:text-red-400 whitespace-nowrap block">
                  {settings.privacyMode ? '•••' : `-${stats.expense.toLocaleString('ru-RU')}`}
              </span>
          </div>

          {/* Итого (Neutral card) */}
          <div className="bg-white dark:bg-[#252528] rounded-2xl p-3.5 border border-surface-border dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">
                    Итого
                  </span>
              </div>
              <span className={`text-base md:text-xl font-headline font-bold whitespace-nowrap block ${
                stats.net > 0 ? 'text-[#4A7C59] dark:text-green-400' : stats.net < 0 ? 'text-[#E05252] dark:text-red-400' : 'text-graphite dark:text-white'
              }`}>
                  {settings.privacyMode ? '•••' : `${stats.net > 0 ? '+' : ''}${stats.net.toLocaleString('ru-RU')}`}
              </span>
          </div>
      </div>
  );

  // Render Desktop view if screen is wide enough
  const effectiveIsDesktop = isDesktop;

  const DesktopHeader = (
      <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-gray-500 dark:text-gray-300">
                  <History size={18} />
              </div>
              <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white">История</h3>
          </div>
          {/* Arrow for interaction */}
          <button 
            onClick={() => {
                if (onViewAll) {
                    onViewAll();
                } else if (onClearFilters) {
                    onClearFilters();
                }
                setSearchQuery('');
                setTypeFilter('all');
                setPeriodFilter('context');
                setCustomStartDate('');
                setCustomEndDate('');
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2C2C2E] text-gray-300 hover:text-blue-500 transition-colors"
            title="Открыть полный список / Сбросить"
          >
              <ChevronRight size={20} />
          </button>
      </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      {effectiveIsDesktop ? (
          <div className={`bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] h-full flex flex-col border border-white dark:border-white/5 shadow-soft dark:shadow-none relative group ${hideTitle ? '!p-0 !border-0 !shadow-none !bg-transparent rounded-none' : ''}`}>
              {!hideTitle && DesktopHeader}
              
              {/* Search Input */}
              {transactions.length > 0 && (
                  <div className="relative mb-3.5 shrink-0">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по названию или сумме..."
                        className="w-full p-3 pl-10 rounded-2xl text-sm font-semibold outline-none text-graphite dark:text-white placeholder:text-gray-400 focus:border-primary transition-colors shadow-sm bg-white dark:bg-[#252528] border border-surface-border dark:border-white/10"
                        autoFocus={false}
                      />
                      <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                      {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3.5 text-gray-400 hover:text-red-500 transition-colors">
                              <X size={16} />
                          </button>
                      )}
                  </div>
              )}

              {/* Filters */}
              {!hideFilters && FilterControls}

              {/* Summary Stats */}
              {!hideFilters && searchedTransactions.length > 0 && SummaryBlock}

              {/* Main List */}
              <div className={`flex-1 min-w-0 ${!hideTitle ? 'overflow-y-auto custom-scrollbar' : ''}`}>
                  {transactions.length === 0 ? (
                    <div className="text-center py-10 text-gray-300 dark:text-gray-600 font-bold text-xs uppercase tracking-widest">Нет операций</div>
                  ) : searchedTransactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-bold text-sm">Ничего не найдено</div>
                  ) : (
                    <BudgetDesktop 
                        transactions={searchedTransactions} 
                        categories={categories}
                        members={members}
                        onEdit={(tx) => onEditTransaction && onEditTransaction(tx)}
                        privacyMode={settings.privacyMode}
                        isModal={hideTitle} // Enable multi-column grid only in modal mode
                        onCategoryChange={setTransactions ? handleCategoryChange : undefined}
                    />
                  )}
              </div>
          </div>
      ) : (
          <div className="space-y-4 h-full flex flex-col">
              {/* Mobile Header (Conditional) */}
              {!hideTitle && (
                  <div className="flex items-center justify-between mb-2 px-1 shrink-0">
                      <div className="flex items-center gap-2">
                          <div className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-gray-500 dark:text-gray-300">
                              <History size={18} />
                          </div>
                          <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white">История</h3>
                      </div>
                  </div>
              )}

              {/* Search Input */}
              {transactions.length > 0 && (
                  <div className="relative mb-2.5 shrink-0">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по названию или сумме..."
                        className="w-full p-3 pl-10 rounded-2xl text-sm font-semibold outline-none text-graphite dark:text-white placeholder:text-gray-400 focus:border-primary transition-colors shadow-sm bg-white dark:bg-[#252528] border border-surface-border dark:border-white/10"
                        autoFocus={false}
                      />
                      <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                      {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3.5 text-gray-400 hover:text-red-500 transition-colors">
                              <X size={16} />
                          </button>
                      )}
                  </div>
              )}

              {/* Period & Type Filters Mobile */}
              {!hideFilters && FilterControls}

              {/* Summary Stats Mobile */}
              {!hideFilters && searchedTransactions.length > 0 && SummaryBlock}

              {/* Mobile List */}
              <div className="flex-1 min-h-0">
                  {transactions.length === 0 ? (
                    <div className="text-center py-10 text-gray-300 dark:text-gray-600 font-bold text-xs uppercase tracking-widest">Нет операций</div>
                  ) : searchedTransactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-bold text-sm">Ничего не найдено</div>
                  ) : (
                    <BudgetMobile 
                        transactions={visibleTransactions}
                        categories={categories}
                        members={members}
                        onEdit={(tx) => onEditTransaction && onEditTransaction(tx)}
                        privacyMode={settings.privacyMode}
                        onCategoryChange={setTransactions ? handleCategoryChange : undefined}
                    />
                  )}
                  
                  {searchedTransactions.length > 15 && !showAll && !selectedCategoryId && !selectedDate && !searchQuery && typeFilter === 'all' && periodFilter === 'context' && (
                    <button onClick={() => setShowAll(true)} className="w-full mt-4 py-4 text-xs font-black text-gray-400 uppercase tracking-widest bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-100 dark:border-white/5 hover:text-blue-500 transition-colors">
                        Показать все
                    </button>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default TransactionHistory;
