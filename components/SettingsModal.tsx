
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Trash2, CheckCircle2, Plus, Palette, Edit2, Check, Clock, Wallet, Tag, ChevronDown, Sparkles, Globe, Smartphone, FileJson, LayoutGrid, ToggleLeft, ToggleRight, Shield, Grip, Lock, Copy, Users, Share, LogOut, ChevronRight, Download, Move, Calculator, DollarSign, GripVertical, Loader2, Monitor, Smartphone as SmartphoneIcon, ArrowUp, ArrowDown, Menu, MessageCircle, AppWindow, MoreVertical, Search, ChevronLeft, MoreHorizontal, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, MandatoryExpense, Transaction, WidgetConfig } from '../types';
import { MemberMarker } from '../constants';
import { getIconById } from '../constants';
import { deleteItemsBatch } from '../utils/db';

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
}

const WIDGET_METADATA = [ 
  { id: 'balance', label: 'Баланс', icon: '💳' }, 
  { id: 'goals', label: 'Цели', icon: '🎯' }, 
  { id: 'charts', label: 'Структура', icon: '📊' }, 
  { id: 'month_chart', label: 'График месяца', icon: '📅' },
  { id: 'shopping', label: 'Покупки', icon: '🛒' },
  { id: 'recent_transactions', label: 'История', icon: '📜' },
];

const GRID_SIZES = [
    { label: '1x1', w: 1, h: 1 },
    { label: '2x1', w: 2, h: 1 },
    { label: '1x2', w: 1, h: 2 },
    { label: '2x2', w: 2, h: 2 },
    { label: '4x2', w: 4, h: 2, desktopOnly: true }, // Full width desktop
];

type SectionType = 'general' | 'budget' | 'members' | 'categories' | 'widgets' | 'navigation' | 'services' | 'telegram' | 'advanced' | 'family';

const SECTIONS: { id: SectionType; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Общее', icon: <Globe size={20} /> },
  { id: 'budget', label: 'Бюджет', icon: <Calculator size={20} /> },
  { id: 'members', label: 'Участники', icon: <Users size={20} /> },
  { id: 'categories', label: 'Категории', icon: <Tag size={20} /> },
  { id: 'navigation', label: 'Навигация', icon: <Menu size={20} /> },
  { id: 'services', label: 'Сервисы', icon: <AppWindow size={20} /> },
  { id: 'widgets', label: 'Виджеты', icon: <LayoutGrid size={20} /> },
  { id: 'telegram', label: 'Telegram', icon: <MessageCircle size={20} /> },
  { id: 'family', label: 'Семья', icon: <Share size={20} /> },
];

const PRESET_COLORS = [ '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#FF3B30', '#5856D6', '#00C7BE', '#8E8E93', '#BF5AF2' ];
const PRESET_ICONS = [ 
  'Utensils', 'Car', 'Home', 'ShoppingBag', 'Heart', 'Zap', 'Plane', 
  'Briefcase', 'PiggyBank', 'Coffee', 'Tv', 'MoreHorizontal', 'Shirt', 
  'Music', 'Gamepad2', 'Baby', 'Dog', 'Cat', 'Flower2', 'Hammer', 
  'Wrench', 'BookOpen', 'GraduationCap', 'Palmtree', 'Gift', 
  'Smartphone', 'Wifi', 'Scissors', 'Bath', 'Bed', 'Sofa', 'Bike', 'Drumstick'
];

const AVAILABLE_TABS = [
    { id: 'overview', label: 'Обзор' },
    { id: 'budget', label: 'Бюджет' },
    { id: 'plans', label: 'Планы' },
    { id: 'shopping', label: 'Покупки' },
    { id: 'services', label: 'Сервисы' }
];

const AVAILABLE_SERVICES = [
    { id: 'wallet', label: 'Кошелек' },
    { id: 'meters', label: 'Счетчики' },
    { id: 'subs', label: 'Подписки' },
    { id: 'wishlist', label: 'Wishlist' },
    { id: 'chat', label: 'AI Советник' },
    { id: 'pantry', label: 'Кладовка' },
    { id: 'debts', label: 'Долги' }
];

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate, onReset, savingsRate, setSavingsRate, members, onUpdateMembers, categories, onUpdateCategories, learnedRules, onUpdateRules, onEnablePin, onDisablePin, currentFamilyId, onJoinFamily, onLogout, installPrompt, transactions = [] }) => {
  const [activeSection, setActiveSection] = useState<SectionType>('general');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState(PRESET_COLORS[0]);
  
  // Category State
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ label: '', icon: PRESET_ICONS[0], color: PRESET_COLORS[5] });
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  
  // Selection Expansion State
  const [showAllIcons, setShowAllIcons] = useState(false);

  const [targetFamilyId, setTargetFamilyId] = useState('');
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  
  // Mandatory Expense Editing
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseName, setEditExpenseName] = useState('');
  const [editExpenseAmount, setEditExpenseAmount] = useState('');

  // Widget Editor State
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  useEffect(() => {
      // Reset expansion state when changing views
      setShowAllIcons(false);
  }, [selectedCategoryForEdit, activeSection]);

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
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

  const toggleWidgetVisibility = (id: string) => {
      const widgets = settings.widgets.map(w => w.id === id ? { ...w, isVisible: !w.isVisible } : w);
      handleChange('widgets', widgets);
  };

  const updateWidgetSize = (id: string, device: 'mobile' | 'desktop', w: number, h: number) => {
      const widgets = settings.widgets.map(widget => 
          widget.id === id 
              ? { ...widget, [device]: { colSpan: w, rowSpan: h } }
              : widget
      );
      handleChange('widgets', widgets);
  };

  const toggleTab = (id: string) => {
      const current = settings.enabledTabs || [];
      const updated = current.includes(id) 
          ? current.filter(t => t !== id)
          : [...current, id];
      // Ensure at least one tab is active to avoid empty screen
      if (updated.length === 0) return;
      handleChange('enabledTabs', updated);
  };

  const toggleService = (id: string) => {
      const current = settings.enabledServices || [];
      const updated = current.includes(id)
          ? current.filter(s => s !== id)
          : [...current, id];
      handleChange('enabledServices', updated);
  };

  const handleAddCategory = () => { 
      if (!newCategory.label.trim()) return; 
      const newCat: Category = { ...newCategory, id: newCategory.label.toLowerCase().replace(/\s/g, '_'), isCustom: true }; 
      onUpdateCategories([...categories, newCat]); 
      setNewCategory({ label: '', icon: PRESET_ICONS[0], color: PRESET_COLORS[5] }); 
      setShowAllIcons(false);
  };
  
  const handleUpdateCategory = (updatedCat: Category) => {
      onUpdateCategories(categories.map(c => c.id === updatedCat.id ? updatedCat : c));
      setSelectedCategoryForEdit(updatedCat); // Update local state to reflect changes immediately
  };

  const handleDeleteCategory = (id: string) => { 
      onUpdateCategories(categories.filter(c => c.id !== id)); 
      onUpdateRules(learnedRules.filter(r => r.categoryId !== id)); 
      setSelectedCategoryForEdit(null);
  };
  
  const handleAddRuleToCategory = (catId: string) => { 
      if (!newRuleKeyword.trim()) return; 
      const rule: LearnedRule = { 
          id: Date.now().toString(), 
          categoryId: catId, 
          keyword: newRuleKeyword.trim(), 
          cleanName: newRuleKeyword.trim() 
      }; 
      onUpdateRules([...learnedRules, rule]); 
      setNewRuleKeyword(''); 
  };
  const handleDeleteRule = (id: string) => onUpdateRules(learnedRules.filter(r => r.id !== id));
  
  const handleAddMember = () => { if (!newMemberName.trim()) return; const newMember: FamilyMember = { id: Math.random().toString(36).substr(2, 9), name: newMemberName.trim(), color: newMemberColor }; onUpdateMembers([...members, newMember]); setNewMemberName(''); setNewMemberColor(PRESET_COLORS[0]); };
  const handleDeleteMember = (id: string) => { if (members.length <= 1) { alert("Должен остаться хотя бы один участник"); return; } onUpdateMembers(members.filter(m => m.id !== id)); };
  
  const handleAddMandatoryExpense = () => { if (!newExpenseName.trim() || !newExpenseAmount) return; const newExpense: MandatoryExpense = { id: Date.now().toString(), name: newExpenseName.trim(), amount: parseFloat(newExpenseAmount) }; const currentExpenses = settings.mandatoryExpenses || []; handleChange('mandatoryExpenses', [...currentExpenses, newExpense]); setNewExpenseName(''); setNewExpenseAmount(''); };
  const handleDeleteMandatoryExpense = (id: string) => { const currentExpenses = settings.mandatoryExpenses || []; handleChange('mandatoryExpenses', currentExpenses.filter(e => e.id !== id)); };
  
  const startEditingExpense = (expense: MandatoryExpense) => {
      setEditingExpenseId(expense.id);
      setEditExpenseName(expense.name);
      setEditExpenseAmount(String(expense.amount));
  };

  const saveEditingExpense = () => {
      if (!editExpenseName.trim() || !editExpenseAmount) return;
      const currentExpenses = settings.mandatoryExpenses || [];
      const updated = currentExpenses.map(e => 
          e.id === editingExpenseId 
              ? { ...e, name: editExpenseName.trim(), amount: parseFloat(editExpenseAmount) }
              : e
      );
      handleChange('mandatoryExpenses', updated);
      setEditingExpenseId(null);
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert("ID скопирован в буфер обмена"); };
  const shareInviteLink = async () => { if (!currentFamilyId) return; const link = `${window.location.origin}/?join=${currentFamilyId}`; if (navigator.share) { try { await navigator.share({ title: `Присоединяйся к семейному бюджету ${settings.familyName}`, text: `Перейди по ссылке, чтобы вести бюджет вместе!`, url: link, }); } catch (err) { console.error('Error sharing', err); } } else { copyToClipboard(link); alert("Ссылка-приглашение скопирована!"); } };
  const handleInstallApp = async () => { if (!installPrompt) return; installPrompt.prompt(); };

  const renderContent = () => {
    switch (activeSection) {
        case 'widgets': return (
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Настройка главной</h3>
                    <p className="text-xs text-gray-400 mb-6 font-medium">Включайте виджеты и настраивайте их размер.</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {settings.widgets.map((widgetConfig, index) => {
                            const meta = WIDGET_METADATA.find(m => m.id === widgetConfig.id);
                            if (!meta) return null;
                            const isEditing = editingWidgetId === widgetConfig.id;
                            
                            return (
                                <div 
                                    key={widgetConfig.id} 
                                    className={`relative flex flex-col p-3 rounded-[1.5rem] transition-all border ${isEditing ? 'col-span-2 md:col-span-3 bg-white border-blue-200 shadow-md z-10' : 'bg-gray-50/50 border-gray-100 hover:border-blue-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-sm border ${widgetConfig.isVisible ? 'bg-white border-gray-50' : 'bg-gray-100 border-transparent text-gray-400'}`}>
                                            {meta.icon}
                                        </div>
                                        
                                        {!isEditing && (
                                            <button 
                                                onClick={() => toggleWidgetVisibility(widgetConfig.id)} 
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${widgetConfig.isVisible ? 'text-green-500 bg-green-50' : 'text-gray-300 bg-gray-100'}`}
                                            >
                                                {widgetConfig.isVisible ? <Check size={16} strokeWidth={3} /> : <X size={16} />}
                                            </button>
                                        )}
                                        {isEditing && (
                                            <button onClick={() => setEditingWidgetId(null)} className="p-1 bg-gray-100 rounded-full text-gray-500"><X size={16}/></button>
                                        )}
                                    </div>

                                    <div className="flex-1 flex flex-col justify-center items-center text-center min-h-[40px] px-1">
                                        <span className={`font-bold text-xs leading-tight ${widgetConfig.isVisible ? 'text-[#1C1C1E]' : 'text-gray-400'}`}>
                                            {meta.label}
                                        </span>
                                    </div>

                                    {isEditing ? (
                                        <div className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg w-fit">
                                                    <SmartphoneIcon size={12} /> Телефон
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {GRID_SIZES.filter(s => !s.desktopOnly).map(size => {
                                                        const isActive = widgetConfig.mobile.colSpan === size.w && widgetConfig.mobile.rowSpan === size.h;
                                                        return (
                                                            <button key={size.label} onClick={() => updateWidgetSize(widgetConfig.id, 'mobile', size.w, size.h)} className={`flex-1 min-w-[60px] py-2 rounded-xl text-[10px] font-bold border transition-all ${isActive ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{size.label}</button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-purple-500 text-[10px] font-black uppercase tracking-widest bg-purple-50 px-2 py-1 rounded-lg w-fit">
                                                    <Monitor size={12} /> Компьютер
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {GRID_SIZES.map(size => {
                                                        const isActive = widgetConfig.desktop.colSpan === size.w && widgetConfig.desktop.rowSpan === size.h;
                                                        return (
                                                            <button key={size.label} onClick={() => updateWidgetSize(widgetConfig.id, 'desktop', size.w, size.h)} className={`flex-1 min-w-[60px] py-2 rounded-xl text-[10px] font-bold border transition-all ${isActive ? 'bg-purple-500 text-white border-purple-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{size.label}</button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/50">
                                            <div className="flex gap-1">
                                                <button onClick={() => moveWidget(index, 'up')} disabled={index === 0} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-blue-500 disabled:opacity-20 transition-colors"><ArrowLeft size={12} strokeWidth={3}/></button>
                                                <button onClick={() => moveWidget(index, 'down')} disabled={index === settings.widgets.length - 1} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-blue-500 disabled:opacity-20 transition-colors"><ArrowRight size={12} strokeWidth={3}/></button>
                                            </div>
                                            <button 
                                                onClick={() => setEditingWidgetId(widgetConfig.id)} 
                                                className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                                            >
                                                <LayoutGrid size={12} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
             </div>
        );
        case 'general': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Основные настройки</h3>
                  {installPrompt && (
                     <div className="bg-blue-50 p-4 rounded-2xl flex items-center justify-between border border-blue-100"><div className="flex items-center gap-3"><Download size={20} className="text-blue-500"/><span className="text-sm font-bold text-blue-700">Установить как приложение</span></div><button onClick={handleInstallApp} className="bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase">Установить</button></div>
                  )}
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Название семьи</label><input type="text" value={settings.familyName} onChange={(e) => handleChange('familyName', e.target.value)} className="w-full bg-white border border-gray-100 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none shadow-sm focus:border-blue-200 transition-all" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Валюта</label><input type="text" value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)} className="w-full bg-white border border-gray-100 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none shadow-sm focus:border-blue-200 transition-all" /></div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Режим при входе</label>
                    <div className="flex bg-gray-50 p-1 rounded-2xl">
                      <button onClick={() => handleChange('defaultBudgetMode', 'personal')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${settings.defaultBudgetMode === 'personal' ? 'bg-white shadow-sm text-[#1C1C1E]' : 'text-gray-400'}`}>Мой</button>
                      <button onClick={() => handleChange('defaultBudgetMode', 'family')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${settings.defaultBudgetMode === 'family' ? 'bg-white shadow-sm text-[#1C1C1E]' : 'text-gray-400'}`}>Общий</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2"><div className="flex items-center gap-3"><Shield size={20} className="text-gray-400" /><span className="font-bold text-sm">Приватный режим</span></div><button onClick={() => handleChange('privacyMode', !settings.privacyMode)} className={`transition-colors ${settings.privacyMode ? 'text-blue-500' : 'text-gray-300'}`}>{settings.privacyMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}</button></div>
                  <div className="flex items-center justify-between p-2 border-t border-gray-50 pt-4"><div className="flex items-center gap-3"><Lock size={20} className="text-gray-400" /><span className="font-bold text-sm">Вход по PIN-коду</span></div><button onClick={() => { if (settings.isPinEnabled) { onDisablePin?.(); } else { onEnablePin?.(); } }} className={`transition-colors ${settings.isPinEnabled ? 'text-green-500' : 'text-gray-300'}`}>{settings.isPinEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}</button></div>
                  
                  <div className="pt-4 border-t border-gray-50">
                      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                          <LogOut size={18} /> Выйти
                      </button>
                  </div>
                </div>
            </div>
        );
        case 'budget': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Расчет бюджета</h3>
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Начальный баланс</label><div className="flex gap-2"><div className="flex-1 space-y-1"><input type="number" min="0" value={settings.initialBalance} onChange={e => handleChange('initialBalance', Math.abs(Number(e.target.value)))} className="w-full bg-white border border-gray-100 p-3 rounded-xl font-bold text-sm outline-none shadow-sm focus:border-blue-200 transition-all" placeholder="Сумма" /><div className="text-[9px] font-black text-gray-300 uppercase text-center">Сумма</div></div><div className="flex-1 space-y-1"><input type="date" value={settings.initialBalanceDate || ''} onChange={e => handleChange('initialBalanceDate', e.target.value)} className="w-full bg-white border border-gray-100 p-3 rounded-xl font-bold text-sm outline-none shadow-sm focus:border-blue-200 transition-all" /><div className="text-[9px] font-black text-gray-300 uppercase text-center">Дата старта</div></div></div></div>
                    <div className="flex gap-4"><div className="flex-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Число начала месяца</label><input type="number" min="1" max="31" value={settings.startOfMonthDay} onChange={(e) => handleChange('startOfMonthDay', Number(e.target.value))} className="w-full bg-white border border-gray-100 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none text-center shadow-sm focus:border-blue-200 transition-all" /></div><div className="flex-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Дни Зарплаты</label><input type="text" placeholder="10, 25" value={settings.salaryDates?.join(', ') || ''} onChange={(e) => { const val = e.target.value; const dates = val.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n <= 31); handleChange('salaryDates', dates); }} className="w-full bg-white border border-gray-100 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none text-center shadow-sm focus:border-blue-200 transition-all" /></div></div>
                    <div className="space-y-2"><div className="flex justify-between items-center px-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Процент в копилку</label><span className="text-sm font-black text-blue-500">{savingsRate}%</span></div><input type="range" min="0" max="50" step="1" value={savingsRate} onChange={(e) => setSavingsRate(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500" /><p className="text-[9px] text-gray-400 px-2">Этот % вычитается из баланса при расчете доступного лимита.</p></div>
                </div>
                <div className="bg-white p-6 rounded-3xl space-y-4 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-2 flex items-center gap-2"><DollarSign size={20} className="text-red-500"/> Обязательные расходы</h3>
                    <div className="space-y-2">
                        {(settings.mandatoryExpenses || []).map((exp) => {
                            if (editingExpenseId === exp.id) {
                                return (
                                    <div key={exp.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded-2xl border border-blue-200">
                                        <input autoFocus className="flex-1 bg-white px-2 py-2 rounded-lg text-xs font-bold outline-none text-[#1C1C1E]" value={editExpenseName} onChange={e => setEditExpenseName(e.target.value)} />
                                        <input type="number" min="0" className="w-20 bg-white px-2 py-2 rounded-lg text-xs font-bold outline-none text-[#1C1C1E]" value={editExpenseAmount} onChange={e => setEditExpenseAmount(e.target.value)} />
                                        <button onClick={saveEditingExpense} className="p-2 text-green-600 bg-white rounded-lg shadow-sm"><Check size={14}/></button>
                                        <button onClick={() => setEditingExpenseId(null)} className="p-2 text-red-500 hover:bg-white rounded-lg"><X size={14}/></button>
                                    </div>
                                )
                            }
                            return (
                                <div key={exp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span className="font-bold text-sm text-[#1C1C1E] pl-2 truncate flex-1">{exp.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-sm whitespace-nowrap">{exp.amount.toLocaleString()} {settings.currency}</span>
                                        <button onClick={() => startEditingExpense(exp)} className="p-1.5 text-gray-400 hover:text-blue-500 bg-white rounded-lg shadow-sm"><Edit2 size={14}/></button>
                                        <button onClick={() => handleDeleteMandatoryExpense(exp.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-50">
                        <input type="text" placeholder="Название..." value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} className="w-full sm:flex-1 bg-white border border-gray-100 px-4 py-3 rounded-xl text-xs font-bold outline-none text-[#1C1C1E] shadow-sm"/>
                        <div className="flex gap-2">
                            <input type="number" min="0" placeholder="Сумма" value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value)} className="flex-1 sm:w-32 bg-white border border-gray-100 px-4 py-3 rounded-xl text-xs font-bold outline-none text-[#1C1C1E] shadow-sm"/>
                            <button onClick={handleAddMandatoryExpense} className="shrink-0 bg-blue-600 text-white p-3 rounded-xl flex items-center justify-center shadow-lg"><Plus size={18}/></button>
                        </div>
                    </div>
                </div>
            </div>
        );
        case 'family': return (
            <div className="space-y-6"><div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm"><h3 className="text-lg font-black text-[#1C1C1E] mb-2">Приглашения</h3><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Пригласить в семью</label><div className="flex gap-2"><div className="flex-1 bg-white border border-gray-100 shadow-sm p-4 rounded-2xl font-mono text-xs text-[#1C1C1E] break-all flex items-center">{currentFamilyId}</div><button onClick={shareInviteLink} className="p-4 bg-blue-500 text-white hover:bg-blue-600 rounded-2xl transition-colors shadow-lg shadow-blue-500/20"><Share size={18} /></button><button onClick={() => currentFamilyId && copyToClipboard(currentFamilyId)} className="p-4 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors text-gray-500"><Copy size={18} /></button></div></div><div className="border-t border-gray-50 pt-4 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Присоединиться к другой семье</label><input type="text" placeholder="Вставьте ID семьи..." value={targetFamilyId} onChange={(e) => setTargetFamilyId(e.target.value)} className="w-full bg-white border border-gray-100 shadow-sm p-4 rounded-2xl font-bold text-xs outline-none focus:border-blue-200 transition-all" /><button onClick={() => onJoinFamily(targetFamilyId)} disabled={!targetFamilyId || targetFamilyId === currentFamilyId} className="w-full bg-pink-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-pink-500/20 disabled:opacity-50 disabled:shadow-none">Присоединиться</button></div></div></div>
        );
        case 'members': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Управление участниками</h3>
                    <div className="space-y-3">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <MemberMarker member={member} size="sm" />
                                    <span className="font-bold text-sm text-[#1C1C1E]">{member.name}</span>
                                    {member.isAdmin && <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg font-black uppercase">Admin</span>}
                                </div>
                                <button onClick={() => handleDeleteMember(member.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 border-t border-gray-50 space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Добавить участника</label>
                        <div className="flex flex-col gap-3">
                            <input type="text" placeholder="Имя" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="w-full bg-white border border-gray-100 p-3 rounded-xl font-bold text-sm outline-none shadow-sm" />
                            <div className="flex items-start gap-2">
                                <div className="flex-1 py-2">
                                    <div className="flex flex-wrap gap-3 items-center">
                                        {PRESET_COLORS.map(c => (
                                            <button 
                                                key={c} 
                                                onClick={() => setNewMemberColor(c)} 
                                                className={`w-8 h-8 rounded-full shrink-0 transition-transform ${newMemberColor === c ? 'scale-110 border-2 border-white shadow-md ring-1 ring-gray-200' : 'border-2 border-transparent'}`} 
                                                style={{ backgroundColor: c }} 
                                            />
                                        ))}
                                    </div>
                                </div>
                                <button onClick={handleAddMember} className="shrink-0 bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-xl shadow-lg mt-0"><Plus size={20} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
        case 'navigation': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Нижнее меню</h3>
                    <p className="text-xs text-gray-400 mb-4">Выберите разделы, которые будут отображаться в нижней панели приложения.</p>
                    <div className="space-y-3">
                        {AVAILABLE_TABS.map(tab => (
                            <div key={tab.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="font-bold text-sm text-[#1C1C1E]">{tab.label}</span>
                                <button onClick={() => toggleTab(tab.id)} className={`transition-colors ${settings.enabledTabs?.includes(tab.id) ? 'text-green-500' : 'text-gray-300'}`}>
                                    {settings.enabledTabs?.includes(tab.id) ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
        case 'services': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Активные сервисы</h3>
                    <p className="text-xs text-gray-400 mb-4">Выберите мини-приложения, которые будут доступны в разделе "Сервисы".</p>
                    <div className="space-y-3">
                        {AVAILABLE_SERVICES.map(service => (
                            <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="font-bold text-sm text-[#1C1C1E]">{service.label}</span>
                                <button onClick={() => toggleService(service.id)} className={`transition-colors ${settings.enabledServices?.includes(service.id) ? 'text-green-500' : 'text-gray-300'}`}>
                                    {settings.enabledServices?.includes(service.id) ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
        case 'telegram': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Настройка Telegram</h3>
                    <div className="bg-blue-50 p-4 rounded-2xl text-xs text-blue-700 leading-relaxed font-medium">
                        Создайте бота в @BotFather, получите токен. Добавьте бота в семейную группу и узнайте Chat ID.
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Bot Token</label>
                        <input type="text" placeholder="123456:ABC-DEF..." value={settings.telegramBotToken || ''} onChange={e => handleChange('telegramBotToken', e.target.value)} className="w-full bg-white border border-gray-100 p-4 rounded-2xl font-mono text-xs text-[#1C1C1E] outline-none shadow-sm focus:border-blue-200 transition-all" />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Chat ID</label>
                        <input type="text" placeholder="-100..." value={settings.telegramChatId || ''} onChange={e => handleChange('telegramChatId', e.target.value)} className="w-full bg-white border border-gray-100 p-4 rounded-2xl font-mono text-xs text-[#1C1C1E] outline-none shadow-sm focus:border-blue-200 transition-all" />
                    </div>

                    <div className="flex items-center justify-between p-2 pt-4 border-t border-gray-50">
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-[#1C1C1E]">Авто-отправка событий</span>
                            <span className="text-[10px] text-gray-400">Новые события сразу летят в чат</span>
                        </div>
                        <button onClick={() => handleChange('autoSendEventsToTelegram', !settings.autoSendEventsToTelegram)} className={`transition-colors ${settings.autoSendEventsToTelegram ? 'text-green-500' : 'text-gray-300'}`}>
                            {settings.autoSendEventsToTelegram ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </button>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-gray-50">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Шаблон события</label>
                        <textarea rows={4} value={settings.eventTemplate || ''} onChange={e => handleChange('eventTemplate', e.target.value)} className="w-full bg-gray-50 border border-gray-100 p-3 rounded-2xl text-xs font-mono text-[#1C1C1E] outline-none resize-none" placeholder="{{title}}, {{date}}..." />
                        <p className="text-[9px] text-gray-400 px-2">Доступно: {'{{title}}, {{date}}, {{time}}, {{description}}, {{members}}'}</p>
                    </div>
                    
                    <div className="space-y-2 pt-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Шаблон списка покупок</label>
                        <textarea rows={4} value={settings.shoppingTemplate || ''} onChange={e => handleChange('shoppingTemplate', e.target.value)} className="w-full bg-gray-50 border border-gray-100 p-3 rounded-2xl text-xs font-mono text-[#1C1C1E] outline-none resize-none" placeholder="Список: {{items}}" />
                        <p className="text-[9px] text-gray-400 px-2">Доступно: {'{{items}}'}</p>
                    </div>
                </div>
            </div>
        );
        case 'categories': 
            if (selectedCategoryForEdit) {
                const isCustom = selectedCategoryForEdit.isCustom;
                const rules = learnedRules.filter(r => r.categoryId === selectedCategoryForEdit.id);
                
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm relative">
                            <button onClick={() => setSelectedCategoryForEdit(null)} className="absolute top-6 left-6 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            
                            <div className="text-center pt-8 pb-4">
                                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg mb-4" style={{ backgroundColor: selectedCategoryForEdit.color }}>
                                    {getIconById(selectedCategoryForEdit.icon, 32)}
                                </div>
                                <h3 className="text-xl font-black text-[#1C1C1E]">{selectedCategoryForEdit.label}</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Название</label>
                                    <input 
                                        type="text" 
                                        value={selectedCategoryForEdit.label} 
                                        onChange={e => handleUpdateCategory({...selectedCategoryForEdit, label: e.target.value})} 
                                        disabled={!isCustom}
                                        className={`w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none transition-all ${isCustom ? 'focus:border-blue-200' : 'opacity-60 cursor-not-allowed'}`} 
                                    />
                                    {!isCustom && <p className="text-[9px] text-gray-400 px-2">Базовые категории нельзя переименовать</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Иконка</label>
                                    <div className={`transition-all ${showAllIcons ? 'bg-gray-50 p-3 rounded-2xl' : ''}`}>
                                        <div className={`grid gap-2 ${showAllIcons ? 'grid-cols-6 sm:grid-cols-8' : 'grid-cols-7'}`}>
                                            {(showAllIcons ? PRESET_ICONS.filter(i => i !== 'MoreHorizontal') : PRESET_ICONS.slice(0, 6)).map(icon => (
                                                <button 
                                                    key={icon} 
                                                    onClick={() => handleUpdateCategory({...selectedCategoryForEdit, icon})} 
                                                    className={`aspect-square rounded-xl flex items-center justify-center transition-all ${selectedCategoryForEdit.icon === icon ? 'bg-blue-600 text-white shadow-md scale-110' : 'bg-white border border-gray-100 text-gray-400 hover:border-gray-300'}`}
                                                >
                                                    {getIconById(icon, 18)}
                                                </button>
                                            ))}
                                            {!showAllIcons && (
                                                <button 
                                                    onClick={() => setShowAllIcons(true)} 
                                                    className="aspect-square rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                                                >
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            )}
                                        </div>
                                        {showAllIcons && (
                                            <button onClick={() => setShowAllIcons(false)} className="w-full mt-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600">Свернуть</button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Цвет</label>
                                    <div className="flex flex-wrap gap-3 items-center">
                                        {PRESET_COLORS.map(c => (
                                            <button 
                                                key={c} 
                                                onClick={() => handleUpdateCategory({...selectedCategoryForEdit, color: c})} 
                                                className={`w-8 h-8 rounded-full shrink-0 transition-transform ${selectedCategoryForEdit.color === c ? 'scale-125 border-4 border-white shadow-md ring-1 ring-gray-100' : 'border-2 border-transparent'}`} 
                                                style={{ backgroundColor: c }} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {isCustom && (
                                <button onClick={() => handleDeleteCategory(selectedCategoryForEdit.id)} className="w-full py-4 text-red-500 font-bold text-xs uppercase tracking-widest bg-red-50 rounded-2xl mt-4">
                                    Удалить категорию
                                </button>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-black text-[#1C1C1E] mb-2 flex items-center gap-2"><Sparkles size={18} className="text-yellow-500"/> Правила авто-категорий</h3>
                            <p className="text-xs text-gray-400 mb-4">Если в описании операции встречается одно из этих слов, она автоматически попадет в эту категорию.</p>
                            
                            <div className="max-h-48 overflow-y-auto no-scrollbar space-y-2">
                                {rules.length === 0 ? (
                                    <div className="text-center py-6 text-gray-300 font-bold text-xs uppercase border-2 border-dashed border-gray-100 rounded-2xl">Нет правил</div>
                                ) : (
                                    rules.map(rule => (
                                        <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                            <span className="font-bold text-xs text-[#1C1C1E] pl-2">"{rule.keyword}"</span>
                                            <button onClick={() => handleDeleteRule(rule.id)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="pt-2 flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Новое ключевое слово..." 
                                    value={newRuleKeyword}
                                    onChange={e => setNewRuleKeyword(e.target.value)}
                                    className="flex-1 bg-white border border-gray-100 p-3 rounded-xl font-bold text-xs outline-none shadow-sm" 
                                />
                                <button onClick={() => handleAddRuleToCategory(selectedCategoryForEdit.id)} className="bg-blue-600 text-white px-4 rounded-xl shadow-lg"><Plus size={18}/></button>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Категории расходов</h3>
                        <p className="text-xs text-gray-400 mb-4">Нажмите на категорию, чтобы настроить её или добавить правила автоматического распределения.</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto no-scrollbar p-1">
                            {categories.map(cat => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => setSelectedCategoryForEdit(cat)}
                                    className="relative flex flex-col items-center justify-start p-2 bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100 rounded-2xl transition-all group active:scale-95 min-h-[100px]"
                                >
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm shadow-sm shrink-0 mb-2 mt-1 transition-transform group-hover:scale-110" style={{ backgroundColor: cat.color }}>
                                        {getIconById(cat.icon, 20)}
                                    </div>
                                    <span className="font-bold text-[10px] text-[#1C1C1E] text-center leading-3 w-full break-words hyphens-auto px-0.5 pb-2">
                                        {cat.label}
                                    </span>
                                    {cat.isCustom && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full ring-1 ring-white" />}
                                </button>
                            ))}
                        </div>
                        
                        <div className="pt-4 border-t border-gray-50 space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Новая категория</label>
                            <input type="text" placeholder="Название" value={newCategory.label} onChange={e => setNewCategory({...newCategory, label: e.target.value})} className="w-full bg-white border border-gray-100 p-3 rounded-xl font-bold text-sm outline-none shadow-sm" />
                            
                            <div className={`transition-all ${showAllIcons ? 'bg-gray-50 p-3 rounded-2xl' : ''}`}>
                                <div className={`grid gap-2 ${showAllIcons ? 'grid-cols-6 sm:grid-cols-8' : 'grid-cols-7'}`}>
                                    {(showAllIcons ? PRESET_ICONS.filter(i => i !== 'MoreHorizontal') : PRESET_ICONS.slice(0, 6)).map(icon => (
                                        <button key={icon} onClick={() => setNewCategory({...newCategory, icon})} className={`aspect-square rounded-xl flex items-center justify-center transition-all ${newCategory.icon === icon ? 'bg-blue-600 text-white shadow-md scale-110' : 'bg-white border border-gray-100 text-gray-400 hover:border-gray-300'}`}>{getIconById(icon, 16)}</button>
                                    ))}
                                    {!showAllIcons && (
                                        <button onClick={() => setShowAllIcons(true)} className="aspect-square rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    )}
                                </div>
                                {showAllIcons && (
                                    <button onClick={() => setShowAllIcons(false)} className="w-full mt-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600">Свернуть</button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-3 items-center">
                                {PRESET_COLORS.map(c => (
                                    <button key={c} onClick={() => setNewCategory({...newCategory, color: c})} className={`w-8 h-8 rounded-full shrink-0 transition-transform ${newCategory.color === c ? 'scale-125 border-4 border-white shadow-md ring-1 ring-gray-100' : 'border-2 border-transparent'}`} style={{ backgroundColor: c }} />
                                ))}
                            </div>

                            <button onClick={handleAddCategory} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg">Создать категорию</button>
                        </div>
                    </div>
                </div>
            );
        default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#F2F2F7] w-full max-w-5xl h-[85vh] md:rounded-[3rem] rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden">
         {/* Sidebar / Top Nav */}
         <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-100 flex flex-row md:flex-col shrink-0 overflow-x-auto md:overflow-y-auto no-scrollbar md:h-full">
             <div className="hidden md:flex p-6 md:p-8 border-b border-gray-50 items-center justify-center md:justify-start gap-3">
                 <div className="w-10 h-10 bg-white text-[#1C1C1E] rounded-2xl flex items-center justify-center shadow-sm border border-gray-100"><GripVertical size={20}/></div>
                 <span className="font-black text-xl hidden md:block">Настройки</span>
             </div>
             <div className="flex flex-row md:flex-col flex-1 p-2 md:p-3 space-x-1 md:space-x-0 md:space-y-1">
                 {SECTIONS.map(section => (
                     <button
                        key={section.id}
                        onClick={() => { setActiveSection(section.id); setSelectedCategoryForEdit(null); }}
                        className={`flex-shrink-0 md:w-full p-3 rounded-2xl flex flex-col md:flex-row items-center gap-2 md:gap-3 transition-all ${activeSection === section.id ? 'bg-[#F2F2F7] shadow-inner' : 'hover:bg-gray-50'}`}
                     >
                         <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${activeSection === section.id ? 'bg-white shadow-sm' : 'bg-gray-50 text-gray-400'}`}>
                             {section.icon}
                         </div>
                         <span className={`font-bold text-[10px] md:text-sm ${activeSection === section.id ? 'text-[#1C1C1E]' : 'text-gray-400'}`}>{section.label}</span>
                     </button>
                 ))}
             </div>
         </div>

         {/* Content */}
         <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
             <div className="p-4 md:p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-md flex justify-between items-center shrink-0">
                 <h2 className="text-xl font-black text-[#1C1C1E]">{SECTIONS.find(s => s.id === activeSection)?.label}</h2>
                 <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar pb-20 md:pb-8">
                 <div className="max-w-2xl mx-auto w-full">
                     {renderContent()}
                 </div>
             </div>
         </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;
