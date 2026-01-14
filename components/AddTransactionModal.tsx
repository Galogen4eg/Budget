import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Calendar, ArrowUp, ArrowDown, User, FileText, Sparkles, Mic, Loader2 } from 'lucide-react';
import { Transaction, AppSettings, FamilyMember, Category, LearnedRule } from '../types';
import { getIconById } from '../constants';
import { auth } from '../firebase';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'sonner';

interface AddTransactionModalProps {
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  settings: AppSettings;
  members: FamilyMember[];
  categories: Category[];
  initialTransaction?: Transaction | null;
  onLearnRule: (rule: LearnedRule) => void;
  onApplyRuleToExisting?: (rule: LearnedRule) => void;
  transactions: Transaction[];
  onDelete?: (id: string) => Promise<void>;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ 
  onClose, onSubmit, settings, members, categories, initialTransaction, 
  onLearnRule, onApplyRuleToExisting, transactions, onDelete 
}) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memberId, setMemberId] = useState(members[0]?.id || '');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Magic Input State
  const [magicInput, setMagicInput] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [showMagicInput, setShowMagicInput] = useState(false);

  useEffect(() => {
    if (initialTransaction) {
      setAmount(initialTransaction.amount.toString());
      setType(initialTransaction.type);
      setSelectedCategory(initialTransaction.category);
      setNote(initialTransaction.note);
      setDate(initialTransaction.date.split('T')[0]);
      setMemberId(initialTransaction.memberId);
    } else {
        if (members.length > 0) {
            const myMember = members.find(m => m.userId === auth.currentUser?.uid);
            if (myMember) setMemberId(myMember.id);
            else setMemberId(members[0].id);
        }
    }
  }, [initialTransaction, members]);

  const handleMagicParse = async () => {
      if (!magicInput.trim() || !process.env.API_KEY) return;
      setIsMagicLoading(true);
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Parse this expense text into JSON: "${magicInput}".
            Categories available: ${categories.map(c => c.id).join(', ')}.
            Current date: ${new Date().toISOString().split('T')[0]}.
            
            Return JSON: { "amount": number, "category": string (id from list or 'other'), "note": string, "type": "expense" | "income", "date": "YYYY-MM-DD" }.
            If date is mentioned (e.g. yesterday), calculate it. Default to today.
          `;
          
          const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });
          
          const data = JSON.parse(response.text || '{}');
          
          if (data.amount) setAmount(String(data.amount));
          if (data.category) setSelectedCategory(data.category);
          if (data.note) setNote(data.note);
          if (data.type) setType(data.type);
          if (data.date) setDate(data.date);
          
          setShowMagicInput(false);
          setMagicInput('');
          toast.success('Распознано!');
      } catch (e) {
          console.error(e);
          toast.error('Не удалось распознать текст');
      } finally {
          setIsMagicLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedCategory) return;

    const txData: Omit<Transaction, 'id'> = {
      amount: parseFloat(amount),
      type,
      category: selectedCategory,
      memberId,
      note: note.trim(),
      date: new Date(date).toISOString(),
      rawNote: initialTransaction?.rawNote || note.trim(), 
      userId: auth.currentUser?.uid
    };

    await onSubmit(txData);
    onClose();
  };

  const visibleCategories = showAllCategories ? categories : categories.slice(0, 12);

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="bg-white dark:bg-[#1C1C1E] p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5 shrink-0">
          <h3 className="text-xl font-black text-[#1C1C1E] dark:text-white">
            {initialTransaction ? 'Редактировать' : 'Новая операция'}
          </h3>
          <div className="flex gap-2">
              {!initialTransaction && process.env.API_KEY && (
                  <button 
                    onClick={() => setShowMagicInput(!showMagicInput)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showMagicInput ? 'bg-purple-500 text-white' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}
                  >
                      <Sparkles size={20} />
                  </button>
              )}
              <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors">
                <X size={20} strokeWidth={2.5} />
              </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            
            {/* Magic Input Section */}
            <AnimatePresence>
                {showMagicInput && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-[2rem] border border-purple-100 dark:border-purple-900/30">
                            <label className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest ml-2 mb-2 block">AI Ввод</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Например: Такси 500 вчера" 
                                    value={magicInput}
                                    onChange={(e) => setMagicInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleMagicParse())}
                                    className="flex-1 bg-white dark:bg-[#1C1C1E] p-3 rounded-xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white"
                                    autoFocus
                                />
                                <button 
                                    type="button"
                                    onClick={handleMagicParse}
                                    disabled={isMagicLoading || !magicInput.trim()}
                                    className="bg-purple-500 text-white p-3 rounded-xl disabled:opacity-50"
                                >
                                    {isMagicLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Amount & Type */}
            <div className="flex gap-4">
                <div className="flex-1 bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] shadow-sm relative">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest absolute top-4 left-5">Сумма</span>
                    <input 
                        type="number" 
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full h-full pt-4 bg-transparent text-3xl font-black text-[#1C1C1E] dark:text-white outline-none"
                        autoFocus={!initialTransaction && !showMagicInput}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <button 
                        type="button"
                        onClick={() => setType('expense')}
                        className={`w-16 h-14 rounded-2xl flex items-center justify-center transition-all ${type === 'expense' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white dark:bg-[#1C1C1E] text-gray-400'}`}
                    >
                        <ArrowDown size={24} strokeWidth={3} />
                    </button>
                    <button 
                        type="button"
                        onClick={() => setType('income')}
                        className={`w-16 h-14 rounded-2xl flex items-center justify-center transition-all ${type === 'income' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white dark:bg-[#1C1C1E] text-gray-400'}`}
                    >
                        <ArrowUp size={24} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Categories */}
            <div className="space-y-5">
                <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Категория</label>
                    {categories.length > 12 && !showAllCategories && (
                        <button 
                            type="button" 
                            onClick={() => setShowAllCategories(true)}
                            className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg"
                        >
                            Показать все
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 px-1 max-h-[320px] overflow-y-auto no-scrollbar md:max-h-none">
                {visibleCategories.map(cat => (
                    <button 
                        key={cat.id} 
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex flex-col items-center justify-center gap-1.5 aspect-square p-2 rounded-2xl border transition-all ${selectedCategory === cat.id ? 'bg-white dark:bg-[#1C1C1E] border-blue-200 dark:border-blue-800 shadow-sm scale-105 z-10' : 'bg-transparent border-transparent opacity-60 hover:bg-white/40 dark:hover:bg-white/5'}`}
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: cat.color }}>
                            {getIconById(cat.icon, 20)}
                        </div>
                        <span className="text-[10px] font-bold text-[#1C1C1E] dark:text-white whitespace-nowrap truncate w-full px-1 leading-none">{cat.label}</span>
                    </button>
                ))}
                
                {categories.length > 12 && !showAllCategories && (
                    <button 
                        type="button"
                        onClick={() => setShowAllCategories(true)}
                        className="flex flex-col items-center justify-center gap-1.5 aspect-square p-2 rounded-2xl border border-transparent opacity-60 hover:bg-white/40 dark:hover:bg-white/5"
                    >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 shrink-0">
                                <span className="text-[10px] font-black">+{categories.length - 12}</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap leading-none">Еще...</span>
                    </button>
                )}
                </div>
            </div>

            {/* Note & Date */}
            <div className="space-y-4">
                <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] flex items-center gap-3 border border-transparent focus-within:border-blue-500/20 transition-all shadow-sm">
                    <FileText size={20} className="text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Комментарий..." 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="flex-1 bg-transparent font-bold text-sm outline-none text-[#1C1C1E] dark:text-white"
                    />
                </div>

                <div className="flex gap-4">
                    <div className="flex-1 bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] flex items-center gap-3 shadow-sm">
                        <Calendar size={20} className="text-gray-400" />
                        <input 
                            type="date" 
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="flex-1 bg-transparent font-bold text-sm outline-none text-[#1C1C1E] dark:text-white"
                        />
                    </div>
                    
                    {members.length > 1 && (
                        <div className="flex-1 bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] flex items-center gap-3 shadow-sm overflow-hidden">
                            <User size={20} className="text-gray-400" />
                            <select 
                                value={memberId}
                                onChange={(e) => setMemberId(e.target.value)}
                                className="flex-1 bg-transparent font-bold text-sm outline-none text-[#1C1C1E] dark:text-white appearance-none"
                            >
                                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

        </form>

        <div className="p-6 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 flex flex-col gap-3">
            <button 
                onClick={handleSubmit}
                className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all ${type === 'expense' ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-black' : 'bg-green-500 text-white'}`}
            >
                <Check size={18} strokeWidth={3} />
                {initialTransaction ? 'Сохранить изменения' : 'Добавить операцию'}
            </button>
            
            {initialTransaction && onDelete && (
                <button 
                    onClick={() => onDelete(initialTransaction.id)}
                    className="w-full py-4 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[2rem] transition-colors flex items-center justify-center gap-2"
                >
                    <Trash2 size={16} /> Удалить
                </button>
            )}
        </div>
      </motion.div>
    </div>
  );
};

export default AddTransactionModal;