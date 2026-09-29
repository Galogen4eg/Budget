import React, { useMemo } from 'react';
import { ArrowUpDown, Check } from 'lucide-react';
import { Transaction, Category, FamilyMember, AppSettings } from '../../types';
import BrandIcon from '../BrandIcon';
import { getMerchantBrandKey } from '../../utils/categorizer';

interface DrillDownTransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  members: FamilyMember[];
  settings: AppSettings;
  sortOrder: 'newest' | 'oldest';
  onToggleSortOrder: () => void;
  onEditTransaction: (tx: Transaction) => void;
  allTransactionsCount: number;
}

export const DrillDownTransactionList: React.FC<DrillDownTransactionListProps> = ({
  transactions,
  categories,
  members,
  settings,
  sortOrder,
  onToggleSortOrder,
  onEditTransaction,
  allTransactionsCount
}) => {
  // Group transactions by calendar day with localized titles
  const groupedTransactionsByDate = useMemo(() => {
    const groups: {
      [key: string]: {
        date: Date;
        dateTitle: string;
        totalSpent: number;
        totalIncome: number;
        txs: Transaction[];
      };
    } = {};

    transactions.forEach(t => {
      const d = new Date(t.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!groups[dateKey]) {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const months = [
          'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
          'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        const dateTitle = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;

        groups[dateKey] = {
          date: d,
          dateTitle,
          totalSpent: 0,
          totalIncome: 0,
          txs: []
        };
      }

      if (t.type === 'expense') groups[dateKey].totalSpent += t.amount;
      if (t.type === 'income') groups[dateKey].totalIncome += t.amount;
      groups[dateKey].txs.push(t);
    });

    return Object.values(groups).sort((a, b) => {
      return sortOrder === 'newest' 
        ? b.date.getTime() - a.date.getTime() 
        : a.date.getTime() - b.date.getTime();
    });
  }, [transactions, sortOrder]);

  return (
    <section className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between bg-white dark:bg-[#1C1C1E] h-full min-h-0 overflow-hidden">
      <div className="space-y-3 flex flex-col h-full min-h-0">
        
        {/* Right Header: Transactions Feed Meta & Sort Action */}
        <div className="flex items-center justify-between shrink-0 pb-1 border-b border-[#E4E0D8]/60 dark:border-white/10">
          <div className="flex items-center gap-2">
            <h3 className="font-headline font-bold text-sm text-[#2E3230] dark:text-white">
              История операций
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#F5F1EA] dark:bg-stone-800 text-[#68726B] dark:text-stone-300 font-bold text-[11px]">
              {transactions.length}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-[#68726B] dark:text-stone-400">
            <span>Сортировка:</span>
            <button 
              type="button"
              onClick={onToggleSortOrder}
              className="font-bold text-[#2E3230] dark:text-white hover:text-[#4A7C59] transition flex items-center gap-1 cursor-pointer"
            >
              <span>{sortOrder === 'newest' ? 'Сначала новые' : 'Сначала старые'}</span>
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Timeline Stream Feed inside fixed height */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 py-3 no-scrollbar">
          {groupedTransactionsByDate.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <p className="text-xs font-semibold">Операций не найдено</p>
            </div>
          ) : (
            groupedTransactionsByDate.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                {/* Group Day Header */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold tracking-wider text-[#68726B] dark:text-stone-400 uppercase text-[11px]">
                    {group.dateTitle}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#F5F1EA] dark:bg-stone-800 text-[#2E3230] dark:text-stone-300 font-bold text-[11px]">
                    {group.totalSpent > 0 
                      ? `-${group.totalSpent.toLocaleString('ru-RU')} ₽` 
                      : `+${group.totalIncome.toLocaleString('ru-RU')} ₽`}
                  </span>
                </div>

                {/* Transaction Cards in Group */}
                <div className="space-y-2">
                  {group.txs.map(tx => {
                    const member = members.find(m => m.id === tx.memberId);
                    const memberName = member ? member.name : 'Семья';
                    const txCat = categories.find(c => c.id === tx.category);
                    const displayTitle = tx.note || tx.rawNote || txCat?.label || 'Операция';
                    const brandKey = getMerchantBrandKey(displayTitle);
                    const txDate = new Date(tx.date);
                    const timeStr = txDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div 
                        key={tx.id}
                        onClick={() => onEditTransaction(tx)}
                        className="p-3 rounded-2xl bg-[#F5F1EA]/60 dark:bg-[#242428] hover:bg-[#EAE6DE]/80 dark:hover:bg-[#2A2A2E] transition-all flex items-center justify-between group cursor-pointer border border-transparent hover:border-[#E4E0D8] dark:hover:border-white/10 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
                            <BrandIcon 
                              name={displayTitle}
                              brandKey={brandKey}
                              category={txCat}
                              size="md"
                              className="rounded-xl shadow-2xs"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-headline font-semibold text-sm text-[#2E3230] dark:text-white truncate">
                                {displayTitle}
                              </span>
                              <span 
                                className="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-stone-800 font-bold shrink-0"
                                style={{ color: member?.color || undefined }}
                              >
                                {memberName}
                              </span>
                            </div>
                            <span className="block text-xs text-[#68726B] dark:text-stone-400 truncate mt-0.5">
                              {tx.rawNote || txCat?.label || 'Перевод / Расход'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-3">
                          <span className={`font-headline font-bold text-sm ${
                            tx.type === 'income' ? 'text-[#4A7C59] dark:text-green-400' : 'text-[#2E3230] dark:text-white'
                          }`}>
                            {tx.type === 'income' ? '+' : '-'}{settings.privacyMode ? '•••' : `${Math.round(tx.amount).toLocaleString('ru-RU')} ₽`}
                          </span>
                          <span className="block text-[10px] text-[#68726B] dark:text-stone-400 mt-0.5">
                            {timeStr}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column Footer */}
        <div className="pt-3 border-t border-[#E4E0D8] dark:border-white/10 flex items-center justify-between text-xs text-[#68726B] dark:text-stone-400 shrink-0">
          <span>Отображено {transactions.length} из {allTransactionsCount}</span>
          <span className="flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-[#4A7C59]" />
            <span>Нажмите на строку для редактирования</span>
          </span>
        </div>

      </div>
    </section>
  );
};

export default DrillDownTransactionList;
