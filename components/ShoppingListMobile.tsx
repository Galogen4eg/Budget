import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Check, X, ScanLine, ShoppingBag, 
  Loader2, Edit2, ChevronLeft, Mic, BrainCircuit, 
  ArrowRight, Send, Sparkles, ChevronDown, ChevronUp,
  Star, Zap, QrCode, User, PlusCircle, RotateCcw,
  Search, CheckCircle2
} from 'lucide-react';
import TerraMobileHeader from './TerraMobileHeader';
import { ShoppingItem, AppSettings, FamilyMember } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem, addItemsBatch, deleteItemsBatch } from '../utils/db';
import { detectProductCategory } from '../utils/categorizer';
import { GoogleGenAI } from "@google/genai";
import { parseVoiceShoppingText } from '../utils/voiceShoppingParser';
import { 
  parseQuickShoppingInput, 
  createShoppingItemsFromQuickText 
} from '../utils/quickShoppingParser';
import { 
  recordPurchaseEvent, 
  getTopFrequentPurchases,
  FrequentItemStat
} from '../utils/frequentPurchases';

export interface ShoppingListMobileProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onCompletePurchase?: () => void;
  onMoveToPantry: (item: ShoppingItem) => Promise<void>;
  onSendToTelegram: (items: ShoppingItem[]) => Promise<boolean>;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
}

export const AISLES = [
  { id: 'dairy', label: 'Молочные продукты и сыры', icon: '🥛', emoji: '🥛', bg: 'bg-[#C8E8D0] text-[#2A6038]' },
  { id: 'bakery', label: 'Хлеб и свежая выпечка', icon: '🍞', emoji: '🍞', bg: 'bg-[#F0E8DB] text-[#5E5548]' },
  { id: 'produce', label: 'Овощи, фрукты и зелень', icon: '🥦', emoji: '🥦', bg: 'bg-[#D8F0DE] text-[#2A6038]' },
  { id: 'meat', label: 'Мясо, птица и рыба', icon: '🥩', emoji: '🥩', bg: 'bg-[#FFDAD8] text-[#690005]' },
  { id: 'grocery', label: 'Бакалея, крупы и макароны', icon: '🍝', emoji: '🍝', bg: 'bg-[#F0E8DB] text-[#554020]' },
  { id: 'drinks', label: 'Напитки, соки и вода', icon: '🧃', emoji: '🧃', bg: 'bg-[#E4E0D8] text-[#4A4E4A]' },
  { id: 'sweets', label: 'Сладости, снеки и чай', icon: '🍫', emoji: '🍫', bg: 'bg-[#F8E0A8] text-[#554020]' },
  { id: 'frozen', label: 'Замороженные продукты', icon: '🧊', emoji: '🧊', bg: 'bg-[#C8E8D0] text-[#2A6038]' },
  { id: 'household', label: 'Товары для дома и быта', icon: '🧼', emoji: '🧼', bg: 'bg-[#E4E0D8] text-[#4A4E4A]' },
  { id: 'beauty', label: 'Уход, косметика и гигиена', icon: '💄', emoji: '💄', bg: 'bg-[#FFDAD8] text-[#690005]' },
  { id: 'pets', label: 'Товары для питомцев', icon: '🐱', emoji: '🐱', bg: 'bg-[#F0E8DB] text-[#5E5548]' },
  { id: 'pharmacy', label: 'Аптека и здоровье', icon: '💊', emoji: '💊', bg: 'bg-[#C8E8D0] text-[#2A6038]' },
  { id: 'other', label: 'Другие покупки', icon: '📦', emoji: '📦', bg: 'bg-[#E4E0D8] text-[#4A4E4A]' },
];

const UNITS = ['шт', 'кг', 'л', 'уп', 'г', 'бут'] as const;

export const ShoppingListMobile: React.FC<ShoppingListMobileProps> = ({
  items,
  setItems,
  settings,
  members,
  onMoveToPantry,
  onSendToTelegram,
  onOpenSettings,
  onOpenNotifications
}) => {
  const { familyId, user } = useAuth();

  // Search State (Member filter removed per user request)
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState<typeof UNITS[number]>('шт');
  const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedAisle, setSelectedAisle] = useState('dairy');
  const [newItemMemberId, setNewItemMemberId] = useState<string>('');
  const [justAddedTitle, setJustAddedTitle] = useState<string | null>(null);

  // Quick Add State
  const [quickAddText, setQuickAddText] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Telegram Sending State
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramNotification, setTelegramNotification] = useState<string | null>(null);

  // Scan & Voice State
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Collapsible Completed section
  const [isCompletedOpen, setIsCompletedOpen] = useState(true);

  // Frequent items state
  const [frequentStaples, setFrequentStaples] = useState<(FrequentItemStat & { totalScore: number; frequencyLabel: string })[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const modalTitleInputRef = useRef<HTMLInputElement>(null);

  const apiKey = settings.geminiApiKey || process.env.API_KEY;

  // Refresh frequent staples
  useEffect(() => {
    const top = getTopFrequentPurchases(8);
    setFrequentStaples(top);
  }, [items]);

  // Focus modal input when modal opens or after adding
  useEffect(() => {
    if (isAddModalOpen) {
      const timer = setTimeout(() => {
        modalTitleInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isAddModalOpen]);

  // Filter items by Search Query only
  const filteredItems = useMemo(() => {
    let result = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(q) ||
        (i.note && i.note.toLowerCase().includes(q)) ||
        (i.category && i.category.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, searchQuery]);

  // Active vs Completed
  const activeItems = useMemo(() => filteredItems.filter(i => !i.completed), [filteredItems]);
  const completedItems = useMemo(() => filteredItems.filter(i => i.completed), [filteredItems]);

  const allActiveCount = useMemo(() => items.filter(i => !i.completed).length, [items]);
  const allCompletedCount = useMemo(() => items.filter(i => i.completed).length, [items]);

  // Group active items by Aisle
  const groupedActiveItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    AISLES.forEach(a => { groups[a.id] = []; });

    activeItems.forEach(item => {
      const cat = item.category || detectProductCategory(item.title) || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    return groups;
  }, [activeItems]);

  // Quick Add live preview
  const liveParsedItems = useMemo(() => {
    if (!quickAddText.trim()) return [];
    return parseQuickShoppingInput(quickAddText);
  }, [quickAddText]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingItem(null);
    setNewItemTitle('');
    setNewItemAmount('1');
    setNewItemUnit('шт');
    setNewItemPriority('medium');
    setSelectedAisle('dairy');
    setNewItemMemberId(user?.uid || members[0]?.id || 'user');
    setJustAddedTitle(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: ShoppingItem) => {
    setEditingItem(item);
    setNewItemTitle(item.title);
    setNewItemAmount(item.amount || '1');
    setNewItemUnit((item.unit as any) || 'шт');
    setNewItemPriority(item.priority || 'medium');
    setSelectedAisle(item.category || 'dairy');
    setNewItemMemberId(item.memberId || user?.uid || 'user');
    setJustAddedTitle(null);
    setIsAddModalOpen(true);
  };

  const handleSaveModalItem = async (e: React.FormEvent, closeAfterSave = false) => {
    e.preventDefault();
    const title = newItemTitle.trim();
    if (!title) return;

    if (editingItem) {
      const updated: ShoppingItem = {
        ...editingItem,
        title,
        amount: newItemAmount.trim() || '1',
        unit: newItemUnit,
        priority: newItemPriority,
        category: selectedAisle,
        memberId: newItemMemberId
      };
      setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
      if (familyId) await updateItem(familyId, 'shopping', editingItem.id, updated);
      setIsAddModalOpen(false);
    } else {
      // Create new shopping item
      const newItem: ShoppingItem = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        title,
        amount: newItemAmount.trim() || '1',
        unit: newItemUnit,
        priority: newItemPriority,
        category: selectedAisle,
        completed: false,
        memberId: newItemMemberId
      };

      recordPurchaseEvent(newItem.title, 'added', {
        category: newItem.category,
        amount: newItem.amount,
        unit: newItem.unit
      });

      setItems(prev => [...prev, newItem]);
      if (familyId) await addItem(familyId, 'shopping', newItem);

      if (closeAfterSave) {
        setIsAddModalOpen(false);
      } else {
        // Continuous input: reset title, keep modal open, autofocus field
        setJustAddedTitle(title);
        setNewItemTitle('');
        setNewItemAmount('1');
        setTimeout(() => setJustAddedTitle(null), 3000);
        setTimeout(() => {
          modalTitleInputRef.current?.focus();
        }, 50);
      }
    }
  };

  const handleToggle = async (item: ShoppingItem) => {
    const nextCompleted = !item.completed;
    const updated = { ...item, completed: nextCompleted };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    if (familyId) await updateItem(familyId, 'shopping', item.id, { completed: nextCompleted });

    recordPurchaseEvent(item.title, nextCompleted ? 'completed' : 'restored', {
      category: item.category,
      amount: item.amount,
      unit: item.unit,
      price: item.estimatedPrice
    });
  };

  const handleAdjustAmount = async (item: ShoppingItem, delta: number) => {
    const current = parseFloat(item.amount || '1') || 1;
    const next = Math.max(1, Math.round((current + delta) * 10) / 10);
    const updated = { ...item, amount: String(next) };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    if (familyId) {
      await updateItem(familyId, 'shopping', item.id, { amount: String(next) });
    }
  };

  const handleDelete = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (familyId) await deleteItem(familyId, 'shopping', id);
    if (editingItem?.id === id) setIsAddModalOpen(false);
  };

  const handleClearCompleted = async () => {
    if (completedItems.length === 0) return;
    const idsToDelete = completedItems.map(i => i.id);
    setItems(prev => prev.filter(i => !i.completed));
    if (familyId) {
      await deleteItemsBatch(familyId, 'shopping', idsToDelete);
    }
  };

  const handleTelegramSend = async () => {
    if (isSendingTelegram) return;
    setIsSendingTelegram(true);
    try {
      const success = await onSendToTelegram(activeItems);
      if (success) {
        setTelegramNotification('Список успешно отправлен в Telegram!');
      } else {
        setTelegramNotification('Не удалось отправить список в Telegram');
      }
    } catch (e) {
      setTelegramNotification('Ошибка отправки в Telegram');
    } finally {
      setIsSendingTelegram(false);
      setTimeout(() => setTelegramNotification(null), 3000);
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickAddText.trim();
    if (!raw || isSubmittingQuick) return;

    try {
      setIsSubmittingQuick(true);
      const parsedItems = createShoppingItemsFromQuickText(raw, user?.uid || 'user');
      if (parsedItems.length === 0) return;

      parsedItems.forEach(pi => {
        recordPurchaseEvent(pi.title, 'added', {
          category: pi.category,
          amount: pi.amount,
          unit: pi.unit
        });
      });

      if (familyId) {
        if (parsedItems.length === 1) {
          const saved = await addItem(familyId, 'shopping', parsedItems[0]);
          setItems(prev => [...prev, saved]);
        } else {
          const batch = await addItemsBatch(familyId, 'shopping', parsedItems);
          setItems(prev => [...prev, ...batch]);
        }
      } else {
        const local = parsedItems.map(it => ({
          ...it,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 6)
        }));
        setItems(prev => [...prev, ...local]);
      }
      setQuickAddText('');
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleAddFrequentPreset = async (stat: FrequentItemStat | string) => {
    const title = typeof stat === 'string' ? stat : stat.title;
    const amount = typeof stat === 'string' ? '1' : (stat.amount || '1');
    const unit = typeof stat === 'string' ? 'шт' : (stat.unit || 'шт');
    const category = typeof stat === 'string' ? detectProductCategory(title) : (stat.category || 'other');

    const newItem: ShoppingItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      title,
      amount,
      unit,
      category,
      priority: 'medium',
      completed: false,
      memberId: user?.uid || 'user'
    };

    recordPurchaseEvent(newItem.title, 'added', {
      category: newItem.category,
      amount: newItem.amount,
      unit: newItem.unit
    });

    setItems(prev => [...prev, newItem]);
    if (familyId) await addItem(familyId, 'shopping', newItem);
  };

  // Voice Input with Gemini or fallback
  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Голосовой ввод не поддерживается вашим браузером');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const r = new SR();
    recognitionRef.current = r;
    r.lang = 'ru-RU';
    r.interimResults = false;

    r.onstart = () => setIsListening(true);
    r.onend = () => { if (!isProcessingAI) setIsListening(false); };

    r.onresult = async (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript;
      if (text) {
        setIsListening(false);
        setIsProcessingAI(true);
        try {
          if (apiKey) {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Распознай список покупок на русском языке: "${text}". Верни JSON массив объектов [{"title":"Молоко","amount":"1","unit":"л","category":"dairy"}]. Категории: dairy, bakery, produce, meat, grocery, drinks, sweets, frozen, household, beauty, pets, pharmacy, other.`;
            const resp = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
            });
            const parsed = JSON.parse(resp.text || '[]');
            if (Array.isArray(parsed) && parsed.length > 0) {
              const newItems: ShoppingItem[] = parsed.map((p: any) => ({
                id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
                title: p.title,
                amount: String(p.amount || '1'),
                unit: p.unit || 'шт',
                category: p.category || 'other',
                completed: false,
                memberId: user?.uid || 'user',
                priority: 'medium'
              }));
              setItems(prev => [...prev, ...newItems]);
              if (familyId) await addItemsBatch(familyId, 'shopping', newItems);
              return;
            }
          }

          // Fallback regex parser
          const parsed = parseVoiceShoppingText(text);
          if (parsed.length > 0) {
            const newItems: ShoppingItem[] = parsed.map(p => ({
              id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
              title: p.title,
              amount: String(p.amount || '1'),
              unit: p.unit || 'шт',
              category: p.category || 'other',
              completed: false,
              memberId: user?.uid || 'user',
              priority: 'medium'
            }));
            setItems(prev => [...prev, ...newItems]);
            if (familyId) await addItemsBatch(familyId, 'shopping', newItems);
          }
        } catch {
          alert('Ошибка при обработке голоса');
        } finally {
          setIsProcessingAI(false);
        }
      }
    };

    r.start();
  };

  const defaultSuggestions = ['Молоко 3.2%', 'Хлеб', 'Яйца С0', 'Сыр твёрдый', 'Вода 5 л', 'Бананы'];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#FAF6F0] dark:bg-[#121214] overflow-y-auto no-scrollbar pb-16 text-[#1E2420] dark:text-gray-100 font-body transition-colors">
      {/* 1. Unified Header */}
      <TerraMobileHeader
        title="Список покупок"
        onAdd={handleOpenAdd}
        addTitle="Добавить товар"
        onOpenSettings={onOpenSettings}
        rightExtra={
          <button 
            type="button"
            onClick={handleTelegramSend}
            disabled={isSendingTelegram}
            title="Отправить список в Telegram"
            aria-label="Отправить список в Telegram"
            className="w-10 h-10 rounded-full bg-[#EAE6DD] dark:bg-[#252528] hover:bg-[#E0DBD0] dark:hover:bg-white/10 text-[#4A7C59] dark:text-emerald-400 flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer border border-[#EAE5DB]/60 dark:border-white/5"
          >
            {isSendingTelegram ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="translate-x-0.5" />
            )}
          </button>
        }
      />
      
      {/* Hidden file input for scanner */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
      />

      {/* Telegram Toast Alert */}
      <AnimatePresence>
        {telegramNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 inset-x-4 z-[3000] max-w-sm mx-auto bg-[#1E2420] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-white/10 text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <Send size={15} className="text-[#4A7C59] dark:text-emerald-400 shrink-0" />
              <span>{telegramNotification}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setTelegramNotification(null)}
              className="text-stone-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Processing Overlay */}
      <AnimatePresence>
        {(isListening || isProcessingAI) && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <div className="bg-[#FAF6F0] dark:bg-[#1C1C1E] p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs border border-[#E4E0D8]/60 dark:border-white/10">
              {isListening ? (
                <div className="relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A7C59] opacity-40" />
                  <div className="w-16 h-16 rounded-full bg-[#4A7C59] text-white flex items-center justify-center relative z-10 shadow-lg">
                    <Mic size={32} />
                  </div>
                </div>
              ) : (
                <BrainCircuit size={48} className="text-[#4A7C59] animate-pulse" />
              )}
              <h3 className="font-headline font-bold text-lg text-[#2E3230] dark:text-white">
                {isListening ? 'Говорите продукты...' : 'Обрабатываем список...'}
              </h3>
              <p className="text-xs text-[#6B6358] dark:text-stone-400">
                Например: «Два молока, буханка хлеба и десяток яиц»
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-3 space-y-3.5">
        
        {/* Status Counters Strip */}
        <div className="flex items-center justify-between bg-white dark:bg-[#1E1E20] px-4 py-2.5 rounded-2xl border border-[#EAE5DB]/60 dark:border-white/5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#4A7C59] dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-[#4A7C59] dark:bg-emerald-400 animate-pulse" />
            <span>{allActiveCount} в списке</span>
          </div>
          <div className="text-xs font-semibold text-[#68736A] dark:text-stone-400">
            <span>{allCompletedCount} куплено</span>
          </div>
        </div>

        {/* 2. Search Bar with Mic Icon */}
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-[#A39E93] dark:text-stone-500 pointer-events-none">
            <Search size={17} />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск в покупках..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] text-sm text-[#1E2420] dark:text-white placeholder:text-[#A39E93] dark:placeholder-stone-500 border border-[#EAE4D6] dark:border-white/10 shadow-xs focus:outline-none focus:border-[#4A7C59] transition"
          />
          {searchQuery ? (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-[#A39E93] hover:text-[#1E2420] dark:hover:text-white p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          ) : (
            <button 
              type="button"
              onClick={startListening}
              className="absolute right-3 text-[#4A7C59] dark:text-emerald-400 hover:opacity-80 p-1 cursor-pointer"
            >
              <Mic size={17} />
            </button>
          )}
        </div>

        {/* 3. Smart AI Quick Add Box */}
        <div className="bg-[#FAF6F0] dark:bg-[#1C1C1E] border border-[#EAE4D6] dark:border-white/10 rounded-2xl p-2 pl-3.5 shadow-xs flex flex-col gap-1.5">
          <form onSubmit={handleQuickAddSubmit} className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#4A7C59] dark:text-emerald-400 shrink-0" />
            <input 
              type="text"
              value={quickAddText}
              onChange={e => setQuickAddText(e.target.value)}
              placeholder="Например: молоко 1.5 л, бананы 1 кг..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-[#1E2420] dark:text-white placeholder:text-[#A39E93] dark:placeholder-stone-500 focus:outline-none min-w-0"
            />
            <button 
              type="submit"
              disabled={!quickAddText.trim() || isSubmittingQuick}
              className="w-9 h-9 rounded-full bg-[#4A7C59] hover:bg-[#3F6B4D] active:scale-95 text-white flex items-center justify-center shadow-xs shrink-0 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          </form>

          {liveParsedItems.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-[#4A7C59] dark:text-emerald-400 font-semibold border-t border-[#EAE4D6]/60 dark:border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] animate-pulse" />
              {liveParsedItems.map((p, idx) => (
                <span key={idx} className="bg-[#D8F0DE] dark:bg-[#1C3B24] text-[#2A6038] dark:text-[#8ECF9E] px-2 py-0.5 rounded-md text-[10px]">
                  {p.title} ({p.amount} {p.unit})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Categorized Product Lists */}
        {activeItems.length === 0 && (
          <div className="py-8 text-center bg-white/60 dark:bg-white/5 rounded-2xl border border-dashed border-[#EAE4D6] dark:border-white/10 space-y-1.5">
            <ShoppingBag size={32} className="text-[#A39E93] dark:text-stone-500 mx-auto" />
            <p className="text-xs font-bold text-[#1E2420] dark:text-white">Все покупки сделаны!</p>
            <p className="text-[11px] text-[#68736A] dark:text-stone-400">
              Добавьте новые товары в строке выше или из частых покупок
            </p>
          </div>
        )}

        <div className="space-y-4">
          {AISLES.map(aisle => {
            const aisleItems = groupedActiveItems[aisle.id] || [];
            if (aisleItems.length === 0) return null;

            return (
              <section key={aisle.id} className="space-y-2">
                {/* Category Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">{aisle.emoji}</span>
                    <h2 className="font-bold text-xs sm:text-sm text-[#1E2420] dark:text-white truncate">
                      {aisle.label}
                    </h2>
                  </div>
                  <span className="bg-[#F0ECE4] dark:bg-white/10 text-[#68736A] dark:text-stone-300 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0">
                    {aisleItems.length} поз.
                  </span>
                </div>

                {/* Items in Category */}
                <div className="space-y-2">
                  {aisleItems.map(item => {
                    const isUrgent = item.priority === 'high';

                    return (
                      <SwipeableShoppingItem
                        key={item.id}
                        item={item}
                        isUrgent={isUrgent}
                        onToggle={handleToggle}
                        onOpenEdit={handleOpenEdit}
                        onAdjustAmount={handleAdjustAmount}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* 5. Already Bought Section ("Уже куплено в этот раз") */}
        {completedItems.length > 0 && (
          <section className="bg-white dark:bg-[#1C1C1E] border border-[#EAE4D6] dark:border-white/10 rounded-2xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div 
                onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                className="flex items-center gap-1.5 cursor-pointer select-none"
              >
                <div className="w-5 h-5 rounded-full bg-[#E8F5E9] dark:bg-[#1C3B24] text-[#2E7D32] dark:text-[#8ECF9E] flex items-center justify-center text-xs">
                  <Check size={12} strokeWidth={3} />
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-[#1E2420] dark:text-white">
                  Уже куплено в этот раз
                </h3>
                <span className="bg-[#E8F5E9] dark:bg-[#1C3B24] text-[#2E7D32] dark:text-[#8ECF9E] text-[11px] font-bold px-2 py-0.2 rounded-full">
                  {completedItems.length}
                </span>
              </div>

              <button 
                type="button"
                onClick={handleClearCompleted}
                className="text-xs font-semibold text-[#C62828] hover:underline cursor-pointer"
              >
                Очистить купленные
              </button>
            </div>

            {isCompletedOpen && (
              <div className="space-y-2 pt-1 border-t border-[#EAE4D6]/60 dark:border-white/10">
                {completedItems.map(item => (
                  <SwipeableCompletedItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onMoveToPantry={onMoveToPantry}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 6. Frequent Purchases Section ("Частые покупки") */}
        <section className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-[#68736A] dark:text-stone-400 fill-stone-300 dark:fill-stone-600" />
              <h3 className="font-bold text-xs sm:text-sm text-[#1E2420] dark:text-white">
                Частые покупки
              </h3>
            </div>
            <span className="text-[11px] text-[#68736A] dark:text-stone-400 font-medium">
              Быстро добавить
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
            {(frequentStaples.length > 0 ? frequentStaples : defaultSuggestions).map((item, idx) => {
              const label = typeof item === 'string' ? item : item.title;
              return (
                <button 
                  key={idx}
                  type="button"
                  onClick={() => handleAddFrequentPreset(item as any)}
                  className="bg-white dark:bg-[#1C1C1E] border border-[#EAE4D6] dark:border-white/10 hover:bg-[#F5F1EA] active:scale-95 transition rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#1E2420] dark:text-white shadow-2xs shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <span>{label}</span>
                  <span className="text-[#4A7C59] dark:text-emerald-400 font-bold">+</span>
                </button>
              );
            })}
          </div>
        </section>

      </div>

      {/* Add / Edit Item Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[2500] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-body">
            <div className="fixed inset-0 -z-10" onClick={() => setIsAddModalOpen(false)} />
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-md bg-[#FBF9F5] dark:bg-[#1C1C1E] rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl border border-[#EAE4D6] dark:border-white/10 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-[#EAE4D6]/60 dark:border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#1E2420] dark:text-white">
                    {editingItem ? 'Редактировать товар' : 'Новый товар в список'}
                  </h3>
                  {!editingItem && (
                    <p className="text-[11px] text-[#68736A] dark:text-stone-400">
                      После добавления поле сразу готово к следующему товару
                    </p>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#EEE9DF] dark:bg-white/10 flex items-center justify-center text-[#1E2420] dark:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Just Added Success Banner */}
              {justAddedTitle && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#D8F0DE] dark:bg-[#1C3B24] border border-[#A7D7B5] dark:border-[#2A6038] rounded-xl p-2.5 flex items-center gap-2 text-xs font-bold text-[#2A6038] dark:text-[#8ECF9E]"
                >
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>«{justAddedTitle}» добавлен в список! Введите следующий:</span>
                </motion.div>
              )}

              <form onSubmit={(e) => handleSaveModalItem(e, false)} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#68736A] dark:text-stone-400 mb-1">
                    Название товара
                  </label>
                  <input 
                    ref={modalTitleInputRef}
                    type="text"
                    required
                    value={newItemTitle}
                    onChange={e => setNewItemTitle(e.target.value)}
                    placeholder="Например: Сыр Российский"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#252528] text-sm text-[#1E2420] dark:text-white border border-[#EAE4D6] dark:border-white/10 focus:outline-none focus:border-[#4A7C59]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#68736A] dark:text-stone-400 mb-1">
                      Количество
                    </label>
                    <input 
                      type="text"
                      value={newItemAmount}
                      onChange={e => setNewItemAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#252528] text-sm text-[#1E2420] dark:text-white border border-[#EAE4D6] dark:border-white/10 focus:outline-none focus:border-[#4A7C59]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#68736A] dark:text-stone-400 mb-1">
                      Единица
                    </label>
                    <select 
                      value={newItemUnit}
                      onChange={e => setNewItemUnit(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#252528] text-sm text-[#1E2420] dark:text-white border border-[#EAE4D6] dark:border-white/10 focus:outline-none focus:border-[#4A7C59]"
                    >
                      {UNITS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#68736A] dark:text-stone-400 mb-1">
                    Отдел / Категория
                  </label>
                  <select 
                    value={selectedAisle}
                    onChange={e => setSelectedAisle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#252528] text-sm text-[#1E2420] dark:text-white border border-[#EAE4D6] dark:border-white/10 focus:outline-none focus:border-[#4A7C59]"
                  >
                    {AISLES.map(a => (
                      <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#252528] border border-[#EAE4D6] dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className={newItemPriority === 'high' ? 'text-amber-500 fill-amber-500' : 'text-stone-400'} />
                    <span className="text-xs font-bold text-[#1E2420] dark:text-white">Срочная покупка</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={newItemPriority === 'high'}
                    onChange={e => setNewItemPriority(e.target.checked ? 'high' : 'medium')}
                    className="w-5 h-5 rounded text-[#4A7C59] focus:ring-[#4A7C59]"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  {editingItem ? (
                    <>
                      <button 
                        type="button"
                        onClick={() => handleDelete(editingItem.id)}
                        className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 transition cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-[#4A7C59] hover:bg-[#3F6B4D] active:scale-[0.99] text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md transition cursor-pointer"
                      >
                        Сохранить изменения
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        type="button"
                        onClick={() => setIsAddModalOpen(false)}
                        className="px-4 py-3 rounded-xl bg-[#EAE4D6] dark:bg-white/10 text-[#1E2420] dark:text-white font-bold text-sm hover:bg-[#DED7C7] transition cursor-pointer"
                      >
                        Готово
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-[#4A7C59] hover:bg-[#3F6B4D] active:scale-[0.99] text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>Добавить ещё</span>
                      </button>
                    </>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

interface SwipeableShoppingItemProps {
  item: ShoppingItem;
  isUrgent: boolean;
  onToggle: (item: ShoppingItem) => void;
  onOpenEdit: (item: ShoppingItem) => void;
  onAdjustAmount: (item: ShoppingItem, delta: number) => void;
}

const SwipeableShoppingItem: React.FC<SwipeableShoppingItemProps> = ({
  item,
  isUrgent,
  onToggle,
  onOpenEdit,
  onAdjustAmount
}) => {
  const [dragOffset, setDragOffset] = useState(0);

  return (
    <div className="relative overflow-hidden rounded-2xl select-none touch-pan-y">
      {/* Background layer revealed on drag */}
      <div 
        className={`absolute inset-0 rounded-2xl flex items-center justify-between px-4 transition-colors duration-150 ${
          Math.abs(dragOffset) > 20 
            ? 'bg-[#4A7C59] text-white opacity-100' 
            : 'bg-[#4A7C59]/30 text-white opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-xs">
          <CheckCircle2 size={18} />
          <span>В купленное</span>
        </div>
        <div className="flex items-center gap-2 font-bold text-xs">
          <span>В купленное</span>
          <CheckCircle2 size={18} />
        </div>
      </div>

      {/* Draggable Card */}
      <motion.article 
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        dragSnapToOrigin
        onDrag={(_, info) => setDragOffset(info.offset.x)}
        onDragEnd={(_, info) => {
          setDragOffset(0);
          if (Math.abs(info.offset.x) > 65) {
            onToggle(item);
          }
        }}
        onClick={() => {
          if (Math.abs(dragOffset) < 5) {
            onOpenEdit(item);
          }
        }}
        className="relative z-10 bg-white dark:bg-[#1C1C1E] border border-[#EAE4D6] dark:border-white/10 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
      >
        {/* Checkbox + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item);
            }}
            aria-label="Отметить как купленное"
            className="w-6 h-6 rounded-lg border-2 border-[#D6CFC1] dark:border-stone-600 bg-white dark:bg-transparent hover:border-[#4A7C59] active:scale-90 flex items-center justify-center shrink-0 transition-all cursor-pointer"
          >
            <Check size={14} className="text-transparent" />
          </button>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[#1E2420] dark:text-white truncate leading-snug">
              {item.title}
            </h3>
            
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {isUrgent && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-md bg-[#FEF3C7] dark:bg-[#3B301A] text-[#B45309] dark:text-[#FCD34D] text-[10px] font-bold">
                  <Zap size={10} className="fill-current" />
                  <span>Срочно</span>
                </span>
              )}
              {item.note && (
                <span className="text-[11px] text-[#68736A] dark:text-stone-400 truncate max-w-[140px]">
                  {item.note}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quantity Stepper Pill */}
        <div 
          className="flex items-center bg-[#F5F1EA] dark:bg-white/5 border border-[#EAE4D6]/70 dark:border-white/10 rounded-xl p-1 shrink-0" 
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdjustAmount(item, -1);
            }}
            className="w-6 h-6 rounded-lg bg-white dark:bg-[#2C2C2E] text-[#1E2420] dark:text-white text-xs font-black flex items-center justify-center shadow-2xs hover:bg-[#EAE4D6] active:scale-90 transition cursor-pointer"
          >
            -
          </button>
          <span className="text-xs font-bold text-[#1E2420] dark:text-white px-2 min-w-[34px] text-center tabular-nums">
            {item.amount || '1'} {item.unit || 'шт'}
          </span>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdjustAmount(item, 1);
            }}
            className="w-6 h-6 rounded-lg bg-white dark:bg-[#2C2C2E] text-[#1E2420] dark:text-white text-xs font-black flex items-center justify-center shadow-2xs hover:bg-[#EAE4D6] active:scale-90 transition cursor-pointer"
          >
            +
          </button>
        </div>
      </motion.article>
    </div>
  );
};

interface SwipeableCompletedItemProps {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
  onMoveToPantry: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
}

const SwipeableCompletedItem: React.FC<SwipeableCompletedItemProps> = ({
  item,
  onToggle,
  onMoveToPantry,
  onDelete
}) => {
  const [dragOffset, setDragOffset] = useState(0);

  return (
    <div className="relative overflow-hidden rounded-xl select-none touch-pan-y">
      <div 
        className={`absolute inset-0 rounded-xl flex items-center justify-between px-3 transition-colors duration-150 ${
          Math.abs(dragOffset) > 20 
            ? 'bg-[#2D5A46] text-white opacity-100' 
            : 'bg-[#2D5A46]/30 text-white opacity-0'
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold text-[11px]">
          <RotateCcw size={14} />
          <span>Вернуть в список</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-[11px]">
          <span>Вернуть в список</span>
          <RotateCcw size={14} />
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        dragSnapToOrigin
        onDrag={(_, info) => setDragOffset(info.offset.x)}
        onDragEnd={(_, info) => {
          setDragOffset(0);
          if (Math.abs(info.offset.x) > 60) {
            onToggle(item);
          }
        }}
        className="relative z-10 bg-white dark:bg-[#1C1C1E] flex items-center justify-between gap-2 py-1 px-1 rounded-xl"
      >
        <div 
          onClick={() => {
            if (Math.abs(dragOffset) < 5) {
              onToggle(item);
            }
          }}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer py-1 px-1"
        >
          <div className="w-5 h-5 rounded-full bg-[#4A7C59] text-white flex items-center justify-center shrink-0">
            <Check size={12} strokeWidth={3} />
          </div>
          <span className="text-xs font-medium line-through text-[#68736A] dark:text-stone-400 truncate">
            {item.title} {item.amount && item.amount !== '1' ? `${item.amount} ${item.unit || 'шт'}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button 
            type="button"
            onClick={() => onMoveToPantry(item)}
            className="p-1 text-[#68736A] hover:text-[#4A7C59] transition cursor-pointer"
            title="В кладовку"
          >
            <ArrowRight size={14} />
          </button>
          <button 
            type="button"
            onClick={() => onDelete(item.id)}
            className="p-1 text-[#68736A] hover:text-[#C62828] transition cursor-pointer"
            title="Удалить"
          >
            <X size={15} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ShoppingListMobile;
