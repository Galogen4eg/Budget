import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Check,
  Search,
  ChevronDown,
  Sparkles,
  Zap,
  Star,
  Share2,
  ScanLine,
  X,
  Loader2,
  Lightbulb,
  CheckCircle2,
  Milk,
  Apple,
  Sparkles as SparkleIcon,
  Beef,
  Croissant,
  Utensils,
  Coffee,
  Cookie,
  Snowflake,
  Shirt,
  Tv,
  HelpCircle,
  PackageCheck,
  Send,
  Mic,
  MicOff,
  Volume2,
  Radio,
  Sparkles as MagicIcon
} from 'lucide-react';
import { ShoppingItem, AppSettings, FamilyMember } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addItem, addItemsBatch, updateItem, deleteItem, deleteItemsBatch } from '../utils/db';
import { detectProductCategory } from '../utils/categorizer';
import { searchOnlineDatabase } from '../utils/barcodeLookup';
import { parseVoiceShoppingText, ParsedVoiceItem } from '../utils/voiceShoppingParser';
import { parseQuickShoppingInput, createShoppingItemsFromQuickText, parseSingleQuickShoppingText } from '../utils/quickShoppingParser';
import { recordPurchaseEvent, getTopFrequentPurchases, FrequentItemStat } from '../utils/frequentPurchases';
import { toast } from 'sonner';

interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onMoveToPantry: (item: ShoppingItem) => Promise<void>;
  onSendToTelegram: (items: ShoppingItem[]) => Promise<boolean>;
}

export interface DepartmentConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  bgLight: string;
  textLight: string;
  defaultPrice: number;
}

const DEPARTMENTS: DepartmentConfig[] = [
  { 
    id: 'dairy', 
    name: 'Молочные продукты и сыры', 
    icon: <Milk size={17} />, 
    bgLight: 'bg-[#C8E8D0] dark:bg-emerald-950/40', 
    textLight: 'text-[#2A6038] dark:text-emerald-400',
    defaultPrice: 120
  },
  { 
    id: 'produce', 
    name: 'Овощи, фрукты и зелень', 
    icon: <Apple size={17} />, 
    bgLight: 'bg-[#F8E0A8] dark:bg-amber-950/40', 
    textLight: 'text-[#554020] dark:text-amber-400',
    defaultPrice: 150
  },
  { 
    id: 'household', 
    name: 'Бытовая химия и аптека', 
    icon: <SparkleIcon size={17} />, 
    bgLight: 'bg-[#F0E8DB] dark:bg-stone-800', 
    textLight: 'text-[#5E5548] dark:text-stone-300',
    defaultPrice: 350
  },
  { 
    id: 'pharmacy', 
    name: 'Аптека и здоровье', 
    icon: <SparkleIcon size={17} />, 
    bgLight: 'bg-[#F0E8DB] dark:bg-stone-800', 
    textLight: 'text-[#5E5548] dark:text-stone-300',
    defaultPrice: 400
  },
  { 
    id: 'meat', 
    name: 'Мясо, птица и рыба', 
    icon: <Beef size={17} />, 
    bgLight: 'bg-[#FFDAD8] dark:bg-rose-950/40', 
    textLight: 'text-[#690005] dark:text-rose-400',
    defaultPrice: 420
  },
  { 
    id: 'bakery', 
    name: 'Хлеб и свежая выпечка', 
    icon: <Croissant size={17} />, 
    bgLight: 'bg-[#F8E0A8] dark:bg-amber-950/40', 
    textLight: 'text-[#554020] dark:text-amber-400',
    defaultPrice: 75
  },
  { 
    id: 'grocery', 
    name: 'Бакалея, крупы и паста', 
    icon: <Utensils size={17} />, 
    bgLight: 'bg-[#F0E8DB] dark:bg-stone-800', 
    textLight: 'text-[#5E5548] dark:text-stone-300',
    defaultPrice: 110
  },
  { 
    id: 'drinks', 
    name: 'Напитки, чай и кофе', 
    icon: <Coffee size={17} />, 
    bgLight: 'bg-[#D4CCBF] dark:bg-stone-700', 
    textLight: 'text-[#1E1A13] dark:text-stone-200',
    defaultPrice: 220
  },
  { 
    id: 'sweets', 
    name: 'Сладости и снеки', 
    icon: <Cookie size={17} />, 
    bgLight: 'bg-[#F8E0A8] dark:bg-amber-950/40', 
    textLight: 'text-[#554020] dark:text-amber-400',
    defaultPrice: 160
  },
  { 
    id: 'frozen', 
    name: 'Замороженные продукты', 
    icon: <Snowflake size={17} />, 
    bgLight: 'bg-[#D8F0DE] dark:bg-teal-950/40', 
    textLight: 'text-[#2A6038] dark:text-teal-400',
    defaultPrice: 280
  },
  { 
    id: 'clothes', 
    name: 'Одежда и текстиль', 
    icon: <Shirt size={17} />, 
    bgLight: 'bg-[#F0E8DB] dark:bg-stone-800', 
    textLight: 'text-[#5E5548] dark:text-stone-300',
    defaultPrice: 600
  },
  { 
    id: 'electronics', 
    name: 'Электроника и товары для дома', 
    icon: <Tv size={17} />, 
    bgLight: 'bg-[#D4CCBF] dark:bg-stone-700', 
    textLight: 'text-[#1E1A13] dark:text-stone-200',
    defaultPrice: 900
  },
  { 
    id: 'other', 
    name: 'Разное и прочие товары', 
    icon: <HelpCircle size={17} />, 
    bgLight: 'bg-[#E4E0D8] dark:bg-stone-800', 
    textLight: 'text-[#4A4E4A] dark:text-stone-300',
    defaultPrice: 150
  }
];

const QUICK_ADD_FAVORITES = [
  { title: 'Яйца СО (1 дес.)', category: 'dairy', amount: '1', unit: 'уп', price: 129 },
  { title: 'Масло сливочное 82.5%', category: 'dairy', amount: '1', unit: 'уп', price: 189 },
  { title: 'Вода негаз. 5л', category: 'drinks', amount: '1', unit: 'шт', price: 99 },
  { title: 'Кофе в зёрнах 1кг', category: 'drinks', amount: '1', unit: 'уп', price: 1150 },
  { title: 'Хлеб цельнозерновой', category: 'bakery', amount: '1', unit: 'шт', price: 68 },
  { title: 'Бананы спелые', category: 'produce', amount: '1', unit: 'кг', price: 140 }
];

const UNITS = ['шт', 'кг', 'л', 'уп', 'г'] as const;

export const ShoppingListDesktop: React.FC<ShoppingListProps> = ({
  items,
  setItems,
  settings,
  members,
  onMoveToPantry,
  onSendToTelegram
}) => {
  const { familyId, user } = useAuth();
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);

  const handleTelegramSend = async () => {
    if (isSendingTelegram) return;
    setIsSendingTelegram(true);
    try {
      if (onSendToTelegram) {
        await onSendToTelegram(items);
      }
    } finally {
      setIsSendingTelegram(false);
    }
  };
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMemberId, setFilterMemberId] = useState<string | 'all'>('all');
  const [isPurchasedOpen, setIsPurchasedOpen] = useState(true);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState<number>(1);
  const [itemUnit, setItemUnit] = useState<typeof UNITS[number]>('шт');
  const [itemCategory, setItemCategory] = useState('dairy');
  const [itemMemberId, setItemMemberId] = useState<string>('all');
  const [isUrgent, setIsUrgent] = useState(false);
  const [itemEstimatedPrice, setItemEstimatedPrice] = useState<number>(100);
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Input State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceInterim, setVoiceInterim] = useState('');
  const [parsedVoiceItems, setParsedVoiceItems] = useState<ParsedVoiceItem[]>([]);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inlineRecognitionRef = useRef<any>(null);
  const [isInlineListening, setIsInlineListening] = useState(false);

  // Quick Add Bar State
  const [quickInputText, setQuickInputText] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const [frequentTrigger, setFrequentTrigger] = useState(0);
  const dynamicFrequentPurchases = useMemo(() => {
    return getTopFrequentPurchases(8);
  }, [items, frequentTrigger]);

  const liveParsedQuickItems = useMemo(() => {
    if (!quickInputText.trim()) return [];
    return parseQuickShoppingInput(quickInputText);
  }, [quickInputText]);

  // Duplicate Check for Auto-Summing
  const duplicateItem = useMemo(() => {
    if (!itemName.trim() || editingItem) return null;
    const clean = itemName.trim().toLowerCase();
    return items.find(
      i => !i.completed && i.title.toLowerCase() === clean
    );
  }, [itemName, items, editingItem]);

  // Auto-detect category & amount when typing name in modal
  useEffect(() => {
    if (itemName.trim() && !editingItem) {
      // Check if user wrote quantity/unit inside modal input (e.g. "чипсы 2 шт")
      const parsed = parseSingleQuickShoppingText(itemName);
      if (parsed) {
        if (parsed.amount && parsed.amount !== '1') {
          setItemAmount(parseFloat(parsed.amount) || 1);
        }
        if (parsed.unit) {
          setItemUnit(parsed.unit as any);
        }
        if (parsed.category && parsed.category !== 'other') {
          setItemCategory(parsed.category);
        }
      } else {
        const detected = detectProductCategory(itemName);
        if (detected && detected !== 'other') {
          setItemCategory(detected);
        }
      }

      const currentCat = parsed?.category || itemCategory;
      const dept = DEPARTMENTS.find(d => d.id === currentCat);
      if (dept) {
        setItemEstimatedPrice(dept.defaultPrice);
      }
    }
  }, [itemName, editingItem]);

  // Filtered lists
  const filteredActiveItems = useMemo(() => {
    return items.filter(item => {
      if (item.completed) return false;
      if (filterMemberId !== 'all' && item.memberId && item.memberId !== filterMemberId) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(query) || (item.category && item.category.toLowerCase().includes(query));
      }
      return true;
    });
  }, [items, filterMemberId, searchQuery]);

  const completedItems = useMemo(() => {
    return items.filter(item => {
      if (!item.completed) return false;
      if (filterMemberId !== 'all' && item.memberId && item.memberId !== filterMemberId) {
        return false;
      }
      if (searchQuery.trim()) {
        return item.title.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [items, filterMemberId, searchQuery]);

  // Group active items by department
  const groupedDepartments = useMemo(() => {
    const groups: { dept: DepartmentConfig; items: ShoppingItem[]; totalCost: number }[] = [];

    DEPARTMENTS.forEach(dept => {
      const deptItems = filteredActiveItems.filter(i => (i.category || 'other') === dept.id);
      if (deptItems.length > 0) {
        const totalCost = deptItems.reduce((sum, item) => {
          const qty = parseFloat(item.amount || '1') || 1;
          const price = item.estimatedPrice || dept.defaultPrice;
          return sum + (qty * price);
        }, 0);

        groups.push({
          dept,
          items: deptItems,
          totalCost
        });
      }
    });

    return groups;
  }, [filteredActiveItems]);

  const totalItemsCount = items.length;
  const completedCount = items.filter(i => i.completed).length;

  const openAddModal = (initialTitle = '') => {
    setEditingItem(null);
    setItemName(initialTitle);
    setItemAmount(1);
    setItemUnit('шт');
    setItemCategory('dairy');
    setItemMemberId(members[0]?.id || 'all');
    setIsUrgent(false);
    setItemEstimatedPrice(120);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ShoppingItem) => {
    setEditingItem(item);
    setItemName(item.title);
    setItemAmount(parseFloat(item.amount || '1') || 1);
    setItemUnit((item.unit as any) || 'шт');
    setItemCategory(item.category || 'dairy');
    setItemMemberId(item.memberId || 'all');
    setIsUrgent(item.priority === 'high');
    setItemEstimatedPrice(item.estimatedPrice || 100);
    setIsModalOpen(true);
  };

  const handleToggleComplete = async (item: ShoppingItem) => {
    const updated = { ...item, completed: !item.completed };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    if (familyId) await updateItem(familyId, 'shopping', item.id, { completed: updated.completed });
    
    // Record event in frequent purchases engine
    recordPurchaseEvent(
      item.title, 
      updated.completed ? 'completed' : 'restored',
      { category: item.category, amount: item.amount, unit: item.unit, price: item.estimatedPrice }
    );
    setFrequentTrigger(prev => prev + 1);

    toast.success(updated.completed ? `Куплено: ${item.title}` : `Возвращено в список: ${item.title}`);
  };

  const handleUpdateAmount = async (item: ShoppingItem, delta: number) => {
    const currentAmount = parseFloat(item.amount || '1') || 1;
    const newAmount = Math.max(0.5, Math.round((currentAmount + delta) * 10) / 10);
    const updated = { ...item, amount: String(newAmount) };
    
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    if (familyId) await updateItem(familyId, 'shopping', item.id, { amount: String(newAmount) });
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems(prev => prev.filter(i => i.id !== id));
    if (familyId) await deleteItem(familyId, 'shopping', id);
    toast.info('Товар удален из списка');
  };

  const handleClearCompleted = async () => {
    const completedIds = items.filter(i => i.completed).map(i => i.id);
    if (completedIds.length === 0) {
      toast.info('Нет купленных товаров для удаления');
      return;
    }

    setItems(prev => prev.filter(i => !i.completed));
    if (familyId) {
      await deleteItemsBatch(familyId, 'shopping', completedIds);
    }
    toast.success(`Удалено ${completedIds.length} купленных товаров`);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickInputText.trim();
    if (!raw || isSubmittingQuick) return;

    try {
      setIsSubmittingQuick(true);
      const targetMemberId = filterMemberId === 'all' ? (members[0]?.id || user?.uid || 'user') : filterMemberId;
      const newItems = createShoppingItemsFromQuickText(raw, targetMemberId);
      if (newItems.length === 0) return;

      // Record added events for frequent purchases
      newItems.forEach(ni => {
        recordPurchaseEvent(ni.title, 'added', { category: ni.category, amount: ni.amount, unit: ni.unit, price: ni.estimatedPrice });
      });
      setFrequentTrigger(prev => prev + 1);

      if (familyId) {
        if (newItems.length === 1) {
          const saved = await addItem(familyId, 'shopping', newItems[0]);
          setItems(prev => [saved, ...prev]);
        } else {
          const savedBatch = await addItemsBatch(familyId, 'shopping', newItems);
          setItems(prev => [...savedBatch, ...prev]);
        }
      } else {
        const localItems: ShoppingItem[] = newItems.map(item => ({
          ...item,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 6)
        }));
        setItems(prev => [...localItems, ...prev]);
      }

      if (newItems.length === 1) {
        toast.success(`Добавлено: ${newItems[0].title} (${newItems[0].amount} ${newItems[0].unit})`);
      } else {
        toast.success(`Добавлено ${newItems.length} товаров в список`);
      }

      setQuickInputText('');
    } catch (err) {
      console.error('Quick add error:', err);
      toast.error('Не удалось добавить товар');
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleQuickAddFavorite = async (fav: FrequentItemStat) => {
    recordPurchaseEvent(fav.title, 'added', { category: fav.category, amount: fav.amount, unit: fav.unit, price: fav.price });
    setFrequentTrigger(prev => prev + 1);

    // Check if item already exists
    const existing = items.find(i => !i.completed && i.title.toLowerCase() === fav.title.toLowerCase());
    if (existing) {
      const currentQty = parseFloat(existing.amount || '1') || 1;
      const addQty = parseFloat(fav.amount) || 1;
      const newQty = currentQty + addQty;
      const updated = { ...existing, amount: String(newQty) };
      setItems(prev => prev.map(i => i.id === existing.id ? updated : i));
      if (familyId) await updateItem(familyId, 'shopping', existing.id, { amount: String(newQty) });
      toast.success(`Количество «${fav.title}» увеличено до ${newQty} ${existing.unit}`);
    } else {
      const newItem: ShoppingItem = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        title: fav.title,
        amount: fav.amount,
        unit: fav.unit as any,
        category: fav.category,
        estimatedPrice: fav.price,
        completed: false,
        memberId: members[0]?.id || user?.uid || 'user',
        priority: 'medium'
      };
      setItems(prev => [newItem, ...prev]);
      if (familyId) await addItem(familyId, 'shopping', newItem);
      toast.success(`Добавлено: ${fav.title}`);
    }
  };

  const handleSaveModal = async (shouldMerge = false) => {
    if (!itemName.trim()) return;

    recordPurchaseEvent(itemName.trim(), 'added', { category: itemCategory, amount: String(itemAmount), unit: itemUnit, price: itemEstimatedPrice });
    setFrequentTrigger(prev => prev + 1);

    if (editingItem) {
      const updated: ShoppingItem = {
        ...editingItem,
        title: itemName.trim(),
        amount: String(itemAmount),
        unit: itemUnit,
        category: itemCategory,
        memberId: itemMemberId === 'all' ? (members[0]?.id || 'user') : itemMemberId,
        priority: isUrgent ? 'high' : 'medium',
        estimatedPrice: itemEstimatedPrice
      };

      setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
      if (familyId) await updateItem(familyId, 'shopping', editingItem.id, updated);
      toast.success('Товар обновлен');
    } else if (duplicateItem && shouldMerge) {
      // Auto-summing logic
      const currentQty = parseFloat(duplicateItem.amount || '1') || 1;
      const mergedQty = currentQty + itemAmount;
      const updated = {
        ...duplicateItem,
        amount: String(mergedQty),
        priority: isUrgent ? 'high' : duplicateItem.priority
      };

      setItems(prev => prev.map(i => i.id === duplicateItem.id ? updated : i));
      if (familyId) await updateItem(familyId, 'shopping', duplicateItem.id, { amount: String(mergedQty) });
      toast.success(`Суммировано: ${duplicateItem.title} (${mergedQty} ${duplicateItem.unit})`);
    } else {
      const newItem: ShoppingItem = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        title: itemName.trim(),
        amount: String(itemAmount),
        unit: itemUnit,
        category: itemCategory,
        memberId: itemMemberId === 'all' ? (members[0]?.id || 'user') : itemMemberId,
        priority: isUrgent ? 'high' : 'medium',
        estimatedPrice: itemEstimatedPrice,
        completed: false
      };

      setItems(prev => [newItem, ...prev]);
      if (familyId) await addItem(familyId, 'shopping', newItem);
      toast.success(`Добавлено: ${newItem.title}`);
    }

    setIsModalOpen(false);
  };

  const handleBarcodeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            openAddModal(product.title);
            setItemAmount(parseFloat(product.amount || '1') || 1);
            setItemUnit(product.unit as any || 'шт');
            setItemCategory(product.category || 'dairy');
            toast.success(`Штрихкод найден: ${product.title}`);
          } else {
            toast.info(`Код ${code} распознан. Введите название.`);
            openAddModal();
          }
        } else {
          toast.error('Штрихкод на изображении не найден');
        }
      } else {
        toast.info('Сканер штрихкодов не поддерживается, откройте ручной ввод');
        openAddModal();
      }
    } catch (err) {
      console.error(err);
      toast.error('Не удалось отсканировать изображение');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Voice Input Logic
  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Голосовой ввод не поддерживается в этом браузере. Рекомендуем использовать Chrome, Safari или Edge.');
      return;
    }

    if (isVoiceListening) {
      stopVoiceRecording();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'ru-RU';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      setVoiceTranscript('');
      setVoiceInterim('');
      setParsedVoiceItems([]);
      setIsVoiceModalOpen(true);
      setIsVoiceListening(true);

      recognition.onstart = () => {
        setIsVoiceListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }

        setVoiceTranscript(finalStr);
        setVoiceInterim(interimStr);

        const currentFullText = (finalStr + ' ' + interimStr).trim();
        if (currentFullText) {
          const parsed = parseVoiceShoppingText(currentFullText);
          setParsedVoiceItems(parsed);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Доступ к микрофону заблокирован. Пожалуйста, разрешите микрофон в браузере.');
          setIsVoiceListening(false);
          setIsVoiceModalOpen(false);
        }
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      toast.error('Не удалось запустить микрофон');
      setIsVoiceListening(false);
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsVoiceListening(false);
  };

  const handleApplyVoiceItems = async () => {
    stopVoiceRecording();
    if (parsedVoiceItems.length === 0) {
      toast.info('Товары для добавления не распознаны. Попробуйте сказать, например: «Молоко 2 литра, хлеб и десяток яиц»');
      return;
    }

    setIsVoiceProcessing(true);
    try {
      const itemsToAdd: ShoppingItem[] = [];
      const updatedExistingItems: ShoppingItem[] = [...items];

      for (const parsed of parsedVoiceItems) {
        const cleanTitle = parsed.title.trim();
        const existingIdx = updatedExistingItems.findIndex(
          i => !i.completed && i.title.toLowerCase() === cleanTitle.toLowerCase()
        );

        if (existingIdx >= 0) {
          // Auto-summing with existing active shopping item
          const existing = updatedExistingItems[existingIdx];
          const curQty = parseFloat(existing.amount || '1') || 1;
          const addQty = parseFloat(parsed.amount || '1') || 1;
          const newQty = curQty + addQty;
          const updated = { ...existing, amount: String(newQty) };
          updatedExistingItems[existingIdx] = updated;
          if (familyId) await updateItem(familyId, 'shopping', existing.id, { amount: String(newQty) });
        } else {
          const newItem: ShoppingItem = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            title: parsed.title,
            amount: parsed.amount,
            unit: parsed.unit,
            category: parsed.category,
            estimatedPrice: parsed.estimatedPrice,
            completed: false,
            memberId: filterMemberId !== 'all' ? filterMemberId : (members[0]?.id || 'all'),
            priority: 'medium'
          };
          itemsToAdd.push(newItem);
        }
      }

      if (itemsToAdd.length > 0) {
        setItems(prev => [...itemsToAdd, ...prev]);
        if (familyId) {
          await addItemsBatch(familyId, 'shopping', itemsToAdd);
        }
      } else {
        setItems(updatedExistingItems);
      }

      toast.success(`Добавлено голосом (${parsedVoiceItems.length}): ${parsedVoiceItems.map(p => `${p.title} ${p.amount} ${p.unit}`).join(', ')}`);
      setIsVoiceModalOpen(false);
      setVoiceTranscript('');
      setVoiceInterim('');
      setParsedVoiceItems([]);
    } catch (err) {
      console.error('Error applying voice items:', err);
      toast.error('Произошла ошибка при сохранении голосового списка');
    } finally {
      setIsVoiceProcessing(false);
    }
  };

  const handleRemoveParsedVoiceItem = (index: number) => {
    setParsedVoiceItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const startInlineModalDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Голосовой ввод не поддерживается в этом браузере.');
      return;
    }

    if (isInlineListening) {
      if (inlineRecognitionRef.current) inlineRecognitionRef.current.stop();
      setIsInlineListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      inlineRecognitionRef.current = recognition;
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = true;

      setIsInlineListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const parsed = parseVoiceShoppingText(transcript);
          if (parsed.length > 0) {
            setItemName(parsed[0].title);
            setItemAmount(parseFloat(parsed[0].amount) || 1);
            setItemUnit(parsed[0].unit);
            setItemCategory(parsed[0].category);
          } else {
            setItemName(transcript.charAt(0).toUpperCase() + transcript.slice(1));
          }
        }
      };

      recognition.onerror = () => {
        setIsInlineListening(false);
      };

      recognition.onend = () => {
        setIsInlineListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsInlineListening(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-[#FAF6F0] dark:bg-[#121214] text-[#2E3230] dark:text-stone-100 font-sans p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-20">
        
        {/* Top Header & Summary */}
        <header className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#2E3230] dark:text-white tracking-tight">
                  Список покупок
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8E8D0] dark:bg-emerald-950/40 text-[#2A6038] dark:text-emerald-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse" />
                  {totalItemsCount - completedCount} в списке · {completedCount} куплено
                </span>
              </div>
              <p className="text-sm text-[#4A4E4A] dark:text-stone-400 font-medium">
                Синхронизировано онлайн с корзинами {members.map(m => m.name).join(' и ')}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleBarcodeFileChange} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E4E0D8] dark:bg-stone-800 text-[#2E3230] dark:text-stone-200 text-sm font-semibold hover:bg-[#D5CDC2] dark:hover:bg-stone-700 transition shadow-xs cursor-pointer"
              >
                {isScanning ? <Loader2 size={18} className="animate-spin text-[#705C30]" /> : <ScanLine size={18} className="text-[#705C30]" />}
                <span>Сканировать чек</span>
              </button>

              <button 
                onClick={startVoiceRecording}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer border ${
                  isVoiceListening
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 shadow-rose-200/50 dark:shadow-none'
                    : 'bg-[#EBF4EE] hover:bg-[#DDF0E3] dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-[#2A6038] dark:text-emerald-400 border-[#C8E8D0] dark:border-emerald-800/40'
                }`}
                title="Записать список покупок голосом"
              >
                {isVoiceListening ? (
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 items-center justify-center text-white">
                      <Mic size={11} strokeWidth={3} />
                    </span>
                  </span>
                ) : (
                  <Mic size={18} className="text-[#2A6038] dark:text-emerald-400" />
                )}
                <span>{isVoiceListening ? 'Запись...' : 'Голосом'}</span>
              </button>

              <button 
                onClick={handleTelegramSend}
                disabled={isSendingTelegram}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2AABEE]/15 hover:bg-[#2AABEE]/25 dark:bg-[#2AABEE]/25 dark:hover:bg-[#2AABEE]/35 text-[#0088CC] dark:text-[#38B9FF] text-sm font-semibold transition shadow-xs cursor-pointer border border-[#2AABEE]/30 active:scale-95"
                title="Отправить актуальный список покупок в семейный Telegram чат"
              >
                {isSendingTelegram ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                <span>В Telegram</span>
              </button>

              <button 
                onClick={() => openAddModal()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3D694B] text-white text-sm font-semibold transition shadow-md shadow-[#4A7C59]/25 active:scale-95 cursor-pointer group"
              >
                <Plus size={19} strokeWidth={2.5} className="transition-transform group-hover:rotate-90" />
                <span>Добавить товар</span>
              </button>
            </div>
          </div>

          {/* Filters & Segmented Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#F5F1EA] dark:bg-[#1C1C1E] p-3.5 rounded-2xl border border-[#ECE5DB] dark:border-white/5">
            {/* Quick search filter within list */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#74796E] dark:text-stone-400" size={17} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Быстрый поиск в списке..."
                className="w-full pl-9 pr-9 py-1.5 rounded-xl bg-white dark:bg-[#252528] text-xs text-[#2E3230] dark:text-white placeholder-[#74796E] outline-none focus:ring-1 focus:ring-[#4A7C59] shadow-2xs border border-[#ECE5DB]/60 dark:border-transparent"
              />
              <button
                onClick={startVoiceRecording}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#74796E] hover:text-[#4A7C59] dark:text-stone-400 dark:hover:text-emerald-400 p-1 rounded-md transition cursor-pointer"
                title="Надиктовать список голосом"
              >
                <Mic size={14} />
              </button>
            </div>

            {/* Family Member Filter & View Toggles */}
            <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
              <div className="flex items-center gap-1 bg-[#E4E0D8] dark:bg-stone-800 px-2 py-1 rounded-xl text-xs">
                <button 
                  onClick={() => setFilterMemberId('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                    filterMemberId === 'all' 
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#2E3230] dark:text-white font-bold shadow-2xs' 
                      : 'text-[#4A4E4A] dark:text-stone-400 hover:text-[#2E3230] font-medium'
                  }`}
                >
                  Все
                </button>

                {members.map(m => {
                  const isSelected = filterMemberId === m.id;
                  const isGala = m.name.toLowerCase().includes('гал');
                  const dotClass = isGala ? 'bg-[#D97763]' : 'bg-[#E5A642]';
                  return (
                    <button 
                      key={m.id}
                      onClick={() => setFilterMemberId(isSelected ? 'all' : m.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected 
                          ? 'bg-white dark:bg-[#2C2C2E] text-[#2E3230] dark:text-white font-bold shadow-2xs' 
                          : 'text-[#4A4E4A] dark:text-stone-400 hover:text-[#2E3230] font-medium'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                      <span>{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          
          {/* Main Left Area: Categories & Items Checklist */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full min-w-0">
            
            {/* Smart Quick Add Bar (Terra styled) */}
            <div className="w-full min-w-0 bg-white dark:bg-[#1C1C1E] p-3.5 sm:p-4 rounded-2xl border border-[#ECE5DB] dark:border-white/5 shadow-xs overflow-hidden transition-all">
              <form onSubmit={handleQuickAddSubmit} className="flex flex-col gap-2.5 w-full min-w-0">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#4A4E4A] dark:text-stone-300 flex items-center gap-1.5 shrink-0">
                    <Sparkles size={14} className="text-[#4A7C59] dark:text-emerald-400 shrink-0" />
                    <span>Быстрое добавление</span>
                  </label>
                  <span className="text-[11px] text-[#74796E] dark:text-stone-400 truncate hidden md:inline min-w-0">
                    Например: <span className="text-[#4A7C59] dark:text-emerald-400 font-semibold">чипсы 2 шт, молоко 1.5 л, сыр 300г</span>
                  </span>
                </div>

                <div className="relative flex items-center w-full min-w-0">
                  <input 
                    type="text"
                    value={quickInputText}
                    onChange={(e) => setQuickInputText(e.target.value)}
                    placeholder="Введите товары (чипсы 2 шт, бананы 1 кг, хлеб)..."
                    className="w-full min-w-0 bg-[#FAF8F5] dark:bg-[#252528] border border-[#ECE5DB] dark:border-white/10 rounded-xl text-xs sm:text-sm font-medium text-[#2E3230] dark:text-white placeholder-[#74796E] py-2.5 sm:py-3 pl-3.5 sm:pl-4 pr-11 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/40 focus:bg-white dark:focus:bg-[#2C2C2E] transition"
                  />
                  <button 
                    type="submit"
                    disabled={!quickInputText.trim() || isSubmittingQuick}
                    className="absolute right-1.5 sm:right-2 p-1.5 sm:p-2 bg-[#4A7C59] hover:bg-[#3D694B] text-white rounded-lg transition disabled:opacity-40 cursor-pointer shadow-xs active:scale-95 flex items-center justify-center shrink-0"
                    title="Добавить в список"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Live Parsed Preview Chips */}
                {liveParsedQuickItems.length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-0.5 animate-in fade-in duration-150 min-w-0 overflow-hidden">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 shrink-0">Будет добавлено:</span>
                    {liveParsedQuickItems.map((pi, idx) => {
                      const dept = DEPARTMENTS.find(d => d.id === pi.category) || DEPARTMENTS[DEPARTMENTS.length - 1];
                      return (
                        <div 
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EDF4EF] dark:bg-[#203425] text-[#2A6038] dark:text-emerald-300 border border-[#D1DBD1] dark:border-green-800/40 text-xs font-semibold shadow-2xs max-w-full truncate"
                        >
                          <span className="truncate">{pi.title}</span>
                          <span className="font-mono bg-white/80 dark:bg-black/30 px-1.5 py-0.2 rounded text-[11px] text-[#1E1A13] dark:text-white shrink-0">
                            {pi.amount} {pi.unit}
                          </span>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal shrink-0">
                            ({dept.name.split(' ')[0]})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </form>
            </div>
            
            {groupedDepartments.length > 0 ? (
              groupedDepartments.map(({ dept, items: deptItems }) => (
                <section key={dept.id} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg ${dept.bgLight} ${dept.textLight} flex items-center justify-center shrink-0`}>
                        {dept.icon}
                      </div>
                      <h2 className="font-serif font-bold text-base text-[#2E3230] dark:text-white">
                        {dept.name}
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#E4E0D8] dark:bg-stone-800 text-[#4A4E4A] dark:text-stone-300 font-medium">
                        {deptItems.length} {deptItems.length === 1 ? 'позиция' : deptItems.length >= 2 && deptItems.length <= 4 ? 'позиции' : 'позиций'}
                      </span>
                    </div>
                  </div>

                  {/* Department Item Rows */}
                  <div className="flex flex-col gap-2">
                    {deptItems.map((item) => {
                      const assignedMember = members.find(m => m.id === item.memberId);
                      const isGala = assignedMember?.name.toLowerCase().includes('гал');
                      const avatarBg = isGala ? 'bg-[#F0E8DB] text-[#5E5548]' : 'bg-[#F8E0A8] text-[#221A05]';

                      return (
                        <div 
                          key={item.id}
                          className="group relative flex items-center justify-between p-3.5 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xs hover:shadow-md border border-[#ECE5DB] dark:border-white/5 transition-all"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Custom checkmark */}
                            <label className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-[#F5F1EA] dark:bg-stone-800 cursor-pointer transition-colors hover:bg-[#4A7C59]/20 shrink-0">
                              <input 
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleToggleComplete(item)}
                                className="peer sr-only"
                              />
                              <span className="material-symbols-outlined text-transparent peer-checked:text-white peer-checked:bg-[#4A7C59] w-6 h-6 rounded-lg text-sm flex items-center justify-center transition-all">
                                <Check size={14} strokeWidth={3} />
                              </span>
                            </label>

                            <div 
                              className="flex flex-col min-w-0 cursor-pointer"
                              onClick={() => openEditModal(item)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-[#2E3230] dark:text-white truncate">
                                  {item.title}
                                </span>
                                {item.priority === 'high' && (
                                  <span className="px-2 py-0.5 rounded-md bg-[#F8E0A8] dark:bg-amber-950/40 text-[#554020] dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                    <Zap size={11} className="text-[#705C30]" /> Срочно
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-[#4A4E4A] dark:text-stone-400 mt-0.5">
                                <span className="flex items-center gap-1 text-[11px]">
                                  <span className={`w-4 h-4 rounded-full ${avatarBg} text-[9px] flex items-center justify-center font-bold`}>
                                    {assignedMember?.name.slice(0, 2) || 'Сем'}
                                  </span>
                                  <span>{assignedMember?.name || 'Вся семья'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stepper & Actions */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center bg-[#F5F1EA] dark:bg-stone-800 rounded-xl px-1.5 py-1">
                              <button 
                                onClick={() => handleUpdateAmount(item, -1)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-stone-700 hover:bg-[#E4E0D8] text-[#2E3230] dark:text-white flex items-center justify-center transition text-xs font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-3 text-xs font-bold text-[#2E3230] dark:text-white font-mono whitespace-nowrap">
                                {item.amount || '1'} {item.unit || 'шт'}
                              </span>
                              <button 
                                onClick={() => handleUpdateAmount(item, 1)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-stone-700 hover:bg-[#E4E0D8] text-[#2E3230] dark:text-white flex items-center justify-center transition text-xs font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <button 
                              onClick={(e) => handleDeleteItem(e, item.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#74796E] hover:text-[#B83230] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                              title="Удалить товар"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            ) : (
              <div className="p-12 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-dashed border-[#ECE5DB] dark:border-white/10 text-center flex flex-col items-center justify-center gap-3">
                <PackageCheck size={40} className="text-[#4A7C59] opacity-70" />
                <h3 className="font-serif text-lg font-bold text-[#2E3230] dark:text-white">Все товары куплены!</h3>
                <p className="text-xs text-[#74796E] max-w-sm">
                  Список пуст. Вы можете добавить новые продукты вручную или выбрать из частых покупок справа.
                </p>
                <button 
                  onClick={() => openAddModal()}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#4A7C59] text-white text-xs font-bold shadow-xs hover:bg-[#3D694B] transition cursor-pointer"
                >
                  + Добавить первый товар
                </button>
              </div>
            )}

            {/* Completed Section (Collapsible Accordion) */}
            {completedItems.length > 0 && (
              <section className="mt-4 bg-[#F5F1EA]/80 dark:bg-stone-900/60 rounded-2xl p-4 flex flex-col gap-3 border border-[#ECE5DB] dark:border-white/5">
                <div 
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setIsPurchasedOpen(prev => !prev)}
                >
                  <div className="flex items-center gap-2 text-[#4A4E4A] dark:text-stone-300">
                    <ChevronDown size={18} className={`transition-transform duration-200 ${isPurchasedOpen ? 'rotate-180' : ''}`} />
                    <span className="font-serif font-bold text-sm">Уже куплено в этот раз</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#E4E0D8] dark:bg-stone-800 text-xs font-bold text-[#4A7C59] dark:text-emerald-400">
                      {completedItems.length}
                    </span>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearCompleted();
                    }}
                    className="text-xs text-[#B83230] hover:underline font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Очистить купленные</span>
                  </button>
                </div>

                {/* Purchased items list */}
                {isPurchasedOpen && (
                  <div className="flex flex-col gap-2 pt-2 animate-in fade-in duration-200">
                    {completedItems.map(item => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-[#1C1C1E]/60 opacity-60 hover:opacity-100 transition border border-[#ECE5DB]/60 dark:border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleToggleComplete(item)}
                            className="w-5 h-5 rounded-md bg-[#4A7C59] text-white flex items-center justify-center cursor-pointer hover:bg-rose-500 transition"
                            title="Вернуть в список"
                          >
                            <Check size={13} strokeWidth={3} />
                          </button>
                          <span className="line-through text-xs font-medium text-[#2E3230] dark:text-stone-300">
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#74796E]">
                          <span>{item.amount || '1'} {item.unit || 'шт'}</span>
                          <button 
                            onClick={(e) => handleDeleteItem(e, item.id)}
                            className="text-stone-400 hover:text-red-500 p-1 cursor-pointer"
                            title="Удалить навсегда"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

          </div>

          {/* Right Column: Smart Summary, Quick Favorites & Sync */}
          <div className="lg:col-span-4 flex flex-col gap-6 shrink-0">
            
            {/* Quick Add Templates (Dynamic Family Favorites) */}
            <div className="p-6 rounded-2xl bg-[#F5F1EA] dark:bg-[#1C1C1E] border border-[#ECE5DB] dark:border-white/5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-[#2E3230] dark:text-white flex items-center gap-1.5">
                  <Star size={16} className="text-[#705C30] fill-[#705C30]" />
                  Частые покупки семьи
                </span>
                <span className="text-xs text-[#705C30] font-bold">Быстрый +</span>
              </div>
              <p className="text-xs text-[#4A4E4A] dark:text-stone-400 leading-relaxed">
                Формируется на основе купленных, добавленных и возвращенных товаров:
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {dynamicFrequentPurchases.map((fav, i) => (
                  <button 
                    key={i}
                    onClick={() => handleQuickAddFavorite(fav)}
                    title={`Добавлено/куплено: ${fav.frequencyLabel}. Нажмите для добавления в список`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#252528] hover:bg-[#E4E0D8] dark:hover:bg-stone-700 text-xs font-semibold text-[#2E3230] dark:text-stone-200 border border-[#ECE5DB] dark:border-white/5 shadow-2xs transition group cursor-pointer"
                  >
                    <span>{fav.title}</span>
                    <span className="text-[10px] text-[#705C30] dark:text-amber-300/80 font-mono bg-[#F0ECE4] dark:bg-stone-800 px-1.5 py-0.5 rounded-md">
                      {fav.frequencyLabel}
                    </span>
                    <Plus size={14} className="text-[#4A7C59] group-hover:scale-125 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

            {/* Category Stats Box */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#ECE5DB] dark:border-white/5 shadow-xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#74796E] block">
                Отделы в корзине
              </span>
              <div className="space-y-2">
                {groupedDepartments.map(({ dept, items: dItems }) => (
                  <div key={dept.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                      <span className="text-[#2E3230] dark:text-stone-300 font-medium truncate max-w-[180px]">{dept.name}</span>
                    </div>
                    <span className="text-[#4A7C59] dark:text-emerald-400 font-bold font-mono">{dItems.length} поз.</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Interactive Add/Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#FAF6F0] dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-[#ECE5DB] dark:border-white/10 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#F5F1EA] dark:bg-stone-900 flex items-center justify-between border-b border-[#ECE5DB] dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#4A7C59] flex items-center justify-center text-white shadow-xs">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2E3230] dark:text-white">
                    {editingItem ? 'Редактировать товар' : 'Добавить в список покупок'}
                  </h3>
                  <p className="text-xs text-[#74796E]">
                    Автоматическое определение отдела и умное суммирование
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#74796E] hover:bg-[#E4E0D8] dark:hover:bg-stone-800 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto no-scrollbar">
              
              {/* Item Name Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#4A4E4A] dark:text-stone-300">
                    Наименование товара
                  </label>
                  <button
                    type="button"
                    onClick={startInlineModalDictation}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isInlineListening 
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                        : 'bg-[#ECE5DB] dark:bg-stone-800 text-[#4A4E4A] dark:text-stone-300 hover:text-[#4A7C59]'
                    }`}
                    title="Надиктовать голосом (например: «Сыр маасдам 300 грамм»)"
                  >
                    <Mic size={13} />
                    <span>{isInlineListening ? 'Слушаю...' : 'Сказать голосом'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Например: Сыр маасдам, Хлеб, Яблоки..."
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#252528] text-sm font-semibold text-[#2E3230] dark:text-white placeholder-[#74796E] border border-[#ECE5DB] dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                    autoFocus
                  />
                </div>
              </div>

              {/* Smart Auto-Summing Alert Banner */}
              {duplicateItem && (
                <div className="p-4 rounded-xl bg-[#F8E0A8] dark:bg-amber-950/40 text-[#221A05] dark:text-amber-200 flex flex-col gap-2.5 border border-amber-300/40">
                  <div className="flex items-start gap-2.5">
                    <Lightbulb size={20} className="text-[#705C30] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-xs">
                        Такой товар уже есть в корзине: {duplicateItem.title} ({duplicateItem.amount} {duplicateItem.unit})
                      </span>
                      <p className="text-xs text-[#554020] dark:text-amber-300/90 leading-relaxed">
                        При добавлении ещё {itemAmount} {itemUnit} общее количество будет увеличено до <strong className="font-bold">{(parseFloat(duplicateItem.amount || '1') || 1) + itemAmount} {duplicateItem.unit}</strong> без дублирования строки!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-7">
                    <button 
                      onClick={() => handleSaveModal(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#705C30] text-white text-xs font-bold shadow-xs hover:bg-[#554020] transition cursor-pointer"
                    >
                      Суммировать (будет {(parseFloat(duplicateItem.amount || '1') || 1) + itemAmount} {duplicateItem.unit})
                    </button>
                    <button 
                      onClick={() => handleSaveModal(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/70 dark:bg-stone-800 text-[#2E3230] dark:text-stone-200 text-xs font-medium hover:bg-white transition cursor-pointer"
                    >
                      Отдельной позицией
                    </button>
                  </div>
                </div>
              )}

              {/* Quantity Stepper & Unit Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A4E4A] dark:text-stone-300">
                    Количество
                  </span>
                  <div className="flex items-center bg-white dark:bg-[#252528] rounded-xl p-1 border border-[#ECE5DB] dark:border-white/5">
                    <button 
                      onClick={() => setItemAmount(prev => Math.max(0.5, prev - (prev <= 1 ? 0.5 : 1)))}
                      className="w-9 h-9 rounded-lg bg-[#F5F1EA] dark:bg-stone-700 flex items-center justify-center text-[#2E3230] dark:text-white hover:bg-[#E4E0D8] transition font-bold text-base cursor-pointer"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={itemAmount}
                      onChange={(e) => setItemAmount(Math.max(0.5, parseFloat(e.target.value) || 1))}
                      className="w-full text-center bg-transparent font-serif font-bold text-base text-[#2E3230] dark:text-white outline-none"
                    />
                    <button 
                      onClick={() => setItemAmount(prev => prev + 1)}
                      className="w-9 h-9 rounded-lg bg-[#F5F1EA] dark:bg-stone-700 flex items-center justify-center text-[#2E3230] dark:text-white hover:bg-[#E4E0D8] transition font-bold text-base cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Unit Selector Segment */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A4E4A] dark:text-stone-300">
                    Единица измерения
                  </span>
                  <div className="flex items-center gap-1 bg-white dark:bg-[#252528] p-1 rounded-xl border border-[#ECE5DB] dark:border-white/5">
                    {UNITS.map(u => (
                      <button 
                        key={u}
                        onClick={() => setItemUnit(u)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                          itemUnit === u 
                            ? 'bg-[#4A7C59] text-white shadow-xs' 
                            : 'text-[#74796E] hover:text-[#2E3230] hover:bg-[#F5F1EA] dark:hover:bg-stone-700'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Department selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#4A4E4A] dark:text-stone-300">
                  Отдел / Категория
                </label>
                <div className="relative">
                  <select 
                    value={itemCategory}
                    onChange={(e) => {
                      setItemCategory(e.target.value);
                      const dept = DEPARTMENTS.find(d => d.id === e.target.value);
                      if (dept) setItemEstimatedPrice(dept.defaultPrice);
                    }}
                    className="w-full appearance-none px-4 py-3 rounded-xl bg-white dark:bg-[#252528] text-xs font-semibold text-[#2E3230] dark:text-white outline-none border border-[#ECE5DB] dark:border-white/5 focus:ring-1 focus:ring-[#4A7C59] cursor-pointer"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={17} />
                </div>
              </div>

              {/* Assignee & Urgent Priority */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A4E4A] dark:text-stone-300">
                    Кто покупает
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setItemMemberId('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        itemMemberId === 'all' 
                          ? 'bg-white dark:bg-stone-700 border border-[#4A7C59] text-[#2E3230] dark:text-white shadow-xs' 
                          : 'bg-[#F5F1EA] dark:bg-stone-800 text-[#74796E] hover:bg-[#E4E0D8]'
                      }`}
                    >
                      Кто первый в магазине
                    </button>
                    {members.map(m => {
                      const isSelected = itemMemberId === m.id;
                      const isGala = m.name.toLowerCase().includes('гал');
                      return (
                        <button 
                          key={m.id}
                          onClick={() => setItemMemberId(m.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            isSelected 
                              ? 'bg-white dark:bg-stone-700 border border-[#4A7C59] text-[#2E3230] dark:text-white shadow-xs' 
                              : 'bg-[#F5F1EA] dark:bg-stone-800 text-[#74796E] hover:bg-[#E4E0D8]'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isGala ? 'bg-[#D97763]' : 'bg-[#E5A642]'}`} />
                          <span>{m.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Urgent switch */}
                <label className="flex items-center gap-2.5 cursor-pointer self-start sm:self-end mb-1">
                  <input 
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#E4E0D8] dark:bg-stone-700 peer-checked:bg-[#705C30] rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  <span className="text-xs font-bold text-[#2E3230] dark:text-white">Срочно купить</span>
                </label>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#F5F1EA] dark:bg-stone-900 border-t border-[#ECE5DB] dark:border-white/5 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-[#E4E0D8] dark:hover:bg-stone-800 text-[#4A4E4A] dark:text-stone-300 text-sm font-semibold transition cursor-pointer"
              >
                Отмена
              </button>
              <button 
                onClick={() => handleSaveModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#4A7C59] text-white text-sm font-semibold hover:bg-[#3D694B] transition shadow-md shadow-[#4A7C59]/25 cursor-pointer"
              >
                {editingItem ? 'Сохранить изменения' : 'Добавить в список'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Voice Recording HUD / Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#FAF6F0] dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-[#ECE5DB] dark:border-white/10 overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-[#F5F1EA] dark:bg-[#252528] border-b border-[#ECE5DB] dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  isVoiceListening ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30' : 'bg-[#4A7C59] text-white'
                }`}>
                  <Mic size={19} className={isVoiceListening ? 'animate-bounce' : ''} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2E3230] dark:text-white">
                    Голосовая запись покупок
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs">
                    {isVoiceListening ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">Идёт запись... Говорите</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#74796E]" />
                        <span className="text-[#74796E] dark:text-stone-400">Запись на паузе</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  stopVoiceRecording();
                  setIsVoiceModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-[#E4E0D8] dark:bg-stone-700 hover:bg-[#D5CDC2] flex items-center justify-center text-[#74796E] dark:text-stone-300 hover:text-[#2E3230] transition cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto no-scrollbar">
              
              {/* Voice Visualizer / Microphone Center */}
              <div className="flex flex-col items-center justify-center py-4 px-6 bg-white dark:bg-[#252528] rounded-2xl border border-[#ECE5DB] dark:border-white/5 gap-3">
                <div className="relative">
                  {isVoiceListening && (
                    <div className="absolute -inset-3 bg-rose-500/20 rounded-full animate-ping pointer-events-none" />
                  )}
                  <button
                    onClick={isVoiceListening ? stopVoiceRecording : startVoiceRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer ${
                      isVoiceListening 
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/40 scale-105' 
                        : 'bg-[#4A7C59] hover:bg-[#3D694B] text-white shadow-[#4A7C59]/30 hover:scale-105'
                    }`}
                  >
                    {isVoiceListening ? <MicOff size={32} /> : <Mic size={32} />}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-xs font-bold text-[#2E3230] dark:text-white">
                    {isVoiceListening ? 'Нажмите, чтобы остановить запись' : 'Нажмите на микрофон для продолжения'}
                  </p>
                  <p className="text-[11px] text-[#74796E] dark:text-stone-400 mt-0.5">
                    Назовите товары через запятую, например: «Молоко 2 литра, хлеб и десяток яиц»
                  </p>
                </div>
              </div>

              {/* Real-time Transcription Box */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4A4E4A] dark:text-stone-300">
                  Распознанный текст
                </span>
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#252528] border border-[#ECE5DB] dark:border-white/5 min-h-[60px] text-xs text-[#2E3230] dark:text-white leading-relaxed">
                  {voiceTranscript || voiceInterim ? (
                    <span>
                      <span className="font-medium text-[#2E3230] dark:text-white">{voiceTranscript}</span>
                      <span className="text-[#4A7C59] dark:text-emerald-400 italic"> {voiceInterim}</span>
                    </span>
                  ) : (
                    <span className="text-[#74796E] dark:text-stone-500 italic">
                      Здесь появится текст по мере вашей речи...
                    </span>
                  )}
                </div>
              </div>

              {/* Parsed Recognized Items Preview */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A4E4A] dark:text-stone-300">
                    Распознанные позиции ({parsedVoiceItems.length})
                  </span>
                  {parsedVoiceItems.length > 0 && (
                    <span className="text-[11px] text-[#4A7C59] dark:text-emerald-400 font-semibold">
                      Готово к добавлению
                    </span>
                  )}
                </div>

                {parsedVoiceItems.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#F5F1EA]/60 dark:bg-stone-800/40 border border-dashed border-[#ECE5DB] dark:border-white/10 text-center text-xs text-[#74796E] dark:text-stone-400">
                    Говорите в микрофон, и товары автоматически появятся здесь в структурированном виде
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {parsedVoiceItems.map((item, index) => {
                      const dept = DEPARTMENTS.find(d => d.id === item.category);
                      return (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#252528] border border-[#ECE5DB] dark:border-white/5 shadow-2xs group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dept?.bgLight || 'bg-stone-100 dark:bg-stone-800'} ${dept?.textLight || 'text-stone-700'}`}>
                              {dept?.icon || <Sparkles size={16} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[#2E3230] dark:text-white capitalize">
                                {item.title}
                              </span>
                              <span className="text-xs text-[#74796E] dark:text-stone-400">
                                {item.amount} {item.unit} · {dept?.name || 'Другое'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveParsedVoiceItem(index)}
                            className="p-1.5 rounded-lg text-[#74796E] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Удалить из списка"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#F5F1EA] dark:bg-stone-900 border-t border-[#ECE5DB] dark:border-white/5 flex items-center justify-between gap-3">
              <button 
                onClick={() => {
                  stopVoiceRecording();
                  setIsVoiceModalOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-[#E4E0D8] dark:hover:bg-stone-800 text-[#4A4E4A] dark:text-stone-300 text-sm font-semibold transition cursor-pointer"
              >
                Отмена
              </button>
              
              <button 
                onClick={handleApplyVoiceItems}
                disabled={parsedVoiceItems.length === 0 || isVoiceProcessing}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition shadow-md cursor-pointer ${
                  parsedVoiceItems.length > 0 && !isVoiceProcessing
                    ? 'bg-[#4A7C59] hover:bg-[#3D694B] shadow-[#4A7C59]/25 active:scale-95'
                    : 'bg-stone-300 dark:bg-stone-700 cursor-not-allowed text-stone-500'
                }`}
              >
                {isVoiceProcessing ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Check size={17} strokeWidth={2.5} />
                )}
                <span>Добавить в список ({parsedVoiceItems.length})</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ShoppingListDesktop;
