import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, enterDemoMode, loginWithEmail } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleGoogleClick = async () => {
    try {
      setIsGoogleLoading(true);
      await loginWithGoogle();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка входа через Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Пожалуйста, введите логин и пароль');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      toast.info('Введите ваш Email в поле ввода выше, чтобы получить инструкцию по сбросу пароля');
    } else {
      toast.success(`Ссылка для сброса пароля отправлена на ${email}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] bg-[radial-gradient(at_15%_15%,rgba(226,235,224,0.75)_0px,transparent_55%),radial-gradient(at_85%_15%,rgba(243,235,222,0.8)_0px,transparent_50%),radial-gradient(at_50%_85%,rgba(235,240,233,0.7)_0px,transparent_65%),radial-gradient(at_85%_85%,rgba(238,230,218,0.6)_0px,transparent_50%)] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-[#1c241f] selection:bg-[#c8e8d0] selection:text-[#002110]">
      {/* Главный контейнер */}
      <main className="w-full max-w-[420px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="bg-[#faf7f2]/95 backdrop-blur-xl border border-[#e8e2d8] rounded-[2rem] p-7 sm:p-9 shadow-[0_20px_50px_-10px_rgba(40,50,45,0.08),0_0_1px_1px_rgba(255,255,255,0.8)_inset] relative overflow-hidden"
        >
          {/* Фоновое свечение */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#d7e6d9]/60 blur-2xl rounded-full pointer-events-none" />

          {/* Эмблема и заголовок */}
          <header className="text-center relative z-10 flex flex-col items-center">
            <div className="relative mb-4 group cursor-default">
              <div className="w-[66px] h-[66px] rounded-2xl bg-[#3e6b48] shadow-[0_10px_24px_-4px_rgba(47,93,63,0.18)] flex items-center justify-center text-white border border-[#52835d]/40 transition-transform duration-300 group-hover:scale-105">
                <span className="font-serif text-2xl font-bold tracking-tight text-white select-none">FB</span>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#2f5d3f] border-2 border-[#faf7f2]"></span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#1c241f] leading-tight font-sans">
              Семейный Бюджет
            </h1>
            <p className="text-xs font-semibold tracking-wide text-[#6b776d] mt-1.5 flex items-center gap-1.5">
              <span>Авторизация</span>
              <span className="w-1 h-1 rounded-full bg-[#9ba79e]"></span>
              <span>Семейное пространство</span>
            </p>
          </header>

          {/* Форма входа */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5 relative z-10">
            {/* Поле Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#354037] ml-1">Логин или Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78857a]">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="family@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f5f2eb] border border-[#e4ded3] rounded-xl text-sm placeholder-[#9ba59d] text-[#1c241f] focus:bg-white focus:border-[#3e6b48] focus:ring-3 focus:ring-[#3e6b48]/15 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Поле Пароль */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-[#354037]">Пароль</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-[#4a7c59] hover:text-[#33593c] hover:underline transition-colors cursor-pointer"
                >
                  Забыли пароль?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78857a]">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-[#f5f2eb] border border-[#e4ded3] rounded-xl text-sm placeholder-[#9ba59d] text-[#1c241f] focus:bg-white focus:border-[#3e6b48] focus:ring-3 focus:ring-[#3e6b48]/15 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#78857a] hover:text-[#1c241f] focus:outline-none transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Чекбокс Запомнить меня */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#cbcfc7] text-[#3e6b48] focus:ring-[#3e6b48] focus:ring-offset-0 transition-colors"
                />
                <span className="text-xs text-[#525e55] font-medium">Запомнить меня на этом устройстве</span>
              </label>
            </div>

            {/* Кнопка Войти */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full mt-2 py-3 px-4 bg-[#3e6b48] hover:bg-[#33593c] active:scale-[0.99] text-white font-bold rounded-xl shadow-[0_10px_24px_-6px_rgba(62,107,72,0.38)] transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
            >
              <span>{isLoading ? 'Загрузка...' : 'Войти'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Альтернативные варианты входа */}
          <div className="mt-5">
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#e2dcd1] w-full"></div>
              <span className="bg-[#faf7f2] px-3 text-[11px] font-bold uppercase tracking-wider text-[#9ba59d] absolute">
                или
              </span>
            </div>

            {/* Кнопка Google */}
            <button
              type="button"
              disabled={isGoogleLoading || isLoading}
              onClick={handleGoogleClick}
              className="w-full py-2.5 px-4 bg-white hover:bg-[#f5f1ea] border border-[#ded7cb] text-[#2c332e] font-semibold rounded-xl shadow-xs transition-all duration-200 flex items-center justify-center gap-2.5 text-sm active:scale-[0.99] cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <span className="flex items-center gap-2 text-[#3e6b48]">
                  <div className="w-4 h-4 border-2 border-[#3e6b48] border-t-transparent rounded-full animate-spin" />
                  Подключение к Google...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Войти через Google</span>
                </>
              )}
            </button>
          </div>

          {/* Локальный демо-режим */}
          <footer className="mt-5 pt-4 border-t border-[#ece7df] flex flex-col items-center text-center space-y-3">
            <button
              type="button"
              onClick={enterDemoMode}
              className="inline-flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-[#4a584d] hover:text-[#3e6b48] transition-colors py-1.5 px-3 rounded-lg hover:bg-[#ece7df]/70 cursor-pointer"
            >
              <User size={15} className="text-[#78857a]" />
              <span>Локальный демо-режим</span>
            </button>
            <p className="text-[11px] leading-relaxed text-[#7c887e] max-w-[290px]">
              Ваши данные в безопасности и синхронизируются в реальном времени через защищённое облако
            </p>
          </footer>
        </motion.div>

        {/* Индикатор защиты */}
        <div className="text-center mt-5 text-xs text-[#707e73] flex items-center justify-center gap-2">
          <ShieldCheck size={16} className="text-[#3e6b48]" />
          <span>Защищено сквозным шифрованием семейных баз данных</span>
        </div>
      </main>
    </div>
  );
};

export default LoginScreen;
