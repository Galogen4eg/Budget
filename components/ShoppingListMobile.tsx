import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Check, X, ScanLine, ShoppingBag, 
  Loader2, Edit2, ChevronLeft, Mic, BrainCircuit, 
  ArrowRight, Send, Sparkles, ChevronDown, ChevronUp,
  Star, Zap, QrCode, User, PlusCircle, RotateCcw
} from 'lucide-react';
import { ShoppingItem, AppSettings, FamilyMember } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem, addItemsBatch, deleteItemsBatch } from '../utils/db';
import { searchOnlineDatabase } from '../utils/barcodeLookup';
import { detectProductCategory } from '../utils/categorizer';
import { GoogleGenAI } from "@google/genai";
import { parseVoiceShoppingText } from '../utils/voiceShoppingParser';
import { 
  parseQuickShoppingInput, 
  createShoppingItemsFromQuickText, 
  parseSingleQuickShoppingText 
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
}

export const AISLES = [
  { id: 'dairy', label: 'Молочные продукты и сыры', icon: '🥛', bg: 'bg-[#c8e8d0] text-[#2a6038]' },
  { id: 'bakery', label: 'Хлеб и свежая выпечка', icon: '🍞', bg: 'bg-[#f0e8db] text-[#5e5548]' },
  { id: 'produce', label: 'Овощи и фрукты', icon: '🥦', bg: 'bg-[#d8f0de] text-[#2a6038]' },
  { id: 'meat', label: 'Мясо и птица', icon: '🥩', bg: 'bg-[#ffdad8] text-[#690005]' },
  { id: 'grocery', label: 'Бакалея и крупы', icon: '🍝', bg: 'bg-[#f0e8db] text-[#554020]' },
  { id: 'drinks', label: 'Напитки и вода', icon: '🧃', bg: 'bg-[#e4e0d8] text-[#4a4e4a]' },
  { id: 'sweets', label: 'Сладости и десерты', icon: '🍫', bg: 'bg-[#f8e0a8] text-[#554020]' },
  { id: 'frozen', label: 'Замороженные продукты', icon: '🧊', bg: 'bg-[#c8e8d0] text-[#2a6038]' },
  { id: 'household', label: 'Товары для дома', icon: '🧼', bg: 'bg-[#e4e0d8] text-[#4a4e4a]' },
  { id: 'beauty', label: 'Уход и косметика', icon: '💄', bg: 'bg-[#ffdad8] text-[#690005]' },
  { id: 'pets', label: 'Товары для питомцев', icon: '🐱', bg: 'bg-[#f0e8db] text-[#5e5548]' },
  { id: 'pharmacy', label: 'Аптека и здоровье', icon: '💊', bg: 'bg-[#c8e8d0] text-[#2a6038]' },
  { id: 'electronics', label: 'Электроника', icon: '🔌', bg: 'bg-[#e4e0d8] text-[#4a4e4a]' },
  { id: 'clothes', label: 'Одежда и текстиль', icon: '👕', bg: 'bg-[#f0e8db] text-[#5e5548]' },
  { id: 'other', label: 'Разное', icon: '📦', bg: 'bg-[#e4e0d8] text-[#4a4e4a]' },
];

const UNITS = ['шт', 'кг', 'л', 'уп', 'г'] as const;

export const ShoppingListMobile: React.FC<ShoppingListMobileProps> = ({
  items,
  setItems,
  settings,
  members,
  onMoveToPantry,
  onSendToTelegram
}) => {
  const { familyId, user } = useAuth();

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState<typeof UNITS[number]>('шт');
  const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedAisle, setSelectedAisle] = useState('dairy');
  const [newItemMemberId, setNewItemMemberId] = useState<string>('');
  const [isModalListening, setIsModalListening] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Quick Add State
  const [quickAddText, setQuickAddText] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Scan & Voice State
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Collapsible Completed section
  const [isCompletedOpen, setIsCompletedOpen] = useState(true);

  // Frequent items state
  const [frequentStaples, setFrequentStaples] = useState<(FrequentItemStat & { totalScore: number; frequencyLabel: string })[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const apiKey = settings.geminiApiKey || process.env.API_KEY;

  // Refresh frequent staples
  useEffect(() => {
    try {
      const top = getTopFrequentPurchases(6);
      setFrequentStaples(top);
    } catch {
      // Fallback
    }
  }, [items]);

  // Live parsed quick add pills preview
  const liveParsedItems = useMemo(() => {
    if (!quickAddText.trim()) return [];
    return parseQuickShoppingInput(quickAddText);
  }, [quickAddText]);

  // Active & Completed count
  const activeItems = useMemo(() => items.filter(i => !i.completed), [items]);
  const completedItems = useMemo(() => items.filter(i => i.completed), [items]);
  const activeCount = activeItems.length;
  const completedCount = completedItems.length;

  // Grouped active items by category
  const groupedActiveItems = useMemo(() => {
    const map: Record<string, ShoppingItem[]> = {};
    AISLES.forEach(a => { map[a.id] = []; });

    activeItems.forEach(item => {
      const cat = item.category || 'other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });

    return map;
  }, [activeItems]);

  // Family member names label for sync row
  const syncLabel = useMemo(() => {
    if (members && members.length > 0) {
      const names = members.map(m => m.name.split(' ')[0]);
      if (names.length === 1) return names[0];
      if (names.length === 2) return `${names[0]} и ${names[1]}`;
      return `${names[0]}, ${names[1]} и др.`;
    }
    return 'Папа и Мама';
  }, [members]);

  // Auto-detection for title in Add Modal
  useEffect(() => {
    if (newItemTitle.trim() && !editingItem) {
      const parsed = parseSingleQuickShoppingText(newItemTitle);
      if (parsed) {
        if (parsed.amount && parsed.amount !== '1') setNewItemAmount(parsed.amount);
        if (parsed.unit) setNewItemUnit(parsed.unit as any);
        if (parsed.category && parsed.category !== 'other') setSelectedAisle(parsed.category);
      } else {
        const detected = detectProductCategory(newItemTitle);
        if (detected !== 'other') setSelectedAisle(detected);
      }
    }
  }, [newItemTitle, editingItem]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingItem(null);
    setNewItemTitle('');
    setNewItemAmount('1');
    setNewItemUnit('шт');
    setNewItemPriority('medium');
    setSelectedAisle('dairy');
    setNewItemMemberId('');
    setIsAddModalOpen(true);
    setTimeout(() => titleInputRef.current?.focus(), 150);
  };

  const handleOpenEdit = (item: ShoppingItem) => {
    setEditingItem(item);
    setNewItemTitle(item.title);
    setNewItemAmount(item.amount || '1');
    setNewItemUnit((item.unit as any) || 'шт');
    setNewItemPriority(item.priority || 'medium');
    setSelectedAisle(item.category || 'other');
    setNewItemMemberId(item.memberId || '');
    setIsAddModalOpen(true);
  };

  const handleStepQuantity = (delta: number) => {
    const current = parseFloat(newItemAmount) || 1;
    const next = Math.max(1, Math.round((current + delta) * 10) / 10);
    setNewItemAmount(String(next));
  };

  const startModalVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.lang = 'ru-RU';
    r.interimResults = false;
    r.onstart = () => setIsModalListening(true);
    r.onend = () => setIsModalListening(false);
    r.onerror = () => setIsModalListening(false);
    r.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript;
      if (text) {
        setNewItemTitle(text);
      }
    };
    try {
      r.start();
    } catch {
      setIsModalListening(false);
    }
  };

  const handleSaveItem = async () => {
    const title = newItemTitle.trim();
    if (!title) return;

    if (editingItem) {
      const updated: ShoppingItem = {
        ...editingItem,
        title,
        amount: newItemAmount,
        unit: newItemUnit,
        category: selectedAisle,
        priority: newItemPriority,
        memberId: newItemMemberId || undefined
      };
      setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
      if (familyId) await updateItem(familyId, 'shopping', editingItem.id, updated);
      setIsAddModalOpen(false);
      setEditingItem(null);
    } else {
      const newItem: ShoppingItem = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        title,
        amount: newItemAmount,
        unit: newItemUnit,
        category: selectedAisle,
        priority: newItemPriority,
        completed: false,
        memberId: newItemMemberId || user?.uid || 'user'
      };

      recordPurchaseEvent(newItem.title, 'added', { 
        category: selectedAisle, 
        amount: newItemAmount, 
        unit: newItemUnit 
      });

      setItems(prev => [...prev, newItem]);
      if (familyId) await addItem(familyId, 'shopping', newItem);

      setNewItemTitle('');
      setNewItemAmount('1');
      setIsAddModalOpen(false);
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

  const handleAddFrequentPreset = async (stat: FrequentItemStat) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      title: stat.title,
      amount: stat.amount || '1',
      unit: stat.unit || 'шт',
      category: stat.category || 'other',
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

  // Barcode / Receipt Scan
  const handleBarcodeScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      if ('BarcodeDetector' in window) {
        const BarcodeDetector = (window as any).BarcodeDetector;
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8'] });
        const bitmap = await createImageBitmap(file);
        const codes = await detector.detect(bitmap);

        if (codes.length > 0) {
          const found = await searchOnlineDatabase(codes[0].rawValue);
          if (found) {
            setNewItemTitle(found.title);
            setNewItemAmount(found.amount || '1');
            setNewItemUnit((found.unit as any) || 'шт');
            setSelectedAisle(found.category || 'other');
            setIsAddModalOpen(true);
          } else {
            setNewItemTitle('Товар ' + codes[0].rawValue);
            setIsAddModalOpen(true);
          }
        } else {
          alert('Штрихкод на фото не обнаружен');
        }
      } else {
        alert('Сканер штрихкодов не поддерживается в данном браузере');
      }
    } catch {
      alert('Ошибка при сканировании фото');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

          // Fallback parser
          const localParsed = parseVoiceShoppingText(text);
          if (localParsed.length > 0) {
            const newItems: ShoppingItem[] = localParsed.map(p => ({
              id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
              title: p.title,
              amount: p.amount,
              unit: p.unit,
              category: p.category,
              completed: false,
              memberId: user?.uid || 'user',
              priority: 'medium'
            }));
            setItems(prev => [...prev, ...newItems]);
            if (familyId) await addItemsBatch(familyId, 'shopping', newItems);
          }
        } catch {
          // Fallback
        } finally {
          setIsProcessingAI(false);
        }
      }
    };

    r.onerror = () => setIsListening(false);
    r.start();
  };

  // Helper for member avatar and name
  const getMemberInfo = (memberId?: string) => {
    const mem = members.find(m => m.id === memberId || m.userId === memberId);
    if (mem) {
      return {
        initial: mem.name.trim()[0]?.toUpperCase() || 'Я',
        name: mem.name.split(' ')[0],
        color: mem.color || '#4A7C59'
      };
    }
    return { initial: 'С', name: 'Семья', color: '#4A7C59' };
  };

  return (
    <div className="flex-1 flex flex-col relative w-full bg-[#FAF6F0] dark:bg-[#121214] font-body text-[#2E3230] dark:text-[#F5F0E8] select-none pb-20">
      
      {/* Hidden file input for barcode scanning */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleBarcodeScan} 
      />

      {/* AI / Voice Processing Overlay */}
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

      <div className="flex flex-col w-full px-4 pt-3 pb-6 space-y-3">
        
        {/* Top Header Card */}
        <div className="flex flex-col gap-2">
          
          {/* Main Title Row + Badge + Add Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-headline font-bold text-[#2E3230] dark:text-white tracking-tight">
                Список покупок
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C8E8D0] dark:bg-[#1C3B24] text-[#2A6038] dark:text-[#8ECF9E] text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] animate-pulse" />
                {activeCount} в списке · {completedCount} куплено
              </span>
            </div>

            <button 
              type="button"
              onClick={handleOpenAdd}
              aria-label="Добавить товар"
              className="w-8 h-8 rounded-lg bg-[#4A7C59] text-white flex items-center justify-center shadow-xs active:scale-95 transition-transform cursor-pointer"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Sync Status Bar */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#F5F1EA] dark:bg-[#1C1C1E] text-[11px] text-[#4A4E4A] dark:text-stone-400 border border-[#E4E0D8]/60 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A7C59] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4A7C59]" />
              </span>
              <span>
                Синхронизировано: <strong className="text-[#2E3230] dark:text-stone-200 font-semibold">{syncLabel}</strong>
              </span>
            </div>
            <span className="text-[11px] text-[#4A7C59] dark:text-emerald-400 font-bold tracking-tight">
              Онлайн
            </span>
          </div>

          {/* Quick Action Ribbon: Скан чека, Голосом, В Telegram, Товар */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-4 px-4 scrollbar-none no-scrollbar">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F1EA] dark:bg-[#1C1C1E] hover:bg-[#F0ECE4] text-[#2E3230] dark:text-stone-200 text-[11px] font-medium active:scale-95 transition-all shadow-2xs border border-[#E4E0D8]/50 dark:border-white/5 cursor-pointer"
            >
              <ScanLine size={15} className="text-[#705C30] dark:text-amber-400" />
              <span>Скан чека</span>
            </button>

            <button 
              type="button"
              onClick={startListening}
              className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium active:scale-95 transition-all shadow-2xs border cursor-pointer ${
                isListening 
                  ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse' 
                  : 'bg-[#F5F1EA] dark:bg-[#1C1C1E] hover:bg-[#F0ECE4] text-[#2E3230] dark:text-stone-200 border-[#E4E0D8]/50 dark:border-white/5'
              }`}
            >
              <Mic size={15} className="text-[#4A7C59] dark:text-emerald-400" />
              <span>Голосом</span>
            </button>

            <button 
              type="button"
              onClick={() => onSendToTelegram(activeItems)}
              disabled={activeCount === 0}
              className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F1EA] dark:bg-[#1C1C1E] hover:bg-[#F0ECE4] text-[#2E3230] dark:text-stone-200 text-[11px] font-medium active:scale-95 transition-all shadow-2xs border border-[#E4E0D8]/50 dark:border-white/5 disabled:opacity-40 cursor-pointer"
            >
              <Send size={15} className="text-[#4A7C59] dark:text-emerald-400" />
              <span>В Telegram</span>
            </button>

            <button 
              type="button"
              onClick={handleOpenAdd}
              className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#4A7C59] text-white text-[11px] font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Товар</span>
            </button>
          </div>

        </div>

        {/* Quick Add Input Bar */}
        <div className="p-2.5 rounded-xl bg-[#F5F1EA] dark:bg-[#1C1C1E] shadow-2xs flex flex-col gap-2 border border-[#E4E0D8]/60 dark:border-white/5">
          <form onSubmit={handleQuickAddSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Sparkles size={16} className="text-[#4A7C59] dark:text-emerald-400 mr-1.5 shrink-0" />
              <input 
                type="text"
                value={quickAddText}
                onChange={e => setQuickAddText(e.target.value)}
                placeholder="Быстрое добавление: молоко 1.5 л, сыр..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#252528] text-[#2E3230] dark:text-white text-xs placeholder:text-[#74796E] dark:placeholder-stone-500 focus:outline-none focus:bg-white transition-all border border-transparent focus:border-[#4A7C59]"
              />
            </div>
            <button 
              type="submit"
              disabled={!quickAddText.trim() || isSubmittingQuick}
              className="h-7 px-2.5 rounded-lg bg-[#4A7C59] hover:bg-[#3D694B] text-white text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs shrink-0 disabled:opacity-40 cursor-pointer"
            >
              <Plus size={16} />
              <span>Добавить</span>
            </button>
          </form>

          {/* Live parsed previews */}
          {liveParsedItems.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap px-1 text-[11px] text-[#4A7C59] dark:text-emerald-400 font-semibold animate-in fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] animate-pulse" />
              {liveParsedItems.map((p, idx) => (
                <span key={idx} className="bg-[#D8F0DE] dark:bg-[#1C3B24] text-[#2A6038] dark:text-[#8ECF9E] px-2 py-0.5 rounded-md text-[10px]">
                  {p.title} ({p.amount} {p.unit})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Empty State */}
        {activeCount === 0 && (
          <div className="py-8 flex flex-col items-center justify-center text-center opacity-60">
            <ShoppingBag size={40} className="text-[#6B6358] dark:text-stone-400 mb-2" />
            <p className="text-xs font-headline font-bold text-[#6B6358] dark:text-stone-400">
              Список покупок пуст
            </p>
            <p className="text-[11px] text-[#74796E] dark:text-stone-500 mt-0.5">
              Используйте быстрое добавление или выберите из частых
            </p>
          </div>
        )}

        {/* Grouped Category Product Lists */}
        {AISLES.map(aisle => {
          const aisleItems = groupedActiveItems[aisle.id] || [];
          if (aisleItems.length === 0) return null;

          return (
            <div key={aisle.id} className="flex flex-col gap-1.5">
              
              {/* Category Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-md ${aisle.bg} flex items-center justify-center text-[12px]`}>
                    <span>{aisle.icon}</span>
                  </div>
                  <h2 className="font-headline font-semibold text-xs text-[#2E3230] dark:text-white">
                    {aisle.label}
                  </h2>
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-[#E4E0D8] dark:bg-[#252528] text-[10px] font-semibold text-[#6B6358] dark:text-stone-400">
                  {aisleItems.length} поз.
                </span>
              </div>

              {/* Items in Category */}
              {aisleItems.map(item => {
                const memberInfo = getMemberInfo(item.memberId);
                const isUrgent = item.priority === 'high';

                return (
                  <div 
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#F5F1EA] dark:bg-[#1C1C1E] shadow-2xs flex items-center justify-between gap-2 border border-[#E4E0D8]/60 dark:border-white/5 active:scale-[0.99] transition-all"
                  >
                    {/* Left: Checkbox + Title + Member Note */}
                    <div 
                      onClick={() => handleOpenEdit(item)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(item);
                        }}
                        aria-label="Отметить как купленное"
                        className="w-5 h-5 rounded-md bg-[#E4E0D8] dark:bg-[#252528] flex items-center justify-center text-transparent hover:text-[#74796E] active:scale-90 transition-colors shrink-0 cursor-pointer"
                      >
                        <Check size={14} className="text-[#4A7C59]" />
                      </button>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[#2E3230] dark:text-white text-xs truncate">
                            {item.title}
                          </span>
                          {isUrgent && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#F8E0A8] dark:bg-[#3B301A] text-[#554020] dark:text-[#F8E0A8] text-[9px] font-bold">
                              <Zap size={10} className="fill-current" />
                              <span>Срочно</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-0.5">
                          <span 
                            style={{ backgroundColor: memberInfo.color }}
                            className="w-3.5 h-3.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center shrink-0"
                          >
                            {memberInfo.initial}
                          </span>
                          <span className="text-[10px] text-[#6B6358] dark:text-stone-400 truncate">
                            {memberInfo.name} {item.note ? `· ${item.note}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quantity Stepper (- 1 л +) */}
                    <div className="flex items-center gap-1 bg-[#F0ECE4] dark:bg-[#252528] px-1.5 py-0.5 rounded-lg shrink-0 border border-[#E4E0D8]/40 dark:border-white/5">
                      <button 
                        type="button"
                        onClick={() => handleAdjustAmount(item, -1)}
                        className="w-5 h-5 rounded bg-white dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white text-xs font-bold flex items-center justify-center hover:bg-[#EAE6DE] active:scale-90 transition-all cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-[11px] font-bold text-[#2E3230] dark:text-white px-1 min-w-[28px] text-center">
                        {item.amount || '1'} {item.unit || 'шт'}
                      </span>
                      <button 
                        type="button"
                        onClick={() => handleAdjustAmount(item, 1)}
                        className="w-5 h-5 rounded bg-white dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white text-xs font-bold flex items-center justify-center hover:bg-[#EAE6DE] active:scale-90 transition-all cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                  </div>
                );
              })}

            </div>
          );
        })}

        {/* Already Purchased Section ("Уже куплено в этот раз") */}
        {completedCount > 0 && (
          <div className="p-2.5 rounded-xl bg-[#F5F1EA] dark:bg-[#1C1C1E] shadow-2xs flex flex-col gap-1.5 border border-[#E4E0D8]/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <button 
                type="button"
                onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                className="flex items-center gap-1 text-left cursor-pointer"
              >
                {isCompletedOpen ? (
                  <ChevronDown size={16} className="text-[#4A7C59]" />
                ) : (
                  <ChevronUp size={16} className="text-[#4A7C59]" />
                )}
                <span className="font-headline font-semibold text-xs text-[#2E3230] dark:text-white">
                  Уже куплено в этот раз
                </span>
                <span className="w-4 h-4 rounded-full bg-[#C8E8D0] dark:bg-[#1C3B24] text-[#002110] dark:text-[#8ECF9E] text-[10px] font-bold flex items-center justify-center">
                  {completedCount}
                </span>
              </button>

              <button 
                type="button"
                onClick={handleClearCompleted}
                className="flex items-center gap-0.5 text-[10px] font-semibold text-[#B83230] hover:text-[#690005] active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Очистить</span>
              </button>
            </div>

            {isCompletedOpen && (
              <div className="space-y-1 mt-1">
                {completedItems.map(item => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/70 dark:bg-[#252528]/70 text-[#6B6358] dark:text-stone-400 border border-[#E4E0D8]/40 dark:border-white/5"
                  >
                    <div 
                      onClick={() => handleToggle(item)}
                      className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="w-4 h-4 rounded bg-[#4A7C59] text-white flex items-center justify-center shrink-0">
                        <Check size={12} />
                      </div>
                      <span className="text-[11px] line-through truncate font-medium text-[#6B6358] dark:text-stone-400">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-[#6B6358] dark:text-stone-400 font-semibold">
                        {item.amount || '1'} {item.unit || 'шт'}
                      </span>
                      <button 
                        type="button"
                        onClick={() => onMoveToPantry(item)}
                        className="p-1 hover:text-[#4A7C59] transition-colors cursor-pointer"
                        title="В кладовку"
                      >
                        <ArrowRight size={13} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1 hover:text-[#B83230] transition-colors cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Frequent Purchases Section ("Частые покупки семьи") */}
        {frequentStaples.length > 0 && (
          <div className="p-2.5 rounded-xl bg-[#F5F1EA] dark:bg-[#1C1C1E] shadow-2xs flex flex-col gap-1.5 border border-[#E4E0D8]/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Star size={16} className="text-[#705C30] dark:text-amber-400 fill-current" />
                <span className="font-headline font-semibold text-xs text-[#2E3230] dark:text-white">
                  Частые покупки семьи
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#4A7C59] dark:text-emerald-400">
                Быстрый +
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {frequentStaples.map((stat, idx) => (
                <button 
                  key={idx}
                  type="button"
                  onClick={() => handleAddFrequentPreset(stat)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-[#252528] hover:bg-[#F0ECE4] active:scale-95 transition-all text-[11px] text-[#2E3230] dark:text-stone-200 shadow-2xs border border-[#E4E0D8]/50 dark:border-white/5 cursor-pointer"
                >
                  <span>{stat.title}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#EAE6DE] dark:bg-white/10 text-[#6B6358] dark:text-stone-400 font-bold">
                    {stat.completedCount + stat.addedCount}
                  </span>
                  <Plus size={12} className="text-[#4A7C59] dark:text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Add / Edit Item Modal (Mobile Sheet) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[1500] flex items-end sm:items-center justify-center p-0 sm:p-4 text-stone-800 antialiased">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsAddModalOpen(false)} 
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" 
            />

            {/* Modal Sheet */}
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-lg bg-[#faf8f5] dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200/70 dark:border-white/10 overflow-hidden flex flex-col transition-all duration-300 transform max-h-[96vh] z-10 text-stone-800 dark:text-stone-100"
            >
              {/* BEGIN: ModalHeader */}
              <header className="pt-4 px-5 sm:px-6 pb-4 border-b border-stone-200/60 dark:border-white/10 relative">
                {/* iOS Drag Handle Indicator */}
                <div aria-hidden="true" className="w-10 h-1 bg-stone-300 dark:bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />
                <div className="flex items-start justify-between gap-3">
                  {/* Title & Icon */}
                  <div className="flex items-start gap-3">
                    {/* Sparkle Sage Icon Badge */}
                    <div className="w-10 h-10 rounded-2xl bg-[#4A7C59] flex items-center justify-center text-white shadow-sm flex-shrink-0 mt-0.5">
                      <svg aria-hidden="true" className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l1.9 5.8a2 2 0 001.3 1.3L21 11l-5.8 1.9a2 2 0 00-1.3 1.3L12 20l-1.9-5.8a2 2 0 00-1.3-1.3L3 11l5.8-1.9a2 2 0 001.3-1.3L12 2z"></path>
                        <path d="M18.5 2.5l.8 2.2a1 1 0 00.5.5l2.2.8-2.2.8a1 1 0 00-.5.5l-.8 2.2-.8-2.2a1 1 0 00-.5-.5L15 6l2.2-.8a1 1 0 00.5-.5l.8-2.2z"></path>
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-stone-900 dark:text-white leading-snug">
                        {editingItem ? 'Редактировать покупку' : 'Добавить в список покупок'}
                      </h1>
                      <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5 font-medium leading-tight">
                        Автоматическое определение отдела и умное суммирование
                      </p>
                    </div>
                  </div>
                  {/* Close Button */}
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    aria-label="Закрыть" 
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-white/10 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4A7C59] cursor-pointer"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </header>
              {/* END: ModalHeader */}

              {/* BEGIN: FormBody */}
              <main className="px-5 sm:px-6 py-5 overflow-y-auto space-y-5">
                {/* Section: Product Name & Voice Dictation */}
                <div className="space-y-1.5" data-purpose="product-name-input">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400" htmlFor="product-name">
                      НАИМЕНОВАНИЕ ТОВАРА
                    </label>
                    {/* Voice Dictation Pill Button */}
                    <button 
                      type="button"
                      onClick={startModalVoiceInput}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition shadow-xs cursor-pointer ${
                        isModalListening 
                          ? 'bg-rose-500 text-white animate-pulse' 
                          : 'text-[#32523b] dark:text-emerald-300 bg-[#f4f7f4] dark:bg-[#4A7C59]/20 hover:bg-[#e5ece5] border border-[#cbdacb]/80 dark:border-[#4A7C59]/40'
                      }`}
                    >
                      <Mic size={14} className={isModalListening ? 'text-white' : 'text-[#4A7C59] dark:text-emerald-400'} />
                      <span>{isModalListening ? 'Слушаю...' : 'Сказать голосом'}</span>
                    </button>
                  </div>
                  {/* Text Input with focus ring */}
                  <div className="relative">
                    <input 
                      ref={titleInputRef}
                      id="product-name"
                      type="text"
                      placeholder="Например: Сыр маасдам, Хлеб, Яблоки..."
                      value={newItemTitle}
                      onChange={e => setNewItemTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveItem()}
                      className="w-full bg-white dark:bg-[#252528] border-2 border-[#4A7C59]/80 focus:border-[#3C6548] focus:ring-4 focus:ring-[#f4f7f4] dark:focus:ring-emerald-950/40 rounded-xl px-3.5 py-3 text-sm text-stone-800 dark:text-white placeholder-stone-400 outline-none transition font-medium shadow-xs"
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute right-2.5 top-2.5 bottom-2.5 w-8 rounded-lg flex items-center justify-center bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-300 hover:text-[#4A7C59] cursor-pointer"
                      title="Скан штрихкода"
                    >
                      {isScanning ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
                    </button>
                  </div>
                </div>

                {/* Controls Row: Quantity Stepper and Units */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start" data-purpose="quantity-and-unit-selection">
                  {/* Counter Stepper: КОЛИЧЕСТВО */}
                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      КОЛИЧЕСТВО
                    </label>
                    <div className="flex items-center justify-between bg-white dark:bg-[#252528] border border-stone-200 dark:border-white/10 rounded-xl p-1 shadow-xs h-[46px]">
                      <button 
                        type="button"
                        onClick={() => handleStepQuantity(-1)}
                        className="w-9 h-9 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10 active:bg-stone-200 rounded-lg text-lg font-bold transition cursor-pointer"
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={newItemAmount}
                        onChange={e => setNewItemAmount(e.target.value)}
                        className="text-base font-bold text-stone-800 dark:text-white text-center flex-1 outline-none bg-transparent"
                      />
                      <button 
                        type="button"
                        onClick={() => handleStepQuantity(1)}
                        className="w-9 h-9 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10 active:bg-stone-200 rounded-lg text-lg font-bold transition cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Segmented Toggle: ЕДИНИЦА ИЗМЕРЕНИЯ */}
                  <div className="sm:col-span-7 space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      ЕДИНИЦА ИЗМЕРЕНИЯ
                    </label>
                    <div className="flex items-center bg-white dark:bg-[#252528] border border-stone-200 dark:border-white/10 rounded-xl p-1 gap-1 h-[46px] shadow-xs">
                      {UNITS.map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setNewItemUnit(u)}
                          className={`flex-1 h-full rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                            newItemUnit === u
                              ? 'bg-[#4A7C59] text-white shadow-xs'
                              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-white/5'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section: Department / Category Selector */}
                <div className="space-y-1.5" data-purpose="department-selector">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      ОТДЕЛ / КАТЕГОРИЯ
                    </label>
                    <span className="text-xs font-semibold text-[#4A7C59] dark:text-emerald-400">
                      {AISLES.find(a => a.id === selectedAisle)?.label || 'Определено'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto no-scrollbar p-1.5 bg-stone-100/60 dark:bg-white/5 rounded-2xl border border-stone-200/60 dark:border-white/10">
                    {AISLES.map(aisle => {
                      const isSelected = selectedAisle === aisle.id;
                      return (
                        <button
                          key={aisle.id}
                          type="button"
                          onClick={() => setSelectedAisle(aisle.id)}
                          className={`px-2.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-[#4A7C59] text-white border-[#4A7C59] shadow-xs font-bold'
                              : 'bg-white dark:bg-[#252528] border-stone-200/60 dark:border-white/10 text-stone-700 dark:text-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <span className="text-base shrink-0">{aisle.icon}</span>
                          <span className="truncate text-[11px] leading-tight text-left">
                            {aisle.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section: Who Buys Section + Urgent Toggle */}
                <div className="space-y-2 pt-1" data-purpose="assignee-and-urgency">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    КТО ПОКУПАЕТ
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-100/60 dark:bg-white/5 p-3 rounded-2xl border border-stone-200/60 dark:border-white/10">
                    
                    {/* Assignee Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNewItemMemberId('')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                          !newItemMemberId
                            ? 'bg-white dark:bg-[#252528] border-2 border-[#4A7C59] text-stone-900 dark:text-white shadow-xs'
                            : 'bg-white/70 dark:bg-white/10 border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        Кто первый в магазине
                      </button>

                      {members.map(m => {
                        const isSelected = newItemMemberId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setNewItemMemberId(m.id)}
                            className={`px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-white dark:bg-[#252528] border-2 border-[#4A7C59] text-stone-900 dark:text-white shadow-xs'
                                : 'bg-white/70 dark:bg-white/10 border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: m.avatarBg || '#4A7C59' }}
                            />
                            <span>{m.name.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Urgent Toggle Switch: Срочно купить */}
                    <div className="flex items-center gap-2.5 self-end sm:self-auto pt-1 sm:pt-0">
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 select-none">
                        Срочно купить
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={newItemPriority === 'high'}
                        onClick={() => setNewItemPriority(newItemPriority === 'high' ? 'medium' : 'high')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          newItemPriority === 'high' ? 'bg-[#4A7C59]' : 'bg-stone-300 dark:bg-stone-600'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            newItemPriority === 'high' ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                  </div>
                </div>
              </main>
              {/* END: FormBody */}

              {/* BEGIN: Footer Actions */}
              <footer className="p-4 sm:p-5 bg-[#faf8f5] dark:bg-[#1C1C1E] border-t border-stone-200/60 dark:border-white/10 flex items-center justify-between gap-3">
                {editingItem ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(editingItem.id);
                      setIsAddModalOpen(false);
                    }}
                    className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                    title="Удалить покупку"
                  >
                    <Trash2 size={18} />
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveItem}
                    disabled={!newItemTitle.trim()}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#4A7C59] hover:bg-[#3C6548] active:bg-[#2A4231] rounded-xl shadow-md transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>{editingItem ? 'Сохранить' : 'Добавить в список'}</span>
                  </button>
                </div>
              </footer>
              {/* END: Footer Actions */}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ShoppingListMobile;
