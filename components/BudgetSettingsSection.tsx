import React, { useState, useMemo, useCallback } from 'react';
import { 
  Wallet, Calendar, Lock, Savings, Remove, Add, 
  Build, ContentCopy, SearchCheck, FolderZip, DeleteSweep,
  Payments, EventAvailable
} from './BudgetIcons';
import { AppSettings, Transaction } from '../types';
import { toast } from 'sonner';

/** Константы по умолчанию для параметров финансового контура */
export const DEFAULT_INITIAL_BALANCE = 125000;
export const DEFAULT_INITIAL_BALANCE_DATE = '2024-10-01';
export const DEFAULT_SALARY_DATES: readonly number[] = [10, 25];
export const MIN_SAVINGS_PERCENT = 1;
export const MAX_SAVINGS_PERCENT = 60;
export const SAVINGS_STEP = 1;
export const TOTAL_MONTH_DAYS = 31;

export const PRESET_SAVINGS_CHIPS = [
  { val: 5, label: '+5% (Мягкий)' },
  { val: 10, label: '+10% (Рекомендуемый)' },
  { val: 15, label: '15% (Уверенный)' },
  { val: 20, label: '20% (Интенсив)' },
] as const;

/**
 * Подсчет транзакций в заданном диапазоне дат (включительно).
 * Чистая функция без побочных эффектов.
 */
export function countTransactionsInRange(
  transactions: readonly Transaction[],
  startDate: string,
  endDate: string
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).setHours(23, 59, 59, 999);
  if (isNaN(start) || isNaN(end) || start > end) return 0;

  return transactions.filter(tx => {
    const txTime = new Date(tx.date).getTime();
    return !isNaN(txTime) && txTime >= start && txTime <= end;
  }).length;
}

/**
 * Форматирование списка дней месяца для понятного отображения в UI.
 */
export function formatSalaryDaysText(days: readonly number[]): string {
  if (days.length === 0) return 'не выбрано';
  if (days.length === 1) return `${days[0]} число`;
  return `${days.join(' и ')} число`;
}

export interface BudgetSettingsSectionProps {
  settings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  savingsRate: number;
  setSavingsRate: (rate: number) => void;
  transactions?: Transaction[];
  onOpenDuplicates?: () => void;
  onDeleteTransactionsByPeriod?: (start: string, end: string) => void;
}

/**
 * Компонент секции «Параметры бюджета»
 * Реализует утвержденный интерфейс прототипа:
 * 1. Базовый контур и копилка (стартовый баланс, дата начала, процент копилки, умный резерв)
 * 2. Интерактивный календарь выплат (1-31 день, пересчет суточного лимита)
 * 3. Аудит и очистка истории (поиск дублей, архивация в файл, удаление за период)
 */
export const BudgetSettingsSection: React.FC<BudgetSettingsSectionProps> = ({
  settings,
  onUpdateSetting,
  savingsRate,
  setSavingsRate,
  transactions = [],
  onOpenDuplicates,
  onDeleteTransactionsByPeriod,
}) => {
  const initialBalance = settings.initialBalance ?? DEFAULT_INITIAL_BALANCE;
  const initialDate = settings.initialBalanceDate || DEFAULT_INITIAL_BALANCE_DATE;
  const smartReserve = settings.enableSmartReserve ?? true;
  const salaryDates = settings.salaryDates && settings.salaryDates.length > 0 
    ? settings.salaryDates 
    : [...DEFAULT_SALARY_DATES];

  const [archiveStart, setArchiveStart] = useState('2023-01-01');
  const [archiveEnd, setArchiveEnd] = useState('2023-12-31');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDecrementSavings = useCallback(() => {
    if (savingsRate > MIN_SAVINGS_PERCENT) {
      setSavingsRate(savingsRate - SAVINGS_STEP);
    }
  }, [savingsRate, setSavingsRate]);

  const handleIncrementSavings = useCallback(() => {
    if (savingsRate < MAX_SAVINGS_PERCENT) {
      setSavingsRate(savingsRate + SAVINGS_STEP);
    }
  }, [savingsRate, setSavingsRate]);

  const toggleSalaryDay = useCallback((day: number) => {
    const exists = salaryDates.includes(day);
    const updated = exists 
      ? salaryDates.filter(d => d !== day) 
      : [...salaryDates, day].sort((a, b) => a - b);
    onUpdateSetting('salaryDates', updated);
  }, [salaryDates, onUpdateSetting]);

  const matchedCount = useMemo(() => {
    return countTransactionsInRange(transactions, archiveStart, archiveEnd);
  }, [transactions, archiveStart, archiveEnd]);

  const handleArchiveExport = useCallback(() => {
    if (!archiveStart || !archiveEnd) {
      toast.error('Укажите период для архивации');
      return;
    }
    const filtered = transactions.filter(t => {
      const d = t.date;
      return d >= archiveStart && d <= archiveEnd;
    });
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terra-archive-${archiveStart}-${archiveEnd}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Архивировано операций: ${filtered.length}`);
  }, [archiveStart, archiveEnd, transactions]);

  const handleDeletePeriod = useCallback(() => {
    if (!archiveStart || !archiveEnd) {
      toast.error('Укажите диапазон дат');
      return;
    }
    onDeleteTransactionsByPeriod?.(archiveStart, archiveEnd);
    setIsConfirmingDelete(false);
    toast.success('История за выбранный период очищена');
  }, [archiveStart, archiveEnd, onDeleteTransactionsByPeriod]);

  return (
    <div className="flex flex-col w-full pb-6 space-y-4 font-body text-[#2e3230] dark:text-gray-200">
      {/* Верхний статус-контекст */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center px-3 py-1.5 rounded-full bg-[#f0ece4] dark:bg-[#202225] text-[#4a4e4a] dark:text-gray-300 text-xs font-semibold tracking-wide border border-transparent dark:border-white/5">
          <span>Настройки системы • Финансовый контур</span>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-[#f0e8db] dark:bg-emerald-950/40 text-[#705c30] dark:text-emerald-400 text-xs font-semibold">
          Цикл: Месячный
        </div>
      </div>

      {/* Карточка 1: Базовый контур и копилка */}
      <section className="bg-white dark:bg-[#1E2023] rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(46,50,48,0.05)] border border-gray-200/80 dark:border-white/5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f0ece4] dark:bg-[#282a2d] flex items-center justify-center text-[#4a7c59] dark:text-emerald-400 shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <h2 className="font-headline font-semibold text-base sm:text-lg text-[#2e3230] dark:text-white leading-tight">
              Базовый контур и копилка
            </h2>
            <p className="text-xs text-[#4a4e4a] dark:text-gray-400 font-medium mt-0.5">
              Вводная точка для вычисления свободных денег
            </p>
          </div>
        </div>

        {/* Сетка ввода баланса и начальной даты */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#f5f1ea] dark:bg-[#25282c] p-3.5 rounded-xl flex flex-col justify-between space-y-1 border border-transparent dark:border-white/5">
            <label className="text-xs font-semibold text-[#4a4e4a] dark:text-gray-400">
              Начальный баланс
            </label>
            <div className="flex items-center justify-between mt-1">
              <input 
                type="number"
                value={initialBalance || ''}
                onChange={e => onUpdateSetting('initialBalance', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                placeholder="125 000"
                className="w-full bg-transparent font-headline font-bold text-lg text-[#2e3230] dark:text-white focus:outline-none" 
              />
              <span className="text-[#4a7c59] dark:text-emerald-400 ml-2 shrink-0">
                <Payments size={22} />
              </span>
            </div>
            <p className="text-[11px] text-[#4a4e4a]/80 dark:text-gray-500 pt-1">
              Фактический остаток на счетах на старте
            </p>
          </div>

          <div className="bg-[#f5f1ea] dark:bg-[#25282c] p-3.5 rounded-xl flex flex-col justify-between space-y-1 border border-transparent dark:border-white/5">
            <label className="text-xs font-semibold text-[#4a4e4a] dark:text-gray-400">
              Дата начала учета
            </label>
            <div className="flex items-center justify-between mt-1">
              <input
                type="date"
                value={initialDate}
                onChange={e => onUpdateSetting('initialBalanceDate', e.target.value)}
                className="w-full bg-transparent font-headline font-semibold text-base text-[#2e3230] dark:text-white focus:outline-none cursor-pointer"
              />
              <span className="text-[#4a4e4a] dark:text-gray-400 ml-2 shrink-0">
                <Calendar size={20} />
              </span>
            </div>
            <p className="text-[11px] text-[#4a4e4a]/80 dark:text-gray-500 pt-1">
              Точка отсчета аналитических графиков
            </p>
          </div>
        </div>

        {/* Управление процентом отчислений в копилку */}
        <div className="space-y-3 pt-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2e3230] dark:text-white">
                <span className="text-[#705c30] dark:text-amber-400">
                  <Savings size={16} />
                </span>
                <span>Процент отчислений в копилку</span>
              </div>
              <p className="text-xs text-[#4a4e4a] dark:text-gray-400 mt-0.5">
                Автоматически переводится в резерв с каждого дохода
              </p>
            </div>
          </div>

          {/* Счетчик */}
          <div className="flex items-center justify-between bg-[#f5f1ea] dark:bg-[#25282c] p-2 rounded-xl border border-transparent dark:border-white/5">
            <button 
              type="button"
              onClick={handleDecrementSavings}
              className="w-10 h-10 rounded-lg bg-white dark:bg-[#1E2023] text-[#2e3230] dark:text-white flex items-center justify-center hover:bg-[#e4e0d8] dark:hover:bg-white/10 active:scale-95 transition-all shadow-xs cursor-pointer"
              aria-label="Уменьшить процент"
            >
              <Remove size={20} />
            </button>
            <div className="flex flex-col items-center">
              <span className="font-headline font-bold text-xl text-[#4a7c59] dark:text-emerald-400">
                {savingsRate} %
              </span>
              <span className="text-[10px] text-[#4a4e4a] dark:text-gray-400 font-medium">
                от приходящей суммы
              </span>
            </div>
            <button 
              type="button"
              onClick={handleIncrementSavings}
              className="w-10 h-10 rounded-lg bg-white dark:bg-[#1E2023] text-[#2e3230] dark:text-white flex items-center justify-center hover:bg-[#e4e0d8] dark:hover:bg-white/10 active:scale-95 transition-all shadow-xs cursor-pointer"
              aria-label="Увеличить процент"
            >
              <Add size={20} />
            </button>
          </div>

          {/* Быстрые пресеты */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {PRESET_SAVINGS_CHIPS.map(chip => {
              const isActive = savingsRate === chip.val;
              return (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => setSavingsRate(chip.val)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'font-semibold bg-[#4a7c59] text-white shadow-[0_2px_8px_rgba(74,124,89,0.25)] active:scale-95'
                      : 'font-medium bg-[#f5f1ea] dark:bg-[#25282c] text-[#4a4e4a] dark:text-gray-300 hover:bg-[#f0ece4] dark:hover:bg-white/10 active:scale-95'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Переключатель Умного резерва */}
        <div className="bg-[#f5f1ea] dark:bg-[#25282c] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-transparent dark:border-white/5">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-[#78a886]/25 dark:bg-emerald-950/50 text-[#2a6038] dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock size={18} />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-sm font-semibold text-[#2e3230] dark:text-white leading-snug">
                Авторезерв обязательных платежей
              </div>
              <p className="text-xs text-[#4a4e4a] dark:text-gray-400 leading-relaxed">
                Блокирует сумму под регулярные счета, аренду и подписки перед расчетом свободного остатка
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2 sm:pt-0 shrink-0">
            <button
              type="button"
              onClick={() => onUpdateSetting('enableSmartReserve', !smartReserve)}
              className={`w-11 h-6 rounded-full p-1 transition-colors relative cursor-pointer ${
                smartReserve ? 'bg-[#4a7c59]' : 'bg-gray-300 dark:bg-gray-700'
              }`}
              aria-label="Включить авторезерв"
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform ${
                smartReserve ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </section>

      {/* Карточка 2: Календарь выплат */}
      <section className="bg-white dark:bg-[#1E2023] rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(46,50,48,0.05)] border border-gray-200/80 dark:border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="font-headline font-semibold text-base sm:text-lg text-[#2e3230] dark:text-white">
                Календарь выплат
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#c8e8d0] dark:bg-emerald-950/60 text-[#2a6038] dark:text-emerald-300 text-[11px] font-semibold">
                Выбрано: {salaryDates.length} {salaryDates.length === 1 ? 'день' : (salaryDates.length > 1 && salaryDates.length < 5 ? 'дня' : 'дней')}
              </span>
            </div>
            <p className="text-xs text-[#4a4e4a] dark:text-gray-400 font-medium">
              Дни месяца для пересчета доступного дневного лимита
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#f0ece4] dark:bg-[#282a2d] flex items-center justify-center text-[#4a7c59] dark:text-emerald-400 shrink-0">
            <EventAvailable size={20} />
          </div>
        </div>

        {/* Сетка календаря 1-31 */}
        <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 gap-1.5 pt-1 text-center">
          {Array.from({ length: TOTAL_MONTH_DAYS }).map((_, idx) => {
            const dayNum = idx + 1;
            const isSelected = salaryDates.includes(dayNum);
            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => toggleSalaryDay(dayNum)}
                className={`h-9 rounded-lg font-semibold text-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#4a7c59] text-white font-bold shadow-[0_2px_8px_rgba(74,124,89,0.3)]'
                    : 'bg-[#f5f1ea] dark:bg-[#25282c] text-[#2e3230] dark:text-gray-300 hover:bg-[#f0ece4] dark:hover:bg-white/10'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Легенда */}
        <div className="flex items-center gap-4 pt-1 text-xs text-[#4a4e4a] dark:text-gray-400 font-medium flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4a7c59] inline-block" />
            <span>Дни начисления ({formatSalaryDaysText(salaryDates)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f0ece4] dark:bg-white/10 inline-block" />
            <span>Обычные дни</span>
          </div>
        </div>
      </section>

      {/* Карточка 3: Инструменты и аудит данных */}
      <section className="bg-white dark:bg-[#1E2023] rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(46,50,48,0.05)] border border-gray-200/80 dark:border-white/5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f0ece4] dark:bg-[#282a2d] flex items-center justify-center text-[#4a7c59] dark:text-emerald-400 shrink-0">
            <Build size={22} />
          </div>
          <div>
            <h2 className="font-headline font-semibold text-base sm:text-lg text-[#2e3230] dark:text-white leading-tight">
              Инструменты и аудит данных
            </h2>
            <p className="text-xs text-[#4a4e4a] dark:text-gray-400 font-medium mt-0.5">
              Контроль целостности журнала транзакций и чистка
            </p>
          </div>
        </div>

        {/* Поиск дублей */}
        <div className="bg-[#f5f1ea] dark:bg-[#25282c] p-4 rounded-xl space-y-3 border border-transparent dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#f8e0a8] dark:bg-amber-950/60 flex items-center justify-center text-[#705c30] dark:text-amber-400 shrink-0">
                <ContentCopy size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#2e3230] dark:text-white">
                  Аудит транзакций и выявление дублей
                </div>
                <p className="text-xs text-[#4a4e4a] dark:text-gray-400">
                  Поиск случайных двойных тапов и повторов
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#4a7c59]/10 text-[#4a7c59] dark:text-emerald-400 text-[11px] font-bold">
              Активно
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenDuplicates}
            className="w-full py-2.5 px-4 rounded-xl bg-[#e4e0d8] dark:bg-white/10 text-[#2e3230] dark:text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#d4ccbf] dark:hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
          >
            <SearchCheck size={18} className="text-[#4a7c59] dark:text-emerald-400" />
            <span>Запустить аудит</span>
          </button>
        </div>

        {/* Архивация и удаление по периодам */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-[#4a4e4a] dark:text-gray-400 flex items-center gap-1">
            <FolderZip size={16} className="text-[#4a4e4a] dark:text-gray-400" />
            <span>Архивация и очистка журнала</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-[#f5f1ea] dark:bg-[#25282c] p-3 rounded-xl flex items-center justify-between border border-transparent dark:border-white/5">
              <div className="flex flex-col flex-1 mr-2">
                <span className="text-[10px] text-[#4a4e4a] dark:text-gray-400 font-semibold">С</span>
                <input
                  type="date"
                  value={archiveStart}
                  onChange={e => setArchiveStart(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#2e3230] dark:text-white font-headline focus:outline-none cursor-pointer"
                />
              </div>
              <Calendar size={18} className="text-[#4a4e4a] dark:text-gray-400 shrink-0" />
            </div>

            <div className="bg-[#f5f1ea] dark:bg-[#25282c] p-3 rounded-xl flex items-center justify-between border border-transparent dark:border-white/5">
              <div className="flex flex-col flex-1 mr-2">
                <span className="text-[10px] text-[#4a4e4a] dark:text-gray-400 font-semibold">По</span>
                <input
                  type="date"
                  value={archiveEnd}
                  onChange={e => setArchiveEnd(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#2e3230] dark:text-white font-headline focus:outline-none cursor-pointer"
                />
              </div>
              <Calendar size={18} className="text-[#4a4e4a] dark:text-gray-400 shrink-0" />
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleArchiveExport}
              className="w-full py-3 px-4 rounded-xl bg-[#f0ece4] dark:bg-white/10 text-[#4a7c59] dark:text-emerald-400 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#e4e0d8] dark:hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            >
              <FolderZip size={18} />
              <span>Архивировать в отдельный файл</span>
            </button>

            {isConfirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeletePeriod}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#b83230] text-white font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <DeleteSweep size={18} />
                  <span>Удалить {matchedCount > 0 ? `(${matchedCount})` : ''}?</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-4 py-3 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-semibold text-xs active:scale-95 transition-all cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="w-full py-3 px-4 rounded-xl bg-[#ffdad8] dark:bg-red-950/40 text-[#b83230] dark:text-red-400 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#ffdad8]/80 dark:hover:bg-red-900/50 active:scale-95 transition-all cursor-pointer"
              >
                <DeleteSweep size={18} />
                <span>Очистить историю за период</span>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BudgetSettingsSection;
