
import React from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, DollarSign } from 'lucide-react';
import { MandatoryExpense, Transaction, AppSettings } from '../types';

interface MandatoryExpensesListProps {
  expenses: MandatoryExpense[];
  transactions: Transaction[];
  settings: AppSettings;
  currentMonth: Date;
}

const MandatoryExpensesList: React.FC<MandatoryExpensesListProps> = ({ expenses, transactions, settings, currentMonth }) => {
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
    const isPaid = paidAmount >= expense.amount;
    const progress = Math.min(100, (paidAmount / expense.amount) * 100);

    return { ...expense, paidAmount, isPaid, progress };
  });

  const totalBudget = processedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = processedExpenses.reduce((sum, e) => sum + e.paidAmount, 0);
  const allPaid = processedExpenses.every(e => e.isPaid);

  return (
    <div className="bg-white p-4 md:p-6 rounded-[2.5rem] border border-gray-100 shadow-soft w-full h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 text-red-500 rounded-xl shrink-0">
                <DollarSign size={16} />
            </div>
            <div className="min-w-0">
                <h3 className="text-[10px] md:text-sm font-black text-[#1C1C1E] uppercase tracking-wide leading-none truncate">Обязательные</h3>
                <span className="text-[8px] md:text-[10px] text-gray-400 font-bold block truncate">
                    {Math.round(totalPaid).toLocaleString()} / {totalBudget.toLocaleString()} {settings.currency}
                </span>
            </div>
        </div>
        {allPaid && (
            <span className="bg-green-100 text-green-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 self-start">
                <Check size={10} strokeWidth={3} /> OK
            </span>
        )}
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-60 md:max-h-none">
        {processedExpenses.map(expense => (
          <div key={expense.id} className="relative">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] md:text-xs font-bold text-[#1C1C1E] truncate max-w-[60%]">{expense.name}</span>
                <span className={`text-[9px] md:text-[10px] font-black tabular-nums whitespace-nowrap ${expense.isPaid ? 'text-green-500' : 'text-gray-400'}`}>
                    {expense.isPaid ? 'OK' : `${(expense.amount - expense.paidAmount).toLocaleString()}`}
                </span>
            </div>
            <div className="h-1.5 md:h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${expense.progress}%` }}
                    className={`h-full rounded-full ${expense.isPaid ? 'bg-green-500' : 'bg-red-400'}`}
                />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MandatoryExpensesList;
