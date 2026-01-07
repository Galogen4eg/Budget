
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader2, Link, Info, Check, ScanText, Box, CheckCircle2, Circle, Sparkles, ChevronDown, Save } from 'lucide-react';
import { Transaction, TransactionType, AppSettings, FamilyMember, Category, PantryItem, LearnedRule } from '../types';
import { MemberMarker, getIconById } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { getSmartCategory } from '../utils/categorizer';

interface AddTransactionModalProps {
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id'>) => void;
  onDelete?: (id: string) => void;
  settings: AppSettings;
  members: FamilyMember[];
  categories: Category[];
  initialTransaction?: Transaction | null;
  onLinkMandatory?: (expenseId: string, keyword: string) => void;
  onSaveReceiptItems?: (items: PantryItem[]) => void;
  onLearnRule?: (rule: LearnedRule) => void;
  onApplyRuleToExisting?: (rule: LearnedRule) => void;
  transactions?: Transaction[]; // Added for frequency analysis
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ 
  onClose, onSubmit, onDelete, settings, members, categories, 
  initialTransaction, onLinkMandatory, onSaveReceiptItems,
  onLearnRule, onApplyRuleToExisting, transactions = []
}) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [memberId, setMemberId] = useState(members[0]?.id || '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:mm
  const [selectedCategory, setSelectedCategory] = useState<string>('other');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  
  // Category Expansion State
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  // Rule Learning State
  const [isRuleEnabled, setIsRuleEnabled] = useState(false);
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCleanName, setRuleCleanName] = useState('');

  // Receipt Items Logic
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [selectedScannedIndices, setSelectedScannedIndices] = useState<number[]>([]);
  const [showScannedItems, setShowScannedItems] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine top categories based on usage frequency
  const visibleCategories = useMemo(() => {
      const counts = transactions.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      const sorted = [...categories].sort((a, b) => {
          // Sort by frequency descending
          return (counts[b.id] || 0) - (counts[a.id] || 0);
      });

      if (showAllCategories) {
          return sorted;
      } else {
          const top5 = sorted.slice(0, 5);
          // If selected category is NOT in top 5, we still want to show it if it's currently selected?
          // But usually better to let user expand. We stick to simple Top 5 + Expand logic.
          // However, if editing an existing transaction with a rare category, it's better to verify.
          // For simplicity, we just show top 5 and the "More" button.
          return top5;
      }
  }, [categories, transactions, showAllCategories]);

  useEffect(() => {
    if (initialTransaction) {
        setAmount(String(Math.abs(initialTransaction.amount)));
        setType(initialTransaction.type);
        setMemberId(initialTransaction.memberId);
        setNote(initialTransaction.note);
        setSelectedCategory(initialTransaction.category);
        
        // Suggest rule keyword from rawNote or current note
        setRuleKeyword(initialTransaction.rawNote || initialTransaction.note);
        setRuleCleanName(initialTransaction.note);

        const d = new Date(initialTransaction.date);
        const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setDate(localIso);
    } else {
        const now = new Date();
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setDate(localIso);
    }
  }, [initialTransaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    const absAmount = Math.abs(Number(amount));
    const finalNote = isRuleEnabled && ruleCleanName.trim() ? ruleCleanName.trim() : note.trim();
    
    // 1. Create Rule if enabled
    if (isRuleEnabled && onLearnRule && ruleKeyword.trim()) {
        const newRule: LearnedRule = {
            id: Date.now().toString(),
            keyword: ruleKeyword.trim(),
            cleanName: ruleCleanName.trim() || note.trim() || 'Операция',
            categoryId: selectedCategory
        };
        onLearnRule(newRule);
    }

    // 2. Submit Transaction
    const dateObj = new Date(date);
    onSubmit({
      amount: absAmount,
      type,
      category: selectedCategory, 
      memberId,
      note: finalNote,
      date: dateObj.toISOString(),
      rawNote: initialTransaction?.rawNote || note,
    });
    
    // 3. Save pantry items
    if (onSaveReceiptItems && selectedScannedIndices.length > 0) {
        const pantryItems: PantryItem[] = selectedScannedIndices.map(idx => {
            const item = scannedItems[idx];
            return {
                id: Date.now().toString() + Math.random(),
                title: item.name,
                amount: String(item.amount || '1'),
                unit: item.unit || 'шт',
                category: item.category || 'grocery',
                addedDate: new Date().toISOString()
            };
        });
        onSaveReceiptItems(pantryItems);
    }

    onClose();
  };

  const handleDelete = () => {
    if (initialTransaction && onDelete) {
        if (window.confirm("Вы действительно хотите удалить эту операцию?")) {
            onDelete(initialTransaction.id);
        }
    }
  };

  const handleLink = (expenseId: string) => {
      if (onLinkMandatory && note) {
          onLinkMandatory(expenseId, note.trim());
          setShowLinkMenu(false);
      }
  };

  const toggleScannedItem = (idx: number) => {
      setSelectedScannedIndices(prev => 
          prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
      );
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!process.env.API_KEY) {
          alert("API Key не настроен. OCR недоступен.");
          return;
      }

      setIsScanning(true);
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
              model: "gemini-2.5-flash",
              contents: {
                  parts: [
                      { inlineData: { mimeType: file.type, data: base64Data } },
                      { text: `Analyze this receipt. Be extremely precise with the 'amount' field, distinguishing carefully between digits like 1 and 9, 3 and 8.
                        Return JSON with: 
                        1. merchant (string, name of place)
                        2. amount (number, total paid)
                        3. date (string, YYYY-MM-DD format)
                        4. items (array of objects: { name: string, category: string (one of: dairy, meat, produce, bakery, grocery, drinks, household, other), amount: number (default 1), unit: string (default 'шт') })
                        If uncertain, omit fields.` }
                  ]
              },
              config: { responseMimeType: "application/json" }
          });

          const jsonStr = response.text || "[]";
          const data = JSON.parse(jsonStr);

          if (data.amount) setAmount(String(data.amount));
          if (data.merchant) {
              setNote(data.merchant);
              setRuleCleanName(data.merchant);
              setRuleKeyword(data.merchant);
              const catId = getSmartCategory(data.merchant, [], categories);
              if (catId) setSelectedCategory(catId);
          }
          if (data.date) {
              const timePart = date.split('T')[1];
              setDate(`${data.date}T${timePart}`);
          }
          if (data.items && Array.isArray(data.items)) {
              setScannedItems(data.items);
              setSelectedScannedIndices(data.items.map((_: any, i: number) => i));
              setShowScannedItems(true);
          }

      } catch (err) {
          console.error("OCR Error:", err);
          alert("Не удалось распознать чек.");
      } finally {
          setIsScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
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
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg md:rounded-[3.5rem] rounded-t-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="bg-white dark:bg-[#1C1C1E] p-7 flex justify-between items-center border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-[#1C1C1E] dark:text-white tracking-tight">{initialTransaction ? 'Редактировать' : 'Новая операция'}</h2>
          </div>
          <button onClick={onClose} className="w-11 h-11 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] rounded-full flex items-center justify-center text-gray-500 dark:text-white ios-btn-active">
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] shadow-sm border border-white dark:border-white/5 text-center relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
               <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Сумма ({settings.currency})</span>
               <div className="flex gap-2">
                   {type === 'expense' && settings.mandatoryExpenses && settings.mandatoryExpenses.length > 0 && (
                       <button
                         type="button"
                         onClick={() => setShowLinkMenu(!showLinkMenu)}
                         className={`p-2 rounded-xl transition-colors ${showLinkMenu ? 'bg-red-50 text-red-500' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-400 hover:text-red-500'}`}
                         title="Привязать к обязательному расходу"
                       >
                           <Link size={18} />
                       </button>
                   )}
                   <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors relative overflow-hidden">
                     {isScanning ? <Loader2 size={18} className="animate-spin" /> : <ScanText size={18} />}
                   </button>
               </div>
               <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptUpload} />
            </div>
            
            {showLinkMenu && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-4 bg-red-50 dark:bg-red-900/20 rounded-2xl p-3 border border-red-100 dark:border-red-900/30 text-left">
                    <p className="text-[10px] font-bold text-red-400 uppercase mb-2 px-1">Это оплата за:</p>
                    <div className="flex flex-wrap gap-2">
                        {settings.mandatoryExpenses?.map(exp => (
                            <button 
                                key={exp.id}
                                type="button"
                                onClick={() => handleLink(exp.id)}
                                className="bg-white dark:bg-[#2C2C2E] px-3 py-2 rounded-xl text-[10px] font-bold text-[#1C1C1E] dark:text-white border border-red-100 dark:border-red-900/30 hover:border-red-300 flex items-center gap-1 shadow-sm"
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
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-6xl font-black bg-transparent text-center outline-none w-full placeholder:text-gray-200 dark:placeholder:text-gray-700 tracking-tighter text-[#1C1C1E] dark:text-white tabular"
              />
            </div>

            <div className="space-y-3">
               <input
                type="text"
                value={note}
                onChange={(e) => {
                    setNote(e.target.value);
                    if (!isRuleEnabled) {
                        setRuleCleanName(e.target.value);
                        setRuleKeyword(initialTransaction?.rawNote || e.target.value);
                    }
                }}
                placeholder="На что потратили?"
                className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-gray-100 dark:border-white/5 p-4 rounded-[2rem] outline-none text-sm font-bold text-[#1C1C1E] dark:text-white tracking-normal text-center"
              />
              <input 
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-gray-100 dark:border-white/5 p-2 rounded-xl outline-none text-xs font-bold text-gray-400 text-center"
              />
            </div>
          </div>

          {/* Rule Assignment Block */}
          {onLearnRule && (
              <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2.5rem] shadow-sm border border-white dark:border-white/5 space-y-4">
                  <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${isRuleEnabled ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-400'}`}>
                              <Sparkles size={14} />
                          </div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Запомнить категорию</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsRuleEnabled(!isRuleEnabled)}
                        className={`w-10 h-6 rounded-full p-1 transition-colors relative ${isRuleEnabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-[#2C2C2E]'}`}
                      >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isRuleEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                  </div>

                  <AnimatePresence>
                      {isRuleEnabled && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-3 pt-1"
                          >
                              <div className="bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-2xl space-y-2">
                                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Ключевое слово (из банка)</label>
                                  <input 
                                    type="text" 
                                    value={ruleKeyword}
                                    onChange={e => setRuleKeyword(e.target.value)}
                                    placeholder="Напр: UBER"
                                    className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl text-xs font-bold outline-none text-[#1C1C1E] dark:text-white"
                                  />
                              </div>
                              <div className="bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-2xl space-y-2">
                                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Новое название (как в истории)</label>
                                  <input 
                                    type="text" 
                                    value={ruleCleanName}
                                    onChange={e => setRuleCleanName(e.target.value)}
                                    placeholder="Напр: Такси"
                                    className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl text-xs font-bold outline-none text-[#1C1C1E] dark:text-white"
                                  />
                              </div>
                              <p className="text-[9px] text-gray-400 italic text-center px-2">Теперь все траты с "{ruleKeyword}" будут называться "{ruleCleanName}" и попадать в выбранную категорию.</p>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </div>
          )}

          {/* Scanned Items List */}
          <AnimatePresence>
              {showScannedItems && scannedItems.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2.5rem] shadow-sm border border-white dark:border-white/5 space-y-3">
                          <div className="flex justify-between items-center mb-1 px-2">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Box size={12}/> Товары из чека</span>
                              <span className="text-[10px] font-bold text-blue-500">{selectedScannedIndices.length} выбрано</span>
                          </div>
                          <div className="max-h-[200px] overflow-y-auto no-scrollbar space-y-2">
                              {scannedItems.map((item, idx) => (
                                  <div key={idx} onClick={() => toggleScannedItem(idx)} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl cursor-pointer">
                                      <div className="flex items-center gap-3 overflow-hidden">
                                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedScannedIndices.includes(idx) ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                              {selectedScannedIndices.includes(idx) && <Check size={12} strokeWidth={4}/>}
                                          </div>
                                          <div className="min-w-0">
                                              <p className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate">{item.name}</p>
                                              <p className="text-[9px] font-bold text-gray-400 uppercase">{item.amount} {item.unit}</p>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>

          <div className="flex bg-gray-200/40 dark:bg-[#2C2C2E] p-1.5 rounded-[1.5rem] border border-gray-100 dark:border-white/5 shrink-0">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-4 text-[11px] font-black rounded-xl transition-all uppercase tracking-wider ${
                  type === t 
                    ? 'bg-white dark:bg-[#1C1C1E] shadow-lg text-[#1C1C1E] dark:text-white' 
                    : 'text-gray-400'
                }`}
              >
                {t === 'expense' ? '💸 Расход' : '💰 Доход'}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between px-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Категория</label>
                {categories.length > 5 && !showAllCategories && (
                    <button 
                        type="button" 
                        onClick={() => setShowAllCategories(true)}
                        className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg"
                    >
                        Показать все
                    </button>
                )}
            </div>
            
            <div className="flex flex-wrap gap-3 px-1 justify-center max-h-[220px] overflow-y-auto no-scrollbar md:max-h-none">
               {visibleCategories.map(cat => (
                  <button 
                    key={cat.id} 
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex flex-col items-center gap-1.5 min-w-[60px] p-2 rounded-2xl border transition-all ${selectedCategory === cat.id ? 'bg-white dark:bg-[#1C1C1E] border-blue-200 dark:border-blue-800 shadow-sm scale-110' : 'bg-transparent border-transparent opacity-60'}`}
                  >
                     <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>
                        {getIconById(cat.icon, 18)}
                     </div>
                     <span className="text-[9px] font-bold text-[#1C1C1E] dark:text-white whitespace-nowrap">{cat.label}</span>
                  </button>
               ))}
               
               {categories.length > 5 && !showAllCategories && (
                   <button 
                     type="button"
                     onClick={() => setShowAllCategories(true)}
                     className="flex flex-col items-center gap-1.5 min-w-[60px] p-2 rounded-2xl border border-transparent opacity-60"
                   >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                            <span className="text-[10px] font-black">+{categories.length - 5}</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap">Еще...</span>
                   </button>
               )}
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

          <div className="flex flex-col gap-3 pt-4">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-blue-500 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-blue-500/40 text-lg uppercase tracking-widest ios-btn-active disabled:opacity-50"
            >
              {isProcessing ? 'Обработка...' : (initialTransaction ? 'Сохранить' : 'Готово')}
            </button>
            {initialTransaction && onDelete && (
                <button 
                  type="button" 
                  onClick={handleDelete}
                  className="w-full py-4 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[2rem] transition-colors"
                >
                  Удалить операцию
                </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
};

export default AddTransactionModal;
