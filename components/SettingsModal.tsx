
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Trash2, CheckCircle2, Plus, Edit2, Check, Clock, 
  Wallet, Tag, ChevronDown, Sparkles, Globe, Smartphone, 
  LayoutGrid, ToggleLeft, ToggleRight, Shield, Lock, Copy, 
  Users, Share, LogOut, ChevronRight, Download, Calculator, 
  DollarSign, GripVertical, Loader2, Monitor, Menu, 
  MessageCircle, AppWindow, MoreHorizontal, ArrowLeft, 
  ArrowRight, Eye, EyeOff, ChevronLeft, Save, Calendar, Circle,
  ChevronUp, AlertOctagon, ShoppingBag, ShieldCheck, BellRing,
  BookOpen, FolderOpen, ArrowUp, ArrowDown, Zap, Gift, RefreshCw, Wand2, Settings2, Moon, Sun, ScanSearch, Files, MessageSquareQuote, Info, Send,
  Cloud, CloudOff, Wifi, WifiOff, Cpu, Play, BrainCircuit, Mail
} from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, MandatoryExpense, Transaction, WidgetConfig, AIKnowledgeItem } from '../types';
import { MemberMarker, getIconById } from '../constants';
import { auth } from '../firebase';
import { GoogleGenAI } from "@google/genai";
import { useData } from '../contexts/DataContext';
import { createInvitation } from '../utils/db';

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
  { id: 'month_chart', label: 'График расходов' },
  { id: 'category_analysis', label: 'Анализ категорий' },
  { id: 'shopping', label: 'Список покупок' },
  { id: 'goals', label: 'Цели и копилка' }, 
  { id: 'recent_transactions', label: 'История операций' }
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
const PRESET_ICONS = [ 
  'Utensils', 'Car', 'Home', 'ShoppingBag', 'Heart', 'Zap', 'Plane', 
  'Briefcase', 'PiggyBank', 'Coffee', 'Tv', 'MoreHorizontal', 'Shirt', 
  'Music', 'Gamepad2', 'Baby', 'Dog', 'Cat', 'Flower2', 'Hammer', 
  'Wrench', 'BookOpen', 'GraduationCap', 'Palmtree', 'Gift', 
  'Smartphone', 'Wifi', 'Scissors', 'Bath', 'Bed', 'Sofa', 'Bike', 'Drumstick',
  'Pill', 'Stethoscope', 'Dumbbell', 'Ticket', 'Monitor', 
  'Footprints', 'Smile', 'HeartHandshake', 'FileText', 'ShieldCheck', 'Landmark', 'SmartphoneCharging', 'Armchair', 'Watch', 'Sun', 'Umbrella', 'Wine', 'GlassWater'
];

const AVAILABLE_TABS = [
    { id: 'overview', label: 'Обзор', icon: <LayoutGrid size={20}/> },
    { id: 'budget', label: 'Бюджет', icon: <Calculator size={20}/> },
    { id: 'plans', label: 'Планы', icon: <Calendar size={20}/> },
    { id: 'shopping', label: 'Покупки', icon: <ShoppingBag size={20}/> },
    { id: 'services', label: 'Сервисы', icon: <AppWindow size={20}/> }
];

const AVAILABLE_SERVICES = [
    { id: 'wallet', label: 'Кошелек', desc: 'Карты лояльности', icon: <Wallet size={20}/> },
    { id: 'wishlist', label: 'Wishlist', desc: 'Список желаний', icon: <Gift size={20}/> },
    { id: 'chat', label: 'AI Советник', desc: 'Финансовый помощник', icon: <Sparkles size={20}/> },
    { id: 'pantry', label: 'Кладовка', desc: 'Учет продуктов', icon: <LayoutGrid size={20}/> },
    { id: 'debts', label: 'Долги', desc: 'Кредиты и займы', icon: <Calculator size={20}/> },
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

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate, savingsRate, setSavingsRate, members, onUpdateMembers, categories, onUpdateCategories, learnedRules, onUpdateRules, currentFamilyId, onJoinFamily, onLogout, installPrompt, transactions = [], onDeleteTransactionsByPeriod, onUpdateTransactions, onOpenDuplicates }) => {
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

  // Categories Management
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [catLabel, setCatLabel] = useState('');
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);
  const [catIcon, setCatIcon] = useState(PRESET_ICONS[0]);
  
  // Rules
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCleanName, setRuleCleanName] = useState('');
  const [ruleCategory, setRuleCategory] = useState(categories[0]?.id || 'other');
  
  // Tools
  const [deleteStart, setDeleteStart] = useState('');
  const [deleteEnd, setDeleteEnd] = useState('');

  // AI Testing State
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const isAIEnabled = !!process.env.API_KEY;

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTestKey = async () => {
      if (!isAIEnabled) return;
      setAiTestStatus('loading');
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < widgets.length) {
      [widgets[index], widgets[targetIndex]] = [widgets[targetIndex], widgets[index]];
      handleChange('widgets', widgets);
    }
  };

  const handleApplyRulesToAll = () => {
      if (!transactions || !onUpdateTransactions) return;
      let count = 0;
      const updatedTransactions = transactions.map(tx => {
          const rawNote = (tx.rawNote || tx.note).toLowerCase();
          const matchedRule = learnedRules.find(r => rawNote.includes(r.keyword.toLowerCase()));
          if (matchedRule && (tx.category !== matchedRule.categoryId || tx.note !== matchedRule.cleanName)) {
              count++;
              return { ...tx, category: matchedRule.categoryId, note: matchedRule.cleanName };
          }
          return tx;
      });
      if (count > 0) { onUpdateTransactions(updatedTransactions); alert(`Обновлено ${count} операций`); }
      else alert('Нет операций для обновления по текущим правилам');
  };

  const handleAddManualRule = () => {
      if (!ruleKeyword.trim()) return;
      const newRule: LearnedRule = {
          id: Date.now().toString(),
          keyword: ruleKeyword.trim(),
          cleanName: ruleCleanName.trim() || ruleKeyword.trim(),
          categoryId: ruleCategory
      };
      onUpdateRules([...learnedRules, newRule]);
      setRuleKeyword('');
      setRuleCleanName('');
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

  const handleSaveMember = () => {
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
              createInvitation(currentFamilyId, email, editingMember.id);
              alert(`Приглашение отправлено для ${email}. Когда пользователь войдет через Google, он будет добавлен.`);
          }
      } else {
          const newMemberId = Math.random().toString(36).substr(2, 9);
          const newMember = { 
              id: newMemberId, 
              name: tempMemberName, 
              color: tempMemberColor,
              email: email || undefined
          };
          onUpdateMembers([...members, newMember]);

          if (currentFamilyId && email) {
              createInvitation(currentFamilyId, email, newMemberId);
              alert(`Приглашение создано для ${email}. Когда пользователь войдет через Google, он будет автоматически добавлен.`);
          }
      }
      setIsMemberModalOpen(false);
  };

  const handleDeleteMember = () => {
      if (!editingMember) return;
      if (members.length <= 1) {
          alert("Нельзя удалить последнего участника");
          return;
      }
      if (confirm(`Удалить участника ${editingMember.name}?`)) {
          onUpdateMembers(members.filter(m => m.id !== editingMember.id));
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
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white">Категории</h3>
                        <button onClick={() => { setSelectedCategoryForEdit(null); setCatLabel(''); setCatIcon('ShoppingBag'); setCatColor(PRESET_COLORS[0]); }} className="p-1.5 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-blue-500"><Plus size={18}/></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto no-scrollbar mb-6">
                        {categories.map(cat => (
                            <div key={cat.id} className="relative group">
                                <div onClick={() => { setSelectedCategoryForEdit(cat); setCatLabel(cat.label); setCatColor(cat.color); setCatIcon(cat.icon); }} className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center gap-2 ${selectedCategoryForEdit?.id === cat.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500' : 'bg-gray-50 dark:bg-[#2C2C2E] border-transparent'}`}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>{getIconById(cat.icon, 14)}</div>
                                    <span className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate w-full">{cat.label}</span>
                                </div>
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation();
                                        e.preventDefault(); // Prevent accidental selection
                                        if(confirm(`Удалить категорию "${cat.label}"?`)) {
                                            onUpdateCategories(categories.filter(c => c.id !== cat.id));
                                            if(selectedCategoryForEdit?.id === cat.id) setSelectedCategoryForEdit(null);
                                        }
                                    }}
                                    className="absolute -top-1 -right-1 z-10 p-2 bg-white dark:bg-black text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity border border-gray-100 dark:border-white/10"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                    {(selectedCategoryForEdit || catLabel === '') && (
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl space-y-4 border border-gray-100 dark:border-white/5">
                            <input type="text" placeholder="Название..." value={catLabel} onChange={e => setCatLabel(e.target.value)} className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                            <div className="flex gap-2 overflow-x-auto no-scrollbar p-2">
                                {PRESET_COLORS.map(c => (
                                    <button 
                                        key={c} 
                                        onClick={() => setCatColor(c)} 
                                        className={`w-8 h-8 rounded-full shrink-0 transition-transform ${catColor === c ? 'scale-110 ring-2 ring-offset-2 dark:ring-offset-[#2C2C2E] ring-blue-500' : ''}`} 
                                        style={{ backgroundColor: c }} 
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                {PRESET_ICONS.map(i => (
                                    <button 
                                        key={i} 
                                        onClick={() => setCatIcon(i)} 
                                        className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-white dark:bg-white/5 text-gray-500 transition-colors ${catIcon === i ? 'bg-blue-500 text-white' : ''}`}
                                    >
                                        {getIconById(i, 16)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                {selectedCategoryForEdit && <button onClick={() => { if(confirm('Удалить категорию?')) onUpdateCategories(categories.filter(c => c.id !== selectedCategoryForEdit.id)); setSelectedCategoryForEdit(null); }} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 size={18}/></button>}
                                <button onClick={() => {
                                    if(!catLabel.trim()) return;
                                    if(selectedCategoryForEdit) onUpdateCategories(categories.map(c => c.id === selectedCategoryForEdit.id ? { ...c, label: catLabel, color: catColor, icon: catIcon } : c));
                                    else onUpdateCategories([...categories, { id: 'custom_' + Date.now(), label: catLabel, color: catColor, icon: catIcon, isCustom: true }]);
                                    setCatLabel(''); setSelectedCategoryForEdit(null);
                                }} className="flex-1 bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold text-sm">{selectedCategoryForEdit ? 'Сохранить' : 'Добавить'}</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white">Правила авто-категоризации</h3>
                        <button onClick={handleApplyRulesToAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100"><RefreshCw size={14}/> Обновить историю</button>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl space-y-3">
                        <div className="flex gap-2">
                            <input type="text" placeholder="Ключ (UBER, ПЯТЕРОЧКА)" value={ruleKeyword} onChange={e => setRuleKeyword(e.target.value)} className="flex-1 bg-white dark:bg-[#1C1C1E] p-3 rounded-xl text-xs font-bold outline-none dark:text-white" />
                            <input type="text" placeholder="Имя (Такси, Еда)" value={ruleCleanName} onChange={e => setRuleCleanName(e.target.value)} className="flex-1 bg-white dark:bg-[#1C1C1E] p-3 rounded-xl text-xs font-bold outline-none dark:text-white" />
                        </div>
                        <div className="flex gap-2">
                            <select value={ruleCategory} onChange={e => setRuleCategory(e.target.value)} className="flex-1 bg-white dark:bg-[#1C1C1E] p-3 rounded-xl text-xs font-bold outline-none dark:text-white">
                                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                            <button onClick={handleAddManualRule} className="p-3 bg-blue-500 text-white rounded-xl"><Plus size={18}/></button>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                        {learnedRules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl border border-gray-100 dark:border-white/5">
                                <div className="min-w-0 flex-1 pr-4">
                                    <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">{rule.keyword}</div>
                                    <div className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate">→ {rule.cleanName} ({categories.find(c => c.id === rule.categoryId)?.label})</div>
                                </div>
                                <button onClick={() => onUpdateRules(learnedRules.filter(r => r.id !== rule.id))} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
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
                    <div className="space-y-3">
                        {(settings.widgets || []).map((widget, idx) => {
                            const meta = WIDGET_METADATA.find(m => m.id === widget.id);
                            if (!meta) return null;
                            return (
                                <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col gap-1">
                                            <button disabled={idx === 0} onClick={() => moveWidget(idx, 'up')} className="text-gray-300 hover:text-blue-500 disabled:opacity-30"><ChevronUp size={14}/></button>
                                            <button disabled={idx === (settings.widgets?.length || 1) - 1} onClick={() => moveWidget(idx, 'down')} className="text-gray-300 hover:text-blue-500 disabled:opacity-30"><ChevronDown size={14}/></button>
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
                            value={settings.eventTemplate || '📅 *Новое событие*\n\n📌 {title}\n🕒 {date} {time}'} 
                            onChange={(val) => handleChange('eventTemplate', val)} 
                            variables={['{title}', '{date}', '{time}', '{desc}']} 
                            previewData={{ '{title}': 'Врач', '{date}': '10.10.2023', '{time}': '14:00', '{desc}': 'Взять полис' }}
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
                    <div className={`p-5 rounded-2xl flex items-center gap-4 mb-6 ${currentFamilyId ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900/30' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900/30'}`}>
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
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ваш Family ID</p>
                        <p className={`font-mono text-lg font-bold break-all select-all ${currentFamilyId ? 'text-blue-500' : 'text-gray-400 italic'}`}>
                            {currentFamilyId || 'Не присвоен (Данные только на этом устройстве)'}
                        </p>
                    </div>

                    {currentFamilyId && (
                        <button onClick={() => {
                            const link = `${window.location.origin}/?join=${currentFamilyId}`;
                            if (navigator.share) navigator.share({ title: 'Семейный Бюджет', text: 'Присоединяйся к нашему бюджету!', url: link });
                            else { navigator.clipboard.writeText(link); alert("Ссылка скопирована"); }
                        }} className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                            <Share size={16} /> Поделиться ссылкой
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

                  {/* AI Status Indicator with Test Button */}
                  <div className={`p-4 rounded-2xl border ${isAIEnabled ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30' : 'bg-gray-50 dark:bg-[#2C2C2E] border-gray-100 dark:border-white/5'}`}>
                      <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl shadow-sm ${isAIEnabled ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-purple-400' : 'bg-white dark:bg-white/10 text-gray-400'}`}>
                                  <Cpu size={20} />
                              </div>
                              <div>
                                  <span className={`font-bold text-sm ${isAIEnabled ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                      AI Функции
                                  </span>
                                  <div className="text-[10px] opacity-70">
                                      {isAIEnabled ? 'Ключ активирован' : 'Создайте .env файл с GEMINI_API_KEY'}
                                  </div>
                              </div>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isAIEnabled ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                              {isAIEnabled ? 'ON' : 'OFF'}
                          </div>
                      </div>
                      
                      {isAIEnabled && (
                          <div className="flex items-center gap-2">
                              <button 
                                  onClick={handleTestKey} 
                                  disabled={aiTestStatus === 'loading' || aiTestStatus === 'success'}
                                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                      aiTestStatus === 'success' 
                                          ? 'bg-green-500 text-white' 
                                          : aiTestStatus === 'error'
                                              ? 'bg-red-500 text-white'
                                              : 'bg-white dark:bg-[#2C2C2E] text-purple-600 dark:text-purple-400 shadow-sm hover:bg-purple-50 dark:hover:bg-purple-900/30'
                                  }`}
                              >
                                  {aiTestStatus === 'loading' ? <Loader2 size={14} className="animate-spin"/> : 
                                   aiTestStatus === 'success' ? <Check size={14}/> : 
                                   aiTestStatus === 'error' ? 'Ошибка' : <Play size={14}/>}
                                  {aiTestStatus === 'success' ? 'Работает!' : aiTestStatus === 'error' ? 'Сбой' : 'Проверить работу'}
                              </button>
                          </div>
                      )}
                  </div>

                  <div className="pt-2"><button onClick={() => installPrompt ? installPrompt.prompt() : setShowInstallGuide(true)} className="w-full flex items-center justify-center gap-3 p-5 bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"><Smartphone size={20} /> Установить на телефон</button></div>
                  <div className="pt-4 border-t dark:border-white/10"><button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100"><LogOut size={18} /> Выйти</button></div>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" />
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-5xl h-[85vh] md:rounded-[3rem] rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border dark:border-white/10">
            <div className={`bg-white dark:bg-[#1C1C1E] border-r dark:border-white/10 flex-col shrink-0 overflow-y-auto no-scrollbar md:w-64 md:flex md:static ${showMobileMenu ? 'flex absolute inset-0 w-full z-20' : 'hidden'}`}>
                <div className="p-6 md:p-8 border-b dark:border-white/5 flex items-center justify-between md:justify-start gap-3"><span className="font-black text-xl">Настройки</span><button onClick={onClose} className="md:hidden w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center"><X size={20}/></button></div>
                <div className="flex-1 p-4 space-y-2">
                    {SECTIONS.map(section => (
                        <button key={section.id} onClick={() => { setActiveSection(section.id); setShowMobileMenu(false); }} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeSection === section.id && !showMobileMenu ? 'bg-blue-500 text-white shadow-lg' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeSection === section.id && !showMobileMenu ? 'bg-white/20' : 'bg-gray-50 dark:bg-white/10'}`}>{section.icon}</div>
                            <span className="font-bold text-sm flex-1 text-left">{section.label}</span>
                            <ChevronRight size={16} className="opacity-40" />
                        </button>
                    ))}
                </div>
            </div>
            <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F2F2F7] dark:bg-black ${showMobileMenu ? 'hidden' : 'flex'}`}>
                <div className="p-4 md:p-6 border-b dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md flex justify-between items-center">
                    <div className="flex items-center gap-2"><button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 text-gray-500"><ArrowLeft size={24} /></button><h2 className="text-xl font-black">{SECTIONS.find(s => s.id === activeSection)?.label}</h2></div>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar pb-24 md:pb-8 overscroll-contain"><div className="max-w-2xl mx-auto w-full">{renderSectionContent()}</div></div>
            </div>
        </motion.div>
        <AnimatePresence>{showInstallGuide && (
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6"><motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setShowInstallGuide(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" /><motion.div initial={{scale:0.9, opacity:0, y:20}} animate={{scale:1, opacity:1, y:0}} exit={{scale:0.9, opacity:0, y:20}} className="relative bg-white dark:bg-[#1C1C1E] p-8 rounded-[3rem] shadow-2xl max-w-sm w-full space-y-6"><div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl flex items-center justify-center mx-auto"><Smartphone size={32} /></div><div className="text-center"><h3 className="text-xl font-black">Установка</h3><p className="text-sm text-gray-500">Добавьте приложение на главный экран для быстрого доступа.</p></div><div className="space-y-4"><div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl"><div className="w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center text-xs font-black shrink-0">1</div><p className="text-xs font-bold">Нажмите <span className="inline-block p-1 bg-white dark:bg-black rounded shadow-sm mx-1"><Share size={12}/> Поделиться</span></p></div><div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl"><div className="w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center text-xs font-black shrink-0">2</div><p className="text-xs font-bold">Выберите <span className="text-blue-500">«На экран "Домой"»</span></p></div></div><button onClick={() => setShowInstallGuide(false)} className="w-full bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase text-xs">Понятно</button></motion.div></div>
        )}</AnimatePresence>
    </div>
  );
};

export default SettingsModal;
