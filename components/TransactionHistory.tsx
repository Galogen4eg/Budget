
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';
import { Sparkles, Check, ArrowDownRight, ArrowUpRight, Wallet, ChevronDown, ChevronUp, Clock, AlertTriangle, Calendar } from 'lucide-react';
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
  
  // Removed isExpanded state as we now show all items by default to avoid confusion

  // 1. Calculate General Summary
  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, total: income - expense };
  }, [transactions]);

  // 2. Identify Uncategorized Items
  const uncategorizedTransactions = useMemo(() => {
    return transactions.filter(t => t.category === 'other');
  }, [transactions]);

  // 3. Group Transactions by Date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(tx => {
      const dateKey = new Date(tx.date).toDateString(); // Group by date string
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    
    // Sort dates descending
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
        count: dayTxs.length
      };
    });
  }, [transactions]);

  const handleStartLearning = (tx: Transaction) => {
    setLearningTx(tx);
    setLearningName(tx.note || '');
    setLearningCat(tx.category === 'other' ? 'food' : tx.category);
  };

  const handleFinishLearning = () => {
    if (!learningTx || !learningName.trim()) return;

    // Use raw note for the keyword, but try to strip unique identifiers if possible to make the rule generic
    // However, for precise matching, sticking to the raw start is usually safer, 
    // but here we trust the user wants to map "Uber 123" -> "Taxi".
    const keyword = learningTx.rawNote || learningTx.note;
    
    const newRule: LearnedRule = {
      id: Date.now().toString(),
      keyword: keyword,
      cleanName: learningName.trim(),
      categoryId: learningCat
    };

    onLearnRule(newRule);
    
    // Update all matching transactions currently in view
    setTransactions(prev => prev.map(t => {
        const raw = t.rawNote || t.note;
        // Simple check: if the transaction note contains the keyword (case-insensitive)
        if (raw.toLowerCase().includes(keyword.toLowerCase()) || t.id === learningTx.id) {
            return { ...t, category: learningCat, note: learningName.trim() };
        }
        return t;
    }));
    
    setLearningTx(null);
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-sm w-full">
        <p className="text-gray-400 font-bold text-center leading-relaxed text-sm uppercase tracking-widest">
          В этот {filterMode === 'day' ? 'день' : 'период'}<br/>операций не было
        </p>
      </div>
    );
  }

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
            <BrandIcon 
                name={displayTitle} 
                brandKey={brandKey} 
                category={category} 
                size="md" 
            />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <div className="flex flex-col min-w-0 mr-2">
                <h4 className="font-bold text-[#1C1C1E] text-base truncate leading-tight">
                  {displayTitle}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-md">
                       <Clock size={10}/> {timeString}
                    </span>
                    {isUnrecognized && (
                        <span className="text-[9px] font-black text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-md uppercase tracking-tight">
                            Нужна категория
                        </span>
                    )}
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
                <span className="text-[10px] font-bold text-gray-400">
                  {member?.name}
                </span>
                <span className="text-gray-300 text-[8px]">•</span>
                <span className="text-[10px] font-bold text-gray-400">
                  {category?.label}
                </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Timeline */}
      <div className="space-y-8">
        {groupedTransactions.map((group, index) => (
            <div key={group.date} className="space-y-3">
                {/* Date Separator & Daily Summary */}
                <div className="flex items-end justify-between px-3 sticky top-0 bg-[#EBEFF5]/95 backdrop-blur-sm py-3 z-10 border-b border-gray-200/50">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black text-[#1C1C1E] uppercase tracking-wide">
                                {new Date(group.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
                            </span>
                            {(new Date(group.date).toDateString() === new Date().toDateString()) && (
                                <span className="bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">Сегодня</span>
                            )}
                        </div>
                        <span className="text-xs font-bold text-gray-400">
                            {group.count} {group.count === 1 ? 'операция' : (group.count > 1 && group.count < 5) ? 'операции' : 'операций'}
                        </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                        {group.dayIncome > 0 && <span className="text-xs font-black text-green-500">+{group.dayIncome.toLocaleString()}</span>}
                        {group.dayExpense > 0 && <span className="text-base font-black text-[#1C1C1E] tabular-nums">-{group.dayExpense.toLocaleString()}</span>}
                    </div>
                </div>

                {/* Transactions Grid for this day */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-1">
                    {group.transactions.map(tx => renderTransactionCard(tx))}
                </div>
            </div>
        ))}
      </div>

      {/* Uncategorized Registry (Action Area) */}
      {uncategorizedTransactions.length > 0 && (
          <div className="bg-yellow-50/50 p-6 rounded-[2.5rem] border border-yellow-100 mt-4">
              <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center">
                      <AlertTriangle size={20} />
                  </div>
                  <div>
                      <h3 className="font-black text-sm text-[#1C1C1E] uppercase tracking-wide">Требует внимания</h3>
                      <p className="text-[10px] font-bold text-gray-400">Найдено {uncategorizedTransactions.length} операций без категории</p>
                  </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {uncategorizedTransactions.map(tx => (
                      <div key={'uncat-'+tx.id} className="bg-white p-3 rounded-2xl border border-yellow-100 flex items-center justify-between shadow-sm">
                          <div className="flex flex-col">
                              <span className="font-bold text-xs text-[#1C1C1E]">{tx.note || 'Неизвестно'}</span>
                              <span className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleDateString('ru-RU', {day:'numeric', month:'short'})}</span>
                          </div>
                          <div className="flex items-center gap-3">
                              <span className="font-black text-xs">-{tx.amount}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleStartLearning(tx); }}
                                className="bg-yellow-500 text-white p-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shadow-lg shadow-yellow-500/20"
                              >
                                  <Sparkles size={12}/> Обучить
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
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
             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">Итого за {filterMode === 'day' ? 'день' : 'период'} <Wallet size={10} /></span>
             <span className={`text-2xl font-black tabular-nums ${summary.total >= 0 ? 'text-white' : 'text-red-400'}`}>
                {settings.privacyMode ? '••••••' : `${summary.total > 0 ? '+' : ''}${summary.total.toLocaleString()} ${settings.currency}`}
             </span>
         </div>
      </div>

      <AnimatePresence>
        {learningTx && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLearningTx(null)} className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-3xl flex items-center justify-center mx-auto mb-2">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-xl font-black text-[#1C1C1E]">Обучение мерчанта</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    "{learningTx.rawNote || learningTx.note}"
                </p>
                <p className="text-[9px] text-gray-400 leading-tight px-4">
                    Мы запомним это название, чтобы автоматически определять категорию в будущем.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Как называть?</label>
                  <input 
                    type="text" 
                    value={learningName}
                    onChange={(e) => setLearningName(e.target.value)}
                    placeholder="Напр. Любимая кофейня"
                    className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm outline-none border border-transparent focus:border-yellow-200 transition-all text-[#1C1C1E]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Категория</label>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto no-scrollbar">
                    {categories.filter(c => c.id !== 'other').map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => setLearningCat(cat.id)}
                        className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all border ${learningCat === cat.id ? 'bg-blue-50 border-blue-200 scale-105' : 'bg-gray-50 border-transparent text-gray-400'}`}
                      >
                        <span style={{ color: learningCat === cat.id ? cat.color : undefined }}>{getIconById(cat.icon, 18)}</span>
                        <span className="text-[8px] font-black uppercase tracking-tighter text-center leading-tight">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setLearningTx(null)} className="flex-1 py-4 bg-gray-100 text-gray-400 font-black rounded-2xl uppercase text-[10px] tracking-widest">Отмена</button>
                <button onClick={handleFinishLearning} className="flex-1 py-4 bg-yellow-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2">
                  <Check size={16} strokeWidth={3} /> Запомнить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionHistory;
