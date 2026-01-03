
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Users, PieChart, MonitorPlay, Wallet, ArrowRight, Check } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
  onDemoLogin: () => void;
  loading: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onDemoLogin, loading }) => {
  return (
    <div className="fixed inset-0 bg-[#EBEFF5] flex items-center justify-center p-4 overflow-hidden font-sans text-[#1C1C1E]">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[100px] mix-blend-multiply"
        />
        <motion.div 
          animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px] mix-blend-multiply"
        />
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 50, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-pink-400/20 rounded-full blur-[100px] mix-blend-multiply"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] bg-white/65 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[3rem] overflow-hidden"
      >
        <div className="p-8 md:p-10 flex flex-col items-center text-center">
          
          {/* Logo / Icon */}
          <div className="mb-6 relative group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-[2rem] blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="relative w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-white shadow-lg border border-white/20">
              <Wallet size={40} strokeWidth={1.5} />
            </div>
            <div className="absolute -top-2 -right-2 bg-white text-blue-600 rounded-full p-1.5 shadow-sm border border-gray-100">
                <Sparkles size={16} fill="currentColor" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#1C1C1E] mb-2">
            Family Budget
          </h1>
          <p className="text-gray-500 text-sm md:text-base font-medium leading-relaxed max-w-[280px] mx-auto mb-8">
            Умный трекер финансов для всей семьи с AI-аналитикой.
          </p>

          {/* Features List */}
          <div className="w-full space-y-3 mb-10 text-left bg-white/40 p-5 rounded-[2rem] border border-white/40">
             <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-100/50 text-blue-600 rounded-lg"><Users size={16}/></div>
                <span className="text-xs font-bold text-gray-600">Совместный доступ</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="p-1.5 bg-purple-100/50 text-purple-600 rounded-lg"><Sparkles size={16}/></div>
                <span className="text-xs font-bold text-gray-600">AI Распознавание чеков</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="p-1.5 bg-orange-100/50 text-orange-600 rounded-lg"><PieChart size={16}/></div>
                <span className="text-xs font-bold text-gray-600">Наглядная аналитика</span>
             </div>
          </div>

          {/* Buttons */}
          <div className="w-full space-y-3">
            <button 
              onClick={onLogin} 
              disabled={loading}
              className="w-full bg-[#1C1C1E] text-white font-black py-5 rounded-[2rem] shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin text-white/50" />
              ) : (
                <>
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Войти через Google
                  </span>
                </>
              )}
            </button>

            <button 
              onClick={onDemoLogin}
              className="w-full bg-white/50 hover:bg-white text-[#1C1C1E] font-black py-5 rounded-[2rem] shadow-sm border border-white/50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-98 transition-all"
            >
              <MonitorPlay size={20} className="text-blue-500" />
              <span>Демо режим</span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
             <Check size={12} strokeWidth={4} className="text-green-500" />
             <span>Безопасно & Приватно</span>
          </div>

        </div>
      </motion.div>
      
      {/* Footer Text */}
      <div className="absolute bottom-6 text-center w-full pointer-events-none opacity-40">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Family Budget v2.0
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
