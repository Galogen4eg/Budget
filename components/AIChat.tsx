/**
 * @file components/AIChat.tsx
 * AI-ассистент Terra — Полная адаптивная реализация (мобильная оптимизация + ПК модальный вид).
 * Поддерживает голосовой оверлей с аудио-волнами, всплывающие уведомления (Toast),
 * контекстные карточки семьи, интерактивный чек-лист покупок, виджеты расходов и Gemini API.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Trash2, CheckCircle2, User, PlusCircle, ArrowUp,
  CheckSquare, Square, Lock, Sparkles, Volume2
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { addItem, addItemsBatch, saveTransactionWithGoal } from '../utils/db';
import { queryGrokAssistant } from '../utils/grokAssistant';
import { updateGrokSettings } from '../utils/grokClient';
import { ConfirmationModal } from './ConfirmationModal';
import {useModalSurface} from '../hooks/useDialogFocus';
import useModalBackHandler from '../hooks/useModalBackHandler';
import { detectProductCategory } from '../utils/categorizer';
import { 
  queryGeminiAssistant, 
  AIAssistantOutput, 
  ShoppingActionPayload, 
  EventActionPayload, 
  TransactionActionPayload, 
  RuleActionPayload, 
  FinancialStats 
} from '../utils/aiAssistant';
import { ShoppingItem, FamilyEvent, Transaction } from '../types';

interface Message {
  readonly id: string;
  readonly role: 'user' | 'model';
  readonly text: string;
  readonly actionType?: string;
  readonly shoppingPayload?: ShoppingActionPayload;
  readonly eventPayload?: EventActionPayload;
  readonly transactionPayload?: TransactionActionPayload;
  readonly rulePayload?: RuleActionPayload;
  readonly financialStats?: FinancialStats;
  readonly isError?: boolean;
  readonly createdAt: number;
  readonly timeStr: string;
  checkedShoppingItems?: Record<string, boolean>;
}

interface AIChatProps {
  readonly onClose?: () => void;
  readonly onOpenSettings?: () => void;
}

const getCurrentFormattedTime = () => {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const createWelcomeMessage = (): Message => ({
  id: 'welcome_1',
  role: 'model',
  text: 'Чем помочь? Можно спросить о бюджете, покупках или планах.',
  createdAt: Date.now(),
  timeStr: getCurrentFormattedTime(),
});

export const AIChat: React.FC<AIChatProps> = ({ onClose, onOpenSettings }) => {
  const { 
    transactions, setTransactions, 
    shoppingItems, setShoppingItems, 
    events, setEvents, 
    members, categories, 
    settings, householdPersonal,
    currentMonthSpent, totalBalance, displayTransactions, displayMembers, financialDataStatus
  } = useData();
  const { familyId, user, isOfflineMode } = useAuth();
  const [provider,setProvider]=useState<'loading'|'existing'|'grok'|'unavailable'>(user&&!isOfflineMode?'loading':'existing');
  const [grokProposal,setGrokProposal]=useState<{id:string;output:AIAssistantOutput;description:string}|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    if(!user||isOfflineMode){setProvider('existing');return ()=>controller.abort();}
    setProvider('loading');
    updateGrokSettings(user.uid,{action:'status'},controller.signal).then(status=>{if(!controller.signal.aborted)setProvider(status.enabled?'grok':'existing');}).catch(()=>{if(!controller.signal.aborted)setProvider('unavailable');});
    return ()=>controller.abort();
  },[user?.uid,isOfflineMode]);
  const historyKey='terra_ai_chat_history:'+JSON.stringify([familyId??'local',user?.uid??'demo',householdPersonal?'personal':'family']);
  const activeScopeRef=useRef(true);
  useEffect(()=>{activeScopeRef.current=true;return ()=>{activeScopeRef.current=false;};},[]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachRef = useRef<HTMLButtonElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  useEffect(()=>()=>{
    const recognition=recognitionRef.current;
    recognitionRef.current=null;
    if(recognition){try{recognition.abort();}catch{}}
  },[]);

  // Gemini API Key
  const activeApiKey = useMemo(() => {
    return (
      settings.geminiApiKey?.trim() || 
      (typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY || process.env.API_KEY) : '') ||
      ''
    );
  }, [settings.geminiApiKey]);

  // Load chat history
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove only the two known synthetic initial messages, never user-created history.
          const actual=parsed.filter((m:Message)=>m.id!=='welcome_user_init'&&m.id!=='welcome_bot_init');
          return actual.length?actual:[createWelcomeMessage()];
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить историю диалога AI:', e);
    }
    return [createWelcomeMessage()];
  });

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(messages.slice(-50)));
    } catch (e) {
      console.warn('Не удалось сохранить историю диалога AI:', e);
    }
  }, [messages,historyKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Financial calculations
  const freeBalance = useMemo(() => {
    return Math.max(0, totalBalance - currentMonthSpent);
  }, [totalBalance, currentMonthSpent]);

  const daysLeftInMonth = useMemo(() => {
    const now = new Date();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, totalDays - now.getDate());
  }, []);

  const dailyLimit = useMemo(() => {
    return Math.round(freeBalance / daysLeftInMonth);
  }, [freeBalance, daysLeftInMonth]);

  // Voice is a draft input, never a fabricated or automatic financial command.
  const closeVoiceModal = () => {
    const recognition=recognitionRef.current;
    recognitionRef.current=null;
    if(recognition){try{recognition.abort();}catch{}}
    setShowVoiceOverlay(false);
  };
  const voiceSurface=useModalSurface(closeVoiceModal,{enabled:showVoiceOverlay,initialSelector:'[data-voice-cancel]'});
  useModalBackHandler(showVoiceOverlay,closeVoiceModal);
  const openVoiceModal = () => {
    const SpeechRecognitionClass=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SpeechRecognitionClass){toast.error('Голосовой ввод недоступен. Введите запрос текстом.');return;}
    try{
      const recognition=new SpeechRecognitionClass();
      recognition.lang='ru-RU';
      recognition.continuous=false;
      recognition.interimResults=false;
      recognitionRef.current=recognition;
      recognition.onresult=(event:any)=>{
        if(recognitionRef.current!==recognition)return;
        const transcript=String(event.results?.[0]?.[0]?.transcript??'').trim();
        if(transcript)setInput(previous=>[previous.trim(),transcript].filter(Boolean).join(' '));
      };
      recognition.onend=()=>{
        if(recognitionRef.current!==recognition)return;
        recognitionRef.current=null;
        setShowVoiceOverlay(false);
      };
      recognition.onerror=()=>{
        if(recognitionRef.current!==recognition)return;
        closeVoiceModal();
        toast.error('Не удалось распознать речь. Попробуйте снова.');
      };
      recognition.start();
      setShowVoiceOverlay(true);
    }catch{
      closeVoiceModal();
      toast.error('Не удалось запустить голосовой ввод.');
    }
  };
  const finishVoiceRecording=()=>{
    try{recognitionRef.current?.stop();}
    catch{closeVoiceModal();toast.error('Не удалось завершить запись.');}
  };

  // Assistant Actions
  const executeAssistantAction = async (output: AIAssistantOutput, proposalId?:string) => {
    if(proposalId&&(!familyId||!activeScopeRef.current))throw new Error('Семейное пространство не подтверждено');
    if (output.actionType === 'add_shopping' && output.shoppingPayload?.items?.length) {
      const targetMemberId = members[0]?.id || user?.uid || 'all';
      const newItems: ShoppingItem[] = output.shoppingPayload.items.map((item,index) => ({
        id: proposalId?'shop_'+proposalId+'_'+index:`shop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: item.title,
        amount: item.amount,
        unit: item.unit || 'шт',
        completed: false,
        memberId: targetMemberId,
        priority: 'medium',
        category: detectProductCategory(item.title) || 'other',
      }));

      if (familyId) {
        await addItemsBatch(familyId, 'shopping', newItems);
      }
      if(activeScopeRef.current)setShoppingItems(prev => [...newItems.filter(item=>!prev.some(old=>old.id===item.id)), ...prev]);
      showToast(`Добавлено в покупки: ${newItems.length} шт.`);
    }

    if (output.actionType === 'create_event' && output.eventPayload) {
      const newEvent: FamilyEvent = {
        id: proposalId?'ev_'+proposalId:`ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: output.eventPayload.title,
        description: output.eventPayload.description || 'Создано через AI-ассистента',
        date: output.eventPayload.date,
        time: output.eventPayload.time,
        memberIds: members.map(m => m.id),
      };

      if (familyId) {
        await addItem(familyId, 'events', newEvent);
      }
      if(activeScopeRef.current)setEvents(prev => prev.some(e=>e.id===newEvent.id)?prev:[...prev,newEvent]);
      showToast(`Событие создано: «${newEvent.title}»`);
    }

    if (output.actionType === 'add_transaction' && output.transactionPayload) {
      const p = output.transactionPayload;
      const owner = members.find(m=>m.userId && m.userId===user?.uid)?.id;
      if ((householdPersonal||proposalId) && !owner) throw new Error('Личный финансовый профиль недоступен');
      const newTx: Transaction = {
        id: proposalId?'tx_'+proposalId:`tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        amount: p.amount,
        type: p.type,
        category: p.categoryId,
        note: p.note || (p.type === 'expense' ? 'Расход' : 'Доход'),
        date: p.date,
        memberId: owner || members[0]?.id || user?.uid || 'user',
      };

      if (!familyId) throw new Error('Семья не подключена');
      if(proposalId)await saveTransactionWithGoal(familyId,newTx,false);
      else await addItem(familyId, 'transactions', newTx);
      if(activeScopeRef.current)setTransactions(prev => prev.some(tx=>tx.id===newTx.id)?prev:[newTx, ...prev]);
      showToast(`Расход записан: ${newTx.amount.toLocaleString('ru-RU')} ₽`);
    }
  };

  // Send message
  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading || grokProposal) return;
    if(provider==='loading'||provider==='unavailable'){toast.error('Подключение Grok не подтверждено. Выберите доступный режим.');return;}
    if(provider==='grok'&&(!user||!familyId||(!settings.privacyMode&&financialDataStatus!=='ready'))){toast.error('Дождитесь подтверждения данных бюджета');return;}

    if (showVoiceOverlay) closeVoiceModal();

    const nowTime = getCurrentFormattedTime();
    const userMessage: Message = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      text: prompt,
      createdAt: Date.now(),
      timeStr: nowTime,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map(m => ({ role: m.role, text: m.text }));
      const context={
        transactions:provider==='grok'?(settings.privacyMode?[]:displayTransactions):transactions,
        categories,
        members:provider==='grok'?displayMembers:householdPersonal?members.filter(m=>m.userId&&m.userId===user?.uid):members,
        shoppingItems,events,currency:settings.currency||'₽',
      };
      const assistantOutput=provider==='grok'&&user
        ?await queryGrokAssistant(user.uid,prompt,historyPayload,context,Boolean(settings.privacyMode))
        :await queryGeminiAssistant(prompt,historyPayload,context,activeApiKey);
      if(!activeScopeRef.current)return;
      if(provider==='grok'&&['add_transaction','add_shopping','create_event'].includes(assistantOutput.actionType)){
        const tx=assistantOutput.transactionPayload,ev=assistantOutput.eventPayload,items=assistantOutput.shoppingPayload?.items;
        const owner=members.find(m=>m.userId===user?.uid);
        if(tx&&!owner)throw new Error('Профиль участника не подтверждён');
        const description=tx
          ?(tx.type==='income'?'Доход: ':'Расход: ')+tx.amount.toLocaleString('ru-RU',{maximumFractionDigits:2})+' '+context.currency+' · '+(categories.find(cat=>cat.id===tx.categoryId)?.label||tx.categoryId)+' · '+tx.date+' · '+owner?.name+(tx.note?' · '+tx.note:'')
          :ev?ev.title+' · '+ev.date+' '+ev.time:items?.map(item=>item.title+' ('+item.amount+' '+item.unit+')').join(', ')||'';
        setGrokProposal({id:crypto.randomUUID(),output:assistantOutput,description});
        return;
      }
      await executeAssistantAction(assistantOutput);

      const botMessage: Message = {
        id: `msg_bot_${Date.now()}`,
        role: 'model',
        text: assistantOutput.replyText,
        actionType: assistantOutput.actionType,
        shoppingPayload: assistantOutput.shoppingPayload,
        eventPayload: assistantOutput.eventPayload,
        transactionPayload: assistantOutput.transactionPayload,
        rulePayload: assistantOutput.rulePayload,
        financialStats: assistantOutput.financialStats,
        createdAt: Date.now(),
        timeStr: getCurrentFormattedTime(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      let errorText = err instanceof Error ? err.message : 'Произошла ошибка связи с AI';
      setMessages(prev => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'model',
          text: `⚠️ ${errorText}`,
          isError: true,
          createdAt: Date.now(),
          timeStr: getCurrentFormattedTime(),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'model',
        text: 'История диалога успешно очищена. Я готов к новым задачам! Чем могу помочь вашей семье прямо сейчас?',
        createdAt: Date.now(),
        timeStr: getCurrentFormattedTime(),
      }
    ]);
    showToast('Переписка очищена');
  };

  const toggleShoppingCheck = (msgId: string, itemTitle: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        const currentChecked = m.checkedShoppingItems || {};
        return {
          ...m,
          checkedShoppingItems: {
            ...currentChecked,
            [itemTitle]: !currentChecked[itemTitle]
          }
        };
      }
      return m;
    }));
  };

  const toggleRealShoppingItem = async (title: string) => {
    const existing = shoppingItems.find(i => i.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      const updated = shoppingItems.map(i => i.id === existing.id ? { ...i, completed: !i.completed } : i);
      setShoppingItems(updated);
      if (familyId) {
        await addItem(familyId, 'shopping', { ...existing, completed: !existing.completed });
      }
      toast.success(`Статус покупки «${title}» изменен`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--terra-surface)] text-[var(--terra-ink)] font-body relative overflow-hidden min-h-0"
      onKeyDown={e=>{if(e.key==='Escape'&&showAttachMenu){e.preventDefault();e.stopPropagation();attachRef.current?.focus();setShowAttachMenu(false);}}}>
      
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 flex items-center gap-2 bg-[#2e3230]/95 text-[#f5f0e8] text-xs font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-msg-in">
          <CheckCircle2 size={16} className="text-[#c8e8d0]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Top Fixed Header */}
      <header className="w-full z-40 pt-[env(safe-area-inset-top,0px)] bg-[var(--terra-surface)] border-b border-[var(--terra-border)] shrink-0">
        <div className="min-h-[56px] px-3 sm:px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onClose && (
              <button 
                type="button"
                onClick={onClose}
                aria-label="Закрыть чат" 
                className="w-11 h-11 flex items-center justify-center rounded-full text-[var(--terra-ink)] hover:bg-[#f0ece4] dark:hover:bg-white/10 active:bg-[#eae6de] transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)] flex items-center justify-center font-bold">
                <Sparkles size={20} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-headline font-semibold leading-tight text-[var(--terra-ink)] tracking-normal">
                  ИИ-помощник
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button 
              type="button"
              onClick={handleClearHistory}
              aria-label="Очистить диалог" 
              className="w-11 h-11 flex items-center justify-center rounded-full text-[#4a4e4a] dark:text-stone-300 hover:text-[var(--terra-danger-text)] hover:bg-[var(--terra-danger-soft)] transition-colors cursor-pointer"
            >
              <Trash2 size={22} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)] flex items-center justify-center">
              <User size={18} />
            </div>
          </div>
        </div>
        <div className="px-4 pb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--terra-muted)]">
          <span role="status">{provider==='loading'?'Проверка Grok…':provider==='grok'?'Grok':provider==='unavailable'?'Grok недоступен':activeApiKey?'Gemini / локальный режим':'Локальный режим'}</span>
          {provider==='unavailable'&&<button type="button" className="min-h-[44px] text-sm font-semibold text-[var(--terra-primary-text)]" onClick={()=>setProvider('existing')}>Использовать прежний режим</button>}
          {onOpenSettings&&<button type="button" className="min-h-[44px] px-2 text-sm font-semibold text-[var(--terra-primary-text)]" onClick={onOpenSettings}>Настройки</button>}
        </div>
      </header>

      {/* Main Messages Stream Area */}
      <main data-testid="terra-ai-messages" className="flex-1 min-h-0 flex flex-col relative w-full p-3 sm:p-4 overflow-y-auto overscroll-y-contain">
        <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full min-w-0 [overflow-wrap:anywhere]">
          
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const isExpenseRecorded = !isUser&&!m.isError&&m.actionType==='add_transaction'&&Boolean(m.transactionPayload);
            const isShoppingList = !isUser&&!m.isError&&m.actionType==='add_shopping'&&Boolean(m.shoppingPayload);

            return (
              <div key={m.id} className={`msg-in flex ${isUser ? 'justify-end' : 'gap-2.5 items-start'}`}>
                
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)] flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Sparkles size={18} />
                  </div>
                )}

                <div className={isUser ? 'max-w-[82%]' : 'flex flex-col gap-2 max-w-[88%] w-full'}>
                  <div className={`p-4 shadow-xs rounded-2xl ${
                    isUser 
                      ? 'bg-[var(--terra-soft)] text-[var(--terra-ink)] rounded-tr-xs' 
                      : 'bg-[var(--terra-soft)] text-[var(--terra-ink)] rounded-tl-xs'
                  }`}>
                    
                    {/* Expense Recorded Rich Card */}
                    {!isUser && isExpenseRecorded && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-[var(--terra-primary-text)] text-xs font-bold mb-1">
                          <CheckCircle2 size={16} />
                          <span>Операция сохранена</span>
                        </div>
                        <p className="text-sm leading-relaxed">
                          {m.text}
                        </p>
                      </div>
                    )}

                    {/* Shopping Checklist Rich Card */}
                    {!isUser && isShoppingList && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-[var(--terra-primary-text)] font-headline mb-2">
                          Семейный список покупок
                        </div>
                        <div className="flex flex-col gap-1.5 mb-2">
                          {((m.shoppingPayload?.items && m.shoppingPayload.items.length > 0) 
                            ? m.shoppingPayload.items 
                            : shoppingItems.slice(0, 4)
                          ).map((item, idx) => {
                            const title = typeof item === 'string' ? item : item.title;
                            const isDbItem = shoppingItems.find(i => i.title.toLowerCase() === title.toLowerCase());
                            const isChecked = isDbItem ? isDbItem.completed : !!m.checkedShoppingItems?.[title];
                            
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (isDbItem) {
                                    toggleRealShoppingItem(title);
                                  } else {
                                    toggleShoppingCheck(m.id, title);
                                  }
                                }}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#1C1F1E] border border-gray-200/50 dark:border-white/5 text-xs text-[var(--terra-ink)] text-left cursor-pointer transition-all active:scale-[0.98]"
                              >
                                {isChecked ? (
                                  <CheckSquare size={16} className="text-[var(--terra-primary-text)] shrink-0" />
                                ) : (
                                  <Square size={16} className="text-[#74796e] shrink-0" />
                                )}{' '}
                                <span className={isChecked ? 'line-through text-[#74796e]' : ''}>
                                  {title} {(!isDbItem && typeof item !== 'string' && item.amount) ? `(${item.amount} ${item.unit || 'шт'})` : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Standard Text */}
                    {(!isExpenseRecorded && !isShoppingList) && (
                      <p className="text-sm leading-relaxed">{m.text}</p>
                    )}

                    <div className="text-[10px] text-[#4a4e4a]/70 dark:text-stone-400 text-right mt-2 font-semibold font-mono">
                      {m.timeStr}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}

          {/* Typing State Bubble */}
          {loading && (
            <div className="flex gap-2.5 items-center animate-msg-in">
              <div className="w-8 h-8 rounded-full bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)] flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles size={18} />
              </div>
              <div className="bg-[var(--terra-soft)] px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-2">
                <span className="text-xs text-[#4a4e4a] dark:text-stone-300 font-semibold">Terra думает</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}



          <div ref={bottomRef} />
        </div>
      </main>

      {/* Voice Recording Overlay Modal */}
      {showVoiceOverlay && (
        <div className="fixed inset-0 z-50 bg-[#2e3230]/40 backdrop-blur-xs flex items-end justify-center animate-msg-in">
          <div {...voiceSurface} role="dialog" aria-modal="true" aria-label="Голосовой ввод" className="w-full max-w-lg bg-[var(--terra-surface)] border border-[var(--terra-border)] rounded-t-2xl p-4 flex flex-col items-center">
            <div className="w-12 h-1.5 rounded-full bg-[#e4e0d8] dark:bg-white/10 mb-6" />
            <div className="w-14 h-14 rounded-full bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)] flex items-center justify-center mb-3">
              <Volume2 size={28} />
            </div>
            <p className="font-headline font-semibold text-base text-[var(--terra-ink)] mb-1">
              Голосовой ввод
            </p>
            <p className="text-xs text-[#4a4e4a] dark:text-stone-400 mb-6 text-center">
              Распознанный текст появится в поле сообщения.
            </p>

            {/* Audio Waveform Live Bars */}
            <div className="flex items-center justify-center gap-1.5 h-14 mb-8 w-full max-w-xs px-4">
              <span className="w-1.5 bg-[#4a7c59] rounded-full animate-wave-1 h-3" />
              <span className="w-1.5 bg-[#4a7c59] rounded-full animate-wave-2 h-7" />
              <span className="w-1.5 bg-[#4a7c59] rounded-full animate-wave-3 h-12" />
              <span className="w-1.5 bg-[#4a7c59] rounded-full animate-wave-4 h-5" />
              <span className="w-1.5 bg-[#4a7c59] rounded-full animate-wave-2 h-9" />
              <span className="w-1.5 bg-[#4a7c59] rounded-full animate-wave-1 h-4" />
            </div>

            <div className="flex items-center gap-3 w-full">
              <button 
                type="button"
                onClick={closeVoiceModal} data-voice-cancel
                className="flex-1 min-h-[44px] py-3.5 px-4 rounded-xl bg-[#f0ece4] dark:bg-[#252528] text-[#4a4e4a] dark:text-stone-200 text-sm font-semibold hover:bg-[#eae6de] transition-colors cursor-pointer"
              >
                Отменить
              </button>
              <button 
                type="button"
                onClick={finishVoiceRecording}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={18} />
                <span>Завершить запись</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Input Bar (Scoped to Chat Modal) */}
      <footer data-testid="terra-ai-composer" className="w-full z-40 shrink-0 pb-[env(safe-area-inset-bottom,0px)] bg-[var(--terra-surface)] border-t border-[var(--terra-border)]">
        <div className="px-4 py-3">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2 bg-[var(--terra-soft)] rounded-xl p-1.5 border border-[var(--terra-border)] focus-within:ring-2 focus-within:ring-[var(--terra-focus)]"
          >
            {/* Action Popover Menu for + Button */}
            <div className="relative">
              <button 
                type="button"
                ref={attachRef}
                onClick={() => setShowAttachMenu(prev => !prev)}
                aria-expanded={showAttachMenu} aria-controls={showAttachMenu?'terra-ai-attachments':undefined}
                aria-label="Дополнительные действия" 
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-[#4a4e4a] dark:text-stone-300 hover:text-[var(--terra-primary-text)] active:scale-95 transition-all cursor-pointer"
              >
                <PlusCircle size={22} className={showAttachMenu ? 'rotate-45 text-[var(--terra-primary-text)] transition-transform' : 'transition-transform'} />
              </button>

              {showAttachMenu && (
                <div id="terra-ai-attachments" role="group" aria-label="Дополнительные действия" className="absolute bottom-14 left-0 bg-[var(--terra-surface)] border border-[var(--terra-border)] rounded-xl shadow-lg p-2 w-56 max-w-[calc(100vw-40px)] z-50 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      attachRef.current?.focus();
                      setShowAttachMenu(false);
                      openVoiceModal();
                    }}
                    className="flex min-h-[44px] items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#2e3230] dark:text-stone-200 hover:bg-[#f0ece4] dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <span className="text-base">🎙️</span>
                    <span>Голосовой ввод / Запись</span>
                  </button>

                  <div className="px-3 py-2 text-xs text-[var(--terra-muted)]">Анализ файлов недоступен. Выписки можно импортировать в разделе «Бюджет».</div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      setInput(previous=>previous.trim()?previous:'Добавь в список покупок: ');
                      textareaRef.current?.focus();
                    }}
                    className="flex min-h-[44px] items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#2e3230] dark:text-stone-200 hover:bg-[#f0ece4] dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <span className="text-base">🛒</span>
                    <span>Быстрый список покупок</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-[44px] flex items-center py-2 px-1">
              <textarea 
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                aria-label="Сообщение ассистенту"
                placeholder="Сообщение"
                rows={2}
                className="w-full bg-transparent resize-none border-0 p-0 text-sm font-body text-[var(--terra-ink)] placeholder:text-[#4a4e4a]/60 focus:outline-none focus:ring-0 leading-snug"
              />
            </div>

            <button 
              type="submit"
              disabled={!input.trim() || loading || provider==='loading' || provider==='unavailable' || Boolean(grokProposal)}
              aria-label="Отправить сообщение" 
              className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] active:scale-95 transition-all shadow-[0_2px_8px_rgba(74,124,89,0.25)] cursor-pointer ${
                !input.trim() || loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowUp size={20} />
            </button>
          </form>
        </div>
      </footer>

      {grokProposal&&<ConfirmationModal isOpen title="Подтвердите действие Grok" message={grokProposal.description}
        isDestructive={false} confirmText="Сохранить" onClose={()=>setGrokProposal(null)}
        onConfirm={async()=>{
          if(!activeScopeRef.current)throw new Error('Аккаунт изменился');
          await executeAssistantAction(grokProposal.output,grokProposal.id);
          if(!activeScopeRef.current)return;
          const output=grokProposal.output;
          setMessages(prev=>[...prev,{id:'confirmed_'+grokProposal.id,role:'model',text:'Сохранено: '+grokProposal.description,actionType:output.actionType,shoppingPayload:output.shoppingPayload,eventPayload:output.eventPayload,transactionPayload:output.transactionPayload,createdAt:Date.now(),timeStr:getCurrentFormattedTime()}]);
          setGrokProposal(null);
        }}/>}

    </div>
  );
};

export default AIChat;
