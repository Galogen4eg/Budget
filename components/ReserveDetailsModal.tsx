
import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Lock, PiggyBank, Receipt, CalendarClock, CheckCircle2, AlertCircle } from 'lucide-react';
import { MandatoryExpense, AppSettings } from '../types';

interface ReserveDetailsModalProps {
  onClose: () => void;
  totalReserved: number;
  savingsAmount: number;
  mandatoryAmount: number;
  settings: AppSettings;
  savingsRate: number;
  futureExpenses: { expense: MandatoryExpense; amountNeeded: number }[];
}

const ReserveDetailsModal: React.FC<ReserveDetailsModalProps> = ({ 
    onClose, totalReserved, savingsAmount, mandatoryAmount, 
    settings, savingsRate, futureExpenses 
}) => {
  const currentMonthName = new Date().toLocaleString('ru-RU', { month: 'long' });

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
        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-md md:rounded-[3rem] rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            
            {/* Total Block */}
            <div className="bg-indigo-500 text-white p-6 rounded-[2.5rem] text-center shadow-lg shadow-indigo-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 block">Всего в резерве</span>
                <span className="text-4xl font-black tabular-nums">{Math.round(totalReserved).toLocaleString()} {settings.currency}</span>
            </div>

            {/* Breakdown Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <PiggyBank size={18} className="text-purple-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Копилка</span>
                    </div>
                    <div className="text-2xl font-black text-[#1C1C1E] dark:text-white tabular-nums">{Math.round(savingsAmount).toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-lg w-fit mt-2">
                        {savingsRate}% от баланса
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Receipt size={18} className="text-red-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Платежи</span>
                    </div>
                    <div className="text-2xl font-black text-[#1C1C1E] dark:text-white tabular-nums">{Math.round(mandatoryAmount).toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg w-fit mt-2">
                        Обязательные
                    </div>
                </div>
            </div>

            {/* Smart Reserve Info */}
            <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl flex gap-3 items-start border border-gray-100 dark:border-white/5">
                <AlertCircle size={20} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-bold text-[#1C1C1E] dark:text-white mb-1">Как работает Умный резерв?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                        Мы вычитаем из доступного бюджета сумму неоплаченных обязательных расходов, срок которых наступает сегодня или в будущем до конца месяца.
                    </p>
                </div>
            </div>

            {/* Future Expenses List */}
            {futureExpenses.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">На что отложено:</h4>
                    {futureExpenses.map((item, idx) => {
                        const today = new Date().getDate();
                        const isOverdue = item.expense.day < today;
                        const isToday = item.expense.day === today;
                        
                        return (
                            <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${isOverdue ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-[#1C1C1E] border-gray-50 dark:border-white/5'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${isOverdue ? 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-white' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 dark:text-gray-300'}`}>
                                        <span className="text-[8px] font-black uppercase">Число</span>
                                        <span className="text-sm font-black leading-none">{item.expense.day}</span>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-[#1C1C1E] dark:text-white">{item.expense.name}</div>
                                        <div className={`text-[10px] font-bold flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                            <CalendarClock size={10} />
                                            {isOverdue ? 'Просрочено' : isToday ? 'Оплатить сегодня' : `Оплатить до ${item.expense.day} ${currentMonthName}`}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-[#1C1C1E] dark:text-white tabular-nums">
                                    {item.amountNeeded.toLocaleString()} {settings.currency}
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
