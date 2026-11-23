import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Trash2, Send, Check, Loader2, Plus, 
  Calendar as CalendarIcon, Clock, AlertTriangle, ArrowRight,
  Bell, Bookmark
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember, ChecklistItem } from '../types';
import { auth } from '../firebase';
import { toast } from 'sonner';
import { formatLocalCalendarDate, parseLocalCalendarDate, eventDateTime } from '../utils/calendarDates';
import { findEventConflicts } from '../utils/eventConflicts';
import { buildCalendarOccurrences } from '../utils/familyPlanEngine';

interface EventModalProps {
  event: FamilyEvent | null;
  prefill?: any;
  members: FamilyMember[];
  onClose: () => void;
  onSave: (e: FamilyEvent) => Promise<void>;
  onDelete?: (id: string, scope?: 'single'|'series') => Promise<void>;
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
  { label: '1 день', value: 1440 }
];

export const formatReminderLabel = (minutes: number): string => {
  if (minutes <= 0) return 'В момент события';
  if (minutes < 60) return `${minutes} мин`;
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    if (days === 1) return '1 день';
    if (days >= 2 && days <= 4) return `${days} дня`;
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
  const safeDuration = Number.isFinite(durationHours) ? Math.max(0.25, durationHours) : 1;
  const totalMinutes = Math.max(0, h * 60 + m + Math.round(safeDuration * 60));
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
  templates = [], 
  allEvents = [] 
}) => {
  const currentUserMemberId = useMemo(() => {
    return members.find(m => m.userId && m.userId === auth.currentUser?.uid)?.id;
  }, [members]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [title, setTitle] = useState(event?.title || prefill?.title || '');
  const [desc, setDesc] = useState(event?.description || '');
  const [date, setDate] = useState(event?.date || prefill?.date || formatLocalCalendarDate(new Date()));
  const [time, setTime] = useState(event?.time || prefill?.time || '12:00');
  const [dur, setDur] = useState<string | number>(event?.duration || 1);
  
  const [mIds, setMIds] = useState<string[]>(
    event?.memberIds || 
    prefill?.memberIds || 
    (currentUserMemberId ? [currentUserMemberId] : [])
  );

  const [isT, setIsT] = useState(event?.isTemplate || false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(event?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [reminders, setReminders] = useState<number[]>(event?.reminders || [60]);
  const [kind,setKind]=useState<'event'|'task'>(event?.kind||prefill?.kind||'event');
  const [recurrence,setRecurrence]=useState<NonNullable<FamilyEvent['recurrence']>>(event?.recurrence||'none');
  const [recurrenceUntil,setRecurrenceUntil]=useState(event?.recurrenceUntil||'');
  const [completed,setCompleted]=useState(Boolean(event?.completed));
  const [editScope,setEditScope]=useState<'single'|'series'>(event?.seriesId?'single':'series');
  
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [conflictToConfirm, setConflictToConfirm] = useState<{ eventData: FamilyEvent; conflictingEvent: FamilyEvent } | null>(null);

  // Custom reminder state
  const [isCustomReminderOpen, setIsCustomReminderOpen] = useState(false);
  const [customReminderVal, setCustomReminderVal] = useState('30');
  const [customReminderUnit, setCustomReminderUnit] = useState<'min' | 'hour' | 'day'>('min');

  // Input refs to allow clicking anywhere on the card to open native pickers
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDate = () => {
    try {
      dateInputRef.current?.showPicker();
    } catch {
      dateInputRef.current?.focus();
    }
  };

  const handleOpenTime = () => {
    try {
      timeInputRef.current?.showPicker();
    } catch {
      timeInputRef.current?.focus();
    }
  };

  // Short weekday for date badge
  const shortWeekday = useMemo(() => {
    let d: Date;
    try { d = parseLocalCalendarDate(date); }
    catch { return ''; }
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', { weekday: 'short' });
  }, [date]);

  // End time calculation
  const endTimeStr = useMemo(() => {
    return calculateEndTime(time, parseFloat(String(dur)) || 1);
  }, [time, dur]);

  // Expand recurring events around the date being edited before checking conflicts.
  const conflict = useMemo(() => {
    let around:FamilyEvent[];
    try{
      const startDate=parseLocalCalendarDate(date);
      startDate.setDate(startDate.getDate()-1);
      const endDate=parseLocalCalendarDate(date);
      endDate.setDate(endDate.getDate()+2);
      around=buildCalendarOccurrences(allEvents,formatLocalCalendarDate(startDate),formatLocalCalendarDate(endDate));
    }catch{return null;}
    const seriesId=event?.seriesId||event?.id;
    const rest=around.filter(existing=>
      existing.id!==event?.id && (!seriesId || (existing.seriesId||existing.id)!==seriesId)
    );
    const candidate:FamilyEvent={
      id:event?.id||'__calendar_pending__',title,description:desc,date,time,
      duration:parseFloat(String(dur))||1,memberIds:mIds
    };
    const pair=findEventConflicts([...rest,candidate]).conflictPairs.find(
      entry=>entry.eventA.id===candidate.id||entry.eventB.id===candidate.id
    );
    return pair?(pair.eventA.id===candidate.id?pair.eventB:pair.eventA):null;
  },[date,time,dur,mIds,allEvents,event?.id,event?.seriesId]);


  // Suggested conflict-free slot
  const suggestedSlot = useMemo(() => {
    if (!conflict) return null;
    try {
      const conflictEnd = eventDateTime(conflict.date, conflict.time || '00:00');
      conflictEnd.setMinutes(conflictEnd.getMinutes() + Math.round((conflict.duration || 1) * 60));
      const slotDate = formatLocalCalendarDate(conflictEnd);
      const suggestedTime = `${String(conflictEnd.getHours()).padStart(2, '0')}:${String(conflictEnd.getMinutes()).padStart(2, '0')}`;
      const end = new Date(conflictEnd);
      end.setMinutes(end.getMinutes() + Math.round((parseFloat(String(dur)) || 1) * 60));
      const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
      return { date: slotDate, startTime: suggestedTime, endTime, label: `${suggestedTime} – ${endTime}` };
    } catch {
      return null;
    }
  }, [conflict, dur]);

  const applySuggestedSlot = () => {
    if (suggestedSlot) {
      setDate(suggestedSlot.date);
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

  const persistEvent = async (data: FamilyEvent) => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Event save failed:', error);
      setSaveError('Не удалось сохранить событие. Проверьте подключение и повторите попытку.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Введите название события');
      return;
    }
    try {
      parseLocalCalendarDate(date);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Некорректное время');
    } catch {
      toast.error('Проверьте дату и время события');
      return;
    }


    const finalDuration = parseFloat(String(dur)) || 1;
    if (recurrence !== 'none' && recurrenceUntil) {
      try {
        parseLocalCalendarDate(recurrenceUntil);
      } catch {
        toast.error('Укажите корректную дату окончания повторения');
        return;
      }
      if (recurrenceUntil && recurrenceUntil < date) {
        toast.error('Конец повторения не может быть раньше начала события');
        return;
      }
    }
    const seriesId=event?.seriesId||event?.id;
    const isSingle=Boolean(event && seriesId && (event?.seriesId||event.recurrence&&event.recurrence!=='none') && editScope==='single');
    const baseSeries=allEvents.find(e=>e.id===seriesId);
    const newEventData: FamilyEvent = {
      id: isSingle ? `${seriesId}::${event?.occurrenceDate||event?.date}` : (seriesId||Date.now().toString()),
      title: title.trim(),
      description: desc,
      date:!isSingle&&event?.seriesId&&baseSeries?baseSeries.date:date,
      time,
      duration: finalDuration,
      memberIds: mIds,
      isTemplate: isT,
      checklist,
      reminders,
      kind,
      completed:kind==='task'?completed:false,
      recurrence:isSingle?'none':recurrence,
      ...(recurrence!=='none'&&!isSingle&&recurrenceUntil?{recurrenceUntil}:{}),
      ...(isSingle?{seriesId,occurrenceDate:event?.occurrenceDate||event?.date}:{ }),
      userId: auth.currentUser?.uid,
    };

    if (conflict) {
      setConflictToConfirm({
        eventData: newEventData,
        conflictingEvent: conflict
      });
      return;
    }

    void persistEvent(newEventData);
  };

  const handleConfirmConflictSave = () => {
    if (conflictToConfirm) {
      const data = conflictToConfirm.eventData;
      setConflictToConfirm(null);
      void persistEvent(data);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[2000] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <main 
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[520px] md:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[calc(100dvh-env(safe-area-inset-top,0px))] md:max-h-[88dvh] min-h-0 bg-[#FAF8F5] dark:bg-[#18181A] rounded-t-[28px] md:rounded-3xl shadow-2xl flex flex-col border-0 md:border border-[#EAE5DB] dark:border-white/10 relative animate-in slide-in-from-bottom-6 duration-200 text-[#2C2723] dark:text-gray-100 overflow-hidden"
      >
        {/* Mobile Pull Handle */}
        <div className="w-full flex justify-center pt-2 md:hidden shrink-0">
          <div aria-hidden="true" className="w-9 h-1 bg-[#E4DFD5] dark:bg-white/20 rounded-full" />
        </div>

        {/* Header Section: Compact with Always Visible Templates Button */}
        <header className="px-4 md:px-7 py-3 md:py-3.5 border-b border-[#EAE5DB]/60 dark:border-white/10 bg-[#FAF8F5] dark:bg-[#18181A] shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EAF2EC] dark:bg-[#4A7C59]/20 border border-[#CBD7CB]/70 dark:border-white/10 flex items-center justify-center text-[#4A7C59] dark:text-green-300 shrink-0">
                <CalendarIcon size={18} strokeWidth={2.2} />
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#2C2723] dark:text-white leading-tight">
                {event ? 'Редактировать план' : 'Новый план'}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Visible Templates Selector Button */}
              <button
                type="button"
                onClick={() => {
                  if (!templates || templates.length === 0) {
                    toast.info('Шаблонов пока нет. Отметьте «Шаблон» при сохранении события, чтобы сохранить его в заготовки.');
                  } else {
                    setShowTemplatesDropdown(!showTemplatesDropdown);
                  }
                }}
                aria-expanded={showTemplatesDropdown}
                className={`min-h-[44px] px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] transition-colors cursor-pointer ${
                  showTemplatesDropdown
                    ? 'bg-[#4A7C59] text-white shadow-2xs'
                    : 'bg-[#F5F2EB] dark:bg-white/10 text-[#4A7C59] dark:text-emerald-400 hover:bg-[#EAE5DB] border border-[#CBD7CB]/60 dark:border-white/10'
                }`}
                title="Выбрать событие из шаблона"
              >
                <Bookmark size={13} />
                <span>Шаблоны {templates && templates.length > 0 ? `(${templates.length})` : ''}</span>
              </button>

              <button 
                type="button"
                onClick={handleManualSend} 
                disabled={loading} 
                aria-label="Отправить событие в Telegram"
                className={`w-11 h-11 rounded-full border flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] transition-colors cursor-pointer ${
                  sent 
                    ? 'bg-emerald-600 text-white border-emerald-600' 
                    : 'bg-[#F5F2EB] dark:bg-white/10 border-[#EAE5DB] dark:border-white/10 text-stone-500 hover:text-[#4A7C59]'
                }`}
                title="Отправить в Telegram"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : sent ? <Check size={13} /> : <Send size={13} />}
              </button>
              <button 
                type="button"
                onClick={onClose} 
                aria-label="Закрыть редактор события"
                className="w-11 h-11 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] bg-[#F5F2EB] dark:bg-white/10 border border-[#EAE5DB] dark:border-white/10 text-stone-500 hover:text-[#2C2723] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {showTemplatesDropdown && templates && templates.length > 0 && (
            <div className="mt-2 p-1.5 bg-white dark:bg-[#252528] rounded-xl border border-[#EAE5DB] dark:border-white/10 space-y-1 max-h-32 overflow-y-auto no-scrollbar animate-in fade-in">
              <div className="text-[10px] font-extrabold uppercase text-stone-400 px-2 py-0.5">Выберите шаблон:</div>
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="w-full text-left text-xs font-bold py-1.5 px-2 rounded-lg hover:bg-[#F5F2EB] dark:hover:bg-white/5 flex items-center justify-between text-[#2C2723] dark:text-white cursor-pointer"
                >
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] text-[#4A7C59]">{t.duration || 1} ч</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Scrollable Form Body: 2 Columns on Desktop, 1 Column on Mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-7 py-3 md:py-4 space-y-3.5 custom-scrollbar">
          
          <section className="space-y-2 rounded-xl border border-[#EAE5DB] dark:border-white/10 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-xs font-semibold dark:text-white">Тип
                <select value={kind} onChange={e=>setKind(e.target.value as 'event'|'task')}
                  className="mt-1 w-full min-h-[44px] rounded-lg p-2 bg-[#F5F2EB] dark:bg-[#252528] dark:text-white">
                  <option value="event">Событие</option><option value="task">Совместная задача</option>
                </select>
              </label>
              <label className="text-xs font-semibold dark:text-white">Повторять
                <select value={recurrence} onChange={e=>setRecurrence(e.target.value as NonNullable<FamilyEvent['recurrence']>)}
                  disabled={editScope==='single'&&Boolean(event)}
                  className="mt-1 w-full min-h-[44px] rounded-lg p-2 bg-[#F5F2EB] dark:bg-[#252528] dark:text-white">
                  <option value="none">Не повторять</option>
                  <option value="daily">Ежедневно</option><option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option><option value="yearly">Ежегодно</option>
                </select>
              </label>
            </div>
            {recurrence!=='none'&&editScope!=='single'&&
              <label className="block text-xs font-semibold dark:text-white">Повторять до (необязательно)
                <input type="date" value={recurrenceUntil} onChange={e=>setRecurrenceUntil(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-lg p-2 bg-[#F5F2EB] dark:bg-[#252528] dark:text-white"/>
              </label>}
            {event&&(Boolean(event.seriesId)||Boolean(event.recurrence&&event.recurrence!=='none'))&&
              <fieldset className="flex flex-wrap gap-3 text-xs dark:text-white">
                <legend className="font-semibold mb-1">Что изменить?</legend>
                <label className="min-h-[44px] flex items-center gap-2 px-3 rounded-lg border border-[#EAE5DB] dark:border-white/10 cursor-pointer focus-within:ring-2 focus-within:ring-primary"><input type="radio" name="calendar-edit-scope" checked={editScope==='single'} onChange={()=>setEditScope('single')}/>Только этот раз</label>
                <label className="min-h-[44px] flex items-center gap-2 px-3 rounded-lg border border-[#EAE5DB] dark:border-white/10 cursor-pointer focus-within:ring-2 focus-within:ring-primary"><input type="radio" name="calendar-edit-scope" checked={editScope==='series'} onChange={()=>setEditScope('series')}/>Всю серию</label>
              </fieldset>}
            {kind==='task'&&
              <label className="flex items-center gap-2 text-xs font-medium dark:text-white">
                <input type="checkbox" checked={completed} onChange={e=>setCompleted(e.target.checked)}/>
                Задача выполнена
              </label>}
          </section>
          {/* Conflict Warning Banner (if any) */}
          {conflict && (
            <div className="rounded-xl p-2.5 bg-[#FEF7EC] dark:bg-amber-950/40 border border-[#F3D5A5] dark:border-amber-800/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={15} className="text-[#C58D33] shrink-0" />
                <span className="text-xs text-stone-800 dark:text-stone-200 truncate">
                  Конфликт: «{conflict.title}» ({conflict.time})
                </span>
              </div>
              {suggestedSlot && (
                <button
                  type="button"
                  onClick={applySuggestedSlot}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-[#252528] border border-emerald-300 dark:border-emerald-800/50 text-[11px] font-bold text-[#4A7C59] flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Сдвинуть: {suggestedSlot.startTime}</span>
                  <ArrowRight size={11} />
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 md:gap-4">
            
            {/* Left Column (md: 7 cols): Main Event Info, Timing, Participants */}
            <div className="md:col-span-7 space-y-3.5">
              
              {/* Event Name & Notes */}
              <section className="bg-white dark:bg-[#202022] rounded-xl p-3 border border-[#EAE5DB] dark:border-white/10 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="event-title-input" className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-gray-400">
                    Название события
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-stone-500 hover:text-stone-800 dark:text-gray-400">
                    <input 
                      type="checkbox"
                      checked={isT}
                      onChange={e => setIsT(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#4A7C59] focus:ring-[#4A7C59] border-[#EAE5DB] bg-[#FAF8F5] dark:bg-[#2C2C2E] cursor-pointer"
                    />
                    <span>Шаблон</span>
                  </label>
                </div>
                <input 
                  id="event-title-input"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Например: Семейная поездка и пикник"
                  className="w-full px-3 py-1.5 bg-[#F5F2EB]/60 focus:bg-white dark:bg-[#252528] dark:focus:bg-[#2C2C2E] text-sm text-[#2C2723] dark:text-white placeholder:text-stone-400 font-semibold rounded-lg border border-[#EAE5DB] dark:border-white/10 focus:border-[#4A7C59] outline-none"
                />
                <input 
                  type="text"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Заметка или место встречи (необязательно)..."
                  className="w-full px-3 py-1 bg-[#F5F2EB]/40 focus:bg-white dark:bg-[#252528] dark:focus:bg-[#2C2C2E] text-xs text-[#2C2723] dark:text-white placeholder:text-stone-400 rounded-lg border border-[#EAE5DB] dark:border-white/10 focus:border-[#4A7C59] outline-none"
                />
              </section>

              {/* Timing Grid: All 3 components completely unified in icon, layout, click handling */}
              <section className="bg-white dark:bg-[#202022] rounded-xl p-3 border border-[#EAE5DB] dark:border-white/10 shadow-2xs space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-gray-400 block">
                  Дата и время
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {/* Unified Date Field - 100% surface click target */}
                  <div 
                    onClick={handleOpenDate}
                    className="relative bg-[#F5F2EB]/80 dark:bg-[#252528] hover:bg-[#EAE4D6]/70 dark:hover:bg-[#2E2E32] p-2.5 rounded-xl border border-[#EAE5DB] dark:border-white/10 flex flex-col justify-between cursor-pointer transition min-h-[58px] group"
                  >
                    <div className="flex items-center justify-between text-stone-400 dark:text-gray-400 pointer-events-none">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={12} className="text-[#4A7C59]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Дата</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#4A7C59] uppercase">{shortWeekday}</span>
                    </div>
                    <div className="relative mt-1">
                      <input 
                        ref={dateInputRef}
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-transparent font-bold text-xs sm:text-sm text-[#2C2723] dark:text-white outline-none cursor-pointer py-0.5 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Unified Start Time Field - 100% surface click target without 'Старт' text */}
                  <div 
                    onClick={handleOpenTime}
                    className="relative bg-[#F5F2EB]/80 dark:bg-[#252528] hover:bg-[#EAE4D6]/70 dark:hover:bg-[#2E2E32] p-2.5 rounded-xl border border-[#EAE5DB] dark:border-white/10 flex flex-col justify-between cursor-pointer transition min-h-[58px] group"
                  >
                    <div className="flex items-center justify-between text-stone-400 dark:text-gray-400 pointer-events-none">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-[#4A7C59]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Начало</span>
                      </div>
                    </div>
                    <div className="relative mt-1">
                      <input 
                        ref={timeInputRef}
                        type="time"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        className="w-full bg-transparent font-bold text-xs sm:text-sm text-[#2C2723] dark:text-white outline-none cursor-pointer py-0.5 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Unified Duration / End Time Field (clean options without duplicate end time in brackets) */}
                  <label className="relative bg-[#F5F2EB]/80 dark:bg-[#252528] hover:bg-[#EAE4D6]/70 dark:hover:bg-[#2E2E32] p-2.5 rounded-xl border border-[#EAE5DB] dark:border-white/10 flex flex-col justify-between cursor-pointer transition min-h-[58px] group">
                    <div className="flex items-center justify-between text-stone-400 dark:text-gray-400 pointer-events-none">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-[#4A7C59]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Конец</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#4A7C59]">{endTimeStr}</span>
                    </div>
                    <select
                      value={dur}
                      onChange={e => setDur(e.target.value)}
                      className="w-full bg-transparent font-bold text-xs sm:text-sm text-[#2C2723] dark:text-white outline-none cursor-pointer mt-1 py-0.5"
                    >
                      <option value="0.25">15 мин</option>
                      <option value="0.5">30 мин</option>
                      <option value="0.75">45 мин</option>
                      <option value="1">1 час</option>
                      <option value="1.5">1.5 часа</option>
                      <option value="2">2 часа</option>
                      <option value="2.5">2.5 часа</option>
                      <option value="3">3 часа</option>
                      <option value="4">4 часа</option>
                      <option value="5">5 часов</option>
                      <option value="6">6 часов</option>
                      <option value="8">8 часов</option>
                      <option value="24">Весь день</option>
                    </select>
                  </label>
                </div>
              </section>

              {/* Participants */}
              <section className="bg-white dark:bg-[#202022] rounded-xl p-3 border border-[#EAE5DB] dark:border-white/10 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-gray-400">
                    Участники события
                  </span>
                  <span className="text-[10px] font-bold text-[#4A7C59]">
                    {mIds.length} выбрано
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {members.map(m => {
                    const isSelected = mIds.includes(m.id);
                    const initial = m.name ? m.name.charAt(0).toUpperCase() : 'У';

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'border-[#4A7C59] bg-[#EAF2EC] text-[#2D5A46] dark:bg-[#4A7C59]/25 dark:text-green-300'
                            : 'border-[#EAE5DB] bg-[#F5F2EB]/50 dark:bg-white/5 text-stone-500 dark:text-stone-400 opacity-60'
                        }`}
                      >
                        <span 
                          className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] shrink-0"
                          style={{ backgroundColor: m.color || '#4A7C59' }}
                        >
                          {initial}
                        </span>
                        <span>{m.name}</span>
                        {isSelected && <Check size={11} strokeWidth={3} className="text-[#4A7C59]" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Right Column (md: 5 cols): Reminders & Checklist */}
            <div className="md:col-span-5 space-y-3.5">
              
              {/* Telegram Reminders */}
              <section className="bg-white dark:bg-[#202022] rounded-xl p-3 border border-[#EAE5DB] dark:border-white/10 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Bell size={12} className="text-[#4A7C59]" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-gray-400">
                      Напоминания в Telegram
                    </span>
                  </div>
                  {reminders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setReminders([])}
                      className="text-[10px] font-bold text-stone-400 hover:text-red-500 cursor-pointer"
                    >
                      Сбросить
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {REMINDER_PRESETS.map(opt => {
                    const isActive = reminders.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleReminder(opt.value)}
                        className={`py-1 px-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#4A7C59] text-white shadow-2xs'
                            : 'bg-[#F5F2EB] dark:bg-[#252528] text-stone-600 dark:text-gray-300 hover:bg-[#EAE5DB] border border-[#EAE5DB]/60 dark:border-white/5'
                        }`}
                      >
                        {isActive ? `✓ ${opt.label}` : `+ ${opt.label}`}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setIsCustomReminderOpen(!isCustomReminderOpen)}
                    className="py-1 px-2 text-[10px] font-bold rounded-lg bg-[#F5F2EB] dark:bg-[#252528] text-[#4A7C59] border border-[#CBD7CB]/60 dark:border-white/10 cursor-pointer"
                  >
                    + Своё
                  </button>
                </div>

                {isCustomReminderOpen && (
                  <form onSubmit={handleAddCustomReminder} className="flex items-center gap-1.5 pt-1">
                    <input 
                      type="number"
                      min="1"
                      max="365"
                      value={customReminderVal}
                      onChange={e => setCustomReminderVal(e.target.value)}
                      className="w-14 px-2 py-1 bg-[#F5F2EB] dark:bg-[#252528] rounded-md text-xs font-bold text-center outline-none border border-[#EAE5DB]"
                    />
                    <select
                      value={customReminderUnit}
                      onChange={e => setCustomReminderUnit(e.target.value as any)}
                      className="px-2 py-1 bg-[#F5F2EB] dark:bg-[#252528] rounded-md text-xs font-bold outline-none border border-[#EAE5DB] cursor-pointer"
                    >
                      <option value="min">минут</option>
                      <option value="hour">часов</option>
                      <option value="day">дней</option>
                    </select>
                    <button type="submit" className="px-2.5 py-1 bg-[#4A7C59] text-white rounded-md text-xs font-bold cursor-pointer">
                      OK
                    </button>
                    <button type="button" onClick={() => setIsCustomReminderOpen(false)} className="text-stone-400 p-1 cursor-pointer">
                      <X size={13} />
                    </button>
                  </form>
                )}

                {/* Active reminders list */}
                {reminders.filter(r => !REMINDER_PRESETS.some(p => p.value === r)).length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {reminders.filter(r => !REMINDER_PRESETS.some(p => p.value === r)).map(m => (
                      <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EAF2EC] text-[#2D5A46] text-[10px] font-bold">
                        <span>за {formatReminderLabel(m)}</span>
                        <button type="button" onClick={() => removeReminder(m)} className="cursor-pointer">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Checklist */}
              <section className="bg-white dark:bg-[#202022] rounded-xl p-3 border border-[#EAE5DB] dark:border-white/10 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-gray-400">
                    Чек-лист
                  </span>
                  {checklist.length > 0 && (
                    <span className="text-[10px] font-bold text-stone-400">
                      {checklist.filter(i => i.completed).length} из {checklist.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <input 
                    type="text"
                    value={newChecklistItem}
                    onChange={e => setNewChecklistItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                    placeholder="Добавить пункт (билеты, термос)..."
                    className="flex-1 px-3 py-1 text-xs bg-[#F5F2EB]/60 dark:bg-[#252528] rounded-lg border border-[#EAE5DB] dark:border-white/10 focus:border-[#4A7C59] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addChecklistItem()}
                    className="w-6 h-6 bg-[#4A7C59] text-white rounded-lg flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {checklist.length > 0 ? (
                  <div className="space-y-1 pt-1 max-h-36 overflow-y-auto no-scrollbar">
                    {checklist.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#F5F2EB]/40 dark:bg-white/5">
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input 
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => setChecklist(checklist.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i))}
                            className="w-3.5 h-3.5 rounded text-[#4A7C59] focus:ring-[#4A7C59] cursor-pointer"
                          />
                          <span className={`text-xs truncate ${item.completed ? 'line-through text-stone-400' : 'text-[#2C2723] dark:text-white'}`}>
                            {item.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setChecklist(checklist.filter(i => i.id !== item.id))}
                          className="text-stone-400 hover:text-red-500 p-0.5 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 italic py-1">
                    Пункты подготовки отсутствуют
                  </p>
                )}
              </section>

            </div>

          </div>

        </div>

        {/* Footer Actions: Fixed at bottom */}
        <footer className="p-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] md:px-7 md:py-4 bg-white dark:bg-[#202022] border-t border-[#EAE5DB]/60 dark:border-white/10 shrink-0 flex items-center justify-between gap-2">
          <div>
            {event && onDelete && (
              !isConfirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  aria-label="Удалить событие"
                  className="w-11 h-11 flex items-center justify-center rounded-xl text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                  title="Удалить"
                >
                  <Trash2 size={15} />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      if (isSaving) return;
                      setIsSaving(true);
                      setSaveError(null);
                      try {
                        await onDelete(event.id,editScope);
                        onClose();
                      } catch (error) {
                        console.error('Event delete failed:', error);
                        setSaveError('Не удалось удалить событие. Повторите попытку.');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="min-h-[44px] px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    Да, удалить
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="min-h-[44px] px-3 py-2 text-stone-500 text-xs cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold text-stone-500 hover:bg-[#F5F2EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] cursor-pointer"
            >
              Отмена
            </button>
            <button 
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-[#4A7C59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] hover:bg-[#3C6548] text-white flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition"
            >
              <Check size={14} strokeWidth={2.8} />
              <span>{isSaving ? 'Сохранение…' : event ? 'Сохранить' : 'Создать'}</span>
            </button>
          </div>
        </footer>

        {saveError && <p role="alert" className="px-4 pb-2 text-xs text-red-600 dark:text-red-400">{saveError}</p>}

        {/* Conflict Confirmation Modal */}
        {conflictToConfirm && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-xs bg-white dark:bg-[#1E1E20] rounded-xl p-4 shadow-xl border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                    Пересечение по времени
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    «{conflictToConfirm.conflictingEvent.title}» в {conflictToConfirm.conflictingEvent.time}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConflictToConfirm(null)}
                  className="min-h-[44px] px-3 py-2 rounded-lg border text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Изменить
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConflictSave}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Всё равно сохранить
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
