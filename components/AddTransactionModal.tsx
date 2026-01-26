
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

const SubHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
  <div className="px-4 py-3 backdrop-blur-md border-b flex justify-between items-center sticky top-0 z-30 bg-[#F2F2F7]/90 dark:bg-[#1C1C1E]/90 border-gray-200 dark:border-white/10 shrink-0">
    <button onClick={onBack} className="text-[#007AFF] flex items-center text-[17px] active:opacity-50">
      <ChevronLeft size={22} className="-ml-1"/>
      <span>Назад</span>
    </button>
    <h1 className="text-[17px] font-semibold text-center flex-1 pr-16 text-black dark:text-white truncate">{title}</h1>
  </div>
);

export default function AddTransactionModal({
  onClose, onSubmit, settings, members, categories, initialTransaction, onDelete, onLearnRule
}: AddTransactionModalProps) {
  // Состояния интерфейса
  const [currentView, setCurrentView] = useState<'main' | 'categories' | 'assignee' | 'monthly_binding'>('main');
  
  // Данные
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [note, setNote] = useState(''); 
  
  // AI Learning & Naming State
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
      setNote(initialTransaction.rawNote || '');
      setCategoryId(initialTransaction.category);
      setMemberId(initialTransaction.memberId);
      setBoundExpenseId(initialTransaction.linkedExpenseId || '');
      
      // Fix Timezone Issue: Construct date string manually from local date parts
      const d = new Date(initialTransaction.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
      
      setCleanKeyword(initialTransaction.rawNote || '');
      setRenamedTitle(initialTransaction.note);
    } else {
        const myMember = members.find(m => m.userId === auth.currentUser?.uid);
        if (myMember) setMemberId(myMember.id);
        
        setCleanKeyword('');
        setRenamedTitle('');
        setBoundExpenseId('');
        
        // Reset date to today
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setDate(`${year}-${month}-${day}`);
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

      // Priority: Renamed Title -> Note -> Category Label
      let finalDisplayName = renamedTitle.trim() || note.trim() || selectedCategory.label;

      if (boundExpenseId) {
          const expense = mandatoryExpenses.find(e => e.id === boundExpenseId);
          if (expense) {
              if (!finalDisplayName.toLowerCase().includes(expense.name.toLowerCase())) {
                  finalDisplayName = `${expense.name} ${finalDisplayName}`;
              }
          }
      }

      // Preserve time if editing today, otherwise default to current time or noon
      let dateObj = new Date(date);
      const now = new Date();
      
      // If the selected date is today, use current time (unless editing, then keep logic below)
      if (dateObj.toDateString() === now.toDateString() && !initialTransaction) {
          dateObj = now;
      } else if (initialTransaction) {
          // If editing, check if date changed
          const originalDate = new Date(initialTransaction.date);
          const isSameDay = originalDate.getFullYear() === dateObj.getFullYear() &&
                            originalDate.getMonth() === dateObj.getMonth() &&
                            originalDate.getDate() === dateObj.getDate();
          
          if (isSameDay) {
              // Keep original time
              dateObj = originalDate;
          } else {
              // Date changed: set to noon to avoid timezone shifts
              dateObj.setHours(12, 0, 0, 0);
          }
      } else {
          // New transaction, past/future date: set to noon
          dateObj.setHours(12, 0, 0, 0);
      }

      const txData: Omit<Transaction, 'id'> = {
          amount: finalAmount,
          type: type,
          category: categoryId,
          memberId: memberId,
          note: finalDisplayName,
          date: dateObj.toISOString(),
          rawNote: note.trim() || finalDisplayName, 
          userId: auth.currentUser?.uid,
          linkedExpenseId: boundExpenseId || undefined
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
          onClose(); 
      }
  };

  const formatAmountInput = (val: string) => {
      return val.replace(/[^0-9.,\s]/g, '');
  };

  const renderSmartNamingSection = () => (
      <div className="space-y-2 w-full">
          <p className="px-4 text-[11px] text-gray-500 uppercase font-bold tracking-widest">Название и Правила</p>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 p-4 space-y-4">
              {/* Transaction Name Input */}
              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Type size={10} /> Название в истории
                  </label>
                  <input 
                      type="text"
                      value={renamedTitle}
                      onChange={(e) => setRenamedTitle(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl font-bold text-sm text-[#1C1C1E] dark:text-white outline-none border border-transparent focus:border-blue-500 transition-all placeholder:text-gray-300"
                      placeholder={selectedCategory.label}
                  />
              </div>

              <div className="h-px bg-gray-100 dark:bg-white/5 w-full" />

              {/* Rule Toggle */}
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isLearningEnabled ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-400'}`}>
                          <Sparkles size={14} fill={isLearningEnabled ? "currentColor" : "none"} />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-[#1C1C1E] dark:text-white">Запомнить правило</p>
                          <p className="text-[9px] text-gray-400">Авто-категория для будущих операций</p>
                      </div>
                  </div>
                  <button 
                      onClick={() => setIsLearningEnabled(!isLearningEnabled)}
                      className={`w-10 h-6 rounded-full p-1 transition-colors relative ${isLearningEnabled ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                  >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isLearningEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
              </div>

              {/* Keyword Input (Conditional) */}
              <AnimatePresence>
                  {isLearningEnabled && (
                      <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                      >
                          <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-xl border border-purple-100 dark:border-purple-900/20 mt-2">
                              <label className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-1 block">Если содержит текст</label>
                              <input 
                                  type="text"
                                  value={cleanKeyword}
                                  onChange={(e) => setCleanKeyword(e.target.value)}
                                  className="w-full bg-white dark:bg-[#1C1C1E] p-2 rounded-lg text-xs font-bold text-[#1C1C1E] dark:text-white outline-none border border-transparent focus:border-purple-500"
                                  placeholder="Напр: Uber; Yandex..."
                              />
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
      </div>
  );

  const renderCategorySection = () => (
    <div className="space-y-2 w-full">
        <p className="px-4 text-[11px] text-gray-500 uppercase font-bold tracking-widest">Категория</p>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
            <button 
                onClick={() => setCurrentView('categories')}
                className="w-full flex items-center px-4 py-3 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors"
            >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 text-white shadow-sm transition-transform hover:scale-105" style={{ backgroundColor: selectedCategory.color }}>
                    {getIconById(selectedCategory.icon, 20)}
                </div>
                <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-black dark:text-white">{selectedCategory.label}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Нажмите, чтобы изменить</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
            </button>
        </div>
    </div>
  );

  const renderDetailsSection = () => (
    <div className="space-y-2 w-full">
        <p className="px-4 text-[11px] text-gray-500 uppercase font-bold tracking-widest">Детали</p>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5">
            
            {mandatoryExpenses.length > 0 && type === 'expense' && (
                <button 
                    onClick={() => setCurrentView('monthly_binding')}
                    className="w-full flex items-center px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors hover:bg-gray-50 dark:hover:bg-[#2C2C2E]"
                >
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center mr-3 text-orange-500">
                        <LinkIcon size={16} />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-black dark:text-white">Привязать к платежу</p>
                        <p className={`text-xs font-bold ${boundExpense ? 'text-orange-500' : 'text-gray-400'}`}>
                            {boundExpense?.name || 'Не выбрано'}
                        </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                </button>
            )}

            <button 
                onClick={() => setCurrentView('assignee')}
                className="w-full flex items-center px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors hover:bg-gray-50 dark:hover:bg-[#2C2C2E]"
            >
                <div className="mr-3">
                    <MemberMarker member={selectedMember} size="sm" />
                </div>
                <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-black dark:text-white">Исполнитель</p>
                    <p className="text-xs text-gray-500 font-bold">{selectedMember.name}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
            </button>

            <div className="relative flex items-center px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors hover:bg-gray-50 dark:hover:bg-[#2C2C2E] group cursor-pointer">
                <div className="flex items-center flex-1 pointer-events-none z-10">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mr-3 text-blue-500">
                        <Calendar size={16} />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-black dark:text-white">Дата</p>
                        <p className="text-xs text-gray-500 font-bold">
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
  );

  return createPortal(
    <div className="fixed inset-0 z-[3000] flex items-end md:items-center justify-center p-0 md:p-4">
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
        className="relative w-full max-w-md md:max-w-5xl h-[95vh] md:h-[85vh] bg-[#F2F2F7] dark:bg-black md:rounded-[2.5rem] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <AnimatePresence initial={false} mode="popLayout">
            {currentView === 'main' && (
                <motion.div 
                    key="main"
                    initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="absolute inset-0 flex flex-col bg-[#F2F2F7] dark:bg-black z-10 md:static md:h-full"
                >
                    {/* Header */}
                    <div className="px-4 py-3 md:px-8 md:py-6 backdrop-blur-md border-b flex justify-between items-center sticky top-0 z-30 bg-[#F2F2F7]/90 dark:bg-[#1C1C1E]/90 border-gray-200 dark:border-white/10 shrink-0">
                        {/* Mobile Controls */}
                        <div className="md:hidden flex items-center justify-between w-full">
                            <button onClick={onClose} className="text-[#007AFF] text-[17px] active:opacity-50">Отменить</button>
                            <h1 className="text-[17px] font-semibold text-black dark:text-white">
                                {initialTransaction ? 'Правка' : 'Новая'}
                            </h1>
                            <button onClick={handleSave} className="text-[#007AFF] text-[17px] font-semibold active:opacity-50">Готово</button>
                        </div>

                        {/* Desktop Controls */}
                        <div className="hidden md:flex justify-between items-center w-full">
                            <h1 className="text-2xl font-black text-black dark:text-white">
                                {initialTransaction ? 'Редактирование' : 'Новая операция'}
                            </h1>
                            <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] rounded-full text-gray-500 dark:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pb-safe md:overflow-hidden">
                        <div className="flex flex-col md:grid md:grid-cols-2 md:h-full">
                            
                            {/* Left Column (Desktop) / Top (Mobile) */}
                            <div className="flex flex-col items-center py-6 md:px-8 md:py-8 md:overflow-y-auto no-scrollbar h-full md:border-r border-gray-200 dark:border-white/5 md:justify-start space-y-6">
                                {/* Amount & Type Switcher */}
                                <div className="flex flex-col items-center w-full">
                                    <div className="flex bg-gray-200 dark:bg-[#1C1C1E] p-1 rounded-xl mb-4">
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

                                    <span className="text-gray-500 text-[13px] mb-1 uppercase tracking-wide font-medium">
                                        {type === 'expense' ? 'Сумма расхода' : 'Сумма дохода'}
                                    </span>
                                    
                                    <div className="flex items-center justify-center relative h-20 w-full mb-2">
                                        <span ref={spanRef} className="absolute invisible whitespace-pre text-6xl font-black px-2">
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
                                                className={`bg-transparent text-6xl font-black text-center outline-none transition-all p-0 m-0 z-10 ${type === 'income' ? 'text-green-500 caret-green-500' : 'text-black dark:text-white caret-[#007AFF]'}`}
                                                autoFocus={!initialTransaction}
                                            />
                                            <span className="text-3xl font-bold text-gray-400 ml-2 pointer-events-none relative -top-1">{settings.currency}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Desktop Components (Calling Functions) */}
                                <div className="hidden md:block w-full">
                                    {renderSmartNamingSection()}
                                </div>

                                <div className="hidden md:block w-full">
                                    {renderDetailsSection()}
                                </div>

                                <div className="hidden md:block w-full">
                                    {renderCategorySection()}
                                </div>
                            </div>

                            {/* Right Column (Desktop) / Bottom (Mobile) */}
                            <div className="px-4 space-y-6 pb-20 md:p-8 md:overflow-y-auto no-scrollbar flex flex-col h-full bg-white md:bg-transparent dark:bg-black">
                                {/* Mobile Components (Calling Functions) */}
                                <div className="md:hidden space-y-6 mt-4">
                                    {renderSmartNamingSection()}
                                    {renderCategorySection()}
                                    {renderDetailsSection()}
                                </div>

                                <div className="flex-1 flex flex-col space-y-6 h-full mt-4 md:mt-0">
                                    {/* Raw Note / Comment */}
                                    <div className="space-y-2 flex-1 flex flex-col min-h-[160px]">
                                        <p className="px-4 text-[11px] text-gray-500 uppercase font-bold tracking-widest md:px-0">Заметка / Оригинал</p>
                                        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 flex-1 flex flex-col">
                                            <div className="flex items-start px-4 py-3.5 h-full">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center mr-3 mt-0.5 text-gray-500 shrink-0">
                                                    <FileText size={16} />
                                                </div>
                                                <textarea 
                                                    className="w-full h-full text-[15px] bg-transparent outline-none resize-none text-black dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 font-medium"
                                                    placeholder="Дополнительные детали или оригинальный текст из банка..."
                                                    value={note}
                                                    onChange={(e) => setNote(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Actions Footer */}
                                <div className="hidden md:flex flex-col gap-3 mt-auto pt-4 shrink-0">
                                    <button 
                                        onClick={handleSave}
                                        className="w-full bg-[#007AFF] hover:bg-blue-600 text-white py-4 rounded-2xl font-black text-sm active:scale-[0.98] transition-all shadow-lg shadow-blue-500/30 uppercase tracking-wide"
                                    >
                                        {initialTransaction ? 'Сохранить изменения' : 'Добавить операцию'}
                                    </button>
                                    
                                    {initialTransaction && onDelete && (
                                        <button 
                                            onClick={handleDeleteAction}
                                            className="w-full bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 py-4 rounded-2xl font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
                                        >
                                            <Trash2 size={16} /> Удалить операцию
                                        </button>
                                    )}
                                </div>

                                {/* Mobile Delete Button */}
                                {initialTransaction && onDelete && (
                                    <button 
                                        onClick={handleDeleteAction}
                                        className="w-full bg-white dark:bg-[#1C1C1E] text-red-500 py-3.5 rounded-2xl font-medium active:bg-red-50 dark:active:bg-red-900/10 transition-colors shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center gap-2 md:hidden"
                                    >
                                        <Trash2 size={18} /> Удалить операцию
                                    </button>
                                )}
                            </div>
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
                                        if(!note.includes(exp.name) && !renamedTitle.includes(exp.name)) {
                                            setRenamedTitle(exp.name); // Auto-name based on expense
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
    </div>,
    document.body
  );
}
