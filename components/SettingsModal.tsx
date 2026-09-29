import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Trash2, Plus, Check, Wallet, Tag, Sparkles, Globe, 
  Smartphone, LayoutGrid, Lock, Key, Copy, Users, Share, LogOut, 
  ChevronRight, Calculator, Loader2, Menu, AppWindow, ArrowLeft, 
  Eye, EyeOff, Save, Calendar, AlertOctagon, ShoppingBag, ShieldCheck, 
  BellRing, FolderOpen, ArrowUp, ArrowDown, Gift, Moon, Sun, 
  MessageSquareQuote, Send, Cloud, CloudOff, BrainCircuit, Mail, 
  RefreshCcw, MoveUpRight, Play, Search, Bell, BadgeCheck, Filter, Trash,
  SlidersHorizontal, CheckCheck, Database, Server, Wifi, WifiOff, CheckCircle2,
  AtSign, Award, Shield, Laptop
} from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, Transaction } from '../types';
import { MemberMarker } from '../constants';
import { auth } from '../firebase';
import { updatePassword, updateEmail, updateProfile, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { GoogleGenAI } from "@google/genai";
import { useData } from '../contexts/DataContext';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { createInvitation, deleteItem, migrateFamilyData } from '../utils/db';
import CategoriesSettings from './CategoriesSettings';
import BudgetSettingsSection from './BudgetSettingsSection';
import MembersSettingsSection from './MembersSettingsSection';
import { toast } from 'sonner';
import { testTelegramBotConnection, cleanTelegramBotToken, cleanTelegramChatId } from '../utils/telegram';
import { getQueuedTelegramMessages, processTelegramQueue } from '../utils/telegramQueue';

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

const WIDGET_METADATA = [ 
  { id: 'balance', label: 'Главный баланс' },
  { id: 'month_chart', label: 'График расходов' },
  { id: 'recent_transactions', label: 'История операций' },
  { id: 'category_analysis', label: 'Анализ категорий' },
  { id: 'shopping', label: 'Список покупок' },
  { id: 'wallet', label: 'Кошелек (Карты)' },
  { id: 'goals', label: 'Цели и копилка' }, 
];

type SectionType = 'general' | 'account' | 'budget' | 'members' | 'categories' | 'ai_memory' | 'services' | 'telegram' | 'family' | 'widgets' | 'navigation';

interface SectionConfig {
  id: SectionType;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionConfig[] = [
  { id: 'general', label: 'Общее', subtitle: 'Базовые параметры интерфейса и алгоритмов', icon: <SlidersHorizontal size={18} /> },
  { id: 'account', label: 'Аккаунт и профиль', subtitle: 'Логин, безопасность, пароль', icon: <User size={18} /> },
  { id: 'budget', label: 'Параметры бюджета', subtitle: 'Резерв, лимиты, зарплаты', icon: <Calculator size={18} /> },
  { id: 'members', label: 'Участники', subtitle: 'Список пользователей и профили', icon: <Users size={18} /> },
  { id: 'categories', label: 'Категории и правила', subtitle: 'Автоматизация правил и теги', icon: <Tag size={18} /> },
  { id: 'ai_memory', label: 'Память AI', subtitle: 'AI ассистент, ключ Gemini, база знаний', icon: <BrainCircuit size={18} /> },
  { id: 'services', label: 'Сервисы и модули', subtitle: 'Кошелек, вишлист, долги', icon: <AppWindow size={18} /> },
  { id: 'telegram', label: 'Telegram и шаблоны', subtitle: 'Бот, форматы отчетов и чек', icon: <Send size={18} /> },
  { id: 'family', label: 'Синхронизация и доступ', subtitle: 'ID пространства, перенос', icon: <Cloud size={18} /> },
  { id: 'widgets', label: 'Виджеты', subtitle: 'Порядок и видимость блоков', icon: <LayoutGrid size={18} /> },
  { id: 'navigation', label: 'Навигация', subtitle: 'Нижняя панель и вкладки', icon: <Menu size={18} /> },
];

const PRESET_COLORS = [ '#4A7C59', '#007AFF', '#FF2D55', '#AF52DE', '#FF9500', '#FF3B30', '#5856D6', '#00C7BE', '#8E8E93', '#BF5AF2' ];

const AVAILABLE_TABS = [
  { id: 'overview', label: 'Обзор', icon: <LayoutGrid size={18}/> },
  { id: 'budget', label: 'Бюджет', icon: <Calculator size={18}/> },
  { id: 'plans', label: 'Планы', icon: <Calendar size={18}/> },
  { id: 'shopping', label: 'Покупки', icon: <ShoppingBag size={18}/> },
  { id: 'services', label: 'Сервисы', icon: <AppWindow size={18}/> }
];

const AVAILABLE_SERVICES = [
  { id: 'debts', label: 'Обязательства и долги', desc: 'Кредиты, графики платежей и стратегия выплат', icon: <Calculator size={18}/> },
  { id: 'wallet', label: 'Кошелек', desc: 'Карты лояльности и скидки', icon: <Wallet size={18}/> }
];

const ToggleSwitch = ({ checked, onChange, id }: { checked: boolean; onChange: () => void; id?: string }) => (
  <button 
    id={id} 
    type="button"
    onClick={onChange} 
    className={`w-11 h-6 rounded-full p-1 transition-colors relative focus:outline-none cursor-pointer ${
      checked ? 'bg-[#4A7C59] dark:bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
    }`}
  >
    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const TemplateEditor = ({ label, value, onChange, variables, previewData }: { label: string; value: string; onChange: (val: string) => void; variables: string[]; previewData: any }) => {
  const handleAddVar = (v: string) => onChange((value || '') + ` ${v}`);
  
  let previewText = value || '';
  Object.keys(previewData).forEach(key => {
    previewText = previewText.replace(new RegExp(key, 'g'), previewData[key]);
  });

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}</label>
        <div className="flex flex-wrap gap-1">
          {variables.map(v => (
            <button 
              key={v} 
              type="button" 
              onClick={() => handleAddVar(v)} 
              className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-[#4A7C59] dark:text-emerald-400 hover:bg-[#4A7C59]/10 transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-[#232528] p-3.5 rounded-xl border border-gray-200 dark:border-white/10 space-y-3">
        <textarea 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)} 
          className="w-full bg-white dark:bg-[#18191C] p-3 rounded-lg font-mono text-xs text-gray-900 dark:text-white outline-none h-24 resize-none border border-gray-200 dark:border-white/10 focus:border-[#4A7C59] transition-colors" 
          placeholder="Настройте текст..." 
        />
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">Предпросмотр</span>
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{previewText}</p>
        </div>
      </div>
    </div>
  );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  settings, onClose, onUpdate, savingsRate, setSavingsRate, 
  members, onUpdateMembers, categories, onUpdateCategories, 
  onDeleteCategory, learnedRules, onUpdateRules, currentFamilyId, 
  onJoinFamily, onLogout, installPrompt, transactions = [], 
  onDeleteTransactionsByPeriod, onUpdateTransactions, onOpenDuplicates 
}) => {
  const [activeSection, setActiveSection] = useState<SectionType>('general');
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
  const { aiKnowledge, deleteAIKnowledge, addAIKnowledge } = useData();
  const [newFact, setNewFact] = useState('');

  // Family ID Switch State
  const [newFamilyId, setNewFamilyId] = useState(currentFamilyId || '');
  const [isJoining, setIsJoining] = useState(false);
  const [shouldMigrate, setShouldMigrate] = useState(false);

  // Period deletion
  const [deleteStart, setDeleteStart] = useState('');
  const [deleteEnd, setDeleteEnd] = useState('');

  // Account & Password Management State
  const currentUser = auth.currentUser;
  const currentEmail = currentUser?.email || '';
  const initialUsername = currentEmail.endsWith('@family.local')
    ? currentEmail.replace('@family.local', '')
    : (currentUser?.displayName || currentEmail);

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
    if (activeSection === 'telegram') {
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
  const apiKey = settings.geminiApiKey || process.env.API_KEY;
  const isAIEnabled = !!apiKey;

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
        model: "gemini-3.8-flash",
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

  // DB Sync / Access Status
  const [isDbConnected, setIsDbConnected] = useState<boolean>(navigator.onLine);
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(false);

  const handleCheckDbConnection = async () => {
    setIsCheckingDb(true);
    try {
      await new Promise(res => setTimeout(res, 400));
      if (navigator.onLine) {
        setIsDbConnected(true);
        toast.success(currentFamilyId ? 'Связь с базой данных Firestore активна и синхронизирована' : 'Подключение к сети активно (локальное пространство)');
      } else {
        setIsDbConnected(false);
        toast.warning('Сеть недоступна, работа в автономном режиме');
      }
    } catch (e) {
      setIsDbConnected(false);
      toast.error('Ошибка проверки подключения к БД');
    } finally {
      setIsCheckingDb(false);
    }
  };

  const handleChange = (key: keyof AppSettings, value: any) => onUpdate({ ...settings, [key]: value });

  const toggleTab = (id: string) => {
    const current = settings.enabledTabs || [];
    const updated = current.includes(id) ? current.filter(t => t !== id) : [...current, id];
    handleChange('enabledTabs', updated);
  };

  const toggleService = (id: string) => {
    const current = settings.enabledServices || [];
    const updated = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
    handleChange('enabledServices', updated);
  };

  const toggleWidgetVisibility = (id: string) => {
    const updated = (settings.widgets || []).map(w => w.id === id ? { ...w, isVisible: !w.isVisible } : w);
    handleChange('widgets', updated);
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const widgets = [...(settings.widgets || [])];
    if (direction === 'up' && index > 0) {
      [widgets[index], widgets[index - 1]] = [widgets[index - 1], widgets[index]];
    } else if (direction === 'down' && index < widgets.length - 1) {
      [widgets[index], widgets[index + 1]] = [widgets[index + 1], widgets[index]];
    }
    handleChange('widgets', widgets);
  };

  const toggleTheme = () => {
    const isDark = settings.theme === 'dark';
    handleChange('theme', isDark ? 'light' : 'dark');
  };

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
      case 'general':
        return (
          <div className="space-y-4 max-w-4xl">
            {/* 1. Темное оформление */}
            <div className="p-5 md:p-6 rounded-2xl bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-200/80 dark:bg-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0">
                  {settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Темное оформление</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Смена графической темы для работы в вечернее время</p>
                </div>
              </div>
              <ToggleSwitch checked={settings.theme === 'dark'} onChange={toggleTheme} />
            </div>

            {/* 2. Установить на телефон */}
            <div className="p-5 md:p-6 rounded-2xl bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-100/80 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Установить на телефон</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Быстрый запуск с иконкой на домашнем экране</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => installPrompt ? installPrompt.prompt() : setShowInstallGuide(true)} 
                className="px-5 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <Smartphone size={16} />
                <span>Установить на телефон</span>
              </button>
            </div>

            {/* 3. Статус подключения к серверу (без лишних подробностей) */}
            <div className="p-5 md:p-6 rounded-2xl bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/50 text-[#4A7C59] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Server size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Статус подключения к серверу</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Мониторинг соединения с базой данных</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center border ${
                  isDbConnected 
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40' 
                    : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40'
                }`}>
                  {isDbConnected ? 'Онлайн • Подключено' : 'Автономный режим'}
                </span>
                <button
                  type="button"
                  onClick={handleCheckDbConnection}
                  disabled={isCheckingDb}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#18191C] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                  title="Проверить связь"
                >
                  {isCheckingDb ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                </button>
              </div>
            </div>

            {/* 4. Выйти из профиля */}
            <div className="pt-2">
              <button 
                type="button" 
                onClick={() => setShowLogoutConfirm(true)} 
                className="w-full p-4 rounded-2xl bg-red-50/80 hover:bg-red-100/90 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer border border-red-100 dark:border-red-900/30"
              >
                <LogOut size={18} />
                <span>Выйти из профиля</span>
              </button>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6 max-w-4xl">
            {/* Top Session Status & Breadcrumb bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4A7C59] dark:text-emerald-400">
                <Shield size={16} />
                <span>Безопасность и аккаунт</span>
              </div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white dark:bg-[#18191C] border border-gray-200/80 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300">
                <span>Сессия активна: Веб-терминал</span>
              </div>
            </div>

            {/* CARD 1: Учетная запись (Личные данные) */}
            <section className="p-6 sm:p-7 rounded-2xl bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200/80 dark:border-white/10 flex items-center justify-center text-[#4A7C59] dark:text-emerald-400 shadow-xs">
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
                      {currentUser?.displayName || accountLogin || 'Алексей Смирнов'}
                    </h4>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#4A7C59] dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 text-xs font-semibold">
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

              {/* Login / Username Row */}
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateAccountLogin}
                    disabled={isUpdatingLogin || !accountLogin.trim() || accountLogin === initialUsername}
                    className="px-5 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    {isUpdatingLogin ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{accountLogin !== initialUsername ? 'Сохранить логин' : 'Изменить'}</span>
                  </button>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 inline-block">
                  Используется для быстрых упоминаний в задачах и общих планах покупок.
                </span>

                {requiresLoginPassword && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1.5 mt-2">
                    <label className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Введите текущий пароль для подтверждения смены логина:
                    </label>
                    <input
                      type="password"
                      value={currentPasswordForLogin}
                      onChange={e => setCurrentPasswordForLogin(e.target.value)}
                      placeholder="Текущий пароль"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#18191C] text-sm border border-amber-300 dark:border-amber-700/50 outline-none"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* CARD 2: Смена пароля */}
            <section className="p-6 sm:p-7 rounded-2xl bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 space-y-5">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200/80 dark:border-white/10 flex items-center justify-center text-[#4A7C59] dark:text-emerald-400 shadow-xs">
                    <Lock size={20} />
                  </div>
                  <h3 className="font-headline text-lg font-bold text-gray-900 dark:text-white">Смена пароля</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#4A7C59] dark:text-emerald-400 font-semibold">
                  <CheckCircle2 size={16} />
                  <span>Последнее изменение 3 мес. назад</span>
                </div>
              </div>

              {requiresPassConfirm && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1.5">
                  <label className="text-xs font-bold text-amber-800 dark:text-amber-300">Введите текущий пароль для подтверждения:</label>
                  <input
                    type="password"
                    value={currentPasswordForPass}
                    onChange={e => setCurrentPasswordForPass(e.target.value)}
                    placeholder="Текущий пароль"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#18191C] text-sm border border-amber-300 dark:border-amber-700/50 outline-none"
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
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
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
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
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
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Requirements Bar & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                  <span className={`inline-flex items-center gap-1 ${/[A-ZА-Я]/.test(newPassword) ? 'text-[#4A7C59] dark:text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                    <Check size={14} /> Заглавные буквы
                  </span>
                  <span className={`inline-flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-[#4A7C59] dark:text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                    <Check size={14} /> Цифры
                  </span>
                  <span className={`inline-flex items-center gap-1 ${newPassword.length >= 6 ? 'text-[#4A7C59] dark:text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                    <Check size={14} /> Мин. 6 символов
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword || !newPassword || newPassword.length < 6}
                  className="px-6 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm active:scale-[0.98]"
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

            {/* CARD 3: Двухфакторная аутентификация (2FA) */}
            <section className="p-6 sm:p-7 rounded-2xl bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/50 text-[#4A7C59] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline text-lg font-bold text-gray-900 dark:text-white">
                        Двухфакторная аутентификация (2FA)
                      </h3>
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        Рекомендовано
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl">
                      Дополнительное подтверждение через Telegram при входе с нового устройства. Код одноразового доступа приходит в официальный бот Terra Guard.
                    </p>
                    <div className="flex items-center gap-2 pt-2 text-xs text-gray-500 dark:text-gray-400">
                      <Send size={14} className="text-[#4A7C59] dark:text-emerald-400" />
                      <span>Привязанный Telegram: <strong className="text-gray-800 dark:text-gray-200 font-semibold">@alex_terra_user</strong></span>
                    </div>
                  </div>
                </div>

                <ToggleSwitch 
                  checked={is2FAEnabled} 
                  onChange={() => {
                    setIs2FAEnabled(!is2FAEnabled);
                    toast.success(!is2FAEnabled ? '2FA успешно активирована' : '2FA деактивирована');
                  }} 
                />
              </div>

              {/* Active Sessions Subcard */}
              <div className="pt-4 bg-white dark:bg-[#18191C] rounded-xl p-4 border border-gray-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Laptop size={20} className="text-gray-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white block">Активные доверенные сессии</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">MacBook Pro 16" (Текущий), iPhone 15 Pro, iPad Air</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toast.success('Все остальные сеансы успешно завершены')}
                  className="text-xs font-semibold text-[#4A7C59] dark:text-emerald-400 hover:underline self-start sm:self-auto cursor-pointer"
                >
                  Завершить другие сеансы
                </button>
              </div>
            </section>

            {/* BOTTOM ACTIONS & LOGOUT */}
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

      case 'members':
        return (
          <MembersSettingsSection 
            members={members}
            onUpdateMembers={onUpdateMembers}
            currentFamilyId={currentFamilyId}
            transactions={transactions}
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

      case 'ai_memory':
        return (
          <div className="space-y-6">
            {/* AI Assistant Gemini Key Card */}
            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">AI Ассистент (Gemini)</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isAIEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {isAIEnabled ? 'Активен' : 'Требует ключ'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Умный поиск, финансовый советник, сканирование чеков и память</p>
                  </div>
                </div>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs font-bold text-[#4A7C59] dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0">
                  Получить ключ бесплатно <MoveUpRight size={12} />
                </a>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type={showGeminiKey ? "text" : "password"} 
                    value={settings.geminiApiKey || ''} 
                    onChange={e => handleChange('geminiApiKey', e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 font-mono text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]" 
                    placeholder="Вставьте ваш Google Gemini API key..." 
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {settings.geminiApiKey && (
                  <button 
                    type="button"
                    onClick={handleTestKey} 
                    disabled={aiTestStatus === 'loading'}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      aiTestStatus === 'success' ? 'bg-emerald-600 text-white' : 
                      aiTestStatus === 'error' ? 'bg-red-600 text-white' : 
                      'bg-white dark:bg-[#18191C] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {aiTestStatus === 'loading' ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>}
                    {aiTestStatus === 'success' ? 'Ключ проверен и работает!' : aiTestStatus === 'error' ? 'Ошибка авторизации ключа' : 'Проверить ключ AI'}
                  </button>
                )}
              </div>
            </div>

            {/* AI Knowledge Base */}
            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">База знаний ассистента</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Факты, привычки и постоянно контекстное окружение</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  value={newFact}
                  onChange={e => setNewFact(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && newFact.trim() && (addAIKnowledge(newFact.trim()), setNewFact(''))}
                  placeholder="Добавить факт (напр. код от домофона 123, зарплата 10-го числа...)" 
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                />
                <button 
                  type="button" 
                  onClick={() => { if(newFact.trim()) { addAIKnowledge(newFact.trim()); setNewFact(''); } }} 
                  className="px-5 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  Запомнить
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Сохраненные факты</h4>
              {aiKnowledge.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-gray-50 dark:bg-[#202225] text-xs text-gray-400">
                  Память пока пуста. Добавьте факты вручную или скажите ассистенту в чате «Запомни...»
                </div>
              ) : (
                aiKnowledge.map(item => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.text}</span>
                    <button type="button" onClick={() => deleteAIKnowledge(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'services':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_SERVICES.map(svc => {
                const isEnabled = (settings.enabledServices || []).includes(svc.id);
                return (
                  <div key={svc.id} className="p-5 rounded-2xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isEnabled ? 'bg-[#4A7C59]/10 text-[#4A7C59] dark:text-emerald-400' : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                      }`}>
                        {svc.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{svc.label}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{svc.desc}</p>
                      </div>
                    </div>
                    <ToggleSwitch checked={isEnabled} onChange={() => toggleService(svc.id)} />
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'telegram':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Токен бота (Telegram Bot Token)</label>
                <input 
                  type="password" 
                  value={settings.telegramBotToken || ''} 
                  onChange={e => handleChange('telegramBotToken', cleanTelegramBotToken(e.target.value))} 
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#18191C] font-mono text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none" 
                  placeholder="712345678:AAHk..." 
                />
              </div>
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">ID общего чата (Chat ID)</label>
                <input 
                  type="text" 
                  value={settings.telegramChatId || ''} 
                  onChange={e => handleChange('telegramChatId', cleanTelegramChatId(e.target.value))} 
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#18191C] font-mono text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none" 
                  placeholder="-1001928374650" 
                />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Шлюз / Прокси API (Telegram Gateway URL)</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Оставьте пустым для официального Telegram API или укажите прокси/Cloudflare Worker, если прямое подключение заблокировано.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestTelegramConnection}
                  disabled={isTestingTelegram || !settings.telegramBotToken}
                  className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6649] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  {isTestingTelegram ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Проверка...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Проверить связь</span>
                    </>
                  )}
                </button>
              </div>

              <input 
                type="text" 
                value={settings.telegramApiUrl || ''} 
                onChange={e => handleChange('telegramApiUrl', e.target.value)} 
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#18191C] font-mono text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none" 
                placeholder="По умолчанию: https://api.telegram.org (официальный API)" 
              />

              {telegramTestResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  telegramTestResult.ok 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                }`}>
                  {telegramTestResult.ok ? (
                    <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <WifiOff size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{telegramTestResult.message}</span>
                </div>
              )}
            </div>

            {queuedMessagesCount > 0 && (
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Офлайн-очередь: {queuedMessagesCount} неотправленных сообщений
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Сохранены локально в IndexedDB и будут отправлены автоматически при появлении стабильной сети.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFlushTelegramQueue}
                  disabled={isProcessingQueue}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  {isProcessingQueue ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Отправка...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCcw size={14} />
                      <span>Отправить ({queuedMessagesCount})</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Авто-отправка событий</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Мгновенно транслировать новые траты в Telegram-чат</p>
              </div>
              <ToggleSwitch 
                checked={settings.autoSendEventsToTelegram ?? false} 
                onChange={() => handleChange('autoSendEventsToTelegram', !settings.autoSendEventsToTelegram)} 
              />
            </div>

            <TemplateEditor 
              label="Шаблон списка покупок" 
              value={settings.shoppingTemplate || '🛒 *Список покупок*\n\n{items}'} 
              onChange={(val) => handleChange('shoppingTemplate', val)} 
              variables={['{items}', '{total}', '{date}']} 
              previewData={{ '{items}': '• Молоко\n• Хлеб', '{total}': '250', '{date}': '10.10.2026' }}
            />

            <TemplateEditor 
              label="Шаблон событий" 
              value={settings.eventTemplate || '📅 *{title}*\n🕒 {date} {time}\n📝 {description}\n👥 {members}'} 
              onChange={(val) => handleChange('eventTemplate', val)} 
              variables={['{title}', '{date}', '{time}', '{description}', '{members}']} 
              previewData={{ '{title}': 'Врач', '{date}': '10.10.2026', '{time}': '14:00', '{description}': 'Прием стоматолога', '{members}': 'Павел' }}
            />
          </div>
        );

      case 'family':
        return (
          <div className="space-y-6">
            <div className={`p-5 rounded-2xl flex items-center justify-between ${
              currentFamilyId ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-white/10 flex items-center justify-center">
                  {currentFamilyId ? <Cloud size={20} /> : <CloudOff size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    {currentFamilyId ? 'Облачный режим (Синхронизировано)' : 'Локальный автономный режим'}
                  </h3>
                  <p className="text-xs opacity-80 mt-0.5">
                    {auth.currentUser?.email ? `Учетная запись: ${auth.currentUser.email}` : 'Режим без авторизации (данные на устройстве)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 space-y-4">
              <label className="text-sm font-bold text-gray-900 dark:text-white block">Идентификатор пространства (Space ID)</label>
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <input 
                  type="text" 
                  value={newFamilyId} 
                  onChange={(e) => setNewFamilyId(e.target.value)} 
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 font-mono text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                  placeholder="SPACE-ID"
                />
                <button 
                  type="button" 
                  onClick={handleUpdateFamilyId} 
                  disabled={isJoining || newFamilyId === currentFamilyId} 
                  className="px-5 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isJoining ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  <span>Подключиться</span>
                </button>
              </div>

              {newFamilyId !== currentFamilyId && (
                <div className="p-3 bg-white dark:bg-[#18191C] rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Перенести текущие данные</p>
                    <p className="text-[11px] text-gray-500">Скопировать существующие операции в новое пространство</p>
                  </div>
                  <ToggleSwitch checked={shouldMigrate} onChange={() => setShouldMigrate(!shouldMigrate)} />
                </div>
              )}
            </div>
          </div>
        );

      case 'widgets':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Порядок и видимость виджетов</h3>
              <div className="space-y-2">
                {(settings.widgets || []).map((widget, idx) => {
                  const meta = WIDGET_METADATA.find(m => m.id === widget.id);
                  if (!meta) return null;
                  const isFirst = idx === 0;
                  const isLast = idx === (settings.widgets || []).length - 1;

                  return (
                    <div key={widget.id} className="p-3.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <button 
                            type="button" 
                            onClick={() => !isFirst && moveWidget(idx, 'up')} 
                            disabled={isFirst} 
                            className="text-gray-400 hover:text-[#4A7C59] disabled:opacity-30"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => !isLast && moveWidget(idx, 'down')} 
                            disabled={isLast} 
                            className="text-gray-400 hover:text-[#4A7C59] disabled:opacity-30"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{meta.label}</span>
                      </div>
                      <ToggleSwitch checked={widget.isVisible} onChange={() => toggleWidgetVisibility(widget.id)} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'navigation':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#202225] border border-gray-100 dark:border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Отображение вкладок навигации</h3>
              <div className="space-y-2">
                {AVAILABLE_TABS.map(tab => {
                  const isEnabled = (settings.enabledTabs || []).includes(tab.id);
                  return (
                    <div key={tab.id} className="p-3.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-gray-500">{tab.icon}</div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{tab.label}</span>
                      </div>
                      <ToggleSwitch checked={isEnabled} onChange={() => toggleTab(tab.id)} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentSection = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-6">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
      />

      {/* Main Container */}
      <motion.div 
        initial={{ scale: 0.98, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.98, opacity: 0 }} 
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className="relative bg-white dark:bg-[#18191C] w-full max-w-6xl h-full md:max-h-[860px] md:rounded-2xl rounded-none shadow-2xl overflow-hidden flex flex-col border-0 md:border border-gray-200/80 dark:border-white/10"
      >
        {/* DESKTOP Top Header Bar (md and up) */}
        <header className="hidden md:flex h-16 px-6 bg-white dark:bg-[#18191C] border-b border-gray-100 dark:border-white/10 items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-headline font-bold text-lg text-gray-900 dark:text-white">Настройки</h2>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-white/10 px-2.5 py-0.5 rounded-full">
              Центр управления
            </span>
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

        {/* MOBILE Top Header Bar (< md) */}
        <header className="md:hidden h-14 px-4 bg-white dark:bg-[#18191C] border-b border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0">
          {showMobileMenu ? (
            <div className="flex items-center gap-2">
              <h2 className="font-headline font-bold text-lg text-gray-900 dark:text-white">Настройки</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4A7C59] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                Terra Hub
              </span>
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
                {currentSection.id === 'general' 
                  ? 'Общее' 
                  : currentSection.id === 'account' 
                    ? 'Аккаунт' 
                    : currentSection.label}
              </h3>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!showMobileMenu && (currentSection.id === 'general' || currentSection.id === 'account' || currentSection.id === 'budget') && (
              <button
                type="button"
                onClick={() => toast.success('Настройки сохранены')}
                className="px-3 py-1.5 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <Check size={14} />
                <span>Сохранить</span>
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 2-Column Core Layout / Mobile Screen */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* MOBILE MENU HUB (Only on screens < md when showMobileMenu is true) */}
          {showMobileMenu && (
            <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/70 dark:bg-[#151618]">
              {/* Profile Card */}
              <div 
                onClick={() => { setActiveSection('account'); setShowMobileMenu(false); }}
                className="p-4 rounded-2xl bg-white dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all hover:border-[#4A7C59]/40"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#4A7C59] dark:text-emerald-300 font-bold text-lg flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
                    {(currentUser?.displayName || accountLogin || 'А')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {currentUser?.displayName || accountLogin || 'Алексей Смирнов'}
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

              {/* Group 1: Основные настройки */}
              <div className="rounded-2xl bg-white dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 shadow-xs overflow-hidden">
                <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Основные настройки
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {[
                    { id: 'general', label: 'Общее', subtitle: 'Базовые параметры интерфейса и алгоритмов', icon: <SlidersHorizontal size={18} className="text-[#4A7C59] dark:text-emerald-400" />, iconBg: 'bg-emerald-50 dark:bg-emerald-950/40' },
                    { id: 'budget', label: 'Параметры бюджета', subtitle: 'Резерв, лимиты, зарплаты', icon: <Calculator size={18} className="text-blue-600 dark:text-blue-400" />, iconBg: 'bg-blue-50 dark:bg-blue-950/40' },
                    { id: 'members', label: 'Участники', subtitle: 'Список пользователей и профили', icon: <Users size={18} className="text-purple-600 dark:text-purple-400" />, iconBg: 'bg-purple-50 dark:bg-purple-950/40', badge: `${members.length} уч.` },
                    { id: 'categories', label: 'Категории и правила', subtitle: 'Автоматизация правил и теги', icon: <Tag size={18} className="text-amber-600 dark:text-amber-400" />, iconBg: 'bg-amber-50 dark:bg-amber-950/40' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setActiveSection(item.id as SectionType); setShowMobileMenu(false); }}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">{item.label}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{item.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {item.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group 2: Модули и сервисы */}
              <div className="rounded-2xl bg-white dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 shadow-xs overflow-hidden">
                <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Модули и сервисы
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {[
                    { id: 'ai_memory', label: 'Память AI', subtitle: 'AI ассистент, ключ Gemini, база знаний', icon: <BrainCircuit size={18} className="text-indigo-600 dark:text-indigo-400" />, iconBg: 'bg-indigo-50 dark:bg-indigo-950/40' },
                    { id: 'services', label: 'Сервисы и кошельки', subtitle: 'Кошелек, вишлист, долги', icon: <AppWindow size={18} className="text-rose-600 dark:text-rose-400" />, iconBg: 'bg-rose-50 dark:bg-rose-950/40' },
                    { id: 'telegram', label: 'Telegram-уведомления', subtitle: 'Бот, форматы отчетов и чек', icon: <Send size={18} className="text-sky-500 dark:text-sky-400" />, iconBg: 'bg-sky-50 dark:bg-sky-950/40' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setActiveSection(item.id as SectionType); setShowMobileMenu(false); }}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">{item.label}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{item.subtitle}</div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-400 dark:text-gray-500 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Group 3: Система и интерфейс */}
              <div className="rounded-2xl bg-white dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 shadow-xs overflow-hidden">
                <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Система и интерфейс
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {[
                    { id: 'family', label: 'Синхронизация и доступ', subtitle: 'ID пространства, перенос данных', icon: <Cloud size={18} className="text-teal-600 dark:text-teal-400" />, iconBg: 'bg-teal-50 dark:bg-teal-950/40' },
                    { id: 'widgets', label: 'Виджеты', subtitle: 'Порядок и видимость блоков', icon: <LayoutGrid size={18} className="text-gray-700 dark:text-gray-300" />, iconBg: 'bg-gray-100 dark:bg-white/10' },
                    { id: 'navigation', label: 'Навигация', subtitle: 'Нижняя панель и вкладки', icon: <Menu size={18} className="text-gray-700 dark:text-gray-300" />, iconBg: 'bg-gray-100 dark:bg-white/10' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setActiveSection(item.id as SectionType); setShowMobileMenu(false); }}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
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

              {/* Footer version */}
              <div className="text-center pb-8 pt-2">
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                  Terra Hub • v2.4 • Умный семейный бюджет
                </p>
              </div>
            </div>
          )}

          {/* DESKTOP Navigation Sidebar (always visible on md+) */}
          <aside className="hidden md:flex w-[280px] lg:w-[310px] bg-gray-50 dark:bg-[#1E2023] border-r border-gray-100 dark:border-white/10 p-4 flex-col shrink-0 overflow-y-auto">
            <div className="px-2 pt-1 pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Разделы системы
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
                        ? 'bg-[#4A7C59] text-white shadow-sm' 
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
            {/* Desktop Section Header (hidden on mobile since mobile header is at top, and hidden for categories which has its own toolbar) */}
            {currentSection.id !== 'categories' && (
              <div className="hidden md:flex p-6 border-b border-gray-100 dark:border-white/10 items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                        {currentSection.id === 'general' 
                          ? 'Основные настройки' 
                          : currentSection.id === 'account' 
                            ? 'Аккаунт и безопасность' 
                            : currentSection.id === 'budget'
                              ? 'Параметры бюджета'
                              : currentSection.label}
                      </h3>
                      {currentSection.id === 'account' && (
                        <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          ID: {currentFamilyId ? currentFamilyId.slice(0, 8) : '849-01'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {currentSection.id === 'general' 
                        ? 'Базовые параметры интерфейса и алгоритмов.' 
                        : currentSection.id === 'account' 
                          ? 'Управление доступом к семейному пространству и смена учетных данных' 
                          : currentSection.id === 'budget'
                            ? 'Финансовый цикл, суточные лимиты, зарплатные даты и авто-резерв'
                            : currentSection.subtitle}
                    </p>
                  </div>
                </div>

                {(currentSection.id === 'general' || currentSection.id === 'account' || currentSection.id === 'budget') && (
                  <button
                    type="button"
                    onClick={() => toast.success('Настройки сохранены')}
                    className="px-4 py-2 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <Check size={16} />
                    <span className="hidden sm:inline">Сохранить изменения</span>
                    <span className="sm:hidden">Сохранить</span>
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Section Content Canvas */}
            <div className={`flex-1 ${currentSection.id === 'categories' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6'}`}>
              {renderSectionContent()}
            </div>
          </main>
        </div>
      </motion.div>

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
              <button type="button" onClick={() => setShowInstallGuide(false)} className="w-full bg-[#4A7C59] text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer">
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
            {/* Backdrop with Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[6px]"
            />

            {/* Confirmation Dialog Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1E2023] rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-hidden border border-gray-200/80 dark:border-white/10 z-10"
            >
              {/* Subtle ambient decorative glows */}
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
                      Terra Hub v3.4 • Узел «Северный»
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
                  <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Устройство авторизации</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">MacBook Pro (Главный терминал)</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-[#18191C] rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Сохраненных черновиков</span>
                  <span className="text-xs font-bold text-[#4A7C59] dark:text-emerald-400 flex items-center gap-1">
                    <CheckCheck size={14} /> Все 18 записаны
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
