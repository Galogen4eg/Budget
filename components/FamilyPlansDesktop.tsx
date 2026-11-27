import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, 
  Mic, Loader2, CheckSquare, Square,
  Edit3, Dumbbell, Sparkle, Car, Film, Coffee,
  RefreshCw, Plane, Home, ShoppingBag, Heart,
  CheckCircle2, Sparkles, History, Clock, Send,
  AlertTriangle, Users
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember, ChecklistItem } from '../types';
import { findEventConflicts } from '../utils/eventConflicts';
import { parseLocalCalendarDate, calendarEndTime, filterEventsForCalendarMonth, matchesCalendarMember, calendarViewPeriod, formatCalendarWeekRange, formatCalendarMonthTitle, calendarEventCountLabel } from '../utils/calendarDates';
import { shiftCalendarMonth, selectedDayInMonth } from '../utils/calendarMonthNavigation';
import { ConflictResolverModal } from './ConflictResolverModal';
import { FILTER_RAIL, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_IDLE, SURFACE_CARD } from './filterUiTokens';

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
  filterMemberId: string;
  setFilterMemberId:(value:string)=>void;
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
  filterMemberId,setFilterMemberId,
  calendarData, selectedDayEvents,
  onOpenEvent, onSendToTelegram, onUpdateEvent,
  isListening, isProcessingVoice, startListening
}) => {
  const [isConflictResolverOpen, setIsConflictResolverOpen] = useState(false);
  const [selectedConflictPair, setSelectedConflictPair] = useState<{ eventA: FamilyEvent; eventB: FamilyEvent } | null>(null);

  const visiblePeriod=useMemo(()=>calendarViewPeriod(currentDate,selectedDate,viewMode),[currentDate,selectedDate,viewMode]);
  const periodEvents=useMemo(()=>events.filter(e=>e.date>=visiblePeriod.from&&e.date<=visiblePeriod.to),[events,visiblePeriod]);
  const { conflictingEventIds, conflictPairs } = useMemo(() => {
    return findEventConflicts(events,visiblePeriod);
  }, [events,visiblePeriod]);

  const hasPeriodConflicts=conflictPairs.length>0;

  const monthName = formatCalendarMonthTitle(currentDate);
  const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const changeDate = (dir: number) => {
    const newDate = shiftCalendarMonth(currentDate, dir);
    setCurrentDate(newDate);
    setSelectedDate(selectedDayInMonth(selectedDate,newDate));
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

  const weekPeriodTitle=useMemo(()=>currentWeekDays.length?formatCalendarWeekRange(currentWeekDays[0],currentWeekDays[6],true):'', [currentWeekDays]);

  const changeDay = (increment: number) => {
    const nextDate=new Date(selectedDate);
    nextDate.setDate(nextDate.getDate()+increment);
    setSelectedDate(nextDate);
    setCurrentDate(new Date(nextDate.getFullYear(),nextDate.getMonth(),1));
  };
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

  const memberIds = useMemo(()=>members.map(member=>member.id),[members]);
  const matchesMember = (event:FamilyEvent) => matchesCalendarMember(event,filterMemberId,memberIds);
  const filteredDayEvents = selectedDayEvents.filter(matchesMember);
  // Schedule filtered events within current selected month
  const currentMonthEvents = useMemo(() => {
    const targetYear = currentDate.getFullYear();
    const targetMonth = currentDate.getMonth();

    return events.filter(e => {
      const [y, m] = (e.date || '').split('-').map(Number);
      return y === targetYear && (m - 1) === targetMonth && matchesMember(e);
    });
  }, [events, currentDate, filterMemberId, memberIds]);

  const scheduleUpcomingEvents = filterEventsForCalendarMonth(currentMonthEvents,currentDate,'upcoming');
  const schedulePastEvents = filterEventsForCalendarMonth(currentMonthEvents,currentDate,'past');

  // Предстоящие события на ближайшую неделю
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    return events
      .filter(e => e.date >= todayStr && matchesMember(e))
      .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`))
      .slice(0, 6);
  }, [events, filterMemberId, memberIds]);

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
      bg: 'bg-[var(--terra-surface)] dark:bg-white/5',
      text: 'text-stone-600 dark:text-stone-300',
      categoryName: 'Личное'
    };
  };

  // Color theme generator for event chips based on participant member color
  const getEventBadgeStyle = (evt: FamilyEvent) => {
    const assignedMembers = members.filter(m => evt.memberIds?.includes(m.id));

    if (assignedMembers.length === 1) {
      const m = assignedMembers[0];
      const mColor = m.color || '#4A7C59';
      return {
        badgeBg: 'bg-white/80 dark:bg-white/10',
        badgeText: 'text-stone-800 dark:text-stone-100',
        borderColor: mColor,
        dotColor: mColor,
        memberName: m.name,
        color: mColor
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
      memberName,
      color: '#3A7E64'
    };
  };

  const openSelectedDay=(day:Date)=>{
    setSelectedDate(day);
    requestAnimationFrame(()=>{const target=document.getElementById('plans-selected-day-desktop');target?.scrollIntoView({block:'nearest',behavior:'auto'});target?.focus({preventScroll:true});});
  };

  return (
    <div className="terra-plans-desktop grid items-start min-w-0 w-full bg-[var(--terra-canvas)] text-[var(--terra-ink)] dark:text-white font-body">
      
      {/* Левая и центральная область: Календарь планов */}
      <main className="flex-1 flex flex-col min-w-0 p-4 xl:p-6">
        
        {/* Верхняя панель: Месяц, бейдж дней, фильтры и контролы */}
        <header className="flex flex-col gap-2 mb-3 shrink-0">
          
          {/* Название месяца / недели + счетчик */}
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h1 className="text-xl lg:text-2xl font-semibold font-headline text-[var(--terra-ink)] [overflow-wrap:anywhere]">
                {viewMode === 'day' ? selectedDate.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}) : viewMode === 'week' ? weekPeriodTitle : monthName}
              </h1>
            </div>

            {/* Быстрое переключение месяцев / недель */}
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={resetToCurrentWeek} className="min-h-[44px] px-3 rounded-xl text-sm font-semibold text-[var(--terra-primary-text)] bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] terra-press">Сегодня</button>
              <button 
                onClick={() => viewMode === 'day' ? changeDay(-1) : viewMode === 'week' ? changeWeek(-1) : changeDate(-1)}
                aria-label={viewMode === 'day' ? "Предыдущий день" : viewMode === 'week' ? "Предыдущая неделя" : "Предыдущий месяц"}
                className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-stone-200/70 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-stone-500 hover:text-stone-800 dark:text-stone-400 transition cursor-pointer"
                title={viewMode === 'day' ? "Предыдущий день" : viewMode === 'week' ? "Предыдущая неделя" : "Предыдущий месяц"}
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => viewMode === 'day' ? changeDay(1) : viewMode === 'week' ? changeWeek(1) : changeDate(1)}
                aria-label={viewMode === 'day' ? "Следующий день" : viewMode === 'week' ? "Следующая неделя" : "Следующий месяц"}
                className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-stone-200/70 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-stone-500 hover:text-stone-800 dark:text-stone-400 transition cursor-pointer"
                title={viewMode === 'day' ? "Следующий день" : viewMode === 'week' ? "Следующая неделя" : "Следующий месяц"}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Common non-shrinking participant rail; avoid duplicate 'Общие' button that simply reset to all. */}
          <div role="group" aria-label="Участник планов" className={FILTER_RAIL}>
            <button type="button" data-member-filter="all" aria-pressed={filterMemberId === 'all'}
              onClick={() => setFilterMemberId('all')}
              className={`${FILTER_CHIP} ${filterMemberId === 'all' ? FILTER_CHIP_ACTIVE : FILTER_CHIP_IDLE}`}>
              Все ({periodEvents.length})
            </button>
            {members.map(m => {
              const count = periodEvents.filter(e => matchesCalendarMember(e,m.id,memberIds)).length;
              const isSelected = filterMemberId === m.id;
              return (
                <button key={m.id} type="button" data-member-filter={m.id} aria-pressed={isSelected}
                  onClick={() => setFilterMemberId(m.id)}
                  className={`${FILTER_CHIP} ${isSelected ? FILTER_CHIP_ACTIVE : FILTER_CHIP_IDLE}`}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.color || '#4A7C59' }} />
                  <span className="max-w-[12rem] truncate" title={m.name}>{m.name}</span>
                  <span className="text-xs opacity-70">({count})</span>
                </button>
              );
            })}

            {members.length>1 && <button type="button" data-member-filter="common" aria-pressed={filterMemberId==='common'}
              onClick={()=>setFilterMemberId('common')}
              className={`${FILTER_CHIP} ${filterMemberId==='common'?FILTER_CHIP_ACTIVE:FILTER_CHIP_IDLE}`}>
              Общие ({periodEvents.filter(event=>matchesCalendarMember(event,'common',memberIds)).length})
            </button>}

          </div>
          <div className="flex flex-wrap items-center gap-2 justify-between min-w-0">
            {/* Переключатель вида (Месяц / Неделя / Расписание) */}
            <div role="group" aria-label="Вид календаря" className={FILTER_RAIL+" flex-1"}>
              <button 
                onClick={() => setViewMode('month')}
                aria-pressed={viewMode === 'month'}
                className={`${FILTER_CHIP} cursor-pointer ${
                  viewMode === 'month' 
                    ? FILTER_CHIP_ACTIVE 
                    : FILTER_CHIP_IDLE
                }`}
              >
                Месяц
              </button>
              <button 
                onClick={() => {
                  setViewMode('week');
                  setCurrentDate(new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1));
                }}
                aria-pressed={viewMode === 'week'}
                className={`${FILTER_CHIP} cursor-pointer ${
                  viewMode === 'week' 
                    ? FILTER_CHIP_ACTIVE 
                    : FILTER_CHIP_IDLE
                }`}
              >
                Неделя
              </button>
              <button type="button" onClick={() => {
                setViewMode('day');
                setCurrentDate(new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1));
              }} aria-pressed={viewMode === 'day'}
                className={`${FILTER_CHIP} cursor-pointer ${viewMode === 'day' ? FILTER_CHIP_ACTIVE : FILTER_CHIP_IDLE}`}>День</button>
              <button 
                aria-pressed={viewMode === 'list'}
                onClick={() => {
                  setViewMode('list');
                  setListTab('upcoming');
                }}
                className={`${FILTER_CHIP} cursor-pointer ${
                  viewMode === 'list' 
                    ? FILTER_CHIP_ACTIVE 
                    : FILTER_CHIP_IDLE
                }`}
              >
                Расписание
              </button>
            </div>

            {/* Голосовой ввод */}
            <button 
              type="button" onClick={startListening} 
              aria-label="Голосовой ввод события"
              className={`w-11 h-11 flex flex-none items-center justify-center rounded-xl transition-colors cursor-pointer ${
                isListening 
                  ? 'bg-red-500 text-white ' 
                  : 'bg-[var(--terra-soft)] dark:bg-white/10 hover:bg-stone-300 text-stone-700 dark:text-stone-300'
              }`}
              title="Добавить голосом"
            >
              {isProcessingVoice ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
            </button>

            {/* Круглая темно-зеленая кнопка Создания */}
            <button 
              onClick={() => onOpenEvent(null, { date: getLocalDateString(selectedDate) })}
              aria-label="Добавить событие"
              className="w-11 h-11 shrink-0 rounded-xl bg-[#2D5A46] hover:bg-[#234636]  text-white flex items-center justify-center transition shadow-xs cursor-pointer ml-1"
              title="Добавить событие"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {/* Сетка календаря */}
        <div className={`${SURFACE_CARD} terra-layout-surface terra-calendar-desktop-surface flex-1 flex flex-col min-h-0`}>
          
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
              <div data-testid="plans-month-grid" className="terra-calendar-desktop-grid grid grid-cols-7 gap-2 min-w-0">
                {calendarData.map((d, i) => {
                  const dateObj = new Date(d.year, d.month, d.day);
                  const dateStr = getLocalDateString(dateObj);
                  const dayEvents: FamilyEvent[] = events.filter((e: FamilyEvent) => e.date === dateStr && matchesMember(e));

                  const isSelected = selectedDate.getDate() === d.day && selectedDate.getMonth() === d.month && selectedDate.getFullYear() === d.year;
                  const isToday = new Date().getDate() === d.day && new Date().getMonth() === d.month && new Date().getFullYear() === d.year;
                  const dayOfWeek = (i % 7);
                  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

                  return (
                    <div key={i} data-terra-calendar-day className="terra-calendar-day min-w-0"
                      data-selected={isSelected} data-today={isToday} data-current-month={d.current}>
                      <button type="button" aria-label={`Выбрать дату ${dateStr}, ${calendarEventCountLabel(dayEvents.length)}`}
                        aria-pressed={isSelected} aria-current={isToday?'date':undefined}
                        onClick={()=>setSelectedDate(dateObj)}
                        className="terra-calendar-day-select w-full min-h-[44px] rounded-lg flex items-center justify-between gap-1 px-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] terra-press">
                        <span>{d.day}</span>
                        {dayEvents.length>0&&<span className="text-xs tabular-nums text-[var(--terra-muted)]">{dayEvents.length}</span>}
                      </button>
                      {/* Список событий внутри дня */}
                      <div className="space-y-1 min-w-0">
                        {dayEvents.slice(0, 2).map((evt: FamilyEvent) => {
                          const badgeStyle = getEventBadgeStyle(evt);

                          return (
                            <button type="button"
                              key={evt.id}
                              aria-label={`Открыть событие: ${evt.title}, ${dateStr}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(new Date(d.year, d.month, d.day));
                                onOpenEvent(evt);
                              }}
                              className={`terra-calendar-event w-full min-w-0 text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] text-xs font-medium py-1.5 px-1.5 rounded-lg transition-colors motion-reduce:transition-none flex flex-col items-start justify-center gap-0.5 border-l-2 ${
                                badgeStyle.badgeBg
                              } ${badgeStyle.badgeText} hover:opacity-90`}
                              style={{ borderLeftColor: badgeStyle.borderColor }}
                            >
                              <span className="text-xs font-semibold">{evt.time || 'Весь день'}</span>
                              <span className="w-full truncate" title={evt.title}>{evt.title}</span>
                            </button>
                          );
                        })}

                        {dayEvents.length === 0 && d.current && (
                          <button type="button"
                            aria-label={`Добавить событие: ${dateStr}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(new Date(d.year, d.month, d.day));
                              onOpenEvent(null, { date: dateStr });
                            }}
                            className="min-h-[44px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] text-xs text-[var(--terra-muted)] font-medium hover:text-[var(--terra-primary-text)] transition-colors motion-reduce:transition-none py-1 text-center"
                          >
                            <Plus size={15} aria-hidden="true" className="mx-auto"/>
                          </button>
                        )}

                        {dayEvents.length > 2 && (
                          <button type="button" onClick={()=>openSelectedDay(dateObj)} aria-label={`Выбрать дату ${dateStr}, ещё ${calendarEventCountLabel(dayEvents.length-2)}`} className="min-h-[44px] w-full text-left text-xs text-[var(--terra-primary-text)] font-semibold px-1 focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">Ещё {dayEvents.length-2}</button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={()=>openSelectedDay(selectedDate)} className="terra-plans-selected-day-jump mt-2 min-h-[44px] text-sm font-semibold text-[var(--terra-primary-text)] rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">События дня ({filteredDayEvents.length})</button>
            </>
          )}

          {viewMode === 'week' && (
            <div data-testid="plans-week-grid" className="terra-calendar-desktop-grid grid grid-cols-7 gap-2 min-w-0">
              {currentWeekDays.map((dayDate, i) => {
                const dateStr = getLocalDateString(dayDate);
                const dayEvents = events.filter(e => e.date === dateStr && matchesMember(e));
                const isToday = getLocalDateString(new Date()) === dateStr;
                const isSelected = getLocalDateString(selectedDate) === dateStr;
                const isWeekend = i >= 5;

                return (
                  <div key={dateStr} data-terra-calendar-day className="terra-calendar-day min-w-0" data-selected={isSelected} data-today={isToday} data-current-month={true}>
                    <button type="button" aria-label={`Выбрать дату ${dateStr}, ${calendarEventCountLabel(dayEvents.length)}`}
                      aria-current={isToday?'date':undefined} aria-pressed={isSelected} onClick={()=>setSelectedDate(dayDate)}
                      className="terra-calendar-day-select min-h-[44px] w-full rounded-lg flex flex-wrap items-center justify-between gap-1 px-1.5 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] terra-press">
                      <span className="text-xs text-[var(--terra-muted)]">{WEEK_DAYS[i]}</span><span>{dayDate.getDate()}</span>
                    </button>

                    <div className="space-y-2 min-w-0">
                      {dayEvents.map(evt => {
                        const badgeStyle = getEventBadgeStyle(evt);

                        return (
                          <button type="button"
                            key={evt.id}
                            aria-label={`Открыть событие: ${evt.title}, ${dateStr}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(dayDate);
                              onOpenEvent(evt);
                            }} 
                            className={`w-full min-h-[44px] text-left break-words p-2 rounded-xl border-l-2 text-xs space-y-1 focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer ${badgeStyle.badgeBg} ${badgeStyle.badgeText}`}
                            style={{ borderLeftColor: badgeStyle.borderColor }}
                          >
                            <span className="font-bold text-xs block opacity-90">{evt.time || 'Весь день'}</span>
                            <span className="block font-semibold leading-tight break-words">{evt.title}</span>
                          </button>
                        );
                      })}
                      {dayEvents.length === 0 && (
                        <button type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(dayDate);
                            onOpenEvent(null, { date: dateStr });
                          }}
                          className="w-full min-h-[44px] text-xs text-[var(--terra-muted)] hover:text-[var(--terra-primary)] focus-visible:ring-2 focus-visible:ring-primary py-2 text-center"
                        >
                          + Добавить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'day' && (
            <div className="min-w-0 space-y-3">
              <h2 className="text-lg font-semibold">События дня</h2>
              {filteredDayEvents.map(ev=>(
                <button type="button" key={ev.id} onClick={()=>onOpenEvent(ev)}
                  className="w-full min-h-[44px] rounded-xl border border-[var(--terra-border)] dark:border-white/10 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-stone-100 dark:hover:bg-white/5 transition-colors motion-reduce:transition-none">
                  <span className="block text-sm font-semibold break-words">{ev.title}</span>
                  <span className="block text-xs text-stone-500 dark:text-stone-300">{ev.time}{ev.duration ? ' — '+calendarEndTime(ev.time,ev.duration):''}</span>
                </button>
              ))}
              {filteredDayEvents.length===0&&
                <p className="p-4 text-sm text-stone-500 dark:text-stone-300">На этот день нет событий.</p>}
              <button type="button" onClick={()=>onOpenEvent(null,{date:getLocalDateString(selectedDate)})}
                className="min-h-[44px] rounded-xl px-4 bg-[#2D5A46] text-white text-sm font-semibold">Добавить событие</button>
            </div>
          )}
          {viewMode === 'list' && (
            <div className="flex flex-col min-w-0 space-y-4">
              {/* Переключатель: Будущие / Прошедшие в рамках текущего месяца */}
              <div className="flex items-center justify-between shrink-0 pb-2 border-b border-stone-200/60 dark:border-white/10">
                <div className="inline-flex bg-[var(--terra-soft)] dark:bg-white/10 p-1 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setListTab('upcoming')}
                    aria-pressed={listTab === 'upcoming'}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                      listTab === 'upcoming'
                        ? 'bg-white dark:bg-[var(--terra-soft)] text-[var(--terra-primary)] dark:text-emerald-300 shadow-sm'
                        : FILTER_CHIP_IDLE
                    }`}
                  >
                    <Sparkles size={14} />
                    <span>Будущие</span>
                    <span className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                      listTab === 'upcoming' ? 'bg-[#2D5A46]/15 text-[var(--terra-primary)] dark:text-emerald-300' : 'bg-black/5 dark:bg-white/10'
                    }`}>
                      {scheduleUpcomingEvents.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setListTab('past')}
                    aria-pressed={listTab === 'past'}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                      listTab === 'past'
                        ? 'bg-white dark:bg-[var(--terra-soft)] text-[var(--terra-primary)] dark:text-emerald-300 shadow-sm'
                        : FILTER_CHIP_IDLE
                    }`}
                  >
                    <History size={14} />
                    <span>Прошедшие</span>
                    <span className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                      listTab === 'past' ? 'bg-[#2D5A46]/15 text-[var(--terra-primary)] dark:text-emerald-300' : 'bg-black/5 dark:bg-white/10'
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
              <div className="divide-y divide-[var(--terra-border)] min-w-0">
                {(listTab === 'upcoming' ? scheduleUpcomingEvents : schedulePastEvents).length > 0 ? (
                  (listTab === 'upcoming' ? scheduleUpcomingEvents : schedulePastEvents).map(evt => {
                    const badgeStyle = getEventBadgeStyle(evt);
                    const dateObj = parseLocalCalendarDate(evt.date);
                    const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });

                    return (
                      <div 
                        key={evt.id}
                        onClick={() => {
                          setSelectedDate(parseLocalCalendarDate(evt.date));
                          onOpenEvent(evt);
                        }}
                        className="py-3 px-1 flex items-center justify-between gap-2 cursor-pointer group hover:bg-[var(--terra-soft)] transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[var(--terra-surface)] flex flex-col items-center justify-center border border-[var(--terra-border)] dark:border-white/10 shrink-0 shadow-2xs">
                            <span className="text-xs font-bold text-stone-400 uppercase leading-none">
                              {dateObj.toLocaleDateString('ru-RU', { weekday: 'short' })}
                            </span>
                            <span className="text-base font-extrabold text-stone-900 dark:text-white mt-0.5 leading-none">
                              {dateObj.getDate()}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-extrabold text-[var(--terra-primary)] dark:text-emerald-400 flex items-center gap-1">
                                <Clock size={12} />
                                {evt.time || 'Весь день'}
                              </span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${badgeStyle.badgeBg} ${badgeStyle.badgeText}`}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: badgeStyle.dotColor }} />
                                <span>{badgeStyle.memberName}</span>
                              </span>
                            </div>
                            <button type="button" onClick={(event)=>{event.stopPropagation();setSelectedDate(parseLocalCalendarDate(evt.date));onOpenEvent(evt);}} aria-label={`Открыть событие: ${evt.title}`} className="min-h-[44px] text-left text-sm font-semibold text-[var(--terra-ink)] break-words focus-visible:ring-2 focus-visible:ring-primary">{evt.title}</button>
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
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[var(--terra-soft)] text-stone-400 hover:text-[var(--terra-primary)] border border-[var(--terra-border)] dark:border-white/10 transition cursor-pointer"
                            title="Отправить в Telegram"
                          >
                            <Send size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center bg-[#F6F3EE]/50 dark:bg-white/5 rounded-3xl p-8 border border-dashed border-[var(--terra-border)] dark:border-white/10">
                    <CheckCircle2 size={40} className="mx-auto text-stone-400 mb-2 opacity-60" />
                    <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                      {listTab === 'upcoming' 
                        ? 'Нет запланированных событий за этот месяц' 
                        : 'Нет прошедших событий за этот месяц'}
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

      {/* Правая колонка: Выбранный день */}
      <aside id="plans-selected-day-desktop" tabIndex={-1} data-testid="plans-selected-day" aria-label="События выбранного дня" className={`${SURFACE_CARD} terra-layout-surface flex flex-col space-y-3 min-w-0`}>
        
        {/* Шапка инспектора */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              Выбранный день
            </span>
            <span className="text-stone-500 font-medium capitalize">
              {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long' })}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold font-headline text-stone-900 dark:text-white">
                {selectedDate.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--terra-soft)] dark:bg-white/10 text-stone-700 dark:text-stone-300">
              Событий: {filteredDayEvents.length}
            </span>
          </div>
        </div>

        {/* Секция: ПЛАНЫ НА СЕГОДНЯ */}
        <div className="space-y-3">
          <span className="text-sm font-semibold text-[var(--terra-muted)] block">
            События дня
          </span>

          {/* Сообщение в инспекторе о пересечениях в текущем месяце */}
          {hasPeriodConflicts && (
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
                <span>Пересечения в выбранном периоде: {conflictPairs.length}</span>
              </div>
              <ChevronRight size={16} className="shrink-0 text-amber-600" />
            </button>
          )}

          {filteredDayEvents.length > 0 ? (
            <div className="divide-y divide-[var(--terra-border)]">
              {filteredDayEvents.map((evt) => {
                const badgeStyle = getEventBadgeStyle(evt);
                const isConflict = conflictingEventIds.has(evt.id);

                return (
                  <div 
                    key={evt.id}
                    className="py-3 space-y-2 relative group"
                  >
                    {/* Верхняя строка карточки: Время + Бейдж участника + Сообщение о пересечении + Карандаш */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          {evt.time || 'Весь день'} {evt.time && evt.duration ? `– ${calendarEndTime(evt.time,evt.duration)}` : ''}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeStyle.badgeBg} ${badgeStyle.badgeText}`}>
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
                            className="min-h-[44px] text-xs font-semibold px-2 py-1 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                            title="Открыть разрешение конфликта"
                          >
                            <AlertTriangle size={11} className="text-amber-600" />
                            <span>Пересечение</span>
                          </button>
                        )}
                      </div>

                      <button 
                        onClick={() => onOpenEvent(evt)}
                        aria-label="Редактировать событие"
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
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
            <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/5 border border-dashed border-[var(--terra-border)] dark:border-white/10 text-center">
              <p className="text-xs text-stone-400 font-medium">Нет запланированных событий на этот день</p>
            </div>
          )}

          {/* Кнопка добавления события на выбранный день */}
          <button 
            onClick={() => onOpenEvent(null, { date: getLocalDateString(selectedDate) })}
            className="min-h-[44px] w-full py-3 rounded-xl border border-dashed border-[var(--terra-border)] dark:border-white/15 bg-[var(--terra-surface)] dark:bg-white/5 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-[var(--terra-primary)] hover:border-[var(--terra-primary)] flex items-center justify-center gap-1.5 transition cursor-pointer"
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
                Ближайшие события
              </span>
              <span className="text-xs font-bold text-stone-500">
                Все ({upcomingEvents.length})
              </span>
            </div>

            <div className="space-y-2">
              {upcomingEvents.map(evt => {
                const dateObj = parseLocalCalendarDate(evt.date);
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
                    className="p-3.5 rounded-2xl bg-white dark:bg-[var(--terra-surface)] hover:border-stone-400 dark:hover:border-white/20 border border-[var(--terra-border)] dark:border-white/10 transition flex items-center justify-between cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center shrink-0`}>
                        {meta.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate max-w-[160px]">
                          {evt.title}
                        </h4>
                        <span className="text-xs text-stone-400 font-medium">
                          {dayStr} • {assignedMember?.name || 'Семья'} ({meta.categoryName})
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300 shrink-0">
                      {evt.time || 'Весь день'}
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
