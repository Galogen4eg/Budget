
import React from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, DollarSign, Calendar, Edit2 } from 'lucide-react';
import { MandatoryExpense, Transaction, AppSettings } from '../types';

interface MandatoryExpensesListProps {
  expenses: MandatoryExpense[];
  transactions: Transaction[];
  settings: AppSettings;
  currentMonth: Date;
  onEdit?: (expense: MandatoryExpense) => void;
}

const MandatoryExpensesList: React.FC<MandatoryExpensesListProps> = ({ expenses, transactions, settings, currentMonth, onEdit }) => {
  if (!expenses || expenses.length === 0) return null;

  // Filter transactions for the displayed month
  const monthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth.getMonth() && 
           d.getFullYear() === currentMonth.getFullYear() &&
           t.type === 'expense';
  });

  const processedExpenses = expenses.map(expense => {
    const keywords = expense.keywords || [];
    
    // Find matching transactions based on keywords
    const matches = monthTransactions.filter(tx => {
       if (keywords.length === 0) return false;
       const noteLower = (tx.note || '').toLowerCase();
       const rawLower = (tx.rawNote || '').toLowerCase();
       return keywords.some(k => noteLower.includes(k.toLowerCase()) || rawLower.includes(k.toLowerCase()));
    });

    const paidAmount = matches.reduce((sum, tx) => sum + tx.amount, 0);
    const isPaid = paidAmount >= (expense.amount * 0.95); // Allow small margin
    const progress = Math.min(100, (paidAmount / expense.amount) * 100);
    const isOverdue = !isPaid && new Date().getDate() > (expense.day || 1) && new Date().getMonth() === currentMonth.getMonth();

    return { ...expense, paidAmount, isPaid, progress, isOverdue };
  }).sort((a, b) => (a.day || 0) - (b.day || 0));

  const totalBudget = processedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = processedExpenses.reduce((sum, e) => sum + e.paidAmount, 0);

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-white shadow-soft w-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 text-red-500 rounded-xl shrink-0">
                <DollarSign size={18} />
            </div>
            <div>
                <h3 className="text-sm font-black text-[#1C1C1E] uppercase tracking-wide leading-none">Обязательные</h3>
                <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                    {Math.round(totalPaid).toLocaleString()} / {totalBudget.toLocaleString()} {settings.currency}
                </span>
            </div>
        </div>
      </div>

      <div className="space-y-3">
        {processedExpenses.map(expense => (
          <div key={expense.id} onClick={() => onEdit && onEdit(expense)} className="relative flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border ${expense.isPaid ? 'bg-green-50 border-green-100 text-green-600' : expense.isOverdue ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-gray-100 text-[#1C1C1E]'}`}>
                    <span className="text-[9px] font-black uppercase mb-[-2px]">{new Date(currentMonth.getFullYear(), currentMonth.getMonth(), expense.day).toLocaleString('ru', { month: 'short' })}</span>
                    <span className="text-sm font-black leading-none">{expense.day}</span>
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#1C1C1E] truncate">{expense.name}</span>
                    <span className="text-[10px] font-medium text-gray-400">
                        {expense.isPaid ? 'Оплачено' : `Осталось: ${(expense.amount - expense.paidAmount).toLocaleString()}`}
                    </span>
                </div>
            </div>
            
            <div className="text-right flex items-center gap-2">
                {expense.isPaid ? (
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-sm">
                        <Check size={16} strokeWidth={3} />
                    </div>
                ) : (
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-[#1C1C1E]">{expense.amount.toLocaleString()}</span>
                        {expense.progress > 0 && (
                            <div className="w-12 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${expense.progress}%` }} />
                            </div>
                        )}
                    </div>
                )}
                {onEdit && (
                    <div className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 size={14} />
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MandatoryExpensesList;
