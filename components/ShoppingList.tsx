

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Check, Share, X, ScanLine, ShoppingBag, Loader2, Play, Edit2, ChevronLeft, Mic, BrainCircuit, ArrowRight, BookOpen } from 'lucide-react';
import { ShoppingItem, AppSettings, FamilyMember } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { addItem, updateItem, deleteItem, addItemsBatch } from '../utils/db';
import { searchOnlineDatabase } from '../utils/barcodeLookup';
import { detectProductCategory } from '../utils/categorizer';
import { GoogleGenAI } from '../utils/geminiProxy';
import ShoppingListDesktop from './ShoppingListDesktop';
import ProductCatalogModal from './ProductCatalogModal';

interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onCompletePurchase?: () => void;
  onSendToTelegram: (items: ShoppingItem[]) => Promise<boolean>;
}

const AISLES = [
    { id: 'produce', label: 'Овощи/Фрукты', icon: '🥦' },
    { id: 'dairy', label: 'Молочка', icon: '🥛' },
    { id: 'meat', label: 'Мясо/Рыба', icon: '🥩' },
    { id: 'bakery', label: 'Хлеб', icon: '🍞' },
    { id: 'grocery', label: 'Бакалея', icon: '🍝' },
    { id: 'drinks', label: 'Напитки', icon: '🧃' },
    { id: 'sweets', label: 'Сладости', icon: '🍫' },
    { id: 'frozen', label: 'Заморозка', icon: '🧊' },
    { id: 'household', label: 'Быт. химия', icon: '🧼' },
    { id: 'beauty', label: 'Красота', icon: '💄' },
    { id: 'pets', label: 'Животные', icon: '🐱' },
    { id: 'pharmacy', label: 'Аптека', icon: '💊' },
    { id: 'electronics', label: 'Электроника', icon: '🔌' },
    { id: 'clothes', label: 'Одежда', icon: '👕' },
    { id: 'other', label: 'Разное', icon: '📦' },
];

const UNITS = ['шт', 'кг', 'уп', 'л'] as const;

const ShoppingListMobile: React.FC<ShoppingListProps> = ({ 
  items, setItems, settings, members, onSendToTelegram 
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const { updateSettings, addProductToCatalog } = useData();
  
  // Form State
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemUnit, setNewItemUnit] = useState<typeof UNITS[number]>('шт');
  const [selectedAisle, setSelectedAisle] = useState('other');
  
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [shopMode, setShopMode] = useState(false);
  
  const { familyId, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const apiKey = settings.geminiApiKey || "";

  // Computed properties for categories in modal
  const sortedAisles = AISLES;
  const visibleAisles = showAllCategories ? sortedAisles : sortedAisles.slice(0, 12);

  // Wake Lock for Shop Mode
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && shopMode) {
        try { 
            wakeLock = await (navigator as any).wakeLock.request('screen'); 
        } catch (err) {
            console.warn('Wake Lock error:', err);
        }
      }
    };
    
    if (shopMode) requestWakeLock();
    return () => { if (wakeLock) wakeLock.release(); };
  }, [shopMode]);

  // Auto-categorization effect for manual input
  useEffect(() => {
      if (newItemTitle.trim() && !editingItem) {
          const detected = detectProductCategory(newItemTitle);
          if (detected !== 'other') {
              setSelectedAisle(detected);
          }
      }
  }, [newItemTitle, editingItem]);

  // Group items by category (Aisle)
  const groupedItems = useMemo(() => {
      const groups: Record<string, ShoppingItem[]> = {};
      AISLES.forEach(a => groups[a.id] = []);
      
      items.forEach(item => {
          const cat = item.category || 'other';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(item);
      });
      
      return groups;
  }, [items]);

  const activeCount = items.filter(i => !i.completed).length;

  const handleOpenAdd = () => {
      setEditingItem(null);
      setNewItemTitle('');
      setNewItemAmount('');
      setNewItemUnit('шт');
      setSelectedAisle('other');
      setIsAddModalOpen(true);
      setTimeout(() => titleInputRef.current?.focus(), 100);
  };

  const handleOpenEdit = (item: ShoppingItem) => {
      setEditingItem(item);
      setNewItemTitle(item.title);
      setNewItemAmount(item.amount || '');
      setNewItemUnit(item.unit as any || 'шт');
      setSelectedAisle(item.category || 'other');
      setIsAddModalOpen(true);
  };

  const handleSaveItem = async () => {
      if (!newItemTitle.trim()) return;
      
      if (editingItem) {
          const updatedItem: ShoppingItem = {
              ...editingItem,
              title: newItemTitle.trim(),
              amount: newItemAmount,
              unit: newItemUnit,
              category: selectedAisle,
          };
          
          setItems(prev => prev.map(i => i.id === editingItem.id ? updatedItem : i));
          if (familyId) await updateItem(familyId, 'shopping', editingItem.id, updatedItem);
          
          setIsAddModalOpen(false);
          setEditingItem(null);
      } else {
          // Check if item with the same name exists
          const existingItem = items.find(i => i.title.trim().toLowerCase() === newItemTitle.trim().toLowerCase() && !i.completed);
          
          if (existingItem) {
              // Add amount to existing item
              const prevAmount = parseFloat(existingItem.amount || '0') || 0;
              const addedAmount = parseFloat(newItemAmount || '1') || 1;
              const newAmount = (prevAmount + addedAmount).toString();
              
              const updatedItem = {
                  ...existingItem,
                  amount: newAmount,
                  unit: existingItem.unit || newItemUnit,
              };
              setItems(prev => prev.map(i => i.id === existingItem.id ? updatedItem : i));
              if (familyId) await updateItem(familyId, 'shopping', existingItem.id, { amount: newAmount });
          } else {
              const newItem: ShoppingItem = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  title: newItemTitle.trim(),
                  amount: newItemAmount,
                  unit: newItemUnit,
                  category: selectedAisle,
                  completed: false,
                  memberId: user?.uid || 'user',
                  priority: 'medium'
              };

              setItems(prev => [...prev, newItem]);
              if (familyId) await addItem(familyId, 'shopping', newItem);
          }
          
          // Add to catalog if new
          await addProductToCatalog({
              title: newItemTitle.trim(),
              category: selectedAisle,
              unit: newItemUnit
          });

          setNewItemTitle('');
          setNewItemAmount('');
          setNewItemUnit('шт');
          setSelectedAisle('other');
          
          titleInputRef.current?.focus();
      }
  };

  const handleToggle = async (item: ShoppingItem) => {
      const updated = { ...item, completed: !item.completed };
      setItems(items.map(i => i.id === item.id ? updated : i));
      if (familyId) await updateItem(familyId, 'shopping', item.id, { completed: updated.completed });
  };

  const handleDelete = async (id: string) => {
      setItems(items.filter(i => i.id !== id));
      if (familyId) await deleteItem(familyId, 'shopping', id);
      if (editingItem?.id === id) setIsAddModalOpen(false);
  };

  const handleBarcodeScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsScanning(true);
      try {
          if ('BarcodeDetector' in window) {
              const BarcodeDetector = (window as any).BarcodeDetector;
              const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8'] });
              const bitmap = await createImageBitmap(file);
              const barcodes = await detector.detect(bitmap);
              
              if (barcodes.length > 0) {
                  const code = barcodes[0].rawValue;
                  const product = await searchOnlineDatabase(code);
                  if (product) {
                      setNewItemTitle(product.title);
                      setNewItemAmount(product.amount);
                      setNewItemUnit(product.unit);
                      setSelectedAisle(product.category);
                  } else {
                      alert('Товар не найден в базе, введите название вручную');
                  }
              } else {
                  alert('Штрихкод не распознан');
              }
          } else {
              alert('Ваш браузер не поддерживает сканирование штрихкодов');
          }
      } catch (err) {
          console.error(err);
          alert('Ошибка сканирования');
      } finally {
          setIsScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  // AI Voice Processing
  const processVoiceInputWithGemini = async (text: string) => {
      if (!apiKey) {
          alert('API Key не настроен в настройках приложения');
          return;
      }
      
      setIsProcessingAI(true);
      try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `
            Analyze the following shopping list request in Russian: "${text}".
            Return a pure JSON array of objects. 
            Each object must have:
            - "title": string (product name in Russian, capitalized)
            - "amount": string (quantity number, default "1" if not specified)
            - "unit": string (one of: "шт", "кг", "уп", "л". Detect based on context, e.g., milk -> л, potatoes -> кг, eggs -> шт. Default to "шт")
            - "category": string (one of: "produce", "dairy", "meat", "bakery", "grocery", "drinks", "sweets", "frozen", "household", "beauty", "pets", "pharmacy", "electronics", "clothes", "other")
            
            Example input: "купи два молока хлеб и десяток яиц"
            Example output: [{"title": "Молоко", "amount": "2", "unit": "л", "category": "dairy"}, {"title": "Хлеб", "amount": "1", "unit": "шт", "category": "bakery"}, {"title": "Яйца", "amount": "10", "unit": "шт", "category": "dairy"}]
          `;

          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });

          const jsonString = response.text || "[]";
          const parsedItems = JSON.parse(jsonString);

          if (Array.isArray(parsedItems) && parsedItems.length > 0) {
              const newItems: ShoppingItem[] = parsedItems.map((p: any) => ({
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  title: p.title,
                  amount: p.amount,
                  unit: p.unit,
                  category: p.category,
                  completed: false,
                  memberId: user?.uid || 'user',
                  priority: 'medium'
              }));

              setItems(prev => [...prev, ...newItems]);
              if (familyId) {
                  await addItemsBatch(familyId, 'shopping', newItems);
              }
          }

      } catch (err) {
          console.error("Gemini Error:", err);
          alert("Не удалось распознать товары. Попробуйте еще раз.");
      } finally {
          setIsProcessingAI(false);
      }
  };

  const startListening = () => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { alert("Голосовой ввод не поддерживается"); return; }
      
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
      r.onend = () => { if(!isProcessingAI) setIsListening(false); };
      
      r.onresult = (e: any) => {
          const text = e.results[0][0].transcript;
          if (text) {
              setIsListening(false);
              processVoiceInputWithGemini(text);
          }
      };
      
      r.onerror = (e: any) => {
          console.error(e);
          setIsListening(false);
      };
      
      r.start();
  };

  // Shop Mode Overlay
  if (shopMode) {
      return (
        <div className="fixed inset-0 z-[2000] bg-[#F2F2F7] dark:bg-black flex flex-col overflow-hidden">
            {/* Shop Mode Header */}
            <div className="px-6 py-4 bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
                <button 
                    onClick={() => setShopMode(false)}
                    className="flex items-center gap-2 text-blue-500 font-bold text-sm active:opacity-70"
                >
                    <ChevronLeft size={20} />
                    Назад
                </button>
                <h3 className="font-black text-lg text-[#1C1C1E] dark:text-white uppercase tracking-widest">В магазине</h3>
                <div className="w-8" />
            </div>

            {/* Shop Mode Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeCount === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                        <Check size={64} className="text-green-500 mb-4" />
                        <p className="text-lg font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Все куплено!</p>
                    </div>
                ) : (
                    AISLES.map(aisle => {
                        const aisleItems = groupedItems[aisle.id] || [];
                        const activeItems = aisleItems.filter(i => !i.completed);
                        if (activeItems.length === 0) return null;

                        return (
                            <div key={aisle.id} className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 pl-2 flex items-center gap-2">
                                    <span>{aisle.icon}</span> {aisle.label}
                                </h3>
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {activeItems.map(item => (
                                            <motion.div 
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl active:scale-[0.98] transition-transform cursor-pointer border border-blue-100 dark:border-white/5"
                                                onClick={() => handleToggle(item)}
                                            >
                                                <div className="flex items-center gap-4 overflow-hidden flex-1">
                                                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 flex items-center justify-center shrink-0">
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-lg font-bold text-[#1C1C1E] dark:text-white truncate block leading-tight">{item.title}</span>
                                                        {(item.amount || item.unit) && (
                                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                                {item.amount} {item.unit}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      );
  }

  // Standard Mobile Mode
  return (
    <div className="space-y-4 h-full flex flex-col relative">
        {/* Loading Overlay for AI */}
        <AnimatePresence>
            {(isListening || isProcessingAI) && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2.5rem]">
                    <div className="bg-white dark:bg-[#2C2C2E] p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4 border dark:border-white/10">
                        {isListening ? (
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping blur-md" />
                                <Mic size={48} className="text-red-500 relative z-10" />
                            </div>
                        ) : (
                            <BrainCircuit size={48} className="text-purple-500 animate-pulse" />
                        )}
                        <span className="font-black text-lg text-[#1C1C1E] dark:text-white">
                            {isListening ? 'Слушаю...' : 'Анализирую список...'}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Header Actions */}
        <div className="flex gap-2 shrink-0 items-stretch">
            <button 
                onClick={handleOpenAdd}
                className="flex-[2] bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] shadow-sm flex items-center justify-center gap-2 text-[#1C1C1E] dark:text-white font-black uppercase text-xs tracking-widest active:scale-95 transition-transform border border-transparent dark:border-white/5"
            >
                <Plus size={18} strokeWidth={3} /> Добавить
            </button>

            <button 
                onClick={() => setIsCatalogOpen(true)}
                title="Справочник товаров"
                className="p-4 bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-sm flex items-center justify-center text-blue-500 active:scale-95 transition-transform border border-transparent dark:border-white/5"
            >
                <BookOpen size={20} />
            </button>
            
            <button 
                onClick={startListening}
                className={`flex-1 p-4 rounded-[2rem] shadow-sm flex items-center justify-center transition-all bg-white dark:bg-[#1C1C1E] border dark:border-white/5 active:scale-95 ${isListening ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-blue-500'}`}
            >
                <Mic size={20} />
            </button>

            <button 
                onClick={() => setShopMode(true)}
                className="p-4 rounded-[2rem] shadow-sm flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest transition-all bg-blue-500 text-white shadow-blue-500/20 active:scale-95"
            >
                <Play size={18} fill="currentColor" />
            </button>

            <button 
                onClick={() => onSendToTelegram(items.filter(i => !i.completed))}
                disabled={activeCount === 0}
                className="bg-[#1C1C1E] dark:bg-white text-white dark:text-black p-4 rounded-[2rem] shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:shadow-none"
            >
                <Share size={20} />
            </button>
        </div>

        {/* Product Catalog Modal */}
        <ProductCatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />

        {/* Lists Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-20">
            {activeCount === 0 && items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                    <ShoppingBag size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Список пуст</p>
                </div>
            )}

            {AISLES.map(aisle => {
                const aisleItems = groupedItems[aisle.id] || [];
                const activeItems = aisleItems.filter(i => !i.completed);
                if (activeItems.length === 0) return null;

                return (
                    <div key={aisle.id} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 pl-2 flex items-center gap-2">
                            <span>{aisle.icon}</span> {aisle.label}
                        </h3>
                        <div className="space-y-2">
                            <AnimatePresence>
                                {activeItems.map(item => (
                                    <motion.div 
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        onClick={() => handleOpenEdit(item)}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl group cursor-pointer active:scale-[0.99] transition-transform"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleToggle(item); }}
                                                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0 hover:border-green-500 hover:text-green-500 transition-colors"
                                            >
                                                {item.completed && <Check size={14} />}
                                            </button>
                                            <div className="min-w-0">
                                                <span className="text-sm font-bold text-[#1C1C1E] dark:text-white truncate block">{item.title}</span>
                                                {(item.amount || item.unit) && (
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        {item.amount} {item.unit}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="p-2 text-gray-300"><Edit2 size={14}/></div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                );
            })}

            {/* Completed Items Section */}
            {items.some(i => i.completed) && (
                <div className="pt-4 border-t border-gray-200 dark:border-white/10 mt-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 pl-2">Куплено</h3>
                    <div className="space-y-2 opacity-60">
                        {items.filter(i => i.completed).map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-[#2C2C2E] rounded-2xl">
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <button onClick={() => handleToggle(item)} className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                                        <Check size={14} />
                                    </button>
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 line-through decoration-gray-400">{item.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Add/Edit Item Modal */}
        <AnimatePresence>
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[1200] flex items-end md:items-center justify-center p-0 md:p-4">
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
                    <motion.div 
                        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-white dark:bg-[#1C1C1E] p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
                            <h3 className="text-xl font-black text-[#1C1C1E] dark:text-white">
                                {editingItem ? 'Редактировать' : 'Добавить покупку'}
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300"><X size={20}/></button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
                            <div className="flex flex-col gap-4">
                                <div className="relative">
                                    <input 
                                        ref={titleInputRef}
                                        type="text" 
                                        placeholder="Что купить?" 
                                        value={newItemTitle} 
                                        onChange={e => setNewItemTitle(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleSaveItem()}
                                        className="w-full bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] font-bold text-lg outline-none text-[#1C1C1E] dark:text-white pr-14 shadow-sm"
                                    />
                                    <div className="absolute right-2 top-2 bottom-2 flex gap-2">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square h-full flex items-center justify-center bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500 hover:text-blue-500 transition-colors"
                                        >
                                            {isScanning ? <Loader2 size={20} className="animate-spin"/> : <ScanLine size={20}/>}
                                        </button>
                                    </div>
                                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleBarcodeScan} />
                                    {newItemTitle.length > 1 && settings.productCatalog && settings.productCatalog.filter(c => c.title.toLowerCase().includes(newItemTitle.toLowerCase()) && c.title.toLowerCase() !== newItemTitle.toLowerCase()).length > 0 && (
                                        <div className="absolute top-full mt-2 w-full z-10 bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                                            {settings.productCatalog.filter(c => c.title.toLowerCase().includes(newItemTitle.toLowerCase()) && c.title.toLowerCase() !== newItemTitle.toLowerCase()).slice(0, 5).map(suggestion => (
                                                <button
                                                    key={suggestion.id}
                                                    onClick={() => {
                                                        setNewItemTitle(suggestion.title);
                                                        setSelectedAisle(suggestion.category || 'other');
                                                        setNewItemUnit(suggestion.unit as any || 'шт');
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1C1C1E] border-b border-gray-100 dark:border-white/5 last:border-0"
                                                >
                                                    <span className="font-bold text-[#1C1C1E] dark:text-white">{suggestion.title}</span>
                                                    <span className="ml-2 text-xs text-gray-500">{suggestion.unit}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Width 25% for Amount, rest for Units */}
                                <div className="flex gap-3 h-16">
                                    <input 
                                        type="text" 
                                        inputMode="decimal"
                                        placeholder="К-во" 
                                        value={newItemAmount} 
                                        onChange={e => setNewItemAmount(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleSaveItem()}
                                        className="w-28 bg-white dark:bg-[#1C1C1E] rounded-[2rem] font-bold text-2xl outline-none text-center text-[#1C1C1E] dark:text-white shadow-sm h-full"
                                    />
                                    {/* Units Block - Flex Row */}
                                    <div className="flex-1 bg-white dark:bg-[#1C1C1E] p-1.5 rounded-[2rem] shadow-sm flex items-center justify-between gap-1 h-full">
                                        {UNITS.map(u => (
                                            <button 
                                                key={u}
                                                onClick={() => setNewItemUnit(u)}
                                                className={`flex-1 h-full rounded-[1.5rem] text-[10px] font-black uppercase transition-all flex items-center justify-center ${newItemUnit === u ? 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] shadow-sm">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase block">Категория</span>
                                    {sortedAisles.length > 12 && !showAllCategories && (
                                        <button 
                                            onClick={() => setShowAllCategories(true)} 
                                            className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            Показать все
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {visibleAisles.map(aisle => (
                                        <button 
                                            key={aisle.id} 
                                            onClick={() => setSelectedAisle(aisle.id)} 
                                            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all border ${selectedAisle === aisle.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-sm' : 'border-transparent hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'}`}
                                        >
                                            <span className="text-xl mb-1">{aisle.icon}</span>
                                            <span className={`text-[9px] font-bold text-center leading-none w-full truncate ${selectedAisle === aisle.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>{aisle.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 flex flex-col gap-3">
                            <button 
                                onClick={handleSaveItem}
                                disabled={!newItemTitle.trim()}
                                className="w-full bg-blue-500 text-white font-black py-5 rounded-[2rem] uppercase text-xs flex items-center justify-center gap-2 active:scale-95 shadow-xl transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                <Plus size={18} strokeWidth={3}/> 
                                {editingItem ? 'Сохранить изменения' : 'Добавить'}
                            </button>
                            
                            {editingItem && (
                                <button 
                                    onClick={() => handleDelete(editingItem.id)}
                                    className="w-full bg-red-50 dark:bg-red-900/20 text-red-500 font-black py-4 rounded-[2rem] uppercase text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <Trash2 size={16} /> Удалить
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

const ShoppingList: React.FC<ShoppingListProps> = (props) => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  if (isDesktop) {
      return <ShoppingListDesktop {...props} />;
  }

  return <ShoppingListMobile {...props} />;
};

export default ShoppingList;