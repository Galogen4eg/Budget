
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, User } from 'lucide-react';

interface OnboardingModalProps {
  initialName?: string;
  onSave: (name: string, color: string) => void;
}

const PRESET_COLORS = [
  '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', 
  '#FF3B30', '#5856D6', '#00C7BE', '#FFCC00', '#1C1C1E'
];

const OnboardingModal: React.FC<OnboardingModalProps> = ({ initialName = '', onSave }) => {
  const [name, setName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), selectedColor);
    }
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-6 bg-[#FBFDFF]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-blue-500/30">
            <User size={48} />
          </div>
          <h1 className="text-3xl font-black text-[#1C1C1E] mb-2">Добро пожаловать!</h1>
          <p className="text-gray-400 font-bold text-sm">Давайте настроим ваш профиль</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Ваше имя</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как вас зовут?"
              className="w-full bg-white p-5 rounded-[2rem] font-bold text-lg text-[#1C1C1E] outline-none shadow-soft border border-white focus:border-blue-100 transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Выберите цвет</label>
            <div className="bg-white p-5 rounded-[2rem] shadow-soft border border-white grid grid-cols-5 gap-4">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full transition-transform duration-200 relative ${selectedColor === color ? 'scale-110' : 'scale-100'}`}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check size={16} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!name.trim()}
            className="w-full bg-black text-white p-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            Продолжить
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default OnboardingModal;
