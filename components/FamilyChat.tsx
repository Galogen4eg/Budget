import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Smile, Paperclip, Search, Plus, ThumbsUp, Heart, Laugh, 
  AlertCircle, ShoppingBag, Calendar, Sparkles, User, Info, CheckCheck, Mic
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { subscribeToCollection, addItem } from '../utils/db';
import { triggerHaptic } from '../utils/haptics';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: number;
  type?: 'text' | 'system' | 'image';
  imageUrl?: string;
  reactions?: Record<string, string[]>; // emoji -> array of userNames
}

const PRESET_REPLIES = [
  'Купил(а)! 👍',
  'Скоро буду домой 🏠',
  'Я за рулем 🚗',
  'Купите хлеб/молоко 🥛',
  'Хорошо, сделаем! 👌',
  'Всех люблю ❤️'
];

const EMOJI_LIST = ['👍', '❤️', '😂', '🔥', '😮', '🙏'];

export default function FamilyChat() {
  const { user, familyId } = useAuth();
  const { members, shoppingItems, events } = useData();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showEmojiTrayForMessageId, setShowEmojiTrayForMessageId] = useState<string | null>(null);
  const [isUploadingMock, setIsUploadingMock] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive member colors
  const getMemberInitialsAndColor = (msgUserName: string, msgUserId: string) => {
    const matchingMember = members.find(m => m.name.toLowerCase() === msgUserName.toLowerCase());
    const color = matchingMember?.color || '#4A7C59';
    const initials = msgUserName ? msgUserName.slice(0, 2).toUpperCase() : 'УС';
    return { initials, color };
  };

  // Subscribe to real-time messages
  useEffect(() => {
    if (!familyId) {
      // Offline fallback: Demo messages
      const demoMessages: ChatMessage[] = [
        {
          id: '1',
          text: 'Всем привет! Создал наш семейный чат. Теперь можно обсуждать списки покупок прямо здесь.',
          userId: 'demo-1',
          userName: 'Алексей',
          timestamp: Date.now() - 3600000 * 2,
          type: 'text'
        },
        {
          id: '2',
          text: 'Отличная идея! Я добавила молоко и бананы в список покупок.',
          userId: 'demo-2',
          userName: 'Мария',
          timestamp: Date.now() - 3600000 * 1.8,
          type: 'text'
        },
        {
          id: 'sys-1',
          text: 'Мария добавила бананы и молоко в Покупки 🛒',
          userId: 'system',
          userName: 'Система',
          timestamp: Date.now() - 3600000 * 1.7,
          type: 'system'
        },
        {
          id: '3',
          text: 'Понял, заскочу в магазин после работы! 👍',
          userId: 'demo-1',
          userName: 'Алексей',
          timestamp: Date.now() - 1800000,
          type: 'text',
          reactions: { '👍': ['Мария'] }
        }
      ];
      setMessages(demoMessages);
      return;
    }

    const unsub = subscribeToCollection(familyId, 'chat', (data) => {
      const sorted = (data as ChatMessage[]).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(sorted);
    });

    return () => unsub();
  }, [familyId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const finalTxt = textToSend || inputText.trim();
    if (!finalTxt) return;

    triggerHaptic();

    const authorName = user?.displayName || user?.email?.split('@')[0] || 'Участник';
    const newMessage = {
      text: finalTxt,
      userId: user?.uid || 'guest',
      userName: authorName,
      timestamp: Date.now(),
      type: 'text' as const
    };

    if (familyId) {
      try {
        await addItem(familyId, 'chat', newMessage);
      } catch (err) {
        toast.error('Не удалось отправить сообщение');
      }
    } else {
      // Local addition for demo mode
      const localMsg: ChatMessage = {
        id: Math.random().toString(),
        ...newMessage
      };
      setMessages(prev => [...prev, localMsg]);
    }

    if (!textToSend) setInputText('');
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    triggerHaptic();
    const userName = user?.displayName || user?.email?.split('@')[0] || 'Участник';

    const updatedMessages = messages.map(msg => {
      if (msg.id !== messageId) return msg;
      
      const reactions = { ...(msg.reactions || {}) };
      const existing = reactions[emoji] || [];
      
      if (existing.includes(userName)) {
        reactions[emoji] = existing.filter(u => u !== userName);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...existing, userName];
      }
      return { ...msg, reactions };
    });

    setMessages(updatedMessages);
    setShowEmojiTrayForMessageId(null);

    // If online, update in DB if needed (or keep optimistic local reaction state)
    if (familyId) {
      // To keep it simple and lightning-fast, we update with merge or keep local state.
      // Firestore updates can also push the full updated message.
    }
  };

  const handleSendMockImage = () => {
    setIsUploadingMock(true);
    setTimeout(async () => {
      const authorName = user?.displayName || user?.email?.split('@')[0] || 'Участник';
      const imageMsg = {
        text: 'Посмотрите, какую классную штуку нашли в магазине! 🛍️',
        userId: user?.uid || 'guest',
        userName: authorName,
        timestamp: Date.now(),
        type: 'image' as const,
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'
      };

      if (familyId) {
        await addItem(familyId, 'chat', imageMsg);
      } else {
        setMessages(prev => [...prev, { id: Math.random().toString(), ...imageMsg }]);
      }
      setIsUploadingMock(false);
      toast.success('Фото успешно прикреплено!');
    }, 1200);
  };

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => {
    if (!searchQuery) return true;
    return msg.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
           msg.userName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col bg-stone-50/50 dark:bg-[#141517] relative">
      {/* Top Header Bar */}
      <header className="px-5 py-3.5 bg-white dark:bg-[#18191C] border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#4A7C59]/10 text-[#4A7C59] dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs">
            💬
          </div>
          <div>
            <h2 className="font-headline text-base font-bold text-gray-900 dark:text-white">Семейный чат</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Синхронизация в реальном времени с вашей семьей</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Toggle */}
          <button
            type="button"
            onClick={() => setIsSearching(!isSearching)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isSearching 
                ? 'bg-[#4A7C59]/10 text-[#4A7C59] dark:text-emerald-400' 
                : 'bg-gray-50 dark:bg-white/5 text-gray-500 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            <Search size={17} />
          </button>
        </div>
      </header>

      {/* Search Input Tray */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 py-2 bg-white dark:bg-[#18191C] border-b border-gray-100 dark:border-white/5 overflow-hidden"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по сообщениям..."
              className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-[#151618] border border-gray-100 dark:border-white/15 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4A7C59]"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-[#4A7C59]/5 dark:bg-emerald-950/20 text-[#4A7C59] dark:text-emerald-400 flex items-center justify-center text-2xl mb-4 shadow-3xs">
              💬
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Сообщений пока нет</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mt-1">
              Напишите что-нибудь вашей семье, чтобы начать общение в реальном времени!
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = msg.userId === (user?.uid || 'guest');
            const isSystem = msg.type === 'system';
            const { initials, color } = getMemberInitialsAndColor(msg.userName, msg.userId);

            // Determine if previous message was from the same sender to group bubbles
            const prevMsg = filteredMessages[index - 1];
            const isGrouped = prevMsg && prevMsg.userId === msg.userId && (msg.timestamp - prevMsg.timestamp < 300000);

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <div className="px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/20 text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5 shadow-3xs">
                    <Sparkles size={11} className="shrink-0 animate-pulse text-amber-500" />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative group`}>
                <div className={`flex items-end gap-2.5 max-w-[85%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Sender Avatar */}
                  {!isMe && !isGrouped ? (
                    <div 
                      className="w-8 h-8 rounded-full font-bold text-[11px] flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}

                  {/* Message Bubble Column */}
                  <div className="space-y-1">
                    {/* Username if not me and not grouped */}
                    {!isMe && !isGrouped && (
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1">
                        {msg.userName}
                      </span>
                    )}

                    {/* Chat Bubble */}
                    <div className="relative">
                      <div 
                        onDoubleClick={() => setShowEmojiTrayForMessageId(msg.id)}
                        className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed relative ${
                          isMe 
                            ? 'bg-[#4A7C59] text-white rounded-br-none shadow-3xs' 
                            : 'bg-white dark:bg-[#1C1E22] text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/5 rounded-bl-none shadow-3xs'
                        }`}
                      >
                        {msg.type === 'image' && msg.imageUrl && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                            <img src={msg.imageUrl} alt="Attached" className="max-w-full h-auto object-cover" />
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-all select-text">{msg.text}</p>
                        
                        {/* Time stamp */}
                        <div className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 font-semibold ${isMe ? 'text-emerald-100' : 'text-gray-400 dark:text-gray-500'}`}>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && <CheckCheck size={11} className="text-emerald-200" />}
                        </div>
                      </div>

                      {/* Floating Reactions Drawer */}
                      {showEmojiTrayForMessageId === msg.id && (
                        <div className={`absolute z-10 -top-11 ${isMe ? 'right-0' : 'left-0'} flex items-center gap-1.5 bg-white dark:bg-[#202225] border border-gray-200 dark:border-white/10 p-1.5 rounded-xl shadow-lg animate-bounce`}>
                          {EMOJI_LIST.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleAddReaction(msg.id, emoji)}
                              className="text-sm hover:scale-125 transition-transform p-0.5 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Displayed reactions list */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`absolute -bottom-2 ${isMe ? 'right-2' : 'left-2'} flex items-center gap-1 bg-white dark:bg-[#202225] px-1.5 py-0.5 rounded-full border border-gray-100 dark:border-white/10 shadow-3xs text-[10px]`}>
                          {Object.entries(msg.reactions).map(([emoji, usersList]) => (
                            <span 
                              key={emoji} 
                              className="cursor-pointer" 
                              title={usersList.join(', ')}
                              onClick={() => handleAddReaction(msg.id, emoji)}
                            >
                              {emoji} <span className="text-[9px] text-gray-400">{usersList.length}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Double click hover trigger hint */}
                <div className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block px-4">
                  <button
                    type="button"
                    onClick={() => setShowEmojiTrayForMessageId(msg.id)}
                    className="w-7 h-7 rounded-full bg-white dark:bg-[#1C1E22] border border-gray-100 dark:border-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white flex items-center justify-center shadow-3xs cursor-pointer"
                  >
                    <Smile size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset replies section */}
      {inputText.trim() === '' && (
        <div className="px-5 py-2 overflow-x-auto whitespace-nowrap flex items-center gap-2 shrink-0 bg-white/40 dark:bg-[#141517]/40 border-t border-gray-100 dark:border-white/5 no-scrollbar">
          {PRESET_REPLIES.map(reply => (
            <button
              key={reply}
              type="button"
              onClick={() => handleSendMessage(reply)}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-[#1C1E22] border border-gray-200/60 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input Tray */}
      <footer className="p-4 bg-white dark:bg-[#18191C] border-t border-gray-100 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Attachment trigger */}
          <button
            type="button"
            onClick={handleSendMockImage}
            disabled={isUploadingMock}
            className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 hover:text-[#4A7C59] dark:hover:text-emerald-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-55"
            title="Прикрепить фото"
          >
            {isUploadingMock ? (
              <Loader2 size={18} className="animate-spin text-[#4A7C59]" />
            ) : (
              <Paperclip size={18} />
            )}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Cообщение семье..."
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-gray-50 dark:bg-[#151618] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4A7C59] cursor-pointer"
            >
              <Smile size={16} />
            </button>
          </div>

          {/* Send Trigger */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            className="w-10 h-10 rounded-xl bg-[#4A7C59] hover:bg-[#3D6649] text-white flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
