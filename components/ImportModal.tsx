
import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, FileText } from 'lucide-react';
import { Transaction, AppSettings } from '../types';

interface ImportModalProps {
  preview: Omit<Transaction, 'id'>[];
  onConfirm: () => void;
  onCancel: () => void;
  settings: AppSettings;
}

const ImportModal: React.FC<ImportModalProps> = ({ preview, onConfirm, onCancel, settings }) => {
  const totalExpense = preview
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="text-blue-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-[#1C1C1E]">Импорт данных</h2>
          <p className="text-gray-400 mt-1 font-bold text-sm uppercase tracking-wider">Найдено {preview.length} операций</p>
        </div>

        <div className="bg-gray-50 rounded-3xl p-6 mb-8 border border-gray-100">
          <div className="flex justify-between items-center py-2 border-b border-gray-100 mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Общий расход</span>
            <span className="font-black text-red-500">-{totalExpense.toLocaleString()} {settings.currency}</span>
          </div>
          <div className="max-h-40 overflow-y-auto no-scrollbar space-y-3">
            {preview.slice(0, 5).map((t, i) => (
              <div key={i} className="flex justify-between text-xs">
                <div className="flex flex-col">
                  <span className="font-bold text-[#1C1C1E] truncate max-w-[150px]">{t.note || 'Операция'}</span>
                  <span className="text-gray-400 font-medium">{new Date(t.date).toLocaleDateString()}</span>
                </div>
                <span className={`font-black ${t.type === 'expense' ? 'text-[#1C1C1E]' : 'text-green-500'}`}>
                  {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 px-6 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-colors uppercase text-xs tracking-widest"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 px-6 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
          >
            <Check size={18} />
            Загрузить
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ImportModal;
