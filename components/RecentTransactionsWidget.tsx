
import React from 'react';
import { Transaction, AppSettings, Category, FamilyMember } from '../types';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey } from '../utils/categorizer';
import { ChevronRight, History } from 'lucide-react';

interface RecentTransactionsWidgetProps {
  transactions: Transaction[];
  categories: Category[];
  members: FamilyMember[];
  settings: AppSettings;
  onTransactionClick: (tx: Transaction) => void;
  onViewAllClick: () => void;
}

const RecentTransactionsWidget: React.FC<RecentTransactionsWidgetProps> = ({ 
  transactions, 
  categories, 
  members,
  settings, 
  onTransactionClick,
  onViewAllClick
}) => {
  // Sort descending by date and take top 50 to allow scrolling
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2.2rem] border border-gray-100 dark:border-white/5 shadow-sm dark:shadow-none h-full flex flex-col relative overflow-hidden group">
        {/* Header */}
        <div 
            className="flex justify-between items-center mb-3 relative z-10 cursor-pointer shrink-0"
            onClick={onViewAllClick}
        >
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                    <History size={15} />
                </div>
                <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                    История операций
                </h3>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                <span>Все</span>
                <ChevronRight size={14} />
            </div>
        </div>

        {/* Content */}
        <div 
            className="flex-1 flex flex-col gap-1.5 min-h-0 relative z-10 overflow-y-auto no-scrollbar justify-start"
            style={{ 
                maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)', 
                WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' 
            }}
        >
            {recent.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center opacity-40">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Нет операций</p>
                </div>
            ) : (
                recent.map((tx) => {
                    const category = categories.find(c => c.id === tx.category);
                    const brandKey = getMerchantBrandKey(tx.note || '');
                    const member = members.find(m => m.id === tx.memberId);
                    
                    return (
                        <div 
                            key={tx.id}
                            onClick={() => onTransactionClick(tx)}
                            className="flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#2C2C2E]/80 transition-all cursor-pointer active:scale-98 duration-150 group/item border border-transparent hover:border-gray-100 dark:hover:border-white/5"
                        >
                            <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                                <div className="shrink-0">
                                    <BrandIcon 
                                        name={tx.note} 
                                        brandKey={brandKey}
                                        category={category}
                                        size="sm"
                                        className="rounded-xl shadow-xs"
                                    />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[12px] font-bold text-[#1C1C1E] dark:text-white truncate leading-tight">
                                        {tx.note || category?.label || 'Без описания'}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-medium text-gray-400 truncate">
                                            {new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                        </span>
                                        {member && (
                                            <>
                                                <span className="text-gray-300 dark:text-gray-600 text-[8px]">•</span>
                                                <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#2C2C2E] px-1.5 py-0.5 rounded-full">
                                                    <div 
                                                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                                                        style={{ backgroundColor: member.color }}
                                                    />
                                                    <span className="text-[9px] font-bold text-gray-500 dark:text-gray-300 truncate max-w-[60px]">{member.name}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <span className={`text-[12px] md:text-sm font-black tabular-nums shrink-0 whitespace-nowrap pl-2 ${tx.type === 'income' ? 'text-emerald-500' : 'text-[#1C1C1E] dark:text-white'}`}>
                                {settings.privacyMode ? '•••' : `${tx.type === 'expense' ? '-' : '+'}${tx.amount.toLocaleString()} ${settings.currency}`}
                            </span>
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default RecentTransactionsWidget;
