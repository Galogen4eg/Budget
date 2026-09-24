import React, { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight, Check, Plus, Tag, FolderPlus } from 'lucide-react';
import { Category } from '../types';
import { getIconById } from '../constants';

interface CategoryPickerAccordionProps {
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory?: (category: Category) => void;
  placeholder?: string;
  maxHeightClass?: string;
}

export const CategoryPickerAccordion: React.FC<CategoryPickerAccordionProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  placeholder = "Поиск категории или подкатегории...",
  maxHeightClass = "max-h-72",
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [createType, setCreateType] = useState<'category' | 'subcategory'>('subcategory');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#4A7C59');
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  const PRESET_COLORS = [
    '#4A7C59', '#3D6B4C', '#D95C48', '#C4A66A', '#2D5540',
    '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#475569'
  ];

  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(() => {
    // Auto-expand parent of selected category
    if (!selectedCategoryId) return {};
    const selected = categories.find(c => c.id === selectedCategoryId);
    if (selected?.parentId) {
      return { [selected.parentId]: true };
    }
    return {};
  });

  // Filter out 'other' from main list or keep it at end
  const validCategories = useMemo(() => {
    return categories.filter(c => c.id !== 'other');
  }, [categories]);

  // Separate parents and subcategories, sorted A-Z
  const parentCategories = useMemo(() => {
    return validCategories
      .filter(c => !c.parentId)
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [validCategories]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Category[]>();
    validCategories.forEach(c => {
      if (c.parentId) {
        const existing = map.get(c.parentId) || [];
        existing.push(c);
        map.set(c.parentId, existing);
      }
    });
    // Sort each list A-Z
    map.forEach((list, key) => {
      map.set(key, list.sort((a, b) => a.label.localeCompare(b.label, 'ru')));
    });
    return map;
  }, [validCategories]);

  // Search filter logic
  const isSearching = searchQuery.trim().length > 0;
  const filteredSearchList = useMemo(() => {
    if (!isSearching) return null;
    const q = searchQuery.trim().toLowerCase();
    return validCategories.filter(c => c.label.toLowerCase().includes(q));
  }, [validCategories, isSearching, searchQuery]);

  const toggleExpand = (parentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const handleStartAddCategory = (type: 'category' | 'subcategory', initialName: string = '', defaultParentId?: string) => {
    setCreateType(type);
    setNewCatName(initialName);
    setSelectedParentId(defaultParentId || parentCategories[0]?.id || 'shopping');
    setIsAddingCategory(true);
  };

  const handleSaveCategory = () => {
    if (!newCatName.trim()) return;

    let newCategory: Category;
    if (createType === 'category') {
      const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      newCategory = {
        id: newId,
        label: newCatName.trim(),
        color: newCatColor,
        icon: 'Folder',
        isCustom: true,
      };
    } else {
      const parentCat = parentCategories.find(p => p.id === selectedParentId) || parentCategories[0];
      newCategory = {
        id: `subcat_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        label: newCatName.trim(),
        parentId: parentCat ? parentCat.id : undefined,
        icon: parentCat ? parentCat.icon : 'Tag',
        color: parentCat ? parentCat.color : '#4A7C59',
        isCustom: true,
      };
    }

    if (onAddCategory) {
      onAddCategory(newCategory);
    }
    onSelectCategory(newCategory.id);
    setIsAddingCategory(false);
    setNewCatName('');
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col space-y-2.5 bg-white dark:bg-[#252528] rounded-2xl p-3 border border-[#ECE6DE] dark:border-white/10 shadow-sm">
      {/* Search Bar & Add Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#FAF8F5] dark:bg-[#1C1C1E] border border-[#EBE4DC] dark:border-white/10 rounded-xl text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A7C59] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {!isAddingCategory && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleStartAddCategory('category', searchQuery)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#EAF2EC] dark:bg-green-950/40 hover:bg-[#4A7C59] hover:text-white text-[#2E5A39] dark:text-green-300 text-xs font-bold transition cursor-pointer"
              title="Создать новую категорию"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Категория</span>
            </button>

            <button
              type="button"
              onClick={() => handleStartAddCategory('subcategory', searchQuery)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-200 text-xs font-bold transition cursor-pointer"
              title="Создать новую подкатегорию"
            >
              <FolderPlus size={14} />
              <span className="hidden sm:inline">Подкатегория</span>
            </button>
          </div>
        )}
      </div>

      {/* Inline Category / Subcategory Creation Form */}
      {isAddingCategory && (
        <div className="bg-[#FAF8F5] dark:bg-[#1C1C1E] p-3 rounded-xl border border-[#4A7C59]/40 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#252528] p-1 rounded-xl border border-[#ECE6DE] dark:border-white/10">
              <button
                type="button"
                onClick={() => setCreateType('category')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  createType === 'category'
                    ? 'bg-[#4A7C59] text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:text-gray-400'
                }`}
              >
                Главная категория
              </button>
              <button
                type="button"
                onClick={() => setCreateType('subcategory')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  createType === 'subcategory'
                    ? 'bg-[#4A7C59] text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:text-gray-400'
                }`}
              >
                Подкатегория
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingCategory(false)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                {createType === 'category' ? 'Название новой категории:' : 'Название подкатегории:'}
              </label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={createType === 'category' ? 'Например: Здоровье' : 'Например: Аптека'}
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#252528] border border-[#ECE6DE] dark:border-white/10 rounded-lg text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4A7C59]"
                autoFocus
              />
            </div>

            {createType === 'subcategory' ? (
              <div>
                <label className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                  Родительская категория:
                </label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#252528] border border-[#ECE6DE] dark:border-white/10 rounded-lg text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4A7C59]"
                >
                  {parentCategories.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                  Цвет категории:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={`w-5 h-5 rounded-full transition transform ${
                        newCatColor === c ? 'scale-125 ring-2 ring-stone-800 dark:ring-white' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                disabled={!newCatName.trim()}
                className="px-3 py-1 rounded-lg bg-[#4A7C59] hover:bg-[#3B6447] text-white text-xs font-bold transition disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category List */}
      <div className={`overflow-y-auto ${maxHeightClass} space-y-1.5 pr-1`}>
        {/* Search View */}
        {isSearching && filteredSearchList && (
          <div className="space-y-1">
            {filteredSearchList.length === 0 ? (
              <div className="py-4 text-center text-xs space-y-2">
                <div className="text-stone-400">
                  Категория «<b>{searchQuery}</b>» не найдена
                </div>
                <button
                  type="button"
                  onClick={() => handleStartAddSubcat(searchQuery)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4A7C59] text-white text-xs font-bold hover:bg-[#3B6447] transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Создать подкатегорию «{searchQuery}»</span>
                </button>
              </div>
            ) : (
              <>
                {filteredSearchList.map(cat => {
                  const parentCat = cat.parentId ? categories.find(p => p.id === cat.parentId) : null;
                  const isSelected = selectedCategoryId === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onSelectCategory(cat.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#EAF2EC] dark:bg-green-950/40 border border-[#4A7C59] text-[#2E5A39] dark:text-green-300 font-bold'
                          : 'hover:bg-[#FAF8F5] dark:hover:bg-white/5 text-stone-800 dark:text-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 text-xs font-bold"
                          style={{ backgroundColor: cat.color || '#4A7C59' }}
                        >
                          {getIconById(cat.icon, 14)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{cat.label}</div>
                          {parentCat && (
                            <div className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                              в категории {parentCat.label}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check size={15} className="text-[#4A7C59] dark:text-green-400 shrink-0" />}
                    </button>
                  );
                })}

                <div className="pt-2 border-t border-[#ECE6DE] dark:border-white/10 text-center">
                  <button
                    type="button"
                    onClick={() => handleStartAddSubcat(searchQuery)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#4A7C59] dark:text-green-400 font-bold hover:underline cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Создать новую подкатегорию «{searchQuery}»</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Normal Accordion View */}
        {!isSearching && parentCategories.map(parentCat => {
          const children = childrenByParent.get(parentCat.id) || [];
          const hasChildren = children.length > 0;
          const isParentSelected = selectedCategoryId === parentCat.id;
          const isExpanded = expandedParents[parentCat.id] || children.some(c => c.id === selectedCategoryId);

          return (
            <div key={parentCat.id} className="rounded-xl border border-[#F0EAE1] dark:border-white/5 overflow-hidden">
              {/* Parent Category Header */}
              <div
                className={`flex items-center justify-between p-2 transition cursor-pointer ${
                  isParentSelected
                    ? 'bg-[#EAF2EC] dark:bg-green-950/40 font-bold text-[#2E5A39] dark:text-green-300'
                    : 'hover:bg-[#FAF8F5] dark:hover:bg-white/5 text-stone-900 dark:text-stone-100'
                }`}
              >
                <div 
                  onClick={() => onSelectCategory(parentCat.id)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 py-0.5"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 text-xs font-bold"
                    style={{ backgroundColor: parentCat.color || '#4A7C59' }}
                  >
                    {getIconById(parentCat.icon, 14)}
                  </div>
                  <span className="text-xs font-bold truncate">{parentCat.label}</span>
                  {hasChildren && (
                    <span className="text-[10px] bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-stone-400 px-1.5 py-0.2 rounded-full font-semibold">
                      {children.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAddSubcat('', parentCat.id);
                    }}
                    className="p-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-400 hover:text-[#4A7C59] dark:hover:text-green-400 transition"
                    title={`Добавить подкатегорию в «${parentCat.label}»`}
                  >
                    <Plus size={14} />
                  </button>

                  {isParentSelected && <Check size={15} className="text-[#4A7C59] dark:text-green-400 mr-1" />}
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={(e) => toggleExpand(parentCat.id, e)}
                      className="p-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-500 dark:text-stone-400 transition"
                      title={isExpanded ? "Свернуть подкатегории" : "Развернуть подкатегории"}
                    >
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Subcategories List */}
              {hasChildren && isExpanded && (
                <div className="bg-[#FAF8F5]/60 dark:bg-[#1C1C1E]/50 pl-6 pr-2 py-1.5 border-t border-[#F0EAE1] dark:border-white/5 space-y-1">
                  {children.map(childCat => {
                    const isChildSelected = selectedCategoryId === childCat.id;

                    return (
                      <button
                        key={childCat.id}
                        type="button"
                        onClick={() => onSelectCategory(childCat.id)}
                        className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-left transition cursor-pointer ${
                          isChildSelected
                            ? 'bg-[#EAF2EC] dark:bg-green-950/40 text-[#2E5A39] dark:text-green-300 font-bold border border-[#4A7C59]/40'
                            : 'hover:bg-white dark:hover:bg-white/10 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 text-[10px]"
                            style={{ backgroundColor: childCat.color || parentCat.color || '#4A7C59' }}
                          >
                            {getIconById(childCat.icon, 11)}
                          </div>
                          <span className="text-xs truncate font-medium">{childCat.label}</span>
                        </div>
                        {isChildSelected && <Check size={14} className="text-[#4A7C59] dark:text-green-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

