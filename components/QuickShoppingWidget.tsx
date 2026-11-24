import React from 'react';
import { ChevronRight, Plus, Check } from 'lucide-react';
import { ShoppingItem } from '../types';
import { DASHBOARD_CARD } from './filterUiTokens';

export interface QuickShoppingWidgetProps {
  activeShoppingItems: ShoppingItem[];
  displayShoppingItems: any[];
  newShoppingTitle: string;
  setNewShoppingTitle: (val: string) => void;
  isAddingShopping: boolean;
  handleToggleShopping: (item: any) => Promise<void>;
  handleAddShoppingInline: (e: React.FormEvent) => Promise<void>;
  onNavigateTab: (tabId: string) => void;
}

export const QuickShoppingWidget: React.FC<QuickShoppingWidgetProps> = ({
  activeShoppingItems,
  displayShoppingItems,
  newShoppingTitle,
  setNewShoppingTitle,
  isAddingShopping,
  handleToggleShopping,
  handleAddShoppingInline,
  onNavigateTab,
}) => {
  return (
    <section className={`${DASHBOARD_CARD} space-y-3`}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-base font-bold font-headline text-graphite dark:text-white">
            Список покупок
          </h3>
          <span className="bg-[#EAE6DD] dark:bg-white/10 text-graphite dark:text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            {activeShoppingItems.length} шт
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('shopping')}
          aria-label="Открыть все покупки"
          className="min-h-[44px] shrink-0 flex items-center gap-0.5 px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-xs font-medium text-graphite dark:text-gray-300 hover:text-primary transition cursor-pointer"
        >
          <span>Все</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="divide-y divide-[var(--terra-border)]">
        {displayShoppingItems.length === 0 && (
          <p className="text-sm text-graphite-muted dark:text-gray-400 py-2">Список покупок пуст</p>
        )}
        {displayShoppingItems.map((item, idx) => (
          <div 
            key={item.id ? `mob-shop-${item.id}` : `mob-shop-idx-${idx}`}
            className="px-1 py-2 flex min-w-0 items-center justify-between gap-2"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => handleToggleShopping(item as any)}
                aria-label={`Отметить покупку «${item.title}» как ${item.completed ? 'невыполненную' : 'выполненную'}`}
                className="relative w-11 h-11 shrink-0 rounded-xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-[#C5BFB4] dark:border-white/20 flex items-center justify-center hover:border-[#4A7C59] transition cursor-pointer"
              >
                {item.completed && <Check size={13} className="text-[#4A7C59]" />}
              </button>
              <span className={`text-sm min-w-0 break-words font-medium text-graphite dark:text-white ${item.completed ? 'line-through text-graphite-muted' : ''}`}>
                {item.title}
              </span>
            </div>
            <span className="text-xs shrink-0 max-w-[30%] text-right break-words font-medium text-graphite-muted dark:text-gray-400">
              {item.amount ? `${item.amount} ${item.unit || 'шт'}` : '1 шт'}
            </span>
          </div>
        ))}
      </div>

      {/* Quick add bar with round green + button */}
      <form 
        onSubmit={handleAddShoppingInline} 
        className="bg-[#EAE6DD]/50 dark:bg-white/5 rounded-2xl p-1.5 pl-4 flex items-center gap-2 border border-transparent focus-within:border-[#4A7C59]/40 transition"
      >
        <input 
          type="text"
          value={newShoppingTitle}
          onChange={(e) => setNewShoppingTitle(e.target.value)}
          placeholder="Например, молоко 1 л"
          aria-label="Название новой покупки"
          className="text-sm bg-transparent min-h-[44px] min-w-0 flex-1 text-graphite dark:text-white placeholder-graphite-muted dark:placeholder-white/40 outline-none border-0"
        />
        <button
          type="submit"
          disabled={!newShoppingTitle.trim() || isAddingShopping}
          aria-label="Добавить покупку"
          className="w-11 h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-[#4A7C59] hover:bg-[#3D6849] disabled:opacity-50 text-white flex items-center justify-center shrink-0 cursor-pointer terra-press"
        >
          <Plus size={18} strokeWidth={2.4} />
        </button>
      </form>
    </section>
  );
};

export default QuickShoppingWidget;
