
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
  BookOpen, FolderOpen, ArrowUp, ArrowDown, Zap, Gift, RefreshCw, Wand2, Settings2, Moon, Sun
} from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, MandatoryExpense, Transaction, WidgetConfig } from '../types';
import { MemberMarker, getIconById } from '../constants';
import MandatoryExpenseModal from './MandatoryExpenseModal';
import PinScreen from './PinScreen';

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
  onEnablePin?: () => void;
  onDisablePin?: () => void;
  currentFamilyId: string | null;
  onJoinFamily: (id: string) => void;
  onLogout: () => void;
  installPrompt?: any;
  transactions?: Transaction[];
  onDeleteTransactionsByPeriod?: (startDate: string, endDate: string) => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
}

// Icons removed as requested
const WIDGET_METADATA = [ 
  { id: 'balance', label: 'Баланс' }, 
  { id: 'goals', label: 'Цели' }, 
  { id: 'charts', label: 'Структура' }, 
  { id: 'month_chart', label: 'График месяца' },
  { id: 'shopping', label: 'Покупки' },
  { id: 'recent_transactions', label: 'История' },
];

type SectionType = 'general' | 'budget' | 'members' | 'categories' | 'widgets' | 'navigation' | 'services' | 'telegram' | 'family';

const SECTIONS: { id: SectionType; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Общее', icon: <Globe size={20} /> },
  { id: 'budget', label: 'Бюджет', icon: <Calculator size={20} /> },
  { id: 'members', label: 'Участники', icon: <Users size={20} /> },
  { id: 'categories', label: 'Категории и Правила', icon: <Tag size={20} /> },
  { id: 'navigation', label: 'Навигация', icon: <Menu size={20} /> },
  { id: 'services', label: 'Сервисы', icon: <AppWindow size={20} /> },
  { id: 'widgets', label: 'Виджеты', icon: <LayoutGrid size={20} /> },
  { id: 'telegram', label: 'Telegram и Push', icon: <BellRing size={20} /> },
  { id: 'family', label: 'Семья', icon: <Share size={20} /> },
];

const PRESET_COLORS = [ '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#FF3B30', '#5856D6', '#00C7BE', '#8E8E93', '#BF5AF2', '#1C1C1E' ];
const PRESET_ICONS = [ 
  'Utensils', 'Car', 'Home', 'ShoppingBag', 'Heart', 'Zap', 'Plane', 
  'Briefcase', 'PiggyBank', 'Coffee', 'Tv', 'MoreHorizontal', 'Shirt', 
  'Music', 'Gamepad2', 'Baby', 'Dog', 'Cat', 'Flower2', 'Hammer', 
  'Wrench', 'BookOpen', 'GraduationCap', 'Palmtree', 'Gift', 
  'Smartphone', 'Wifi', 'Scissors', 'Bath', 'Bed', 'Sofa', 'Bike', 'Drumstick',
  'Pill', 'Stethoscope', 'Dumbbell', 'Ticket', 'Monitor', 
  'Footprints', 'Smile', 'HeartHandshake', 'FileText', 'ShieldCheck'
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
    { id: 'meters', label: 'Счетчики', desc: 'ЖКХ показания', icon: <Clock size={20}/> },
    { id: 'subs', label: 'Подписки', desc: 'Регулярные платежи', icon: <Zap size={20}/> },
    { id: 'wishlist', label: 'Wishlist', desc: 'Список желаний', icon: <Gift size={20}/> },
    { id: 'chat', label: 'AI Советник', desc: 'Финансовый помощник', icon: <Sparkles size={20}/> },
    { id: 'pantry', label: 'Кладовка', desc: 'Учет продуктов', icon: <LayoutGrid size={20}/> },
    { id: 'debts', label: 'Долги', desc: 'Кредиты и займы', icon: <Calculator size={20}/> },
    { id: 'projects', label: 'Проекты', desc: 'Временные бюджеты', icon: <FolderOpen size={20}/> }
];

// Helper to insert variables into template
const TemplateEditor = ({ label, value, onChange, variables }: { label: string, value: string, onChange: (val: string) => void, variables: string[] }) => {
    const handleAddVar = (v: string) => {
        onChange(value + ` ${v}`);
    };

    return (
        <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">{label}</label>
            <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl border border-gray-100 dark:border-white/10">
                <textarea 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="w-full bg-transparent font-mono text-xs text-[#1C1C1E] dark:text-white outline-none h-24 resize-none mb-2"
                />
                <div className="flex flex-wrap gap-2">
                    {variables.map(v => (
                        <button 
                            key={v} 
                            onClick={() => handleAddVar(v)}
                            className="bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 px-2 py-1 rounded-lg text-[9px] font-bold text-blue-500 dark:text-blue-400 hover:bg-blue-50 transition-colors"
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Reusable IOS Toggle Switch
const Switch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button 
        onClick={onChange} 
        className={`w-11 h-6 rounded-full p-1 transition-colors relative ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate, onReset, savingsRate, setSavingsRate, members, onUpdateMembers, categories, onUpdateCategories, learnedRules, onUpdateRules, onEnablePin, onDisablePin, currentFamilyId, onJoinFamily, onLogout, installPrompt, transactions = [], onDeleteTransactionsByPeriod, onUpdateTransactions }) => {
  const [activeSection, setActiveSection] = useState<SectionType>('general');
  // Initialize based on screen width to avoid mobile menu state on desktop
  const [showMobileMenu, setShowMobileMenu] = useState(window.innerWidth < 768);
  const [pushStatus, setPushStatus] = useState<string>('');
  
  // Member State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState(PRESET_COLORS[0]);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<FamilyMember | null>(null);
  
  // Category State
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [catLabel, setCatLabel] = useState('');
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);
  const [catIcon, setCatIcon] = useState(PRESET_ICONS[0]);
  const [showRulesForCategory, setShowRulesForCategory] = useState<string | null>(null);
  
  // Rules State
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleCleanName, setNewRuleCleanName] = useState('');
  
  // Mandatory Expense State
  const [isMandatoryModalOpen, setIsMandatoryModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MandatoryExpense | null>(null);

  // Family Join State
  const [targetFamilyId, setTargetFamilyId] = useState('');

  // Delete Period State
  const [deleteStartDate, setDeleteStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [deleteEndDate, setDeleteEndDate] = useState(new Date().toISOString().slice(0, 10));

  // PIN Creation State
  const [showPinCreator, setShowPinCreator] = useState(false);

  // Handle Resize to reset mobile menu state
  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth >= 768) {
              setShowMobileMenu(false);
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      // Reset rule input when changing categories
      setNewRuleKeyword('');
      setNewRuleCleanName('');
  }, [selectedCategoryForEdit, activeSection]);

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  const toggleWidgetVisibility = (id: string) => {
      const widgets = settings.widgets.map(w => w.id === id ? { ...w, isVisible: !w.isVisible } : w);
      handleChange('widgets', widgets);
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
      const widgets = [...settings.widgets];
      if (direction === 'up' && index > 0) {
          [widgets[index], widgets[index - 1]] = [widgets[index - 1], widgets[index]];
      } else if (direction === 'down' && index < widgets.length - 1) {
          [widgets[index], widgets[index + 1]] = [widgets[index + 1], widgets[index]];
      }
      handleChange('widgets', widgets);
  };

  const toggleTab = (id: string) => {
      const current = settings.enabledTabs || [];
      const updated = current.includes(id) 
          ? current.filter(t => t !== id)
          : [...current, id];
      if (updated.length === 0) return; // Prevent disabling all tabs
      handleChange('enabledTabs', updated);
  };

  const toggleService = (id: string) => {
      const current = settings.enabledServices || [];
      const updated = current.includes(id)
          ? current.filter(s => s !== id)
          : [...current, id];
      handleChange('enabledServices', updated);
  };

  // --- Category Handlers ---
  const handleEditCategoryClick = (cat: Category) => {
      setSelectedCategoryForEdit(cat);
      setCatLabel(cat.label);
      setCatColor(cat.color);
      setCatIcon(cat.icon);
      setShowRulesForCategory(cat.id); // Auto-show rules when editing
  };

  const handleSaveCategory = () => {
      if (!catLabel.trim()) return;
      
      if (selectedCategoryForEdit) {
          const updated = categories.map(c => c.id === selectedCategoryForEdit.id ? { 
              ...c, 
              label: catLabel, 
              color: catColor,
              icon: catIcon 
          } : c);
          onUpdateCategories(updated);
          setSelectedCategoryForEdit(null);
      } else {
          const newId = catLabel.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
          const newCat: Category = {
              id: newId,
              label: catLabel,
              color: catColor,
              icon: catIcon,
              isCustom: true
          };
          onUpdateCategories([...categories, newCat]);
      }
      setCatLabel('');
      setCatColor(PRESET_COLORS[0]);
      setCatIcon(PRESET_ICONS[0]);
  };

  const handleDeleteCategory = (id: string) => {
      if (confirm("Удалить категорию?")) {
          onUpdateCategories(categories.filter(c => c.id !== id));
          setSelectedCategoryForEdit(null);
      }
  };

  const handleAddRule = () => {
      if (!newRuleKeyword.trim() || !selectedCategoryForEdit) return;
      const newRule: LearnedRule = {
          id: Date.now().toString(),
          keyword: newRuleKeyword.trim(),
          // Use provided display name, or fallback to category name
          cleanName: newRuleCleanName.trim() || selectedCategoryForEdit.label, 
          categoryId: selectedCategoryForEdit.id
      };
      onUpdateRules([...learnedRules, newRule]);
      setNewRuleKeyword('');
      setNewRuleCleanName('');
  };

  const handleApplyRulesToAll = () => {
      if (!transactions || !onUpdateTransactions) return;
      
      let count = 0;
      const updatedTransactions = transactions.map(tx => {
          // Check if this transaction matches any rule
          const rawNote = (tx.rawNote || tx.note).toLowerCase();
          const matchedRule = learnedRules.find(r => rawNote.includes(r.keyword.toLowerCase()));
          
          if (matchedRule) {
              // If it matches, check if it needs updating (different category or different clean name)
              if (tx.category !== matchedRule.categoryId || tx.note !== matchedRule.cleanName) {
                  count++;
                  return { 
                      ...tx, 
                      category: matchedRule.categoryId,
                      note: matchedRule.cleanName
                  };
              }
          }
          return tx;
      });

      if (count > 0) {
          onUpdateTransactions(updatedTransactions);
          alert(`Обновлено ${count} операций согласно правилам.`);
      } else {
          alert('Все операции уже соответствуют правилам.');
      }
  };
  
  // --- Member Handlers ---
  const handleSaveMember = () => { 
      if (!newMemberName.trim()) return; 
      
      if (selectedMemberForEdit) {
          const updatedMembers = members.map(m => m.id === selectedMemberForEdit.id ? { ...m, name: newMemberName.trim(), color: newMemberColor } : m);
          onUpdateMembers(updatedMembers);
          setSelectedMemberForEdit(null);
      } else {
          const newMember: FamilyMember = { 
              id: Math.random().toString(36).substr(2, 9), 
              name: newMemberName.trim(), 
              color: newMemberColor 
          }; 
          onUpdateMembers([...members, newMember]); 
      }
      
      setNewMemberName(''); 
      setNewMemberColor(PRESET_COLORS[0]); 
  };

  const handleEditMemberClick = (member: FamilyMember) => {
      setSelectedMemberForEdit(member);
      setNewMemberName(member.name);
      setNewMemberColor(member.color);
  };

  const handleDeleteMember = (id: string) => { 
      if (members.length <= 1) { alert("Должен остаться хотя бы один участник"); return; } 
      onUpdateMembers(members.filter(m => m.id !== id)); 
      if (selectedMemberForEdit?.id === id) {
          setSelectedMemberForEdit(null);
          setNewMemberName('');
      }
  };
  
  // --- Expense Handlers ---
  const handleSaveExpense = (expense: MandatoryExpense) => {
      let updatedExpenses = [...(settings.mandatoryExpenses || [])];
      const existingIdx = updatedExpenses.findIndex(e => e.id === expense.id);
      
      if (existingIdx >= 0) {
          updatedExpenses[existingIdx] = expense;
      } else {
          updatedExpenses.push(expense);
      }
      
      handleChange('mandatoryExpenses', updatedExpenses);
      setIsMandatoryModalOpen(false);
      setEditingExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
      handleChange('mandatoryExpenses', (settings.mandatoryExpenses || []).filter(e => e.id !== id));
      setIsMandatoryModalOpen(false);
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert("ID скопирован в буфер обмена"); };
  
  const shareInviteLink = async () => { 
      if (!currentFamilyId) return; 
      const link = `${window.location.origin}/?join=${currentFamilyId}`;
      const text = `Привет! 👋\n\nПрисоединяйся к моему семейному бюджету. Будем вместе контролировать финансы и достигать целей! 🚀\n\nВот ссылка для входа:\n${link}`;
      
      if (navigator.share) { 
          try { 
              await navigator.share({ 
                  title: 'Приглашение в Семейный Бюджет', 
                  text: text, 
                  url: link, 
              }); 
          } catch (err) { 
              // Share dismissed
          } 
      } else { 
          copyToClipboard(link); 
          alert("Ссылка-приглашение скопирована!"); 
      } 
  };

  const handleDeletePeriod = () => {
      if (!onDeleteTransactionsByPeriod) return;
      if (confirm(`Удалить ВСЕ операции за выбранный период (${deleteStartDate} - ${deleteEndDate})? Это действие нельзя отменить.`)) {
          onDeleteTransactionsByPeriod(deleteStartDate, deleteEndDate);
          alert('Процесс удаления запущен.');
      }
  };

  const handlePinCreated = (pin: string) => {
      onUpdate({ ...settings, isPinEnabled: true, pinCode: pin });
      setShowPinCreator(false);
  };

  const handleEnablePush = async () => {
      if (!('Notification' in window)) {
          setPushStatus('Браузер не поддерживает уведомления');
          return;
      }

      try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
              handleChange('pushEnabled', true);
              setPushStatus('Уведомления включены!');
              new Notification('Семейный Бюджет', { body: 'Тестовое уведомление: Пуши работают!', icon: '/icon.png' });
          } else {
              setPushStatus('Доступ запрещен в настройках браузера');
              handleChange('pushEnabled', false);
          }
      } catch (e) {
          console.error(e);
          setPushStatus('Ошибка при включении');
      }
  };

  const deleteRule = (ruleId: string) => {
      if(confirm('Удалить правило?')) {
          onUpdateRules(learnedRules.filter(r => r.id !== ruleId));
      }
  };

  const renderContent = () => {
    switch (activeSection) {
        case 'general': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] space-y-5 border border-gray-100 dark:border-white/10 shadow-sm">
                  <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white mb-2">Основные настройки</h3>
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Название семьи</label><input type="text" value={settings.familyName} onChange={(e) => handleChange('familyName', e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] dark:text-white outline-none focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-blue-200 transition-all" /></div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Начало дня (ч)</label>
                          <input type="number" min="0" max="23" value={settings.dayStartHour ?? 8} onChange={(e) => handleChange('dayStartHour', parseInt(e.target.value))} className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] dark:text-white outline-none focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-blue-200 transition-all" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Конец дня (ч)</label>
                          <input type="number" min="0" max="24" value={settings.dayEndHour ?? 22} onChange={(e) => handleChange('dayEndHour', parseInt(e.target.value))} className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] dark:text-white outline-none focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-blue-200 transition-all" />
                      </div>
                  </div>

                  {/* Theme Switcher */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-white dark:bg-white/10 text-gray-500 dark:text-white`}>
                              {settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                          </div>
                          <span className="font-bold text-sm text-[#1C1C1E] dark:text-white">Темная тема</span>
                      </div>
                      <Switch checked={settings.theme === 'dark'} onChange={() => handleChange('theme', settings.theme === 'dark' ? 'light' : 'dark')} />
                  </div>

                  {/* PIN Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${settings.isPinEnabled ? 'bg-blue-50 text-blue-500' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}>
                              <ShieldCheck size={20} />
                          </div>
                          <span className="font-bold text-sm text-[#1C1C1E] dark:text-white">Вход по PIN-коду</span>
                      </div>
                      <button 
                        onClick={() => {
                            if (settings.isPinEnabled) {
                                handleChange('isPinEnabled', false);
                            } else {
                                setShowPinCreator(true);
                            }
                        }}
                        className={`w-11 h-6 rounded-full p-1 transition-colors relative ${settings.isPinEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.isPinEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                  </div>

                  {installPrompt && (
                      <button onClick={() => installPrompt.prompt()} className="w-full flex items-center justify-center gap-2 p-4 bg-[#1C1C1E] dark:bg-white text-white dark:text-black font-bold rounded-2xl shadow-lg mt-4">
                          <Download size={18} /> Установить приложение
                      </button>
                  )}
                  
                  <div className="pt-4 border-t border-gray-50 dark:border-white/10"><button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"><LogOut size={18} /> Выйти</button></div>
                </div>

                {/* Danger Zone */}
                {onDeleteTransactionsByPeriod && (
                    <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-[2rem] border border-red-100 dark:border-red-900/20 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-red-500">
                            <AlertOctagon size={18} />
                            <h3 className="text-sm font-black uppercase tracking-widest">Управление данными</h3>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mb-4">Удаление операций за период. Действие необратимо.</p>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[10px] font-bold uppercase text-gray-400 w-6">С</span>
                                <input type="date" value={deleteStartDate} onChange={e => setDeleteStartDate(e.target.value)} className="bg-white dark:bg-[#2C2C2E] flex-1 px-4 py-3 rounded-xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white" />
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className="text-[10px] font-bold uppercase text-gray-400 w-6">По</span>
                                <input type="date" value={deleteEndDate} onChange={e => setDeleteEndDate(e.target.value)} className="bg-white dark:bg-[#2C2C2E] flex-1 px-4 py-3 rounded-xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white" />
                            </div>
                            <button onClick={handleDeletePeriod} className="w-full bg-red-500 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest mt-2 hover:bg-red-600 transition-colors">
                                Удалить операции
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
        case 'budget': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] space-y-5 border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white mb-2">Расчет бюджета</h3>
                    <div className="space-y-2"><div className="flex justify-between items-center px-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Процент в копилку</label><span className="text-sm font-black text-blue-500">{savingsRate}%</span></div><input type="range" min="0" max="50" step="1" value={savingsRate} onChange={(e) => setSavingsRate(Number(e.target.value))} className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" /></div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Начальный баланс</label><input type="number" value={settings.initialBalance} onChange={(e) => handleChange('initialBalance', Number(e.target.value))} className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] dark:text-white outline-none focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-blue-200 transition-all" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Дата нач. баланса</label><input type="date" value={settings.initialBalanceDate || ''} onChange={(e) => handleChange('initialBalanceDate', e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] dark:text-white outline-none focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-blue-200 transition-all" /></div>
                    </div>
                    
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Дни зарплаты (через запятую)</label><input type="text" placeholder="10, 25" value={settings.salaryDates?.join(', ')} onChange={(e) => handleChange('salaryDates', e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)))} className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] dark:text-white outline-none focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-blue-200 transition-all" /></div>
                </div>

                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white">Обязательные расходы</h3>
                        <button onClick={() => { setEditingExpense(null); setIsMandatoryModalOpen(true); }} className="p-2 bg-blue-500 text-white rounded-xl"><Plus size={18}/></button>
                    </div>
                    
                    <div className="space-y-3">
                        {settings.mandatoryExpenses?.map(expense => (
                            <div key={expense.id} onClick={() => { setEditingExpense(expense); setIsMandatoryModalOpen(true); }} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors">
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-sm text-[#1C1C1E] dark:text-white truncate">{expense.name}</span>
                                    <div className="flex gap-2 text-[10px] font-bold text-gray-400">
                                        <span>{expense.amount} {settings.currency}</span>
                                        <span>• {expense.day}-е число</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Edit2 size={16} className="text-gray-400"/>
                                </div>
                            </div>
                        ))}
                        {(!settings.mandatoryExpenses || settings.mandatoryExpenses.length === 0) && (
                            <p className="text-center text-xs text-gray-400 font-bold py-4">Список пуст</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }
  };

  return (
    <>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" />
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-5xl h-[85vh] md:rounded-[3rem] rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border dark:border-white/10">
            
            {/* SIDEBAR */}
            <div className={`
                bg-white dark:bg-[#1C1C1E] border-r border-gray-100 dark:border-white/10 flex-col shrink-0 overflow-y-auto no-scrollbar transition-all duration-300 z-20
                md:w-64 md:flex md:static md:inset-auto
                ${showMobileMenu ? 'flex absolute inset-0 w-full' : 'hidden'}
            `}>
                <div className="p-6 md:p-8 border-b border-gray-50 dark:border-white/5 flex items-center justify-between md:justify-start gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/30 text-[#1C1C1E] dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-sm border border-white dark:border-white/10"><Settings2 size={20} className="text-blue-500 dark:text-blue-400"/></div>
                        <span className="font-black text-xl tracking-tight text-[#1C1C1E] dark:text-white">Настройки</span>
                    </div>
                    <button onClick={onClose} className="md:hidden w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-500 dark:text-white"><X size={20}/></button>
                </div>
                
                <div className="flex-1 p-4 space-y-2">
                    {SECTIONS.map(section => (
                        <button
                            key={section.id}
                            onClick={() => { setActiveSection(section.id); setSelectedCategoryForEdit(null); setSelectedMemberForEdit(null); setShowMobileMenu(false); }}
                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 group relative overflow-hidden ${activeSection === section.id && !showMobileMenu ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-transparent text-[#1C1C1E] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${activeSection === section.id && !showMobileMenu ? 'bg-white/20 text-white' : 'bg-gray-50 dark:bg-white/10 text-gray-500 dark:text-gray-400 group-hover:bg-white dark:group-hover:bg-white/20 group-hover:shadow-sm'}`}>
                                {section.icon}
                            </div>
                            <span className="font-bold text-sm flex-1 text-left">{section.label}</span>
                            <ChevronRight size={16} className={`transition-opacity ${activeSection === section.id && !showMobileMenu ? 'text-white/60' : 'text-gray-300 md:opacity-0 group-hover:opacity-100'}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className={`flex-1 flex-col min-w-0 h-full overflow-hidden bg-[#F2F2F7] dark:bg-black md:flex ${showMobileMenu ? 'hidden' : 'flex'}`}>
                <div className="p-4 md:p-6 border-b border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-[#1C1C1E] dark:text-gray-300 dark:hover:text-white">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-xl font-black text-[#1C1C1E] dark:text-white">{SECTIONS.find(s => s.id === activeSection)?.label}</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar pb-20 md:pb-8">
                    <div className="max-w-2xl mx-auto w-full">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </motion.div>
        </div>

        {isMandatoryModalOpen && (
            <MandatoryExpenseModal 
                expense={editingExpense}
                onClose={() => setIsMandatoryModalOpen(false)}
                onSave={handleSaveExpense}
                onDelete={handleDeleteExpense}
                settings={settings}
            />
        )}

        {showPinCreator && (
            <PinScreen
                mode="create"
                onSuccess={handlePinCreated}
                onCancel={() => setShowPinCreator(false)}
            />
        )}
    </>
  );
};

export default SettingsModal;
