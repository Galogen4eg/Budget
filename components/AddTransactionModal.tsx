
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
  const [showLinkMenu, setShowLinkMenu] = useState(false);
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
    const absAmount = Math.abs(Number(amount));
    
    onSubmit({
      amount: absAmount,
      type,
      category: selectedCategory, 
      memberId,
      note,
      date: initialTransaction ? initialTransaction.date : new Date().toISOString(),
      rawNote: initialTransaction?.rawNote || note,
    });
    onClose();
  };

  const handleDelete = () => {
    if (initialTransaction && onDelete) {
        onDelete(initialTransaction.id);
    }
  };

  const handleLink = (expenseId: string) => {
      if (onLinkMandatory && note) {
          onLinkMandatory(expenseId, note.trim());
          setShowLinkMenu(false);
          alert(`Транзакции с описанием "${note}" теперь будут считаться оплатой этого расхода.`);
      }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
           const result = reader.result as string;
           resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: file.type, data: base64Data } },
            { text: "Parse this receipt. Return JSON: { amount: number, date: 'YYYY-MM-DD', shopName: string, category: string (one of: food, restaurants, auto, transport, housing, shopping, health, utilities) }." }
          ]
        },
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.amount) setAmount(String(Math.abs(data.amount)));
      if (data.shopName) setNote(data.shopName);
      if (data.category && data.category !== 'other') {
         setSelectedCategory(data.category);
      }
      
    } catch (err) {
      alert("Не удалось распознать чек. Попробуйте вручную.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
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
            <h2 className="text-xl font-black text-[#1C1C1E] tracking-tight">{initialTransaction ? 'Редактирование' : 'Новая операция'}</h2>
          </div>
          <button onClick={onClose} className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 ios-btn-active">
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto no-scrollbar">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-white text-center relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
               <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Сумма ({settings.currency})</span>
               <div className="flex gap-2">
                   {initialTransaction && type === 'expense' && settings.mandatoryExpenses && settings.mandatoryExpenses.length > 0 && (
                       <button
                         type="button"
                         onClick={() => setShowLinkMenu(!showLinkMenu)}
                         className={`p-2 rounded-xl transition-colors ${showLinkMenu ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500'}`}
                         title="Это обязательный платеж?"
                       >
                           <Link size={18} />
                       </button>
                   )}
                   <button 
                     type="button" 
                     onClick={() => fileInputRef.current?.click()}
                     className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-colors"
                     title="Сканировать чек"
                   >
                     {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                   </button>
               </div>
               <input 
                 ref={fileInputRef} 
                 type="file" 
                 accept="image/*" 
                 capture="environment" 
                 className="hidden" 
                 onChange={handleReceiptUpload} 
               />
            </div>
            
            {showLinkMenu && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-4 bg-red-50 rounded-2xl p-2 border border-red-100 text-left">
                    <p className="text-[10px] font-bold text-red-400 uppercase mb-2 px-2">Связать с расходом:</p>
                    <div className="flex flex-wrap gap-2">
                        {settings.mandatoryExpenses?.map(exp => (
                            <button 
                                key={exp.id}
                                type="button"
                                onClick={() => handleLink(exp.id)}
                                className="bg-white px-3 py-2 rounded-xl text-[10px] font-bold text-[#1C1C1E] border border-red-100 hover:border-red-300"
                            >
                                {exp.name}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
            
            <div className="flex items-center justify-center mb-6">
               <input
                autoFocus
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(String(Math.abs(Number(e.target.value))))} 
                placeholder="0"
                className="text-6xl font-black bg-transparent text-center outline-none w-full placeholder:text-gray-200 tracking-tighter text-[#1C1C1E] tabular"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100">
               <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="На что потратили?"
                className="w-full bg-transparent outline-none text-sm font-bold text-[#1C1C1E] tracking-normal text-center"
              />
            </div>
          </div>

          {initialTransaction?.rawNote && initialTransaction.rawNote !== initialTransaction.note && (
             <div className="bg-gray-100/50 p-5 rounded-[2rem] border border-gray-200/50 space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                   <Info size={12}/> Исходное описание из выписки
                </div>
                <p className="text-[11px] font-medium text-gray-500 leading-relaxed italic px-1">
                   {initialTransaction.rawNote}
                </p>
             </div>
          )}

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
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Категория</label>
            <div className="flex flex-wrap gap-3 px-1 justify-center max-h-[200px] overflow-y-auto no-scrollbar md:max-h-none">
               {categories.map(cat => (
                  <button 
                    key={cat.id} 
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex flex-col items-center gap-1.5 min-w-[60px] p-2 rounded-2xl border transition-all ${selectedCategory === cat.id ? 'bg-white border-blue-200 shadow-sm scale-110' : 'bg-transparent border-transparent opacity-60'}`}
                  >
                     <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>
                        {getIconById(cat.icon, 18)}
                     </div>
                     <span className="text-[9px] font-bold text-[#1C1C1E] whitespace-nowrap">{cat.label}</span>
                  </button>
               ))}
            </div>
          </div>

          <div className="space-y-5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Кто платит?</label>
            <div className="flex flex-wrap gap-5 px-3 justify-center">
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

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-blue-500 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-blue-500/40 text-lg uppercase tracking-widest ios-btn-active disabled:opacity-50"
            >
              {isProcessing ? 'Обработка чека...' : (initialTransaction ? 'Сохранить изменения' : 'Сохранить')}
            </button>
            {initialTransaction && onDelete && (
                <button 
                  type="button" 
                  onClick={handleDelete}
                  className="w-full py-4 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 rounded-[2rem] transition-colors"
                >
                  Удалить операцию
                </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddTransactionModal;
