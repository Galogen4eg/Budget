
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Trash2, CheckCircle2, Plus, Edit2, Check, Clock, 
  Wallet, Tag, ChevronDown, Sparkles, Globe, Smartphone, 
  LayoutGrid, ToggleLeft, ToggleRight, Shield, Lock, Key, Copy, 
  Users, Share, LogOut, ChevronRight, Download, Calculator, 
  DollarSign, GripVertical, Loader2, Monitor, Menu, 
  MessageCircle, AppWindow, MoreHorizontal, ArrowLeft, 
  ArrowRight, Eye, EyeOff, ChevronLeft, Save, Calendar, Circle,
  ChevronUp, AlertOctagon, ShoppingBag, ShieldCheck, BellRing,
  BookOpen, FolderOpen, ArrowUp, ArrowDown, Zap, Gift, RefreshCw, Wand2, Settings2, Moon, Sun, ScanSearch, Files, MessageSquareQuote, Info, Send,
  Cloud, CloudOff, Wifi, WifiOff, Cpu, Play, BrainCircuit, Mail, RefreshCcw, MoveUpRight
} from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, MandatoryExpense, Transaction, WidgetConfig, AIKnowledgeItem } from '../types';
import { MemberMarker, getIconById } from '../constants';
import { auth } from '../firebase';
import { GoogleGenAI } from '../utils/geminiProxy';
import { useData } from '../contexts/DataContext';
import { createInvitation, deleteItem, joinFamily, migrateFamilyData } from '../utils/db';
import CategoriesSettings from './CategoriesSettings';
import { toast } from 'sonner';

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

type SectionType = 'general' | 'budget' | 'members' | 'categories' | 'widgets' | 'navigation' | 'services' | 'telegram' | 'family' | 'ai_memory';

const SECTIONS: { id: SectionType; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Общее', icon: <Globe size={20} /> },
  { id: 'budget', label: 'Бюджет', icon: <Calculator size={20} /> },
  { id: 'members', label: 'Участники', icon: <Users size={20} /> },
  { id: 'categories', label: 'Категории и правила', icon: <Tag size={20} /> },
  { id: 'ai_memory', label: 'Память AI', icon: <BrainCircuit size={20} /> },
  { id: 'navigation', label: 'Навигация', icon: <Menu size={20} /> },
  { id: 'services', label: 'Сервисы', icon: <AppWindow size={20} /> },
  { id: 'widgets', label: 'Виджеты', icon: <LayoutGrid size={20} /> },
  { id: 'telegram', label: 'Telegram и шаблоны', icon: <MessageSquareQuote size={20} /> },
  { id: 'family', label: 'Семья и Доступ', icon: <Share size={20} /> },
];

const PRESET_COLORS = [ '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#FF3B30', '#5856D6', '#00C7BE', '#8E8E93', '#BF5AF2', '#1C1C1E' ];

const AVAILABLE_TABS = [
    { id: 'overview', label: 'Обзор', icon: <LayoutGrid size={20}/> },
    { id: 'budget', label: 'Бюджет', icon: <Calculator size={20}/> },
    { id: 'plans', label: 'Планы', icon: <Calendar size={20}/> },
    { id: 'shopping', label: 'Покупки', icon: <ShoppingBag size={20}/> },
    { id: 'services', label: 'Сервисы', icon: <AppWindow size={20}/> }
];

const AVAILABLE_SERVICES = [
    { id: 'wallet', label: 'Кошелек', desc: 'Карты лояльности', icon: <Wallet size={20}/> },
    { id: 'chat', label: 'AI Советник', desc: 'Финансовый помощник', icon: <Sparkles size={20}/> },
    { id: 'projects', label: 'Проекты', desc: 'Временные бюджеты', icon: <FolderOpen size={20}/> }
];

const Switch = ({ checked, onChange, id }: { checked: boolean, onChange: (e: any) => void, id?: string }) => (
    <button id={id} onClick={onChange} className={`w-11 h-6 rounded-full p-1 transition-colors relative ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const TemplateEditor = ({ label, value, onChange, variables, previewData }: { label: string, value: string, onChange: (val: string) => void, variables: string[], previewData: any }) => {
    const handleAddVar = (v: string) => onChange((value || '') + ` ${v}`);
    
    // Generate preview
    let previewText = value || '';
    Object.keys(previewData).forEach(key => {
        previewText = previewText.replace(new RegExp(key, 'g'), previewData[key]);
    });

    return (
        <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-gray-500 ml-2">{label}</label>
            <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl border border-gray-100 dark:border-white/10 space-y-3">
                <textarea 
                    value={value || ''} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl font-mono text-xs text-[#1C1C1E] dark:text-white outline-none h-24 resize-none border border-gray-200 dark:border-white/5 focus:border-blue-500 transition-colors" 
                    placeholder="Настройте текст..." 
                />
                
                <div className="flex flex-wrap gap-2">
                    {variables.map(v => (
                        <button key={v} onClick={() => handleAddVar(v)} className="bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 px-2 py-1.5 rounded-lg text-[10px] font-bold text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                            {v}
                        </button>
                    ))}
                </div>

                <div className="mt-2 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/20">
                    <span className="text-[9px] font-bold text-blue-400 uppercase mb-1 block">Предпросмотр</span>
                    <p className="text-xs font-medium text-[#1C1C1E] dark:text-white whitespace-pre-wrap">{previewText}</p>
                </div>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate, savingsRate, setSavingsRate, members, onUpdateMembers, categories, onUpdateCategories, onDeleteCategory, learnedRules, onUpdateRules, currentFamilyId, onJoinFamily, onLogout, installPrompt, transactions = [], onDeleteTransactionsByPeriod, onUpdateTransactions, onOpenDuplicates }) => {
  const [activeSection, setActiveSection] = useState<SectionType>('general');
  const [showMobileMenu, setShowMobileMenu] = useState(window.innerWidth < 768);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  
  // Data Context Access for AI Knowledge
  const { aiKnowledge, deleteAIKnowledge, addAIKnowledge } = useData();
  const [newFact, setNewFact] = useState('');

  // Members Management
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [tempMemberName, setTempMemberName] = useState('');
  const [tempMemberEmail, setTempMemberEmail] = useState('');
  const [tempMemberColor, setTempMemberColor] = useState(PRESET_COLORS[0]);

  // Family ID Switch State
  const [newFamilyId, setNewFamilyId] = useState(currentFamilyId || '');
  const [isJoining, setIsJoining] = useState(false);
  const [shouldMigrate, setShouldMigrate] = useState(false);

  // Tools
  const [deleteStart, setDeleteStart] = useState('');
  const [deleteEnd, setDeleteEnd] = useState('');

  // AI Testing State
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const apiKey = settings.geminiApiKey || "";
  const isAIEnabled = !!apiKey;

  // Sync internal state with prop
  useEffect(() => {
    if (currentFamilyId) setNewFamilyId(currentFamilyId);
  }, [currentFamilyId]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTestKey = async () => {
      if (!apiKey) return;
      setAiTestStatus('loading');
      try {
          const ai = new GoogleGenAI({ apiKey: apiKey });
          await ai.models.generateContent({
              model: "gemini-3-flash-preview",
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

  // --- Member Logic ---
  const handleOpenMember = (member?: FamilyMember) => {
      if (member) {
          setEditingMember(member);
          setTempMemberName(member.name);
          setTempMemberEmail(member.email || '');
          setTempMemberColor(member.color);
      } else {
          setEditingMember(null);
          setTempMemberName('');
          setTempMemberEmail('');
          setTempMemberColor(PRESET_COLORS[0]);
      }
      setIsMemberModalOpen(true);
  };

  const handleSaveMember = async () => {
      if (!tempMemberName.trim()) return;
      
      const email = tempMemberEmail.trim().toLowerCase();

      if (editingMember) {
          const updated = members.map(m => m.id === editingMember.id ? { 
              ...m, 
              name: tempMemberName, 
              color: tempMemberColor,
              email: email || undefined 
          } : m);
          onUpdateMembers(updated);
          
          // Re-invite if email changed and not yet linked
          if (currentFamilyId && email && email !== editingMember.email && !editingMember.userId) {
              try {
                  await createInvitation(currentFamilyId, email, editingMember.id);
                  alert(`Приглашение отправлено для ${email}. Когда пользователь войдет через Google, он будет добавлен.`);
              } catch (e: any) {
                  console.error("Invite error:", e);
                  alert(`Не удалось создать приглашение: ${e.message}. Проверьте права доступа (Rules) и интернет.`);
              }
          }
      } else {
          const newMemberId = Math.random().toString(36).substr(2, 9);
          const newMember: FamilyMember = { 
              id: newMemberId, 
              name: tempMemberName, 
              color: tempMemberColor,
              email: email || undefined,
              isAdmin: false,
              avatar: '', 
              userId: ''  
          };
          onUpdateMembers([...members, newMember]);

          if (currentFamilyId && email) {
              try {
                  await createInvitation(currentFamilyId, email, newMemberId);
                  alert(`Приглашение создано для ${email}. Когда пользователь войдет через Google, он будет автоматически добавлен.`);
              } catch (e: any) {
                  console.error("Invite error:", e);
                  alert(`Не удалось создать приглашение: ${e.message}. Проверьте права доступа (Rules) и интернет.`);
              }
          }
      }
      setIsMemberModalOpen(false);
  };

  const handleDeleteMember = async () => {
      if (!editingMember) return;
      if (members.length <= 1) {
          alert("Нельзя удалить последнего участника");
          return;
      }
      if (confirm(`Удалить участника ${editingMember.name}?`)) {
          onUpdateMembers(members.filter(m => m.id !== editingMember.id));
          if (currentFamilyId) {
              try {
                  await deleteItem(currentFamilyId, 'members', editingMember.id);
              } catch (e) {
                  console.error("Failed to delete member:", e);
              }
          }
          setIsMemberModalOpen(false);
      }
  };

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
      const isDark = settings.theme === 'dark';
      const nextTheme = isDark ? 'light' : 'dark';

      if (!(document as any).startViewTransition) {
          handleChange('theme', nextTheme);
          return;
      }

      const x = e.clientX;
      const y = e.clientY;
      const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
      );

      const transition = (document as any).startViewTransition(() => {
          handleChange('theme', nextTheme);
      });

      transition.ready.then(() => {
          document.documentElement.animate(
              {
                  clipPath: [
                      `circle(0px at ${x}px ${y}px)`,
                      `circle(${endRadius}px at ${x}px ${y}px)`,
                  ],
              },
              {
                  duration: 500,
                  easing: "ease-in-out",
                  pseudoElement: "::view-transition-new(root)",
              }
          );
      });
  };

  const handleUpdateFamilyId = async () => {
      const targetId = newFamilyId.trim();
      if (!targetId) {
          alert("ID не может быть пустым");
          return;
      }
      if (targetId === currentFamilyId) return;

      if (!confirm(`Вы уверены, что хотите сменить ID на ${targetId}?`)) return;

      setIsJoining(true);
      try {
          if (shouldMigrate && currentFamilyId) {
              toast.info('Начинаем перенос данных...');
              await migrateFamilyData(currentFamilyId, targetId);
              toast.success('Данные успешно перенесены!');
          }
          await onJoinFamily(targetId);
      } catch (e: any) {
          toast.error(e.message || "Ошибка при смене ID");
          setIsJoining(false);
      }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
        case 'ai_memory': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-pink-50 dark:bg-pink-900/30 rounded-xl text-pink-500">
                            <BrainCircuit size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white">Память AI</h3>
                            <p className="text-[10px] text-gray-400">То, чему вы научили ассистента</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl mb-4 border border-gray-100 dark:border-white/5">
                        <input 
                            type="text" 
                            placeholder="Добавить факт (напр. код от домофона 123)" 
                            value={newFact}
                            onChange={e => setNewFact(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && newFact.trim() && (addAIKnowledge(newFact.trim()), setNewFact(''))}
                            className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white mb-2"
                        />
                        <button 
                            onClick={() => { if(newFact.trim()) { addAIKnowledge(newFact.trim()); setNewFact(''); } }}
                            className="w-full py-2 bg-[#1C1C1E] dark:bg-white text-white dark:text-black font-black uppercase text-xs rounded-xl"
                        >
                            Добавить в память
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                        {aiKnowledge.length === 0 ? (
                            <p className="text-center text-xs text-gray-400 py-4">Память пуста. Скажите ассистенту "Запомни..." или добавьте здесь.</p>
                        ) : (
                            aiKnowledge.map(item => (
                                <div key={item.id} className="flex items-start justify-between p-3 bg-white dark:bg-[#2C2C2E] rounded-xl border border-gray-50 dark:border-white/5">
                                    <span className="text-sm font-medium text-[#1C1C1E] dark:text-white pr-2">{item.text}</span>
                                    <button onClick={() => deleteAIKnowledge(item.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
        case 'budget': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] space-y-6 border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white">Настройки бюджета</h3>
                    
                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500">Процент в копилку: {savingsRate}%</span>
                        </div>
                        <input type="range" min="0" max="50" step="1" value={savingsRate} onChange={e => setSavingsRate(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white dark:bg-white/10 text-indigo-500"><Lock size={20} /></div>
                            <div>
                                <div className="font-bold text-sm text-[#1C1C1E] dark:text-white">Умный резерв</div>
                                <div className="text-[10px] text-gray-400">Резервировать деньги на обязательные платежи</div>
                            </div>
                        </div>
                        <Switch checked={settings.enableSmartReserve ?? true} onChange={() => handleChange('enableSmartReserve', !(settings.enableSmartReserve ?? true))} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl">
                            <label className="text-xs font-bold text-gray-500 block mb-1">Начальный баланс</label>
                            <input 
                                type="number" 
                                step="0.01"
                                placeholder="0"
                                value={settings.initialBalance || ''} 
                                onChange={e => handleChange('initialBalance', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                                className="w-full bg-transparent font-bold text-lg outline-none text-[#1C1C1E] dark:text-white placeholder:text-gray-300" 
                            />
                        </div>
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl">
                            <label className="text-xs font-bold text-gray-500 block mb-1">Дата начала</label>
                            <input type="date" value={settings.initialBalanceDate || ''} onChange={e => handleChange('initialBalanceDate', e.target.value)} className="w-full bg-transparent font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                        </div>
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl">
                            <label className="text-xs font-bold text-gray-500 block mb-1">Начало дня (ч)</label>
                            <input 
                                type="number" 
                                min="0" max="23"
                                value={settings.dayStartHour ?? 8} 
                                onChange={e => handleChange('dayStartHour', parseInt(e.target.value))} 
                                className="w-full bg-transparent font-bold text-lg outline-none text-[#1C1C1E] dark:text-white" 
                            />
                        </div>
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl">
                            <label className="text-xs font-bold text-gray-500 block mb-1">Конец дня (ч)</label>
                            <input 
                                type="number" 
                                min="1" max="24"
                                value={settings.dayEndHour ?? 23} 
                                onChange={e => handleChange('dayEndHour', parseInt(e.target.value))} 
                                className="w-full bg-transparent font-bold text-lg outline-none text-[#1C1C1E] dark:text-white" 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 ml-2">Даты зарплаты</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {[1, 5, 10, 15, 20, 25, 30].map(day => (
                                <button key={day} onClick={() => {
                                    const current = settings.salaryDates || [];
                                    const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
                                    handleChange('salaryDates', updated);
                                }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${settings.salaryDates?.includes(day) ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-400'}`}>
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white">Инструменты</h3>
                    <button onClick={onOpenDuplicates} className="w-full flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl font-bold text-sm">
                        <div className="flex items-center gap-3"><Copy size={18} /><span>Поиск дублей операций</span></div>
                        <ChevronRight size={18} />
                    </button>
                    <div className="pt-4 border-t border-gray-50 dark:border-white/5 space-y-3">
                        <label className="text-xs font-bold text-gray-500 ml-2">Массовое удаление</label>
                        <div className="flex gap-2">
                            <input type="date" value={deleteStart} onChange={e => setDeleteStart(e.target.value)} className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl text-xs font-bold outline-none dark:text-white" />
                            <input type="date" value={deleteEnd} onChange={e => setDeleteEnd(e.target.value)} className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl text-xs font-bold outline-none dark:text-white" />
                        </div>
                        <button onClick={() => onDeleteTransactionsByPeriod?.(deleteStart, deleteEnd)} disabled={!deleteStart || !deleteEnd} className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 disabled:opacity-30">Очистить историю за период</button>
                    </div>
                </div>
            </div>
        );
        case 'members': return (
            <div className="space-y-6 relative h-full">
                <AnimatePresence>
                    {isMemberModalOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="absolute inset-0 z-50 bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-2xl flex flex-col"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-[#1C1C1E] dark:text-white">{editingMember ? 'Редактировать' : 'Новый участник'}</h3>
                                <button onClick={() => setIsMemberModalOpen(false)} className="p-2 bg-gray-100 dark:bg-[#3A3A3C] rounded-full"><X size={20} className="text-gray-500 dark:text-gray-300" /></button>
                            </div>
                            
                            <div className="flex-1 space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-2 block">Имя</label>
                                    <input 
                                        type="text" 
                                        value={tempMemberName}
                                        onChange={(e) => setTempMemberName(e.target.value)}
                                        placeholder="Имя"
                                        className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl font-bold text-lg outline-none text-[#1C1C1E] dark:text-white border border-transparent focus:border-blue-500 transition-colors"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-2 block">Email (для приглашения)</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-4 top-4 text-gray-400" />
                                        <input 
                                            type="email" 
                                            value={tempMemberEmail}
                                            onChange={(e) => setTempMemberEmail(e.target.value)}
                                            placeholder="user@gmail.com"
                                            className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 pl-12 rounded-2xl font-medium text-sm outline-none text-[#1C1C1E] dark:text-white border border-transparent focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 ml-2">Если указать почту, пользователь будет автоматически добавлен в семью при входе через Google.</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-2 block">Цвет</label>
                                    <div className="flex flex-wrap gap-3 bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl">
                                        {PRESET_COLORS.map(c => (
                                            <button 
                                                key={c} 
                                                onClick={() => setTempMemberColor(c)} 
                                                className={`w-10 h-10 rounded-full transition-transform ${tempMemberColor === c ? 'scale-110 ring-4 ring-offset-2 ring-blue-500 dark:ring-offset-[#2C2C2E]' : 'hover:scale-105'}`} 
                                                style={{ backgroundColor: c }} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-auto">
                                {editingMember && (
                                    <button onClick={handleDeleteMember} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                        <Trash2 size={24} />
                                    </button>
                                )}
                                <button 
                                    onClick={handleSaveMember}
                                    disabled={!tempMemberName.trim()}
                                    className="flex-1 bg-blue-500 text-white p-4 rounded-2xl font-black uppercase text-sm shadow-xl active:scale-95 transition-transform disabled:opacity-50"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm h-full flex flex-col">
                    <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white mb-4">Участники семьи</h3>
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                        {members.map(member => (
                            <div 
                                key={member.id} 
                                onClick={() => handleOpenMember(member)}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <MemberMarker member={member} size="md" />
                                    <div>
                                        <div className="font-bold text-[#1C1C1E] dark:text-white">{member.name}</div>
                                        {member.email && <div className="text-[10px] text-gray-400">{member.email}</div>}
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-300 dark:text-gray-600" />
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => handleOpenMember()}
                        className="w-full mt-4 bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <Plus size={18} strokeWidth={3} /> Добавить участника
                    </button>
                </div>
            </div>
        );
        case 'categories': return (
            <div className="h-full overflow-hidden">
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
        case 'navigation': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white">Нижняя панель</h3>
                    <div className="grid gap-3">
                        {AVAILABLE_TABS.map(tab => (
                            <div key={tab.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl">
                                <div className="flex items-center gap-3"><div className="text-gray-400">{tab.icon}</div><span className="font-bold text-sm">{tab.label}</span></div>
                                <Switch checked={(settings.enabledTabs || []).includes(tab.id)} onChange={() => toggleTab(tab.id)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
        case 'services': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white">Сервисы</h3>
                    <div className="grid gap-3">
                        {AVAILABLE_SERVICES.map(svc => (
                            <div key={svc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl">
                                <div className="flex items-center gap-3"><div className="text-gray-400">{svc.icon}</div><div><div className="font-bold text-sm">{svc.label}</div><div className="text-[10px] text-gray-400 uppercase">{svc.desc}</div></div></div>
                                <Switch checked={(settings.enabledServices || []).includes(svc.id)} onChange={() => toggleService(svc.id)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
        case 'widgets': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white mb-4">Главный экран</h3>
                    <p className="text-xs text-gray-400 mb-4">Настройте видимость и порядок виджетов (для мобильной версии).</p>
                    <div className="space-y-3">
                        {(settings.widgets || []).map((widget, idx) => {
                            const meta = WIDGET_METADATA.find(m => m.id === widget.id);
                            if (!meta) return null;
                            const isFirst = idx === 0;
                            const isLast = idx === (settings.widgets || []).length - 1;

                            return (
                                <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border dark:border-white/5">
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="flex flex-col gap-1 mr-2">
                                            <button 
                                                onClick={() => !isFirst && moveWidget(idx, 'up')} 
                                                disabled={isFirst}
                                                className={`p-1 rounded-md transition-colors ${isFirst ? 'text-gray-300 dark:text-gray-600' : 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                            <button 
                                                onClick={() => !isLast && moveWidget(idx, 'down')} 
                                                disabled={isLast}
                                                className={`p-1 rounded-md transition-colors ${isLast ? 'text-gray-300 dark:text-gray-600' : 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                        </div>
                                        <span className="font-bold text-sm">{meta.label}</span>
                                    </div>
                                    <Switch checked={widget.isVisible} onChange={() => toggleWidgetVisibility(widget.id)} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
        case 'telegram': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 mb-2"><div className="bg-blue-500 p-2 rounded-xl text-white"><BellRing size={20}/></div><h3 className="text-lg font-bold">Telegram и уведомления</h3></div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 ml-2">Токен бота</label>
                        <input type="password" value={settings.telegramBotToken || ''} onChange={e => handleChange('telegramBotToken', e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl font-mono text-xs outline-none" placeholder="000000:ABC..." />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 ml-2">ID чата</label>
                        <input type="text" value={settings.telegramChatId || ''} onChange={e => handleChange('telegramChatId', e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl font-mono text-xs outline-none" placeholder="-100..." />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="text-gray-400"><Send size={20}/></div>
                            <div>
                                <div className="font-bold text-sm">Авто-отправка событий</div>
                                <div className="text-[10px] text-gray-400">Отправлять новые события в чат</div>
                            </div>
                        </div>
                        <Switch checked={settings.autoSendEventsToTelegram} onChange={() => handleChange('autoSendEventsToTelegram', !settings.autoSendEventsToTelegram)} />
                    </div>

                    <div className="pt-2 space-y-4 border-t dark:border-white/10">
                        <TemplateEditor 
                            label="Шаблон списка покупок" 
                            value={settings.shoppingTemplate || '🛒 *Список покупок*\n\n{items}'} 
                            onChange={(val) => handleChange('shoppingTemplate', val)} 
                            variables={['{items}', '{total}', '{date}']} 
                            previewData={{ '{items}': '• Молоко\n• Хлеб', '{total}': '2', '{date}': '10.10.2023' }}
                        />
                        <TemplateEditor 
                            label="Шаблон событий" 
                            value={settings.eventTemplate || '📅 *{title}*\n🕒 {date} {time}\n📝 {description}\n👥 {members}\n📋 {checklist}'} 
                            onChange={(val) => handleChange('eventTemplate', val)} 
                            variables={['{title}', '{date}', '{time}', '{description}', '{members}', '{checklist}']} 
                            previewData={{ '{title}': 'Врач', '{date}': '10.10.2023', '{time}': '14:00', '{description}': 'Взять полис', '{members}': 'Мама, Папа', '{checklist}': '• Паспорт' }}
                        />
                    </div>
                </div>
            </div>
        );
        case 'family': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-[#1C1C1E] dark:text-white">Семейный доступ</h3>
                    
                    {/* Status Card */}
                    <div className={`p-5 rounded-2xl flex items-center gap-4 mb-6 ${currentFamilyId ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900/30' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-green-900/30'}`}>
                        <div className={`p-3 rounded-full ${currentFamilyId ? 'bg-white/50 dark:bg-white/10' : 'bg-white/50 dark:bg-white/10'}`}>
                            {currentFamilyId ? <Cloud size={24} /> : <CloudOff size={24} />}
                        </div>
                        <div>
                            <div className="font-black text-sm uppercase tracking-wide">
                                {currentFamilyId ? 'Синхронизация активна' : 'Локальный режим'}
                            </div>
                            <div className="text-xs mt-1 font-medium opacity-80">
                                {auth.currentUser?.email ? (
                                    <>Аккаунт: {auth.currentUser.email}</>
                                ) : (
                                    <>Вы вошли как Гость</>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl mb-4 border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Key size={16} className="text-purple-500" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Текущий Family ID</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newFamilyId}
                                    onChange={(e) => setNewFamilyId(e.target.value)}
                                    className={`flex-1 bg-white dark:bg-[#1C1C1E] p-4 rounded-xl font-mono text-sm font-bold border transition-all ${newFamilyId !== currentFamilyId ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-transparent'}`}
                                    placeholder="Введите ID"
                                />
                                {newFamilyId !== currentFamilyId && (
                                    <button 
                                        onClick={handleUpdateFamilyId}
                                        disabled={isJoining}
                                        className="bg-blue-500 text-white p-4 rounded-xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50 shadow-lg shadow-blue-500/20"
                                    >
                                        {isJoining ? <Loader2 size={20} className="animate-spin" /> : <RefreshCcw size={20} />}
                                    </button>
                                )}
                            </div>
                            
                            {newFamilyId !== currentFamilyId && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="px-1"
                                >
                                    <label className="flex items-center gap-3 p-3 bg-white dark:bg-[#1C1C1E] rounded-xl border border-blue-100 dark:border-blue-900/20 cursor-pointer active:scale-98 transition-transform shadow-sm">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${shouldMigrate ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-[#3A3A3C] text-gray-400'}`}>
                                            <MoveUpRight size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold dark:text-white leading-tight">Перенести текущие данные</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">Скопировать все записи в новую семью</p>
                                        </div>
                                        <Switch checked={shouldMigrate} onChange={() => setShouldMigrate(!shouldMigrate)} />
                                    </label>
                                </motion.div>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 leading-relaxed px-1">Чтобы присоединиться к существующей семье, введите её ID выше и нажмите кнопку обновления. Чтобы создать свою группу, введите любой уникальный ID.</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t dark:border-white/10">
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                            <AlertOctagon size={18} className="text-amber-500 shrink-0" />
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed uppercase tracking-wider">
                                Внимание: переключение ID сменит текущий набор данных. Используйте опцию "Перенос", если хотите сохранить записи.
                            </p>
                        </div>
                    </div>

                    {currentFamilyId && (
                        <button onClick={() => {
                            const link = `${window.location.origin}/?join=${currentFamilyId}`;
                            if (navigator.share) navigator.share({ title: 'Семейный Бюджет', text: 'Присоединяйся к нашему бюджету!', url: link });
                            else { navigator.clipboard.writeText(link); alert("Ссылка скопирована"); }
                        }} className="w-full mt-6 bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg">
                            <Share size={16} /> Поделиться кодом
                        </button>
                    )}
                </div>
            </div>
        );
        case 'general': default: return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] space-y-5 border border-gray-100 dark:border-white/10 shadow-sm">
                  <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white mb-4">Основные настройки</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 ml-2">Название семьи</label>
                    <input type="text" value={settings.familyName} onChange={(e) => handleChange('familyName', e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] dark:text-white outline-none" />
                  </div>
                  
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border dark:border-white/5">
                      <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-white dark:bg-white/10 shadow-sm text-gray-500 dark:text-white">{settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</div><span className="font-bold text-sm">Темная тема</span></div>
                      <Switch checked={settings.theme === 'dark'} onChange={toggleTheme} />
                  </div>

                  {/* AI Status Indicator with Key Input */}
                  <div className={`p-5 rounded-[1.5rem] border transition-all ${isAIEnabled ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20' : 'bg-gray-50 dark:bg-[#2C2C2E] border-gray-100 dark:border-white/5'}`}>
                      <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isAIEnabled ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-purple-400' : 'bg-white dark:bg-white/5 text-gray-400'}`}>
                              <Sparkles size={20} />
                          </div>
                          <div>
                              <h3 className={`font-bold text-sm ${isAIEnabled ? 'text-purple-900 dark:text-purple-100' : 'text-gray-700 dark:text-gray-300'}`}>AI Ассистент (Gemini)</h3>
                              <p className="text-[10px] opacity-70">
                                  {isAIEnabled ? 'Функции доступны' : 'Требуется настройка'}
                              </p>
                          </div>
                          <div className={`ml-auto px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isAIEnabled ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                              {isAIEnabled ? 'Active' : 'Setup'}
                          </div>
                      </div>
                      
                      <div className="space-y-3">
                          <div className="relative">
                              <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                  type="password" 
                                  value={settings.geminiApiKey || ''} 
                                  onChange={e => handleChange('geminiApiKey', e.target.value)}
                                  className="w-full bg-white dark:bg-[#1C1C1E] pl-11 pr-4 py-3 rounded-xl font-mono text-xs outline-none border border-transparent focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-[#1C1C1E] dark:text-white shadow-sm" 
                                  placeholder="Вставьте API ключ (AIza...)" 
                              />
                          </div>
                          
                          <div className="flex justify-between items-center px-1">
                              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 hover:underline">
                                  Получить ключ бесплатно <MoveUpRight size={10} />
                              </a>
                              {settings.geminiApiKey && (
                                  <span className="text-[9px] text-green-500 font-bold flex items-center gap-1">
                                      <Check size={10} /> Сохранено
                                  </span>
                              )}
                          </div>

                          {settings.geminiApiKey && (
                              <button 
                                  onClick={handleTestKey} 
                                  disabled={aiTestStatus === 'loading'}
                                  className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                      aiTestStatus === 'success' 
                                          ? 'bg-green-500 text-white' 
                                          : aiTestStatus === 'error'
                                              ? 'bg-red-500 text-white'
                                              : 'bg-white dark:bg-[#2C2C2E] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-200 dark:border-white/5'
                                  }`}
                              >
                                  {aiTestStatus === 'loading' ? <Loader2 size={14} className="animate-spin"/> : 
                                   aiTestStatus === 'success' ? <Check size={14}/> : 
                                   aiTestStatus === 'error' ? <AlertOctagon size={14}/> : <Play size={14}/>}
                                  {aiTestStatus === 'success' ? 'Работает!' : aiTestStatus === 'error' ? 'Ошибка проверки' : 'Проверить ключ'}
                              </button>
                          )}
                      </div>
                  </div>

                  <div className="pt-2"><button onClick={() => installPrompt ? installPrompt.prompt() : setShowInstallGuide(true)} className="w-full flex items-center justify-center gap-3 p-5 bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"><Smartphone size={20} /> Установить на телефон</button></div>
                  <div className="pt-4 border-t dark:border-white/10"><button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100"><LogOut size={18} /> Выйти</button></div>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" />
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }} 
            className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-7xl h-full md:h-[85vh] md:rounded-[3rem] rounded-none shadow-2xl overflow-hidden flex flex-col md:flex-row border dark:border-white/10"
        >
            <div className={`bg-white dark:bg-[#1C1C1E] border-r dark:border-white/10 flex-col shrink-0 overflow-y-auto no-scrollbar md:w-64 md:flex md:static ${showMobileMenu ? 'flex absolute inset-0 w-full z-20' : 'hidden'}`}>
                <div className="p-6 md:p-8 pt-safe md:pt-8 border-b dark:border-white/5 flex items-center justify-between md:justify-start gap-3 text-[#1C1C1E] dark:text-white"><span className="font-black text-xl">Настройки</span><button onClick={onClose} className="md:hidden w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center"><X size={20}/></button></div>
                <div className="flex-1 p-4 space-y-2">
                    {SECTIONS.map(section => (
                        <button key={section.id} onClick={() => { setActiveSection(section.id); setShowMobileMenu(false); }} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeSection === section.id && !showMobileMenu ? 'bg-blue-500 text-white shadow-lg' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeSection === section.id && !showMobileMenu ? 'bg-white/20' : 'bg-gray-50 dark:bg-white/10'}`}>{section.icon}</div>
                            <span className="font-bold text-sm flex-1 text-left">{section.label}</span>
                            <ChevronRight size={16} className="opacity-40" />
                        </button>
                    ))}
                </div>
            </div>
            <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F2F2F7] dark:bg-black pt-safe md:pt-0 ${showMobileMenu ? 'hidden' : 'flex'}`}>
                <div className="p-4 md:p-6 border-b dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md flex justify-between items-center text-[#1C1C1E] dark:text-white">
                    <div className="flex items-center gap-2"><button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 text-gray-500"><ArrowLeft size={24} /></button><h2 className="text-xl font-black">{SECTIONS.find(s => s.id === activeSection)?.label}</h2></div>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center"><X size={20}/></button>
                </div>
                <div className={`flex-1 overflow-y-auto no-scrollbar overscroll-contain ${activeSection === 'categories' ? 'p-0' : 'p-4 md:p-8 pb-24 md:pb-8'}`}>
                    <div className={`max-w-4xl mx-auto w-full h-full ${activeSection === 'categories' ? 'max-w-full' : ''}`}>
                        {renderSectionContent()}
                    </div>
                </div>
            </div>
        </motion.div>
        <AnimatePresence>{showInstallGuide && (
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6"><motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setShowInstallGuide(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" /><motion.div initial={{scale:0.9, opacity:0, y:20}} animate={{scale:1, opacity:1, y:0}} exit={{scale:0.9, opacity:0, y:20}} className="relative bg-white dark:bg-[#1C1C1E] p-8 rounded-[3rem] shadow-2xl max-w-sm w-full space-y-6"><div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl flex items-center justify-center mx-auto"><Smartphone size={32} /></div><div className="text-center"><h3 className="text-xl font-black">Установка</h3><p className="text-sm text-gray-500">Добавьте приложение на главный экран для быстрого доступа.</p></div><div className="space-y-4"><div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl"><div className="w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center text-xs font-black shrink-0 text-black dark:text-white">1</div><p className="text-xs font-bold">Нажмите <span className="inline-block p-1 bg-white dark:bg-black rounded shadow-sm mx-1"><Share size={12}/> Поделиться</span></p></div><div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl"><div className="w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center text-xs font-black shrink-0 text-black dark:text-white">2</div><p className="text-xs font-bold">Выберите <span className="text-blue-500">«На экран "Домой"»</span></p></div></div><button onClick={() => setShowInstallGuide(false)} className="w-full bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase text-xs">Понятно</button></motion.div></div>
        )}</AnimatePresence>
    </div>
  );
};

export default SettingsModal;
