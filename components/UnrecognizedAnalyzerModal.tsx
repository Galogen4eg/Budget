import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays, Check, CheckCheck, ChevronDown,
  ChevronLeft, ChevronRight, Edit3, Grid2X2, List, Search, ShieldCheck,
  Sparkles, Tag, X
} from 'lucide-react';
import { Category, LearnedRule } from '../types';
import { analyzeTransaction, AnalysisResult } from '../utils/analyzerHelper';
import { CategoryPickerAccordion } from './CategoryPickerAccordion';

export interface UnrecognizedAnalyzerItem {
  id: string;
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

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? (value || 'Дата не указана')
    : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatAmount = (item: UnrecognizedAnalyzerItem): string =>
  `${item.type === 'income' ? '+' : '−'}${Math.abs(item.amount).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;

const isUsableCategory = (id: string | undefined, categories: Category[]): id is string =>
  Boolean(id && id !== 'other' && categories.some(category => category.id === id));

export const UnrecognizedAnalyzerModal: React.FC<UnrecognizedAnalyzerModalProps> = ({
  isOpen, onClose, items, categories, learnedRules,
  onApplyCategoryWithRule, onApplyAllSuggestions, onAddCategory, onEditItem
}) => {
  const [viewMode, setViewMode] = useState<'single' | 'list'>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const [chosenCategories, setChosenCategories] = useState<Record<string, string>>({});
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [editedKeywords, setEditedKeywords] = useState<Record<string, string>>({});
  const [rememberRules, setRememberRules] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // All three views (single, list, and the category catalog) receive exactly
  // the same live family categories. No hardcoded fallback category is used.
  const remaining = useMemo(
    () => items.filter(item => !item.category || item.category === 'other'),
    [items]
  );
  const analyses = useMemo(() => new Map<string, AnalysisResult>(
    remaining.map(item => [
      item.id,
      analyzeTransaction(item.rawNote || '', item.note, item.mcc, learnedRules, categories)
    ])
  ), [remaining, learnedRules, categories]);

  const suggested = useMemo(() => remaining.filter(item => {
    const result = analyses.get(item.id);
    return Boolean(result && result.source !== 'fallback' && result.confidence >= 88 &&
      isUsableCategory(result.suggestedCategoryId, categories));
  }), [remaining, analyses, categories]);

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('ru-RU');
    if (!query) return remaining;
    return remaining.filter(item =>
      (item.note + ' ' + (item.rawNote || '') + ' ' + formatDate(item.date) +
        ' ' + (item.mcc || '')).toLocaleLowerCase('ru-RU').includes(query)
    );
  }, [remaining, searchQuery]);

  const safeIndex = Math.min(currentIndex, Math.max(0, remaining.length - 1));
  const activeItem = remaining[safeIndex];
  const activeAnalysis = activeItem ? analyses.get(activeItem.id) : undefined;

  useEffect(() => {
    if (currentIndex >= remaining.length && remaining.length > 0) {
      setCurrentIndex(remaining.length - 1);
    }
  }, [currentIndex, remaining.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [role="dialog"] [contenteditable]')) return;
      if (event.key === 'Escape') {
        if (openPickerId) setOpenPickerId(null);
        else onClose();
      }
      if (viewMode !== 'single' || openPickerId) return;
      if (event.key === 'ArrowLeft') setCurrentIndex(index => Math.max(0, index - 1));
      if (event.key === 'ArrowRight') setCurrentIndex(index => Math.min(remaining.length - 1, index + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, viewMode, openPickerId, onClose, remaining.length]);

  const chosenCategory = (item: UnrecognizedAnalyzerItem): string | undefined => {
    if (chosenCategories[item.id]) return chosenCategories[item.id];
    const analysis = analyses.get(item.id);
    if (analysis?.source !== 'fallback' && analysis && analysis.confidence >= 88 &&
        isUsableCategory(analysis.suggestedCategoryId, categories)) {
      return analysis.suggestedCategoryId;
    }
    return undefined;
  };

  const buildRule = (item: UnrecognizedAnalyzerItem, categoryId: string): LearnedRule | undefined => {
    if (!rememberRules) return undefined;
    const analysis = analyses.get(item.id);
    const keyword = (editedKeywords[item.id] ?? analysis?.ruleKeyword ?? '').trim();
    // A rule must be based on an explicit nontrivial merchant keyword, never
    // on a generic analyzer fallback or an empty match.
    if (keyword.length < 4 || /^(покупки|прочее|оплата|перевод)$/i.test(keyword)) return undefined;
    return {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      keyword,
      cleanName: editedNames[item.id] ?? analysis?.cleanName ?? item.note,
      categoryId
    };
  };

  const assignCategory = (item: UnrecognizedAnalyzerItem, categoryId: string) => {
    // The shared picker may have just created a category; its parent props
    // will update on the next render, so do not reject that new ID here.
    if (!categoryId || categoryId === 'other') return;
    onApplyCategoryWithRule(item.id, categoryId, buildRule(item, categoryId));
    setOpenPickerId(null);
  };

  const acceptConfident = () => {
    if (!suggested.length) return;
    const results = suggested.map(item => {
      const categoryId = analyses.get(item.id)!.suggestedCategoryId;
      return { itemId: item.id, categoryId, ruleToLearn: buildRule(item, categoryId) };
    });
    onApplyAllSuggestions(results);
  };

  const categoryName = (id?: string): string =>
    categories.find(category => category.id === id)?.label || 'Не выбрана';

  const dateAndAmount = (item: UnrecognizedAnalyzerItem) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="inline-flex items-center gap-1.5 text-stone-600 dark:text-stone-300 font-medium">
        <CalendarDays size={15} aria-hidden="true" />
        {formatDate(item.date)}
      </span>
      <span className={`font-bold tabular-nums ${item.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
        {formatAmount(item)}
      </span>
      <span className="text-xs text-stone-400">{item.type === 'income' ? 'Доход' : 'Расход'}</span>
      {item.mcc && <span className="text-xs text-stone-500">MCC {item.mcc}</span>}
      {item.accountMask && <span className="text-xs text-stone-500">{item.accountMask}</span>}
    </div>
  );

  // No hooks below these returns: opening and closing never changes hook order.
  if (!isOpen) return null;

  if (!remaining.length) {
    return createPortal(
      <div className="fixed inset-0 z-[3000] bg-stone-950/60 flex items-center justify-center p-4">
        <div role="dialog" aria-modal="true" aria-label="Разбор завершён"
          className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-7 max-w-md w-full text-center space-y-4 shadow-2xl">
          <CheckCheck className="mx-auto text-[#4A7C59]" size={38} />
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">Все категории назначены</h2>
          <p className="text-sm text-stone-500 dark:text-stone-300">
            Изменения применены к предварительному просмотру. Сам импорт ещё нужно подтвердить отдельно.
          </p>
          <button type="button" onClick={onClose}
            className="w-full bg-[#4A7C59] text-white font-semibold rounded-xl py-3">Вернуться к выписке</button>
        </div>
      </div>, document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[3000] bg-stone-950/55 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-5"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Разбор операций"
        className="bg-[#FAF8F5] dark:bg-[#1C1C1E] text-stone-900 dark:text-white w-full max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[92dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <header className="bg-white dark:bg-[#252528] border-b border-stone-200 dark:border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-headline text-lg sm:text-xl font-bold flex items-center gap-2">
              <Sparkles size={21} className="text-[#4A7C59] shrink-0" />
              Разбор операций
              <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-1 rounded-lg whitespace-nowrap">
                {remaining.length} осталось
              </span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Единый каталог категорий. Изменения применяются к предварительному просмотру.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть анализатор"
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/10 shrink-0"><X size={20} /></button>
        </header>

        <div className="px-4 sm:px-6 py-3 bg-[#F4F0E8] dark:bg-[#222225] border-b border-stone-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex bg-white dark:bg-[#333336] border border-stone-200 dark:border-white/10 rounded-xl p-1">
              <button type="button" onClick={() => { setViewMode('list'); setOpenPickerId(null); }}
                aria-pressed={viewMode === 'list'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${viewMode === 'list' ? 'bg-[#4A7C59] text-white' : 'text-stone-600 dark:text-stone-200'}`}>
                <List size={15} /> Списком
              </button>
              <button type="button" onClick={() => { setViewMode('single'); setOpenPickerId(null); }}
                aria-pressed={viewMode === 'single'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${viewMode === 'single' ? 'bg-[#4A7C59] text-white' : 'text-stone-600 dark:text-stone-200'}`}>
                <Grid2X2 size={15} /> По одной
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-200 cursor-pointer">
              <input type="checkbox" checked={rememberRules} onChange={event => setRememberRules(event.target.checked)}
                className="accent-[#4A7C59] w-4 h-4" />
              <ShieldCheck size={15} />
              Запоминать правило
            </label>
          </div>
          <button type="button" onClick={acceptConfident} disabled={!suggested.length}
            className="px-3 py-2 bg-[#4A7C59] disabled:bg-stone-300 disabled:text-stone-600 dark:disabled:bg-stone-700 dark:disabled:text-stone-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCheck size={16} /> Принять уверенные ({suggested.length})
          </button>
        </div>

        <main className="overflow-y-auto flex-1 px-4 sm:px-6 py-5">
          {viewMode === 'list' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Найти операцию по названию, дате или MCC"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#252528] text-sm outline-none focus:ring-2 focus:ring-[#4A7C59]" />
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Выберите категорию — она назначится сразу. Для следующей операции не нужно нажимать «ОК».
              </p>
              {visible.map(item => {
                const analysis = analyses.get(item.id);
                const chosen = chosenCategory(item);
                const open = openPickerId === item.id;
                const confident = analysis?.source !== 'fallback' && (analysis?.confidence || 0) >= 88 &&
                  isUsableCategory(analysis?.suggestedCategoryId, categories);
                return (
                  <article key={item.id} className="bg-white dark:bg-[#252528] border border-stone-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-sm sm:text-base break-words">{item.note}</h3>
                          {onEditItem && (
                            <button type="button" onClick={() => onEditItem(item)} title="Изменить операцию"
                              className="text-stone-400 hover:text-[#4A7C59]"><Edit3 size={15} /></button>
                          )}
                        </div>
                        {item.rawNote && item.rawNote !== item.note &&
                          <p className="text-xs text-stone-500 dark:text-stone-400 break-words">Из выписки: {item.rawNote}</p>}
                        {dateAndAmount(item)}
                        {confident && <p className="text-xs text-[#4A7C59]">Предложение: {categoryName(analysis?.suggestedCategoryId)}</p>}
                      </div>
                      <button type="button" onClick={() => setOpenPickerId(open ? null : item.id)}
                        aria-expanded={open}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-[#4A7C59]/40 text-[#2F6240] dark:text-green-300 font-semibold text-sm min-w-[185px] hover:bg-[#EAF2EC] dark:hover:bg-green-950/30">
                        <span className="flex items-center gap-2"><Tag size={16} /> {chosen ? categoryName(chosen) : 'Выбрать категорию'}</span>
                        <ChevronDown size={16} />
                      </button>
                    </div>
                    {open && (
                      <div className="border-t border-stone-200 dark:border-white/10 pt-3">
                        <CategoryPickerAccordion key={item.id} categories={categories} selectedCategoryId={chosen}
                          onAddCategory={onAddCategory} maxHeightClass="max-h-[360px]"
                          onSelectCategory={id => assignCategory(item, id)} />
                      </div>
                    )}
                  </article>
                );
              })}
              {!visible.length && <p className="text-center text-sm text-stone-500 py-8">Ничего не найдено</p>}
            </div>
          ) : activeItem ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-stone-500 dark:text-stone-300">
                <span>Операция {safeIndex + 1} из {remaining.length}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={safeIndex === 0} aria-label="Предыдущая операция"
                    onClick={() => { setCurrentIndex(i => Math.max(0, i - 1)); setOpenPickerId(null); }}
                    className="p-2 rounded-lg border border-stone-200 dark:border-white/10 disabled:opacity-30"><ChevronLeft size={18} /></button>
                  <button type="button" disabled={safeIndex >= remaining.length - 1} aria-label="Следующая операция"
                    onClick={() => { setCurrentIndex(i => Math.min(remaining.length - 1, i + 1)); setOpenPickerId(null); }}
                    className="p-2 rounded-lg border border-stone-200 dark:border-white/10 disabled:opacity-30"><ChevronRight size={18} /></button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-4">
                <section className="bg-white dark:bg-[#252528] border border-stone-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
                  <div>
                    <p className="text-xs text-stone-500 mb-2">Операция из банковской выписки</p>
                    <h3 className="text-lg font-bold break-words">{activeItem.note}</h3>
                    {activeItem.rawNote && activeItem.rawNote !== activeItem.note &&
                      <p className="text-sm text-stone-500 mt-2 break-words">{activeItem.rawNote}</p>}
                  </div>
                  {dateAndAmount(activeItem)}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">Название в истории</label>
                    <input value={editedNames[activeItem.id] ?? activeAnalysis?.cleanName ?? activeItem.note}
                      onChange={event => setEditedNames(prev => ({ ...prev, [activeItem.id]: event.target.value }))}
                      className="w-full border border-stone-200 dark:border-white/10 bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm" />
                  </div>
                  {rememberRules && (
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 mb-1.5">Ключевое слово для будущих выписок</label>
                      <input value={editedKeywords[activeItem.id] ?? activeAnalysis?.ruleKeyword ?? ''}
                        onChange={event => setEditedKeywords(prev => ({ ...prev, [activeItem.id]: event.target.value }))}
                        placeholder="Уникальное название магазина или получателя"
                        className="w-full border border-stone-200 dark:border-white/10 bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm" />
                      <p className="text-xs text-stone-500 mt-1">Не используйте общие слова вроде «оплата» или «перевод».</p>
                    </div>
                  )}
                  {onEditItem && <button type="button" onClick={() => onEditItem(activeItem)}
                    className="inline-flex items-center gap-2 text-sm text-[#4A7C59] font-semibold"><Edit3 size={15} /> Изменить данные операции</button>}
                </section>
                <section className="bg-white dark:bg-[#252528] border border-stone-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm">Выберите категорию или подкатегорию</h3>
                    {chosenCategory(activeItem) && <span className="text-xs text-[#4A7C59] font-semibold">
                      {categoryName(chosenCategory(activeItem))}
                    </span>}
                  </div>
                  <CategoryPickerAccordion key={activeItem.id} categories={categories}
                    selectedCategoryId={chosenCategory(activeItem)}
                    onAddCategory={onAddCategory} maxHeightClass="max-h-[310px]"
                    onSelectCategory={id => setChosenCategories(prev => ({ ...prev, [activeItem.id]: id }))} />
                  <button type="button" disabled={!isUsableCategory(chosenCategory(activeItem), categories)}
                    onClick={() => {
                      const categoryId = chosenCategory(activeItem);
                      if (categoryId) assignCategory(activeItem, categoryId);
                    }}
                    className="w-full bg-[#4A7C59] text-white font-semibold rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2">
                    <Check size={18} /> Назначить категорию
                  </button>
                </section>
              </div>
            </div>
          ) : null}
        </main>

        <footer className="bg-white dark:bg-[#252528] border-t border-stone-200 dark:border-white/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
          <span>Правила сохраняются только при включённом «Запоминать правило». Импорт подтверждается отдельно.</span>
          <button type="button" onClick={onClose} className="rounded-xl bg-stone-100 dark:bg-white/10 px-4 py-2 text-stone-800 dark:text-white font-semibold">Закрыть</button>
        </footer>
      </div>
    </div>, document.body
  );
};
