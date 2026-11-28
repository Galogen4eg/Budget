import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useModalSurface } from '../hooks/useDialogFocus';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Check, X, FileText, ArrowDownRight, ArrowUpRight, 
  ChevronDown, Plus, Trash2, Search, 
  AlertCircle, Tag, CheckCheck, Lightbulb, AlertTriangle, Bus, ShoppingCart, HeartPulse,
  Calendar, User, Edit3, Sparkles
} from 'lucide-react';
import { Transaction, AppSettings, LearnedRule, Category, FamilyMember, SavingsGoal } from '../types';
import { getIconById } from '../constants';
import { useClickAway } from 'react-use';
import { FILTER_RAIL,FILTER_CHIP,FILTER_CHIP_ACTIVE,FILTER_CHIP_IDLE,TOOLBAR_ACTION,TOOLBAR_ACTION_IDLE,TOOLBAR_ACTION_PRIMARY } from './filterUiTokens';
import { formatBudgetMoney, monthlyMoneyTotals } from '../utils/budgetFinancialMath';
import AddTransactionModal from './AddTransactionModal';
import { UnrecognizedAnalyzerModal } from './UnrecognizedAnalyzerModal';
import { CategoryPickerAccordion } from './CategoryPickerAccordion';
import { extractCleanRuleKeyword, analyzeTransaction, matchMerchantBrand } from '../utils/analyzerHelper';
import { toast } from 'sonner';
import { countCategoryUsage } from '../utils/categoryPopularity';
import { isCategoryForType } from '../utils/categoryCatalog';
import { isEligibleForImport, assertImportSavingsReady } from '../utils/importSafety';
import { isSavingsTransfer } from '../utils/savingsSync';

interface ImportItem extends Omit<Transaction, 'id'> {
  tempId: string;
  isVerified?: boolean;
  rememberRule?: boolean;
  mcc?: string;
  accountMask?: string;
}

import type { AlfaParseReport } from '../utils/alfaRowValidation';

interface ImportModalProps {
  report?: AlfaParseReport|null;
  reviewMode?: boolean;
  preview: Omit<Transaction, 'id'>[];
  onConfirm: (items?: Omit<Transaction, 'id'>[]) => Promise<boolean>;
  onCancel: () => void;
  settings: AppSettings;
  onUpdateItem: (index: number, updates: Partial<Transaction>) => void;
  onUpdateAll: (items: Omit<Transaction, 'id'>[]) => void;
  onLearnRule: (rule: LearnedRule) => void;
  learnedRules?: LearnedRule[];
  categories: Category[];
  onAddCategory: (category: Category) => void | Promise<void>;
  transactions: Transaction[];
  members: FamilyMember[];
  goals: SavingsGoal[];
}

const PRESET_COLORS = [
  '#4A7C59', '#3D6B4C', '#D95C48', '#C4A66A', '#2D5540',
  '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#475569'
];

/**
 * Извлекает MCC-код из сырой строки выписки (например, "MCC 5411" или "MCC: 8999")
 */
function extractMcc(text?: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/MCC[\s:]*([0-9]{4})/i);
  return match ? match[1] : undefined;
}

/**
 * Извлекает маску счета/карты (например, "*3271" или "••3271")
 */
function extractAccountMask(text?: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/(\*{2,6}\d{4}|\d{4}\*{2,6}\d{4})/);
  if (match) {
    const raw = match[1];
    const last4 = raw.slice(-4);
    return `••${last4}`;
  }
  return undefined;
}

export const ImportModal: React.FC<ImportModalProps> = ({ 
  preview, report, reviewMode=false,
  onConfirm, 
  onCancel, 
  settings, 
  onUpdateAll, 
  onLearnRule, 
  learnedRules = [],
  categories, 
  onAddCategory, 
  transactions,
  members,
  goals
}) => {
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const importPending=useRef(false);
  const [importError,setImportError]=useState('');
  const requestClose=()=>{if(!importPending.current)onCancel();};
  useBodyScrollLock();
  const surface=useModalSurface(requestClose,{initialSelector:'[aria-label="Закрыть модальное окно"]'});
  const pendingRulesRef = useRef<LearnedRule[]>([]);
  // Snapshot of saved family history, not the changing preview, keeps ranking stable.
  const categoryUsage = useMemo(() => countCategoryUsage(transactions, categories), [transactions, categories]);
  // Локальный список операций с уникальными стабильными ключами
  const [items, setItems] = useState<ImportItem[]>(() => {
    return preview.map((p, idx) => ({
      ...p,
      tempId: `import-${idx}-${Date.now()}`,
      isVerified: false,
      rememberRule: false,
      mcc: (p as typeof p & { mcc?: string }).mcc || extractMcc(p.rawNote || p.note),
      accountMask: extractAccountMask(p.rawNote || p.note)
    }));
  });

  // Автор для всей выписки
  const [globalMemberId, setGlobalMemberId] = useState<string>(() => {
    return preview[0]?.memberId || '';
  });

  // Фильтры и поиск
  const [filterTab, setFilterTab] = useState<'all' | 'unrecognized' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryDropdownSearch, setCategoryDropdownSearch] = useState('');

  // Иерархическое дерево категорий с подкатегориями
  const parentCategoriesWithSubs = useMemo(() => {
    const parents = categories.filter(c => !c.parentId && c.id !== 'other');
    return parents.map(p => {
      const subs = categories.filter(c => c.parentId === p.id);
      return { parent: p, subcategories: subs };
    }).sort((a, b) => a.parent.label.localeCompare(b.parent.label, 'ru', { sensitivity: 'base' }));
  }, [categories]);

  const filteredCategoryTree = useMemo(() => {
    const q = categoryDropdownSearch.trim().toLowerCase();
    if (!q) return parentCategoriesWithSubs;

    return parentCategoriesWithSubs
      .map(({ parent, subcategories }) => {
        const parentMatches = parent.label.toLowerCase().includes(q);
        const matchedSubs = subcategories.filter(s => s.label.toLowerCase().includes(q));
        if (parentMatches || matchedSubs.length > 0) {
          return {
            parent,
            subcategories: parentMatches ? subcategories : matchedSubs,
            isMatch: true
          };
        }
        return null;
      })
      .filter(Boolean) as { parent: Category; subcategories: Category[]; isMatch: boolean }[];
  }, [parentCategoriesWithSubs, categoryDropdownSearch]);

  // Модальное окно редактирования отдельной операции
  const [editingItem, setEditingItem] = useState<ImportItem | null>(null);
  const [editForm, setEditForm] = useState<{
    amount: string;
    type: 'expense' | 'income';
    note: string;
    rawNote: string;
    category: string;
    memberId: string;
    date: string;
    rememberRule: boolean;
  }>({
    amount: '',
    type: 'expense',
    note: '',
    rawNote: '',
    category: 'other',
    memberId: '',
    date: '',
    rememberRule: false,
  });

  const handleOpenEditModal = (item: ImportItem) => {
    setEditingItem(item);
    const d = new Date(item.date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateFormatted = !isNaN(d.getTime()) ? `${year}-${month}-${day}` : new Date().toISOString().split('T')[0];

    setEditForm({
      amount: item.amount.toString(),
      type: item.type,
      note: item.note || '',
      rawNote: item.rawNote || '',
      category: item.category || 'other',
      memberId: item.memberId || '',
      date: dateFormatted,
      rememberRule: !!item.rememberRule,
    });
  };

  // Подсветка вспышкой для авто-распознанных карточек
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  const triggerHighlight = (tempIds: string[]) => {
    if (tempIds.length === 0) return;
    setHighlightedIds(prev => new Set([...prev, ...tempIds]));
    setTimeout(() => {
      setHighlightedIds(prev => {
        const next = new Set(prev);
        tempIds.forEach(id => next.delete(id));
        return next;
      });
    }, 3500);
  };

  /**
   * Автоматически применяет автоправило к остальным нераспознанным операциям выписки
   */
  const applyRuleToUnassigned = (
    itemList: ImportItem[],
    newRule?: LearnedRule,
    excludeTempId?: string
  ): { updatedList: ImportItem[]; matchedCount: number; matchedIds: string[] } => {
    const rulesToApply = newRule ? [newRule, ...learnedRules] : learnedRules;
    if (rulesToApply.length === 0) return { updatedList: itemList, matchedCount: 0, matchedIds: [] };

    let matchedCount = 0;
    const matchedIds: string[] = [];
    const updatedList = itemList.map(item => {
      // Сканируем только нераспознанные операции
      if (item.tempId !== excludeTempId && (item.category === 'other' || !item.category)) {
        const raw = (item.rawNote || item.note || '').toLowerCase();
        const cleanRaw = extractCleanRuleKeyword(item.rawNote, item.note).toLowerCase();

        for (const rule of rulesToApply) {
          if (!rule.keyword || rule.categoryId === 'other' || !isCategoryForType(rule.categoryId, categories, item.type)) continue;
          const kwLower = rule.keyword.toLowerCase().trim();
          if (!kwLower) continue;

          if (kwLower.length >= 3 && (raw.includes(kwLower) || cleanRaw.includes(kwLower))) {
            matchedCount++;
            matchedIds.push(item.tempId);
            return {
              ...item,
              category: rule.categoryId,
              note: rule.cleanName || item.note,
              isVerified: true
            };
          }
        }
      }
      return item;
    });

    if (matchedIds.length > 0) {
      triggerHighlight(matchedIds);
    }

    return { updatedList, matchedCount, matchedIds };
  };

  const handleSaveEditModal = () => {
    if (!editingItem) return;
    const numAmount = Math.abs(parseFloat(editForm.amount.replace(',', '.'))) || 0;
    const updated: ImportItem = {
      ...editingItem,
      amount: numAmount,
      type: editForm.type,
      note: editForm.note.trim() || 'Операция',
      rawNote: editForm.rawNote,
      category: editForm.category,
      memberId: editingItem.memberId,
      date: editForm.date,
      rememberRule: editForm.rememberRule,
      isVerified: true
    };

    let newItems = items.map(i => i.tempId === editingItem.tempId ? updated : i);

    if (editForm.rememberRule && editForm.category && editForm.category !== 'other' && editForm.rawNote) {
      const keyword = extractCleanRuleKeyword(editForm.rawNote, editForm.note);
      const newRule: LearnedRule = {
        id: Date.now().toString(),
        keyword,
        cleanName: editForm.note,
        categoryId: editForm.category
      };
      // Apply the rule to this preview only. Persist after a successful import.

      const { updatedList, matchedCount } = applyRuleToUnassigned(newItems, newRule, editingItem.tempId);
      newItems = updatedList;
      if (matchedCount > 0) {
        toast.success(`Автоправило «${keyword}» дополнительно распознало еще ${matchedCount} операций!`);
      }
    }

    syncToParent(newItems);
    setEditingItem(null);
  };

  const handleDeleteFromEditModal = () => {
    if (!editingItem) return;
    const newItems = items.filter(i => i.tempId !== editingItem.tempId);
    syncToParent(newItems);
    setEditingItem(null);
  };

  // Выпадающее меню категорий для конкретной карточки
  const [activeCategoryDropdown, setActiveCategoryDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useClickAway(dropdownRef, () => {
    setActiveCategoryDropdown(null);
    setCreatingCategoryFor(null);
  });

  // Создание новой категории
  const [creatingCategoryFor, setCreatingCategoryFor] = useState<string | null>(null);
  const [createCatType, setCreateCatType] = useState<'category' | 'subcategory'>('category');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [selectedParentIdForNewCat, setSelectedParentIdForNewCat] = useState<string>('');

  // Массовое назначение категории
  const [isBatchCategoryOpen, setIsBatchCategoryOpen] = useState(false);
  const batchDropdownRef = useRef<HTMLDivElement>(null);
  useClickAway(batchDropdownRef, () => setIsBatchCategoryOpen(false));

  // Синхронизация с родителем
  const syncToParent = (updatedItems: ImportItem[]) => {
    if(importPending.current)return;
    setItems(updatedItems);
    const cleanItems = updatedItems.map(({ tempId, isVerified, rememberRule, mcc, accountMask, ...rest }) => rest);
    onUpdateAll(cleanItems);
  };

  // When the Firestore catalog is restored after the XLSX was parsed, resolve
  // only previously unassigned, unverified rows. Never overwrite user choices.
  useEffect(() => {
    const updated = items.map(item => {
      if (item.isVerified) return item;
      const merchant = item.type === 'expense'
        ? matchMerchantBrand(item.rawNote || item.note, categories)
        : undefined;
      const hasValidCategory = Boolean(item.category && item.category !== 'other' &&
        categories.some(category => category.id === item.category));
      // A temporary parent category can be upgraded to the named store once
      // its subcategory arrives from Firestore. Never override a manual edit.
      if (hasValidCategory && !(merchant?.isSubcategory && merchant.categoryId !== item.category)) return item;
      const analysis = analyzeTransaction(item.rawNote || '', item.note, item.mcc, learnedRules, categories, item.type);
      if (analysis.source === 'fallback' || analysis.confidence < 92 ||
          analysis.suggestedCategoryId === 'other' ||
          !categories.some(category => category.id === analysis.suggestedCategoryId)) return item;
      return {
        ...item,
        category: analysis.suggestedCategoryId,
        note: analysis.source === 'brand' ? analysis.cleanName : item.note
      };
    });
    if (updated.some((item, index) => item !== items[index])) syncToParent(updated);
  // Reconcile only when the catalog changes; user edits must not be replayed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  // Выбор категории для карточки
  const handleSelectCategory = (tempId: string, catId: string) => {
    const item = items.find(i => i.tempId === tempId);
    if (item && !isCategoryForType(catId, categories, item.type)) return;
    let updated = items.map(i => i.tempId === tempId ? { ...i, category: catId, isVerified: true } : i);

    if (item?.rememberRule && item.rawNote) {
      const keyword = extractCleanRuleKeyword(item.rawNote, item.note);
      if (keyword.length > 2) {
        const newRule: LearnedRule = {
          id: Date.now().toString(),
          keyword,
          cleanName: item.note,
          categoryId: catId
        };
        // Apply the rule to this preview only. Persist after a successful import.

        // Применяем правило ко всем подходящим операциям текущей выписки
        const { updatedList, matchedCount } = applyRuleToUnassigned(updated, newRule, tempId);
        updated = updatedList;
        if (matchedCount > 0) {
          toast.success(`Автоправило «${keyword}» дополнительно распознало еще ${matchedCount} операций!`);
        }
      }
    }

    syncToParent(updated);
    setActiveCategoryDropdown(null);
    setCreatingCategoryFor(null);
  };

  // Создание новой категории
  const handleCreateCategory = (tempId: string) => {
    if (!newCatName.trim()) return;

    let newCategory: Category;
    if (createCatType === 'subcategory') {
      const parentCat = categories.find(c => c.id === selectedParentIdForNewCat) || categories.find(c => !c.parentId);
      newCategory = {
        id: `subcat_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        label: newCatName.trim(),
        parentId: parentCat ? parentCat.id : undefined,
        icon: parentCat ? parentCat.icon : 'Tag',
        color: parentCat ? parentCat.color : '#4A7C59',
        isCustom: true
      };
    } else {
      const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      newCategory = {
        id: newId,
        label: newCatName.trim(),
        color: newCatColor,
        icon: 'Folder',
        isCustom: true
      };
    }

    onAddCategory(newCategory);
    handleSelectCategory(tempId, newCategory.id);
    setNewCatName('');
    setCreatingCategoryFor(null);
  };

  // Удаление отдельной операции
  const handleDeleteItem = (tempId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = items.filter(i => i.tempId !== tempId);
    syncToParent(updated);
  };

  // Переключение статуса "Проверено"
  const handleToggleVerify = (tempId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = items.map(i => i.tempId === tempId ? { ...i, isVerified: !i.isVerified } : i);
    syncToParent(updated);
  };

  // Переключение запоминания правила
  const handleToggleRemember = (tempId: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    const item = items.find(i => i.tempId === tempId);
    if (!item) return;

    const newRemember = !item.rememberRule;
    let updated = items.map(i => i.tempId === tempId ? { ...i, rememberRule: newRemember } : i);
    
    if (newRemember && item.category && item.category !== 'other' && item.rawNote) {
      const keyword = extractCleanRuleKeyword(item.rawNote, item.note);
      const newRule: LearnedRule = {
        id: Date.now().toString(),
        keyword,
        cleanName: item.note,
        categoryId: item.category
      };
      // Apply the rule to this preview only. Persist after a successful import.

      const { updatedList, matchedCount } = applyRuleToUnassigned(updated, newRule, tempId);
      updated = updatedList;
      if (matchedCount > 0) {
        toast.success(`Автоправило «${keyword}» дополнительно распознало еще ${matchedCount} операций!`);
      }
    }

    syncToParent(updated);
  };

  // Массовое назначение категории нераспознанным
  const handleBatchAssignCategory = (catId: string) => {
    const updated = items.map(i => {
      if (isCategoryForType(catId, categories, i.type) && needsCategory(i)) {
        return { ...i, category: catId, isVerified: true };
      }
      return i;
    });
    const assigned = updated.filter((item, index) => item !== items[index]).length;
    syncToParent(updated);
    toast.info(`Назначено операций: ${assigned}. Операции другого типа не изменены.`);
    setIsBatchCategoryOpen(false);
  };

  // Explicit partial manual import. Unrecognized rows remain in the source
  // XLSX for later review; they are never silently categorized or discarded.
  // A row must pass both the existing persistence gate and the category picker's inherited type rules.
  const needsCategory=(item:ImportItem)=>!isEligibleForImport(item,categories)||!isCategoryForType(item.category,categories,item.type);
  const handleConfirm = async (onlyReady = false) => {
    if (importPending.current) return;
    setImportError('');
    const selected = onlyReady ? items.filter(item=>!needsCategory(item)) : items;
    if (!selected.length) {
      setImportError('Нет распознанных операций для импорта');
      return;
    }
    if (!onlyReady && selected.some(needsCategory)) {
      setImportError('Сначала назначьте категории всем операциям или импортируйте только распознанные.');
      setFilterTab('unrecognized');
      return;
    }
    if (!globalMemberId || selected.some(item => item.memberId !== globalMemberId)) {
      setImportError('Владелец выписки не совпадает с участником операции. Повторно загрузите файл.');
      return;
    }
    if (selected.some(item => !Number.isFinite(item.amount) || item.amount <= 0 ||
        !Number.isSafeInteger(Math.round(item.amount * 100)) ||
        Math.abs(item.amount * 100 - Math.round(item.amount * 100)) > 0.000001)) {
      setImportError('Проверьте суммы: они должны быть положительными и с точностью до копейки.');
      return;
    }
    if (selected.some(item => !item.date || Number.isNaN(new Date(item.date).getTime()))) {
      setImportError('В выписке есть операции с неверной датой. Исправьте их перед импортом.');
      return;
    }
    const cleanItems = selected.map(({ tempId, isVerified, rememberRule, mcc, accountMask, ...rest }) =>
      isSavingsTransfer(rest)?rest:{...rest,externalSavingsConfirmed:undefined});
    importPending.current=true;
    setIsConfirmingImport(true);
    try {
      assertImportSavingsReady(cleanItems,goals,globalMemberId);
      const committed = await onConfirm(cleanItems);
      if (!committed) {setImportError('Сохранение не подтверждено. Часть операций могла быть записана. Проверьте историю перед повтором.');return;}
      // A partial import must not persist rules belonging to excluded rows.
      const rules = onlyReady ? [] : [...pendingRulesRef.current];
      selected.forEach(item => {
        if (item.rememberRule && item.category && item.category !== 'other' &&
            categories.some(c => c.id === item.category) && item.rawNote) {
          const keyword = extractCleanRuleKeyword(item.rawNote, item.note);
          if (keyword.length >= 3) rules.push({
            id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
            keyword, cleanName: item.note, categoryId: item.category
          });
        }
      });
      const unique = new Set<string>();
      rules.forEach(rule => {
        const key = `${rule.keyword.trim().toLowerCase()}|${rule.categoryId}`;
        if (!unique.has(key)) { unique.add(key); onLearnRule(rule); }
      });
      pendingRulesRef.current = [];
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Не удалось выполнить импорт');
    } finally {
      importPending.current=false;
      setIsConfirmingImport(false);
    }
  };

  // Подсчет сумм
  const {income:totalIncome,expense:totalExpense}=useMemo(()=>monthlyMoneyTotals(items),[items]);
  const unassignedCount=items.filter(needsCategory).length;
  const needsSavingsChoice=(item:ImportItem)=>{
    if(!isSavingsTransfer(item))return false;
    try{assertImportSavingsReady([item],goals,globalMemberId);return false;}catch{return true;}
  };
  const savingsChoiceCount=items.filter(needsSavingsChoice).length;
  const readyCategorySavingsCount=items.filter(item=>!needsCategory(item)&&needsSavingsChoice(item)).length;

  // Диапазон дат выписки
  const dateRangeString = useMemo(() => {
    if (items.length === 0) return 'нет операций';
    const timestamps = items.map(t => new Date(t.date).getTime()).filter(n => !isNaN(n));
    if (timestamps.length === 0) return 'даты не указаны';
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));
    const format = (d: Date) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `за период ${format(minDate)} – ${format(maxDate)}`;
  }, [items]);

  // Фильтрация элементов
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterTab === 'unrecognized' && !needsCategory(item)) return false;
      if (filterTab === 'income' && item.type !== 'income') return false;
      if (filterTab === 'expense' && item.type !== 'expense') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const noteMatch = (item.note || '').toLowerCase().includes(q);
        const rawMatch = (item.rawNote || '').toLowerCase().includes(q);
        const amountMatch = !settings.privacyMode&&item.amount.toString().includes(q);
        const mccMatch = (item.mcc || '').includes(q);
        return noteMatch || rawMatch || amountMatch || mccMatch;
      }

      return true;
    });
  }, [items, filterTab, searchQuery, categories,settings.privacyMode]);

  return createPortal(
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          requestClose();
        }
      }}
      className="fixed inset-0 bg-black/45 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 md:p-6 transition-opacity duration-150 cursor-pointer"
    >
      
      {/* Модальное диалоговое окно */}
      <div {...surface}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true" aria-busy={isConfirmingImport}
        onClickCapture={e=>{if(importPending.current){e.preventDefault();e.stopPropagation();}}}
        aria-labelledby="modal-headline"
        className="relative w-full max-w-[96vw] lg:max-w-[94vw] xl:max-w-[1440px] 2xl:max-w-[1560px] bg-[var(--terra-canvas)] rounded-none sm:rounded-2xl shadow-xl border-0 sm:border border-[var(--terra-border)] flex flex-col h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[92dvh] overflow-hidden text-stone-900 dark:text-white cursor-default pb-[env(safe-area-inset-bottom,0px)]"
      >
        
        <div data-testid="import-header" className="shrink-0 min-w-0 px-3 sm:px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] sm:pt-4 pb-2 border-b border-[var(--terra-border)] bg-[var(--terra-surface)] space-y-2">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <h2 id="modal-headline" className="text-lg font-semibold font-headline text-[var(--terra-ink)]">{reviewMode?'Операции на разбор':'Проверка выписки'}</h2>
              <p className="text-xs text-[var(--terra-muted)] [overflow-wrap:anywhere]">{items.length} {items.length===1?'операция':'операций'} · {dateRangeString}</p>
            </div>
            <button type="button" onClick={requestClose} disabled={isConfirmingImport} aria-label="Закрыть модальное окно"
              className="w-11 h-11 shrink-0 rounded-xl bg-[var(--terra-soft)] text-[var(--terra-ink)] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"><X size={20}/></button>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs min-w-0 text-[var(--terra-muted)]">
            <span className="min-w-0 [overflow-wrap:anywhere]">Владелец выписки: <strong className="text-[var(--terra-ink)]">{members.find(m=>m.id===globalMemberId)?.name||'Не указан'}</strong></span>
            <span className="min-w-0 tabular-nums [overflow-wrap:anywhere]">Доходы: <strong className="text-[var(--terra-primary-text)]">{settings.privacyMode?'•••':'+'+formatBudgetMoney(totalIncome)+' ₽'}</strong></span>
            <span className="min-w-0 tabular-nums [overflow-wrap:anywhere]">Расходы: <strong className="text-[var(--terra-ink)]">{settings.privacyMode?'•••':'−'+formatBudgetMoney(totalExpense)+' ₽'}</strong></span>
          </div>
          {report&&<p role="status" className="text-xs text-[var(--terra-muted)]">Строк операций: {report.operationRows} · Категория назначена: {items.length-unassignedCount} · Нужна категория: {unassignedCount} · Дубликаты: {report.duplicates} · Ошибки: {report.errors.length}</p>}
          {/* Тулбар фильтрации и поиска */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 min-w-0">
            
            <div role="group" aria-label="Фильтр операций выписки" className={FILTER_RAIL}>
              {(['all','unrecognized','income','expense'] as const).map(tab=>{
                const label=tab==='all'?'Все':tab==='unrecognized'?'Без категории':tab==='income'?'Доходы':'Расходы';
                const count=tab==='all'?items.length:tab==='unrecognized'?unassignedCount:items.filter(item=>item.type===tab).length;
                return <button key={tab} type="button" disabled={isConfirmingImport} aria-pressed={filterTab===tab}
                  onClick={()=>setFilterTab(tab)} className={FILTER_CHIP+' terra-press '+(filterTab===tab?FILTER_CHIP_ACTIVE:FILTER_CHIP_IDLE)}>
                  {label} <span className="tabular-nums">{count}</span>
                </button>;
              })}
            </div>

            {/* Поиск */}
            <div className="flex items-center gap-2 flex-1 min-w-0 md:w-64">
              <div className="relative w-full">
                <Search size={14} className="text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="search" aria-label="Поиск по выписке" disabled={isConfirmingImport}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={settings.privacyMode?"Название или MCC":"Название, MCC, сумма"} 
                  className="min-h-[44px] w-full pl-8 pr-3 py-2 bg-[var(--terra-soft)] border border-[#EBE4DC] dark:border-white/10 rounded-xl text-xs text-stone-800 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59] transition-all"
                />
              </div>
            </div>

          </div>

        </div>

        {/* СПИСОК ОПЕРАЦИЙ */}
        <div data-testid="import-scroll" className="overflow-y-auto overscroll-y-contain min-h-0 px-3 sm:px-4 py-3 space-y-2 flex-1 bg-[var(--terra-canvas)]">
          {unassignedCount > 0 && (
            <div className="bg-[var(--terra-surface)] border border-[var(--terra-border)] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E09F3E] text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900 dark:text-white flex flex-wrap items-center gap-2">
                    <span>Найдено {unassignedCount} нераспознанных операций</span>
                    <span className="text-[10px] bg-[#E09F3E]/20 text-[#B87008] dark:text-amber-300 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Требует разбора
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                    Проверьте предложенные категории перед сохранением.
                  </div>
                </div>
              </div>
              <button type="button" disabled={isConfirmingImport}
                onClick={() => setIsAnalyzerOpen(true)}
                className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_IDLE}
              >
                <Sparkles size={16} />
                <span>Предложить категории ({unassignedCount})</span>
              </button>
            </div>
          )}

            {/* Кнопка "Назначить выбранным" */}
            {unassignedCount > 0 && (
              <div className="min-w-0">
                <button 
                  type="button"
                  disabled={isConfirmingImport} aria-expanded={isBatchCategoryOpen} onClick={() => setIsBatchCategoryOpen(!isBatchCategoryOpen)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 hover:border-stone-300 bg-[var(--terra-soft)] hover:bg-stone-50 dark:hover:bg-white/5 text-stone-700 dark:text-gray-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Tag size={14} className="text-[#4A7C59]" />
                  <span>Назначить всем без категории</span>
                </button>

                {isBatchCategoryOpen && (
                  <div ref={batchDropdownRef} className="mt-2 w-full max-w-[390px] rounded-xl border border-[var(--terra-border)]">
                    <p className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs rounded-t-xl">
                      Категория будет назначена только подходящим операциям из {unassignedCount} требующих разбора.
                    </p>
                    <CategoryPickerAccordion
                      categories={categories}
                      onAddCategory={onAddCategory}
                      maxHeightClass="max-h-[240px]"
                      onSelectCategory={handleBatchAssignCategory}
                    />
                  </div>
                )}
              </div>
            )}

          {items.some(isSavingsTransfer)&&(
            <fieldset className="min-w-0 rounded-2xl border border-[#EBE4DC] dark:border-white/10 bg-[var(--terra-surface)] p-3 sm:p-4 space-y-3">
              <legend className="px-1 text-sm font-bold text-stone-900 dark:text-white">Переводы в накопления</legend>
              <p className="text-xs leading-relaxed text-stone-600 dark:text-gray-300">Укажите для каждого перевода его цель. Если деньги переводились между банковскими счетами и не относятся к целям Terra, выберите «Без цели». Новые цели автоматически не создаются.</p>
              {items.filter(isSavingsTransfer).map(item=>(
                <label key={item.tempId} className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                  <span className="flex-1 min-w-0 text-sm break-words text-stone-800 dark:text-white">{item.note||'Перевод'} · {settings.privacyMode?'•••':formatBudgetMoney(item.amount)} ₽</span>
                  <select aria-label={'Цель перевода: '+(item.note||'Перевод')+' '+item.date} disabled={isConfirmingImport} value={item.externalSavingsConfirmed===true&&!item.linkedGoalId?'external':goals.some(g=>g.id===item.linkedGoalId&&g.memberId===globalMemberId)?'goal:'+item.linkedGoalId:''} onChange={event=>{
                    const choice=event.target.value;
                    syncToParent(items.map(row=>row.tempId===item.tempId?{...row,linkedGoalId:choice.startsWith('goal:')?choice.slice(5):undefined,externalSavingsConfirmed:choice==='external'?true:undefined}:row));
                  }} className="w-full sm:w-64 min-w-0 min-h-[44px] rounded-xl border border-[#EBE4DC] dark:border-white/10 bg-[var(--terra-soft)] px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
                    <option value="">Выберите вариант</option>
                    <option value="external">Банковский перевод без цели</option>
                    {goals.filter(g=>g.memberId===globalMemberId).map(g=><option key={g.id} value={'goal:'+g.id}>{g.title}</option>)}
                  </select>
                </label>
              ))}
            </fieldset>
          )}

          {filteredItems.length === 0 ? (
            <div className="bg-[var(--terra-surface)] rounded-2xl p-10 text-center border border-[#EBE4DC] dark:border-white/10 space-y-2">
              <p className="text-sm font-bold text-stone-700 dark:text-gray-300">Операций по выбранным фильтрам не найдено</p>
              <p className="text-xs text-stone-400">Сбросьте поиск или переключите вкладку</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const category = categories.find(c => c.id === item.category);
              const isUnrecognized = needsCategory(item);
              const isExpense = item.type === 'expense';
              const isDropdownOpen = activeCategoryDropdown === item.tempId;

              // Форматирование даты
              const itemDate = new Date(item.date);
              const dateFormatted = !isNaN(itemDate.getTime())
                ? itemDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
                : item.date;

              const isHighlighted = highlightedIds.has(item.tempId);

              return (
                <div 
                  key={item.tempId} data-import-row={item.tempId} data-needs-category={isUnrecognized}
                  className={`rounded-xl p-3 flex flex-col lg:flex-row focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] lg:items-center justify-between gap-3 transition-colors duration-150 ${
                    isHighlighted
                      ? 'bg-[var(--terra-primary-soft)] border border-[var(--terra-primary-solid)]'
                      : isUnrecognized 
                        ? 'bg-[var(--terra-surface)] border border-[var(--terra-offline-text)]' 
                        : 'bg-[var(--terra-surface)] border border-[var(--terra-border)]'
                  }`}
                >
                  {/* Левая часть: Иконка, Заголовок, МСС, Описание, Дата и Правило */}
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isExpense ? 'bg-[var(--terra-soft)] text-[var(--terra-muted)]' : 'bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)]'
                    }`}>
                      {isExpense ? <ArrowDownRight size={20} strokeWidth={2.4} /> : <ArrowUpRight size={20} strokeWidth={2.4} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {/* Инлайн-редактирование чистого названия операции для истории */}
                        <div 
                          className="flex items-center gap-1.5 max-w-md w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input 
                            type="text" disabled={isConfirmingImport}
                            value={item.note || ''}
                            onChange={(e) => {
                              const newNote = e.target.value;
                              const updated = items.map(i => i.tempId === item.tempId ? { ...i, note: newNote } : i);
                              syncToParent(updated);
                            }}
                            placeholder={item.rawNote || category?.label || 'Название в истории...'}
                            className="min-h-[44px] font-semibold text-stone-900 dark:text-white text-sm bg-stone-100/60 dark:bg-white/5 hover:bg-white dark:hover:bg-[#252528] focus:bg-white dark:focus:bg-[#252528] px-2.5 py-1 rounded-lg border border-transparent hover:border-stone-300 dark:hover:border-white/20 focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59] outline-none transition w-full"
                            aria-label="Название операции в истории"
                            title="Название операции в истории"
                          />
                          <Edit3 size={13} className="text-stone-400 shrink-0 pointer-events-none -ml-6 z-10 opacity-70" />
                        </div>

                        {isHighlighted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-semibold">
                            <Sparkles size={13} className="text-emerald-200" />
                            Категория определена
                          </span>
                        ) : isUnrecognized ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEF7EC] dark:bg-amber-950/60 text-[#B87008] dark:text-amber-300 text-[11px] font-bold border border-[#F3D5A5]/60">
                            <Lightbulb size={12} className="text-[#E09F3E]" />
                            Не определено
                          </span>
                        ) : item.mcc ? (
                          <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-gray-400 text-[10px] font-semibold uppercase">
                            MCC {item.mcc}
                          </span>
                        ) : null}
                      </div>

                      {item.rawNote && (
                        <p className="text-xs text-stone-500 dark:text-gray-400 leading-relaxed font-normal break-words">
                          {item.rawNote}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-stone-500 dark:text-gray-400 font-medium">
                        <span>{dateFormatted}</span>
                        {item.accountMask && <><span>•</span><span>Счёт: {item.accountMask}</span></>}
                        <span>•</span>
                        <label 
                          
                          className="min-h-[44px] inline-flex items-center gap-1.5 text-stone-500 dark:text-gray-300 cursor-pointer hover:text-stone-800 dark:hover:text-white text-[11px]"
                        >
                          <input 
                            type="checkbox" disabled={isConfirmingImport}
                            checked={!!item.rememberRule}
                            onChange={(e) => handleToggleRemember(item.tempId, e)}
                            className="rounded border-stone-300 text-[#4A7C59] focus:ring-[#4A7C59] h-3.5 w-3.5 cursor-pointer"
                          />
                          <span>Запомнить правило для будущих выписок</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Правая часть: Категория, Выбор автора, Сумма, Кнопки подтверждения/удаления */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 min-w-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[var(--terra-border)]">
                    
                    {/* Выпадающее меню категорий */}
                    <div className={isDropdownOpen?'relative w-full min-w-0 max-w-full lg:w-auto':'relative min-w-0 max-w-full'}>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCategoryDropdown(isDropdownOpen ? null : item.tempId);
                          setCategoryDropdownSearch('');
                        }}
                        disabled={isConfirmingImport} aria-expanded={isDropdownOpen}
                        className={`inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] ${
                          isUnrecognized 
                            ? 'bg-[var(--terra-offline-soft)] text-[var(--terra-offline-text)]' 
                            : 'bg-[var(--terra-soft)] text-[var(--terra-ink)] hover:bg-[var(--terra-primary-soft)]'
                        }`}
                      >
                        <Tag size={14} />
                        <span>{isUnrecognized ? 'Выбрать категорию' : category!.label}</span>
                        <ChevronDown size={14} strokeWidth={2.5} />
                      </button>

                      {isDropdownOpen && (
                        <div ref={dropdownRef} onClick={event => event.stopPropagation()}
                          className="mt-2 w-full min-w-0 max-w-[390px] lg:absolute lg:right-0 lg:top-full lg:w-[390px] z-50 rounded-2xl border border-[var(--terra-border)] bg-[var(--terra-surface)]">
                          <CategoryPickerAccordion
                            key={item.tempId}
                            categories={categories}
                            transactionType={item.type}
                            selectedCategoryId={item.category}
                            onAddCategory={onAddCategory}
                            maxHeightClass="max-h-[320px]"
                            onSelectCategory={categoryId => handleSelectCategory(item.tempId, categoryId)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Сумма операции */}
                    <div className="text-right min-w-0 max-w-full [overflow-wrap:anywhere] ml-auto">
                      <span className={`text-base font-semibold tabular-nums ${
                        isExpense ? 'text-stone-900 dark:text-white' : 'text-[var(--terra-primary-text)]'
                      }`}>
                        {settings.privacyMode?'•••':(isExpense?'−':'+')+formatBudgetMoney(item.amount)+' ₽'}
                      </span>
                    </div>

                    {/* Доступные действия для клавиатуры и смартфона */}
                    <div className="flex items-center gap-1 ml-auto">
                      <button type="button"
                        disabled={isConfirmingImport} aria-label={`Редактировать операцию ${item.note || item.rawNote || 'без названия'}`}
                        onClick={e => { e.stopPropagation(); handleOpenEditModal(item); }}
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
                        <Edit3 size={17} />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleToggleVerify(item.tempId, e)}
                        disabled={isConfirmingImport} aria-label={item.isVerified ? 'Снять подтверждение операции' : 'Подтвердить операцию'}
                        aria-pressed={!!item.isVerified}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] transition-colors cursor-pointer ${
                          item.isVerified 
                            ? 'bg-[#4A7C59] text-white' 
                            : 'bg-[#EAF2EC] dark:bg-primary/20 text-[#2E7D32] dark:text-green-300 hover:bg-[#4A7C59] hover:text-white'
                        }`}
                        title={item.isVerified ? "Подтверждено" : "Подтвердить операцию"}
                      >
                        <Check size={16} strokeWidth={item.isVerified ? 3 : 2.5} />
                      </button>

                      <button 
                        type="button"
                        onClick={(e) => handleDeleteItem(item.tempId, e)}
                        disabled={isConfirmingImport} aria-label="Исключить операцию из предпросмотра"
                        className="w-11 h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] hover:bg-stone-200/70 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                        title="Исключить из выписки"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ФУТЕР С ДЕЙСТВИЯМИ */}
        <footer data-testid="import-footer" className="px-3 sm:px-4 py-2 bg-[var(--terra-surface)] border-t border-[var(--terra-border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
          {importError&&<p role="alert" className="w-full text-sm text-[var(--terra-danger-text)]">{importError}</p>}
          
          {/* Индикатор статуса */}
          <div className="flex items-center text-xs text-stone-600 dark:text-gray-300">
            <div>
              Категория назначена: <span className="font-semibold tabular-nums text-[var(--terra-ink)]">{items.length - unassignedCount} из {items.length}</span> операций
              {savingsChoiceCount>0&&<p role="status" className="text-[var(--terra-offline-text)]">Выберите назначение для переводов: {savingsChoiceCount}.</p>}
              {unassignedCount > 0 && (
                <span className="text-[var(--terra-offline-text)] font-semibold ml-1">
                  ({unassignedCount} требуют назначения категории)
                </span>
              )}
            </div>
          </div>

          {/* Кнопки футера */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            
            {/* Кнопка "Отмена" */}
            <button 
              type="button"
              onClick={requestClose}
              disabled={isConfirmingImport}
              className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_IDLE}
            >
              Отмена
            </button>

            {unassignedCount > 0 && items.length > unassignedCount && (
              <button
                type="button"
                onClick={() => void handleConfirm(true)}
                disabled={isConfirmingImport||readyCategorySavingsCount>0}
                className="py-2.5 px-4 rounded-xl border border-amber-600/40 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-bold text-xs min-h-[44px]"
                title="Нераспознанные операции не импортируются. Их можно разобрать при повторной загрузке той же выписки."
              >
                {isConfirmingImport ? 'Сохранение…' : `Импортировать распознанные (${items.length - unassignedCount})`}
              </button>
            )}
            {unassignedCount > 0 && (
              <p className="text-xs text-amber-800 dark:text-amber-300 w-full sm:basis-full" role="status">
                Полный импорт недоступен, пока есть операции без подходящей категории.
                {reviewMode?'Остальные операции останутся в очереди разбора.':'Остальные можно разобрать после повторной загрузки XLSX.'}
              </p>
            )}

            {/* Кнопка "Подтвердить импорт" */}
            <button 
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isConfirmingImport || items.length === 0 || unassignedCount > 0 || savingsChoiceCount>0}
              className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_PRIMARY+" terra-press"}
            >
              <Check size={16} strokeWidth={3} />
              <span>{isConfirmingImport ? 'Сохранение…' : `Импортировать все (${items.length})`}</span>
            </button>
          </div>

        </footer>

      </div>

      {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ОПЕРАЦИИ ИМПОРТА */}
      {editingItem && (
        <AddTransactionModal previewMode
          initialTransaction={{
            id: editingItem.tempId,
            amount: editingItem.amount,
            type: editingItem.type,
            category: editingItem.category || 'other',
            memberId: editingItem.memberId || '',
            note: editingItem.note || '',
            rawNote: editingItem.rawNote || '',
            date: editingItem.date,
            userId: editingItem.userId,
            linkedExpenseId: editingItem.linkedExpenseId
          }}
          onClose={() => setEditingItem(null)}
          onSubmit={async (updatedTx) => {
            const updated: ImportItem = {
              ...editingItem,
              amount: updatedTx.amount,
              type: updatedTx.type,
              note: updatedTx.note || 'Операция',
              rawNote: updatedTx.rawNote || editingItem.rawNote,
              category: updatedTx.category,
              memberId: editingItem.memberId,
              date: updatedTx.date,
              linkedExpenseId: updatedTx.linkedExpenseId,
              isVerified: true
            };
            const newItems = items.map(i => i.tempId === editingItem.tempId ? updated : i);
            syncToParent(newItems);
            setEditingItem(null);
          }}
          onDelete={async () => {
            handleDeleteFromEditModal();
          }}
          onLearnRule={rule => { pendingRulesRef.current.push(rule); }}
          settings={settings}
          members={members}
          categories={categories}
          transactions={[]}
        />
      )}

      {/* АНАЛИЗАТОР НЕРАСПОЗНАННЫХ ОПЕРАЦИЙ */}
      <UnrecognizedAnalyzerModal
        isOpen={isAnalyzerOpen}
        onClose={() => setIsAnalyzerOpen(false)}
        items={items.map(i => ({
          id: i.tempId,
          note: i.note,
          rawNote: i.rawNote,
          amount: i.amount,
          type: i.type,
          date: i.date,
          mcc: i.mcc,
          category: i.category,
          accountMask: i.accountMask
        }))}
        categories={categories}
        categoryUsage={categoryUsage}
        learnedRules={learnedRules}
        onAddCategory={onAddCategory}
        onEditItem={(analyzerItem) => {
          const matched = items.find(i => i.tempId === analyzerItem.id);
          if (matched) {
            setIsAnalyzerOpen(false);
            handleOpenEditModal(matched);
          }
        }}
        onApplyCategoryWithRule={(itemId, catId, ruleToLearn) => {
          try {
            if (ruleToLearn) {
              pendingRulesRef.current.push(ruleToLearn);
            }
          } catch (e) {
            console.warn("Failed to learn rule:", e);
          }
          let updated = items.map(i => {
            if (i.tempId === itemId) {
              return { 
                ...i, 
                category: catId, 
                note: ruleToLearn?.cleanName || i.note,
                isVerified: true 
              };
            }
            return i;
          });
          
          if (ruleToLearn && ruleToLearn.keyword) {
            const { updatedList, matchedCount } = applyRuleToUnassigned(updated, ruleToLearn, itemId);
            updated = updatedList;
            if (matchedCount > 0) {
              toast.success(`Автоправило «${ruleToLearn.keyword}» дополнительно распознало еще ${matchedCount} операций!`);
            }
          }
          syncToParent(updated);
        }}
        onApplyAllSuggestions={(results) => {
          let updated = [...items];
          let totalAutoMatched = 0;
          const learnedBatchRules: LearnedRule[] = [];

          results.forEach(({ itemId, categoryId, ruleToLearn }) => {
            if (ruleToLearn && ruleToLearn.keyword) {
              try {
                pendingRulesRef.current.push(ruleToLearn);
                learnedBatchRules.push(ruleToLearn);
              } catch (e) {
                console.warn("Failed to learn batch rule:", e);
              }
            }
            updated = updated.map(i => {
              if (i.tempId === itemId) {
                return { 
                  ...i, 
                  category: categoryId, 
                  note: ruleToLearn?.cleanName || i.note,
                  isVerified: true 
                };
              }
              return i;
            });
          });

          // Apply learned batch rules to remaining unassigned items
          learnedBatchRules.forEach(rule => {
            const { updatedList, matchedCount } = applyRuleToUnassigned(updated, rule);
            updated = updatedList;
            totalAutoMatched += matchedCount;
          });

          if (totalAutoMatched > 0) {
            toast.success(`Автоправила дополнительно распознали еще ${totalAutoMatched} неразобранных операций!`);
          }
          syncToParent(updated);
          // Stay in the analyzer; only its explicit Close button returns to the preview.
        }}
      />
    </div>,document.body
  );
};

export default ImportModal;
