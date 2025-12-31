
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';
import { Sparkles, Check, Clock, AlertTriangle, Search, X, CalendarDays, TrendingDown, TrendingUp, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
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
  const [learningStep, setLearningStep] = useState<'category' | 'rule'>('category'); // New state for 2-step process
  const [learningCat, setLearningCat] = useState('food');
  const [learningName, setLearningName] = useState('');
  const [learningKeyword, setLearningKeyword] = useState(''); // Separate keyword state
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const toggleDayCollapse = (dateKey: string) => {
      setCollapsedDays(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const uncategorizedTransactions = useMemo(() => {
      return transactions.filter(tx => tx.category === 'other');
  }, [transactions]);
  
  const searchedTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => tx.category !== 'other');

    if (typeFilter !== 'all') {
        filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    if (!searchQuery.trim()) return filtered;
    
    const query = searchQuery.toLowerCase();
    return filtered.filter(tx => {
        const category = categories.find(c => c.id === tx.category)?.label || '';
        return (tx.note || '').toLowerCase().includes(query) || 
               (tx.rawNote || '').toLowerCase().includes(query) ||
               category.toLowerCase().includes(query) ||
               tx.amount.toString().includes(query);
    });
  }, [transactions, searchQuery, categories, typeFilter]);

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
        net: dayIncome - dayExpense,
        count: dayTxs.length
      };
    });
  }, [searchedTransactions]);

  const visibleGroups = useMemo(() => {
    if (searchQuery.trim() || filterMode === 'day' || showAll) {
      return groupedTransactions;
    }
    return groupedTransactions.slice(0, 3);
  }, [groupedTransactions, searchQuery, filterMode, showAll]);

  const hiddenCount = groupedTransactions.length - visibleGroups.length;

  const handleStartLearning = (tx: Transaction) => {
    setLearningTx(tx);
    setLearningName(tx.note || '');
    // Pre-calculate keyword
    let keyword = (tx.rawNote || tx.note).trim();
    if (/\d{4,}$/.test(keyword)) {
        keyword = keyword.replace(/\s?\d+$/, '').trim();
    }
    setLearningKeyword(keyword);
    setLearningCat('food'); // Default reset
    setLearningStep('category'); // Start at step 1
  };

  const handleCategorySelect = (catId: string) => {
      setLearningCat(catId);
      setLearningStep('rule');
  };

  const handleFinishLearning = () => {
    if (!learningTx || !learningName.trim() || !learningKeyword.trim()) return;
    
    const newRule: LearnedRule = {
      id: Date.now().toString(),
      keyword: learningKeyword.trim(),
      cleanName: learningName.trim(),
      categoryId: learningCat
    };
    onLearnRule(newRule);
    setLearningTx(null);
  };

  const renderTransactionCard = (tx: Transaction, isWarning = false) => {
    const category = categories.find(c => c.id === tx.category);
    const member = members.find(m => m.id === tx.memberId);
    const displayTitle = tx.note || category?.label || 'Операция';
    const brandKey = getMerchantBrandKey(displayTitle);
    const timeString = new Date(tx.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const showTime = timeString !== '00:00';

    return (
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={tx.id} 
        onClick={() => onEditTransaction && onEditTransaction(tx)}
        className={`group flex items-center gap-4 p-4 rounded-[1.8rem] transition-all shadow-sm border border-transparent cursor-pointer ios-btn-active ${isWarning ? 'bg-white border-yellow-100' : 'bg-white hover:bg-gray-50 hover:border-blue-100'}`}
      >
        <div className="flex-shrink-0">
            <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="md" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <div className="flex flex-col min-w-0 mr-2">
                <h4 className="font-bold text-[#1C1C1E] text-base truncate leading-tight">{displayTitle}</h4>
                <div className="flex items-center gap-2 mt-1">
                    {showTime && (
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-md">
                           <Clock size={10}/> {timeString}
                        </span>
                    )}
                    {isWarning && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleStartLearning(tx); }}
                            className="text-[9px] font-black text-yellow-700 bg-yellow-100 px-2 py-1 rounded-lg uppercase tracking-tight flex items-center gap-1 hover:bg-yellow-200 transition-colors shadow-sm"
                        >
                            <Sparkles size={10}/> Обучить
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex-shrink-0 text-right">
              <span className={`text-base font-black tabular-nums block ${tx.type === 'income' ? 'text-green-500' : 'text-[#1C1C1E]'}`}>
                {settings.privacyMode ? '••••' : `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()} ${settings.currency}`}
              </span>
            </div>
          </div>
          
          {!isWarning && (
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: member?.color || '#CCC' }} />
                    <span className="text-[10px] font-bold text-gray-400">{member?.name}</span>
                    <span className="text-gray-300 text-[8px]">•</span>
                    <span className="text-[10px] font-bold text-gray-400">{category?.label}</span>
                </div>
              </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <div className="px-1 flex items-center gap-2">
        <div className="relative group flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500">
            <Search size={18} />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по истории..."
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

      {uncategorizedTransactions.length > 0 && (
          <div className="bg-yellow-50/60 p-4 rounded-[2.5rem] border border-yellow-200 space-y-3">
              <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center animate-pulse">
                      <AlertTriangle size={18} />
                  </div>
                  <div>
                      <h3 className="font-black text-sm text-[#1C1C1E] uppercase tracking-wide">Требует внимания</h3>
                      <p className="text-[10px] font-bold text-gray-400">Неразобранные операции ({uncategorizedTransactions.length})</p>
                  </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                  {uncategorizedTransactions.map(tx => renderTransactionCard(tx, true))}
              </div>
          </div>
      )}

      <div className="flex gap-2 px-1">
          <button 
            onClick={() => setTypeFilter('all')}
            className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${typeFilter === 'all' ? 'bg-[#1C1C1E] text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Все
          </button>
          <button 
            onClick={() => setTypeFilter('expense')}
            className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${typeFilter === 'expense' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            <TrendingDown size={14} strokeWidth={3} /> Списания
          </button>
          <button 
            onClick={() => setTypeFilter('income')}
            className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${typeFilter === 'income' ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            <TrendingUp size={14} strokeWidth={3} /> Пополнения
          </button>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-sm w-full">
          <p className="text-gray-400 font-bold text-center leading-relaxed text-sm uppercase tracking-widest">
            В этот {filterMode === 'day' ? 'день' : 'период'}<br/>операций не было
          </p>
        </div>
      ) : searchedTransactions.length === 0 && uncategorizedTransactions.length === 0 ? (
        <div className="text-center py-12">
            <p className="text-gray-400 font-bold text-sm">Ничего не найдено</p>
        </div>
      ) : (
        <>
          <div className="space-y-8">
            {visibleGroups.map((group) => {
                const isCollapsed = collapsedDays[group.date];
                
                return (
                    <div key={group.date} className="space-y-3">
                        <div onClick={() => toggleDayCollapse(group.date)} className="flex items-center justify-between px-4 sticky top-0 bg-[#EBEFF5]/95 backdrop-blur-sm py-3 z-10 border-b border-gray-200/50 cursor-pointer hover:bg-gray-100/50 transition-colors rounded-xl">
                            <div className="flex items-center gap-3">
                                {isCollapsed ? <ChevronDown size={16} className="text-gray-400"/> : <ChevronUp size={16} className="text-gray-400"/>}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-[#1C1C1E] uppercase tracking-wide">
                                            {new Date(group.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
                                        </span>
                                        {(new Date(group.date).toDateString() === new Date().toDateString()) && (
                                            <span className="bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">Сегодня</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400">{group.count} операций</span>
                                </div>
                            </div>
                            
                            <div className={`text-sm font-black tabular-nums ${group.net > 0 ? 'text-green-500' : 'text-[#1C1C1E]'}`}>
                                {group.net > 0 ? '+' : ''}{group.net.toLocaleString()} {settings.currency}
                            </div>
                        </div>

                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: 'auto', opacity: 1 }} 
                                    exit={{ height: 0, opacity: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-3 px-1"
                                >
                                    {group.transactions.map(tx => renderTransactionCard(tx))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
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
        </>
      )}

      {/* TRAINING MODAL */}
      <AnimatePresence>
        {learningTx && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLearningTx(null)} className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-0 shadow-2xl overflow-hidden">
              
              {/* Header */}
              <div className="bg-gray-50 p-6 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center gap-3">
                      {learningStep === 'rule' && (
                          <button onClick={() => setLearningStep('category')} className="p-2 -ml-2 hover:bg-gray-200 rounded-full transition-colors">
                              <ArrowLeft size={20} className="text-gray-500"/>
                          </button>
                      )}
                      <div>
                          <h3 className="text-lg font-black text-[#1C1C1E]">{learningStep === 'category' ? 'Выбор категории' : 'Создание правила'}</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[150px]">
                             {learningTx.rawNote || learningTx.note}
                          </p>
                      </div>
                  </div>
                  <button onClick={() => setLearningTx(null)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm"><X size={16}/></button>
              </div>

              {/* Step 1: Category Selection */}
              {learningStep === 'category' && (
                  <div className="p-6">
                      <p className="text-sm text-gray-500 font-medium mb-4 text-center">Выберите категорию для этой операции:</p>
                      <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto no-scrollbar">
                        {categories.filter(c => c.id !== 'other').map(cat => (
                          <button 
                            key={cat.id}
                            onClick={() => handleCategorySelect(cat.id)}
                            className="p-3 rounded-2xl flex flex-col items-center gap-2 transition-all border bg-white border-gray-100 hover:border-blue-200 hover:bg-blue-50 active:scale-95"
                          >
                            <div style={{ color: cat.color }}>{getIconById(cat.icon, 24)}</div>
                            <span className="text-[9px] font-black uppercase tracking-tighter text-center leading-tight text-[#1C1C1E]">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                  </div>
              )}

              {/* Step 2: Rule Definition */}
              {learningStep === 'rule' && (
                  <div className="p-8 space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Если описание содержит</label>
                        <input 
                            type="text" 
                            value={learningKeyword}
                            onChange={(e) => setLearningKeyword(e.target.value)}
                            className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm outline-none border border-transparent focus:border-yellow-200 transition-all text-[#1C1C1E]"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Переименовать в</label>
                        <input 
                            type="text" 
                            value={learningName}
                            onChange={(e) => setLearningName(e.target.value)}
                            placeholder="Напр. Продукты"
                            className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm outline-none border border-transparent focus:border-yellow-200 transition-all text-[#1C1C1E]"
                        />
                      </div>
                      
                      <div className="bg-yellow-50 p-4 rounded-2xl flex items-center gap-3">
                          <Sparkles size={20} className="text-yellow-600 shrink-0"/>
                          <p className="text-[10px] font-bold text-yellow-800 leading-tight">
                              Приложение запомнит это и пересчитает прошлые операции.
                          </p>
                      </div>

                      <button onClick={handleFinishLearning} className="w-full py-4 bg-yellow-500 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <Check size={18} strokeWidth={3} /> Запомнить и Обновить
                      </button>
                  </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionHistory;
