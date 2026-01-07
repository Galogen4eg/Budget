
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings, Category } from '../types';
import { getIconById } from '../constants';
import { ChevronDown, ChevronUp, PieChart } from 'lucide-react';
import { getMerchantBrandKey } from '../utils/categorizer';
import BrandIcon from './BrandIcon';

interface CategoryProgressProps {
  transactions: Transaction[];
  settings: AppSettings;
  categories: Category[];
  onCategoryClick?: (categoryId: string) => void;
  onSubCategoryClick?: (catId: string, merchantName: string) => void;
  currentMonth?: Date;
  selectedDate?: Date | null;
}

const CategoryProgress: React.FC<CategoryProgressProps> = ({ transactions, settings, categories, onCategoryClick, onSubCategoryClick, currentMonth, selectedDate }) => {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // Filter expenses by selected date OR current month
  const expenses = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      
      if (selectedDate) {
          return d.toDateString() === selectedDate.toDateString();
      }
      
      if (currentMonth) {
          return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
      }
      return true;
  });

  const categoryData = categories.map(cat => {
    const catTransactions = expenses.filter(t => t.category === cat.id);
    const totalValue = catTransactions.reduce((acc, t) => acc + t.amount, 0);
    
    // Group by merchant inside category
    const merchants = catTransactions.reduce((acc, t) => {
      const name = t.note || cat.label;
      const existing = acc.find(m => m.name === name);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name, value: t.amount, brandKey: getMerchantBrandKey(name) });
      }
      return acc;
    }, [] as { name: string; value: number; brandKey?: string }[])
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
      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] text-center text-gray-300 dark:text-gray-600 font-bold italic border border-dashed border-gray-100 dark:border-white/5 flex flex-col justify-center h-full text-xs min-h-[120px]">
        {selectedDate ? 'В этот день трат не было' : 'Пока нечего анализировать ✨'}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none space-y-4 transition-all w-full h-auto overflow-y-auto no-scrollbar max-h-[600px]">
      <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                  <PieChart size={16} className="text-indigo-500" />
              </div>
              <div>
                  <h3 className="text-sm font-black text-[#1C1C1E] dark:text-white uppercase tracking-wide leading-none">Категории</h3>
                  {selectedDate && (
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 block mt-0.5">
                          {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </span>
                  )}
              </div>
          </div>
      </div>
      
      {categoryData.map((item) => {
        const percentage = totalExpense > 0 ? (item.totalValue / totalExpense) * 100 : 0;
        const isExpanded = expandedCategoryId === item.id;
        
        const canExpand = item.merchants.length > 1 || 
                         (item.merchants.length === 1 && item.merchants[0].name !== item.label);

        const handleMainClick = () => {
            if (onCategoryClick) {
                onCategoryClick(item.id);
            } else if (canExpand) {
                setExpandedCategoryId(isExpanded ? null : item.id);
            }
        };

        const toggleExpand = (e: React.MouseEvent) => {
            e.stopPropagation();
            setExpandedCategoryId(isExpanded ? null : item.id);
        };

        return (
          <div key={item.id} className="border-b border-gray-50 dark:border-white/5 last:border-none pb-3 last:pb-0">
            <div 
              className={`flex flex-col gap-2 p-2 rounded-2xl transition-all ${isExpanded ? 'bg-gray-50/50 dark:bg-white/5' : ''}`}
            >
              <div className="flex items-center justify-between">
                {/* Left Side: Click to Open History */}
                <div 
                    className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer p-1 -m-1"
                    onClick={handleMainClick}
                >
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  >
                    {getIconById(item.icon, 16)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-[#1C1C1E] dark:text-white uppercase tracking-wider block leading-none mb-0.5 truncate">
                      {item.label}
                    </span>
                    <span className="text-[8px] font-black text-gray-300 dark:text-gray-500 uppercase tracking-widest truncate block">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>

                {/* Right Side: Amount & Expand Button */}
                <div className="flex items-center gap-1 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] md:text-xs font-black text-[#1C1C1E] dark:text-white tabular-nums">
                        {settings.privacyMode ? '•••' : `${item.totalValue.toLocaleString()}`}
                    </span>
                  </div>
                  {canExpand && (
                    <button 
                        onClick={toggleExpand}
                        className="p-1.5 -mr-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
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
                  className="overflow-hidden mt-2 px-1 space-y-2"
                >
                  {item.merchants.map((merchant, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => onSubCategoryClick && onSubCategoryClick(item.id, merchant.name)}
                        className="flex items-center justify-between p-2 bg-white dark:bg-[#2C2C2E] rounded-xl border border-gray-50 dark:border-white/5 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3A3A3C] transition-colors"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="shrink-0">
                            <BrandIcon 
                                name={merchant.name} 
                                brandKey={merchant.brandKey}
                                category={item}
                                size="sm"
                            />
                        </div>
                        <span className="text-[9px] font-bold text-[#1C1C1E] dark:text-white truncate">{merchant.name}</span>
                      </div>
                      <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 tabular-nums shrink-0 ml-1">
                        {settings.privacyMode ? '•••' : `${merchant.value.toLocaleString()}`}
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
