import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, X, Search, Trash2, Check, ChevronDown, 
  ShoppingBasket, Utensils, Coffee, Home, Car, HeartPulse, 
  Dumbbell, GraduationCap, Baby, Dog, CreditCard, Zap, 
  Plane, Gamepad2, ShoppingBag, Scissors, Fuel, Wrench, 
  FileText, Film, Trees, FastForward, Shirt, PiggyBank, 
  Store, CheckCircle2, Layers3, Tag
} from 'lucide-react';
import { Category, LearnedRule, AppSettings, Transaction } from '../types';
import { toast } from 'sonner';

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

// Catalog Icons mapping
const CATEGORY_ICONS = [
  { id: 'shopping_basket', label: 'Продукты', icon: ShoppingBasket },
  { id: 'restaurant', label: 'Кафе', icon: Utensils },
  { id: 'local_cafe', label: 'Кофе', icon: Coffee },
  { id: 'home', label: 'Дом', icon: Home },
  { id: 'directions_car', label: 'Авто', icon: Car },
  { id: 'medical_services', label: 'Аптека', icon: HeartPulse },
  { id: 'fitness_center', label: 'Спорт', icon: Dumbbell },
  { id: 'school', label: 'Учеба', icon: GraduationCap },
  { id: 'child_care', label: 'Дети', icon: Baby },
  { id: 'pets', label: 'Питомцы', icon: Dog },
  { id: 'payments', label: 'Платежи', icon: CreditCard },
  { id: 'bolt', label: 'ЖКХ', icon: Zap },
  { id: 'flight', label: 'Поездки', icon: Plane },
  { id: 'sports_esports', label: 'Игры', icon: Gamepad2 },
  { id: 'local_mall', label: 'Покупки', icon: ShoppingBag },
  { id: 'content_cut', label: 'Уход', icon: Scissors },
  { id: 'local_gas_station', label: 'АЗС', icon: Fuel },
  { id: 'construction', label: 'Ремонт', icon: Wrench },
  { id: 'receipt_long', label: 'Счета', icon: FileText },
  { id: 'movie', label: 'Кино', icon: Film },
  { id: 'park', label: 'Парки', icon: Trees },
  { id: 'fastfood', label: 'Фастфуд', icon: FastForward },
  { id: 'checkroom', label: 'Одежда', icon: Shirt },
  { id: 'savings', label: 'Копилка', icon: PiggyBank },
];

const PRESET_COLORS = [
  '#3E6B4E', '#52796F', '#3B82F6', '#06B6D4', 
  '#8B5CF6', '#B94B32', '#C59A45', '#64748B'
];

export const CategoriesSettings: React.FC<CategoriesSettingsProps> = ({
  categories,
  onUpdateCategories,
  onDeleteCategory,
  learnedRules,
  onUpdateRules,
}) => {
  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<'categories' | 'rules'>('categories');

  // Main Categories
  const mainCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  
  const [selectedCatId, setSelectedCatId] = useState<string>(() => {
    return mainCategories[0]?.id || categories[0]?.id || '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [accordionOpenMap, setAccordionOpenMap] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Inspector Form State
  const selectedCat = useMemo(() => {
    return categories.find(c => c.id === selectedCatId) || mainCategories[0];
  }, [categories, selectedCatId, mainCategories]);

  const [formName, setFormDataName] = useState(selectedCat?.label || '');
  const [formParentId, setFormDataParentId] = useState<string>(selectedCat?.parentId || '');
  const [formColor, setFormDataColor] = useState<string>(selectedCat?.color || '#3E6B4E');
  const [formIcon, setFormDataIcon] = useState<string>(selectedCat?.icon || 'shopping_basket');

  // Subcategories of selected parent
  const selectedSubcategories = useMemo(() => {
    if (!selectedCat) return [];
    return categories.filter(c => c.parentId === selectedCat.id);
  }, [categories, selectedCat]);

  // Sync Form with Selected Category
  useEffect(() => {
    if (selectedCat) {
      setFormDataName(selectedCat.label);
      setFormDataParentId(selectedCat.parentId || '');
      setFormDataColor(selectedCat.color || '#3E6B4E');
      setFormDataIcon(selectedCat.icon || 'shopping_basket');
    }
  }, [selectedCat]);

  // CONSOLIDATED RULES: Group rules by Main Category ID
  const groupedRulesByCategory = useMemo(() => {
    const map = new Map<string, { mainCat: Category; subcats: Category[]; rules: LearnedRule[] }>();

    for (const mainCat of mainCategories) {
      const subcats = categories.filter(c => c.parentId === mainCat.id);
      const subcatIds = new Set(subcats.map(s => s.id));
      subcatIds.add(mainCat.id);

      // Get all rules belonging to this main category or any of its subcategories
      const catRules = learnedRules.filter(r => 
        subcatIds.has(r.categoryId) || 
        (r.subCategoryId && subcatIds.has(r.subCategoryId))
      );

      map.set(mainCat.id, {
        mainCat,
        subcats,
        rules: catRules
      });
    }

    return map;
  }, [mainCategories, categories, learnedRules]);

  // Inline Rule Adding & Editing States
  const [addingKeywordRuleId, setAddingKeywordRuleId] = useState<string | null>(null);
  const [inlineKeywordText, setInlineKeywordText] = useState('');

  // Handlers
  const handleSelectCategory = (id: string) => {
    setSelectedCatId(id);
  };

  const toggleAccordion = (id: string) => {
    setAccordionOpenMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveCategory = () => {
    if (!selectedCat) return;
    if (!formName.trim()) {
      toast.error('Введите название категории');
      return;
    }

    const updated = categories.map(c => {
      if (c.id === selectedCat.id) {
        return {
          ...c,
          label: formName.trim(),
          parentId: formParentId || undefined,
          color: formColor,
          icon: formIcon,
        };
      }
      return c;
    });

    onUpdateCategories(updated);
    setSaveSuccess(true);
    setShowToast(true);
    toast.success('Изменения сохранены');
    setTimeout(() => {
      setSaveSuccess(false);
      setShowToast(false);
    }, 2000);
  };

  const handleCreateNewCategory = () => {
    const newId = 'cat_' + Date.now();
    const newCat: Category = {
      id: newId,
      label: 'Новая категория',
      icon: 'shopping_basket',
      color: '#3E6B4E',
      type: 'expense',
    };

    onUpdateCategories([...categories, newCat]);
    setSelectedCatId(newId);
    toast.success('Категория создана');
  };

  const handleAddSubcategory = () => {
    if (!selectedCat) return;
    const newSubId = 'subcat_' + Date.now();
    const newSub: Category = {
      id: newSubId,
      label: 'Новая подкатегория',
      parentId: selectedCat.id,
      icon: 'storefront',
      color: selectedCat.color,
      type: selectedCat.type || 'expense',
    };

    onUpdateCategories([...categories, newSub]);
    toast.success('Подкатегория добавлена');
  };

  const handleDeleteCurrentCategory = () => {
    if (!selectedCat) return;
    if (confirm(`Удалить категорию «${selectedCat.label}»?`)) {
      if (onDeleteCategory) {
        onDeleteCategory(selectedCat.id);
      } else {
        onUpdateCategories(categories.filter(c => c.id !== selectedCat.id && c.parentId !== selectedCat.id));
      }
      const remaining = categories.filter(c => c.id !== selectedCat.id);
      if (remaining.length > 0) {
        setSelectedCatId(remaining[0].id);
      }
      toast.success('Категория удалена');
    }
  };

  // Rule keyword modification handlers
  const handleRemoveKeywordFromRule = (ruleId: string, kwToRemove: string) => {
    const updated = learnedRules.map(r => {
      if (r.id === ruleId) {
        const kws = (r.keywords || [r.keyword]).filter(k => k.toLowerCase() !== kwToRemove.toLowerCase());
        return { ...r, keywords: kws, keyword: kws[0] || '' };
      }
      return r;
    }).filter(r => (r.keywords && r.keywords.length > 0) || r.keyword);

    onUpdateRules(updated);
    toast.success('Ключевое слово удалено');
  };

  const handleAddKeywordToRule = (ruleId: string) => {
    const word = inlineKeywordText.trim().toLowerCase();
    if (!word) return;

    const updated = learnedRules.map(r => {
      if (r.id === ruleId) {
        const kws = r.keywords || [r.keyword];
        if (!kws.includes(word)) {
          return { ...r, keywords: [...kws, word] };
        }
      }
      return r;
    });

    onUpdateRules(updated);
    setInlineKeywordText('');
    setAddingKeywordRuleId(null);
    toast.success('Ключевое слово добавлено');
  };

  const handleDeleteRule = (ruleId: string) => {
    onUpdateRules(learnedRules.filter(r => r.id !== ruleId));
    toast.success('Правило удалено');
  };

  const handleCreateNewRuleForCategory = (catId: string, subcatId?: string) => {
    const word = prompt('Введите ключевое слово для нового правила (например: вкусвилл, лукойл...):');
    if (!word || !word.trim()) return;

    const cleanWord = word.trim().toLowerCase();
    const newRule: LearnedRule = {
      id: 'rule_' + Date.now(),
      keyword: cleanWord,
      keywords: [cleanWord],
      categoryId: subcatId || catId,
      subCategoryId: subcatId || undefined,
      confidence: 1
    };

    onUpdateRules([...learnedRules, newRule]);
    toast.success('Правило успешно добавлено');
  };

  const handleUpdateRuleTarget = (ruleId: string, targetId: string) => {
    const updated = learnedRules.map(r => {
      if (r.id === ruleId) {
        return { 
          ...r, 
          categoryId: targetId, 
          subCategoryId: targetId === selectedCat?.id ? undefined : targetId 
        };
      }
      return r;
    });
    onUpdateRules(updated);
    toast.success('Получатель правила изменен');
  };

  // Filter main categories
  const filteredMainCategories = useMemo(() => {
    if (!searchQuery.trim()) return mainCategories;
    const q = searchQuery.toLowerCase();
    return mainCategories.filter(cat => {
      const labelMatch = cat.label.toLowerCase().includes(q);
      const subMatch = categories.some(sub => sub.parentId === cat.id && sub.label.toLowerCase().includes(q));
      return labelMatch || subMatch;
    });
  }, [mainCategories, categories, searchQuery]);

  return (
    <div className="w-full h-full bg-[#FAF6F0] dark:bg-[#1C1F1E] text-[#2E3230] dark:text-white flex flex-col overflow-hidden rounded-2xl border border-[#E4E0D8] dark:border-white/10 shadow-2xl">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1100] pointer-events-none transition-all duration-300 flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#2E3230] text-white shadow-xl">
          <CheckCircle2 size={18} className="text-[#8ECF9E]" />
          <span className="text-xs font-semibold tracking-wide">Изменения сохранены</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE VIEW (< md) */}
      {/* ========================================================================= */}
      <div className="md:hidden flex-1 flex flex-col overflow-y-auto pb-24">
        
        {/* Interactive Search & Overview Header */}
        <div className="px-4 pt-3 pb-2 space-y-3 shrink-0">
          
          {/* Ambient Stats Card */}
          <div className="relative overflow-hidden rounded-xl bg-[#F0ECE4] dark:bg-[#202225] p-4 shadow-2xs">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-medium text-[#6B6358] dark:text-stone-400 uppercase tracking-wider">
                  Всего категорий
                </span>
                <h2 className="text-2xl font-bold text-[#2E3230] dark:text-white">
                  {categories.length}
                </h2>
                <p className="text-[13px] text-[#4A4E4A] dark:text-stone-300">
                  Автоматическая сортировка расходов Terra
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#4A7C59]/10 flex items-center justify-center text-[#4A7C59] dark:text-emerald-400">
                <Layers3 size={24} />
              </div>
            </div>

            {/* Track Bar */}
            <div className="mt-3.5 pt-3 flex items-center gap-2">
              <div className="h-2 rounded-full flex-1 bg-[#E4E0D8] dark:bg-white/10 overflow-hidden flex">
                <div className="bg-[#4A7C59] h-full rounded-full transition-all duration-500" style={{ width: '60%' }} />
                <div className="bg-[#C4A66A] h-full rounded-full transition-all duration-500" style={{ width: '25%' }} />
                <div className="bg-[#78A886] h-full rounded-full transition-all duration-500" style={{ width: '15%' }} />
              </div>
              <span className="text-[11px] font-bold text-[#6B6358] dark:text-stone-300 px-1 shrink-0">
                {learnedRules.length} правил
              </span>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-3.5 text-[#6B6358] dark:text-stone-400 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск категории или мерчанта..."
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#F5F1EA] dark:bg-[#202225] text-[#2E3230] dark:text-white placeholder:text-[#74796E] text-sm transition-all focus:outline-none focus:bg-white dark:focus:bg-[#18191C]"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-[#6B6358] hover:text-[#2E3230] cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Segmented Tab Switcher with Sliding Pill */}
          <div className="relative p-1 bg-[#F0ECE4] dark:bg-[#202225] rounded-xl flex items-center text-xs font-semibold">
            <div 
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white dark:bg-[#18191C] rounded-lg shadow-2xs transition-transform duration-300 ease-out"
              style={{ transform: mobileTab === 'categories' ? 'translateX(0)' : 'translateX(100%)' }}
            />
            <button 
              type="button"
              onClick={() => setMobileTab('categories')}
              className={`relative z-10 flex-1 py-2 text-center rounded-lg transition-colors cursor-pointer ${
                mobileTab === 'categories' ? 'text-[#4A7C59] dark:text-emerald-400 font-bold' : 'text-[#6B6358] dark:text-stone-400'
              }`}
            >
              Категории ({filteredMainCategories.length})
            </button>
            <button 
              type="button"
              onClick={() => setMobileTab('rules')}
              className={`relative z-10 flex-1 py-2 text-center rounded-lg transition-colors cursor-pointer ${
                mobileTab === 'rules' ? 'text-[#4A7C59] dark:text-emerald-400 font-bold' : 'text-[#6B6358] dark:text-stone-400'
              }`}
            >
              Правила ({groupedRulesByCategory.size})
            </button>
          </div>
        </div>

        {/* MOBILE SECTION 1: CATEGORIES */}
        {mobileTab === 'categories' && (
          <div className="px-4 py-2 space-y-3">
            {filteredMainCategories.map(cat => {
              const subcats = categories.filter(s => s.parentId === cat.id);
              const isOpen = !!accordionOpenMap[cat.id];
              const isSelected = selectedCat?.id === cat.id;

              return (
                <div 
                  key={cat.id}
                  className={`rounded-xl bg-[#F5F1EA] dark:bg-[#202225] overflow-hidden transition-all duration-200 border ${
                    isSelected ? 'border-[#4A7C59]' : 'border-transparent'
                  }`}
                >
                  <div 
                    onClick={() => {
                      handleSelectCategory(cat.id);
                      toggleAccordion(cat.id);
                    }}
                    className="p-4 flex items-center justify-between cursor-pointer active:bg-[#F0ECE4] select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                        style={{ backgroundColor: cat.color || '#4A7C59' }}
                      >
                        <ShoppingBasket size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-[#2E3230] dark:text-white truncate">
                          {cat.label}
                        </h3>
                        <p className="text-xs text-[#6B6358] dark:text-stone-400 truncate">
                          {subcats.length} подкатегорий
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ChevronDown 
                        size={20} 
                        className={`text-[#6B6358] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                      />
                    </div>
                  </div>

                  {/* Accordion Expanded Subchips & Color Picker */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#E4E0D8] dark:border-white/10">
                      
                      {/* Subcategory Chips */}
                      {subcats.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <p className="text-[11px] font-semibold text-[#6B6358] dark:text-stone-400 uppercase tracking-wider">
                            Подкатегории:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {subcats.map(sub => (
                              <span 
                                key={sub.id}
                                onClick={() => handleSelectCategory(sub.id)}
                                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#18191C] text-xs font-medium text-[#2E3230] dark:text-white cursor-pointer active:scale-95 transition-all shadow-2xs"
                              >
                                {sub.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Color Picker Group */}
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#6B6358] dark:text-stone-400 uppercase tracking-wider">
                          Цветовой маркер
                        </span>
                        <div className="flex items-center gap-2">
                          {PRESET_COLORS.slice(0, 5).map(col => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setFormDataColor(col)}
                              style={{ backgroundColor: col }}
                              className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                            >
                              {formColor === col && <Check size={12} className="text-white font-bold" />}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick Icon Picker Tool */}
            {selectedCat && (
              <div className="p-4 rounded-xl bg-[#F0ECE4] dark:bg-[#202225] space-y-2.5 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2E3230] dark:text-white">
                    Быстрая смена пиктограммы
                  </span>
                  <span className="text-[11px] text-[#6B6358] dark:text-stone-400">
                    {selectedCat.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  {CATEGORY_ICONS.slice(0, 6).map(item => {
                    const IconComp = item.icon;
                    const isSelected = formIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormDataIcon(item.id)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#4A7C59] text-white shadow-2xs' 
                            : 'bg-[#F5F1EA] dark:bg-[#18191C] text-[#6B6358] dark:text-stone-300 hover:bg-white'
                        }`}
                      >
                        <IconComp size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* MOBILE SECTION 2: DISTINCT RULES GROUPED IN ONE CARD PER CATEGORY */}
        {mobileTab === 'rules' && (
          <div className="px-4 py-2 space-y-4">
            {Array.from(groupedRulesByCategory.values()).map(({ mainCat, subcats, rules }) => (
              <div 
                key={mainCat.id}
                className="p-4 rounded-xl bg-[#F5F1EA] dark:bg-[#202225] space-y-3.5 border border-[#E4E0D8] dark:border-white/10"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E0D8]/60 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: mainCat.color || '#4A7C59' }}
                    >
                      <ShoppingBasket size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#2E3230] dark:text-white leading-tight">
                        {mainCat.label}
                      </h3>
                      <p className="text-[11px] text-[#6B6358] dark:text-stone-400">
                        Объединено правил: {rules.length}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCreateNewRuleForCategory(mainCat.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#4A7C59] text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Добавить</span>
                  </button>
                </div>

                {/* List of distinct rules inside this category card */}
                {rules.length === 0 ? (
                  <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-2">
                    Правил пока нет. Нажмите «Добавить», чтобы настроить распознавание.
                  </p>
                ) : (
                  <div className="space-y-3.5 divide-y divide-[#E4E0D8]/60 dark:divide-white/5">
                    {rules.map((rule, rIdx) => {
                      const ruleKeywords = rule.keywords || [rule.keyword];
                      const currentRuleTarget = categories.find(c => c.id === rule.categoryId) || mainCat;

                      return (
                        <div key={rule.id} className={`pt-3.5 ${rIdx === 0 ? 'pt-0 border-t-0' : ''} space-y-2`}>
                          <div className="flex items-center justify-between">
                            {/* Rule Target Dropdown */}
                            <select
                              value={rule.categoryId}
                              onChange={e => handleUpdateRuleTarget(rule.id, e.target.value)}
                              className="bg-white dark:bg-[#18191C] text-[11px] font-bold px-2 py-1 rounded border border-[#E4E0D8] dark:border-white/10 text-[#4A7C59] dark:text-emerald-400 outline-none cursor-pointer"
                            >
                              <option value={mainCat.id}>Направить в: {mainCat.label}</option>
                              {subcats.map(sub => (
                                <option key={sub.id} value={sub.id}>Направить в: {sub.label}</option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-[#B94B32] hover:opacity-85 p-1 cursor-pointer"
                              title="Удалить правило"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Keywords for this specific rule */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                Ключевые фразы:
                              </span>
                              <button
                                type="button"
                                onClick={() => setAddingKeywordRuleId(rule.id)}
                                className="text-[11px] text-[#4A7C59] hover:underline font-bold"
                              >
                                + слово
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {ruleKeywords.map(kw => (
                                <span
                                  key={kw}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#18191C] border border-[#E4E0D8] dark:border-white/10 text-xs font-semibold font-mono text-[#2E3230] dark:text-stone-200"
                                >
                                  {kw}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKeywordFromRule(rule.id, kw)}
                                    className="text-stone-400 hover:text-red-500 cursor-pointer p-0.5"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}

                              {addingKeywordRuleId === rule.id && (
                                <div className="inline-flex items-center gap-1 bg-white dark:bg-[#18191C] p-1 rounded-md border border-[#4A7C59]">
                                  <input
                                    type="text"
                                    value={inlineKeywordText}
                                    onChange={e => setInlineKeywordText(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleAddKeywordToRule(rule.id);
                                      if (e.key === 'Escape') setAddingKeywordRuleId(null);
                                    }}
                                    placeholder="слово..."
                                    autoFocus
                                    className="px-1.5 py-0.5 bg-transparent text-xs font-mono text-[#2E3230] dark:text-white outline-none w-20"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddKeywordToRule(rule.id)}
                                    className="text-[#4A7C59] font-bold"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAddingKeywordRuleId(null)}
                                    className="text-stone-400 hover:text-red-500"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Mobile Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#FAF6F0]/90 dark:bg-[#1C1F1E]/90 backdrop-blur-md shadow-2xl flex items-center gap-2.5 z-40 border-t border-[#E4E0D8] dark:border-white/10">
          <button 
            type="button"
            onClick={handleCreateNewCategory}
            className="h-12 px-4 rounded-xl bg-[#E4E0D8] dark:bg-white/10 text-[#2E3230] dark:text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
          >
            <Plus size={18} />
            <span>Новая</span>
          </button>
          
          <button 
            type="button"
            onClick={handleSaveCategory}
            className="h-12 flex-1 rounded-xl bg-[#4A7C59] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-2xs active:scale-95 transition-transform cursor-pointer"
          >
            <Check size={20} />
            <span>{saveSuccess ? 'Сохранено!' : 'Сохранить изменения'}</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        
        {/* Left Column: Category Catalog */}
        <div className="w-[35%] xl:w-[32%] min-w-[300px] border-r border-[#E4E0D8] dark:border-white/10 flex flex-col bg-[#FAF6F0]/40 dark:bg-black/20 shrink-0">
          
          {/* Search & Count Badge Bar */}
          <div className="p-3.5 border-b border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#18191C] flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6358] pointer-events-none" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск категории или подкатегории..."
                className="w-full pl-9 pr-8 py-2 bg-[#FAF6F0] dark:bg-[#202225] border border-[#E4E0D8] dark:border-white/10 rounded-xl text-xs text-[#2E3230] dark:text-white outline-none focus:border-[#4A7C59] transition-all"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B6358] hover:text-[#2E3230] cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="text-xs font-mono text-[#6B6358] px-2.5 py-2 bg-[#F0ECE4] dark:bg-white/10 rounded-xl shrink-0 font-semibold">
              {filteredMainCategories.length} категорий
            </span>
          </div>

          {/* Categories Scroll List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            
            {filteredMainCategories.map((cat) => {
              const isSelected = selectedCat?.id === cat.id;
              const subcats = categories.filter(sub => sub.parentId === cat.id);
              const isOpen = !!accordionOpenMap[cat.id];

              if (isSelected) {
                // Selected Active Category Card
                return (
                  <div 
                    key={cat.id}
                    className="rounded-xl border-2 border-[#4A7C59] bg-white dark:bg-[#202225] p-3.5 shadow-2xs transition-all duration-200"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-[#E4E0D8]/60 dark:border-white/10">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
                          style={{ backgroundColor: cat.color || '#4A7C59' }}
                        >
                          <ShoppingBasket size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#2E3230] dark:text-white leading-tight">
                              {cat.label}
                            </span>
                          </div>
                          <span className="text-xs text-[#6B6358] dark:text-stone-400">
                            {subcats.length} подкатегорий
                          </span>
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={handleAddSubcategory}
                        className="text-[#4A7C59] dark:text-emerald-400 hover:text-[#335840] active:scale-95 text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#EAF1ED] transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Подкатегория</span>
                      </button>
                    </div>

                    {/* Subcategories Grid */}
                    {subcats.length > 0 && (
                      <div className="pt-3">
                        <div className="text-[11px] font-bold text-[#6B6358] dark:text-stone-400 uppercase tracking-wider mb-2">
                          Подкатегории
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {subcats.map((sub) => (
                            <div 
                              key={sub.id}
                              onClick={() => handleSelectCategory(sub.id)}
                              className="p-2.5 rounded-lg bg-[#EAF1ED] dark:bg-emerald-950/40 border border-[#4A7C59]/40 flex items-center justify-between cursor-pointer transition-all hover:shadow-2xs active:scale-[0.98]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Store size={15} className="text-[#4A7C59] dark:text-emerald-400 shrink-0" />
                                <span className="text-xs font-bold text-[#2E3230] dark:text-white truncate">
                                  {sub.label}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Unselected Main Category
              return (
                <div 
                  key={cat.id}
                  className="rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#202225] hover:border-[#4A7C59]/60 transition-all duration-200 overflow-hidden"
                >
                  <div 
                    onClick={() => handleSelectCategory(cat.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
                        style={{ backgroundColor: cat.color || '#6B6358' }}
                      >
                        <ShoppingBasket size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-[#2E3230] dark:text-white block leading-tight">
                          {cat.label}
                        </span>
                        <span className="text-[11px] text-[#6B6358] dark:text-stone-400">
                          {subcats.length} подкатегорий
                        </span>
                      </div>
                    </div>

                    {subcats.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAccordion(cat.id);
                        }}
                        className="p-1 text-[#6B6358] hover:text-[#2E3230] transition-transform duration-300 cursor-pointer"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        <ChevronDown size={18} />
                      </button>
                    )}
                  </div>

                  {/* Accordion Subcategories List */}
                  {isOpen && subcats.length > 0 && (
                    <div className="bg-[#FAF6F0]/80 dark:bg-black/30 px-3.5 py-2.5 grid grid-cols-2 gap-2 border-t border-[#E4E0D8]/50 dark:border-white/10">
                      {subcats.map(sub => (
                        <div 
                          key={sub.id}
                          onClick={() => handleSelectCategory(sub.id)}
                          className="p-2 rounded-lg bg-white dark:bg-[#18191C] border border-[#E4E0D8] dark:border-white/10 text-xs text-[#2E3230] dark:text-white font-semibold flex justify-between items-center cursor-pointer hover:border-[#4A7C59]/40 transition-colors"
                        >
                          <span className="truncate">{sub.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>

        {/* Right Column: Full-Width Category Parameters Inspector & Consolidated Recognition Rules */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#18191C] overflow-hidden">
          
          {/* Header */}
          <div className="p-6 pb-4 border-b border-[#E4E0D8] dark:border-white/10 flex items-center justify-between shrink-0 bg-white dark:bg-[#18191C]">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#6B6358] dark:text-stone-400 tracking-wider block">
                Параметры и правила
              </span>
              <h2 className="text-lg font-bold text-[#2E3230] dark:text-white leading-tight">
                {selectedCat?.label || 'Выберите категорию'}
              </h2>
            </div>
            {selectedCat && (
              <button 
                type="button"
                onClick={handleDeleteCurrentCategory}
                title="Удалить категорию"
                className="w-9 h-9 rounded-xl bg-[#FBECE8] text-[#B94B32] hover:opacity-85 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {/* Form Scroll Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Name & Parent Category Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2E3230] dark:text-white uppercase tracking-wider mb-2">
                  Название категории
                </label>
                <input 
                  type="text"
                  value={formName}
                  onChange={e => setFormDataName(e.target.value)}
                  className="w-full bg-[#FAF6F0] dark:bg-[#202225] border border-[#E4E0D8] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#2E3230] dark:text-white outline-none focus:border-[#4A7C59] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2E3230] dark:text-white uppercase tracking-wider mb-2">
                  Родительская категория
                </label>
                <select 
                  value={formParentId}
                  onChange={e => setFormDataParentId(e.target.value)}
                  className="w-full bg-[#FAF6F0] dark:bg-[#202225] border border-[#E4E0D8] dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#2E3230] dark:text-white outline-none focus:border-[#4A7C59] cursor-pointer"
                >
                  <option value="">Основная категория (Без родительской)</option>
                  {mainCategories.filter(m => m.id !== selectedCat?.id).map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color Swatch Selector */}
            <div>
              <label className="block text-xs font-bold text-[#2E3230] dark:text-white uppercase tracking-wider mb-2">
                Цветовой маркер
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {PRESET_COLORS.map(color => {
                  const isSelected = formColor === color;
                  return (
                    <button 
                      key={color}
                      type="button"
                      onClick={() => setFormDataColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-all cursor-pointer ${
                        isSelected ? 'ring-2 ring-offset-2 ring-[#4A7C59]' : 'hover:scale-105'
                      }`}
                    >
                      {isSelected && <Check size={14} className="font-bold" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 24-Icon Grid Catalog */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#2E3230] dark:text-white uppercase tracking-wider">
                  Иконка категории
                </label>
                <span className="text-[11px] text-[#6B6358]">24 иконки каталога</span>
              </div>
              <div className="p-3 bg-[#FAF6F0]/80 dark:bg-black/20 border border-[#E4E0D8] dark:border-white/10 rounded-xl">
                <div className="grid grid-cols-8 gap-2">
                  {CATEGORY_ICONS.map(item => {
                    const IconComp = item.icon;
                    const isSelected = formIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormDataIcon(item.id)}
                        className={`h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-2 border-[#4A7C59] bg-[#EAF1ED] text-[#4A7C59] dark:bg-emerald-950 dark:text-emerald-300 shadow-2xs' 
                            : 'border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#202225] text-[#6B6358] hover:text-[#2E3230]'
                        }`}
                      >
                        <IconComp size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CONSOLIDATED Recognition Rules Section (One Tile Per Category with Rule Rows) */}
            <div className="border-t border-[#E4E0D8] dark:border-white/10 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#2E3230] dark:text-white uppercase tracking-wider">
                    Правила автоматического распознавания
                  </h3>
                  <p className="text-[11px] text-[#6B6358]">
                    Каждое правило сопоставляет ключевые слова с конкретной подкатегорией
                  </p>
                </div>
                {selectedCat && (
                  <button 
                    type="button"
                    onClick={() => handleCreateNewRuleForCategory(selectedCat.id)}
                    className="text-[#4A7C59] dark:text-emerald-400 hover:text-[#335840] active:scale-95 text-xs font-bold flex items-center gap-1 px-3 py-2 rounded-lg border border-[#4A7C59]/40 hover:bg-[#EAF1ED] transition-all cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Добавить правило распознавания</span>
                  </button>
                )}
              </div>

              {/* Consolidated Tile for Selected Category */}
              {selectedCat && (() => {
                const groupInfo = groupedRulesByCategory.get(selectedCat.id) || {
                  mainCat: selectedCat,
                  subcats: selectedSubcategories,
                  rules: []
                };

                return (
                  <div className="p-5 bg-[#FAF6F0] dark:bg-[#202225] rounded-xl border border-[#E4E0D8] dark:border-white/10 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E4E0D8]/60 dark:border-white/10">
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: selectedCat.color || '#4A7C59' }}
                        />
                        <span className="text-sm font-bold text-[#2E3230] dark:text-white uppercase tracking-wider">
                          Все правила категории: {selectedCat.label}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-stone-500">
                        Всего правил: {groupInfo.rules.length}
                      </span>
                    </div>

                    {/* Rule list rows */}
                    {groupInfo.rules.length === 0 ? (
                      <div className="p-6 text-center bg-white dark:bg-[#18191C] rounded-lg border border-dashed border-[#E4E0D8]">
                        <p className="text-xs text-stone-400 dark:text-stone-500">
                          Для данной категории еще не настроено правил распознавания.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCreateNewRuleForCategory(selectedCat.id)}
                          className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-[#4A7C59] text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Создать первое правило
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 divide-y divide-[#E4E0D8]/60 dark:divide-white/5">
                        {(() => {
                          // Group rules by categoryId (target category/subcategory ID)
                          const groupedByTargetMap = new Map<string, LearnedRule[]>();
                          for (const r of groupInfo.rules) {
                            const targetId = r.categoryId;
                            if (!groupedByTargetMap.has(targetId)) {
                              groupedByTargetMap.set(targetId, []);
                            }
                            groupedByTargetMap.get(targetId)!.push(r);
                          }

                          return Array.from(groupedByTargetMap.entries()).map(([targetId, targetRules], rIdx) => {
                            // Collect all keywords from all rules pointing to this target
                            const allKeywords = targetRules.flatMap(r => r.keywords || [r.keyword]);
                            // Use the first rule as the representative for adding/updating/deleting the card
                            const representativeRule = targetRules[0];

                            return (
                              <div key={targetId} className={`pt-4 ${rIdx === 0 ? 'pt-0 border-t-0' : ''} space-y-3`}>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                                      Назначить подкатегорию:
                                    </span>
                                    {/* Select Target Dropdown */}
                                    <select
                                      value={targetId}
                                      onChange={e => {
                                        const newTargetId = e.target.value;
                                        const updated = learnedRules.map(r => {
                                          if (targetRules.some(tr => tr.id === r.id)) {
                                            return { 
                                              ...r, 
                                              categoryId: newTargetId, 
                                              subCategoryId: newTargetId === selectedCat?.id ? undefined : newTargetId 
                                            };
                                          }
                                          return r;
                                        });
                                        onUpdateRules(updated);
                                        toast.success('Получатель правил изменен');
                                      }}
                                      className="bg-white dark:bg-[#18191C] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#E4E0D8] dark:border-white/10 text-[#4A7C59] dark:text-emerald-300 outline-none cursor-pointer"
                                    >
                                      <option value={selectedCat.id}>Категория: {selectedCat.label} (Основная)</option>
                                      {selectedSubcategories.map(sub => (
                                        <option key={sub.id} value={sub.id}>Подкатегория: {sub.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const ruleIdsToDelete = targetRules.map(tr => tr.id);
                                      onUpdateRules(learnedRules.filter(r => !ruleIdsToDelete.includes(r.id)));
                                      toast.success('Правила для подкатегории удалены');
                                    }}
                                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-[#B94B32] flex items-center justify-center transition-colors cursor-pointer"
                                    title="Удалить это правило"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>

                                {/* Keywords list for this group */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-[#6B6358] dark:text-stone-400 uppercase tracking-wider">
                                      Ключевые слова-триггеры:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setAddingKeywordRuleId(representativeRule.id)}
                                      className="text-xs text-[#4A7C59] dark:text-emerald-400 font-bold flex items-center gap-0.5"
                                    >
                                      <Plus size={13} /> Добавить слово
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                    {allKeywords.map(kw => {
                                      const matchingRule = targetRules.find(r => {
                                        const kws = r.keywords || [r.keyword];
                                        return kws.some(k => k.toLowerCase() === kw.toLowerCase());
                                      }) || representativeRule;

                                      return (
                                        <span
                                          key={kw}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#18191C] border border-[#E4E0D8] dark:border-white/10 text-xs font-bold font-mono text-[#2E3230] dark:text-white"
                                        >
                                          {kw}
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveKeywordFromRule(matchingRule.id, kw)}
                                            className="text-[#6B6358] hover:text-red-500 cursor-pointer"
                                          >
                                            <X size={12} />
                                          </button>
                                        </span>
                                      );
                                    })}

                                    {addingKeywordRuleId === representativeRule.id && (
                                      <div className="inline-flex items-center gap-1 bg-white dark:bg-[#18191C] p-1 rounded-lg border border-[#4A7C59]">
                                        <input
                                          type="text"
                                          value={inlineKeywordText}
                                          onChange={e => setInlineKeywordText(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleAddKeywordToRule(representativeRule.id);
                                            if (e.key === 'Escape') setAddingKeywordRuleId(null);
                                          }}
                                          placeholder="слово..."
                                          autoFocus
                                          className="px-2 py-0.5 bg-transparent text-xs font-mono text-[#2E3230] dark:text-white outline-none w-28"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleAddKeywordToRule(representativeRule.id)}
                                          className="text-[#4A7C59] font-bold p-0.5"
                                        >
                                          <Check size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setAddingKeywordRuleId(null)}
                                          className="text-stone-400 hover:text-red-500 p-0.5"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3.5 border-t border-[#E4E0D8] dark:border-white/10 flex items-center justify-end gap-3 shrink-0 bg-[#FAF6F0]/30 dark:bg-black/20">
            <button 
              type="button"
              onClick={handleSaveCategory}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                saveSuccess 
                  ? 'bg-[#2f553e]' 
                  : 'bg-[#4A7C59] hover:bg-[#335840]'
              }`}
            >
              <Check size={16} />
              <span>{saveSuccess ? 'Сохранено!' : 'Сохранить изменения'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default CategoriesSettings;
