
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
  ChevronUp, AlertOctagon, ShoppingBag, ShieldCheck
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
  onDeleteTransactionsByPeriod?: (year: number, month: number) => void;
}

const WIDGET_METADATA = [ 
  { id: 'balance', label: 'Баланс', icon: '💳' }, 
  { id: 'goals', label: 'Цели', icon: '🎯' }, 
  { id: 'charts', label: 'Структура', icon: '📊' }, 
  { id: 'month_chart', label: 'График месяца', icon: '📅' },
  { id: 'shopping', label: 'Покупки', icon: '🛒' },
  { id: 'recent_transactions', label: 'История', icon: '📜' },
];

type SectionType = 'general' | 'budget' | 'members' | 'categories' | 'widgets' | 'navigation' | 'services' | 'telegram' | 'family';

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
    { id: 'wallet', label: 'Кошелек', desc: 'Карты лояльности' },
    { id: 'meters', label: 'Счетчики', desc: 'ЖКХ показания' },
    { id: 'subs', label: 'Подписки', desc: 'Регулярные платежи' },
    { id: 'wishlist', label: 'Wishlist', desc: 'Список желаний' },
    { id: 'chat', label: 'AI Советник', desc: 'Финансовый помощник' },
    { id: 'pantry', label: 'Кладовка', desc: 'Учет продуктов' },
    { id: 'debts', label: 'Долги', desc: 'Кредиты и займы' }
];

// Helper to insert variables into template
const TemplateEditor = ({ label, value, onChange, variables }: { label: string, value: string, onChange: (val: string) => void, variables: string[] }) => {
    const handleAddVar = (v: string) => {
        onChange(value + ` ${v}`);
    };

    return (
        <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">{label}</label>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <textarea 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="w-full bg-transparent font-mono text-xs text-[#1C1C1E] outline-none h-24 resize-none mb-2"
                />
                <div className="flex flex-wrap gap-2">
                    {variables.map(v => (
                        <button 
                            key={v} 
                            onClick={() => handleAddVar(v)}
                            className="bg-white border border-gray-200 px-2 py-1 rounded-lg text-[9px] font-bold text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate, onReset, savingsRate, setSavingsRate, members, onUpdateMembers, categories, onUpdateCategories, learnedRules, onUpdateRules, onEnablePin, onDisablePin, currentFamilyId, onJoinFamily, onLogout, installPrompt, transactions = [], onDeleteTransactionsByPeriod }) => {
  const [activeSection, setActiveSection] = useState<SectionType>('general');
  const [showMobileMenu, setShowMobileMenu] = useState(true);
  
  // Member State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState(PRESET_COLORS[0]);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<FamilyMember | null>(null);
  
  // Category State
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ label: '', icon: PRESET_ICONS[0], color: PRESET_COLORS[5] });
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleName, setNewRuleName] = useState('');
  
  // Mandatory Expense State
  const [isMandatoryModalOpen, setIsMandatoryModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MandatoryExpense | null>(null);

  // Family Join State
  const [targetFamilyId, setTargetFamilyId] = useState('');

  // Delete Period State
  const [deleteMonth, setDeleteMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Selection Expansion State
  const [showAllIcons, setShowAllIcons] = useState(false);

  // PIN Creation State
  const [showPinCreator, setShowPinCreator] = useState(false);

  useEffect(() => {
      setShowAllIcons(false);
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
  const handleAddCategory = () => { 
      if (!newCategory.label.trim()) return; 
      const newCat: Category = { ...newCategory, id: newCategory.label.toLowerCase().replace(/\s/g, '_'), isCustom: true }; 
      onUpdateCategories([...categories, newCat]); 
      setNewCategory({ label: '', icon: PRESET_ICONS[0], color: PRESET_COLORS[5] }); 
      setShowAllIcons(false);
  };
  
  const handleUpdateCategory = (updatedCat: Category) => {
      onUpdateCategories(categories.map(c => c.id === updatedCat.id ? updatedCat : c));
      setSelectedCategoryForEdit(updatedCat); 
  };

  const handleDeleteCategory = (id: string) => { 
      onUpdateCategories(categories.filter(c => c.id !== id)); 
      if (learnedRules) {
        onUpdateRules(learnedRules.filter(r => r.categoryId !== id)); 
      }
      setSelectedCategoryForEdit(null);
  };
  
  const handleAddRuleToCategory = (catId: string) => { 
      if (!newRuleKeyword.trim()) return; 
      const rule: LearnedRule = { 
          id: Date.now().toString(), 
          categoryId: catId, 
          keyword: newRuleKeyword.trim(), 
          cleanName: newRuleName.trim() || newRuleKeyword.trim()
      }; 
      onUpdateRules([...learnedRules, rule]); 
      setNewRuleKeyword(''); 
      setNewRuleName('');
  };
  const handleDeleteRule = (id: string) => onUpdateRules(learnedRules.filter(r => r.id !== id));
  
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
  
  // --- Expense Handlers (Using proper Modal now) ---
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
  const shareInviteLink = async () => { if (!currentFamilyId) return; const link = `${window.location.origin}/?join=${currentFamilyId}`; if (navigator.share) { try { await navigator.share({ title: `Присоединяйся к семейному бюджету ${settings.familyName}`, text: `Перейди по ссылке, чтобы вести бюджет вместе!`, url: link, }); } catch (err) { console.error('Error sharing', err); } } else { copyToClipboard(link); alert("Ссылка-приглашение скопирована!"); } };

  const handleDeletePeriod = () => {
      if (!onDeleteTransactionsByPeriod) return;
      if (confirm(`Удалить ВСЕ операции за ${deleteMonth}? Это действие нельзя отменить.`)) {
          const [y, m] = deleteMonth.split('-').map(Number);
          onDeleteTransactionsByPeriod(y, m - 1);
          alert('Операции удалены');
      }
  };

  const handlePinCreated = (pin: string) => {
      onUpdate({ ...settings, isPinEnabled: true, pinCode: pin });
      setShowPinCreator(false);
  };

  const renderContent = () => {
    switch (activeSection) {
        case 'general': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] space-y-5 border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Основные настройки</h3>
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Название семьи</label><input type="text" value={settings.familyName} onChange={(e) => handleChange('familyName', e.target.value)} className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none focus:bg-white focus:border-blue-200 transition-all" /></div>
                  
                  {/* PIN Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${settings.isPinEnabled ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                              <ShieldCheck size={20} />
                          </div>
                          <span className="font-bold text-sm text-[#1C1C1E]">Вход по PIN-коду</span>
                      </div>
                      <button 
                        onClick={() => {
                            if (settings.isPinEnabled) {
                                handleChange('isPinEnabled', false);
                            } else {
                                setShowPinCreator(true);
                            }
                        }}
                        className={`w-12 h-7 rounded-full p-1 transition-colors ${settings.isPinEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                          <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.isPinEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                  </div>

                  {installPrompt && (
                      <button onClick={() => installPrompt.prompt()} className="w-full flex items-center justify-center gap-2 p-4 bg-[#1C1C1E] text-white font-bold rounded-2xl shadow-lg mt-4">
                          <Download size={18} /> Установить приложение
                      </button>
                  )}
                  
                  <div className="pt-4 border-t border-gray-50"><button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold bg-red-50 rounded-xl hover:bg-red-100 transition-colors"><LogOut size={18} /> Выйти</button></div>
                </div>
            </div>
        );
        case 'budget': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] space-y-5 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-2">Расчет бюджета</h3>
                    <div className="space-y-2"><div className="flex justify-between items-center px-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Процент в копилку</label><span className="text-sm font-black text-blue-500">{savingsRate}%</span></div><input type="range" min="0" max="50" step="1" value={savingsRate} onChange={(e) => setSavingsRate(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500" /></div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Начальный баланс</label><input type="number" value={settings.initialBalance} onChange={(e) => handleChange('initialBalance', Number(e.target.value))} className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none focus:bg-white focus:border-blue-200 transition-all" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Дата нач. баланса</label><input type="date" value={settings.initialBalanceDate || ''} onChange={(e) => handleChange('initialBalanceDate', e.target.value)} className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none focus:bg-white focus:border-blue-200 transition-all" /></div>
                    </div>
                    
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Дни зарплаты (через запятую)</label><input type="text" placeholder="10, 25" value={settings.salaryDates?.join(', ')} onChange={(e) => handleChange('salaryDates', e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)))} className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none focus:bg-white focus:border-blue-200 transition-all" /></div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-black text-[#1C1C1E]">Обязательные расходы</h3>
                        <button onClick={() => { setEditingExpense(null); setIsMandatoryModalOpen(true); }} className="p-2 bg-blue-500 text-white rounded-xl"><Plus size={18}/></button>
                    </div>
                    
                    <div className="space-y-3">
                        {settings.mandatoryExpenses?.map(expense => (
                            <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-sm text-[#1C1C1E] truncate">{expense.name}</span>
                                    <div className="flex gap-2 text-[10px] font-bold text-gray-400">
                                        <span>{expense.amount} {settings.currency}</span>
                                        <span>• {expense.day}-е число</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => { setEditingExpense(expense); setIsMandatoryModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-500"><Edit2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                        {(!settings.mandatoryExpenses || settings.mandatoryExpenses.length === 0) && (
                            <p className="text-center text-xs text-gray-400 font-bold py-4">Список пуст</p>
                        )}
                    </div>
                </div>

                {onDeleteTransactionsByPeriod && (
                    <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-red-500">
                            <AlertOctagon size={18} />
                            <h3 className="text-sm font-black uppercase tracking-widest">Опасная зона</h3>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mb-4">Удаление всех операций за выбранный месяц безвозвратно.</p>
                        <div className="flex gap-2">
                            <input type="month" value={deleteMonth} onChange={e => setDeleteMonth(e.target.value)} className="bg-white px-4 py-2 rounded-xl text-sm font-bold outline-none text-[#1C1C1E]" />
                            <button onClick={handleDeletePeriod} className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Очистить</button>
                        </div>
                    </div>
                )}
            </div>
        );
        case 'members': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-4">Состав семьи</h3>
                    <div className="space-y-3 mb-6">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <MemberMarker member={member} size="sm" />
                                    <span className="font-bold text-sm text-[#1C1C1E]">{member.name}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEditMemberClick(member)} className="p-2 text-gray-400 hover:text-blue-500"><Edit2 size={18}/></button>
                                    <button onClick={() => handleDeleteMember(member.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-2xl space-y-3 border border-gray-100">
                        <h4 className="text-xs font-black uppercase text-gray-400">{selectedMemberForEdit ? 'Редактировать' : 'Добавить участника'}</h4>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Имя" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="flex-1 bg-white p-3 rounded-xl text-sm font-bold outline-none" />
                            <button onClick={handleSaveMember} className="bg-[#1C1C1E] text-white px-4 rounded-xl font-bold text-sm">OK</button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
                            {PRESET_COLORS.map(c => (
                                <button key={c} onClick={() => setNewMemberColor(c)} className={`w-8 h-8 rounded-full shrink-0 transition-transform ${newMemberColor === c ? 'scale-110 border-2 border-white shadow-md' : ''}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
        case 'categories': return (
            <div className="space-y-6">
                {selectedCategoryForEdit ? (
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <button onClick={() => setSelectedCategoryForEdit(null)} className="p-2 bg-gray-100 rounded-xl"><ChevronLeft size={18}/></button>
                            <h3 className="text-lg font-black text-[#1C1C1E]">Настройка: {selectedCategoryForEdit.label}</h3>
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                            {PRESET_COLORS.map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => handleUpdateCategory({...selectedCategoryForEdit, color: c})} 
                                    className={`w-8 h-8 rounded-full flex-shrink-0 transition-transform ${selectedCategoryForEdit.color === c ? 'scale-110 border-2 border-gray-300' : ''}`} 
                                    style={{ backgroundColor: c }} 
                                />
                            ))}
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-black text-gray-400 uppercase">Правила авто-категоризации</h4>
                            <div className="flex flex-col gap-2">
                                <input type="text" placeholder="Ключевое слово (напр. uber)" value={newRuleKeyword} onChange={e => setNewRuleKeyword(e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none" />
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Как отображать (напр. Такси Uber)" value={newRuleName} onChange={e => setNewRuleName(e.target.value)} className="flex-1 bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none" />
                                    <button onClick={() => handleAddRuleToCategory(selectedCategoryForEdit.id)} className="bg-blue-500 text-white px-4 rounded-xl font-bold text-sm"><Plus size={18}/></button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                {learnedRules.filter(r => r.categoryId === selectedCategoryForEdit.id).map(rule => (
                                    <div key={rule.id} className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="opacity-60 text-[9px] uppercase">Если содержит "{rule.keyword}"</span>
                                            <span>Показывать как: {rule.cleanName}</span>
                                        </div>
                                        <button onClick={() => handleDeleteRule(rule.id)} className="p-1 hover:bg-blue-100 rounded"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <button onClick={() => handleDeleteCategory(selectedCategoryForEdit.id)} className="w-full py-4 text-red-500 font-black text-xs uppercase bg-red-50 rounded-xl mt-4">Удалить категорию</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Create New Block */}
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                            <h4 className="text-xs font-black uppercase text-gray-400">Новая категория</h4>
                            <div className="flex items-center gap-2">
                                <input type="text" placeholder="Название" value={newCategory.label} onChange={e => setNewCategory({...newCategory, label: e.target.value})} className="flex-1 bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none" />
                                <button onClick={() => setShowAllIcons(!showAllIcons)} className="p-3 bg-white rounded-xl text-gray-500 border border-gray-100 shadow-sm">{getIconById(newCategory.icon, 20)}</button>
                            </div>
                            
                            {showAllIcons && (
                                <div className="grid grid-cols-6 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 h-40 overflow-y-auto no-scrollbar">
                                    {PRESET_ICONS.map(icon => (
                                        <button key={icon} onClick={() => { setNewCategory({...newCategory, icon}); setShowAllIcons(false); }} className={`p-2 rounded-lg flex items-center justify-center ${newCategory.icon === icon ? 'bg-blue-500 text-white' : 'text-gray-400 bg-white'}`}>
                                            {getIconById(icon, 18)}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 pb-1">
                                {PRESET_COLORS.map(c => (
                                    <button key={c} onClick={() => setNewCategory({...newCategory, color: c})} className={`w-6 h-6 rounded-full shrink-0 transition-transform ${newCategory.color === c ? 'scale-125 border-2 border-white shadow-md' : ''}`} style={{ backgroundColor: c }} />
                                ))}
                            </div>
                            <button onClick={handleAddCategory} className="w-full bg-[#1C1C1E] text-white py-3 rounded-xl font-bold text-xs uppercase mt-2">Создать</button>
                        </div>

                        {/* List Block */}
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-black text-[#1C1C1E] mb-4">Все категории</h3>
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                {categories.map(cat => (
                                    <button key={cat.id} onClick={() => setSelectedCategoryForEdit(cat)} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-gray-50 transition-colors group">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: cat.color }}>
                                            {getIconById(cat.icon, 20)}
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-500 truncate w-full text-center leading-tight">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
        case 'navigation': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-4">Навигация и Время</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Начало дня</label>
                            <div className="bg-gray-50 p-3 rounded-2xl flex items-center justify-center">
                                <input type="number" min="0" max="23" value={settings.dayStartHour ?? 8} onChange={(e) => handleChange('dayStartHour', parseInt(e.target.value))} className="bg-transparent font-black text-xl text-center outline-none w-full" />
                                <span className="text-xs font-bold text-gray-400">:00</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Конец дня</label>
                            <div className="bg-gray-50 p-3 rounded-2xl flex items-center justify-center">
                                <input type="number" min="0" max="24" value={settings.dayEndHour ?? 22} onChange={(e) => handleChange('dayEndHour', parseInt(e.target.value))} className="bg-transparent font-black text-xl text-center outline-none w-full" />
                                <span className="text-xs font-bold text-gray-400">:00</span>
                            </div>
                        </div>
                    </div>

                    <h4 className="text-xs font-black text-gray-400 uppercase mb-2">Нижнее меню</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {AVAILABLE_TABS.map(tab => {
                            const isEnabled = settings.enabledTabs.includes(tab.id);
                            return (
                                <button 
                                    key={tab.id} 
                                    onClick={() => toggleTab(tab.id)} 
                                    className={`p-4 rounded-2xl border text-left transition-all ${isEnabled ? 'bg-[#1C1C1E] text-white border-transparent shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm block">{tab.label}</span>
                                        {tab.icon && React.cloneElement(tab.icon as React.ReactElement, { size: 16, className: isEnabled ? 'text-white' : 'text-gray-300' })}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase block ${isEnabled ? 'opacity-60' : 'opacity-40'}`}>{isEnabled ? 'Включено' : 'Выкл'}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
        case 'telegram': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                    <h3 className="text-lg font-black text-[#1C1C1E]">Telegram Бот</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">Настройте бота для получения уведомлений и отправки списка покупок.</p>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Bot Token</label>
                        <input type="password" value={settings.telegramBotToken || ''} onChange={(e) => handleChange('telegramBotToken', e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-mono text-xs text-[#1C1C1E] outline-none" placeholder="123456:ABC-DEF..." />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Chat ID</label>
                        <input type="text" value={settings.telegramChatId || ''} onChange={(e) => handleChange('telegramChatId', e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-mono text-xs text-[#1C1C1E] outline-none" placeholder="-100..." />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer" onClick={() => handleChange('autoSendEventsToTelegram', !settings.autoSendEventsToTelegram)}>
                        <span className="font-bold text-sm text-[#1C1C1E]">Автоотправка событий</span>
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${settings.autoSendEventsToTelegram ? 'bg-blue-500' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.autoSendEventsToTelegram ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    <TemplateEditor 
                        label="Шаблон события"
                        value={settings.eventTemplate || "📅 *{{title}}*\n🗓 {{date}} {{time}}\n📝 {{description}}"} 
                        onChange={(v) => handleChange('eventTemplate', v)}
                        variables={['{{title}}', '{{date}}', '{{time}}', '{{description}}', '{{members}}']}
                    />

                    <TemplateEditor 
                        label="Шаблон списка покупок"
                        value={settings.shoppingTemplate || "🛒 *Список покупок:*\n\n{{items}}"} 
                        onChange={(v) => handleChange('shoppingTemplate', v)}
                        variables={['{{items}}']}
                    />
                </div>
            </div>
        );
        case 'widgets': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-4">Виджеты на главной</h3>
                    <div className="space-y-3">
                        {settings.widgets.map((widget, index) => {
                            const meta = WIDGET_METADATA.find(m => m.id === widget.id);
                            if (!meta) return null;
                            const isVisible = widget.isVisible;
                            
                            return (
                                <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col gap-1 pr-2 border-r border-gray-200">
                                            <button onClick={() => moveWidget(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-blue-500 disabled:opacity-30"><ChevronUp size={14}/></button>
                                            <button onClick={() => moveWidget(index, 'down')} disabled={index === settings.widgets.length - 1} className="text-gray-400 hover:text-blue-500 disabled:opacity-30"><ChevronDown size={14}/></button>
                                        </div>
                                        <span className="text-xl">{meta.icon}</span>
                                        <span className="font-bold text-sm text-[#1C1C1E]">{meta.label}</span>
                                    </div>
                                    <button onClick={() => toggleWidgetVisibility(widget.id)} className={`w-12 h-7 rounded-full p-1 transition-colors ${isVisible ? 'bg-green-500' : 'bg-gray-300'}`}>
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isVisible ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
        case 'services': return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-[#1C1C1E] mb-4">Сервисы</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {AVAILABLE_SERVICES.map(service => {
                            const isEnabled = settings.enabledServices.includes(service.id);
                            return (
                                <button 
                                    key={service.id} 
                                    onClick={() => toggleService(service.id)} 
                                    className={`p-4 rounded-2xl border text-left transition-all flex justify-between items-center ${isEnabled ? 'bg-white border-blue-500 shadow-md shadow-blue-500/10' : 'bg-gray-50 border-transparent text-gray-400'}`}
                                >
                                    <div>
                                        <span className={`font-bold text-sm block ${isEnabled ? 'text-[#1C1C1E]' : 'text-gray-400'}`}>{service.label}</span>
                                        <span className="text-[9px] font-medium opacity-60">{service.desc}</span>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isEnabled ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
                                        {isEnabled && <Check size={12} strokeWidth={3} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
        // ... (Other sections remain similar, removed purely for brevity but logic is preserved)
        default: return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-black text-[#1C1C1E]">Семья и доступ</h3>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                        <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">Ваш ID семьи</p>
                        <p onClick={() => copyToClipboard(currentFamilyId || '')} className="text-xl font-black text-blue-600 font-mono break-all cursor-pointer hover:opacity-70 transition-opacity">
                            {currentFamilyId || '...'}
                        </p>
                        <button onClick={shareInviteLink} className="mt-3 bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
                            Поделиться ссылкой
                        </button>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Присоединиться к другой семье</label>
                        <div className="flex gap-2">
                            <input type="text" placeholder="ID Семьи" value={targetFamilyId} onChange={e => setTargetFamilyId(e.target.value)} className="flex-1 bg-gray-50 p-4 rounded-2xl font-mono text-xs text-[#1C1C1E] outline-none" />
                            <button onClick={() => onJoinFamily(targetFamilyId)} className="bg-[#1C1C1E] text-white px-4 rounded-2xl font-bold text-xs">OK</button>
                        </div>
                        <p className="text-[10px] text-red-400 font-bold px-2">Внимание: текущие данные будут недоступны</p>
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
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#F2F2F7] w-full max-w-5xl h-[85vh] md:rounded-[3rem] rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden">
            
            {/* SIDEBAR / MOBILE MENU */}
            <div className={`
                bg-white border-r border-gray-100 flex-col shrink-0 overflow-y-auto no-scrollbar md:h-full transition-all
                ${showMobileMenu ? 'flex w-full h-full absolute inset-0 z-20 md:static md:w-64 md:z-auto' : 'hidden md:flex md:w-64'}
            `}>
                <div className="p-6 md:p-8 border-b border-gray-50 flex items-center justify-between md:justify-start gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white text-[#1C1C1E] rounded-2xl flex items-center justify-center shadow-sm border border-gray-100"><GripVertical size={20}/></div>
                        <span className="font-black text-xl">Настройки</span>
                    </div>
                    <button onClick={onClose} className="md:hidden w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X size={20}/></button>
                </div>
                
                <div className="flex-1 p-4 space-y-2">
                    {SECTIONS.map(section => (
                        <button
                            key={section.id}
                            onClick={() => { setActiveSection(section.id); setSelectedCategoryForEdit(null); setSelectedMemberForEdit(null); setShowMobileMenu(false); }}
                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeSection === section.id && !showMobileMenu ? 'bg-blue-50 text-blue-600' : 'bg-gray-50/50 text-[#1C1C1E] hover:bg-gray-100'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeSection === section.id && !showMobileMenu ? 'bg-white shadow-sm' : 'bg-white border border-gray-100'}`}>
                                {section.icon}
                            </div>
                            <span className="font-bold text-sm flex-1 text-left">{section.label}</span>
                            <ChevronRight size={16} className="text-gray-300 md:hidden" />
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F2F2F7] ${showMobileMenu ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 md:p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-md flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-[#1C1C1E]">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-xl font-black text-[#1C1C1E]">{SECTIONS.find(s => s.id === activeSection)?.label}</h2>
                    </div>
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
