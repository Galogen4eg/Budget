
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, CheckCircle2, Circle, 
  Mic, BrainCircuit,
  X, Plus, ScanBarcode, Loader2,
  Receipt, MicOff, Maximize2, ShoppingBag,
  Scale, Hash
} from 'lucide-react';
import { ShoppingItem, AppSettings, FamilyMember } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Html5Qrcode } from 'html5-qrcode';

interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: (items: ShoppingItem[]) => void;
  settings: AppSettings;
  members: FamilyMember[];
  onCompletePurchase: (amount: number, category: string, note: string) => void;
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

const ShoppingList: React.FC<ShoppingListProps> = ({ items, setItems, settings, members, onCompletePurchase }) => {
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isStoreMode, setIsStoreMode] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [totalCostInput, setTotalCostInput] = useState('');
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<'шт' | 'кг' | 'уп' | 'л'>('шт');
  const [selectedAisle, setSelectedAisle] = useState('other');

  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isScannerProcessing, setIsScannerProcessing] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const recognitionRef = useRef<any>(null);

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
        contents: `Распознай продукты из текста: "${text}". Для каждого товара определи: title, amount, unit, aisle (один из: ${STORE_AISLES.map(a => a.id).join(', ')}). Верни ТОЛЬКО JSON массив объектов.`,
        config: { responseMimeType: "application/json" }
      });

      const parsedData = JSON.parse(response.text || '[]') as any[];
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const newItems: ShoppingItem[] = parsedData.map((item: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          title: item.title || 'Товар',
          amount: String(item.amount || '1'),
          unit: item.unit || 'шт',
          completed: false,
          memberId: members[0]?.id || 'papa',
          priority: 'medium',
          category: item.aisle || 'other'
        }));
        setItems([...newItems, ...items]);
        showNotify('success', `Добавлено товаров: ${newItems.length}`);
        vibrate('success');
      }
    } catch (err) {
      showNotify('error', 'Не удалось распознать товары');
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

  const startScanner = () => { setIsScannerOpen(true); vibrate('light'); };

  useEffect(() => {
    if (isScannerOpen && !isScannerProcessing) {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      html5QrCode.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, (text) => {
        html5QrCode.stop().then(() => {
          setIsScannerOpen(false);
          showNotify('info', 'Штрихкод считан');
        });
      }).catch(() => setIsScannerOpen(false));
    }
    return () => { if (scannerRef.current?.isScanning) scannerRef.current.stop(); };
  }, [isScannerOpen]);

  const handleAddItem = () => {
    if (!title.trim()) return;
    const newItem: ShoppingItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      amount: amount || '1',
      unit: unit,
      completed: false,
      memberId: members[0]?.id || 'papa',
      priority: 'medium',
      category: selectedAisle
    };
    setItems([newItem, ...items]);
    setTitle(''); 
    setAmount('1');
    setUnit('шт');
    setIsManualOpen(false);
    vibrate('light');
  };

  const handleFinishShopping = () => {
    const cost = parseFloat(totalCostInput);
    if (isNaN(cost)) return;
    const completed = items.filter(i => i.completed);
    onCompletePurchase(cost, 'shopping', completed.map(i => i.title).join(', '));
    setItems(items.filter(i => !i.completed));
    setIsFinishModalOpen(false);
    setTotalCostInput('');
    vibrate('success');
  };

  const activeItems = useMemo(() => items.filter(i => !i.completed), [items]);
  const completedItems = useMemo(() => items.filter(i => i.completed), [items]);
  const progress = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;

  return (
    <div className="relative space-y-8 pb-36">
      <AnimatePresence>
        {isStoreMode && (
          <StoreModeOverlay items={items} setItems={setItems} onClose={() => setIsStoreMode(false)} groupedByAisle={activeItems.reduce((acc:any, i) => { (acc[i.category] = acc[i.category] || []).push(i); return acc; }, {})} vibrate={vibrate} />
        )}
        {notification && (
          <motion.div initial={{ opacity: 0, y: -40, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, scale: 0.8 }} className="fixed top-28 left-1/2 z-[700] min-w-[240px]">
            <div className={`p-4 rounded-3xl shadow-2xl flex items-center gap-4 border backdrop-blur-2xl ${notification.type === 'success' ? 'bg-green-500/95 text-white' : 'bg-blue-600/95 text-white'}`}>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[800] bg-[#F2F2F7] flex flex-col items-center justify-center">
            <button onClick={() => setIsScannerOpen(false)} className="absolute top-10 right-6 p-4 bg-white/20 rounded-full text-[#1C1C1E]"><X size={24} /></button>
            <div id="reader" className="w-[90%] max-w-sm aspect-square relative rounded-[3rem] border-4 border-blue-500/50" />
            <p className="mt-8 font-black text-gray-400 uppercase text-xs tracking-widest">Сканируйте штрихкод</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" className="text-gray-100" strokeWidth="4" stroke="currentColor" />
              <motion.circle cx="18" cy="18" r="15.5" fill="none" stroke="#007AFF" strokeWidth="4.2" strokeDasharray="97.39, 97.39" initial={{ strokeDashoffset: 97.39 }} animate={{ strokeDashoffset: 97.39 - (97.39 * progress / 100) }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[12px] font-black text-[#1C1C1E]">{progress}%</span></div>
          </div>
          <div><h2 className="text-2xl font-black tracking-tight text-[#1C1C1E]">Покупки</h2><p className="text-[10px] font-black text-gray-400 uppercase">{items.length} поз.</p></div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setIsStoreMode(true)} className="px-5 py-3.5 bg-blue-500 rounded-2xl text-white shadow-lg font-black text-[11px] uppercase flex items-center gap-2"><Maximize2 size={16} /> Магазин</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-soft border border-white overflow-hidden transition-all">
        <div className="p-7 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setIsManualOpen(!isManualOpen)}>
            <div className="w-11 h-11 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20"><Plus size={24} strokeWidth={3} /></div>
            <span className="font-black text-lg text-[#1C1C1E]">Добавить товар</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={startListening} 
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-50 text-blue-500'}`}
              title="Голосовой ввод"
            >
              {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <button 
              onClick={startScanner} 
              className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500 shadow-sm ios-btn-active"
              title="Сканировать"
            >
              <ScanBarcode size={22} />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {isManualOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-7 pb-7 space-y-6">
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Что купить? (напр. Молоко)" 
                  className="w-full bg-gray-50 p-5 rounded-2xl outline-none font-bold text-[#1C1C1E] border border-transparent focus:border-blue-100 transition-all" 
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3 border border-transparent focus-within:border-blue-100 transition-all">
                    <Hash size={18} className="text-gray-400" />
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      placeholder="Кол-во" 
                      className="bg-transparent outline-none font-bold text-[#1C1C1E] w-full" 
                    />
                  </div>
                  
                  <div className="flex bg-gray-100/50 p-1.5 rounded-2xl border border-gray-100">
                    {UNITS.map(u => (
                      <button
                        key={u}
                        onClick={() => setUnit(u)}
                        className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider ${unit === u ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Отдел</label>
                   <div className="flex flex-wrap gap-2">
                      {STORE_AISLES.slice(0, 8).map(aisle => (
                        <button
                          key={aisle.id}
                          onClick={() => setSelectedAisle(aisle.id)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all ${selectedAisle === aisle.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-100 text-gray-400'}`}
                        >
                          {aisle.icon} {aisle.label}
                        </button>
                      ))}
                   </div>
                </div>
              </div>
              
              <button onClick={handleAddItem} className="w-full bg-blue-500 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl ios-btn-active">
                Добавить в список
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-6">
        {activeItems.map(item => (
          <ShoppingCard 
            key={item.id} 
            item={item} 
            onToggle={() => setItems(items.map(i => i.id === item.id ? {...i, completed: !i.completed} : i))} 
            onRemove={() => setItems(items.filter(i => i.id !== item.id))} 
          />
        ))}
      </div>

      {completedItems.length > 0 && (
        <div className="mt-14 pt-8 border-t border-gray-100 space-y-4">
          <button onClick={() => setIsFinishModalOpen(true)} className="w-full py-4 bg-green-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-green-500/20">Завершить закупку</button>
          <div className="opacity-40 space-y-3">
            {completedItems.map(item => (
              <ShoppingCard 
                key={item.id} 
                item={item} 
                onToggle={() => setItems(items.map(i => i.id === item.id ? {...i, completed: !i.completed} : i))} 
                onRemove={() => setItems(items.filter(i => i.id !== item.id))} 
              />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>{isFinishModalOpen && (<div className="fixed inset-0 z-[750] flex items-center justify-center p-6"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" onClick={() => setIsFinishModalOpen(false)} /><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl"><h3 className="text-2xl font-black text-center mb-6 text-[#1C1C1E]">Итого чека?</h3><input type="number" value={totalCostInput} onChange={(e) => setTotalCostInput(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 p-6 rounded-2xl text-3xl font-black text-center mb-8 outline-none text-[#1C1C1E]" /><div className="flex gap-4"><button onClick={() => setIsFinishModalOpen(false)} className="flex-1 py-5 bg-gray-100 rounded-2xl font-black uppercase text-gray-400">Отмена</button><button onClick={handleFinishShopping} className="flex-1 py-5 bg-green-500 rounded-2xl font-black uppercase text-white shadow-xl">Списать</button></div></motion.div></div>)}</AnimatePresence>
    </div>
  );
};

const ShoppingCard = ({ item, onToggle, onRemove }: any) => (
  <motion.div layout className="bg-white p-5 rounded-[1.8rem] border border-white shadow-sm flex items-center gap-5 transition-all">
    <button onClick={onToggle} className={`transition-colors flex-shrink-0 ${item.completed ? 'text-green-500' : 'text-gray-200'}`}>
      {item.completed ? <CheckCircle2 size={26} fill="currentColor" className="text-white" /> : <Circle size={26} />}
    </button>
    <div className="flex-1 min-w-0" onClick={onToggle}>
      <h5 className={`font-bold text-[15px] truncate ${item.completed ? 'line-through text-gray-400' : 'text-[#1C1C1E]'}`}>
        {item.title}
      </h5>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
        {item.amount || '1'} {item.unit || 'шт'} • {STORE_AISLES.find(a => a.id === item.category)?.label || 'Прочее'}
      </p>
    </div>
    <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="p-2.5 text-gray-200 hover:text-red-500 transition-colors flex-shrink-0">
      <Trash2 size={20} />
    </button>
  </motion.div>
);

const StoreModeOverlay = ({ items, setItems, onClose, groupedByAisle, vibrate }: any) => (
    <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[550] bg-[#F2F2F7] flex flex-col">
      <header className="bg-white p-7 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-black text-[#1C1C1E]">Режим закупки</h2><button onClick={onClose} className="p-3.5 bg-gray-100 rounded-full text-gray-500"><X size={24} /></button></header>
      <div className="flex-1 overflow-y-auto p-7 space-y-12 no-scrollbar">
        {Object.entries(groupedByAisle || {}).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20">
            <ShoppingBag size={80} />
            <p className="mt-4 font-black uppercase tracking-widest">Список пуст</p>
          </div>
        ) : (
          Object.entries(groupedByAisle || {}).map(([aisleId, aisleItems]: [string, any]) => (
            <div key={aisleId} className="space-y-5">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400 ml-2">{STORE_AISLES.find(a => a.id === aisleId)?.label}</h4>
              <div className="grid gap-4">
                {aisleItems.map((item: any) => (
                  <motion.div 
                    key={item.id} 
                    onClick={() => { setItems(items.map((i:any) => i.id === item.id ? {...i, completed: true} : i)); vibrate('medium'); }} 
                    className="bg-white p-7 rounded-[2.5rem] shadow-sm flex items-center gap-6 ios-btn-active border border-white"
                  >
                    <div className="w-10 h-10 border-2 border-gray-100 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <h5 className="font-black text-xl text-[#1C1C1E] leading-tight">{item.title}</h5>
                      <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{item.amount} {item.unit}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
);

export default ShoppingList;
