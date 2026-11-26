import { Bell, Settings } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { subscribeToWorkspaceCollection, addItem, setChatHeart } from '../utils/db';
import { triggerHaptic } from '../utils/haptics';
import { toast } from 'sonner';
import { isOwnChatMessage, chatMessageTime, shouldFollowChat } from '../utils/familyWorkspace';
import { useVirtualMessageList, CHAT_VIRTUALIZATION_THRESHOLD } from '../hooks/useVirtualMessageList';

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
  reactions?: Record<string, number>;
  userReacted?: Record<string, boolean>;
  heartUsers?: string[];
}

export interface TopicItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  time: string;
  lastMessage: string;
}

const INITIAL_TOPICS: TopicItem[] = [
  { id: 'general', title: 'Общий семейный чат', subtitle: 'Сообщения семьи', icon: 'СБ', time: '', lastMessage: 'Пока нет сообщений' }
];

const INITIAL_MESSAGES_MAP: Record<string, ChatMessage[]> = { general: [] };

export default function FamilyChat({active=true,onOpenSettings,onOpenNotifications}:{active?:boolean;onOpenSettings?:()=>void;onOpenNotifications?:()=>void}) {
  const { user, familyId } = useAuth();
  const { members, settings } = useData();

  const [topics, setTopics] = useState<TopicItem[]>(INITIAL_TOPICS);
  const [activeTopicId, setActiveTopicId] = useState<string>('general');
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES_MAP);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const scope=familyId&&user?.uid?`${familyId}:${user.uid}`:null;
  const currentScopeRef=useRef(scope);
  currentScopeRef.current=scope;
  const [openedScope,setOpenedScope]=useState<string|null>(null);
  const [loadedScope,setLoadedScope]=useState<string|null>(null);
  const [loadError,setLoadError]=useState(false);
  const [chatStale,setChatStale]=useState(false);
  const [chatRetry,setChatRetry]=useState(0);
  const retryAfter=useRef(0);
  const retryChat=()=>{if(Date.now()<retryAfter.current){toast.info('Повторная проверка временно недоступна');return;}retryAfter.current=Date.now()+10000;setChatRetry(n=>n+1);};
  const followChat=useRef(true);
  const pendingHearts=useRef(new Set<string>());
  const sendingRef=useRef(false);
  const [heartBusy,setHeartBusy]=useState<string[]>([]);
  useEffect(()=>{if(active&&scope)setOpenedScope(scope);},[active,scope]);
  
  // UI states
  const [inputText, setInputText] = useState('');
  const composerRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{const el=composerRef.current;if(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,128)+'px';}},[inputText]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ChatMessage['receiptData'] | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Mobile View Navigation State: 'list' (topic folders) vs 'chat' (active conversation)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('chat');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const activeTopic = topics.find(t => t.id === activeTopicId) || topics[0];
  const currentMessages = loadedScope===scope?(messagesMap[activeTopicId] || []):[];

  // Auto-scroll to bottom on topic change or message addition
  useEffect(() => {
    if (active&&followChat.current&&messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [active,activeTopicId, currentMessages.length, mobileView]);

  // Keep each message in its own topic. Empty snapshots must clear stale messages.
  useEffect(()=>{setInputText('');setSearchQuery('');setActiveTopicId('general');followChat.current=true;},[scope]);
  useEffect(() => {
    setMessagesMap({ general: [] });setTopics(INITIAL_TOPICS);
    setLoadedScope(null);setLoadError(false);setChatStale(false);
    if (!familyId||!scope||openedScope!==scope) return;
    let activeSubscription=true;
    const unsub = subscribeToWorkspaceCollection(familyId, 'chat', (data,metadata) => {
      if(!activeSubscription)return;
      setChatStale(metadata.fromCache);
      if(metadata.fromCache)return;
      setLoadedScope(scope);setLoadError(false);
      const grouped: Record<string, ChatMessage[]> = { general: [] };
      if (Array.isArray(data)) {
        for (const message of data as ChatMessage[]) {
          const topicId = message.topicId || 'general';
          (grouped[topicId] ||= []).push(message);
        }
      }
      for (const messages of Object.values(grouped)) {
        messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      }
      setMessagesMap(grouped);
      setTopics(prev => {
        const known = new Set(prev.map(topic => topic.id));
        const discovered = Object.keys(grouped).filter(id => !known.has(id)).map(id => ({
          id,
          title: id === 'shopping' ? 'Покупки' : id === 'weekend' ? 'Выходные' : `Тема ${id}`,
          subtitle: 'Сообщения семьи',
          icon: '💬',
          time: '',
          lastMessage: 'История сообщений'
        }));
        return discovered.length ? [...prev, ...discovered] : prev;
      });
    },error=>{if(activeSubscription){setLoadError(true);if(/quota|resource.exhausted|429/i.test(error.message))retryAfter.current=Date.now()+300000;}});
    return () => {activeSubscription=false;unsub();};
  }, [familyId,scope,openedScope,chatRetry]);

  // Topic Switcher
  const handleSelectTopic = (topicId: string) => {
    triggerHaptic('light');
    followChat.current=true;
    setActiveTopicId(topicId);
    setMobileView('chat');
    setIsSearching(false);
    setSearchQuery('');
  };

  // Send only confirmed messages; retain the draft when saving fails.
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sendingRef.current || loadError || chatStale || (scope&&loadedScope!==scope)) return;
    if (!familyId || !user) {
      toast.error('Для отправки сообщений войдите в семейное пространство');
      return;
    }

    sendingRef.current=true;setIsSendingMessage(true);
    const topicId = activeTopicId;
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      topicId,
      text,
      userId: user.uid,
      userName: members.find(m=>m.userId===user.uid)?.name || user.displayName || 'Участник семьи',
      timestamp: Date.now(),
      type: 'text'
    };
    try {
      await addItem(familyId, 'chat', newMsg);
      if(currentScopeRef.current!==scope)return;
      triggerHaptic('medium');
      followChat.current=true;
      setInputText(prev => prev.trim() === text ? '' : prev);
      setTopics(prev => prev.map(t => t.id === topicId ? {
        ...t,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        lastMessage: `Вы: ${text}`
      } : t));
    } catch (err) {
      console.error('Failed to send chat message:', err);
      if(currentScopeRef.current===scope)toast.error('Сообщение не отправлено. Повторите попытку.');
    } finally {
      sendingRef.current=false;setIsSendingMessage(false);
    }
  };

  // Shared, per-account heart reactions. No local-only mutation of message counts.
  const handleToggleReaction=async(msg:ChatMessage)=>{
    if(!familyId||!user?.uid||pendingHearts.current.has(msg.id))return;
    pendingHearts.current.add(msg.id);setHeartBusy(prev=>[...prev,msg.id]);
    try{
      await setChatHeart(familyId,msg.id,user.uid,!(msg.heartUsers||[]).includes(user.uid));
      triggerHaptic('selection');
    }catch{toast.error('Не удалось сохранить реакцию');}
    finally{pendingHearts.current.delete(msg.id);setHeartBusy(prev=>prev.filter(id=>id!==msg.id));}
  };

  // Deleting a local topic would leave its messages in Firestore.
  const handleDeleteActiveTopic = () => {
    setIsDeleteModalOpen(false);
    toast.info('Удаление тем пока недоступно: история хранится в семейном пространстве.');
  };

  // Attachment Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.warning('Отправка файлов в чате пока не поддерживается. Файл не прикреплён.');
      e.target.value = '';
    }
  };

  const filteredMessages = (loadedScope===scope?currentMessages:[]).filter(msg => {
    if (!searchQuery.trim()) return true;
    return (msg.text||'').toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  // Dynamic virtualization: activates when exceeding 500 records
  const {
    isVirtual,
    virtualItems,
    topSpacerHeight,
    bottomSpacerHeight
  } = useVirtualMessageList({
    itemCount: filteredMessages.length,
    containerRef: messagesContainerRef,
    threshold: CHAT_VIRTUALIZATION_THRESHOLD
  });

  return (
    <div className="w-full h-full flex-1 flex bg-[var(--terra-canvas)] dark:bg-[var(--terra-canvas)] text-on-surface dark:text-white font-body antialiased relative rounded-none md:rounded-2xl overflow-hidden border-0 md:border md:border-[var(--terra-border)] dark:md:border-white/10 min-h-0">
      
      {/* LEFT COLUMN: CHAT FOLDERS / TOPICS LIST (Always visible on desktop md+, toggleable on mobile) */}
      <aside className={`w-full md:w-[216px] xl:w-[280px] border-r border-outline-variant/30 bg-[var(--terra-soft)] dark:bg-[var(--terra-surface)] flex-col shrink-0 h-full ${
        mobileView === 'list' ? 'flex' : 'hidden md:flex'
      }`}>
        {/* Sidebar Header */}
        <header data-terra-mobile-header className="min-h-[60px] px-3 border-b border-[var(--terra-border)] dark:border-white/10 flex items-center justify-between shrink-0 bg-[var(--terra-canvas)] dark:bg-[var(--terra-canvas)]">
          <div>
            <h1 className="font-headline font-bold text-xl tracking-tight text-[var(--terra-ink)] dark:text-white">Семейные беседы</h1>
            <p className="text-[11.5px] font-body text-on-surface-variant dark:text-stone-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#4A7C59] inline-block"></span>
              <span>{members.length} участников семьи</span>
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">{onOpenNotifications&&<button type="button" onClick={onOpenNotifications} aria-label="Уведомления" className="md:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-xl hover:bg-[var(--terra-soft)]"><Bell size={18} aria-hidden="true"/></button>}{onOpenSettings&&<button type="button" onClick={onOpenSettings} aria-label="Настройки и профиль" className="md:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-xl hover:bg-[var(--terra-soft)]"><Settings size={18} aria-hidden="true"/></button>}</div>
        </header>

        {/* Topics List */}
        <div data-testid="chat-topics-scroll-container" className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-2 space-y-1.5 custom-scrollbar pb-4 md:pb-2">
          {topics.map(t => {
            const isActive = t.id === activeTopicId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTopic(t.id)}
                className={`w-full min-h-[64px] p-2.5 rounded-xl text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-[var(--terra-primary-soft)] border border-[var(--terra-border)]' 
                    : 'hover:bg-surface-container/60 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline font-semibold text-sm shrink-0 shadow-[0_2px_8px_rgba(74,124,89,0.15)]">
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-headline text-sm truncate ${isActive ? 'font-bold text-on-surface dark:text-white' : 'font-semibold text-on-surface/90 dark:text-stone-300'}`}>
                      {t.title}
                    </span>
                    <span className="text-[10.5px] font-body text-on-surface-variant dark:text-stone-400 shrink-0 ml-1">{t.time}</span>
                  </div>
                  <p className="text-xs font-body text-on-surface-variant dark:text-stone-400 truncate mt-0.5">
                    {scope&&loadedScope!==scope?(loadError?'Недоступно':'Загрузка…'):messagesMap[t.id]?.length ? messagesMap[t.id][messagesMap[t.id].length - 1].text : t.lastMessage}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* RIGHT COLUMN: ACTIVE CHAT FEED (Always visible on desktop md+, toggleable on mobile) */}
      <section className={`flex-1 flex flex-col h-full bg-[var(--terra-canvas)] dark:bg-[var(--terra-canvas)] min-w-0 relative ${
        mobileView === 'chat' ? 'flex' : 'hidden md:flex'
      }`}>
        
        {/* Chat Header */}
        <header data-terra-mobile-header className="sticky top-0 w-full z-40 bg-[var(--terra-canvas)] dark:bg-[var(--terra-canvas)] border-b border-[var(--terra-border)] dark:border-white/10 shrink-0">
          <div className="min-h-[60px] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Back Button for Mobile View */}
              <button 
                type="button"
                aria-label="К спискам чатов" 
                onClick={() => setMobileView('list')}
                className="md:hidden w-11 h-11 -ml-1 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
              </button>

              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline font-semibold text-sm shrink-0 shadow-[0_2px_8px_rgba(74,124,89,0.15)]">
                {activeTopic.icon}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="text-[15px] font-headline font-semibold text-on-surface dark:text-white truncate leading-snug">
                  {activeTopic.title}
                </h2>
                <p className="text-[11.5px] font-body text-on-surface-variant dark:text-stone-400 truncate leading-none mt-0.5">
                  {activeTopic.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button 
                type="button"
                aria-label="Поиск" 
                onClick={() => setIsSearching(!isSearching)}
                className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant dark:text-stone-300 hover:text-on-surface hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">search</span>
              </button>

              <button 
                type="button"
                aria-label="Удалить чат" 
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-11 h-11 flex items-center justify-center rounded-full text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Удалить чат"
              >
                <span className="material-symbols-outlined text-[22px]">delete</span>
              </button>

              {onOpenNotifications&&<button type="button" onClick={onOpenNotifications} aria-label="Уведомления" className="md:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-xl hover:bg-[var(--terra-soft)]"><Bell size={18} aria-hidden="true"/></button>}{onOpenSettings&&<button type="button" onClick={onOpenSettings} aria-label="Настройки и профиль" className="md:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-xl hover:bg-[var(--terra-soft)]"><Settings size={18} aria-hidden="true"/></button>}
            </div>

          </div>

          {/* Collapsible Search Bar */}
          {isSearching && (
            <div className="px-4 py-2 bg-surface-container-low dark:bg-[var(--terra-surface)] border-t border-surface-variant/40 dark:border-white/10 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по сообщениям..." aria-label="Поиск по сообщениям"
                className="w-full bg-transparent text-xs text-on-surface dark:text-white placeholder:text-on-surface-variant/60 outline-none"
                autoFocus
              />
              <button 
                type="button"
                onClick={() => { setIsSearching(false); setSearchQuery(''); }}
                className="min-h-[44px] min-w-[44px] text-sm font-semibold text-[var(--terra-muted)] hover:text-[var(--terra-ink)] px-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
              >
                Закрыть
              </button>
            </div>
          )}
        </header>

        {/* Messages Feed */}
        <main className="flex-1 min-h-0 flex flex-col w-full bg-background dark:bg-[var(--terra-canvas)] overflow-hidden">
          <div 
            ref={messagesContainerRef}
            onScroll={e=>{const el=e.currentTarget;followChat.current=shouldFollowChat(el.scrollHeight,el.clientHeight,el.scrollTop);}}
            data-testid="chat-messages-scroll-container"
            className="px-3 md:px-6 py-3 flex-1 overflow-y-auto overscroll-y-contain flex flex-col gap-3 min-h-0 custom-scrollbar"
          >
            {(loadError||chatStale)&&<div role="status" className="rounded-xl p-3 bg-[var(--terra-soft)] text-sm text-[var(--terra-ink)]">{loadError?'Не удалось обновить сообщения':'Сообщения не подтверждены сервером'}. <button type="button" onClick={retryChat} className="min-h-[44px] px-3 text-[var(--terra-primary-text)] font-semibold">Повторить загрузку</button></div>}
            {/* Date Separator */}
            <div className="flex items-center justify-center my-1">
              <div className="px-3.5 py-1 rounded-full bg-surface-container dark:bg-white/10 text-secondary dark:text-stone-300 text-xs font-body font-medium shadow-sm flex items-center gap-1.5">
                <span>{searchQuery.trim()?'Результаты поиска':'История сообщений'}</span>
                {isVirtual && (
                  <span className="text-[10.5px] bg-[#4A7C59]/15 text-[var(--terra-primary)] dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded-full" aria-label="Количество найденных сообщений">
                    {filteredMessages.length} сообщ.
                  </span>
                )}
              </div>
            </div>

            {topSpacerHeight > 0 && (
              <div style={{ height: topSpacerHeight }} aria-hidden="true" />
            )}

            {virtualItems.map(({ index }) => {
              const msg = filteredMessages[index];
              if (!msg) return null;

              const isMe = isOwnChatMessage(msg,user?.uid);

              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="flex items-center justify-center my-1">
                    <span className="text-xs font-medium text-on-surface-variant dark:text-stone-400 bg-surface-container-low dark:bg-white/5 px-3 py-1 rounded-full">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              if (msg.type === 'receipt' && msg.receiptData) {
                return (
                  <div key={msg.id} className="flex items-start gap-2.5 max-w-[90%]">
                    <div className="w-9 h-9 rounded-full bg-[#e8a598] text-[#5c241a] font-headline font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {(msg.userName||'Участник').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 px-1">
                        <span className="font-headline font-semibold text-[13px] text-on-surface dark:text-white">{msg.userName}</span>
                        <span className="text-xs font-body text-[var(--terra-muted)]">
                          {chatMessageTime(msg.timestamp)}
                        </span>
                      </div>

                      <div className="bg-surface-container-low dark:bg-[var(--terra-surface)] rounded-xl p-3.5 shadow-sm flex flex-col gap-2.5 border border-outline-variant/20 dark:border-white/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-primary-fixed dark:bg-emerald-950 flex items-center justify-center shrink-0 text-primary dark:text-emerald-400">
                              <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-body font-medium text-on-surface-variant dark:text-stone-300">Трата внесена в бюджет</p>
                              <p className="text-base font-headline font-bold text-on-surface dark:text-white leading-tight mt-0.5">
                                {msg.receiptData.amount.toLocaleString('ru-RU')} {settings.currency || '₽'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-body font-semibold px-2 py-0.5 rounded-full bg-tertiary-fixed dark:bg-amber-950/60 text-on-tertiary-fixed dark:text-amber-300 shrink-0">
                            Чек учтен
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 bg-surface-container/60 dark:bg-white/5 -mx-3.5 -mb-3.5 px-3.5 py-2.5 rounded-b-xl border-t border-surface-variant/30 dark:border-white/5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-[17px] text-tertiary dark:text-amber-400">medication</span>
                            <span className="text-xs font-body text-on-surface-variant dark:text-stone-300 truncate">
                              Категория: {msg.receiptData.category}
                            </span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedReceipt(msg.receiptData!);
                              setIsReceiptModalOpen(true);
                              triggerHaptic('light');
                            }}
                            className="text-xs font-body font-bold text-primary dark:text-emerald-400 hover:text-on-primary-fixed-variant flex items-center gap-0.5 shrink-0 pl-2 py-1 cursor-pointer"
                          >
                            <span>Детали</span>
                            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (!isMe) {
                return (
                  <div key={msg.id} data-chat-message-id={msg.id} className="flex items-start gap-2.5 max-w-[90%]">
                    <div className="w-9 h-9 rounded-full bg-[#e8a598] text-[#5c241a] font-headline font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {(msg.userName||'Участник').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-baseline gap-2 px-1">
                        <span className="font-headline font-semibold text-[13px] text-on-surface dark:text-white">{msg.userName}</span>
                        <span className="text-xs font-body text-[var(--terra-muted)]">
                          {chatMessageTime(msg.timestamp)}
                        </span>
                      </div>

                      <div className="relative bg-[var(--terra-surface)] border border-[var(--terra-border)] p-3.5 break-words [overflow-wrap:anywhere] whitespace-pre-wrap rounded-2xl rounded-tl-sm text-on-surface dark:text-stone-100 text-sm sm:text-base leading-relaxed font-body">
                        <span data-testid="chat-message-text">{msg.text}</span>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <button type="button" aria-label="Реакция сердце" aria-pressed={Boolean(user?.uid&&msg.heartUsers?.includes(user.uid))}
                            disabled={!user||heartBusy.includes(msg.id)} onClick={()=>void handleToggleReaction(msg)}
                            className="min-h-[44px] min-w-[44px] rounded-xl px-2 text-xs border border-[var(--terra-border)] dark:border-white/10 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary">
                            ♥ {(msg.heartUsers||[]).length||''}
                          </button>
                          {!!msg.reactions?.['❤️']&&<span className="text-xs text-graphite-muted dark:text-gray-400">Старые реакции: {msg.reactions['❤️']}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex flex-col items-end gap-1 self-end max-w-[88%] ml-auto">
                  <div className="flex items-baseline gap-2 px-1">
                    <span className="text-xs font-body text-[var(--terra-muted)]">
                      {chatMessageTime(msg.timestamp)}
                    </span>
                    <span className="font-headline font-semibold text-[13px] text-on-surface dark:text-white">Вы</span>
                  </div>

                  <div className="bg-[var(--terra-primary-soft)] text-[var(--terra-ink)] p-3.5 break-words [overflow-wrap:anywhere] whitespace-pre-wrap rounded-2xl rounded-tr-sm text-sm sm:text-base leading-relaxed font-body font-medium">
                    {msg.text}
                  </div>
                  {!!msg.heartUsers?.length&&<span className="text-xs text-graphite-muted dark:text-gray-400">♥ {msg.heartUsers.length}</span>}

                  <div className="flex items-center gap-1 pr-1 text-[11px] text-on-surface-variant dark:text-stone-400 font-body">
                    <span className="material-symbols-outlined text-[15px] text-[var(--terra-primary)] dark:text-emerald-400">done_all</span>
                    <span>Отправлено</span>
                  </div>
                </div>
              );
            })}

            {filteredMessages.length === 0 && (
              <div className="text-center text-sm text-on-surface-variant dark:text-stone-400 py-8 px-4">
                {loadError?'Не удалось загрузить сообщения. Проверьте подключение.':scope&&loadedScope!==scope?'Загрузка сообщений…':searchQuery.trim()?'Ничего не найдено.':'Здесь пока нет сообщений. Напишите первое сообщение семье.'}
              </div>
            )}

            {bottomSpacerHeight > 0 && (
              <div style={{ height: bottomSpacerHeight }} aria-hidden="true" />
            )}
          </div>
        </main>

        {/* Composer Bar */}
        <footer className="shrink-0 bg-surface-container-lowest dark:bg-[var(--terra-surface)] border-t border-[var(--terra-border)] pb-1 md:pb-2">
          <form className="p-2 sm:p-3 flex items-end gap-1.5 sm:gap-2" onSubmit={handleSendMessage}>
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
              className="w-11 h-11 rounded-xl bg-surface-container-low dark:bg-white/5 hover:bg-surface-container flex items-center justify-center text-on-surface-variant dark:text-stone-300 transition-colors shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] sm:text-[22px]">attach_file</span>
            </button>

            <div className="flex-1 min-w-0 bg-surface-container-low dark:bg-[var(--terra-canvas)] rounded-2xl px-3 sm:px-3.5 py-2 sm:py-2.5 flex items-center focus-within:bg-surface-container dark:focus-within:bg-white/10 transition-colors">
              <textarea ref={composerRef} rows={1} value={inputText}
                onChange={e=>setInputText(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&e.nativeEvent.keyCode!==229&&!window.matchMedia('(pointer:coarse)').matches){e.preventDefault();void handleSendMessage();}}}
                placeholder="Сообщение семье..." aria-label="Сообщение семье"
                className="w-full min-w-0 resize-none max-h-32 overflow-y-auto bg-transparent text-base text-[var(--terra-ink)] placeholder:text-[var(--terra-muted)] focus:outline-none font-body leading-normal"/>
            </div>

            <button 
              type="submit"
              aria-label="Отправить сообщение"
              disabled={isSendingMessage || !inputText.trim() || !familyId || !user || loadError || chatStale || loadedScope!==scope}
              className="h-11 min-w-[44px] px-3 sm:px-4 rounded-xl bg-[var(--terra-primary-solid)] hover:bg-[var(--terra-primary-hover)] text-[var(--terra-on-primary)] font-body font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors terra-press shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] disabled:opacity-50"
            >
              <span className="hidden sm:inline text-white">Отправить</span>
              <span className="material-symbols-outlined text-[17px] text-white">send</span>
            </button>
          </form>
        </footer>

      </section>

      {/* EXPENSE DETAILS MODAL SHEET */}
      {isReceiptModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end justify-center p-0 transition-opacity">
          <div className="w-full max-w-md !bg-white dark:!bg-[var(--terra-surface)] rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-6 duration-200 motion-reduce:animate-none border-t border-stone-200 dark:border-white/10 relative z-10">
            <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600 mx-auto"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[var(--terra-primary)] dark:text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">Детали расхода</h3>
                  <p className="text-xs text-on-surface-variant dark:text-stone-400 font-body">Данные прикреплённого чека</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-9 h-9 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center text-on-surface-variant dark:text-stone-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-stone-50 dark:bg-[var(--terra-canvas)] rounded-xl p-3.5 space-y-2 text-xs font-body text-on-surface dark:text-stone-200 border border-stone-200 dark:border-white/10">
              <div className="flex justify-between">
                <span className="text-on-surface-variant dark:text-stone-400">Сумма покупки:</span>
                <span className="font-bold text-sm text-on-surface dark:text-white">
                  {selectedReceipt.amount.toLocaleString('ru-RU')} {settings.currency || '₽'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant dark:text-stone-400">Категория:</span>
                <span className="font-semibold text-[var(--terra-primary)] dark:text-emerald-400">{selectedReceipt.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant dark:text-stone-400">Дата и время:</span>
                <span>{selectedReceipt.date}</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="w-full py-3 bg-[#2D5A3F] hover:bg-[#244933] text-white rounded-xl font-headline font-semibold text-sm shadow-sm active:scale-95 transition-transform cursor-pointer"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE CHAT MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="!bg-white dark:!bg-[var(--terra-surface)] border border-stone-200 dark:border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">Удалить чат?</h3>
                <p className="text-xs text-on-surface-variant dark:text-stone-400 mt-0.5 font-body">
                  Вы действительно хотите удалить «{activeTopic.title}» и всю историю сообщений?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 px-3 bg-surface-container dark:bg-white/10 hover:bg-surface-container-high text-on-surface dark:text-white text-xs font-headline font-bold rounded-xl transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteActiveTopic}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-headline font-bold rounded-xl transition-all shadow-xs cursor-pointer"
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
