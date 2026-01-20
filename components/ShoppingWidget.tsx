
import React from 'react';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { ShoppingItem } from '../types';

interface ShoppingWidgetProps {
  items: ShoppingItem[];
  onClick: () => void;
}

const ShoppingWidget: React.FC<ShoppingWidgetProps> = ({ items, onClick }) => {
  const activeItems = items.filter(i => !i.completed);
  // Show up to 8 items to be dynamic but reasonable
  const displayItems = activeItems.slice(0, 8);

  return (
    <div 
        onClick={onClick}
        className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2.2rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none w-full flex flex-col cursor-pointer group relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
    >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 relative z-10 shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <ShoppingBag size={14} className="text-blue-500" />
                </div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    Список покупок
                </h3>
            </div>
            <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-lg">
                    {activeItems.length}
                </span>
                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2.5 relative z-10 min-h-[60px]">
            {activeItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Все куплено!</p>
                </div>
            ) : (
                displayItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-200 dark:border-gray-600 shrink-0" />
                        <span className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate flex-1 leading-tight">
                            {item.title}
                        </span>
                        {(item.amount || item.unit) && (
                            <span className="text-[10px] font-bold text-gray-400 shrink-0">
                                {item.amount} {item.unit}
                            </span>
                        )}
                    </div>
                ))
            )}
            {activeItems.length > 8 && (
                <div className="text-[9px] font-bold text-gray-400 text-center pt-1">
                    + еще {activeItems.length - 8}
                </div>
            )}
        </div>
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none opacity-60" />
    </div>
  );
};

export default ShoppingWidget;
