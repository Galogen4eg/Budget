
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

const REMINDER_OPTIONS = [
  { label: 'Нет', value: 0 },
  { label: 'За 15 мин', value: 15 },
  { label: 'За 1 час', value: 60 },
  { label: 'За 2 часа', value: 120 },
  { label: 'За 1 день', value: 1440 },
  { label: 'За 2 дня', value: 2880 },
];

const Switch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button type="button" onClick={onChange} className={`w-11 h-6 rounded-full p-1 transition-colors relative ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const EventModal: React.FC<EventModalProps> = ({ event, prefill, members, onClose, onSave, onDelete, onSendToTelegram, templates, settings }) => {
  const [title, setTitle] = useState(event?.title || prefill?.title || '');
  const [desc, setDesc] = useState(event?.description || '');
  const [date, setDate] = useState(event?.date || prefill?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(event?.time || prefill?.time || '12:00');
  const [dur, setDur] = useState(event?.duration || 1);
  const [mIds, setMIds] = useState<string[]>(event?.memberIds || prefill?.memberIds || []);
  const [isT, setIsT] = useState(event?.isTemplate || false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(event?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [reminders, setReminders] = useState<number[]>(event?.reminders || []);
  
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

  const toggleReminder = (minutes: number) => {
    if (minutes === 0) {
        setReminders([]);
        return;
    }
    if (reminders.includes(minutes)) {
        setReminders(reminders.filter(r => r !== minutes));
    } else {
        setReminders([...reminders, minutes]);
    }
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

  return createPortal(
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-[#1C1C1E]/20 dark:bg-black/60 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        exit={{ y: '100%' }} 
        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg md:max-w-4xl md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-[#1C1C1E] p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5 relative z-20 shrink-0">
          <h3 className="text-xl font-black text-[#1C1C1E] dark:text-white">{event ? 'Редактировать' : 'Новое событие'}</h3>
          <div className="flex gap-2 items-center">
            <button type="button" onClick={handleManualSend} disabled={loading} className={`p-2.5 rounded-full transition-colors ${sent ? 'bg-green-500 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}>
                {loading ? <Loader2 size={20} className="animate-spin"/> : sent ? <Check size={20}/> : <Send size={20} />}
            </button>
            {templates.length > 0 && (
              <button type="button" onClick={() => setShowTemplates(!showTemplates)} className={`p-2.5 rounded-full ${showTemplates ? 'bg-blue-500 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}><Sparkles size={20} /></button>
            )}
            <button type="button" onClick={onClose} className="p-3 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500 dark:text-gray-300"><X size={22}/></button>
          </div>
        </div>

        <AnimatePresence>
            {showTemplates && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-white/5 overflow-hidden shrink-0">
                    <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar">
                        {templates.map(t => (
                            <button key={t.id} onClick={() => applyTemplate(t)} className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap">
                                {t.title}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
          {/* Two-column layout for Desktop, Stacked for Mobile */}
          <div className="flex flex-col md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0 h-full">
            
            {/* Left Column */}
            <div className="space-y-6 flex-shrink-0">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] border border-white dark:border-white/5 shadow-sm space-y-4">
                    <input 
                        type="text" 
                        placeholder="Название" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        className="w-full text-2xl font-black outline-none bg-transparent border-none text-[#1C1C1E] dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600" 
                    />
                    <textarea 
                        placeholder="Описание..." 
                        value={desc} 
                        onChange={e => setDesc(e.target.value)} 
                        className="w-full text-sm font-medium outline-none bg-gray-50/50 dark:bg-[#2C2C2E] p-4 rounded-2xl resize-none h-24 text-[#1C1C1E] dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600" 
                    />
                    
                    {/* Save as Template Toggle */}
                    <div className="flex items-center justify-between px-2 pt-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Сохранить как шаблон</span>
                        <Switch checked={isT} onChange={() => setIsT(!isT)} />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] border border-white dark:border-white/5">
                        <span className="text-[9px] font-black text-gray-400 uppercase mb-2 block">Дата</span>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} max="9999-12-31" className="w-full font-black text-xs outline-none bg-transparent text-[#1C1C1E] dark:text-white dark:[color-scheme:dark]" />
                    </div>
                    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] border border-white dark:border-white/5">
                        <span className="text-[9px] font-black text-gray-400 uppercase mb-2 block">Время</span>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full font-black text-xs outline-none bg-transparent text-[#1C1C1E] dark:text-white dark:[color-scheme:dark]" />
                    </div>
                    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] border border-white dark:border-white/5">
                        <span className="text-[9px] font-black text-gray-400 uppercase mb-2 block">Длит. (ч)</span>
                        <input type="number" step="0.5" min="0.5" value={dur} onChange={e => setDur(Number(e.target.value))} className="w-full font-black text-xs outline-none bg-transparent text-[#1C1C1E] dark:text-white" />
                    </div>
                </div>
                
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] border border-white dark:border-white/5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Bell size={16} className="text-orange-500" />
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Напоминание (в Telegram)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {REMINDER_OPTIONS.map(opt => {
                            const isActive = opt.value === 0 ? reminders.length === 0 : reminders.includes(opt.value);
                            return (
                                <button key={opt.value} type="button" onClick={() => toggleReminder(opt.value)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isActive ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-400 dark:text-gray-500'}`} >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Column - Constrained height with internal scroll for checklist */}
            <div className="flex flex-col gap-6 h-full min-h-0">
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] border border-white dark:border-white/5 shadow-sm space-y-4 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                        <ListChecks size={16} className="text-blue-500" />
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Чек-лист</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <input 
                            type="text" 
                            placeholder="Что нужно?" 
                            value={newChecklistItem} 
                            onChange={e => setNewChecklistItem(e.target.value)} 
                            onKeyPress={e => e.key === 'Enter' && addChecklistItem()} 
                            className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] px-4 py-3 rounded-xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600" 
                        />
                        <button type="button" onClick={addChecklistItem} className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center shrink-0"><Plus size={20} strokeWidth={3} /></button>
                    </div>
                    
                    {/* Scrollable Checklist */}
                    <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar min-h-0 pr-1">
                        {checklist.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-[#2C2C2E]/50 rounded-2xl shrink-0">
                                <button type="button" onClick={() => setChecklist(checklist.map(i => i.id === item.id ? {...i, completed: !i.completed} : i))} className={`${item.completed ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`}>{item.completed ? <CheckCircle2 size={22} fill="currentColor" className="text-white dark:text-[#1C1C1E]" /> : <Circle size={22} />}</button>
                                <span className={`flex-1 text-sm font-bold ${item.completed ? 'line-through text-gray-400 dark:text-gray-600' : 'text-[#1C1C1E] dark:text-white'}`}>{item.text}</span>
                                <button type="button" onClick={() => setChecklist(checklist.filter(i => i.id !== item.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                        ))}
                        {checklist.length === 0 && (
                            <div className="text-center py-4 opacity-30 text-gray-400 text-xs font-bold uppercase tracking-widest">
                                Список пуст
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4 px-2 shrink-0">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Участники</span>
                    <div className="flex flex-wrap gap-4">{members.map(m => (<button key={m.id} type="button" onClick={() => setMIds(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])} className={`flex flex-col items-center gap-2 transition-all ${mIds.includes(m.id) ? 'opacity-100 scale-110' : 'opacity-40 grayscale scale-95'}`}><MemberMarker member={m} size="md" /><span className="text-[9px] font-black uppercase tracking-wider text-gray-400">{m.name}</span></button>))}</div>
                </div>
            </div>

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
    </div>,
    document.body
  );
};

export default EventModal;
