
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, CheckCircle2, Circle, 
  Mic, 
  X, Plus, ScanBarcode, Loader2,
  MicOff, Maximize2, ShoppingBag,
  Archive, Check, Send, ChevronDown, ChevronUp, CloudDownload, List,
  History
} from 'lucide-react';
import { ShoppingItem, AppSettings, FamilyMember, Transaction } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Html5Qrcode } from 'html5-qrcode';
import { lookupBarcodeOffline, searchOnlineDatabase } from '../utils/barcodeLookup';
import { auth } from '../firebase'; 
import { detectProductCategory } from '../utils/categorizer';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem as dbDeleteItem } from '../utils/db';

interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1 }
};

const ShoppingList: React.FC<ShoppingListProps> = ({ items, setItems, settings, members, onCompletePurchase, transactions = [], onMoveToPantry, onSendToTelegram, initialStoreMode = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStoreMode, setIsStoreMode] = useState(initialStoreMode);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { familyId } = useAuth();
  
  // Modal Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<'шт' | 'кг' | 'уп' | 'л'>('шт');
  const [selectedAisle, setSelectedAisle] = useState('other');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Session State (Items added while modal is open)
  const [sessionAddedItems, setSessionAddedItems] = useState<ShoppingItem[]>([]);

  // Async & AI State
  const [categorizingIds, setCategorizingIds] = useState<Set<string>>(new Set());
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
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (initialStoreMode) setIsStoreMode(true);
  }, [initialStoreMode]);

  // Dictionary / History Logic
  const uniqueHistoryItems = useMemo(() => {
      const map = new Map<string, ShoppingItem>();
      items.forEach(item => {
          const key = item.title.trim().toLowerCase();
          if (!map.has(key)) {
              map.set(key, item);
          }
      });
      return Array.from(map.values());
  }, [items]);

  const suggestions = useMemo(() => {
      if (!title.trim()) return [];
      const search = title.toLowerCase();
      // Show matching items from history that contain the search string
      return uniqueHistoryItems
          .filter(item => item.title.toLowerCase().includes(search) && item.title.toLowerCase() !== search)
          .slice(0, 5); // Limit to 5
  }, [title, uniqueHistoryItems]);

  const selectSuggestion = (suggestion: ShoppingItem) => {
      setTitle(suggestion.title);
      setUnit(suggestion.unit);
      setSelectedAisle(suggestion.category);
      if (titleInputRef.current) titleInputRef.current.focus();
  };

  // Price History Logic for Modal
  const lastPrice = useMemo(() => {
    if (!title || title.length < 3) return null;
    const match = transactions.find(t => t.note && t.note.toLowerCase().includes(title.toLowerCase()));
    return match ? match.amount : null;
  }, [title, transactions]);

  // ANALYTICS CALCULATIONS
  const activeItems = useMemo(() => items.filter(i => !i.completed), [items]);
  const completedItems = useMemo(() => items.filter(i => i.completed), [items]);

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

  const autoDetectAisle = () => {
      if (!title || selectedAisle !== 'other') return;
      // Local check only for immediate UI feedback
      const smartCat = detectProductCategory(title);
      if (smartCat !== 'other') {
          setSelectedAisle(smartCat);
      }
  };

  const categorizeItemWithAI = async (itemId: string, itemTitle: string) => {
      // Silent check for API Key - don't even start if missing
      if (!process.env.API_KEY) return;

      setCategorizingIds(prev => new Set(prev).add(itemId));
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: `Categorize "${itemTitle}" into one of these IDs: ${STORE_AISLES.map(a => a.id).join(', ')}. Return ONLY the ID string. If unsure, return 'other'.`,
          });
          
          const result = response.text?.trim() || 'other';
          const matchedAisle = STORE_AISLES.find(a => a.id === result) ? result : 'other';
          
          setItems(currentItems => {
              const updated = currentItems.map(i => i.id === itemId ? { ...i, category: matchedAisle } : i);
              return updated;
          });

          // Sync AI update to DB
          if (familyId) {
              await updateItem(familyId, 'shopping', itemId, { category: matchedAisle });
          }

      } catch (error) {
          // Silent failure is better than spamming console for offline users
          // console.error("AI Categorization failed:", error);
      } finally {
          setCategorizingIds(prev => {
              const next = new Set(prev);
              next.delete(itemId);
              return next;
          });
      }
  };

  const handleTelegramImport = async () => {
      if (!settings.telegramBotToken || !settings.telegramChatId) {
          showNotify('error', 'Сначала настройте Telegram в Настройках');
          return;
      }
      setIsImportingTg(true);
      try {
          const lastUpdateId = parseInt(localStorage.getItem('tg_last_update_id') || '0');
          const response = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}&allowed_updates=["message"]`);
          const data = await response.json();
          if (!data.ok || !data.result || data.result.length === 0) {
              showNotify('info', 'Нет новых сообщений в боте');
              setIsImportingTg(false);
              return;
          }
          const relevantMessages = data.result
              .filter((u: any) => u.message && String(u.message.chat.id) === settings.telegramChatId && u.message.text)
              .map((u: any) => u.message.text)
              .join('\n');
          if (!relevantMessages) {
              const maxId = data.result.reduce((max: number, u: any) => Math.max(max, u.update_id), 0);
              localStorage.setItem('tg_last_update_id', maxId.toString());
              showNotify('info', 'Нет сообщений из вашего чата');
              setIsImportingTg(false);
              return;
          }
          await processSmartInput(relevantMessages);
          const maxId = data.result.reduce((max: number, u: any) => Math.max(max, u.update_id), 0);
          localStorage.setItem('tg_last_update_id', maxId.toString());
      } catch (e) {
          console.error(e);
          showNotify('error', 'Ошибка связи с Telegram');
      } finally {
          setIsImportingTg(false);
      }
  };

  const processSmartInput = async (text: string) => {
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

      const responseText = response.text || "[]";
      const newItemsRaw: any[] = JSON.parse(responseText);
      
      const newItems: ShoppingItem[] = newItemsRaw.map(i => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          title: i.title,
          amount: i.amount || '1',
          unit: i.unit || 'шт',
          category: i.aisle || 'other',
          completed: false,
          memberId: auth.currentUser?.uid || 'unknown',
          priority: 'medium'
      }));

      if (newItems.length > 0) {
          setItems(prev => [...prev, ...newItems]);
          // Batch add to DB if needed, handled in DataContext if we used a method, 
          // but here we are manual. Let's assume we need to sync manual.
          if (familyId) {
              const { addItemsBatch } = await import('../utils/db');
              await addItemsBatch(familyId, 'shopping', newItems);
          }
          showNotify('success', `Добавлено ${newItems.length} товаров`);
          vibrate('success');
      } else {
          showNotify('warning', 'Не удалось найти товары в тексте');
      }

    } catch (e) {
        console.error(e);
        showNotify('error', 'Ошибка обработки ИИ');
        vibrate('error');
    } finally {
        setIsProcessingAI(false);
    }
  };

  const handleSaveItem = async () => {
      const cleanTitle = title.trim();
      if (!cleanTitle) return;
      
      if (editingItemId) {
          // Editing existing item - Close modal after save
          const itemToUpdate = items.find(i => i.id === editingItemId);
          if (itemToUpdate) {
              const updatedItem = {
                  ...itemToUpdate,
                  title: cleanTitle,
                  amount,
                  unit,
                  category: selectedAisle
              };
              setItems(prev => prev.map(i => i.id === editingItemId ? updatedItem : i));
              if (familyId) await updateItem(familyId, 'shopping', editingItemId, updatedItem);
              showNotify('success', 'Товар обновлен');
          }
          setIsModalOpen(false);
          resetForm();
      } else {
          // CHECK FOR EXISTING ITEM (Active or Completed)
          // To prevent duplicates and reuse history
          const existingItem = items.find(i => i.title.toLowerCase() === cleanTitle.toLowerCase());

          if (existingItem) {
              // Update existing item (bring to top, uncheck, update meta)
              const updatedItem = {
                  ...existingItem,
                  amount,
                  unit,
                  category: selectedAisle !== 'other' ? selectedAisle : existingItem.category, // Keep old category if 'other' is selected now
                  completed: false,
                  id: existingItem.id // Keep ID
              };
              
              // Move to bottom of active list (or top of list visually if reversed)
              // We just update the item in array
              setItems(prev => prev.map(i => i.id === existingItem.id ? updatedItem : i));
              if (familyId) await updateItem(familyId, 'shopping', existingItem.id, updatedItem);
              
              setSessionAddedItems(prev => [updatedItem, ...prev]);
              showNotify('success', 'Товар возвращен в список');
          } else {
              // Create NEW item
              let initialCategory = selectedAisle;
              const needAI = selectedAisle === 'other';
              
              if (needAI) {
                  const localCat = detectProductCategory(cleanTitle);
                  if (localCat !== 'other') {
                      initialCategory = localCat;
                  }
              }

              const newItem: ShoppingItem = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  title: cleanTitle,
                  amount,
                  unit,
                  category: initialCategory,
                  completed: false,
                  memberId: auth.currentUser?.uid || 'unknown',
                  priority: 'medium'
              };
              
              setItems(prev => [...prev, newItem]);
              if (familyId) await addItem(familyId, 'shopping', newItem);
              
              // Background AI classification if needed
              if (needAI && initialCategory === 'other') {
                  categorizeItemWithAI(newItem.id, newItem.title);
              }
              
              setSessionAddedItems(prev => [newItem, ...prev]);
              showNotify('success', 'Товар добавлен');
          }
          
          vibrate('success');
          // Reset fields but keep modal open
          setTitle('');
          setAmount('1');
          setSelectedAisle('other');
          
          // Focus back on title for rapid entry
          if (titleInputRef.current) {
              titleInputRef.current.focus();
          }
      }
  };

  const handleDeleteItem = async (id: string) => {
      setItems(prev => prev.filter(i => i.id !== id));
      if (familyId) await dbDeleteItem(familyId, 'shopping', id);
      showNotify('info', 'Товар удален');
  };

  const toggleItem = async (id: string) => {
      const item = items.find(i => i.id === id);
      if (!item) return;
      
      const updatedItem = { ...item, completed: !item.completed };
      setItems(prev => prev.map(i => i.id === id ? updatedItem : i));
      vibrate('light');
      
      if (familyId) await updateItem(familyId, 'shopping', id, { completed: updatedItem.completed });
  };

  const handleMoveToPantry = (item: ShoppingItem) => {
      if (onMoveToPantry) {
          onMoveToPantry(item);
          // Don't double delete locally if parent handles it, but for safety in standalone usage:
          // In App.tsx handleMoveToPantry deletes from DB and State.
          // So we just notify here.
          showNotify('success', 'Перенесено в кладовку');
      }
  };

  const resetForm = () => {
      setTitle('');
      setAmount('1');
      setUnit('шт');
      setSelectedAisle('other');
      setEditingItemId(null);
      setSessionAddedItems([]); // Clear session items when fully resetting/closing
  };

  const openAddModal = () => {
      resetForm();
      setIsModalOpen(true);
  };

  const openEditModal = (item: ShoppingItem) => {
      setEditingItemId(item.id);
      setTitle(item.title);
      setAmount(item.amount || '1');
      setUnit(item.unit);
      setSelectedAisle(item.category);
      setSessionAddedItems([]); // Editing mode shouldn't show previous session added items
      setIsModalOpen(true);
  };

  // SCANNER LOGIC
  const startScanner = () => {
      setIsScannerOpen(true);
      setScannerStatus('Запуск камеры...');
      setTimeout(() => {
          if (!document.getElementById("reader")) return;
          const scanner = new Html5Qrcode("reader");
          scannerRef.current = scanner;
          scanner.start(
              { facingMode: "environment" },
              { fps: 10, qrbox: { width: 250, height: 250 } },
              async (decodedText) => {
                  if (isScanningLocked.current) return;
                  isScanningLocked.current = true;
                  vibrate('medium');
                  setScannerStatus('Штрихкод найден! Поиск...');
                  let product = lookupBarcodeOffline(decodedText);
                  if (!product) {
                      try { product = await searchOnlineDatabase(decodedText); } catch (e) {}
                  }
                  if (product) {
                      setTitle(product.title);
                      setAmount(product.amount);
                      setUnit(product.unit);
                      setSelectedAisle(product.category);
                      setIsScannerOpen(false);
                      setIsModalOpen(true);
                      stopScanner();
                  } else {
                      setScannerStatus('Товар не найден.');
                      setTimeout(() => {
                          setIsScannerOpen(false);
                          setIsModalOpen(true);
                          setTitle(`Товар ${decodedText}`);
                          stopScanner();
                      }, 1000);
                  }
                  isScanningLocked.current = false;
              },
              (errorMessage) => {}
          ).catch(err => {
              setScannerStatus('Ошибка камеры. Проверьте разрешения.');
          });
      }, 500);
  };

  const stopScanner = () => {
      if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
          }).catch(err => console.error("Failed to stop scanner", err));
      }
      setIsScannerOpen(false);
  };

  const startVoiceInput = () => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
          showNotify('error', 'Голосовой ввод не поддерживается');
          return;
      }
      if (isListening) {
          if (recognitionRef.current) recognitionRef.current.stop();
          setIsListening(false);
          return;
      }
      const r = new SR();
      recognitionRef.current = r;
      r.lang = 'ru-RU';
      r.interimResults = false;
      r.onstart = () => setIsListening(true);
      r.onend = () => setIsListening(false);
      r.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          if (transcript) processSmartInput(transcript);
      };
      r.start();
  };

  const handleSendListToTelegram = async () => {
      if (!onSendToTelegram) return;
      setIsSending(true);
      const success = await onSendToTelegram(activeItems);
      setIsSending(false);
      if (success) {
          showNotify('success', 'Список отправлен в Telegram');
          vibrate('success');
      } else {
          showNotify('error', 'Ошибка отправки');
      }
  };

  return (
    <div className="relative flex flex-col space-y-4">
        {/* Render Scanner Portal */}
        {isScannerOpen && createPortal(
            <div className="fixed inset-0 z-[2000] bg-black flex flex-col">
                <div className="flex justify-between items-center p-4 text-white">
                    <button onClick={stopScanner}><X size={24}/></button>
                    <span className="font-bold">{scannerStatus}</span>
                    <div className="w-6"/>
                </div>
                <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
                    <div id="reader" style={{ width: '100%', maxWidth: '500px', height: 'auto', minHeight: '300px' }}></div>
                </div>
            </div>,
            document.body
        )}

        {/* Top Controls - Optimized for Desktop */}
        <div className="grid grid-cols-6 md:flex md:justify-start gap-2 mb-4 px-1">
            <button onClick={openAddModal} className="aspect-square md:w-14 md:h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
                <Plus size={24} strokeWidth={3} />
            </button>
            <button onClick={() => setIsStoreMode(!isStoreMode)} className={`aspect-square md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all ${isStoreMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 text-gray-500 dark:text-gray-400'}`}>
                {isStoreMode ? <Maximize2 size={20}/> : <List size={20}/>}
            </button>
            <button 
                onClick={startVoiceInput} 
                className={`aspect-square md:w-14 md:h-14 rounded-2xl flex items-center justify-center border transition-all ${isListening ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}
            >
                {isListening ? <MicOff size={20}/> : <Mic size={20}/>}
            </button>
            <button onClick={startScanner} className="aspect-square md:w-14 md:h-14 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-2xl flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-blue-500">
                <ScanBarcode size={20}/>
            </button>
            <button onClick={handleTelegramImport} disabled={isImportingTg} className="aspect-square md:w-14 md:h-14 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-2xl flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                {isImportingTg ? <Loader2 size={20} className="animate-spin"/> : <CloudDownload size={20}/>}
            </button>
            <button onClick={handleSendListToTelegram} disabled={isSending || activeItems.length === 0} className="aspect-square md:w-14 md:h-14 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-2xl flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50">
                {isSending ? <Loader2 size={20} className="animate-spin"/> : <Send size={20}/>}
            </button>
        </div>

        {/* List Content */}
        <div className="space-y-6">
            {activeItems.length === 0 && completedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600 min-h-[50vh]">
                    <ShoppingBag size={48} className="mb-4 opacity-20"/>
                    <p className="font-bold text-sm uppercase tracking-widest">Список пуст</p>
                    <p className="text-xs mt-2 text-center max-w-[200px]">Нажмите +, чтобы добавить товары, или используйте голос</p>
                </div>
            ) : (
                <>
                    {/* Active Items */}
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="space-y-3"
                    >
                        {isStoreMode ? (
                            activeItems.map(item => (
                                <motion.div 
                                    variants={itemVariants}
                                    key={item.id} 
                                    onClick={() => toggleItem(item.id)} 
                                    className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[1.5rem] border border-gray-100 dark:border-white/5 shadow-sm dark:shadow-none flex items-center gap-4 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-200 dark:border-gray-600'}`}>
                                        {item.completed && <Check size={16} className="text-white" strokeWidth={4}/>}
                                    </div>
                                    <div className="flex-1">
                                        <span className={`text-lg font-bold text-[#1C1C1E] dark:text-white ${item.completed ? 'line-through text-gray-300 dark:text-gray-600' : ''}`}>{item.title}</span>
                                        <div className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-0.5">{item.amount} {item.unit}</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#2C2C2E] flex items-center justify-center text-lg shadow-sm">
                                        {categorizingIds.has(item.id) ? (
                                            <Loader2 size={16} className="animate-spin text-blue-500" />
                                        ) : (
                                            STORE_AISLES.find(a => a.id === item.category)?.icon || '📦'
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            STORE_AISLES.map(aisle => {
                                const aisleItems = activeItems.filter(i => i.category === aisle.id);
                                if (aisleItems.length === 0) return null;
                                return (
                                    <motion.div variants={itemVariants} key={aisle.id} className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none">
                                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2">
                                            <span>{aisle.icon}</span> {aisle.label}
                                        </h4>
                                        <div className="space-y-2">
                                            {aisleItems.map(item => (
                                                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                                                    <button onClick={() => toggleItem(item.id)} className="text-gray-300 dark:text-gray-600 hover:text-green-500 transition-colors">
                                                        <Circle size={20} />
                                                    </button>
                                                    <div className="flex-1" onClick={() => openEditModal(item)}>
                                                        <div className="font-bold text-sm text-[#1C1C1E] dark:text-white">{item.title}</div>
                                                        <div className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-[#2C2C2E] px-1.5 py-0.5 rounded w-fit mt-1">{item.amount} {item.unit}</div>
                                                    </div>
                                                    <button onClick={() => handleDeleteItem(item.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </motion.div>

                    {/* Completed Items */}
                    {completedItems.length > 0 && (
                        <div className="mt-8">
                            <button onClick={() => setShowCompletedHistory(!showCompletedHistory)} className="flex items-center gap-2 text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest mb-4 w-full justify-center">
                                {showCompletedHistory ? 'Скрыть купленные' : `Показать купленные (${completedItems.length})`}
                                {showCompletedHistory ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            
                            <AnimatePresence>
                            {showCompletedHistory && (
                                <motion.div 
                                    initial={{height:0, opacity:0}} 
                                    animate={{height:'auto', opacity:0.6}} 
                                    exit={{height:0, opacity:0}}
                                    className="space-y-2 overflow-hidden"
                                >
                                    {completedItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-[#1C1C1E] p-3 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => toggleItem(item.id)} className="text-green-500"><CheckCircle2 size={20}/></button>
                                                <span className="font-bold text-sm line-through text-gray-400 dark:text-gray-600">{item.title}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {onMoveToPantry && <button onClick={() => handleMoveToPantry(item)} className="p-2 bg-white dark:bg-[#2C2C2E] rounded-lg text-green-600"><Archive size={14}/></button>}
                                                <button onClick={() => handleDeleteItem(item.id)} className="p-2 bg-white dark:bg-[#2C2C2E] rounded-lg text-red-400"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            )}
        </div>

        {/* Add/Edit Modal */}
        <AnimatePresence>
            {isModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center p-0 md:p-4">
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}/>
                    <motion.div 
                        initial={{y:'100%'}} 
                        animate={{y:0}} 
                        exit={{y:'100%'}} 
                        transition={{type:"spring", damping:25, stiffness:300}} 
                        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg md:max-w-6xl md:w-[90vw] md:h-[85vh] md:rounded-[2.5rem] rounded-t-[2.5rem] p-6 shadow-2xl flex flex-col max-h-[95vh]"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-xl text-[#1C1C1E] dark:text-white">{editingItemId ? 'Изменить' : 'Добавить товар'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="bg-gray-200 dark:bg-[#2C2C2E] p-2 rounded-full text-gray-500 dark:text-white"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-4 overflow-y-auto no-scrollbar pb-20">
                            <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] shadow-sm relative">
                                <input 
                                    ref={titleInputRef}
                                    type="text" 
                                    placeholder="Название (Молоко)" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)}
                                    onBlur={() => setTimeout(autoDetectAisle, 200)}
                                    className="w-full text-lg font-bold outline-none placeholder:text-gray-300 bg-transparent dark:text-white"
                                    autoFocus
                                />
                                {suggestions.length > 0 && !editingItemId && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-xl z-20 overflow-hidden border border-gray-100 dark:border-white/5">
                                        <div className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-black/20 flex items-center gap-1">
                                            <History size={10} /> Из истории
                                        </div>
                                        {suggestions.map((suggestion) => (
                                            <div 
                                                key={suggestion.id} 
                                                onClick={() => selectSuggestion(suggestion)}
                                                className="px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer flex justify-between items-center group"
                                            >
                                                <span className="font-bold text-sm text-[#1C1C1E] dark:text-white">{suggestion.title}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-black/30 px-1.5 py-0.5 rounded">{suggestion.unit}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">{STORE_AISLES.find(a => a.id === suggestion.category)?.label}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {lastPrice !== null && (
                                    <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 dark:bg-[#2C2C2E] px-2 py-1 rounded w-fit">
                                        Последняя цена: {lastPrice} {settings.currency}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                {/* Changed background to be cleaner */}
                                <div className="flex-1 bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5">
                                    <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">Кол-во</span>
                                    <input 
                                        type="number" 
                                        inputMode="decimal" 
                                        value={amount} 
                                        onChange={e => setAmount(e.target.value)} 
                                        className="w-full font-bold outline-none bg-transparent text-[#1C1C1E] dark:text-white text-lg"
                                    />
                                </div>
                                <div className="flex-1 bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5">
                                    <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">Ед. изм.</span>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                        {UNITS.map(u => (
                                            <button key={u} onClick={() => setUnit(u)} className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${unit === u ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-400'}`}>
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] shadow-sm">
                                <span className="text-[9px] font-black text-gray-400 uppercase block mb-2">Категория</span>
                                <div className="grid grid-cols-4 gap-2">
                                    {STORE_AISLES.map(aisle => (
                                        <button 
                                            key={aisle.id} 
                                            onClick={() => setSelectedAisle(aisle.id)} 
                                            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border ${selectedAisle === aisle.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'border-transparent hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'}`}
                                        >
                                            <span className="text-xl">{aisle.icon}</span>
                                            <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400 text-center leading-tight">{aisle.label.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Session Added Items - Show items added while modal is open */}
                            {sessionAddedItems.length > 0 && !editingItemId && (
                                <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] shadow-sm border border-green-100 dark:border-green-900/20">
                                    <span className="text-[9px] font-black text-gray-400 uppercase block mb-2 flex items-center gap-1">
                                        <CheckCircle2 size={10} className="text-green-500"/> Только что добавлено:
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {sessionAddedItems.map(item => (
                                            <span key={item.id} className="text-[10px] font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-lg">
                                                {item.title}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
                            <button onClick={handleSaveItem} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-sm shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
                                <Plus size={20} />
                                {editingItemId ? 'Сохранить изменения' : 'Добавить'}
                            </button>
                            {/* Explicit close button needed since we keep it open now */}
                            {!editingItemId && (
                                <button onClick={() => setIsModalOpen(false)} className="w-full py-3 text-gray-400 font-bold text-xs uppercase tracking-widest">
                                    Готово
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

export default ShoppingList;
