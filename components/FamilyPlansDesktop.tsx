import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, 
  Mic, Loader2, CheckSquare, Square,
  Edit3, Dumbbell, Sparkle, Car, Film, Coffee,
  RefreshCw, Plane, Home, ShoppingBag, Heart,
  CheckCircle2, Sparkles, History, Clock, Send,
  AlertTriangle
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember, ChecklistItem } from '../types';
import { findEventConflicts } from '../utils/eventConflicts';
import { ConflictResolverModal } from './ConflictResolverModal';

interface FamilyPlansDesktopProps {
  events: FamilyEvent[];
  members: FamilyMember[];
  settings: AppSettings;
  
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  
  viewMode: 'month' | 'week' | 'day' | 'list';
  setViewMode: (m: 'month' | 'week' | 'day' | 'list') => void;
  listTab: 'upcoming' | 'past';
  setListTab: (t: 'upcoming' | 'past') => void;
  
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
  viewMode, setViewMode,
  listTab, setListTab,
  calendarData, selectedDayEvents,
  onOpenEvent, onSendToTelegram, onUpdateEvent,
  isListening, isProcessingVoice, startListening
}) => {
  const [filterMemberId, setFilterMemberId] = useState<string | 'all'>('all');
  const [isConflictResolverOpen, setIsConflictResolverOpen] = useState(false);
  const [selectedConflictPair, setSelectedConflictPair] = useState<{ eventA: FamilyEvent; eventB: FamilyEvent } | null>(null);

  const { conflictingEventIds, conflictPairs } = useMemo(() => {
    return findEventConflicts(events);
  }, [events]);

  const hasCurrentMonthConflicts = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    return events.some(evt => {
      if (!evt.date || !conflictingEventIds.has(evt.id)) return false;
      const [y, m] = evt.date.split('-').map(Number);
      return y === year && (m - 1) === month;
    });
  }, [events, currentDate, conflictingEventIds]);

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

  // Week calculation helpers
  const getMondayDate = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const currentWeekDays = useMemo(() => {
    const monday = getMondayDate(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      return dayDate;
    });
  }, [selectedDate]);

  const weekPeriodTitle = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const start = currentWeekDays[0];
    const end = currentWeekDays[6];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleString('ru-RU', { month: 'short' }).replace('.', '');
    const endMonth = end.toLocaleString('ru-RU', { month: 'short' }).replace('.', '');
    const year = end.getFullYear();

    if (start.getMonth() === end.getMonth()) {
      return `${startDay} — ${endDay} ${endMonth} ${year}`;
    }
    return `${startDay} ${startMonth} — ${endDay} ${endMonth} ${year}`;
  }, [currentWeekDays]);

  const changeWeek = (increment: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + increment * 7);
    setSelectedDate(newDate);
    if (newDate.getMonth() !== currentDate.getMonth() || newDate.getFullYear() !== currentDate.getFullYear()) {
      setCurrentDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    }
  };

  const resetToCurrentWeek = () => {
    const now = new Date();
    setSelectedDate(now);
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const isSelectedWeekCurrent = useMemo(() => {
    const todayMonday = getMondayDate(new Date());
    const selMonday = getMondayDate(selectedDate);
    return getLocalDateString(todayMonday) === getLocalDateString(selMonday);
  }, [selectedDate]);

  // Schedule filtered events within current selected month
  const currentMonthEvents = useMemo(() => {
    const targetYear = currentDate.getFullYear();
    const targetMonth = currentDate.getMonth();

    return events.filter(e => {
      const [y, m] = (e.date || '').split('-').map(Number);
      return y === targetYear && (m - 1) === targetMonth && (filterMemberId === 'all' || e.memberIds?.includes(filterMemberId));
    });
  }, [events, currentDate, filterMemberId]);

  const scheduleUpcomingEvents = useMemo(() => {
    const now = new Date();
    return currentMonthEvents.filter(e => {
      const eDate = new Date(`${e.date}T${e.time || '00:00'}`);
      return eDate >= now;
    }).sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const db = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return da - db;
    });
  }, [currentMonthEvents]);

  const schedulePastEvents = useMemo(() => {
    const now = new Date();
    return currentMonthEvents.filter(e => {
      const eDate = new Date(`${e.date}T${e.time || '00:00'}`);
      return eDate < now;
    }).sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const db = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return db - da;
    });
  }, [currentMonthEvents]);

  const isEventDimmed = (event: FamilyEvent) => {
    if (filterMemberId === 'all') return false;
    if (filterMemberId === 'conflicts') {
      return !conflictingEventIds.has(event.id);
    }
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

  // Color theme generator for event chips based on participant member color
  const getEventBadgeStyle = (evt: FamilyEvent) => {
    const assignedMembers = members.filter(m => evt.memberIds?.includes(m.id));

    if (assignedMembers.length === 1) {
      const m = assignedMembers[0];
      const mName = m.name.toLowerCase();
      const mColor = m.color || (
        mName.includes('гал') ? '#D97763' :
        mName.includes('ген') ? '#E5A642' :
        mName.includes('пап') ? '#2563EB' :
        mName.includes('мам') ? '#DB2777' : '#3A7E64'
      );

      if (mColor === '#D97763' || mName.includes('гал')) {
        return {
          badgeBg: 'bg-[#FDF0EC] dark:bg-rose-950/30',
          badgeText: 'text-[#9E3E28] dark:text-rose-300',
          borderColor: '#D97763',
          dotColor: '#D97763',
          memberName: m.name
        };
      }
      if (mColor === '#E5A642' || mName.includes('ген')) {
        return {
          badgeBg: 'bg-[#FEF6E8] dark:bg-amber-950/30',
          badgeText: 'text-[#8C5E1A] dark:text-amber-300',
          borderColor: '#E5A642',
          dotColor: '#E5A642',
          memberName: m.name
        };
      }
      if (mColor === '#2563EB' || mName.includes('пап')) {
        return {
          badgeBg: 'bg-blue-50 dark:bg-blue-950/30',
          badgeText: 'text-blue-800 dark:text-blue-300',
          borderColor: '#2563EB',
          dotColor: '#2563EB',
          memberName: m.name
        };
      }
      if (mColor === '#DB2777' || mName.includes('мам')) {
        return {
          badgeBg: 'bg-pink-50 dark:bg-pink-950/30',
          badgeText: 'text-pink-800 dark:text-pink-300',
          borderColor: '#DB2777',
          dotColor: '#DB2777',
          memberName: m.name
        };
      }
      return {
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/30',
        badgeText: 'text-emerald-900 dark:text-emerald-300',
        borderColor: mColor,
        dotColor: mColor,
        memberName: m.name
      };
    }

    const memberName = assignedMembers.length > 1 
      ? assignedMembers.map(m => m.name).join(', ') 
      : 'Вся семья';

    return {
      badgeBg: 'bg-[#E8F2EC] dark:bg-emerald-950/30',
      badgeText: 'text-[#244E38] dark:text-emerald-300',
      borderColor: '#3A7E64',
      dotColor: '#3A7E64',
      memberName
    };
  };

  const getDayHeaderBadge = (dayEvents: FamilyEvent[], isWeekend: boolean) => {
    if (dayEvents.length === 0 && isWeekend) {
      return <span className="text-[11px] text-stone-400 dark:text-stone-500 font-normal">Выходной</span>;
    }
    return null;
  };

  return (
    <div className="flex h-full w-full bg-[#F8F6F0] dark:bg-[#121214] text-stone-900 dark:text-white font-sans overflow-hidden select-none">
      
      {/* Левая и центральная область: Календарь планов */}
      <main className="flex-1 flex flex-col min-w-0 h-full p-5 lg:p-7 overflow-y-auto">
        
        {/* Верхняя панель: Месяц, бейдж дней, фильтры и контролы */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-5 shrink-0">
          
          {/* Название месяца / недели + счетчик */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold font-serif capitalize tracking-tight text-stone-900 dark:text-white">
                {viewMode === 'week' ? weekPeriodTitle : monthName}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EBE5DB] dark:bg-white/10 text-stone-600 dark:text-stone-300">
                {viewMode === 'week' 
                  ? (isSelectedWeekCurrent ? 'Текущая неделя' : 'Неделя')
                  : `${daysInCurrentMonth} дней`}
              </span>
              {viewMode === 'week' && !isSelectedWeekCurrent && (
                <button
                  type="button"
                  onClick={resetToCurrentWeek}
                  className="text-xs font-bold text-[#2D5A46] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  К текущей неделе
                </button>
              )}
            </div>

            {/* Быстрое переключение месяцев / недель */}
            <div className="flex items-center gap-0.5 ml-1">
              <button 
                onClick={() => viewMode === 'week' ? changeWeek(-1) : changeDate(-1)} 
                className="p-1 rounded-lg hover:bg-stone-200/70 dark:hover:bg-white/10 text-stone-500 hover:text-stone-800 dark:text-stone-400 transition cursor-pointer"
                title={viewMode === 'week' ? "Предыдущая неделя" : "Предыдущий месяц"}
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => viewMode === 'week' ? changeWeek(1) : changeDate(1)} 
                className="p-1 rounded-lg hover:bg-stone-200/70 dark:hover:bg-white/10 text-stone-500 hover:text-stone-800 dark:text-stone-400 transition cursor-pointer"
                title={viewMode === 'week' ? "Следующая неделя" : "Следующий месяц"}
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

            {/* Фильтры по участникам (только если есть события) */}
            {members.map(m => {
              const count = events.filter(e => e.memberIds && e.memberIds.includes(m.id)).length;
              if (count === 0) return null;

              const isSelected = filterMemberId === m.id;

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
                  <span>{m.name}</span>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold">({count})</span>
                </button>
              );
            })}

            {/* Фильтр: Общие */}
            <button 
              onClick={() => setFilterMemberId('all')} 
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-[#FDFBF7] dark:bg-white/5 border border-[#ECE5DB] dark:border-white/10 text-stone-700 dark:text-stone-300 hover:border-stone-400 transition cursor-pointer"
            >
              <span>Общие</span>
            </button>

            {/* Переключатель вида (Месяц / Неделя / Расписание) */}
            <div className="flex items-center bg-[#EBE5DB] dark:bg-white/10 p-0.5 rounded-full text-xs font-medium ml-1">
              <button 
                onClick={() => {
                  setViewMode('month');
                  const now = new Date();
                  setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(now);
                }}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  viewMode === 'month' 
                    ? 'bg-white dark:bg-[#2C2C2E] shadow-xs text-stone-900 dark:text-white font-bold' 
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Месяц
              </button>
              <button 
                onClick={() => {
                  setViewMode('week');
                  resetToCurrentWeek();
                }}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  viewMode === 'week' 
                    ? 'bg-white dark:bg-[#2C2C2E] shadow-xs text-stone-900 dark:text-white font-bold' 
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Неделя
              </button>
              <button 
                onClick={() => {
                  setViewMode('list');
                  setListTab('upcoming');
                }}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  viewMode === 'list' 
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
                          ? isToday
                            ? 'border-2 border-[#2D5A46] ring-2 ring-[#2D5A46]/20 bg-white dark:bg-[#1C1C1E] shadow-sm z-10'
                            : isSelected
                            ? 'border-2 border-[#2D5A46]/80 bg-white dark:bg-[#1C1C1E] shadow-sm z-10'
                            : 'bg-[#F6F3EE] dark:bg-[#252528] border border-[#ECE5DB]/80 dark:border-white/5 hover:border-[#D5CDC2]'
                          : 'bg-stone-50/40 dark:bg-black/20 border border-transparent opacity-30'
                      }`}
                    >
                      {/* Верхняя строка ячейки: Число */}
                      <div className="flex justify-between items-center shrink-0 mb-1">
                        {d.current ? (
                          <span className={`text-xs ${isToday ? 'text-[#2D5A46] dark:text-emerald-400 font-extrabold text-sm' : isSelected ? 'text-[#2D5A46] font-bold' : 'text-stone-700 dark:text-stone-300 font-semibold'}`}>
                            {d.day}
                          </span>
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
                                dimmed ? 'opacity-30 scale-98' : 'hover:opacity-90 shadow-2xs'
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
                        <span className="text-[10px] text-stone-400 text-center block mt-auto capitalize">
                          {new Date(d.year, d.month, 1).toLocaleString('ru-RU', { month: 'long' })}
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
              {currentWeekDays.map((dayDate, i) => {
                const dateStr = getLocalDateString(dayDate);
                const dayEvents = events.filter(e => e.date === dateStr && (filterMemberId === 'all' || e.memberIds?.includes(filterMemberId)));
                const isToday = getLocalDateString(new Date()) === dateStr;
                const isSelected = getLocalDateString(selectedDate) === dateStr;
                const isWeekend = i >= 5;

                return (
                  <div 
                    key={dateStr}
                    onClick={() => setSelectedDate(dayDate)} 
                    className={`rounded-2xl p-3.5 border transition flex flex-col cursor-pointer ${
                      isSelected 
                        ? 'border-2 border-[#2D5A46] bg-white dark:bg-[#1E1E20] shadow-sm'
                        : isToday
                        ? 'bg-[#E8F2EC]/40 dark:bg-[#2D5A46]/20 border-[#2D5A46]/40'
                        : 'bg-[#F6F3EE] dark:bg-[#252528] border-[#ECE5DB] dark:border-white/5 hover:border-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 dark:border-white/10 mb-3">
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        isWeekend ? 'text-[#D97763]' : 'text-stone-400 dark:text-stone-400'
                      }`}>
                        {WEEK_DAYS[i]}
                      </span>
                      <span className={`text-base font-extrabold px-2 py-0.5 rounded-full leading-none ${
                        isToday ? 'bg-[#2D5A46] text-white' : isSelected ? 'text-[#2D5A46]' : 'text-stone-900 dark:text-white'
                      }`}>
                        {dayDate.getDate()}
                      </span>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
                      {dayEvents.map(evt => {
                        const badgeStyle = getEventBadgeStyle(evt);

                        return (
                          <div 
                            key={evt.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(dayDate);
                              onOpenEvent(evt);
                            }} 
                            className={`p-2.5 rounded-xl border-l-2 text-xs space-y-1 transition cursor-pointer hover:shadow-2xs ${badgeStyle.badgeBg} ${badgeStyle.badgeText}`}
                            style={{ borderLeftColor: badgeStyle.borderColor }}
                          >
                            <span className="font-bold text-[10px] block opacity-90">{evt.time || 'Весь день'}</span>
                            <p className="font-bold leading-tight line-clamp-2">{evt.title}</p>
                          </div>
                        );
                      })}
                      {dayEvents.length === 0 && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(dayDate);
                            onOpenEvent(null, { date: dateStr });
                          }}
                          className="text-[11px] text-stone-400 dark:text-stone-500 font-medium hover:text-[#2D5A46] transition py-3 text-center opacity-70 hover:opacity-100 italic"
                        >
                          + Добавить
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-4">
              {/* Переключатель: Будущие / Прошедшие в рамках текущего месяца */}
              <div className="flex items-center justify-between shrink-0 pb-2 border-b border-stone-200/60 dark:border-white/10">
                <div className="inline-flex bg-[#EBE5DB] dark:bg-white/10 p-1 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setListTab('upcoming')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                      listTab === 'upcoming'
                        ? 'bg-white dark:bg-[#2C2C2E] text-[#2D5A46] dark:text-emerald-300 shadow-sm'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <Sparkles size={14} />
                    <span>Будущие</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      listTab === 'upcoming' ? 'bg-[#2D5A46]/15 text-[#2D5A46] dark:text-emerald-300' : 'bg-black/5 dark:bg-white/10'
                    }`}>
                      {scheduleUpcomingEvents.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setListTab('past')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                      listTab === 'past'
                        ? 'bg-white dark:bg-[#2C2C2E] text-[#2D5A46] dark:text-emerald-300 shadow-sm'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <History size={14} />
                    <span>Прошедшие</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      listTab === 'past' ? 'bg-[#2D5A46]/15 text-[#2D5A46] dark:text-emerald-300' : 'bg-black/5 dark:bg-white/10'
                    }`}>
                      {schedulePastEvents.length}
                    </span>
                  </button>
                </div>

                <div className="text-xs font-semibold text-stone-500">
                  {listTab === 'upcoming' ? 'Предстоящие события' : 'Прошедшие события'} за {monthName}
                </div>
              </div>

              {/* Список событий */}
              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
                {(listTab === 'upcoming' ? scheduleUpcomingEvents : schedulePastEvents).length > 0 ? (
                  (listTab === 'upcoming' ? scheduleUpcomingEvents : schedulePastEvents).map(evt => {
                    const badgeStyle = getEventBadgeStyle(evt);
                    const dateObj = new Date(evt.date);
                    const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });

                    return (
                      <div 
                        key={evt.id}
                        onClick={() => {
                          setSelectedDate(new Date(evt.date));
                          onOpenEvent(evt);
                        }}
                        className="p-4 bg-[#F6F3EE] dark:bg-[#252528] rounded-2xl border border-[#ECE5DB] dark:border-white/5 hover:border-[#2D5A46] transition flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#1C1C1E] flex flex-col items-center justify-center border border-[#ECE5DB] dark:border-white/10 shrink-0 shadow-2xs">
                            <span className="text-[10px] font-bold text-stone-400 uppercase leading-none">
                              {dateObj.toLocaleDateString('ru-RU', { weekday: 'short' })}
                            </span>
                            <span className="text-base font-extrabold text-stone-900 dark:text-white mt-0.5 leading-none">
                              {dateObj.getDate()}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-extrabold text-[#2D5A46] dark:text-emerald-400 flex items-center gap-1">
                                <Clock size={12} />
                                {evt.time || 'Весь день'}
                              </span>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeStyle.badgeBg} ${badgeStyle.badgeText}`}>
                                {badgeStyle.memberName}
                              </span>
                              <span className="text-xs text-stone-400">
                                {formattedDate}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-stone-900 dark:text-white truncate">
                              {evt.title}
                            </h4>
                            {evt.description && (
                              <p className="text-xs text-stone-500 truncate mt-0.5">
                                {evt.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendToTelegram(evt);
                            }}
                            className="p-2 rounded-xl bg-white dark:bg-[#1C1C1E] text-stone-400 hover:text-[#2D5A46] border border-[#ECE5DB] dark:border-white/10 transition cursor-pointer"
                            title="Отправить в Telegram"
                          >
                            <Send size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center bg-[#F6F3EE]/50 dark:bg-white/5 rounded-3xl p-8 border border-dashed border-[#ECE5DB] dark:border-white/10">
                    <CheckCircle2 size={40} className="mx-auto text-stone-400 mb-2 opacity-60" />
                    <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                      {listTab === 'upcoming' 
                        ? `В ${monthName} нет запланированных событий` 
                        : `В ${monthName} нет прошедших событий`}
                    </p>
                    {listTab === 'upcoming' && (
                      <button
                        type="button"
                        onClick={() => onOpenEvent(null, { date: getLocalDateString(new Date()) })}
                        className="mt-4 px-4 py-2 rounded-xl bg-[#2D5A46] hover:bg-[#234636] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                      >
                        <Plus size={15} />
                        <span>Создать событие</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
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

          {/* Сообщение в инспекторе о пересечениях в текущем месяце */}
          {hasCurrentMonthConflicts && (
            <button
              type="button"
              onClick={() => {
                if (conflictPairs.length > 0) {
                  setSelectedConflictPair(conflictPairs[0]);
                  setIsConflictResolverOpen(true);
                }
              }}
              className="w-full text-left p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2.5 text-amber-900 dark:text-amber-200 text-xs font-bold shadow-2xs hover:bg-amber-100/80 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>В текущем месяце есть пересечения событий по времени</span>
              </div>
              <ChevronRight size={16} className="shrink-0 text-amber-600" />
            </button>
          )}

          {selectedDayEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDayEvents.map((evt) => {
                const badgeStyle = getEventBadgeStyle(evt);
                const isConflict = conflictingEventIds.has(evt.id);

                return (
                  <div 
                    key={evt.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#ECE5DB] dark:border-white/10 shadow-xs space-y-2 relative group"
                  >
                    {/* Верхняя строка карточки: Время + Бейдж участника + Сообщение о пересечении + Карандаш */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          {evt.time || 'Весь день'} {evt.duration ? `– ${parseInt(evt.time || '12') + evt.duration}:00` : ''}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badgeStyle.badgeBg} ${badgeStyle.badgeText}`}>
                          {badgeStyle.memberName}
                        </span>
                        {isConflict && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const pair = conflictPairs.find(p => p.eventA.id === evt.id || p.eventB.id === evt.id);
                              if (pair) {
                                setSelectedConflictPair(pair);
                                setIsConflictResolverOpen(true);
                              }
                            }}
                            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                            title="Открыть разрешение конфликта"
                          >
                            <AlertTriangle size={11} className="text-amber-600" />
                            <span>Пересечение</span>
                          </button>
                        )}
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

        {/* Секция: ПРЕДСТОЯЩИЕ НА НЕДЕЛЕ (только не в режиме месяца) */}
        {viewMode !== 'month' && (
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
        )}

      </aside>

      <ConflictResolverModal
        isOpen={isConflictResolverOpen}
        onClose={() => setIsConflictResolverOpen(false)}
        conflictPair={selectedConflictPair}
        members={members}
        onUpdateEvent={onUpdateEvent}
        onOpenEvent={onOpenEvent}
      />

    </div>
  );
};

export default FamilyPlansDesktop;
