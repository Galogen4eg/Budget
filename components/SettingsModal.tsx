
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Trash2, Globe, LayoutGrid, Users, Share, ChevronRight, Calculator, 
  Menu, AppWindow, ArrowLeft, EyeOff, Moon, Sun, BrainCircuit, RefreshCcw, TrendingUp, Wallet, Gift, Calendar, ShoppingBag, Lock, Tag, MessageSquareQuote, LogOut, Copy, Bot, Send, BellRing, Files, Zap, GripVertical, Smartphone, Search, AlertCircle
} from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, Transaction, WidgetConfig } from '../types';
import { MemberMarker } from '../constants';
import { auth } from '../firebase';
import { useData } from '../contexts/DataContext';
import { createInvitation, joinFamily, migrateFamilyData, saveSettings } from '../utils/db';
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
  { id: 'month_chart', label: 'График расходов' },
  { id: 'recent_transactions', label: 'История операций' },
  { id: 'category_analysis', label: 'Анализ категорий' },
  { id: 'shopping', label: 'Список покупок' },
  { id: 'goals', label: 'Цели и копилка' }, 
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
    { id: 'chat', label: 'AI Советник', desc: 'Финансовый помощник', icon: <Bot size={20}/> },
    { id: 'pantry', label: 'Кладовка', desc: 'Учет продуктов', icon: <LayoutGrid size={20}/> },
    { id: 'debts', label: 'Долги', desc: 'Кредиты и займы', icon: <Calculator size={20}/> },
    { id: 'projects', label: 'Проекты', desc: 'Временные бюджеты', icon: <Files size={20}/> },
    { id: 'forecast', label: 'Прогноз', desc: 'Simulator', icon: <TrendingUp size={20}/> }
];

type SectionType = 'general' | 'budget' | 'members' | 'categories' | 'widgets' | 'navigation' | 'services' | 'telegram' | 'family' | 'ai_memory' | 'tools';

const SECTIONS: { id: SectionType; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Общее', icon: <Globe size={20} /> },
  { id: 'budget', label: 'Бюджет', icon: <Calculator size={20} /> },
  { id: 'members', label: 'Участники', icon: <Users size={20} /> },
  { id: 'categories', label: 'Категории и правила', icon: <Tag size={20} /> },
  { id: 'tools', label: 'Инструменты', icon: <Zap size={20} /> },
  { id: 'ai_memory', label: 'Память AI', icon: <BrainCircuit size={20} /> },
  { id: 'navigation', label: 'Навигация', icon: <Menu size={20} /> },
  { id: 'services', label: 'Сервисы', icon: <AppWindow size={20} /> },
  { id: 'widgets', label: 'Виджеты', icon: <LayoutGrid size={20} /> },
  { id: 'telegram', label: 'Telegram и шаблоны', icon: <MessageSquareQuote size={20} /> },
  { id: 'family', label: 'Семья и Доступ', icon: <Share size={20} /> },
];

const PRESET_COLORS = [ '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#FF3B30', '#5856D6', '#00C7BE', '#8E8E93', '#BF5AF2', '#1C1C1E' ];

const Switch = ({ checked, onChange }: { checked: boolean, onChange: (e: any) => void }) => (
    <button onClick={onChange} className={`w-11 h-6 rounded-full p-1 transition-colors relative ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const TemplateEditor = ({ label, value, onChange, variables }: { label: string, value: string, onChange: (val: string) => void, variables: string[] }) => (
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
                    <button key={v} onClick={() => onChange((value || '') + ` ${v}`)} className="bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 px-2 py-1.5 rounded-lg text-[10px] font-bold text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                        {v}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    settings, onClose, onUpdate, onReset, savingsRate, setSavingsRate, 
    members, onUpdateMembers, categories, onUpdateCategories, onDeleteCategory, 
    learnedRules, onUpdateRules, currentFamilyId, onJoinFamily, onLogout,
    transactions, onUpdateTransactions, onOpenDuplicates, installPrompt, onDeleteTransactionsByPeriod
}) => {
  const [activeSection, setActiveSection] = useState<SectionType>('general');
  const [showMobileMenu, setShowMobileMenu] = useState(window.innerWidth < 768);
  const { aiKnowledge, deleteAIKnowledge, addAIKnowledge } = useData();
  const [newFact, setNewFact] = useState('');

  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [tempMemberName, setTempMemberName] = useState('');
  const [tempMemberEmail, setTempMemberEmail] = useState('');
  const [tempMemberColor, setTempMemberColor] = useState(PRESET_COLORS[0]);

  const [newFamilyId, setNewFamilyId] = useState(currentFamilyId || '');
  const [isJoining, setIsJoining] = useState(false);
  const [shouldMigrate, setShouldMigrate] = useState(false);

  // Tools state
  const [massDeleteStart, setMassDeleteStart] = useState('');
  const [massDeleteEnd, setMassDeleteEnd] = useState('');

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

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

  const toggleSalaryDate = (day: number) => {
      const dates = settings.salaryDates || [];
      const updated = dates.includes(day) ? dates.filter(d => d !== day) : [...dates, day].sort((a,b) => a-b);
      handleChange('salaryDates', updated);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') toast.success('Приложение устанавливается!');
  };

  const handleSaveMember = async () => {
      if (!tempMemberName.trim()) return;
      const email = tempMemberEmail.trim().toLowerCase();
      if (editingMember) {
          const updated = members.map(m => m.id === editingMember.id ? { ...m, name: tempMemberName, color: tempMemberColor, email: email || undefined } : m);
          onUpdateMembers(updated);
          if (currentFamilyId && email && email !== editingMember.email && !editingMember.userId) {
              await createInvitation(currentFamilyId, email, editingMember.id);
          }
      } else {
          const newMemberId = Math.random().toString(36).substr(2, 9);
          onUpdateMembers([...members, { id: newMemberId, name: tempMemberName, color: tempMemberColor, email: email || undefined, isAdmin: false, avatar: '', userId: '' }]);
          if (currentFamilyId && email) await createInvitation(currentFamilyId, email, newMemberId);
      }
      setIsMemberModalOpen(false);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
        case 'tools': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-500"><Search size={24} /></div>
                        <div><h3 className="text-lg font-bold">Дубликаты</h3><p className="text-[10px] text-gray-400">Поиск похожих операций</p></div>
                    </div>
                    <button onClick={onOpenDuplicates} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                        Найти дубликаты
                    </button>
                </div>

                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-500"><Trash2 size={24} /></div>
                        <div><h3 className="text-lg font-bold">Массовое удаление</h3><p className="text-[10px] text-gray-400">Очистка истории за период</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl">
                            <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">С</label>
                            <input type="date" value={massDeleteStart} onChange={e => setMassDeleteStart(e.target.value)} className="bg-transparent text-xs font-bold w-full outline-none" />
                        </div>
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl">
                            <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">По</label>
                            <input type="date" value={massDeleteEnd} onChange={e => setMassDeleteEnd(e.target.value)} className="bg-transparent text-xs font-bold w-full outline-none" />
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if (!massDeleteStart || !massDeleteEnd) return toast.error('Выберите даты');
                            if (confirm(`Удалить все операции с ${massDeleteStart} по ${massDeleteEnd}? Это действие необратимо.`)) {
                                onDeleteTransactionsByPeriod?.(massDeleteStart, massDeleteEnd);
                            }
                        }}
                        className="w-full bg-red-50 dark:bg-red-900/20 text-red-500 py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                    >
                        Очистить историю
                    </button>
                </div>
            </div>
        );
        case 'ai_memory': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-pink-50 dark:bg-pink-900/30 rounded-xl text-pink-500"><BrainCircuit size={24} /></div><div><h3 className="text-lg font-bold">Память AI</h3><p className="text-[10px] text-gray-400">То, чему вы научили ассистента</p></div></div>
                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl mb-4 border border-gray-100 dark:border-white/5">
                        <input type="text" placeholder="Добавить факт" value={newFact} onChange={e => setNewFact(e.target.value)} className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl text-sm font-bold outline-none mb-2" />
                        <button onClick={() => { if(newFact.trim()) { addAIKnowledge(newFact.trim()); setNewFact(''); } }} className="w-full py-2 bg-[#1C1C1E] dark:bg-white text-white dark:text-black font-black uppercase text-xs rounded-xl">Запомнить</button>
                    </div>
                    <div className="space-y-2">{aiKnowledge.map(item => (<div key={item.id} className="flex items-start justify-between p-3 bg-white dark:bg-[#2C2C2E] rounded-xl border border-gray-50 dark:border-white/5"><span className="text-sm font-medium text-[#1C1C1E] dark:text-white">{item.text}</span><button onClick={() => deleteAIKnowledge(item.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16}/></button></div>))}</div>
                </div>
            </div>
        );
        case 'budget': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] space-y-6 border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold">Баланс и цели</h3>
                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl"><div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-gray-500">Копилка: {savingsRate}%</span></div><input type="range" min="0" max="50" step="1" value={savingsRate} onChange={e => setSavingsRate(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" /></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl">
                            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Начальный баланс</label>
                            <input type="number" step="0.01" value={settings.initialBalance || ''} onChange={e => handleChange('initialBalance', e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-full bg-transparent font-black text-xl outline-none" placeholder="0.00" />
                        </div>
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl">
                            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Дата начала</label>
                            <input type="date" value={settings.initialBalanceDate || ''} onChange={e => handleChange('initialBalanceDate', e.target.value)} className="w-full bg-transparent font-black text-sm outline-none" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] space-y-6 border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold">Распорядок дня</h3>
                    <p className="text-[10px] text-gray-400 -mt-4">Влияет на отображение в календаре планов</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl">
                            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Начало дня (ч)</label>
                            <input type="number" min="0" max="23" value={settings.dayStartHour ?? 8} onChange={e => handleChange('dayStartHour', parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl outline-none" />
                        </div>
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl">
                            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Конец дня (ч)</label>
                            <input type="number" min="1" max="24" value={settings.dayEndHour ?? 23} onChange={e => handleChange('dayEndHour', parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl outline-none" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] space-y-4 border border-gray-100 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold">Даты зарплаты</h3>
                    <p className="text-[10px] text-gray-400">Выберите дни месяца, когда приходит доход для расчета бюджета</p>
                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                            const isSelected = (settings.salaryDates || []).includes(day);
                            return (
                                <button 
                                    key={day} 
                                    onClick={() => toggleSalaryDate(day)}
                                    className={`aspect-square rounded-xl text-xs font-black transition-all ${isSelected ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-400 hover:bg-gray-100'}`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl flex gap-2 items-start">
                        <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">От выбранных дат зависит расчет "Свободно на день" в главном заголовке.</p>
                    </div>
                </div>
            </div>
        );
        case 'members': return (
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm h-full flex flex-col">
                <h3 className="text-lg font-bold mb-4">Участники (Общие)</h3>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">{members.map(member => (<div key={member.id} onClick={() => { setEditingMember(member); setTempMemberName(member.name); setTempMemberEmail(member.email || ''); setTempMemberColor(member.color); setIsMemberModalOpen(true); }} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl cursor-pointer"><div className="flex items-center gap-3"><MemberMarker member={member} size="md" /><div><div className="font-bold">{member.name}</div>{member.email && <div className="text-[10px] text-gray-400">{member.email}</div>}</div></div><ChevronRight size={20} className="text-gray-300" /></div>))}</div>
                <button onClick={() => { setEditingMember(null); setTempMemberName(''); setTempMemberEmail(''); setTempMemberColor(PRESET_COLORS[0]); setIsMemberModalOpen(true); }} className="w-full mt-4 bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">+ Участник</button>
            </div>
        );
        case 'categories': return (
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
        );
        case 'navigation': return (
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                <h3 className="text-lg font-bold mb-4">Меню навигации</h3>
                <p className="text-xs text-gray-400 -mt-2 mb-4">Выберите разделы, которые будут отображаться в нижнем меню</p>
                <div className="space-y-2">
                    {AVAILABLE_TABS.map(tab => (
                        <div key={tab.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-[#1C1C1E] rounded-xl text-gray-400">{tab.icon}</div>
                                <span className="font-bold text-sm">{tab.label}</span>
                            </div>
                            <Switch checked={(settings.enabledTabs || []).includes(tab.id)} onChange={() => toggleTab(tab.id)} />
                        </div>
                    ))}
                </div>
            </div>
        );
        case 'services': return (
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                <h3 className="text-lg font-bold mb-4">Активные сервисы</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AVAILABLE_SERVICES.map(service => (
                        <div key={service.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-[#1C1C1E] rounded-xl text-gray-400">{service.icon}</div>
                                <div>
                                    <div className="font-bold text-sm">{service.label}</div>
                                    <div className="text-[10px] text-gray-400">{service.desc}</div>
                                </div>
                            </div>
                            <Switch checked={(settings.enabledServices || []).includes(service.id)} onChange={() => toggleService(service.id)} />
                        </div>
                    ))}
                </div>
            </div>
        );
        case 'widgets': return (
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                <h3 className="text-lg font-bold mb-4">Виджеты на главном экране</h3>
                <div className="space-y-2">
                    {WIDGET_METADATA.map(meta => (
                        <div key={meta.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl">
                            <span className="font-bold text-sm">{meta.label}</span>
                            <Switch checked={(settings.widgets || []).find(w => w.id === meta.id)?.isVisible ?? true} onChange={() => toggleWidgetVisibility(meta.id)} />
                        </div>
                    ))}
                </div>
            </div>
        );
        case 'telegram': return (
            <div className="space-y-6 pb-20">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center gap-3"><div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-500"><Send size={24} /></div><h3 className="text-lg font-bold">Бот уведомлений</h3></div>
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl"><label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Bot Token</label><input type="password" value={settings.telegramBotToken || ''} onChange={e => handleChange('telegramBotToken', e.target.value)} className="w-full bg-transparent font-mono text-xs outline-none" placeholder="123456:ABC-..." /></div>
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl"><label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Chat ID</label><input type="text" value={settings.telegramChatId || ''} onChange={e => handleChange('telegramChatId', e.target.value)} className="w-full bg-transparent font-mono text-xs outline-none" placeholder="-100..." /></div>
                    </div>
                    <div className="flex items-center justify-between p-2"><span className="text-sm font-bold">Авто-отправка планов</span><Switch checked={settings.autoSendEventsToTelegram} onChange={() => handleChange('autoSendEventsToTelegram', !settings.autoSendEventsToTelegram)} /></div>
                </div>
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-500"><MessageSquareQuote size={24} /></div><h3 className="text-lg font-bold">Шаблоны сообщений</h3></div>
                    <TemplateEditor label="События в календаре" value={settings.eventTemplate || ''} onChange={val => handleChange('eventTemplate', val)} variables={['{title}', '{date}', '{time}', '{desc}', '{members}']} />
                    <TemplateEditor label="Список покупок" value={settings.shoppingTemplate || ''} onChange={val => handleChange('shoppingTemplate', val)} variables={['{items}', '{total}', '{date}']} />
                </div>
            </div>
        );
        case 'family': return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-500"><Users size={24} /></div><h3 className="text-lg font-bold">Доступ</h3></div>
                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 block">Family ID (Ваш текущий)</label>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-lg font-bold flex-1 truncate">{currentFamilyId}</span>
                            <button onClick={() => { navigator.clipboard.writeText(currentFamilyId || ''); toast.success('ID скопирован'); }} className="p-2 bg-white dark:bg-white/10 rounded-xl"><Copy size={18}/></button>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl space-y-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 block">Сменить семью</label>
                        <input type="text" value={newFamilyId} onChange={e => setNewFamilyId(e.target.value)} placeholder="Введите новый ID..." className="w-full bg-white dark:bg-[#1C1C1E] p-3 rounded-xl font-bold text-sm outline-none" />
                        <div className="flex items-center gap-2"><Switch checked={shouldMigrate} onChange={() => setShouldMigrate(!shouldMigrate)} /><span className="text-[10px] font-bold text-gray-500">Перенести текущие данные в новую семью</span></div>
                        <button onClick={async () => { if(!newFamilyId.trim()) return; setIsJoining(true); try { if(shouldMigrate && currentFamilyId) await migrateFamilyData(currentFamilyId, newFamilyId); onJoinFamily(newFamilyId); } finally { setIsJoining(false); } }} className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase" disabled={isJoining}>{isJoining ? 'Присоединение...' : 'Присоединиться'}</button>
                    </div>
                </div>
            </div>
        );
        case 'general': default: return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] space-y-5 border border-gray-100 dark:border-white/10 shadow-sm">
                <h3 className="text-lg font-bold">Личный интерфейс</h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-white dark:bg-white/10 shadow-sm text-gray-500 dark:text-white">{settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</div><span className="font-bold text-sm">Темная тема</span></div><Switch checked={settings.theme === 'dark'} onChange={() => handleChange('theme', settings.theme === 'dark' ? 'light' : 'dark')} /></div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-white dark:bg-white/10 shadow-sm text-gray-500 dark:text-white"><EyeOff size={20} /></div><span className="font-bold text-sm">Приватный режим</span></div><Switch checked={settings.privacyMode} onChange={() => handleChange('privacyMode', !settings.privacyMode)} /></div>
                
                {installPrompt && (
                    <button onClick={handleInstall} className="w-full flex items-center justify-between p-4 bg-blue-500 text-white rounded-2xl shadow-lg active:scale-95 transition-all">
                        <div className="flex items-center gap-3"><Smartphone size={20} /><span className="font-bold text-sm">Установить на телефон</span></div>
                        <ChevronRight size={20} />
                    </button>
                )}

                <div className="pt-4 border-t dark:border-white/5 space-y-3">
                    <button onClick={onReset} className="w-full flex items-center justify-center gap-2 p-4 text-orange-500 font-bold bg-orange-50 dark:bg-orange-500/10 rounded-2xl">
                        <RefreshCcw size={20} /> Сбросить настройки
                    </button>
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-4 text-red-500 font-bold bg-red-50 dark:bg-red-500/10 rounded-2xl">
                        <LogOut size={20} /> Выйти
                    </button>
                </div>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" />
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-7xl h-[85vh] md:rounded-[3rem] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border dark:border-white/10">
            <div className={`bg-white dark:bg-[#1C1C1E] border-r dark:border-white/10 flex-col shrink-0 overflow-y-auto no-scrollbar md:w-64 md:flex md:static ${showMobileMenu ? 'flex absolute inset-0 w-full z-20' : 'hidden'}`}>
                <div className="p-6 md:p-8 border-b dark:border-white/5 flex items-center justify-between md:justify-start gap-3"><span className="font-black text-xl">Настройки</span><button onClick={onClose} className="md:hidden w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><X size={20}/></button></div>
                <div className="flex-1 p-4 space-y-2">{SECTIONS.map(section => (<button key={section.id} onClick={() => { setActiveSection(section.id); setShowMobileMenu(false); }} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeSection === section.id && !showMobileMenu ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeSection === section.id ? 'bg-white/20' : 'bg-gray-50'}`}>{section.icon}</div><span className="font-bold text-sm flex-1 text-left">{section.label}</span></button>))}</div>
            </div>
            <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F2F2F7] dark:bg-black ${showMobileMenu ? 'hidden' : 'flex'}`}>
                <div className="p-4 md:p-6 border-b dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md flex justify-between items-center text-[#1C1C1E] dark:text-white"><div className="flex items-center gap-2"><button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 text-gray-500"><ArrowLeft size={24} /></button><h2 className="text-xl font-black">{SECTIONS.find(s => s.id === activeSection)?.label}</h2></div><button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center"><X size={20}/></button></div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 pb-24 md:pb-8">{renderSectionContent()}</div>
            </div>
        </motion.div>
        <AnimatePresence>{isMemberModalOpen && (
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6">
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsMemberModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
                <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="relative bg-white dark:bg-[#1C1C1E] p-8 rounded-[3rem] shadow-2xl max-w-sm w-full space-y-6">
                    <h3 className="text-xl font-black">{editingMember ? 'Изм. участника' : 'Новый участник'}</h3>
                    <input type="text" placeholder="Имя" value={tempMemberName} onChange={e => setTempMemberName(e.target.value)} className="w-full bg-gray-100 dark:bg-[#2C2C2E] p-4 rounded-2xl outline-none" />
                    <input type="email" placeholder="Email" value={tempMemberEmail} onChange={e => setTempMemberEmail(e.target.value)} className="w-full bg-gray-100 dark:bg-[#2C2C2E] p-4 rounded-2xl outline-none" />
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Цвет оформления</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map(c => (
                                <button key={c} onClick={() => setTempMemberColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${tempMemberColor === c ? 'border-[#1C1C1E] dark:border-white scale-110 shadow-md' : 'border-transparent opacity-60'}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                    <button onClick={handleSaveMember} className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-transform">Сохранить</button>
                </motion.div>
            </div>
        )}</AnimatePresence>
    </div>
  );
};

export default SettingsModal;
