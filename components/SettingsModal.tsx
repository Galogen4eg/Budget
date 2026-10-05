import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Trash2, Plus, Check, Wallet, Tag, Sparkles, Globe, 
  Smartphone, LayoutGrid, Lock, Key, Copy, Users, Share, LogOut, 
  ChevronRight, Calculator, Loader2, Menu, AppWindow, ArrowLeft, 
  Eye, EyeOff, Save, Calendar, AlertOctagon, ShoppingBag, ShieldCheck, 
  BellRing, FolderOpen, ArrowUp, ArrowDown, Gift, Moon, Sun, 
  MessageSquareQuote, Send, Cloud, CloudOff, BrainCircuit, Mail, MessageSquare, 
  RefreshCcw, MoveUpRight, Play, Search, AtSign, Award, Shield, Laptop, CheckCircle2,
  Database, CheckCheck
} from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, Transaction } from '../types';
import { auth } from '../firebase';
import { updatePassword, updateEmail, updateProfile, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { GoogleGenAI } from "@google/genai";
import { useData } from '../contexts/DataContext';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useAIKnowledgeBase from '../hooks/useAIKnowledgeBase';
import { migrateFamilyData } from '../utils/db';
import CategoriesSettings from './CategoriesSettings';
import BudgetSettingsSection from './BudgetSettingsSection';
import MembersSettingsSection from './MembersSettingsSection';
import AIKnowledgeTab from './AIKnowledgeTab';
import { ConfirmationModal } from './ConfirmationModal';
import { toast } from 'sonner';
import { testTelegramBotConnection, cleanTelegramBotToken, cleanTelegramChatId } from '../utils/telegram';
import { getQueuedTelegramMessages, processTelegramQueue } from '../utils/telegramQueue';
import { startTelegramBotListener, stopTelegramBotListener, isBotPollingActive, BotLogEntry } from '../utils/telegramBotListener';

interface SettingsModalProps {
  settings: AppSettings;
  onClose: () => void;
  onUpdate: (settings: AppSettings) => void;
  onReset: () => void;
  savingsRate: number;
  setSavingsRate: (val: number) => void;
  members: FamilyMember[];
  onUpdateMembers: (members: FamilyMember[]) => void;
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
  onDeleteCategory?: (id: string) => void;
  learnedRules: LearnedRule[];
  onUpdateRules: (rules: LearnedRule[]) => void;
  currentFamilyId: string | null;
  onJoinFamily: (id: string) => void;
  onLogout: () => void;
  installPrompt?: any;
  transactions?: Transaction[];
  onDeleteTransactionsByPeriod?: (startDate: string, endDate: string) => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
  onOpenDuplicates?: () => void;
}

type SectionType = 'account' | 'family' | 'budget' | 'categories' | 'integrations';

interface SectionConfig {
  id: SectionType;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionConfig[] = [
  { id: 'account', label: 'Профиль и безопасность', subtitle: 'Логин, пароль, оформление и аккаунт', icon: <User size={18} /> },
  { id: 'family', label: 'Семья и доступ', subtitle: 'Участники, ID пространства, синхронизация', icon: <Users size={18} /> },
  { id: 'budget', label: 'Бюджет и зарплата', subtitle: 'Дни зарплаты, сбережения, резерв', icon: <Calculator size={18} /> },
  { id: 'categories', label: 'Категории и правила', subtitle: 'Категории трат и авто-правила', icon: <Tag size={18} /> },
  { id: 'integrations', label: 'Интеграции (Telegram и ИИ)', subtitle: 'Telegram бот, Chat ID, Gemini API', icon: <Send size={18} /> },
];

const ToggleSwitch = ({ checked, onChange, id }: { checked: boolean; onChange: () => void; id?: string }) => (
  <button 
    id={id} 
    type="button"
    onClick={onChange} 
    className={`w-11 h-6 rounded-full p-1 transition-colors relative focus:outline-none cursor-pointer ${
      checked ? 'bg-[#2D5A43] dark:bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
    }`}
  >
    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const getInitialUsername = (email: string, displayName?: string | null): string => {
  if (email.endsWith('@family.local')) {
    return email.replace('@family.local', '');
  }
  return displayName || email;
};

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  settings, onClose, onUpdate, savingsRate, setSavingsRate, 
  members, onUpdateMembers, categories, onUpdateCategories, 
  onDeleteCategory, learnedRules, onUpdateRules, currentFamilyId, 
  onJoinFamily, onLogout, installPrompt, transactions = [], 
  onDeleteTransactionsByPeriod, onUpdateTransactions, onOpenDuplicates 
}) => {
  const [activeSection, setActiveSection] = useState<SectionType>('account');
  const [showMobileMenu, setShowMobileMenu] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileMenu(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Data Context Access for AI Knowledge
  const { aiKnowledge: rawAiKnowledge, deleteAIKnowledge, addAIKnowledge } = useData();
  const {
    knowledgeItems: aiKnowledge,
    newFactText: newFact,
    setNewFactText: setNewFact,
    handleAddFact,
    handleDeleteFact
  } = useAIKnowledgeBase({
    aiKnowledge: rawAiKnowledge,
    addAIKnowledge,
    deleteAIKnowledge
  });

  // Family ID Switch State
  const [newFamilyId, setNewFamilyId] = useState(currentFamilyId || '');
  const [isJoining, setIsJoining] = useState(false);
  const [shouldMigrate, setShouldMigrate] = useState(false);
  const [factIdToDelete, setFactIdToDelete] = useState<string | null>(null);

  // Account & Password Management State
  const currentUser = auth.currentUser;
  const currentEmail = currentUser?.email || '';
  const initialUsername = getInitialUsername(currentEmail, currentUser?.displayName);

  const [accountLogin, setAccountLogin] = useState(initialUsername);
  const [currentPasswordForLogin, setCurrentPasswordForLogin] = useState('');
  const [requiresLoginPassword, setRequiresLoginPassword] = useState(false);
  const [isUpdatingLogin, setIsUpdatingLogin] = useState(false);

  const [currentPasswordForPass, setCurrentPasswordForPass] = useState('');
  const [requiresPassConfirm, setRequiresPassConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Live Telegram Bot polling states
  const { setTransactions, setShoppingItems, shoppingItems } = useData();
  const [isBotActive, setIsBotActive] = useState(() => isBotPollingActive());
  const [botLogs, setBotLogs] = useState<BotLogEntry[]>([]);

  const handleToggleBot = () => {
    if (isBotActive) {
      stopTelegramBotListener();
      setIsBotActive(false);
      setBotLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          text: 'Слушатель Telegram бота остановлен.'
        }
      ]);
      toast.info('Слушатель Telegram бота остановлен');
    } else {
      if (!settings.telegramBotToken?.trim()) {
        toast.error('Введите токен бота Telegram в настройках интеграции');
        return;
      }
      setIsBotActive(true);
      startTelegramBotListener(
        settings.telegramBotToken,
        (entry) => {
          setBotLogs(prev => [...prev.slice(-39), entry]); // keep last 40 entries
        },
        async (newTx) => {
          const txWithId = { ...newTx, id: 'tx_' + Date.now() };
          if (onUpdateTransactions) {
            onUpdateTransactions([txWithId, ...transactions]);
          } else {
            setTransactions(prev => [txWithId, ...prev]);
          }
        },
        async (title, amount = 1, unit = 'шт', category = 'other') => {
          const newItem = {
            id: 'shop_' + Date.now(),
            title,
            amount: String(amount),
            unit,
            category,
            completed: false,
            createdAt: new Date().toISOString()
          };
          setShoppingItems(prev => [newItem, ...prev]);
        },
        () => shoppingItems,
        categories,
        members
      );
      toast.success('Слушатель Telegram бота запущен!');
    }
  };

  const handleTestTelegramConnection = async () => {
    if (!settings.telegramBotToken?.trim()) {
      toast.error('Введите токен бота Telegram');
      return;
    }
    setIsTestingTelegram(true);
    setTelegramTestResult(null);
    try {
      const res = await testTelegramBotConnection({
        botToken: settings.telegramBotToken,
        apiUrl: settings.telegramApiUrl,
      });
      setTelegramTestResult(res);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка проверки связи';
      setTelegramTestResult({ ok: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const [queuedMessagesCount, setQueuedMessagesCount] = useState(0);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const refreshQueueCount = async () => {
    try {
      const messages = await getQueuedTelegramMessages();
      setQueuedMessagesCount(messages.length);
    } catch {
      setQueuedMessagesCount(0);
    }
  };

  useEffect(() => {
    if (activeSection === 'integrations') {
      refreshQueueCount();
    }
  }, [activeSection]);

  const handleFlushTelegramQueue = async () => {
    setIsProcessingQueue(true);
    try {
      const result = await processTelegramQueue();
      await refreshQueueCount();
      if (result.processedCount > 0) {
        toast.success(`Успешно отправлено из очереди: ${result.processedCount}`);
      } else if (result.failedCount > 0) {
        toast.error(`Не удалось отправить ${result.failedCount} сообщений (проверьте связь)`);
      } else {
        toast.info('Очередь сообщений пуста');
      }
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } catch (e: any) {
      toast.error('Ошибка выхода из профиля');
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  useEffect(() => {
    setAccountLogin(initialUsername);
  }, [initialUsername]);

  const handleUpdateAccountLogin = async () => {
    if (!currentUser) {
      toast.error('Вы находитесь в локальном демо-режиме');
      return;
    }
    const cleanLogin = accountLogin.trim();
    if (!cleanLogin) {
      toast.error('Логин не может быть пустым');
      return;
    }

    setIsUpdatingLogin(true);
    try {
      await updateProfile(currentUser, { displayName: cleanLogin });

      if (members && onUpdateMembers) {
        const updatedMembers = members.map(m => 
          m.userId === currentUser.uid || m.email === currentUser.email 
            ? { ...m, name: cleanLogin } 
            : m
        );
        onUpdateMembers(updatedMembers);
      }

      const formattedEmail = cleanLogin.includes('@') ? cleanLogin.toLowerCase() : `${cleanLogin.toLowerCase()}@family.local`;
      if (currentUser.email !== formattedEmail) {
        try {
          if (currentPasswordForLogin && currentUser.email) {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPasswordForLogin);
            await reauthenticateWithCredential(currentUser, credential);
          }
          await updateEmail(currentUser, formattedEmail);
          setRequiresLoginPassword(false);
          setCurrentPasswordForLogin('');
        } catch (emailErr: any) {
          if (emailErr?.code === 'auth/requires-recent-login') {
            setRequiresLoginPassword(true);
            toast.error('Для изменения e-mail/логина введите ваш текущий пароль');
            setIsUpdatingLogin(false);
            return;
          } else if (emailErr?.code === 'auth/email-already-in-use') {
            toast.error('Этот логин или e-mail уже занят другим пользователем');
            setIsUpdatingLogin(false);
            return;
          } else if (emailErr?.code === 'auth/wrong-password' || emailErr?.code === 'auth/invalid-credential') {
            toast.error('Неверный текущий пароль');
            setIsUpdatingLogin(false);
            return;
          }
        }
      }

      toast.success('Логин и профиль успешно обновлены!');
    } catch (err: any) {
      toast.error(err?.message || 'Не удалось обновить логин');
    } finally {
      setIsUpdatingLogin(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentUser) {
      toast.error('Вы находитесь в локальном демо-режиме');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (currentPasswordForPass && currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPasswordForPass);
        await reauthenticateWithCredential(currentUser, credential);
      }
      await updatePassword(currentUser, newPassword);
      toast.success('Пароль успешно изменен!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPasswordForPass('');
      setRequiresPassConfirm(false);
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        setRequiresPassConfirm(true);
        toast.error('Для изменения пароля введите ваш текущий пароль');
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        toast.error('Неверный текущий пароль');
      } else {
        toast.error(err?.message || 'Не удалось обновить пароль');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!currentUser?.email) {
      toast.error('Учетная запись не привязана к e-mail');
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      toast.success(`Ссылка для сброса отправлена на ${currentUser.email}`);
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка отправки письма');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // AI Testing State
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const apiKey = settings.geminiApiKey || '';

  useEffect(() => {
    if (currentFamilyId) setNewFamilyId(currentFamilyId);
  }, [currentFamilyId]);

  useBodyScrollLock();

  const handleTestKey = async () => {
    if (!apiKey) return;
    setAiTestStatus('loading');
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hello",
      });
      setAiTestStatus('success');
      setTimeout(() => setAiTestStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setAiTestStatus('error');
      setTimeout(() => setAiTestStatus('idle'), 3000);
    }
  };

  const handleChange = useCallback((key: keyof AppSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  }, [settings, onUpdate]);

  const handleUpdateFamilyId = async () => {
    const targetId = newFamilyId.trim();
    if (!targetId) {
      toast.error("ID не может быть пустым");
      return;
    }
    if (targetId === currentFamilyId) return;

    if (!confirm(`Вы уверены, что хотите сменить ID пространства на ${targetId}?`)) return;

    setIsJoining(true);
    try {
      if (shouldMigrate && currentFamilyId) {
        toast.info('Переносим данные в новое пространство...');
        await migrateFamilyData(currentFamilyId, targetId);
        toast.success('Данные перенесены!');
      }
      await onJoinFamily(targetId);
    } catch (e: any) {
      toast.error(e.message || "Ошибка при смене ID");
      setIsJoining(false);
    }
  };

  const filteredSections = SECTIONS.filter(s => 
    s.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="space-y-6 w-full max-w-full">
            {/* Top Session Status Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2D5A43] dark:text-emerald-400">
                <Shield size={16} />
                <span>Безопасность и аккаунт</span>
              </div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white dark:bg-[#18191C] border border-gray-200/80 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300">
                <span>Сессия активна: Веб-терминал</span>
              </div>
            </div>

            {/* CARD 1: Учетная запись */}
            <section className="bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200/80 dark:border-white/10 flex items-center justify-center text-[#2D5A43] dark:text-emerald-400 shadow-xs">
                    <User size={20} />
                  </div>
                  <h3 className="font-headline text-lg font-bold text-gray-900 dark:text-white">Учетная запись</h3>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Личные данные
                </span>
              </div>

              {/* User Info Highlight Card */}
              <div className="p-5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="font-headline font-bold text-xl text-gray-900 dark:text-white">
                      {currentUser?.displayName || accountLogin || 'Пользователь'}
                    </h4>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#2D5A43] dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 text-xs font-semibold">
                      <Award size={13} />
                      <span>Администратор пространства</span>
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {currentUser?.email || 'alexey@semyaplus.ru'}
                  </span>
                </div>

                <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Привязанный телефон</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">+7 (926) •••-42-18</span>
                  </div>
                  <div className="h-8 w-px bg-gray-200 dark:bg-white/10 hidden sm:block" />
                  <div className="flex flex-col">
                    <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Дата регистрации</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                      {currentUser?.metadata?.creationTime 
                        ? new Date(currentUser.metadata.creationTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                        : '14 октября 2023'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Login Input Block */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Логин / Имя пользователя
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                      <AtSign size={18} />
                    </span>
                    <input
                      type="text"
                      value={accountLogin}
                      onChange={e => setAccountLogin(e.target.value)}
                      placeholder="alexey_smirnov"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D5A43] dark:focus:ring-emerald-500 transition-all duration-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateAccountLogin}
                    disabled={isUpdatingLogin || !accountLogin.trim() || accountLogin === initialUsername}
                    className="px-5 py-3 rounded-xl bg-[#2D5A43] hover:bg-[#204332] text-white font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    {isUpdatingLogin ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{accountLogin !== initialUsername ? 'Сохранить логин' : 'Изменить'}</span>
                  </button>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 inline-block">
                  Используется для упоминаний в задачах и общих планах покупок.
                </span>

                {requiresLoginPassword && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1.5 mt-2 animate-in fade-in slide-in-from-top-1">
                    <label className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Введите текущий пароль для подтверждения смены логина:
                    </label>
                    <input
                      type="password"
                      value={currentPasswordForLogin}
                      onChange={e => setCurrentPasswordForLogin(e.target.value)}
                      placeholder="Текущий пароль"
                      className="w-full px-3.5 py-3 rounded-xl bg-white dark:bg-[#18191C] text-sm border border-amber-300 dark:border-amber-700/50 outline-none focus:ring-2 focus:ring-[#2D5A43]"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* CARD 2: Смена пароля */}
            <section className="bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200/80 dark:border-white/10 flex items-center justify-center text-[#2D5A43] dark:text-emerald-400 shadow-xs">
                    <Lock size={20} />
                  </div>
                  <h3 className="font-headline text-lg font-bold text-gray-900 dark:text-white">Смена пароля</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#2D5A43] dark:text-emerald-400 font-semibold">
                  <CheckCircle2 size={16} />
                  <span>Пароль надежно зашифрован</span>
                </div>
              </div>

              {requiresPassConfirm && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-bold text-amber-800 dark:text-amber-300">Введите текущий пароль для подтверждения:</label>
                  <input
                    type="password"
                    value={currentPasswordForPass}
                    onChange={e => setCurrentPasswordForPass(e.target.value)}
                    placeholder="Текущий пароль"
                    className="w-full px-3.5 py-3 rounded-xl bg-white dark:bg-[#18191C] text-sm border border-amber-300 dark:border-amber-700/50 outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  />
                </div>
              )}

              {/* 3 Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Текущий пароль
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPasswordForPass}
                      onChange={e => setCurrentPasswordForPass(e.target.value)}
                      placeholder="Текущий пароль"
                      className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D5A43] dark:focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Новый пароль
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D5A43] dark:focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Повторите новый пароль
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Повторите ввод"
                      className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D5A43] dark:focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Requirements Bar & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                  <span className={`inline-flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-[#2D5A43] dark:text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                    <Check size={14} /> Заглавные буквы
                  </span>
                  <span className={`inline-flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-[#2D5A43] dark:text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                    <Check size={14} /> Цифры
                  </span>
                  <span className={`inline-flex items-center gap-1 ${newPassword.length >= 6 ? 'text-[#2D5A43] dark:text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                    <Check size={14} /> Мин. 6 символов
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword || !newPassword || newPassword.length < 6}
                  className="px-6 py-3 rounded-xl bg-[#2D5A43] hover:bg-[#204332] text-white font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  {isUpdatingPassword ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                  <span>Обновить пароль</span>
                </button>
              </div>

              {currentUser?.email && !currentUser.email.endsWith('@family.local') && (
                <div className="pt-3 border-t border-gray-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={isSendingResetEmail}
                    className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail size={14} />
                    <span>Сбросить пароль по электронной почте ({currentUser.email})</span>
                  </button>
                </div>
              )}
            </section>

            {/* CARD 3: Двухфакторная аутентификация */}
            <section className="bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/50 text-[#2D5A43] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} />
                  </div>
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-headline text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                        Двухфакторная аутентификация (2FA)
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                        Рекомендовано
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl">
                      Дополнительное подтверждение через Telegram при входе с нового устройства. Код одноразового доступа приходит в официальный бот Terra Guard.
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-xs text-gray-500 dark:text-gray-400">
                      <Send size={14} className="text-[#2D5A43] dark:text-emerald-400 shrink-0" />
                      <span className="truncate">Привязанный Telegram: <strong className="text-gray-800 dark:text-gray-200 font-semibold">@alex_terra_user</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 sm:pt-0 shrink-0">
                  <ToggleSwitch 
                    checked={is2FAEnabled} 
                    onChange={() => {
                      setIs2FAEnabled(!is2FAEnabled);
                      toast.success(!is2FAEnabled ? '2FA успешно активирована' : '2FA деактивирована');
                    }} 
                  />
                </div>
              </div>
            </section>

            {/* BOTTOM ACTIONS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 pb-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Все действия в журнале аудита шифруются локальным ключом семьи.
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-50 hover:bg-red-100/90 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold text-sm transition-all shadow-xs cursor-pointer border border-red-100 dark:border-red-900/30 active:scale-[0.98]"
              >
                <LogOut size={18} />
                <span>Выйти из профиля</span>
              </button>
            </div>
          </div>
        );

      case 'family':
        return (
          <div className="space-y-6 w-full max-w-full">
            {/* Members Settings */}
            <MembersSettingsSection 
              members={members}
              onUpdateMembers={onUpdateMembers}
              currentFamilyId={currentFamilyId}
              transactions={transactions}
            />

            {/* Family Space ID & Sync */}
            <section className="bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-[#2D5A43] dark:text-emerald-400 flex items-center justify-center">
                    <Cloud size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">ID семейного пространства</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Синхронизация общей базы данных между устройствами</p>
                  </div>
                </div>

                {currentFamilyId && (
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentFamilyId);
                      toast.success('ID пространства скопирован');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:border-[#2D5A43] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Скопировать ID</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text" 
                    value={newFamilyId}
                    onChange={e => setNewFamilyId(e.target.value)}
                    placeholder="Введите ID семейного пространства..."
                    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2D5A43] dark:focus:ring-emerald-500"
                  />
                  <button 
                    type="button"
                    onClick={handleUpdateFamilyId}
                    disabled={isJoining || newFamilyId.trim() === currentFamilyId}
                    className="px-5 py-3 rounded-xl bg-[#2D5A43] hover:bg-[#204332] text-white font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    {isJoining ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                    <span>Подключиться</span>
                  </button>
                </div>

                {currentFamilyId && (
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer pt-1">
                    <input 
                      type="checkbox"
                      checked={shouldMigrate}
                      onChange={e => setShouldMigrate(e.target.checked)}
                      className="rounded border-gray-300 text-[#2D5A43] focus:ring-[#2D5A43]"
                    />
                    <span>Перенести существующие записи из текущего пространства в новое</span>
                  </label>
                )}
              </div>
            </section>
          </div>
        );

      case 'budget':
        return (
          <BudgetSettingsSection
            settings={settings}
            onUpdateSetting={handleChange}
            savingsRate={savingsRate}
            setSavingsRate={setSavingsRate}
            transactions={transactions}
            onOpenDuplicates={onOpenDuplicates}
            onDeleteTransactionsByPeriod={onDeleteTransactionsByPeriod}
          />
        );

      case 'categories':
        return (
          <div className="h-full overflow-hidden min-h-[500px]">
            <CategoriesSettings 
              categories={categories}
              onUpdateCategories={onUpdateCategories}
              onDeleteCategory={onDeleteCategory}
              learnedRules={learnedRules}
              onUpdateRules={onUpdateRules}
              settings={settings}
              transactions={transactions}
              onUpdateTransactions={onUpdateTransactions}
            />
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6 w-full max-w-full">
            {/* Telegram Bot Settings */}
            <section className="bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Send size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Telegram Бот оверлея</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Автоматическая отправка уведомлений в семейный чат</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestTelegramConnection}
                  disabled={isTestingTelegram || !settings.telegramBotToken}
                  className="px-4 py-2.5 bg-[#2D5A43] hover:bg-[#204332] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shrink-0 shadow-2xs"
                >
                  {isTestingTelegram ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Проверить связь</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Токен бота (Telegram Bot Token)</label>
                  <input 
                    type="password" 
                    value={settings.telegramBotToken || ''} 
                    onChange={e => handleChange('telegramBotToken', cleanTelegramBotToken(e.target.value))} 
                    className="w-full px-3.5 py-3 rounded-xl bg-white dark:bg-[#18191C] font-mono text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-[#2D5A43]" 
                    placeholder="712345678:AAHk..." 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">ID общего чата (Chat ID)</label>
                  <input 
                    type="text" 
                    value={settings.telegramChatId || ''} 
                    onChange={e => handleChange('telegramChatId', cleanTelegramChatId(e.target.value))} 
                    className="w-full px-3.5 py-3 rounded-xl bg-white dark:bg-[#18191C] font-mono text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-[#2D5A43]" 
                    placeholder="-1001928374650" 
                  />
                </div>
              </div>

              {telegramTestResult && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                  telegramTestResult.ok 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-200' 
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-800 dark:text-red-200'
                }`}>
                  <span className="font-semibold">{telegramTestResult.message}</span>
                </div>
              )}

              {/* Live Telegram Bot Listener Panel */}
              <div className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center animate-pulse shrink-0">
                      <Play size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">Двусторонний бот-слушатель (Long Polling)</h4>
                      <p className="text-[10px] text-blue-700 dark:text-blue-400">Позволяет добавлять траты и продукты через сообщения боту</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleBot}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-3xs cursor-pointer ${
                      isBotActive 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-[#2D5A43] hover:bg-[#204332] text-white'
                    }`}
                  >
                    {isBotActive ? 'Остановить' : 'Запустить слушатель'}
                  </button>
                </div>

                {/* Console Log Terminal */}
                {isBotActive && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Логи работы Telegram-бота (Терминал):
                    </span>
                    <div className="p-3.5 bg-black text-xs font-mono text-emerald-400 rounded-xl max-h-[160px] overflow-y-auto space-y-1.5 border border-white/5 no-scrollbar">
                      {botLogs.length === 0 ? (
                        <div className="text-stone-500 text-[11px] animate-pulse">Ожидание входящих сообщений от Telegram API...</div>
                      ) : (
                        botLogs.map((log, lIdx) => (
                          <div key={lIdx} className="leading-relaxed flex items-start gap-1.5">
                            <span className="text-stone-500 font-semibold shrink-0">[{log.timestamp}]</span>
                            <span className={
                              log.type === 'error' ? 'text-red-400 font-semibold' :
                              log.type === 'success' ? 'text-emerald-300 font-bold' :
                              log.type === 'incoming' ? 'text-sky-300 font-medium' :
                              'text-emerald-500'
                            }>
                              {log.text}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Gemini API Key */}
            <section className="bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">AI Ассистент (Google Gemini API)</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Персональный ключ для голосового чата и распознавания чеков</p>
                  </div>
                </div>

                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs font-bold text-[#2D5A43] dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0">
                  Получить ключ <MoveUpRight size={12} />
                </a>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type={showGeminiKey ? "text" : "password"} 
                    value={settings.geminiApiKey || ''} 
                    onChange={e => handleChange('geminiApiKey', e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 font-mono text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D5A43]" 
                    placeholder="Вставьте ваш Google Gemini API key..." 
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {apiKey && (
                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleTestKey}
                      disabled={aiTestStatus === 'loading'}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {aiTestStatus === 'loading' ? (
                        <Loader2 size={13} className="animate-spin text-purple-500" />
                      ) : (
                        <BrainCircuit size={13} className="text-purple-500" />
                      )}
                      <span>
                        {aiTestStatus === 'success' ? 'Связь активна! ✅' : aiTestStatus === 'error' ? 'Ошибка ключа! ❌' : 'Проверить ключ ИИ'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* AI Knowledge Base (Extracted Tab) */}
            <AIKnowledgeTab
              aiKnowledge={aiKnowledge}
              newFact={newFact}
              onNewFactChange={setNewFact}
              onAddFact={handleAddFact}
              onDeleteFact={setFactIdToDelete}
            />

            <ConfirmationModal
              isOpen={factIdToDelete !== null}
              onClose={() => setFactIdToDelete(null)}
              onConfirm={() => {
                if (factIdToDelete) {
                  handleDeleteFact(factIdToDelete);
                  setFactIdToDelete(null);
                }
              }}
              title="Стереть воспоминание?"
              message="Вы уверены, что хотите стереть этот факт из памяти ассистента Terra? ИИ больше не будет учитывать его при аналитике."
              confirmText="Стереть"
              cancelText="Отмена"
              isDestructive={true}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const currentSection = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-3 lg:p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200" 
      />

      {/* Main Container */}
      <div 
        className="modal-animate-enter relative bg-white dark:bg-[#18191C] w-full md:max-w-[96vw] lg:max-w-[94vw] xl:max-w-[1460px] 2xl:max-w-[1600px] h-full md:h-[94vh] md:max-h-[960px] md:rounded-2xl rounded-none shadow-2xl overflow-hidden flex flex-col border-0 md:border border-gray-200/80 dark:border-white/10 z-10"
      >
        {/* DESKTOP Top Header Bar (md and up) */}
        <header className="hidden md:flex h-16 px-6 bg-white dark:bg-[#18191C] border-b border-gray-100 dark:border-white/10 items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-headline font-bold text-lg text-gray-900 dark:text-white">Настройки</h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* MOBILE Top Header Bar (< md) - view-stack routing aware */}
        <header className="md:hidden h-14 px-4 bg-white dark:bg-[#18191C] border-b border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0">
          {showMobileMenu ? (
            <div className="flex items-center gap-2">
              <h2 className="font-headline font-bold text-lg text-gray-900 dark:text-white">Настройки</h2>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <button 
                type="button" 
                onClick={() => setShowMobileMenu(true)} 
                className="flex items-center gap-1.5 px-2.5 py-1.5 -ml-1 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors cursor-pointer text-xs font-semibold shrink-0"
              >
                <ArrowLeft size={16} />
                <span>Назад</span>
              </button>
              <h3 className="font-headline text-sm font-bold text-gray-900 dark:text-white truncate">
                {currentSection.label}
              </h3>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 2-Column Core Layout / Mobile View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* MOBILE MENU HUB (Only on screens < md when showMobileMenu is true) */}
          {showMobileMenu && (
            <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/70 dark:bg-[#151618] pb-6">
              {/* Profile Card */}
              <div 
                onClick={() => { setActiveSection('account'); setShowMobileMenu(false); }}
                className="p-4 rounded-2xl bg-white dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all hover:border-[#2D5A43]/40"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#2D5A43] dark:text-emerald-300 font-bold text-lg flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
                    {(currentUser?.displayName || accountLogin || 'П')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {currentUser?.displayName || accountLogin || 'Пользователь'}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                        ID: {currentFamilyId ? currentFamilyId.slice(0, 8) : '849-01'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {currentUser?.email || 'alexey@semyaplus.ru'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400 dark:text-gray-500 shrink-0 ml-2" />
              </div>

              {/* Список настроек */}
              <div className="rounded-2xl bg-white dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 shadow-xs overflow-hidden">
                <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Разделы настроек
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {SECTIONS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setActiveSection(item.id as SectionType); setShowMobileMenu(false); }}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#2D5A43] dark:text-emerald-400 flex items-center justify-center shrink-0">
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">{item.label}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{item.subtitle}</div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-400 dark:text-gray-500 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full p-4 rounded-2xl bg-white dark:bg-[#202225] border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-[0.99] cursor-pointer"
                >
                  <LogOut size={18} />
                  <span>Выйти из профиля</span>
                </button>
              </div>

              {/* Version Info */}
              <div className="text-center pb-8 pt-2">
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                  Terra — Семейный бюджет v3.4
                </p>
              </div>
            </div>
          )}

          {/* DESKTOP Navigation Sidebar (always visible on md+) */}
          <aside className="hidden md:flex w-[230px] lg:w-[250px] xl:w-[265px] bg-gray-50 dark:bg-[#1E2023] border-r border-gray-100 dark:border-white/10 p-3.5 flex-col shrink-0 overflow-y-auto">
            <div className="px-2 pt-1 pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Разделы настроек
              </span>
            </div>

            <nav className="space-y-1 flex-1">
              {filteredSections.map(section => {
                const isActive = activeSection === section.id;
                return (
                  <button 
                    key={section.id} 
                    type="button"
                    onClick={() => { 
                      setActiveSection(section.id); 
                    }} 
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#2D5A43] text-white shadow-sm' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className={`shrink-0 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                      {section.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate leading-tight">{section.label}</div>
                      <div className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                        {section.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Main Content Panel (visible on md+, or on mobile when showMobileMenu is false) */}
          <main className={`flex-1 bg-white dark:bg-[#18191C] flex-col min-w-0 overflow-hidden ${
            showMobileMenu ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Desktop Section Header (hidden on mobile) */}
            {currentSection.id !== 'categories' && (
              <div className="hidden md:flex px-6 py-4 border-b border-gray-100 dark:border-white/10 items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                        {currentSection.label}
                      </h3>
                      {currentSection.id === 'account' && (
                        <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          ID: {currentFamilyId ? currentFamilyId.slice(0, 8) : '849-01'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {currentSection.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Section Content Canvas with prevent-clipping bottom padding */}
            <div className={`flex-1 ${currentSection.id === 'categories' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-5 pb-6'}`}>
              {renderSectionContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInstallGuide(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-[#18191C] p-6 rounded-2xl max-w-sm w-full space-y-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center mx-auto">
                <Smartphone size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Установка приложения</h3>
                <p className="text-xs text-gray-500 mt-1">Добавьте иконку Terra Hub на домашний экран мобильного устройства.</p>
              </div>
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center gap-3">
                  <span className="font-bold">1.</span>
                  <span>Нажмите «Поделиться» в браузере Safari или меню Chrome</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center gap-3">
                  <span className="font-bold">2.</span>
                  <span>Выберите пункт «На экран "Домой"»</span>
                </div>
              </div>
              <button type="button" onClick={() => setShowInstallGuide(false)} className="w-full bg-[#2D5A43] text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                Понятно
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[6px]"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1E2023] rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-hidden border border-gray-200/80 dark:border-white/10 z-10"
            >
              <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-red-500/10 filter blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-emerald-500/10 filter blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-100/80 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
                    <LogOut size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider font-bold text-red-600 dark:text-red-400">
                      Сессия пользователя
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Terra Hub v3.4
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 dark:text-gray-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Main Content */}
              <div className="relative z-10 flex flex-col gap-2">
                <h2 className="font-headline text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
                  Выйти из профиля?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Локальные данные синхронизированы с облаком. Чтобы войти снова, потребуется ввести логин и пароль или код доступа к пространству.
                </p>
              </div>

              {/* Space Sync Status Banner */}
              <div className="relative z-10 bg-gray-50 dark:bg-[#18191C] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200/60 dark:border-white/10">
                    <Database size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Активное пространство</span>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                      ID: {currentFamilyId ? currentFamilyId.slice(0, 8) : '849-01'}
                    </span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 text-xs font-semibold self-start sm:self-center">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Синхронизировано</span>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="relative z-10 grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-[#18191C] rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Устройство</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">Мобильный/Веб узел</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-[#18191C] rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Синхронизация</span>
                  <span className="text-xs font-bold text-[#2D5A43] dark:text-emerald-400 flex items-center gap-1">
                    <CheckCheck size={14} /> Все записано
                  </span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="relative z-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-all cursor-pointer text-center active:scale-[0.98]"
                >
                  Остаться
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleConfirmLogout}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98]"
                >
                  {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                  <span>{isLoggingOut ? 'Выход...' : 'Да, выйти'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default SettingsModal;
