import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, X, Calendar, FileText, Repeat, ChevronRight, Check, Trash2, 
  Sparkles, Link as LinkIcon, Plus, Send
} from 'lucide-react';
import { Transaction, AppSettings, FamilyMember, Category, LearnedRule } from '../types';
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

const SubHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <div className="px-5 py-4 border-b flex justify-between items-center sticky top-0 z-30 bg-[#FAF8F5]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border-surface-border dark:border-white/10 shrink-0">
    <button 
      type="button"
      onClick={onBack} 
      className="text-primary dark:text-green-400 flex items-center text-sm font-semibold hover:opacity-80 active:scale-95 transition"
    >
      <ChevronLeft size={20} className="-ml-1 mr-0.5" />
      <span>Назад</span>
    </button>
    <h2 className="text-base font-headline font-bold text-center flex-1 pr-12 text-graphite dark:text-white truncate">
      {title}
    </h2>
  </div>
);

export default function AddTransactionModal({
  onClose, onSubmit, settings, members, categories, initialTransaction, onDelete, onLearnRule
}: AddTransactionModalProps) {
  // Navigation State
  const [currentView, setCurrentView] = useState<'main' | 'categories' | 'assignee' | 'monthly_binding'>('main');
  
  // Form State
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
  
  // Date & Telegram Notification State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notifyTelegram, setNotifyTelegram] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Dynamic Input Width for Amount
  const spanRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(60);

  // Derived Data
  const selectedCategory = categories.find(c => c.id === categoryId) || categories[0] || { id: 'other', label: 'Другое', color: '#4A7C59', icon: 'tag' };
  const selectedMember = members.find(m => m.id === memberId) || members[0] || { id: 'default', name: 'Гена', color: '#4A7C59' };
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
      
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
    }
  }, [initialTransaction, members]);

  // Adjust input width dynamically based on content
  useEffect(() => {
    if (spanRef.current) {
      setInputWidth(Math.max(spanRef.current.offsetWidth + 12, 45)); 
    }
  }, [amount]);

  const formatAmountInput = (val: string) => {
    return val.replace(/[^0-9.,\s]/g, '');
  };

  const handleSave = async () => {
    setValidationError(null);
    const cleanAmountStr = amount.replace(/\s/g, '').replace(',', '.');
    const finalAmount = parseFloat(cleanAmountStr);
    
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setValidationError("Пожалуйста, укажите сумму операции больше 0");
      return;
    }

    let finalDisplayName = renamedTitle.trim() || note.trim() || selectedCategory.label;

    if (boundExpenseId) {
      const expense = mandatoryExpenses.find(e => e.id === boundExpenseId);
      if (expense && !finalDisplayName.toLowerCase().includes(expense.name.toLowerCase())) {
        finalDisplayName = `${expense.name} ${finalDisplayName}`;
      }
    }

    let dateObj = new Date(date);
    const now = new Date();
    
    if (dateObj.toDateString() === now.toDateString() && !initialTransaction) {
      dateObj = now;
    } else if (initialTransaction) {
      const originalDate = new Date(initialTransaction.date);
      const isSameDay = originalDate.getFullYear() === dateObj.getFullYear() &&
                        originalDate.getMonth() === dateObj.getMonth() &&
                        originalDate.getDate() === dateObj.getDate();
      
      if (isSameDay) {
        dateObj = originalDate;
      } else {
        dateObj.setHours(12, 0, 0, 0);
      }
    } else {
      dateObj.setHours(12, 0, 0, 0);
    }

    let finalLinkedExpenseId = boundExpenseId;
    if (!finalLinkedExpenseId && type === 'expense') {
      const searchTarget = `${finalDisplayName} ${note}`.toLowerCase();
      const matchedExpense = mandatoryExpenses.find(e => {
        const expName = (e.name || '').toLowerCase().trim();
        if (expName.length >= 3 && searchTarget.includes(expName)) return true;
        const keywords = e.keywords || [];
        return keywords.some(k => k.trim().length >= 3 && searchTarget.includes(k.toLowerCase().trim()));
      });
      if (matchedExpense) {
        finalLinkedExpenseId = matchedExpense.id;
      }
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
      linkedExpenseId: finalLinkedExpenseId || undefined
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

    // Optional Telegram notification
    if (notifyTelegram && settings.telegramBotToken && settings.telegramChatId) {
      try {
        const typeLabel = type === 'expense' ? 'Расход' : 'Доход';
        const formattedAmount = finalAmount.toLocaleString('ru-RU');
        const telegramText = `💸 *${typeLabel}*: ${formattedAmount} ${settings.currency || '₽'}\n📁 *Категория*: ${selectedCategory.label}\n👤 *Исполнитель*: ${selectedMember.name}\n📝 *Название*: ${finalDisplayName}${note.trim() ? `\n💬 *Заметка*: ${note.trim()}` : ''}`;
        
        fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: settings.telegramChatId,
            text: telegramText,
            parse_mode: 'Markdown'
          })
        }).catch(err => console.error("Telegram notification failed:", err));
      } catch (err) {
        console.error("Failed to dispatch telegram notification:", err);
      }
    }

    await onSubmit(txData);
    onClose();
  };

  const handleDeleteAction = async () => {
    if (!initialTransaction || !onDelete) return;
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    await onDelete(initialTransaction.id);
    onClose(); 
  };

  return createPortal(
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: 0.18 }}
        onClick={onClose} 
        className="absolute inset-0 bg-[#2E3230]/65 backdrop-blur-xs" 
      />
      
      {/* 2-Column Modal Dialog Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full max-w-3xl h-[88vh] sm:h-[620px] max-h-[92vh] bg-[#FAF9F6] dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-surface-border dark:border-white/10 z-10"
        onClick={e => e.stopPropagation()}
      >
        <AnimatePresence initial={false} mode="wait">
          {currentView === 'main' && (
            <motion.div 
              key="main"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex flex-col h-full overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border/70 dark:border-white/10 bg-white dark:bg-[#1C1C1E] shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  <h2 className="text-xl sm:text-2xl font-headline font-bold tracking-tight text-[#2E3230] dark:text-white">
                    {initialTransaction ? 'Редактирование операции' : 'Новая операция'}
                  </h2>
                </div>

                <button 
                  type="button"
                  onClick={onClose} 
                  className="w-8 h-8 rounded-xl bg-[#F5F1EA] hover:bg-[#EAE6DE] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-graphite-muted hover:text-graphite dark:text-gray-400 dark:hover:text-white flex items-center justify-center transition border border-surface-border/60 dark:border-white/5 active:scale-95 cursor-pointer"
                  aria-label="Закрыть модальное окно"
                >
                  <X size={16} strokeWidth={2.2} />
                </button>
              </div>

              {/* Validation Alert */}
              {validationError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs font-semibold px-6 py-2 border-b border-red-100 dark:border-red-900/30 flex items-center justify-between">
                  <span>{validationError}</span>
                  <button onClick={() => setValidationError(null)} className="text-xs font-bold hover:underline">Закрыть</button>
                </div>
              )}

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-[#FAF9F6] dark:bg-[#141416] no-scrollbar">
                
                {/* Top Row: Segmented Toggle & Sum Card */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
                  {/* Segmented Toggle */}
                  <div className="md:col-span-5 p-1.5 rounded-2xl bg-[#EAE6DE] dark:bg-[#2C2C2E] flex items-center gap-1.5 border border-surface-border/60 dark:border-white/5">
                    <button 
                      type="button"
                      onClick={() => setType('expense')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer ${
                        type === 'expense' 
                          ? 'bg-[#D95C48] text-white shadow-sm' 
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] leading-none">−</span>
                      <span className="tracking-wider uppercase font-headline">РАСХОД</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setType('income')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer ${
                        type === 'income' 
                          ? 'bg-primary text-white shadow-sm' 
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] leading-none">+</span>
                      <span className="tracking-wider uppercase font-headline">ДОХОД</span>
                    </button>
                  </div>

                  {/* Sum Card */}
                  <div className="md:col-span-7 bg-white dark:bg-[#1C1C1E] px-5 py-3 rounded-2xl border border-surface-border dark:border-white/10 shadow-sm flex items-center justify-between gap-3 min-h-[58px]">
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-graphite-muted dark:text-gray-400 block mb-0.5">
                        {type === 'expense' ? 'Сумма расхода' : 'Сумма дохода'}
                      </span>
                      <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={amount}
                          onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                          placeholder="0"
                          style={{ width: `${Math.max(inputWidth, 80)}px` }}
                          className="bg-transparent font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2E3230] dark:text-white p-0 m-0 outline-none border-none focus:ring-0"
                          autoFocus={!initialTransaction}
                        />
                        <span ref={spanRef} className="absolute invisible whitespace-pre text-2xl sm:text-3xl font-headline font-bold">
                          {amount || '0'}
                        </span>
                        <span className={`font-headline font-extrabold text-xl sm:text-2xl ${
                          type === 'expense' ? 'text-[#D95C48]' : 'text-primary dark:text-green-400'
                        }`}>
                          {settings.currency || '₽'}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="text-xs font-bold text-emerald-800 dark:text-green-400 bg-emerald-50 dark:bg-green-950/40 border border-emerald-200 dark:border-green-800/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>В лимите дня</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Grid: 2 Columns of Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Left Block: Name & Rules & Category */}
                  <div className="space-y-3">
                    {/* Название в истории */}
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 border border-surface-border dark:border-white/10 shadow-sm flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary-light text-primary dark:bg-green-950/40 dark:text-green-400 flex items-center justify-center font-headline font-bold text-sm shrink-0">
                        {renamedTitle ? renamedTitle.charAt(0).toUpperCase() : 'Т'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400 block">
                          Название в истории
                        </label>
                        <input 
                          type="text"
                          value={renamedTitle}
                          onChange={(e) => setRenamedTitle(e.target.value)}
                          placeholder={selectedCategory.label || 'Магнит, Такси...'}
                          className="w-full bg-transparent text-[#2E3230] dark:text-white font-bold text-sm focus:outline-none border-none p-0 focus:ring-0 placeholder-graphite-muted/40"
                        />
                      </div>
                    </div>

                    {/* Запомнить правило */}
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 border border-surface-border dark:border-white/10 shadow-sm flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#2E3230] dark:text-white">Запомнить правило</div>
                          <div className="text-[10px] text-graphite-muted dark:text-gray-400">Авто-категория для будущих операций</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox"
                          checked={isLearningEnabled}
                          onChange={(e) => setIsLearningEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-[#EAE6DE] dark:bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    <AnimatePresence>
                      {isLearningEnabled && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-[#FAF8F5] dark:bg-[#1C1C1E] p-3 rounded-2xl border border-surface-border dark:border-white/10 space-y-1">
                            <label className="text-[10px] font-mono uppercase font-bold text-primary dark:text-green-400 block">
                              КЛЮЧЕВОЕ СЛОВО (ДЛЯ АВТО-ПРАВИЛА)
                            </label>
                            <input 
                              type="text"
                              value={cleanKeyword}
                              onChange={(e) => setCleanKeyword(e.target.value)}
                              placeholder="Напр: Uber; Магнит; ВкусВилл..."
                              className="w-full bg-white dark:bg-[#252528] border border-surface-border dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-graphite dark:text-white outline-none focus:border-primary"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Категория (Выбор) */}
                    <div 
                      onClick={() => setCurrentView('categories')}
                      className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 border border-primary-border/60 hover:border-primary dark:border-white/10 shadow-sm flex items-center justify-between cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: selectedCategory.color || '#4A7C59' }}
                        >
                          {getIconById(selectedCategory.icon, 18)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-primary transition">
                            {selectedCategory.label}
                          </div>
                          <div className="text-[9px] font-bold text-primary dark:text-green-400 tracking-wider uppercase mt-0.5">
                            Нажмите, чтобы изменить
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-graphite-muted group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Right Block: Metadata Details */}
                  <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-surface-border dark:border-white/10 shadow-sm divide-y divide-surface-border/60 dark:divide-white/5 overflow-hidden">
                    {/* Detail 1: Привязать к платежу */}
                    <div 
                      onClick={() => setCurrentView('monthly_binding')}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#FAF9F6] dark:hover:bg-[#252528] transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#FAF6F0] dark:bg-[#2C2C2E] text-graphite-muted group-hover:text-primary flex items-center justify-center shrink-0 transition">
                          <LinkIcon size={14} />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Привязать к платежу</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-graphite-muted font-medium group-hover:text-primary transition">
                        <span className={boundExpense ? 'text-[#D95C48] font-bold' : ''}>
                          {boundExpense ? boundExpense.name : 'Не выбрано'}
                        </span>
                        <ChevronRight size={14} />
                      </div>
                    </div>

                    {/* Detail 2: Исполнитель */}
                    <div 
                      onClick={() => setCurrentView('assignee')}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#FAF9F6] dark:hover:bg-[#252528] transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                          style={{ backgroundColor: selectedMember.color || '#2B70C9' }}
                        >
                          {selectedMember.name ? selectedMember.name.charAt(0).toUpperCase() : '👤'}
                        </div>
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Исполнитель</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#2E3230] dark:text-white font-bold group-hover:text-primary transition">
                        <span>{selectedMember.name}</span>
                        <ChevronRight size={14} className="text-graphite-muted" />
                      </div>
                    </div>

                    {/* Detail 3: Дата */}
                    <div className="relative p-3 flex items-center justify-between cursor-pointer hover:bg-[#FAF9F6] dark:hover:bg-[#252528] transition group">
                      <div className="flex items-center gap-2.5 pointer-events-none">
                        <div className="w-7 h-7 rounded-lg bg-[#FAF6F0] dark:bg-[#2C2C2E] text-graphite-muted group-hover:text-primary flex items-center justify-center shrink-0 transition">
                          <Calendar size={14} />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Дата операции</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#2E3230] dark:text-white font-bold group-hover:text-primary transition pointer-events-none">
                        <span>
                          {new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <ChevronRight size={14} className="text-graphite-muted" />
                      </div>
                      <input 
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Compact Card: Заметка и банковский оригинал */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3.5 border border-surface-border dark:border-white/10 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">
                      Заметка / Банковский оригинал
                    </span>
                    {initialTransaction?.rawNote && (
                      <span className="text-[9px] font-bold text-graphite-muted uppercase bg-[#F5F1EA] dark:bg-white/10 px-2 py-0.5 rounded">
                        Оригинал
                      </span>
                    )}
                  </div>

                  {/* Raw Bank Info Banner (if available) */}
                  {initialTransaction?.rawNote && (
                    <div className="p-2 rounded-xl bg-[#F5F1EA] dark:bg-white/5 border border-surface-border/60 dark:border-white/5 flex items-start gap-2">
                      <FileText size={14} className="text-graphite-muted shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-tight text-graphite-muted dark:text-gray-400 font-mono select-all break-words">
                        {initialTransaction.rawNote}
                      </p>
                    </div>
                  )}

                  {/* Family Note Input */}
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 500))}
                    placeholder="Добавить заметку семьи (чек, комментарий...)"
                    className="w-full bg-[#FAF9F6] dark:bg-[#252528] rounded-xl border border-surface-border dark:border-white/10 px-3 py-2 text-xs text-[#2E3230] dark:text-white placeholder:text-graphite-muted/40 focus:ring-1 focus:ring-primary focus:border-primary resize-none h-14 leading-normal outline-none"
                  />
                </div>

              </div>

              {/* Bottom Actions Footer */}
              <div className="px-6 py-4 border-t border-surface-border/70 dark:border-white/10 bg-white dark:bg-[#1C1C1E] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
                {/* Destructive Action */}
                {initialTransaction && onDelete && (
                  !isConfirmingDelete ? (
                    <button 
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="w-full sm:w-auto py-2.5 px-4 text-xs font-bold tracking-wider uppercase font-headline text-[#D95C48] hover:text-white bg-red-50 hover:bg-[#D95C48] dark:bg-red-950/30 dark:hover:bg-red-900/50 active:scale-[0.98] border border-red-200 dark:border-red-900/40 rounded-xl transition-all flex items-center justify-center gap-1.5 order-2 sm:order-1 cursor-pointer"
                    >
                      <Trash2 size={15} />
                      <span>Удалить операцию</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1 animate-in fade-in">
                      <button 
                        type="button"
                        onClick={handleDeleteAction}
                        className="py-2.5 px-4 text-xs font-bold tracking-wider uppercase font-headline text-white bg-[#D95C48] hover:bg-red-700 active:scale-[0.98] rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 size={15} />
                        <span>Подтвердить удаление</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="py-2 px-2.5 text-xs text-graphite-muted hover:text-graphite dark:text-gray-400 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  )
                )}

                {/* Primary Save Action */}
                <button 
                  type="button"
                  onClick={handleSave}
                  className="w-full sm:w-auto flex-1 py-2.5 px-5 text-xs font-extrabold tracking-wider uppercase font-headline text-white bg-primary hover:bg-primary-dark active:scale-[0.98] rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 order-1 sm:order-2 cursor-pointer"
                >
                  <Check size={16} strokeWidth={2.5} />
                  <span>{initialTransaction ? 'Сохранить изменения' : 'Добавить операцию'}</span>
                </button>
              </div>

            </motion.div>
          )}

          {/* SUBVIEW: Categories Selection */}
          {currentView === 'categories' && (
            <motion.div 
              key="categories"
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="flex flex-col h-full bg-[#F8F6F2] dark:bg-[#121214]"
            >
              <SubHeader title="Категория" onBack={() => setCurrentView('main')} />
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 no-scrollbar">
                {categories.filter(c => !c.parentId).sort((a, b) => a.label.localeCompare(b.label)).map(parentCat => {
                  const children = categories.filter(c => c.parentId === parentCat.id).sort((a, b) => a.label.localeCompare(b.label));
                  const family = [parentCat, ...children];

                  return (
                    <div key={parentCat.id} className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-surface-border dark:border-white/5 divide-y divide-surface-border dark:divide-white/5">
                      {family.map((cat) => {
                        const isChild = cat.parentId === parentCat.id;
                        const isSelected = categoryId === cat.id;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => { setCategoryId(cat.id); setCurrentView('main'); }}
                            className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#FAF8F5] dark:hover:bg-[#2C2C2E] transition-colors ${
                              isChild ? 'pl-8 bg-[#FAF8F5]/50 dark:bg-[#1C1C1E]/50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div 
                                className={`rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${isChild ? 'w-7 h-7' : 'w-8 h-8'}`} 
                                style={{ backgroundColor: cat.color || '#4A7C59' }}
                              >
                                {getIconById(cat.icon, isChild ? 14 : 16)}
                              </div>
                              <span className={`text-sm truncate ${isSelected ? 'text-primary dark:text-green-400 font-bold' : 'text-graphite dark:text-white'}`}>
                                {cat.label}
                              </span>
                            </div>
                            {isSelected && <Check size={18} className="text-primary dark:text-green-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* SUBVIEW: Assignee Selection */}
          {currentView === 'assignee' && (
            <motion.div 
              key="assignee"
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="flex flex-col h-full bg-[#F8F6F2] dark:bg-[#121214]"
            >
              <SubHeader title="Исполнитель" onBack={() => setCurrentView('main')} />
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 no-scrollbar">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-surface-border dark:border-white/5 divide-y divide-surface-border dark:divide-white/5">
                  {members.map((mem) => {
                    const isSelected = memberId === mem.id;
                    return (
                      <button
                        key={mem.id}
                        type="button"
                        onClick={() => { setMemberId(mem.id); setCurrentView('main'); }}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#FAF8F5] dark:hover:bg-[#2C2C2E] transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <MemberMarker member={mem} size="sm" />
                          <div className="text-left">
                            <div className={`text-sm truncate ${isSelected ? 'text-primary dark:text-green-400 font-bold' : 'text-graphite dark:text-white'}`}>
                              {mem.name}
                            </div>
                            {mem.id === auth.currentUser?.uid && (
                              <div className="text-[11px] text-graphite-muted dark:text-gray-400">Это вы</div>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check size={18} className="text-primary dark:text-green-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* SUBVIEW: Mandatory Expense Binding */}
          {currentView === 'monthly_binding' && (
            <motion.div 
              key="monthly"
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="flex flex-col h-full bg-[#F8F6F2] dark:bg-[#121214]"
            >
              <SubHeader title="Привязать к расходу" onBack={() => setCurrentView('main')} />
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 no-scrollbar">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-surface-border dark:border-white/5 divide-y divide-surface-border dark:divide-white/5">
                  <button
                    type="button"
                    onClick={() => { setBoundExpenseId(''); setCurrentView('main'); }}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#FAF8F5] dark:hover:bg-[#2C2C2E] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <X size={18} className="text-graphite-muted" />
                      <span className="text-sm font-medium text-graphite dark:text-white">Не привязывать</span>
                    </div>
                    {boundExpenseId === '' && <Check size={18} className="text-primary dark:text-green-400 shrink-0" />}
                  </button>
                  
                  {mandatoryExpenses.map((exp) => {
                    const isSelected = boundExpenseId === exp.id;
                    return (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => { 
                          setBoundExpenseId(exp.id); 
                          if (!note.includes(exp.name) && !renamedTitle.includes(exp.name)) {
                            setRenamedTitle(exp.name);
                          }
                          setCurrentView('main'); 
                        }}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#FAF8F5] dark:hover:bg-[#2C2C2E] transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <Repeat size={16} />
                          </div>
                          <div className="text-left min-w-0">
                            <div className={`text-sm truncate ${isSelected ? 'text-primary dark:text-green-400 font-bold' : 'text-graphite dark:text-white'}`}>
                              {exp.name}
                            </div>
                            <div className="text-[11px] text-graphite-muted dark:text-gray-400 font-mono">
                              {exp.amount.toLocaleString('ru-RU')} {settings.currency || '₽'} • до {exp.day}-го
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={18} className="text-primary dark:text-green-400 shrink-0" />}
                      </button>
                    );
                  })}
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
