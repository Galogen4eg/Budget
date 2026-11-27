import { useModalSurface } from '../hooks/useDialogFocus';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, Plus, ChevronDown, Check, ArrowRight, FolderOutput,
  FolderPlus, Wallet, Tag
} from 'lucide-react';
import { Category, Transaction, TransactionType } from '../types';
import { categoriesForType } from '../utils/categoryCatalog';
import { countCategoryUsage, sortCategoriesByPopularity } from '../utils/categoryPopularity';
import { getIconById } from '../constants';
import { toast } from 'sonner';
import useModalBackHandler from '../hooks/useModalBackHandler';

export interface MobileCategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory?: (category: Category) => void | Promise<void>;
  transactionType?: TransactionType;
  transactions?: Transaction[];
}

/**
 * Mobile Category Picker Modal matching the user's mobile stack HTML/CSS prototype
 * Features drawer-transition for creation, popIn subcategory card animation, and clean subcategory move
 */
export const MobileCategoryPickerModal: React.FC<MobileCategoryPickerModalProps> = ({
  isOpen,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  transactionType,
  transactions = []
}) => {
  useModalBackHandler(isOpen, onClose);
  const surface=useModalSurface(onClose,{enabled:isOpen,initialSelector:'[aria-label="Закрыть"]'});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});

  // Inline Category Creation Drawer Panel
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('');
  const [subcategoryTags, setSubcategoryTags] = useState<string[]>([]);
  const newCatNameInputRef = useRef<HTMLInputElement>(null);
  const newSubcatInputRef = useRef<HTMLInputElement>(null);

  // Active selected subcategory or category ID
  const [activeSelectedId, setActiveSelectedId] = useState<string | null>(selectedCategoryId || null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Moving subcategory state
  const [movingSubcategory, setMovingSubcategory] = useState<Category | null>(null);

  // Initialize selection and expand relevant category on open
  useEffect(() => {
    if (isOpen) {
      setActiveSelectedId(selectedCategoryId || null);
      if (selectedCategoryId) {
        const found = categories.find(c => c.id === selectedCategoryId);
        if (found?.parentId) {
          setExpandedCatIds({ [found.parentId]: true });
        } else if (found) {
          setExpandedCatIds({ [found.id]: true });
        }
      } else {
        setExpandedCatIds({});
      }
    }
  }, [isOpen, selectedCategoryId]);

  // Count existing operations in the current scope; rank parents by child usage too.
  const transactionStats = useMemo(() => countCategoryUsage(transactionType?transactions.filter(tx=>tx.type===transactionType):transactions,categories), [transactions,categories,transactionType]);

  const { parentCategories, subcategoriesByParent } = useMemo(() => {
    const filtered = categoriesForType(categories, transactionType);
    const ordered = sortCategoriesByPopularity(filtered, transactionStats);
    const parents = ordered.filter(c => !c.parentId && c.id !== 'other');
    const subMap = new Map<string, Category[]>();
    ordered.forEach(c => {
      if (c.parentId) {
        const current = subMap.get(c.parentId) || [];
        current.push(c);
        subMap.set(c.parentId, current);
      }
    });
    return { parentCategories: parents, subcategoriesByParent: subMap };
  }, [categories, transactionType, transactionStats]);

  // Filter categories and auto-expand when searching
  const filteredParents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return parentCategories;

    return parentCategories.filter(parent => {
      const parentMatches = parent.label.toLowerCase().includes(query);
      const subcats = subcategoriesByParent.get(parent.id) || [];
      const subcatMatches = subcats.some(s => s.label.toLowerCase().includes(query));
      return parentMatches || subcatMatches;
    });
  }, [parentCategories, subcategoriesByParent, searchQuery]);

  // Auto-expand accordions when searching
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const autoExpanded: Record<string, boolean> = {};
      filteredParents.forEach(p => {
        autoExpanded[p.id] = true;
      });
      setExpandedCatIds(autoExpanded);
    }
  }, [searchQuery, filteredParents]);

  // Get current selected item details for footer display
  const currentSelectionInfo = useMemo(() => {
    if (!activeSelectedId) return null;
    const found = categories.find(c => c.id === activeSelectedId);
    if (!found) return null;

    if (found.parentId) {
      const parent = categories.find(c => c.id === found.parentId);
      return {
        categoryName: parent?.label || 'Категория',
        subcategoryName: found.label,
        id: found.id
      };
    }

    return {
      categoryName: found.label,
      subcategoryName: 'Основное',
      id: found.id
    };
  }, [activeSelectedId, categories]);

  // Toggle category accordion
  const toggleAccordion = (catId: string) => {
    setExpandedCatIds(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Toggle inline creation drawer
  const handleToggleCreatePanel = () => {
    setIsCreatePanelOpen(prev => {
      const next = !prev;
      if (next) {
        setTimeout(() => newCatNameInputRef.current?.focus(), 150);
      }
      return next;
    });
  };

  // Add subcategory tag inside creation panel
  const handleAddSubcategoryTag = () => {
    const trimmed = newSubcategoryInput.trim();
    if (!trimmed) return;
    if (!subcategoryTags.includes(trimmed)) {
      setSubcategoryTags(prev => [...prev, trimmed]);
    }
    setNewSubcategoryInput('');
    newSubcatInputRef.current?.focus();
  };

  // Remove tag
  const handleRemoveTag = (indexToRemove: number) => {
    setSubcategoryTags(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Quick add subcategory for a specific parent
  const handleQuickAddSubcategoryForParent = (parentName: string) => {
    setIsCreatePanelOpen(true);
    setNewCategoryName(parentName);
    setSubcategoryTags([]);
    setNewSubcategoryInput('');
    setTimeout(() => {
      newSubcatInputRef.current?.focus();
    }, 150);
  };

  // Move subcategory to a new parent category
  const handleMoveSubcategoryToParent = (targetParent: Category) => {
    if (!movingSubcategory) return;
    const updatedSub: Category = {
      ...movingSubcategory,
      parentId: targetParent.id
    };

    if (onAddCategory) {
      onAddCategory(updatedSub);
    }

    toast.success(`Подкатегория "${movingSubcategory.label}" перенесена в "${targetParent.label}"`);
    setExpandedCatIds(prev => ({ ...prev, [targetParent.id]: true }));
    setMovingSubcategory(null);
  };

  // Persist only the category and subcategories the user explicitly entered.
  const handleSaveCategoryBundle = async () => {
    if (isConfirming || !onAddCategory) return;
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      newCatNameInputRef.current?.focus();
      return;
    }

    setIsConfirming(true);
    try {
      const existingParent = categories.find(c =>
        !c.parentId && (!transactionType || categoriesForType([c], transactionType).length > 0) && c.label.trim().toLocaleLowerCase('ru-RU') === trimmedName.toLocaleLowerCase('ru-RU')
      );
      const parentToUse: Category = existingParent || {
        id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: trimmedName,
        color: '#4A7C59',
        icon: 'Folder',
        ...(transactionType === 'income' ? { transactionType: 'income' as const } : {})
      };
      if (!existingParent) await onAddCategory(parentToUse);

      let selectedId = parentToUse.id;
      let createdCount = 0;
      const pendingNames = [...subcategoryTags, newSubcategoryInput.trim()]
        .map(name => name.trim()).filter(Boolean);
      const uniqueNames = [...new Map(pendingNames.map(name => [name.toLocaleLowerCase('ru-RU'), name])).values()];
      for (const subLabel of uniqueNames) {
        const existingSub = categories.find(c => c.parentId === parentToUse.id &&
          c.label.trim().toLocaleLowerCase('ru-RU') === subLabel.toLocaleLowerCase('ru-RU'));
        if (existingSub) {
          if (createdCount === 0) selectedId = existingSub.id;
          continue;
        }
        const subObj: Category = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          label: subLabel,
          parentId: parentToUse.id,
          color: parentToUse.color,
          icon: parentToUse.icon,
          isCustom: true,
          ...(transactionType === 'income' ? { transactionType: 'income' as const } : {})
        };
        await onAddCategory(subObj);
        if (createdCount === 0) selectedId = subObj.id;
        createdCount++;
      }

      toast.success(createdCount ? `Создано подкатегорий: ${createdCount}` :
        existingParent ? 'Категория уже существует' : `Создана категория «${trimmedName}»`);
      setActiveSelectedId(selectedId);
      setExpandedCatIds(prev => ({ ...prev, [parentToUse.id]: true }));
      setIsCreatePanelOpen(false);
      setNewCategoryName('');
      setNewSubcategoryInput('');
      setSubcategoryTags([]);
    } catch (error) {
      console.error('Could not save category bundle:', error);
      toast.error('Не удалось сохранить категорию в Firebase');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSelect = (id: string) => {
    setActiveSelectedId(id);
  };

  const handleConfirm = () => {
    if (!activeSelectedId) return;

    if (currentSelectionInfo) {
      toast.success(`Категория "${currentSelectionInfo.categoryName} → ${currentSelectionInfo.subcategoryName}" сохранена`);
    }

    onSelectCategory(activeSelectedId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-black/40 overflow-y-auto"
          {...surface} role="dialog"
          aria-modal="true" aria-label="Выбор категории"
        >
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full h-[100dvh] sm:h-auto max-h-[100dvh] min-h-0 sm:max-w-2xl bg-[var(--terra-canvas)] sm:rounded-2xl border border-[var(--terra-border)] shadow-2xl overflow-hidden font-body text-[#2E3230] dark:text-stone-100 flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <header className="px-4 py-3 bg-[var(--terra-surface)] border-b border-[#E8E4DA]/80 dark:border-white/10 flex items-center justify-between gap-2 shrink-0 select-none relative z-30">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="w-11 h-11 flex items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] text-stone-700 dark:text-stone-200 hover:bg-[#F0ECE4] dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <h1 className="text-base font-headline font-semibold text-[#2E3230] dark:text-white truncate">
              Выбор категории
            </h1>
          </div>

        </header>

        {/* Scrollable Modal Content */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y pb-3">
          
          {/* Section Header with Add Category Button */}
          <div className="px-5 pt-3 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wallet size={20} className="text-[var(--terra-primary-text)]" />
              <p className="font-headline font-semibold text-base text-[#2E3230] dark:text-white tracking-tight">
                Структура бюджета
              </p>
            </div>
            <button 
              type="button"
              onClick={handleToggleCreatePanel}
              className="min-h-[44px] px-3.5 flex items-center gap-1.5 rounded-xl bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] text-sm font-semibold transition-colors hover:bg-[var(--terra-primary-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
            >
              <Plus size={16} className={`transition-transform duration-200 ${isCreatePanelOpen ? 'rotate-45' : ''}`} />
              <span>Создать</span>
            </button>
          </div>

          {/* Create Drawer (Collapsible with smooth AnimatePresence) */}
          <AnimatePresence initial={false}>
            {isCreatePanelOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden px-4 mb-2"
              >
                <div className="bg-[var(--terra-surface)] rounded-2xl p-4 shadow-xs border border-[var(--terra-border)] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DA]/60 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#F0E8DB] dark:bg-white/10 flex items-center justify-center text-[#2E3230] dark:text-white">
                        <FolderPlus size={18} />
                      </div>
                      <h3 className="font-headline text-sm font-semibold text-[#2E3230] dark:text-white">
                        Новая категория
                      </h3>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsCreatePanelOpen(false)}
                      className="w-7 h-7 rounded-full bg-[#F5F1EA] dark:bg-white/10 flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-white active:scale-90 transition-transform cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 dark:text-[var(--terra-muted)] mb-1 uppercase tracking-wider font-label">
                        Название категории
                      </label>
                      <div className="flex items-center bg-[#F5F1EA] dark:bg-[#252528] rounded-xl px-3 py-2">
                        <Tag size={16} className="text-[var(--terra-muted)] mr-2 shrink-0" />
                        <input 
                          ref={newCatNameInputRef}
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Например: Домашние питомцы"
                          className="w-full bg-transparent border-0 text-xs text-[#2E3230] dark:text-white placeholder:text-[var(--terra-muted)] focus:outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 dark:text-[var(--terra-muted)] mb-1 uppercase tracking-wider font-label">
                        Подкатегории
                      </label>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 flex items-center bg-[#F5F1EA] dark:bg-[#252528] rounded-xl px-3 py-1.5">
                          <input 
                            ref={newSubcatInputRef}
                            type="text"
                            value={newSubcategoryInput}
                            onChange={(e) => setNewSubcategoryInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubcategoryTag();
                              }
                            }}
                            placeholder="Добавить пункт..."
                            className="w-full bg-transparent border-0 text-xs text-[#2E3230] dark:text-white placeholder:text-[var(--terra-muted)] focus:outline-none"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={handleAddSubcategoryTag}
                          className="w-9 h-9 rounded-xl bg-[#EAE6DE] dark:bg-white/10 text-[#2E3230] dark:text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {/* Tag Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {subcategoryTags.map((tag, idx) => (
                          <div key={`${tag}-${idx}`} className="tag-chip inline-flex items-center gap-1.5 bg-[#F0E8DB] dark:bg-[#2A2A2E] text-[#4A4538] dark:text-stone-200 px-3 py-1 rounded-full text-xs font-medium">
                            <span>{tag}</span>
                            <button 
                              type="button"
                              onClick={() => handleRemoveTag(idx)}
                              className="w-4 h-4 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={handleSaveCategoryBundle}
                      className="w-full mt-2 h-10 bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] rounded-xl font-label font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xs hover:bg-[#3D684A] cursor-pointer"
                    >
                      <Check size={16} />
                      <span>Сохранить категорию</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live Search Bar */}
          <div className="px-4 mb-3">
            <div className="relative flex items-center bg-[var(--terra-surface)] rounded-xl px-2 border border-[var(--terra-border)] focus-within:border-[#4A7C59] transition-all">
              <Search size={18} className="text-[var(--terra-muted)] mr-2.5 shrink-0" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск категории"
                aria-label="Поиск по категориям" className="w-full min-w-0 min-h-[44px] bg-transparent text-base text-[var(--terra-ink)] placeholder:text-[var(--terra-muted)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Очистить поиск" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-[var(--terra-muted)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Categories Accordion List */}
          <div className="px-4 space-y-3">
            {filteredParents.map(parent => {
              const subcats = subcategoriesByParent.get(parent.id) || [];
              const isExpanded = Boolean(expandedCatIds[parent.id]);
              const isParentSelected = activeSelectedId === parent.id;
              const hasActiveChild = subcats.some(s => s.id === activeSelectedId);

              return (
                <div 
                  key={parent.id}
                  className={`bg-[var(--terra-surface)] rounded-2xl p-4 shadow-2xs border transition-all ${
                    isParentSelected || hasActiveChild
                      ? 'border-2 border-[var(--terra-primary-text)] shadow-xs'
                      : 'border-[var(--terra-border)]'
                  }`}
                >
                  {/* Category Header */}
                  <div 
                    onClick={() => toggleAccordion(parent.id)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div 
                        className="w-11 h-11 rounded-2xl bg-[#F5F1EA] dark:bg-white/10 flex items-center justify-center text-[var(--terra-primary-text)] shrink-0"
                        style={parent.color ? { color: parent.color } : undefined}
                      >
                        {getIconById(parent.icon, 22)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-headline font-semibold text-sm text-[#2E3230] dark:text-white truncate">
                          {parent.label}
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-[var(--terra-muted)] font-body truncate">
                          {subcats.length} {subcats.length === 1 ? 'подкатегория' : 'подкатегорий'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAddSubcategoryForParent(parent.label);
                        }}
                        title="Добавить подкатегорию"
                        className="w-8 h-8 rounded-full bg-[#F5F1EA] dark:bg-white/10 text-stone-600 dark:text-stone-300 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                      >
                        <Plus size={16} />
                      </button>
                      <ChevronDown 
                        size={18} 
                        className={`text-[var(--terra-muted)] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                      />
                    </div>
                  </div>

                  {/* Accordion Content with smooth AnimatePresence */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-2 text-xs font-body pt-3 mt-1">
                          
                          {/* Main Category Whole Option */}
                          <div 
                            onClick={() => handleSelect(parent.id)}
                            className={`subcat-card subcat-item p-3 rounded-xl cursor-pointer flex flex-col justify-between min-h-[64px] border ${
                              activeSelectedId === parent.id
                                ? 'is-selected bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] shadow-xs border-[#4A7C59]'
                                : 'bg-[#F5F1EA] dark:bg-[#252528] text-[#2E3230] dark:text-stone-200 border-transparent hover:bg-[#EAE6DE]'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className={`font-semibold text-xs ${activeSelectedId === parent.id ? 'text-white' : 'text-[#2E3230] dark:text-white'}`}>
                                Все расходы ({parent.label})
                              </span>
                              {activeSelectedId === parent.id ? (
                                <Check size={16} className="text-white shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-600 shrink-0" />
                              )}
                            </div>
                            <span className={`text-[10px] ${activeSelectedId === parent.id ? 'text-[#DCE7DA]' : 'text-stone-500 dark:text-[var(--terra-muted)]'}`}>
                              Общая категория
                            </span>
                          </div>

                          {/* Subcategories */}
                          {subcats.map(sub => {
                            const isSubSelected = activeSelectedId === sub.id;
                            return (
                              <div 
                                key={sub.id}
                                className={`subcat-card subcat-item p-3 rounded-xl cursor-pointer flex flex-col justify-between min-h-[64px] border relative group ${
                                  isSubSelected
                                    ? 'is-selected bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] shadow-xs border-[#4A7C59]'
                                    : 'bg-[#F5F1EA] dark:bg-[#252528] text-[#2E3230] dark:text-stone-200 border-transparent hover:bg-[#EAE6DE]'
                                }`}
                                onClick={() => handleSelect(sub.id)}
                              >
                                <div className="flex items-start justify-between">
                                  <span className={`font-semibold text-xs truncate pr-1 ${isSubSelected ? 'text-white' : 'text-[#2E3230] dark:text-white'}`}>
                                    {sub.label}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      title="Перенести подкатегорию"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMovingSubcategory(sub);
                                      }}
                                      className={`p-1 rounded-md transition-colors ${
                                        isSubSelected 
                                          ? 'hover:bg-white/20 text-white' 
                                          : 'hover:bg-stone-200 dark:hover:bg-stone-700 text-[var(--terra-muted)]'
                                      }`}
                                    >
                                      <FolderOutput size={13} />
                                    </button>
                                    {isSubSelected ? (
                                      <Check size={16} className="text-white shrink-0" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-600 shrink-0" />
                                    )}
                                  </div>
                                </div>
                                <span className={`text-[10px] truncate ${isSubSelected ? 'text-[#DCE7DA]' : 'text-stone-500 dark:text-[var(--terra-muted)]'}`}>
                                  {parent.label}
                                </span>
                              </div>
                            );
                          })}

                          {/* Quick Add Subcategory Card */}
                          <button 
                            type="button"
                            onClick={() => handleQuickAddSubcategoryForParent(parent.label)}
                            className="p-3 rounded-xl bg-[#F5F1EA]/60 dark:bg-white/5 text-[var(--terra-primary-text)] cursor-pointer hover:bg-[#EAE6DE] flex flex-col items-center justify-center gap-1 min-h-[64px] active:scale-95 transition-transform border border-dashed border-[#4A7C59]/30"
                          >
                            <Plus size={18} />
                            <span className="font-label font-bold text-[11px] tracking-tight">Подкатегория</span>
                          </button>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Live Selection Status Strip */}
          <div className="mt-4 mx-4 p-3 rounded-xl bg-[var(--terra-surface)] flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 font-body border border-[var(--terra-border)]">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <Check size={16} className="text-[var(--terra-primary-text)] shrink-0" />
              <span className="truncate">
                Выбрано: <strong className="font-semibold text-[#2E3230] dark:text-white">
                  {currentSelectionInfo ? `${currentSelectionInfo.categoryName} / ${currentSelectionInfo.subcategoryName}` : 'Не выбрано'}
                </strong>
              </span>
            </div>
            {activeSelectedId && (
              <button 
                type="button"
                onClick={() => setActiveSelectedId(null)}
                className="text-xs text-[var(--terra-primary-text)] font-semibold hover:underline shrink-0 cursor-pointer"
              >
                Сбросить
              </button>
            )}
          </div>

        </main>

        {/* Fixed Bottom Actions Bar */}
        <div className="shrink-0 w-full pb-[env(safe-area-inset-bottom,0px)] bg-[var(--terra-surface)] shadow-[0_-4px_20px_rgba(46,50,48,0.06)] border-t border-[#E8E4DA]/60 dark:border-white/10">
          <div className="h-16 px-5 flex items-center justify-between gap-3">
            <button 
              type="button"
              onClick={() => setActiveSelectedId(null)}
              className="h-11 px-5 flex items-center justify-center rounded-xl bg-[#F0ECE4] dark:bg-[#252528] text-stone-700 dark:text-stone-300 font-label text-xs font-semibold active:scale-95 transition-all cursor-pointer"
            >
              Сбросить
            </button>
            <button 
              type="button"
              onClick={handleConfirm}
              disabled={!activeSelectedId}
              className={`flex-1 h-11 px-5 flex items-center justify-center gap-2 rounded-xl bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] font-label text-xs font-semibold shadow-xs active:scale-[0.98] transition-all cursor-pointer ${
                !activeSelectedId ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Check size={16} />
              <span>{isConfirming ? 'Привязано!' : 'Подтвердить выбор'}</span>
            </button>
          </div>
        </div>

        {/* Modal Dialog for Moving Subcategory */}
        {movingSubcategory && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[var(--terra-surface)] rounded-2xl border border-[var(--terra-border)] shadow-2xl p-4 max-w-sm w-full space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--terra-border)] pb-2">
                <div>
                  <h3 className="text-xs font-bold text-[#1E261E] dark:text-white">
                    Перенос подкатегории
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-[var(--terra-muted)]">
                    «{movingSubcategory.label}»
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setMovingSubcategory(null)}
                  className="text-[var(--terra-muted)] hover:text-stone-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-[11px] text-stone-600 dark:text-stone-300 font-medium">
                Выберите новую родительскую категорию:
              </p>

              <div className="max-h-52 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                {parentCategories.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleMoveSubcategoryToParent(p)}
                    className="w-full text-left p-2.5 rounded-xl border border-[var(--terra-border)] hover:border-[#4A7C59] hover:bg-[#F5F1EA] dark:hover:bg-[#2A2A2E] text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span>{p.label}</span>
                    <ArrowRight size={13} className="text-[var(--terra-muted)]" />
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setMovingSubcategory(null)}
                  className="px-3 py-1.5 border border-[var(--terra-control-border)] text-stone-700 dark:text-stone-300 font-semibold text-xs rounded-xl hover:bg-[#EAE6DE] cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};

export default MobileCategoryPickerModal;
