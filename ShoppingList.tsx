
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, CheckCircle2, Circle, 
  Mic, BrainCircuit,
  X, Plus, ScanBarcode, Loader2,
  MicOff, Maximize2, ShoppingBag,
  Star, Archive, Edit2, Check, TrendingUp, Send
} from 'lucide-react';
import { ShoppingItem, AppSettings, FamilyMember, Transaction } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Html5Qrcode } from 'html5-qrcode';
import { lookupBarcodeOffline, searchOnlineDatabase, ProductData } from '../utils/barcodeLookup';
import { auth } from '../firebase'; // Import auth to get current userId

interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: (items: ShoppingItem[]) => void;
  settings: AppSettings;
  members: FamilyMember[];
  onCompletePurchase: (amount: number, category: string, note: string) => void;
  transactions?: Transaction[];
  onMoveToPantry?: (item: ShoppingItem) => void;
  onSendToTelegram?: (items: ShoppingItem[]) => Promise<boolean>;
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

const ShoppingList: React.FC<ShoppingListProps> = ({ items, setItems, settings, members, onCompletePurchase, transactions = [], onMoveToPantry, onSendToTelegram }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStoreMode, setIsStoreMode] = useState(false);
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
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const recognitionRef = useRef<any>(null);
  const isScanningLocked = useRef(false);

  // --- ANALYTICS: Top Purchases for Current Month ---
  const topMonthPurchases = useMemo(() => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const itemCounts: Record<string, number> = {};

      transactions.forEach(t => {
          const tDate = new Date(t.date);
          // Filter only this month and broaden category filter to catch more items
          // Include 'food', 'shopping', 'household', 'other' and check for specific keywords if category is generic
          if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear && t.type === 'expense') {
              if (['food', 'shopping', 'household', 'other'].includes(t.category)) {
                  // Normalize item names (split commas, trim)
                  const parts = (t.note || '').split(',').map(s => s.trim().toLowerCase());
                  parts.forEach(p => {
                      // Filter out short junk and very generic terms unless they are the only thing
                      if (p.length > 2 && !['покупка', 'оплата', 'списание'].includes(p)) { 
                          const capitalName = p.charAt(0).toUpperCase() + p.slice(1);
                          itemCounts[capitalName] = (itemCounts[capitalName] || 0) + 1;
                      }
                  });
              }
          }
      });

      // Convert to array and sort
      return Object.entries(itemCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 6) // Top 6
          .map(([name, count]) => ({ title: name, count }));
  }, [transactions]);

  // Price History Logic for Modal
  const lastPrice = useMemo(() => {
    if (!title || title.length < 3) return null;
    const match = transactions.find(t => t.note && t.note.toLowerCase().includes(title.toLowerCase()));
    return match ? match.amount : null;
  }, [title, transactions]);

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

  const processVoiceWithGemini = async (text: string) => {
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
      
      // Clean Markdown wrappers if present
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Robust Cleaning
      const firstBracket = rawText.indexOf('[');
      const lastBracket = rawText.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1) {
          rawText = rawText.substring(firstBracket, lastBracket + 1);
      } else {
          const firstBrace = rawText.indexOf('{');
          const lastBrace = rawText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
              rawText = `[${rawText.substring(firstBrace, lastBrace + 1)}]`;
          }
      }

      const parsedData = JSON.parse(rawText) as any[];
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
        setItems([...newItems, ...items]);
        showNotify('success', `Добавлено товаров: ${newItems.length}`);
        vibrate('success');
      } else {
        showNotify('warning', 'Не удалось найти товары в тексте');
      }
    } catch (err) {
      console.error("Gemini Parse Error:", err);
      showNotify('error', 'Ошибка распознавания');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { showNotify('error', 'Голосовой ввод не поддерживается'); return; }
    if (isListening) { recognitionRef.current?.stop(); return; }
    const r = new SR();
    recognitionRef.current = r;
    r.lang = 'ru-RU';
    r.onstart = () => { setIsListening(true); vibrate('light'); };
    r.onresult = (e: any) => processVoiceWithGemini(e.results[0][0].transcript);
    r.onend = () => setIsListening(false);
    r.start();
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
      setItems([newItem, ...items]);
      showNotify('success', `Добавлено: ${prod.title}`);
      vibrate('success');
      setIsScannerOpen(false);
    };

    const localProduct = lookupBarcodeOffline(decodedText);
    if (localProduct) { addProduct(localProduct); return; }

    if (!navigator.onLine) {
       openModal(decodedText); showNotify('warning', 'Офлайн: товара нет в локальной базе'); setIsScannerOpen(false); return;
    }

    setScannerStatus('Ищу в мировой базе...');
    await new Promise(r => setTimeout(r, 600)); 
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
    
    if (editingItemId) {
        setItems(items.map(i => i.id === editingItemId ? {
            ...i,
            title: title.trim(),
            amount: amount || '1',
            unit: unit,
            category: selectedAisle,
            userId: auth.currentUser?.uid
        } : i));
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
        setItems([newItem, ...items]);
    }
    
    setTitle(''); setAmount('1'); setUnit('шт'); setEditingItemId(null); setIsModalOpen(false); vibrate('light');
  };

  const handleQuickAdd = (title: string) => {
    const exists = items.find(i => i.title === title && !i.completed);
    if (exists) { showNotify('info', `"${title}" уже в списке`); vibrate('medium'); return; }
    const newItem: ShoppingItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: title,
      amount: '1',
      unit: 'шт',
      completed: false,
      memberId: members[0]?.id || 'papa',
      userId: auth.currentUser?.uid,
      priority: 'medium',
      category: 'other'
    };
    setItems([newItem, ...items]); vibrate('success'); showNotify('success', `Добавлено: ${title}`);
  };

  const handleSendList = async () => {
      if (!onSendToTelegram || activeItems.length === 0) return;
      setIsSending(true);
      await onSendToTelegram(activeItems);
      setIsSending(false);
  };

  const activeItems = useMemo(() => items.filter(i => !i.completed), [items]);
  const completedItems = useMemo(() => items.filter(i => i.completed), [items]);
  const progress = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;

  return (
    <div className="relative space-y-8 pb-36 w-full">
      <AnimatePresence>
        {/* ADD/EDIT ITEM MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-end md:items-center justify-center p-0 md:p-4">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="relative bg-[#F2F2F7] w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
             >
                <div className="bg-white p-6 flex justify-between items-center border-b border-gray-100">
                   <h3 className="font-black text-xl text-[#1C1C1E]">{editingItemId ? 'Редактировать' : 'Добавить'}</h3>
                   <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X size={20}/></button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="relative">
                           <input 
                             type="text" 
                             value={title} 
                             onChange={(e) => setTitle(e.target.value)} 
                             placeholder="Что купить?" 
                             className="w-full bg-white p-5 rounded-2xl outline-none font-bold text-lg text-[#1C1C1E] border border-white focus:border-blue-200 transition-all shadow-sm" 
                             autoFocus
                           />
                           {lastPrice && (
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                               Было: {lastPrice} {settings.currency}
                             </div>
                           )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-2xl flex items-center gap-3 border border-white focus-within:border-blue-200 transition-all shadow-sm">
                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Кол-во" className="bg-transparent outline-none font-bold text-lg text-[#1C1C1E] w-full" />
                          </div>
                          <div className="flex bg-gray-200/50 p-1.5 rounded-2xl border border-transparent">
                            {UNITS.map(u => (<button key={u} onClick={() => setUnit(u)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider ${unit === u ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>{u}</button>))}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Отдел</label>
                           <div className="flex flex-wrap gap-2">
                             {STORE_AISLES.slice(0, 8).map(aisle => (
                               <button 
                                 key={aisle.id} 
                                 onClick={() => setSelectedAisle(aisle.id)} 
                                 className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all flex items-center gap-2 ${selectedAisle === aisle.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-white text-gray-400 shadow-sm'}`}
                               >
                                 <span className="text-sm">{aisle.icon}</span> {aisle.label}
                               </button>
                             ))}
                           </div>
                        </div>
                    </div>
                    
                    <button onClick={handleSaveItem} className="w-full bg-blue-500 text-white font-black py-5 rounded-[2rem] uppercase tracking-widest text-xs shadow-xl ios-btn-active flex items-center justify-center gap-2">
                       <Check size={18} strokeWidth={3} />
                       {editingItemId ? 'Сохранить' : 'Добавить в список'}
                    </button>
                </div>
             </motion.div>
          </div>
        )}

        {isStoreMode && (
          <StoreModeOverlay items={items} setItems={setItems} onClose={() => setIsStoreMode(false)} groupedByAisle={activeItems.reduce((acc:any, i) => { (acc[i.category] = acc[i.category] || []).push(i); return acc; }, {})} vibrate={vibrate} />
        )}
        {notification && (
          <motion.div initial={{ opacity: 0, y: -40, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, scale: 0.8 }} className="fixed top-28 left-1/2 z-[700] min-w-[240px]">
            <div className={`p-4 rounded-3xl shadow-2xl flex items-center gap-4 border backdrop-blur-2xl ${notification.type === 'success' ? 'bg-green-500/95 text-white' : notification.type === 'warning' ? 'bg-orange-500/95 text-white' : notification.type === 'error' ? 'bg-red-500/95 text-white' : 'bg-blue-600/95 text-white'}`}>
              <CheckCircle2 size={20} /> <span className="text-xs font-black uppercase tracking-wider">{notification.message}</span>
            </div>
          </motion.div>
        )}
        {(isProcessingAI || isListening) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[550] bg-white/70 backdrop-blur-xl flex flex-col items-center justify-center p-10">
            <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-blue-50 flex flex-col items-center">
              <div className="relative mb-8"><div className={`absolute inset-0 bg-blue-500/20 blur-2xl rounded-full ${isListening ? 'animate-ping' : 'animate-pulse'}`} />{isListening ? <MicOff size={64} className="text-red-500 relative animate-pulse" /> : <BrainCircuit size={64} className="text-blue-500 relative animate-pulse" />}</div>
              <h3 className="text-2xl font-black text-[#1C1C1E]">{isListening ? 'Слушаю вас...' : 'Gemini думает...'}</h3>
            </div>
          </motion.div>
        )}
        {isScannerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[800] bg-[#1C1C1E] flex flex-col items-center justify-center">
            <button onClick={() => setIsScannerOpen(false)} className="absolute top-10 right-6 p-4 bg-white/20 rounded-full text-white backdrop-blur-md z-50"><X size={24} /></button>
            <div className="absolute top-24 text-center z-50 px-6 w-full pointer-events-none">
                <h3 className="text-white font-black text-xl mb-2">Сканирование</h3>
                <div className="flex items-center justify-center gap-2 bg-black/40 backdrop-blur-md py-2 px-4 rounded-full mx-auto w-fit">
                   <Loader2 className="animate-spin text-blue-500" size={16} />
                   <p className="text-white text-xs font-bold uppercase tracking-widest">{scannerStatus}</p>
                </div>
            </div>
            <div id="reader" className="w-full h-full max-w-md relative overflow-hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" className="text-gray-200" strokeWidth="4" stroke="currentColor" />
              <motion.circle cx="18" cy="18" r="15.5" fill="none" stroke="#007AFF" strokeWidth="4.2" strokeDasharray="97.39, 97.39" initial={{ strokeDashoffset: 97.39 }} animate={{ strokeDashoffset: 97.39 - (97.39 * progress / 100) }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[12px] font-black text-[#1C1C1E]">{progress}%</span></div>
          </div>
          <div><h2 className="text-2xl font-black tracking-tight text-[#1C1C1E]">Покупки</h2><p className="text-[10px] font-black text-gray-400 uppercase">{items.length} поз.</p></div>
        </div>
        <div className="flex gap-2">
           {activeItems.length > 0 && onSendToTelegram && (
               <button onClick={handleSendList} disabled={isSending} className="px-3 py-3.5 bg-blue-50 text-blue-500 rounded-2xl shadow-sm font-black text-[11px] uppercase flex items-center justify-center transition-all active:scale-95 disabled:opacity-50">
                   {isSending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
               </button>
           )}
           <button onClick={() => setIsStoreMode(true)} className="px-5 py-3.5 bg-blue-500 rounded-2xl text-white shadow-lg font-black text-[11px] uppercase flex items-center gap-2"><Maximize2 size={16} /> Магазин</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-soft border border-white overflow-hidden transition-all p-7 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => openModal()}>
            <div className="w-11 h-11 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20"><Plus size={24} strokeWidth={3} /></div>
            <span className="font-black text-lg text-[#1C1C1E]">Добавить товар</span>
          </div>
          <div className="flex gap-2">
            <button onClick={startListening} className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-50 text-blue-500'}`}>{isListening ? <MicOff size={22} /> : <Mic size={22} />}</button>
            <button onClick={startScanner} className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500 shadow-sm ios-btn-active"><ScanBarcode size={22} /></button>
          </div>
      </div>

      {/* DYNAMIC TOP PURCHASES */}
      {topMonthPurchases.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2"><TrendingUp size={12} className="text-purple-500" /> Топ месяца</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
            {topMonthPurchases.map((item, i) => (
              <button key={i} onClick={() => handleQuickAdd(item.title)} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2 flex-shrink-0 active:scale-95 transition-transform">
                <span className="text-xl">⭐</span>
                <div className="flex flex-col items-start">
                    <span className="text-xs font-bold text-[#1C1C1E]">{item.title}</span>
                    <span className="text-[8px] font-bold text-gray-400">{item.count} раз(а)</span>
                </div>
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center"><Plus size={12} className="text-blue-500" strokeWidth={3} /></div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {activeItems.map(item => (
          <ShoppingCard key={item.id} item={item} onToggle={() => setItems(items.map(i => i.id === item.id ? {...i, completed: !i.completed} : i))} onRemove={() => setItems(items.filter(i => i.id !== item.id))} onEdit={() => openEditModal(item)} />
        ))}
      </div>

      {completedItems.length > 0 && (
        <div className="mt-14 pt-8 border-t border-gray-100 space-y-4">
          <div className="opacity-40 space-y-3">
            {completedItems.map(item => (
              <ShoppingCard 
                 key={item.id} item={item} 
                 onToggle={() => setItems(items.map(i => i.id === item.id ? {...i, completed: !i.completed} : i))} 
                 onRemove={() => setItems(items.filter(i => i.id !== item.id))} 
                 onPantry={onMoveToPantry}
                 onEdit={() => openEditModal(item)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ShoppingCard = ({ item, onToggle, onRemove, onPantry, onEdit }: any) => (
  <motion.div 
    layout 
    onClick={() => !item.completed && onEdit()} 
    className="bg-white p-5 rounded-[1.8rem] border border-white shadow-soft flex items-center gap-5 transition-all cursor-pointer active:scale-[0.99]"
  >
    <button 
      onClick={(e) => { e.stopPropagation(); onToggle(); }} 
      className={`p-1 transition-colors flex-shrink-0 ${item.completed ? 'text-green-500' : 'text-gray-200 hover:text-green-400'}`}
    >
      {item.completed ? <CheckCircle2 size={26} fill="currentColor" className="text-white" /> : <Circle size={26} />}
    </button>
    <div className="flex-1 min-w-0">
      <h5 className={`font-bold text-[15px] truncate ${item.completed ? 'line-through text-gray-400' : 'text-[#1C1C1E]'}`}>{item.title}</h5>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{item.amount || '1'} {item.unit || 'шт'} • {STORE_AISLES.find(a => a.id === item.category)?.label || 'Прочее'}</p>
    </div>
    <div className="flex gap-2">
       {item.completed && onPantry && (
         <button onClick={(e) => { e.stopPropagation(); onPantry(item); alert('Добавлено в кладовку'); }} className="p-2.5 text-blue-500 bg-blue-50 rounded-xl transition-colors">
            <Archive size={18} />
         </button>
       )}
       <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="p-2.5 text-gray-200 hover:text-red-500 transition-colors flex-shrink-0"><Trash2 size={20} /></button>
    </div>
  </motion.div>
);

const StoreModeOverlay = ({ items, setItems, onClose, groupedByAisle, vibrate }: any) => (
    <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[550] bg-[#F2F2F7] flex flex-col">
      <header className="bg-white p-7 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-black text-[#1C1C1E]">Режим закупки</h2><button onClick={onClose} className="p-3.5 bg-gray-100 rounded-full text-gray-500"><X size={24} /></button></header>
      <div className="flex-1 overflow-y-auto p-7 space-y-12 no-scrollbar">
        {Object.entries(groupedByAisle || {}).length === 0 ? <div className="flex flex-col items-center justify-center h-full opacity-20"><p className="mt-4 font-black uppercase tracking-widest">Список пуст</p></div> : Object.entries(groupedByAisle || {}).map(([aisleId, aisleItems]: [string, any]) => (
            <div key={aisleId} className="space-y-5">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400 ml-2">{STORE_AISLES.find(a => a.id === aisleId)?.label}</h4>
              <div className="grid gap-4">{aisleItems.map((item: any) => (<motion.div key={item.id} onClick={() => { setItems(items.map((i:any) => i.id === item.id ? {...i, completed: true} : i)); vibrate('medium'); }} className="bg-white p-7 rounded-[2.5rem] shadow-sm flex items-center gap-6 ios-btn-active border border-white"><div className="w-10 h-10 border-2 border-gray-100 rounded-full flex-shrink-0" /><div className="flex-1"><h5 className="font-black text-xl text-[#1C1C1E] leading-tight">{item.title}</h5><p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{item.amount} {item.unit}</p></div></motion.div>))}</div>
            </div>
          ))
        }
      </div>
    </motion.div>
);

export default ShoppingList;
