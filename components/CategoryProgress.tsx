
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings, Category } from '../types';
import { getIconById } from '../constants';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getMerchantLogo } from '../utils/categorizer';

interface CategoryProgressProps {
  transactions: Transaction[];
  settings: AppSettings;
  categories: Category[];
}

const CategoryProgress: React.FC<CategoryProgressProps> = ({ transactions, settings, categories }) => {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const expenses = transactions.filter(t => t.type === 'expense');

  const categoryData = categories.map(cat => {
    const catTransactions = expenses.filter(t => t.category === cat.id);
    const totalValue = catTransactions.reduce((acc, t) => acc + t.amount, 0);
    
    // Группировка по мерчантам внутри категории
    const merchants = catTransactions.reduce((acc, t) => {
      const name = t.note || cat.label;
      const existing = acc.find(m => m.name === name);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name, value: t.amount, logo: getMerchantLogo(name) });
      }
      return acc;
    }, [] as { name: string; value: number; logo: string }[])
    .sort((a, b) => b.value - a.value);

    return {
      ...cat,
      totalValue,
      merchants
    };
  })
  .filter(cat => cat.totalValue > 0)
  .sort((a, b) => b.totalValue - a.totalValue);

  const totalExpense = categoryData.reduce((acc, item) => acc + item.totalValue, 0);

  if (categoryData.length === 0) {
    return (
      <div className="bg-white p-10 rounded-[2.5rem] text-center text-gray-300 font-bold italic border border-dashed border-gray-100">
        Пока нечего анализировать ✨
      </div>
    );
  }

  return (
    <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-white shadow-soft space-y-4 transition-all">
      {categoryData.map((item) => {
        const percentage = totalExpense > 0 ? (item.totalValue / totalExpense) * 100 : 0;
        const isExpanded = expandedCategoryId === item.id;
        
        // Условие: показывать разбивку только если мерчантов больше 1 
        // или если единственный мерчант не совпадает по имени с категорией
        const canExpand = item.merchants.length > 1 || 
                         (item.merchants.length === 1 && item.merchants[0].name !== item.label);

        return (
          <div key={item.id} className="border-b border-gray-50 last:border-none pb-4 last:pb-0">
            <div 
              className={`flex flex-col gap-3 p-2 rounded-3xl transition-all cursor-pointer ${isExpanded ? 'bg-gray-50/50' : ''}`}
              onClick={() => canExpand && setExpandedCategoryId(isExpanded ? null : item.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: item.color }}
                  >
                    {getIconById(item.icon, 20)}
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#1C1C1E] uppercase tracking-wider block leading-none mb-1">
                      {item.label}
                    </span>
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                      {Math.round(percentage)}% от всех трат
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-right transition-all duration-300 ${settings.privacyMode ? 'blur-md' : ''}`}>
                    <span className="text-sm font-black text-[#1C1C1E]">{item.totalValue.toLocaleString()} {settings.currency}</span>
                  </div>
                  {canExpand && (
                    <div className="text-gray-300">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  className="h-full rounded-full shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 px-2 space-y-2"
                >
                  {item.merchants.map((merchant, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-50 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{merchant.logo}</span>
                        <span className="text-[11px] font-bold text-[#1C1C1E]">{merchant.name}</span>
                      </div>
                      <span className={`text-[11px] font-black text-gray-500 tabular-nums ${settings.privacyMode ? 'blur-[4px]' : ''}`}>
                        {merchant.value.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryProgress;
