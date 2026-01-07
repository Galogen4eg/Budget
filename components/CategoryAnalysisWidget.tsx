
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, ChevronRight, TrendingUp, Info } from 'lucide-react';
import { Transaction, AppSettings, Category } from '../types';
import { getIconById } from '../constants';

interface CategoryAnalysisWidgetProps {
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
  onClick: () => void;
}

const CategoryAnalysisWidget: React.FC<CategoryAnalysisWidgetProps> = ({ transactions, categories, settings, onClick }) => {
  const data = useMemo(() => {
    const currentMonth = new Date();
    const expenses = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && 
               d.getMonth() === currentMonth.getMonth() && 
               d.getFullYear() === currentMonth.getFullYear();
    });

    const total = expenses.reduce((acc, t) => acc + Number(t.amount), 0);
    const grouped = expenses.reduce((acc, t) => {
        const amt = Number(t.amount);
        acc[t.category] = (acc[t.category] || 0) + amt;
        return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(grouped)
        .map(([catId, amount]) => {
            const cat = categories.find(c => c.id === catId);
            const numAmount = Number(amount);
            return {
                id: catId,
                label: cat?.label || 'Другое',
                color: cat?.color || '#C7C7CC',
                icon: cat?.icon || 'MoreHorizontal',
                amount: numAmount,
                percent: total > 0 ? (numAmount / total) * 100 : 0
            };
        })
        .sort((a, b) => b.amount - a.amount);

    return { total, topCategories: sorted.slice(0, 5), allCategories: sorted };
  }, [transactions, categories]);

  return (
    <motion.div 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2.2rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none h-full flex flex-col cursor-pointer group relative overflow-hidden transition-all"
    >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 relative z-10 shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <PieChart size={14} className="text-indigo-500 dark:text-indigo-400" />
                </div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    Категории
                </h3>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 transition-colors" />
        </div>

        {/* Content - Fixed to TOP */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar relative z-10 flex flex-col justify-start">
            {data.total === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-2">
                        <Info size={18} className="text-gray-400" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Нет трат</p>
                </div>
            ) : (
                <div className="space-y-3 pt-1">
                    {data.topCategories.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div 
                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
                                    style={{ backgroundColor: item.color }}
                                >
                                    <span className="scale-[0.65]">{getIconById(item.icon, 14)}</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-bold text-[#1C1C1E] dark:text-white truncate leading-tight">{item.label}</span>
                                    <span className="text-[8px] font-bold text-gray-400 tabular-nums">{Math.round(item.percent)}%</span>
                                </div>
                            </div>
                            <span className="text-[11px] font-black text-[#1C1C1E] dark:text-white tabular-nums">
                                {settings.privacyMode ? '•••' : item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Spectrum Bar (Bottom) */}
        <div className="mt-4 pt-3 border-t border-gray-50 dark:border-white/5 relative z-10 shrink-0">
            <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800/50">
                {data.total > 0 ? (
                    data.allCategories.map((item) => (
                        <div 
                            key={item.id}
                            style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                            className="h-full border-r border-white/20 last:border-0"
                        />
                    ))
                ) : <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />}
            </div>
            <div className="flex justify-between items-center mt-2">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Итого</span>
                <span className="text-[10px] font-black text-[#1C1C1E] dark:text-white tabular-nums leading-none">
                    {settings.privacyMode ? '•••' : data.total.toLocaleString()} {settings.currency}
                </span>
            </div>
        </div>

        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none opacity-60" />
    </motion.div>
  );
};

export default CategoryAnalysisWidget;
