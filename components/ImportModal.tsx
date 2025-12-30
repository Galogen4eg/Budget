
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, FileText, ArrowDownRight, ArrowUpRight, Sparkles, ChevronDown } from 'lucide-react';
import { Transaction, AppSettings, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';

interface ImportModalProps {
  preview: Omit<Transaction, 'id'>[];
  onConfirm: () => void;
  onCancel: () => void;
  settings: AppSettings;
  onUpdateItem: (index: number, updates: Partial<Transaction>) => void;
  onLearnRule: (rule: LearnedRule) => void;
  categories: Category[];
}

const ImportModal: React.FC<ImportModalProps> = ({ preview, onConfirm, onCancel, settings, onUpdateItem, onLearnRule, categories }) => {
  const [activeSelect, setActiveSelect] = useState<number | null>(null);

  const totalExpense = preview
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = preview
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const handleSelectCategory = (idx: number, catId: string) => {
    const item = preview[idx];
    onUpdateItem(idx, { category: catId });
    
    // Автоматическое предложение обучения при смене категории
    if (item.category === 'other' || catId !== item.category) {
       onLearnRule({
         id: Date.now().toString(),
         keyword: item.rawNote || item.note,
         cleanName: item.note,
         categoryId: catId
       });
    }
    setActiveSelect(null);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-[#F2F2F7] w-full max-w-lg rounded-[3rem] p-0 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="bg-white p-8 flex flex-col items-center text-center border-b border-gray-100">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="text-blue-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-[#1C1C1E]">Проверка выписки</h2>
          <p className="text-gray-400 mt-1 font-bold text-[10px] uppercase tracking-[0.2em]">Найдено {preview.length} новых операций</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-white shadow-sm">
              <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">Доходы</span>
              <span className="text-lg font-black text-green-500">+{totalIncome.toLocaleString()} {settings.currency}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-white shadow-sm">
              <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">Расходы</span>
              <span className="text-lg font-black text-red-500">-{totalExpense.toLocaleString()} {settings.currency}</span>
            </div>
          </div>

          <div className="space-y-3">
            {preview.map((t, i) => {
              const category = categories.find(c => c.id === t.category);
              const isUnrecognized = t.category === 'other';

              return (
                <div key={i} className={`bg-white p-6 rounded-[2.5rem] flex flex-col gap-3 border shadow-sm transition-all hover:bg-blue-50/10 ${isUnrecognized ? 'border-yellow-100 bg-yellow-50/10' : 'border-white'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${t.type === 'expense' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {t.type === 'expense' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-extrabold text-[#1C1C1E] leading-[1.4] break-words whitespace-normal">
                        {t.note || category?.label || 'Банковская операция'}
                      </p>
                      {isUnrecognized && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-yellow-600 uppercase mt-1">
                          <Sparkles size={8} /> Приложение не узнало это место
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-50 relative">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setActiveSelect(activeSelect === i ? null : i)}
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1 transition-all ${isUnrecognized ? 'bg-yellow-500 text-white' : 'bg-blue-50 text-blue-500'}`}
                      >
                        {category?.label || 'Выбрать...'}
                        <ChevronDown size={10} />
                      </button>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">
                        {new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[15px] font-black tabular-nums ${t.type === 'expense' ? 'text-[#1C1C1E]' : 'text-green-500'}`}>
                        {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <AnimatePresence>
                      {activeSelect === i && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 grid grid-cols-3 gap-2 min-w-[200px]">
                           {categories.filter(c => c.id !== 'other').map(cat => (
                             <button 
                               key={cat.id} 
                               onClick={() => handleSelectCategory(i, cat.id)}
                               className="flex flex-col items-center p-2 rounded-xl hover:bg-gray-50 transition-colors"
                             >
                               <span style={{ color: cat.color }}>{getIconById(cat.icon, 16)}</span>
                               <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">{cat.label}</span>
                             </button>
                           ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100 flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-5 px-6 bg-gray-100 text-gray-500 font-black rounded-2xl transition-all uppercase text-[10px] tracking-widest ios-btn-active"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-5 px-6 bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest ios-btn-active"
          >
            <Check size={18} strokeWidth={3} />
            Подтвердить
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ImportModal;
