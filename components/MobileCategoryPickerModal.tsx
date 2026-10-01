import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, Plus, ChevronDown, Check, ArrowRight, FolderOutput,
  FolderPlus, Wallet, Tag
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { getIconById } from '../constants';
import { toast } from 'sonner';
import useModalBackHandler from '../hooks/useModalBackHandler';

export interface MobileCategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory?: (category: Category) => void;
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
  transactions = []
}) => {
  useModalBackHandler(isOpen, onClose);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});

  // Inline Category Creation Drawer Panel
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('');
  const [subcategoryTags, setSubcategoryTags] = useState<string[]>(['Корм и питание', 'Ветклиника', 'Игрушки и уход']);
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
  }, [isOpen, selectedCategoryId, categories]);

  // Compute transaction counts for display
  const transactionStats = useMemo(() => {
    const countMap: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.category) {
        countMap[tx.category] = (countMap[tx.category] || 0) + 1;
      }
    });
    return countMap;
  }, [transactions]);

  // Organize categories into parents and child map
  const { parentCategories, subcategoriesByParent } = useMemo(() => {
    const parents = categories.filter(c => !c.parentId && c.id !== 'other');
    const subMap = new Map<string, Category[]>();

    categories.forEach(c => {
      if (c.parentId) {
        const current = subMap.get(c.parentId) || [];
        current.push(c);
        subMap.set(c.parentId, current);
      }
    });

    return { parentCategories: parents, subcategoriesByParent: subMap };
  }, [categories]);

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

  // Save new category and subcategories bundle
  const handleSaveCategoryBundle = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      newCatNameInputRef.current?.focus();
      return;
    }

    const timestamp = Date.now();
    const parentId = `cat-${timestamp}`;

    let existingParent = categories.find(c => c.label.toLowerCase() === trimmedName.toLowerCase() && !c.parentId);
    const parentToUse = existingParent || {
      id: parentId,
      label: trimmedName,
      color: '#4A7C59',
      icon: 'Folder'
    };

    if (!existingParent && onAddCategory) {
      onAddCategory(parentToUse);
    }

    const subcatsToCreate = subcategoryTags.length > 0 ? subcategoryTags : ['Основное'];
    let firstCreatedSubId = parentToUse.id;

    subcatsToCreate.forEach((subLabel, idx) => {
      const subObj: Category = {
        id: `sub-${timestamp}-${idx}`,
        label: subLabel,
        parentId: parentToUse.id,
        color: parentToUse.color,
        icon: 'Tag'
      };
      if (idx === 0) firstCreatedSubId = subObj.id;
      if (onAddCategory) {
        onAddCategory(subObj);
      }
    });

    toast.success(`Создана категория "${trimmedName}"`);
    setActiveSelectedId(firstCreatedSubId);
    setExpandedCatIds(prev => ({ ...prev, [parentToUse.id]: true }));
    setIsCreatePanelOpen(false);
    setNewCategoryName('');
    setSubcategoryTags(['Корм и питание', 'Ветклиника', 'Игрушки и уход']);
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
          className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-black/25 backdrop-blur-[2px] overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full h-full sm:h-auto sm:max-w-2xl bg-[#FAF6F0] dark:bg-[#121214] sm:rounded-3xl border border-[#E8E4DA] dark:border-white/10 shadow-2xl overflow-hidden font-body text-[#2E3230] dark:text-stone-100 flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <header className="px-4 py-3 bg-[#FAF6F0]/90 dark:bg-[#121214]/90 backdrop-blur-md border-b border-[#E8E4DA]/80 dark:border-white/10 flex items-center justify-between gap-2 shrink-0 select-none relative z-30">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="w-10 h-10 flex items-center justify-center rounded-full text-stone-700 dark:text-stone-200 hover:bg-[#F0ECE4] dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <h1 className="text-base font-headline font-semibold text-[#2E3230] dark:text-white truncate">
              Выбор категории
            </h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#4A7C59] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            П
          </div>
        </header>

        {/* Scrollable Modal Content */}
        <main className="flex-1 overflow-y-auto pb-28 no-scrollbar">
          
          {/* Section Header with Add Category Button */}
          <div className="px-5 pt-3 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wallet size={20} className="text-[#4A7C59] dark:text-green-400" />
              <p className="font-headline font-semibold text-base text-[#2E3230] dark:text-white tracking-tight">
                Структура бюджета
              </p>
            </div>
            <button 
              type="button"
              onClick={handleToggleCreatePanel}
              className="h-9 px-3.5 flex items-center gap-1.5 rounded-full bg-[#C8E8D0] text-[#002110] dark:bg-[#4A7C59]/30 dark:text-green-300 font-label text-xs font-bold transition-transform active:scale-95 hover:bg-[#B2DFC0] cursor-pointer"
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
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-xs border border-[#E8E4DA] dark:border-white/10 space-y-3">
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
                      <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1 uppercase tracking-wider font-label">
                        Название категории
                      </label>
                      <div className="flex items-center bg-[#F5F1EA] dark:bg-[#252528] rounded-xl px-3 py-2">
                        <Tag size={16} className="text-stone-400 mr-2 shrink-0" />
                        <input 
                          ref={newCatNameInputRef}
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Например: Домашние питомцы"
                          className="w-full bg-transparent border-0 text-xs text-[#2E3230] dark:text-white placeholder:text-stone-400 focus:outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1 uppercase tracking-wider font-label">
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
                            className="w-full bg-transparent border-0 text-xs text-[#2E3230] dark:text-white placeholder:text-stone-400 focus:outline-none"
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
                      className="w-full mt-2 h-10 bg-[#4A7C59] text-white rounded-xl font-label font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xs hover:bg-[#3D684A] cursor-pointer"
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
            <div className="relative flex items-center bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xs px-3.5 py-2.5 border border-[#E8E4DA] dark:border-white/10 focus-within:border-[#4A7C59] transition-all">
              <Search size={18} className="text-stone-400 mr-2.5 shrink-0" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Быстрый поиск категории..."
                className="w-full bg-transparent border-0 text-xs text-[#2E3230] dark:text-white placeholder:text-stone-400 focus:outline-none font-medium"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-white ml-1 cursor-pointer"
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
                  className={`bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-2xs border transition-all ${
                    isParentSelected || hasActiveChild
                      ? 'border-2 border-[#4A7C59] shadow-xs'
                      : 'border-[#E8E4DA] dark:border-white/10'
                  }`}
                >
                  {/* Category Header */}
                  <div 
                    onClick={() => toggleAccordion(parent.id)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div 
                        className="w-11 h-11 rounded-2xl bg-[#F5F1EA] dark:bg-white/10 flex items-center justify-center text-[#4A7C59] dark:text-green-400 shrink-0"
                        style={parent.color ? { color: parent.color } : undefined}
                      >
                        {getIconById(parent.icon, 22)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-headline font-semibold text-sm text-[#2E3230] dark:text-white truncate">
                          {parent.label}
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400 font-body truncate">
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
                        className={`text-stone-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
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
                                ? 'is-selected bg-[#4A7C59] text-white shadow-xs border-[#4A7C59]'
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
                            <span className={`text-[10px] ${activeSelectedId === parent.id ? 'text-[#DCE7DA]' : 'text-stone-500 dark:text-stone-400'}`}>
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
                                    ? 'is-selected bg-[#4A7C59] text-white shadow-xs border-[#4A7C59]'
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
                                          : 'hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400'
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
                                <span className={`text-[10px] truncate ${isSubSelected ? 'text-[#DCE7DA]' : 'text-stone-500 dark:text-stone-400'}`}>
                                  {parent.label}
                                </span>
                              </div>
                            );
                          })}

                          {/* Quick Add Subcategory Card */}
                          <button 
                            type="button"
                            onClick={() => handleQuickAddSubcategoryForParent(parent.label)}
                            className="p-3 rounded-xl bg-[#F5F1EA]/60 dark:bg-white/5 text-[#4A7C59] dark:text-green-400 cursor-pointer hover:bg-[#EAE6DE] flex flex-col items-center justify-center gap-1 min-h-[64px] active:scale-95 transition-transform border border-dashed border-[#4A7C59]/30"
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
          <div className="mt-4 mx-4 p-3 rounded-xl bg-white dark:bg-[#1C1C1E] flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 font-body border border-[#E8E4DA] dark:border-white/10">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <Check size={16} className="text-[#4A7C59] dark:text-green-400 shrink-0" />
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
                className="text-xs text-[#4A7C59] dark:text-green-400 font-semibold hover:underline shrink-0 cursor-pointer"
              >
                Сбросить
              </button>
            )}
          </div>

        </main>

        {/* Fixed Bottom Actions Bar */}
        <div className="fixed bottom-0 w-full z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] bg-[#FAF6F0]/95 dark:bg-[#121214]/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(46,50,48,0.06)] border-t border-[#E8E4DA]/60 dark:border-white/10">
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
              className={`flex-1 h-11 px-5 flex items-center justify-center gap-2 rounded-xl bg-[#4A7C59] text-white font-label text-xs font-semibold shadow-xs active:scale-[0.98] transition-all cursor-pointer ${
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
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E4DA] dark:border-white/10 shadow-2xl p-4 max-w-sm w-full space-y-3">
              <div className="flex items-center justify-between border-b border-[#E8E4DA] dark:border-white/10 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-[#1E261E] dark:text-white">
                    Перенос подкатегории
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    «{movingSubcategory.label}»
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setMovingSubcategory(null)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
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
                    className="w-full text-left p-2.5 rounded-xl border border-[#E8E4DA] dark:border-white/10 hover:border-[#4A7C59] hover:bg-[#F5F1EA] dark:hover:bg-[#2A2A2E] text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span>{p.label}</span>
                    <ArrowRight size={13} className="text-stone-400" />
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setMovingSubcategory(null)}
                  className="px-3 py-1.5 border border-[#DDD8CB] dark:border-white/10 text-stone-700 dark:text-stone-300 font-semibold text-xs rounded-xl hover:bg-[#EAE6DE] cursor-pointer"
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
