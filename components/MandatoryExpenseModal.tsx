
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2 } from 'lucide-react';
import { MandatoryExpense, AppSettings } from '../types';

interface MandatoryExpenseModalProps {
  expense: MandatoryExpense | null;
  onClose: () => void;
  onSave: (expense: MandatoryExpense) => void;
  onDelete?: (id: string) => void;
  settings: AppSettings;
}

const MandatoryExpenseModal: React.FC<MandatoryExpenseModalProps> = ({ expense, onClose, onSave, onDelete, settings }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [remind, setRemind] = useState(false);

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setAmount(String(expense.amount));
      setDay(String(expense.day));
      setRemind(expense.remind);
    } else {
      setName('');
      setAmount('');
      setDay('');
      setRemind(false);
    }
  }, [expense]);

  const handleSave = () => {
    if (!name.trim() || !amount || !day) return;
    
    onSave({
      id: expense?.id || Date.now().toString(),
      name: name.trim(),
      amount: parseFloat(amount),
      day: parseInt(day),
      remind,
      keywords: expense?.keywords || []
    });
  };

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
        transition={{ type: 'spring', damping: 32, stiffness: 350 }}
        className="relative bg-[#F2F2F7] w-full max-w-lg md:rounded-[3.5rem] rounded-t-[3.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="bg-white p-7 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-xl font-black text-[#1C1C1E] tracking-tight">{expense ? 'Редактировать расход' : 'Новый обязательный расход'}</h2>
          <button onClick={onClose} className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 ios-btn-active">
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Название</label>
            <input 
              type="text" 
              placeholder="Например: Ипотека" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-white p-5 rounded-[2rem] font-bold text-lg text-[#1C1C1E] outline-none shadow-sm border border-white focus:border-blue-200 transition-colors"
              autoFocus
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Сумма</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  className="w-full bg-white p-5 rounded-[2rem] font-bold text-lg text-[#1C1C1E] outline-none shadow-sm border border-white focus:border-blue-200 transition-colors"
                />
            </div>
            <div className="w-1/3 space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">День</label>
                <input 
                  type="number" 
                  min="1" 
                  max="31"
                  placeholder="1" 
                  value={day} 
                  onChange={e => setDay(e.target.value)} 
                  className="w-full bg-white p-5 rounded-[2rem] font-bold text-lg text-[#1C1C1E] outline-none shadow-sm border border-white focus:border-blue-200 transition-colors text-center"
                />
            </div>
          </div>

          <div 
            onClick={() => setRemind(!remind)}
            className={`flex items-center justify-between p-5 rounded-[2rem] border transition-all cursor-pointer ${remind ? 'bg-blue-50 border-blue-200' : 'bg-white border-white shadow-sm'}`}
          >
             <span className={`font-bold text-sm ${remind ? 'text-blue-600' : 'text-gray-400'}`}>Напоминать в Telegram</span>
             <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${remind ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 bg-gray-100'}`}>
                {remind && <Check size={14} strokeWidth={3} />}
             </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleSave}
              className="w-full bg-blue-500 text-white font-black py-5 rounded-[2rem] shadow-xl text-xs uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              {expense ? 'Сохранить изменения' : 'Создать'}
            </button>
            {expense && onDelete && (
                <button 
                  type="button" 
                  onClick={() => onDelete(expense.id)}
                  className="w-full py-4 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 rounded-[2rem] transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Удалить
                </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default MandatoryExpenseModal;
