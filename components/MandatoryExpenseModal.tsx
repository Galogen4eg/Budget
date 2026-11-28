import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {useModalSurface} from '../hooks/useDialogFocus';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useModalBackHandler from '../hooks/useModalBackHandler';
import {useMobileViewport} from '../hooks/useMobileViewport';
import { X, Trash2, Edit3, Send, CheckCircle2, CheckSquare, CreditCard, Home, Link2, Info } from 'lucide-react';
import { MandatoryExpense, MandatoryExpenseType, AppSettings, FamilyMember } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatBudgetMoney } from '../utils/budgetFinancialMath';

interface MandatoryExpenseModalProps {
  expense: MandatoryExpense | null;
  onClose: () => void;
  onSave: (expense: MandatoryExpense, manuallyPaid: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  settings: AppSettings;
  selectedMonth: Date;
  members: FamilyMember[];
}

export const MandatoryExpenseModal: React.FC<MandatoryExpenseModalProps> = ({ 
  expense, 
  onClose, 
  onSave, 
  onDelete, 
  settings, 
  selectedMonth,
  members 
}) => {
  const [name, setName] = useState(() => expense?.name || '');
  const [amount, setAmount] = useState(() => expense ? String(expense.amount || '') : '');
  const [day, setDay] = useState(() => expense ? String(expense.day || '1') : '10');
  const [remind, setRemind] = useState(() => expense?.remind ?? true);
  const [memberId, setMemberId] = useState(() => expense?.memberId || '');
  const [expenseType, setExpenseType] = useState<MandatoryExpenseType>(() => expense?.expenseType || (expense?.linkedDebtId ? 'debt' : 'regular'));
  const [linkedDebtId, setLinkedDebtId] = useState<string>(() => expense?.linkedDebtId || '');
  const [isPaidCurrentMonth, setIsPaidCurrentMonth] = useState(() => {
    if (!expense) return false;
    const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
    return (settings.manualPaidExpenses?.[monthKey] || []).includes(expense.id);
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const requestClose=()=>{if(!isSaving)onClose();};
  // The modal surface must capture the opener before focusing this dialog.
  // Native/React autoFocus on an input would replace that opener during mount.
  const surface=useModalSurface(requestClose,{initialSelector:'[aria-label="Закрыть"]'});
  useBodyScrollLock();
  useModalBackHandler(true,requestClose);
  const viewport=useMobileViewport();

  const { debts } = useData();
  const { user: firebaseUser } = useAuth();
  
  const currentMonthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthName = selectedMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (expense) {
      setName(expense.name || '');
      setAmount(String(expense.amount || ''));
      setDay(String(expense.day || '1'));
      setRemind(expense.remind ?? true);
      setMemberId(expense.memberId || members[0]?.id || '');
      
      const inferredType: MandatoryExpenseType = expense.expenseType 
        ? expense.expenseType 
        : (expense.linkedDebtId ? 'debt' : 'regular');
      setExpenseType(inferredType);
      setLinkedDebtId(expense.linkedDebtId || '');

      const paidList = settings.manualPaidExpenses?.[currentMonthKey] || [];
      setIsPaidCurrentMonth(paidList.includes(expense.id));
    } else {
      setName('');
      setAmount('');
      setDay('10');
      setRemind(true);
      setExpenseType('regular');
      setLinkedDebtId('');
      const myMember = members.find(m => m.userId === firebaseUser?.uid);
      setMemberId(myMember?.id || members[0]?.id || '');
      setIsPaidCurrentMonth(false);
    }
  }, [expense, members, firebaseUser, settings.manualPaidExpenses, currentMonthKey]);

  const handleDebtChange = (selectedId: string) => {
    setLinkedDebtId(selectedId);
    if (!selectedId) return;

    const targetDebt = debts.find(d => d.id === selectedId);
    if (targetDebt) {
      if (!name.trim()) {
        setName(targetDebt.name);
      }
      if (!amount || amount === '0') {
        const payment = targetDebt.monthlyPayment || targetDebt.minPayment;
        if (payment) setAmount(String(payment));
      }
      if (targetDebt.paymentDay) {
        setDay(String(targetDebt.paymentDay));
      } else if (targetDebt.dueDate) {
        const parsedDay = new Date(targetDebt.dueDate).getDate();
        if (!isNaN(parsedDay)) setDay(String(parsedDay));
      }
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSaving) return;
    setFormError('');
    const normalizedAmount = String(amount).trim().replace(',', '.');
    const parsedAmount = Number(normalizedAmount);
    const parsedDay = Number(day);
    if (!name.trim() || !/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount) || !Number.isFinite(parsedAmount) || parsedAmount <= 0 ||
        !Number.isSafeInteger(Math.round(parsedAmount * 100)) ||
        Math.abs(parsedAmount * 100 - Math.round(parsedAmount * 100)) > 0.000001 ||
        !Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setFormError('Укажите название, сумму больше нуля с точностью до копейки и день от 1 до 31.');
      return;
    }

    const expenseId = expense?.id || Date.now().toString();
    const isDebt = expenseType === 'debt';
    const updatedExpense: MandatoryExpense = {
      id: expenseId,
      name: name.trim(),
      amount: Math.round(parsedAmount * 100) / 100,
      day: parsedDay,
      remind,
      memberId: memberId || null,
      keywords: expense?.keywords || (isDebt ? [name.trim().toLowerCase()] : []),
      expenseType,
      linkedDebtId: isDebt && linkedDebtId ? linkedDebtId : null
    };

    setIsSaving(true);
    try {
      // Parent commits payment settings and related debt data before closing.
      await onSave(updatedExpense, isPaidCurrentMonth);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось сохранить платёж. Повторите попытку.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expense || !onDelete || isSaving) return;
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    setFormError('');
    setIsSaving(true);
    try {
      await onDelete(expense.id);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось удалить платёж. Повторите попытку.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedDebt = debts.find(d => d.id === linkedDebtId);

  return createPortal(
    <div 
      className="fixed inset-0 z-[2000] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={viewport.height===null?undefined:{height:viewport.height,bottom:'auto'}}
      onClick={() => { if (!isSaving) onClose(); }}
      role="presentation"
    >
      <div {...surface} role="dialog" aria-modal="true" aria-busy={isSaving} aria-label={expense?'Редактирование платежа':'Новый обязательный платёж'} data-testid="terra-mandatory-dialog"
        className="relative w-full max-w-[490px] h-full sm:h-auto max-h-full sm:max-h-[92dvh] bg-[var(--terra-surface)] rounded-none sm:rounded-2xl shadow-lg p-3 sm:p-4 flex flex-col gap-3 text-stone-900 dark:text-white border-0 sm:border border-[var(--terra-border)] animate-in fade-in duration-200 motion-reduce:animate-none overflow-y-auto overscroll-y-contain pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        onClick={e => e.stopPropagation()}
      >
        {/* Заголовок модального окна */}
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xl font-headline font-bold tracking-tight text-stone-900 dark:text-white">
            {expense ? 'Редактирование платежа' : 'Новый обязательный платёж'}
          </h2>
          <button 
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Закрыть" 
            className="w-11 h-11 shrink-0 rounded-full bg-stone-200/70 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 flex items-center justify-center text-stone-600 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Форма редактирования */}
        <form className="flex flex-col gap-3 min-w-0" onSubmit={handleSave}>

          {/* Выбор типа обязательства: Обычный или Долг */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--terra-muted)]">
              Тип платежа
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--terra-soft)] rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setExpenseType('regular');
                  setLinkedDebtId('');
                }} aria-pressed={expenseType==='regular'}
                className={`min-h-[44px] min-w-0 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  expenseType === 'regular'
                    ? 'bg-[var(--terra-surface)] text-[var(--terra-primary-text)]'
                    : 'text-stone-500 dark:text-gray-400 hover:text-stone-900'
                }`}
              >
                <Home size={15} className={expenseType === 'regular' ? 'text-[#4A7C59]' : ''} />
                <span>Бытовой (ЖКХ, связь)</span>
              </button>

              <button
                type="button"
                onClick={() => setExpenseType('debt')} aria-pressed={expenseType==='debt'}
                className={`min-h-[44px] min-w-0 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  expenseType === 'debt'
                    ? 'bg-[var(--terra-surface)] text-[var(--terra-primary-text)]'
                    : 'text-stone-500 dark:text-gray-400 hover:text-stone-900'
                }`}
              >
                <CreditCard size={15} className={expenseType === 'debt' ? 'text-[var(--terra-muted)]' : ''} />
                <span>Кредит / Долг</span>
              </button>
            </div>
          </div>

          {/* Привязка к долгу, если выбран тип "debt" */}
          {expenseType === 'debt' && (
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5" htmlFor="linkedDebtSelect">
                  <Link2 size={14} />
                  <span>Связать с долгом из сервиса «Долги»</span>
                </label>
              </div>

              {debts.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  В сервисе «Долги» пока нет активных обязательств. Платёж будет учитываться как долговой.
                </p>
              ) : (
                <select
                  id="linkedDebtSelect"
                  value={linkedDebtId}
                  onChange={e => handleDebtChange(e.target.value)}
                  className="w-full bg-[var(--terra-soft)] text-stone-900 dark:text-white font-semibold text-sm px-3.5 py-2.5 rounded-xl border border-amber-300/70 dark:border-amber-900/60 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                >
                  <option value="">-- Выберите долг для синхронизации --</option>
                  {debts.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} (остаток: {settings.privacyMode?'•••':formatBudgetMoney(d.currentBalance ?? d.totalAmount)} ₽, взнос: {settings.privacyMode?'•••':formatBudgetMoney(d.monthlyPayment || 0)} ₽)
                    </option>
                  ))}
                </select>
              )}

              {selectedDebt && (
                <div className="flex items-start gap-2 pt-1 text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>
                    При оплате этого платежа (операцией или вручную) статус в карточке долга <strong>«{selectedDebt.name}»</strong> отметится как оплаченный.
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Поле: НАЗВАНИЕ */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--terra-muted)]" htmlFor="paymentName">
              Название
            </label>
            <div className="relative flex items-center">
              <input 
                id="paymentName" 
                name="paymentName" 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder={expenseType === 'debt' ? 'Ипотека, автокредит, кредитка...' : 'ЖКХ, интернет, аренда, связь...'} 
                className="w-full min-w-0 min-h-[44px] bg-[var(--terra-surface)] text-[var(--terra-ink)] font-medium text-sm px-3 py-2 rounded-xl border border-[var(--terra-border)]  focus:outline-none focus:ring-2 focus:ring-[var(--terra-focus)] transition-colors pr-10"
              />
              <span className="absolute right-3.5 text-stone-400">
                <Edit3 size={18} />
              </span>
            </div>
          </div>

          {/* Две колонки: СУММА & ДЕНЬ МЕСЯЦА */}
          <div className="grid grid-cols-2 gap-2">
            {/* Колонка 1: СУММА */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--terra-muted)]" htmlFor="paymentAmount">
                Сумма
              </label>
              <div className="relative flex items-center">
                <input 
                  id="paymentAmount" 
                  name="paymentAmount" 
                  type="text" inputMode="decimal"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full min-w-0 min-h-[44px] bg-[var(--terra-surface)] text-[var(--terra-ink)] tabular-nums font-semibold text-base px-3 py-2 rounded-xl border border-[var(--terra-border)]  focus:outline-none focus:ring-2 focus:ring-[var(--terra-focus)] transition-colors pr-8"
                />
                <span className="absolute right-3.5 font-headline font-bold text-sm text-stone-400">₽</span>
              </div>
            </div>

            {/* Колонка 2: ДЕНЬ МЕСЯЦА */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--terra-muted)]" htmlFor="paymentDay">
                День месяца
              </label>
              <div className="relative flex items-center">
                <input 
                  id="paymentDay" 
                  name="paymentDay" 
                  type="number" 
                  min="1" 
                  max="31" 
                  value={day} 
                  onChange={e => setDay(e.target.value)}
                  className="w-full min-w-0 min-h-[44px] bg-[var(--terra-surface)] text-[var(--terra-ink)] tabular-nums font-semibold text-base px-3 py-2 rounded-xl border border-[var(--terra-border)]  text-left focus:outline-none focus:ring-2 focus:ring-[var(--terra-focus)] transition-colors min-w-0"
                />
              </div>
            </div>
          </div>

          {/* Секция: КТО ПЛАТИТ? */}
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs font-semibold text-[var(--terra-muted)]">Кто платит?</span>
            <div role="group" aria-label="Кто платит?" className="grid grid-cols-2 gap-2 min-w-0">
              {members.map(m => {
                const isSelected = memberId === m.id;
                const initial = m.name ? m.name.charAt(0).toUpperCase() : 'У';
                return (
                  <button type="button" key={m.id} disabled={isSaving}
                    aria-pressed={isSelected} onClick={() => setMemberId(m.id)}
                    className={`min-h-[44px] min-w-0 flex items-center gap-2 px-2 py-2 rounded-xl border text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] ${isSelected?'bg-[var(--terra-primary-soft)] border-[var(--terra-primary-text)] text-[var(--terra-primary-text)]':'bg-[var(--terra-surface)] border-[var(--terra-control-border)] text-[var(--terra-ink)]'}`}>
                    <span aria-hidden="true" className="w-6 h-6 rounded-full bg-[var(--terra-soft)] text-[var(--terra-ink)] text-xs font-semibold shrink-0 flex items-center justify-center">{initial}</span>
                    <span data-payment-member-name className="min-w-0 flex-1 text-sm font-semibold [overflow-wrap:anywhere]">{m.name}</span>
                    {isSelected&&<CheckCircle2 size={14} className="shrink-0" aria-hidden="true"/>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Переключатель 1: Напоминать в Telegram */}
          <button
            type="button"
            aria-pressed={remind}
            onClick={() => setRemind(!remind)}
            className="w-full min-h-[44px] text-left bg-[var(--terra-surface)] rounded-xl p-3 border border-[var(--terra-border)] flex items-center justify-between gap-2 cursor-pointer group hover:border-[var(--terra-control-border)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--terra-soft)] dark:bg-white/5 flex items-center justify-center text-[#4A7C59] group-hover:bg-[#4A7C59] group-hover:text-white transition-colors">
                <Send size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-900 dark:text-white">Напоминать в Telegram</div>
                <div className="text-xs text-[var(--terra-muted)]">За 1 день до оплаты</div>
              </div>
            </div>
            
            <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              remind ? 'bg-[#4A7C59]' : 'bg-stone-300 dark:bg-stone-700'
            }`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                remind ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </button>

          {/* Ручное закрытие обязательства — не банковская операция. */}
          <button
            type="button"
            aria-pressed={isPaidCurrentMonth}
            onClick={() => setIsPaidCurrentMonth(!isPaidCurrentMonth)}
            disabled={isSaving}
            className="w-full min-h-[44px] text-left bg-[var(--terra-surface)] rounded-xl p-3 border border-[var(--terra-border)] flex items-center justify-between gap-2 cursor-pointer group hover:border-[var(--terra-control-border)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--terra-soft)] dark:bg-white/5 flex items-center justify-center text-stone-500 group-hover:bg-[#4A7C59] group-hover:text-white transition-colors">
                <CheckSquare size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-900 dark:text-white">Отметить оплаченным вручную</div>
                <div className="text-xs text-[var(--terra-muted)]">{monthName}. Не создаёт расходную операцию</div>
              </div>
            </div>

            <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isPaidCurrentMonth ? 'bg-[#4A7C59]' : 'bg-stone-300 dark:bg-stone-700'
            }`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isPaidCurrentMonth ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </button>

          {/* Кнопки действий */}
          <div className="flex flex-col gap-2 pt-2">
            {formError && <p role="alert" className="text-xs text-[var(--terra-danger-text)]">{formError}</p>}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full min-h-[44px] font-semibold py-3 px-6 rounded-xl transition-colors text-sm bg-[var(--terra-primary-solid)] hover:bg-[var(--terra-primary-hover)] text-[var(--terra-on-primary)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] disabled:opacity-60 disabled:cursor-wait"
            >
              {isSaving ? 'Сохранение…' : expense ? 'Сохранить изменения' : 'Добавить платёж'}
            </button>

            {expense && onDelete && (
              !isConfirmingDelete ? (
                <button 
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-1.5 min-h-[44px] py-2.5 text-sm font-semibold text-[var(--terra-danger-text)] hover:bg-[var(--terra-danger-soft)] rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                  <span>Удалить платеж</span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-1 animate-in fade-in">
                  <button 
                    type="button"
                    onClick={handleDelete}
                  disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2.5 text-sm font-semibold text-[var(--terra-on-danger)] bg-[var(--terra-danger-solid)] hover:bg-[var(--terra-danger-hover)] rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                    <span>Подтвердить удаление</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="min-h-[44px] py-2.5 px-3 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              )
            )}
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};

export default MandatoryExpenseModal;
