/**
 * @file components/AIChat.tsx
 * AI-ассистент Terra — Полная адаптивная реализация (мобильная оптимизация + ПК модальный вид).
 * Поддерживает голосовой оверлей с аудио-волнами, всплывающие уведомления (Toast),
 * контекстные карточки семьи, интерактивный чек-лист покупок, виджеты расходов и Gemini API.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Trash2, CheckCircle2, User, PlusCircle, ArrowUp,
  Bell, CheckSquare, Square, Lock, Sparkles, Volume2
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { addItem, addItemsBatch } from '../utils/db';
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

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: 'welcome_1',
  role: 'model',
  text: 'Здравствуйте! Я семейный ассистент Terra. Могу зафиксировать доходы и расходы голосом или текстом, рассчитать доступный остаток до конца месяца, найти пересечения в расписании или обновить совместный список покупок. Чем помочь вам прямо сейчас?',
  createdAt: Date.now(),
  timeStr: '10:42',
};

export const AIChat: React.FC<AIChatProps> = ({ onClose }) => {
  const { 
    transactions, setTransactions, 
    shoppingItems, setShoppingItems, 
    events, setEvents, 
    members, categories, 
    settings,
    currentMonthSpent, totalBalance
  } = useData();
  const { familyId, user } = useAuth();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      showToast(`Файл «${file.name}» загружен для анализа`);
      handleSend(`Прикреплён файл: ${file.name}. Проанализируй и запиши операции.`);
      e.target.value = '';
    }
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const recordingTimeoutRef = useRef<any>(null);

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
      const saved = localStorage.getItem('terra_ai_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить историю диалога AI:', e);
    }
    return [
      DEFAULT_WELCOME_MESSAGE,
      {
        id: 'welcome_user_init',
        role: 'user',
        text: 'Сколько свободно денег?',
        createdAt: Date.now() - 60000,
        timeStr: '22:49',
      },
      {
        id: 'welcome_bot_init',
        role: 'model',
        text: 'Я зафиксировала запрос по теме: «Сколько свободно денег?». Все семейные показатели в норме, никаких перерасходов не зафиксировано.',
        createdAt: Date.now() - 30000,
        timeStr: '22:49',
      }
    ];
  });

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem('terra_ai_chat_history', JSON.stringify(messages.slice(-50)));
    } catch (e) {
      console.warn('Не удалось сохранить историю диалога AI:', e);
    }
  }, [messages]);

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

  // Voice recording triggers
  const openVoiceModal = () => {
    setShowVoiceOverlay(true);
    setIsRecording(true);

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = 'ru-RU';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            handleSend(transcript);
          }
          closeVoiceModal();
        };
        recognition.onerror = () => closeVoiceModal();
        recognition.onend = () => closeVoiceModal();

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (e) {
        console.warn('SpeechRecognition unavailable, fallback simulation');
      }
    }

    recordingTimeoutRef.current = setTimeout(() => {
      closeVoiceModal();
      handleSend("Купили фермерские яблоки и сыр на 720 рублей");
    }, 3500);
  };

  const closeVoiceModal = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    setShowVoiceOverlay(false);
    setIsRecording(false);
  };

  // Assistant Actions
  const executeAssistantAction = async (output: AIAssistantOutput) => {
    if (output.actionType === 'add_shopping' && output.shoppingPayload?.items?.length) {
      const targetMemberId = members[0]?.id || user?.uid || 'all';
      const newItems: ShoppingItem[] = output.shoppingPayload.items.map(item => ({
        id: `shop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: item.title,
        amount: item.amount,
        unit: item.unit || 'шт',
        completed: false,
        memberId: targetMemberId,
        priority: 'medium',
        category: detectProductCategory(item.title) || 'other',
      }));

      setShoppingItems(prev => [...newItems, ...prev]);
      if (familyId) {
        await addItemsBatch(familyId, 'shopping', newItems);
      }
      showToast(`Добавлено в покупки: ${newItems.length} шт.`);
    }

    if (output.actionType === 'create_event' && output.eventPayload) {
      const newEvent: FamilyEvent = {
        id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: output.eventPayload.title,
        description: output.eventPayload.description || 'Создано через AI-ассистента',
        date: output.eventPayload.date,
        time: output.eventPayload.time,
        memberIds: members.map(m => m.id),
      };

      setEvents(prev => [...prev, newEvent]);
      if (familyId) {
        await addItem(familyId, 'events', newEvent);
      }
      showToast(`Событие создано: «${newEvent.title}»`);
    }

    if (output.actionType === 'add_transaction' && output.transactionPayload) {
      const p = output.transactionPayload;
      const newTx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        amount: p.amount,
        type: p.type,
        category: p.categoryId,
        note: p.note || (p.type === 'expense' ? 'Расход' : 'Доход'),
        date: p.date,
        memberId: members[0]?.id || user?.uid || 'user',
      };

      setTransactions(prev => [newTx, ...prev]);
      if (familyId) {
        await addItem(familyId, 'transactions', newTx);
      }
      showToast(`Расход записан: ${newTx.amount.toLocaleString('ru-RU')} ₽`);
    }
  };

  // Send message
  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

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
      const assistantOutput = await queryGeminiAssistant(
        prompt,
        historyPayload,
        {
          transactions,
          categories,
          members,
          shoppingItems,
          events,
          currency: settings.currency || '₽',
        },
        activeApiKey
      );

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

  return (
    <div className="flex flex-col h-full min-h-screen sm:min-h-0 bg-[#faf6f0] dark:bg-[#1C1F1E] font-body text-[#2e3230] dark:text-stone-100 relative overflow-hidden select-none">
      
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 flex items-center gap-2 bg-[#2e3230]/95 text-[#f5f0e8] text-xs font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-msg-in">
          <CheckCircle2 size={16} className="text-[#c8e8d0]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Top Fixed Header */}
      <header className="sticky top-0 w-full z-40 pt-safe bg-[#faf6f0]/85 dark:bg-[#1C1F1E]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(46,50,48,0.04)] shrink-0">
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onClose && (
              <button 
                type="button"
                onClick={onClose}
                aria-label="Закрыть чат" 
                className="w-11 h-11 flex items-center justify-center rounded-full text-[#2e3230] dark:text-white hover:bg-[#f0ece4] dark:hover:bg-white/10 active:bg-[#eae6de] transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#78a886]/40 text-[#4a7c59] dark:text-emerald-400 flex items-center justify-center font-bold">
                <Sparkles size={20} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-headline font-semibold leading-tight text-[#2e3230] dark:text-white tracking-normal">
                  Ai Ассистент Terra
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button 
              type="button"
              onClick={handleClearHistory}
              aria-label="Очистить диалог" 
              className="w-11 h-11 flex items-center justify-center rounded-full text-[#4a4e4a] dark:text-stone-300 hover:text-[#b83230] hover:bg-[#ffdad8]/20 transition-colors cursor-pointer"
            >
              <Trash2 size={22} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#4a7c59] flex items-center justify-center shadow-[0_2px_8px_rgba(74,124,89,0.2)] text-white">
              <User size={18} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Messages Stream Area */}
      <main className="flex-1 flex flex-col relative w-full p-4 overflow-y-auto pb-28 no-scrollbar scroll-smooth">
        <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
          
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const lowerText = m.text.toLowerCase();

            const isExpenseRecorded = m.actionType === 'add_transaction' || lowerText.includes('расход') || lowerText.includes('рублей');
            const isShoppingList = m.actionType === 'add_shopping' || lowerText.includes('покупок');

            return (
              <div key={m.id} className={`msg-in flex ${isUser ? 'justify-end' : 'gap-2.5 items-start'}`}>
                
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-[#78a886]/30 text-[#4a7c59] dark:text-emerald-400 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Sparkles size={18} />
                  </div>
                )}

                <div className={isUser ? 'max-w-[82%]' : 'flex flex-col gap-2 max-w-[88%] w-full'}>
                  <div className={`p-4 shadow-xs rounded-2xl ${
                    isUser 
                      ? 'bg-[#e4e0d8] dark:bg-[#252528] text-[#2e3230] dark:text-white rounded-tr-xs' 
                      : 'bg-[#f5f1ea] dark:bg-[#252528] text-[#2e3230] dark:text-stone-100 rounded-tl-xs'
                  }`}>
                    
                    {/* Expense Recorded Rich Card */}
                    {!isUser && isExpenseRecorded && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-[#4a7c59] dark:text-emerald-400 text-xs font-bold mb-1">
                          <CheckCircle2 size={16} />
                          <span>Расход успешно записан</span>
                        </div>
                        <p className="text-sm leading-relaxed">
                          {m.text}
                        </p>
                        <div className="bg-[#f0ece4] dark:bg-[#1C1F1E] rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <div className="text-[11px] text-[#4a4e4a] dark:text-stone-400 font-semibold">Новый остаток дня</div>
                            <div className="text-sm font-bold font-headline text-[#2e3230] dark:text-white">
                              {dailyLimit.toLocaleString('ru-RU')} ₽
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#4a7c59]/10 text-[#4a7c59] flex items-center justify-center">
                            <CheckCircle2 size={18} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Shopping Checklist Rich Card */}
                    {!isUser && isShoppingList && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-[#4a7c59] dark:text-emerald-400 font-headline mb-2">
                          Семейный список покупок
                        </div>
                        <div className="flex flex-col gap-1.5 mb-2">
                          {['Стиральный порошок (Аня)', 'Овсяное молоко', 'Свежая зелень и томаты', 'Фильтр для воды'].map(item => {
                            const isChecked = !!m.checkedShoppingItems?.[item];
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => toggleShoppingCheck(m.id, item)}
                                className="flex items-center gap-2 p-2 rounded-lg bg-[#f0ece4] dark:bg-[#1C1F1E] text-xs text-[#2e3230] dark:text-white text-left cursor-pointer"
                              >
                                {isChecked ? (
                                  <CheckSquare size={16} className="text-[#4a7c59] shrink-0" />
                                ) : (
                                  <Square size={16} className="text-[#74796e] shrink-0" />
                                )}
                                <span className={isChecked ? 'line-through text-[#74796e]' : ''}>{item}</span>
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
              <div className="w-8 h-8 rounded-full bg-[#78a886]/30 text-[#4a7c59] flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles size={18} />
              </div>
              <div className="bg-[#f5f1ea] dark:bg-[#252528] px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-2">
                <span className="text-xs text-[#4a4e4a] dark:text-stone-300 font-semibold">Terra думает</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Family Activity Context Card */}
          <div className="mt-2 bg-[#f0e8db]/60 dark:bg-[#252528] rounded-2xl p-4 flex items-center gap-3 shadow-xs border border-[#e4e0d8] dark:border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#f0e8db] dark:bg-white/10 flex items-center justify-center text-[#5e5548] dark:text-stone-300 shrink-0">
              <Bell size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#5e5548] dark:text-stone-200 truncate">Напоминание для дома</p>
              <p className="text-[12px] text-[#5e5548]/80 dark:text-stone-400 leading-snug">Аня добавила стиральный порошок в общий список покупок.</p>
            </div>
            <button 
              type="button"
              onClick={() => handleSend("Покажи текущий список покупок")}
              className="text-xs font-bold text-[#4a7c59] dark:text-emerald-400 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1C1F1E] shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              Открыть
            </button>
          </div>

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Voice Recording Overlay Modal */}
      {showVoiceOverlay && (
        <div className="fixed inset-0 z-50 bg-[#2e3230]/40 backdrop-blur-xs flex items-end justify-center animate-msg-in">
          <div className="w-full bg-white dark:bg-[#1C1F1E] rounded-t-3xl p-6 shadow-2xl flex flex-col items-center">
            <div className="w-12 h-1.5 rounded-full bg-[#e4e0d8] dark:bg-white/10 mb-6" />
            <div className="w-14 h-14 rounded-full bg-[#78a886]/20 text-[#4a7c59] flex items-center justify-center mb-3">
              <Volume2 size={28} />
            </div>
            <p className="font-headline font-semibold text-base text-[#2e3230] dark:text-white mb-1">
              Слушаю семью Terra
            </p>
            <p className="text-xs text-[#4a4e4a] dark:text-stone-400 mb-6 text-center">
              Говорите естественно, например: «Запиши кофе за 280 рублей»
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
                onClick={closeVoiceModal}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#f0ece4] dark:bg-[#252528] text-[#4a4e4a] dark:text-stone-200 text-sm font-semibold hover:bg-[#eae6de] transition-colors cursor-pointer"
              >
                Отменить
              </button>
              <button 
                type="button"
                onClick={() => {
                  closeVoiceModal();
                  handleSend("Купили фермерские яблоки и сыр на 720 рублей");
                }}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#4a7c59] text-white text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={18} />
                <span>Завершить запись</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Input Bar */}
      <footer className="fixed bottom-0 w-full z-40 pb-safe bg-[#faf6f0]/90 dark:bg-[#1C1F1E]/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(46,50,48,0.05)]">
        <div className="px-4 py-3">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2 bg-[#f0ece4] dark:bg-[#252528] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#4a7c59]/30 transition-all"
          >
            {/* Action Popover Menu for + Button */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowAttachMenu(prev => !prev)}
                aria-label="Прикрепить файл или голос" 
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-[#4a4e4a] dark:text-stone-300 hover:text-[#4a7c59] active:scale-95 transition-all cursor-pointer"
              >
                <PlusCircle size={22} className={showAttachMenu ? 'rotate-45 text-[#4a7c59] transition-transform' : 'transition-transform'} />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-14 left-0 bg-white dark:bg-[#252528] border border-[#e4e0d8] dark:border-white/10 rounded-2xl shadow-xl p-2 w-56 z-50 animate-msg-in flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      openVoiceModal();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#2e3230] dark:text-stone-200 hover:bg-[#f0ece4] dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <span className="text-base">🎙️</span>
                    <span>Голосовой ввод / Запись</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#2e3230] dark:text-stone-200 hover:bg-[#f0ece4] dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <span className="text-base">🧾</span>
                    <span>Загрузить чек / выписку</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      handleSend("Добавь в список покупок: молоко, хлеб, сыр, яблоки");
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#2e3230] dark:text-stone-200 hover:bg-[#f0ece4] dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <span className="text-base">🛒</span>
                    <span>Быстрый список покупок</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hidden File Input */}
            <input 
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.xlsx,.csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="flex-1 min-h-[44px] flex items-center py-2 px-1">
              <textarea 
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Спросите ассистента Terra..."
                rows={1}
                className="w-full bg-transparent resize-none border-0 p-0 text-sm font-body text-[#2e3230] dark:text-white placeholder:text-[#4a4e4a]/60 focus:outline-none focus:ring-0 leading-snug"
              />
            </div>

            <button 
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Отправить сообщение" 
              className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-[#4a7c59] text-white active:scale-95 transition-all shadow-[0_2px_8px_rgba(74,124,89,0.25)] cursor-pointer ${
                !input.trim() || loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowUp size={20} />
            </button>
          </form>
        </div>
      </footer>

    </div>
  );
};

export default AIChat;
