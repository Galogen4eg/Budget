
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings, Category } from '../types';
import { getIconById } from '../constants';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getMerchantBrandKey } from '../utils/categorizer';
import BrandIcon from './BrandIcon';

interface CategoryProgressProps {
  transactions: Transaction[];
  settings: AppSettings;
  categories: Category[];
  onCategoryClick?: (categoryId: string) => void;
  onMerchantClick?: (merchantName: string) => void;
}

const CategoryProgress: React.FC<CategoryProgressProps> = ({ transactions, settings, categories, onCategoryClick, onMerchantClick }) => {
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
      <div className="bg-white p-6 rounded-[2.5rem] text-center text-gray-300 font-bold italic border border-dashed border-gray-100 flex flex-col justify-center h-full text-xs">
        Пока нечего анализировать ✨
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-[2.5rem] border border-white shadow-soft space-y-4 transition-all w-full h-full overflow-y-auto no-scrollbar max-h-[600px]">
      {categoryData.map((item) => {
        const percentage = totalExpense > 0 ? (item.totalValue / totalExpense) * 100 : 0;
        const isExpanded = expandedCategoryId === item.id;
        const canExpand = item.merchants.length > 0;

        return (
          <div key={item.id} className="border-b border-gray-50 last:border-none pb-3 last:pb-0">
            <div className={`flex flex-col gap-2 p-2 rounded-2xl transition-all ${isExpanded ? 'bg-gray-50/50' : ''}`}>
              <div className="flex items-center justify-between">
                <div 
                    className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer"
                    onClick={() => onCategoryClick && onCategoryClick(item.id)}
                >
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  >
                    {getIconById(item.icon, 16)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-[#1C1C1E] uppercase tracking-wider block leading-none mb-0.5 truncate">
                      {item.label}
                    </span>
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest truncate block">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="text-right cursor-pointer" onClick={() => onCategoryClick && onCategoryClick(item.id)}>
                    <span className="text-[10px] md:text-xs font-black text-[#1C1C1E] tabular-nums">
                        {settings.privacyMode ? '•••' : `${item.totalValue.toLocaleString()}`}
                    </span>
                  </div>
                  {canExpand && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setExpandedCategoryId(isExpanded ? null : item.id); }}
                        className="text-gray-300 hover:text-blue-500 p-1 rounded-full transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden" onClick={() => onCategoryClick && onCategoryClick(item.id)}>
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
                        className="flex items-center justify-between p-2 bg-white rounded-xl border border-gray-50 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => onMerchantClick && onMerchantClick(merchant.name)}
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
                        <span className="text-[9px] font-bold text-[#1C1C1E] truncate">{merchant.name}</span>
                      </div>
                      <span className="text-[9px] font-black text-gray-500 tabular-nums shrink-0 ml-1">
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
