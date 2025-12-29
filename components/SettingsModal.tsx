
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Trash2, Heart, CheckCircle2, MessageSquare, Send, Plus, Palette, Edit2, Check, Clock, BellRing, Wallet } from 'lucide-react';
import { AppSettings, FamilyMember } from '../types';
import { MemberMarker } from '../App';

interface SettingsModalProps {
  settings: AppSettings;
  onClose: () => void;
  onUpdate: (settings: AppSettings) => void;
  onReset: () => void;
  savingsRate: number;
  setSavingsRate: (val: number) => void;
  members: FamilyMember[];
  onUpdateMembers: (members: FamilyMember[]) => void;
}

const DASHBOARD_WIDGETS = [
  { id: 'balance', label: 'Карточка баланса', icon: '💳' },
  { id: 'daily', label: 'Дневной бюджет', icon: '💰' },
  { id: 'spent', label: 'Траты за месяц', icon: '📉' },
  { id: 'goals', label: 'Цели сбережений', icon: '🎯' },
  { id: 'charts', label: 'Аналитика', icon: '📊' },
  { id: 'plans', label: 'Планы на день', icon: '📅' },
  { id: 'shopping', label: 'Список покупок', icon: '🛒' },
];

const PRESET_COLORS = [
  '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', 
  '#FF3B30', '#5856D6', '#00C7BE', '#8E8E93', '#BF5AF2'
];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  settings, 
  onClose, 
  onUpdate, 
  onReset,
  savingsRate,
  setSavingsRate,
  members,
  onUpdateMembers
}) => {
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState(PRESET_COLORS[0]);

  const toggleWidget = (id: string) => {
    const current = settings.enabledWidgets || [];
    const next = current.includes(id) 
      ? current.filter(w => w !== id) 
      : [...current, id];
    onUpdate({ ...settings, enabledWidgets: next });
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const newMember: FamilyMember = {
      id: Math.random().toString(36).substr(2, 9),
      name: newMemberName.trim(),
      color: newMemberColor
    };
    onUpdateMembers([...members, newMember]);
    setNewMemberName('');
    setNewMemberColor(PRESET_COLORS[0]);
  };

  const handleUpdateMember = (id: string, updates: Partial<FamilyMember>) => {
    onUpdateMembers(members.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleDeleteMember = (id: string) => {
    if (members.length <= 1) {
      alert("Должен остаться хотя бы один участник");
      return;
    }
    onUpdateMembers(members.filter(m => m.id !== id));
  };

  const testTelegramBot = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      alert("Сначала заполните Token и Chat ID");
      return;
    }
    try {
      const response = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: "🚀 Проверка связи! Бот Семейного Бюджета настроен успешно.",
          parse_mode: 'Markdown'
        })
      });
      const data = await response.json();
      if (data.ok) alert("Тестовое сообщение отправлено!");
      else alert(`Ошибка: ${data.description}`);
    } catch (err) {
      alert("Ошибка сети при проверке бота");
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/10 backdrop-blur-sm" />
      
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-[#F8F9FB] w-full max-w-lg md:rounded-[3rem] h-[90vh] md:h-auto overflow-hidden rounded-t-[3rem] shadow-2xl flex flex-col"
      >
        <div className="p-8 flex justify-between items-center bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl"><Heart size={20} className="text-blue-500 fill-blue-500" /></div>
            <h2 className="text-2xl font-black text-[#1C1C1E] tracking-tight">Настройки</h2>
          </div>
          <button onClick={onClose} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-12 text-[#1C1C1E]">
          
          <section className="space-y-4">
            <h3 className="ml-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Финансы</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Начальный баланс (₽)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Wallet size={16} />
                  </div>
                  <input 
                    type="number" 
                    value={settings.initialBalance} 
                    onChange={(e) => onUpdate({...settings, initialBalance: Number(e.target.value)})} 
                    className="w-full bg-gray-50 p-4 pl-12 rounded-2xl text-sm font-bold outline-none border border-transparent focus:border-blue-100 transition-all text-[#1C1C1E]"
                    placeholder="Напр. 50000"
                  />
                </div>
                <p className="text-[9px] text-gray-400 font-medium px-1">Общий баланс на «Обзоре» будет рассчитываться от этой суммы.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="ml-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Участники семьи</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 space-y-2">
              {members.map(member => (
                <div key={member.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 rounded-2xl transition-all">
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
                    <button 
                      onClick={() => setEditingMemberId(editingMemberId === member.id ? null : member.id)}
                      className="p-2 text-blue-500 bg-blue-50 rounded-xl ios-btn-active"
                    >
                      {editingMemberId === member.id ? <Check size={18}/> : <Edit2 size={18} />}
                    </button>
                    <button 
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-2 text-red-500 bg-red-50 rounded-xl ios-btn-active"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="p-4 border-t border-gray-50 space-y-4 mt-2">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: newMemberColor }} />
                  <input 
                    type="text" 
                    placeholder="Новый участник..." 
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="flex-1 bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-blue-100 text-[#1C1C1E]"
                  />
                  <button 
                    onClick={handleAddMember}
                    className="p-2.5 bg-blue-500 text-white rounded-xl ios-btn-active shadow-lg shadow-blue-500/20"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 px-1">
                  {PRESET_COLORS.map(c => (
                    <button 
                      key={c} 
                      onClick={() => setNewMemberColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${newMemberColor === c ? 'border-blue-500' : 'border-white shadow-sm'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="ml-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Виджеты на Обзоре</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 space-y-1">
              {DASHBOARD_WIDGETS.map(widget => (
                <button
                  key={widget.id}
                  onClick={() => toggleWidget(widget.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{widget.icon}</span>
                    <span className="text-sm font-bold">{widget.label}</span>
                  </div>
                  {settings.enabledWidgets.includes(widget.id) ? (
                    <CheckCircle2 size={24} className="text-blue-500 fill-blue-500/10" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-100" />
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="ml-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Диапазон времени (Планы)</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Начало дня</label>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-500" />
                      <input 
                        type="number" 
                        min="0" max="23" 
                        value={settings.dayStartHour} 
                        onChange={(e) => onUpdate({...settings, dayStartHour: Number(e.target.value)})}
                        className="bg-gray-50 w-full p-3 rounded-xl font-bold text-sm outline-none text-[#1C1C1E]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Конец дня</label>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-500" />
                      <input 
                        type="number" 
                        min="0" max="23" 
                        value={settings.dayEndHour} 
                        onChange={(e) => onUpdate({...settings, dayEndHour: Number(e.target.value)})}
                        className="bg-gray-50 w-full p-3 rounded-xl font-bold text-sm outline-none text-[#1C1C1E]"
                      />
                    </div>
                  </div>
               </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="ml-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Telegram Бот</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Bot Token (из @BotFather)</label>
                  <input 
                    type="password" 
                    value={settings.telegramBotToken} 
                    onChange={(e) => onUpdate({...settings, telegramBotToken: e.target.value})} 
                    className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-4 ring-blue-500/5 border border-transparent focus:border-blue-100 transition-all placeholder:text-gray-300 text-[#1C1C1E]"
                    placeholder="123456:ABC-DEF..."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Chat ID (личный или группы)</label>
                  <input 
                    type="text" 
                    value={settings.telegramChatId} 
                    onChange={(e) => onUpdate({...settings, telegramChatId: e.target.value})} 
                    className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-4 ring-blue-500/5 border border-transparent focus:border-blue-100 transition-all placeholder:text-gray-300 text-[#1C1C1E]"
                    placeholder="-100123456789"
                  />
                </div>
                <button 
                  onClick={() => onUpdate({ ...settings, autoSendEventsToTelegram: !settings.autoSendEventsToTelegram })}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${settings.autoSendEventsToTelegram ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <BellRing size={16} className={settings.autoSendEventsToTelegram ? 'text-blue-500' : 'text-gray-400'} />
                    <span className="text-xs font-bold">Авто-отправка событий</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.autoSendEventsToTelegram ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.autoSendEventsToTelegram ? 'left-6' : 'left-1'}`} />
                  </div>
                </button>
                <button 
                  onClick={testTelegramBot}
                  className="w-full py-4 bg-blue-50 text-blue-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  Проверить связь
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="ml-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Персонализация</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600"><User size={24} /></div>
                <div className="flex-1 text-left">
                  <span className="text-xs font-bold text-gray-400 block mb-1 uppercase tracking-wider">Название семьи</span>
                  <input type="text" value={settings.familyName} onChange={(e) => onUpdate({...settings, familyName: e.target.value})} className="w-full font-black outline-none focus:text-blue-500 bg-transparent text-[#1C1C1E]" />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="ml-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Процент в копилку</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Уровень сбережений</span>
                <span className="text-lg font-black text-blue-600">{savingsRate}%</span>
              </div>
              <input type="range" min="0" max="100" step="5" value={savingsRate} onChange={(e) => setSavingsRate(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>
          </section>

          <section className="pt-4">
            <button onClick={onReset} className="w-full p-6 flex items-center gap-4 text-red-500 bg-red-50/50 rounded-3xl border border-red-100 hover:bg-red-100 transition-colors">
              <Trash2 size={24} />
              <span className="font-black uppercase text-xs tracking-widest">Сбросить всё</span>
            </button>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;
