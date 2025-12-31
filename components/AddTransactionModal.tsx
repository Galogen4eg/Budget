
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Camera, Loader2, Image as ImageIcon, Trash2, Link, Info } from 'lucide-react';
import { Transaction, TransactionType, AppSettings, FamilyMember, Category, MandatoryExpense } from '../types';
import { MemberMarker } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { getIconById } from '../constants';

interface AddTransactionModalProps {
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id'>) => void;
  onDelete?: (id: string) => void;
  settings: AppSettings;
  members: FamilyMember[];
  categories: Category[];
  initialTransaction?: Transaction | null;
  onLinkMandatory?: (expenseId: string, keyword: string) => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ onClose, onSubmit, onDelete, settings, members, categories, initialTransaction, onLinkMandatory }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [memberId, setMemberId] = useState(members[0]?.id || '');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('other');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTransaction) {
        setAmount(String(Math.abs(initialTransaction.amount)));
        setType(initialTransaction.type);
        setMemberId(initialTransaction.memberId);
        setNote(initialTransaction.note);
        setSelectedCategory(initialTransaction.category);
    }
  }, [initialTransaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    onSubmit({ amount: Math.abs(Number(amount)), type, category: selectedCategory, memberId, note, date: initialTransaction ? initialTransaction.date : new Date().toISOString(), rawNote: initialTransaction?.rawNote || note });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-[#F2F2F7] w-full max-w-lg md:rounded-[3.5rem] rounded-t-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-white p-7 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-xl font-black text-[#1C1C1E]">{initialTransaction ? 'Редактирование' : 'Новая операция'}</h2>
          <button onClick={onClose} className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto no-scrollbar">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-white text-center relative overflow-hidden">
            <div className="flex justify-between items-start mb-4"><span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Сумма ({settings.currency})</span><button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-blue-50 text-blue-500 rounded-xl">{isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}</button></div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => {}} />
            <div className="flex items-center justify-center mb-6"><input autoFocus type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="text-6xl font-black bg-transparent text-center outline-none w-full placeholder:text-gray-200 tracking-tighter text-[#1C1C1E] tabular" /></div>
            <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100"><input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="На что потратили?" className="w-full bg-transparent outline-none text-sm font-bold text-[#1C1C1E] text-center" /></div>
          </div>

          <div className="flex bg-gray-200/40 p-1.5 rounded-[1.5rem] border border-gray-100">{(['expense', 'income'] as const).map((t) => (<button key={t} type="button" onClick={() => setType(t)} className={`flex-1 py-4 text-[11px] font-black rounded-xl transition-all uppercase ${type === t ? 'bg-white shadow-lg text-[#1C1C1E]' : 'text-gray-400'}`}>{t === 'expense' ? '💸 Расход' : '💰 Доход'}</button>))}</div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Категория</label>
            <div className="grid grid-cols-4 gap-3 px-1">
               {categories.map(cat => (
                  <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)} className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${selectedCategory === cat.id ? 'bg-white border-blue-200 shadow-sm scale-105' : 'bg-transparent border-transparent opacity-60'}`}>
                     <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>{getIconById(cat.icon, 20)}</div>
                     <span className="text-[9px] font-black uppercase text-[#1C1C1E] whitespace-nowrap tracking-tighter">{cat.label}</span>
                  </button>
               ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Кто платит?</label>
            <div className="flex flex-wrap gap-5 justify-center">{members.map((member) => (<button key={member.id} type="button" onClick={() => setMemberId(member.id)} className={`flex flex-col items-center gap-2 transition-all ${memberId === member.id ? 'scale-110 opacity-100' : 'grayscale opacity-40'}`}><MemberMarker member={member} size="md" /><span className={`text-[10px] font-black uppercase ${memberId === member.id ? 'text-blue-500' : 'text-gray-400'}`}>{member.name}</span></button>))}</div>
          </div>

          <button type="submit" className="w-full bg-blue-500 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-blue-500/40 text-lg uppercase tracking-widest ios-btn-active">Сохранить</button>
          {initialTransaction && onDelete && (
              <button type="button" onClick={() => onDelete(initialTransaction.id)} className="w-full py-3 text-red-500 font-bold uppercase text-[10px] tracking-widest">Удалить операцию</button>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default AddTransactionModal;
