
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, FileText, ArrowDownRight, ArrowUpRight, Sparkles, ChevronDown, Plus } from 'lucide-react';
import { Transaction, AppSettings, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';
import { cleanMerchantName } from '../utils/categorizer'; 

interface ImportModalProps {
  preview: Omit<Transaction, 'id'>[];
  onConfirm: () => void;
  onCancel: () => void;
  settings: AppSettings;
  onUpdateItem: (index: number, updates: Partial<Transaction>) => void;
  onLearnRule: (rule: LearnedRule) => void;
  categories: Category[];
  onAddCategory: (category: Category) => void;
}

const PRESET_COLORS = [
  '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', 
  '#FF3B30', '#5856D6', '#00C7BE', '#FFCC00', '#1C1C1E'
];

const ImportModal: React.FC<ImportModalProps> = ({ preview, onConfirm, onCancel, settings, onUpdateItem, onLearnRule, categories, onAddCategory }) => {
  const [activeSelect, setActiveSelect] = useState<number | null>(null);
  
  // New Category State
  const [creatingForIndex, setCreatingForIndex] = useState<number | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  const totalExpense = preview
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = preview
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const handleSelectCategory = (idx: number, catId: string) => {
    const item = preview[idx];
    onUpdateItem(idx, { category: catId });
    
    // Only learn if it was previously unknown or different
    if (item.category === 'other' || catId !== item.category) {
       // Attempt to create a cleaner keyword for the rule
       // If the raw note contains unique IDs (digits at end), strip them
       let keywordToLearn = (item.rawNote || item.note).trim();
       
       // Heuristic: If it ends with >3 digits, remove them to make rule generic
       if (/\d{4,}$/.test(keywordToLearn)) {
           keywordToLearn = keywordToLearn.replace(/\d+$/, '').trim();
       }
       
       onLearnRule({
         id: Date.now().toString(),
         keyword: keywordToLearn,
         cleanName: item.note, // Use the cleaned visible name
         categoryId: catId
       });
    }
    setActiveSelect(null);
  };

  const handleCreateCategory = (idx: number) => {
    if (!newCatName.trim()) return;
    
    const newId = newCatName.trim().toLowerCase().replace(/\s+/g, '_');
    const newCategory: Category = {
        id: newId,
        label: newCatName.trim(),
        color: newCatColor,
        icon: 'ShoppingBag', // Default icon
        isCustom: true
    };

    // 1. Add to global list
    onAddCategory(newCategory);
    
    // 2. Select it for this item and learn rule
    handleSelectCategory(idx, newId);
    
    // Reset state
    setCreatingForIndex(null);
    setNewCatName('');
    setNewCatColor(PRESET_COLORS[0]);
  };

  const startCreating = (idx: number) => {
      setCreatingForIndex(idx);
      setNewCatName('');
      setNewCatColor(PRESET_COLORS[0]);
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
                        onClick={() => { setActiveSelect(activeSelect === i ? null : i); setCreatingForIndex(null); }}
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
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: 10 }} 
                          className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 min-w-[260px] max-h-64 overflow-y-auto no-scrollbar"
                        >
                           {creatingForIndex === i ? (
                               <div className="p-2 space-y-3">
                                   <div className="flex items-center justify-between">
                                       <span className="text-[10px] font-black text-gray-400 uppercase">Новая категория</span>
                                       <button onClick={() => setCreatingForIndex(null)} className="text-gray-300 hover:text-red-500"><X size={14}/></button>
                                   </div>
                                   <input 
                                      autoFocus
                                      type="text" 
                                      placeholder="Название..." 
                                      value={newCatName} 
                                      onChange={e => setNewCatName(e.target.value)}
                                      className="w-full bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold outline-none"
                                   />
                                   <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                      {PRESET_COLORS.map(c => (
                                          <button 
                                            key={c} 
                                            onClick={() => setNewCatColor(c)} 
                                            className={`w-5 h-5 rounded-full flex-shrink-0 transition-transform ${newCatColor === c ? 'scale-125 border-2 border-white shadow-sm' : ''}`} 
                                            style={{ backgroundColor: c }}
                                          />
                                      ))}
                                   </div>
                                   <button 
                                      onClick={() => handleCreateCategory(i)}
                                      className="w-full bg-blue-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                   >
                                      Создать и Выбрать
                                   </button>
                               </div>
                           ) : (
                               <>
                                   <button 
                                     onClick={() => startCreating(i)}
                                     className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors mb-2"
                                   >
                                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white"><Plus size={14} strokeWidth={3}/></div>
                                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Создать новую</span>
                                   </button>
                                   
                                   <div className="grid grid-cols-3 gap-2">
                                       {categories.filter(c => c.id !== 'other').map(cat => (
                                         <button 
                                           key={cat.id} 
                                           onClick={() => handleSelectCategory(i, cat.id)}
                                           className="flex flex-col items-center p-2 rounded-xl hover:bg-gray-50 transition-colors"
                                         >
                                           <span style={{ color: cat.color }}>{getIconById(cat.icon, 16)}</span>
                                           <span className="text-[8px] font-black uppercase mt-1 tracking-tighter text-center leading-tight">{cat.label}</span>
                                         </button>
                                       ))}
                                   </div>
                               </>
                           )}
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
