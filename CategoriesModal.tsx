import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, Plus, X, ChevronDown, ChevronRight, Edit3, Check, DollarSign 
} from 'lucide-react';
import { Category, AppSettings, Transaction } from '../types';
import { getIconById } from '../constants';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey } from '../utils/categorizer';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  transactions: Transaction[];
  currentMonth: Date;
  settings: AppSettings;
  onSaveCategoryLimit?: (categoryId: string, limit: number) => void;
  onAddCategory?: () => void;
  onSelectCategory?: (categoryId: string) => void;
}

/**
 * CategoriesModal: Full breakdown and management modal matching the Terra design spec.
 * Displays parent categories, subcategories, merchant networks, budget limits and spend facts.
 */
const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  transactions,
  currentMonth,
  settings,
  onSelectCategory,
}) => {
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});
  const [periodFilter, setPeriodFilter] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  if (!isOpen) return null;

  // Filter expenses based on periodFilter relative to currentMonth / reference date
  const filteredExpenses = transactions.filter(t => {
    if (t.type !== 'expense') return false;
    const tDate = new Date(t.date);

    if (periodFilter === 'week') {
      const ref = new Date(currentMonth);
      const day = ref.getDay();
      const diffToMon = ref.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(ref.setDate(diffToMon));
      mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon);
      sun.setDate(sun.getDate() + 6);
      sun.setHours(23, 59, 59, 999);
      return tDate >= mon && tDate <= sun;
    }

    if (periodFilter === 'month') {
      return tDate.getMonth() === currentMonth.getMonth() && tDate.getFullYear() === currentMonth.getFullYear();
    }

    if (periodFilter === 'quarter') {
      const qStartMonth = Math.floor(currentMonth.getMonth() / 3) * 3;
      const qStart = new Date(currentMonth.getFullYear(), qStartMonth, 1);
      const qEnd = new Date(currentMonth.getFullYear(), qStartMonth + 3, 0, 23, 59, 59);
      return tDate >= qStart && tDate <= qEnd;
    }

    if (periodFilter === 'year') {
      return tDate.getFullYear() === currentMonth.getFullYear();
    }

    return true;
  });

  const parentCategories = categories.filter(c => !c.parentId);

  // Calculate stats
  const totalSpent = Math.round(filteredExpenses.reduce((sum, t) => sum + t.amount, 0));

  const toggleExpand = (catId: string) => {
    setExpandedCatIds(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const getPeriodLabel = () => {
    if (periodFilter === 'week') return 'Текущая неделя';
    if (periodFilter === 'month') return currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    if (periodFilter === 'quarter') {
      const qNum = Math.floor(currentMonth.getMonth() / 3) + 1;
      return `${qNum}-й квартал ${currentMonth.getFullYear()}`;
    }
    if (periodFilter === 'year') return `${currentMonth.getFullYear()} год`;
    return '';
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#2E3230]/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all overflow-y-auto"
        onClick={onClose}
      >
        <motion.div 
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 300) {
              onClose();
            }
          }}
          className="bg-white dark:bg-[#1C1C1E] w-full max-w-2xl rounded-2xl border border-surface-border dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto pb-[env(safe-area-inset-bottom,0px)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Drag Indicator Handle */}
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto my-2 cursor-grab active:cursor-grabbing sm:hidden shrink-0" />

          {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-border/80 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#252528]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-xs">
              <PieChart size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold font-headline text-graphite dark:text-white">
                Категории расходов
              </h3>
              <p className="text-xs text-graphite-muted dark:text-gray-400">
                Аналитика и структура расходов по категориям за месяц
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-surface-border dark:border-white/10 hover:bg-[#F3EFE7] dark:hover:bg-white/5 text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              title="Закрыть"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress summary banner with Period Selector */}
        <div className="p-3 sm:px-5 bg-[#FAF6F0] dark:bg-[#1E1E20] border-b border-surface-border/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-graphite-muted dark:text-gray-400">
              Расходы: <b className="text-primary dark:text-green-400 font-extrabold">{settings.privacyMode ? '•••' : `${totalSpent.toLocaleString('ru-RU')} ₽`}</b>
            </span>
            <span className="text-graphite-muted opacity-40">•</span>
            <span className="text-[11px] font-semibold text-graphite-muted dark:text-gray-400 bg-white dark:bg-white/5 border border-surface-border dark:border-white/10 px-2 py-0.5 rounded-lg capitalize">
              {getPeriodLabel()}
            </span>
          </div>

          {/* Period Selector Buttons */}
          <div className="flex items-center bg-[#EFE9DF] dark:bg-white/10 p-0.5 rounded-xl text-xs font-bold shadow-xs">
            {(['week', 'month', 'quarter', 'year'] as const).map(p => {
              const labels = {
                week: 'Неделя',
                month: 'Месяц',
                quarter: 'Квартал',
                year: 'Год'
              };
              const isActive = periodFilter === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodFilter(p)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                    isActive
                      ? 'bg-white dark:bg-[#2A2A2D] text-graphite dark:text-white shadow-xs font-black'
                      : 'text-graphite-muted hover:text-graphite dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Accordion List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 no-scrollbar">
          {(() => {
            const categoryListWithStats = parentCategories.map(parentCat => {
              const children = categories.filter(c => c.parentId === parentCat.id);
              const familyIds = [parentCat.id, ...children.map(c => c.id)];
              const catTransactions = filteredExpenses.filter(t => familyIds.includes(t.category));
              const catSpent = Math.round(catTransactions.reduce((sum, t) => sum + t.amount, 0));
              const percentage = totalSpent > 0 ? (catSpent / totalSpent) * 100 : 0;

              const merchantMap = catTransactions.reduce((acc, t) => {
                const name = t.note || parentCat.label;
                acc[name] = (acc[name] || 0) + Math.round(t.amount);
                return acc;
              }, {} as Record<string, number>);

              const merchantEntries = Object.entries(merchantMap).sort((a, b) => b[1] - a[1]);

              return {
                parentCat,
                children,
                catSpent,
                percentage,
                merchantEntries
              };
            }).sort((a, b) => {
              if (b.catSpent !== a.catSpent) {
                return b.catSpent - a.catSpent;
              }
              return a.parentCat.label.localeCompare(b.parentCat.label, 'ru', { sensitivity: 'base' });
            });

            return categoryListWithStats.map(({ parentCat, children, catSpent, percentage, merchantEntries }) => {
              const isExpanded = !!expandedCatIds[parentCat.id];

              return (
                <div 
                  key={parentCat.id}
                  className="border border-surface-border dark:border-white/10 rounded-xl bg-white dark:bg-[#252528] shadow-sm overflow-hidden transition-all"
                >
                  {/* Accordion Header */}
                  <div 
                    onClick={() => toggleExpand(parentCat.id)}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer bg-[#FAF9F6] dark:bg-[#2A2A2D] hover:bg-[#F4EFEA] dark:hover:bg-[#323236] transition border-b border-surface-border/60 dark:border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
                        style={{ backgroundColor: parentCat.color }}
                      >
                        {getIconById(parentCat.icon, 15)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-graphite dark:text-white">
                            {parentCat.label}
                          </h4>
                          {onSelectCategory && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCategory(parentCat.id);
                                onClose();
                              }}
                              className="text-[10px] font-bold text-primary dark:text-green-400 hover:underline px-2 py-0.5 rounded bg-primary/10 dark:bg-green-500/10 cursor-pointer"
                            >
                              Карточка →
                            </button>
                          )}
                          <span className="text-[10px] font-semibold text-graphite-muted dark:text-gray-400 bg-[#F5F1EA] dark:bg-white/5 px-1.5 py-0.5 rounded">
                            {children.length > 0 ? `${children.length} подкат.` : `${merchantEntries.length} позиций`}
                          </span>
                        </div>
                        <p className="text-[11px] text-graphite-muted dark:text-gray-400 mt-0.5">
                          Доля в расходах: {Math.round(percentage)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-graphite dark:text-white tabular-nums">
                          {settings.privacyMode ? '•••' : `${catSpent.toLocaleString('ru-RU')} ₽`}
                          <span className="text-primary dark:text-green-400 font-bold text-[10px] ml-1.5">
                            ({Math.round(percentage)}%)
                          </span>
                        </div>
                        <div className="w-24 bg-[#EAE6DE] dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%`, backgroundColor: parentCat.color }}
                          />
                        </div>
                      </div>

                      <div className="text-graphite-muted dark:text-gray-400 transition-transform">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Subcategories & Merchants list when expanded */}
                  {isExpanded && (
                    <div className="p-3.5 pt-3 bg-white dark:bg-[#222225] space-y-3">
                      {/* Explicit Child Subcategories list if defined */}
                      {children.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-graphite-muted dark:text-gray-400 uppercase tracking-wider">
                            Подкатегории:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {children.map(childCat => {
                              const childTxs = filteredExpenses.filter(t => t.category === childCat.id);
                              const childSpent = Math.round(childTxs.reduce((sum, t) => sum + t.amount, 0));
                              return (
                                <button
                                  key={childCat.id}
                                  type="button"
                                  onClick={() => {
                                    if (onSelectCategory) {
                                      onSelectCategory(childCat.id);
                                      onClose();
                                    }
                                  }}
                                  className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F6] dark:bg-[#2A2A2D] hover:bg-[#F0ECE1] dark:hover:bg-[#353538] border border-surface-border/70 dark:border-white/5 text-xs transition cursor-pointer text-left group"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div 
                                      className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                                      style={{ backgroundColor: childCat.color || parentCat.color }}
                                    >
                                      {getIconById(childCat.icon, 12)}
                                    </div>
                                    <span className="font-bold text-graphite dark:text-white group-hover:text-primary dark:group-hover:text-green-400 truncate">
                                      {childCat.label}
                                    </span>
                                  </div>
                                  <span className="font-bold text-graphite dark:text-white tabular-nums shrink-0 ml-2">
                                    {settings.privacyMode ? '•••' : `${childSpent.toLocaleString('ru-RU')} ₽`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Merchants breakdown */}
                      <div>
                        <div className="text-[11px] font-bold text-graphite-muted dark:text-gray-400 uppercase tracking-wider mb-2">
                          Торговые сети и заведения:
                        </div>

                        {merchantEntries.length === 0 ? (
                          <div className="text-xs text-graphite-muted dark:text-gray-500 py-1 italic">
                            В этом месяце трат по категории ещё не было
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {merchantEntries.map(([name, sum], idx) => {
                              const brandKey = getMerchantBrandKey(name);
                              return (
                                <button 
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (onSelectCategory) {
                                      onSelectCategory(parentCat.id);
                                      onClose();
                                    }
                                  }}
                                  className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-[#FAF9F6] dark:bg-[#2A2A2D] hover:bg-[#F4EFEA] dark:hover:bg-[#353538] border border-surface-border/70 dark:border-white/5 text-xs transition cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <BrandIcon name={name} brandKey={brandKey} category={parentCat} size="sm" />
                                    <span className="font-semibold text-graphite dark:text-white group-hover:text-primary dark:group-hover:text-green-400 truncate">
                                      {name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="font-bold text-graphite dark:text-white tabular-nums">
                                      {settings.privacyMode ? '•••' : `${sum.toLocaleString('ru-RU')} ₽`}
                                    </span>
                                    <span className="text-[10px] text-primary dark:text-green-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                      Открыть →
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-5 border-t border-surface-border dark:border-white/10 bg-[#FAF9F6] dark:bg-[#252528] flex items-center justify-between gap-3">
          <div className="text-xs text-graphite-muted dark:text-gray-400 hidden sm:block">
            Аналитика формируется на основе совершенных операций
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs transition cursor-pointer active:scale-95"
            >
              Закрыть
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
  );
};

export default CategoriesModal;
