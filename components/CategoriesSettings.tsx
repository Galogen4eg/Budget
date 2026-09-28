import React, { useState, useMemo, useCallback } from 'react';
import { 
  Plus, BrainCircuit, Zap, ShoppingBag, Car, HeartPulse, Utensils, 
  Home, Briefcase, GraduationCap, Filter, X, ChevronRight, Palette, 
  Coffee, Save, Layers, Sparkles, Gamepad2, Camera, Music, Plane, 
  Gift, Smartphone, CreditCard, Settings2, Search, Trash2, Edit3, RefreshCw, 
  ChevronDown, ChevronUp, AlertCircle, Bus, Train, Ship, ShoppingBasket, 
  Shirt, Baby, Dog, Cat, Flower2, Hammer, Wrench, BookOpen,
  Palmtree, Wifi, Scissors, Bath, Bed, Sofa, Bike, Drumstick, Pill, 
  Stethoscope, Dumbbell, Ticket, Monitor, Footprints, Smile, HeartHandshake, 
  FileText, ShieldCheck, Landmark, SmartphoneCharging, Armchair, Watch,
  Sun, Umbrella, Wine, GlassWater, ShoppingCart, Map, Flag, Star, Bell, 
  Mail, Video, Mic, Speaker, Laptop, Printer, HardDrive, Cloud, Droplets, 
  Flame, Key, Lock, Anchor, CheckCircle2, AlertTriangle, HelpCircle,
  Beer, Cigarette, Clapperboard, Ghost, Crown, Gem, Tv, GripVertical, 
  Folder, CornerDownRight, Move, Check, ArrowRight
} from 'lucide-react';
import { Category, LearnedRule, AppSettings, Transaction } from '../types';
import { toast } from 'sonner';

/** Константы ограничений и настроек */
export const MIN_CATEGORY_NAME_LENGTH = 2;
export const MAX_CATEGORY_NAME_LENGTH = 50;
export const DEFAULT_CATEGORY_COLOR = '#4A7C59';
export const DEFAULT_CATEGORY_ICON = 'ShoppingBasket';

/** Фирменная палитра Terra Hub */
export const TERRA_CATEGORY_COLORS: readonly string[] = [
  '#4A7C59', // Forest Green (Primary)
  '#2D5A27', // Dark Pine
  '#10B981', // Emerald
  '#007AFF', // Azure Blue
  '#06B6D4', // Cyan
  '#5856D6', // Indigo
  '#AF52DE', // Purple
  '#FF2D55', // Crimson
  '#E07A5F', // Terracotta
  '#FF9500', // Orange
  '#F59E0B', // Amber
  '#6B7280', // Slate Graphite
];

/** Категоризированный каталог иконок */
export const ICON_GROUPS = [
  {
    title: 'Еда и покупки',
    icons: ['ShoppingBasket', 'ShoppingCart', 'ShoppingBag', 'Utensils', 'Coffee', 'Wine', 'Beer', 'GlassWater', 'Drumstick']
  },
  {
    title: 'Транспорт и поездки',
    icons: ['Car', 'Bus', 'Train', 'Plane', 'Ship', 'Bike', 'Map', 'Flag']
  },
  {
    title: 'Дом и комфорт',
    icons: ['Home', 'Bed', 'Bath', 'Sofa', 'Armchair', 'Wifi', 'Zap', 'Droplets', 'Flame', 'Key', 'Lock']
  },
  {
    title: 'Здоровье и спорт',
    icons: ['HeartPulse', 'Pill', 'Stethoscope', 'Dumbbell', 'Footprints', 'Smile', 'HeartHandshake']
  },
  {
    title: 'Работа и финансы',
    icons: ['Briefcase', 'Landmark', 'CreditCard', 'FileText', 'ShieldCheck', 'GraduationCap', 'BookOpen']
  },
  {
    title: 'Досуг и отдых',
    icons: ['Gamepad2', 'Music', 'Ticket', 'Tv', 'Camera', 'Video', 'Palmtree', 'Sun', 'Gift', 'Star']
  },
  {
    title: 'Гаджеты и утилиты',
    icons: ['Smartphone', 'Laptop', 'Monitor', 'Printer', 'Cloud', 'Settings2', 'Hammer', 'Wrench']
  }
] as const;

export interface CategoriesSettingsProps {
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
  onDeleteCategory?: (id: string) => void;
  learnedRules: LearnedRule[];
  onUpdateRules: (rules: LearnedRule[]) => void;
  settings: AppSettings;
  transactions?: Transaction[];
  onUpdateTransactions?: (transactions: Transaction[]) => void;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly error?: string;
}

export interface CategoryStats {
  readonly transactionCount: number;
  readonly totalExpense: number;
}

/**
 * Валидация наименования категории.
 * Чистая функция без побочных эффектов.
 */
export function validateCategoryName(rawName: string, existingCategories: readonly Category[], editingId?: string | null): ValidationResult {
  const name = rawName.trim();
  if (name.length < MIN_CATEGORY_NAME_LENGTH) {
    return { isValid: false, error: `Название должно содержать минимум ${MIN_CATEGORY_NAME_LENGTH} символа` };
  }
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    return { isValid: false, error: `Название не должно превышать ${MAX_CATEGORY_NAME_LENGTH} символов` };
  }
  const isDuplicate = existingCategories.some(
    c => c.id !== editingId && c.label.toLowerCase() === name.toLowerCase()
  );
  if (isDuplicate) {
    return { isValid: false, error: 'Категория с таким названием уже существует' };
  }
  return { isValid: true };
}

/**
 * Расчет финансовой статистики категории.
 * Чистая функция без побочных эффектов.
 */
export function calculateCategoryStats(
  categoryId: string, 
  categories: readonly Category[], 
  transactions: readonly Transaction[] = []
): CategoryStats {
  const subCategoryIds = new Set(
    categories.filter(c => c.parentId === categoryId).map(c => c.id)
  );
  subCategoryIds.add(categoryId);

  let transactionCount = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (subCategoryIds.has(tx.category)) {
      transactionCount++;
      if (tx.type === 'expense') {
        totalExpense += Math.abs(tx.amount);
      }
    }
  }

  return { transactionCount, totalExpense };
}

/**
 * Компонент безопасного рендеринга иконки по имени
 */
export const IconRenderer: React.FC<{ name: string; size?: number; className?: string }> = ({ 
  name, 
  size = 18, 
  className = "" 
}) => {
  const iconMap: Record<string, any> = {
    ShoppingBag, ShoppingCart, ShoppingBasket, Utensils, Coffee, Beer, Wine, GlassWater, Cigarette,
    Car, Bus, Train, Plane, Ship, Bike, Map, Flag,
    Home, Bed, Bath, Sofa, Armchair, Wifi, Zap, Droplets, Flame, Key, Lock,
    Briefcase, Landmark, FileText, ShieldCheck, Mail,
    HeartPulse, Pill, Stethoscope, Dumbbell, Footprints, Smile, Ghost,
    Gamepad2, Music, Clapperboard, Ticket, Tv, Camera, Video, Mic, Speaker,
    BookOpen, GraduationCap, Palette, Crown, Gem, Star,
    Shirt, Scissors, Watch, Sun, Umbrella,
    Baby, Dog, Cat, Flower2, Palmtree,
    Gift, CreditCard, Anchor, Bell,
    Smartphone, Laptop, Monitor, Printer, HardDrive, Cloud, SmartphoneCharging,
    Hammer, Wrench, Settings2, HelpCircle, AlertTriangle, CheckCircle2, Drumstick
  };
  const Component = iconMap[name] || Settings2;
  return <Component size={size} className={className} />;
};

/**
 * Главный компонент настроек категорий для ПК и мобильных устройств
 */
const CategoriesSettings: React.FC<CategoriesSettingsProps> = ({
  categories,
  onUpdateCategories,
  onDeleteCategory,
  learnedRules,
  onUpdateRules,
  settings,
  transactions = [],
  onUpdateTransactions
}) => {
  // Навигация и фильтрация
  const [activeTab, setActiveTab] = useState<'categories' | 'rules'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() => {
    const firstParent = categories.find(c => !c.parentId);
    return firstParent ? firstParent.id : (categories[0]?.id || null);
  });
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [expandedParentIds, setExpandedParentIds] = useState<Record<string, boolean>>(() => {
    // По умолчанию раскрываем всех родителей для удобного обзора на ПК
    const initial: Record<string, boolean> = {};
    categories.filter(c => !c.parentId).forEach(p => { initial[p.id] = true; });
    return initial;
  });

  // Состояние Drag & Drop для перемещения подкатегорий
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
  const [dragOverParentId, setDragOverParentId] = useState<string | null>(null);

  // Форма категории (правая панель инспектора)
  const [formDataName, setFormDataName] = useState('');
  const [formDataParentId, setFormDataParentId] = useState<string | null>(null);
  const [formDataIcon, setFormDataIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [formDataColor, setFormDataColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // Диалог подтверждения удаления
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Синхронизация формы при смене выбранной категории
  const selectedCategory = useMemo(() => {
    if (isCreatingNew) return null;
    return categories.find(c => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId, isCreatingNew]);

  // Заполнение полей формы при выборе категории
  const populateFormWithCategory = useCallback((category: Category | null) => {
    if (category) {
      setFormDataName(category.label);
      setFormDataParentId(category.parentId || null);
      setFormDataIcon(category.icon || DEFAULT_CATEGORY_ICON);
      setFormDataColor(category.color || DEFAULT_CATEGORY_COLOR);
    } else {
      setFormDataName('');
      setFormDataParentId(null);
      setFormDataIcon(DEFAULT_CATEGORY_ICON);
      setFormDataColor(DEFAULT_CATEGORY_COLOR);
    }
    setNewKeywordInput('');
  }, []);

  // Переключение выбранной категории
  const handleSelectCategory = (catId: string) => {
    setIsCreatingNew(false);
    setSelectedCategoryId(catId);
    const cat = categories.find(c => c.id === catId) || null;
    populateFormWithCategory(cat);
  };

  // Режим добавления новой категории
  const handleStartCreateNew = (presetParentId?: string) => {
    setIsCreatingNew(true);
    setSelectedCategoryId(null);
    setFormDataName('');
    setFormDataParentId(presetParentId || null);
    setFormDataIcon(presetParentId ? 'ShoppingBag' : DEFAULT_CATEGORY_ICON);
    setFormDataColor(presetParentId ? (categories.find(c => c.id === presetParentId)?.color || DEFAULT_CATEGORY_COLOR) : DEFAULT_CATEGORY_COLOR);
    setNewKeywordInput('');
  };

  // Раскрытие/сворачивание дерева
  const toggleParentExpand = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParentIds(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  // Правила, привязанные к выбранной категории
  const currentCategoryRules = useMemo(() => {
    if (!selectedCategory) return [];
    return learnedRules.filter(r => r.categoryId === selectedCategory.id);
  }, [learnedRules, selectedCategory]);

  // Добавление ключевого слова к текущей категории
  const handleAddKeywordToCategory = () => {
    if (!selectedCategory || !newKeywordInput.trim()) return;
    const cleanWord = newKeywordInput.trim().toLowerCase();
    
    // Проверка на дубликат
    const exists = currentCategoryRules.some(r => r.keyword.toLowerCase() === cleanWord);
    if (exists) {
      toast.info('Это ключевое слово уже добавлено для данной категории');
      return;
    }

    const newRule: LearnedRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      keyword: cleanWord,
      cleanName: selectedCategory.label,
      categoryId: selectedCategory.id
    };

    onUpdateRules([newRule, ...learnedRules]);
    setNewKeywordInput('');
    toast.success(`Правило для «${cleanWord}» сохранено`);
  };

  // Удаление правила
  const handleDeleteRule = (ruleId: string) => {
    onUpdateRules(learnedRules.filter(r => r.id !== ruleId));
    toast.success('Правило удалено');
  };

  // Сохранение изменений категории
  const handleSaveCategory = () => {
    const validation = validateCategoryName(formDataName, categories, selectedCategory?.id);
    if (!validation.isValid) {
      toast.error(validation.error || 'Ошибка валидации');
      return;
    }

    if (isCreatingNew) {
      const newId = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const created: Category = {
        id: newId,
        label: formDataName.trim(),
        icon: formDataIcon,
        color: formDataColor,
        parentId: formDataParentId || undefined,
        isCustom: true
      };
      onUpdateCategories([...categories, created]);
      setIsCreatingNew(false);
      setSelectedCategoryId(newId);
      toast.success('Категория успешно создана');
    } else if (selectedCategory) {
      const updated = categories.map(c => {
        if (c.id === selectedCategory.id) {
          return {
            ...c,
            label: formDataName.trim(),
            icon: formDataIcon,
            color: formDataColor,
            parentId: formDataParentId || undefined
          };
        }
        return c;
      });
      onUpdateCategories(updated);
      toast.success('Изменения сохранены');
    }
  };

  // Перемещение подкатегории к новому родителю
  const handleMoveSubcategory = (subCatId: string, newParentId: string | undefined) => {
    if (subCatId === newParentId) return;
    const updated = categories.map(c => {
      if (c.id === subCatId) {
        return { ...c, parentId: newParentId };
      }
      return c;
    });
    onUpdateCategories(updated);
    toast.success('Подкатегория перемещена');
  };

  // Подтверждение и удаление категории
  const executeDeleteCategory = () => {
    if (!categoryToDelete) return;
    const targetId = categoryToDelete.id;

    // Переводим дочерние подкатегории в основные
    const updatedCategories = categories
      .filter(c => c.id !== targetId)
      .map(c => c.parentId === targetId ? { ...c, parentId: undefined } : c);

    if (onDeleteCategory) {
      onDeleteCategory(targetId);
    } else {
      onUpdateCategories(updatedCategories);
    }

    // Удаляем также связанные правила
    onUpdateRules(learnedRules.filter(r => r.categoryId !== targetId));

    setCategoryToDelete(null);
    const remainingFirst = updatedCategories.find(c => !c.parentId);
    setSelectedCategoryId(remainingFirst?.id || null);
    setIsCreatingNew(false);
    toast.success('Категория удалена');
  };

  // Ретроспективное применение правил к истории операций
  const handleApplyRulesToTransactions = (rulesToApply: LearnedRule[]) => {
    if (!transactions || !onUpdateTransactions || rulesToApply.length === 0) {
      toast.info('Нет операций или правил для применения');
      return;
    }

    let updatedCount = 0;
    const updatedTransactions = transactions.map(tx => {
      const textToMatch = `${tx.note || ''} ${tx.rawNote || ''}`.toLowerCase();
      const matched = rulesToApply.find(r => textToMatch.includes(r.keyword.toLowerCase()));
      if (matched && tx.category !== matched.categoryId) {
        updatedCount++;
        return {
          ...tx,
          category: matched.categoryId,
          note: matched.cleanName || tx.note
        };
      }
      return tx;
    });

    if (updatedCount > 0) {
      onUpdateTransactions(updatedTransactions);
      toast.success(`Обновлено операций в истории: ${updatedCount}`);
    } else {
      toast.info('Подходящих операций для перепривязки не найдено');
    }
  };

  // Родительские категории и фильтрация поиска
  const parentCategories = useMemo(() => {
    return categories.filter(c => !c.parentId);
  }, [categories]);

  const filteredTree = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return parentCategories;

    return parentCategories.filter(parent => {
      const parentMatches = parent.label.toLowerCase().includes(query);
      const subMatches = categories.some(
        c => c.parentId === parent.id && c.label.toLowerCase().includes(query)
      );
      return parentMatches || subMatches;
    });
  }, [parentCategories, categories, searchQuery]);

  // Статистика выбранной категории
  const selectedStats = useMemo(() => {
    if (!selectedCategory) return { transactionCount: 0, totalExpense: 0 };
    return calculateCategoryStats(selectedCategory.id, categories, transactions);
  }, [selectedCategory, categories, transactions]);

  // Подкатегории выбранного родителя
  const selectedSubcategories = useMemo(() => {
    if (!selectedCategory || selectedCategory.parentId) return [];
    return categories.filter(c => c.parentId === selectedCategory.id);
  }, [selectedCategory, categories]);

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0] dark:bg-[#18191C] text-[#2E3230] dark:text-gray-100 select-none">
      {/* Верхний тулбар на ПК */}
      <header className="px-6 py-4 bg-white/90 dark:bg-[#202225]/90 border-b border-[#C4C8BC]/40 dark:border-white/10 backdrop-blur-md shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4A7C59]/10 text-[#4A7C59] dark:text-emerald-400 flex items-center justify-center font-bold">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold font-headline leading-tight">Категории и правила ИИ</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {parentCategories.length} основных категорий, {categories.filter(c => c.parentId).length} подкатегорий, {learnedRules.length} правил
            </p>
          </div>
        </div>

        {/* Переключатель вкладок и глобальные действия */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'categories'
                  ? 'bg-white dark:bg-[#2C2E33] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
            >
              Дерево категорий
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'rules'
                  ? 'bg-white dark:bg-[#2C2E33] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
            >
              <BrainCircuit size={14} className="text-[#4A7C59] dark:text-emerald-400" />
              Все правила ({learnedRules.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleStartCreateNew()}
            className="px-3.5 py-2 rounded-xl bg-[#4A7C59] hover:bg-[#3D694A] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Новая категория</span>
          </button>
        </div>
      </header>

      {/* Основная рабочая область ПК: Двухколоночный Master-Detail Split Pane */}
      {activeTab === 'categories' && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Левая колонка: Дерево категорий и поиск */}
          <section className="w-full md:w-[380px] lg:w-[420px] border-r border-[#C4C8BC]/30 dark:border-white/10 flex flex-col bg-white/50 dark:bg-[#1E2023]/60 shrink-0">
            {/* Поисковая строка */}
            <div className="p-3 border-b border-[#C4C8BC]/20 dark:border-white/10">
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск категорий или подкатегорий..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-100/80 dark:bg-white/5 border border-transparent focus:border-[#4A7C59] dark:focus:border-emerald-500 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Список категорий с иерархией */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {filteredTree.map(parentCat => {
                const subCats = categories.filter(c => c.parentId === parentCat.id);
                const isSelected = selectedCategoryId === parentCat.id && !isCreatingNew;
                const isExpanded = !!expandedParentIds[parentCat.id];
                const isDragOver = dragOverParentId === parentCat.id;
                const parentStats = calculateCategoryStats(parentCat.id, categories, transactions);

                return (
                  <div
                    key={parentCat.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverParentId !== parentCat.id) setDragOverParentId(parentCat.id);
                    }}
                    onDragLeave={() => setDragOverParentId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedSubId = e.dataTransfer.getData('text/plain') || draggedCatId;
                      if (droppedSubId) handleMoveSubcategory(droppedSubId, parentCat.id);
                      setDragOverParentId(null);
                      setDraggedCatId(null);
                    }}
                    className={`rounded-2xl border transition-all ${
                      isDragOver
                        ? 'border-[#4A7C59] ring-2 ring-[#4A7C59]/30 bg-[#4A7C59]/5'
                        : isSelected
                          ? 'border-[#4A7C59] bg-[#4A7C59]/5 shadow-xs'
                          : 'border-gray-200/80 dark:border-white/5 bg-white dark:bg-[#202225] hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    {/* Заголовок родительской категории */}
                    <div
                      onClick={() => handleSelectCategory(parentCat.id)}
                      className="p-3 flex items-center justify-between gap-2 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => toggleParentExpand(parentCat.id, e)}
                          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                        >
                          {subCats.length > 0 && (
                            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                          )}
                        </button>

                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: parentCat.color || DEFAULT_CATEGORY_COLOR }}
                        >
                          <IconRenderer name={parentCat.icon} size={16} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {parentCat.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span>{subCats.length} подкат.</span>
                            {parentStats.transactionCount > 0 && (
                              <>
                                <span>•</span>
                                <span>{parentStats.transactionCount} опер.</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Быстрое добавление подкатегории */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartCreateNew(parentCat.id);
                        }}
                        title="Добавить подкатегорию в эту категорию"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-[#4A7C59] hover:bg-[#4A7C59]/10 transition"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Дочерние подкатегории */}
                    {isExpanded && subCats.length > 0 && (
                      <div className="px-3 pb-2.5 space-y-1 border-t border-gray-100 dark:border-white/5 pt-2">
                        {subCats.map(subCat => {
                          const isSubSelected = selectedCategoryId === subCat.id && !isCreatingNew;
                          return (
                            <div
                              key={subCat.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', subCat.id);
                                setDraggedCatId(subCat.id);
                              }}
                              onDragEnd={() => {
                                setDraggedCatId(null);
                                setDragOverParentId(null);
                              }}
                              onClick={() => handleSelectCategory(subCat.id)}
                              className={`flex items-center justify-between gap-2 p-2 rounded-xl text-xs transition cursor-pointer group ${
                                isSubSelected
                                  ? 'bg-[#4A7C59]/10 text-[#4A7C59] dark:text-emerald-400 font-bold'
                                  : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                              } ${draggedCatId === subCat.id ? 'opacity-40' : ''}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <GripVertical size={12} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 shrink-0 cursor-grab" />
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                                  style={{ backgroundColor: subCat.color || parentCat.color }}
                                >
                                  <IconRenderer name={subCat.icon} size={12} />
                                </div>
                                <span className="truncate">{subCat.label}</span>
                              </div>

                              <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition">
                                Перетащить
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredTree.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-xs">
                  Ничего не найдено по запросу «{searchQuery}»
                </div>
              )}
            </div>

            {/* Подвал левой колонки */}
            <div className="p-3 border-t border-[#C4C8BC]/20 dark:border-white/10 bg-gray-50/80 dark:bg-[#1C1D20]/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>Подсказка: перетаскивайте подкатегории между родителями</span>
            </div>
          </section>

          {/* Правая колонка: Инспектор выбранной категории и правила */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            
            {/* Верхняя плашка режима */}
            <div className="flex items-center justify-between pb-4 border-b border-[#C4C8BC]/30 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: formDataColor }}
                >
                  <IconRenderer name={formDataIcon} size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-headline text-gray-900 dark:text-white">
                    {isCreatingNew ? 'Создание новой категории' : (formDataName || 'Без названия')}
                  </h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>
                      {formDataParentId 
                        ? `Подкатегория в «${categories.find(c => c.id === formDataParentId)?.label || 'Родитель'}»`
                        : 'Основная родительская категория'}
                    </span>
                    {!isCreatingNew && selectedStats.transactionCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{selectedStats.transactionCount} операций ({selectedStats.totalExpense.toLocaleString('ru-RU')} ₽)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Кнопки действий сохранения */}
              <div className="flex items-center gap-2">
                {!isCreatingNew && selectedCategory && (
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(selectedCategory)}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition"
                    title="Удалить категорию"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  className="px-4 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3D694A] text-white text-xs font-bold shadow-xs transition flex items-center gap-2 active:scale-95"
                >
                  <Save size={15} />
                  <span>{isCreatingNew ? 'Создать категорию' : 'Сохранить изменения'}</span>
                </button>
              </div>
            </div>

            {/* Сетка настроек категории */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Поле 1: Название и привязка к родителю */}
              <div className="bg-white dark:bg-[#202225] p-5 rounded-2xl border border-gray-200/80 dark:border-white/5 space-y-4 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Основные параметры
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Название категории
                  </label>
                  <input
                    type="text"
                    value={formDataName}
                    onChange={(e) => setFormDataName(e.target.value)}
                    placeholder="Например: Продукты, Кофейни, Такси..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#4A7C59] outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Родительская категория
                  </label>
                  <select
                    value={formDataParentId || ''}
                    onChange={(e) => setFormDataParentId(e.target.value || null)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#4A7C59] outline-none transition cursor-pointer"
                  >
                    <option value="">— Основная категория (без родителя) —</option>
                    {parentCategories
                      .filter(p => p.id !== selectedCategory?.id)
                      .map(parent => (
                        <option key={parent.id} value={parent.id}>
                          📁 {parent.label}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    Подкатегории группируются внутри родителя и суммируются в аналитике бюджета.
                  </p>
                </div>
              </div>

              {/* Поле 2: Палитра цветов */}
              <div className="bg-white dark:bg-[#202225] p-5 rounded-2xl border border-gray-200/80 dark:border-white/5 space-y-4 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Фирменный цвет
                </h4>

                <div className="flex flex-wrap gap-2.5">
                  {TERRA_CATEGORY_COLORS.map(color => {
                    const isSelected = formDataColor.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormDataColor(color)}
                        className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center relative ${
                          isSelected ? 'scale-110 ring-2 ring-offset-2 ring-[#4A7C59] dark:ring-offset-[#202225] shadow-xs' : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {isSelected && <Check size={16} className="text-white drop-shadow-xs" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Выбор иконки по группам */}
            <div className="bg-white dark:bg-[#202225] p-5 rounded-2xl border border-gray-200/80 dark:border-white/5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Иконка категории
                </h4>
                <span className="text-xs text-gray-400">Выбрано: {formDataIcon}</span>
              </div>

              <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {ICON_GROUPS.map(group => (
                  <div key={group.title} className="space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      {group.title}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {group.icons.map(iconName => {
                        const isIconActive = formDataIcon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setFormDataIcon(iconName)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                              isIconActive
                                ? 'bg-[#4A7C59] text-white shadow-xs'
                                : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                            title={iconName}
                          >
                            <IconRenderer name={iconName} size={18} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Блок правил ИИ и авто-распознавания для текущей категории */}
            {!isCreatingNew && selectedCategory && (
              <div className="bg-white dark:bg-[#202225] p-5 rounded-2xl border border-gray-200/80 dark:border-white/5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      <Zap size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        Правила авто-распознавания для «{selectedCategory.label}»
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Операции с этими ключевыми словами автоматически относятся к этой категории
                      </p>
                    </div>
                  </div>

                  {/* Кнопка применить к прошлым операциям */}
                  {currentCategoryRules.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleApplyRulesToTransactions(currentCategoryRules)}
                      className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition"
                    >
                      <RefreshCw size={13} />
                      <span>Применить к истории</span>
                    </button>
                  )}
                </div>

                {/* Поле добавления нового ключевого слова */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeywordToCategory();
                      }
                    }}
                    placeholder="Введите название магазина или тег (напр. пятерочка, вкусвилл, uber) и нажмите Enter..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-[#4A7C59]"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeywordToCategory}
                    className="px-3.5 py-2 bg-[#4A7C59] text-white text-xs font-bold rounded-xl hover:bg-[#3D694A] transition"
                  >
                    Добавить
                  </button>
                </div>

                {/* Список активных тегов-правил */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {currentCategoryRules.map(rule => (
                    <span
                      key={rule.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 dark:bg-white/10 text-xs font-medium text-gray-800 dark:text-gray-200 border border-gray-200/60 dark:border-white/5"
                    >
                      <span>{rule.keyword}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}

                  {currentCategoryRules.length === 0 && (
                    <p className="text-xs text-gray-400 italic">
                      Пока нет правил для этой категории. Добавьте ключевые слова выше.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Вложенные подкатегории выбранного родителя */}
            {!isCreatingNew && selectedCategory && !selectedCategory.parentId && (
              <div className="bg-white dark:bg-[#202225] p-5 rounded-2xl border border-gray-200/80 dark:border-white/5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Подкатегории ({selectedSubcategories.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleStartCreateNew(selectedCategory.id)}
                    className="text-xs font-bold text-[#4A7C59] dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Добавить подкатегорию
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {selectedSubcategories.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => handleSelectCategory(sub.id)}
                      className="p-2.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-black/20 flex items-center justify-between gap-2 hover:border-[#4A7C59]/50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 text-xs"
                          style={{ backgroundColor: sub.color || selectedCategory.color }}
                        >
                          <IconRenderer name={sub.icon} size={12} />
                        </div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                          {sub.label}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-gray-400 shrink-0" />
                    </div>
                  ))}

                  {selectedSubcategories.length === 0 && (
                    <div className="col-span-full py-4 text-center text-xs text-gray-400 italic">
                      У этой категории пока нет подкатегорий. Нажмите «Добавить подкатегорию» для создания.
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Вкладка «Все правила ИИ» */}
      {activeTab === 'rules' && (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[#C4C8BC]/30 dark:border-white/10">
            <div>
              <h3 className="text-lg font-bold font-headline text-gray-900 dark:text-white">
                Массовое управление правилами распознавания
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Автоматическое назначение категорий для входящих чеков, SMS и выписок
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleApplyRulesToTransactions(learnedRules)}
              className="px-4 py-2 rounded-xl bg-[#4A7C59] hover:bg-[#3D694A] text-white text-xs font-bold flex items-center gap-2 transition shadow-xs"
            >
              <RefreshCw size={14} />
              <span>Применить все правила ко всей истории операций</span>
            </button>
          </div>

          {/* Список всех правил, сгруппированных по категориям */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => {
              const rules = learnedRules.filter(r => r.categoryId === cat.id);
              if (rules.length === 0) return null;

              return (
                <div
                  key={cat.id}
                  className="bg-white dark:bg-[#202225] p-4 rounded-2xl border border-gray-200/80 dark:border-white/5 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <IconRenderer name={cat.icon} size={14} />
                      </div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {cat.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400">
                      {rules.length} правил
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rules.map(rule => (
                      <span
                        key={rule.id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-white/5 text-[11px] font-medium text-gray-700 dark:text-gray-300"
                      >
                        <span>{rule.keyword}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Диалог подтверждения удаления категории */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#202225] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-white/10 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/40">
                <AlertTriangle size={24} />
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                Удалить категорию?
              </h4>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Вы уверены, что хотите удалить категорию «<strong>{categoryToDelete.label}</strong>»?
              Все связанные подкатегории станут основными категориями.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={executeDeleteCategory}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesSettings;
