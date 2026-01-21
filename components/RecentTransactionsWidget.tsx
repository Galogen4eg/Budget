
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
    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2.5rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none h-full flex flex-col relative overflow-hidden group">
        {/* Header */}
        <div 
            className="flex justify-between items-center mb-2 relative z-10 cursor-pointer shrink-0"
            onClick={onViewAllClick}
        >
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl">
                    <History size={14} className="text-gray-500 dark:text-gray-300" />
                </div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    История
                </h3>
            </div>
            <div className="text-gray-300 dark:text-gray-500 hover:text-blue-500 transition-colors">
                <ChevronRight size={16} />
            </div>
        </div>

        {/* Content */}
        <div 
            className="flex-1 flex flex-col gap-1 min-h-0 relative z-10 overflow-y-auto no-scrollbar justify-start"
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
                            className="flex items-center justify-between p-1.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer active:scale-95 duration-200 group/item"
                        >
                            <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                                <div className="shrink-0">
                                    <BrandIcon 
                                        name={tx.note} 
                                        brandKey={brandKey}
                                        category={category}
                                        size="sm"
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-bold text-[#1C1C1E] dark:text-white truncate leading-tight">
                                        {tx.note || category?.label}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-medium text-gray-400 truncate">
                                            {new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                        </span>
                                        {member && (
                                            <>
                                                <span className="text-gray-200 dark:text-gray-600 text-[8px]">•</span>
                                                <div 
                                                    className="w-1.5 h-1.5 rounded-full" 
                                                    style={{ backgroundColor: member.color }}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <span className={`text-[11px] md:text-sm font-black tabular-nums shrink-0 whitespace-nowrap pl-2 ${tx.type === 'income' ? 'text-green-500' : 'text-[#1C1C1E] dark:text-white'}`}>
                                {settings.privacyMode ? '•••' : `${tx.type === 'expense' ? '-' : '+'}${tx.amount.toLocaleString()}`}
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
