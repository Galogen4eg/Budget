
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Transaction, TransactionType, AppSettings, FamilyMember } from '../types';
import { MemberMarker } from '../App';

interface AddTransactionModalProps {
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id'>) => void;
  settings: AppSettings;
  members: FamilyMember[];
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ onClose, onSubmit, settings, members }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [memberId, setMemberId] = useState(members[0]?.id || '');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    onSubmit({
      amount: Number(amount),
      type,
      category: 'other',
      memberId,
      note,
      date: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-4">
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
        className="relative bg-[#F2F2F7] w-full max-w-lg md:rounded-[3.5rem] rounded-t-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-white p-7 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-[#1C1C1E] tracking-tight">Новая операция</h2>
          </div>
          <button onClick={onClose} className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 ios-btn-active">
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto no-scrollbar">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-white text-center relative overflow-hidden group">
            <span className="text-gray-400 text-[10px] font-black mb-4 block uppercase tracking-widest">Сумма ({settings.currency})</span>
            <div className="flex items-center justify-center">
               <input
                autoFocus
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-7xl font-black bg-transparent text-center outline-none w-full placeholder:text-gray-200 tracking-tighter text-[#1C1C1E] tabular"
              />
            </div>
          </div>

          <div className="flex bg-gray-200/40 p-1.5 rounded-[1.5rem] border border-gray-100">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-4 text-[11px] font-black rounded-xl transition-all uppercase tracking-wider ${
                  type === t 
                    ? 'bg-white shadow-lg text-[#1C1C1E]' 
                    : 'text-gray-400'
                }`}
              >
                {t === 'expense' ? '💸 Расход' : '💰 Доход'}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Кто платит?</label>
            <div className="flex flex-wrap gap-5 px-3">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setMemberId(member.id)}
                  className="flex flex-col items-center gap-4 relative ios-btn-active"
                >
                  <div className={`transition-all duration-300 ${memberId === member.id ? 'scale-110 opacity-100' : 'grayscale opacity-40'}`}>
                    <MemberMarker member={member} size="md" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${memberId === member.id ? 'text-blue-500' : 'text-gray-400'}`}>{member.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-white shadow-sm">
             <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="На что потратили? (например: Кофе)"
              className="w-full bg-transparent outline-none text-sm font-bold text-[#1C1C1E] tracking-normal"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-blue-500/40 text-lg uppercase tracking-widest ios-btn-active"
          >
            Сохранить
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AddTransactionModal;
