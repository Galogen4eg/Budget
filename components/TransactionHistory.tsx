
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { Search, X, History, ChevronRight } from 'lucide-react';
import BudgetMobile from './BudgetMobile';
import BudgetDesktop from './BudgetDesktop';

interface TransactionHistoryProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onLearnRule: (rule: LearnedRule) => void;
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
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
    transactions, settings, members, categories, filterMode = 'month', 
    onEditTransaction, initialSearch = '', selectedCategoryId, 
    selectedMerchantName, onClearFilters, onViewAll, 
    selectedDate, currentMonth, hideTitle = false 
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
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

  const searchedTransactions = useMemo(() => {
    let result = transactions;

    if (selectedDate) {
        const targetStr = selectedDate.toDateString();
        result = result.filter(tx => new Date(tx.date).toDateString() === targetStr);
    } else if (currentMonth && filterMode === 'month') {
        result = result.filter(tx => {
            const d = new Date(tx.date);
            return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
        });
    }

    if (selectedCategoryId && selectedCategoryId !== 'all') {
        result = result.filter(tx => tx.category === selectedCategoryId);
    }
    
    if (selectedMerchantName) {
        const target = selectedMerchantName.toLowerCase();
        result = result.filter(tx => 
            (tx.note || '').toLowerCase().includes(target) || 
            (tx.rawNote || '').toLowerCase().includes(target)
        );
    }

    if (!searchQuery.trim()) return result;
    
    const query = searchQuery.toLowerCase();
    return result.filter(tx => {
        const category = categories.find(c => c.id === tx.category)?.label || '';
        return (tx.note || '').toLowerCase().includes(query) || 
               (tx.rawNote || '').toLowerCase().includes(query) ||
               category.toLowerCase().includes(query) ||
               tx.amount.toString().includes(query);
    });
  }, [transactions, searchQuery, categories, selectedCategoryId, selectedMerchantName, selectedDate, currentMonth, filterMode]);

  // Limit items for initial view on mobile unless Show All is clicked or filtering is active
  const visibleTransactions = useMemo(() => {
    if (isDesktop || searchQuery.trim() || filterMode === 'day' || showAll || selectedCategoryId || selectedDate) {
      return searchedTransactions;
    }
    // Sort and slice for mobile initial view
    return [...searchedTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);
  }, [searchedTransactions, searchQuery, filterMode, showAll, selectedCategoryId, selectedDate, isDesktop]);

  // Determine if we should force mobile view (e.g. inside DrillDownModal which is narrow)
  const effectiveIsDesktop = isDesktop && !hideTitle; 

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
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2C2C2E] text-gray-300 hover:text-blue-500 transition-colors"
            title="Открыть полный список"
          >
              <ChevronRight size={20} />
          </button>
      </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      {effectiveIsDesktop ? (
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] h-full flex flex-col border border-white dark:border-white/5 shadow-soft dark:shadow-none relative group">
              {DesktopHeader}
              
              {/* Search Input */}
              {transactions.length > 0 && (
                  <div className="relative mb-2 shrink-0">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по названию или сумме..."
                        className="w-full p-3 pl-10 rounded-2xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:border-blue-500 transition-colors shadow-sm bg-gray-50 dark:bg-[#2C2C2E] border-transparent"
                        autoFocus={false}
                      />
                      <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                      {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-gray-400 hover:text-red-500">
                              <X size={16} />
                          </button>
                      )}
                  </div>
              )}

              {/* Main List */}
              <div className="flex-1 min-h-0">
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
                  <div className="relative mb-2 shrink-0">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск..."
                        className="w-full p-3 pl-10 rounded-2xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:border-blue-500 transition-colors shadow-sm bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5"
                        autoFocus={false}
                      />
                      <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                      {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-gray-400 hover:text-red-500">
                              <X size={16} />
                          </button>
                      )}
                  </div>
              )}

              {/* Mobile Stat Header */}
              {filterMode === 'month' && !selectedDate && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-2 shrink-0">
                      <div className="bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl p-4 text-[#1C1C1E] dark:text-white flex-1 min-w-[140px]">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">
                              Расход {currentMonth && `(${currentMonth.toLocaleString('ru', { month: 'short' })})`}
                          </span>
                          <span className="text-xl md:text-3xl font-black">{settings.privacyMode ? '•••' : searchedTransactions.filter(t => t.type === 'expense').reduce((a,b)=>a+b.amount,0).toLocaleString()}</span>
                      </div>
                  </div>
              )}

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
                    />
                  )}
                  
                  {searchedTransactions.length > 15 && !showAll && !selectedCategoryId && !selectedDate && !searchQuery && (
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
