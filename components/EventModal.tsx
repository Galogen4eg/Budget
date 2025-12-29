
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Copy, Bookmark, Send, Sparkles, Check, Loader2, Minus, Plus, Timer, ListChecks, CheckCircle2, Circle } from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember, ChecklistItem } from '../types';
import { MemberMarker } from '../App';

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
  
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleManualSend = async () => {
    if (!event) return; setLoading(true);
    const success = await onSendToTelegram(event);
    setLoading(false); if (success) { setSent(true); setTimeout(() => setSent(false), 2000); }
  };

  const applyTemplate = (t: FamilyEvent) => {
    setTitle(t.title);
    setDur(t.duration || 1);
    setMIds(t.memberIds || []);
    setChecklist(t.checklist || []);
    setShowTemplates(false);
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false }]);
    setNewChecklistItem('');
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
      memberIds: mIds, isTemplate: isT, checklist 
    });
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#1C1C1E]/20 backdrop-blur-md" />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative bg-[#F2F2F7] w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white p-6 flex justify-between items-center border-b border-gray-100 relative z-20">
          <h3 className="text-xl font-black text-[#1C1C1E]">{event ? 'Редактировать' : 'Новое событие'}</h3>
          <div className="flex gap-2 items-center">
            {templates.length > 0 && (
              <button type="button" onClick={() => setShowTemplates(!showTemplates)} className={`p-2.5 rounded-full ${showTemplates ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'}`}><Sparkles size={20} /></button>
            )}
            <button type="button" onClick={onClose} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-75 transition-all flex items-center justify-center text-gray-500"><X size={22}/></button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar pb-12">
          <div className="bg-white p-6 rounded-[2.5rem] border border-white shadow-sm space-y-4">
            <input type="text" placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} className="w-full text-2xl font-black outline-none bg-transparent border-none text-[#1C1C1E]" style={{ color: mIds.length > 0 ? (members.find(m => m.id === mIds[0])?.color) : '#1C1C1E' }} />
            <textarea placeholder="Описание..." value={desc} onChange={e => setDesc(e.target.value)} className="w-full text-sm font-medium outline-none bg-gray-50/50 p-4 rounded-2xl resize-none h-24 text-[#1C1C1E]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-5 rounded-[2rem] border border-white">
               <span className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Дата</span>
               <input type="date" value={date} onChange={e => setDate(e.target.value)} max="9999-12-31" className="w-full font-black text-sm outline-none bg-transparent text-[#1C1C1E]" />
             </div>
             <div className="bg-white p-5 rounded-[2rem] border border-white">
               <span className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Время начала</span>
               <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full font-black text-sm outline-none bg-transparent text-[#1C1C1E]" />
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-white shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks size={16} className="text-blue-500" />
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Чек-лист</span>
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Что нужно?" value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} onKeyPress={e => e.key === 'Enter' && addChecklistItem()} className="flex-1 bg-gray-50 px-4 py-3 rounded-xl text-sm font-bold outline-none text-[#1C1C1E]" />
              <button type="button" onClick={addChecklistItem} className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center"><Plus size={20} strokeWidth={3} /></button>
            </div>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl">
                  <button type="button" onClick={() => setChecklist(checklist.map(i => i.id === item.id ? {...i, completed: !i.completed} : i))} className={`${item.completed ? 'text-green-500' : 'text-gray-300'}`}>{item.completed ? <CheckCircle2 size={22} fill="currentColor" className="text-white" /> : <Circle size={22} />}</button>
                  <span className={`flex-1 text-sm font-bold ${item.completed ? 'line-through text-gray-400' : 'text-[#1C1C1E]'}`}>{item.text}</span>
                  <button type="button" onClick={() => setChecklist(checklist.filter(i => i.id !== item.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 px-2">
            <span className="text-[10px] font-black text-gray-400 uppercase">Участники</span>
            <div className="flex flex-wrap gap-4">{members.map(m => (<button key={m.id} type="button" onClick={() => setMIds(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])} className={`flex flex-col items-center gap-2 transition-all ${mIds.includes(m.id) ? 'opacity-100 scale-110' : 'opacity-40 grayscale scale-95'}`}><MemberMarker member={m} size="md" /><span className="text-[9px] font-black uppercase tracking-wider text-gray-400">{m.name}</span></button>))}</div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
             <button type="button" onClick={validateAndSave} className="w-full bg-blue-500 text-white font-black py-5 rounded-[1.8rem] uppercase text-xs flex items-center justify-center gap-2 active:scale-95 shadow-xl">
                <Check size={20} strokeWidth={3} /> {event ? 'Обновить' : 'Создать'}
             </button>
             {event && onDelete && (<button type="button" onClick={() => onDelete(event.id)} className="w-full py-4 text-red-500 font-black text-xs uppercase tracking-widest">Удалить событие</button>)}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EventModal;
