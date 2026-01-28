
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, DollarSign, Calendar, Edit2, Plus, Circle, CheckCircle2, Users } from 'lucide-react';
import { MandatoryExpense, Transaction, AppSettings, FamilyMember } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { saveSettings } from '../utils/db';
import { MemberMarker } from '../constants';

interface MandatoryExpensesListProps {
  expenses: MandatoryExpense[];
  transactions: Transaction[];
  settings: AppSettings;
  currentMonth: Date;
  members: FamilyMember[];
  onEdit?: (expense: MandatoryExpense) => void;
  onAdd?: () => void;
}

const MandatoryExpensesList: React.FC<MandatoryExpensesListProps> = ({ expenses, transactions, settings, currentMonth, members, onEdit, onAdd }) => {
  const { setSettings } = useData();
  const { familyId } = useAuth();

  const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

  // Toggle Manual Paid Status
  const toggleManualPaid = async (e: React.MouseEvent, expenseId: string) => {
      e.stopPropagation(); // Prevent opening edit modal
      
      const currentManuals = settings.manualPaidExpenses || {};
      const monthIds = currentManuals[currentMonthKey] || [];
      const isManuallyPaid = monthIds.includes(expenseId);

      let newMonthIds;
      if (isManuallyPaid) {
          newMonthIds = monthIds.filter(id => id !== expenseId);
      } else {
          newMonthIds = [...monthIds, expenseId];
      }

      const newSettings = { 
          ...settings, 
          manualPaidExpenses: {
              ...currentManuals,
              [currentMonthKey]: newMonthIds
          }
      };

      setSettings(newSettings);
      if (familyId) await saveSettings(familyId, newSettings);
  };

  // Calculate stats strictly based on current month
  const { processedExpenses, totalPaid, totalBudget } = useMemo(() => {
      // 1. Filter transactions strictly for the current month view
      const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth.getMonth() && 
               d.getFullYear() === currentMonth.getFullYear() &&
               t.type === 'expense';
      });

      const processed = (expenses || []).map(expense => {
        const keywords = expense.keywords || [];
        
        // Find matching transactions based on keywords OR explicit link
        const matches = monthTransactions.filter(tx => {
           if (tx.linkedExpenseId === expense.id) return true; // Explicit link

           if (keywords.length === 0) return false;
           const noteLower = (tx.note || '').toLowerCase();
           const rawLower = (tx.rawNote || '').toLowerCase();
           return keywords.some(k => noteLower.includes(k.toLowerCase()) || rawLower.includes(k.toLowerCase()));
        });

        const paidAmount = matches.reduce((sum, tx) => sum + tx.amount, 0);
        const isAutoPaid = paidAmount >= (expense.amount * 0.95);
        const isManuallyPaid = (settings.manualPaidExpenses?.[currentMonthKey] || []).includes(expense.id);
        const isPaid = isAutoPaid || isManuallyPaid;
        
        const progress = Math.min(100, (paidAmount / expense.amount) * 100);
        
        const today = new Date();
        const isCurrentMonth = today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
        const isOverdue = !isPaid && isCurrentMonth && today.getDate() > (expense.day || 1);

        return { ...expense, paidAmount, isPaid, isAutoPaid, isManuallyPaid, progress, isOverdue };
      }).sort((a, b) => {
          // 1. Sort by Paid Status (Unpaid first)
          if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
          // 2. Sort by Day
          return (a.day || 0) - (b.day || 0);
      });

      const budget = processed.reduce((sum, e) => sum + e.amount, 0);
      
      // Calculate visual total paid
      const paid = processed.reduce((sum, e) => {
          // If manually marked paid, count the full budget amount (assume fulfilled)
          if (e.isManuallyPaid) return sum + e.amount;
          
          // If auto-paid (or partially paid), count actuals but CAP at the budget amount.
          // This prevents one overpaid item (e.g. paying 20k instead of 10k) from 
          // masking the fact that another 10k bill hasn't been paid yet in the total progress bar.
          return sum + Math.min(e.paidAmount, e.amount);
      }, 0);

      return { processedExpenses: processed, totalPaid: paid, totalBudget: budget };
  }, [expenses, transactions, currentMonth, settings.manualPaidExpenses, currentMonthKey]);

  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none w-full flex flex-col h-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl shrink-0">
                <DollarSign size={18} />
            </div>
            <div>
                <h3 className="text-sm font-black text-[#1C1C1E] dark:text-white uppercase tracking-wide leading-none">Обязательные</h3>
                <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-bold block mt-0.5">
                    {Math.round(totalPaid).toLocaleString()} / {totalBudget.toLocaleString()}
                </span>
            </div>
        </div>
        {onAdd && (
            <button 
                onClick={onAdd}
                className="w-10 h-10 bg-gray-50 dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors shadow-sm"
            >
                <Plus size={20} />
            </button>
        )}
      </div>

      <div className="space-y-3">
        {processedExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Список пуст</span>
            </div>
        ) : (
            processedExpenses.map(expense => {
                // Safeguard members access
                const assignedMember = (members || []).find(m => m.id === expense.memberId);
                
                return (
                    <div key={expense.id} onClick={() => onEdit && onEdit(expense)} className={`relative flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${expense.isPaid ? 'bg-gray-50/50 dark:bg-[#2C2C2E]/30 border-transparent opacity-70 hover:opacity-100' : 'bg-white dark:bg-[#2C2C2E] border-gray-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-800'}`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Checkbox Button */}
                            <button
                                onClick={(e) => toggleManualPaid(e, expense.id)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all active:scale-95 ${
                                    expense.isPaid 
                                        ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-500/20' 
                                        : expense.isOverdue
                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-500'
                                            : 'bg-white dark:bg-[#3A3A3C] border-gray-200 dark:border-white/10 text-gray-300 hover:border-blue-400 hover:text-blue-400'
                                }`}
                                title={expense.isPaid ? "Отметить как неоплаченное" : "Отметить оплаченным"}
                            >
                                {expense.isPaid ? <Check size={18} strokeWidth={3} /> : <span className="text-xs font-black">{expense.day}</span>}
                            </button>

                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-bold truncate ${expense.isPaid ? 'text-gray-400 line-through decoration-gray-300' : 'text-[#1C1C1E] dark:text-white'}`}>
                                        {expense.name}
                                    </span>
                                    {/* Show member avatar if assigned */}
                                    {assignedMember && !expense.isPaid && (
                                        <div className="scale-75 origin-left">
                                            <MemberMarker member={assignedMember} size="sm" />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-1.5">
                                    {expense.isOverdue && !expense.isPaid && (
                                        <span className="text-[9px] font-black text-red-500 uppercase tracking-wider flex items-center gap-1">
                                            <AlertCircle size={10} /> Просрочено
                                        </span>
                                    )}
                                    {!expense.isOverdue && !expense.isPaid && (
                                        <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500">
                                            до {expense.day}-го
                                        </span>
                                    )}
                                    {expense.isPaid && (
                                        <span className="text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 rounded">
                                            {expense.isManuallyPaid ? 'Вручную' : 'Авто'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-right flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className={`text-xs md:text-sm font-black tabular-nums ${expense.isPaid ? 'text-gray-400' : 'text-[#1C1C1E] dark:text-white'}`}>
                                    {expense.amount.toLocaleString()}
                                </span>
                                
                                {/* Only show progress bar if partially paid via transactions but not fully marked as done */}
                                {!expense.isPaid && expense.progress > 0 && (
                                    <div className="w-12 h-1 bg-gray-100 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${expense.progress}%` }} />
                                    </div>
                                )}
                                
                                {!expense.isPaid && expense.paidAmount > 0 && (
                                    <span className="text-[8px] font-bold text-blue-500">
                                        оплачено: {Math.round(expense.paidAmount)}
                                    </span>
                                )}
                            </div>
                            {onEdit && (
                                <div className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                    <Edit2 size={14} />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default MandatoryExpensesList;
