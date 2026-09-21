
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, ShoppingBag } from 'lucide-react';
import TransactionHistory from './TransactionHistory';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';

interface DrillDownModalProps {
  categoryId: string;
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
  const category = categories.find(c => c.id === categoryId);
  const title = merchantName || category?.label || 'История';

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative bg-white dark:bg-[#1C1C1E] w-full max-w-4xl md:rounded-[28px] rounded-t-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[88vh] border border-surface-border dark:border-white/10"
      >
        {/* Header matching screenshot */}
        <div className="bg-white dark:bg-[#1C1C1E] px-6 py-5 flex justify-between items-center border-b border-surface-border dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3.5">
             <div className="w-10 h-10 rounded-2xl bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] flex items-center justify-center shadow-sm">
                 <ShoppingBag size={20} strokeWidth={2.4} />
             </div>
             <div>
                 <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block leading-none mb-1">
                   история операций
                 </span>
                 <h2 className="text-xl font-headline font-bold text-graphite dark:text-white tracking-tight leading-none">
                   {title}
                 </h2>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 md:p-6 bg-[#FAF8F5]/50 dark:bg-[#121214] overscroll-contain">
            <TransactionHistory 
                transactions={transactions}
                setTransactions={setTransactions}
                settings={settings}
                members={members}
                categories={categories}
                onLearnRule={onLearnRule}
                onApplyRuleToExisting={onApplyRuleToExisting}
                onEditTransaction={onEditTransaction}
                selectedCategoryId={categoryId}
                selectedMerchantName={merchantName}
                filterMode={selectedDate ? 'day' : 'month'}
                selectedDate={selectedDate}
                currentMonth={currentMonth}
                hideActiveFilterBadge={true} 
                hideTitle={true}
                hideFilters={false}
            />
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default DrillDownModal;
