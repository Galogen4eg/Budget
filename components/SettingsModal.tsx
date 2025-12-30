
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Trash2, CheckCircle2, Plus, Palette, Edit2, Check, Clock, Wallet, Tag, ChevronDown, Sparkles, Globe, Smartphone, FileJson, LayoutGrid, ToggleLeft, ToggleRight, Shield, Grip, Lock, Copy, Users, Share, LogOut, ChevronRight, Download, Move, Calculator, DollarSign, GripVertical } from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, MandatoryExpense } from '../types';
import { MemberMarker } from '../constants';
import { getIconById } from '../constants';

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
}

const DASHBOARD_WIDGETS = [ 
  { id: 'balance', label: 'Баланс', icon: '💳' }, 
  { id: 'daily', label: 'Бюджет', icon: '💰' }, 
  { id: 'spent', label: 'Траты', icon: '📉' }, 
  { id: 'goals', label: 'Цели', icon: '🎯' }, 
  { id: 'charts', label: 'Графики', icon: '📊' }, 
  { id: 'shopping', label: 'Покупки', icon: '🛒' }
];

const TABS_CONFIG = [
    { id: 'overview', label: 'Обзор (Главная)', icon: '🏠' },
    { id: 'budget', label: 'Бюджет', icon: '💸' },
    { id: 'plans', label: 'Планы', icon: '📅' },
    { id: 'shopping', label: 'Покупки', icon: '🛒' },
    { id: 'services', label: 'Сервисы', icon: '🧰' }
];

const SERVICES_CONFIG = [
    { id: 'wallet', label: 'Wallet', icon: '💳' },
    { id: 'subs', label: 'Подписки', icon: '🔄' },
    { id: 'debts', label: 'Долги', icon: '📉' },
    { id: 'pantry', label: 'Кладовка', icon: '📦' },
    { id: 'meters', label: 'Счетчики', icon: '⚡' },
    { id: 'chat', label: 'AI Советник', icon: '🤖' },
];

const PRESET_COLORS = [ '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#FF3B30', '#5856D6', '#00C7BE', '#8E8E93', '#BF5AF2' ];
const PRESET_ICONS = [ 'Utensils', 'Car', 'Home', 'ShoppingBag', 'Heart', 'Zap', 'Plane', 'Briefcase', 'PiggyBank', 'Coffee', 'Tv', 'MoreHorizontal' ];

type SectionType = 'general' | 'budget' | 'members' | 'categories' | 'widgets' | 'navigation' | 'services' | 'telegram' | 'advanced' | 'family';

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate, onReset, savingsRate, setSavingsRate, members, onUpdateMembers, categories, onUpdateCategories, learnedRules, onUpdateRules, onEnablePin, onDisablePin, currentFamilyId, onJoinFamily, onLogout, installPrompt }) => {
  const [activeSection, setActiveSection] = useState<SectionType>('general');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState(PRESET_COLORS[0]);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({ keyword: '', cleanName: '' });
  const [newCategory, setNewCategory] = useState({ label: '', icon: PRESET_ICONS[0], color: PRESET_COLORS[5] });
  const [targetFamilyId, setTargetFamilyId] = useState('');
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  
  // Drag State
  const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | null>(null);

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  const handleDragStart = (index: number) => {
      setDraggedWidgetIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedWidgetIndex === null || draggedWidgetIndex === index) return;
      
      const items = [...settings.enabledWidgets];
      const draggedItem = items[draggedWidgetIndex];
      items.splice(draggedWidgetIndex, 1);
      items.splice(index, 0, draggedItem);
      
      handleChange('enabledWidgets', items);
      setDraggedWidgetIndex(index);
  };

  const handleDragEnd = () => {
      setDraggedWidgetIndex(null);
  };

  const toggleArrayItem = (key: 'enabledWidgets' | 'enabledTabs' | 'enabledServices', id: string) => {
    const current = settings[key] || [];
    if (key === 'enabledTabs' && id === 'overview') return;
    const next = current.includes(id) ? current.filter(w => w !== id) : [...current, id];
    handleChange(key, next);
  };

  // ... (rest of CRUD handlers same as before) ...
  const handleAddCategory = () => { if (!newCategory.label.trim()) return; const newCat: Category = { ...newCategory, id: newCategory.label.toLowerCase().replace(/\s/g, '_'), isCustom: true }; onUpdateCategories([...categories, newCat]); setNewCategory({ label: '', icon: PRESET_ICONS[0], color: PRESET_COLORS[5] }); };
  const handleDeleteCategory = (id: string) => { onUpdateCategories(categories.filter(c => c.id !== id)); onUpdateRules(learnedRules.filter(r => r.categoryId !== id)); };
  const handleAddRule = (categoryId: string) => { if (!newRule.keyword.trim() || !newRule.cleanName.trim()) return; const rule: LearnedRule = { id: Date.now().toString(), categoryId, ...newRule }; onUpdateRules([...learnedRules, rule]); setNewRule({ keyword: '', cleanName: '' }); };
  const handleDeleteRule = (id: string) => onUpdateRules(learnedRules.filter(r => r.id !== id));
  const handleAddMember = () => { if (!newMemberName.trim()) return; const newMember: FamilyMember = { id: Math.random().toString(36).substr(2, 9), name: newMemberName.trim(), color: newMemberColor }; onUpdateMembers([...members, newMember]); setNewMemberName(''); setNewMemberColor(PRESET_COLORS[0]); };
  const handleUpdateMember = (id: string, updates: Partial<FamilyMember>) => { onUpdateMembers(members.map(m => m.id === id ? { ...m, ...updates } : m)); };
  const handleDeleteMember = (id: string) => { if (members.length <= 1) { alert("Должен остаться хотя бы один участник"); return; } onUpdateMembers(members.filter(m => m.id !== id)); };
  const handleAddMandatoryExpense = () => { if (!newExpenseName.trim() || !newExpenseAmount) return; const newExpense: MandatoryExpense = { id: Date.now().toString(), name: newExpenseName.trim(), amount: parseFloat(newExpenseAmount) }; const currentExpenses = settings.mandatoryExpenses || []; handleChange('mandatoryExpenses', [...currentExpenses, newExpense]); setNewExpenseName(''); setNewExpenseAmount(''); };
  const handleDeleteMandatoryExpense = (id: string) => { const currentExpenses = settings.mandatoryExpenses || []; handleChange('mandatoryExpenses', currentExpenses.filter(e => e.id !== id)); };
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert("ID скопирован в буфер обмена"); };
  const shareInviteLink = async () => { if (!currentFamilyId) return; const link = `${window.location.origin}/?join=${currentFamilyId}`; if (navigator.share) { try { await navigator.share({ title: `Присоединяйся к семейному бюджету ${settings.familyName}`, text: `Перейди по ссылке, чтобы вести бюджет вместе!`, url: link, }); } catch (err) { console.error('Error sharing', err); } } else { copyToClipboard(link); alert("Ссылка-приглашение скопирована!"); } };
  const handleAlfaMappingChange = (key: keyof AppSettings['alfaMapping'], value: string) => { onUpdate({ ...settings, alfaMapping: { ...settings.alfaMapping, [key]: value } }); };
  const handleInstallApp = async () => { if (!installPrompt) return; installPrompt.prompt(); };

  const SECTIONS: { id: SectionType, label: string, icon: React.ReactNode }[] = [
      { id: 'general', label: 'Общие', icon: <Globe size={18} className="text-blue-500" /> },
      { id: 'budget', label: 'Бюджет и Лимиты', icon: <Calculator size={18} className="text-green-600" /> },
      { id: 'widgets', label: 'Конструктор Виджетов', icon: <LayoutGrid size={18} className="text-pink-500" /> },
      { id: 'family', label: 'Семейный доступ', icon: <Users size={18} className="text-purple-600" /> },
      { id: 'navigation', label: 'Навигация', icon: <Wallet size={18} className="text-green-500" /> },
      { id: 'services', label: 'Сервисы', icon: <Grip size={18} className="text-indigo-500" /> },
      { id: 'members', label: 'Участники', icon: <User size={18} className="text-purple-500" /> },
      { id: 'categories', label: 'Категории и Правила', icon: <Tag size={18} className="text-orange-500" /> },
      { id: 'telegram', label: 'Telegram', icon: <Smartphone size={18} className="text-blue-400" /> },
      { id: 'advanced', label: 'Импорт и Прочее', icon: <FileJson size={18} className="text-gray-500" /> },
  ];

  const renderContent = () => {
    switch (activeSection) {
        case 'widgets': return (
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-[#1C1C1E]">Порядок виджетов</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Перетащите для изменения</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        {settings.enabledWidgets.map((widgetId, index) => {
                            const widget = DASHBOARD_WIDGETS.find(w => w.id === widgetId);
                            if (!widget) return null;
                            const isBalance = widgetId === 'balance';
                            
                            return (
                                <div 
                                    key={widgetId}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`
                                        relative group cursor-grab active:cursor-grabbing p-4 rounded-2xl border shadow-sm transition-all flex flex-col items-center justify-center gap-2
                                        ${isBalance ? 'col-span-2 bg-blue-50 border-blue-200' : 'col-span-1 bg-white border-white'}
                                        ${draggedWidgetIndex === index ? 'opacity-50 scale-95' : ''}
                                    `}
                                >
                                    <div className="absolute top-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <GripVertical size={16} />
                                    </div>
                                    <span className="text-2xl">{widget.icon}</span>
                                    <span className="text-xs font-bold text-[#1C1C1E]">{widget.label}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleArrayItem('enabledWidgets', widgetId); }}
                                        className="absolute top-[-8px] left-[-8px] bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            );
                        })}
                        {settings.enabledWidgets.length === 0 && (
                            <div className="col-span-full py-8 text-center text-gray-400 font-bold text-xs uppercase">
                                Виджетов нет. Добавьте их снизу.
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Доступные виджеты</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {DASHBOARD_WIDGETS.filter(w => !settings.enabledWidgets.includes(w.id)).map(widget => (
                            <button 
                                key={widget.id}
                                onClick={() => toggleArrayItem('enabledWidgets', widget.id)}
                                className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-left"
                            >
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-lg">
                                    {widget.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-bold text-[#1C1C1E] block">{widget.label}</span>
                                    <span className="text-[9px] font-bold text-green-500 uppercase">Добавить +</span>
                                </div>
                            </button>
                        ))}
                        {DASHBOARD_WIDGETS.every(w => settings.enabledWidgets.includes(w.id)) && (
                            <div className="col-span-full text-center py-4 text-gray-300 font-bold text-xs">Все виджеты активны</div>
                        )}
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
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Название семьи</label><input type="text" value={settings.familyName} onChange={(e) => handleChange('familyName', e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Валюта</label><input type="text" value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none" /></div>
                  <div className="flex items-center justify-between p-2"><div className="flex items-center gap-3"><Shield size={20} className="text-gray-400" /><span className="font-bold text-sm">Приватный режим</span></div><button onClick={() => handleChange('privacyMode', !settings.privacyMode)} className={`transition-colors ${settings.privacyMode ? 'text-blue-500' : 'text-gray-300'}`}>{settings.privacyMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}</button></div>
                  <div className="flex items-center justify-between p-2 border-t border-gray-50 pt-4"><div className="flex items-center gap-3"><Lock size={20} className="text-gray-400" /><span className="font-bold text-sm">Вход по PIN-коду</span></div><button onClick={() => { if (settings.isPinEnabled) { onDisablePin?.(); } else { onEnablePin?.(); } }} className={`transition-colors ${settings.isPinEnabled ? 'text-green-500' : 'text-gray-300'}`}>{settings.isPinEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}</button></div>
                </div>
            </div>
        );
        case 'budget': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Расчет бюджета</h3>
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Начальный баланс</label><div className="flex gap-2"><div className="flex-1 space-y-1"><input type="number" value={settings.initialBalance} onChange={e => handleChange('initialBalance', Number(e.target.value))} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none" placeholder="Сумма" /><div className="text-[9px] font-black text-gray-300 uppercase text-center">Сумма</div></div><div className="flex-1 space-y-1"><input type="date" value={settings.initialBalanceDate || ''} onChange={e => handleChange('initialBalanceDate', e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none" /><div className="text-[9px] font-black text-gray-300 uppercase text-center">Дата старта</div></div></div></div>
                    <div className="flex gap-4"><div className="flex-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Число начала месяца</label><input type="number" min="1" max="31" value={settings.startOfMonthDay} onChange={(e) => handleChange('startOfMonthDay', Number(e.target.value))} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none text-center" /></div><div className="flex-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Дни Зарплаты</label><input type="text" placeholder="10, 25" value={settings.salaryDates?.join(', ') || ''} onChange={(e) => { const val = e.target.value; const dates = val.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n <= 31); handleChange('salaryDates', dates); }} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none text-center" /></div></div>
                    <div className="space-y-2"><div className="flex justify-between items-center px-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Процент в копилку</label><span className="text-sm font-black text-blue-500">{savingsRate}%</span></div><input type="range" min="0" max="50" step="1" value={savingsRate} onChange={(e) => setSavingsRate(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500" /><p className="text-[9px] text-gray-400 px-2">Этот % вычитается из баланса при расчете доступного лимита.</p></div>
                </div>
                <div className="bg-white p-6 rounded-3xl space-y-4 border border-gray-100 shadow-sm"><h3 className="text-lg font-black text-[#1C1C1E] mb-2 flex items-center gap-2"><DollarSign size={20} className="text-red-500"/> Обязательные расходы</h3><p className="text-xs text-gray-400 leading-tight">Укажите ежемесячные платежи. Они будут вычитаться из лимита.</p><div className="space-y-2">{(settings.mandatoryExpenses || []).map((exp) => (<div key={exp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100"><span className="font-bold text-sm text-[#1C1C1E] pl-2">{exp.name}</span><div className="flex items-center gap-3"><span className="font-black text-sm">{exp.amount.toLocaleString()} {settings.currency}</span><button onClick={() => handleDeleteMandatoryExpense(exp.id)} className="text-gray-400 hover:text-red-500"><X size={16}/></button></div></div>))}</div><div className="flex gap-2 pt-2 border-t border-gray-50"><input type="text" placeholder="Название..." value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} className="flex-1 bg-gray-50 px-4 py-3 rounded-xl text-xs font-bold outline-none"/><input type="number" placeholder="Сумма" value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value)} className="w-24 bg-gray-50 px-4 py-3 rounded-xl text-xs font-bold outline-none"/><button onClick={handleAddMandatoryExpense} className="bg-black text-white p-3 rounded-xl flex items-center justify-center shadow-lg"><Plus size={18}/></button></div></div>
            </div>
        );
        case 'family': return (
            <div className="space-y-6"><div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm"><h3 className="text-lg font-black text-[#1C1C1E] mb-2">Приглашения</h3><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Пригласить в семью</label><div className="flex gap-2"><div className="flex-1 bg-gray-50 p-4 rounded-2xl font-mono text-xs text-[#1C1C1E] break-all border border-gray-100 flex items-center">{currentFamilyId}</div><button onClick={shareInviteLink} className="p-4 bg-blue-500 text-white hover:bg-blue-600 rounded-2xl transition-colors shadow-lg shadow-blue-500/20"><Share size={18} /></button><button onClick={() => currentFamilyId && copyToClipboard(currentFamilyId)} className="p-4 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors text-gray-500"><Copy size={18} /></button></div><p className="text-[10px] text-gray-400 px-2 leading-tight">Отправьте ссылку или ID члену семьи.</p></div><div className="border-t border-gray-50 pt-4 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Присоединиться к другой семье</label><input type="text" placeholder="Вставьте ID семьи..." value={targetFamilyId} onChange={(e) => setTargetFamilyId(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-xs outline-none" /><button onClick={() => onJoinFamily(targetFamilyId)} disabled={!targetFamilyId || targetFamilyId === currentFamilyId} className="w-full bg-pink-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-pink-500/20 disabled:opacity-50 disabled:shadow-none">Присоединиться</button></div></div></div>
        );
        case 'navigation': return (
             <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 space-y-1">{TABS_CONFIG.map(tab => (<button key={tab.id} onClick={() => toggleArrayItem('enabledTabs', tab.id)} className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors ${tab.id === 'overview' ? 'opacity-50 cursor-not-allowed' : ''}`}><div className="flex items-center gap-4"><span className="text-xl">{tab.icon}</span><span className="text-sm font-bold">{tab.label}</span></div>{settings.enabledTabs.includes(tab.id) ? <CheckCircle2 size={24} className="text-blue-500 fill-blue-500/10" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-100" />}</button>))}</div>
        );
        case 'services': return (
             <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 space-y-1">{SERVICES_CONFIG.map(srv => (<button key={srv.id} onClick={() => toggleArrayItem('enabledServices', srv.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors"><div className="flex items-center gap-4"><span className="text-xl">{srv.icon}</span><span className="text-sm font-bold">{srv.label}</span></div>{settings.enabledServices.includes(srv.id) ? <CheckCircle2 size={24} className="text-blue-500 fill-blue-500/10" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-100" />}</button>))}</div>
        );
        case 'members': return (
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-2">{members.map(member => (<div key={member.id} className="p-3 flex items-center gap-3 hover:bg-gray-50 rounded-2xl transition-all"><MemberMarker member={member} size="sm" /><div className="flex-1">{editingMemberId === member.id ? (<div className="flex flex-col gap-2"><input type="text" value={member.name} onChange={(e) => handleUpdateMember(member.id, { name: e.target.value })} className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-bold outline-none border border-blue-500 text-[#1C1C1E]" /><div className="flex flex-wrap gap-2 mt-1">{PRESET_COLORS.map(c => (<button key={c} onClick={() => handleUpdateMember(member.id, { color: c })} className={`w-5 h-5 rounded-full border-2 ${member.color === c ? 'border-[#1C1C1E]' : 'border-white'}`} style={{ backgroundColor: c }} />))}</div></div>) : (<span className="font-bold text-sm">{member.name}</span>)}</div><div className="flex gap-2"><button onClick={() => setEditingMemberId(editingMemberId === member.id ? null : member.id)} className="p-2 text-blue-500 bg-blue-50 rounded-xl ios-btn-active">{editingMemberId === member.id ? <Check size={18}/> : <Edit2 size={18} />}</button><button onClick={() => handleDeleteMember(member.id)} className="p-2 text-red-500 bg-red-50 rounded-xl ios-btn-active"><Trash2 size={18} /></button></div></div>))}<div className="p-3 border-t border-gray-50 space-y-3 mt-2"><div className="flex gap-2"><div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: newMemberColor }} /><input type="text" placeholder="Имя..." value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="flex-1 bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold outline-none text-[#1C1C1E]"/><button onClick={handleAddMember} className="p-2.5 bg-blue-500 text-white rounded-xl ios-btn-active shadow-lg shadow-blue-500/20"><Plus size={20} /></button></div><div className="flex flex-wrap gap-2 px-1">{PRESET_COLORS.map(c => (<button key={c} onClick={() => setNewMemberColor(c)} className={`w-6 h-6 rounded-full border-2 ${newMemberColor === c ? 'border-blue-500' : 'border-white shadow-sm'}`} style={{ backgroundColor: c }} />))}</div></div></div>
        );
        case 'categories': return (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 space-y-2">{categories.map(cat => {const isExpanded = expandedCatId === cat.id; const rules = learnedRules.filter(r => r.categoryId === cat.id); return (<div key={cat.id} className={`p-2 rounded-2xl ${isExpanded ? 'bg-gray-50' : ''}`}><div className="flex items-center gap-4 cursor-pointer p-2" onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}><div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{backgroundColor: cat.color}}>{getIconById(cat.icon, 20)}</div><span className="flex-1 font-bold text-sm">{cat.label}</span>{cat.isCustom && <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="p-2 text-red-500"><Trash2 size={16}/></button>}<ChevronDown size={20} className={`transition-transform text-gray-300 ${isExpanded ? 'rotate-180' : ''}`} /></div><AnimatePresence>{isExpanded && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="p-4 mt-2 border-t border-gray-200 space-y-4">{rules.map(rule => (<div key={rule.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100"><Sparkles size={16} className="text-yellow-500"/><div className="flex-1 text-xs"><span className="font-bold">"{rule.keyword}"</span> → <span className="font-bold text-blue-500">"{rule.cleanName}"</span></div><button onClick={() => handleDeleteRule(rule.id)} className="text-gray-300 hover:text-red-500"><X size={14}/></button></div>))}<div className="bg-white p-4 rounded-2xl border border-dashed border-gray-200 space-y-3"><p className="text-[10px] font-black uppercase text-gray-400">Добавить правило</p><input type="text" value={newRule.keyword} onChange={(e) => setNewRule({...newRule, keyword: e.target.value})} placeholder="Ключевое слово..." className="w-full bg-gray-50 px-3 py-2 text-xs rounded-lg font-bold outline-none"/><input type="text" value={newRule.cleanName} onChange={(e) => setNewRule({...newRule, cleanName: e.target.value})} placeholder="Назвать как..." className="w-full bg-gray-50 px-3 py-2 text-xs rounded-lg font-bold outline-none"/><button onClick={() => handleAddRule(cat.id)} className="w-full bg-blue-50 text-blue-500 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-100 transition-colors">Сохранить</button></div></div></motion.div>)}</AnimatePresence></div>);})}<div className="p-4 border-t border-gray-100 space-y-4"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Новая категория</h4><div className="flex gap-2"><div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white" style={{backgroundColor: newCategory.color}}>{getIconById(newCategory.icon, 20)}</div><input type="text" value={newCategory.label} onChange={e => setNewCategory({...newCategory, label: e.target.value})} placeholder="Название..." className="flex-1 bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold outline-none"/><button onClick={handleAddCategory} className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center"><Plus size={20}/></button></div><div className="flex flex-wrap gap-2">{PRESET_ICONS.map(i => (<button key={i} onClick={() => setNewCategory({...newCategory, icon: i})} className={`w-8 h-8 rounded-lg flex items-center justify-center ${newCategory.icon === i ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{getIconById(i, 16)}</button>))}</div><div className="flex flex-wrap gap-2">{PRESET_COLORS.map(c => (<button key={c} onClick={() => setNewCategory({...newCategory, color: c})} className={`w-6 h-6 rounded-full border-2 ${newCategory.color === c ? 'border-blue-500' : 'border-white shadow-sm'}`} style={{backgroundColor: c}} />))}</div></div></div>
        );
        case 'telegram': return (
            <div className="bg-white p-6 rounded-3xl space-y-6 border border-gray-100 shadow-sm">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Bot Token</label>
                        <input type="text" value={settings.telegramBotToken} onChange={(e) => handleChange('telegramBotToken', e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none text-xs" placeholder="123456:ABC-DEF..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Chat ID</label>
                        <input type="text" value={settings.telegramChatId} onChange={(e) => handleChange('telegramChatId', e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none text-xs" placeholder="-100..." />
                    </div>
                    <div className="flex items-center justify-between p-2">
                        <span className="font-bold text-sm">Авто-отправка событий</span>
                        <button onClick={() => handleChange('autoSendEventsToTelegram', !settings.autoSendEventsToTelegram)} className={`transition-colors ${settings.autoSendEventsToTelegram ? 'text-blue-500' : 'text-gray-300'}`}>
                            {settings.autoSendEventsToTelegram ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6 space-y-6">
                    <h3 className="font-black text-sm text-[#1C1C1E]">Шаблоны сообщений</h3>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Событие</label>
                        <textarea 
                            value={settings.eventTemplate || '📅 *{{title}}*\n🗓 {{date}} {{time}}\n📝 {{description}}'} 
                            onChange={(e) => handleChange('eventTemplate', e.target.value)}
                            className="w-full bg-gray-50 p-4 rounded-2xl font-mono text-xs text-[#1C1C1E] outline-none h-24 resize-none leading-relaxed"
                            placeholder="Шаблон события..."
                        />
                        <p className="text-[9px] text-gray-400 px-2">Переменные: {'{{title}}, {{date}}, {{time}}, {{description}}'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Список покупок</label>
                        <textarea 
                            value={settings.shoppingTemplate || '🛒 *Список покупок:*\n\n{{items}}'} 
                            onChange={(e) => handleChange('shoppingTemplate', e.target.value)}
                            className="w-full bg-gray-50 p-4 rounded-2xl font-mono text-xs text-[#1C1C1E] outline-none h-24 resize-none leading-relaxed"
                            placeholder="Шаблон покупок..."
                        />
                        <p className="text-[9px] text-gray-400 px-2">Переменные: {'{{items}}'}</p>
                    </div>
                </div>
            </div>
        );
        case 'advanced': return (
            <div className="space-y-6"><div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-400">Начало дня</label><input type="number" value={settings.dayStartHour} onChange={e => handleChange('dayStartHour', Number(e.target.value))} className="w-full bg-gray-50 p-3 rounded-xl font-bold" /></div><div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-400">Конец дня</label><input type="number" value={settings.dayEndHour} onChange={e => handleChange('dayEndHour', Number(e.target.value))} className="w-full bg-gray-50 p-3 rounded-xl font-bold" /></div></div><div className="border-t border-gray-50 pt-4 space-y-3"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Маппинг CSV/Excel</h4><div className="grid grid-cols-2 gap-3"><input type="text" value={settings.alfaMapping.date} onChange={e => handleAlfaMappingChange('date', e.target.value)} placeholder="Колонка даты" className="bg-gray-50 p-3 rounded-xl text-xs font-bold" /><input type="text" value={settings.alfaMapping.amount} onChange={e => handleAlfaMappingChange('amount', e.target.value)} placeholder="Колонка суммы" className="bg-gray-50 p-3 rounded-xl text-xs font-bold" /><input type="text" value={settings.alfaMapping.category} onChange={e => handleAlfaMappingChange('category', e.target.value)} placeholder="Колонка категории" className="bg-gray-50 p-3 rounded-xl text-xs font-bold" /><input type="text" value={settings.alfaMapping.note} onChange={e => handleAlfaMappingChange('note', e.target.value)} placeholder="Колонка описания" className="bg-gray-50 p-3 rounded-xl text-xs font-bold" /></div></div></div><div className="pt-4"><button onClick={onReset} className="w-full p-4 flex items-center justify-center gap-2 text-red-500 bg-red-50 rounded-2xl border border-red-100 hover:bg-red-100 transition-colors"><Trash2 size={18} /><span className="font-black uppercase text-xs tracking-widest">Сбросить всё</span></button></div></div>
        );
        default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" />
      <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-[#F8F9FB] w-full max-w-5xl md:h-[85vh] h-[95vh] rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-72 bg-white border-r border-gray-100 flex flex-col h-full flex-shrink-0">
           <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-50 md:border-none"><h2 className="text-2xl font-black text-[#1C1C1E] tracking-tight">Настройки</h2><button onClick={onClose} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500 md:hidden"><X size={20} /></button></div>
           <div className="hidden md:flex flex-col flex-1 p-4 space-y-1 overflow-y-auto">{SECTIONS.map(section => (<button key={section.id} onClick={() => setActiveSection(section.id)} className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all text-left ${activeSection === section.id ? 'bg-gray-100 font-bold text-[#1C1C1E]' : 'text-gray-500 hover:bg-gray-50'}`}>{section.icon}<span className="text-sm">{section.label}</span>{activeSection === section.id && <ChevronRight size={16} className="ml-auto text-gray-400" />}</button>))}<div className="mt-auto pt-4 border-t border-gray-100"><button onClick={onLogout} className="w-full p-4 rounded-2xl flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors"><LogOut size={18} /><span className="text-sm font-bold">Выйти из аккаунта</span></button></div></div>
           <div className="md:hidden overflow-y-auto flex-1 p-4 space-y-2">{SECTIONS.map(section => (<div key={section.id}><button onClick={() => setActiveSection(activeSection === section.id ? null : section.id) as any} className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${activeSection === section.id ? 'bg-white shadow-sm' : 'bg-white/50'}`}><div className="flex items-center gap-3">{section.icon}<span className="font-bold text-sm text-[#1C1C1E]">{section.label}</span></div><ChevronDown size={20} className={`text-gray-400 transition-transform ${activeSection === section.id ? 'rotate-180' : ''}`} /></button><AnimatePresence>{activeSection === section.id && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="pt-2 pb-4">{renderContent()}</div></motion.div>)}</AnimatePresence></div>))}<div className="pt-4 mt-4 border-t border-gray-200"><button onClick={onLogout} className="w-full p-4 rounded-2xl flex items-center justify-center gap-3 text-red-500 bg-red-50 hover:bg-red-100 transition-colors"><LogOut size={18} /><span className="text-sm font-bold">Выйти из аккаунта</span></button></div></div>
        </div>
        <div className="hidden md:flex flex-1 flex-col h-full overflow-hidden bg-[#F8F9FB]">
            <div className="p-8 flex items-center justify-between border-b border-gray-200/50 bg-white/50 backdrop-blur-sm sticky top-0 z-10"><h3 className="text-xl font-bold text-gray-500 flex items-center gap-2">{SECTIONS.find(s => s.id === activeSection)?.icon}{SECTIONS.find(s => s.id === activeSection)?.label}</h3><button onClick={onClose} className="p-2.5 bg-white hover:bg-gray-100 rounded-full transition-colors text-gray-400 shadow-sm border border-gray-100"><X size={20} /></button></div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar"><div className="max-w-2xl mx-auto">{renderContent()}</div></div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;
