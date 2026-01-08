
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
  BookOpen, FolderOpen, ArrowUp, ArrowDown, Zap, Gift, RefreshCw, Wand2, Settings2, Moon, Sun, ScanSearch, Files, MessageSquareQuote, Info
} from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, MandatoryExpense, Transaction, WidgetConfig } from '../types';
import { MemberMarker, getIconById } from '../constants';

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

type SectionType = 'general' | 'budget' | 'members' | 'categories' | 'widgets' | 'navigation' | 'services' | 'telegram' | 'family';

const SECTIONS: { id: SectionType; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Общее', icon: <Globe size={20} /> },
  { id: 'budget', label: 'Бюджет', icon: <Calculator size={20} /> },
  { id: 'members', label: 'Участники', icon: <Users size={20} /> },
  { id: 'categories', label: 'Категории и правила', icon: <Tag size={20} /> },
  { id: 'navigation', label: 'Навигация', icon: <Menu size={20} /> },
  { id: 'services', label: 'Сервисы', icon: <AppWindow size={20} /> },
  { id: 'widgets', label: 'Виджеты', icon: <LayoutGrid size={20} /> },
  { id: 'telegram', label: 'Telegram и уведомления', icon: <BellRing size={20} /> },
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

const TemplateEditor = ({ label, value, onChange, variables }: { label: string, value: string, onChange: (val: string) => void, variables: string[] }) => {
    const handleAddVar = (v: string) => onChange((value || '') + ` ${v}`);
    return (
        <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-gray-500 ml-2">{label}</label>
            <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl border border-gray-100 dark:border-white/10">
                <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent font-mono text-xs text-[#1C1C1E] dark:text-white outline-none h-20 resize-none mb-2" placeholder="Настройте текст..." />
                <div className="flex flex-wrap gap-2">
                    {variables.map(v => (
                        <button key={v} onClick={() => handleAddVar(v)} className="bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 px-2 py-1 rounded-lg text-[10px] font-bold text-blue-500 dark:text-blue-400 hover:bg-blue-50 transition-colors">
                            {v}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate, savingsRate, setSavingsRate, members, onUpdateMembers, categories, onUpdateCategories, learnedRules, onUpdateRules, currentFamilyId, onJoinFamily, onLogout, installPrompt, transactions = [], onDeleteTransactionsByPeriod, onUpdateTransactions, onOpenDuplicates }) => {
  const [activeSection, setActiveSection] = useState<SectionType>('general');
  const [showMobileMenu, setShowMobileMenu] = useState(window.innerWidth < 768);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState(PRESET_COLORS[0]);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<FamilyMember | null>(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [catLabel, setCatLabel] = useState('');
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);
  const [catIcon, setCatIcon] = useState(PRESET_ICONS[0]);
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCleanName, setRuleCleanName] = useState('');
  const [ruleCategory, setRuleCategory] = useState(categories[0]?.id || 'other');
  const [deleteStart, setDeleteStart] = useState('');
  const [deleteEnd, setDeleteEnd] = useState('');

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

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
      const isDark = settings.theme === 'dark';
      const nextTheme = isDark ? 'light' : 'dark';

      // Check if browser supports View Transitions
      if (!(document as any).startViewTransition) {
          handleChange('theme', nextTheme);
          return;
      }

      // Get click position
      const x = e.clientX;
      const y = e.clientY;

      // Calculate radius to the furthest corner
      const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
      );

      // Perform transition
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
                  // Use the pseudo-element of the *new* view
                  pseudoElement: "::view-transition-new(root)",
              }
          );
      });
  };

  const renderSectionContent = () => {
    switch (activeSection) {
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
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl col-span-2">
                            <label className="text-xs font-bold text-gray-500 block mb-1">Валюта</label>
                            <input type="text" value={settings.currency || '₽'} onChange={e => handleChange('currency', e.target.value)} className="w-full bg-transparent font-bold text-lg outline-none text-[#1C1C1E] dark:text-white" />
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
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white mb-4">Участники семьи</h3>
                    <div className="grid gap-3 mb-6">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl">
                                <div className="flex items-center gap-3"><MemberMarker member={member} size="sm" /><div className="font-bold text-sm text-[#1C1C1E] dark:text-white">{member.name}</div></div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedMemberForEdit(member); setNewMemberName(member.name); setNewMemberColor(member.color); }} className="p-2 text-gray-400 hover:text-blue-500"><Edit2 size={16}/></button>
                                    <button onClick={() => { if(members.length > 1) onUpdateMembers(members.filter(m => m.id !== member.id)) }} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl space-y-3">
                        <input type="text" placeholder="Имя" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                            {PRESET_COLORS.slice(0, 8).map(c => <button key={c} onClick={() => setNewMemberColor(c)} className={`w-8 h-8 rounded-full shrink-0 transition-all ${newMemberColor === c ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`} style={{ backgroundColor: c }} />)}
                        </div>
                        <button onClick={() => {
                            if (!newMemberName.trim()) return;
                            if (selectedMemberForEdit) onUpdateMembers(members.map(m => m.id === selectedMemberForEdit.id ? { ...m, name: newMemberName.trim(), color: newMemberColor } : m));
                            else onUpdateMembers([...members, { id: Math.random().toString(36).substr(2, 9), name: newMemberName.trim(), color: newMemberColor }]);
                            setNewMemberName(''); setSelectedMemberForEdit(null);
                        }} className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold text-sm">{selectedMemberForEdit ? 'Сохранить' : 'Добавить участника'}</button>
                    </div>
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
                            <div key={cat.id} onClick={() => { setSelectedCategoryForEdit(cat); setCatLabel(cat.label); setCatColor(cat.color); setCatIcon(cat.icon); }} className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center gap-2 ${selectedCategoryForEdit?.id === cat.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500' : 'bg-gray-50 dark:bg-[#2C2C2E] border-transparent'}`}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>{getIconById(cat.icon, 14)}</div>
                                <span className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate w-full">{cat.label}</span>
                            </div>
                        ))}
                    </div>
                    {(selectedCategoryForEdit || catLabel === '') && (
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl space-y-4 border border-gray-100 dark:border-white/5">
                            <input type="text" placeholder="Название..." value={catLabel} onChange={e => setCatLabel(e.target.value)} className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">{PRESET_COLORS.map(c => <button key={c} onClick={() => setCatColor(c)} className={`w-6 h-6 rounded-full shrink-0 ${catColor === c ? 'ring-2 ring-blue-500' : ''}`} style={{ backgroundColor: c }} />)}</div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">{PRESET_ICONS.slice(0, 15).map(i => <button key={i} onClick={() => setCatIcon(i)} className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-white dark:bg-white/5 text-gray-500 ${catIcon === i ? 'bg-blue-500 text-white' : ''}`}>{getIconById(i, 12)}</button>)}</div>
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
                    <div className="pt-2 space-y-4 border-t dark:border-white/5">
                        <TemplateEditor label="Шаблон списка покупок" value={settings.shoppingTemplate || '🛒 *Список покупок*\n\n{items}'} onChange={(val) => handleChange('shoppingTemplate', val)} variables={['{items}', '{total}']} />
                        <TemplateEditor label="Шаблон событий" value={settings.eventTemplate || '📅 *Новое событие*\n\n📌 {title}\n🕒 {date} {time}'} onChange={(val) => handleChange('eventTemplate', val)} variables={['{title}', '{date}', '{time}', '{desc}']} />
                    </div>
                </div>
            </div>
        );
        case 'family': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm text-center">
                    <h3 className="text-lg font-bold mb-4">Семейный доступ</h3>
                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl mb-4">
                        <p className="text-xs font-bold text-gray-400 mb-1">ID вашей семьи</p>
                        <p className="font-mono text-lg font-bold text-blue-500 break-all select-all">{currentFamilyId}</p>
                    </div>
                    <button onClick={() => {
                        const link = `${window.location.origin}/?join=${currentFamilyId}`;
                        if (navigator.share) navigator.share({ title: 'Семейный Бюджет', text: 'Присоединяйся к нашему бюджету!', url: link });
                        else { navigator.clipboard.writeText(link); alert("Ссылка скопирована"); }
                    }} className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"><Share size={16} /> Поделиться ссылкой</button>
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
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border dark:border-white/5">
                      <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-white dark:bg-white/10 shadow-sm text-gray-500 dark:text-white">{settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</div><span className="font-bold text-sm">Темная тема</span></div>
                      <Switch checked={settings.theme === 'dark'} onChange={toggleTheme} />
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
                <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar pb-24 md:pb-8"><div className="max-w-2xl mx-auto w-full">{renderSectionContent()}</div></div>
            </div>
        </motion.div>
        <AnimatePresence>{showInstallGuide && (
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6"><motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setShowInstallGuide(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" /><motion.div initial={{scale:0.9, opacity:0, y:20}} animate={{scale:1, opacity:1, y:0}} exit={{scale:0.9, opacity:0, y:20}} className="relative bg-white dark:bg-[#1C1C1E] p-8 rounded-[3rem] shadow-2xl max-w-sm w-full space-y-6"><div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl flex items-center justify-center mx-auto"><Smartphone size={32} /></div><div className="text-center"><h3 className="text-xl font-black">Установка</h3><p className="text-sm text-gray-500">Добавьте приложение на главный экран для быстрого доступа.</p></div><div className="space-y-4"><div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl"><div className="w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center text-xs font-black shrink-0">1</div><p className="text-xs font-bold">Нажмите <span className="inline-block p-1 bg-white dark:bg-black rounded shadow-sm mx-1"><Share size={12}/> Поделиться</span></p></div><div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl"><div className="w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center text-xs font-black shrink-0">2</div><p className="text-xs font-bold">Выберите <span className="text-blue-500">«На экран "Домой"»</span></p></div></div><button onClick={() => setShowInstallGuide(false)} className="w-full bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase text-xs">Понятно</button></motion.div></div>
        )}</AnimatePresence>
    </div>
  );
};

export default SettingsModal;
