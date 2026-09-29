/**
 * @file components/AIChat.tsx
 * Двухколоночный командный AI-хаб Terra Workspace для ПК и мобильных устройств.
 * Включает боковую панель контекста семьи (участники, бюджет, события, сценарии),
 * интерактивные чек-листы покупок, события календаря, финансовый анализ и синхронизацию.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, User, Mic, ShoppingBag, Calendar, ArrowUpRight, ArrowDownLeft, 
  Sparkles, BrainCircuit, X, Key, PieChart, CheckCircle2, TrendingDown,
  Trash2, RefreshCw, AlertCircle, ChevronRight, Maximize2, Minimize2,
  Paperclip, Check, Plus, MessageSquare, Lightbulb, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { addItem, addItemsBatch, saveAppSettings } from '../utils/db';
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
import { ShoppingItem, FamilyEvent, Transaction, LearnedRule } from '../types';

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
}

interface AIChatProps {
  readonly onClose?: () => void;
  readonly onOpenSettings?: () => void;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'model',
  text: 'Привет! Я твой семейный AI-ассистент Terra на базе Gemini ✨\n\nЯ помогаю всей семье вести быт и бюджет согласованно: добавляю позиции в список покупок, планирую встречи и анализирую доходы и расходы.',
  createdAt: Date.now(),
};

const QUICK_PROMPTS = [
  { emoji: '🛒', label: 'Молоко, хлеб и яйца', text: 'Добавь в список покупок: молоко 1л, хлеб и яйца 1 десяток' },
  { emoji: '☕', label: 'Кофе 450 ₽', text: 'Запиши расход 450 рублей на кофе' },
  { emoji: '📊', label: 'Сколько потрачено за месяц?', text: 'Сколько я потратил в этом месяце и на что ушло больше всего денег?' },
  { emoji: '📅', label: 'Планы семьи на субботу', text: 'Создай событие на субботу в 12:00: семейный обед' },
];

export const AIChat: React.FC<AIChatProps> = ({ onClose, onOpenSettings }) => {
  const { 
    transactions, setTransactions, 
    shoppingItems, setShoppingItems, 
    events, setEvents, 
    members, categories, 
    settings, updateSettings,
    currentMonthSpent, totalBalance
  } = useData();
  const { familyId, user } = useAuth();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [responseDetailMode, setResponseDetailMode] = useState<'detailed' | 'concise'>('detailed');
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [isKeyInputOpen, setIsKeyInputOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Получаем актуальный ключ Gemini
  const activeApiKey = useMemo(() => {
    return (
      settings.geminiApiKey?.trim() || 
      (typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY || process.env.API_KEY) : '') ||
      ''
    );
  }, [settings.geminiApiKey]);

  // Загрузка сохраненной истории сообщений из localStorage
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
    return [DEFAULT_WELCOME_MESSAGE];
  });

  // Автоматическое сохранение истории диалога в localStorage
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

  // Ближайшее событие семьи
  const nextEvent = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = events
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    return upcoming[0] || null;
  }, [events]);

  // Голосовой ввод Web Speech API
  const toggleListening = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      toast.error('Голосовой ввод не поддерживается вашим браузером');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
      toast.error('Не удалось запустить микрофон');
    }
  };

  // Сохранение API-ключа из всплывающего окна
  const handleSaveApiKey = async () => {
    const trimmed = customKeyInput.trim();
    if (!trimmed) {
      toast.error('Введите API-ключ Gemini');
      return;
    }

    await updateSettings({ ...settings, geminiApiKey: trimmed });
    setIsKeyInputOpen(false);
    setCustomKeyInput('');
    toast.success('API-ключ сохранён!');
  };

  // Применение действий ассистента к базе и локальному состоянию
  const executeAssistantAction = async (output: AIAssistantOutput) => {
    // 1. Добавление покупок
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

      // Мгновенное обновление стейта React
      setShoppingItems(prev => [...newItems, ...prev]);

      // Синхронизация с Firestore или локальным хранилищем
      if (familyId) {
        await addItemsBatch(familyId, 'shopping', newItems);
      } else {
        try {
          const currentLocal = JSON.parse(localStorage.getItem('local_shopping') || '[]');
          localStorage.setItem('local_shopping', JSON.stringify([...newItems, ...currentLocal]));
        } catch {}
      }

      toast.success(`🛒 В список покупок добавлено: ${newItems.map(i => i.title).join(', ')}`);
    }

    // 2. Создание события
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
      toast.success(`📅 Событие запланировано: «${newEvent.title}»`);
    }

    // 3. Запись транзакции
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
      toast.success(`💳 Записано: ${newTx.type === 'income' ? '+' : '-'}${newTx.amount.toLocaleString('ru-RU')} ₽`);
    }
  };

  // Переключение статуса товара прямо из карточки в чате
  const handleToggleItemInChat = async (itemTitle: string) => {
    const existing = shoppingItems.find(i => i.title.toLowerCase() === itemTitle.toLowerCase());
    if (!existing) return;

    const updated = shoppingItems.map(i => i.id === existing.id ? { ...i, completed: !i.completed } : i);
    setShoppingItems(updated);
    toast.success(existing.completed ? `Возвращено: ${existing.title}` : `Куплено: ${existing.title}`);
  };

  // Отправка запроса ассистенту
  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    const userMessage: Message = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      text: prompt,
      createdAt: Date.now(),
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

      // Применяем распознанные действия
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
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      let errorText = err instanceof Error ? err.message : 'Произошла ошибка связи с AI';
      
      const lowerErr = errorText.toLowerCase();
      if (
        lowerErr.includes('quota') || 
        lowerErr.includes('resource_exhausted') || 
        lowerErr.includes('high demand') || 
        lowerErr.includes('overloaded') ||
        lowerErr.includes('429')
      ) {
        errorText = 'Сервис AI испытывает пиковую нагрузку или исчерпан текущий лимит запросов. Пожалуйста, подождите 10-15 секунд и отправьте вопрос снова.';
      }

      setMessages(prev => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'model',
          text: `⚠️ ${errorText}`,
          isError: true,
          createdAt: Date.now(),
        }
      ]);
      if (errorText.includes('API ключ')) {
        setIsKeyInputOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Очистка истории
  const handleClearChat = () => {
    try {
      localStorage.removeItem('terra_ai_chat_history');
    } catch {}
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    toast.info('История диалога очищена');
  };

  return (
    <div className={`flex flex-col bg-[#faf8f5] dark:bg-[#18191C] h-full w-full overflow-hidden select-none ${isExpanded ? 'fixed inset-0 z-[3000]' : ''}`}>
      {/* 1. TOP GLOBAL BAR */}
      <header className="h-14 px-4 sm:px-6 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md border-b border-[#eae4d7] dark:border-white/10 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#4a7c59] flex items-center justify-center text-white shadow-xs">
            <Sparkles size={17} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-[#242b26] dark:text-white">Terra Workspace</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#eaf2ec] text-[#4a7c59] dark:bg-emerald-950/40 dark:text-emerald-300 border border-[#c3dac8]/40 dark:border-emerald-800/40">
              Семейный хаб v2.4
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Telegram Sync Indicator */}
          <div 
            onClick={() => {
              if (!settings.telegramChatId && onOpenSettings) onOpenSettings();
            }}
            className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-[12px] border transition-colors ${
              settings.telegramChatId 
                ? 'bg-[#f4efe6] dark:bg-white/5 border-[#eae4d7] dark:border-white/10 text-[#68726b] dark:text-gray-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 cursor-pointer hover:bg-amber-100'
            }`}
            title={settings.telegramChatId ? `Chat ID: ${settings.telegramChatId}` : 'Нажмите, чтобы настроить Telegram'}
          >
            <span className="truncate max-w-[200px]">
              {settings.telegramChatId ? 'AI синхронизирован с Telegram' : 'Подключить Telegram-бота'}
            </span>
          </div>

          <div className="h-4 w-px bg-[#eae4d7] dark:bg-white/10 hidden sm:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearChat}
              className="p-2 text-stone-500 hover:text-[#242b26] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              title="Очистить историю диалога"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-stone-500 hover:text-[#242b26] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl transition-colors hidden sm:inline-flex cursor-pointer"
              title={isExpanded ? 'Свернуть окно' : 'Развернуть на весь экран'}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-stone-500 hover:text-[#242b26] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                title="Закрыть окно"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. WORKSPACE TWO-COLUMN BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR: Context & Prepared Scenarios (~300px) */}
        <aside className="w-[300px] shrink-0 bg-[#f6f3ed] dark:bg-[#1a1b1e] border-r border-[#eae4d7] dark:border-white/10 hidden lg:flex flex-col justify-between overflow-y-auto p-4 space-y-4">
          <div className="space-y-4">
            {/* SECTION 1: Active Family Context */}
            <div className="bg-white/90 dark:bg-[#202225] rounded-2xl p-3.5 border border-[#eae4d7] dark:border-white/10 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#68726b] dark:text-gray-400">Семейный контекст</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4a7c59] bg-[#eaf2ec] dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Онлайн
                </span>
              </div>

              {/* Family Members Chips */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-stone-500 dark:text-gray-400 font-medium">Участники с доступом:</p>
                <div className="flex flex-wrap gap-1.5">
                  {(members.length > 0 ? members : [{ id: 'me', name: user?.displayName || 'Я', color: '#4a7c59' }]).map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 bg-[#faf8f5] dark:bg-white/5 border border-[#eae4d7] dark:border-white/10 px-2 py-1 rounded-lg text-xs font-medium text-[#242b26] dark:text-gray-200">
                      <span className="w-4 h-4 rounded-full bg-[#4a7c59]/20 text-[#4a7c59] dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate max-w-[90px]">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100 dark:border-white/5">
                <div className="bg-[#faf8f5] dark:bg-white/5 p-2 rounded-xl border border-[#eae4d7]/70 dark:border-white/5">
                  <span className="block text-[10px] text-[#68726b] dark:text-gray-400 font-medium">Расход за месяц</span>
                  <span className="font-bold text-xs text-[#242b26] dark:text-white">
                    {currentMonthSpent.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="bg-[#faf8f5] dark:bg-white/5 p-2 rounded-xl border border-[#eae4d7]/70 dark:border-white/5">
                  <span className="block text-[10px] text-[#68726b] dark:text-gray-400 font-medium">Ближайшее событие</span>
                  <span className="font-bold text-xs text-[#242b26] dark:text-white truncate block" title={nextEvent ? nextEvent.title : 'Нет планов'}>
                    {nextEvent ? nextEvent.title : 'Нет планов'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: Ready Prompt Scenarios */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#68726b] dark:text-gray-400">Готовые сценарии</h3>
                <span className="text-[11px] text-stone-400">Быстрый клик</span>
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleSend('Добавь в список покупок: мука 1 кг, молоко 1 л и сыр 300 г')}
                  className="w-full text-left p-2.5 bg-white dark:bg-[#202225] hover:bg-[#faf8f5] dark:hover:bg-white/10 border border-[#eae4d7] dark:border-white/10 hover:border-[#4a7c59]/40 rounded-xl transition-all group shadow-2xs flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#4a7c59] dark:text-emerald-300 flex items-center justify-center shrink-0 text-xs">
                    🛒
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#242b26] dark:text-white group-hover:text-[#4a7c59] transition-colors">Купить продукты</p>
                    <p className="text-[11px] text-stone-500 dark:text-gray-400 truncate">Мука 1 кг, молоко и сыр на сайт</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('Сколько я потратил в этом месяце и на что ушло больше всего денег?')}
                  className="w-full text-left p-2.5 bg-white dark:bg-[#202225] hover:bg-[#faf8f5] dark:hover:bg-white/10 border border-[#eae4d7] dark:border-white/10 hover:border-[#4a7c59]/40 rounded-xl transition-all group shadow-2xs flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 text-xs">
                    📊
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#242b26] dark:text-white group-hover:text-[#4a7c59] transition-colors">Оценить расходы месяца</p>
                    <p className="text-[11px] text-stone-500 dark:text-gray-400 truncate">Сводка по категориям и топ трат</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('Создай событие на завтра в 10:00 ТО автомобиля в сервисе')}
                  className="w-full text-left p-2.5 bg-white dark:bg-[#202225] hover:bg-[#faf8f5] dark:hover:bg-white/10 border border-[#eae4d7] dark:border-white/10 hover:border-[#4a7c59]/40 rounded-xl transition-all group shadow-2xs flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 text-xs">
                    📅
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#242b26] dark:text-white group-hover:text-[#4a7c59] transition-colors">Запланировать встречу</p>
                    <p className="text-[11px] text-stone-500 dark:text-gray-400 truncate">Завтра в 10:00 ТО автомобиля</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('Запиши расход 450 рублей на кофе')}
                  className="w-full text-left p-2.5 bg-white dark:bg-[#202225] hover:bg-[#faf8f5] dark:hover:bg-white/10 border border-[#eae4d7] dark:border-white/10 hover:border-[#4a7c59]/40 rounded-xl transition-all group shadow-2xs flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 text-xs">
                    ☕
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#242b26] dark:text-white group-hover:text-[#4a7c59] transition-colors">Внести кофе 450 ₽</p>
                    <p className="text-[11px] text-stone-500 dark:text-gray-400 truncate">Быстрая запись расхода</p>
                  </div>
                </button>
              </div>
            </div>

            {/* SECTION 3: Recent Actions */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#68726b] dark:text-gray-400 px-1">Текущий список покупок</h3>
              <div className="bg-white/90 dark:bg-[#202225] border border-[#eae4d7] dark:border-white/10 rounded-2xl p-3 text-xs space-y-2 shadow-2xs">
                {shoppingItems.filter(i => !i.completed).length === 0 ? (
                  <p className="text-stone-400 text-center py-2">Список покупок пуст</p>
                ) : (
                  shoppingItems.filter(i => !i.completed).slice(0, 4).map(item => (
                    <div key={item.id} className="flex items-center justify-between text-stone-700 dark:text-stone-200">
                      <span className="truncate max-w-[170px]">• {item.title}</span>
                      <span className="text-[11px] text-stone-400 font-mono">{item.amount || '1'} {item.unit || 'шт'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#eae4d7] dark:border-white/10 text-[11px] text-stone-400 text-center">
            Семейный аккаунт активен · Gemini 3.8 Flash
          </div>
        </aside>

        {/* RIGHT MAIN AREA: Chat Room */}
        <section className="flex-1 flex flex-col bg-[#faf8f5] dark:bg-[#18191C] overflow-hidden">
          {/* Chat Controls Header */}
          <div className="px-4 sm:px-6 py-2.5 bg-white/70 dark:bg-[#1C1C1E]/70 border-b border-[#eae4d7] dark:border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#4a7c59] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                🌿
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#242b26] dark:text-white">Семейный ассистент Terra</h2>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/40">
                    Готов к диалогу
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-gray-400 font-medium">Покупки, события календаря, бюджет и аналитика</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Detail mode toggle */}
              <div className="hidden sm:flex items-center gap-1 bg-stone-100 dark:bg-white/5 p-1 rounded-xl border border-[#eae4d7]/70 dark:border-white/10">
                <span className="text-[11px] font-medium text-stone-500 dark:text-gray-400 pl-2">Режим:</span>
                <button
                  type="button"
                  onClick={() => setResponseDetailMode('detailed')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    responseDetailMode === 'detailed'
                      ? 'bg-white dark:bg-[#2C2D30] text-[#242b26] dark:text-white shadow-2xs border border-[#eae4d7]/50 dark:border-white/10'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
                  }`}
                >
                  С деталями
                </button>
                <button
                  type="button"
                  onClick={() => setResponseDetailMode('concise')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    responseDetailMode === 'concise'
                      ? 'bg-white dark:bg-[#2C2D30] text-[#242b26] dark:text-white shadow-2xs border border-[#eae4d7]/50 dark:border-white/10'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
                  }`}
                >
                  Кратко
                </button>
              </div>

              {/* API Key settings button */}
              <button
                type="button"
                onClick={() => setIsKeyInputOpen(prev => !prev)}
                className="p-1.5 text-stone-500 hover:text-[#4a7c59] bg-white dark:bg-white/5 border border-[#eae4d7] dark:border-white/10 rounded-xl transition-colors cursor-pointer"
                title="Настроить Gemini API ключ"
              >
                <Key size={15} />
              </button>
            </div>
          </div>

          {/* Quick API Key drawer */}
          <AnimatePresence>
            {isKeyInputOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-amber-50 dark:bg-[#25231c] border-b border-amber-200 dark:border-amber-800/40 p-3 shrink-0 overflow-hidden"
              >
                <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-2 text-xs">
                  <span className="font-semibold text-amber-900 dark:text-amber-200 shrink-0">Ключ Gemini:</span>
                  <input
                    type="password"
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-black/40 border border-amber-300 dark:border-amber-700/50 text-xs font-mono outline-none"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="px-3 py-1.5 bg-[#4a7c59] text-white font-semibold rounded-lg hover:bg-[#3d6749] transition-colors cursor-pointer"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsKeyInputOpen(false)}
                      className="px-2 py-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-white"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
            <div className="flex items-center justify-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 bg-[#eae4d7]/50 dark:bg-white/5 px-3 py-1 rounded-full">
                Семейный AI-диалог
              </span>
            </div>

            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-3 max-w-[95%] sm:max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                    isUser 
                      ? 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200' 
                      : 'bg-[#4a7c59] text-white'
                  }`}>
                    {isUser ? <User size={15} /> : <Sparkles size={15} />}
                  </div>

                  <div className={`rounded-2xl p-4 sm:p-5 text-[13.5px] leading-relaxed shadow-xs space-y-3 ${
                    isUser 
                      ? 'bg-[#eaf2ec] dark:bg-[#1f3325] border border-[#c3dac8] dark:border-emerald-800/40 text-[#242b26] dark:text-emerald-100 rounded-tr-xs' 
                      : 'bg-white dark:bg-[#202225] border border-[#eae4d7] dark:border-white/10 text-[#242b26] dark:text-gray-100 rounded-tl-xs'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* STRUCTURED CARD 1: Shopping Items */}
                    {msg.shoppingPayload && msg.shoppingPayload.items.length > 0 && (
                      <div className="bg-[#faf8f5] dark:bg-white/5 border border-[#eae4d7] dark:border-white/10 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-[#4a7c59] dark:text-emerald-300 flex items-center justify-center text-xs">
                              🛒
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#4a7c59] dark:text-emerald-400">
                              Добавлено в список покупок
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 bg-white dark:bg-black/30 border border-stone-200/80 dark:border-white/10 px-2 py-0.5 rounded-full font-medium">
                            {msg.shoppingPayload.items.length} поз.
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          {msg.shoppingPayload.items.map((item, idx) => {
                            const isCompleted = shoppingItems.find(i => i.title.toLowerCase() === item.title.toLowerCase())?.completed || false;

                            return (
                              <div 
                                key={idx}
                                onClick={() => handleToggleItemInChat(item.title)}
                                className={`flex items-center justify-between text-xs font-medium px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                                  isCompleted
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 line-through opacity-70'
                                    : 'bg-white dark:bg-[#18191C] border-[#eae4d7]/70 dark:border-white/10 text-stone-700 dark:text-stone-200 hover:border-[#4a7c59]/50'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                    isCompleted 
                                      ? 'bg-[#4a7c59] border-[#4a7c59] text-white' 
                                      : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-transparent'
                                  }`}>
                                    {isCompleted && <Check size={11} strokeWidth={3} />}
                                  </div>
                                  <span>{item.title}</span>
                                </div>
                                <span className="text-[11px] text-stone-400 font-mono font-medium">
                                  {item.amount || '1'} {item.unit || 'шт'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* STRUCTURED CARD 2: Calendar Event */}
                    {msg.eventPayload && (
                      <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl p-3.5 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 flex items-center justify-center text-sm shrink-0">
                            📅
                          </div>
                          <div>
                            <p className="text-xs font-bold text-stone-800 dark:text-stone-100">
                              {msg.eventPayload.title}
                            </p>
                            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                              {msg.eventPayload.date} · в {msg.eventPayload.time}
                            </p>
                            {msg.eventPayload.description && (
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                                {msg.eventPayload.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STRUCTURED CARD 3: Transaction Added */}
                    {msg.transactionPayload && (
                      <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-[#4a7c59] dark:text-emerald-300 flex items-center justify-center text-sm shrink-0">
                            💳
                          </div>
                          <div>
                            <p className="text-xs font-bold text-stone-800 dark:text-stone-100">
                              {msg.transactionPayload.note || (msg.transactionPayload.type === 'expense' ? 'Расход' : 'Доход')}
                            </p>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">
                              Категория: {msg.transactionPayload.categoryName || msg.transactionPayload.categoryId}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold font-mono ${
                          msg.transactionPayload.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {msg.transactionPayload.type === 'income' ? '+' : '-'}{msg.transactionPayload.amount.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    )}

                    {/* STRUCTURED CARD 4: Financial Analytics Breakdown */}
                    {msg.financialStats && (
                      <div className="bg-[#faf8f5] dark:bg-white/5 border border-[#eae4d7] dark:border-white/10 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#4a7c59] dark:text-emerald-400 flex items-center gap-1.5">
                            <PieChart size={14} /> Финансовая сводка месяца
                          </span>
                          <span className="text-xs font-bold font-mono text-[#242b26] dark:text-white">
                            Всего: {msg.financialStats.currentMonthTotalExpense.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>

                        {msg.financialStats.categoryBreakdown.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {msg.financialStats.categoryBreakdown.slice(0, 4).map(c => (
                              <div key={c.categoryId} className="space-y-0.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-stone-700 dark:text-stone-300 font-medium">{c.categoryName}</span>
                                  <span className="font-mono text-stone-500 dark:text-stone-400">{c.amount.toLocaleString('ru-RU')} ₽ ({c.percentage}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-[#4a7c59] rounded-full transition-all duration-300"
                                    style={{ width: `${c.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[11px] text-stone-400">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>{isUser ? (user?.displayName || 'Вы') : 'Terra AI'}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-xl bg-[#4a7c59] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles size={15} className="animate-spin" />
                </div>
                <div className="bg-white dark:bg-[#202225] rounded-2xl rounded-tl-xs p-4 border border-[#eae4d7] dark:border-white/10 text-xs text-stone-500 dark:text-gray-400 flex items-center gap-2 shadow-xs">
                  <RefreshCw size={13} className="animate-spin text-[#4a7c59]" />
                  <span>Terra анализирует запрос и синхронизирует данные...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 3. QUICK PROMPTS STRIP */}
          <div className="px-4 sm:px-6 py-2 bg-[#f6f3ed] dark:bg-[#1a1b1e] border-t border-[#eae4d7]/70 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
              <span className="text-[11px] font-semibold text-[#68726b] dark:text-gray-400 shrink-0 pr-1">Подсказки:</span>
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qp.text)}
                  className="whitespace-nowrap px-3 py-1.5 bg-white dark:bg-[#202225] hover:bg-[#faf8f5] dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 font-medium rounded-full border border-[#eae4d7] dark:border-white/10 transition-colors shrink-0 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{qp.emoji}</span> {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. ADVANCED INPUT AREA */}
          <footer className="p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border-t border-[#eae4d7] dark:border-white/10 shrink-0">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="space-y-2.5"
            >
              <div className="relative border-2 border-dashed border-[#eae4d7] dark:border-white/15 hover:border-[#4a7c59]/50 rounded-2xl p-2 bg-[#faf8f5] dark:bg-[#141517] transition-all flex items-center gap-2">
                {/* Voice button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors shadow-2xs cursor-pointer ${
                    isListening
                      ? 'bg-red-500 border-red-600 text-white animate-pulse'
                      : 'bg-white dark:bg-white/5 border-[#eae4d7] dark:border-white/10 text-stone-600 dark:text-stone-300 hover:text-[#4a7c59]'
                  }`}
                  title="Голосовой ввод"
                >
                  <Mic size={17} />
                </button>

                {/* Main text input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Спросите Terra или напишите расход / покупку (например: мука 1 кг, молоко)..."
                  className="flex-1 bg-transparent border-0 text-[13.5px] text-[#242b26] dark:text-white placeholder:text-stone-400 focus:ring-0 p-0 focus:outline-none"
                />

                {/* Attach Receipt pill */}
                <div 
                  onClick={() => toast.info('Для анализа чека перетащите фото или используйте камеру в меню «Запись»')}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/5 rounded-xl border border-[#eae4d7] dark:border-white/10 text-[11px] text-stone-500 dark:text-stone-400 font-medium cursor-pointer hover:border-[#4a7c59]/40 transition-colors shrink-0"
                >
                  <Paperclip size={14} className="text-[#4a7c59]" />
                  <span>Чек или XLS</span>
                </div>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="h-10 px-4 rounded-xl bg-[#4a7c59] hover:bg-[#3d6749] active:scale-95 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2 shrink-0 transition-all shadow-xs cursor-pointer"
                >
                  <span>Отправить</span>
                  <Send size={14} />
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between text-[11px] text-stone-400 dark:text-gray-500 font-medium mt-2 px-1 select-none">
              <span className="flex items-center gap-1.5">
                <span>🌿</span> Terra мгновенно синхронизирует списки покупок и расходы для всей семьи
              </span>
              <span className="hidden sm:inline">Поддерживаются команды голосом и через Telegram</span>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default AIChat;
