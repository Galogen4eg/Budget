import React, { useState } from 'react';
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
}) => {
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({
    food: true,
    transport: true
  });

  if (!isOpen) return null;

  // Filter expenses for current month
  const monthExpenses = transactions.filter(t => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });

  const parentCategories = categories.filter(c => !c.parentId);

  // Calculate stats
  const totalSpent = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'income' && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const defaultLimit = totalIncome > 0 ? totalIncome : 50000;
  const freeBalance = Math.max(0, defaultLimit - totalSpent);

  const toggleExpand = (catId: string) => {
    setExpandedCatIds(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const monthName = currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#2E3230]/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1C1C1E] w-full max-w-2xl rounded-2xl border border-surface-border dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-border/80 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#252528]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-xs">
              <PieChart size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold font-headline text-graphite dark:text-white">
                Категории и лимиты трат
              </h3>
              <p className="text-xs text-graphite-muted dark:text-gray-400">
                Управление иерархией расходов, лимитами и привязкой магазинов
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

        {/* Progress summary banner */}
        <div className="p-3 sm:px-5 bg-[#FAF6F0] dark:bg-[#1E1E20] border-b border-surface-border/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-graphite-muted dark:text-gray-400">
              Общий бюджет: <b className="text-graphite dark:text-white">{defaultLimit.toLocaleString('ru-RU')} ₽</b>
            </span>
            <span className="text-graphite-muted opacity-40">•</span>
            <span className="text-graphite-muted dark:text-gray-400">
              Потрачено: <b className="text-primary dark:text-green-400">{totalSpent.toLocaleString('ru-RU')} ₽ ({Math.round((totalSpent / defaultLimit) * 100)}%)</b>
            </span>
            <span className="text-graphite-muted opacity-40">•</span>
            <span className="text-graphite-muted dark:text-gray-400">
              Остаток: <b className="text-[#4A7C59] dark:text-green-400">{freeBalance.toLocaleString('ru-RU')} ₽</b>
            </span>
          </div>
          <span className="text-[11px] font-semibold text-graphite-muted dark:text-gray-400 bg-white dark:bg-white/5 border border-surface-border dark:border-white/10 px-2 py-0.5 rounded-lg capitalize">
            {monthName}
          </span>
        </div>

        {/* Categories Accordion List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 no-scrollbar">
          {parentCategories.map(parentCat => {
            const children = categories.filter(c => c.parentId === parentCat.id);
            const familyIds = [parentCat.id, ...children.map(c => c.id)];
            const catTransactions = monthExpenses.filter(t => familyIds.includes(t.category));
            const catSpent = catTransactions.reduce((sum, t) => sum + t.amount, 0);

            // Mock or proportional category budget limit
            const catLimit = parentCat.id === 'food' ? 25000 
              : parentCat.id === 'transport' ? 5000 
              : parentCat.id === 'mandatory' ? 35800 
              : parentCat.id === 'home' ? 10000 
              : 5000;

            const percentage = Math.min(100, Math.round((catSpent / catLimit) * 100));
            const isExpanded = !!expandedCatIds[parentCat.id];

            // Subcategories / merchants
            const merchantMap = catTransactions.reduce((acc, t) => {
              const name = t.note || parentCat.label;
              acc[name] = (acc[name] || 0) + t.amount;
              return acc;
            }, {} as Record<string, number>);

            const merchantEntries = Object.entries(merchantMap).sort((a, b) => b[1] - a[1]);

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
                        <span className="text-[10px] font-semibold text-graphite-muted dark:text-gray-400 bg-[#F5F1EA] dark:bg-white/5 px-1.5 py-0.5 rounded">
                          {children.length > 0 ? `${children.length} подкат.` : `${merchantEntries.length} позиций`}
                        </span>
                      </div>
                      <p className="text-[11px] text-graphite-muted dark:text-gray-400 mt-0.5">
                        Лимит: {catLimit.toLocaleString('ru-RU')} ₽ • Факт: {catSpent.toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-graphite dark:text-white tabular-nums">
                        {catSpent.toLocaleString('ru-RU')} / {catLimit.toLocaleString('ru-RU')} ₽ 
                        <span className="text-primary dark:text-green-400 font-bold text-[10px] ml-1">
                          ({percentage}%)
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

                {/* Subcategories list when expanded */}
                {isExpanded && (
                  <div className="p-3.5 pt-3 bg-white dark:bg-[#222225] space-y-2">
                    <div className="text-[11px] font-bold text-graphite-muted dark:text-gray-400 uppercase tracking-wider mb-2">
                      Подкатегории и торговые сети:
                    </div>

                    {merchantEntries.length === 0 ? (
                      <div className="text-xs text-graphite-muted dark:text-gray-500 py-1 italic">
                        В этом месяце трат по категории ещё не было
                      </div>
                    ) : (
                      merchantEntries.map(([name, sum], idx) => {
                        const brandKey = getMerchantBrandKey(name);
                        return (
                          <div 
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-[#FAF9F6] dark:bg-[#2A2A2D] border border-surface-border/70 dark:border-white/5 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <BrandIcon name={name} brandKey={brandKey} category={parentCat} size="sm" />
                              <span className="font-semibold text-graphite dark:text-white truncate">
                                {name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-graphite dark:text-white tabular-nums">
                                {sum.toLocaleString('ru-RU')} ₽
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-5 border-t border-surface-border dark:border-white/10 bg-[#FAF9F6] dark:bg-[#252528] flex items-center justify-between gap-3">
          <div className="text-xs text-graphite-muted dark:text-gray-400 hidden sm:block">
            Изменения лимитов автоматически учитываются при расчёте дневного темпа
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
      </div>
    </div>
  );
};

export default CategoriesModal;
