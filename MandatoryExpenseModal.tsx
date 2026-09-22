import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Trash2, Edit3, Send, CheckCircle2, CheckSquare } from 'lucide-react';
import { MandatoryExpense, AppSettings, FamilyMember } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

interface MandatoryExpenseModalProps {
  expense: MandatoryExpense | null;
  onClose: () => void;
  onSave: (expense: MandatoryExpense) => void;
  onDelete?: (id: string) => void;
  settings: AppSettings;
  members: FamilyMember[];
}

export const MandatoryExpenseModal: React.FC<MandatoryExpenseModalProps> = ({ 
  expense, 
  onClose, 
  onSave, 
  onDelete, 
  settings, 
  members 
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [remind, setRemind] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [isPaidCurrentMonth, setIsPaidCurrentMonth] = useState(false);
  const [isSavedAnimation, setIsSavedAnimation] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const { updateSettings } = useData();
  const { user: firebaseUser } = useAuth();
  
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = now.toLocaleString('ru-RU', { month: 'long' });

  useEffect(() => {
    if (expense) {
      setName(expense.name || '');
      setAmount(String(expense.amount || ''));
      setDay(String(expense.day || '1'));
      setRemind(expense.remind ?? true);
      setMemberId(expense.memberId || members[0]?.id || '');
      const paidList = settings.manualPaidExpenses?.[currentMonthKey] || [];
      setIsPaidCurrentMonth(paidList.includes(expense.id));
    } else {
      setName('');
      setAmount('');
      setDay('10');
      setRemind(true);
      const myMember = members.find(m => m.userId === firebaseUser?.uid);
      setMemberId(myMember?.id || members[0]?.id || '');
      setIsPaidCurrentMonth(false);
    }
  }, [expense, members, firebaseUser, settings.manualPaidExpenses, currentMonthKey]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || !amount || !day) return;

    const expenseId = expense?.id || Date.now().toString();
    const updatedExpense: MandatoryExpense = {
      id: expenseId,
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      day: Math.max(1, Math.min(31, parseInt(day) || 1)),
      remind,
      memberId: memberId || null,
      keywords: expense?.keywords || []
    };

    // Синхронизация статуса оплаты за текущий месяц
    const currentManuals = settings.manualPaidExpenses || {};
    const monthIds = currentManuals[currentMonthKey] || [];
    let newMonthIds = monthIds;

    if (isPaidCurrentMonth) {
      if (!monthIds.includes(expenseId)) {
        newMonthIds = [...monthIds, expenseId];
      }
    } else {
      newMonthIds = monthIds.filter(id => id !== expenseId);
    }

    if (newMonthIds !== monthIds) {
      await updateSettings({
        ...settings,
        manualPaidExpenses: {
          ...currentManuals,
          [currentMonthKey]: newMonthIds
        }
      });
    }

    setIsSavedAnimation(true);
    setTimeout(() => {
      onSave(updatedExpense);
    }, 250);
  };

  const handleDelete = () => {
    if (!expense || !onDelete) return;
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    onDelete(expense.id);
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[2000] bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 select-none"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[490px] bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-2xl shadow-[0_20px_60px_rgba(46,50,48,0.18)] p-6 sm:p-7 flex flex-col gap-5 text-stone-900 dark:text-white border border-[#ECE6DE] dark:border-white/10 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Заголовок модального окна */}
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xl font-headline font-bold tracking-tight text-stone-900 dark:text-white">
            {expense ? 'Редактирование платежа' : 'Новый регулярный платёж'}
          </h2>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Закрыть" 
            className="w-8 h-8 rounded-full bg-stone-200/70 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 flex items-center justify-center text-stone-600 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Форма редактирования */}
        <form className="flex flex-col gap-4" onSubmit={handleSave}>
          
          {/* Поле: НАЗВАНИЕ */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-stone-500 dark:text-gray-400 uppercase tracking-wider" htmlFor="paymentName">
              Название
            </label>
            <div className="relative flex items-center">
              <input 
                id="paymentName" 
                name="paymentName" 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="Название платежа (напр. Ипотека, Телефон...)" 
                autoFocus
                className="w-full bg-white dark:bg-[#252528] text-stone-900 dark:text-white font-semibold text-base px-4 py-3 rounded-xl border border-[#ECE6DE] dark:border-white/10 shadow-[0_1px_4px_rgba(46,50,48,0.04)] focus:outline-none focus:ring-2 focus:ring-[#4A7C59] transition-all pr-10"
              />
              <span className="absolute right-3.5 text-stone-400">
                <Edit3 size={18} />
              </span>
            </div>
          </div>

          {/* Две колонки: СУММА & ДЕНЬ МЕСЯЦА */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Колонка 1: СУММА */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-stone-500 dark:text-gray-400 uppercase tracking-wider" htmlFor="paymentAmount">
                Сумма
              </label>
              <div className="relative flex items-center">
                <input 
                  id="paymentAmount" 
                  name="paymentAmount" 
                  type="number" 
                  step="any"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white dark:bg-[#252528] text-stone-900 dark:text-white font-headline font-bold text-lg px-4 py-3 rounded-xl border border-[#ECE6DE] dark:border-white/10 shadow-[0_1px_4px_rgba(46,50,48,0.04)] focus:outline-none focus:ring-2 focus:ring-[#4A7C59] transition-all pr-8"
                />
                <span className="absolute right-3.5 font-headline font-bold text-sm text-stone-400">₽</span>
              </div>
            </div>

            {/* Колонка 2: ДЕНЬ МЕСЯЦА */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-stone-500 dark:text-gray-400 uppercase tracking-wider" htmlFor="paymentDay">
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
                  className="w-full bg-white dark:bg-[#252528] text-stone-900 dark:text-white font-headline font-bold text-lg px-4 py-3 rounded-xl border border-[#ECE6DE] dark:border-white/10 shadow-[0_1px_4px_rgba(46,50,48,0.04)] text-center focus:outline-none focus:ring-2 focus:ring-[#4A7C59] transition-all pr-12"
                />
                <span className="absolute right-3 text-stone-400 text-xs font-semibold">число</span>
              </div>
            </div>
          </div>

          {/* Секция: КТО ПЛАТИТ? */}
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-[11px] font-bold text-stone-500 dark:text-gray-400 uppercase tracking-wider">
              Кто платит?
            </span>
            <div className={`grid ${members.length > 2 ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
              {members.map(m => {
                const isSelected = memberId === m.id;
                const initial = m.name ? m.name.charAt(0).toUpperCase() : 'У';
                
                return (
                  <label 
                    key={m.id}
                    onClick={() => setMemberId(m.id)}
                    className={`relative flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-[#252528] cursor-pointer hover:bg-stone-50 dark:hover:bg-[#2A2A2D] transition-all shadow-[0_1px_4px_rgba(46,50,48,0.04)] border ${
                      isSelected 
                        ? 'border-[#4A7C59] ring-2 ring-[#4A7C59]/20' 
                        : 'border-[#ECE6DE] dark:border-white/10'
                    }`}
                  >
                    <div 
                      className={`w-8 h-8 rounded-full font-headline font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                        isSelected 
                          ? 'bg-[#4A7C59] text-white' 
                          : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-gray-300'
                      }`}
                      style={!isSelected && m.color ? { backgroundColor: `${m.color}20`, color: m.color } : {}}
                    >
                      {initial}
                    </div>
                    <span className={`text-sm ${isSelected ? 'font-bold text-stone-900 dark:text-white' : 'font-semibold text-stone-600 dark:text-gray-300'}`}>
                      {m.name}
                    </span>
                    <div className={`ml-auto w-5 h-5 rounded-full flex items-center justify-center text-[#4A7C59] transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <CheckCircle2 size={18} />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Переключатель 1: Напоминать в Telegram */}
          <div 
            onClick={() => setRemind(!remind)}
            className="bg-white dark:bg-[#252528] rounded-xl p-3.5 border border-[#ECE6DE] dark:border-white/10 shadow-[0_1px_4px_rgba(46,50,48,0.04)] flex items-center justify-between cursor-pointer group hover:border-[#4A7C59]/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FAF8F5] dark:bg-white/5 flex items-center justify-center text-[#4A7C59] group-hover:bg-[#4A7C59] group-hover:text-white transition-colors">
                <Send size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-900 dark:text-white">Напоминать в Telegram</div>
                <div className="text-xs text-stone-400">За 1 день до оплаты</div>
              </div>
            </div>
            
            <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              remind ? 'bg-[#4A7C59]' : 'bg-stone-300 dark:bg-stone-700'
            }`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                remind ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>

          {/* Переключатель 2: Оплачено в этом месяце */}
          <div 
            onClick={() => setIsPaidCurrentMonth(!isPaidCurrentMonth)}
            className="bg-white dark:bg-[#252528] rounded-xl p-3.5 border border-[#ECE6DE] dark:border-white/10 shadow-[0_1px_4px_rgba(46,50,48,0.04)] flex items-center justify-between cursor-pointer group hover:border-[#4A7C59]/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FAF8F5] dark:bg-white/5 flex items-center justify-center text-stone-500 group-hover:bg-[#4A7C59] group-hover:text-white transition-colors">
                <CheckSquare size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-900 dark:text-white">Оплачено в этом месяце</div>
                <div className="text-xs text-stone-400 capitalize">{monthName}</div>
              </div>
            </div>

            <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isPaidCurrentMonth ? 'bg-[#4A7C59]' : 'bg-stone-300 dark:bg-stone-700'
            }`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isPaidCurrentMonth ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col gap-2 pt-2">
            <button 
              type="submit"
              className={`w-full font-bold py-3.5 px-6 rounded-xl shadow-[0_4px_20px_rgba(46,50,48,0.12)] active:scale-[0.99] transition-all text-center tracking-wider text-xs uppercase cursor-pointer flex items-center justify-center gap-2 ${
                isSavedAnimation 
                  ? 'bg-emerald-700 text-white' 
                  : 'bg-[#4A7C59] hover:bg-[#3D6B4C] text-white'
              }`}
            >
              {isSavedAnimation ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>Сохранено ✓</span>
                </>
              ) : (
                <span>{expense ? 'Сохранить изменения' : 'Добавить платеж'}</span>
              )}
            </button>

            {expense && onDelete && (
              !isConfirmingDelete ? (
                <button 
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#D95C48] hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                  <span>Удалить платеж</span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-1 animate-in fade-in">
                  <button 
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#D95C48] hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                    <span>Подтвердить удаление</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="py-2.5 px-3 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 rounded-xl transition-colors cursor-pointer"
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
