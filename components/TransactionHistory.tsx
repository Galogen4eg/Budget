
import React from 'react';
import { motion } from 'framer-motion';
import { Transaction, AppSettings, FamilyMember } from '../types';
import { CATEGORIES, getIconById } from '../constants';
import { Coffee } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  settings: AppSettings;
  members: FamilyMember[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, settings, members }) => {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Coffee size={24} className="text-gray-300" />
        </div>
        <p className="text-gray-400 font-bold text-center leading-relaxed">
          Пока тишина... 🍃<br/>
          <span className="text-xs font-medium">Самое время записать покупку!</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((tx, index) => {
        const category = CATEGORIES.find(c => c.id === tx.category);
        const member = members.find(m => m.id === tx.memberId);
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            key={tx.id} 
            className="group flex items-center gap-5 p-5 bg-white hover:bg-gray-50 rounded-[1.8rem] transition-all shadow-sm border border-transparent hover:border-blue-100"
          >
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg"
              style={{ 
                backgroundColor: category?.color,
                backgroundImage: `linear-gradient(135deg, ${category?.color}ee, ${category?.color})` 
              }}
            >
              {getIconById(category?.icon || 'Other', 24)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-0.5">
                <h4 className="font-bold text-[#1C1C1E]">{category?.label}</h4>
                <div className={`transition-all duration-500 ${settings.privacyMode ? 'blur-md' : ''}`}>
                  <span className={`text-lg font-black ${tx.type === 'income' ? 'text-green-500' : 'text-[#1C1C1E]'}`}>
                    {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded-full">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: member?.color || '#CCC' }} />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                    {member?.name || 'Некто'}
                  </span>
                </div>
                {tx.note && <span className="text-xs text-gray-400 truncate italic">«{tx.note}»</span>}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default TransactionHistory;
