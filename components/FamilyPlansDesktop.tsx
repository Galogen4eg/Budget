import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, 
  Mic, Loader2, CheckSquare, Square,
  Edit3, Dumbbell, Sparkle, Car, Film, Coffee,
  RefreshCw, Plane, Home, ShoppingBag, Heart,
  CheckCircle2, Sparkles
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember, ChecklistItem } from '../types';

interface FamilyPlansDesktopProps {
  events: FamilyEvent[];
  members: FamilyMember[];
  settings: AppSettings;
  
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  
  calendarData: any[];
  selectedDayEvents: FamilyEvent[];
  
  onOpenEvent: (event?: FamilyEvent | null, prefill?: any) => void;
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
  onUpdateEvent?: (e: FamilyEvent) => void;
  
  isListening: boolean;
  isProcessingVoice: boolean;
  startListening: () => void;
}

const WEEK_DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

export const FamilyPlansDesktop: React.FC<FamilyPlansDesktopProps> = ({
  events,
  members,
  settings,
  currentDate, setCurrentDate,
  selectedDate, setSelectedDate,
  calendarData, selectedDayEvents,
  onOpenEvent, onSendToTelegram, onUpdateEvent,
  isListening, isProcessingVoice, startListening
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'schedule'>('month');
  const [filterMemberId, setFilterMemberId] = useState<string | 'all'>('all');

  const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' }).replace(/\s*г\.?/gi, '');
  const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const changeDate = (dir: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + dir);
    setCurrentDate(newDate);
  };

  const isEventDimmed = (event: FamilyEvent) => {
    if (filterMemberId === 'all') return false;
    return !event.memberIds.includes(filterMemberId);
  };

  // Предстоящие события на ближайшую неделю
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    return events
      .filter(e => e.date >= todayStr)
      .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`))
      .slice(0, 6);
  }, [events]);

  const getEventCategoryMeta = (title: string, member?: FamilyMember) => {
    const lower = title.toLowerCase();
    if (lower.includes('бег') || lower.includes('спорт') || lower.includes('пробежк') || lower.includes('тренировк') || lower.includes('зал')) {
      return {
        icon: <Dumbbell size={15} />,
        bg: 'bg-[#FEF3EB] dark:bg-amber-950/30',
        text: 'text-[#D97763] dark:text-amber-400',
        categoryName: 'Здоровье'
      };
    }
    if (lower.includes('уборк') || lower.includes('клининг') || lower.includes('дом') || lower.includes('стирк')) {
      return {
        icon: <Home size={15} />,
        bg: 'bg-[#E8F2EC] dark:bg-emerald-950/30',
        text: 'text-[#3A7E64] dark:text-emerald-400',
        categoryName: 'Дом'
      };
    }
    if (lower.includes('аэропорт') || lower.includes('поездк') || lower.includes('сочи') || lower.includes('билет') || lower.includes('самолет')) {
      return {
        icon: <Plane size={15} />,
        bg: 'bg-[#FDF0EC] dark:bg-red-950/30',
        text: 'text-[#D97763] dark:text-rose-400',
        categoryName: 'Поездка'
      };
    }
    if (lower.includes('машин') || lower.includes('то ') || lower.includes('авто') || lower.includes('фильтр') || lower.includes('сто')) {
      return {
        icon: <Car size={15} />,
        bg: 'bg-[#FEF6E8] dark:bg-yellow-950/30',
        text: 'text-[#E5A642] dark:text-yellow-400',
        categoryName: 'Авто'
      };
    }
    if (lower.includes('кино') || lower.includes('театр') || lower.includes('фильм') || lower.includes('спектакл')) {
      return {
        icon: <Film size={15} />,
        bg: 'bg-[#E8F2EC] dark:bg-emerald-950/30',
        text: 'text-[#3A7E64] dark:text-emerald-400',
        categoryName: 'Культура'
      };
    }
    if (lower.includes('магаз') || lower.includes('покупк') || lower.includes('шкаф') || lower.includes('доставк') || lower.includes('ozon')) {
      return {
        icon: <ShoppingBag size={15} />,
        bg: 'bg-[#FEF3EB] dark:bg-amber-950/30',
        text: 'text-[#D97763] dark:text-amber-400',
        categoryName: 'Покупки'
      };
    }
    return {
      icon: <Coffee size={15} />,
      bg: 'bg-[#F6F3EE] dark:bg-white/5',
      text: 'text-stone-600 dark:text-stone-300',
      categoryName: 'Личное'
    };
  };

  // Color theme generator for event chips
  const getEventBadgeStyle = (evt: FamilyEvent) => {
    const assignedMember = members.find(m => evt.memberIds?.includes(m.id));
    const titleLower = evt.title.toLowerCase();

    // Member specific or fallback to theme colors
    if (assignedMember?.name?.toLowerCase().includes('галя') || titleLower.includes('стоматолог') || titleLower.includes('ozon') || titleLower.includes('выезд')) {
      return {
        badgeBg: 'bg-[#FDF0EC] dark:bg-rose-950/30',
        badgeText: 'text-[#9E3E28] dark:text-rose-300',
        borderColor: '#D97763',
        dotColor: '#D97763'
      };
    }
    if (assignedMember?.name?.toLowerCase().includes('гена') || titleLower.includes('то ') || titleLower.includes('пробежка') || titleLower.includes('фильтр') || titleLower.includes('родител')) {
      return {
        badgeBg: 'bg-[#FEF6E8] dark:bg-amber-950/30',
        badgeText: 'text-[#8C5E1A] dark:text-amber-300',
        borderColor: '#E5A642',
        dotColor: '#E5A642'
      };
    }
    // General / Family / Default Green
    return {
      badgeBg: 'bg-[#E8F2EC] dark:bg-emerald-950/30',
      badgeText: 'text-[#244E38] dark:text-emerald-300',
      borderColor: '#3A7E64',
      dotColor: '#3A7E64'
    };
  };

  const getDayHeaderBadge = (dayEvents: FamilyEvent[], isWeekend: boolean) => {
    if (dayEvents.length === 0) {
      if (isWeekend) {
        return <span className="text-[11px] text-stone-400 dark:text-stone-500 font-normal">Выходной</span>;
      }
      return null;
    }

    // Check unique members
    const memberIds = Array.from(new Set(dayEvents.flatMap(e => e.memberIds || [])));
    if (memberIds.length === 1) {
      const member = members.find(m => m.id === memberIds[0]);
      if (member) {
        const color = member.name.toLowerCase().includes('галя') ? '#D97763' : member.name.toLowerCase().includes('гена') ? '#E5A642' : '#3A7E64';
        return <span className="text-[11px] font-medium" style={{ color }}>{member.name}</span>;
      }
    }

    if (dayEvents.some(e => e.memberIds?.length > 1 || !e.memberIds?.length)) {
      return <span className="text-[11px] font-medium text-[#3A7E64]">Семья</span>;
    }

    if (memberIds.length > 1) {
      return (
        <div className="flex items-center gap-1">
          {memberIds.slice(0, 3).map((id, idx) => {
            const m = members.find(mem => mem.id === id);
            return (
              <span 
                key={idx} 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: m?.color || (idx === 0 ? '#D97763' : '#3A7E64') }} 
              />
            );
          })}
        </div>
      );
    }

    return <span className="text-[11px] font-medium text-stone-500">Общее</span>;
  };

  return (
    <div className="flex h-full w-full bg-[#F8F6F0] dark:bg-[#121214] text-stone-900 dark:text-white font-sans overflow-hidden select-none">
      
      {/* Левая и центральная область: Календарь планов */}
      <main className="flex-1 flex flex-col min-w-0 h-full p-5 lg:p-7 overflow-y-auto">
        
        {/* Верхняя панель: Месяц, бейдж дней, фильтры и контролы */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-5 shrink-0">
          
          {/* Название месяца + счетчик дней */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold font-serif capitalize tracking-tight text-stone-900 dark:text-white">
                {monthName}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EBE5DB] dark:bg-white/10 text-stone-600 dark:text-stone-300">
                {daysInCurrentMonth} дней
              </span>
            </div>

            {/* Быстрое переключение месяцев */}
            <div className="flex items-center gap-0.5 ml-1">
              <button 
                onClick={() => changeDate(-1)} 
                className="p-1 rounded-lg hover:bg-stone-200/70 dark:hover:bg-white/10 text-stone-500 hover:text-stone-800 dark:text-stone-400 transition cursor-pointer"
                title="Предыдущий месяц"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => changeDate(1)} 
                className="p-1 rounded-lg hover:bg-stone-200/70 dark:hover:bg-white/10 text-stone-500 hover:text-stone-800 dark:text-stone-400 transition cursor-pointer"
                title="Следующий месяц"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Фильтры участников и выбор режима отображения */}
          <div className="flex items-center flex-wrap gap-2.5">
            
            {/* Фильтр: Все */}
            <button 
              onClick={() => setFilterMemberId('all')} 
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterMemberId === 'all' 
                  ? 'bg-[#EBE5DB] dark:bg-white/20 text-stone-900 dark:text-white shadow-xs' 
                  : 'bg-[#FDFBF7] dark:bg-white/5 border border-[#ECE5DB] dark:border-white/10 text-stone-600 dark:text-stone-300 hover:border-stone-400'
              }`}
            >
              Все ({events.length})
            </button>

            {/* Фильтры по участникам с цветными маркерами */}
            {members.map(m => {
              const isSelected = filterMemberId === m.id;
              const isGala = m.name.toLowerCase().includes('гал');
              const isGena = m.name.toLowerCase().includes('ген');
              const dotColor = isGala ? '#D97763' : isGena ? '#E5A642' : m.color || '#3A7E64';

              return (
                <button 
                  key={m.id} 
                  onClick={() => setFilterMemberId(isSelected ? 'all' : m.id)} 
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-[#EBE5DB] dark:bg-white/20 text-stone-900 dark:text-white shadow-xs' 
                      : 'bg-[#FDFBF7] dark:bg-white/5 border border-[#ECE5DB] dark:border-white/10 text-stone-700 dark:text-stone-300 hover:border-stone-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                  <span>{m.name}</span>
                </button>
              );
            })}

            {/* Фильтр: Общие */}
            <button 
              onClick={() => setFilterMemberId('all')} 
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-[#FDFBF7] dark:bg-white/5 border border-[#ECE5DB] dark:border-white/10 text-stone-700 dark:text-stone-300 hover:border-stone-400 transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#3A7E64] shrink-0" />
              <span>Общие</span>
            </button>

            {/* Переключатель вида (Месяц / Неделя / Расписание) */}
            <div className="flex items-center bg-[#EBE5DB] dark:bg-white/10 p-0.5 rounded-full text-xs font-medium ml-1">
              <button 
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  viewMode === 'month' 
                    ? 'bg-white dark:bg-[#2C2C2E] shadow-xs text-stone-900 dark:text-white font-bold' 
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Месяц
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  viewMode === 'week' 
                    ? 'bg-white dark:bg-[#2C2C2E] shadow-xs text-stone-900 dark:text-white font-bold' 
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Неделя
              </button>
              <button 
                onClick={() => setViewMode('schedule')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  viewMode === 'schedule' 
                    ? 'bg-white dark:bg-[#2C2C2E] shadow-xs text-stone-900 dark:text-white font-bold' 
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Расписание
              </button>
            </div>

            {/* Голосовой ввод */}
            <button 
              onClick={startListening} 
              className={`p-2 rounded-full transition-all cursor-pointer ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-[#EBE5DB] dark:bg-white/10 hover:bg-stone-300 text-stone-700 dark:text-stone-300'
              }`}
              title="Добавить голосом"
            >
              {isProcessingVoice ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
            </button>

            {/* Круглая темно-зеленая кнопка Создания */}
            <button 
              onClick={() => onOpenEvent(null, { date: getLocalDateString(selectedDate) })}
              className="w-9 h-9 rounded-full bg-[#2D5A46] hover:bg-[#234636] active:scale-95 text-white flex items-center justify-center transition shadow-xs cursor-pointer ml-1"
              title="Добавить событие"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {/* Сетка календаря */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 lg:p-6 border border-[#ECE5DB] dark:border-white/10 shadow-xs flex-1 flex flex-col min-h-0">
          
          {viewMode === 'month' && (
            <>
              {/* Заголовки дней недели */}
              <div className="grid grid-cols-7 mb-2 px-1 shrink-0">
                {WEEK_DAYS.map((day, idx) => (
                  <div 
                    key={day} 
                    className="text-center text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Сетка дней (7 колонок, гибкие карточки с мягким скруглением) */}
              <div className="grid grid-cols-7 flex-1 gap-2 overflow-y-auto no-scrollbar min-h-0 auto-rows-fr">
                {calendarData.slice(0, 35).map((d, i) => {
                  const dateObj = new Date(d.year, d.month, d.day);
                  const dateStr = getLocalDateString(dateObj);
                  const dayEvents: FamilyEvent[] = events.filter((e: FamilyEvent) => e.date === dateStr);

                  const isSelected = selectedDate.getDate() === d.day && selectedDate.getMonth() === d.month && selectedDate.getFullYear() === d.year;
                  const isToday = new Date().getDate() === d.day && new Date().getMonth() === d.month && new Date().getFullYear() === d.year;
                  const dayOfWeek = (i % 7);
                  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        const newDate = new Date(d.year, d.month, d.day);
                        setSelectedDate(newDate);
                      }}
                      className={`p-2.5 rounded-2xl transition-all cursor-pointer relative flex flex-col justify-between min-h-[96px] ${
                        d.current 
                          ? isSelected
                            ? 'border-2 border-[#2D5A46] bg-white dark:bg-[#1C1C1E] shadow-sm z-10'
                            : 'bg-[#F6F3EE] dark:bg-[#252528] border border-[#ECE5DB]/80 dark:border-white/5 hover:border-[#D5CDC2]'
                          : 'bg-stone-50/40 dark:bg-black/20 border border-transparent opacity-30'
                      }`}
                    >
                      {/* Верхняя строка ячейки: Число / Сегодня и Метка участника */}
                      <div className="flex justify-between items-center shrink-0 mb-1">
                        {d.current ? (
                          isToday ? (
                            <div className="flex items-center gap-1.5">
                              <span className="bg-[#2D5A46] text-white font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                {d.day} <span className="font-normal text-[10px]">сегодня</span>
                              </span>
                              {dayEvents.length > 0 && (
                                <div className="flex items-center gap-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97763]" />
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#3A7E64]" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className={`text-xs font-semibold ${isSelected ? 'text-[#2D5A46] font-bold' : 'text-stone-700 dark:text-stone-300'}`}>
                              {d.day}
                            </span>
                          )
                        ) : (
                          <span className="text-xs font-medium text-stone-400">
                            {d.day}
                          </span>
                        )}

                        {d.current && getDayHeaderBadge(dayEvents, isWeekend)}
                      </div>

                      {/* Список событий внутри дня */}
                      <div className="space-y-1 my-auto overflow-hidden">
                        {dayEvents.slice(0, 2).map((evt: FamilyEvent) => {
                          const dimmed = isEventDimmed(evt);
                          const badgeStyle = getEventBadgeStyle(evt);

                          return (
                            <div 
                              key={evt.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(new Date(d.year, d.month, d.day));
                                onOpenEvent(evt);
                              }}
                              className={`text-[11px] font-medium py-1 px-2 rounded-lg truncate transition-all flex items-center gap-1.5 border-l-2 ${
                                badgeStyle.badgeBg
                              } ${badgeStyle.badgeText} ${
                                dimmed ? 'opacity-40' : 'hover:opacity-90 shadow-2xs'
                              }`}
                              style={{ borderLeftColor: badgeStyle.borderColor }}
                            >
                              <span className="font-bold text-[10px] shrink-0 opacity-80">{evt.time || 'Весь день'}</span>
                              <span className="truncate">{evt.title}</span>
                            </div>
                          );
                        })}

                        {dayEvents.length === 0 && d.current && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(new Date(d.year, d.month, d.day));
                              onOpenEvent(null, { date: dateStr });
                            }}
                            className="text-[11px] text-stone-400 dark:text-stone-500 font-medium hover:text-[#2D5A46] transition py-1 text-center opacity-70 hover:opacity-100"
                          >
                            + Добавить
                          </div>
                        )}

                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-stone-500 font-semibold px-1">
                            + еще {dayEvents.length - 2}
                          </div>
                        )}
                      </div>

                      {/* Текст месяца для граничных дней */}
                      {!d.current && (
                        <span className="text-[10px] text-stone-400 text-center block mt-auto">
                          {d.month === currentDate.getMonth() - 1 ? 'Август' : 'Октябрь'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === 'week' && (
            <div className="grid grid-cols-7 flex-1 gap-3 overflow-y-auto no-scrollbar">
              {Array.from({ length: 7 }).map((_, i) => {
                const now = new Date(selectedDate);
                const firstDayOfWeek = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
                const dayDate = new Date(now.setDate(firstDayOfWeek + i));
                const dateStr = getLocalDateString(dayDate);
                const dayEvents = events.filter(e => e.date === dateStr);

                return (
                  <div key={i} className="bg-[#F6F3EE] dark:bg-[#252528] rounded-2xl p-4 border border-[#ECE5DB] flex flex-col">
                    <div className="text-center mb-3">
                      <span className="text-xs font-semibold text-stone-400 block">{WEEK_DAYS[i]}</span>
                      <span className="text-lg font-bold text-stone-900 dark:text-white">{dayDate.getDate()}</span>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto">
                      {dayEvents.map(evt => (
                        <div key={evt.id} onClick={() => onOpenEvent(evt)} className="p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#ECE5DB] text-xs space-y-1 cursor-pointer">
                          <span className="font-bold text-[#3A7E64] text-[10px]">{evt.time}</span>
                          <p className="font-bold text-stone-900 dark:text-white leading-tight">{evt.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'schedule' && (
            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
              {events.map(evt => (
                <div 
                  key={evt.id}
                  onClick={() => {
                    setSelectedDate(new Date(evt.date));
                    onOpenEvent(evt);
                  }}
                  className="p-4 bg-[#F6F3EE] dark:bg-[#252528] rounded-2xl border border-[#ECE5DB] hover:border-[#2D5A46] transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1C1C1E] flex flex-col items-center justify-center border border-[#ECE5DB]">
                      <span className="text-[10px] font-bold text-stone-400 uppercase">{new Date(evt.date).toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                      <span className="text-xs font-bold text-stone-900 dark:text-white">{new Date(evt.date).getDate()}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#3A7E64]">{evt.time}</span>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">{evt.title}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Правая колонка: ИНСПЕКТОР ДНЯ */}
      <aside className="w-[380px] bg-[#F8F6F0] dark:bg-[#141416] border-l border-[#ECE5DB] dark:border-white/10 flex flex-col shrink-0 h-full p-6 lg:p-7 overflow-y-auto no-scrollbar space-y-6">
        
        {/* Шапка инспектора */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3A7E64]" />
              ИНСПЕКТОР ДНЯ
            </span>
            <span className="text-stone-500 font-medium capitalize">
              {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long' })}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs text-stone-400 font-medium block">Выбранный день</span>
              <h2 className="text-2xl font-bold font-serif text-stone-900 dark:text-white">
                {selectedDate.getDate()} {selectedDate.toLocaleDateString('ru-RU', { month: 'long' })}
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EBE5DB] dark:bg-white/10 text-stone-700 dark:text-stone-300">
              {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'событие' : selectedDayEvents.length >= 2 && selectedDayEvents.length <= 4 ? 'события' : 'событий'}
            </span>
          </div>
        </div>

        {/* Секция: ПЛАНЫ НА СЕГОДНЯ */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 block">
            ПЛАНЫ НА СЕГОДНЯ
          </span>

          {selectedDayEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDayEvents.map((evt) => {
                const assignedMembers = members.filter(m => evt.memberIds?.includes(m.id));
                const memberName = assignedMembers.length > 0 ? assignedMembers.map(m => m.name).join(', ') : 'Вся семья';
                const isGala = memberName.toLowerCase().includes('гал');
                const isGena = memberName.toLowerCase().includes('ген');

                const dotColor = isGala ? '#D97763' : isGena ? '#E5A642' : '#3A7E64';
                const badgeBg = isGala ? 'bg-[#FDF0EC] text-[#9E3E28]' : isGena ? 'bg-[#FEF6E8] text-[#8C5E1A]' : 'bg-[#E8F2EC] text-[#244E38]';

                return (
                  <div 
                    key={evt.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#ECE5DB] dark:border-white/10 shadow-xs space-y-2 relative group"
                  >
                    {/* Верхняя строка карточки: Время + Бейдж участника + Карандаш */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          {evt.time || 'Весь день'} {evt.duration ? `– ${parseInt(evt.time || '12') + evt.duration}:00` : ''}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badgeBg}`}>
                          {memberName}
                        </span>
                      </div>

                      <button 
                        onClick={() => onOpenEvent(evt)}
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
                        title="Редактировать событие"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>

                    {/* Заголовок и подзаголовок */}
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white leading-snug">
                        {evt.title}
                      </h3>
                      {evt.description && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                          {evt.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/5 border border-dashed border-[#ECE5DB] dark:border-white/10 text-center">
              <p className="text-xs text-stone-400 font-medium">Нет запланированных событий на этот день</p>
            </div>
          )}

          {/* Кнопка добавления события на выбранный день */}
          <button 
            onClick={() => onOpenEvent(null, { date: getLocalDateString(selectedDate) })}
            className="w-full py-3 rounded-2xl border border-dashed border-[#D5CDC2] dark:border-white/15 bg-[#F6F3EE] dark:bg-white/5 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-[#2D5A46] hover:border-[#2D5A46] flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Добавить событие на {selectedDate.getDate()} {selectedDate.toLocaleDateString('ru-RU', { month: 'short' })}</span>
          </button>
        </div>

        {/* Секция: ПРЕДСТОЯЩИЕ НА НЕДЕЛЕ */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              ПРЕДСТОЯЩИЕ НА НЕДЕЛЕ
            </span>
            <span className="text-xs font-bold text-stone-500">
              Все ({upcomingEvents.length})
            </span>
          </div>

          <div className="space-y-2">
            {upcomingEvents.map(evt => {
              const dateObj = new Date(evt.date);
              const dayStr = dateObj.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
              const assignedMember = members.find(m => evt.memberIds?.includes(m.id));
              const meta = getEventCategoryMeta(evt.title, assignedMember);

              return (
                <div 
                  key={evt.id}
                  onClick={() => {
                    setSelectedDate(dateObj);
                    onOpenEvent(evt);
                  }}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] hover:border-stone-400 dark:hover:border-white/20 border border-[#ECE5DB] dark:border-white/10 transition flex items-center justify-between cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center shrink-0`}>
                      {meta.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate max-w-[160px]">
                        {evt.title}
                      </h4>
                      <span className="text-[11px] text-stone-400 font-medium">
                        {dayStr} • {assignedMember?.name || 'Семья'} ({meta.categoryName})
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-stone-600 dark:text-stone-300 shrink-0">
                    {evt.time || '10:00'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Нижний блок: Семейная синхронизация */}
        <div className="mt-auto pt-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#ECE5DB] dark:border-white/10 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#E8F2EC] text-[#3A7E64] flex items-center justify-center shrink-0">
                <RefreshCw size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900 dark:text-white">Семейная синхронизация</h4>
                <p className="text-[10px] text-stone-400">
                  Google Calendar & Telegram подключены
                </p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#3A7E64] shrink-0" />
          </div>
        </div>

      </aside>

    </div>
  );
};

export default FamilyPlansDesktop;
