import { useModalSurface } from '../hooks/useDialogFocus';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { TOOLBAR_ACTION, TOOLBAR_ACTION_PRIMARY } from './filterUiTokens';
import { 
  ChevronLeft, X, Calendar, FileText, Repeat, ChevronRight, Check, Trash2, 
  Sparkles, Link as LinkIcon, Plus, Send, Search, RotateCcw, ShieldCheck
} from 'lucide-react';
import { Transaction, AppSettings, FamilyMember, Category, LearnedRule } from '../types';
import { auth } from '../firebase';
import { getIconById, MemberMarker } from '../constants';
import { extractCleanRuleKeyword } from '../utils/analyzerHelper';
import { triggerHaptic } from '../utils/haptics';
import { sendTelegramMessage } from '../utils/telegram';
import DesktopCategoryPickerModal from './DesktopCategoryPickerModal';
import MobileCategoryPickerModal from './MobileCategoryPickerModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useModalBackHandler from '../hooks/useModalBackHandler';
import {useMobileViewport} from '../hooks/useMobileViewport';
import {terraTransition} from '../utils/uiMotion';
import { isCategoryForType } from '../utils/categoryCatalog';
import { transactionSaveError, type TransactionSavePhase } from '../utils/transactionSaveError';

interface AddTransactionModalProps {
  onClose: () => void;
  previewMode?: boolean;
  onSubmit: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  settings: AppSettings;
  members: FamilyMember[];
  categories: Category[];
  learnedRules?: LearnedRule[];
  initialTransaction?: Transaction | null;
  initialDate?:Date;
  onLearnRule: (rule: LearnedRule) => void;
  onApplyRuleToExisting?: (rule: LearnedRule) => void;
  transactions: Transaction[];
  onDelete?: (id: string) => Promise<void>;
  onAddCategory?: (category: Category) => void | Promise<void>;
}

/**
 * Safely evaluates simple mathematical expressions (addition, subtraction, multiplication, division)
 * without using dangerous eval() function. Supports decimals with both '.' and ',' separators.
 * Returns null if the expression is invalid or empty.
 */
export const evaluateMathExpression = (expr: string): number | null => {
  const cleanExpr = expr.replace(/\s/g, '').replace(/,/g, '.');
  if (!cleanExpr) return null;

  // Simple validation: only allow digits, decimal points, and + - * / ( )
  if (!/^[0-9.+\-*/()]+$/.test(cleanExpr)) {
    return null;
  }

  try {
    const fn = new Function(`return (${cleanExpr})`);
    const val = fn();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return val;
    }
  } catch (e) {
    // Syntax error in math expression
  }
  return null;
};

const SubHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <div className="px-5 py-4 border-b flex justify-between items-center sticky top-0 z-30 bg-[#FAF8F5]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border-surface-border dark:border-white/10 shrink-0">
    <button 
      type="button"
      onClick={onBack} 
      autoFocus className="min-h-[44px] min-w-[44px] text-[var(--terra-primary-text)] flex items-center text-sm font-semibold rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
    >
      <ChevronLeft size={20} className="-ml-1 mr-0.5" />
      <span>Назад</span>
    </button>
    <h2 className="text-base font-headline font-semibold text-center flex-1 min-w-0 text-[var(--terra-ink)]">
      {title}
    </h2>
  </div>
);

export default function AddTransactionModal({
  onClose, onSubmit, previewMode=false, settings, members, categories, learnedRules = [], initialTransaction, initialDate, onDelete, onLearnRule, transactions = [], onAddCategory
}: AddTransactionModalProps) {
  // Lock body scroll with scrollbar compensation when modal is open
  useBodyScrollLock();
  const reducedMotion=Boolean(useReducedMotion());
  const viewport=useMobileViewport();

  // Navigation State
  const [currentView, setCurrentView] = useState<'main' | 'assignee' | 'monthly_binding'>('main');
  const returnToControl=useRef<'assignee'|'monthly_binding'|null>(null);
  const openSubview=(view:'assignee'|'monthly_binding')=>{returnToControl.current=view;setCurrentView(view);};
  const restoreSubviewFocus=(view:'assignee'|'monthly_binding',node:HTMLButtonElement|null)=>{if(node&&returnToControl.current===view){returnToControl.current=null;node.focus({preventScroll:true});}};
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  
  // Form State
  const [amount, setAmount] = useState(() => initialTransaction ? initialTransaction.amount.toString() : '');
  const [type, setType] = useState<'expense' | 'income'>(() => initialTransaction ? initialTransaction.type : 'expense');
  const [note, setNote] = useState(() => initialTransaction ? (initialTransaction.rawNote || '') : ''); 
  
  // AI Learning & Naming State
  const [isLearningEnabled, setIsLearningEnabled] = useState(false);
  const [cleanKeyword, setCleanKeyword] = useState(() => {
    if (!initialTransaction) return '';
    return extractCleanRuleKeyword(initialTransaction.rawNote, initialTransaction.note);
  }); 
  const [renamedTitle, setRenamedTitle] = useState(() => initialTransaction ? initialTransaction.note : ''); 
  
  // Check if rule is already remembered in database
  const existingLearnedRule = useMemo(() => {
    if (!learnedRules || learnedRules.length === 0) return null;
    const targetText = `${initialTransaction?.rawNote || ''} ${initialTransaction?.note || ''} ${note || ''} ${renamedTitle || ''}`.toLowerCase();
    if (!targetText.trim()) return null;
    return learnedRules.find(r => r.keyword && targetText.includes(r.keyword.toLowerCase()));
  }, [learnedRules, initialTransaction, note, renamedTitle]); 
  
  // Selection State
  const [categoryId, setCategoryId] = useState(() => initialTransaction ? initialTransaction.category : (categories.find(c => c.id === 'food')?.id || categories[0]?.id || 'other'));
  const changeTransactionType = (next: 'income' | 'expense') => {
    setType(next);
    if (!isCategoryForType(categoryId, categories, next)) {
      setCategoryId(next === 'income' ? (categories.find(c => c.id === 'income')?.id || 'other') :
        (categories.find(c => c.id === 'food')?.id || 'other'));
    }
  };
  const [memberId, setMemberId] = useState(() => {
    if (initialTransaction) return initialTransaction.memberId;
    const myMember = members.find(m => m.userId === auth.currentUser?.uid);
    return myMember?.id || '';
  });
  const [boundExpenseId, setBoundExpenseId] = useState<string>(() => initialTransaction ? (initialTransaction.linkedExpenseId || '') : '');
  
  // Date & Telegram Notification State
  const [date, setDate] = useState(() => {
    const targetDate = initialTransaction ? new Date(initialTransaction.date) : initialDate ?? new Date();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [notifyTelegram, setNotifyTelegram] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mutationPending=useRef(false);
  const savedMutation=useRef(false);
  const [saveConfirmed,setSaveConfirmed]=useState(false);
  const requestClose=()=>{if(mutationPending.current)return;if(currentView!=='main'){setCurrentView('main');return;}onClose();};
  useModalBackHandler(true,requestClose);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDesktopCategoryPickerOpen, setIsDesktopCategoryPickerOpen] = useState(false);
  const [isMobileCategoryPickerOpen, setIsMobileCategoryPickerOpen] = useState(false);
  const surface=useModalSurface(requestClose,{initialSelector:'[aria-label="Закрыть модальное окно"]'});

  // Dynamic Input Width for Amount
  const initialAmount = initialTransaction ? initialTransaction.amount.toString() : '';
  const initialWidth = useMemo(() => {
    return Math.max(initialAmount.length * 22 + 20, 60);
  }, [initialAmount]);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(initialWidth);

  // Derived Data
  const selectedCategory = categories.find(c => c.id === categoryId) || categories[0] || { id: 'other', label: 'Другое', color: '#4A7C59', icon: 'tag' };
  const parentOfSelected = selectedCategory?.parentId ? categories.find(c => c.id === selectedCategory.parentId) : null;
  const selectedMember = members.find(m => m.id === memberId) || { id: '', name: 'Выберите участника', color: '#4A7C59' };
  const boundExpense = settings.mandatoryExpenses?.find(e => e.id === boundExpenseId);
  const mandatoryExpenses = settings.mandatoryExpenses || [];

  // History of keywords for quick suggestions
  const popularKeywords = useMemo(() => {
    const set = new Set<string>();

    if (initialTransaction?.rawNote) {
      const autoClean = extractCleanRuleKeyword(initialTransaction.rawNote, initialTransaction.note);
      if (autoClean && autoClean.length >= 3) set.add(autoClean);
    }

    if (renamedTitle && renamedTitle.length >= 3 && renamedTitle !== selectedCategory.label) {
      set.add(renamedTitle.trim());
    }

    (transactions || []).slice(0, 150).forEach(t => {
      if (t.note && t.note.length >= 3 && !t.note.startsWith('Операция') && t.note !== 'Операция') {
        set.add(t.note.trim());
      }
    });

    return Array.from(set).slice(0, 6);
  }, [transactions, initialTransaction, renamedTitle, selectedCategory.label]);

  // Adjust input width dynamically based on content
  useEffect(() => {
    if (spanRef.current) {
      setInputWidth(Math.max(spanRef.current.offsetWidth + 12, 45)); 
    }
  }, [amount]);

  // Keep the original text so a malformed pasted amount is never silently altered.
  const handleSave = async () => {
    if (mutationPending.current || savedMutation.current || isConfirmingDelete) return;
    setValidationError(null);
    if (!members.some(m => m.id === memberId)) {
      setValidationError('Выберите участника семьи, для которого сохраняется операция.');
      setIsSubmitting(false);
      return;
    }
    
    // Number() rejects trailing garbage that parseFloat accepts ("12abc").
    // Expressions are allowed, but their result is always stored in kopecks.
    const normalizedAmount=amount.replace(/\s/g,'').replace(',', '.');
    const hasMathOperators=/[+*/]/.test(normalizedAmount) || /-(?!^)/.test(normalizedAmount);
    let finalAmount=hasMathOperators ? evaluateMathExpression(amount) : Number(normalizedAmount);
    if (finalAmount === null || !normalizedAmount || !Number.isFinite(finalAmount) ||
        finalAmount <= 0 || !Number.isSafeInteger(Math.round(finalAmount*100)) ||
        (!hasMathOperators && (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(normalizedAmount) || Math.abs(finalAmount*100-Math.round(finalAmount*100))>0.000001))) {
      setValidationError('Введите положительную сумму с точностью до копейки или корректное выражение.');
      setIsSubmitting(false);
      return;
    }
    finalAmount=Math.round(finalAmount*100)/100;
    if(!previewMode&&typeof navigator!=='undefined'&&!navigator.onLine){
      setValidationError('Нет соединения. Операция не отправлена. Восстановите сеть, не закрывая форму.');
      return;
    }
    mutationPending.current=true;
    setIsSubmitting(true);
    let phase:TransactionSavePhase='prepare';

    try {
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
        subcategory: parentOfSelected ? selectedCategory.label : undefined,
        payee: finalDisplayName,
        memberId: memberId,
        note: finalDisplayName,
        date: dateObj.toISOString(),
        rawNote: note.trim() || finalDisplayName, 
        userId: auth.currentUser?.uid,
        linkedExpenseId: finalLinkedExpenseId || undefined
      };

      const learnedRule: LearnedRule | null = isLearningEnabled && cleanKeyword.trim() ? {
        id: Date.now().toString(),
        keyword: cleanKeyword.trim(),
        cleanName: finalDisplayName,
        categoryId: categoryId,
        subcategory: parentOfSelected ? selectedCategory.label : undefined,
        payee: finalDisplayName,
        pattern: cleanKeyword.trim().toUpperCase()
      } : null;

      phase='submit';
      await onSubmit(txData);
      phase='after-submit';
      savedMutation.current=true;
      setSaveConfirmed(true);
      // A failed transaction must not create a learned merchant rule.
      if (learnedRule) onLearnRule(learnedRule);

      // Optional Telegram notification
      if (!previewMode && notifyTelegram && settings.telegramBotToken && settings.telegramChatId) {
        const typeLabel = type === 'expense' ? 'Расход' : 'Доход';
        const formattedAmount = finalAmount.toLocaleString('ru-RU');
        const telegramText = `💸 *${typeLabel}*: ${formattedAmount} ${settings.currency || '₽'}\n📁 *Категория*: ${selectedCategory.label}\n👤 *Исполнитель*: ${selectedMember.name}\n📝 *Название*: ${finalDisplayName}${note.trim() ? `\n💬 *Заметка*: ${note.trim()}` : ''}`;
        
        sendTelegramMessage({
          config: {
            botToken: settings.telegramBotToken,
            chatId: settings.telegramChatId,
            apiUrl: settings.telegramApiUrl,
          },
          text: telegramText,
          parseMode: 'Markdown',
        }).catch(err => {
          console.error("Telegram notification failed:", err);
        });
      }

      onClose();
    } catch (err) {
      console.error("Save transaction error:", err);
      setValidationError(previewMode&&phase==='after-submit'?'Изменение предпросмотра выполнено. Закройте форму.':transactionSaveError(err,phase));
      mutationPending.current=false;
      setIsSubmitting(false);
    }
  };

  const handleDeleteAction = async () => {
    if (mutationPending.current || savedMutation.current || !initialTransaction || !onDelete) return;
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    mutationPending.current=true;
    setIsSubmitting(true);
    setValidationError(null);
    try {
      await onDelete(initialTransaction.id);
      onClose();
    } catch (error) {
      console.error('Delete transaction error:', error);
      setValidationError('Не удалось удалить операцию. Повторите попытку.');
      mutationPending.current=false;
      setIsSubmitting(false);
      setIsConfirmingDelete(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4" style={viewport.height===null?undefined:{height:viewport.height,bottom:'auto'}}>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: reducedMotion?0:0.18 }}
        onClick={requestClose} 
        className="absolute inset-0 bg-black/45" 
      />
      
      {/* 2-Column Modal Dialog Container */}
      <motion.div {...surface} role="dialog" aria-modal="true" aria-busy={isSubmitting} aria-label={initialTransaction ? 'Редактирование операции' : 'Новая операция'}
        initial={reducedMotion?false:{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: reducedMotion?0:0.18, ease: 'easeOut' }}
        className="relative w-full max-w-4xl lg:max-w-5xl h-full sm:h-[min(620px,88dvh)] max-h-full sm:max-h-[88dvh] min-h-0 bg-[var(--terra-surface)] text-[#2E3230] dark:text-white rounded-none sm:rounded-2xl shadow-xl overflow-hidden flex flex-col border-0 sm:border border-surface-border dark:border-white/10 z-10 pt-[env(safe-area-inset-top,0px)] sm:pt-0 pb-[env(safe-area-inset-bottom,0px)]"
        onClick={e => e.stopPropagation()}
      >


        <AnimatePresence initial={false} mode="wait">
          {currentView === 'main' && (
            <div 
              key="main"
              className="flex flex-col h-full min-h-0 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 border-b border-[var(--terra-border)] bg-[var(--terra-surface)] shrink-0">
                <h2 className="text-lg sm:text-xl font-headline font-semibold min-w-0 text-[var(--terra-ink)]">
                  {initialTransaction ? 'Редактирование операции' : 'Новая операция'}
                </h2>

                <button 
                  type="button"
                  onClick={requestClose} disabled={isSubmitting} 
                  className="w-11 h-11 shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-[#F5F1EA] hover:bg-[#EAE6DE] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-graphite-muted hover:text-graphite dark:text-gray-400 dark:hover:text-white flex items-center justify-center transition border border-surface-border/60 dark:border-white/5 active:scale-95 cursor-pointer"
                  aria-label="Закрыть модальное окно"
                >
                  <X size={16} strokeWidth={2.2} />
                </button>
              </div>

              {/* Validation Alert */}
              {validationError && (
                <div role="alert" className="bg-[var(--terra-danger-soft)] text-[var(--terra-danger-text)] text-xs font-semibold px-6 py-2 border-b border-[var(--terra-border)] flex items-center justify-between">
                  <span>{validationError}</span>
                  <button onClick={() => setValidationError(null)} className="text-xs font-bold hover:underline">Закрыть</button>
                </div>
              )}

              {/* Modal Body */}
              <div data-testid="terra-transaction-scroll" className="p-3 sm:p-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-3 bg-[var(--terra-canvas)]" onClickCapture={e=>{if(mutationPending.current){e.preventDefault();e.stopPropagation();}}}>
                
                {/* Top Row: Segmented Toggle & Sum Card */}
                <fieldset disabled={isSubmitting||saveConfirmed} className="min-w-0 border-0 p-0 space-y-3 sm:space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 items-center">
                  {/* Segmented Toggle */}
                  <div className="md:col-span-5 p-1 rounded-xl bg-[#EAE6DE] dark:bg-[#2C2C2E] flex items-center gap-1 border border-surface-border/60 dark:border-white/5">
                    <button 
                      type="button"
                      onClick={() => changeTransactionType('expense')}
                      aria-pressed={type === 'expense'}
                      className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-bold text-xs shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer ${
                        type === 'expense' 
                          ? 'bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)]' 
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center text-[10px] leading-none">−</span>
                      <span className="font-headline text-sm">Расход</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => changeTransactionType('income')}
                      aria-pressed={type === 'income'}
                      className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-bold text-xs shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer ${
                        type === 'income' 
                          ? 'bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)]' 
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center text-[10px] leading-none">+</span>
                      <span className="font-headline text-sm">Доход</span>
                    </button>
                  </div>

                  {/* Sum Card */}
                  <div className="md:col-span-7 bg-[var(--terra-surface)] px-4 py-2 rounded-2xl border border-surface-border dark:border-white/10 shadow-sm flex flex-col justify-between gap-1.5 min-h-[50px]">
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-[var(--terra-muted)] block mb-1">
                          {type === 'expense' ? 'Сумма расхода' : 'Сумма дохода'}
                        </span>
                        <div className="flex items-baseline gap-1.5 min-w-0 max-w-full overflow-hidden">
                          <input 
                            type="text" 
                            inputMode="decimal"
                            aria-label="Сумма операции"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onFocus={(e) => e.target.scrollIntoView({ behavior: reducedMotion?'auto':'smooth', block: 'center' })}
                            placeholder="0"
                            style={{ 
                              width: `${Math.max(inputWidth, 60)}px`,
                              maxWidth: 'calc(100% - 28px)'
                            }}
                            className={`bg-transparent font-headline font-extrabold tracking-tight text-[#2E3230] dark:text-white p-0 m-0 outline-none border-none focus:ring-0 transition-all ${
                              amount.length > 9 
                                ? 'text-lg sm:text-xl' 
                                : amount.length > 6 
                                ? 'text-xl sm:text-2xl' 
                                : 'text-2xl sm:text-3xl'
                            }`}
                          />
                          <span ref={spanRef} className={`absolute invisible whitespace-pre font-headline font-bold ${
                            amount.length > 9 
                              ? 'text-lg sm:text-xl' 
                              : amount.length > 6 
                              ? 'text-xl sm:text-2xl' 
                              : 'text-2xl sm:text-3xl'
                          }`}>
                            {amount || '0'}
                          </span>
                          <span className={`font-headline font-extrabold shrink-0 ${
                            amount.length > 9 
                              ? 'text-base sm:text-lg' 
                              : amount.length > 6 
                              ? 'text-lg sm:text-xl' 
                              : 'text-xl sm:text-2xl'
                          } ${
                            type === 'expense' ? 'text-[#D95C48]' : 'text-[var(--terra-primary-text)]'
                          }`}>
                            {settings.currency || '₽'}
                          </span>
                        </div>
                        {/* Live arithmetic calculator expression evaluation preview (Task 2.1) */}
                        {(() => {
                          const evalVal = evaluateMathExpression(amount);
                          const isExpression = /[\+\-\*\/]/.test(amount);
                          if (evalVal !== null && isExpression) {
                            return (
                              <div className="text-xs font-bold text-[var(--terra-primary-text)] mt-1.5 flex items-center gap-1 bg-[#FAF6F0] dark:bg-white/5 px-2 py-1 rounded-lg max-w-full">
                                <span>= {evalVal.toLocaleString('ru-RU')} {settings.currency || '₽'}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>


                    </div>

                    {/* Quick Sum Modifier Chips for Mobile */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-white/5 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">Быстро:</span>
                      {[100, 500, 1000, 5000].map(addVal => (
                        <button
                          key={addVal}
                          type="button"
                          onClick={() => {
                            const normalized=amount.replace(/\s/g,'').replace(',', '.');
                            const expression=/[+*/]/.test(normalized)||/-(?!^)/.test(normalized);
                            const currentNum=normalized?(expression?evaluateMathExpression(amount):/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(normalized)?Number(normalized):null):0;
                            if(currentNum===null||!Number.isFinite(currentNum)||!Number.isSafeInteger(Math.round((currentNum+addVal)*100))){
                              setValidationError('Сначала исправьте сумму.');
                              return;
                            }
                            setAmount(String(Math.round((currentNum+addVal)*100)/100));
                            triggerHaptic('light');
                          }}
                          className="min-h-[44px] px-3 py-2 text-[11px] font-extrabold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-graphite dark:text-white rounded-lg transition active:scale-95 shrink-0 cursor-pointer"
                        >
                          +{addVal >= 1000 ? `${addVal / 1000}k` : addVal}
                        </button>
                      ))}
                      {amount && amount !== '0' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAmount('');
                            triggerHaptic('light');
                          }}
                          className="min-h-[44px] px-2 py-1 text-xs font-semibold text-[var(--terra-danger-text)] hover:bg-[var(--terra-danger-soft)] rounded-lg transition shrink-0 cursor-pointer"
                        >
                          Сброс
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Grid: 2 Columns of Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  
                  {/* Left Block: Name & Rules & Category */}
                  <div className="space-y-3">
                    {/* Название в истории */}
                    <div className="bg-[var(--terra-surface)] rounded-2xl p-3 border border-surface-border dark:border-white/10 shadow-sm flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)] flex items-center justify-center font-headline font-bold text-sm shrink-0">
                        {renamedTitle ? renamedTitle.charAt(0).toUpperCase() : 'Т'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400 block">
                          Название в истории
                        </label>
                        <input 
                          type="text"
                          aria-label="Название в истории"
                          value={renamedTitle}
                          onChange={(e) => setRenamedTitle(e.target.value)}
                          placeholder={selectedCategory.label || 'Магнит, Такси...'}
                          className="w-full bg-transparent text-[#2E3230] dark:text-white font-bold text-sm focus:outline-none border-none p-0 focus:ring-0 placeholder-graphite-muted/40 dark:placeholder-white/40"
                        />
                      </div>
                    </div>

                    {/* Visual Indicator: Already Learned Rule */}
                    {existingLearnedRule && (
                      <div className="bg-[var(--terra-primary-soft)] border border-[var(--terra-border)] rounded-2xl p-3 flex items-start gap-2.5 shadow-xs">
                        <ShieldCheck size={18} className="text-[var(--terra-primary-text)] shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[var(--terra-primary-text)]">
                              Автоправило сохранено
                            </span>

                          </div>
                          <p className="text-[11px] text-[var(--terra-primary-text)] mt-0.5 leading-tight">
                            Ключ: <b className="font-mono">«{existingLearnedRule.keyword}»</b> ➔ Категория: <b>{categories.find(c => c.id === existingLearnedRule.categoryId)?.label || 'Категория'}</b>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Запомнить правило */}
                    <div className="bg-[var(--terra-surface)] rounded-2xl p-3 border border-surface-border dark:border-white/10 shadow-sm flex items-center justify-between gap-3">
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
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIsLearningEnabled(checked);
                            if (checked && (!cleanKeyword.trim() || cleanKeyword === initialTransaction?.rawNote)) {
                              const raw = initialTransaction?.rawNote || note || '';
                              setCleanKeyword(extractCleanRuleKeyword(raw, renamedTitle || note));
                            }
                          }}
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
                          <div className="bg-[var(--terra-surface)] p-3 rounded-2xl border border-surface-border dark:border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-mono uppercase font-bold text-[var(--terra-primary-text)] block">
                                КЛЮЧЕВОЕ СЛОВО (ДЛЯ АВТО-ПРАВИЛА)
                              </label>
                              {initialTransaction?.rawNote && (
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => setCleanKeyword(extractCleanRuleKeyword(initialTransaction.rawNote, initialTransaction.note))}
                                    className="text-[var(--terra-primary-text)] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Восстановить авто-очищенное ключевое слово"
                                  >
                                    <RotateCcw size={10} />
                                    <span>Очищенное</span>
                                  </button>
                                  <span className="text-stone-300 dark:text-gray-600">|</span>
                                  <button
                                    type="button"
                                    onClick={() => setCleanKeyword(initialTransaction.rawNote || '')}
                                    className="text-graphite-muted dark:text-gray-400 font-bold hover:underline cursor-pointer"
                                    title="Вставить полный оригинальный текст из банка"
                                  >
                                    <span>Оригинал</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            <input 
                              type="text"
                              value={cleanKeyword}
                              onChange={(e) => setCleanKeyword(e.target.value)}
                              placeholder="Напр: Uber; Магнит; ВкусВилл..."
                              className="w-full bg-[var(--terra-soft)] border border-surface-border dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-graphite dark:text-white outline-none focus:border-primary"
                            />

                            {/* Suggestion chips from history */}
                            {popularKeywords.length > 0 && (
                              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-bold text-stone-400 dark:text-stone-500 uppercase">Из истории:</span>
                                {popularKeywords.map((kw, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setCleanKeyword(kw)}
                                    className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/10 hover:bg-[#EAF2EC] dark:hover:bg-green-950/40 text-stone-700 dark:text-gray-300 hover:text-[#4A7C59] dark:hover:text-green-300 text-[10px] font-bold transition cursor-pointer"
                                  >
                                    {kw}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Категория (Выбор) */}
                    <button type="button" aria-label="Выбрать категорию" aria-haspopup="dialog" aria-expanded={isDesktopCategoryPickerOpen||isMobileCategoryPickerOpen}
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                          setIsDesktopCategoryPickerOpen(true);
                        } else {
                          setIsMobileCategoryPickerOpen(true);
                        }
                      }}
                      className="w-full min-h-[44px] text-left bg-[var(--terra-surface)] rounded-xl p-3 border border-[var(--terra-border)] hover:border-[var(--terra-primary-text)] flex items-center justify-between cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs transition-colors"
                          style={{ backgroundColor: selectedCategory.color || '#4A7C59' }}
                        >
                          {getIconById(selectedCategory.icon, 18)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-primary transition truncate">
                            {selectedCategory.label}
                          </div>
                          {parentOfSelected ? (
                            <div className="text-[10px] text-graphite-muted dark:text-gray-400 truncate">
                              в категории {parentOfSelected.label}
                            </div>
                          ) : (
                            <div className="text-xs text-[var(--terra-muted)] mt-0.5">
                              Категория
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-graphite-muted group-hover:text-primary group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                    </button>
                  </div>

                  {/* Right Block: Metadata Details & Notes */}
                  <div className="space-y-3">
                    <div className="bg-[var(--terra-surface)] rounded-2xl border border-surface-border dark:border-white/10 shadow-sm divide-y divide-surface-border/60 dark:divide-white/5 overflow-hidden">
                      {/* Detail 1: Привязать к платежу */}
                      <button type="button" aria-label="Привязать к платежу" ref={node=>restoreSubviewFocus('monthly_binding',node)}
                        onClick={() => openSubview('monthly_binding')}
                        className="w-full min-h-[44px] text-left p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#FAF6F0] dark:bg-[#2C2C2E] text-graphite-muted group-hover:text-primary flex items-center justify-center shrink-0 transition">
                            <LinkIcon size={14} />
                          </div>
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Привязать к платежу</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-graphite-muted font-medium group-hover:text-primary transition">
                          <span className={boundExpense ? 'text-[var(--terra-primary-text)] font-semibold' : ''}>
                            {boundExpense ? boundExpense.name : 'Не выбрано'}
                          </span>
                          <ChevronRight size={14} />
                        </div>
                      </button>

                      {/* Detail 2: Исполнитель */}
                      <button type="button" aria-label="Исполнитель" ref={node=>restoreSubviewFocus('assignee',node)}
                        onClick={() => openSubview('assignee')}
                        className="w-full min-h-[44px] text-left p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] transition-colors group"
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
                      </button>

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
                          aria-label="Дата операции"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 focus-visible:opacity-20 focus-visible:ring-2 focus-visible:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    {/* Compact Card: Заметка и банковский оригинал */}
                    <div className="bg-[var(--terra-surface)] rounded-2xl p-3.5 border border-surface-border dark:border-white/10 shadow-sm space-y-2.5">
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
                </div>

                </fieldset>
              </div>

              {/* Bottom Actions Footer */}
              <div className="px-3 sm:px-6 py-3 border-t border-surface-border/70 dark:border-white/10 bg-[var(--terra-surface)] flex flex-wrap items-center justify-between gap-2 shrink-0">
                {/* Left Side: Compact Destructive Action */}
                <div>
                  {initialTransaction && onDelete && (
                    !isConfirmingDelete ? (
                      <button 
                        type="button"
                        onClick={() => setIsConfirmingDelete(true)} disabled={isSubmitting||saveConfirmed}
                        className="min-h-[44px] px-3.5 py-1.5 text-xs font-semibold text-[var(--terra-danger-text)] hover:bg-[var(--terra-danger-soft)] border border-[var(--terra-border)] rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <Trash2 size={14} />
                        <span>Удалить операцию</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 animate-in fade-in">
                        <button 
                          type="button"
                          onClick={handleDeleteAction} disabled={isSubmitting||saveConfirmed}
                          className="min-h-[44px] px-3.5 py-1.5 text-xs font-bold text-[var(--terra-on-danger)] bg-[var(--terra-danger-solid)] hover:bg-[var(--terra-danger-hover)] active:scale-95 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Trash2 size={14} />
                          <span>Подтвердить удаление</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsConfirmingDelete(false)} disabled={isSubmitting}
                          className="min-h-[44px] px-2.5 py-1.5 text-xs text-graphite-muted hover:text-graphite dark:text-gray-400 dark:hover:text-white rounded-lg transition cursor-pointer"
                        >
                          Отмена
                        </button>
                      </div>
                    )
                  )}
                </div>

                {/* Right Side: Compact Action Buttons (Cancel + Save) */}
                <div className="flex items-center justify-end gap-2 ml-auto min-w-0 flex-wrap">
                  <button 
                    type="button"
                    onClick={requestClose} disabled={isSubmitting}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-graphite-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:text-graphite dark:text-gray-400 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    Отмена
                  </button>

                  <button 
                    type="button"
                    onClick={handleSave}
                    disabled={isSubmitting||saveConfirmed||isConfirmingDelete}
                    className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_PRIMARY+' terra-press'}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>{isConfirmingDelete?'Удаление…':'Сохранение…'}</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} strokeWidth={2.5} />
                        <span>{initialTransaction ? 'Сохранить изменения' : 'Добавить операцию'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* SUBVIEW: Assignee Selection */}
          {currentView === 'assignee' && (
            <motion.div 
              key="assignee"
              initial={reducedMotion?false:{opacity:0,x:8}}
              animate={{opacity:1,x:0}}
              exit={{opacity:0,x:8}}
              transition={terraTransition(reducedMotion,.16)}
              className="flex flex-col h-full min-h-0 bg-[var(--terra-canvas)]"
            >
              <SubHeader title="Исполнитель" onBack={() => setCurrentView('main')} />
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 no-scrollbar">
                <div className="bg-[var(--terra-surface)] rounded-2xl overflow-hidden shadow-sm border border-surface-border dark:border-white/5 divide-y divide-surface-border dark:divide-white/5">
                  {members.map((mem) => {
                    const isSelected = memberId === mem.id;
                    return (
                      <button
                        key={mem.id}
                        type="button"
                        onClick={() => { setMemberId(mem.id); setCurrentView('main'); }}
                        className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <MemberMarker member={mem} size="sm" />
                          <div className="text-left">
                            <div className={`text-sm truncate ${isSelected ? 'text-[var(--terra-primary-text)] font-bold' : 'text-graphite dark:text-white'}`}>
                              {mem.name}
                            </div>
                            {mem.id === auth.currentUser?.uid && (
                              <div className="text-[11px] text-graphite-muted dark:text-gray-400">Это вы</div>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check size={18} className="text-[var(--terra-primary-text)] shrink-0" />}
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
              initial={reducedMotion?false:{opacity:0,x:8}}
              animate={{opacity:1,x:0}}
              exit={{opacity:0,x:8}}
              transition={terraTransition(reducedMotion,.16)}
              className="flex flex-col h-full min-h-0 bg-[var(--terra-canvas)]"
            >
              <SubHeader title="Привязать к расходу" onBack={() => setCurrentView('main')} />
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 no-scrollbar">
                <div className="bg-[var(--terra-surface)] rounded-2xl overflow-hidden shadow-sm border border-surface-border dark:border-white/5 divide-y divide-surface-border dark:divide-white/5">
                  <button
                    type="button"
                    onClick={() => { setBoundExpenseId(''); setCurrentView('main'); }}
                    className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <X size={18} className="text-graphite-muted" />
                      <span className="text-sm font-medium text-graphite dark:text-white">Не привязывать</span>
                    </div>
                    {boundExpenseId === '' && <Check size={18} className="text-[var(--terra-primary-text)] shrink-0" />}
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
                        className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <Repeat size={16} />
                          </div>
                          <div className="text-left min-w-0">
                            <div className={`text-sm truncate ${isSelected ? 'text-[var(--terra-primary-text)] font-bold' : 'text-graphite dark:text-white'}`}>
                              {exp.name}
                            </div>
                            <div className="text-[11px] text-graphite-muted dark:text-gray-400 font-mono">
                              {exp.amount.toLocaleString('ru-RU')} {settings.currency || '₽'} • до {exp.day}-го
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={18} className="text-[var(--terra-primary-text)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {isDesktopCategoryPickerOpen && (
          <DesktopCategoryPickerModal
            isOpen={isDesktopCategoryPickerOpen}
            onClose={() => setIsDesktopCategoryPickerOpen(false)}
            categories={categories}
            transactionType={type}
            selectedCategoryId={categoryId}
            onSelectCategory={(id) => {
              setCategoryId(id);
              const found = categories.find(c => c.id === id);
              if (found && !renamedTitle) {
                setRenamedTitle(found.label);
              }
              setIsDesktopCategoryPickerOpen(false);
              setCurrentView('main');
              triggerHaptic('light');
            }}
            onAddCategory={onAddCategory}
            transactions={transactions}
          />
        )}

        {isMobileCategoryPickerOpen && (
          <MobileCategoryPickerModal
            isOpen={isMobileCategoryPickerOpen}
            onClose={() => setIsMobileCategoryPickerOpen(false)}
            categories={categories}
            transactionType={type}
            selectedCategoryId={categoryId}
            onSelectCategory={(id) => {
              setCategoryId(id);
              const found = categories.find(c => c.id === id);
              if (found && !renamedTitle) {
                setRenamedTitle(found.label);
              }
              setIsMobileCategoryPickerOpen(false);
              setCurrentView('main');
              triggerHaptic('light');
            }}
            onAddCategory={onAddCategory}
            transactions={transactions}
          />
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
