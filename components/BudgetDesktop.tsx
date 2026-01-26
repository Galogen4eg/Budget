
import React, { useMemo } from 'react';
import { Transaction, FamilyMember, Category } from '../types';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey } from '../utils/categorizer';
import { Sparkles } from 'lucide-react';

interface BudgetDesktopProps {
  transactions: Transaction[];
  categories: Category[];
  members: FamilyMember[];
  onEdit: (tx: Transaction) => void;
  onStartLearning: (tx: Transaction) => void;
  privacyMode: boolean;
}

const BudgetDesktop: React.FC<BudgetDesktopProps> = ({ 
  transactions, categories, members, onEdit, onStartLearning, privacyMode 
}) => {
  // Grouping Logic
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
    <div className="space-y-6 h-full max-h-[600px] overflow-y-auto custom-scrollbar pr-2 pb-4">
      {groupedTransactions.length === 0 ? (
         <div className="text-center py-20 text-gray-400 font-bold text-sm uppercase tracking-widest">
             Операций не найдено
         </div>
      ) : (
         groupedTransactions.map((group) => {
             const isPositiveDay = group.net > 0;
             return (
                 <div key={group.date} className="space-y-3">
                     {/* Date Header */}
                     <div className="flex items-center justify-between px-2 py-2 sticky top-0 z-10 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-sm">
                         <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                             {new Date(group.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
                         </span>
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isPositiveDay ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 bg-gray-100 dark:bg-white/5'}`}>
                             {privacyMode ? '•••' : `${isPositiveDay ? '+' : ''}${group.net.toLocaleString()}`}
                         </span>
                     </div>

                     {/* Transactions Grid/List */}
                     <div className="grid grid-cols-1 gap-2">
                         {group.transactions.map(tx => {
                             const category = categories.find(c => c.id === tx.category);
                             const member = members.find(m => m.id === tx.memberId);
                             const displayTitle = tx.note || category?.label || 'Операция';
                             const brandKey = getMerchantBrandKey(displayTitle);
                             const isUnrecognized = tx.category === 'other';

                             return (
                                 <div 
                                     key={tx.id}
                                     onClick={() => onEdit(tx)}
                                     className={`group flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer ${isUnrecognized ? 'bg-yellow-50/50 border-yellow-100/50' : ''}`}
                                 >
                                     <div className="flex items-center gap-4 overflow-hidden flex-1">
                                         <div className="shrink-0">
                                             <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="md" />
                                         </div>
                                         <div className="flex flex-col min-w-0">
                                             <div className="flex items-center gap-2">
                                                 <span className="font-bold text-sm text-[#1C1C1E] dark:text-white truncate">{displayTitle}</span>
                                                 {isUnrecognized && <div className="w-2 h-2 rounded-full bg-yellow-400" title="Не распознано" />}
                                             </div>
                                             <div className="flex items-center gap-2 mt-0.5">
                                                 <span className="text-[10px] font-bold text-gray-400">{category?.label}</span>
                                                 {member && (
                                                     <div className="flex items-center gap-1 bg-white dark:bg-black/20 px-1.5 py-0.5 rounded text-[9px] font-bold text-gray-500">
                                                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.color }}/>
                                                         {member.name}
                                                     </div>
                                                 )}
                                                 {tx.rawNote && tx.rawNote !== displayTitle && (
                                                     <span className="text-[9px] text-gray-300 dark:text-gray-600 truncate max-w-[150px]">
                                                         ({tx.rawNote})
                                                     </span>
                                                 )}
                                             </div>
                                         </div>
                                     </div>

                                     <div className="flex items-center gap-6 pl-4">
                                         <span className={`text-lg font-black tabular-nums ${tx.type === 'income' ? 'text-green-500' : 'text-[#1C1C1E] dark:text-white'}`}>
                                             {privacyMode ? '•••' : `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}`}
                                         </span>
                                         
                                         {/* Actions on Hover */}
                                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button 
                                                 onClick={(e) => { e.stopPropagation(); onStartLearning(tx); }}
                                                 className={`p-2 rounded-xl transition-colors ${isUnrecognized ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-white dark:bg-[#3A3A3C] hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500'}`}
                                                 title="Обучить"
                                             >
                                                 <Sparkles size={16} fill={isUnrecognized ? "currentColor" : "none"} />
                                             </button>
                                         </div>
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
