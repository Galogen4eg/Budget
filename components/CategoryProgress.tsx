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

/**
 * CategoryProgress: Visual category distribution and merchant breakdown.
 * Refactored to adhere to the warm Terra design tokens and typography.
 */
const CategoryProgress: React.FC<CategoryProgressProps> = ({ 
  transactions, 
  settings, 
  categories, 
  onCategoryClick, 
  onSubCategoryClick, 
  currentMonth, 
  selectedDate 
}) => {
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

  const parentCategories = categories.filter(c => !c.parentId);

  const categoryData = parentCategories.map(parentCat => {
    // Find all children for this parent
    const childrenIds = categories.filter(c => c.parentId === parentCat.id).map(c => c.id);
    const familyIds = [parentCat.id, ...childrenIds];

    // Get all transactions for parent + children
    const familyTransactions = expenses.filter(t => familyIds.includes(t.category));
    const totalValue = familyTransactions.reduce((acc, t) => acc + t.amount, 0);
    
    // Group by merchant OR subcategory label
    const merchants = familyTransactions.reduce((acc, t) => {
      const txCat = categories.find(c => c.id === t.category);
      let name = t.note || (txCat ? txCat.label : parentCat.label);
      if (t.category !== parentCat.id && txCat) {
          name = txCat.label;
      }

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
      ...parentCat,
      totalValue,
      merchants
    };
  })
  .filter(cat => cat.totalValue > 0)
  .sort((a, b) => b.totalValue - a.totalValue);

  const totalExpense = categoryData.reduce((acc, item) => acc + item.totalValue, 0);

  if (categoryData.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-3xl text-center text-gray-400 font-bold border border-dashed border-surface-border dark:border-white/10 flex flex-col justify-center items-center h-full text-xs min-h-[140px] shadow-sm">
        <PieChart size={28} className="text-gray-300 dark:text-gray-600 mb-2" />
        <span>{selectedDate ? 'В этот день трат не было' : 'Пока нет расходов для анализа'}</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-5 md:p-6 rounded-3xl border border-surface-border dark:border-white/10 shadow-sm space-y-4 transition-all w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-1 shrink-0">
          <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-green-950/40 text-primary dark:text-green-400 flex items-center justify-center">
                  <PieChart size={17} />
              </div>
              <div>
                  <h3 className="text-sm font-headline font-bold text-graphite dark:text-white uppercase tracking-wide leading-none">
                      Категории
                  </h3>
                  {selectedDate && (
                      <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500 block mt-0.5">
                          {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </span>
                  )}
              </div>
          </div>
          <span className="text-xs font-headline font-bold text-graphite-muted dark:text-gray-400">
              {settings.privacyMode ? '•••' : `${totalExpense.toLocaleString('ru-RU')} ₽`}
          </span>
      </div>
      
      {/* Category List */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-0.5">
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
            <div key={item.id} className="border-b border-surface-border/60 dark:border-white/5 last:border-none pb-3 last:pb-0">
                <div 
                  className={`flex flex-col gap-2 p-2 rounded-2xl transition-all ${isExpanded ? 'bg-[#FAF8F5] dark:bg-white/5' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    {/* Left Side: Click to Open History */}
                    <div 
                        className="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer p-1 -m-1"
                        onClick={handleMainClick}
                    >
                      <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                      >
                          {getIconById(item.icon, 16)}
                      </div>
                      <div className="min-w-0">
                          <span className="text-xs font-bold text-graphite dark:text-white uppercase tracking-wider block leading-none mb-1 truncate">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate block">
                            {Math.round(percentage)}%
                          </span>
                      </div>
                    </div>

                    {/* Right Side: Amount & Expand Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                          <span className="text-xs md:text-sm font-headline font-bold text-graphite dark:text-white tabular-nums">
                              {settings.privacyMode ? '•••' : `${item.totalValue.toLocaleString('ru-RU')} ₽`}
                          </span>
                      </div>
                      {canExpand && (
                          <button 
                              onClick={toggleExpand}
                              className="p-1.5 text-gray-400 hover:text-graphite dark:hover:text-white rounded-full hover:bg-white dark:hover:bg-white/10 transition-colors"
                              aria-label="Подробнее"
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                  </div>
                </div>

                {/* Sub-merchants list */}
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
                            className="flex items-center justify-between p-2.5 bg-[#FAF8F5] dark:bg-[#252528] rounded-xl border border-surface-border dark:border-white/5 shadow-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className="shrink-0">
                                  <BrandIcon 
                                      name={merchant.name} 
                                      brandKey={merchant.brandKey}
                                      category={item}
                                      size="sm"
                                  />
                              </div>
                              <span className="text-xs font-semibold text-graphite dark:text-white truncate">
                                {merchant.name}
                              </span>
                          </div>
                          <span className="text-xs font-headline font-bold text-graphite-muted dark:text-gray-400 tabular-nums shrink-0 ml-1">
                              {settings.privacyMode ? '•••' : `${merchant.value.toLocaleString('ru-RU')} ₽`}
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
    </div>
  );
};

export default CategoryProgress;
