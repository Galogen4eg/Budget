
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
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-soft w-full">
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                <DollarSign size={18} />
            </div>
            <div>
                <h3 className="text-sm font-black text-[#1C1C1E] uppercase tracking-wide leading-none">Обязательные</h3>
                <span className="text-[10px] text-gray-400 font-bold">
                    {Math.round(totalPaid).toLocaleString()} / {totalBudget.toLocaleString()} {settings.currency}
                </span>
            </div>
        </div>
        {allPaid && (
            <span className="bg-green-100 text-green-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                <Check size={12} strokeWidth={3} /> Всё оплачено
            </span>
        )}
      </div>

      <div className="space-y-3">
        {processedExpenses.map(expense => (
          <div key={expense.id} className="relative">
            <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-xs font-bold text-[#1C1C1E]">{expense.name}</span>
                <span className={`text-[10px] font-black tabular-nums ${expense.isPaid ? 'text-green-500' : 'text-gray-400'}`}>
                    {expense.isPaid ? 'Оплачено' : `${(expense.amount - expense.paidAmount).toLocaleString()} ${settings.currency}`}
                </span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${expense.progress}%` }}
                    className={`h-full rounded-full ${expense.isPaid ? 'bg-green-500' : 'bg-red-400'}`}
                />
            </div>
            {!expense.isPaid && expense.paidAmount > 0 && (
                <div className="text-[9px] text-gray-400 text-right mt-0.5">
                    Внесено: {expense.paidAmount.toLocaleString()}
                </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-50 text-[9px] text-gray-400 leading-tight">
         <div className="flex gap-1">
            <AlertCircle size={10} className="mt-0.5"/>
            <span>Чтобы отметить трату выполненной, откройте нужную операцию в истории и нажмите кнопку связи. Приложение запомнит это на будущее.</span>
         </div>
      </div>
    </div>
  );
};

export default MandatoryExpensesList;
