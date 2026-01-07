
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, ChevronRight, TrendingUp } from 'lucide-react';
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
    // Filter for current month expenses
    const expenses = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && 
               d.getMonth() === currentMonth.getMonth() && 
               d.getFullYear() === currentMonth.getFullYear();
    });

    // Explicitly cast to Number to avoid TS arithmetic errors
    const total = expenses.reduce((acc, t) => acc + Number(t.amount), 0);

    // Group by category
    const grouped = expenses.reduce((acc, t) => {
        const amt = Number(t.amount);
        acc[t.category] = (acc[t.category] || 0) + amt;
        return acc;
    }, {} as Record<string, number>);

    // Convert to array and sort
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

    return { total, topCategories: sorted.slice(0, 3), allCategories: sorted };
  }, [transactions, categories]);

  if (data.total === 0) return null;

  return (
    <motion.div 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2.5rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none h-full flex flex-col justify-between cursor-pointer group relative overflow-hidden"
    >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 relative z-10">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <PieChart size={14} className="text-indigo-500 dark:text-indigo-400" />
                </div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Категории
                </h3>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 transition-colors" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-3 relative z-10 min-h-0">
            {/* Top 3 List */}
            <div className="space-y-3">
                {data.topCategories.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <div 
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                                style={{ backgroundColor: item.color }}
                            >
                                <span className="scale-75">{getIconById(item.icon, 16)}</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate leading-tight">{item.label}</span>
                                <span className="text-[9px] font-bold text-gray-400 tabular-nums">{Math.round(item.percent)}%</span>
                            </div>
                        </div>
                        <span className="text-xs font-black text-[#1C1C1E] dark:text-white tabular-nums">
                            {settings.privacyMode ? '•••' : item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* Spectrum Bar (Bottom) */}
        <div className="mt-5 relative z-10">
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                {data.allCategories.map((item) => (
                    <div 
                        key={item.id}
                        style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                        className="h-full border-r border-white/20 last:border-0 transition-all duration-500"
                    />
                ))}
            </div>
            <div className="flex justify-between items-center mt-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Всего трат</span>
                <span className="text-[10px] font-black text-[#1C1C1E] dark:text-white tabular-nums">
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
