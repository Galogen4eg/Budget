import React, { useState } from 'react';
import { 
  ArrowLeft, 
  X,
  HelpCircle, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Lock,
  Plus,
  CheckCircle2, 
  SlidersHorizontal, 
  Info,
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';
import { FamilyEvent, FamilyMember } from '../types';

interface ConflictResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictPair: { eventA: FamilyEvent; eventB: FamilyEvent } | null;
  members: FamilyMember[];
  onUpdateEvent?: (event: FamilyEvent) => void;
  onOpenEvent?: (event: FamilyEvent) => void;
}

function getEventMinutes(timeStr?: string, durationHours: number = 1) {
  const [h, m] = (timeStr || '12:00').split(':').map(Number);
  const start = (isNaN(h) ? 12 : h) * 60 + (isNaN(m) ? 0 : m);
  const end = start + Math.round(durationHours * 60);
  return { start, end };
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDurationText(hours: number): string {
  const mins = Math.round(hours * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} ч ${m} мин`;
  if (h > 0) return `${h} ч 00 мин`;
  return `${m} мин`;
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  isOpen,
  onClose,
  conflictPair,
  members,
  onUpdateEvent,
  onOpenEvent
}) => {
  const [selectedOption, setSelectedOption] = useState<'shift' | 'shorten' | 'keep'>('shift');

  if (!isOpen || !conflictPair) return null;

  const { eventA, eventB } = conflictPair;

  const timeA = getEventMinutes(eventA.time, eventA.duration || 1.5);
  const timeB = getEventMinutes(eventB.time, eventB.duration || 1);

  // Пересечение по времени
  const overlapStartMins = Math.max(timeA.start, timeB.start);
  const overlapEndMins = Math.min(timeA.end, timeB.end);
  const overlapDurationMins = Math.max(0, overlapEndMins - overlapStartMins);

  const overlapStartStr = minutesToTimeString(overlapStartMins);
  const overlapEndStr = minutesToTimeString(overlapEndMins);

  // Участники
  const aMembers = members.filter(m => eventA.memberIds?.includes(m.id));
  const bMembers = members.filter(m => eventB.memberIds?.includes(m.id));
  const sharedMembers = members.filter(m => 
    eventA.memberIds?.includes(m.id) && eventB.memberIds?.includes(m.id)
  );
  
  const conflictMemberName = sharedMembers.length > 0 ? sharedMembers[0].name : 'Мама';
  const otherParticipant = aMembers.find(m => m.id !== sharedMembers[0]?.id)?.name || 'Папа';

  // Расчет варианта "Сдвинуть"
  const shiftStartTimeMins = Math.max(timeB.end, timeA.end);
  const shiftStartTimeStr = minutesToTimeString(shiftStartTimeMins);
  const shiftEndTimeStr = minutesToTimeString(shiftStartTimeMins + Math.round((eventA.duration || 1.5) * 60));

  // Форматирование даты
  const dateObj = new Date(eventA.date);
  const formattedDate = !isNaN(dateObj.getTime())
    ? `${dateObj.getDate()} ${dateObj.toLocaleString('ru-RU', { month: 'long' })} ${dateObj.getFullYear()}, ${dateObj.toLocaleString('ru-RU', { weekday: 'long' }).charAt(0).toUpperCase() + dateObj.toLocaleString('ru-RU', { weekday: 'long' }).slice(1)}`
    : '24 сентября 2026, Четверг';

  const handleApply = () => {
    if (selectedOption === 'shift' && onUpdateEvent) {
      onUpdateEvent({
        ...eventA,
        time: shiftStartTimeStr
      });
    } else if (selectedOption === 'shorten' && onUpdateEvent) {
      const newDuration = Math.max(0.5, (timeA.end - overlapEndMins) / 60);
      onUpdateEvent({
        ...eventA,
        time: overlapEndStr,
        duration: newDuration
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FAF8F5] dark:bg-[#1A1A1C] text-stone-900 dark:text-stone-100 w-full max-w-4xl rounded-[28px] shadow-2xl flex flex-col justify-between overflow-hidden border border-[#ECE5DB] dark:border-white/10 my-auto">
        
        {/* Шапка модального окна (Спецификация с макета) */}
        <div className="p-5 sm:p-6 border-b border-[#ECE5DB] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#1A1A1C] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-900/40">
              <AlertTriangle size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold font-serif text-stone-900 dark:text-white leading-tight truncate">
                Внимание к расписанию: Обнаружен конфликт событий
              </h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                  {formattedDate}
                </span>
                <span className="text-stone-300 dark:text-stone-600">•</span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[11px] font-bold border border-rose-200/80 dark:border-rose-900/60">
                  2 события пересекаются
                </span>
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer shrink-0 ml-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Тело модального окна */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(88vh-140px)] no-scrollbar">
          
          {/* Красный баннер наложения времени */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF5F5] dark:bg-rose-950/40 border border-rose-200/90 dark:border-rose-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={18} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                    НАЛОЖЕНИЕ ПО ВРЕМЕНИ
                  </span>
                  <span className="text-rose-300 dark:text-rose-700">•</span>
                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                    общий слот занят
                  </span>
                </div>
                <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                  В данный отрезок времени назначено два мероприятия с общим участником: <strong className="font-bold text-rose-900 dark:text-rose-200">{conflictMemberName}</strong> (также участвует {otherParticipant} в обеде).
                </p>
              </div>
            </div>

            <div className="p-2.5 px-3.5 rounded-2xl bg-white/90 dark:bg-black/40 border border-rose-200 dark:border-rose-900/50 text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2 shrink-0 shadow-2xs w-full md:w-auto justify-center">
              <Clock size={15} className="text-rose-500" />
              <span>Интервал пересечения: <strong>{overlapStartStr} — {overlapEndStr} ({overlapDurationMins} мин)</strong></span>
            </div>
          </div>

          {/* Секция: СРАВНЕНИЕ КОНФЛИКТУЮЩИХ СОБЫТИЙ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                СРАВНЕНИЕ КОНФЛИКТУЮЩИХ СОБЫТИЙ
              </span>
              <span className="text-stone-400 font-medium hidden sm:inline">
                Синхронизация с семейным хабом
              </span>
            </div>

            {/* Две карточки рядом на ПК */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Карточка 1: Новое событие */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#202023] border-2 border-[#2D5A46]/30 dark:border-emerald-800/40 shadow-xs space-y-3.5 relative">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#2D5A46] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                    <Plus size={13} strokeWidth={3} />
                    <span>Новое событие</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    {formatDurationText(eventA.duration || 1.5)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
                  <Clock size={14} className="text-stone-400 shrink-0" />
                  <span>{eventA.time || '12:00'} — {minutesToTimeString(timeA.end)}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white leading-snug">
                    {eventA.title}
                  </h3>
                  {eventA.description && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mt-1">
                      <MapPin size={13} className="shrink-0 text-stone-400" />
                      <span>{eventA.description}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-white/5 flex items-center gap-2 text-xs">
                  <span className="text-stone-400 font-medium shrink-0">Участники:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {aMembers.map(m => {
                      const isConf = m.name === conflictMemberName;
                      return (
                        <span 
                          key={m.id} 
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isConf 
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                              : 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color || '#3A7E64' }} />
                          <span>{m.name}</span>
                          {isConf && <span className="text-[10px] font-normal">(Конфликт)</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Карточка 2: Уже запланировано */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#202023] border border-[#ECE5DB] dark:border-white/10 shadow-xs space-y-3.5 relative">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-stone-200/80 dark:bg-white/15 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5">
                    <Lock size={12} />
                    <span>Уже запланировано</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-400 text-xs font-bold">
                    {formatDurationText(eventB.duration || 1)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
                  <Clock size={14} className="text-stone-400 shrink-0" />
                  <span>{eventB.time || '11:30'} — {minutesToTimeString(timeB.end)}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white leading-snug">
                    {eventB.title}
                  </h3>
                  {eventB.description && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mt-1">
                      <MapPin size={13} className="shrink-0 text-stone-400" />
                      <span>{eventB.description}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-white/5 flex items-center gap-2 text-xs">
                  <span className="text-stone-400 font-medium shrink-0">Участник:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {bMembers.map(m => (
                      <span key={m.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-900">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color || '#3A7E64' }} />
                        <span>{m.name}</span>
                      </span>
                    ))}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-white/10 text-stone-500 font-semibold">
                      Не переносится
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Шкала зоны наложения */}
            <div className="p-3 px-4 rounded-2xl bg-stone-100/90 dark:bg-white/5 border border-stone-200/70 dark:border-white/10 flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-bold">
                <ArrowRightLeft size={14} className="text-rose-500 shrink-0" />
                <span>Зона наложения: <strong>{overlapStartStr} — {overlapEndStr}</strong></span>
              </div>

              {/* Визуальный индикатор шкалы */}
              <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs mx-4">
                <div className="h-2 rounded-full bg-stone-200 dark:bg-white/10 w-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full w-2/5" />
                  <div className="bg-rose-500 h-full w-1/5" />
                  <div className="bg-emerald-500 h-full w-2/5" />
                </div>
              </div>

              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 shrink-0">
                Критично ({overlapDurationMins} мин)
              </span>
            </div>

          </div>

          {/* Секция: ВЫБЕРИТЕ СПОСОБ РАЗРЕШЕНИЯ НАКЛАДКИ */}
          <div className="space-y-3 pt-2">
            <span className="font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-xs block">
              ВЫБЕРИТЕ СПОСОБ РАЗРЕШЕНИЯ НАКЛАДКИ
            </span>

            <div className="space-y-2.5">
              
              {/* Вариант 1: Сдвинуть */}
              <div 
                onClick={() => setSelectedOption('shift')}
                className={`p-4 sm:p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  selectedOption === 'shift'
                    ? 'border-2 border-[#2D5A46] bg-[#F4F8F5] dark:bg-emerald-950/20 shadow-xs'
                    : 'border-[#ECE5DB] dark:border-white/10 bg-white dark:bg-[#202023] hover:border-stone-400'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedOption === 'shift' ? 'border-[#2D5A46] bg-[#2D5A46]' : 'border-stone-300'
                  }`}>
                    {selectedOption === 'shift' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                        Сдвинуть новое событие на {shiftStartTimeStr}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#2D5A46] text-white text-[10px] font-extrabold uppercase flex items-center gap-1">
                        <Sparkles size={11} />
                        Рекомендуется
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Обед начнется сразу после клиники: <strong>{shiftStartTimeStr} — {shiftEndTimeStr}</strong>. Все успевают вовремя, без спешки и потери времени.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold shrink-0 self-end sm:self-center">
                  +{overlapDurationMins || 45} мин
                </span>
              </div>

              {/* Вариант 2: Сократить */}
              <div 
                onClick={() => setSelectedOption('shorten')}
                className={`p-4 sm:p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  selectedOption === 'shorten'
                    ? 'border-2 border-[#2D5A46] bg-[#F4F8F5] dark:bg-emerald-950/20 shadow-xs'
                    : 'border-[#ECE5DB] dark:border-white/10 bg-white dark:bg-[#202023] hover:border-stone-400'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedOption === 'shorten' ? 'border-[#2D5A46] bg-[#2D5A46]' : 'border-stone-300'
                  }`}>
                    {selectedOption === 'shorten' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                      Сократить «{eventA.title}» (начать в {overlapEndStr})
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Длительность встречи уменьшится с {Math.round((eventA.duration || 1.5) * 60)} до {Math.max(30, Math.round((timeA.end - overlapEndMins)))} минут: <strong>{overlapEndStr} — {minutesToTimeString(timeA.end)}</strong>. {conflictMemberName} присоединится без задержек.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-400 text-xs font-bold shrink-0 self-end sm:self-center">
                  {Math.max(30, Math.round((timeA.end - overlapEndMins)))} мин всего
                </span>
              </div>

              {/* Вариант 3: Оставить как есть */}
              <div 
                onClick={() => setSelectedOption('keep')}
                className={`p-4 sm:p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  selectedOption === 'keep'
                    ? 'border-2 border-[#2D5A46] bg-[#F4F8F5] dark:bg-emerald-950/20 shadow-xs'
                    : 'border-[#ECE5DB] dark:border-white/10 bg-white dark:bg-[#202023] hover:border-stone-400'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedOption === 'keep' ? 'border-[#2D5A46] bg-[#2D5A46]' : 'border-stone-300'
                  }`}>
                    {selectedOption === 'keep' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                      Оставить оба события как есть
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Сохранить пересечение в календаре без автоматических правок. Конфликт останется отмеченным значком в расписании.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-400 text-xs font-bold shrink-0 self-end sm:self-center">
                  Без изменений
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Нижний подвал с кнопками управления */}
        <div className="p-4 sm:p-5 border-t border-[#ECE5DB] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#18181A] flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 dark:text-stone-400 font-bold text-xs sm:text-sm hover:text-stone-900 dark:hover:text-stone-100 transition cursor-pointer py-1"
          >
            Отмена
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenEvent) onOpenEvent(eventA);
              }}
              className="px-4 py-2.5 rounded-2xl border border-[#ECE5DB] dark:border-white/10 bg-white dark:bg-white/5 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-2 hover:bg-stone-100 dark:hover:bg-white/10 transition cursor-pointer flex-1 sm:flex-none"
            >
              <SlidersHorizontal size={15} />
              <span>Вручную настроить</span>
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 sm:py-3 rounded-2xl bg-[#2D5A46] hover:bg-[#234636] active:scale-[0.99] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer flex-1 sm:flex-none"
            >
              <CheckCircle2 size={18} />
              <span>
                Применить ({selectedOption === 'shift' ? `Сдвинуть на ${shiftStartTimeStr}` : selectedOption === 'shorten' ? `Начать в ${overlapEndStr}` : 'Оставить как есть'})
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
