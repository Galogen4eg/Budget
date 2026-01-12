
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Copy, Bookmark, Send, Sparkles, Check, Loader2, Minus, Plus, Timer, ListChecks, CheckCircle2, Circle, Bell, Smartphone, Clock } from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember, ChecklistItem } from '../types';
import { MemberMarker } from '../constants';
import { auth } from '../firebase';

interface EventModalProps {
  event: FamilyEvent | null;
  prefill?: any;
  members: FamilyMember[];
  onClose: () => void;
  onSave: (e: FamilyEvent) => void;
  onDelete?: (id: string) => void;
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
  templates: FamilyEvent[];
  settings: AppSettings;
}

const PRESET_REMINDERS = [
  { label: '15 мин', value: 15 },
  { label: '1 час', value: 60 },
  { label: '2 часа', value: 120 },
  { label: '1 день', value: 1440 },
];

const EventModal: React.FC<EventModalProps> = ({ event, prefill, members, onClose, onSave, onDelete, onSendToTelegram, templates, settings }) => {
  const [title, setTitle] = useState(event?.title || prefill?.title || '');
  const [desc, setDesc] = useState(event?.description || '');
  const [date, setDate] = useState(event?.date || prefill?.date || (() => {
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
  })());
  const [time, setTime] = useState(event?.time || prefill?.time || '12:00');
  const [dur, setDur] = useState(event?.duration || 1);
  const [mIds, setMIds] = useState<string[]>(event?.memberIds || prefill?.memberIds || []);
  const [isT, setIsT] = useState(event?.isTemplate || false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(event?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [reminders, setReminders] = useState<number[]>(event?.reminders || []);
  
  // Custom Reminder State
  const [customRemValue, setCustomRemValue] = useState('');
  const [customRemUnit, setCustomRemUnit] = useState<'min' | 'hour' | 'day'>('min');
  
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleManualSend = async () => {
    const tempEvent: FamilyEvent = {
        id: event?.id || 'temp',
        title, description: desc, date, time, duration: dur, memberIds: mIds, isTemplate: isT, checklist, reminders
    };
    
    setLoading(true);
    const success = await onSendToTelegram(tempEvent);
    setLoading(false); 
    if (success) { 
        setSent(true); 
        setTimeout(() => setSent(false), 2000); 
    }
  };

  const applyTemplate = (t: FamilyEvent) => {
    setTitle(t.title);
    setDur(t.duration || 1);
    setMIds(t.memberIds || []);
    setChecklist(t.checklist || []);
    setReminders(t.reminders || []);
    setShowTemplates(false);
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false }]);
    setNewChecklistItem('');
  };

  const addReminder = (minutes: number) => {
    if (minutes <= 0) return;
    if (!reminders.includes(minutes)) {
        setReminders([...reminders, minutes].sort((a, b) => a - b));
    }
  };

  const removeReminder = (minutes: number) => {
    setReminders(reminders.filter(r => r !== minutes));
  };

  const addCustomReminder = () => {
      const val = parseInt(customRemValue);
      if (!val || val <= 0) return;
      
      let minutes = val;
      if (customRemUnit === 'hour') minutes = val * 60;
      if (customRemUnit === 'day') minutes = val * 1440;
      
      addReminder(minutes);
      setCustomRemValue('');
  };

  const formatReminderText = (minutes: number) => {
      if (minutes < 60) return `${minutes} мин`;
      if (minutes < 1440) {
          const h = Math.floor(minutes / 60);
          const m = minutes % 60;
          return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
      }
      const d = Math.floor(minutes / 1440);
      const h = Math.floor((minutes % 1440) / 60);
      return h > 0 ? `${d} д ${h} ч` : `${d} д`;
  };

  const validateAndSave = () => {
    const yearMatch = date.match(/^(\d+)-/);
    if (yearMatch && yearMatch[1].length > 4) { alert("Год должен содержать не более 4 цифр"); return; }
    if (!title.trim()) { alert("Введите название события"); return; }
    onSave({ 
      id: event?.id || Date.now().toString(), 
      title: title.trim(), 
      description: desc, 
      date, time, duration: dur, 
      memberIds: mIds, isTemplate: isT, checklist,
      reminders,
      userId: auth.currentUser?.uid
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white dark:bg-[#1C1C1E] p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5 relative z-20 shrink-0">
          <h3 className="text-xl font-black text-[#1C1C1E] dark:text-white">{event ? 'Редактировать' : 'Новое событие'}</h3>
          <div className="flex gap-2 items-center">
            <button type="button" onClick={handleManualSend} disabled={loading} className={`p-2.5 rounded-full transition-colors ${sent ? 'bg-green-500 text-white' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-500'}`}>
                {loading ? <Loader2 size={20} className="animate-spin"/> : sent ? <Check size={20}/> : <Send size={20} />}
            </button>
            {templates.length > 0 && (
              <button type="button" onClick={() => setShowTemplates(!showTemplates)} className={`p-2.5 rounded-full ${showTemplates ? 'bg-blue-500 text-white' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-500'}`}><Sparkles size={20} /></button>
            )}
            <button type="button" onClick={onClose} className="p-3 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500 dark:text-gray-300"><X size={22}/></button>
          </div>
        </div>

        <AnimatePresence>
            {showTemplates && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-white/5 overflow-hidden shrink-0">
                    <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar">
                        {templates.map(t => (
                            <button key={t.id} onClick={() => applyTemplate(t)} className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap">
                                {t.title}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] border border-white dark:border-white/5 shadow-sm space-y-4">
            <input type="text" placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} className="w-full text-2xl font-black outline-none bg-transparent border-none text-[#1C1C1E] dark:text-white" />
            <textarea placeholder="Описание..." value={desc} onChange={e => setDesc(e.target.value)} className="w-full text-sm font-medium outline-none bg-gray-50/50 dark:bg-[#2C2C2E] p-4 rounded-2xl resize-none h-24 text-[#1C1C1E] dark:text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-white dark:border-white/5">
               <span className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Дата</span>
               <input type="date" value={date} onChange={e => setDate(e.target.value)} max="9999-12-31" className="w-full font-black text-sm outline-none bg-transparent text-[#1C1C1E] dark:text-white" />
             </div>
             <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-white dark:border-white/5">
               <span className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Время начала</span>
               <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full font-black text-sm outline-none bg-transparent text-[#1C1C1E] dark:text-white" />
             </div>
          </div>

          <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-white dark:border-white/5">
             <span className="text-[10px] font-black text-gray-400 uppercase mb-3 block flex items-center gap-2"><Timer size={12}/> Продолжительность (часов)</span>
             <div className="flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl p-2">
                <button 
                    type="button" 
                    onClick={() => setDur(Math.max(0.5, dur - 0.5))}
                    className="w-10 h-10 bg-white dark:bg-[#1C1C1E] shadow-sm rounded-xl flex items-center justify-center text-gray-500 dark:text-white hover:text-blue-500 active:scale-95 transition-all"
                >
                    <Minus size={18} strokeWidth={3} />
                </button>
                <div className="flex items-baseline gap-1">
                    <input 
                        type="number" 
                        min="0.5" 
                        step="0.5" 
                        value={dur} 
                        onChange={e => setDur(parseFloat(e.target.value))}
                        className="font-black text-2xl bg-transparent text-center w-16 outline-none text-[#1C1C1E] dark:text-white"
                    />
                    <span className="font-bold text-gray-400 text-xs">ч.</span>
                </div>
                <button 
                    type="button" 
                    onClick={() => setDur(dur + 0.5)}
                    className="w-10 h-10 bg-white dark:bg-[#1C1C1E] shadow-sm rounded-xl flex items-center justify-center text-gray-500 dark:text-white hover:text-blue-500 active:scale-95 transition-all"
                >
                    <Plus size={18} strokeWidth={3} />
                </button>
             </div>
          </div>
          
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] border border-white dark:border-white/5 shadow-sm space-y-4">
             <div className="flex items-center justify-between mb-1">
               <div className="flex items-center gap-2">
                   <Bell size={16} className="text-orange-500" />
                   <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Напоминания</span>
               </div>
               <span className="text-[9px] text-gray-400 font-bold">{reminders.length} акт.</span>
             </div>

             {/* Active Reminders List */}
             {reminders.length > 0 && (
                 <div className="flex flex-wrap gap-2">
                     {reminders.map(r => (
                         <div key={r} className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border border-orange-100 dark:border-orange-900/30">
                             <span>За {formatReminderText(r)}</span>
                             <button onClick={() => removeReminder(r)} className="hover:text-red-500"><X size={12} strokeWidth={3}/></button>
                         </div>
                     ))}
                 </div>
             )}

             {/* Presets */}
             <div className="grid grid-cols-4 gap-2">
                {PRESET_REMINDERS.map(opt => (
                    <button 
                        key={opt.value} 
                        type="button" 
                        onClick={() => addReminder(opt.value)} 
                        disabled={reminders.includes(opt.value)}
                        className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all ${reminders.includes(opt.value) ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-300 opacity-50' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-500'}`} 
                    >
                        {opt.label}
                    </button>
                ))}
             </div>

             {/* Custom Input */}
             <div className="flex items-center bg-gray-50 dark:bg-[#2C2C2E] p-1 rounded-2xl">
                 <input 
                    type="number" 
                    placeholder="0" 
                    value={customRemValue}
                    onChange={e => setCustomRemValue(e.target.value)}
                    className="w-16 bg-transparent text-center font-black text-sm outline-none text-[#1C1C1E] dark:text-white"
                 />
                 <div className="flex bg-white dark:bg-[#1C1C1E] rounded-xl p-1 mx-2">
                     {(['min', 'hour', 'day'] as const).map(u => (
                         <button 
                            key={u} 
                            onClick={() => setCustomRemUnit(u)}
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-colors ${customRemUnit === u ? 'bg-orange-500 text-white' : 'text-gray-400'}`}
                         >
                             {u === 'min' ? 'Мин' : u === 'hour' ? 'Час' : 'Дни'}
                         </button>
                     ))}
                 </div>
                 <button 
                    onClick={addCustomReminder}
                    className="w-8 h-8 bg-white dark:bg-[#1C1C1E] rounded-xl flex items-center justify-center text-orange-500 shadow-sm active:scale-95 transition-transform ml-auto"
                 >
                     <Plus size={16} strokeWidth={3} />
                 </button>
             </div>
          </div>

          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] border border-white dark:border-white/5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks size={16} className="text-blue-500" />
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Чек-лист</span>
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Что нужно?" value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} onKeyPress={e => e.key === 'Enter' && addChecklistItem()} className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] px-4 py-3 rounded-xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white" />
              <button type="button" onClick={addChecklistItem} className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center"><Plus size={20} strokeWidth={3} /></button>
            </div>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-[#2C2C2E]/50 rounded-2xl">
                  <button type="button" onClick={() => setChecklist(checklist.map(i => i.id === item.id ? {...i, completed: !i.completed} : i))} className={`${item.completed ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`}>{item.completed ? <CheckCircle2 size={22} fill="currentColor" className="text-white dark:text-[#2C2C2E]" /> : <Circle size={22} />}</button>
                  <span className={`flex-1 text-sm font-bold ${item.completed ? 'line-through text-gray-400' : 'text-[#1C1C1E] dark:text-white'}`}>{item.text}</span>
                  <button type="button" onClick={() => setChecklist(checklist.filter(i => i.id !== item.id))} className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 px-2">
            <span className="text-[10px] font-black text-gray-400 uppercase">Участники</span>
            <div className="flex flex-wrap gap-4">{members.map(m => (<button key={m.id} type="button" onClick={() => setMIds(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])} className={`flex flex-col items-center gap-2 transition-all ${mIds.includes(m.id) ? 'opacity-100 scale-110' : 'opacity-40 grayscale scale-95'}`}><MemberMarker member={m} size="md" /><span className="text-[9px] font-black uppercase tracking-wider text-gray-400">{m.name}</span></button>))}</div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 shrink-0 space-y-3">
             <button type="button" onClick={() => validateAndSave()} className="w-full bg-blue-500 text-white font-black py-5 rounded-[1.8rem] uppercase text-xs flex items-center justify-center gap-2 active:scale-95 shadow-xl">
                <Check size={20} strokeWidth={3} /> {event ? 'Обновить' : 'Создать'}
             </button>
             {event && onDelete && (
                 <button type="button" onClick={() => onDelete(event.id)} className="w-full py-3 text-red-500 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors">
                    <Trash2 size={14}/> Удалить событие
                 </button>
             )}
        </div>
      </motion.div>
    </div>
  );
};

export default EventModal;
