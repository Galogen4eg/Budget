import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Trash2, Send, Sparkles, Check, Loader2, Plus, 
  Calendar as CalendarIcon, Clock, AlertTriangle, ArrowRight,
  CheckCircle2, Bell, CheckSquare, Square, Users, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember, ChecklistItem } from '../types';
import { auth } from '../firebase';
import { toast } from 'sonner';
import { triggerHaptic } from '../utils/haptics';

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

const REMINDER_OPTIONS = [
  { label: 'НЕТ', value: 0 },
  { label: '15 МИН', value: 15 },
  { label: '1 ЧАС', value: 60 },
  { label: '2 ЧАСА', value: 120 },
  { label: '1 ДЕНЬ', value: 1440 },
];

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
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTelegramPreview, setShowTelegramPreview] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Вычисление времени окончания
  const endTimeStr = useMemo(() => {
    const [h, m] = (time || '12:00').split(':').map(n => parseInt(n, 10) || 0);
    const durationHours = parseFloat(String(dur)) || 1;
    const totalMinutes = h * 60 + m + Math.round(durationHours * 60);
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }, [time, dur]);

  // Форматирование даты
  const dateFormatted = useMemo(() => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
  }, [date]);

  // Проверка конфликтов в расписании
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

  // Предложение свободного слота времени
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
      description: 'Оба члена семьи свободны после завершения предыдущего события'
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
    if (reminders.includes(minutes)) {
      setReminders(reminders.filter(r => r !== minutes));
    } else {
      setReminders([minutes]);
    }
  };

  const toggleMember = (memberId: string) => {
    setMIds(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Введите название события');
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

    onSave(newEventData);
    onClose();
  };

  const completedCount = checklist.filter(i => i.completed).length;
  const progressPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  return createPortal(
    <div 
      className="fixed inset-0 z-[2000] bg-stone-950/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 transition-all duration-300 select-none"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
        className="relative w-full max-w-4xl bg-[#FAF8F5] dark:bg-[#18181A] rounded-3xl shadow-[0_25px_60px_-15px_rgba(41,37,36,0.28)] border border-[#ECE6DE] dark:border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-stone-900 dark:text-white"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Шапка модального окна */}
        <div className="px-6 sm:px-8 py-5 bg-white dark:bg-[#1C1C1E] border-b border-[#ECE6DE] dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF2EC] dark:bg-primary/20 text-[#4A7C59] dark:text-green-400 flex items-center justify-center shadow-xs">
              <CalendarIcon size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-headline" className="font-headline text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
                  {event ? 'Редактирование события' : 'Новое событие'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF6EE] dark:bg-amber-950/30 text-[#C58D33] dark:text-amber-300 border border-[#F3D5A5]/60">
                  <Sparkles size={12} />
                  <span>AI Помощник</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F1FA] dark:bg-blue-950/30 text-[#2275B8] dark:text-blue-300">
                  <span>Telegram Sync</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-gray-400 font-medium mt-0.5">
                Добавьте семейный план с распределением задач и уведомлением в Telegram
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={handleManualSend} 
              disabled={loading} 
              className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                sent ? 'bg-emerald-600 text-white' : 'bg-stone-100 dark:bg-white/10 hover:bg-[#EAF2EC] text-[#2275B8]'
              }`}
              title="Отправить тестовое сообщение в Telegram"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : sent ? <Check size={18} /> : <Send size={18} />}
            </button>

            <button 
              type="button" 
              onClick={onClose} 
              aria-label="Закрыть" 
              className="w-9 h-9 rounded-full bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-stone-500 hover:text-stone-900 dark:text-gray-300 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Тело модального окна */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-5 max-h-[calc(90vh-140px)] bg-[#FAF8F5] dark:bg-[#18181A]">
          
          {/* 1. Баннер конфликта расписания */}
          {conflict && (
            <div className="rounded-2xl p-4 bg-[#FEF7EC] dark:bg-amber-950/30 border border-[#F3D5A5] dark:border-amber-800/40 shadow-xs flex flex-col gap-2.5 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#F8E0A8] dark:bg-amber-900/50 text-[#705C30] dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#705C30] dark:text-amber-300">
                      Пересечение в расписании
                    </p>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#C58D33] text-white">
                      Конфликт занятости
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 leading-snug mt-1">
                    В этот промежуток уже назначено событие <strong className="underline decoration-[#C58D33] decoration-2 underline-offset-2">«{conflict.title}» ({conflict.time} – {(conflict.time || '12:00')})</strong>.
                  </p>
                  <p className="text-xs text-stone-600 dark:text-gray-300 mt-0.5">
                    Предложить бесконфликтное время для всей семьи или создать встречу всё равно?
                  </p>
                </div>
              </div>

              {/* AI-предложение свободного слота */}
              {suggestedSlot && (
                <button
                  type="button"
                  onClick={applySuggestedSlot}
                  className="w-full group p-3 rounded-xl bg-white dark:bg-[#252528] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 transition-all flex items-center justify-between text-left shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#EAF2EC] dark:bg-primary/20 text-[#4A7C59] dark:text-green-300 flex items-center justify-center font-bold text-sm">
                      ✨
                    </span>
                    <div>
                      <span className="text-xs font-bold text-stone-900 dark:text-white block">
                        Свободное окно: {suggestedSlot.label}
                      </span>
                      <span className="text-[11px] text-stone-500 dark:text-gray-400 font-medium">
                        {suggestedSlot.description}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#4A7C59] dark:text-green-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>Перенести сюда</span>
                    <ArrowRight size={14} />
                  </span>
                </button>
              )}
            </div>
          )}

          {/* 1.5 Выбор из сохраненного шаблона */}
          {templates && templates.length > 0 && (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 border border-[#ECE6DE] dark:border-white/10 shadow-xs space-y-3">
              <div 
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF2EC] dark:bg-primary/20 text-[#4A7C59] dark:text-green-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-2">
                      <span>Шаблоны событий</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#EAF2EC] dark:bg-primary/20 text-[#2A4C34] dark:text-green-300 text-[10px] font-extrabold">
                        {templates.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-gray-400 font-medium mt-0.5">
                      Заполнить название, участников и продолжительность из шаблона
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#4A7C59] dark:text-green-400 flex items-center gap-1 shrink-0">
                  <span>{showTemplates ? 'Свернуть' : 'Выбрать шаблон'}</span>
                  {showTemplates ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>

              {showTemplates && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#ECE6DE] dark:border-white/10 animate-in fade-in duration-200">
                  {templates.map(tmpl => {
                    const tmplMembers = members.filter(m => (tmpl.memberIds || []).includes(m.id));
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setTitle(tmpl.title);
                          if (tmpl.memberIds && tmpl.memberIds.length > 0) {
                            setMIds(tmpl.memberIds);
                          }
                          if (tmpl.duration) {
                            setDur(tmpl.duration);
                          }
                          if (tmpl.description) {
                            setDesc(tmpl.description);
                          }
                          if (tmpl.checklist && tmpl.checklist.length > 0) {
                            setChecklist(tmpl.checklist);
                          }
                          triggerHaptic('light');
                          toast.success(`Шаблон «${tmpl.title}» применён`);
                        }}
                        className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#252528] hover:bg-[#EAF2EC] dark:hover:bg-primary/20 border border-[#ECE6DE] dark:border-white/10 text-left transition flex flex-col justify-between gap-2 group cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-stone-900 dark:text-white group-hover:text-[#4A7C59] dark:group-hover:text-green-400 transition-colors line-clamp-1">
                            {tmpl.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-gray-300 shrink-0">
                            {tmpl.duration || 1} ч
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-gray-400">
                          <div className="flex items-center gap-1 truncate max-w-[170px]">
                            <Users size={12} className="shrink-0 text-[#4A7C59]" />
                            <span className="truncate">
                              {tmplMembers.length > 0 ? tmplMembers.map(m => m.name).join(', ') : 'Все члены семьи'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-[#4A7C59] dark:text-green-400 group-hover:underline shrink-0">
                            Применить →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. Основная информация: Название и Описание */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-[#ECE6DE] dark:border-white/10 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-gray-400" htmlFor="eventTitle">
                Название события
              </label>
              
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none self-start sm:self-auto">
                <span className="text-xs font-semibold text-stone-700 dark:text-gray-300">Сохранить как шаблон</span>
                <input 
                  type="checkbox" 
                  checked={isT} 
                  onChange={() => setIsT(!isT)}
                  className="w-4 h-4 rounded text-[#4A7C59] focus:ring-[#4A7C59] cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <input 
                id="eventTitle"
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                placeholder="Например: Семейная поездка за город и пикник"
                className="w-full text-base sm:text-lg font-bold font-headline text-stone-900 dark:text-white bg-[#FAF8F5] dark:bg-[#252528] px-4 py-3 rounded-xl border border-[#ECE6DE] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#4A7C59] transition"
              />

              <textarea 
                rows={2}
                value={desc} 
                onChange={e => setDesc(e.target.value)}
                placeholder="Дополнительные детали, место встречи, ссылки или заметки..."
                className="w-full text-xs sm:text-sm text-stone-900 dark:text-white bg-[#FAF8F5] dark:bg-[#252528] px-4 py-3 rounded-xl border border-[#ECE6DE] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#4A7C59] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* 3. Время, Длительность и Напоминания в Telegram */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-[#ECE6DE] dark:border-white/10 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-gray-400">
                Время и напоминания
              </label>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EAF2EC] dark:bg-primary/20 text-[#2A4C34] dark:text-green-300">
                {dateFormatted}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Дата */}
              <div className="bg-[#FAF8F5] dark:bg-[#252528] p-3 rounded-xl border border-[#ECE6DE] dark:border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Дата</span>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="w-full font-bold text-sm bg-transparent outline-none text-stone-900 dark:text-white mt-1 cursor-pointer"
                />
              </div>

              {/* Время старта */}
              <div className="bg-[#FAF8F5] dark:bg-[#252528] p-3 rounded-xl border border-[#ECE6DE] dark:border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Время старта</span>
                <input 
                  type="time" 
                  value={time} 
                  onChange={e => setTime(e.target.value)}
                  className="w-full font-bold text-sm bg-transparent outline-none text-stone-900 dark:text-white mt-1 cursor-pointer"
                />
              </div>

              {/* Длительность */}
              <div className="bg-[#FAF8F5] dark:bg-[#252528] p-3 rounded-xl border border-[#ECE6DE] dark:border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Длительность</span>
                  <span className="text-[11px] text-stone-500 font-semibold">до {endTimeStr}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <input 
                    type="number" 
                    step="0.5" 
                    min="0.5" 
                    max="24"
                    value={dur} 
                    onChange={e => setDur(e.target.value)}
                    className="w-16 font-bold text-sm bg-transparent outline-none text-stone-900 dark:text-white"
                  />
                  <span className="text-xs text-stone-500 font-medium">часа</span>
                </div>
              </div>
            </div>

            {/* Напоминания в Telegram */}
            <div className="pt-3 border-t border-[#ECE6DE] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-stone-700 dark:text-gray-300">
                <Bell size={16} className="text-[#C58D33]" />
                <span className="text-xs font-bold uppercase tracking-wider">Напоминание в Telegram:</span>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                {REMINDER_OPTIONS.map(opt => {
                  const isActive = opt.value === 0 ? reminders.length === 0 : reminders.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleReminder(opt.value)}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#4A7C59] text-white shadow-xs' 
                          : 'bg-[#FAF8F5] dark:bg-[#252528] text-stone-600 dark:text-gray-400 hover:bg-stone-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Участники и Чек-лист */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Участники события */}
            <div className="md:col-span-5 bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-[#ECE6DE] dark:border-white/10 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-gray-400">
                    Участники события
                  </label>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#EAF2EC] dark:bg-primary/20 text-[#2A4C34] dark:text-green-300">
                    {mIds.length} выбрано
                  </span>
                </div>

                <div className="space-y-2.5">
                  {members.map(m => {
                    const isSelected = mIds.includes(m.id);
                    const initial = m.name ? m.name.charAt(0).toUpperCase() : 'У';

                    return (
                      <div 
                        key={m.id}
                        onClick={() => toggleMember(m.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#FAF8F5] dark:bg-[#252528] border-[#4A7C59] shadow-xs' 
                            : 'bg-white dark:bg-[#1C1C1E] border-[#ECE6DE] dark:border-white/5 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shadow-xs"
                            style={{ backgroundColor: m.color || '#4A7C59' }}
                          >
                            {initial}
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">{m.name}</h4>
                            <span className="text-[10px] text-stone-500 dark:text-gray-400 font-medium">
                              {isSelected ? 'Уведомление в боте активно' : 'Не участвует'}
                            </span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[#4A7C59] ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                          <CheckCircle2 size={18} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2 text-xs text-stone-500 dark:text-gray-400 bg-[#FAF8F5] dark:bg-white/5 p-2.5 rounded-xl">
                <Send size={14} className="text-[#4A7C59]" />
                <span>Оба участника получат персональное оповещение</span>
              </div>
            </div>

            {/* Чек-лист к событию */}
            <div className="md:col-span-7 bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-[#ECE6DE] dark:border-white/10 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-gray-400">
                    Чек-лист и подготовка
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#EAF2EC] dark:bg-primary/20 text-[#2A4C34] dark:text-green-300">
                    {completedCount} из {checklist.length} готово
                  </span>
                  <div className="w-16 h-1.5 bg-stone-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4A7C59] rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>

              {/* Добавление нового пункта */}
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newChecklistItem} 
                  onChange={e => setNewChecklistItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                  placeholder="Что нужно подготовить?"
                  className="flex-1 text-xs bg-[#FAF8F5] dark:bg-[#252528] px-3.5 py-2.5 rounded-xl border border-[#ECE6DE] dark:border-white/10 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A7C59] transition"
                />
                <button 
                  type="button" 
                  onClick={() => addChecklistItem()}
                  className="w-9 h-9 rounded-xl bg-[#4A7C59] hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shrink-0 transition-transform active:scale-95 shadow-xs cursor-pointer"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Быстрые подсказки */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-stone-400 font-bold">Быстро:</span>
                <button type="button" onClick={() => addChecklistItem('Взять билеты')} className="text-[11px] bg-[#FAF8F5] dark:bg-white/5 hover:bg-stone-200 text-stone-600 dark:text-gray-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer">Взять билеты</button>
                <button type="button" onClick={() => addChecklistItem('Купить фрукты и воду')} className="text-[11px] bg-[#FAF8F5] dark:bg-white/5 hover:bg-stone-200 text-stone-600 dark:text-gray-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer">Купить фрукты</button>
                <button type="button" onClick={() => addChecklistItem('Собрать термос')} className="text-[11px] bg-[#FAF8F5] dark:bg-white/5 hover:bg-stone-200 text-stone-600 dark:text-gray-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer">Собрать термос</button>
              </div>

              {/* Список пунктов */}
              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pt-1">
                {checklist.map(item => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#252528] hover:bg-stone-100 dark:hover:bg-white/5 transition group"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input 
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => setChecklist(checklist.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i))}
                        className="w-4 h-4 rounded text-[#4A7C59] focus:ring-[#4A7C59] cursor-pointer"
                      />
                      <span className={`text-xs font-medium truncate ${item.completed ? 'line-through text-stone-400 dark:text-gray-500' : 'text-stone-900 dark:text-white'}`}>
                        {item.text}
                      </span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setChecklist(checklist.filter(i => i.id !== item.id))}
                      className="text-stone-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {checklist.length === 0 && (
                  <div className="text-center py-4 text-stone-400 text-xs font-semibold">
                    Чек-лист пуст. Добавьте пункты выше.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 5. Предпросмотр оповещения в Telegram */}
          <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#ECE6DE] dark:border-white/10 p-4 flex flex-col gap-3 shadow-xs">
            <div 
              onClick={() => setShowTelegramPreview(!showTelegramPreview)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#2275B8] flex items-center justify-center text-white">
                  <Send size={12} />
                </div>
                <span className="text-xs font-bold text-stone-900 dark:text-white">
                  Предпросмотр оповещения в Telegram-чате
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#4A7C59] flex items-center gap-0.5">
                <span>{showTelegramPreview ? 'Свернуть' : 'Развернуть'}</span>
                {showTelegramPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </div>

            {showTelegramPreview && (
              <div className="bg-[#FAF8F5] dark:bg-[#252528] rounded-xl p-3.5 border border-[#ECE6DE] dark:border-white/10 max-w-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                    <span className="text-xs font-bold text-[#4A7C59]">Уютный Дом Бот</span>
                    <span className="text-[10px] text-stone-400">сегодня</span>
                  </div>
                  <span className="text-[10px] text-stone-400">ID #841</span>
                </div>
                <div className="text-xs text-stone-800 dark:text-gray-200 leading-relaxed space-y-1">
                  <p className="font-bold">🏡 Новое семейное событие</p>
                  <p className="font-semibold text-stone-900 dark:text-white">«{title || 'Название события'}»</p>
                  <p className="text-[11px] text-stone-500 dark:text-gray-400">
                    🗓 <b>{dateFormatted}</b> • 🕒 <b>{time} – {endTimeStr}</b><br />
                    👥 <b>Участники:</b> {members.filter(m => mIds.includes(m.id)).map(m => m.name).join(', ') || 'Все'}<br />
                    {desc && <i>📝 {desc}</i>}
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Футер модального окна */}
        <div className="px-6 sm:px-8 py-4 bg-white dark:bg-[#1C1C1E] border-t border-[#ECE6DE] dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div>
            {event && onDelete && (
              <div className="flex items-center gap-2">
                {!isConfirmingDelete ? (
                  <button 
                    type="button" 
                    onClick={() => setIsConfirmingDelete(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#D95C48] hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Удалить событие</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 animate-in fade-in">
                    <button 
                      type="button" 
                      onClick={() => {
                        onDelete(event.id);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#D95C48] hover:bg-red-700 px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Подтвердить удаление</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsConfirmingDelete(false)}
                      className="text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
              type="button" 
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-gray-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Отмена
            </button>

            <button 
              type="button" 
              onClick={handleSave}
              className={`py-2.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                conflict 
                  ? 'bg-[#C58D33] hover:bg-amber-700' 
                  : 'bg-[#4A7C59] hover:bg-emerald-700'
              }`}
            >
              <Check size={16} strokeWidth={3} />
              <span>{conflict ? 'Создать несмотря на пересечение' : event ? 'Сохранить изменения' : 'Создать событие'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default EventModal;
