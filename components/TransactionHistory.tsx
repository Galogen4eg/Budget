
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';
import { Coffee, Sparkles, X, Check, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import { getMerchantLogo } from '../utils/categorizer';

interface TransactionHistoryProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onLearnRule: (rule: LearnedRule) => void;
  categories: Category[];
  filterMode?: 'day' | 'month';
  onEditTransaction?: (tx: Transaction) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, setTransactions, settings, members, onLearnRule, categories, filterMode = 'month', onEditTransaction }) => {
  const [learningTx, setLearningTx] = useState<Transaction | null>(null);
  const [learningCat, setLearningCat] = useState('food');
  const [learningName, setLearningName] = useState('');

  // Вычисляем итоги для отображения в футере
  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, total: income - expense };
  }, [transactions]);

  const handleStartLearning = (tx: Transaction) => {
    setLearningTx(tx);
    setLearningName(tx.note || '');
    setLearningCat(tx.category === 'other' ? 'food' : tx.category);
  };

  const handleFinishLearning = () => {
    if (!learningTx || !learningName.trim()) return;

    // Генерируем ключевое слово (берем rawNote или текущий note)
    const keyword = learningTx.rawNote || learningTx.note;
    
    const newRule: LearnedRule = {
      id: Date.now().toString(),
      keyword: keyword,
      cleanName: learningName.trim(),
      categoryId: learningCat
    };

    onLearnRule(newRule);
    
    // Обновляем текущую транзакцию
    setTransactions(prev => prev.map(t => t.id === learningTx.id ? { ...t, category: learningCat, note: learningName.trim() } : t));
    
    setLearningTx(null);
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-sm">
        <p className="text-gray-400 font-bold text-center leading-relaxed text-sm uppercase tracking-widest">
          В этот {filterMode === 'day' ? 'день' : 'период'}<br/>операций не было
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
      {transactions.map((tx, index) => {
        const category = categories.find(c => c.id === tx.category);
        const member = members.find(m => m.id === tx.memberId);
        
        const displayTitle = tx.note || category?.label || 'Операция';
        const merchantLogo = getMerchantLogo(displayTitle);
        const isUnrecognized = tx.category === 'other';

        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            key={tx.id} 
            onClick={() => onEditTransaction && onEditTransaction(tx)}
            className={`group flex items-center gap-5 p-5 bg-white hover:bg-gray-50 rounded-[1.8rem] transition-all shadow-sm border border-transparent cursor-pointer ios-btn-active ${isUnrecognized ? 'border-yellow-100/50 bg-yellow-50/10' : 'hover:border-blue-100'}`}
          >
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg relative overflow-hidden"
              style={{ 
                backgroundColor: category?.color,
                backgroundImage: `linear-gradient(135deg, ${category?.color}ee, ${category?.color})` 
              }}
            >
              {merchantLogo ? (
                <span className="text-2xl relative z-10">{merchantLogo}</span>
              ) : (
                <div className="relative z-10">
                  {getIconById(category?.icon || 'Other', 24)}
                </div>
              )}
              <div className="absolute inset-0 bg-black/5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-[#1C1C1E] break-words whitespace-normal leading-tight flex-1 mr-2 text-[15px]">
                  {displayTitle}
                </h4>
                <div className={`transition-all duration-500 flex-shrink-0 ${settings.privacyMode ? 'blur-md' : ''}`}>
                  <span className={`text-lg font-black tabular-nums ${tx.type === 'income' ? 'text-green-500' : 'text-[#1C1C1E]'}`}>
                    {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded-full">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: member?.color || '#CCC' }} />
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">
                      {member?.name || 'Некто'}
                    </span>
                  </div>
                  
                  <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                    {category?.label}
                  </span>
                </div>

                {isUnrecognized && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleStartLearning(tx); }}
                    className="flex items-center gap-1 text-[9px] font-black text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full uppercase tracking-tighter hover:bg-yellow-200 transition-colors"
                  >
                    <Sparkles size={10} /> Обучить
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
      </div>

      {/* Footer Summary Row */}
      <div className="bg-[#1C1C1E] rounded-[2.2rem] p-6 text-white shadow-xl mt-6 flex justify-between items-center relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-[#1C1C1E] opacity-50 pointer-events-none" />
         
         <div className="relative z-10 flex gap-6">
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><ArrowUpRight size={10} className="text-green-500"/> Доход</span>
               <span className={`text-lg font-black text-green-400 tabular-nums ${settings.privacyMode ? 'blur-sm' : ''}`}>+{summary.income.toLocaleString()}</span>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><ArrowDownRight size={10} className="text-red-500"/> Расход</span>
               <span className={`text-lg font-black text-white tabular-nums ${settings.privacyMode ? 'blur-sm' : ''}`}>{summary.expense.toLocaleString()}</span>
            </div>
         </div>

         <div className="relative z-10 text-right">
             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">Итого за {filterMode === 'day' ? 'день' : 'период'} <Wallet size={10} /></span>
             <span className={`text-2xl font-black tabular-nums ${settings.privacyMode ? 'blur-md' : ''} ${summary.total >= 0 ? 'text-white' : 'text-red-400'}`}>
                {summary.total > 0 ? '+' : ''}{summary.total.toLocaleString()} {settings.currency}
             </span>
         </div>
      </div>

      <AnimatePresence>
        {learningTx && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLearningTx(null)} className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-3xl flex items-center justify-center mx-auto mb-2">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-xl font-black text-[#1C1C1E]">Обучение мерчанта</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">"{learningTx.rawNote || learningTx.note}"</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Как называть?</label>
                  <input 
                    type="text" 
                    value={learningName}
                    onChange={(e) => setLearningName(e.target.value)}
                    placeholder="Напр. Любимая кофейня"
                    className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm outline-none border border-transparent focus:border-yellow-200 transition-all text-[#1C1C1E]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Категория</label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.filter(c => c.id !== 'other').slice(0, 6).map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => setLearningCat(cat.id)}
                        className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all border ${learningCat === cat.id ? 'bg-blue-50 border-blue-200 scale-105' : 'bg-gray-50 border-transparent text-gray-400'}`}
                      >
                        <span style={{ color: learningCat === cat.id ? cat.color : undefined }}>{getIconById(cat.icon, 18)}</span>
                        <span className="text-[8px] font-black uppercase tracking-tighter">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setLearningTx(null)} className="flex-1 py-4 bg-gray-100 text-gray-400 font-black rounded-2xl uppercase text-[10px] tracking-widest">Отмена</button>
                <button onClick={handleFinishLearning} className="flex-1 py-4 bg-yellow-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2">
                  <Check size={16} strokeWidth={3} /> Запомнить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionHistory;
