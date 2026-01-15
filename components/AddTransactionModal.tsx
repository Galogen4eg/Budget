
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, X, Calendar, Tag, FileText, Repeat, ChevronRight, User, Check, Trash2, 
  BrainCircuit, Zap, Sparkles, Edit3, Layers, Link as LinkIcon, Type, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { Transaction, AppSettings, FamilyMember, Category, LearnedRule, MandatoryExpense } from '../types';
import { auth } from '../firebase';
import { getIconById, MemberMarker } from '../constants';

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

export default function AddTransactionModal({
  onClose, onSubmit, settings, members, categories, initialTransaction, onDelete, onLearnRule
}: AddTransactionModalProps) {
  // Состояния интерфейса
  const [currentView, setCurrentView] = useState<'main' | 'categories' | 'assignee' | 'monthly_binding'>('main');
  
  // Данные
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [note, setNote] = useState(''); 
  
  // AI Learning State
  const [isLearningEnabled, setIsLearningEnabled] = useState(false);
  const [cleanKeyword, setCleanKeyword] = useState(''); 
  const [renamedTitle, setRenamedTitle] = useState(''); 
  
  // Selection State
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'other');
  const [memberId, setMemberId] = useState(members[0]?.id || '');
  const [boundExpenseId, setBoundExpenseId] = useState<string>('');
  
  // Date State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Dynamic Input Width
  const spanRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(100);

  // Derived Data
  const selectedCategory = categories.find(c => c.id === categoryId) || categories[0];
  const selectedMember = members.find(m => m.id === memberId) || members[0];
  const boundExpense = settings.mandatoryExpenses?.find(e => e.id === boundExpenseId);
  const mandatoryExpenses = settings.mandatoryExpenses || [];

  // Initialization
  useEffect(() => {
    if (initialTransaction) {
      setAmount(initialTransaction.amount.toString());
      setType(initialTransaction.type);
      setNote(initialTransaction.rawNote || initialTransaction.note);
      setCategoryId(initialTransaction.category);
      setMemberId(initialTransaction.memberId);
      
      const d = new Date(initialTransaction.date);
      // Ensure date string is valid YYYY-MM-DD
      const dateStr = d.toISOString().split('T')[0];
      setDate(dateStr);
      
      setCleanKeyword(initialTransaction.rawNote || initialTransaction.note);
      setRenamedTitle(initialTransaction.note);
    } else {
        const myMember = members.find(m => m.userId === auth.currentUser?.uid);
        if (myMember) setMemberId(myMember.id);
        
        setCleanKeyword('');
        setRenamedTitle('');
    }
  }, [initialTransaction, members]);

  // Adjust input width based on content
  useEffect(() => {
    if (spanRef.current) {
      setInputWidth(spanRef.current.offsetWidth + 20); 
    }
  }, [amount]);

  const handleSave = async () => {
      const cleanAmountStr = amount.replace(/\s/g, '').replace(',', '.');
      const finalAmount = parseFloat(cleanAmountStr);
      
      if (isNaN(finalAmount) || finalAmount <= 0) {
          alert("Введите корректную сумму");
          return;
      }

      let finalDisplayName = renamedTitle.trim() || note.trim() || selectedCategory.label;

      if (boundExpenseId) {
          const expense = mandatoryExpenses.find(e => e.id === boundExpenseId);
          if (expense) {
              if (!finalDisplayName.toLowerCase().includes(expense.name.toLowerCase())) {
                  finalDisplayName = `${expense.name} ${finalDisplayName}`;
              }
          }
      }

      const txData: Omit<Transaction, 'id'> = {
          amount: finalAmount,
          type: type,
          category: categoryId,
          memberId: memberId,
          note: finalDisplayName,
          date: new Date(date).toISOString(),
          rawNote: note.trim() || finalDisplayName, 
          userId: auth.currentUser?.uid
      };

      if (isLearningEnabled && cleanKeyword.trim()) {
          const rule: LearnedRule = {
              id: Date.now().toString(),
              keyword: cleanKeyword.trim(),
              cleanName: finalDisplayName,
              categoryId: categoryId
          };
          onLearnRule(rule);
      }

      await onSubmit(txData);
      onClose();
  };

  const handleDeleteAction = async () => {
      if (!initialTransaction || !onDelete) return;
      
      if (window.confirm("Вы уверены, что хотите удалить эту операцию?")) {
          await onDelete(initialTransaction.id);
          // Parent component usually handles closing, but we call onClose just in case
          onClose(); 
      }
  };

  const formatAmountInput = (val: string) => {
      return val.replace(/[^0-9.,\s]/g, '');
  };

  const SubHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <div className="px-4 py-3 backdrop-blur-md border-b flex justify-between items-center sticky top-0 z-30 bg-[#F2F2F7]/90 dark:bg-[#1C1C1E]/90 border-gray-200 dark:border-white/10 shrink-0">
      <button onClick={onBack} className="text-[#007AFF] flex items-center text-[17px] active:opacity-50">
        <ChevronLeft size={22} className="-ml-1"/>
        <span>Назад</span>
      </button>
      <h1 className="text-[17px] font-semibold text-center flex-1 pr-16 text-black dark:text-white truncate">{title}</h1>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1200] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      />
      
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md h-[95vh] md:h-auto md:max-h-[85vh] bg-[#F2F2F7] dark:bg-black md:rounded-[2.5rem] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <AnimatePresence initial={false} mode="popLayout">
            {currentView === 'main' && (
                <motion.div 
                    key="main"
                    initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="absolute inset-0 flex flex-col bg-[#F2F2F7] dark:bg-black z-10 md:static md:h-auto"
                >
                    {/* Header */}
                    <div className="px-4 py-3 backdrop-blur-md border-b flex justify-between items-center sticky top-0 z-30 bg-[#F2F2F7]/90 dark:bg-[#1C1C1E]/90 border-gray-200 dark:border-white/10 shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="text-[#007AFF] text-[17px] active:opacity-50">Отменить</button>
                            {initialTransaction && onDelete && (
                                <button 
                                    onClick={handleDeleteAction}
                                    className="text-red-500 p-1 bg-red-50 dark:bg-red-900/20 rounded-lg active:scale-90 transition-transform"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                        <h1 className="text-[17px] font-semibold text-black dark:text-white absolute left-1/2 -translate-x-1/2 pointer-events-none">
                            {initialTransaction ? 'Правка' : 'Новая'}
                        </h1>
                        <button onClick={handleSave} className="text-[#007AFF] text-[17px] font-semibold active:opacity-50">Готово</button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pb-safe">
                        
                        {/* Amount Input Section */}
                        <div className="flex flex-col items-center py-8">
                            <div className="flex bg-gray-200 dark:bg-[#1C1C1E] p-1 rounded-xl mb-6">
                                <button 
                                    onClick={() => setType('expense')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${type === 'expense' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white' : 'text-gray-500'}`}
                                >
                                    <ArrowUpCircle size={14} className={type === 'expense' ? 'text-black dark:text-white' : 'text-gray-400'} />
                                    Расход
                                </button>
                                <button 
                                    onClick={() => setType('income')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${type === 'income' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-green-600' : 'text-gray-500'}`}
                                >
                                    <ArrowDownCircle size={14} className={type === 'income' ? 'text-green-600' : 'text-gray-400'} />
                                    Доход
                                </button>
                            </div>

                            <span className="text-gray-500 text-[13px] mb-2 uppercase tracking-wide font-medium">
                                {type === 'expense' ? 'Сумма расхода' : 'Сумма дохода'}
                            </span>
                            
                            <div className="flex items-center justify-center relative h-16 w-full">
                                <span ref={spanRef} className="absolute invisible whitespace-pre text-5xl font-black px-2">
                                    {amount || '0'}
                                </span>
                                
                                <div className="flex items-baseline justify-center relative" style={{ minWidth: '120px' }}>
                                    <input 
                                        type="text" 
                                        inputMode="decimal"
                                        value={amount}
                                        onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                                        placeholder="0"
                                        style={{ width: `${inputWidth}px` }}
                                        className={`bg-transparent text-5xl font-black text-center outline-none transition-all p-0 m-0 z-10 ${type === 'income' ? 'text-green-500 caret-green-500' : 'text-black dark:text-white caret-[#007AFF]'}`}
                                        autoFocus={!initialTransaction}
                                    />
                                    <span className="text-5xl font-bold text-gray-400 ml-1 pointer-events-none relative top-0">{settings.currency}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-4 space-y-6 pb-20">
                            
                            <div className="space-y-2">
                                <p className="px-4 text-[11px] text-gray-500 uppercase font-bold tracking-widest">Категоризация</p>
                                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
                                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                                        <div className="flex items-center">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors ${isLearningEnabled ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                                <BrainCircuit size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[15px] font-bold text-black dark:text-white">Авто-правило</p>
                                                <p className="text-[11px] text-gray-500">Запомнить эту категорию</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setIsLearningEnabled(!isLearningEnabled)}
                                            className={`w-[51px] h-[31px] rounded-full transition-colors duration-200 relative ${isLearningEnabled ? 'bg-[#32D74B]' : 'bg-gray-200 dark:bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md transform transition-transform duration-200 ${isLearningEnabled ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {isLearningEnabled && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                                            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-indigo-50/50 dark:bg-indigo-900/10 space-y-3">
                                                <div>
                                                    <p className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1 mb-1">
                                                        Если содержит (из SMS) <Zap size={10} fill="currentColor" />
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="text"
                                                            value={cleanKeyword}
                                                            onChange={(e) => setCleanKeyword(e.target.value)}
                                                            className="flex-1 bg-transparent text-[13px] font-bold outline-none text-black dark:text-white border-b border-indigo-200 dark:border-indigo-800 focus:border-indigo-500 py-1"
                                                            placeholder="Исходный текст..."
                                                        />
                                                        <Edit3 size={14} className="text-gray-400" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1 mb-1">
                                                        Новое название (в приложении) <Type size={10} />
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="text"
                                                            value={renamedTitle}
                                                            onChange={(e) => setRenamedTitle(e.target.value)}
                                                            className="flex-1 bg-transparent text-[15px] font-bold outline-none text-black dark:text-white border-b border-indigo-200 dark:border-indigo-800 focus:border-indigo-500 py-1"
                                                            placeholder="Например: Продукты"
                                                        />
                                                        <Edit3 size={14} className="text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    <button 
                                        onClick={() => setCurrentView('categories')}
                                        className="w-full flex items-center px-4 py-3 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white shadow-sm" style={{ backgroundColor: selectedCategory.color }}>
                                            {getIconById(selectedCategory.icon, 16)}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-[15px] font-semibold text-black dark:text-white">{selectedCategory.label}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-400">
                                            <span className="text-[13px]">Изменить</span>
                                            <ChevronRight size={16} />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="px-4 text-[11px] text-gray-500 uppercase font-bold tracking-widest">Детали</p>
                                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
                                    
                                    {mandatoryExpenses.length > 0 && type === 'expense' && (
                                        <button 
                                            onClick={() => setCurrentView('monthly_binding')}
                                            className="w-full flex items-center px-4 py-3.5 border-b border-gray-100 dark:border-white/5 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center mr-3 text-orange-500">
                                                <LinkIcon size={18} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-[15px] text-black dark:text-white">Привязать к платежу</p>
                                                <p className={`text-[13px] font-medium ${boundExpense ? 'text-orange-500' : 'text-gray-400'}`}>
                                                    {boundExpense?.name || 'Не выбрано'}
                                                </p>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-400" />
                                        </button>
                                    )}

                                    <button 
                                        onClick={() => setCurrentView('assignee')}
                                        className="w-full flex items-center px-4 py-3.5 border-b border-gray-100 dark:border-white/5 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors"
                                    >
                                        <div className="mr-3">
                                            <MemberMarker member={selectedMember} size="sm" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-[15px] text-black dark:text-white">Исполнитель</p>
                                            <p className="text-[13px] text-gray-500">{selectedMember.name}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-400" />
                                    </button>

                                    {/* Date Row - Fixed: Using div with pointer-events-none for children to allow input click */}
                                    <div className="relative flex items-center px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors w-full group">
                                        <div className="flex items-center flex-1 pointer-events-none z-10">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mr-3 text-blue-500">
                                                <Calendar size={18} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-[15px] text-black dark:text-white">Дата</p>
                                                <p className="text-[13px] text-gray-500">
                                                    {new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-400" />
                                        </div>
                                        
                                        <input 
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                                            style={{ appearance: 'none' }}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
                                <div className="flex items-start px-4 py-3.5">
                                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center mr-3 mt-0.5 text-green-500">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] text-gray-500 mb-1">Оригинал из банка / Заметка</p>
                                        <textarea 
                                            rows={2}
                                            className="w-full text-[15px] bg-transparent outline-none resize-none text-black dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                            placeholder="Полное описание операции..."
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {initialTransaction && onDelete && (
                                <button 
                                    onClick={handleDeleteAction}
                                    className="w-full bg-white dark:bg-[#1C1C1E] text-red-500 py-3.5 rounded-2xl font-medium active:bg-red-50 dark:active:bg-red-900/10 transition-colors shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} /> Удалить операцию
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {currentView === 'categories' && (
                <motion.div 
                    key="categories"
                    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="absolute inset-0 flex flex-col bg-[#F2F2F7] dark:bg-black z-20 md:static md:h-full"
                >
                    <SubHeader title="Категория" onBack={() => setCurrentView('main')} />
                    {/* Fixed scroll: Added pb-safe and removed min-h-0 */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar pb-safe">
                        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
                            {categories
                                .slice()
                                .sort((a, b) => a.label.localeCompare(b.label))
                                .map((cat, idx) => (
                                <button
                                    key={cat.id}
                                    onClick={() => { setCategoryId(cat.id); setCurrentView('main'); }}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors ${idx !== categories.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>
                                            {getIconById(cat.icon, 16)}
                                        </div>
                                        <span className={`text-[16px] truncate ${categoryId === cat.id ? 'text-[#007AFF] font-medium' : 'text-black dark:text-white'}`}>{cat.label}</span>
                                    </div>
                                    {categoryId === cat.id && <Check size={20} className="text-[#007AFF]" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {currentView === 'assignee' && (
                <motion.div 
                    key="assignee"
                    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="absolute inset-0 flex flex-col bg-[#F2F2F7] dark:bg-black z-20 md:static md:h-full"
                >
                    <SubHeader title="Исполнитель" onBack={() => setCurrentView('main')} />
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar pb-safe">
                        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
                            {members.map((mem, idx) => (
                                <button
                                    key={mem.id}
                                    onClick={() => { setMemberId(mem.id); setCurrentView('main'); }}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors ${idx !== members.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <MemberMarker member={mem} size="sm" />
                                        <div className="text-left">
                                            <div className={`text-[16px] truncate ${memberId === mem.id ? 'text-[#007AFF] font-medium' : 'text-black dark:text-white'}`}>{mem.name}</div>
                                            {mem.id === auth.currentUser?.uid && <div className="text-[11px] text-gray-400">Это вы</div>}
                                        </div>
                                    </div>
                                    {memberId === mem.id && <Check size={20} className="text-[#007AFF]" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {currentView === 'monthly_binding' && (
                <motion.div 
                    key="monthly"
                    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="absolute inset-0 flex flex-col bg-[#F2F2F7] dark:bg-black z-20 md:static md:h-full"
                >
                    <SubHeader title="Привязать к расходу" onBack={() => setCurrentView('main')} />
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar pb-safe">
                        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
                            <button
                                onClick={() => { setBoundExpenseId(''); setCurrentView('main'); }}
                                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors border-b border-gray-100 dark:border-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <X size={18} className="text-gray-500" />
                                    <span className="text-[16px] text-black dark:text-white">Не привязывать</span>
                                </div>
                                {boundExpenseId === '' && <Check size={20} className="text-[#007AFF]" />}
                            </button>
                            
                            {mandatoryExpenses.map((exp, idx) => (
                                <button
                                    key={exp.id}
                                    onClick={() => { 
                                        setBoundExpenseId(exp.id); 
                                        if(!note.includes(exp.name)) {
                                            setNote(prev => prev ? `${exp.name} ${prev}` : exp.name);
                                        }
                                        setCurrentView('main'); 
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors ${idx !== mandatoryExpenses.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                                            <Repeat size={16} />
                                        </div>
                                        <div className="text-left min-w-0">
                                            <div className={`text-[16px] truncate ${boundExpenseId === exp.id ? 'text-[#007AFF] font-medium' : 'text-black dark:text-white'}`}>{exp.name}</div>
                                            <div className="text-[11px] text-gray-400">{exp.amount.toLocaleString()} {settings.currency} • до {exp.day}-го</div>
                                        </div>
                                    </div>
                                    {boundExpenseId === exp.id && <Check size={20} className="text-[#007AFF]" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
