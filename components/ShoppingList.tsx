
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, CheckCircle2, Circle, 
  Mic, BrainCircuit,
  X, Plus, ScanBarcode, Loader2,
  MicOff, Maximize2, ShoppingBag,
  Archive, Edit2, Check, Send, ChevronDown, ChevronUp, Sparkles, ArrowLeft, CloudDownload, PieChart
} from 'lucide-react';
import { ShoppingItem, AppSettings, FamilyMember, Transaction } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Html5Qrcode } from 'html5-qrcode';
import { lookupBarcodeOffline, searchOnlineDatabase, ProductData } from '../utils/barcodeLookup';
import { auth } from '../firebase'; 

interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: (items: ShoppingItem[]) => void;
  settings: AppSettings;
  members: FamilyMember[];
  onCompletePurchase: (amount: number, category: string, note: string) => void;
  transactions?: Transaction[];
  onMoveToPantry?: (item: ShoppingItem) => void;
  onSendToTelegram?: (items: ShoppingItem[]) => Promise<boolean>;
  initialStoreMode?: boolean;
}

const STORE_AISLES = [
  { id: 'produce', label: 'Овощи и фрукты', color: '#34C759', icon: '🍎' },
  { id: 'dairy', label: 'Молочный отдел', color: '#5856D6', icon: '🥛' },
  { id: 'meat', label: 'Мясо и рыба', color: '#FF3B30', icon: '🥩' },
  { id: 'bakery', label: 'Хлеб и выпечка', color: '#FF9500', icon: '🥐' },
  { id: 'grocery', label: 'Бакалея', color: '#AF52DE', icon: '🍝' },
  { id: 'drinks', label: 'Напитки', color: '#007AFF', icon: '🥤' },
  { id: 'household', label: 'Бытовая химия', color: '#8E8E93', icon: '🧼' },
  { id: 'other', label: 'Прочее', color: '#C7C7CC', icon: '📦' }
];

const UNITS: ('шт' | 'кг' | 'уп' | 'л')[] = ['шт', 'кг', 'уп', 'л'];

const ShoppingList: React.FC<ShoppingListProps> = ({ items, setItems, settings, members, onCompletePurchase, transactions = [], onMoveToPantry, onSendToTelegram, initialStoreMode = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStoreMode, setIsStoreMode] = useState(initialStoreMode);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Modal Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<'шт' | 'кг' | 'уп' | 'л'>('шт');
  const [selectedAisle, setSelectedAisle] = useState('other');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<string>('Сканирование...');
  const [isSending, setIsSending] = useState(false);
  const [isImportingTg, setIsImportingTg] = useState(false);
  const [showCompletedHistory, setShowCompletedHistory] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const recognitionRef = useRef<any>(null);
  const isScanningLocked = useRef(false);

  // Keep a ref to setItems to avoid stale closures in async functions
  const setItemsRef = useRef(setItems);
  useEffect(() => {
    setItemsRef.current = setItems;
  }, [setItems]);

  useEffect(() => {
      if (initialStoreMode) setIsStoreMode(true);
  }, [initialStoreMode]);

  // Price History Logic for Modal
  const lastPrice = useMemo(() => {
    if (!title || title.length < 3) return null;
    const match = transactions.find(t => t.note && t.note.toLowerCase().includes(title.toLowerCase()));
    return match ? match.amount : null;
  }, [title, transactions]);

  // ANALYTICS CALCULATIONS
  const activeItems = useMemo(() => items.filter(i => !i.completed), [items]);
  const completedItems = useMemo(() => items.filter(i => i.completed), [items]);
  const progress = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;

  const analyticsData = useMemo(() => {
      // 1. Total spent on current list (estimated based on previous transactions if possible, otherwise just count)
      let estimatedTotal = 0;
      let itemsBoughtCount = completedItems.length;

      // Try to find price for completed items in transactions history
      completedItems.forEach(item => {
          const match = transactions.find(t => t.note && t.note.toLowerCase().includes(item.title.toLowerCase()));
          if (match) estimatedTotal += match.amount;
      });

      // 2. Total all-time shopping spend from transactions (category-based)
      // Assuming 'food', 'household', 'grocery' are main shopping categories
      const shoppingCategories = ['food', 'grocery', 'household', 'drinks', 'dairy', 'meat', 'bakery', 'produce'];
      const allTimeShoppingSpend = transactions
        .filter(t => t.type === 'expense' && shoppingCategories.includes(t.category))
        .reduce((sum, t) => sum + t.amount, 0);

      return { itemsBoughtCount, estimatedTotal, allTimeShoppingSpend };
  }, [completedItems, transactions]);

  const vibrate = (type: 'light' | 'medium' | 'error' | 'success') => {
    if (!navigator.vibrate) return;
    switch(type) {
      case 'light': navigator.vibrate(10); break;
      case 'medium': navigator.vibrate(25); break;
      case 'success': navigator.vibrate([15, 30, 15]); break;
      case 'error': navigator.vibrate([40, 50, 40]); break;
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotify = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ type, message });
  };

  // Background AI Categorizer
  const categorizeItemWithAI = async (item: ShoppingItem) => {
      if (!process.env.API_KEY) return;

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: `Categorize shopping item "${item.title}". 
              Return JSON ONLY: { "category": string }. 
              Allowed categories: [${STORE_AISLES.map(a => a.id).join(', ')}]. 
              Default to "other".`,
              config: { responseMimeType: "application/json" }
          });
          
          const result = JSON.parse(response.text || '{}');
          if (result.category && result.category !== 'other' && STORE_AISLES.some(a => a.id === result.category)) {
              // Use ref to get the latest setItems handler, ensuring we have the latest state (including the just-added item)
              setItemsRef.current((currentItems: ShoppingItem[]) => 
                  currentItems.map(i => i.id === item.id ? { ...i, category: result.category } : i)
              );
          }
      } catch (e) {
          console.error("Auto-categorization failed", e);
      }
  };

  const handleTelegramImport = async () => {
      if (!settings.telegramBotToken || !settings.telegramChatId) {
          showNotify('error', 'Сначала настройте Telegram в Настройках');
          return;
      }

      setIsImportingTg(true);
      try {
          // 1. Get Updates from Telegram
          // We use localStorage to keep track of the last offset so we don't import old messages
          const lastUpdateId = parseInt(localStorage.getItem('tg_last_update_id') || '0');
          const response = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}&allowed_updates=["message"]`);
          const data = await response.json();

          if (!data.ok || !data.result || data.result.length === 0) {
              showNotify('info', 'Нет новых сообщений в боте');
              setIsImportingTg(false);
              return;
          }

          // 2. Filter messages from the family chat
          const relevantMessages = data.result
              .filter((u: any) => u.message && String(u.message.chat.id) === settings.telegramChatId && u.message.text)
              .map((u: any) => u.message.text)
              .join('\n');

          if (!relevantMessages) {
              // Updates were there, but not from our chat or text
              const maxId = data.result.reduce((max: number, u: any) => Math.max(max, u.update_id), 0);
              localStorage.setItem('tg_last_update_id', maxId.toString());
              showNotify('info', 'Нет сообщений из вашего чата');
              setIsImportingTg(false);
              return;
          }

          // 3. Process with Gemini
          await processVoiceWithGemini(relevantMessages);

          // 4. Update Offset
          const maxId = data.result.reduce((max: number, u: any) => Math.max(max, u.update_id), 0);
          localStorage.setItem('tg_last_update_id', maxId.toString());

      } catch (e) {
          console.error(e);
          showNotify('error', 'Ошибка связи с Telegram');
      } finally {
          setIsImportingTg(false);
      }
  };

  const processVoiceWithGemini = async (text: string) => {
    if (!process.env.API_KEY) {
        showNotify('error', 'API Key не настроен');
        return;
    }
    
    setIsProcessingAI(true);
    vibrate('medium');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Распознай продукты из текста: "${text}". Для каждого товара определи: title, amount, unit, aisle (один из: ${STORE_AISLES.map(a => a.id).join(', ')}). 
        Верни ТОЛЬКО JSON массив объектов. Без markdown, без комментариев.`,
        config: { responseMimeType: "application/json" }
      });

      let rawText = response.text || '[]';
      const parsedData = JSON.parse(rawText.trim()) as any[];
      
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const newItems: ShoppingItem[] = parsedData.map((item: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          title: item.title || 'Товар',
          amount: String(item.amount || '1'),
          unit: item.unit || 'шт',
          completed: false,
          memberId: members[0]?.id || 'papa',
          userId: auth.currentUser?.uid,
          priority: 'medium',
          category: item.aisle || 'other'
        }));
        // Use ref here too for safety
        setItemsRef.current((prev: ShoppingItem[]) => [...newItems, ...prev]);
        showNotify('success', `Добавлено товаров: ${newItems.length}`);
        vibrate('success');
      } else {
        showNotify('warning', 'Не удалось найти товары в тексте');
      }
    } catch (err) {
      console.error("Gemini Parse Error:", err);
      showNotify('error', `Ошибка ИИ: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { showNotify('error', 'Браузер не поддерживает голосовой ввод'); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    
    try {
        const r = new SR();
        recognitionRef.current = r;
        r.lang = 'ru-RU';
        r.interimResults = false;
        r.onstart = () => { setIsListening(true); vibrate('light'); };
        r.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            if (transcript) processVoiceWithGemini(transcript);
        };
        r.onerror = (e: any) => {
            console.error("Speech Error:", e);
            setIsListening(false);
            showNotify('error', `Ошибка: ${e.error}`);
        };
        r.onend = () => { if (!isProcessingAI) setIsListening(false); };
        r.start();
    } catch (err) {
        showNotify('error', 'Не удалось запустить распознавание');
    }
  };

  const startScanner = () => { 
    setScannerStatus('Наведите камеру на штрихкод');
    isScanningLocked.current = false; 
    setIsScannerOpen(true); 
    vibrate('light'); 
  };

  const handleBarcodeDetected = async (decodedText: string) => {
    if (isScanningLocked.current) return;
    isScanningLocked.current = true;
    vibrate('medium');
    if (scannerRef.current) try { await scannerRef.current.stop(); } catch (e) {}

    const addProduct = (prod: ProductData) => {
      const newItem: ShoppingItem = {
        id: Math.random().toString(36).substr(2, 9),
        title: prod.title,
        amount: prod.amount,
        unit: prod.unit,
        completed: false,
        memberId: members[0]?.id || 'papa',
        userId: auth.currentUser?.uid,
        priority: 'medium',
        category: prod.category
      };
      setItemsRef.current((prev: ShoppingItem[]) => [newItem, ...prev]);
      showNotify('success', `Добавлено: ${prod.title}`);
      vibrate('success');
      setIsScannerOpen(false);
    };

    const localProduct = lookupBarcodeOffline(decodedText);
    if (localProduct) { addProduct(localProduct); return; }

    if (!navigator.onLine) {
       openModal(decodedText); showNotify('warning', 'Офлайн: товара нет в базе'); setIsScannerOpen(false); return;
    }

    setScannerStatus('Ищу в мировой базе...');
    const onlineProduct = await searchOnlineDatabase(decodedText);
    if (onlineProduct) { addProduct(onlineProduct); return; }

    setIsScannerOpen(false);
    openModal(decodedText);
    showNotify('warning', 'Товар не найден, введите название');
  };
  
  const openModal = (code?: string) => {
    setTitle(code ? `Товар #${code}` : '');
    setAmount('1');
    setUnit('шт');
    setSelectedAisle('other');
    setEditingItemId(null);
    setIsModalOpen(true);
  };
  
  const openEditModal = (item: ShoppingItem) => {
    setTitle(item.title);
    setAmount(item.amount || '1');
    setUnit(item.unit || 'шт');
    setSelectedAisle(item.category);
    setEditingItemId(item.id);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (isScannerOpen) {
      setTimeout(() => {
        if (!document.getElementById("reader")) return;
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, handleBarcodeDetected, () => {})
        .catch(() => { setIsScannerOpen(false); showNotify('error', 'Ошибка доступа к камере'); });
      }, 100);
    }
    return () => { if (scannerRef.current && scannerRef.current.isScanning) scannerRef.current.stop().catch(console.error); };
  }, [isScannerOpen]);

  const handleSaveItem = () => {
    if (!title.trim()) return;
    
    // Check if we need to auto-categorize
    const shouldCategorize = selectedAisle === 'other';

    if (editingItemId) {
        setItems(prev => prev.map(i => i.id === editingItemId ? {
            ...i, title: title.trim(), amount: amount || '1', unit: unit, category: selectedAisle, userId: auth.currentUser?.uid
        } : i));
        
        if (shouldCategorize) {
            // Trigger background AI update
            categorizeItemWithAI({ id: editingItemId, title: title.trim(), category: 'other' } as ShoppingItem);
        }
    } else {
        const newItem: ShoppingItem = {
          id: Math.random().toString(36).substr(2, 9), 
          title: title.trim(), 
          amount: amount || '1', 
          unit: unit, 
          completed: false, 
          memberId: members[0]?.id || 'papa', 
          userId: auth.currentUser?.uid, 
          priority: 'medium', 
          category: selectedAisle
        };
        setItems(prev => [newItem, ...prev]);
        
        if (shouldCategorize) {
            // Trigger background AI update for new item
            categorizeItemWithAI(newItem);
        }
    }
    setIsModalOpen(false); vibrate('light');
  };

  const handleSendList = async () => {
      if (!onSendToTelegram || activeItems.length === 0) return;
      setIsSending(true);
      await onSendToTelegram(activeItems);
      setIsSending(false);
  };

  // Items grouped by aisle for Store Mode
  const groupedItems = useMemo(() => {
      const groups: Record<string, ShoppingItem[]> = {};
      activeItems.forEach(item => {
          // Normalize category: if it's not in our known list, put it in 'other'
          const cat = STORE_AISLES.some(a => a.id === item.category) ? item.category : 'other';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(item);
      });
      return groups;
  }, [activeItems]);

  const toggleItem = (id: string) => {
      setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
      vibrate('light');
  };

  return (
    <div className="relative space-y-8 pb-36 w-full">
      <AnimatePresence>
        {isScannerOpen && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[800] bg-black flex flex-col items-center justify-center p-4">
                <div id="reader" className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20"></div>
                <button onClick={() => setIsScannerOpen(false)} className="mt-8 p-4 bg-white/20 backdrop-blur-md rounded-full text-white"><X size={32}/></button>
                <p className="mt-4 text-white font-bold text-center">{scannerStatus}</p>
            </motion.div>
        )}

        {(isProcessingAI || isListening || isImportingTg) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[550] bg-white/70 backdrop-blur-xl flex flex-col items-center justify-center p-10">
            <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-blue-50 flex flex-col items-center">
              <div className="relative mb-8">
                  <div className={`absolute inset-0 bg-blue-500/20 blur-2xl rounded-full ${isListening ? 'animate-ping' : 'animate-pulse'}`} />
                  {isListening ? <MicOff size={64} className="text-red-500 relative animate-pulse" /> : 
                   isImportingTg ? <CloudDownload size={64} className="text-blue-500 relative animate-bounce" /> :
                   <BrainCircuit size={64} className="text-blue-500 relative animate-pulse" />}
              </div>
              <h3 className="text-2xl font-black text-[#1C1C1E]">
                  {isListening ? 'Слушаю вас...' : isImportingTg ? 'Читаю Telegram...' : 'Gemini думает...'}
              </h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Store Mode Portal */}
      {createPortal(
        <AnimatePresence>
          {isStoreMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[2500] bg-[#F2F2F7] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-white p-6 pb-4 shadow-sm z-10 shrink-0 rounded-b-[2rem]">
                 <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-black text-[#1C1C1E]">Магазин</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{activeItems.length} товаров осталось</p>
                    </div>
                    <button onClick={() => setIsStoreMode(false)} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-[#1C1C1E] shadow-sm"><X size={24} /></button>
                 </div>
                 {/* Progress Bar */}
                 <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                 </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                 {activeItems.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center opacity-40">
                         <ShoppingBag size={64} className="text-gray-300 mb-4" />
                         <h3 className="font-black text-xl text-gray-300 uppercase">Всё куплено!</h3>
                         <button onClick={() => setIsStoreMode(false)} className="mt-8 bg-blue-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs">Закрыть</button>
                     </div>
                 ) : (
                     STORE_AISLES.map(aisle => {
                        const itemsInAisle = groupedItems[aisle.id] || [];
                        if (itemsInAisle.length === 0) return null;
                        
                        return (
                            <div key={aisle.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
                                <h3 className="font-black text-sm text-[#1C1C1E] uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="text-xl p-1.5 bg-gray-50 rounded-lg">{aisle.icon}</span> {aisle.label}
                                </h3>
                                <div className="space-y-4">
                                    {itemsInAisle.map(item => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => toggleItem(item.id)}
                                            className="flex items-center gap-4 p-2 rounded-xl active:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                                                {/* Empty circle, turns green when checked via main logic logic which removes it from this view */}
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-lg font-bold text-[#1C1C1E] leading-tight block">{item.title}</span>
                                                {(item.amount !== '1' || item.unit !== 'шт') && (
                                                    <span className="text-xs font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg mt-1 inline-block">
                                                        {item.amount} {item.unit}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                     })
                 )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Render Modal via Portal to avoid z-index/stacking issues */}
      {createPortal(
        <AnimatePresence>
            {isModalOpen && (
              <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
                 <motion.div 
                    initial={{opacity:0}} 
                    animate={{opacity:1}} 
                    exit={{opacity:0}} 
                    className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" 
                    onClick={() => setIsModalOpen(false)} 
                 />
                 <motion.div 
                    initial={{ y: '100%' }} 
                    animate={{ y: 0 }} 
                    exit={{ y: '100%' }} 
                    transition={{ type: 'spring', damping: 32, stiffness: 350 }}
                    className="relative bg-[#F2F2F7] w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" 
                    onClick={(e) => e.stopPropagation()}
                 >
                    <div className="bg-white p-6 flex justify-between items-center border-b border-gray-100 shrink-0">
                       <h3 className="font-black text-xl text-[#1C1C1E]">{editingItemId ? 'Редактировать' : 'Добавить'}</h3>
                       <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X size={20}/></button>
                    </div>
                    <div className="p-8 space-y-6 overflow-y-auto no-scrollbar">
                        <div className="space-y-4">
                            <div className="relative">
                               <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Что купить?" className="w-full bg-white p-5 rounded-2xl outline-none font-bold text-lg text-[#1C1C1E] border border-white focus:border-blue-200 transition-all shadow-sm" autoFocus />
                               {lastPrice && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">Было: {lastPrice} {settings.currency}</div>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Кол-во" className="bg-white p-4 rounded-2xl outline-none font-bold text-lg text-[#1C1C1E] shadow-sm border border-white" />
                              <div className="flex bg-gray-200/50 p-1.5 rounded-2xl">
                                {UNITS.map(u => (<button key={u} onClick={() => setUnit(u)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider ${unit === u ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>{u}</button>))}
                              </div>
                            </div>
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
                                   Отдел 
                                   <span className="text-[8px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md flex items-center gap-1"><Sparkles size={8}/> AI авто-подбор</span>
                               </label>
                               <div className="flex flex-wrap gap-2">
                                 {STORE_AISLES.map(aisle => (<button key={aisle.id} onClick={() => setSelectedAisle(aisle.id)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all flex items-center gap-2 ${selectedAisle === aisle.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-white text-gray-400 shadow-sm'}`}><span className="text-sm">{aisle.icon}</span> {aisle.label}</button>))}
                               </div>
                            </div>
                        </div>
                        <button onClick={handleSaveItem} className="w-full bg-blue-500 text-white font-black py-5 rounded-[2rem] uppercase tracking-widest text-xs shadow-xl ios-btn-active flex items-center justify-center gap-2"><Check size={18} strokeWidth={3} />{editingItemId ? 'Сохранить' : 'Добавить в список'}</button>
                    </div>
                 </motion.div>
              </div>
            )}
        </AnimatePresence>,
        document.body
      )}

      {/* Analytics Card */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none opacity-60" />
          <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="font-black text-sm text-[#1C1C1E] uppercase tracking-widest flex items-center gap-2">
                  <PieChart size={16} className="text-blue-500" />
                  Аналитика покупок
              </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-gray-50 rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-gray-400 block mb-1">Куплено сейчас</span>
                  <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#1C1C1E] tabular-nums">{analyticsData.itemsBoughtCount}</span>
                      <span className="text-xs font-bold text-gray-400">шт.</span>
                  </div>
                  {analyticsData.estimatedTotal > 0 && (
                      <span className="text-[10px] font-black text-blue-500 bg-blue-100/50 px-2 py-0.5 rounded-lg mt-1 inline-block">
                          ~{analyticsData.estimatedTotal.toLocaleString()} {settings.currency}
                      </span>
                  )}
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-gray-400 block mb-1">Всего потрачено</span>
                  <div className="flex items-baseline gap-1">
                      <span className="text-lg md:text-xl font-black text-[#1C1C1E] tabular-nums">
                          {settings.privacyMode ? '•••' : analyticsData.allTimeShoppingSpend.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">{settings.currency}</span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-300 block mt-1">на продукты и быт</span>
              </div>
          </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" className="text-gray-200" strokeWidth="4" stroke="currentColor" />
              <motion.circle cx="18" cy="18" r="15.5" fill="none" stroke="#007AFF" strokeWidth="4.2" strokeDasharray="97.39, 97.39" initial={{ strokeDashoffset: 97.39 }} animate={{ strokeDashoffset: 97.39 - (97.39 * progress / 100) }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[12px] font-black text-[#1C1C1E]">{progress}%</span></div>
          </div>
          <div><h2 className="text-2xl font-black tracking-tight text-[#1C1C1E]">Покупки</h2><p className="text-[10px] font-black text-gray-400 uppercase">{activeItems.length} активных</p></div>
        </div>
        <div className="flex gap-2">
           <button onClick={handleTelegramImport} disabled={isImportingTg} className="px-3 py-3.5 bg-blue-50 text-blue-500 rounded-2xl shadow-sm font-black text-[11px] uppercase flex items-center justify-center transition-all active:scale-95 disabled:opacity-50" title="Загрузить из Telegram">
               {isImportingTg ? <Loader2 size={16} className="animate-spin" /> : <CloudDownload size={16} />}
           </button>
           {activeItems.length > 0 && onSendToTelegram && <button onClick={handleSendList} disabled={isSending} className="px-3 py-3.5 bg-blue-50 text-blue-500 rounded-2xl shadow-sm font-black text-[11px] uppercase flex items-center justify-center transition-all active:scale-95 disabled:opacity-50">{isSending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}</button>}
           <button onClick={() => setIsStoreMode(true)} className="px-5 py-3.5 bg-blue-500 rounded-2xl text-white shadow-lg font-black text-[11px] uppercase flex items-center gap-2 active:scale-95 transition-transform">
               <Maximize2 size={16} /> 
               <span className="hidden md:inline">Магазин</span>
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-soft border border-white p-7 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => openModal()}>
            <div className="w-11 h-11 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20"><Plus size={24} strokeWidth={3} /></div>
            <span className="font-black text-lg text-[#1C1C1E]">Добавить товар</span>
          </div>
          <div className="flex gap-2">
            <button onClick={startListening} className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-50 text-blue-500'}`}>{isListening ? <MicOff size={22} /> : <Mic size={22} />}</button>
            <button onClick={startScanner} className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500 shadow-sm ios-btn-active"><ScanBarcode size={22} /></button>
          </div>
      </div>

      <div className="space-y-4">
        {activeItems.map(item => (
          <ShoppingCard key={item.id} item={item} onToggle={() => setItems(prev => prev.map(i => i.id === item.id ? {...i, completed: !i.completed} : i))} onRemove={() => setItems(prev => prev.filter(i => i.id !== item.id))} onEdit={() => openEditModal(item)} />
        ))}
      </div>

      {/* Completed Items Section */}
      {completedItems.length > 0 && (
          <div className="pt-4 border-t border-gray-100/50">
              <button 
                  onClick={() => setShowCompletedHistory(!showCompletedHistory)}
                  className="w-full flex items-center justify-between p-2 mb-4 group"
              >
                  <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Куплено ({completedItems.length})</span>
                  </div>
                  <div className={`p-1.5 rounded-full bg-gray-100 text-gray-400 transition-all ${showCompletedHistory ? 'rotate-180 bg-gray-200 text-gray-600' : ''}`}>
                      <ChevronDown size={16} />
                  </div>
              </button>

              <AnimatePresence>
                  {showCompletedHistory && (
                      <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-2 overflow-hidden"
                      >
                          {completedItems.map(item => (
                              <motion.div 
                                  key={item.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 0.7 }}
                                  className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-transparent hover:bg-white hover:border-gray-100 transition-all"
                              >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                      <button 
                                          onClick={() => setItems(prev => prev.map(i => i.id === item.id ? {...i, completed: false} : i))}
                                          className="flex-shrink-0 text-green-500 hover:text-green-600"
                                      >
                                          <CheckCircle2 size={20} className="fill-current text-white bg-green-500 rounded-full" />
                                      </button>
                                      <div className="min-w-0">
                                          <span className="text-sm font-bold text-gray-500 line-through decoration-gray-300 block truncate">
                                              {item.title}
                                          </span>
                                          <span className="text-[9px] font-black text-gray-300 uppercase">
                                              {item.amount} {item.unit}
                                          </span>
                                      </div>
                                  </div>
                                  <button 
                                      onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                                      className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </motion.div>
                          ))}
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
      )}
    </div>
  );
};

const ShoppingCard = ({ item, onToggle, onRemove, onPantry, onEdit }: any) => (
  <motion.div layout onClick={() => !item.completed && onEdit()} className="bg-white p-5 rounded-[1.8rem] border border-white shadow-soft flex items-center gap-5 transition-all cursor-pointer active:scale-[0.99]">
    <motion.button 
      whileTap={{ scale: 0.8 }}
      onClick={(e) => { e.stopPropagation(); onToggle(); }} 
      className={`p-1 flex-shrink-0 w-8 h-8 flex items-center justify-center ${item.completed ? 'text-green-500' : 'text-gray-200'}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {item.completed ? (
          <motion.div
            key="checked"
            initial={{ scale: 0, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <CheckCircle2 size={26} fill="currentColor" className="text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="unchecked"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Circle size={26} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
    <div className="flex-1 min-w-0">
      <motion.h5 
        className={`font-bold text-[15px] truncate`}
        animate={{ 
            color: item.completed ? "#9CA3AF" : "#1C1C1E",
            textDecorationLine: item.completed ? "line-through" : "none",
            opacity: item.completed ? 0.6 : 1
        }}
        transition={{ duration: 0.2 }}
      >
        {item.title}
      </motion.h5>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5 whitespace-nowrap flex items-center gap-1">
          {item.amount || '1'} {item.unit || 'шт'} • <span className="flex items-center gap-1">{STORE_AISLES.find(a => a.id === item.category)?.icon} {STORE_AISLES.find(a => a.id === item.category)?.label || 'Прочее'}</span>
      </p>
    </div>
    <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="p-2.5 text-gray-200 hover:text-red-500 transition-colors flex-shrink-0"><Trash2 size={20} /></button>
  </motion.div>
);

export default ShoppingList;
