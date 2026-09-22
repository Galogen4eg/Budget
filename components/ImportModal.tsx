import React, { useState, useMemo, useRef } from 'react';
import { 
  Check, X, FileText, ArrowDownRight, ArrowUpRight, 
  ChevronDown, Plus, Trash2, Search, 
  AlertCircle, Tag, CheckCheck, Filter, Lightbulb, AlertTriangle, Bus, ShoppingCart, HeartPulse
} from 'lucide-react';
import { Transaction, AppSettings, LearnedRule, Category, FamilyMember } from '../types';
import { getIconById } from '../constants';
import { useClickAway } from 'react-use';

interface ImportItem extends Omit<Transaction, 'id'> {
  tempId: string;
  isVerified?: boolean;
  rememberRule?: boolean;
  mcc?: string;
  accountMask?: string;
}

interface ImportModalProps {
  preview: Omit<Transaction, 'id'>[];
  onConfirm: (items?: Omit<Transaction, 'id'>[]) => void;
  onCancel: () => void;
  settings: AppSettings;
  onUpdateItem: (index: number, updates: Partial<Transaction>) => void;
  onUpdateAll: (items: Omit<Transaction, 'id'>[]) => void;
  onLearnRule: (rule: LearnedRule) => void;
  categories: Category[];
  onAddCategory: (category: Category) => void;
  members: FamilyMember[];
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
  preview, 
  onConfirm, 
  onCancel, 
  settings, 
  onUpdateAll, 
  onLearnRule, 
  categories, 
  onAddCategory, 
  members 
}) => {
  // Локальный список операций с уникальными стабильными ключами
  const [items, setItems] = useState<ImportItem[]>(() => {
    return preview.map((p, idx) => ({
      ...p,
      tempId: `import-${idx}-${Date.now()}`,
      isVerified: false,
      rememberRule: false,
      mcc: extractMcc(p.rawNote || p.note),
      accountMask: extractAccountMask(p.rawNote || p.note) || '••3271'
    }));
  });

  // Автор для всей выписки
  const [globalMemberId, setGlobalMemberId] = useState<string>(() => {
    return preview[0]?.memberId || members[0]?.id || '';
  });

  // Фильтры и поиск
  const [filterTab, setFilterTab] = useState<'all' | 'unrecognized' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAttention, setOnlyAttention] = useState(false);

  // Выпадающее меню категорий для конкретной карточки
  const [activeCategoryDropdown, setActiveCategoryDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useClickAway(dropdownRef, () => {
    setActiveCategoryDropdown(null);
    setCreatingCategoryFor(null);
  });

  // Создание новой категории
  const [creatingCategoryFor, setCreatingCategoryFor] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  // Массовое назначение категории
  const [isBatchCategoryOpen, setIsBatchCategoryOpen] = useState(false);
  const batchDropdownRef = useRef<HTMLDivElement>(null);
  useClickAway(batchDropdownRef, () => setIsBatchCategoryOpen(false));

  // Синхронизация с родителем
  const syncToParent = (updatedItems: ImportItem[]) => {
    setItems(updatedItems);
    const cleanItems = updatedItems.map(({ tempId, isVerified, rememberRule, mcc, accountMask, ...rest }) => rest);
    onUpdateAll(cleanItems);
  };

  // Назначение автора для всех операций
  const handleSetGlobalMember = (memberId: string) => {
    setGlobalMemberId(memberId);
    const updated = items.map(item => ({ ...item, memberId }));
    syncToParent(updated);
  };

  // Назначение автора для конкретной карточки
  const handleItemMemberChange = (tempId: string, memberId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = items.map(item => item.tempId === tempId ? { ...item, memberId } : item);
    syncToParent(updated);
  };

  // Выбор категории для карточки
  const handleSelectCategory = (tempId: string, catId: string) => {
    const item = items.find(i => i.tempId === tempId);
    let updated = items.map(i => i.tempId === tempId ? { ...i, category: catId, isVerified: true } : i);

    if (item && item.rawNote) {
      let keyword = item.rawNote.trim();
      if (/\s\d{4,}$/.test(keyword)) {
        keyword = keyword.replace(/\s\d+$/, '').trim();
      }
      if (keyword.length > 2) {
        onLearnRule({
          id: Date.now().toString(),
          keyword,
          cleanName: item.note,
          categoryId: catId
        });

        // Применяем правило ко всем подходящим операциям текущей выписки
        const kwLower = keyword.toLowerCase();
        updated = updated.map(other => {
          const raw = (other.rawNote || other.note || '').toLowerCase();
          if (raw.includes(kwLower) && (other.category === 'other' || !other.category)) {
            return { ...other, category: catId };
          }
          return other;
        });
      }
    }

    syncToParent(updated);
    setActiveCategoryDropdown(null);
    setCreatingCategoryFor(null);
  };

  // Создание новой категории
  const handleCreateCategory = (tempId: string) => {
    if (!newCatName.trim()) return;
    const newId = newCatName.trim().toLowerCase().replace(/[\s\W]+/g, '_');
    const newCategory: Category = {
      id: newId,
      label: newCatName.trim(),
      color: newCatColor,
      icon: 'ShoppingBag',
      isCustom: true
    };

    onAddCategory(newCategory);
    handleSelectCategory(tempId, newId);
    setNewCatName('');
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
  const handleToggleRemember = (tempId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = items.find(i => i.tempId === tempId);
    if (!item) return;

    const newRemember = !item.rememberRule;
    const updated = items.map(i => i.tempId === tempId ? { ...i, rememberRule: newRemember } : i);
    
    if (newRemember && item.category && item.category !== 'other' && item.rawNote) {
      onLearnRule({
        id: Date.now().toString(),
        keyword: item.rawNote.trim(),
        cleanName: item.note,
        categoryId: item.category
      });
    }

    syncToParent(updated);
  };

  // Массовое назначение категории нераспознанным
  const handleBatchAssignCategory = (catId: string) => {
    const updated = items.map(i => {
      if (i.category === 'other' || !i.category) {
        return { ...i, category: catId, isVerified: true };
      }
      return i;
    });
    syncToParent(updated);
    setIsBatchCategoryOpen(false);
  };

  // Подсчет сумм
  const totalIncome = useMemo(() => {
    return items.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  }, [items]);

  const totalExpense = useMemo(() => {
    return items.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  }, [items]);

  const unassignedCount = useMemo(() => {
    return items.filter(t => t.category === 'other' || !t.category).length;
  }, [items]);

  // Диапазон дат выписки
  const dateRangeString = useMemo(() => {
    if (items.length === 0) return 'за период 01.08.2026 – 21.08.2026';
    const timestamps = items.map(t => new Date(t.date).getTime()).filter(n => !isNaN(n));
    if (timestamps.length === 0) return 'за период текущего месяца';
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));
    const format = (d: Date) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `за период ${format(minDate)} – ${format(maxDate)}`;
  }, [items]);

  // Фильтрация элементов
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterTab === 'unrecognized' && item.category !== 'other' && item.category) return false;
      if (filterTab === 'income' && item.type !== 'income') return false;
      if (filterTab === 'expense' && item.type !== 'expense') return false;
      if (onlyAttention && item.category !== 'other' && item.isVerified) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const noteMatch = (item.note || '').toLowerCase().includes(q);
        const rawMatch = (item.rawNote || '').toLowerCase().includes(q);
        const amountMatch = item.amount.toString().includes(q);
        const mccMatch = (item.mcc || '').includes(q);
        return noteMatch || rawMatch || amountMatch || mccMatch;
      }

      return true;
    });
  }, [items, filterTab, onlyAttention, searchQuery]);

  return (
    <div className="fixed inset-0 bg-stone-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 transition-all duration-300 select-none">
      
      {/* Модальное диалоговое окно */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
        className="relative w-full max-w-5xl bg-[#FAF8F5] dark:bg-[#18181A] rounded-3xl shadow-[0_25px_60px_-15px_rgba(41,37,36,0.28)] border border-[#ECE6DE] dark:border-white/10 flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-stone-900 dark:text-white"
      >
        
        {/* Кнопка закрытия в верхнем правом углу */}
        <button 
          type="button"
          onClick={onCancel}
          aria-label="Закрыть модальное окно"
          className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-stone-200/60 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-stone-600 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#4A7C59] cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* ШАПКА МОДАЛЬНОГО ОКНА */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-[#ECE6DE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#1C1C1E]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Заголовок и иконка */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF2EC] dark:bg-primary/20 text-[#4A7C59] dark:text-green-400 flex items-center justify-center shadow-sm shrink-0">
                <FileText size={24} strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 id="modal-headline" className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white tracking-tight font-headline">
                    Проверка выписки
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E5ECE9] dark:bg-primary/30 text-[#2A4C34] dark:text-green-300 text-xs font-bold">
                    {items.length} {items.length === 1 ? 'операция' : 'операций'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                  Сбербанк • Т-Банк • {dateRangeString}
                </p>
              </div>
            </div>

            {/* Сводка и селектор авторов */}
            <div className="flex flex-wrap items-center gap-3 pr-8 lg:pr-0">
              
              {/* Селектор автора выписки */}
              <div className="flex items-center bg-white dark:bg-[#252528] rounded-xl border border-[#EBE4DC] dark:border-white/10 p-1 shadow-sm">
                <span className="text-[11px] font-bold text-stone-400 dark:text-gray-400 uppercase tracking-wider px-2.5 hidden sm:inline">
                  Чья выписка:
                </span>
                <div className="flex items-center gap-1">
                  {members.map(m => {
                    const isSelected = globalMemberId === m.id;
                    const initial = m.name ? m.name.charAt(0).toUpperCase() : 'У';

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSetGlobalMember(m.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-[#EAF2EC] dark:bg-primary/30 text-[#2A4C34] dark:text-green-300 font-bold border border-[#4A7C59]/30 shadow-xs' 
                            : 'font-semibold text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <span 
                          className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                            isSelected ? 'bg-[#4A7C59] text-white' : 'bg-[#E5ECE9] dark:bg-white/10 text-[#3B6447] dark:text-gray-300'
                          }`}
                          style={!isSelected && m.color ? { backgroundColor: `${m.color}20`, color: m.color } : {}}
                        >
                          {initial}
                        </span>
                        <span>{m.name}</span>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Бейдж доходов */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#252528] border border-[#EBE4DC] dark:border-white/10 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
                <span className="text-xs text-stone-400 dark:text-gray-400 font-bold uppercase tracking-wider">Доходы:</span>
                <span className="text-sm font-bold text-[#2E7D32] dark:text-green-400 tabular-nums">+{totalIncome.toLocaleString('ru-RU')} ₽</span>
              </div>

              {/* Бейдж расходов */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#252528] border border-[#EBE4DC] dark:border-white/10 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#D95D39]" />
                <span className="text-xs text-stone-400 dark:text-gray-400 font-bold uppercase tracking-wider">Расходы:</span>
                <span className="text-sm font-bold text-[#D95D39] dark:text-red-400 tabular-nums">-{totalExpense.toLocaleString('ru-RU')} ₽</span>
              </div>

            </div>

          </div>

          {/* Тулбар фильтрации и поиска */}
          <div className="mt-4 pt-3 border-t border-[#ECE6DE]/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Табы фильтров */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              <button 
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs whitespace-nowrap cursor-pointer ${
                  filterTab === 'all' 
                    ? 'bg-[#4A7C59] text-white' 
                    : 'bg-white dark:bg-[#252528] text-stone-600 dark:text-gray-300 hover:bg-stone-100 border border-[#ECE6DE] dark:border-white/5'
                }`}
              >
                Все <span className="ml-1 opacity-80 text-[11px]">{items.length}</span>
              </button>

              <button 
                type="button"
                onClick={() => setFilterTab('unrecognized')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  filterTab === 'unrecognized'
                    ? 'bg-[#E09F3E] text-white shadow-xs'
                    : unassignedCount > 0 
                      ? 'bg-[#FEF7EC] dark:bg-amber-950/30 text-[#B87008] dark:text-amber-300 border border-[#F3D5A5]/70 hover:bg-[#FDF2EE]'
                      : 'bg-white dark:bg-[#252528] text-stone-600 dark:text-gray-300 hover:bg-stone-100 border border-[#ECE6DE] dark:border-white/5'
                }`}
              >
                {unassignedCount > 0 && <AlertCircle size={14} className="text-[#E09F3E]" strokeWidth={2.5} />}
                <span>Без категории</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filterTab === 'unrecognized' ? 'bg-white text-[#E09F3E]' : 'bg-[#E09F3E] text-white'
                }`}>
                  {unassignedCount}
                </span>
              </button>

              <button 
                type="button"
                onClick={() => setFilterTab('income')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filterTab === 'income' 
                    ? 'bg-[#4A7C59] text-white font-bold' 
                    : 'hover:bg-stone-200/70 text-stone-600 dark:text-gray-300'
                }`}
              >
                Доходы <span className="ml-1 text-stone-400">{items.filter(t => t.type === 'income').length}</span>
              </button>

              <button 
                type="button"
                onClick={() => setFilterTab('expense')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filterTab === 'expense' 
                    ? 'bg-[#D95D39] text-white font-bold' 
                    : 'hover:bg-stone-200/70 text-stone-600 dark:text-gray-300'
                }`}
              >
                Расходы <span className="ml-1 text-stone-400">{items.filter(t => t.type === 'expense').length}</span>
              </button>
            </div>

            {/* Поиск и переключатель "Только требующие внимания" */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию, MCC, сумме..." 
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#252528] border border-[#EBE4DC] dark:border-white/10 rounded-xl text-xs text-stone-800 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59] transition-all"
                />
              </div>

              <button 
                type="button"
                onClick={() => setOnlyAttention(!onlyAttention)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer ${
                  onlyAttention 
                    ? 'bg-[#E09F3E] text-white border-[#E09F3E]' 
                    : 'border-stone-200 dark:border-white/10 hover:border-stone-300 bg-white dark:bg-[#252528] text-stone-600 dark:text-gray-300 hover:text-stone-900'
                }`}
              >
                <Filter size={14} className={onlyAttention ? 'text-white' : 'text-[#E09F3E]'} />
                <span className="hidden sm:inline">Только требующие внимания</span>
                <span className="sm:hidden">Внимание</span>
              </button>
            </div>

          </div>

        </div>

        {/* СПИСОК ОПЕРАЦИЙ */}
        <div className="overflow-y-auto px-6 sm:px-8 py-4 space-y-2.5 flex-1 bg-[#FAF8F5] dark:bg-[#18181A]">
          {filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-10 text-center border border-[#EBE4DC] dark:border-white/10 space-y-2">
              <p className="text-sm font-bold text-stone-700 dark:text-gray-300">Операций по выбранным фильтрам не найдено</p>
              <p className="text-xs text-stone-400">Сбросьте поиск или переключите вкладку</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const category = categories.find(c => c.id === item.category);
              const isUnrecognized = !item.category || item.category === 'other';
              const isExpense = item.type === 'expense';
              const isDropdownOpen = activeCategoryDropdown === item.tempId;

              // Форматирование даты
              const itemDate = new Date(item.date);
              const dateFormatted = !isNaN(itemDate.getTime())
                ? itemDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
                : item.date;

              return (
                <div 
                  key={item.tempId}
                  className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isUnrecognized 
                      ? 'bg-[#FFFDF7] dark:bg-[#241F18] border-2 border-[#E09F3E]/45 shadow-[0_2px_12px_rgba(224,159,62,0.08)] hover:border-[#E09F3E]' 
                      : 'bg-white dark:bg-[#1C1C1E] border border-[#EBE4DC] dark:border-white/10 shadow-[0_2px_6px_rgba(0,0,0,0.02)] hover:border-stone-300'
                  }`}
                >
                  {/* Левая часть: Иконка, Заголовок, МСС, Описание, Дата и Правило */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isExpense ? 'bg-[#FDF2EE] dark:bg-red-950/40 text-[#D95D39]' : 'bg-[#EAF2EC] dark:bg-emerald-950/40 text-[#2E7D32]'
                    }`}>
                      {isExpense ? <ArrowDownRight size={20} strokeWidth={2.4} /> : <ArrowUpRight size={20} strokeWidth={2.4} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-stone-900 dark:text-white text-sm">
                          {item.note || category?.label || 'Банковская операция'}
                        </span>
                        
                        {isUnrecognized ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEF7EC] dark:bg-amber-950/60 text-[#B87008] dark:text-amber-300 text-[11px] font-bold border border-[#F3D5A5]/60">
                            <Lightbulb size={12} className="text-[#E09F3E]" />
                            Не определено автоматически
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

                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-stone-400 font-medium">
                        <span>{dateFormatted}</span>
                        <span>•</span>
                        <span>Счёт: {item.accountMask}</span>
                        <span>•</span>
                        <label 
                          onClick={(e) => handleToggleRemember(item.tempId, e)}
                          className="inline-flex items-center gap-1.5 text-stone-500 dark:text-gray-300 cursor-pointer hover:text-stone-800 dark:hover:text-white text-[11px]"
                        >
                          <input 
                            type="checkbox"
                            checked={!!item.rememberRule}
                            onChange={() => {}}
                            className="rounded border-stone-300 text-[#4A7C59] focus:ring-[#4A7C59] h-3.5 w-3.5 cursor-pointer"
                          />
                          <span>Запомнить правило для будущих выписок</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Правая часть: Категория, Выбор автора, Сумма, Кнопки подтверждения/удаления */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-amber-100/80 dark:border-white/10">
                    
                    {/* Выпадающее меню категорий */}
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setActiveCategoryDropdown(isDropdownOpen ? null : item.tempId)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer ${
                          isUnrecognized 
                            ? 'bg-[#E09F3E] text-white hover:bg-[#C98A2F]' 
                            : 'bg-[#EAF2EC] dark:bg-primary/20 text-[#2A4C34] dark:text-green-300 hover:bg-[#d8f0de]'
                        }`}
                      >
                        <Tag size={14} />
                        <span className="uppercase tracking-wider">{category ? category.label : 'ПРОЧЕЕ'}</span>
                        <ChevronDown size={14} strokeWidth={2.5} />
                      </button>

                      {isDropdownOpen && (
                        <div 
                          ref={dropdownRef}
                          className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl border border-stone-200 dark:border-white/10 p-2.5 z-50 space-y-2"
                        >
                          {creatingCategoryFor === item.tempId ? (
                            <div className="space-y-2 p-1">
                              <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
                                <span>Новая категория</span>
                                <button onClick={() => setCreatingCategoryFor(null)} className="text-stone-400 hover:text-stone-800">
                                  <X size={14} />
                                </button>
                              </div>
                              <input 
                                type="text"
                                autoFocus
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                placeholder="Название..."
                                className="w-full px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-stone-900 dark:text-white focus:outline-none focus:border-[#4A7C59]"
                              />
                              <div className="flex gap-1.5 py-1 overflow-x-auto no-scrollbar">
                                {PRESET_COLORS.map(c => (
                                  <button 
                                    key={c}
                                    type="button"
                                    onClick={() => setNewCatColor(c)}
                                    className={`w-5 h-5 rounded-full shrink-0 ${newCatColor === c ? 'ring-2 ring-[#4A7C59] ring-offset-1' : ''}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <button 
                                type="button"
                                onClick={() => handleCreateCategory(item.tempId)}
                                className="w-full py-1.5 bg-[#4A7C59] text-white text-xs font-bold rounded-lg uppercase tracking-wider"
                              >
                                Создать и применить
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                type="button"
                                onClick={() => setCreatingCategoryFor(item.tempId)}
                                className="w-full py-1.5 px-2.5 rounded-xl bg-[#EAF2EC] dark:bg-primary/20 text-[#4A7C59] dark:text-green-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90"
                              >
                                <Plus size={14} />
                                <span>Создать категорию</span>
                              </button>

                              <div className="max-h-52 overflow-y-auto no-scrollbar grid grid-cols-1 gap-1 pt-1">
                                {categories.filter(c => c.id !== 'other').map(cat => (
                                  <button 
                                    key={cat.id}
                                    type="button"
                                    onClick={() => handleSelectCategory(item.tempId, cat.id)}
                                    className="flex items-center gap-2 p-2 rounded-xl text-left hover:bg-stone-50 dark:hover:bg-white/5 transition"
                                  >
                                    <span style={{ color: cat.color }}>{getIconById(cat.icon, 14)}</span>
                                    <span className="text-xs font-bold text-stone-900 dark:text-white truncate">{cat.label}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Селектор автора [Галя | Гена | Общее] */}
                    <div className="flex items-center bg-stone-100 dark:bg-[#252528] rounded-lg p-0.5 text-xs">
                      {members.map(m => {
                        const isMemberActive = item.memberId === m.id;
                        return (
                          <button 
                            key={m.id}
                            type="button"
                            onClick={(e) => handleItemMemberChange(item.tempId, m.id, e)}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                              isMemberActive 
                                ? 'bg-white dark:bg-[#1C1C1E] font-bold text-[#2A4C34] dark:text-green-400 shadow-xs' 
                                : 'text-stone-500 dark:text-gray-400 font-semibold hover:text-stone-900 dark:hover:text-white'
                            }`}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Сумма операции */}
                    <div className="text-right min-w-[90px]">
                      <span className={`text-base font-extrabold tabular-nums ${
                        isExpense ? 'text-stone-900 dark:text-white' : 'text-[#2E7D32] dark:text-green-400'
                      }`}>
                        {isExpense ? '-' : '+'}{item.amount.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>

                    {/* Кнопка подтверждения и удаления */}
                    <div className="flex items-center gap-1 pl-2 border-l border-amber-200/60 dark:border-white/10">
                      <button 
                        type="button"
                        onClick={(e) => handleToggleVerify(item.tempId, e)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
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
                        className="w-8 h-8 rounded-lg hover:bg-stone-200/70 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
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
        <footer className="px-6 sm:px-8 py-4 bg-[#FAF8F5] dark:bg-[#1C1C1E] border-t border-[#ECE6DE] dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Индикатор статуса */}
          <div className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-gray-300">
            <div className={`w-2.5 h-2.5 rounded-full ${unassignedCount > 0 ? 'bg-[#E09F3E] animate-pulse' : 'bg-[#4A7C59]'}`} />
            <div>
              Готово к импорту: <span className="font-bold text-stone-900 dark:text-white">{items.length - unassignedCount} из {items.length}</span> операций
              {unassignedCount > 0 && (
                <span className="text-[#B87008] dark:text-amber-400 font-semibold ml-1">
                  ({unassignedCount} требуют назначения категории)
                </span>
              )}
            </div>
          </div>

          {/* Кнопки футера */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            
            {/* Кнопка "Назначить выбранным" */}
            {unassignedCount > 0 && (
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsBatchCategoryOpen(!isBatchCategoryOpen)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 hover:border-stone-300 bg-white dark:bg-[#252528] hover:bg-stone-50 dark:hover:bg-white/5 text-stone-700 dark:text-gray-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Tag size={14} className="text-[#4A7C59]" />
                  <span>Назначить выбранным</span>
                </button>

                {isBatchCategoryOpen && (
                  <div 
                    ref={batchDropdownRef}
                    className="absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl border border-stone-200 dark:border-white/10 p-2 z-50 max-h-52 overflow-y-auto no-scrollbar grid grid-cols-1 gap-1"
                  >
                    {categories.filter(c => c.id !== 'other').map(cat => (
                      <button 
                        key={cat.id}
                        type="button"
                        onClick={() => handleBatchAssignCategory(cat.id)}
                        className="flex items-center gap-2 p-2 rounded-xl text-left hover:bg-stone-50 dark:hover:bg-white/5 transition"
                      >
                        <span style={{ color: cat.color }}>{getIconById(cat.icon, 14)}</span>
                        <span className="text-xs font-bold text-stone-900 dark:text-white">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Кнопка "Отмена" */}
            <button 
              type="button"
              onClick={onCancel}
              className="py-2.5 px-4 rounded-xl bg-[#EFECE6] dark:bg-white/10 hover:bg-[#E5E1D8] dark:hover:bg-white/20 active:bg-[#DDD8CD] text-stone-700 dark:text-gray-200 font-bold text-xs tracking-wider transition duration-150 uppercase cursor-pointer"
            >
              Отмена
            </button>

            {/* Кнопка "Подтвердить импорт" */}
            <button 
              type="button"
              onClick={() => onConfirm(items)}
              disabled={items.length === 0}
              className="py-2.5 px-5 rounded-xl bg-[#4A7C59] hover:bg-[#3E6A4B] active:bg-[#355B40] text-white font-bold text-xs tracking-wider shadow-[0_8px_20px_rgba(74,124,89,0.32)] hover:shadow-none transition duration-150 flex items-center justify-center gap-2 uppercase cursor-pointer disabled:opacity-50"
            >
              <Check size={16} strokeWidth={3} />
              <span>Подтвердить импорт ({items.length})</span>
            </button>
          </div>

        </footer>

      </div>
    </div>
  );
};

export default ImportModal;
