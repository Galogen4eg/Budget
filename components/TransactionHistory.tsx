
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';
import { Sparkles, Check, ArrowDownRight, ArrowUpRight, Wallet, ChevronDown, ChevronUp, Clock, AlertTriangle, Search, X, CalendarDays } from 'lucide-react';
import { getMerchantBrandKey } from '../utils/categorizer';
import BrandIcon from './BrandIcon';

interface TransactionHistoryProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onLearnRule: (rule: LearnedRule) => void;
  categories: Category[];
  filterMode?: 'day' | 'month';
  onEditTransaction?: (tx: Transaction) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, setTransactions, settings, members, onLearnRule, categories, filterMode = 'month', onEditTransaction }) => {
  const [learningTx, setLearningTx] = useState<Transaction | null>(null);
  const [learningCat, setLearningCat] = useState('food');
  const [learningName, setLearningName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  
  const searchedTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const query = searchQuery.toLowerCase();
    return transactions.filter(tx => {
        const category = categories.find(c => c.id === tx.category)?.label || '';
        return (tx.note || '').toLowerCase().includes(query) || 
               (tx.rawNote || '').toLowerCase().includes(query) ||
               category.toLowerCase().includes(query) ||
               tx.amount.toString().includes(query);
    });
  }, [transactions, searchQuery, categories]);

  const summary = useMemo(() => {
    const income = searchedTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = searchedTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, total: income - expense };
  }, [searchedTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    searchedTransactions.forEach(tx => {
      const dateKey = new Date(tx.date).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return sortedDates.map(date => {
      const dayTxs = groups[date];
      const dayIncome = dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const dayExpense = dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return {
        date,
        transactions: dayTxs,
        dayIncome,
        dayExpense,
        dayNet: dayIncome - dayExpense,
        count: dayTxs.length
      };
    });
  }, [searchedTransactions]);

  // Show only 3 days by default if not searching or explicitly filtering by day
  const visibleGroups = useMemo(() => {
    if (searchQuery.trim() || filterMode === 'day' || showAll) {
      return groupedTransactions;
    }
    return groupedTransactions.slice(0, 3);
  }, [groupedTransactions, searchQuery, filterMode, showAll]);

  const hiddenCount = groupedTransactions.length - visibleGroups.length;

  const handleFinishLearning = () => {
    if (!learningTx || !learningName.trim()) return;
    let keyword = (learningTx.rawNote || learningTx.note).trim();
    if (/\d{4,}$/.test(keyword)) {
        keyword = keyword.replace(/\s?\d+$/, '').trim();
    }
    const newRule: LearnedRule = {
      id: Date.now().toString(),
      keyword: keyword,
      cleanName: learningName.trim(),
      categoryId: learningCat
    };
    onLearnRule(newRule);
    setLearningTx(null);
  };

  const renderTransactionCard = (tx: Transaction) => {
    const category = categories.find(c => c.id === tx.category);
    const member = members.find(m => m.id === tx.memberId);
    const displayTitle = tx.note || category?.label || 'Операция';
    const brandKey = getMerchantBrandKey(displayTitle);
    const isUnrecognized = tx.category === 'other';
    const timeString = new Date(tx.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    return (
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={tx.id} 
        onClick={() => onEditTransaction && onEditTransaction(tx)}
        className={`group flex items-center gap-4 p-4 bg-white hover:bg-gray-50 rounded-[1.8rem] transition-all shadow-sm border border-transparent cursor-pointer ios-btn-active ${isUnrecognized ? 'border-yellow-100/50 bg-yellow-50/10' : 'hover:border-blue-100'}`}
      >
        <div className="flex-shrink-0">
            <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="md" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <div className="flex flex-col min-w-0 mr-2">
                <h4 className="font-bold text-[#1C1C1E] text-base truncate leading-tight">{displayTitle}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-md">
                       <Clock size={10}/> {timeString}
                    </span>
                </div>
            </div>
            
            <div className="flex-shrink-0 text-right">
              <span className={`text-base font-black tabular-nums block ${tx.type === 'income' ? 'text-green-500' : 'text-[#1C1C1E]'}`}>
                {settings.privacyMode ? '••••' : `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()} ${settings.currency}`}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: member?.color || '#CCC' }} />
                <span className="text-[10px] font-bold text-gray-400">{member?.name}</span>
                <span className="text-gray-300 text-[8px]">•</span>
                <span className="text-[10px] font-bold text-gray-400">{category?.label}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <div className="px-1">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500">
            <Search size={18} />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию или сумме..."
            className="w-full bg-white border border-gray-100 py-4 pl-12 pr-12 rounded-[1.8rem] text-sm font-bold text-[#1C1C1E] outline-none shadow-soft focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-sm w-full">
          <p className="text-gray-400 font-bold text-center leading-relaxed text-sm uppercase tracking-widest">
            В этот {filterMode === 'day' ? 'день' : 'период'}<br/>операций не было
          </p>
        </div>
      ) : searchedTransactions.length === 0 ? (
        <div className="text-center py-12">
            <p className="text-gray-400 font-bold text-sm">Ничего не найдено</p>
        </div>
      ) : (
        <>
          <div className="space-y-8">
            {visibleGroups.map((group) => (
                <div key={group.date} className="space-y-3">
                    <div className="flex items-end justify-between px-3 sticky top-0 bg-[#EBEFF5]/95 backdrop-blur-sm py-3 z-10 border-b border-gray-200/50">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-black text-[#1C1C1E] uppercase tracking-wide">
                                    {new Date(group.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                Итого: <span className={group.dayNet >= 0 ? 'text-green-500' : 'text-red-400'}>
                                    {group.dayNet > 0 ? '+' : ''}{group.dayNet.toLocaleString()} {settings.currency}
                                </span>
                            </span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                            {group.dayIncome > 0 && <span className="text-[10px] font-black text-green-500">+{group.dayIncome.toLocaleString()}</span>}
                            {group.dayExpense > 0 && <span className="text-base font-black text-[#1C1C1E] tabular-nums">-{group.dayExpense.toLocaleString()}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-1">
                        {group.transactions.map(tx => renderTransactionCard(tx))}
                    </div>
                </div>
            ))}
          </div>

          {hiddenCount > 0 && (
            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAll(true)}
              className="w-full py-6 mt-4 bg-white/60 hover:bg-white rounded-[2rem] border border-gray-100 text-blue-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <CalendarDays size={16} />
              Показать историю за {hiddenCount} {hiddenCount === 1 ? 'день' : (hiddenCount > 1 && hiddenCount < 5) ? 'дня' : 'дней'}
            </motion.button>
          )}
          
          {showAll && groupedTransactions.length > 3 && (
              <button 
                onClick={() => setShowAll(false)}
                className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest"
              >
                Свернуть историю
              </button>
          )}
        </>
      )}

      {/* Total Summary Footer */}
      <div className="bg-[#1C1C1E] rounded-[2.2rem] p-6 text-white shadow-xl mt-6 flex flex-col md:flex-row justify-between items-center relative overflow-hidden gap-4 md:gap-0">
         <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-[#1C1C1E] opacity-50 pointer-events-none" />
         
         <div className="relative z-10 flex w-full md:w-auto justify-between md:justify-start gap-8">
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><ArrowUpRight size={10} className="text-green-500"/> Доход</span>
               <span className="text-lg font-black text-green-400 tabular-nums">
                   {settings.privacyMode ? '•••' : `+${summary.income.toLocaleString()}`}
               </span>
            </div>
            <div className="w-px bg-white/10 hidden md:block" />
            <div className="flex flex-col text-right md:text-left">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-end md:justify-start gap-1"><ArrowDownRight size={10} className="text-red-500"/> Расход</span>
               <span className="text-lg font-black text-white tabular-nums">
                   {settings.privacyMode ? '•••' : summary.expense.toLocaleString()}
               </span>
            </div>
         </div>

         <div className="relative z-10 w-full md:w-auto pt-4 md:pt-0 border-t border-white/10 md:border-none flex justify-between md:block items-center">
             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">Чистый итог <Wallet size={10} /></span>
             <span className={`text-2xl font-black tabular-nums ${summary.total >= 0 ? 'text-white' : 'text-red-400'}`}>
                {settings.privacyMode ? '••••••' : `${summary.total > 0 ? '+' : ''}${summary.total.toLocaleString()} ${settings.currency}`}
             </span>
         </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
