import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookMarked, RotateCcw, Plus, Trash2, Loader2, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import type { ShoppingItem, FamilyMember } from '../types';
import { generateUniqueId, saveShoppingMerge } from '../utils/db';
import { unseenPurchaseCompletions } from '../utils/familyWorkspace';
import { resolveShoppingMemberId } from '../utils/shoppingMember';
import { mergeOrRestoreShoppingItems, recordCommittedShoppingEvents } from '../utils/shoppingManager';
import { recentRepeatItems, type ListProduct, type SavedShoppingList, type PurchasedProduct } from '../utils/shoppingLists';
import {
  subscribeShoppingListLibrary, saveFamilyShoppingTemplate,
  deleteFamilyShoppingTemplate, recordFamilyPurchases
} from '../utils/shoppingListsDb';

interface Props {
  items: ShoppingItem[];
  members: FamilyMember[];
}

const BUILTIN: Pick<SavedShoppingList,'id'|'name'|'items'>[] = [
  { id: 'preset-weekly', name: 'Продукты на неделю', items: [
    { title: 'Молоко', amount: '1', unit: 'л', category: 'dairy', priority: 'medium' },
    { title: 'Хлеб', amount: '1', unit: 'шт', category: 'bakery', priority: 'medium' },
    { title: 'Яйца', amount: '1', unit: 'уп', category: 'dairy', priority: 'medium' },
    { title: 'Овощи', amount: '1', unit: 'кг', category: 'produce', priority: 'medium' }
  ] },
  { id: 'preset-household', name: 'Для дома', items: [
    { title: 'Моющее средство', amount: '1', unit: 'шт', category: 'household', priority: 'medium' },
    { title: 'Бумажные полотенца', amount: '1', unit: 'уп', category: 'household', priority: 'medium' },
    { title: 'Пакеты для мусора', amount: '1', unit: 'уп', category: 'household', priority: 'medium' }
  ] },
  { id: 'preset-trip', name: 'В поездку', items: [
    { title: 'Вода', amount: '2', unit: 'л', category: 'drinks', priority: 'medium' },
    { title: 'Перекус', amount: '1', unit: 'уп', category: 'grocery', priority: 'medium' },
    { title: 'Салфетки', amount: '1', unit: 'уп', category: 'household', priority: 'medium' }
  ] }
];

export const ShoppingQuickListsPanel: React.FC<Props> = ({ items, members }) => {
  const { familyId, user } = useAuth();
  const { shoppingReady } = useData();
  const [section, setSection] = useState<'templates' | 'history' | null>(null);
  const [templates, setTemplates] = useState<SavedShoppingList[]>([]);
  const [history, setHistory] = useState<PurchasedProduct[]>([]);
  const [libraryFamily,setLibraryFamily]=useState<string|null>(null);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const captured = useRef(new Set<string>());
  const recent = useMemo(() => recentRepeatItems(history, 20), [history]);
  const lastPurchasedAt = useMemo(() => {
    const latest = new Map<string, number>();
    for (const purchase of history) {
      const key = `${purchase.title.trim().toLocaleLowerCase('ru-RU')}|${(purchase.unit || 'шт').trim().toLowerCase()}`;
      const previous = latest.get(key) || 0;
      if (purchase.purchasedAt > previous) latest.set(key, purchase.purchasedAt);
    }
    return latest;
  }, [history]);

  useEffect(() => {
    captured.current=new Set<string>();
    setTemplates([]);
    setHistory([]);setLibraryFamily(null);
    if (!familyId) return;
    return subscribeShoppingListLibrary(familyId, library => {
      setTemplates(library.templates);
      setHistory(library.history);setLibraryFamily(familyId);
    }, error => {
      console.error('Shopping list library subscription failed', error);
      toast.error('Не удалось загрузить семейные списки');
    });
  }, [familyId]);

  // Persist a compact shared history of completed items, including those added
  // before this feature was available. A transaction deduplicates simultaneous
  // observations from both logged-in family members.
  useEffect(() => {
    if (!familyId||!shoppingReady||libraryFamily!==familyId) return;
    const pending: ShoppingItem[] = [];
    const keys: string[] = [];
    const capturedForFamily=captured.current;
    for (const item of unseenPurchaseCompletions(items,history)) {
      const completionKey = item.completedAt ? `${item.id}@${item.completedAt}` : item.id;
      if (captured.current.has(completionKey)) continue;
      captured.current.add(completionKey);
      pending.push(item);
      keys.push(completionKey);
    }
    if (!pending.length) return;
    void recordFamilyPurchases(familyId, pending).catch(error => {
      for(const key of keys)capturedForFamily.delete(key);
      console.error('Failed to save shopping history', error);
    });
  }, [familyId, items, history, libraryFamily, shoppingReady]);

  const execute = async (work: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    try { await work(); }
    catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить список покупок');
    } finally { setSaving(false); }
  };

  const addProducts = (products: readonly ListProduct[]) => execute(async () => {
    if (!familyId) throw new Error('Семейный аккаунт ещё не подключён');
    if (products.length === 0) throw new Error('Нет товаров для добавления');
    const memberId = resolveShoppingMemberId(members, user?.uid);
    const incoming = products.map(p => ({ ...p, memberId, completed: false }));
    const changes = mergeOrRestoreShoppingItems(items, incoming, memberId);
    await saveShoppingMerge(familyId, changes.itemsToUpdateInDb, changes.itemsToAddInDb);
    recordCommittedShoppingEvents(changes.purchaseEvents);
    // Firestore listener updates the actual shared list; do not replace another
    // family member's fresh list with our outdated local snapshot.
    toast.success(changes.summaryMessage || 'Товары добавлены в общий список');
  });

  const saveTemplate = () => execute(async () => {
    if (!familyId) throw new Error('Семейный аккаунт ещё не подключён');
    await saveFamilyShoppingTemplate(familyId, templateName, items, generateUniqueId());
    setTemplateName('');
    toast.success('Быстрый список сохранён для семьи');
  });

  const removeTemplate = (id: string) => execute(async () => {
    if (!familyId) throw new Error('Семейный аккаунт ещё не подключён');
    await deleteFamilyShoppingTemplate(familyId, id);
    toast.success('Быстрый список удалён');
  });

  return (
    <div className="shrink-0 min-w-0 border-b border-[var(--terra-border)] bg-[var(--terra-surface)] px-3 sm:px-5 py-2 z-10">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setSection(section === 'templates' ? null : 'templates')}
          aria-expanded={section === 'templates'}
          aria-controls="shopping-template-options"
          className="min-w-0 min-h-[44px] justify-center rounded-xl border border-[var(--terra-border)] px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <BookMarked size={16}/> Быстрые списки {section === 'templates' && <ChevronUp size={14}/>}
        </button>
        <button type="button" onClick={() => setSection(section === 'history' ? null : 'history')}
          aria-expanded={section === 'history'}
          aria-controls="shopping-repeat-options"
          className="min-w-0 min-h-[44px] justify-center rounded-xl border border-[var(--terra-border)] px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <RotateCcw size={16}/> Повторить покупки {section === 'history' && <ChevronUp size={14}/>}
        </button>
      </div>

      {section === 'templates' && (
        <div id="shopping-template-options" className="pt-3 space-y-3 max-h-[min(32dvh,16rem)] overflow-y-auto overscroll-contain" aria-label="Быстрые списки покупок">
          <p className="text-xs text-[var(--terra-muted)]">Готовые и сохранённые семейные списки</p>
          <div className="flex flex-wrap gap-2">
            {[...templates, ...BUILTIN].map(t => (
              <div key={t.id} className="flex min-w-0 max-w-full items-center gap-1 border rounded-xl border-[var(--terra-border)] p-1">
                <button type="button" disabled={saving} onClick={() => void addProducts(t.items)}
                  className="min-h-[44px] min-w-0 px-2 py-2 text-xs font-medium dark:text-white disabled:opacity-50 break-words text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Plus size={13} className="inline mr-1"/>{t.name} · {t.items.length}
                </button>
                {!t.id.startsWith('preset-') && (
                  <button type="button" disabled={saving} onClick={() => void removeTemplate(t.id)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg p-2 text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Удалить шаблон ${t.name}`}><Trash2 size={14}/></button>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); void saveTemplate(); }} className="flex gap-2 flex-wrap">
            <input value={templateName} onChange={e=>setTemplateName(e.target.value)}
              maxLength={60} placeholder="Название своего списка" aria-label="Название нового списка"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-[var(--terra-soft)] text-[var(--terra-ink)] border border-[var(--terra-border)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/>
            <button type="submit" disabled={saving || !templateName.trim()}
              className="min-h-[44px] rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {saving ? <Loader2 size={16} className="animate-spin"/> : 'Сохранить текущие'}
            </button>
          </form>
        </div>
      )}

      {section === 'history' && (
        <div id="shopping-repeat-options" className="pt-3 space-y-3 max-h-[min(32dvh,16rem)] overflow-y-auto overscroll-contain" aria-label="История покупок">
          <div className="flex justify-between gap-2 items-center flex-wrap">
            <p className="text-xs text-[var(--terra-muted)]">Недавние покупки</p>
            <button type="button" disabled={saving || recent.length===0}
              onClick={() => void addProducts(recent)}
              className="min-h-[44px] px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Повторить последние ({recent.length})
            </button>
          </div>
          {recent.length === 0 && <p className="text-sm text-[var(--terra-muted)]">{familyId&&libraryFamily!==familyId?'История загружается.':'Купленных товаров пока нет.'}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recent.map(p=>(
              <button key={p.title.toLowerCase()+'|'+p.unit} type="button" disabled={saving}
                onClick={() => void addProducts([p])}
                className="min-h-[44px] flex justify-between items-center text-left gap-2 rounded-xl border border-[var(--terra-border)] px-3 py-2 text-sm dark:text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="min-w-0 break-words">
                  <span className="block font-semibold">{p.title} · {p.amount} {p.unit}</span>
                  {lastPurchasedAt.get(`${p.title.trim().toLocaleLowerCase('ru-RU')}|${(p.unit || 'шт').trim().toLowerCase()}`) && (
                    <span className="block mt-0.5 text-[11px] text-[var(--terra-muted)]">
                      Последняя покупка: {new Date(lastPurchasedAt.get(`${p.title.trim().toLocaleLowerCase('ru-RU')}|${(p.unit || 'шт').trim().toLowerCase()}`)!).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </span>
                <Plus size={16} className="shrink-0"/>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingQuickListsPanel;
