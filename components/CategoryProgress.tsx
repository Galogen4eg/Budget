
import React from 'react';
import { motion } from 'framer-motion';
import { Transaction, AppSettings } from '../types';
import { CATEGORIES, getIconById } from '../constants';

interface CategoryProgressProps {
  transactions: Transaction[];
  settings: AppSettings;
}

const CategoryProgress: React.FC<CategoryProgressProps> = ({ transactions, settings }) => {
  const expenseData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, tx) => {
      const category = CATEGORIES.find(c => c.id === tx.category);
      const label = category?.label || 'Прочее';
      const existing = acc.find(item => item.id === (category?.id || 'other'));
      if (existing) {
        existing.value += tx.amount;
      } else {
        acc.push({ 
          id: category?.id || 'other',
          name: label, 
          value: tx.amount, 
          color: category?.color || '#888',
          icon: category?.icon || 'Other'
        });
      }
      return acc;
    }, [] as { id: string; name: string; value: number; color: string; icon: string }[]);

  const totalExpense = expenseData.reduce((acc, item) => acc + item.value, 0);

  if (expenseData.length === 0) {
    return (
      <div className="bg-white p-10 rounded-[2.5rem] text-center text-gray-300 font-bold italic border border-dashed border-gray-100">
        Пока нечего анализировать ✨
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-white shadow-soft space-y-6 transition-all">
      {expenseData.sort((a, b) => b.value - a.value).map((item) => {
        const percentage = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
        return (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: item.color }}
                >
                  {getIconById(item.icon, 18)}
                </div>
                <span className="text-xs font-black text-[#1C1C1E] uppercase tracking-wider">{item.name}</span>
              </div>
              <div className={`transition-all duration-300 ${settings.privacyMode ? 'blur-md' : ''}`}>
                <span className="text-sm font-black text-[#1C1C1E]">{item.value.toLocaleString()} {settings.currency}</span>
              </div>
            </div>
            <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                className="h-full rounded-full shadow-sm"
                style={{ backgroundColor: item.color }}
              />
            </div>
            <div className="flex justify-end">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{Math.round(percentage)}% от всех трат</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryProgress;
