
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import TransactionHistory from './TransactionHistory';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';

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
  const color = category?.color || '#1C1C1E';
  const icon = category?.icon || 'PieChart';

  // Lock body scroll when modal is open to prevent background scrolling
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
        className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg md:rounded-[3.5rem] rounded-t-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-white dark:bg-[#1C1C1E] p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3">
             <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
                style={{ backgroundColor: color }}
             >
                 {getIconById(icon, 20)}
             </div>
             <div>
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">История операций</span>
                 <h2 className="text-xl font-black text-[#1C1C1E] dark:text-white tracking-tight">{title}</h2>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] rounded-full flex items-center justify-center text-gray-500 dark:text-white ios-btn-active transition-colors">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Added 'overscroll-contain' to prevent scroll chaining to parent */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 overscroll-contain">
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
                hideActiveFilterBadge={true} // Cleaner look since modal header tells the context
                hideTitle={true}
            />
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default DrillDownModal;
