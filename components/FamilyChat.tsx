import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, X, Check, Heart, ThumbsUp, Clapping, MessageSquare, 
  Send, Paperclip, ChevronLeft, Trash2, CheckCheck, ShoppingBag, 
  Calendar, CreditCard, FileCheck2, Info, ArrowRight, ShieldCheck, Repeat
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { subscribeToCollection, addItem } from '../utils/db';
import { triggerHaptic } from '../utils/haptics';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  topicId?: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: number;
  type?: 'text' | 'system' | 'receipt';
  receiptData?: {
    amount: number;
    category: string;
    merchant: string;
    date: string;
    items?: { name: string; price: number }[];
  };
  reactions?: Record<string, number>; // emoji -> count
  userReacted?: Record<string, boolean>; // emoji -> boolean
}

export interface TopicItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  time: string;
  lastMessage: string;
  unreadCount?: number;
}

const INITIAL_TOPICS: TopicItem[] = [
  {
    id: 'general',
    title: 'Общий чат',
    subtitle: 'Папа (онлайн), Мама (14:35), Бабушка (был(а) в 12:10)',
    icon: '#',
    time: '14:38',
    lastMessage: 'Папа: Внёс счёт за садик в бюджет'
  },
  {
    id: 'shopping',
    title: 'Покупки и список',
    subtitle: 'Папа, Мама (онлайн)',
    icon: '🛒',
    time: '11:05',
    lastMessage: 'Мама: Купила сыр и творог'
  },
  {
    id: 'weekend',
    title: 'Выходные и поездки',
    subtitle: 'Папа, Мама, Бабушка',
    icon: '📅',
    time: 'Вчера',
    lastMessage: 'В субботу дача в 10:00'
  }
];

const INITIAL_MESSAGES_MAP: Record<string, ChatMessage[]> = {
  general: [
    {
      id: 'm1',
      topicId: 'general',
      text: 'Привет! Я заехала в аптеку и купила витамины. Прикрепила чек сюда, чтобы не забыть внести в бюджет.',
      userId: 'mom',
      userName: 'Мама',
      timestamp: Date.now() - 3600000 * 1.2,
      type: 'text',
      reactions: { '❤️': 1 }
    },
    {
      id: 'm2',
      topicId: 'general',
      text: 'Трата внесена в бюджет',
      userId: 'mom',
      userName: 'Мама',
      timestamp: Date.now() - 3600000 * 1.1,
      type: 'receipt',
      receiptData: {
        amount: 1420,
        category: 'Аптека и здоровье',
        merchant: 'Аптека «Здоровье»',
        date: '24 сен, 13:38',
        items: [
          { name: 'Витамин D3 2000 ME (капли)', price: 640 },
          { name: 'Омега-3 концентрат 1000мг', price: 780 }
        ]
      }
    },
    {
      id: 'm3',
      topicId: 'general',
      text: 'Отлично, увидел в расходах. Я сейчас оплатил квитанцию за садик (4 200 ₽), всё синхронизировалось. Заеду за хлебом после работы.',
      userId: 'dad',
      userName: 'Вы',
      timestamp: Date.now() - 1200000,
      type: 'text'
    }
  ],
  shopping: [
    {
      id: 's1',
      topicId: 'shopping',
      text: 'Купила фермерский сыр и творог на сырники! Список на ужин закрыт.',
      userId: 'mom',
      userName: 'Мама',
      timestamp: Date.now() - 3600000 * 3,
      type: 'text'
    },
    {
      id: 's2',
      topicId: 'shopping',
      text: 'Супер! Я докуплю оливковое масло и зелень.',
      userId: 'dad',
      userName: 'Вы',
      timestamp: Date.now() - 3600000 * 2.8,
      type: 'text'
    }
  ],
  weekend: [
    {
      id: 'w1',
      topicId: 'weekend',
      text: 'В субботу жду всех на даче к 10:00! Яблоки поспели, испечем пирог.',
      userId: 'granny',
      userName: 'Бабушка',
      timestamp: Date.now() - 86400000,
      type: 'text'
    },
    {
      id: 'w2',
      topicId: 'weekend',
      text: 'Договорились! Заедем за вами в 9:20 утра.',
      userId: 'dad',
      userName: 'Вы',
      timestamp: Date.now() - 86000000,
      type: 'text'
    }
  ]
};

export default function FamilyChat() {
  const { user, familyId } = useAuth();
  const { members, settings } = useData();

  const [topics, setTopics] = useState<TopicItem[]>(INITIAL_TOPICS);
  const [activeTopicId, setActiveTopicId] = useState<string>('general');
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES_MAP);
  
  // UI states
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingAuthor, setTypingAuthor] = useState('Мама');
  const [selectedReceipt, setSelectedReceipt] = useState<ChatMessage['receiptData'] | null>(null);
  const [isReceiptDrawerOpen, setIsReceiptDrawerOpen] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const activeTopic = topics.find(t => t.id === activeTopicId) || topics[0];
  const currentMessages = messagesMap[activeTopicId] || [];

  // Auto-scroll to bottom on topic change or message addition
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeTopicId, currentMessages.length]);

  // Handle Realtime Firestore subscription if familyId exists
  useEffect(() => {
    if (!familyId) return;

    const unsub = subscribeToCollection(familyId, 'chat', (data) => {
      if (Array.isArray(data) && data.length > 0) {
        const sorted = [...data].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessagesMap(prev => ({
          ...prev,
          [activeTopicId]: sorted as ChatMessage[]
        }));
      }
    });

    return () => unsub();
  }, [familyId, activeTopicId]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Topic Switcher
  const handleSelectTopic = (topicId: string) => {
    triggerHaptic('light');
    setActiveTopicId(topicId);
    setShowMobileSidebar(false);
    setIsSearching(false);
    setSearchQuery('');
  };

  // Delete Chat Topic
  const handleDeleteActiveTopic = () => {
    if (topics.length <= 1) {
      toast.error('Нельзя удалить единственную оставшуюся тему');
      setIsDeleteModalOpen(false);
      return;
    }

    const topicToDelete = activeTopic;
    const remainingTopics = topics.filter(t => t.id !== activeTopicId);
    
    setTopics(remainingTopics);
    setMessagesMap(prev => {
      const copy = { ...prev };
      delete copy[activeTopicId];
      return copy;
    });

    setActiveTopicId(remainingTopics[0].id);
    setIsDeleteModalOpen(false);
    toast.success(`Чат «${topicToDelete.title}» успешно удален`);
  };

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    triggerHaptic('medium');

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      topicId: activeTopicId,
      text,
      userId: user?.uid || 'current_user',
      userName: user?.displayName || 'Вы',
      timestamp: Date.now(),
      type: 'text'
    };

    // Optimistic Update
    setMessagesMap(prev => ({
      ...prev,
      [activeTopicId]: [...(prev[activeTopicId] || []), newMsg]
    }));

    // Update Topic Last Message
    setTopics(prev => prev.map(t => {
      if (t.id === activeTopicId) {
        return {
          ...t,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          lastMessage: `Вы: ${text}`
        };
      }
      return t;
    }));

    setInputText('');

    if (familyId) {
      try {
        await addItem(familyId, 'chat', newMsg);
      } catch (err) {
        console.error("Failed to send chat message:", err);
      }
    }

    // Simulate Family Member Reply after 1.8s
    simulateFamilyReply();
  };

  const simulateFamilyReply = () => {
    setTimeout(() => {
      setIsTyping(true);
      setTypingAuthor('Мама');

      setTimeout(() => {
        setIsTyping(false);

        const replyMsg: ChatMessage = {
          id: `msg_reply_${Date.now()}`,
          topicId: activeTopicId,
          text: 'Спасибо, записала! ❤️',
          userId: 'mom',
          userName: 'Мама',
          timestamp: Date.now(),
          type: 'text'
        };

        setMessagesMap(prev => ({
          ...prev,
          [activeTopicId]: [...(prev[activeTopicId] || []), replyMsg]
        }));
      }, 2200);
    }, 700);
  };

  // Reactions
  const handleToggleReaction = (msgId: string, emoji: string) => {
    triggerHaptic('selection');
    setMessagesMap(prev => {
      const topicMsgs = prev[activeTopicId] || [];
      const updated = topicMsgs.map(msg => {
        if (msg.id === msgId) {
          const rx = { ...(msg.reactions || {}) };
          const userRx = { ...(msg.userReacted || {}) };
          const hasReacted = userRx[emoji];

          if (hasReacted) {
            rx[emoji] = Math.max(0, (rx[emoji] || 1) - 1);
            userRx[emoji] = false;
          } else {
            rx[emoji] = (rx[emoji] || 0) + 1;
            userRx[emoji] = true;
          }

          return { ...msg, reactions: rx, userReacted: userRx };
        }
        return msg;
      });

      return { ...prev, [activeTopicId]: updated };
    });
  };

  // Create New Topic
  const handleCreateTopic = () => {
    const topicTitle = prompt('Введите название новой семейной темы:', 'Покупки на праздник');
    if (topicTitle && topicTitle.trim()) {
      const newTopicId = `topic_${Date.now()}`;
      const newTopic: TopicItem = {
        id: newTopicId,
        title: topicTitle.trim(),
        subtitle: 'Папа, Мама, Бабушка',
        icon: '📋',
        time: 'Только что',
        lastMessage: 'Чат создан'
      };

      setTopics(prev => [newTopic, ...prev]);
      setMessagesMap(prev => ({
        ...prev,
        [newTopicId]: [
          {
            id: `init_${Date.now()}`,
            topicId: newTopicId,
            text: `Создана тема «${topicTitle.trim()}»`,
            userId: 'system',
            userName: 'Система',
            timestamp: Date.now(),
            type: 'system'
          }
        ]
      }));

      setActiveTopicId(newTopicId);
      toast.success(`Тема «${topicTitle}» успешно создана`);
    }
  };

  // Attachment Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`Чек "${file.name}" прикреплен к сообщению 📎`);
      setInputText(prev => prev ? `${prev} [Чек: ${file.name}]` : `Чек: ${file.name}`);
    }
  };

  const filteredMessages = currentMessages.filter(msg => {
    if (!searchQuery.trim()) return true;
    return msg.text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  return (
    <div className="w-full h-[84vh] md:h-[840px] bg-[#FBF9F5] dark:bg-[#121214] rounded-3xl shadow-xl border border-[#ECE8DF] dark:border-white/10 flex overflow-hidden relative animate-main-entrance select-none">
      
      {/* SIDEBAR */}
      <aside className={`w-72 md:w-80 border-r border-[#ECE8DF] dark:border-white/10 bg-[#F7F4ED] dark:bg-[#1C1C1E] flex flex-col shrink-0 ${showMobileSidebar ? 'flex w-full z-20' : 'hidden sm:flex'}`}>
        
        {/* Sidebar Header */}
        <header className="p-4 border-b border-[#ECE8DF] dark:border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-[#1F2922] dark:text-white">Семейные беседы</h1>
            <p className="text-xs text-[#717B73] dark:text-stone-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
              <span>{members.length || 3} участника онлайн</span>
            </p>
          </div>
          <button 
            type="button"
            onClick={handleCreateTopic}
            title="Создать новый тред или тему"
            className="w-8 h-8 rounded-full bg-[#E9E4D8] dark:bg-white/10 text-[#2D5A3F] dark:text-emerald-400 flex items-center justify-center hover:bg-[#DED7C8] dark:hover:bg-white/20 active:scale-90 transition-all duration-200 cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </header>

        {/* Topics List */}
        <nav aria-label="Разделы чата" className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {topics.map((topic, index) => {
            const isActive = topic.id === activeTopicId;
            const staggerClass = index === 0 ? 'stagger-sidebar-1' : index === 1 ? 'stagger-sidebar-2' : 'stagger-sidebar-3';
            
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleSelectTopic(topic.id)}
                className={`${staggerClass} w-full p-2.5 rounded-xl text-left flex items-start gap-3 transition-all duration-200 active:scale-[0.99] group cursor-pointer ${
                  isActive 
                    ? 'bg-white dark:bg-[#2C2C2E] border border-[#E4DED3] dark:border-white/10 shadow-sm' 
                    : 'hover:bg-[#EDE8DD] dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="topic-icon w-9 h-9 rounded-xl bg-[#2D5A3F]/10 dark:bg-emerald-950/40 text-[#2D5A3F] dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 transition-transform group-hover:scale-105">
                  {topic.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs truncate ${isActive ? 'font-bold text-[#1F2922] dark:text-white' : 'font-semibold text-[#2C332D] dark:text-stone-300'}`}>
                      {topic.title}
                    </span>
                    <span className="text-[10px] text-[#788279] dark:text-stone-400 shrink-0 ml-1">{topic.time}</span>
                  </div>
                  <p className="text-xs text-[#525D54] dark:text-stone-400 truncate mt-0.5">
                    {topic.lastMessage}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CHAT WORKSPACE */}
      <section aria-label="Окно переписки" className={`flex-1 flex flex-col h-full bg-[#FBF9F5] dark:bg-[#121214] min-w-0 relative ${!showMobileSidebar ? 'flex' : 'hidden sm:flex'}`}>
        
        {/* Header */}
        <header className="h-16 px-4 md:px-6 border-b border-[#ECE8DF] dark:border-white/10 flex items-center justify-between bg-[#FBF9F5]/95 dark:bg-[#121214]/95 backdrop-blur-xs shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Назад к чатам"
              onClick={() => setShowMobileSidebar(true)}
              className="sm:hidden p-1.5 -ml-1 text-[#465047] dark:text-stone-300 hover:text-[#1F2922] rounded-lg active:scale-95 transition-transform cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="w-9 h-9 rounded-full bg-[#2D5A3F] dark:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {activeTopic.icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#1F2922] dark:text-white truncate leading-tight">
                {activeTopic.title}
              </h2>
              <p className="text-[11px] text-[#717B73] dark:text-stone-400 truncate">
                {activeTopic.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Поиск по истории сообщений"
              onClick={() => setIsSearching(!isSearching)}
              className="p-2 text-[#566057] dark:text-stone-300 hover:text-[#1F2922] dark:hover:text-white hover:bg-[#F0ECE1] dark:hover:bg-white/10 active:scale-95 rounded-xl transition-all cursor-pointer"
            >
              <Search size={18} />
            </button>
            <button
              type="button"
              aria-label="Удалить чат"
              onClick={() => setIsDeleteModalOpen(true)}
              title="Удалить чат"
              className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 rounded-xl transition-all cursor-pointer"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        {/* Collapsible Search Bar */}
        {isSearching && (
          <div className="px-4 py-2 border-b border-[#ECE8DF] dark:border-white/10 bg-[#F8F5EE] dark:bg-[#1C1C1E] flex items-center gap-2 transition-all">
            <Search size={16} className="text-[#869087] dark:text-stone-400 shrink-0" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск в сообщениях..."
              className="bg-transparent text-xs w-full text-[#1F2922] dark:text-white placeholder-[#8F9890] outline-none"
              autoFocus
            />
            <button 
              type="button"
              onClick={() => { setIsSearching(false); setSearchQuery(''); }}
              className="text-xs text-[#717B73] dark:text-stone-400 hover:text-[#1F2922] dark:hover:text-white px-2 py-0.5 rounded cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Messages Feed */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4 transition-opacity duration-200"
        >
          {/* Date Separator */}
          <div aria-label="Сегодня" className="flex items-center justify-center my-2 select-none" role="separator">
            <span className="text-[11px] font-semibold text-[#828C83] dark:text-stone-400 bg-[#ECE8DF] dark:bg-white/10 px-2.5 py-0.5 rounded-full hover:scale-105 transition-transform cursor-default">
              Сегодня, 24 сентября
            </span>
          </div>

          {filteredMessages.map((msg, idx) => {
            const isMe = msg.userName === 'Вы' || msg.userId === user?.uid;

            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="flex items-center justify-center my-2">
                  <span className="text-[11px] font-medium text-[#717B73] dark:text-stone-400 bg-[#F0EDE4] dark:bg-white/5 px-3 py-1 rounded-full border border-[#E5DFD4] dark:border-white/10">
                    {msg.text}
                  </span>
                </div>
              );
            }

            if (msg.type === 'receipt' && msg.receiptData) {
              return (
                <article key={msg.id} className="stagger-msg-2 ml-9 max-w-[85%] sm:max-w-[70%] group">
                  <div 
                    onClick={() => {
                      setSelectedReceipt(msg.receiptData!);
                      setIsReceiptDrawerOpen(true);
                      triggerHaptic('light');
                    }}
                    className="bg-[#F2EFE6] dark:bg-[#1C1C1E] hover:bg-[#EAE6DC] dark:hover:bg-[#252528] border border-[#DED8CB] dark:border-white/10 rounded-2xl p-3.5 flex flex-col gap-2 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D5A3F] dark:text-emerald-400">
                        <CheckCheck size={16} className="text-[#2D5A3F] dark:text-emerald-400" />
                        Трата внесена в бюджет
                      </span>
                      <span className="text-xs font-bold text-[#1F2922] dark:text-white bg-white/70 dark:bg-white/10 px-2 py-0.5 rounded-md border border-[#E3DED4] dark:border-white/10">
                        {msg.receiptData.amount.toLocaleString('ru-RU')} {settings.currency || '₽'}
                      </span>
                    </div>
                    <div className="text-xs text-[#525D54] dark:text-stone-300 flex items-center justify-between border-t border-[#E2DCD0] dark:border-white/10 pt-2">
                      <span>Категория: <strong class="text-[#1F2922] dark:text-white">{msg.receiptData.category}</strong></span>
                      <span className="text-[#2D5A3F] dark:text-emerald-400 font-bold text-xs inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Детали →
                      </span>
                    </div>
                  </div>
                </article>
              );
            }

            return (
              <article 
                key={msg.id} 
                className={`group relative flex items-start gap-2.5 max-w-[85%] sm:max-w-[70%] ${isMe ? 'ml-auto justify-end' : ''}`}
              >
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-[#D65D4E] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-1 shadow-xs">
                    {msg.userName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : ''}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    {!isMe && <span className="text-xs font-bold text-[#1F2922] dark:text-white">{msg.userName}</span>}
                    <time className="text-[10px] text-[#869087] dark:text-stone-400">
                      {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                    {isMe && <span className="text-xs font-bold text-[#1F2922] dark:text-white">Вы</span>}
                  </div>

                  <div className={`p-3 rounded-2xl shadow-xs text-sm leading-relaxed transition-colors ${
                    isMe 
                      ? 'bg-[#2D5A3F] dark:bg-emerald-700 text-white rounded-tr-sm hover:bg-[#285038]' 
                      : 'bg-white dark:bg-[#1C1C1E] border border-[#E5DFD4] dark:border-white/10 text-[#273029] dark:text-stone-100 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>

                  {/* Reaction Pills & Quick Reactions */}
                  <div className="flex items-center gap-1.5 mt-1">
                    {msg.reactions && Object.entries(msg.reactions).map(([emoji, count]) => {
                      if (count <= 0) return null;
                      const userReacted = msg.userReacted?.[emoji];
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className={`reaction-pill inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] active:scale-90 transition-all cursor-pointer ${
                            userReacted 
                              ? 'bg-[#2D5A3F]/10 dark:bg-emerald-950/60 border border-[#2D5A3F] text-[#2D5A3F] dark:text-emerald-300' 
                              : 'bg-white dark:bg-[#1C1C1E] border border-[#E4DED3] dark:border-white/10 text-[#556057] dark:text-stone-300'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="counter font-bold text-[10px]">{count}</span>
                        </button>
                      );
                    })}

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pl-1">
                      <button 
                        type="button" 
                        onClick={() => handleToggleReaction(msg.id, '❤️')} 
                        className="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer"
                        title="Поставить ❤️"
                      >
                        ❤️
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleToggleReaction(msg.id, '👍')} 
                        className="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer"
                        title="Поставить 👍"
                      >
                        👍
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleToggleReaction(msg.id, '👏')} 
                        className="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer"
                        title="Поставить 👏"
                      >
                        👏
                      </button>
                    </div>

                    {isMe && (
                      <span className="text-[10px] text-[#717B73] dark:text-stone-400 inline-flex items-center gap-1 select-none ml-1">
                        Прочитано
                        <CheckCheck size={12} className="text-[#2D5A3F] dark:text-emerald-400" />
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-[#717B73] dark:text-stone-400 pt-1 ml-9">
              <span className="italic font-medium">{typingAuthor} печатает</span>
              <span className="inline-flex gap-1 items-center bg-[#EDE8DD] dark:bg-white/10 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-[#2D5A3F] dark:bg-emerald-400 rounded-full typing-dot"></span>
                <span className="w-1.5 h-1.5 bg-[#2D5A3F] dark:bg-emerald-400 rounded-full typing-dot"></span>
                <span className="w-1.5 h-1.5 bg-[#2D5A3F] dark:bg-emerald-400 rounded-full typing-dot"></span>
              </span>
            </div>
          )}
        </div>

        {/* Input Footer */}
        <footer className="p-3 md:p-4 bg-[#FBF9F5] dark:bg-[#121214] border-t border-[#ECE8DF] dark:border-white/10 shrink-0">
          <form className="flex items-center gap-2" onSubmit={handleSendMessage}>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <button
              type="button"
              aria-label="Прикрепить чек или файл"
              onClick={() => fileInputRef.current?.click()}
              title="Прикрепить чек или фото"
              className="p-2.5 text-[#566057] dark:text-stone-300 hover:text-[#1F2922] dark:hover:text-white hover:bg-[#F0ECE1] dark:hover:bg-white/10 active:scale-90 rounded-xl transition-all cursor-pointer"
            >
              <Paperclip size={20} />
            </button>

            <div className="flex-1 relative">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Напишите сообщение семье..."
                className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1C1E] border border-[#DED8CB] dark:border-white/10 focus:border-[#2D5A3F] rounded-xl text-sm text-[#1F2922] dark:text-white placeholder-[#8F9890] outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              aria-label="Отправить сообщение"
              className="px-4 py-2.5 bg-[#2D5A3F] hover:bg-[#244933] active:scale-95 text-white font-semibold text-sm rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <span>Отправить</span>
              <Send size={16} />
            </button>
          </form>
        </footer>

        {/* Receipt Details Drawer */}
        <div className={`absolute inset-y-0 right-0 w-full sm:w-80 bg-[#FDFCF9] dark:bg-[#1C1C1E] border-l border-[#ECE8DF] dark:border-white/10 shadow-2xl z-20 transform transition-transform duration-300 ease-out flex flex-col ${
          isReceiptDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="p-4 border-b border-[#ECE8DF] dark:border-white/10 flex items-center justify-between bg-[#F7F4ED] dark:bg-[#121214]">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#2D5A3F]/15 text-[#2D5A3F] dark:text-emerald-400 flex items-center justify-center font-bold text-xs">🧾</span>
              <h3 className="font-bold text-sm text-[#1F2922] dark:text-white">Детали расхода</h3>
            </div>
            <button 
              type="button"
              onClick={() => setIsReceiptDrawerOpen(false)}
              className="p-1 rounded-lg text-[#717B73] dark:text-stone-400 hover:text-[#1F2922] dark:hover:text-white hover:bg-[#E9E4D8] dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
            {selectedReceipt && (
              <>
                <div className="p-3 rounded-xl bg-white dark:bg-[#121214] border border-[#E7E1D5] dark:border-white/10 shadow-xs text-center">
                  <span className="text-[11px] text-[#788279] dark:text-stone-400 uppercase tracking-wider font-semibold">Итоговая сумма</span>
                  <div className="text-2xl font-black text-[#1F2922] dark:text-white mt-0.5">
                    {selectedReceipt.amount.toLocaleString('ru-RU')} {settings.currency || '₽'}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full mt-1.5 font-medium border border-emerald-200 dark:border-emerald-800">
                    ✓ Синхронизировано с банком
                  </span>
                </div>

                <div className="space-y-2 border-t border-[#ECE8DF] dark:border-white/10 pt-3">
                  <div className="flex justify-between py-1 text-[#667268] dark:text-stone-400">
                    <span>Торговая точка:</span>
                    <strong className="text-[#1F2922] dark:text-white">{selectedReceipt.merchant}</strong>
                  </div>
                  <div className="flex justify-between py-1 text-[#667268] dark:text-stone-400">
                    <span>Категория:</span>
                    <strong className="text-[#1F2922] dark:text-white">{selectedReceipt.category}</strong>
                  </div>
                  <div className="flex justify-between py-1 text-[#667268] dark:text-stone-400">
                    <span>Оплатил(а):</span>
                    <strong className="text-[#1F2922] dark:text-white">Мама (Карта •• 4812)</strong>
                  </div>
                  <div className="flex justify-between py-1 text-[#667268] dark:text-stone-400">
                    <span>Дата и время:</span>
                    <strong className="text-[#1F2922] dark:text-white">{selectedReceipt.date}</strong>
                  </div>
                </div>

                {selectedReceipt.items && selectedReceipt.items.length > 0 && (
                  <div className="border-t border-[#ECE8DF] dark:border-white/10 pt-3">
                    <p className="font-bold text-[#1F2922] dark:text-white mb-2">Товары в чеке:</p>
                    <div className="space-y-1.5 bg-[#F5F2EA] dark:bg-[#121214] p-2.5 rounded-xl border border-[#E6E0D2] dark:border-white/10">
                      {selectedReceipt.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] border-b border-[#E8E2D4] dark:border-white/5 last:border-none pb-1 last:pb-0">
                          <span className="text-[#323B34] dark:text-stone-300">{it.name}</span>
                          <span className="font-bold text-[#1F2922] dark:text-white">{it.price} ₽</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-3 border-t border-[#ECE8DF] dark:border-white/10 bg-[#F7F4ED] dark:bg-[#121214] flex items-center gap-2">
            <button 
              type="button"
              onClick={() => {
                toast.success("Расход подтвержден и закреплен в отчете");
                setIsReceiptDrawerOpen(false);
              }}
              className="flex-1 py-2 bg-[#2D5A3F] dark:bg-emerald-700 hover:bg-[#244933] active:scale-95 text-white font-semibold rounded-xl text-center transition-all cursor-pointer"
            >
              Подтвердить
            </button>
            <button 
              type="button"
              onClick={() => setIsReceiptDrawerOpen(false)}
              className="py-2 px-3 bg-white dark:bg-[#2C2C2E] border border-[#DED8CB] dark:border-white/10 hover:bg-[#F0ECE1] active:scale-95 text-[#2C332D] dark:text-white font-medium rounded-xl transition-all cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>

      </section>

      {/* Confirm Delete Chat Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-[#1C1C1E] border border-[#ECE8DF] dark:border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F2922] dark:text-white">Удалить чат?</h3>
                <p className="text-xs text-[#717B73] dark:text-stone-400 mt-0.5">
                  Вы действительно хотите удалить «{activeTopic.title}» и всю историю сообщений?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 px-3 bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-[#2C332D] dark:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteActiveTopic}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
