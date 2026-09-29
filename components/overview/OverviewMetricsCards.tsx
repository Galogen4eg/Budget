import React from 'react';
import { AppSettings } from '../../types';

interface OverviewMetricsCardsProps {
  settings: AppSettings;
  formatAmount: (amount: number) => string;
  totalBalance: number;
  activeMonth: Date;
  displayMonthSpent: number;
  totalMonthlyLimit: number;
  freeRemainingForMonth: number;
  daysToSalary: number;
  salaryDateDisplay: string;
  dailyBudgetRemaining: number;
  setIsReserveModalOpen: (open: boolean) => void;
}

export const OverviewMetricsCards: React.FC<OverviewMetricsCardsProps> = ({
  settings,
  formatAmount,
  totalBalance,
  activeMonth,
  displayMonthSpent,
  totalMonthlyLimit,
  freeRemainingForMonth,
  daysToSalary,
  salaryDateDisplay,
  dailyBudgetRemaining,
  setIsReserveModalOpen
}) => {
  const percentSpent = Math.min(100, Math.round((displayMonthSpent / (totalMonthlyLimit || 1)) * 100));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Общий баланс и израсходовано от лимита */}
      <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-5 border border-[#EAE6DD] dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">
            Общий баланс
          </span>
          <span className="text-[10px] font-semibold text-[#4A7C59] bg-[#EAE6DD]/50 dark:bg-white/5 px-2 py-0.5 rounded-md">
            Все счета
          </span>
        </div>

        <div>
          <div className="text-3xl font-extrabold font-headline text-graphite dark:text-white tracking-tight">
            {settings.privacyMode ? '••••••' : `${formatAmount(totalBalance)} ₽`}
          </div>
          <p className="text-xs text-graphite-muted dark:text-gray-400 mt-1">
            Доступно до конца {activeMonth.toLocaleString('ru-RU', { month: 'short' })}, к прошлому месяцу рост
          </p>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-graphite-muted dark:text-gray-400">Израсходовано от лимита</span>
            <span className="font-bold text-graphite dark:text-white font-headline">
              {settings.privacyMode ? '•••' : `${formatAmount(displayMonthSpent)} ₽ / ${formatAmount(totalMonthlyLimit)} ₽`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#EAE6DD] dark:bg-[#2C2C2E] overflow-hidden">
            <div 
              className="h-full rounded-full bg-[#4A7C59] transition-all duration-500"
              style={{ width: `${percentSpent}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. Свободный остаток до аванса/зарплаты */}
      <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-5 border border-[#EAE6DD] dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">
            Свободный остаток
          </span>
          <button
            type="button"
            onClick={() => setIsReserveModalOpen(true)}
            className="text-[10px] font-bold text-[#4A7C59] hover:underline cursor-pointer"
          >
            Детали резерва
          </button>
        </div>

        <div>
          <div className="text-3xl font-extrabold font-headline text-graphite dark:text-white tracking-tight">
            {settings.privacyMode ? '••••••' : `${formatAmount(freeRemainingForMonth)} ₽`}
          </div>
          <p className="text-xs text-graphite-muted dark:text-gray-400 mt-1">
            До выплаты ({salaryDateDisplay}) осталось {daysToSalary} дн.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-[#F2ECE1] dark:bg-[#252528] flex items-center justify-between text-xs">
          <span className="text-graphite-muted dark:text-gray-400 font-medium">Дневной лимит:</span>
          <span className="font-bold text-[#4A7C59] dark:text-green-400 font-headline">
            {settings.privacyMode ? '•••' : `${formatAmount(dailyBudgetRemaining)} ₽ / день`}
          </span>
        </div>
      </section>

      {/* 3. Финансовая норма и темп трат */}
      <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-5 border border-[#EAE6DD] dark:border-white/10 shadow-sm space-y-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">
            Темп расходов
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#4A7C59]/10 text-[#4A7C59]">
            В норме
          </span>
        </div>

        <div>
          <div className="text-2xl font-bold font-headline text-graphite dark:text-white">
            {percentSpent <= 80 ? 'Оптимальный темп' : 'Умеренный расход'}
          </div>
          <p className="text-xs text-graphite-muted dark:text-gray-400 mt-1">
            Осталось {100 - percentSpent}% месячного фонда
          </p>
        </div>

        <div className="text-xs text-graphite-muted dark:text-gray-400 pt-1">
          Все обязательные платежи учтены и зарезервированы.
        </div>
      </section>
    </div>
  );
};

export default OverviewMetricsCards;
