
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
  BookOpen, FolderOpen, ArrowUp, ArrowDown, Zap, Gift, RefreshCw, Wand2, Settings2, Moon, Sun, ScanSearch, Files, MessageSquareQuote
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
  onOpenDuplicates?: () => void;
}

const WIDGET_METADATA = [ 
  { id: 'month_chart', label: 'График расходов' },
  { id: 'category_analysis', label: 'Анализ категорий (NEW)' },
  { id: 'shopping', label: 'Список покупок' },
  { id: 'goals', label: 'Цели и копилка' }, 
  { id: 'recent_transactions', label: 'История операций' },
  { id: 'balance', label: 'Общий баланс (устар.)' }, 
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
                    placeholder="Настройте текст сообщения..."
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

const Switch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button 
        onClick={onChange} 
        className={`w-11 h-6 rounded-full p-1 transition-colors relative ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate, onReset, savingsRate, setSavingsRate, members, onUpdateMembers, categories, onUpdateCategories, learnedRules, onUpdateRules, currentFamilyId, onJoinFamily, onLogout, installPrompt, transactions = [], onDeleteTransactionsByPeriod, onUpdateTransactions, onOpenDuplicates }) => {
  const [activeSection, setActiveSection] = useState<SectionType>('general');
  const [showMobileMenu, setShowMobileMenu] = useState(window.innerWidth < 768);
  const [pushStatus, setPushStatus] = useState<string>('');
  
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState(PRESET_COLORS[0]);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<FamilyMember | null>(null);
  
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [catLabel, setCatLabel] = useState('');
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);
  const [catIcon, setCatIcon] = useState(PRESET_ICONS[0]);
  
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleCleanName, setNewRuleCleanName] = useState('');
  
  const [isMandatoryModalOpen, setIsMandatoryModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MandatoryExpense | null>(null);

  const [targetFamilyId, setTargetFamilyId] = useState('');
  const [deleteStartDate, setDeleteStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [deleteEndDate, setDeleteEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [showPinCreator, setShowPinCreator] = useState(false);

  useEffect(() => {
      const handleResize = () => { if (window.innerWidth >= 768) setShowMobileMenu(false); };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  const toggleWidgetVisibility = (id: string) => {
      const widgets = (settings.widgets || []).map(w => w.id === id ? { ...w, isVisible: !w.isVisible } : w);
      handleChange('widgets', widgets);
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

  const toggleTab = (id: string) => {
      const current = settings.enabledTabs || [];
      const updated = current.includes(id) ? current.filter(t => t !== id) : [...current, id];
      if (updated.length === 0) return; 
      handleChange('enabledTabs', updated);
  };

  const toggleService = (id: string) => {
      const current = settings.enabledServices || [];
      const updated = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
      handleChange('enabledServices', updated);
  };

  const handleEditCategoryClick = (cat: Category) => {
      setSelectedCategoryForEdit(cat);
      setCatLabel(cat.label);
      setCatColor(cat.color);
      setCatIcon(cat.icon);
  };

  const handleSaveCategory = () => {
      if (!catLabel.trim()) return;
      if (selectedCategoryForEdit) {
          const updated = categories.map(c => c.id === selectedCategoryForEdit.id ? { ...c, label: catLabel, color: catColor, icon: catIcon } : c);
          onUpdateCategories(updated);
          setSelectedCategoryForEdit(null);
      } else {
          const newId = catLabel.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
          const newCat: Category = { id: newId, label: catLabel, color: catColor, icon: catIcon, isCustom: true };
          onUpdateCategories([...categories, newCat]);
      }
      setCatLabel('');
  };

  const handleDeleteCategory = (id: string) => {
      if (confirm("Удалить категорию?")) {
          onUpdateCategories(categories.filter(c => c.id !== id));
          setSelectedCategoryForEdit(null);
      }
  };

  const handleAddRule = () => {
      if (!newRuleKeyword.trim() || !selectedCategoryForEdit) return;
      const newRule: LearnedRule = { id: Date.now().toString(), keyword: newRuleKeyword.trim(), cleanName: newRuleCleanName.trim() || selectedCategoryForEdit.label, categoryId: selectedCategoryForEdit.id };
      onUpdateRules([...learnedRules, newRule]);
      setNewRuleKeyword('');
      setNewRuleCleanName('');
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
      else alert('Нет операций для обновления');
  };
  
  const handleSaveMember = () => { 
      if (!newMemberName.trim()) return; 
      if (selectedMemberForEdit) {
          const updatedMembers = members.map(m => m.id === selectedMemberForEdit.id ? { ...m, name: newMemberName.trim(), color: newMemberColor } : m);
          onUpdateMembers(updatedMembers);
          setSelectedMemberForEdit(null);
      } else {
          const newMember: FamilyMember = { id: Math.random().toString(36).substr(2, 9), name: newMemberName.trim(), color: newMemberColor }; 
          onUpdateMembers([...members, newMember]); 
      }
      setNewMemberName(''); 
  };

  const handleEditMemberClick = (member: FamilyMember) => {
      setSelectedMemberForEdit(member);
      setNewMemberName(member.name);
      setNewMemberColor(member.color);
  };

  const handleDeleteMember = (id: string) => { 
      if (members.length <= 1) { alert("Должен остаться хотя бы один участник"); return; } 
      onUpdateMembers(members.filter(m => m.id !== id)); 
  };
  
  const handleSaveExpense = (expense: MandatoryExpense) => {
      let updatedExpenses = [...(settings.mandatoryExpenses || [])];
      const existingIdx = updatedExpenses.findIndex(e => e.id === expense.id);
      if (existingIdx >= 0) updatedExpenses[existingIdx] = expense;
      else updatedExpenses.push(expense);
      handleChange('mandatoryExpenses', updatedExpenses);
      setIsMandatoryModalOpen(false);
      setEditingExpense(null);
  };

  const shareInviteLink = async () => { 
      if (!currentFamilyId) return; 
      const link = `${window.location.origin}/?join=${currentFamilyId}`;
      const text = `Привет! 👋\nПрисоединяйся к моему семейному бюджету по ссылке:\n${link}`;
      if (navigator.share) try { await navigator.share({ title: 'Семейный Бюджет', text, url: link }); } catch (err) {}
      else { navigator.clipboard.writeText(link); alert("Ссылка скопирована!"); }
  };

  const handleDeletePeriod = () => {
      if (!onDeleteTransactionsByPeriod) return;
      if (confirm(`Удалить ВСЕ операции за период ${deleteStartDate} - ${deleteEndDate}?`)) {
          onDeleteTransactionsByPeriod(deleteStartDate, deleteEndDate);
      }
  };

  const handlePinCreated = (pin: string) => {
      onUpdate({ ...settings, isPinEnabled: true, pinCode: pin });
      setShowPinCreator(false);
  };

  const handleEnablePush = async () => {
      if (!('Notification' in window)) return alert('Уведомления не поддерживаются');
      const permission = await Notification.requestPermission();
      if (permission === 'granted') { handleChange('pushEnabled', true); setPushStatus('Включено!'); }
      else { setPushStatus('Доступ запрещен'); handleChange('pushEnabled', false); }
  };

  const renderContent = () => {
    switch (activeSection) {
        case 'widgets': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white mb-4">Виджеты на главном экране</h3>
                    <div className="space-y-3">
                        {(settings.widgets || []).map((widget, idx) => {
                            const meta = WIDGET_METADATA.find(m => m.id === widget.id);
                            if (!meta) return null;
                            return (
                                <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border border-gray-100 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col gap-1">
                                            <button disabled={idx === 0} onClick={() => moveWidget(idx, 'up')} className="text-gray-300 hover:text-blue-500 disabled:opacity-30"><ChevronUp size={14}/></button>
                                            <button disabled={idx === (settings.widgets?.length || 1) - 1} onClick={() => moveWidget(idx, 'down')} className="text-gray-300 hover:text-blue-500 disabled:opacity-30"><ChevronDown size={14}/></button>
                                        </div>
                                        <span className="font-bold text-sm text-[#1C1C1E] dark:text-white">{meta.label}</span>
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
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-500 p-2 rounded-xl text-white"><BellRing size={20}/></div>
                        <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white">Telegram Бот</h3>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Bot Token</label>
                        <input type="password" value={settings.telegramBotToken || ''} onChange={e => handleChange('telegramBotToken', e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl font-mono text-xs outline-none text-[#1C1C1E] dark:text-white" placeholder="000000:ABCDEF..." />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Chat ID</label>
                        <input type="text" value={settings.telegramChatId || ''} onChange={e => handleChange('telegramChatId', e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl font-mono text-xs outline-none text-[#1C1C1E] dark:text-white" placeholder="-100..." />
                    </div>
                    <div className="pt-2 space-y-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <MessageSquareQuote size={16} className="text-blue-500" />
                            <h4 className="text-sm font-black text-[#1C1C1E] dark:text-white uppercase tracking-wider">Шаблоны сообщений</h4>
                        </div>
                        <TemplateEditor label="Список покупок" value={settings.shoppingTemplate || '🛒 *Список покупок*\n\n{items}'} onChange={(val) => handleChange('shoppingTemplate', val)} variables={['{items}', '{total}']} />
                        <TemplateEditor label="Событие календаря" value={settings.eventTemplate || '📅 *{title}*\n⏰ {time}, {date}\n👥 {members}\n\n{desc}'} onChange={(val) => handleChange('eventTemplate', val)} variables={['{title}', '{date}', '{time}', '{members}', '{desc}']} />
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white mb-2">Push Уведомления</h3>
                    <button onClick={handleEnablePush} className="w-full bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest">Включить push</button>
                    {pushStatus && <p className="text-center text-[10px] font-bold text-gray-400 mt-2">{pushStatus}</p>}
                </div>
            </div>
        );
        case 'members': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white mb-4">Участники семьи</h3>
                    <div className="grid gap-3 mb-6">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <MemberMarker member={member} size="md" />
                                    <div className="font-bold text-sm text-[#1C1C1E] dark:text-white">{member.name}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditMemberClick(member)} className="p-2 bg-white dark:bg-white/10 rounded-xl text-gray-400 hover:text-blue-500"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeleteMember(member.id)} className="p-2 bg-white dark:bg-white/10 rounded-xl text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl space-y-3">
                        <input type="text" placeholder="Имя" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                        <div className="flex gap-1 bg-white dark:bg-[#1C1C1E] p-1 rounded-xl">
                            {PRESET_COLORS.slice(0, 5).map(c => <button key={c} onClick={() => setNewMemberColor(c)} className={`w-8 h-8 rounded-lg ${newMemberColor === c ? 'ring-2 ring-blue-500' : ''}`} style={{ backgroundColor: c }} />)}
                        </div>
                        <button onClick={handleSaveMember} className="w-full bg-blue-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest">{selectedMemberForEdit ? 'Сохранить' : 'Добавить'}</button>
                    </div>
                </div>
            </div>
        );
        case 'categories': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white">Категории</h3>
                        <button onClick={() => { setSelectedCategoryForEdit(null); setCatLabel(''); }} className="bg-blue-50 dark:bg-blue-900/30 text-blue-500 p-2 rounded-xl"><Plus size={20}/></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto no-scrollbar mb-6">
                        {categories.map(cat => (
                            <div key={cat.id} onClick={() => handleEditCategoryClick(cat)} className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center gap-2 ${selectedCategoryForEdit?.id === cat.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500' : 'bg-gray-50 dark:bg-[#2C2C2E] border-transparent'}`}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>{getIconById(cat.icon, 14)}</div>
                                <span className="text-[10px] font-bold text-[#1C1C1E] dark:text-white">{cat.label}</span>
                            </div>
                        ))}
                    </div>
                    {selectedCategoryForEdit && (
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                            <input type="text" placeholder="Название" value={catLabel} onChange={e => setCatLabel(e.target.value)} className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                            <button onClick={handleSaveCategory} className="w-full bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-3 rounded-xl font-black text-xs uppercase tracking-widest">Обновить</button>
                        </div>
                    )}
                </div>
            </div>
        );
        case 'family': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm text-center">
                    <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white mb-4">Ваша семья</h3>
                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl mb-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Family ID</p>
                        <p className="font-mono text-lg font-bold text-blue-500 break-all select-all">{currentFamilyId}</p>
                    </div>
                    <button onClick={shareInviteLink} className="w-full bg-blue-500 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"><Share size={16} /> Поделиться ID</button>
                </div>
            </div>
        );
        case 'general': default: return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] space-y-5 border border-gray-100 dark:border-white/10 shadow-sm">
                  <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white mb-2">Основные настройки</h3>
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Название семьи</label><input type="text" value={settings.familyName} onChange={(e) => handleChange('familyName', e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] dark:text-white outline-none" /></div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl border border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-white dark:bg-white/10`}>{settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</div>
                          <span className="font-bold text-sm text-[#1C1C1E] dark:text-white">Темная тема</span>
                      </div>
                      <Switch checked={settings.theme === 'dark'} onChange={() => handleChange('theme', settings.theme === 'dark' ? 'light' : 'dark')} />
                  </div>
                  <div className="pt-4 border-t border-gray-50 dark:border-white/10"><button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100"><LogOut size={18} /> Выйти</button></div>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" />
    <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-5xl h-[85vh] md:rounded-[3rem] rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border dark:border-white/10"
    >
        <div className={`bg-white dark:bg-[#1C1C1E] border-r border-gray-100 dark:border-white/10 flex-col shrink-0 overflow-y-auto no-scrollbar md:w-64 md:flex md:static ${showMobileMenu ? 'flex absolute inset-0 w-full z-20' : 'hidden'}`}>
            <div className="p-6 md:p-8 border-b border-gray-50 dark:border-white/5 flex items-center justify-between md:justify-start gap-3">
                <span className="font-black text-xl text-[#1C1C1E] dark:text-white">Настройки</span>
                <button onClick={onClose} className="md:hidden w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center"><X size={20}/></button>
            </div>
            <div className="flex-1 p-4 space-y-2">
                {SECTIONS.map(section => (
                    <button key={section.id} onClick={() => { setActiveSection(section.id); setShowMobileMenu(false); }} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeSection === section.id && !showMobileMenu ? 'bg-blue-500 text-white shadow-lg' : 'bg-transparent text-[#1C1C1E] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeSection === section.id && !showMobileMenu ? 'bg-white/20' : 'bg-gray-50 dark:bg-white/10'}`}>{section.icon}</div>
                        <span className="font-bold text-sm flex-1 text-left">{section.label}</span>
                        <ChevronRight size={16} className="opacity-40" />
                    </button>
                ))}
            </div>
        </div>
        <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F2F2F7] dark:bg-black ${showMobileMenu ? 'hidden' : 'flex'}`}>
            <div className="p-4 md:p-6 border-b border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 text-gray-500"><ArrowLeft size={24} /></button>
                    <h2 className="text-xl font-black text-[#1C1C1E] dark:text-white">{SECTIONS.find(s => s.id === activeSection)?.label}</h2>
                </div>
                <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar pb-24 md:pb-8">
                <div className="max-w-2xl mx-auto w-full">{renderContent()}</div>
            </div>
        </div>
    </motion.div>
    </div>
  );
};

export default SettingsModal;
