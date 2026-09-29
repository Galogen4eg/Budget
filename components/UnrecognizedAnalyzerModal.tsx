import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Check, X, Sparkles, ChevronRight, ChevronLeft, ArrowRight, 
  CheckCheck, Wand2, ShieldCheck, Tag, Info, List, Grid, Edit3, HelpCircle, Search, ChevronDown
} from 'lucide-react';
import { Category, LearnedRule, Transaction } from '../types';
import { analyzeTransaction, AnalysisResult } from '../utils/analyzerHelper';
import { getIconById } from '../constants';
import { RippleButton } from './RippleButton';
import { CategoryPickerAccordion } from './CategoryPickerAccordion';

export interface UnrecognizedAnalyzerItem {
  id: string; // tempId or transaction id
  note: string;
  rawNote?: string;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  mcc?: string;
  category?: string;
  accountMask?: string;
}

interface UnrecognizedAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: UnrecognizedAnalyzerItem[];
  categories: Category[];
  learnedRules: LearnedRule[];
  onApplyCategoryWithRule: (itemId: string, categoryId: string, ruleToLearn?: LearnedRule) => void;
  onApplyAllSuggestions: (results: Array<{ itemId: string; categoryId: string; ruleToLearn?: LearnedRule }>) => void;
  onAddCategory?: (category: Category) => void;
  onEditItem?: (item: UnrecognizedAnalyzerItem) => void;
}

export const UnrecognizedAnalyzerModal: React.FC<UnrecognizedAnalyzerModalProps> = ({
  isOpen,
  onClose,
  items,
  categories,
  learnedRules,
  onApplyCategoryWithRule,
  onApplyAllSuggestions,
  onAddCategory,
  onEditItem,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'list'>('single');
  const [saveRuleChecked, setSaveRuleChecked] = useState(true);
  const [manualPickerOpenForId, setManualPickerOpenForId] = useState<string | null>(null);
  const [selectedCatOverrideMap, setSelectedCatOverrideMap] = useState<Record<string, string>>({});
  const [customCleanNameMap, setCustomCleanNameMap] = useState<Record<string, string>>({});
  const [customRuleKeywordMap, setCustomRuleKeywordMap] = useState<Record<string, string>>({});

  // Filter only unrecognized items (category is 'other' or missing)
  const unrecognizedItems = useMemo(() => {
    return items.filter(i => !i.category || i.category === 'other');
  }, [items]);

  // Sorted categories for select dropdowns (Parents A-Z, Children A-Z)
  const sortedSelectCategories = useMemo(() => {
    const parents = categories.filter(c => !c.parentId && c.id !== 'other').sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    const result: Array<{ id: string; label: string; isChild?: boolean }> = [];
    parents.forEach(p => {
      result.push({ id: p.id, label: p.label, isChild: false });
      const children = categories.filter(c => c.parentId === p.id).sort((a, b) => a.label.localeCompare(b.label, 'ru'));
      children.forEach(ch => {
        result.push({ id: ch.id, label: `└ ${ch.label}`, isChild: true });
      });
    });
    return result;
  }, [categories]);

  // Pre-analyze all unrecognized items
  const analyzedMap = useMemo(() => {
    const map = new Map<string, AnalysisResult>();
    unrecognizedItems.forEach(item => {
      const res = analyzeTransaction(item.rawNote || '', item.note, item.mcc, learnedRules, categories);
      map.set(item.id, res);
    });
    return map;
  }, [unrecognizedItems, learnedRules, categories]);

  // Keep index within bounds when items are categorized/removed
  useEffect(() => {
    if (currentIndex >= unrecognizedItems.length && unrecognizedItems.length > 0) {
      setCurrentIndex(unrecognizedItems.length - 1);
    }
  }, [unrecognizedItems.length, currentIndex]);

  const safeIndex = Math.min(currentIndex, Math.max(0, unrecognizedItems.length - 1));
  const activeItem = unrecognizedItems[safeIndex] || unrecognizedItems[0];
  const activeAnalysis = activeItem ? analyzedMap.get(activeItem.id) : null;
  const effectiveCategoryId = (activeItem && selectedCatOverrideMap[activeItem.id]) || activeAnalysis?.suggestedCategoryId || 'other';
  const activeCategory = categories.find(c => c.id === effectiveCategoryId);
  const effectiveCleanName = (activeItem && customCleanNameMap[activeItem.id]) !== undefined 
    ? customCleanNameMap[activeItem.id] 
    : (activeAnalysis?.cleanName || activeItem?.note || '');
  const effectiveRuleKeyword = (activeItem && customRuleKeywordMap[activeItem.id]) !== undefined
    ? customRuleKeywordMap[activeItem.id]
    : (activeAnalysis?.ruleKeyword || activeItem?.note || '');

  const progressPercent = Math.round(((items.length - unrecognizedItems.length) / (items.length || 1)) * 100);

  // Confirm single item
  const handleConfirmSingle = (targetCatId?: string) => {
    if (!activeItem) return;
    const catIdToUse = targetCatId || effectiveCategoryId;

    let ruleToLearn: LearnedRule | undefined = undefined;
    const ruleKeywordToSave = effectiveRuleKeyword.trim();
    if (saveRuleChecked && ruleKeywordToSave && catIdToUse !== 'other') {
      ruleToLearn = {
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        keyword: ruleKeywordToSave,
        cleanName: effectiveCleanName || activeItem.note,
        categoryId: catIdToUse
      };
    }

    onApplyCategoryWithRule(activeItem.id, catIdToUse, ruleToLearn);
    setManualPickerOpenForId(null);

    if (safeIndex >= unrecognizedItems.length - 1) {
      setCurrentIndex(0);
    }
  };

  // Keyboard navigation (ArrowLeft / ArrowRight to navigate, Enter to confirm, Escape to close)
  useEffect(() => {
    if (!isOpen || unrecognizedItems.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex(prev => Math.min(unrecognizedItems.length - 1, prev + 1));
      } else if (e.key === 'Enter') {
        if (viewMode === 'single' && !manualPickerOpenForId) {
          e.preventDefault();
          handleConfirmSingle();
        }
      } else if (e.key === 'Escape') {
        if (manualPickerOpenForId) {
          setManualPickerOpenForId(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, unrecognizedItems.length, viewMode, manualPickerOpenForId, safeIndex, activeItem, activeAnalysis, saveRuleChecked]);

  if (!isOpen) return null;

  // Show Completion Screen when all unrecognized items are resolved
  if (unrecognizedItems.length === 0) {
    return createPortal(
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        className="fixed inset-0 z-[3000] bg-stone-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 transition-all select-none"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FAF8F5] dark:bg-[#1C1C1E] w-full max-w-lg rounded-3xl shadow-2xl border border-[#ECE6DE] dark:border-white/10 overflow-hidden flex flex-col p-6 sm:p-8 text-center items-center gap-5 animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#4A7C59] to-[#2D5540] text-white flex items-center justify-center shadow-lg">
            <CheckCheck size={32} strokeWidth={2.5} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold font-headline text-stone-900 dark:text-white">
              Все операции разобраны!
            </h3>
            <p className="text-xs text-stone-500 dark:text-gray-400 max-w-sm mx-auto">
              Категории успешно назначены, а обученные правила сохранены. Теперь можно подтвердить импорт в основной список.
            </p>
          </div>
          <RippleButton
            onClick={onClose}
            className="w-full py-3 px-6 rounded-2xl bg-[#4A7C59] hover:bg-[#3B6447] text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Вернуться к выписке</span>
            <ArrowRight size={16} />
          </RippleButton>
        </div>
      </div>,
      document.body
    );
  }

  // Confirm all auto suggestions
  const handleConfirmAllSuggestions = () => {
    const results = unrecognizedItems.map(item => {
      const analysis = analyzedMap.get(item.id);
      const catId = analysis?.suggestedCategoryId || 'shopping';
      let rule: LearnedRule | undefined = undefined;
      if (saveRuleChecked && analysis?.ruleKeyword && catId !== 'other') {
        rule = {
          id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          keyword: analysis.ruleKeyword,
          cleanName: analysis.cleanName || item.note,
          categoryId: catId
        };
      }
      return {
        itemId: item.id,
        categoryId: catId,
        ruleToLearn: rule
      };
    });

    onApplyAllSuggestions(results);
    onClose();
  };

  return createPortal(
    <div 
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[3000] bg-stone-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-6 transition-all select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF8F5] dark:bg-[#1C1C1E] w-full max-w-4xl lg:max-w-5xl rounded-3xl shadow-2xl border border-[#ECE6DE] dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-white dark:bg-[#252528] border-b border-[#ECE6DE] dark:border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4A7C59] to-[#2D5540] text-white flex items-center justify-center shadow-md shrink-0">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-nowrap">
                <h3 className="text-base sm:text-lg font-bold font-headline text-stone-900 dark:text-white tracking-tight truncate">
                  Анализатор нераспознанных операций
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E09F3E]/20 text-[#B87008] dark:text-amber-300 text-xs font-bold whitespace-nowrap shrink-0">
                  {unrecognizedItems.length} осталось
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 truncate">
                Авто-определение категорий, обучение правил для будущего импорта
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#F4EFE7] dark:bg-white/5 rounded-xl p-1 border border-[#ECE6DE] dark:border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'single'
                    ? 'bg-white dark:bg-[#323236] text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 dark:text-gray-400 hover:text-stone-900'
                }`}
              >
                <Grid size={14} />
                <span className="hidden sm:inline">По одной</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#323236] text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 dark:text-gray-400 hover:text-stone-900'
                }`}
              >
                <List size={14} />
                <span className="hidden sm:inline">Списком</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/20 text-stone-500 dark:text-gray-300 flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="px-6 py-2.5 bg-[#F5F0E6] dark:bg-[#222225] border-b border-[#ECE6DE] dark:border-white/10 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 text-stone-600 dark:text-gray-300 font-semibold">
            <Wand2 size={15} className="text-[#4A7C59] dark:text-green-400" />
            <span>Система подготовила авто-правила для всех нераспознанных позиций</span>
          </div>
          <RippleButton
            onClick={handleConfirmAllSuggestions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4A7C59] hover:bg-[#3B6447] text-white text-xs font-bold shadow-sm transition"
          >
            <CheckCheck size={15} />
            <span>Принять всё ({unrecognizedItems.length})</span>
          </RippleButton>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* MODE 1: SINGLE CARD FOCUS */}
          {viewMode === 'single' && activeItem && activeAnalysis && (
            <div className="space-y-5 animate-in fade-in duration-150">

              {/* Progress counter */}
              <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span>Разбор операции {safeIndex + 1} из {unrecognizedItems.length}</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-500 font-mono bg-stone-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-stone-200 dark:border-white/10">
                    <kbd className="font-semibold">←</kbd> <kbd className="font-semibold">→</kbd> листание
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={safeIndex === 0}
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    title="Предыдущая операция (Стрелка влево ←)"
                    className="p-1 rounded-lg border border-[#E0D8CE] dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={safeIndex >= unrecognizedItems.length - 1}
                    onClick={() => setCurrentIndex(prev => Math.min(unrecognizedItems.length - 1, prev + 1))}
                    title="Следующая операция (Стрелка вправо →)"
                    className="p-1 rounded-lg border border-[#E0D8CE] dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Main Source Item Card */}
              <div 
                className="bg-white dark:bg-[#252528] rounded-2xl p-5 border border-[#ECE6DE] dark:border-white/10 shadow-sm space-y-3 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold font-mono text-stone-400 dark:text-gray-500 uppercase tracking-wider">
                        Исходная запись банковской выписки:
                      </span>
                      {onEditItem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem(activeItem);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A7C59] bg-[#EAF2EC] dark:bg-green-950/40 hover:bg-[#4A7C59] hover:text-white px-2 py-0.5 rounded-md transition cursor-pointer"
                        >
                          <Edit3 size={12} />
                          Изменить название
                        </button>
                      )}
                    </div>
                    <div className="text-base font-headline font-bold text-stone-900 dark:text-white break-words">
                      {activeItem.rawNote || activeItem.note}
                    </div>
                    <div className="text-xs text-stone-600 dark:text-gray-300 bg-[#F5F0E6] dark:bg-white/5 p-2.5 rounded-xl border border-[#E5DEC3] dark:border-white/10 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="shrink-0 font-semibold text-stone-600 dark:text-stone-300">Очищенное название для истории:</span>
                      <input 
                        type="text"
                        value={effectiveCleanName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomCleanNameMap(prev => ({ ...prev, [activeItem.id]: val }));
                        }}
                        placeholder="Название операции в истории..."
                        className="font-bold text-stone-900 dark:text-white bg-white dark:bg-[#1C1C1E] px-2.5 py-1 rounded-lg border border-stone-300 dark:border-white/20 focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59] outline-none text-xs w-full max-w-sm"
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold font-mono text-[#D95D39] dark:text-red-400 tabular-nums">
                      -{Math.round(activeItem.amount).toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-[11px] font-semibold text-stone-400 dark:text-gray-400 mt-0.5">
                      {activeItem.date} {activeItem.accountMask && `(${activeItem.accountMask})`}
                    </div>
                  </div>
                </div>

                {activeItem.mcc && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F0E6] dark:bg-white/5 border border-[#E5DEC3] dark:border-white/10 text-xs font-mono font-bold text-stone-700 dark:text-gray-300">
                    <Tag size={13} className="text-[#4A7C59]" />
                    <span>MCC: {activeItem.mcc}</span>
                  </div>
                )}
              </div>

              {/* AI PROPOSED CATEGORY CARD */}
              <div className="bg-gradient-to-br from-[#F4FAF6] to-[#FAF8F5] dark:from-[#1E2B22] dark:to-[#1C1C1E] rounded-2xl p-5 border-2 border-[#4A7C59]/40 dark:border-green-500/30 shadow-md space-y-4">
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3B6447] dark:text-green-400">
                    Предложенная категория:
                  </span>
                  {activeAnalysis && (
                    <div className="text-xs font-bold font-mono text-[#4A7C59] dark:text-green-400 bg-white/80 dark:bg-black/30 px-2.5 py-1 rounded-lg border border-[#4A7C59]/20">
                      🎯 Уверенность: {activeAnalysis.confidence}%
                    </div>
                  )}
                </div>

                {/* Category Display Banner */}
                <div className="flex items-center justify-between bg-white dark:bg-[#252528] rounded-xl p-4 border border-[#ECE6DE] dark:border-white/10 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm font-bold shrink-0"
                      style={{ backgroundColor: activeCategory?.color || '#4A7C59' }}
                    >
                      {getIconById(activeCategory?.icon || 'ShoppingBag', 22)}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-stone-900 dark:text-white font-headline">
                        {activeCategory?.label || 'Покупки'}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <Info size={13} className="text-[#4A7C59] shrink-0" />
                        <span>{activeAnalysis?.reason || 'Выбрано вручную'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setManualPickerOpenForId(manualPickerOpenForId === activeItem.id ? null : activeItem.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4EFE7] dark:bg-white/10 hover:bg-[#EAE4DA] dark:hover:bg-white/20 text-stone-800 dark:text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>{manualPickerOpenForId === activeItem.id ? 'Скрыть выбор' : 'Изменить категорию...'}</span>
                  </button>
                </div>

                {/* Manual Category Picker Accordion if open */}
                {manualPickerOpenForId === activeItem.id && (
                  <div className="bg-white dark:bg-[#252528] rounded-2xl p-4 sm:p-5 border border-[#ECE6DE] dark:border-white/10 space-y-3.5 animate-in fade-in duration-150 shadow-md">
                    <div className="text-xs font-bold text-stone-700 dark:text-gray-300 flex items-center justify-between">
                      <span className="text-sm font-headline">Выберите подходящую категорию или подкатегорию:</span>
                      <button 
                        type="button" 
                        onClick={() => setManualPickerOpenForId(null)}
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <CategoryPickerAccordion
                      categories={categories}
                      selectedCategoryId={effectiveCategoryId}
                      maxHeightClass="max-h-[460px]"
                      onSelectCategory={(catId) => {
                        setSelectedCatOverrideMap(prev => ({ ...prev, [activeItem.id]: catId }));
                        setManualPickerOpenForId(null);
                      }}
                      onAddCategory={onAddCategory}
                    />
                  </div>
                )}

                {/* Rule Learning Card with Editable Keyword */}
                <div className="bg-white/90 dark:bg-black/20 rounded-2xl p-4 border border-[#4A7C59]/30 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 text-xs font-bold text-stone-800 dark:text-gray-200 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={saveRuleChecked}
                        onChange={e => setSaveRuleChecked(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#4A7C59] focus:ring-[#4A7C59] cursor-pointer"
                      />
                      <ShieldCheck size={16} className="text-[#4A7C59]" />
                      <span>Запомнить как автоправило для будущих выписок</span>
                    </label>
                  </div>

                  {saveRuleChecked && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1 pl-6">
                      <span className="text-xs font-semibold text-stone-500 dark:text-gray-400 shrink-0">
                        Запоминаемое ключевое слово:
                      </span>
                      <div className="relative flex-1">
                        <input 
                          type="text"
                          value={effectiveRuleKeyword}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomRuleKeywordMap(prev => ({ ...prev, [activeItem.id]: val }));
                          }}
                          placeholder="например: ВкусВилл, Яндекс, Магнит..."
                          className="w-full font-bold font-mono text-xs text-stone-900 dark:text-white bg-stone-50 dark:bg-[#1C1C1E] px-3 py-1.5 rounded-xl border border-[#4A7C59]/50 focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59] outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Button */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <RippleButton
                    onClick={() => handleConfirmSingle()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-[#4A7C59] hover:bg-[#3B6447] text-white font-bold text-sm shadow-md transition cursor-pointer"
                  >
                    <Check size={18} strokeWidth={3} />
                    <span>Подтвердить категорию «{activeCategory?.label || 'Сохранить'}»</span>
                    <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono bg-white/20 text-white px-1.5 py-0.5 rounded ml-1">
                      Enter ↵
                    </kbd>
                  </RippleButton>
                </div>

              </div>

            </div>
          )}

          {/* MODE 2: BATCH LIST */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {unrecognizedItems.map(item => {
                const analysis = analyzedMap.get(item.id);
                const category = analysis ? categories.find(c => c.id === analysis.suggestedCategoryId) : null;
                const newCleanName = analysis?.cleanName || item.note;
                const rawNoteText = item.rawNote || item.note;

                const isPickerOpen = manualPickerOpenForId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#252528] rounded-2xl p-4 border border-[#ECE6DE] dark:border-white/10 shadow-xs flex flex-col gap-3 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-bold"
                          style={{ backgroundColor: category?.color || '#4A7C59' }}
                        >
                          {getIconById(category?.icon || 'ShoppingBag', 18)}
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Очищенное название */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-stone-900 dark:text-white text-base truncate">
                              {newCleanName}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4A7C59] bg-[#EAF2EC] dark:bg-green-950/40 px-2 py-0.5 rounded-md">
                              <Sparkles size={10} />
                              Новое название
                            </span>
                            {onEditItem && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditItem(item);
                                }}
                                className="text-gray-400 hover:text-[#4A7C59] transition p-0.5 cursor-pointer ml-auto sm:ml-0"
                                title="Редактировать название и параметры"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}
                          </div>

                          {/* Исходная сырая строка */}
                          {rawNoteText && rawNoteText !== newCleanName && (
                            <div className="text-xs text-stone-500 dark:text-gray-400 font-mono mt-0.5 truncate">
                              Исходная: {rawNoteText}
                            </div>
                          )}

                          <div className="text-xs text-stone-400 mt-1 flex items-center gap-2 flex-wrap">
                            <span>Категория: <b className="text-stone-800 dark:text-gray-200">{category?.label}</b></span>
                            <span>•</span>
                            <span>-{Math.round(item.amount).toLocaleString('ru-RU')} ₽</span>
                            {analysis && (
                              <span className="text-[10px] font-bold text-[#4A7C59] bg-[#EAF2EC] dark:bg-green-950/40 px-1.5 py-0.5 rounded">
                                {analysis.reason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div 
                        className="flex items-center gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setManualPickerOpenForId(isPickerOpen ? null : item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1C1E] border border-[#ECE6DE] dark:border-white/10 hover:border-[#4A7C59] text-xs font-bold text-stone-800 dark:text-white transition cursor-pointer"
                        >
                          <Tag size={13} className="text-[#4A7C59]" />
                          <span>{category?.label || 'Категория'}</span>
                          <ChevronDown size={14} className="text-stone-400" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const catId = analysis?.suggestedCategoryId || 'shopping';
                            let rule: LearnedRule | undefined = undefined;
                            if (saveRuleChecked && analysis?.ruleKeyword) {
                              rule = {
                                id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                keyword: analysis.ruleKeyword,
                                cleanName: newCleanName,
                                categoryId: catId
                              };
                            }
                            onApplyCategoryWithRule(item.id, catId, rule);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#4A7C59] hover:bg-[#3B6447] text-white text-xs font-bold transition cursor-pointer"
                        >
                          <Check size={14} strokeWidth={3} />
                          <span>ОК</span>
                        </button>
                      </div>
                    </div>

                    {/* Accordion Category Picker for this item in List View */}
                    {isPickerOpen && (
                      <div 
                        className="mt-2 pt-2 border-t border-[#ECE6DE] dark:border-white/10 animate-in fade-in duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-xs font-bold text-stone-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                          <span>Поиск и выбор категории (A-Z) для «{newCleanName}»:</span>
                          <button 
                            type="button"
                            onClick={() => setManualPickerOpenForId(null)}
                            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <CategoryPickerAccordion
                          categories={categories}
                          selectedCategoryId={analysis?.suggestedCategoryId}
                          onAddCategory={onAddCategory}
                          onSelectCategory={(catId) => {
                            let rule: LearnedRule | undefined = undefined;
                            if (saveRuleChecked && analysis?.ruleKeyword) {
                              rule = {
                                id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                keyword: analysis.ruleKeyword,
                                cleanName: newCleanName,
                                categoryId: catId
                              };
                            }
                            onApplyCategoryWithRule(item.id, catId, rule);
                            setManualPickerOpenForId(null);
                          }}
                        />
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white dark:bg-[#252528] border-t border-[#ECE6DE] dark:border-white/10 flex items-center justify-between text-xs">
          <span className="text-stone-500 dark:text-gray-400 font-semibold">
            Все подтвержденные правила сохраняются во встроенную базу знаний и автоприменяются при следующих импортах.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/20 text-stone-700 dark:text-gray-300 font-bold transition"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
