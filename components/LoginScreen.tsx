
import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Globe, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const { loginWithGoogle, loginAnonymously } = useAuth();

  return (
    <div className="fixed inset-0 bg-[#F2F2F7] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-400/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center max-w-sm w-full text-center"
      >
        <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-8">
            <Wallet size={48} className="text-[#1C1C1E]" />
        </div>

        <h1 className="text-3xl font-black text-[#1C1C1E] mb-2 tracking-tight">Семейный Бюджет</h1>
        <p className="text-gray-500 font-medium text-sm mb-12 max-w-[260px] leading-relaxed">
            Умный трекер финансов с поддержкой AI и совместным доступом
        </p>

        <div className="w-full space-y-4">
            <button 
                onClick={loginWithGoogle}
                className="w-full bg-[#1C1C1E] text-white py-4 rounded-[2rem] font-bold text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
                <Globe size={20} />
                Войти через Google
            </button>

            <button 
                onClick={loginAnonymously}
                className="w-full bg-white text-[#1C1C1E] py-4 rounded-[2rem] font-bold text-sm shadow-sm border border-gray-200 flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
                <User size={20} />
                Демо режим
            </button>
        </div>

        <p className="mt-8 text-[10px] text-gray-400 font-medium">
            Продолжая, вы соглашаетесь с условиями использования
        </p>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
