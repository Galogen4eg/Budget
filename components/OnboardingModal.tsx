import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, User, Users, Plus, Key, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { joinFamily } from '../utils/db';
import { toast } from 'sonner';

interface OnboardingModalProps {
  onSave: (name: string, color: string) => void;
}

const PRESET_COLORS = [
  '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', 
  '#FF3B30', '#5856D6', '#00C7BE', '#FFCC00', '#1C1C1E'
];

type Step = 'choice' | 'join' | 'profile';

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onSave }) => {
  const [step, setStep] = useState<Step>('choice');
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [familyIdInput, setFamilyIdInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { user } = useAuth();

  const handleJoin = async () => {
    if (!familyIdInput.trim() || !user) return;
    setIsJoining(true);
    try {
        await joinFamily(user, familyIdInput.trim());
        toast.success('Вы присоединились к семье!');
        setStep('profile');
    } catch (e: any) {
        toast.error('Ошибка: семья с таким ID не найдена');
    } finally {
        setIsJoining(false);
    }
  };

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), selectedColor);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-[#F2F2F7] dark:bg-black">
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
            {step === 'choice' && (
                <motion.div 
                    key="choice"
                    variants={stepVariants}
                    initial="initial" animate="animate" exit="exit"
                    className="space-y-8"
                >
                    <div className="text-center">
                        <h1 className="text-3xl font-black text-[#1C1C1E] dark:text-white mb-2">Начнем?</h1>
                        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Выберите как продолжить</p>
                    </div>

                    <div className="space-y-4">
                        <button 
                            onClick={() => setStep('profile')}
                            className="w-full p-6 bg-white dark:bg-[#1C1C1E] rounded-[2rem] border-2 border-transparent hover:border-blue-500 transition-all shadow-xl flex items-center gap-5 group"
                        >
                            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                <Plus size={28} strokeWidth={3} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-lg text-[#1C1C1E] dark:text-white">Новый бюджет</h3>
                                <p className="text-xs text-gray-400 font-medium">Создать свою группу</p>
                            </div>
                            <ArrowRight size={20} className="ml-auto text-gray-300" />
                        </button>

                        <button 
                            onClick={() => setStep('join')}
                            className="w-full p-6 bg-white dark:bg-[#1C1C1E] rounded-[2rem] border-2 border-transparent hover:border-purple-500 transition-all shadow-xl flex items-center gap-5 group"
                        >
                            <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                                <Users size={28} strokeWidth={3} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-lg text-[#1C1C1E] dark:text-white">Присоединиться</h3>
                                <p className="text-xs text-gray-400 font-medium">Вступить по Family ID</p>
                            </div>
                            <ArrowRight size={20} className="ml-auto text-gray-300" />
                        </button>
                    </div>
                </motion.div>
            )}

            {step === 'join' && (
                <motion.div 
                    key="join"
                    variants={stepVariants}
                    initial="initial" animate="animate" exit="exit"
                    className="space-y-6"
                >
                    <button onClick={() => setStep('choice')} className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest active:opacity-50">
                        <ArrowLeft size={16}/> Назад
                    </button>

                    <div>
                        <h2 className="text-2xl font-black text-[#1C1C1E] dark:text-white mb-2">Введите ID семьи</h2>
                        <p className="text-gray-400 text-sm font-medium">ID можно найти в настройках у администратора вашей семьи</p>
                    </div>

                    <div className="relative">
                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-500" size={24}/>
                        <input 
                            type="text" 
                            value={familyIdInput}
                            onChange={(e) => setFamilyIdInput(e.target.value)}
                            placeholder="Напр: ABCD-1234"
                            className="w-full bg-white dark:bg-[#1C1C1E] p-6 pl-14 rounded-[2rem] font-bold text-xl text-[#1C1C1E] dark:text-white outline-none shadow-xl border-2 border-transparent focus:border-purple-500 transition-all"
                            autoFocus
                        />
                    </div>

                    <button 
                        onClick={handleJoin}
                        disabled={!familyIdInput.trim() || isJoining}
                        className="w-full bg-purple-500 text-white p-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-purple-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isJoining ? <Loader2 size={20} className="animate-spin" /> : <><Check size={20} strokeWidth={3} /> Вступить</>}
                    </button>
                </motion.div>
            )}

            {step === 'profile' && (
                <motion.div 
                    key="profile"
                    variants={stepVariants}
                    initial="initial" animate="animate" exit="exit"
                    className="space-y-8"
                >
                    <div className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-blue-500/30">
                            <User size={48} />
                        </div>
                        <h1 className="text-3xl font-black text-[#1C1C1E] dark:text-white mb-2">Настройка профиля</h1>
                        <p className="text-gray-400 font-bold text-sm">Вас будут видеть так другие участники</p>
                    </div>

                    <form onSubmit={handleSubmitProfile} className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Ваше имя</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Как вас зовут?"
                                className="w-full bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] font-bold text-lg text-[#1C1C1E] dark:text-white outline-none shadow-xl border-2 border-transparent focus:border-blue-500 transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Выберите цвет</label>
                            <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] shadow-xl grid grid-cols-5 gap-4">
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
                            className="w-full bg-black dark:bg-white text-white dark:text-black p-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
                        >
                            Продолжить
                        </button>
                    </form>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingModal;