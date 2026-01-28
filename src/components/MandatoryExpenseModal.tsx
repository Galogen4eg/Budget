
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, CheckCircle2, Circle, Users2 } from 'lucide-react';
import { MandatoryExpense, AppSettings, FamilyMember } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { MemberMarker } from '../constants';

interface MandatoryExpenseModalProps {
  expense: MandatoryExpense | null;
  onClose: () => void;
  onSave: (expense: MandatoryExpense) => void;
  onDelete?: (id: string) => void;
  settings: AppSettings;
  members: FamilyMember[];
}

const MandatoryExpenseModal: React.FC<MandatoryExpenseModalProps> = ({ expense, onClose, onSave, onDelete, settings, members }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [remind, setRemind] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  
  const { updateSettings } = useData();
  const { user: firebaseUser } = useAuth();
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isManuallyPaid = expense ? (settings.manualPaidExpenses?.[currentMonthKey] || []).includes(expense.id) : false;

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setAmount(String(expense.amount));
      setDay(String(expense.day));
      setRemind(expense.remind);
      setMemberId(expense.memberId || null);
    } else {
      setName('');
      setAmount('');
      setDay('');
      setRemind(false);
      // Default to current user, but allow clearing. Safeguard members access.
      const myMember = (members || []).find(m => m.userId === firebaseUser?.uid);
      setMemberId(myMember?.id || null);
    }
  }, [expense, members, firebaseUser]);

  const handleSave = () => {
    if (!name.trim() || !amount || !day) return;
    
    onSave({
      id: expense?.id || Date.now().toString(),
      name: name.trim(),
      amount: parseFloat(amount),
      day: parseInt(day),
      remind,
      memberId: memberId || undefined, 
      keywords: expense?.keywords || []
    });
  };

  const toggleManualPaid = async () => {
      if (!expense) return;
      
      const currentManuals = settings.manualPaidExpenses || {};
      const monthIds = currentManuals[currentMonthKey] || [];
      
      let newMonthIds;
      if (isManuallyPaid) {
          newMonthIds = monthIds.filter(id => id !== expense.id);
      } else {
          newMonthIds = [...monthIds, expense.id];
      }

      const newSettings = { 
          ...settings, 
          manualPaidExpenses: {
              ...currentManuals,
              [currentMonthKey]: newMonthIds
          }
      };

      await updateSettings(newSettings);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      />
      
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 32, stiffness: 350 }}
        className="relative bg-[#F2F2F7] dark:bg-[#1C1C1E] w-full max-w-lg md:rounded-[3.5rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-[#2C2C2E] p-7 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
          <h2 className="text-xl font-black text-[#1C1C1E] dark:text-white tracking-tight">{expense ? 'Правка платежа' : 'Новый счет'}</h2>
          <button onClick={onClose} className="w-11 h-11 bg-gray-100 dark:bg-[#3A3A3C] rounded-full flex items-center justify-center text-gray-500 dark:text-white ios-btn-active">
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto no-scrollbar">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Название</label>
            <input 
              type="text" 
              placeholder="Напр: Ипотека" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-white dark:bg-[#2C2C2E] p-5 rounded-[2rem] font-bold text-lg text-[#1C1C1E] dark:text-white outline-none shadow-sm border border-gray-100 dark:border-white/5 focus:border-blue-400 transition-colors"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Сумма</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  className="w-full bg-white dark:bg-[#2C2C2E] p-5 rounded-[2rem] font-black text-lg text-[#1C1C1E] dark:text-white outline-none border border-gray-100 dark:border-white/5"
                />
            </div>
            <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">День месяца</label>
                <input 
                  type="number" 
                  min="1" 
                  max="31"
                  placeholder="1" 
                  value={day} 
                  onChange={e => setDay(e.target.value)} 
                  className="w-full bg-white dark:bg-[#2C2C2E] p-5 rounded-[2rem] font-black text-lg text-[#1C1C1E] dark:text-white outline-none border border-gray-100 dark:border-white/5 text-center"
                />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Кто платит?</label>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 -mx-2 px-2">
                {/* Option for Shared/All */}
                <button 
                    onClick={() => setMemberId(null)}
                    className={`flex items-center gap-2 p-2 pr-4 rounded-2xl border-2 transition-all shrink-0 ${!memberId ? 'bg-white dark:bg-[#3A3A3C] border-blue-500 shadow-md scale-105' : 'bg-transparent border-transparent opacity-60'}`}
                >
                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Users2 size={14} className="text-gray-500 dark:text-white" />
                    </div>
                    <span className={`text-xs font-bold ${!memberId ? 'text-[#1C1C1E] dark:text-white' : 'text-gray-500'}`}>Общий</span>
                </button>

                {(members || []).map(m => (
                    <button 
                        key={m.id}
                        onClick={() => setMemberId(m.id)}
                        className={`flex items-center gap-2 p-2 pr-4 rounded-2xl border-2 transition-all shrink-0 ${memberId === m.id ? 'bg-white dark:bg-[#3A3A3C] border-blue-500 shadow-md scale-105' : 'bg-transparent border-transparent opacity-60'}`}
                    >
                        <MemberMarker member={m} size="sm" />
                        <span className={`text-xs font-bold ${memberId === m.id ? 'text-[#1C1C1E] dark:text-white' : 'text-gray-500'}`}>{m.name}</span>
                    </button>
                ))}
            </div>
          </div>

          <div 
            onClick={() => setRemind(!remind)}
            className={`flex items-center justify-between p-5 rounded-[2rem] border transition-all cursor-pointer ${remind ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-[#2C2C2E] border-gray-100 dark:border-white/5'}`}
          >
             <div className="flex flex-col">
                <span className={`font-bold text-sm ${remind ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>Напоминать в Telegram</span>
                <span className="text-[10px] text-gray-400 font-medium">За 1 день до оплаты</span>
             </div>
             <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${remind ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800'}`}>
                {remind && <Check size={14} strokeWidth={3} />}
             </div>
          </div>

          {expense && (
              <div 
                onClick={toggleManualPaid}
                className={`flex items-center justify-between p-5 rounded-[2rem] border transition-all cursor-pointer ${isManuallyPaid ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-[#2C2C2E] border-gray-100 dark:border-white/5 shadow-sm'}`}
              >
                 <div className="flex flex-col">
                     <span className={`font-bold text-sm ${isManuallyPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>Оплачено в этом месяце</span>
                     <span className="text-[10px] text-gray-400 font-medium">{now.toLocaleString('ru', { month: 'long' })}</span>
                 </div>
                 <div className={`w-8 h-8 flex items-center justify-center`}>
                    {isManuallyPaid ? <CheckCircle2 size={32} className="text-green-500" fill="currentColor" /> : <Circle size={32} className="text-gray-200 dark:text-gray-700" strokeWidth={1.5} />}
                 </div>
              </div>
          )}

          <div className="flex flex-col gap-3 pt-4 pb-8">
            <button
              onClick={handleSave}
              className="w-full bg-blue-500 text-white font-black py-5 rounded-[2rem] shadow-xl text-xs uppercase tracking-widest active:scale-95 transition-transform"
            >
              {expense ? 'Сохранить изменения' : 'Создать счет'}
            </button>
            {expense && onDelete && (
                <button 
                  type="button" 
                  onClick={() => onDelete(expense.id)}
                  className="w-full py-4 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[2rem] transition-colors flex items-center justify-center gap-2"
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
