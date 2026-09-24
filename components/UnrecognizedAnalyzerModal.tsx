import React, { useState, useMemo, useEffect } from 'react';
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

  // Automatically close analyzer when all unrecognized items are resolved
  useEffect(() => {
    if (isOpen && unrecognizedItems.length === 0) {
      onClose();
    }
  }, [isOpen, unrecognizedItems.length, onClose]);

  if (!isOpen || unrecognizedItems.length === 0) return null;

  const safeIndex = Math.min(currentIndex, unrecognizedItems.length - 1);
  const activeItem = unrecognizedItems[safeIndex] || unrecognizedItems[0];
  const activeAnalysis = activeItem ? analyzedMap.get(activeItem.id) : null;
  const activeCategory = activeAnalysis ? categories.find(c => c.id === activeAnalysis.suggestedCategoryId) : null;

  const progressPercent = Math.round(((items.length - unrecognizedItems.length) / (items.length || 1)) * 100);

  // Confirm single item
  const handleConfirmSingle = (targetCatId?: string) => {
    if (!activeItem || !activeAnalysis) return;
    const catIdToUse = targetCatId || activeAnalysis.suggestedCategoryId;
    const cat = categories.find(c => c.id === catIdToUse);

    let ruleToLearn: LearnedRule | undefined = undefined;
    if (saveRuleChecked && activeAnalysis.ruleKeyword && catIdToUse !== 'other') {
      ruleToLearn = {
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        keyword: activeAnalysis.ruleKeyword,
        cleanName: activeAnalysis.cleanName || activeItem.note,
        categoryId: catIdToUse
      };
    }

    onApplyCategoryWithRule(activeItem.id, catIdToUse, ruleToLearn);
    setManualPickerOpenForId(null);

    if (safeIndex >= unrecognizedItems.length - 1) {
      setCurrentIndex(0);
    }
  };

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

  return (
    <div className="fixed inset-0 z-[60] bg-stone-950/50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 transition-all">
      <div 
        className="bg-[#FAF8F5] dark:bg-[#1C1C1E] w-full max-w-3xl rounded-3xl shadow-2xl border border-[#ECE6DE] dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
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
                Авто-определение категорий • Обучение правил для будущего импорта
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
                <span>Разбор операции {safeIndex + 1} из {unrecognizedItems.length}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={safeIndex === 0}
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    className="p-1 rounded-lg border border-[#E0D8CE] dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={safeIndex >= unrecognizedItems.length - 1}
                    onClick={() => setCurrentIndex(prev => Math.min(unrecognizedItems.length - 1, prev + 1))}
                    className="p-1 rounded-lg border border-[#E0D8CE] dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Main Source Item Card */}
              <div 
                onClick={() => onEditItem && onEditItem(activeItem)}
                className="bg-white dark:bg-[#252528] rounded-2xl p-5 border border-[#ECE6DE] dark:border-white/10 shadow-sm space-y-3 cursor-pointer hover:border-[#4A7C59] transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold font-mono text-stone-400 dark:text-gray-500 uppercase tracking-wider">
                        Исходная запись банковской выписки:
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A7C59] bg-[#EAF2EC] dark:bg-green-950/40 px-2 py-0.5 rounded-md group-hover:bg-[#4A7C59] group-hover:text-white transition">
                        <Edit3 size={12} />
                        Изменить название
                      </span>
                    </div>
                    <div className="text-base font-headline font-bold text-stone-900 dark:text-white break-words">
                      {activeItem.rawNote || activeItem.note}
                    </div>
                    <div className="text-xs text-stone-600 dark:text-gray-300 bg-[#F5F0E6] dark:bg-white/5 p-2.5 rounded-xl border border-[#E5DEC3] dark:border-white/10 mt-2 flex items-center justify-between gap-2">
                      <span>Очищенное название: <b className="text-stone-900 dark:text-white font-bold">{activeAnalysis.cleanName || activeItem.note}</b></span>
                      <Edit3 size={14} className="text-[#4A7C59] shrink-0" />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold font-mono text-[#D95D39] dark:text-red-400 tabular-nums">
                      -{Math.round(activeItem.amount).toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-[11px] font-semibold text-stone-400 dark:text-gray-400 mt-0.5">
                      {activeItem.date} {activeItem.accountMask && `• ${activeItem.accountMask}`}
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
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4A7C59] animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#3B6447] dark:text-green-400">
                      Предложенная категория:
                    </span>
                  </div>
                  <div className="text-xs font-bold font-mono text-[#4A7C59] dark:text-green-400 bg-white/80 dark:bg-black/30 px-2.5 py-1 rounded-lg border border-[#4A7C59]/20">
                    🎯 Уверенность: {activeAnalysis.confidence}%
                  </div>
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
                        <span>{activeAnalysis.reason}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setManualPickerOpenForId(activeItem.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4EFE7] dark:bg-white/10 hover:bg-[#EAE4DA] dark:hover:bg-white/20 text-stone-800 dark:text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>Изменить...</span>
                  </button>
                </div>

                {/* Manual Category Picker Accordion if open */}
                {manualPickerOpenForId === activeItem.id && (
                  <div className="bg-white dark:bg-[#252528] rounded-2xl p-4 border border-[#ECE6DE] dark:border-white/10 space-y-3 animate-in fade-in duration-150">
                    <div className="text-xs font-bold text-stone-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Выберите категорию или подкатегорию:</span>
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
                      selectedCategoryId={activeCategory?.id}
                      onSelectCategory={(catId) => handleConfirmSingle(catId)}
                      onAddCategory={onAddCategory}
                    />
                  </div>
                )}

                {/* Rule Learning Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-gray-300 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={saveRuleChecked}
                      onChange={e => setSaveRuleChecked(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#4A7C59] focus:ring-[#4A7C59] cursor-pointer"
                    />
                    <ShieldCheck size={15} className="text-[#4A7C59]" />
                    <span>Запомнить как правило для «{activeAnalysis.ruleKeyword}»</span>
                  </label>
                </div>

                {/* Confirm Button */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <RippleButton
                    onClick={() => handleConfirmSingle()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-[#4A7C59] hover:bg-[#3B6447] text-white font-bold text-sm shadow-md transition cursor-pointer"
                  >
                    <Check size={18} strokeWidth={3} />
                    <span>✅ Да, соотнесено верно (Сохранить)</span>
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
                    onClick={() => onEditItem && onEditItem(item)}
                    className="bg-white dark:bg-[#252528] rounded-2xl p-4 border border-[#ECE6DE] dark:border-white/10 shadow-xs flex flex-col gap-3 transition-all cursor-pointer hover:border-[#4A7C59] group"
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
                            <span className="text-gray-400 group-hover:text-[#4A7C59] transition ml-auto sm:ml-0">
                              <Edit3 size={14} />
                            </span>
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
    </div>
  );
};
