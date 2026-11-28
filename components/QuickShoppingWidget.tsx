import React from 'react';
import { ChevronRight, Plus, Check } from 'lucide-react';
import { ShoppingItem } from '../types';
import { DASHBOARD_CARD, SECTION_HEADING, TOOLBAR_ACTION_PRIMARY, ICON_ACTION } from './filterUiTokens';

export interface QuickShoppingWidgetProps {
  activeShoppingItems: ShoppingItem[];
  displayShoppingItems: any[];
  newShoppingTitle: string;
  setNewShoppingTitle: (val: string) => void;
  isAddingShopping: boolean;
  handleToggleShopping: (item: any) => Promise<void>;
  handleAddShoppingInline: (e: React.FormEvent) => Promise<void>;
  onNavigateTab: (tabId: string) => void;
  liveParsedShopping?: {title:string;amount:string|number;unit:string}[];
  desktop?:boolean;
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
  liveParsedShopping=[],
  desktop=false,
}) => {
  return (
    <section data-testid="overview-shopping-card" className={`${DASHBOARD_CARD} terra-layout-surface space-y-2`}>
      <div data-overview-section-head className="terra-overview-section-head flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={SECTION_HEADING}>
            Список покупок
          </h3>
          {activeShoppingItems.length>0&&<span className="bg-[var(--terra-soft)] text-[var(--terra-muted)] text-xs font-semibold px-2 py-0.5 rounded-full">
            {activeShoppingItems.length}
          </span>}
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('shopping')}
          aria-label="Открыть все покупки" data-testid="overview-shopping-link"
          className="terra-overview-link min-h-[44px] shrink-0 flex items-center gap-1 px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] text-sm font-semibold text-[var(--terra-primary-text)] hover:bg-[var(--terra-soft)] transition-colors cursor-pointer"
        >
          <span>Все</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="divide-y divide-[var(--terra-border)]">
        {displayShoppingItems.length === 0 && (
          <p className="text-sm text-[var(--terra-muted)]">Список пуст</p>
        )}
        {displayShoppingItems.slice(0, 4).map((item, idx) => (
          <div 
            key={item.id ? `mob-shop-${item.id}` : `mob-shop-idx-${idx}`}
            className="px-1 py-2 grid grid-cols-[44px_minmax(0,1fr)_minmax(44px,28%)] min-w-0 items-center gap-2"
          >
              <button
                type="button"
                onClick={() => handleToggleShopping(item as any)}
                aria-label={`Отметить покупку «${item.title}» как ${item.completed ? 'невыполненную' : 'выполненную'}`}
                className="relative w-11 h-11 shrink-0 flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] hover:bg-[var(--terra-soft)] transition-colors cursor-pointer"
              >
                <span className="w-5 h-5 rounded-md border border-[var(--terra-control-border)] flex items-center justify-center">{item.completed && <Check size={13} className="text-[var(--terra-primary-text)]" />}</span>
              </button>
              <span className={`text-sm min-w-0 break-words font-medium text-graphite dark:text-white ${item.completed ? 'line-through text-graphite-muted' : ''}`}>
                {item.title}
              </span>
            <span className="text-sm min-w-0 text-right [overflow-wrap:anywhere] font-medium tabular-nums text-[var(--terra-muted)]">
              {item.amount ? `${String(item.amount).replace('.', ',')} ${item.unit || 'шт'}` : '1 шт'}
            </span>
          </div>
        ))}
      </div>

      {displayShoppingItems.length>4&&<button type="button" onClick={()=>onNavigateTab('shopping')} className="min-h-[44px] text-sm font-semibold text-[var(--terra-primary-text)] w-full text-left px-1 focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">Ещё {displayShoppingItems.length-4} · Все покупки <ChevronRight size={14} className="inline" aria-hidden="true"/></button>}
      {/* Quick add bar with round green + button */}
      <form 
        onSubmit={handleAddShoppingInline} 
        className="grid grid-cols-[minmax(0,1fr)_44px] gap-2 items-center"
      >
        <input 
          type="text"
          value={newShoppingTitle}
          onChange={(e) => setNewShoppingTitle(e.target.value)}
          placeholder="Например, молоко 1 л"
          aria-label="Название новой покупки"
          className="text-base min-h-[44px] min-w-0 w-full px-3 rounded-xl border border-[var(--terra-control-border)] bg-[var(--terra-surface)] text-[var(--terra-ink)] placeholder:text-[var(--terra-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
        />
        <button
          type="submit"
          disabled={!newShoppingTitle.trim() || isAddingShopping}
          aria-label={desktop?"Добавить в список покупок":"Добавить покупку"}
          className={ICON_ACTION+" "+TOOLBAR_ACTION_PRIMARY+" terra-press"}
        >
          <Plus size={18} strokeWidth={2.4} />
        </button>
      </form>
      {liveParsedShopping.length>0&&<div data-testid="overview-shopping-preview" className="divide-y divide-[var(--terra-border)] text-xs text-[var(--terra-muted)]" aria-label="Предпросмотр покупок">{liveParsedShopping.map((item,index)=><div key={index} className="flex items-baseline justify-between gap-2 py-1.5"><span className="min-w-0 [overflow-wrap:anywhere]">{item.title}</span><span className="shrink-0 tabular-nums">{String(item.amount).replace('.', ',')} {item.unit}</span></div>)}</div>}
    </section>
  );
};

export default QuickShoppingWidget;
