
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Lock, PiggyBank, Receipt, CalendarClock, AlertCircle, Save, CheckCircle2, Circle, Coins } from 'lucide-react';
import { MandatoryExpense, AppSettings } from '../types';
import { useData } from '../contexts/DataContext';

interface ReserveDetailsModalProps {
  onClose: () => void;
  totalReserved: number;
  savingsAmount: number;
  manualReservedAmount: number;
  mandatoryAmount: number;
  availableForSavings: number;
  settings: AppSettings;
  savingsRate: number;
  futureExpenses: { expense: MandatoryExpense; amountNeeded: number; isManuallyPaid: boolean }[];
  onUpdateManualSavings: (amount: number) => void;
  onTogglePaid: (expenseId: string, isPaid: boolean) => void;
}

const ReserveDetailsModal: React.FC<ReserveDetailsModalProps> = ({ 
    onClose, totalReserved, savingsAmount, manualReservedAmount, mandatoryAmount, availableForSavings,
    settings, savingsRate, futureExpenses, onUpdateManualSavings, onTogglePaid
}) => {
  const currentMonthName = new Date().toLocaleString('ru-RU', { month: 'long' });
  const [editingManual, setEditingManual] = useState(false);
  const [manualInput, setManualInput] = useState(manualReservedAmount.toString());

  const handleManualSave = () => {
      const val = parseFloat(manualInput.replace(',', '.'));
      if (!isNaN(val)) {
          onUpdateManualSavings(val);
      }
      setEditingManual(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-[#1C1C1E]/40 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        exit={{ y: '100%' }} 
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg md:rounded-[3rem] rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-white dark:bg-[#1C1C1E] p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-500">
                  <Lock size={24} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-[#1C1C1E] dark:text-white leading-none">Структура резерва</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Почему эти деньги недоступны</p>
              </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-white hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar">
            
            {/* Total Block */}
            <div className="bg-indigo-500 text-white p-6 rounded-[2.5rem] text-center shadow-lg shadow-indigo-500/30 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 block">Всего в резерве</span>
                <span className="text-4xl font-black tabular-nums">{Math.round(totalReserved).toLocaleString()} {settings.currency}</span>
            </div>

            {/* Breakdown Grid (2x2) */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 shrink-0">
                {/* 1. Auto Savings */}
                <div className="bg-white dark:bg-[#1C1C1E] p-4 md:p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <PiggyBank size={16} className="text-purple-500" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Авто-копилка</span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-[#1C1C1E] dark:text-white tabular-nums">{Math.round(savingsAmount).toLocaleString()}</div>
                    <div className="text-[9px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-lg w-fit mt-1">
                        {savingsRate}%
                    </div>
                </div>

                {/* 2. Mandatory Payments */}
                <div className="bg-white dark:bg-[#1C1C1E] p-4 md:p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Receipt size={16} className="text-red-500" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">К оплате</span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-[#1C1C1E] dark:text-white tabular-nums">{Math.round(mandatoryAmount).toLocaleString()}</div>
                    <div className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg w-fit mt-1">
                        Обязательные
                    </div>
                </div>

                {/* 3. Manual Savings (Editable) */}
                <div className="bg-white dark:bg-[#1C1C1E] p-4 md:p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Save size={16} className="text-green-500" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Отложено</span>
                    </div>
                    {editingManual ? (
                        <input 
                            autoFocus
                            type="number" 
                            value={manualInput} 
                            onChange={e => setManualInput(e.target.value)}
                            onBlur={handleManualSave}
                            onKeyDown={e => e.key === 'Enter' && handleManualSave()}
                            className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-1 rounded-lg font-black text-xl outline-none"
                        />
                    ) : (
                        <div onClick={() => setEditingManual(true)} className="text-xl md:text-2xl font-black text-[#1C1C1E] dark:text-white tabular-nums cursor-text border-b border-dashed border-gray-300 dark:border-white/20 pb-0.5 inline-block">
                            {Math.round(manualReservedAmount).toLocaleString()}
                        </div>
                    )}
                    <div className="text-[9px] font-bold text-green-500 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-lg w-fit mt-1">
                        Вручную
                    </div>
                </div>

                {/* 4. Available for Savings (Calculated) */}
                <div className="bg-white dark:bg-[#1C1C1E] p-4 md:p-5 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-xl -mr-4 -mt-4 pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <Coins size={16} className="text-blue-500" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Свободно</span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-[#1C1C1E] dark:text-white tabular-nums relative z-10">{Math.round(availableForSavings).toLocaleString()}</div>
                    <div className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg w-fit mt-1 relative z-10">
                        Можно в копилку
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl flex gap-3 items-start border border-gray-100 dark:border-white/5 shrink-0">
                <AlertCircle size={20} className="text-gray-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-500 leading-relaxed">
                    Блок "Свободно" показывает остаток средств после вычета всех резервов (Авто + Обязательные + Отложено). Эту сумму безопасно перевести в копилку.
                </p>
            </div>

            {/* Future Expenses List */}
            {futureExpenses.length > 0 && (
                <div className="space-y-3 pb-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Обязательные платежи:</h4>
                    {futureExpenses.map((item, idx) => {
                        const today = new Date().getDate();
                        const isOverdue = !item.isManuallyPaid && item.expense.day < today && item.amountNeeded > 0;
                        const isToday = item.expense.day === today;
                        const isPaid = item.amountNeeded <= 0;
                        
                        return (
                            <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isPaid ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : isOverdue ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-[#1C1C1E] border-gray-50 dark:border-white/5'}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button 
                                        onClick={() => onTogglePaid(item.expense.id, !item.isManuallyPaid)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${item.isManuallyPaid || isPaid ? 'text-green-500 bg-white dark:bg-[#1C1C1E] shadow-sm' : 'text-gray-300 dark:text-gray-600 hover:text-green-500'}`}
                                        title={item.isManuallyPaid ? "Снять отметку" : "Отметить как оплаченное"}
                                    >
                                        {item.isManuallyPaid ? <CheckCircle2 size={24} fill="currentColor" className="text-green-500" /> : <Circle size={24} strokeWidth={1.5} />}
                                    </button>
                                    <div className="min-w-0">
                                        <div className={`text-xs font-bold truncate ${isPaid ? 'text-green-700 dark:text-green-400' : 'text-[#1C1C1E] dark:text-white'}`}>{item.expense.name}</div>
                                        <div className={`text-[10px] font-bold flex items-center gap-1 ${isPaid ? 'text-green-600/70 dark:text-green-500/70' : isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                            {isPaid ? (
                                                item.isManuallyPaid ? 'Отмечено вручную' : 'Оплачено'
                                            ) : (
                                                <>
                                                    <CalendarClock size={10} />
                                                    {isOverdue ? 'Просрочено' : isToday ? 'Сегодня' : `До ${item.expense.day} ${currentMonthName}`}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-sm font-black tabular-nums pl-2 ${isPaid ? 'text-green-700 dark:text-green-400' : 'text-[#1C1C1E] dark:text-white'}`}>
                                    {item.expense.amount.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default ReserveDetailsModal;
