import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, FamilyMember, Category } from '../types';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey, getTransferDetails } from '../utils/categorizer';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface BudgetMobileProps {
  transactions: Transaction[];
  categories: Category[];
  members: FamilyMember[];
  onEdit: (tx: Transaction) => void;
  privacyMode: boolean;
  onCategoryChange?: (txId: string, newCategoryId: string) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

/**
 * BudgetMobile: Mobile list view for transactions grouped by day.
 * Implements the Terra design system matching the user screenshot.
 */
const BudgetMobile: React.FC<BudgetMobileProps> = ({ 
  transactions, categories, members, onEdit, privacyMode, onCategoryChange 
}) => {
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(15);

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

      const dayIncome = Math.round(dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0));
      const dayExpense = Math.round(dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0));
      return {
        date,
        transactions: dayTxs,
        dayIncome,
        dayExpense,
        net: Math.round(dayIncome - dayExpense)
      };
    });
  }, [transactions]);

  const toggleDayCollapse = (dateKey: string) => {
      setCollapsedDays(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const visibleGroups = useMemo(() => {
    return groupedTransactions.slice(0, visibleCount);
  }, [groupedTransactions, visibleCount]);

  return (
    <div className="space-y-4">
      {visibleGroups.map((group) => {
          const isCollapsed = collapsedDays[group.date];
          const isPositiveDay = group.net > 0;

          return (
              <motion.div variants={itemVariants} key={group.date} className="space-y-1.5">
                  <div 
                      onClick={() => toggleDayCollapse(group.date)} 
                      className="flex items-center justify-between px-3 py-2 cursor-pointer bg-white/80 dark:bg-[#1C1C1E]/80 hover:bg-gray-100 dark:hover:bg-[#2C2C2E] rounded-xl transition-colors border border-surface-border dark:border-white/5 shadow-xs"
                  >
                      <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          {new Date(group.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
                      </span>
                      <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-headline font-bold px-2.5 py-0.5 rounded-lg ${
                              isPositiveDay 
                                  ? 'text-[#4A7C59] bg-[#EAF2EC] dark:bg-[#4A7C59]/15 dark:text-green-400' 
                                  : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5'
                          }`}>
                              {privacyMode 
                                  ? '•••' 
                                  : `${isPositiveDay ? '+' : ''}${Math.round(group.net).toLocaleString('ru-RU')}`
                              }
                          </span>
                          {isCollapsed ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronUp size={14} className="text-gray-400"/>}
                      </div>
                  </div>

                  <AnimatePresence>
                      {!isCollapsed && (
                          <motion.div 
                              initial={{ height: 0, opacity: 0 }} 
                              animate={{ height: 'auto', opacity: 1 }} 
                              exit={{ height: 0, opacity: 0 }}
                              className="flex flex-col gap-2 pt-0.5"
                          >
                              {group.transactions.map(tx => {
                                  const category = categories.find(c => c.id === tx.category);
                                  const member = members.find(m => m.id === tx.memberId);
                                  const displayTitle = tx.note || category?.label || 'Операция';
                                  const brandKey = getMerchantBrandKey(displayTitle);
                                  const transferDetails = getTransferDetails(tx.note, tx.rawNote, tx.category);

                                  return (
                                      <motion.div 
                                          key={tx.id}
                                          layout
                                          onClick={() => onEdit(tx)}
                                          className="group flex items-center justify-between p-3.5 bg-white dark:bg-[#252528] hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-2xl transition-all shadow-sm border border-surface-border dark:border-white/5 cursor-pointer active:scale-[0.99]"
                                      >
                                          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
                                              <div className="shrink-0">
                                                  <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="sm" />
                                              </div>
                                              
                                              <div className="flex flex-col min-w-0">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span className="font-bold text-sm text-graphite dark:text-white truncate">
                                                          {displayTitle}
                                                      </span>
                                                      {transferDetails.isTransfer && (
                                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                                                              transferDetails.badgeType === 'self'
                                                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                          }`}>
                                                              {transferDetails.badgeLabel}
                                                          </span>
                                                      )}
                                                  </div>
                                                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-graphite-muted dark:text-gray-400 flex-wrap">
                                                      {onCategoryChange ? (
                                                          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                                                              <select
                                                                  value={tx.category}
                                                                  onChange={(e) => onCategoryChange(tx.id, e.target.value)}
                                                                  className="bg-[#F5F1EA] dark:bg-[#353538] hover:bg-[#EBE6DC] dark:hover:bg-[#404044] text-graphite dark:text-white px-2 py-0.5 rounded-lg text-xs font-bold border border-surface-border/60 dark:border-white/10 outline-none cursor-pointer transition-colors shadow-xs"
                                                              >
                                                                  {categories.map(c => (
                                                                      <option key={c.id} value={c.id} className="bg-white dark:bg-[#1C1C1E] text-graphite dark:text-white">
                                                                          {c.label}
                                                                      </option>
                                                                  ))}
                                                              </select>
                                                          </div>
                                                      ) : (
                                                          category?.label && <span>{category.label}</span>
                                                      )}
                                                      {category?.label && member && <span className="opacity-40">•</span>}
                                                      {member && (
                                                          <div className="flex items-center gap-1">
                                                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: member.color }}/>
                                                              <span className="truncate max-w-[80px]">{member.name}</span>
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          <div className="text-right whitespace-nowrap pl-2 shrink-0">
                                            <span className={`text-base font-headline font-bold tabular-nums ${
                                                tx.type === 'income' 
                                                    ? 'text-[#4A7C59] dark:text-green-400' 
                                                    : 'text-graphite dark:text-white'
                                            }`}>
                                              {privacyMode ? '•••' : `${tx.type === 'income' ? '+' : '-'}${Math.round(tx.amount).toLocaleString('ru-RU')}`}
                                            </span>
                                          </div>
                                      </motion.div>
                                  );
                              })}
                          </motion.div>
                      )}
                  </AnimatePresence>
              </motion.div>
          );
      })}

      {groupedTransactions.length > visibleCount && (
        <button 
          type="button"
          onClick={() => {
            setVisibleCount(prev => prev + 15);
            triggerHaptic('light');
          }}
          className="w-full py-3.5 px-4 text-xs font-bold text-primary dark:text-green-400 bg-white dark:bg-[#1C1C1E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E] border border-surface-border dark:border-white/10 rounded-2xl shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          <Layers size={15} />
          <span>Загрузить ещё (показано {visibleCount} из {groupedTransactions.length} дней)</span>
        </button>
      )}
    </div>
  );
};

export default BudgetMobile;
