
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Trash2, CheckCircle2, Plus, Palette, Edit2, Check, Clock, Wallet, Tag, ChevronDown, Sparkles, Globe, Smartphone, FileJson, LayoutGrid, ToggleLeft, ToggleRight, Shield, Grip, Lock, Copy, Users, Share } from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule } from '../types';
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
}

const DASHBOARD_WIDGETS = [ 
  { id: 'balance', label: 'Карточка баланса', icon: '💳' }, 
  { id: 'daily', label: 'Дневной бюджет', icon: '💰' }, 
  { id: 'spent', label: 'Траты за месяц', icon: '📉' }, 
  { id: 'goals', label: 'Цели сбережений', icon: '🎯' }, 
  { id: 'charts', label: 'Аналитика', icon: '📊' }, 
  { id: 'shopping', label: 'Виджет покупок', icon: '🛒' }
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
    { id: 'chat', label: 'AI Советник', icon: '🤖' }
];

const PRESET_COLORS = [ '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#FF3B30', '#5856D6', '#00C7BE', '#8E8E93', '#BF5AF2' ];
const PRESET_ICONS = [ 'Utensils', 'Car', 'Home', 'ShoppingBag', 'Heart', 'Zap', 'Plane', 'Briefcase', 'PiggyBank', 'Coffee', 'Tv', 'MoreHorizontal' ];

type SectionType = 'general' | 'members' | 'categories' | 'widgets' | 'navigation' | 'services' | 'telegram' | 'advanced' | 'family';

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate, onReset, savingsRate, setSavingsRate, members, onUpdateMembers, categories, onUpdateCategories, learnedRules, onUpdateRules, onEnablePin, onDisablePin, currentFamilyId, onJoinFamily }) => {
  const [activeSection, setActiveSection] = useState<SectionType | null>('general');
  
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState(PRESET_COLORS[0]);
  
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({ keyword: '', cleanName: '' });
  const [newCategory, setNewCategory] = useState({ label: '', icon: PRESET_ICONS[0], color: PRESET_COLORS[5] });
  
  const [targetFamilyId, setTargetFamilyId] = useState('');

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  const handleAlfaMappingChange = (key: keyof AppSettings['alfaMapping'], value: string) => {
    onUpdate({ ...settings, alfaMapping: { ...settings.alfaMapping, [key]: value } });
  };

  const toggleSection = (section: SectionType) => {
    setActiveSection(activeSection === section ? null : section);
  };

  // --- Logic for Categories ---
  const handleAddCategory = () => {
    if (!newCategory.label.trim()) return;
    const newCat: Category = { ...newCategory, id: newCategory.label.toLowerCase().replace(/\s/g, '_'), isCustom: true };
    onUpdateCategories([...categories, newCat]);
    setNewCategory({ label: '', icon: PRESET_ICONS[0], color: PRESET_COLORS[5] });
  };
  
  const handleDeleteCategory = (id: string) => {
    onUpdateCategories(categories.filter(c => c.id !== id));
    onUpdateRules(learnedRules.filter(r => r.categoryId !== id));
  };

  const handleAddRule = (categoryId: string) => {
    if (!newRule.keyword.trim() || !newRule.cleanName.trim()) return;
    const rule: LearnedRule = { id: Date.now().toString(), categoryId, ...newRule };
    onUpdateRules([...learnedRules, rule]);
    setNewRule({ keyword: '', cleanName: '' });
  };
  
  const handleDeleteRule = (id: string) => onUpdateRules(learnedRules.filter(r => r.id !== id));

  // --- Logic for Members ---
  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const newMember: FamilyMember = { id: Math.random().toString(36).substr(2, 9), name: newMemberName.trim(), color: newMemberColor };
    onUpdateMembers([...members, newMember]);
    setNewMemberName(''); setNewMemberColor(PRESET_COLORS[0]);
  };
  const handleUpdateMember = (id: string, updates: Partial<FamilyMember>) => { onUpdateMembers(members.map(m => m.id === id ? { ...m, ...updates } : m)); };
  const handleDeleteMember = (id: string) => { if (members.length <= 1) { alert("Должен остаться хотя бы один участник"); return; } onUpdateMembers(members.filter(m => m.id !== id)); };

  // --- Logic for Arrays (Widgets, Tabs, Services) ---
  const toggleArrayItem = (key: 'enabledWidgets' | 'enabledTabs' | 'enabledServices', id: string) => {
    const current = settings[key] || [];
    // Ensure 'overview' tab cannot be disabled
    if (key === 'enabledTabs' && id === 'overview') return;

    const next = current.includes(id) ? current.filter(w => w !== id) : [...current, id];
    handleChange(key, next);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("ID скопирован в буфер обмена");
  };

  const shareInviteLink = async () => {
    if (!currentFamilyId) return;
    const link = `${window.location.origin}/?join=${currentFamilyId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Присоединяйся к семейному бюджету ${settings.familyName}`,
          text: `Перейди по ссылке, чтобы вести бюджет вместе!`,
          url: link,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      copyToClipboard(link);
      alert("Ссылка-приглашение скопирована!");
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/10 backdrop-blur-sm" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-[#F8F9FB] w-full max-w-lg md:rounded-[3rem] h-[90vh] md:h-auto overflow-hidden rounded-t-[3rem] shadow-2xl flex flex-col">
        <div className="p-8 flex justify-between items-center bg-white border-b border-gray-100">
          <h2 className="text-2xl font-black text-[#1C1C1E] tracking-tight">Настройки</h2>
          <button onClick={onClose} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-12 text-[#1C1C1E]">
          
          {/* GENERAL SECTION */}
          <SectionButton 
            icon={<Globe size={20} className="text-blue-500" />} 
            label="Общие" 
            isActive={activeSection === 'general'} 
            onClick={() => toggleSection('general')} 
          />
          <AnimatePresence>
            {activeSection === 'general' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm mx-2 mb-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Название семьи</label>
                    <input type="text" value={settings.familyName} onChange={(e) => handleChange('familyName', e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Валюта</label>
                      <input type="text" value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none text-center" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Начало мес.</label>
                      <input type="number" min="1" max="31" value={settings.startOfMonthDay} onChange={(e) => handleChange('startOfMonthDay', Number(e.target.value))} className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none text-center" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Процент в копилку</label>
                      <span className="text-sm font-black text-blue-500">{savingsRate}%</span>
                    </div>
                    <input type="range" min="0" max="50" step="1" value={savingsRate} onChange={(e) => setSavingsRate(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                      <Shield size={20} className="text-gray-400" />
                      <span className="font-bold text-sm">Приватный режим</span>
                    </div>
                    <button onClick={() => handleChange('privacyMode', !settings.privacyMode)} className={`transition-colors ${settings.privacyMode ? 'text-blue-500' : 'text-gray-300'}`}>
                      {settings.privacyMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </div>
                  
                  {/* PIN Code Toggle */}
                  <div className="flex items-center justify-between p-2 border-t border-gray-50 pt-4">
                    <div className="flex items-center gap-3">
                      <Lock size={20} className="text-gray-400" />
                      <span className="font-bold text-sm">Вход по PIN-коду</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (settings.isPinEnabled) {
                          onDisablePin?.();
                        } else {
                          onEnablePin?.();
                        }
                      }} 
                      className={`transition-colors ${settings.isPinEnabled ? 'text-green-500' : 'text-gray-300'}`}
                    >
                      {settings.isPinEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FAMILY ACCESS SECTION */}
          <SectionButton 
            icon={<Users size={20} className="text-pink-600" />} 
            label="Семейный доступ" 
            isActive={activeSection === 'family'} 
            onClick={() => toggleSection('family')} 
          />
          <AnimatePresence>
            {activeSection === 'family' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm mx-2 mb-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Пригласить в семью</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-gray-50 p-4 rounded-2xl font-mono text-xs text-[#1C1C1E] break-all border border-gray-100 flex items-center">
                        {currentFamilyId}
                      </div>
                      <button onClick={shareInviteLink} className="p-4 bg-blue-500 text-white hover:bg-blue-600 rounded-2xl transition-colors shadow-lg shadow-blue-500/20">
                        <Share size={18} />
                      </button>
                      <button onClick={() => currentFamilyId && copyToClipboard(currentFamilyId)} className="p-4 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors text-gray-500">
                        <Copy size={18} />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 px-2 leading-tight">Отправьте ссылку или ID члену семьи, чтобы объединить бюджеты.</p>
                  </div>

                  <div className="border-t border-gray-50 pt-4 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Присоединиться к другой семье</label>
                    <input 
                      type="text" 
                      placeholder="Вставьте ID семьи..." 
                      value={targetFamilyId}
                      onChange={(e) => setTargetFamilyId(e.target.value)}
                      className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-xs outline-none" 
                    />
                    <button 
                      onClick={() => onJoinFamily(targetFamilyId)} 
                      disabled={!targetFamilyId || targetFamilyId === currentFamilyId}
                      className="w-full bg-pink-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-pink-500/20 disabled:opacity-50 disabled:shadow-none"
                    >
                      Присоединиться
                    </button>
                    <p className="text-[10px] text-red-400 px-2 leading-tight font-bold">Внимание: Ваши текущие данные будут скрыты, вы начнете видеть данные новой семьи.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* NAVIGATION SECTION (TABS) */}
          <SectionButton 
            icon={<Wallet size={20} className="text-green-500" />} 
            label="Навигация" 
            isActive={activeSection === 'navigation'} 
            onClick={() => toggleSection('navigation')} 
          />
          <AnimatePresence>
            {activeSection === 'navigation' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 space-y-1 mx-2 mb-2">
                  {TABS_CONFIG.map(tab => (
                    <button 
                       key={tab.id} 
                       onClick={() => toggleArrayItem('enabledTabs', tab.id)} 
                       className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors ${tab.id === 'overview' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-4"><span className="text-xl">{tab.icon}</span><span className="text-sm font-bold">{tab.label}</span></div>
                      {settings.enabledTabs.includes(tab.id) ? <CheckCircle2 size={24} className="text-blue-500 fill-blue-500/10" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-100" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SERVICES SECTION */}
          <SectionButton 
            icon={<Grip size={20} className="text-indigo-500" />} 
            label="Сервисы" 
            isActive={activeSection === 'services'} 
            onClick={() => toggleSection('services')} 
          />
          <AnimatePresence>
             {activeSection === 'services' && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                 <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 space-y-1 mx-2 mb-2">
                   {SERVICES_CONFIG.map(srv => (
                     <button key={srv.id} onClick={() => toggleArrayItem('enabledServices', srv.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                       <div className="flex items-center gap-4"><span className="text-xl">{srv.icon}</span><span className="text-sm font-bold">{srv.label}</span></div>
                       {settings.enabledServices.includes(srv.id) ? <CheckCircle2 size={24} className="text-blue-500 fill-blue-500/10" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-100" />}
                     </button>
                   ))}
                 </div>
               </motion.div>
             )}
          </AnimatePresence>

          {/* MEMBERS SECTION */}
          <SectionButton 
            icon={<User size={20} className="text-purple-500" />} 
            label="Участники семьи" 
            isActive={activeSection === 'members'} 
            onClick={() => toggleSection('members')} 
          />
          <AnimatePresence>
            {activeSection === 'members' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mx-2 mb-2 space-y-2">
                  {members.map(member => (
                    <div key={member.id} className="p-3 flex items-center gap-3 hover:bg-gray-50 rounded-2xl transition-all">
                      <MemberMarker member={member} size="sm" />
                      <div className="flex-1">
                        {editingMemberId === member.id ? (
                          <div className="flex flex-col gap-2">
                            <input 
                              type="text" 
                              value={member.name} 
                              onChange={(e) => handleUpdateMember(member.id, { name: e.target.value })}
                              className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-bold outline-none border border-blue-500 text-[#1C1C1E]"
                            />
                            <div className="flex flex-wrap gap-2 mt-1">
                              {PRESET_COLORS.map(c => (
                                <button 
                                  key={c} 
                                  onClick={() => handleUpdateMember(member.id, { color: c })}
                                  className={`w-5 h-5 rounded-full border-2 ${member.color === c ? 'border-[#1C1C1E]' : 'border-white'}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-sm">{member.name}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingMemberId(editingMemberId === member.id ? null : member.id)} className="p-2 text-blue-500 bg-blue-50 rounded-xl ios-btn-active">{editingMemberId === member.id ? <Check size={18}/> : <Edit2 size={18} />}</button>
                        <button onClick={() => handleDeleteMember(member.id)} className="p-2 text-red-500 bg-red-50 rounded-xl ios-btn-active"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 border-t border-gray-50 space-y-3 mt-2">
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: newMemberColor }} />
                      <input type="text" placeholder="Имя..." value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="flex-1 bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold outline-none text-[#1C1C1E]"/>
                      <button onClick={handleAddMember} className="p-2.5 bg-blue-500 text-white rounded-xl ios-btn-active shadow-lg shadow-blue-500/20"><Plus size={20} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2 px-1">{PRESET_COLORS.map(c => (<button key={c} onClick={() => setNewMemberColor(c)} className={`w-6 h-6 rounded-full border-2 ${newMemberColor === c ? 'border-blue-500' : 'border-white shadow-sm'}`} style={{ backgroundColor: c }} />))}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CATEGORIES SECTION (Collapsed by default) */}
          <SectionButton 
            icon={<Tag size={20} className="text-orange-500" />} 
            label="Категории и Правила" 
            isActive={activeSection === 'categories'} 
            onClick={() => toggleSection('categories')} 
          />
          <AnimatePresence>
            {activeSection === 'categories' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 space-y-2 mx-2 mb-2">
                  {categories.map(cat => {
                    const isExpanded = expandedCatId === cat.id;
                    const rules = learnedRules.filter(r => r.categoryId === cat.id);
                    return (
                      <div key={cat.id} className={`p-2 rounded-2xl ${isExpanded ? 'bg-gray-50' : ''}`}>
                        <div className="flex items-center gap-4 cursor-pointer p-2" onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{backgroundColor: cat.color}}>{getIconById(cat.icon, 20)}</div>
                          <span className="flex-1 font-bold text-sm">{cat.label}</span>
                          {cat.isCustom && <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="p-2 text-red-500"><Trash2 size={16}/></button>}
                          <ChevronDown size={20} className={`transition-transform text-gray-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 mt-2 border-t border-gray-200 space-y-4">
                              {rules.map(rule => (
                                 <div key={rule.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
                                   <Sparkles size={16} className="text-yellow-500"/>
                                   <div className="flex-1 text-xs"><span className="font-bold">"{rule.keyword}"</span> → <span className="font-bold text-blue-500">"{rule.cleanName}"</span></div>
                                   <button onClick={() => handleDeleteRule(rule.id)} className="text-gray-300 hover:text-red-500"><X size={14}/></button>
                                 </div>
                              ))}
                              <div className="bg-white p-4 rounded-2xl border border-dashed border-gray-200 space-y-3">
                                 <p className="text-[10px] font-black uppercase text-gray-400">Добавить правило</p>
                                 <input type="text" value={newRule.keyword} onChange={(e) => setNewRule({...newRule, keyword: e.target.value})} placeholder="Ключевое слово..." className="w-full bg-gray-50 px-3 py-2 text-xs rounded-lg font-bold outline-none"/>
                                 <input type="text" value={newRule.cleanName} onChange={(e) => setNewRule({...newRule, cleanName: e.target.value})} placeholder="Назвать как..." className="w-full bg-gray-50 px-3 py-2 text-xs rounded-lg font-bold outline-none"/>
                                 <button onClick={() => handleAddRule(cat.id)} className="w-full bg-blue-50 text-blue-500 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-100 transition-colors">Сохранить</button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  <div className="p-4 border-t border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Новая категория</h4>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white" style={{backgroundColor: newCategory.color}}>{getIconById(newCategory.icon, 20)}</div>
                      <input type="text" value={newCategory.label} onChange={e => setNewCategory({...newCategory, label: e.target.value})} placeholder="Название..." className="flex-1 bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold outline-none"/>
                      <button onClick={handleAddCategory} className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center"><Plus size={20}/></button>
                    </div>
                    <div className="flex flex-wrap gap-2">{PRESET_ICONS.map(i => (<button key={i} onClick={() => setNewCategory({...newCategory, icon: i})} className={`w-8 h-8 rounded-lg flex items-center justify-center ${newCategory.icon === i ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{getIconById(i, 16)}</button>))}</div>
                    <div className="flex flex-wrap gap-2">{PRESET_COLORS.map(c => (<button key={c} onClick={() => setNewCategory({...newCategory, color: c})} className={`w-6 h-6 rounded-full border-2 ${newCategory.color === c ? 'border-blue-500' : 'border-white shadow-sm'}`} style={{backgroundColor: c}} />))}</div>
                  </div>
               </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* WIDGETS SECTION */}
          <SectionButton 
            icon={<LayoutGrid size={20} className="text-pink-500" />} 
            label="Виджеты (Обзор)" 
            isActive={activeSection === 'widgets'} 
            onClick={() => toggleSection('widgets')} 
          />
          <AnimatePresence>
            {activeSection === 'widgets' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 space-y-1 mx-2 mb-2">
                  {DASHBOARD_WIDGETS.map(widget => (
                    <button key={widget.id} onClick={() => toggleArrayItem('enabledWidgets', widget.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4"><span className="text-xl">{widget.icon}</span><span className="text-sm font-bold">{widget.label}</span></div>
                      {settings.enabledWidgets.includes(widget.id) ? <CheckCircle2 size={24} className="text-blue-500 fill-blue-500/10" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-100" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TELEGRAM SECTION */}
          <SectionButton 
            icon={<Smartphone size={20} className="text-blue-400" />} 
            label="Telegram" 
            isActive={activeSection === 'telegram'} 
            onClick={() => toggleSection('telegram')} 
          />
          <AnimatePresence>
            {activeSection === 'telegram' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm mx-2 mb-2">
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* ADVANCED / IMPORT SECTION */}
          <SectionButton 
            icon={<FileJson size={20} className="text-gray-500" />} 
            label="Импорт и Прочее" 
            isActive={activeSection === 'advanced'} 
            onClick={() => toggleSection('advanced')} 
          />
          <AnimatePresence>
            {activeSection === 'advanced' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-white p-6 rounded-3xl space-y-5 border border-gray-100 shadow-sm mx-2 mb-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-400">Начало дня</label><input type="number" value={settings.dayStartHour} onChange={e => handleChange('dayStartHour', Number(e.target.value))} className="w-full bg-gray-50 p-3 rounded-xl font-bold" /></div>
                    <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-400">Конец дня</label><input type="number" value={settings.dayEndHour} onChange={e => handleChange('dayEndHour', Number(e.target.value))} className="w-full bg-gray-50 p-3 rounded-xl font-bold" /></div>
                  </div>
                  
                  <div className="border-t border-gray-50 pt-4 space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Начальный баланс</label>
                    <div className="flex gap-2">
                       <div className="flex-1 space-y-1">
                          <input type="number" value={settings.initialBalance} onChange={e => handleChange('initialBalance', Number(e.target.value))} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none" placeholder="Сумма" />
                          <div className="text-[9px] font-black text-gray-300 uppercase text-center">Сумма</div>
                       </div>
                       <div className="flex-1 space-y-1">
                          <input type="date" value={settings.initialBalanceDate || ''} onChange={e => handleChange('initialBalanceDate', e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none" />
                          <div className="text-[9px] font-black text-gray-300 uppercase text-center">Дата старта</div>
                       </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-tight px-1">
                       Текущий баланс = Начальная сумма + Доходы/Расходы после указанной даты.
                    </p>
                  </div>

                  <div className="border-t border-gray-50 pt-4 space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Маппинг CSV/Excel</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={settings.alfaMapping.date} onChange={e => handleAlfaMappingChange('date', e.target.value)} placeholder="Колонка даты" className="bg-gray-50 p-3 rounded-xl text-xs font-bold" />
                      <input type="text" value={settings.alfaMapping.amount} onChange={e => handleAlfaMappingChange('amount', e.target.value)} placeholder="Колонка суммы" className="bg-gray-50 p-3 rounded-xl text-xs font-bold" />
                      <input type="text" value={settings.alfaMapping.category} onChange={e => handleAlfaMappingChange('category', e.target.value)} placeholder="Колонка категории" className="bg-gray-50 p-3 rounded-xl text-xs font-bold" />
                      <input type="text" value={settings.alfaMapping.note} onChange={e => handleAlfaMappingChange('note', e.target.value)} placeholder="Колонка описания" className="bg-gray-50 p-3 rounded-xl text-xs font-bold" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <section className="pt-4"><button onClick={onReset} className="w-full p-6 flex items-center gap-4 text-red-500 bg-red-50/50 rounded-3xl border border-red-100 hover:bg-red-100 transition-colors"><Trash2 size={24} /><span className="font-black uppercase text-xs tracking-widest">Сбросить всё</span></button></section>
        </div>
      </motion.div>
    </div>
  );
};

const SectionButton = ({ icon, label, isActive, onClick }: any) => (
  <button onClick={onClick} className={`w-full p-5 rounded-3xl flex items-center justify-between transition-all ${isActive ? 'bg-white shadow-md scale-[1.02]' : 'bg-white/50 hover:bg-white border border-transparent'}`}>
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-gray-50' : 'bg-transparent'}`}>{icon}</div>
      <span className="font-bold text-[#1C1C1E]">{label}</span>
    </div>
    <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`} />
  </button>
);

export default SettingsModal;
