
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Globe, User, Mail, Lock, Key, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type ViewMode = 'select' | 'login' | 'register';

const LoginScreen: React.FC = () => {
  const { loginWithGoogle, enterDemoMode, loginWithEmail, registerWithEmail } = useAuth();
  const [view, setView] = useState<ViewMode>('select');
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    await loginWithEmail(email, password);
    setIsLoading(false);
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    await registerWithEmail(email, password, inviteCode);
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await loginWithGoogle(inviteCode);
    setIsLoading(false);
  };

  const containerVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="fixed inset-0 bg-[#F2F2F7] dark:bg-black flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-2xl flex items-center justify-center mb-8 border border-white/50 dark:border-white/5"
        >
            <Wallet size={40} className="text-[#1C1C1E] dark:text-white" />
        </motion.div>

        <AnimatePresence mode="wait">
            {view === 'select' && (
                <motion.div 
                    key="select"
                    variants={containerVariants}
                    initial="initial" animate="animate" exit="exit"
                    className="w-full text-center space-y-8"
                >
                    <div>
                        <h1 className="text-3xl font-black text-[#1C1C1E] dark:text-white mb-2 tracking-tight">Семейный Бюджет</h1>
                        <p className="text-gray-500 font-medium text-sm">Умный трекер с поддержкой AI</p>
                    </div>

                    <div className="space-y-4">
                        {/* Global Invite Code for Google Login */}
                        <div className="bg-white/50 dark:bg-white/5 p-4 rounded-[1.5rem] border border-gray-200 dark:border-white/5 space-y-2">
                             <div className="flex items-center gap-2 mb-1 px-1">
                                <Key size={14} className="text-gray-400"/>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Код приглашения</span>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Опционально (ID семьи)" 
                                value={inviteCode} 
                                onChange={e => setInviteCode(e.target.value)}
                                className="w-full bg-white dark:bg-[#1C1C1E] py-3 px-4 rounded-[1rem] text-xs font-bold outline-none border border-transparent focus:border-blue-500 transition-all dark:text-white"
                            />
                        </div>

                        <div className="space-y-3">
                            <button 
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white py-4 rounded-[1.5rem] font-bold text-sm shadow-sm border border-gray-200 dark:border-white/5 flex items-center justify-center gap-3 active:scale-95 transition-transform"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Globe size={18} />}
                                Войти через Google
                            </button>

                            <button 
                                onClick={() => setView('login')}
                                className="w-full bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-[1.5rem] font-bold text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
                            >
                                <Mail size={18} />
                                Логин и пароль
                            </button>
                        </div>

                        <div className="py-2 flex items-center gap-4">
                            <div className="h-[1px] flex-1 bg-gray-200 dark:bg-white/10" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">или</span>
                            <div className="h-[1px] flex-1 bg-gray-200 dark:bg-white/10" />
                        </div>

                        <button 
                            onClick={enterDemoMode}
                            className="w-full text-[#1C1C1E] dark:text-white py-3 font-bold text-sm flex items-center justify-center gap-2 active:opacity-50 transition-opacity"
                        >
                            <User size={16} />
                            Демо режим (локально)
                        </button>
                    </div>
                </motion.div>
            )}

            {view === 'login' && (
                <motion.div 
                    key="login"
                    variants={containerVariants}
                    initial="initial" animate="animate" exit="exit"
                    className="w-full space-y-6"
                >
                    <button onClick={() => setView('select')} className="flex items-center gap-2 text-gray-500 text-sm font-bold mb-4 active:opacity-50">
                        <ArrowLeft size={16}/> Назад
                    </button>
                    
                    <h2 className="text-2xl font-black dark:text-white">Вход</h2>
                    
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            <input 
                                type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full bg-white dark:bg-[#1C1C1E] py-4 pl-12 pr-4 rounded-[1.2rem] text-sm font-bold outline-none border border-transparent focus:border-blue-500 transition-all dark:text-white"
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            <input 
                                type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full bg-white dark:bg-[#1C1C1E] py-4 pl-12 pr-4 rounded-[1.2rem] text-sm font-bold outline-none border border-transparent focus:border-blue-500 transition-all dark:text-white"
                            />
                        </div>
                        <button 
                            type="submit" disabled={isLoading}
                            className="w-full bg-blue-500 text-white py-4 rounded-[1.2rem] font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={18}/> : 'Войти'}
                        </button>
                    </form>
                    
                    <p className="text-center text-xs font-bold text-gray-400">
                        Нет аккаунта? <button onClick={() => setView('register')} className="text-blue-500">Создать</button>
                    </p>
                </motion.div>
            )}

            {view === 'register' && (
                <motion.div 
                    key="register"
                    variants={containerVariants}
                    initial="initial" animate="animate" exit="exit"
                    className="w-full space-y-6"
                >
                    <button onClick={() => setView('login')} className="flex items-center gap-2 text-gray-500 text-sm font-bold mb-4 active:opacity-50">
                        <ArrowLeft size={16}/> Назад
                    </button>
                    
                    <h2 className="text-2xl font-black dark:text-white">Регистрация</h2>
                    
                    <form onSubmit={handleEmailRegister} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            <input 
                                type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full bg-white dark:bg-[#1C1C1E] py-4 pl-12 pr-4 rounded-[1.2rem] text-sm font-bold outline-none border border-transparent focus:border-blue-500 transition-all dark:text-white"
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            <input 
                                type="password" placeholder="Придумайте пароль" value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full bg-white dark:bg-[#1C1C1E] py-4 pl-12 pr-4 rounded-[1.2rem] text-sm font-bold outline-none border border-transparent focus:border-blue-500 transition-all dark:text-white"
                            />
                        </div>
                        
                        <div className="pt-2">
                            <div className="flex items-center gap-2 mb-2 ml-2">
                                <Sparkles size={14} className="text-purple-500"/>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Вступить в семью?</span>
                            </div>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                <input 
                                    type="text" placeholder="Код семьи (Family ID - необязательно)" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                                    className="w-full bg-white dark:bg-[#1C1C1E] py-4 pl-12 pr-4 rounded-[1.2rem] text-xs font-bold outline-none border border-transparent focus:border-purple-500 transition-all dark:text-white"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" disabled={isLoading}
                            className="w-full bg-purple-500 text-white py-4 rounded-[1.2rem] font-bold text-sm shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={18}/> : 'Создать аккаунт'}
                        </button>
                    </form>
                    
                    <p className="text-center text-xs font-bold text-gray-400">
                        Уже есть аккаунт? <button onClick={() => setView('login')} className="text-blue-500">Войти</button>
                    </p>
                </motion.div>
            )}
        </AnimatePresence>

        <p className="mt-12 text-[10px] text-gray-400 font-medium text-center">
            Ваши данные синхронизируются в реальном времени<br/>с облаком Firebase
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
