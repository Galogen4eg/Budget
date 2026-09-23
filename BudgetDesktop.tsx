import React, { useMemo } from 'react';
import { Transaction, FamilyMember, Category } from '../types';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey } from '../utils/categorizer';

interface BudgetDesktopProps {
  transactions: Transaction[];
  categories: Category[];
  members: FamilyMember[];
  onEdit: (tx: Transaction) => void;
  privacyMode: boolean;
  isModal?: boolean;
  onCategoryChange?: (txId: string, newCategoryId: string) => void;
}

/**
 * BudgetDesktop: Desktop list view for transactions grouped by day.
 * Implements the Terra design system matching the user screenshot.
 */
const BudgetDesktop: React.FC<BudgetDesktopProps> = ({ 
  transactions, categories, members, onEdit, privacyMode, isModal, onCategoryChange 
}) => {
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(tx => {
      const dateKey = new Date(tx.date).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    
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

  return (
    <div className="space-y-5 pb-4">
      {groupedTransactions.length === 0 ? (
         <div className="text-center py-20 text-gray-400 font-bold text-sm uppercase tracking-widest">
             Операций не найдено
         </div>
      ) : (
         groupedTransactions.map((group) => {
             const isPositiveDay = group.net > 0;
             return (
                 <div key={group.date} className="space-y-2.5">
                     {/* Day Header matching screenshot */}
                     <div className="flex items-center justify-between px-1 py-1.5 sticky top-0 z-40 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md rounded-xl">
                         <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                             {new Date(group.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
                         </span>
                         <span className={`text-[11px] font-headline font-bold px-2.5 py-0.5 rounded-lg ${
                             isPositiveDay 
                                 ? 'text-[#4A7C59] bg-[#EAF2EC] dark:bg-[#4A7C59]/15 dark:text-green-400' 
                                 : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5'
                         }`}>
                             {privacyMode ? '•••' : `${isPositiveDay ? '+' : ''}${group.net.toLocaleString('ru-RU')}`}
                         </span>
                     </div>

                     {/* Transactions Grid/List */}
                     <div className={`${isModal ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' : 'grid grid-cols-1 gap-2.5'} relative z-0`}>
                         {group.transactions.map(tx => {
                             const category = categories.find(c => c.id === tx.category);
                             const member = members.find(m => m.id === tx.memberId);
                             const displayTitle = tx.note || category?.label || 'Операция';
                             const brandKey = getMerchantBrandKey(displayTitle);

                             return (
                                 <div 
                                     key={tx.id}
                                     onClick={() => onEdit(tx)}
                                     className="group flex items-center justify-between p-3.5 rounded-2xl border border-surface-border dark:border-white/5 transition-all cursor-pointer hover:border-gray-300 dark:hover:border-white/15 bg-white dark:bg-[#252528] shadow-sm hover:shadow active:scale-[0.99]"
                                 >
                                     <div className="flex items-center gap-3.5 overflow-hidden flex-1">
                                         <div className="shrink-0">
                                             <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="md" />
                                         </div>
                                         <div className="flex flex-col min-w-0">
                                             <div className="flex items-center gap-2">
                                                 <span className="font-bold text-sm md:text-base text-graphite dark:text-white truncate">
                                                     {displayTitle}
                                                 </span>
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
                                                     <div className="flex items-center gap-1.5">
                                                         <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: member.color }}/>
                                                         <span>{member.name}</span>
                                                     </div>
                                                 )}
                                                 {tx.rawNote && tx.rawNote !== displayTitle && (
                                                     <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                                                         ({tx.rawNote})
                                                     </span>
                                                 )}
                                             </div>
                                         </div>
                                     </div>

                                     <div className="flex items-center pl-3 shrink-0">
                                         <span className={`text-base md:text-lg font-headline font-bold tabular-nums ${
                                             tx.type === 'income' 
                                                 ? 'text-[#4A7C59] dark:text-green-400' 
                                                 : 'text-graphite dark:text-white'
                                         }`}>
                                             {privacyMode ? '•••' : `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('ru-RU')}`}
                                         </span>
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
  );
};

export default BudgetDesktop;
