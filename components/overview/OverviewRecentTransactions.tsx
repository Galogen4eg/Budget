import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { Transaction, Category, FamilyMember, AppSettings } from '../../types';
import BrandIcon from '../BrandIcon';
import { getMerchantBrandKey } from '../../utils/categorizer';

interface OverviewRecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  members: FamilyMember[];
  settings: AppSettings;
  budgetMode: 'family' | 'personal';
  formatAmount: (amount: number) => string;
  onEditTransaction: (tx: Transaction) => void;
  onNavigateTab: (tabId: string) => void;
  onOpenAddModal: () => void;
}

export const OverviewRecentTransactions: React.FC<OverviewRecentTransactionsProps> = ({
  transactions,
  categories,
  members,
  settings,
  budgetMode,
  formatAmount,
  onEditTransaction,
  onNavigateTab,
  onOpenAddModal
}) => {
  const recentList = transactions.slice(0, 5);

  return (
    <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-5 sm:p-6 border border-[#EAE6DD] dark:border-white/10 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold font-headline text-graphite dark:text-white leading-tight">
            Последние операции
          </h3>
          <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
            Журнал расходов и зачислений
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('transactions')}
          className="flex items-center gap-1 text-xs font-bold text-[#4A7C59] hover:underline cursor-pointer"
        >
          <span>Все операции</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {recentList.length === 0 ? (
        <div className="py-8 text-center text-xs text-graphite-muted dark:text-gray-400">
          <p>В этом периоде операций пока нет.</p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4A7C59] text-white font-bold cursor-pointer"
          >
            <Plus size={14} />
            <span>Добавить первую запись</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#EAE6DD] dark:divide-white/10">
          {recentList.map(tx => {
            const displayTitle = tx.merchantName || tx.description || tx.category || 'Операция';
            const catObj = categories.find(c => c.id === tx.category || c.label === tx.category);
            const catLabel = catObj?.label || tx.category || 'Без категории';
            const brandKey = getMerchantBrandKey(displayTitle);
            const isExpense = tx.type !== 'income';

            const txMember = members.find(m => m.id === tx.memberId) || { name: 'Семья', color: '#4A7C59' };
            const dateFormatted = new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

            return (
              <div
                key={tx.id}
                onClick={() => onEditTransaction(tx)}
                className="py-3 flex items-center justify-between hover:bg-[#F2ECE1]/50 dark:hover:bg-white/5 px-2 rounded-xl transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                    <BrandIcon name={displayTitle} brandKey={brandKey} category={tx.category} size="sm" className="w-10 h-10 rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-graphite dark:text-white truncate">
                      {displayTitle}
                    </h4>
                    <p className="text-[11px] text-graphite-muted dark:text-gray-400 truncate mt-0.5 flex items-center gap-1.5">
                      <span>{dateFormatted}</span>
                      <span className="font-medium" style={{ color: txMember.color }}>
                        {txMember.name}
                      </span>
                      <span>({catLabel})</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <span className={`text-xs font-bold font-headline tabular-nums block ${
                    isExpense ? 'text-graphite dark:text-white' : 'text-[#4A7C59] dark:text-green-400'
                  }`}>
                    {settings.privacyMode ? '•••' : `${isExpense ? '-' : '+'}${formatAmount(tx.amount)} ₽`}
                  </span>
                  <span className="text-[10px] text-graphite-muted dark:text-gray-400 block mt-0.5">
                    {budgetMode === 'family' ? 'Семейный счёт' : 'Личный счёт'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default OverviewRecentTransactions;
