import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, ShoppingBag, Layers, Sparkles, Lightbulb, GraduationCap, Wand2 } from 'lucide-react';
import TransactionHistory from './TransactionHistory';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';

interface DrillDownModalProps {
  categoryId?: string;
  merchantName?: string;
  onClose: () => void;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  categories: Category[];
  onLearnRule: (rule: LearnedRule) => void;
  onApplyRuleToExisting?: (rule: LearnedRule) => void;
  onEditTransaction: (tx: Transaction) => void;
  currentMonth?: Date;
  selectedDate?: Date | null;
}

const DrillDownModal: React.FC<DrillDownModalProps> = ({ 
    categoryId, merchantName, onClose, 
    transactions, setTransactions, settings, members, categories, 
    onLearnRule, onApplyRuleToExisting, onEditTransaction,
    currentMonth, selectedDate
}) => {
  const isOtherOrTraining = categoryId === 'other' || categoryId === 'uncategorized';

  // Find current selected category
  const initialCategory = categories.find(c => c.id === categoryId);
  
  // Find parent category and all subcategories
  const parentCategory = useMemo(() => {
    if (!initialCategory) return null;
    if (initialCategory.parentId) {
      return categories.find(c => c.id === initialCategory.parentId) || initialCategory;
    }
    return initialCategory;
  }, [initialCategory, categories]);

  const subcategories = useMemo(() => {
    if (!parentCategory) return [];
    return categories.filter(c => c.parentId === parentCategory.id);
  }, [parentCategory, categories]);

  // Active subcategory filter state (null = "Все подкатегории")
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(() => {
    if (initialCategory?.parentId) return initialCategory.id;
    return null;
  });

  // Calculate family category IDs
  const familyCategoryIds = useMemo(() => {
    if (!parentCategory) return categoryId ? [categoryId] : [];
    return [parentCategory.id, ...subcategories.map(s => s.id)];
  }, [parentCategory, subcategories, categoryId]);

  // Filter expenses matching current month/date context and category family
  const familyTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Respect month / date filter
      if (selectedDate) {
        if (new Date(t.date).toDateString() !== selectedDate.toDateString()) return false;
      } else if (currentMonth) {
        const d = new Date(t.date);
        if (d.getMonth() !== currentMonth.getMonth() || d.getFullYear() !== currentMonth.getFullYear()) return false;
      }

      if (merchantName) {
        const query = merchantName.toLowerCase();
        return (t.note || '').toLowerCase().includes(query) || (t.rawNote || '').toLowerCase().includes(query);
      }
      return familyCategoryIds.includes(t.category);
    });
  }, [transactions, selectedDate, currentMonth, merchantName, familyCategoryIds]);

  // Count uncategorized transactions
  const uncategorizedTransactions = useMemo(() => {
    return transactions.filter(t => t.category === 'other' || !t.category || t.category === 'uncategorized');
  }, [transactions]);

  // Total spent in this category family
  const totalCategorySpent = useMemo(() => {
    return Math.round(
      familyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    );
  }, [familyTransactions]);

  // Spending breakdown per subcategory
  const subcategoryStats = useMemo(() => {
    return subcategories.map(sub => {
      const subTxs = familyTransactions.filter(t => t.category === sub.id && t.type === 'expense');
      const spent = Math.round(subTxs.reduce((sum, t) => sum + t.amount, 0));
      return {
        sub,
        spent,
        count: subTxs.length
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [subcategories, familyTransactions]);

  // Current active category or subcategory for title/icon
  const currentActiveCategory = useMemo(() => {
    if (activeSubcategoryId) {
      return categories.find(c => c.id === activeSubcategoryId) || initialCategory;
    }
    return parentCategory || initialCategory;
  }, [activeSubcategoryId, categories, parentCategory, initialCategory]);

  const title = merchantName || currentActiveCategory?.label || (isOtherOrTraining ? 'Прочее' : 'Карточка категории');

  // Smart distribution suggestion logic
  const smartMatches = useMemo(() => {
    if (!isOtherOrTraining) return null;
    // Look for uncategorized transactions that have common store words like MAGNIT, MARKET, FOOD, etc.
    const foodCat = categories.find(c => c.id === 'food' || c.label.toLowerCase().includes('продукт'));
    if (!foodCat) return null;

    const matching = uncategorizedTransactions.filter(t => {
      const text = (t.note + ' ' + (t.rawNote || '')).toLowerCase();
      return text.includes('magnit') || text.includes('магнит') || text.includes('пятёрочка') || text.includes('перекресток') || text.includes('ашан');
    });

    if (matching.length === 0) return null;

    return {
      category: foodCat,
      count: matching.length,
      matchingIds: matching.map(m => m.id)
    };
  }, [isOtherOrTraining, uncategorizedTransactions, categories]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle applying smart distribution rule
  const handleApplySmartDistribution = () => {
    if (!smartMatches) return;
    setTransactions(prev => prev.map(t => {
      if (smartMatches.matchingIds.includes(t.id)) {
        return { ...t, category: smartMatches.category.id };
      }
      return t;
    }));

    onLearnRule({
      id: 'rule-' + Date.now(),
      pattern: 'МАГНИТ',
      categoryId: smartMatches.category.id,
      exactMatch: false
    });
  };

  // Handle training all remaining uncategorized
  const handleTrainAllUncategorized = () => {
    const foodCat = categories.find(c => c.id === 'food') || categories[0];
    if (!foodCat) return;

    setTransactions(prev => prev.map(t => {
      if (t.category === 'other' || !t.category || t.category === 'uncategorized') {
        return { ...t, category: foodCat.id };
      }
      return t;
    }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm" 
      />
      
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative bg-white dark:bg-[#1C1C1E] w-full max-w-4xl md:rounded-[28px] rounded-t-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[88vh] border border-surface-border dark:border-white/10"
      >
        {/* Header with Category Info matching screenshot */}
        <div className="bg-white dark:bg-[#1C1C1E] px-6 py-4 flex justify-between items-center border-b border-surface-border dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
             <div 
               className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-all bg-[#1C1C1E] dark:bg-white dark:text-[#1C1C1E]"
               style={!isOtherOrTraining ? { backgroundColor: currentActiveCategory?.color || '#4A7C59' } : undefined}
             >
               {getIconById(currentActiveCategory?.icon || 'ShoppingBag', 22)}
             </div>
             <div className="min-w-0">
                 <div className="flex items-center gap-2 flex-wrap">
                   <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block leading-none">
                     {isOtherOrTraining ? 'ИСТОРИЯ ОПЕРАЦИЙ • ОБУЧЕНИЕ КАТЕГОРИЙ' : 'Карточка категории'}
                   </span>
                   {isOtherOrTraining && (
                     <span className="text-[10px] font-bold text-graphite dark:text-gray-200 bg-[#F0ECE1] dark:bg-white/10 px-2 py-0.5 rounded-full">
                       {uncategorizedTransactions.length} неразобранных
                     </span>
                   )}
                   {parentCategory && initialCategory?.parentId && !isOtherOrTraining && (
                     <span className="text-[10px] font-semibold text-graphite-muted dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
                       в {parentCategory.label}
                     </span>
                   )}
                 </div>
                 <h2 className="text-xl font-headline font-bold text-graphite dark:text-white tracking-tight leading-snug truncate mt-0.5">
                   {title}
                 </h2>
             </div>
          </div>

          <div className="flex items-center gap-2">
            {isOtherOrTraining && (
              <button
                type="button"
                onClick={handleTrainAllUncategorized}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EAF2EC] dark:bg-[#4A7C59]/20 text-[#4A7C59] dark:text-green-400 text-xs font-bold hover:bg-[#DDF0E1] transition cursor-pointer"
              >
                <Wand2 size={15} />
                <span>Авто-правило для «Прочее»</span>
              </button>
            )}

            <button 
              onClick={onClose} 
              className="w-9 h-9 bg-gray-100 hover:bg-gray-200 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors shrink-0"
              aria-label="Закрыть"
            >
              <X size={18} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Subcategories Selector Bar (if subcategories exist) */}
        {subcategories.length > 0 && !isOtherOrTraining && (
          <div className="bg-white dark:bg-[#1C1C1E] px-6 py-3 border-b border-surface-border dark:border-white/5 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-graphite-muted dark:text-gray-400 uppercase tracking-wider">
                Подкатегории:
              </span>
              {activeSubcategoryId && (
                <button
                  type="button"
                  onClick={() => setActiveSubcategoryId(null)}
                  className="text-[11px] font-bold text-primary dark:text-green-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Все подкатегории
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {/* "Все" Pill */}
              <button
                type="button"
                onClick={() => setActiveSubcategoryId(null)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  activeSubcategoryId === null
                    ? 'bg-graphite text-white dark:bg-white dark:text-graphite scale-[1.02]'
                    : 'bg-[#F4F1EA] dark:bg-[#2C2C2E] text-graphite-muted dark:text-gray-300 hover:bg-[#EBE6DC] dark:hover:bg-[#3A3A3C]'
                }`}
              >
                <Layers size={14} />
                <span>Все</span>
                <span className="opacity-75 font-normal ml-0.5">
                  ({settings.privacyMode ? '•••' : `${totalCategorySpent.toLocaleString('ru-RU')} ₽`})
                </span>
              </button>

              {/* Subcategory Pills */}
              {subcategoryStats.map(({ sub, spent }) => {
                const isActive = activeSubcategoryId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveSubcategoryId(isActive ? null : sub.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 shadow-xs border cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white border-primary dark:bg-green-600 dark:border-green-600 scale-[1.02]'
                        : 'bg-white dark:bg-[#252528] text-graphite dark:text-gray-200 border-surface-border dark:border-white/10 hover:bg-[#FAF8F5] dark:hover:bg-[#2C2C2E]'
                    }`}
                  >
                    <div 
                      className="w-4 h-4 rounded-md flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: sub.color || parentCategory?.color || '#4A7C59' }}
                    >
                      {getIconById(sub.icon, 10)}
                    </div>
                    <span>{sub.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isActive 
                        ? 'bg-white/20 text-white font-extrabold' 
                        : 'bg-[#F0ECE1] dark:bg-white/10 text-graphite-muted dark:text-gray-400'
                    }`}>
                      {settings.privacyMode ? '•••' : `${spent.toLocaleString('ru-RU')} ₽`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content - Transactions List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 md:p-6 bg-[#FAF8F5]/50 dark:bg-[#121214] overscroll-contain space-y-4">
            <TransactionHistory 
                transactions={transactions}
                setTransactions={setTransactions}
                settings={settings}
                members={members}
                categories={categories}
                onLearnRule={onLearnRule}
                onApplyRuleToExisting={onApplyRuleToExisting}
                onEditTransaction={onEditTransaction}
                selectedCategoryId={activeSubcategoryId || categoryId}
                selectedMerchantName={merchantName}
                filterMode={selectedDate ? 'day' : 'month'}
                selectedDate={selectedDate}
                currentMonth={currentMonth}
                hideActiveFilterBadge={true} 
                hideTitle={true}
                hideFilters={false}
            />

            {/* Smart Distribution Banner matching screenshot */}
            {smartMatches && (
              <div className="bg-white dark:bg-[#202024] border border-[#EAF2EC] dark:border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#EAF2EC] dark:bg-[#4A7C59]/20 text-[#4A7C59] dark:text-green-400 flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-graphite dark:text-white">Умное распределение</h4>
                    <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5 truncate">
                      Найдено соответствие: {smartMatches.count} {smartMatches.count === 1 ? 'операция похожа' : 'операции похожи'} на категорию «{smartMatches.category.label}»
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplySmartDistribution}
                  className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D664A] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer shrink-0"
                >
                  Применить
                </button>
              </div>
            )}

            {/* Financial Assistant Training Banner matching screenshot */}
            {isOtherOrTraining && (
              <div className="bg-[#FAF8F5] dark:bg-[#202024] border border-[#EAE6DE] dark:border-white/10 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start md:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#F6EFE3] dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 md:mt-0">
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-graphite-muted dark:text-gray-400 uppercase tracking-widest block leading-none mb-1">
                      ОБУЧЕНИЕ ФИНАНСОВОГО АССИСТЕНТА
                    </span>
                    <p className="text-xs text-graphite dark:text-gray-200 leading-relaxed max-w-xl">
                      Выберите категорию для операции «Прочее», чтобы приложение автоматически создало правило и распределяло подобные траты магазинов без ручной проверки.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-graphite dark:text-gray-200 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Пропустить
                  </button>
                  <button
                    type="button"
                    onClick={handleTrainAllUncategorized}
                    className="px-4 py-2.5 bg-[#4A7C59] hover:bg-[#3D664A] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <GraduationCap size={16} />
                    <span>Обучить все ({uncategorizedTransactions.length})</span>
                  </button>
                </div>
              </div>
            )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default DrillDownModal;
