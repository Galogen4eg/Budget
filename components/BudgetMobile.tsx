
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, FamilyMember, Category } from '../types';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey } from '../utils/categorizer';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface BudgetMobileProps {
  transactions: Transaction[];
  categories: Category[];
  members: FamilyMember[];
  onEdit: (tx: Transaction) => void;
  onStartLearning: (tx: Transaction) => void;
  privacyMode: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

const BudgetMobile: React.FC<BudgetMobileProps> = ({ 
  transactions, categories, members, onEdit, onStartLearning, privacyMode 
}) => {
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(tx => {
      const dateKey = new Date(tx.date).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    
    // Sort dates: Newest first
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return sortedDates.map(date => {
      const dayTxs = groups[date];
      dayTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const dayIncome = dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const dayExpense = dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return {
        date,
        transactions: dayTxs,
        dayIncome,
        dayExpense,
        net: dayIncome - dayExpense
      };
    });
  }, [transactions]);

  const toggleDayCollapse = (dateKey: string) => {
      setCollapsedDays(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  return (
    <div className="space-y-4">
      {groupedTransactions.map((group) => {
          const isCollapsed = collapsedDays[group.date];
          const isPositiveDay = group.net > 0;

          return (
              <motion.div variants={itemVariants} key={group.date} className="space-y-1">
                  <div onClick={() => toggleDayCollapse(group.date)} className="flex items-center justify-between px-3 py-2 cursor-pointer bg-gray-100/70 dark:bg-[#1C1C1E]/70 hover:bg-gray-200/70 dark:hover:bg-[#2C2C2E] rounded-xl transition-colors backdrop-blur-sm">
                      <span className="text-xs font-black text-[#1C1C1E] dark:text-white uppercase tracking-wider">
                          {new Date(group.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
                      </span>
                      <div className="flex items-center gap-2">
                          <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-lg ${
                              isPositiveDay 
                                  ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' 
                                  : 'text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/10'
                          }`}>
                              {privacyMode 
                                  ? '•••' 
                                  : `${isPositiveDay ? '+' : ''}${group.net.toLocaleString()}`
                              }
                          </span>
                          {isCollapsed ? <ChevronDown size={12} className="text-gray-400"/> : <ChevronUp size={12} className="text-gray-400"/>}
                      </div>
                  </div>

                  <AnimatePresence>
                      {!isCollapsed && (
                          <motion.div 
                              initial={{ height: 0, opacity: 0 }} 
                              animate={{ height: 'auto', opacity: 1 }} 
                              exit={{ height: 0, opacity: 0 }}
                              className="flex flex-col gap-2 pt-1"
                          >
                              {group.transactions.map(tx => {
                                  const category = categories.find(c => c.id === tx.category);
                                  const member = members.find(m => m.id === tx.memberId);
                                  const displayTitle = tx.note || category?.label || 'Операция';
                                  const brandKey = getMerchantBrandKey(displayTitle);
                                  const isUnrecognized = tx.category === 'other';

                                  return (
                                      <motion.div 
                                          key={tx.id}
                                          layout
                                          onClick={() => onEdit(tx)}
                                          className={`group flex items-center gap-3 p-3 bg-white dark:bg-[#1C1C1E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-2xl transition-all shadow-sm border border-transparent dark:border-white/5 cursor-pointer active:scale-[0.99] ${isUnrecognized ? 'border-yellow-100/50 bg-yellow-50/10 dark:bg-yellow-900/10 dark:border-yellow-900/20' : ''}`}
                                      >
                                          <div className="flex-shrink-0">
                                              <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="sm" />
                                          </div>
                                          
                                          <div className="flex-1 min-w-0 flex items-center justify-between">
                                              <div className="flex flex-col min-w-0 pr-2">
                                                  <div className="flex items-center gap-2">
                                                      <span className="font-bold text-sm text-[#1C1C1E] dark:text-white truncate">{displayTitle}</span>
                                                      {isUnrecognized && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0"/>}
                                                  </div>
                                                  <div className="flex items-center gap-1.5 mt-0.5">
                                                      {member && (
                                                          <div className="flex items-center gap-1">
                                                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.color }}/>
                                                              <span className="text-[10px] font-medium text-gray-400 truncate max-w-[60px]">{member.name}</span>
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                              
                                              <div className="text-right whitespace-nowrap">
                                                <span className={`text-sm md:text-lg font-black tabular-nums ${tx.type === 'income' ? 'text-green-500' : 'text-[#1C1C1E] dark:text-white'}`}>
                                                  {privacyMode ? '•••' : `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}`}
                                                </span>
                                              </div>
                                          </div>
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); onStartLearning(tx); }}
                                              className={`p-2 rounded-xl transition-all ${
                                                  isUnrecognized 
                                                      ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400 opacity-100 shadow-sm' 
                                                      : 'bg-gray-50 dark:bg-[#3A3A3C] text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 opacity-0 group-hover:opacity-100'
                                              }`}
                                              title="Обучить категорию"
                                          >
                                              <Sparkles size={16} fill={isUnrecognized ? "currentColor" : "none"} />
                                          </button>
                                      </motion.div>
                                  );
                              })}
                          </motion.div>
                      )}
                  </AnimatePresence>
              </motion.div>
          );
      })}
    </div>
  );
};

export default BudgetMobile;
