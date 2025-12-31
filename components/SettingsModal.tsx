
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Trash2, CheckCircle2, Plus, Palette, Edit2, Check, Clock, Wallet, Tag, ChevronDown, Sparkles, Globe, Smartphone, FileJson, LayoutGrid, ToggleLeft, ToggleRight, Shield, Grip, Lock, Copy, Users, Share, LogOut, ChevronRight, Download, Move, Calculator, DollarSign, GripVertical, Loader2, Monitor, Smartphone as SmartphoneIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, MandatoryExpense, Transaction, WidgetConfig } from '../types';
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
  transactions?: Transaction[];
}

const SECTIONS: { id: string, label: string, icon: any }[] = [
    { id: 'general', label: 'Общие', icon: <Globe size={18} className="text-blue-500" /> },
    { id: 'budget', label: 'Бюджет и Лимиты', icon: <Calculator size={18} className="text-green-600" /> },
    { id: 'widgets', label: 'Виджеты', icon: <LayoutGrid size={18} className="text-pink-500" /> },
    { id: 'family', label: 'Семья', icon: <Users size={18} className="text-purple-600" /> },
    { id: 'categories', label: 'Категории', icon: <Tag size={18} className="text-orange-500" /> },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate, savingsRate, setSavingsRate, currentFamilyId, onLogout }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Auto-expand first section ONLY on desktop
  useEffect(() => {
    if (window.innerWidth > 768) {
        setActiveSection('general');
    } else {
        setActiveSection(null); // Collapsed on mobile
    }
  }, []);

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  const renderContent = (sectionId: string | null) => {
    if (sectionId === 'general') return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Название семьи</label><input type="text" value={settings.familyName} onChange={(e) => handleChange('familyName', e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Валюта</label><input type="text" value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none" /></div>
                <div className="flex items-center justify-between p-2"><div className="flex items-center gap-3"><Shield size={20} className="text-gray-400" /><span className="font-bold text-sm">Приватный режим</span></div><button onClick={() => handleChange('privacyMode', !settings.privacyMode)} className={`transition-colors ${settings.privacyMode ? 'text-blue-500' : 'text-gray-300'}`}>{settings.privacyMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}</button></div>
            </div>
            <button onClick={onLogout} className="w-full p-5 bg-red-50 text-red-500 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"><LogOut size={16}/> Выйти из аккаунта</button>
        </div>
    );
    if (sectionId === 'budget') return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm">
                <div className="flex gap-4"><div className="flex-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Число старта месяца</label><input type="number" min="1" max="31" value={settings.startOfMonthDay} onChange={(e) => handleChange('startOfMonthDay', Number(e.target.value))} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none text-center" /></div><div className="flex-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Дни Зарплаты</label><input type="text" value={settings.salaryDates?.join(', ') || ''} onChange={(e) => handleChange('salaryDates', e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none text-center" /></div></div>
                <div className="space-y-2"><div className="flex justify-between items-center px-2"><label className="text-[10px] font-black text-gray-400 uppercase">Процент в копилку</label><span className="text-sm font-black text-blue-500">{savingsRate}%</span></div><input type="range" min="0" max="50" step="1" value={savingsRate} onChange={(e) => setSavingsRate(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500" /></div>
            </div>
        </div>
    );
    return <div className="text-center py-8 text-gray-300 font-bold uppercase text-xs">Раздел в разработке 🛠️</div>;
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" />
      <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} className="relative bg-[#F8F9FB] w-full max-w-5xl md:h-[85vh] h-[95vh] rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-72 bg-white border-r border-gray-100 flex flex-col h-full flex-shrink-0">
           <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-50 md:border-none"><h2 className="text-2xl font-black text-[#1C1C1E] tracking-tight">Настройки</h2><button onClick={onClose} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500 md:hidden"><X size={20} /></button></div>
           <div className="hidden md:flex flex-col flex-1 p-4 space-y-1 overflow-y-auto">{SECTIONS.map(s => (<button key={s.id} onClick={() => setActiveSection(s.id)} className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all text-left ${activeSection === s.id ? 'bg-gray-100 font-bold text-[#1C1C1E]' : 'text-gray-500 hover:bg-gray-50'}`}>{s.icon}<span className="text-sm">{s.label}</span></button>))}</div>
           <div className="md:hidden overflow-y-auto flex-1 p-4 space-y-2">{SECTIONS.map(s => (<div key={s.id}><button onClick={() => setActiveSection(activeSection === s.id ? null : s.id)} className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${activeSection === s.id ? 'bg-white shadow-sm' : 'bg-white/50'}`}><div className="flex items-center gap-3">{s.icon}<span className="font-bold text-sm text-[#1C1C1E]">{s.label}</span></div><ChevronDown size={20} className={`text-gray-400 transition-transform ${activeSection === s.id ? 'rotate-180' : ''}`} /></button><AnimatePresence>{activeSection === s.id && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="pt-2 pb-4">{renderContent(s.id)}</div></motion.div>)}</AnimatePresence></div>))}</div>
        </div>
        <div className="hidden md:flex flex-1 flex-col h-full overflow-hidden bg-[#F8F9FB]">
            <div className="p-8 flex items-center justify-between border-b border-gray-200/50 bg-white/50 backdrop-blur-sm sticky top-0 z-10"><h3 className="text-xl font-bold text-gray-500 flex items-center gap-2">{SECTIONS.find(s => s.id === activeSection)?.label}</h3><button onClick={onClose} className="p-2.5 bg-white hover:bg-gray-100 rounded-full transition-colors text-gray-400 shadow-sm border border-gray-100"><X size={20} /></button></div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar"><div className="max-w-2xl mx-auto">{renderContent(activeSection)}</div></div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;
