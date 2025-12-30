
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, Lock, ShieldCheck, ChevronLeft } from 'lucide-react';

interface PinScreenProps {
  mode: 'create' | 'unlock' | 'disable';
  onSuccess: (pin: string) => void;
  onCancel?: () => void;
  savedPin?: string;
}

const PinScreen: React.FC<PinScreenProps> = ({ mode, onSuccess, onCancel, savedPin }) => {
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState(false);
  const [title, setTitle] = useState('');
  const [subTitle, setSubTitle] = useState('');

  useEffect(() => {
    if (mode === 'unlock') {
        setTitle('С возвращением');
        setSubTitle('Введите код-пароль');
    } else if (mode === 'disable') {
        setTitle('Безопасность');
        setSubTitle('Код для отключения защиты');
    } else if (mode === 'create') {
        setTitle('Создание кода');
        setSubTitle('Придумайте код-пароль');
    }
  }, [mode]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(false);
        setPin('');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleNum = (num: number) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => processPin(newPin), 150);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key >= '0' && e.key <= '9') handleNum(parseInt(e.key));
        else if (e.key === 'Backspace') handleDelete();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const processPin = (inputPin: string) => {
    if (mode === 'unlock' || mode === 'disable') {
      if (inputPin === savedPin) {
        onSuccess(inputPin);
      } else {
        setError(true);
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      }
    } else if (mode === 'create') {
      if (step === 'enter') {
        setFirstPin(inputPin);
        setStep('confirm');
        setPin('');
        setSubTitle('Повторите код-пароль');
      } else {
        if (inputPin === firstPin) {
          onSuccess(inputPin);
        } else {
          setError(true);
          setSubTitle('Коды не совпадают. Еще раз.');
          setStep('enter');
          setFirstPin('');
          if (navigator.vibrate) navigator.vibrate(200);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#EBEFF5] overflow-hidden flex flex-col items-center justify-center font-sans text-[#1C1C1E]">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-400/20 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 1.05 }}
        className="relative z-10 w-full max-w-sm flex flex-col h-full max-h-[800px] p-6"
      >
        {/* Header Section */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <motion.div 
                initial={{ y: -20 }} animate={{ y: 0 }}
                className="w-20 h-20 bg-white/40 backdrop-blur-xl rounded-[2rem] flex items-center justify-center shadow-xl border border-white/60 mb-2"
            >
                {mode === 'create' ? <ShieldCheck size={36} className="text-blue-600" /> : <Lock size={36} className="text-[#1C1C1E]" />}
            </motion.div>
            
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-[#1C1C1E]">{title}</h2>
                <p className={`text-sm font-bold transition-colors ${error ? 'text-red-500' : 'text-gray-400'}`}>
                    {error ? 'Неверный код' : subTitle}
                </p>
            </div>

            {/* Dots */}
            <motion.div 
                className="flex gap-6 mt-4"
                animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
                {[1, 2, 3, 4].map(i => (
                    <motion.div 
                        key={i}
                        initial={false}
                        animate={{
                            scale: pin.length >= i ? 1.2 : 1,
                            backgroundColor: pin.length >= i ? '#1C1C1E' : 'transparent',
                            borderColor: pin.length >= i ? '#1C1C1E' : '#D1D1D6'
                        }}
                        className="w-4 h-4 rounded-full border-2 transition-colors duration-200"
                    />
                ))}
            </motion.div>
        </div>

        {/* Keypad Section */}
        <div className="pb-8 w-full">
            <div className="grid grid-cols-3 gap-x-6 gap-y-5 w-full max-w-[300px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                        key={num}
                        onClick={() => handleNum(num)}
                        className="w-20 h-20 rounded-full bg-white/50 backdrop-blur-md shadow-sm border border-white/60 flex items-center justify-center text-3xl font-medium text-[#1C1C1E] active:bg-white/80 active:scale-95 transition-all duration-100 select-none"
                    >
                        {num}
                    </button>
                ))}
                
                {/* Bottom Row */}
                <div className="flex items-center justify-center">
                    {onCancel && (
                        <button 
                            onClick={onCancel} 
                            className="w-20 h-20 rounded-full flex items-center justify-center text-sm font-bold text-[#1C1C1E] active:opacity-50 transition-opacity"
                        >
                            Отмена
                        </button>
                    )}
                </div>
                
                <button
                    onClick={() => handleNum(0)}
                    className="w-20 h-20 rounded-full bg-white/50 backdrop-blur-md shadow-sm border border-white/60 flex items-center justify-center text-3xl font-medium text-[#1C1C1E] active:bg-white/80 active:scale-95 transition-all duration-100 select-none"
                >
                    0
                </button>
                
                <button
                    onClick={handleDelete}
                    className="w-20 h-20 rounded-full flex items-center justify-center text-[#1C1C1E] active:opacity-50 transition-opacity active:scale-95"
                >
                    <Delete size={28} strokeWidth={1.5} />
                </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PinScreen;
