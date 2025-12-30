
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, Lock, Unlock, ShieldCheck } from 'lucide-react';

interface PinScreenProps {
  mode: 'create' | 'unlock' | 'disable';
  onSuccess: (pin: string) => void;
  onCancel?: () => void;
  savedPin?: string; // Only needed for 'unlock' or 'disable' verification
}

const PinScreen: React.FC<PinScreenProps> = ({ mode, onSuccess, onCancel, savedPin }) => {
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter'); // For 'create' mode
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (mode === 'unlock') setTitle('Введите код-пароль');
    else if (mode === 'disable') setTitle('Введите код для отключения');
    else if (mode === 'create') setTitle('Придумайте код-пароль');
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
      
      // Auto submit on 4th digit
      if (newPin.length === 4) {
        setTimeout(() => processPin(newPin), 100);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

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
        setTitle('Повторите код-пароль');
      } else {
        if (inputPin === firstPin) {
          onSuccess(inputPin);
        } else {
          setError(true);
          setTitle('Коды не совпадают. Попробуйте еще раз.');
          setStep('enter');
          setFirstPin('');
          if (navigator.vibrate) navigator.vibrate(200);
        }
      }
    }
  };

  const dots = [1, 2, 3, 4];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[9999] bg-[#F2F2F7] flex flex-col items-center justify-center p-6"
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-soft text-blue-500 mb-2">
             {mode === 'create' ? <ShieldCheck size={32} /> : <Lock size={32} />}
          </div>
          <h2 className={`text-lg font-bold text-[#1C1C1E] transition-colors ${error ? 'text-red-500' : ''}`}>
            {error ? 'Неверный код' : title}
          </h2>
        </div>

        {/* DOTS */}
        <motion.div 
          className="flex gap-6 mb-16"
          animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {dots.map(i => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                pin.length >= i 
                  ? 'bg-blue-500 scale-110' 
                  : 'bg-transparent border-2 border-gray-300'
              }`} 
            />
          ))}
        </motion.div>

        {/* KEYPAD */}
        <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleNum(num)}
              className="w-20 h-20 rounded-full bg-white shadow-sm active:bg-gray-100 flex items-center justify-center text-3xl font-normal text-[#1C1C1E] transition-colors mx-auto"
            >
              {num}
            </button>
          ))}
          <div /> {/* Empty slot */}
          <button
            onClick={() => handleNum(0)}
            className="w-20 h-20 rounded-full bg-white shadow-sm active:bg-gray-100 flex items-center justify-center text-3xl font-normal text-[#1C1C1E] transition-colors mx-auto"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-20 h-20 rounded-full flex items-center justify-center text-[#1C1C1E] active:opacity-50 transition-opacity mx-auto"
          >
            <Delete size={28} />
          </button>
        </div>

        {onCancel && (
          <button 
            onClick={onCancel} 
            className="mt-12 text-sm font-bold text-blue-500 uppercase tracking-widest p-4"
          >
            Отмена
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default PinScreen;
