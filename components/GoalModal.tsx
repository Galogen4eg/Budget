
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Trash2, Plus, Minus, Target } from 'lucide-react';
import { SavingsGoal, AppSettings } from '../types';
import { getIconById } from '../constants';
import { toast } from 'sonner';

interface GoalModalProps {
  goal: SavingsGoal | null;
  onClose: () => void;
  onSave: (goal: SavingsGoal) => void;
  onDelete?: (id: string) => void;
  settings: AppSettings;
}

const PRESET_ICONS = [
  'Plane', 'Car', 'Home', 'ShoppingBag', 'Heart', 
  'Zap', 'Briefcase', 'PiggyBank', 'Coffee', 'Tv',
  'Shirt', 'Music', 'Gamepad2', 'Baby', 'Dog', 'Cat', 
  'Flower2', 'Hammer', 'Wrench', 'BookOpen', 'GraduationCap', 
  'Palmtree', 'Gift', 'Smartphone', 'Wifi', 'Scissors', 'Bike'
];

const PRESET_COLORS = [
  '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', 
  '#FF3B30', '#5856D6', '#00C7BE', '#FFCC00', '#5AC8FA'
];

const GoalModal: React.FC<GoalModalProps> = ({ goal, onClose, onSave, onDelete, settings }) => {
  const [title, setTitle] = useState(goal?.title || '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount.toString() || '');
  const [icon, setIcon] = useState(goal?.icon || 'PiggyBank');
  const [color, setColor] = useState(goal?.color || PRESET_COLORS[0]);

  const handleSave = () => {
    if (!title.trim() || !targetAmount) {
      toast.warning("Заполните название и целевую сумму");
      return;
    }

    onSave({
      id: goal?.id || Date.now().toString(),
      title: title.trim(),
      targetAmount: Math.abs(Number(targetAmount)),
      currentAmount: Math.abs(Number(currentAmount)) || 0,
      icon,
      color
    });
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 32, stiffness: 350 }}
        className="relative bg-[#FAF8F5] dark:bg-[#1C1C1E] w-full max-w-lg h-[100dvh] md:h-auto max-h-[100dvh] md:max-h-[90vh] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="bg-white dark:bg-[#1C1C1E] p-5 sm:p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/10">
          <h2 className="text-xl font-headline font-bold text-gray-900 dark:text-white">{goal ? 'Редактировать цель' : 'Новая цель'}</h2>
          <button onClick={onClose} className="w-9 h-9 bg-gray-100 dark:bg-white/10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer active:scale-95 transition">
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-6 overflow-y-auto no-scrollbar pb-10">
          <div className="bg-white dark:bg-[#252528] p-5 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs space-y-3 text-center">
            <div 
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md mb-2"
              style={{ backgroundColor: color }}
            >
              {getIconById(icon, 32)}
            </div>
            <input
              type="text"
              placeholder="Название цели (напр. Отпуск)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-headline font-bold text-center outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white dark:bg-[#252528] p-4 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 block">Цель ({settings.currency})</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0"
                className="w-full font-headline font-bold text-lg outline-none bg-transparent text-gray-900 dark:text-white"
              />
            </div>
            <div className="bg-white dark:bg-[#252528] p-4 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 block">Уже есть</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="w-full font-headline font-bold text-lg outline-none bg-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">Иконка</span>
            <div className="flex flex-wrap gap-2.5 px-0.5">
              {PRESET_ICONS.map(i => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${icon === i ? 'bg-[#4A7C59] text-white scale-105 shadow-sm' : 'bg-white dark:bg-[#252528] text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-200/80 dark:border-white/10'}`}
                >
                  {getIconById(i, 20)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">Цвет</span>
            <div className="flex flex-wrap gap-3 px-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${color === c ? 'border-gray-900 dark:border-white scale-125 shadow-xs' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={handleSave}
              className="w-full bg-[#4A7C59] hover:bg-[#3D6649] text-white font-bold py-3.5 rounded-2xl shadow-sm text-xs uppercase tracking-wider active:scale-[0.98] transition cursor-pointer"
            >
              {goal ? 'Обновить цель' : 'Создать цель'}
            </button>
            {goal && onDelete && (
              <button
                onClick={() => onDelete(goal.id)}
                className="w-full py-2.5 text-rose-500 font-bold text-xs uppercase tracking-wider hover:text-rose-600 transition cursor-pointer"
              >
                Удалить цель
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GoalModal;
