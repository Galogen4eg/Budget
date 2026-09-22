import React, { useMemo } from 'react';
import { Check, AlertCircle, DollarSign, Edit2, Plus } from 'lucide-react';
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

/**
 * MandatoryExpensesList: Recurring and scheduled expenses.
 * Styled in the warm Terra design system.
 */
const MandatoryExpensesList: React.FC<MandatoryExpensesListProps> = ({ 
  expenses, 
  transactions, 
  settings, 
  currentMonth, 
  members, 
  onEdit, 
  onAdd 
}) => {
  const { setSettings } = useData();
  const { familyId } = useAuth();

  const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

  // Toggle Manual Paid Status
  const toggleManualPaid = async (e: React.MouseEvent, expenseId: string) => {
      e.stopPropagation();
      
      const currentManuals = settings.manualPaidExpenses || {};
      const monthIds = currentManuals[currentMonthKey] || [];
      const isManuallyPaid = monthIds.includes(expenseId);

      let newMonthIds: string[];
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
      const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth.getMonth() && 
               d.getFullYear() === currentMonth.getFullYear() &&
               t.type === 'expense';
      });

      const processed = (expenses || []).map(expense => {
        const keywords = expense.keywords || [];
        
        const matches = monthTransactions.filter(tx => {
           if (tx.linkedExpenseId === expense.id) return true;

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
          if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
          return (a.day || 0) - (b.day || 0);
      });

      const budget = processed.reduce((sum, e) => sum + e.amount, 0);
      
      const paid = processed.reduce((sum, e) => {
          if (e.isManuallyPaid) return sum + e.amount;
          return sum + Math.min(e.paidAmount, e.amount);
      }, 0);

      return { processedExpenses: processed, totalPaid: paid, totalBudget: budget };
  }, [expenses, transactions, currentMonth, settings.manualPaidExpenses, currentMonthKey]);

  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-5 md:p-6 rounded-3xl border border-surface-border dark:border-white/10 shadow-sm w-full flex flex-col h-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FDF2F2] dark:bg-red-950/40 text-[#E05252] dark:text-red-400 flex items-center justify-center shrink-0">
                <DollarSign size={17} />
            </div>
            <div>
                <h3 className="text-sm font-headline font-bold text-graphite dark:text-white uppercase tracking-wide leading-none">
                    Обязательные
                </h3>
                <span className="text-[10px] md:text-xs font-mono font-bold text-gray-400 dark:text-gray-500 block mt-1">
                    {Math.round(totalPaid).toLocaleString('ru-RU')} / {totalBudget.toLocaleString('ru-RU')} ₽
                </span>
            </div>
        </div>
        {onAdd && (
            <button 
                onClick={onAdd}
                className="w-8 h-8 bg-[#FAF8F5] dark:bg-[#252528] text-graphite dark:text-white rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2C2C2E] border border-surface-border dark:border-white/5 transition-colors shadow-xs"
                title="Добавить обязательный платеж"
                aria-label="Добавить обязательный платеж"
            >
                <Plus size={16} />
            </button>
        )}
      </div>

      {/* Expense List */}
      <div className="space-y-2.5">
        {processedExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Список пуст</span>
            </div>
        ) : (
            processedExpenses.map(expense => {
                const assignedMember = members.find(m => m.id === expense.memberId);
                
                return (
                    <div 
                        key={expense.id} 
                        onClick={() => onEdit && onEdit(expense)} 
                        className={`relative flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${
                            expense.isPaid 
                                ? 'bg-[#FAF8F5]/60 dark:bg-[#252528]/40 border-transparent opacity-70 hover:opacity-100' 
                                : 'bg-white dark:bg-[#252528] border-surface-border dark:border-white/5 hover:border-gray-300 dark:hover:border-white/15 shadow-xs'
                        }`}
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Checkbox / Day Button */}
                            <button
                                onClick={(e) => toggleManualPaid(e, expense.id)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all active:scale-95 ${
                                    expense.isPaid 
                                        ? 'bg-[#4A7C59] border-[#4A7C59] text-white shadow-xs' 
                                        : expense.isOverdue
                                            ? 'bg-[#FDF2F2] dark:bg-red-950/40 border-[#FADCDD] dark:border-red-900/40 text-[#E05252]'
                                            : 'bg-[#FAF8F5] dark:bg-[#2C2C2E] border-surface-border dark:border-white/10 text-graphite-muted hover:border-[#4A7C59] hover:text-[#4A7C59]'
                                }`}
                                title={expense.isPaid ? "Отметить как неоплаченное" : "Отметить оплаченным"}
                            >
                                {expense.isPaid ? <Check size={16} strokeWidth={2.5} /> : <span className="text-xs font-headline font-bold">{expense.day}</span>}
                            </button>

                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-bold truncate ${expense.isPaid ? 'text-gray-400 line-through' : 'text-graphite dark:text-white'}`}>
                                        {expense.name}
                                    </span>
                                    {assignedMember && !expense.isPaid && (
                                        <div className="scale-75 origin-left">
                                            <MemberMarker member={assignedMember} size="sm" />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {expense.isOverdue && !expense.isPaid && (
                                        <span className="text-[9px] font-mono font-bold text-[#E05252] uppercase tracking-wider flex items-center gap-1">
                                            <AlertCircle size={10} /> Просрочено
                                        </span>
                                    )}
                                    {!expense.isOverdue && !expense.isPaid && (
                                        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                                            до {expense.day}-го числа
                                        </span>
                                    )}
                                    {expense.isPaid && (
                                        <span className="text-[9px] font-mono font-bold text-[#4A7C59] dark:text-green-400 bg-[#EAF2EC] dark:bg-[#4A7C59]/20 px-1.5 py-0.5 rounded">
                                            {expense.isManuallyPaid ? 'Вручную' : 'Авто'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-right flex items-center gap-2.5 pl-2">
                            <div className="flex flex-col items-end">
                                <span className={`text-xs md:text-sm font-headline font-bold tabular-nums ${expense.isPaid ? 'text-gray-400' : 'text-graphite dark:text-white'}`}>
                                    {expense.amount.toLocaleString('ru-RU')} ₽
                                </span>
                                
                                {!expense.isPaid && expense.progress > 0 && (
                                    <div className="w-12 h-1 bg-gray-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-[#4A7C59]" style={{ width: `${expense.progress}%` }} />
                                    </div>
                                )}
                                
                                {!expense.isPaid && expense.paidAmount > 0 && (
                                    <span className="text-[8px] font-mono font-bold text-[#4A7C59]">
                                        оплачено: {Math.round(expense.paidAmount)}
                                    </span>
                                )}
                            </div>
                            {onEdit && (
                                <div className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                    <Edit2 size={13} />
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
