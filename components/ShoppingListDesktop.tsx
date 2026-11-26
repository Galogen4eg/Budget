import ShoppingPantryTransferButton from './ShoppingPantryTransferButton';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SURFACE_CARD } from './filterUiTokens';
import {
  Plus,
  ShoppingBag,
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
import { shoppingQuantityStep, parseShoppingQuantity } from '../utils/shoppingAmount';
import { adjustShoppingAmount, saveShoppingMerge, updateItem, deleteItem, deleteItemsBatch } from '../utils/db';
import { detectProductCategory } from '../utils/categorizer';
import { searchOnlineDatabase, searchProductsByName } from '../utils/barcodeLookup';
import { parseVoiceShoppingText, ParsedVoiceItem } from '../utils/voiceShoppingParser';
import { parseQuickShoppingInput, createShoppingItemsFromQuickText, parseSingleQuickShoppingText } from '../utils/quickShoppingParser';
import { recordCommittedShoppingEvents, mergeOrRestoreShoppingItems, applyCommittedShoppingChanges, normalizeProductTitle } from '../utils/shoppingManager';
import { recordPurchaseEvent, getTopFrequentPurchases, FrequentItemStat } from '../utils/frequentPurchases';
import { toast } from 'sonner';
import { resolveShoppingMemberId } from '../utils/shoppingMember';
import { captureCompletedSelection, resolveCompletedDeletion } from '../utils/shoppingClearSelection';

interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onMoveToPantry: (item: ShoppingItem) => Promise<void>;
  onSendToTelegram: (items: ShoppingItem[]) => Promise<boolean>;
  beforeContent?:React.ReactNode;
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
    bgLight: 'bg-[var(--terra-soft)] dark:bg-stone-800', 
    textLight: 'text-[#5E5548] dark:text-stone-300',
    defaultPrice: 350
  },
  { 
    id: 'pharmacy', 
    name: 'Аптека и здоровье', 
    icon: <SparkleIcon size={17} />, 
    bgLight: 'bg-[var(--terra-soft)] dark:bg-stone-800', 
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
    bgLight: 'bg-[var(--terra-soft)] dark:bg-stone-800', 
    textLight: 'text-[#5E5548] dark:text-stone-300',
    defaultPrice: 110
  },
  { 
    id: 'drinks', 
    name: 'Напитки, чай и кофе', 
    icon: <Coffee size={17} />, 
    bgLight: 'bg-[#D4CCBF] dark:bg-stone-700', 
    textLight: 'text-[var(--terra-ink)] dark:text-stone-200',
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
    bgLight: 'bg-[var(--terra-soft)] dark:bg-stone-800', 
    textLight: 'text-[#5E5548] dark:text-stone-300',
    defaultPrice: 600
  },
  { 
    id: 'electronics', 
    name: 'Электроника и товары для дома', 
    icon: <Tv size={17} />, 
    bgLight: 'bg-[#D4CCBF] dark:bg-stone-700', 
    textLight: 'text-[var(--terra-ink)] dark:text-stone-200',
    defaultPrice: 900
  },
  { 
    id: 'other', 
    name: 'Разное и прочие товары', 
    icon: <HelpCircle size={17} />, 
    bgLight: 'bg-[var(--terra-soft)] dark:bg-stone-800', 
    textLight: 'text-[var(--terra-muted)] dark:text-stone-300',
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
  onSendToTelegram,
  beforeContent
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
  const [clearSelection,setClearSelection]=useState<string[]|null>(null);
  const confirmClearCompleted=clearSelection!==null;
  const clearPending=useRef(false);
  useEffect(()=>setClearSelection(null),[searchQuery,filterMemberId]);
  const [isClearingCompleted, setIsClearingCompleted] = useState(false);

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

  // Open Food Facts online search states
  const [offSearchResults, setOffSearchResults] = useState<any[]>([]);
  const [isOffSearching, setIsOffSearching] = useState(false);

  const handleOffSearch = async () => {
    const query = itemName.trim();
    if (!query || query.length < 2) {
      toast.warning('Введите хотя бы 2 символа для поиска');
      return;
    }
    setIsOffSearching(true);
    try {
      const results = await searchProductsByName(query);
      setOffSearchResults(results);
      if (results.length === 0) {
        toast.info('Товары в базе Open Food Facts не найдены');
      } else {
        toast.success(`Найдено ${results.length} товаров в Open Food Facts`);
      }
    } catch (e) {
      toast.error('Не удалось выполнить поиск в Open Food Facts');
    } finally {
      setIsOffSearching(false);
    }
  };

  // Quick Add Bar State
  const [quickInputText, setQuickInputText] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);
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
      if (filterMemberId !== 'all' && item.memberId && item.memberId !== 'all' && item.memberId !== 'family' && item.memberId !== filterMemberId) {
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
      if (filterMemberId !== 'all' && item.memberId && item.memberId !== 'all' && item.memberId !== 'family' && item.memberId !== filterMemberId) {
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
      const deptItems = filteredActiveItems.filter(i => {
        let cat = i.category;
        if (!cat || !DEPARTMENTS.some(d => d.id === cat)) {
          cat = detectProductCategory(i.title) || 'other';
        }
        return cat === dept.id;
      });
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

  const getShoppingMember = (selected: string = 'all'): string | null => {
    try {
      return resolveShoppingMemberId(members, user?.uid, selected);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Выберите профиль семьи');
      return null;
    }
  };

  const openAddModal = (initialTitle = '') => {
    setEditingItem(null);
    setItemName(initialTitle);
    setItemAmount(1);
    setItemUnit('шт');
    setItemCategory('dairy');
    const memberId = getShoppingMember();
    if (!memberId) return;
    setItemMemberId(memberId);
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
    const updated = { ...item, completed: !item.completed, completedAt: item.completed ? null : Date.now() };
    try {
      if (!familyId) throw new Error('Family is not ready');
      await updateItem(familyId, 'shopping', item.id, { completed: updated.completed, completedAt: updated.completedAt });
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    } catch (error) {
      toast.error('Не удалось сохранить статус покупки');
      return;
    }
    
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
    try {
      if (!familyId) throw new Error('Family is not ready');
      const step = shoppingQuantityStep(item.unit);
      const amount = await adjustShoppingAmount(familyId, item.id, delta * step, step);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, amount } : i));
    } catch (error) { toast.error('Не удалось обновить количество'); }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      if (!familyId) throw new Error('Family is not ready');
      await deleteItem(familyId, 'shopping', id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.info('Товар удалён из списка');
    } catch (error) {
      toast.error('Не удалось удалить покупку');
    }
  };

  const handleClearCompleted = async () => {
    if(clearPending.current)return;
    const completedIds=resolveCompletedDeletion(clearSelection,completedItems);
    if(!completedIds){setClearSelection(null);toast.info('Список изменился. Подтвердите удаление заново.');return;}
    clearPending.current=true;
    setIsClearingCompleted(true);

    try {
      if (!familyId) throw new Error('Family is not ready');
      await deleteItemsBatch(familyId, 'shopping', completedIds);
      setItems(prev => prev.filter(i => !completedIds.includes(i.id)));
      toast.success(`Удалено ${completedIds.length} купленных товаров`);
      setClearSelection(null);
    } catch (error) {
      toast.error('Не удалось очистить купленные товары');
    } finally { clearPending.current=false;setIsClearingCompleted(false); }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickInputText.trim();
    if (!raw || isSubmittingQuick) return;

    try {
      setIsSubmittingQuick(true);
      const targetMemberId = getShoppingMember(filterMemberId);
      if (!targetMemberId) return;
      const parsedItems = createShoppingItemsFromQuickText(raw, targetMemberId);
      if (parsedItems.length === 0) return;

      const {
        purchaseEvents,
        itemsToUpdateInDb,
        itemsToAddInDb,
        summaryMessage
      } = mergeOrRestoreShoppingItems(items, parsedItems, targetMemberId);

      if (!familyId) throw new Error('Семейный аккаунт пока недоступен');
    {
        await saveShoppingMerge(familyId, itemsToUpdateInDb, itemsToAddInDb);
        recordCommittedShoppingEvents(purchaseEvents);
      }
      setItems(prev => applyCommittedShoppingChanges(prev, itemsToUpdateInDb, itemsToAddInDb));
      setFrequentTrigger(prev => prev + 1);
      toast.success(summaryMessage);
      setQuickInputText('');
      // Keep autofocus for rapid consecutive item additions
      setTimeout(() => {
        quickInputRef.current?.focus();
      }, 10);
    } catch (err) {
      console.error('Quick add error:', err);
      toast.error('Не удалось добавить товар');
    } finally {
      setIsSubmittingQuick(false);
      setTimeout(() => {
        quickInputRef.current?.focus();
      }, 50);
    }
  };

  const handleQuickAddFavorite = async (fav: FrequentItemStat) => {
    const targetMemberId = getShoppingMember(filterMemberId);
    if (!targetMemberId) return;
    const {
        purchaseEvents,
      itemsToUpdateInDb,
      itemsToAddInDb,
      summaryMessage
    } = mergeOrRestoreShoppingItems(items, [{
      title: fav.title,
      amount: fav.amount,
      unit: fav.unit as any,
      category: fav.category,
      estimatedPrice: fav.price,
      memberId: targetMemberId,
      priority: 'medium'
    }], targetMemberId);

    if (!familyId) { toast.error('Семейный аккаунт пока недоступен'); return; }
    try {
      await saveShoppingMerge(familyId, itemsToUpdateInDb, itemsToAddInDb);
      recordCommittedShoppingEvents(purchaseEvents);
      setItems(prev => applyCommittedShoppingChanges(prev, itemsToUpdateInDb, itemsToAddInDb));
      setFrequentTrigger(prev => prev + 1);
      toast.success(summaryMessage);
    } catch (error) { toast.error('Не удалось добавить покупку'); }
  };

  const handleSaveModal = async (shouldMerge = false) => {
    if (!itemName.trim()) return;
    const cleanName = itemName.trim();
    const parsedQuantity = parseShoppingQuantity(itemAmount);
    if (parsedQuantity === null) { toast.error('Введите количество больше нуля, максимум один знак после запятой'); return; }
    const targetMemberId = getShoppingMember(itemMemberId);
    if (!targetMemberId) return;

    if (editingItem) {
      const updated: ShoppingItem = {
        ...editingItem,
        title: cleanName,
        amount: parsedQuantity,
        unit: itemUnit,
        category: itemCategory,
        memberId: targetMemberId,
        priority: isUrgent ? 'high' : 'medium',
        estimatedPrice: itemEstimatedPrice
      };

      if (!familyId) { toast.error('Семейный аккаунт пока недоступен'); return; }
      try { await updateItem(familyId, 'shopping', editingItem.id, updated); }
      catch (error) { toast.error('Не удалось сохранить товар'); return; }
      setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
      toast.success('Товар обновлен');
    } else {
      // Check if this item is in completed or active list without creating duplicate
      const {
        purchaseEvents,
        itemsToUpdateInDb,
        itemsToAddInDb,
        summaryMessage
      } = mergeOrRestoreShoppingItems(items, [{
        title: cleanName,
        amount: parsedQuantity,
        unit: itemUnit,
        category: itemCategory,
        memberId: targetMemberId,
        priority: isUrgent ? 'high' : 'medium',
        estimatedPrice: itemEstimatedPrice
      }], targetMemberId);

      if (!familyId) { toast.error('Семейный аккаунт пока недоступен'); return; }
      try {
        await saveShoppingMerge(familyId, itemsToUpdateInDb, itemsToAddInDb);
        recordCommittedShoppingEvents(purchaseEvents);
      } catch (error) { toast.error('Не удалось сохранить товар'); return; }
      setItems(prev => applyCommittedShoppingChanges(prev, itemsToUpdateInDb, itemsToAddInDb));
      setFrequentTrigger(prev => prev + 1);
      toast.success(summaryMessage);
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
      const targetMemberId = getShoppingMember(filterMemberId);
      if (!targetMemberId) return;
      const incoming = parsedVoiceItems.map(p => ({
        title: p.title,
        amount: p.amount,
        unit: p.unit as any,
        category: p.category,
        estimatedPrice: p.estimatedPrice,
        memberId: targetMemberId,
        priority: 'medium' as const
      }));

      const {
        purchaseEvents,
        itemsToUpdateInDb,
        itemsToAddInDb,
        summaryMessage
      } = mergeOrRestoreShoppingItems(items, incoming, targetMemberId);

      if (!familyId) throw new Error('Family is not ready');
      {
        await saveShoppingMerge(familyId, itemsToUpdateInDb, itemsToAddInDb);
        recordCommittedShoppingEvents(purchaseEvents);
      }

      setItems(prev => applyCommittedShoppingChanges(prev, itemsToUpdateInDb, itemsToAddInDb));
      setFrequentTrigger(prev => prev + 1);

      toast.success(summaryMessage);
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
    <div data-testid="shopping-scroll-container" className="flex-1 min-h-0 min-w-0 w-full h-full overflow-y-auto overscroll-y-contain bg-[var(--terra-canvas)] dark:bg-[var(--terra-canvas)] text-[var(--terra-ink)] dark:text-stone-100 font-sans p-6 lg:p-8">
      <div className="terra-shopping-layout w-full max-w-[1280px] mx-auto flex flex-col gap-5 pb-8">
        
        {/* Top Header & Summary */}
        <header className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-headline text-2xl lg:text-3xl font-bold text-[var(--terra-ink)] dark:text-white tracking-tight">
                  Список покупок
                </h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#C8E8D0] dark:bg-emerald-950/40 text-[#2A6038] dark:text-emerald-400 text-xs font-semibold">
                  {totalItemsCount - completedCount} в списке · {completedCount} куплено
                </span>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
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
                className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--terra-soft)] dark:bg-stone-800 text-[var(--terra-ink)] dark:text-stone-200 text-sm font-semibold hover:bg-[#D5CDC2] dark:hover:bg-stone-700 transition  cursor-pointer"
                title="Распознать штрихкод товара по фото"
              >
                {isScanning ? <Loader2 size={18} className="animate-spin text-[#705C30]" /> : <ScanLine size={18} className="text-[#705C30]" />}
                <span>Штрихкод товара</span>
              </button>

              <button 
                onClick={startVoiceRecording}
                className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition  cursor-pointer border ${
                  isVoiceListening
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 shadow-rose-200/50 dark:shadow-none'
                    : 'bg-[#EBF4EE] hover:bg-[#DDF0E3] dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-[#2A6038] dark:text-emerald-400 border-[#C8E8D0] dark:border-emerald-800/40'
                }`}
                title="Записать список покупок голосом"
              >
                {isVoiceListening ? (
                  <Mic size={18} className="text-rose-500 " />
                ) : (
                  <Mic size={18} className="text-[#2A6038] dark:text-emerald-400" />
                )}
                <span>{isVoiceListening ? 'Запись...' : 'Голосом'}</span>
              </button>

              <button 
                onClick={handleTelegramSend}
                disabled={isSendingTelegram}
                className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#edf4ef] hover:bg-[#d8edd9] dark:bg-[#243628] hover:dark:bg-[#2e4733] text-[var(--terra-primary)] dark:text-emerald-400 text-sm font-semibold transition  cursor-pointer border border-[#d1dbd1] dark:border-emerald-800/40 "
                title="Отправить актуальный список покупок в семейный Telegram чат"
              >
                {isSendingTelegram ? <Loader2 size={18} className="animate-spin text-[var(--terra-primary)] dark:text-emerald-400" /> : <Send size={18} className="text-[var(--terra-primary)] dark:text-emerald-400" />}
                <span>В Telegram</span>
              </button>

              <button 
                onClick={() => openAddModal()}
                className="min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--terra-primary-solid)] hover:bg-[var(--terra-primary-hover)] text-[var(--terra-on-primary)] text-sm font-semibold transition  cursor-pointer group"
              >
                <Plus size={19} strokeWidth={2.5} className="" />
                <span>Добавить товар</span>
              </button>
            </div>
          </div>

          {/* Filters & Segmented Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[var(--terra-soft)] dark:bg-[var(--terra-surface)] p-3.5 rounded-2xl border border-[var(--terra-border)] dark:border-white/5">
            {/* Quick search filter within list */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--terra-muted)] dark:text-stone-400" size={17} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск товаров"
                aria-label="Поиск по товарам в семейном списке"
                className="min-h-[44px] w-full pl-9 pr-12 py-2 rounded-xl bg-white dark:bg-[var(--terra-soft)] text-xs text-[var(--terra-ink)] dark:text-white placeholder-[#74796E] outline-none focus:ring-1 focus:ring-[#4A7C59]  border border-[#ECE5DB]/60 dark:border-transparent"
              />
              <button
                onClick={startVoiceRecording}
                className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--terra-muted)] hover:text-[var(--terra-primary)] dark:text-stone-400 dark:hover:text-emerald-400 p-1 rounded-md transition cursor-pointer"
                title="Надиктовать список голосом"
              >
                <Mic size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="terra-shopping-columns grid gap-5 items-start w-full">
          
          {/* Main Left Area: Categories & Items Checklist */}
          <div className="flex flex-col gap-5 w-full min-w-0">
            
            {/* Smart Quick Add Bar (Terra styled) */}
            <div className={`${SURFACE_CARD} w-full min-w-0`}>
              <form onSubmit={handleQuickAddSubmit} className="flex flex-col gap-2.5 w-full min-w-0">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <label className="text-sm font-semibold text-[var(--terra-ink)] dark:text-white">
                    <span>Быстрое добавление</span>
                  </label>

                </div>

                <div className="relative flex items-center w-full min-w-0">
                  <input 
                    ref={quickInputRef}
                    type="text"
                    value={quickInputText}
                    onChange={(e) => setQuickInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setQuickInputText('');
                      }
                    }}
                    placeholder="Например, молоко 1 л"
                    aria-label="Быстрое добавление товаров"
                    className="w-full min-w-0 bg-[var(--terra-surface)] dark:bg-[var(--terra-soft)] border border-[var(--terra-border)] dark:border-white/10 rounded-xl text-xs sm:text-sm font-medium text-[var(--terra-ink)] dark:text-white placeholder-[#74796E] min-h-[48px] py-2.5 sm:py-3 pl-3.5 sm:pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/40 focus:bg-white dark:focus:bg-[var(--terra-soft)] transition"
                  />
                  <button 
                    type="submit"
                    disabled={!quickInputText.trim() || isSubmittingQuick}
                    className="absolute right-1 min-h-[44px] min-w-[44px] bg-[var(--terra-primary-solid)] hover:bg-[var(--terra-primary-hover)] text-[var(--terra-on-primary)] rounded-lg transition disabled:opacity-40 cursor-pointer   flex items-center justify-center shrink-0"
                    title="Добавить в список" aria-label="Добавить товары в общий список"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Live Parsed Preview Chips */}
                {liveParsedQuickItems.length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-0.5  min-w-0 overflow-hidden">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 shrink-0">Будет добавлено:</span>
                    {liveParsedQuickItems.map((pi, idx) => {
                      const dept = DEPARTMENTS.find(d => d.id === pi.category) || DEPARTMENTS[DEPARTMENTS.length - 1];
                      return (
                        <div 
                          key={`parsed-quick-${pi.title}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EDF4EF] dark:bg-[#203425] text-[#2A6038] dark:text-emerald-300 border border-[#D1DBD1] dark:border-green-800/40 text-xs font-semibold  max-w-full truncate"
                        >
                          <span className="truncate">{pi.title}</span>
                          <span className="font-mono bg-white/80 dark:bg-black/30 px-1.5 py-0.2 rounded text-[11px] text-[var(--terra-ink)] dark:text-white shrink-0">
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
            
            {beforeContent}

            {groupedDepartments.length > 0 ? (
              groupedDepartments.map(({ dept, items: deptItems }, deptIdx) => (
                <section key={`dept-sec-${dept.id || deptIdx}`} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg ${dept.bgLight} ${dept.textLight} flex items-center justify-center shrink-0`}>
                        {dept.icon}
                      </div>
                      <h2 className="font-serif font-bold text-base text-[var(--terra-ink)] dark:text-white">
                        {dept.name}
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--terra-soft)] dark:bg-stone-800 text-[var(--terra-muted)] dark:text-stone-300 font-medium">
                        {deptItems.length} {deptItems.length === 1 ? 'позиция' : deptItems.length >= 2 && deptItems.length <= 4 ? 'позиции' : 'позиций'}
                      </span>
                    </div>
                  </div>

                  {/* Department Item Rows */}
                  <div className="rounded-2xl border border-[var(--terra-border)] bg-[var(--terra-surface)] divide-y divide-[var(--terra-border)]">
                    {deptItems.map((item, itemIdx) => {
                      return (
                        <div 
                          key={item.id ? `desk-item-${item.id}` : `desk-item-idx-${dept.id}-${itemIdx}`}
                          onClick={() => openEditModal(item)}
                          data-terra-shopping-item data-shopping-id={item.id} className="group relative flex flex-wrap items-center justify-between gap-2 p-2.5 transition-colors cursor-pointer hover:bg-[var(--terra-soft)]"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Custom checkmark */}
                            <label 
                              onClick={(e) => e.stopPropagation()}
                              className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg bg-[var(--terra-soft)] dark:bg-stone-800 cursor-pointer transition-colors hover:bg-[#4A7C59]/20 shrink-0 focus-within:ring-2 focus-within:ring-primary"
                            >
                              <input 
                                type="checkbox"
                                aria-label={`Отметить купленным: ${item.title}`}
                                checked={item.completed}
                                onChange={() => handleToggleComplete(item)}
                                className="peer sr-only"
                              />
                              <span className="material-symbols-outlined text-transparent peer-checked:text-white peer-checked:bg-[#4A7C59] w-6 h-6 rounded-lg text-sm flex items-center justify-center transition-all">
                                <Check size={14} strokeWidth={3} />
                              </span>
                            </label>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <button type="button"
                                  onClick={(event) => { event.stopPropagation(); openEditModal(item); }}
                                  aria-label={`Редактировать товар: ${item.title}`}
                                  className="min-h-[44px] min-w-0 text-left font-semibold text-sm text-[var(--terra-ink)] dark:text-white break-words rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
                                  {item.title}
                                </button>
                                {item.priority === 'high' && (
                                  <span className="px-2 py-0.5 rounded-md bg-[#F8E0A8] dark:bg-amber-950/40 text-[#554020] dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                    <Zap size={11} className="text-[#705C30]" /> Срочно
                                  </span>
                                )}
                              </div>
                              {members.find(member=>member.id===item.memberId)&&<span className="text-xs text-[var(--terra-muted)] break-words">{members.find(member=>member.id===item.memberId)?.name}</span>}
                              {item.note&&<span className="text-xs text-[var(--terra-muted)] break-words">{item.note}</span>}
                            </div>
                          </div>

                          {/* Stepper & Actions */}
                          <div className="flex flex-wrap items-center gap-1 shrink-0 max-w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center bg-[var(--terra-soft)] dark:bg-stone-800 rounded-xl px-1.5 py-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdateAmount(item, -1); }}
                                aria-label={`Уменьшить количество: ${item.title}`}
                                className="min-w-[44px] min-h-[44px] rounded-lg bg-white dark:bg-stone-700 hover:bg-[var(--terra-soft)] text-[var(--terra-ink)] dark:text-white flex items-center justify-center transition text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                              >
                                -
                              </button>
                              <span className="px-3 text-xs font-bold text-[var(--terra-ink)] dark:text-white font-mono whitespace-nowrap">
                                {item.amount || '1'} {item.unit || 'шт'}
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdateAmount(item, 1); }}
                                aria-label={`Увеличить количество: ${item.title}`}
                                className="min-w-[44px] min-h-[44px] rounded-lg bg-white dark:bg-stone-700 hover:bg-[var(--terra-soft)] text-[var(--terra-ink)] dark:text-white flex items-center justify-center transition text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                              >
                                +
                              </button>
                            </div>

                            <button 
                              onClick={(e) => handleDeleteItem(e, item.id)}
                              aria-label={`Удалить товар: ${item.title}`}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--terra-muted)] hover:text-[#B83230] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
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
              <div className="p-5 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                <h3 className="text-sm font-medium text-[var(--terra-ink)] dark:text-white">{searchQuery.trim() ? 'Активные товары не найдены' : 'Нет активных покупок'}</h3>
                <button 
                  onClick={() => openAddModal()}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#4A7C59] text-white text-xs font-bold  hover:bg-[#3D694B] transition cursor-pointer"
                >
                  Добавить товар
                </button>
              </div>
            )}

            {/* Completed Section (Collapsible Accordion) */}
            {completedItems.length > 0 && (
              <section className="mt-4 bg-[#F5F1EA]/80 dark:bg-stone-900/60 rounded-2xl p-4 flex flex-col gap-3 border border-[var(--terra-border)] dark:border-white/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" aria-expanded={isPurchasedOpen} aria-controls="desktop-completed-shopping-items" onClick={() => setIsPurchasedOpen(prev => !prev)} className="min-h-[44px] flex items-center gap-2 text-[var(--terra-muted)] dark:text-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
                    <ChevronDown size={18} className={`transition-transform duration-200 ${isPurchasedOpen ? 'rotate-180' : ''}`} />
                    <span className="font-headline font-semibold text-sm">Куплено</span>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--terra-soft)] dark:bg-stone-800 text-xs font-bold text-[var(--terra-primary)] dark:text-emerald-400">
                      {completedItems.length}
                    </span>
                  </button>

                  <button type="button"
                    disabled={isClearingCompleted}
                    aria-label={confirmClearCompleted ? `Подтвердить удаление ${clearSelection?.length ?? 0} купленных товаров` : 'Очистить купленные товары'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirmClearCompleted) setClearSelection(captureCompletedSelection(completedItems));
                      else void handleClearCompleted();
                    }}
                    className="min-h-[44px] px-3 text-xs text-[#B83230] hover:underline font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    <span>{isClearingCompleted ? 'Удаление…' : confirmClearCompleted ? `Удалить ${clearSelection?.length ?? 0}?` : 'Очистить купленные'}</span>
                  </button>
                </div>

                {confirmClearCompleted && (
                  <div role="status" className="flex items-center gap-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-red-700 dark:text-red-300">
                    Удалить показанные купленные товары из общего списка?
                    <button type="button" disabled={isClearingCompleted} onClick={() => setClearSelection(null)}
                      className="min-h-[44px] px-3 underline font-semibold">Отмена</button>
                  </div>
                )}
                {/* Purchased items list */}
                {isPurchasedOpen && (
                  <div id="desktop-completed-shopping-items" className="divide-y divide-[var(--terra-border)] pt-2">
                    {completedItems.map((item, compIdx) => (
                      <div 
                        key={item.id ? `desk-comp-${item.id}` : `desk-comp-idx-${compIdx}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-1 py-2"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <button 
                            onClick={() => handleToggleComplete(item)}
                            aria-label={`Вернуть в список: ${item.title}`}
                            className="min-w-[44px] min-h-[44px] rounded-md bg-[#4A7C59] text-white flex items-center justify-center cursor-pointer hover:bg-rose-500 transition focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                            title="Вернуть в список"
                          >
                            <Check size={13} strokeWidth={3} />
                          </button>
                          <span className="line-through text-sm font-medium text-[var(--terra-muted)] break-words [overflow-wrap:anywhere]">
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[var(--terra-muted)]">
                          <span>{item.amount || '1'} {item.unit || 'шт'}</span>
                          <ShoppingPantryTransferButton item={item} onMoveToPantry={onMoveToPantry}/>
                          <button 
                            onClick={(e) => handleDeleteItem(e, item.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                            title="Удалить навсегда" aria-label={`Удалить товар: ${item.title}`}
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
          <div className="flex flex-col gap-5 min-w-0">
            
            {/* Quick Add Templates (Dynamic Family Favorites) */}
            <div className={`${SURFACE_CARD} flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-[var(--terra-ink)] dark:text-white flex items-center gap-1.5">
                  <Star size={16} className="text-[#705C30] fill-[#705C30]" />
                  Частые покупки
                </span>

              </div>


              <div className="flex flex-wrap gap-2 pt-1">
                {dynamicFrequentPurchases.map((fav, i) => (
                  <button 
                    key={`fav-chip-${fav.title}-${i}`}
                    onClick={() => handleQuickAddFavorite(fav)}
                    title={`Добавлено/куплено: ${fav.frequencyLabel}. Нажмите для добавления в список`}
                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[var(--terra-soft)] hover:bg-[var(--terra-soft)] dark:hover:bg-stone-700 text-xs font-semibold text-[var(--terra-ink)] dark:text-stone-200 border border-[var(--terra-border)] dark:border-white/5  transition group cursor-pointer"
                  >
                    <span>{fav.title}</span>
                    <span className="text-[10px] text-[#705C30] dark:text-amber-300/80 font-mono bg-[var(--terra-soft)] dark:bg-stone-800 px-1.5 py-0.5 rounded-md">
                      {fav.frequencyLabel}
                    </span>
                    <Plus size={14} className="text-[var(--terra-primary)] " />
                  </button>
                ))}
              </div>
            </div>

            {/* Category Stats Box */}
            <div className={`${SURFACE_CARD} space-y-3`}>
              <span className="text-sm font-semibold text-[var(--terra-ink)] block">
                Товары по отделам
              </span>
              <div className="space-y-2">
                {groupedDepartments.map(({ dept, items: dItems }) => (
                  <div key={dept.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                      <span className="text-[var(--terra-ink)] dark:text-stone-300 font-medium truncate max-w-[180px]">{dept.name}</span>
                    </div>
                    <span className="text-[var(--terra-primary)] dark:text-emerald-400 font-bold font-mono">{dItems.length} поз.</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Interactive Add/Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 ">
          <div className="relative w-full max-w-xl bg-[var(--terra-canvas)] dark:bg-[var(--terra-surface)] rounded-3xl shadow-2xl border border-[var(--terra-border)] dark:border-white/10 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[var(--terra-soft)] dark:bg-stone-900 flex items-center justify-between border-b border-[var(--terra-border)] dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#4A7C59] flex items-center justify-center text-white shadow-xs">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[var(--terra-ink)] dark:text-white">
                    {editingItem ? 'Редактировать товар' : 'Добавить в список покупок'}
                  </h3>

                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                aria-label="Закрыть редактор товара"
                className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--terra-muted)] hover:bg-[var(--terra-soft)] dark:hover:bg-stone-800 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto no-scrollbar">
              
              {/* Item Name Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[var(--terra-muted)] dark:text-stone-300">
                    Наименование товара
                  </label>
                  <button
                    type="button"
                    onClick={startInlineModalDictation}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isInlineListening 
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                        : 'bg-[#ECE5DB] dark:bg-stone-800 text-[var(--terra-muted)] dark:text-stone-300 hover:text-[var(--terra-primary)]'
                    }`}
                    title="Надиктовать голосом (например: «Сыр маасдам 300 грамм»)"
                  >
                    <Mic size={13} />
                    <span>{isInlineListening ? 'Слушаю...' : 'Сказать голосом'}</span>
                  </button>
                </div>
                <div className="relative flex gap-2">
                  <input 
                    type="text"
                    value={itemName}
                    onChange={(e) => {
                      setItemName(e.target.value);
                      if (e.target.value.trim() === '') {
                        setOffSearchResults([]);
                      }
                    }}
                    placeholder="Например: Сыр маасдам, Хлеб, Яблоки..."
                    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-[var(--terra-soft)] text-sm font-semibold text-[var(--terra-ink)] dark:text-white placeholder-[#74796E] border border-[var(--terra-border)] dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleOffSearch}
                    disabled={isOffSearching || !itemName.trim()}
                    className="px-4 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isOffSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    <span>Open Food Facts</span>
                  </button>
                </div>

                {/* Open Food Facts Results Chips */}
                {offSearchResults.length > 0 && (
                  <div className="mt-1 space-y-1.5 p-3 rounded-xl bg-[var(--terra-soft)] dark:bg-stone-800 border border-[var(--terra-border)] dark:border-white/5">
                    <span className="text-[10px] font-bold text-[var(--terra-muted)] dark:text-stone-400 uppercase tracking-wider block">
                      Результаты Open Food Facts (нажмите для выбора):
                    </span>
                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto no-scrollbar">
                      {offSearchResults.map((prod, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setItemName(prod.title);
                            setItemCategory(prod.category);
                            setItemAmount(parseFloat(prod.amount) || 1);
                            setItemUnit(prod.unit);
                            setOffSearchResults([]);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[var(--terra-soft)] hover:border-[var(--terra-primary)] border border-transparent text-xs font-semibold text-[var(--terra-ink)] dark:text-white text-left transition-all active:scale-95 shadow-3xs flex flex-col"
                        >
                          <span className="font-bold text-[11px] leading-tight line-clamp-1">{prod.title}</span>
                          <span className="text-[9px] text-[var(--terra-muted)] dark:text-stone-400 mt-0.5">
                            {prod.amount} {prod.unit} • {prod.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                      className="px-3 py-1.5 rounded-lg bg-white/70 dark:bg-stone-800 text-[var(--terra-ink)] dark:text-stone-200 text-xs font-medium hover:bg-white transition cursor-pointer"
                    >
                      Отдельной позицией
                    </button>
                  </div>
                </div>
              )}

              {/* Quantity Stepper & Unit Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--terra-muted)] dark:text-stone-300">
                    Количество
                  </span>
                  <div className="flex items-center bg-white dark:bg-[var(--terra-soft)] rounded-xl p-1 border border-[var(--terra-border)] dark:border-white/5">
                    <button 
                      onClick={() => setItemAmount(prev => Math.max(0.5, prev - (prev <= 1 ? 0.5 : 1)))}
                      className="w-9 h-9 rounded-lg bg-[var(--terra-soft)] dark:bg-stone-700 flex items-center justify-center text-[var(--terra-ink)] dark:text-white hover:bg-[var(--terra-soft)] transition font-bold text-base cursor-pointer"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={itemAmount}
                      onChange={(e) => setItemAmount(Math.max(0.5, parseFloat(e.target.value) || 1))}
                      className="w-full text-center bg-transparent font-serif font-bold text-base text-[var(--terra-ink)] dark:text-white outline-none"
                    />
                    <button 
                      onClick={() => setItemAmount(prev => prev + 1)}
                      className="w-9 h-9 rounded-lg bg-[var(--terra-soft)] dark:bg-stone-700 flex items-center justify-center text-[var(--terra-ink)] dark:text-white hover:bg-[var(--terra-soft)] transition font-bold text-base cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Unit Selector Segment */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--terra-muted)] dark:text-stone-300">
                    Единица измерения
                  </span>
                  <div className="flex items-center gap-1 bg-white dark:bg-[var(--terra-soft)] p-1 rounded-xl border border-[var(--terra-border)] dark:border-white/5">
                    {UNITS.map(u => (
                      <button 
                        key={u}
                        onClick={() => setItemUnit(u)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                          itemUnit === u 
                            ? 'bg-[#4A7C59] text-white shadow-xs' 
                            : 'text-[var(--terra-muted)] hover:text-[var(--terra-ink)] hover:bg-[var(--terra-soft)] dark:hover:bg-stone-700'
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
                <label className="text-sm font-semibold text-[var(--terra-muted)] dark:text-stone-300">
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
                    className="w-full appearance-none px-4 py-3 rounded-xl bg-white dark:bg-[var(--terra-soft)] text-xs font-semibold text-[var(--terra-ink)] dark:text-white outline-none border border-[var(--terra-border)] dark:border-white/5 focus:ring-1 focus:ring-[#4A7C59] cursor-pointer"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={17} />
                </div>
              </div>

              {/* Urgent Priority Switch */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-[var(--terra-muted)] dark:text-stone-300">
                  Приоритет
                </span>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--terra-soft)] dark:bg-stone-700 peer-checked:bg-[#705C30] rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  <span className="text-xs font-bold text-[var(--terra-ink)] dark:text-white">Срочно купить</span>
                </label>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[var(--terra-soft)] dark:bg-stone-900 border-t border-[var(--terra-border)] dark:border-white/5 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-[var(--terra-soft)] dark:hover:bg-stone-800 text-[var(--terra-muted)] dark:text-stone-300 text-sm font-semibold transition cursor-pointer"
              >
                Отмена
              </button>
              <button 
                onClick={() => handleSaveModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#4A7C59] text-white text-sm font-semibold hover:bg-[#3D694B] transition  cursor-pointer"
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
          <div className="relative w-full max-w-lg bg-[var(--terra-canvas)] dark:bg-[var(--terra-surface)] rounded-3xl shadow-2xl border border-[var(--terra-border)] dark:border-white/10 overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] border-b border-[var(--terra-border)] dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  isVoiceListening ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30' : 'bg-[#4A7C59] text-white'
                }`}>
                  <Mic size={19} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[var(--terra-ink)] dark:text-white">
                    Голосовая запись покупок
                  </h3>
                  <div className="text-xs">
                    {isVoiceListening ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">Идёт запись... Говорите</span>
                    ) : (
                      <span className="text-[var(--terra-muted)] dark:text-stone-400">Запись на паузе</span>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  stopVoiceRecording();
                  setIsVoiceModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-[var(--terra-soft)] dark:bg-stone-700 hover:bg-[#D5CDC2] flex items-center justify-center text-[var(--terra-muted)] dark:text-stone-300 hover:text-[var(--terra-ink)] transition cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto no-scrollbar">
              
              {/* Voice Visualizer / Microphone Center */}
              <div className="flex flex-col items-center justify-center py-4 px-6 bg-white dark:bg-[var(--terra-soft)] rounded-2xl border border-[var(--terra-border)] dark:border-white/5 gap-3">
                <div className="relative">

                  <button
                    onClick={isVoiceListening ? stopVoiceRecording : startVoiceRecording}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] ${
                      isVoiceListening 
                        ? 'bg-[var(--terra-danger-soft)] text-[var(--terra-danger-text)]' 
                        : 'bg-[var(--terra-primary-solid)] hover:bg-[var(--terra-primary-hover)] text-[var(--terra-on-primary)]'
                    }`}
                  >
                    {isVoiceListening ? <MicOff size={32} /> : <Mic size={32} />}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-xs font-bold text-[var(--terra-ink)] dark:text-white">
                    {isVoiceListening ? 'Нажмите, чтобы остановить запись' : 'Нажмите на микрофон для продолжения'}
                  </p>
                  <p className="text-[11px] text-[var(--terra-muted)] dark:text-stone-400 mt-0.5">
                    Назовите товары через запятую, например: «Молоко 2 литра, хлеб и десяток яиц»
                  </p>
                </div>
              </div>

              {/* Real-time Transcription Box */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--terra-muted)] dark:text-stone-300">
                  Распознанный текст
                </span>
                <div className="p-3.5 rounded-xl bg-white dark:bg-[var(--terra-soft)] border border-[var(--terra-border)] dark:border-white/5 min-h-[60px] text-xs text-[var(--terra-ink)] dark:text-white leading-relaxed">
                  {voiceTranscript || voiceInterim ? (
                    <span>
                      <span className="font-medium text-[var(--terra-ink)] dark:text-white">{voiceTranscript}</span>
                      <span className="text-[var(--terra-primary)] dark:text-emerald-400 italic"> {voiceInterim}</span>
                    </span>
                  ) : (
                    <span className="text-[var(--terra-muted)] dark:text-stone-500 italic">
                      Здесь появится текст по мере вашей речи...
                    </span>
                  )}
                </div>
              </div>

              {/* Parsed Recognized Items Preview */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--terra-muted)] dark:text-stone-300">
                    Распознанные позиции ({parsedVoiceItems.length})
                  </span>
                  {parsedVoiceItems.length > 0 && (
                    <span className="text-[11px] text-[var(--terra-primary)] dark:text-emerald-400 font-semibold">
                      Готово к добавлению
                    </span>
                  )}
                </div>

                {parsedVoiceItems.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#F5F1EA]/60 dark:bg-stone-800/40 border border-dashed border-[var(--terra-border)] dark:border-white/10 text-center text-xs text-[var(--terra-muted)] dark:text-stone-400">
                    Говорите в микрофон, и товары автоматически появятся здесь в структурированном виде
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {parsedVoiceItems.map((item, index) => {
                      const dept = DEPARTMENTS.find(d => d.id === item.category);
                      return (
                        <div 
                          key={`voice-parsed-${item.title}-${index}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[var(--terra-soft)] border border-[var(--terra-border)] dark:border-white/5 shadow-2xs group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dept?.bgLight || 'bg-stone-100 dark:bg-stone-800'} ${dept?.textLight || 'text-stone-700'}`}>
                              {dept?.icon || <Sparkles size={16} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[var(--terra-ink)] dark:text-white capitalize">
                                {item.title}
                              </span>
                              <span className="text-xs text-[var(--terra-muted)] dark:text-stone-400">
                                {item.amount} {item.unit} · {dept?.name || 'Другое'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveParsedVoiceItem(index)}
                            className="p-1.5 rounded-lg text-[var(--terra-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
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
            <div className="px-6 py-4 bg-[var(--terra-soft)] dark:bg-stone-900 border-t border-[var(--terra-border)] dark:border-white/5 flex items-center justify-between gap-3">
              <button 
                onClick={() => {
                  stopVoiceRecording();
                  setIsVoiceModalOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-[var(--terra-soft)] dark:hover:bg-stone-800 text-[var(--terra-muted)] dark:text-stone-300 text-sm font-semibold transition cursor-pointer"
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
