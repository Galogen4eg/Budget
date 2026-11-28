import { useModalSurface } from '../hooks/useDialogFocus';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { terraTransition } from '../utils/uiMotion';
import { 
  Search, X, Plus, ChevronDown, Check, ArrowRight, FolderOutput 
} from 'lucide-react';
import { Category, Transaction, TransactionType } from '../types';
import { categoriesForType } from '../utils/categoryCatalog';
import { getIconById } from '../constants';
import { toast } from 'sonner';
import useModalBackHandler from '../hooks/useModalBackHandler';
import { countCategoryUsage, sortCategoriesByPopularity } from '../utils/categoryPopularity';

export interface DesktopCategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory?: (category: Category) => void | Promise<void>;
  categoryUsage?: Record<string, number>;
  transactionType?: TransactionType;
  transactions?: Transaction[];
}

/**
 * Universal Category Picker Modal matching the custom Terra design prototype with smooth CSS Grid animations
 */
export const DesktopCategoryPickerModal: React.FC<DesktopCategoryPickerModalProps> = ({
  isOpen,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  categoryUsage,
  transactionType,
  transactions = []
}) => {
  useModalBackHandler(isOpen, onClose);
  const surface=useModalSurface(onClose,{enabled:isOpen,initialSelector:'[aria-label="Закрыть"]'});
  const reduced=Boolean(useReducedMotion());
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const clearSearch = () => {
    // Move focus before removing the focused clear button from the DOM.
    searchInputRef.current?.focus({preventScroll:true});
    setSearchQuery('');
  };
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});

  // Inline Category Creation Panel
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
  // A Firestore category snapshot must not erase the category just created/selected.
  }, [isOpen, selectedCategoryId]);

  // Count existing operations in the current scope; rank parents by child usage too.
  const transactionStats = useMemo(() => categoryUsage || countCategoryUsage(transactionType?transactions.filter(tx=>tx.type===transactionType):transactions,categories), [transactions,categories,transactionType,categoryUsage]);

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

  // Toggle inline creation panel
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
        color: '#3E6543',
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
          id="categoryModalWrapper"
          initial={reduced?false:{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={terraTransition(reduced,.18)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 overflow-y-auto"
          {...surface} role="dialog"
          aria-modal="true" aria-label="Выбор категории"
        >
      <motion.div 
        data-terra-picker-panel="desktop"
        initial={reduced?false:{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={terraTransition(reduced,.20)}
        className="relative max-w-4xl lg:max-w-5xl w-full bg-[var(--terra-surface)] rounded-2xl border border-[var(--terra-border)] shadow-lg overflow-hidden font-sans text-[#2D332D] dark:text-stone-100 flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="px-6 py-5 bg-[var(--terra-surface)] border-b border-[var(--terra-border)] flex items-center justify-between gap-4 select-none shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-[#1E261E] dark:text-white font-headline">
              Выбор категории
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleToggleCreatePanel}
              className="min-h-[44px] bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] hover:bg-[var(--terra-primary-hover)] text-sm font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
            >
              {isCreatePanelOpen ? <X size={14} /> : <Plus size={14} />}
              <span>{isCreatePanelOpen ? 'Закрыть форму' : 'Создать категорию'}</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="w-11 h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] text-stone-500 hover:text-stone-800 hover:bg-[#EAE6DE] dark:text-[var(--terra-muted)] dark:hover:text-white dark:hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Inline Category Creation Block with Smooth Expand/Collapse */}
        <AnimatePresence initial={false}>
          {isCreatePanelOpen && (
            <motion.div 
              data-terra-create-panel
              initial={reduced?false:{height:0,opacity:0}}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={terraTransition(reduced,.18)}
              className="overflow-hidden border-b border-[var(--terra-border)] bg-[#EFECE3]/80 dark:bg-[#252528] px-6 py-4 shrink-0 relative z-20"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-[var(--terra-muted)]">
                    Быстрое создание категории
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsCreatePanelOpen(false);
                    }}
                    className="text-xs text-stone-500 dark:text-[var(--terra-muted)] hover:text-stone-900 dark:hover:text-white font-semibold transition-colors hover:underline cursor-pointer relative z-30 min-h-[44px] min-w-[44px] px-2 rounded-lg"
                  >
                    Скрыть форму
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                      Название категории
                    </label>
                    <input 
                      ref={newCatNameInputRef} aria-label="Название категории"
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Название категории..."
                      className="w-full min-w-0 min-h-[44px] bg-[var(--terra-surface)] text-[var(--terra-ink)] border border-[var(--terra-control-border)] rounded-xl px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                      Добавить подкатегорию
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        ref={newSubcatInputRef} aria-label="Название подкатегории"
                        type="text"
                        value={newSubcategoryInput}
                        onChange={(e) => setNewSubcategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubcategoryTag();
                          }
                        }}
                        placeholder="Добавить подкатегорию..."
                        className="w-full min-w-0 min-h-[44px] bg-[var(--terra-surface)] text-[var(--terra-ink)] border border-[var(--terra-control-border)] rounded-xl px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                      />
                      <button 
                        type="button"
                        onClick={handleAddSubcategoryTag} aria-label="Добавить подкатегорию"
                        className="w-11 h-11 rounded-xl bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] hover:bg-[var(--terra-primary-hover)] active:scale-95 flex items-center justify-center shrink-0 transition-all shadow-sm cursor-pointer"
                        title="Добавить подкатегорию"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subcategory Tags */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {subcategoryTags.map((tag, idx) => (
                      <span 
                        key={`${tag}-${idx}`}
                        className="inline-flex max-w-full items-center gap-1 bg-[var(--terra-soft)] border border-[var(--terra-border)] text-[var(--terra-ink)] text-sm pl-2 rounded-lg [overflow-wrap:anywhere]"
                      >
                        <span>{tag}</span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveTag(idx)}
                          aria-label={`Удалить подкатегорию: ${tag}`}
                          className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center text-[var(--terra-muted)] hover:text-[var(--terra-danger-text)] transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <button 
                    type="button"
                    onClick={handleSaveCategoryBundle} disabled={isConfirming||!onAddCategory}
                    className="min-h-[44px] bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] hover:bg-[var(--terra-primary-hover)] px-4 py-2 rounded-xl text-sm font-semibold shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] disabled:opacity-60 cursor-pointer self-end sm:self-auto"
                  >
                    Сохранить категорию
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Input Area */}
        <div className="p-6 pb-2 shrink-0">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--terra-muted)] group-focus-within:text-[#3E6543] transition-colors" size={17} />
            <input 
              type="text"
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Быстрый поиск категории или подкатегории..."
              aria-label="Поиск по категориям"
              className="w-full min-h-[44px] bg-[var(--terra-surface)] rounded-xl border border-[var(--terra-control-border)] pl-10 pr-12 py-2 text-sm text-[var(--terra-ink)] placeholder:text-[var(--terra-muted)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={clearSearch}
                aria-label="Очистить поиск"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-lg text-[var(--terra-muted)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {filteredParents.length === 0 && (
            <div className="text-center py-8 text-stone-500 dark:text-[var(--terra-muted)] text-xs">
              <p className="font-semibold text-sm text-stone-700 dark:text-stone-200">Категории не найдены</p>
              <p className="mt-1">Попробуйте другой запрос или создайте новую категорию выше.</p>
            </div>
          )}
        </div>

        {/* Category Accordion List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 py-3 space-y-2" id="categoryListContainer">
          {filteredParents.map(parent => {
            const subcats = subcategoriesByParent.get(parent.id) || [];
            const isExpanded = Boolean(expandedCatIds[parent.id]);
            const isParentSelected = activeSelectedId === parent.id;
            const hasActiveChild = subcats.some(s => s.id === activeSelectedId);
            const parentTxCount = (transactionStats[parent.id] || 0) + subcats.reduce((sum, s) => sum + (transactionStats[s.id] || 0), 0);

            return (
              <div 
                key={parent.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isParentSelected || hasActiveChild
                    ? 'border-2 border-[var(--terra-primary-text)] bg-[var(--terra-surface)] shadow-sm'
                    : 'border-[var(--terra-border)] bg-[var(--terra-surface)] hover:border-[#DDD8CB] dark:hover:border-white/20'
                }`}
              >
                {/* Accordion Trigger Header */}
                <div 
                  onClick={() => toggleAccordion(parent.id)}
                  className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-stone-50/70 dark:hover:bg-white/5 transition-colors"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-xl bg-[#EFECE3] dark:bg-white/10 text-[#3E6543] dark:text-emerald-400 flex items-center justify-center shrink-0 transition-transform hover:scale-105"
                      style={parent.color ? { color: parent.color } : undefined}
                    >
                      {getIconById(parent.icon, 20)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#1E261E] dark:text-white font-headline truncate">
                        {parent.label}
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-[var(--terra-muted)] mt-0.5">
                        {subcats.length} {subcats.length === 1 ? 'подкатегория' : subcats.length < 5 ? 'подкатегории' : 'подкатегорий'}
                        {parentTxCount > 0 ? `, ${parentTxCount} операций` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAddSubcategoryForParent(parent.label);
                      }}
                      className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-2.5 py-1 rounded-lg border border-[var(--terra-control-border)] hover:bg-stone-100 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Подкатегория</span>
                    </button>
                    <ChevronDown 
                      size={18} 
                      className={`text-[var(--terra-muted)] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                    />
                  </div>
                </div>

                {/* Smooth Framer Motion Accordion Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden border-t border-[#F0ECE1] dark:border-white/10"
                    >
                      <div className="px-4 pb-4 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-2">
                          {/* Option to select parent category as whole */}
                          <button 
                            type="button"
                            onClick={() => handleSelect(parent.id)}
                            className={`text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              activeSelectedId === parent.id
                                ? 'border-[#3E6543] bg-[#3E6543] text-white shadow-xs'
                                : 'border-[var(--terra-border)] bg-[#FBF9F5] dark:bg-[#18191C] hover:border-[#3E6543] hover:bg-white dark:hover:bg-[#202225] text-stone-800 dark:text-stone-200 group'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className={`text-xs font-bold block truncate ${activeSelectedId === parent.id ? 'text-white' : 'text-stone-800 dark:text-stone-200 group-hover:text-[#3E6543]'}`}>
                                Все расходы ({parent.label})
                              </span>
                              <span className={`text-[10px] block truncate ${activeSelectedId === parent.id ? 'text-[#DCE7DA]' : 'text-stone-500 dark:text-[var(--terra-muted)]'}`}>
                                Общая категория
                              </span>
                            </div>
                            <ArrowRight size={15} className={`shrink-0 transition-transform group-hover:translate-x-1 ${activeSelectedId === parent.id ? 'text-white' : 'text-[var(--terra-muted)] group-hover:text-[#3E6543]'}`} />
                          </button>

                          {/* Subcategory Buttons with Move Action */}
                          {subcats.map(sub => {
                            const isSubSelected = activeSelectedId === sub.id;
                            return (
                              <div key={sub.id} className="relative group/sub flex items-center gap-1 min-w-0">
                                <button 
                                  type="button"
                                  onClick={() => handleSelect(sub.id)}
                                  className={`flex-1 text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                                    isSubSelected
                                      ? 'border-[#3E6543] bg-[#3E6543] text-white shadow-xs'
                                      : 'border-[var(--terra-border)] bg-[#FBF9F5] dark:bg-[#18191C] hover:border-[#3E6543] hover:bg-white dark:hover:bg-[#202225] text-stone-800 dark:text-stone-200 group'
                                  }`}
                                >
                                  <div className="min-w-0 pr-2">
                                    <span className={`text-xs font-bold block truncate ${isSubSelected ? 'text-white' : 'text-stone-800 dark:text-stone-200 group-hover:text-[#3E6543]'}`}>
                                      {sub.label}
                                    </span>
                                    <span className={`text-[10px] block truncate ${isSubSelected ? 'text-[#DCE7DA]' : 'text-stone-500 dark:text-[var(--terra-muted)]'}`}>
                                      {parent.label}
                                    </span>
                                  </div>
                                  <ArrowRight size={15} className={`shrink-0 transition-transform group-hover:translate-x-1 ${isSubSelected ? 'text-white' : 'text-[var(--terra-muted)] group-hover:text-[#3E6543]'}`} />
                                </button>

                                <button
                                  type="button"
                                  title="Перенести подкатегорию в другую категорию"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMovingSubcategory(sub);
                                  }}
                                  className="p-2.5 rounded-xl border border-[var(--terra-border)] bg-[#FBF9F5] dark:bg-[#18191C] hover:bg-[#3E6543] hover:text-white dark:hover:bg-[#3E6543] text-stone-500 dark:text-stone-300 transition-all cursor-pointer shrink-0"
                                >
                                  <FolderOutput size={14} />
                                </button>
                              </div>
                            );
                          })}

                          {/* Quick Add Subcategory Dashed Card */}
                          <button 
                            type="button"
                            onClick={() => handleQuickAddSubcategoryForParent(parent.label)}
                            className="text-left p-3 rounded-xl border border-dashed border-[#DDD8CB] dark:border-white/20 text-stone-500 dark:text-[var(--terra-muted)] hover:text-stone-800 dark:hover:text-white hover:border-stone-400 hover:bg-stone-50 dark:hover:bg-white/5 active:scale-[0.98] flex items-center justify-center gap-1.5 transition-all text-xs font-medium cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Подкатегория</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[var(--terra-surface)] border-t border-[var(--terra-border)] flex flex-col sm:flex-row items-center justify-between gap-3 select-none shrink-0 relative z-30">
          {/* Left Selection Indicator */}
          <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 w-full sm:w-auto">
            <span>
              {currentSelectionInfo ? (
                <>
                  Выбрано: <strong className="text-[#1E261E] dark:text-white font-bold">{currentSelectionInfo.categoryName} → {currentSelectionInfo.subcategoryName}</strong>
                </>
              ) : (
                'Выберите категорию или подкатегорию'
              )}
            </span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button 
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 border border-[var(--terra-control-border)] hover:bg-[#EAE6DE] dark:hover:bg-white/10 active:scale-95 text-stone-700 dark:text-stone-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Отмена
            </button>
            <button 
              type="button"
              onClick={handleConfirm}
              disabled={!activeSelectedId}
              className={`min-h-[44px] bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] hover:bg-[var(--terra-primary-hover)] active:scale-95 font-semibold text-xs rounded-xl shadow-sm px-5 py-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                !activeSelectedId ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Check size={14} className="font-bold" />
              <span>{isConfirming ? 'Привязано!' : 'Подтвердить выбор'}</span>
            </button>
          </div>
        </div>

        {/* Modal Dialog for Moving Subcategory */}
        {movingSubcategory && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[var(--terra-surface)] rounded-2xl border border-[var(--terra-border)] shadow-2xl p-5 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--terra-border)] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#1E261E] dark:text-white">
                    Перенос подкатегории
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-[var(--terra-muted)]">
                    «{movingSubcategory.label}»
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setMovingSubcategory(null)}
                  className="text-[var(--terra-muted)] hover:text-stone-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                Выберите новую родительскую категорию:
              </p>

              <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {parentCategories.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleMoveSubcategoryToParent(p)}
                    className="w-full text-left p-3 rounded-xl border border-[var(--terra-border)] hover:border-[#3E6543] hover:bg-[#F5F1EA] dark:hover:bg-[#2A2A2E] text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span>{p.label}</span>
                    <ArrowRight size={14} className="text-[var(--terra-muted)]" />
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setMovingSubcategory(null)}
                  className="px-4 py-2 border border-[var(--terra-control-border)] text-stone-700 dark:text-stone-300 font-semibold text-xs rounded-xl hover:bg-[#EAE6DE] cursor-pointer"
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

export default DesktopCategoryPickerModal;
