
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, AppSettings, FamilyMember, Category } from '../types';
import { Search, X, History } from 'lucide-react';
import BudgetMobile from './BudgetMobile';
import BudgetDesktop from './BudgetDesktop';

interface DrillDownHistoryProps {
  transactions: Transaction[];
  settings: AppSettings;
  members: FamilyMember[];
  categories: Category[];
  onEditTransaction?: (tx: Transaction) => void;
  selectedCategoryId?: string;
  selectedMerchantName?: string;
  selectedDate?: Date | null;
  currentMonth?: Date;
  filterMode?: 'day' | 'month';
}

const DrillDownHistory: React.FC<DrillDownHistoryProps> = ({ 
    transactions, settings, members, categories, 
    onEditTransaction, selectedCategoryId, 
    selectedMerchantName, selectedDate, currentMonth,
    filterMode = 'month'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);

  // Responsive Check
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const searchedTransactions = useMemo(() => {
    let result = transactions;

    // 1. Context Filtering (Strict props)
    if (selectedDate) {
        const targetStr = selectedDate.toDateString();
        result = result.filter(tx => new Date(tx.date).toDateString() === targetStr);
    } else if (currentMonth && filterMode === 'month') {
        result = result.filter(tx => {
            const d = new Date(tx.date);
            return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
        });
    }

    // 2. Category Filtering
    if (selectedCategoryId && selectedCategoryId !== 'all') {
        result = result.filter(tx => tx.category === selectedCategoryId);
    }
    
    // 3. Merchant Name Filtering
    if (selectedMerchantName) {
        const target = selectedMerchantName.toLowerCase();
        result = result.filter(tx => 
            (tx.note || '').toLowerCase().includes(target) || 
            (tx.rawNote || '').toLowerCase().includes(target)
        );
    }

    // 4. Text Search
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

  // Limit items for initial mobile view if no search
  const visibleTransactions = useMemo(() => {
    if (isDesktop || searchQuery.trim()) {
      return searchedTransactions;
    }
    // Mobile optimization: show first 20 unless searching
    return [...searchedTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 50);
  }, [searchedTransactions, searchQuery, isDesktop]);

  const DesktopHeader = (
      <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-gray-500 dark:text-gray-300">
                  <History size={18} />
              </div>
              <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white">История</h3>
          </div>
      </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      {isDesktop ? (
          <div className="bg-transparent h-full flex flex-col">
              {/* Desktop doesn't need title here as modal has it, but structure kept for consistency */}
              
              {/* Search Input */}
              {transactions.length > 0 && (
                  <div className="relative mb-3 shrink-0">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск..."
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
              <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
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
                        isModal={true} 
                    />
                  )}
              </div>
          </div>
      ) : (
          <div className="space-y-4 h-full flex flex-col">
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
              </div>
          </div>
      )}
    </div>
  );
};

export default DrillDownHistory;
