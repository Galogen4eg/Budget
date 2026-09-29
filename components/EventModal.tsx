import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Trash2, Send, Sparkles, Check, Loader2, Plus, 
  Calendar as CalendarIcon, Clock, AlertTriangle, ArrowRight,
  Bell, CheckSquare, Square
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember, ChecklistItem } from '../types';
import { auth } from '../firebase';
import { toast } from 'sonner';

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
  allEvents?: FamilyEvent[];
}

export const REMINDER_PRESETS = [
  { label: '15 мин', value: 15 },
  { label: '30 мин', value: 30 },
  { label: '1 час', value: 60 },
  { label: '2 часа', value: 120 },
  { label: '1 день', value: 1440 },
  { label: '2 дня', value: 2880 },
];

export const formatReminderLabel = (minutes: number): string => {
  if (minutes <= 0) return 'В момент события';
  if (minutes < 60) return `${minutes} мин`;
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    if (days === 1) return '1 день';
    if (days >= 2 && days <= 4) return `${days} дня`;
    if (days === 7) return '1 неделя';
    return `${days} дн.`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    if (hours === 1) return '1 час';
    if (hours >= 2 && hours <= 4) return `${hours} часа`;
    return `${hours} ч`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} ч ${m} мин`;
};

export const calculateEndTime = (startTime: string, durationHours: number): string => {
  const [h, m] = (startTime || '12:00').split(':').map(n => parseInt(n, 10) || 0);
  const totalMinutes = h * 60 + m + Math.round(durationHours * 60);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
};

export const EventModal: React.FC<EventModalProps> = ({ 
  event, 
  prefill, 
  members, 
  onClose, 
  onSave, 
  onDelete, 
  onSendToTelegram, 
  templates, 
  settings, 
  allEvents = [] 
}) => {
  const currentUserMemberId = useMemo(() => {
    return members.find(m => m.userId === auth.currentUser?.uid)?.id || members[0]?.id;
  }, [members]);

  const [title, setTitle] = useState(event?.title || prefill?.title || '');
  const [desc, setDesc] = useState(event?.description || '');
  const [date, setDate] = useState(event?.date || prefill?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(event?.time || prefill?.time || '12:00');
  const [dur, setDur] = useState<string | number>(event?.duration || 1);
  
  const [mIds, setMIds] = useState<string[]>(
    event?.memberIds || 
    prefill?.memberIds || 
    (currentUserMemberId ? [currentUserMemberId] : members.map(m => m.id))
  );

  const [isT, setIsT] = useState(event?.isTemplate || false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(event?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [reminders, setReminders] = useState<number[]>(event?.reminders || [60]);
  
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [conflictToConfirm, setConflictToConfirm] = useState<{ eventData: FamilyEvent; conflictingEvent: FamilyEvent } | null>(null);

  // Custom reminder state
  const [isCustomReminderOpen, setIsCustomReminderOpen] = useState(false);
  const [customReminderVal, setCustomReminderVal] = useState('30');
  const [customReminderUnit, setCustomReminderUnit] = useState<'min' | 'hour' | 'day'>('min');

  // Input refs for high-accuracy direct card triggers
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const handleDateCardClick = () => {
    try {
      dateInputRef.current?.showPicker();
    } catch {
      dateInputRef.current?.focus();
      dateInputRef.current?.click();
    }
  };

  const handleTimeCardClick = () => {
    try {
      timeInputRef.current?.showPicker();
    } catch {
      timeInputRef.current?.focus();
      timeInputRef.current?.click();
    }
  };

  // End time calculation
  const endTimeStr = useMemo(() => {
    const [h, m] = (time || '12:00').split(':').map(n => parseInt(n, 10) || 0);
    const durationHours = parseFloat(String(dur)) || 1;
    const totalMinutes = h * 60 + m + Math.round(durationHours * 60);
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }, [time, dur]);

  // Formatted date string for badge: e.g. "чт, 24 сент. 2026 г."
  const dateFormattedPill = useMemo(() => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const weekday = d.toLocaleString('ru-RU', { weekday: 'short' });
    const day = d.getDate();
    const month = d.toLocaleString('ru-RU', { month: 'short' });
    const year = d.getFullYear();
    return `${weekday}, ${day} ${month} ${year} г.`;
  }, [date]);

  // Formatted date string for 3-col box: "24.09.2026"
  const dateFormattedDot = useMemo(() => {
    const [y, m, d] = (date || '').split('-');
    if (!y || !m || !d) return date;
    return `${d}.${m}.${y}`;
  }, [date]);

  // Conflict detection
  const conflict = useMemo(() => {
    const [currH, currM] = (time || '12:00').split(':').map(t => parseInt(t, 10) || 0);
    const durationHours = parseFloat(String(dur)) || 1;
    const currStart = currH * 60 + currM;
    const currEnd = currStart + (durationHours * 60);

    for (const existing of allEvents) {
      if (existing.id === event?.id) continue;
      if (existing.date !== date) continue;

      const curMembers = mIds || [];
      const exMembers = existing.memberIds || [];
      
      let isMemberConflict = false;
      if (curMembers.length > 0 && exMembers.length > 0) {
        isMemberConflict = curMembers.some(mid => exMembers.includes(mid));
      } else {
        isMemberConflict = true;
      }
      
      if (!isMemberConflict) continue;

      const [exH, exM] = (existing.time || '00:00').split(':').map(t => parseInt(t, 10) || 0);
      const exStart = exH * 60 + exM;
      const exEnd = exStart + ((existing.duration || 1) * 60);

      if (currStart < exEnd && currEnd > exStart) {
        return existing;
      }
    }
    return null;
  }, [date, time, dur, mIds, allEvents, event?.id]);

  // Suggested conflict-free time slot
  const suggestedSlot = useMemo(() => {
    if (!conflict) return null;
    const [cStartH, cStartM] = (conflict.time || '12:00').split(':').map(t => parseInt(t, 10) || 0);
    const conflictEndMinutes = cStartH * 60 + cStartM + ((conflict.duration || 1) * 60);
    const slotH = Math.floor(conflictEndMinutes / 60) % 24;
    const slotM = conflictEndMinutes % 60;
    const suggestedTime = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
    const durationHours = parseFloat(String(dur)) || 1;
    const suggestedEndMinutes = slotH * 60 + slotM + Math.round(durationHours * 60);
    const suggestedEndH = Math.floor(suggestedEndMinutes / 60) % 24;
    const suggestedEndM = suggestedEndMinutes % 60;
    const suggestedEndTime = `${String(suggestedEndH).padStart(2, '0')}:${String(suggestedEndM).padStart(2, '0')}`;

    return {
      startTime: suggestedTime,
      endTime: suggestedEndTime,
      label: `${suggestedTime} – ${suggestedEndTime}`,
      description: 'Свободное время после завершения предыдущего события'
    };
  }, [conflict, dur]);

  const applySuggestedSlot = () => {
    if (suggestedSlot) {
      setTime(suggestedSlot.startTime);
    }
  };

  const handleManualSend = async () => {
    const finalDuration = parseFloat(String(dur)) || 1;
    const tempEvent: FamilyEvent = {
      id: event?.id || 'temp',
      title: title || 'Семейное событие',
      description: desc,
      date,
      time,
      duration: finalDuration,
      memberIds: mIds,
      isTemplate: isT,
      checklist,
      reminders
    };
    
    setLoading(true);
    const success = await onSendToTelegram(tempEvent);
    setLoading(false); 
    if (success) { 
      setSent(true); 
      setTimeout(() => setSent(false), 2000); 
    }
  };

  const addChecklistItem = (text?: string) => {
    const itemText = text || newChecklistItem.trim();
    if (!itemText) return;
    setChecklist([...checklist, { id: Date.now().toString(), text: itemText, completed: false }]);
    setNewChecklistItem('');
  };

  const toggleReminder = (minutes: number) => {
    if (minutes === 0) {
      setReminders([]);
      return;
    }
    setReminders(prev => {
      if (prev.includes(minutes)) {
        return prev.filter(r => r !== minutes);
      }
      return [...prev, minutes].sort((a, b) => a - b);
    });
  };

  const removeReminder = (minutes: number) => {
    setReminders(prev => prev.filter(r => r !== minutes));
  };

  const handleAddCustomReminder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseInt(customReminderVal, 10);
    if (isNaN(num) || num <= 0) {
      toast.error('Укажите корректное число');
      return;
    }
    const multiplier = customReminderUnit === 'day' ? 1440 : customReminderUnit === 'hour' ? 60 : 1;
    const totalMinutes = num * multiplier;

    if (!reminders.includes(totalMinutes)) {
      setReminders(prev => [...prev, totalMinutes].sort((a, b) => a - b));
      toast.success(`Добавлено: за ${formatReminderLabel(totalMinutes)}`);
    } else {
      toast.info('Такое напоминание уже есть в списке');
    }
    setIsCustomReminderOpen(false);
  };

  const toggleMember = (memberId: string) => {
    setMIds(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const applyTemplate = (t: FamilyEvent) => {
    setTitle(t.title);
    if (t.description) setDesc(t.description);
    if (t.duration) setDur(t.duration);
    if (t.checklist) setChecklist(t.checklist);
    if (t.memberIds) setMIds(t.memberIds);
    setShowTemplatesDropdown(false);
    toast.success(`Шаблон «${t.title}» применён`);
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Введите название события');
      return;
    }

    const finalDuration = parseFloat(String(dur)) || 1;
    const newEventData: FamilyEvent = {
      id: event?.id || Date.now().toString(),
      title: title.trim(),
      description: desc,
      date,
      time,
      duration: finalDuration,
      memberIds: mIds,
      isTemplate: isT,
      checklist,
      reminders,
      userId: auth.currentUser?.uid
    };

    if (conflict) {
      setConflictToConfirm({
        eventData: newEventData,
        conflictingEvent: conflict
      });
      return;
    }

    onSave(newEventData);
    onClose();
  };

  const handleConfirmConflictSave = () => {
    if (conflictToConfirm) {
      onSave(conflictToConfirm.eventData);
      setConflictToConfirm(null);
      onClose();
    }
  };

  const completedCount = checklist.filter(i => i.completed).length;
  const progressPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  // Duration label formatting
  const durationLabel = useMemo(() => {
    const dVal = parseFloat(String(dur)) || 1;
    if (dVal === 1) return '1 час';
    if (dVal === 1.5) return '1.5 ч';
    if (dVal === 2) return '2 часа';
    return `${dVal} ч`;
  }, [dur]);

  return createPortal(
    <div 
      className="fixed inset-0 z-[2000] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <main 
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[430px] sm:max-w-xl h-[92vh] max-h-[920px] bg-[#FAF8F5] dark:bg-[#18181A] rounded-t-[32px] sm:rounded-[28px] shadow-[0_-8px_30px_rgba(44,39,35,0.15),0_20px_40px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden border border-[#EAE5DB]/80 dark:border-white/10 relative animate-in slide-in-from-bottom-8 duration-300 text-[#2C2723] dark:text-gray-100"
      >
        {/* Mobile Pull Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1">
          <div aria-hidden="true" className="w-10 h-1 bg-[#E4DFD5] dark:bg-white/20 rounded-full" />
        </div>

        {/* Header Section */}
        <header className="px-5 pt-1.5 pb-3.5 border-b border-[#EAE5DB]/60 dark:border-white/10 bg-[#FAF8F5] dark:bg-[#18181A] shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Icon & Title Block */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#EAF2EC] dark:bg-[#4A7C59]/20 border border-[#CBD7CB]/70 dark:border-white/10 flex items-center justify-center text-[#4A7C59] dark:text-green-300 shadow-2xs shrink-0">
                <CalendarIcon size={22} strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="text-[19px] font-bold tracking-tight text-[#2C2723] dark:text-white leading-tight">
                  {event ? 'Редактирование' : 'Новое событие'}
                </h1>
                {templates && templates.length > 0 && !event && (
                  <button
                    type="button"
                    onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                    className="text-[11px] text-[#4A7C59] font-bold flex items-center gap-1 hover:underline mt-0.5 cursor-pointer"
                  >
                    <Calendar size={11} />
                    <span>Выбрать из шаблона</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Quick Action Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                type="button"
                onClick={handleManualSend} 
                disabled={loading} 
                aria-label="Быстрая отправка в Telegram"
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                  sent 
                    ? 'bg-emerald-600 text-white border-emerald-600' 
                    : 'bg-[#F5F2EB] dark:bg-white/10 border-[#EAE5DB] dark:border-white/10 text-stone-500 hover:text-[#4A7C59]'
                }`}
                title="Отправить в Telegram"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : sent ? <Check size={14} /> : <Send size={14} />}
              </button>
              <button 
                type="button"
                onClick={onClose} 
                aria-label="Закрыть"
                className="w-8 h-8 rounded-full bg-[#F5F2EB] dark:bg-white/10 border border-[#EAE5DB] dark:border-white/10 text-stone-500 hover:text-[#2C2723] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Optional template drawer */}
          {showTemplatesDropdown && templates && templates.length > 0 && (
            <div className="mt-3 p-2 bg-white dark:bg-[#252528] rounded-xl border border-[#EAE5DB] dark:border-white/10 space-y-1 max-h-36 overflow-y-auto no-scrollbar animate-in fade-in">
              <p className="text-[10px] font-extrabold uppercase text-stone-400 px-2 py-1">
                Сохраненные шаблоны:
              </p>
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="w-full text-left text-xs font-bold py-1.5 px-2.5 rounded-lg hover:bg-[#F5F2EB] dark:hover:bg-white/5 flex items-center justify-between text-[#2C2723] dark:text-white"
                >
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] text-[#4A7C59]">{t.duration || 1} ч</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 no-scrollbar">
          
          {/* Conflict Warning Banner */}
          {conflict && (
            <div className="rounded-2xl p-3.5 bg-[#FEF7EC] dark:bg-amber-950/40 border border-[#F3D5A5] dark:border-amber-800/40 shadow-xs flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-[#C58D33] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#705C30] dark:text-amber-300">
                      Пересечение в расписании
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#C58D33] text-white">
                      Конфликт
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 mt-0.5 leading-snug">
                    Уже назначено: «{conflict.title}» ({conflict.time})
                  </p>
                </div>
              </div>
              {suggestedSlot && (
                <button
                  type="button"
                  onClick={applySuggestedSlot}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#252528] border border-emerald-300 dark:border-emerald-800/50 hover:bg-emerald-50 text-left flex items-center justify-between shadow-2xs transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#4A7C59]">✨ Окно: {suggestedSlot.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#4A7C59] flex items-center gap-0.5">
                    <span>Сдвинуть</span>
                    <ArrowRight size={12} />
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Section 1: Event Name & Notes */}
          <section className="bg-white dark:bg-[#202022] rounded-2xl p-3.5 border border-[#EAE5DB] dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="event-title-input" className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-gray-400">
                Название события
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[12px] text-stone-500 hover:text-stone-800 dark:text-gray-400 select-none">
                <input 
                  type="checkbox"
                  checked={isT}
                  onChange={e => setIsT(e.target.checked)}
                  className="w-4 h-4 rounded text-[#4A7C59] focus:ring-[#4A7C59] border-[#EAE5DB] bg-[#FAF8F5] dark:bg-[#2C2C2E] cursor-pointer"
                />
                <span>Сохранить как шаблон</span>
              </label>
            </div>
            <div className="space-y-2">
              <input 
                id="event-title-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Например: Семейная поездка за город и пикник"
                className="w-full px-3.5 py-2.5 bg-[#F5F2EB]/60 hover:bg-[#F5F2EB] focus:bg-white dark:bg-[#252528] dark:focus:bg-[#2C2C2E] text-[14px] text-[#2C2723] dark:text-white placeholder:text-stone-400 font-medium rounded-xl border border-[#EAE5DB] dark:border-white/10 focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59] transition-all outline-none"
              />
              <textarea 
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={2}
                placeholder="Дополнительные детали, место встречи, ссылки или заметки..."
                className="w-full px-3.5 py-2 bg-[#F5F2EB]/40 hover:bg-[#F5F2EB] focus:bg-white dark:bg-[#252528] dark:focus:bg-[#2C2C2E] text-[13px] text-[#2C2723] dark:text-white placeholder:text-stone-400 rounded-xl border border-[#EAE5DB] dark:border-white/10 focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59] transition-all resize-none outline-none leading-relaxed"
              />
            </div>
          </section>

          {/* Section 2: Timing & Reminders */}
          <section className="bg-white dark:bg-[#202022] rounded-2xl p-3.5 border border-[#EAE5DB] dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-gray-400">
                Время и напоминания
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECE7DE] dark:bg-white/10 text-stone-700 dark:text-gray-300 border border-[#EAE5DB] dark:border-white/5">
                {dateFormattedPill}
              </span>
            </div>

            {/* 3-Column Mobile Input Grid with Full-Card Touch Target */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Date Box */}
              <div 
                onClick={handleDateCardClick}
                className="relative bg-[#F5F2EB]/60 hover:bg-[#EAE4D6]/70 dark:bg-[#252528] dark:hover:bg-[#2E2E32] p-2.5 rounded-xl border border-[#EAE5DB] dark:border-white/10 flex flex-col justify-between min-h-[62px] cursor-pointer transition active:scale-[0.98] group shadow-2xs"
                title="Нажмите в любое место, чтобы выбрать дату"
              >
                <div className="flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-gray-400">Дата</span>
                  <CalendarIcon size={14} className="text-stone-400 group-hover:text-[#4A7C59] transition shrink-0" />
                </div>
                <div className="flex justify-between gap-1 mt-1 items-end pointer-events-none">
                  <span className="text-[14px] font-bold text-[#2C2723] dark:text-white leading-none">
                    {dateFormattedDot}
                  </span>
                </div>
                {/* Standard native date picker covering the whole card */}
                <input 
                  ref={dateInputRef}
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
              </div>

              {/* Start Time Box */}
              <div 
                onClick={handleTimeCardClick}
                className="relative bg-[#F5F2EB]/60 hover:bg-[#EAE4D6]/70 dark:bg-[#252528] dark:hover:bg-[#2E2E32] p-2.5 rounded-xl border border-[#EAE5DB] dark:border-white/10 flex flex-col justify-between min-h-[62px] cursor-pointer transition active:scale-[0.98] group shadow-2xs"
                title="Нажмите в любое место, чтобы выбрать время начала"
              >
                <div className="flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-gray-400">Начало</span>
                  <Clock size={14} className="text-stone-400 group-hover:text-[#4A7C59] transition shrink-0" />
                </div>
                <div className="flex justify-between gap-1 mt-1 items-end pointer-events-none">
                  <span className="text-[14px] font-bold text-[#2C2723] dark:text-white leading-none">
                    {time}
                  </span>
                </div>
                {/* Standard native time picker covering the whole card */}
                <input 
                  ref={timeInputRef}
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
              </div>

              {/* Duration / End Time Box */}
              <div 
                className="relative bg-[#F5F2EB]/60 hover:bg-[#EAE4D6]/70 dark:bg-[#252528] dark:hover:bg-[#2E2E32] p-2.5 rounded-xl border border-[#EAE5DB] dark:border-white/10 flex flex-col justify-between min-h-[62px] cursor-pointer transition active:scale-[0.98] group shadow-2xs"
                title="Нажмите в любое место, чтобы выбрать длительность и время окончания"
              >
                <div className="flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-gray-400">Конец</span>
                  <span className="text-[10px] font-bold text-[#4A7C59] dark:text-green-400">{durationLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-1 mt-1 pointer-events-none">
                  <span className="text-[14px] font-bold text-[#2C2723] dark:text-white leading-none">
                    {endTimeStr}
                  </span>
                </div>
                <select
                  value={dur}
                  onChange={e => setDur(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                >
                  <option value="0.25">15 мин (до {calculateEndTime(time, 0.25)})</option>
                  <option value="0.5">30 мин (до {calculateEndTime(time, 0.5)})</option>
                  <option value="0.75">45 мин (до {calculateEndTime(time, 0.75)})</option>
                  <option value="1">1 час (до {calculateEndTime(time, 1)})</option>
                  <option value="1.5">1.5 часа (до {calculateEndTime(time, 1.5)})</option>
                  <option value="2">2 часа (до {calculateEndTime(time, 2)})</option>
                  <option value="2.5">2.5 часа (до {calculateEndTime(time, 2.5)})</option>
                  <option value="3">3 часа (до {calculateEndTime(time, 3)})</option>
                  <option value="4">4 часа (до {calculateEndTime(time, 4)})</option>
                  <option value="5">5 часов (до {calculateEndTime(time, 5)})</option>
                  <option value="6">6 часов (до {calculateEndTime(time, 6)})</option>
                  <option value="8">8 часов (до {calculateEndTime(time, 8)})</option>
                  <option value="12">12 часов (до {calculateEndTime(time, 12)})</option>
                  <option value="24">Весь день (24 ч)</option>
                </select>
              </div>
            </div>

            {/* Telegram Multiple Reminders Selector */}
            <div className="pt-2.5 border-t border-[#EAE5DB]/60 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bell size={14} className="text-[#4A7C59]" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400 dark:text-gray-400">
                    Напоминания в Telegram:
                  </span>
                </div>
                {reminders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setReminders([])}
                    className="text-[10px] font-bold text-stone-400 hover:text-red-500 transition cursor-pointer"
                  >
                    Очистить все
                  </button>
                )}
              </div>

              {/* Active Reminders Chips */}
              {reminders.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {reminders.map(mins => (
                    <span 
                      key={`active-reminder-${mins}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EAF2EC] dark:bg-[#4A7C59]/25 text-[#2A6038] dark:text-green-300 border border-[#CBD7CB]/80 dark:border-white/10 text-xs font-bold animate-in fade-in"
                    >
                      <Bell size={11} className="shrink-0" />
                      <span>за {formatReminderLabel(mins)}</span>
                      <button
                        type="button"
                        onClick={() => removeReminder(mins)}
                        className="hover:bg-[#CBD7CB] dark:hover:bg-white/10 rounded p-0.5 ml-0.5 text-stone-500 dark:text-stone-300 cursor-pointer"
                        title="Удалить это напоминание"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-stone-400 dark:text-stone-500 italic">
                  Напоминания не заданы (уведомление придет только при сохранении события)
                </p>
              )}

              {/* Preset Buttons Grid + Custom Adder Button */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {REMINDER_PRESETS.map(opt => {
                  const isActive = reminders.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleReminder(opt.value)}
                      className={`py-1.5 px-2.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center whitespace-nowrap active:scale-95 ${
                        isActive
                          ? 'bg-[#4A7C59] text-white shadow-xs'
                          : 'bg-[#F5F2EB]/80 dark:bg-[#252528] text-stone-600 dark:text-gray-300 hover:bg-[#EAE5DB] dark:hover:bg-white/10 border border-[#EAE5DB]/60 dark:border-white/5'
                      }`}
                    >
                      {isActive ? `✓ ${opt.label}` : `+ ${opt.label}`}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsCustomReminderOpen(!isCustomReminderOpen)}
                  className={`py-1.5 px-2.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                    isCustomReminderOpen
                      ? 'bg-[#2C2723] text-white dark:bg-white dark:text-black'
                      : 'bg-[#F5F2EB] dark:bg-[#252528] text-[#4A7C59] dark:text-emerald-400 border border-[#CBD7CB]/60 dark:border-white/10 hover:bg-[#EAE5DB]'
                  }`}
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <span>Своё...</span>
                </button>
              </div>

              {/* Custom Reminder Inline Form */}
              {isCustomReminderOpen && (
                <form 
                  onSubmit={handleAddCustomReminder}
                  className="p-3 bg-[#F5F2EB]/90 dark:bg-[#252528] rounded-xl border border-[#CBD7CB] dark:border-white/10 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-300 shrink-0">За:</span>
                  <input 
                    type="number"
                    min="1"
                    max="365"
                    value={customReminderVal}
                    onChange={e => setCustomReminderVal(e.target.value)}
                    className="w-16 px-2.5 py-1.5 bg-white dark:bg-[#1E1E20] border border-[#EAE5DB] dark:border-white/10 rounded-lg text-xs font-bold text-[#2C2723] dark:text-white outline-none focus:ring-1 focus:ring-[#4A7C59]"
                    placeholder="30"
                    autoFocus
                  />
                  <select
                    value={customReminderUnit}
                    onChange={e => setCustomReminderUnit(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white dark:bg-[#1E1E20] border border-[#EAE5DB] dark:border-white/10 rounded-lg text-xs font-bold text-[#2C2723] dark:text-white outline-none cursor-pointer"
                  >
                    <option value="min">минут</option>
                    <option value="hour">часов</option>
                    <option value="day">дней</option>
                  </select>
                  <button
                    type="submit"
                    disabled={!customReminderVal}
                    className="px-3 py-1.5 bg-[#4A7C59] hover:bg-[#3D6849] text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer shrink-0"
                  >
                    Добавить
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomReminderOpen(false)}
                    className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* Section 3: Split Row / Grid for Participants & Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Participants Section */}
            <section className="bg-white dark:bg-[#202022] rounded-2xl p-3.5 border border-[#EAE5DB] dark:border-white/10 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-gray-400">
                    Участники события
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF2EC] dark:bg-[#4A7C59]/20 text-[#4A7C59] dark:text-green-300 border border-[#CBD7CB]">
                    {mIds.length} выбрано
                  </span>
                </div>

                <div className="space-y-2">
                  {members.map(m => {
                    const isSelected = mIds.includes(m.id);
                    const initial = m.name ? m.name.charAt(0).toUpperCase() : 'У';

                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleMember(m.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#4A7C59]/60 bg-[#EAF2EC]/40 dark:bg-[#4A7C59]/20'
                            : 'border-[#EAE5DB] dark:border-white/5 bg-[#F5F2EB]/30 dark:bg-white/5 opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-[13px] shadow-2xs"
                            style={{ backgroundColor: m.color || '#4A7C59' }}
                          >
                            {initial}
                          </div>
                          <div>
                            <h3 className="text-[13px] font-bold text-[#2C2723] dark:text-white leading-tight">
                              {m.name}
                            </h3>
                            <p className="text-[10px] text-stone-500 dark:text-gray-400 font-medium">
                              {isSelected ? 'Уведомление активно' : 'Не участвует'}
                            </p>
                          </div>
                        </div>

                        {/* Selection Checkmark */}
                        <div 
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected 
                              ? 'border-[#4A7C59] bg-[#4A7C59] text-white' 
                              : 'border-[#E4DFD5] dark:border-white/20 bg-white dark:bg-[#252528]'
                          }`}
                        >
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Checklist Section */}
            <section className="bg-white dark:bg-[#202022] rounded-2xl p-3.5 border border-[#EAE5DB] dark:border-white/10 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-gray-400">
                  Чек-лист и подготовка
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-stone-400">
                    {completedCount} из {checklist.length} готово
                  </span>
                  <div className="w-10 h-1.5 bg-[#F5F2EB] dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#4A7C59] rounded-full transition-all" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Add Input */}
              <div className="flex items-center gap-1.5 mb-2.5">
                <input 
                  type="text"
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                  placeholder="Что нужно подготовить?"
                  className="flex-1 px-3 py-1.5 text-[12px] bg-[#F5F2EB]/60 dark:bg-[#252528] rounded-xl border border-[#EAE5DB] dark:border-white/10 focus:border-[#4A7C59] focus:bg-white dark:focus:bg-[#2C2C2E] text-[#2C2723] dark:text-white placeholder:text-stone-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => addChecklistItem()}
                  aria-label="Добавить задачу"
                  className="w-7 h-7 bg-[#4A7C59] text-white rounded-lg flex items-center justify-center hover:bg-[#3C6548] active:scale-95 transition-all shadow-2xs cursor-pointer"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Quick Suggestion Tags */}
              <div className="flex items-center gap-1 text-[10px] text-stone-400 mb-2.5 flex-wrap">
                <span className="font-semibold text-stone-600 dark:text-gray-300">Быстро:</span>
                <button 
                  type="button" 
                  onClick={() => addChecklistItem('Взять билеты')} 
                  className="px-1.5 py-0.5 rounded-md bg-[#F5F2EB] dark:bg-white/10 hover:bg-[#EAE5DB] text-stone-700 dark:text-gray-200 transition-colors cursor-pointer"
                >
                  Взять билеты
                </button>
                <button 
                  type="button" 
                  onClick={() => addChecklistItem('Купить фрукты')} 
                  className="px-1.5 py-0.5 rounded-md bg-[#F5F2EB] dark:bg-white/10 hover:bg-[#EAE5DB] text-stone-700 dark:text-gray-200 transition-colors cursor-pointer"
                >
                  Купить фрукты
                </button>
                <button 
                  type="button" 
                  onClick={() => addChecklistItem('Собрать термос')} 
                  className="px-1.5 py-0.5 rounded-md bg-[#F5F2EB] dark:bg-white/10 hover:bg-[#EAE5DB] text-stone-700 dark:text-gray-200 transition-colors cursor-pointer"
                >
                  Собрать термос
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                {checklist.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#F5F2EB]/40 dark:bg-white/5"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input 
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => setChecklist(checklist.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i))}
                        className="w-3.5 h-3.5 rounded text-[#4A7C59] focus:ring-[#4A7C59] cursor-pointer"
                      />
                      <span className={`text-[12px] truncate ${item.completed ? 'line-through text-stone-400' : 'text-[#2C2723] dark:text-white'}`}>
                        {item.text}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setChecklist(checklist.filter(i => i.id !== item.id))}
                      className="text-stone-400 hover:text-red-500 p-0.5 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {checklist.length === 0 && (
                  <p className="text-center py-2 text-[11px] text-stone-400 italic">
                    Чек-лист пуст. Добавьте пункты выше.
                  </p>
                )}
              </div>
            </section>
          </div>

        </div>

        {/* Footer Actions */}
        <footer className="p-3.5 bg-white dark:bg-[#202022] border-t border-[#EAE5DB]/60 dark:border-white/10 shrink-0 flex items-center justify-between gap-2.5">
          <div>
            {event && onDelete && (
              !isConfirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDelete(event.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Удалить?
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2 py-1.5 rounded-lg text-stone-400 text-[11px] cursor-pointer"
                  >
                    Нет
                  </button>
                </div>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-[13px] text-stone-500 hover:text-stone-800 hover:bg-[#F5F2EB] active:bg-[#EAE5DB] transition-colors uppercase tracking-wider cursor-pointer"
            >
              Отмена
            </button>
            <button 
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl font-bold text-[13px] bg-[#4A7C59] hover:bg-[#3C6548] text-white shadow-2xs flex items-center justify-center gap-1.5 uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer"
            >
              <Check size={16} strokeWidth={2.8} />
              <span>{event ? 'Сохранить' : 'Создать событие'}</span>
            </button>
          </div>
        </footer>

        {/* Conflict Detection Confirmation Dialog */}
        {conflictToConfirm && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white dark:bg-[#1E1E20] rounded-2xl p-5 shadow-2xl border border-amber-200 dark:border-amber-800/60 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white leading-tight">
                    Пересечение по времени
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Событие совпадает по времени с уже запланированным:
                  </p>
                </div>
              </div>

              <div className="bg-[#FAF7F2] dark:bg-white/5 p-3 rounded-xl border border-[#EAE5DB] dark:border-white/10 space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-stone-800 dark:text-stone-200">
                  <span className="truncate pr-2">«{conflictToConfirm.conflictingEvent.title}»</span>
                  <span className="shrink-0 text-amber-600 dark:text-amber-400 font-mono">
                    {conflictToConfirm.conflictingEvent.time || '12:00'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 dark:text-stone-500">
                  Ваше событие: <span className="font-medium text-stone-700 dark:text-stone-300 font-mono">{time} – {endTimeStr}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConflictToConfirm(null)}
                  className="px-3 py-2.5 rounded-xl border border-stone-300 dark:border-white/10 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  Изменить время
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConflictSave}
                  className="px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  Пересекать
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>,
    document.body
  );
};

export default EventModal;
