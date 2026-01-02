
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Trash2, Plus, Minus, Target } from 'lucide-react';
import { SavingsGoal, AppSettings } from '../types';
import { getIconById } from '../constants';

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
      alert("Заполните название и целевую сумму");
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
        className="relative bg-[#F2F2F7] w-full max-w-lg md:rounded-[3.5rem] rounded-t-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-white p-7 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-xl font-black text-[#1C1C1E]">{goal ? 'Редактировать цель' : 'Новая цель'}</h2>
          <button onClick={onClose} className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 ios-btn-active">
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto no-scrollbar pb-12">
          <div className="bg-white p-6 rounded-[2.5rem] border border-white shadow-sm space-y-4 text-center">
            <div 
              className="w-20 h-20 rounded-[2rem] mx-auto flex items-center justify-center text-white shadow-xl mb-4"
              style={{ backgroundColor: color }}
            >
              {getIconById(icon, 40)}
            </div>
            <input
              type="text"
              placeholder="Название цели (напр. Отпуск)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-black text-center outline-none bg-transparent text-[#1C1C1E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Цель ({settings.currency})</span>
              <input
                type="number"
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0"
                className="w-full font-black text-xl outline-none text-[#1C1C1E]"
              />
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Уже есть</span>
              <input
                type="number"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="w-full font-black text-xl outline-none text-[#1C1C1E]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Иконка</span>
            <div className="flex flex-wrap gap-3 px-1">
              {PRESET_ICONS.map(i => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${icon === i ? 'bg-blue-500 text-white scale-110 shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                >
                  {getIconById(i, 20)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Цвет</span>
            <div className="flex flex-wrap gap-4 px-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-4 transition-transform ${color === c ? 'border-white scale-125 shadow-md' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleSave}
              className="w-full bg-blue-500 text-white font-black py-6 rounded-[2.5rem] shadow-xl text-xs uppercase tracking-widest active:scale-95 transition-transform"
            >
              {goal ? 'Обновить цель' : 'Создать цель'}
            </button>
            {goal && onDelete && (
              <button
                onClick={() => onDelete(goal.id)}
                className="w-full py-4 text-red-500 font-black text-xs uppercase tracking-widest hover:text-red-600"
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
