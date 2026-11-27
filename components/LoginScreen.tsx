import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, UserPlus, LogIn, X, Mail, KeyRound, Loader2, CheckCircle2, Leaf } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const LoginScreen: React.FC<{installedApp?:boolean}> = ({installedApp=false}) => {
  const { enterDemoMode, loginWithEmail, registerWithEmail, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Password Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Helper to format short login (e.g. "alex") into internal format
  const formatLoginToEmail = (loginInput: string) => {
    const trimmed = loginInput.trim().toLowerCase();
    if (trimmed.includes('@')) {
      return trimmed;
    }
    // If user enters plain username like "alex", convert internally to "alex@family.local"
    return `${trimmed}@family.local`;
  };

  const openResetModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResetInput(username);
    setResetSuccess(false);
    setIsResetModalOpen(true);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = resetInput.trim();
    if (!clean) {
      toast.error('Введите ваш логин или email');
      return;
    }

    const formattedLogin = formatLoginToEmail(clean);

    setIsSendingReset(true);
    try {
      await resetPassword(formattedLogin);
      setResetSuccess(true);
    } catch (err: any) {
      toast.error(err?.message || 'Не удалось отправить письмо для сброса пароля');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      toast.error('Пожалуйста, введите логин и пароль');
      return;
    }

    if (password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }

    const formattedLogin = formatLoginToEmail(cleanUsername);

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(formattedLogin, password);
      } else {
        await registerWithEmail(formattedLogin, password);
      }
    } catch (err: any) {
      if (mode === 'register' && err?.code === 'auth/email-already-in-use') {
        toast.error('Логин уже занят, выберите другой');
      } else {
        toast.error(err?.message || (mode === 'login' ? 'Неверный логин или пароль' : 'Ошибка регистрации'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-testid="login-scroll-container" className="h-[100dvh] min-h-0 overflow-y-auto overscroll-y-contain bg-[var(--terra-canvas)] flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans text-[var(--terra-ink)] selection:bg-[#c8e8d0] selection:text-[#002110]">
      {/* Главный контейнер */}
      <main className="w-full max-w-[420px] mx-auto my-auto shrink-0">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-[var(--terra-surface)] border border-[var(--terra-border)] rounded-2xl p-6 sm:p-8 relative overflow-hidden"
        >

          {/* Эмблема и заголовок */}
          <header className="text-center relative z-10 flex flex-col items-center">
            <div className="relative mb-4 group cursor-default">
              <div className="w-[68px] h-[68px] rounded-2xl bg-[#4A7C59] shadow-[0_10px_24px_-4px_rgba(74,124,89,0.28)] flex items-center justify-center text-white border border-[#52835d]/40 transition-transform duration-300 group-hover:scale-105">
                <Leaf className="w-8 h-8 text-white stroke-[2.2]" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-[var(--terra-ink)] leading-tight font-headline">
              Terra
            </h1>
            <p className="text-xs font-semibold tracking-wide text-[var(--terra-muted)] mt-1.5 flex items-center gap-1.5">
              <span>Семейный бюджет</span>
            </p>
          </header>

          {/* Табы режима: Вход / Создать аккаунт */}
          <div className="mt-5 p-1 bg-[var(--terra-soft)] rounded-xl flex items-center text-xs font-semibold text-[var(--terra-muted)] relative">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-center transition-colors duration-200 cursor-pointer ${
                mode === 'login'
                  ? 'bg-[var(--terra-surface)] text-[var(--terra-ink)] shadow-xs font-bold'
                  : 'hover:text-[var(--terra-ink)] font-semibold'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg text-center transition-colors duration-200 cursor-pointer ${
                mode === 'register'
                  ? 'bg-[var(--terra-surface)] text-[var(--terra-ink)] shadow-xs font-bold'
                  : 'hover:text-[var(--terra-ink)] font-semibold'
              }`}
            >
              Регистрация
            </button>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 relative z-10">
            {/* Поле Логин */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#354037] ml-1">
                {mode === 'login' ? 'Логин' : 'Придумайте логин'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78857a]">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="например: alexander или family1"
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--terra-soft)] border border-[var(--terra-control-border)] rounded-xl text-sm placeholder-[#9ba59d] text-[var(--terra-ink)] focus:bg-[var(--terra-surface)] focus:border-[#3e6b48] focus:ring-3 focus:ring-[#3e6b48]/15 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Поле Пароль */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#354037] ml-1">
                {mode === 'login' ? 'Пароль' : 'Придумайте пароль'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78857a]">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-[var(--terra-soft)] border border-[var(--terra-control-border)] rounded-xl text-sm placeholder-[#9ba59d] text-[var(--terra-ink)] focus:bg-[var(--terra-surface)] focus:border-[#3e6b48] focus:ring-3 focus:ring-[#3e6b48]/15 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                   title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#78857a] hover:text-[var(--terra-ink)] focus:outline-none transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Чекбокс Запомнить меня и кнопка Забыли пароль? */}
            {mode === 'login' && (
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#cbcfc7] text-[#3e6b48] focus:ring-[#3e6b48] focus:ring-offset-0 transition-colors"
                  />
                  <span className="text-[11px] sm:text-xs text-[#525e55] font-medium">Запомнить меня</span>
                </label>

                <button
                  type="button"
                  onClick={openResetModal}
                  className="text-[11px] sm:text-xs text-[#3e6b48] hover:text-[#2d4f34] font-bold transition-colors hover:underline cursor-pointer"
                >
                  Забыли пароль?
                </button>
              </div>
            )}

            {/* Кнопка действия */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#3e6b48] hover:bg-[#33593c] active:scale-[0.99] text-white font-bold rounded-xl  transition-colors duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
            >
              <span>{isLoading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Локальный демо-режим — только в установленном приложении. */}
          {installedApp&&<footer className="mt-5 pt-4 border-t border-[#ece7df] flex flex-col items-center text-center">
            <button
              type="button"
              onClick={enterDemoMode}
              className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-[#4a584d] hover:text-[#3e6b48] transition-colors py-1.5 px-3 rounded-lg hover:bg-[var(--terra-soft)]/70 cursor-pointer"
            >
              <UserPlus size={14} className="text-[#78857a]" />
              <span>Локальный демо-режим</span>
            </button>
          </footer>}
        </motion.div>
      </main>

      {/* Модальное окно восстановления пароля */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#faf7f2] border border-[#e8e2d8] rounded-[2rem] p-6 sm:p-7 shadow-2xl max-w-sm w-full relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#3e6b48]/10 text-[#3e6b48] flex items-center justify-center font-bold">
                    <KeyRound size={18} />
                  </div>
                  <h3 className="text-lg font-extrabold text-[var(--terra-ink)]">Восстановление пароля</h3>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsResetModalOpen(false); setResetSuccess(false); }}
                  className="p-1.5 rounded-full hover:bg-[var(--terra-soft)] text-[#78857a] hover:text-[var(--terra-ink)] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {!resetSuccess ? (
                <form onSubmit={handleSendResetLink} className="space-y-4">
                  <p className="text-xs text-[#525e55] leading-relaxed">
                    Введите логин или e-mail от вашего аккаунта. Мы отправим ссылку для сброса пароля.
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#354037]">Логин или E-mail</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78857a]">
                        <User size={16} />
                      </span>
                      <input
                        type="text"
                        required
                        value={resetInput}
                        onChange={e => setResetInput(e.target.value)}
                        placeholder="например: alexander или user@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--terra-soft)] border border-[var(--terra-control-border)] rounded-xl text-sm placeholder-[#9ba59d] text-[var(--terra-ink)] focus:bg-[var(--terra-surface)] focus:border-[#3e6b48] focus:ring-2 focus:ring-[#3e6b48]/15 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsResetModalOpen(false)}
                      className="flex-1 py-2.5 px-4 bg-[var(--terra-soft)] hover:bg-[#e2dcd3] text-[#354037] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingReset || !resetInput.trim()}
                      className="flex-1 py-2.5 px-4 bg-[#3e6b48] hover:bg-[#33593c] text-white font-bold text-xs rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isSendingReset ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      <span>Отправить</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-3 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-bold text-sm text-[var(--terra-ink)]">Письмо отправлено!</h4>
                  <p className="text-xs text-[#525e55] leading-relaxed">
                    Инструкции по сбросу пароля отправлены. Проверьте почту (включая папку «Спам»).
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="w-full py-2.5 bg-[#3e6b48] text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Понятно, закрыть
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginScreen;
