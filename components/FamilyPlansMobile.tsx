import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Check, 
  X, 
  Briefcase, 
  Heart, 
  Trophy, 
  Coffee, 
  LayoutGrid, 
  Columns, 
  ListTodo, 
  History, 
  Sparkles, 
  User, 
  Hourglass, 
  Send, 
  CalendarCheck, 
  RefreshCw, 
  Settings2, 
  Leaf, 
  Mic, 
  Loader2,
  ChevronDown
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';

interface FamilyPlansMobileProps {
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
  groupedListEvents: Record<string, FamilyEvent[]>;
  
  onOpenEvent: (event?: FamilyEvent | null, prefill?: any) => void;
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
  
  isListening: boolean;
  isProcessingVoice: boolean;
  startListening: () => void;
}

const FamilyPlansMobile: React.FC<FamilyPlansMobileProps> = ({
  events,
  members,
  settings,
  currentDate,
  setCurrentDate,
  selectedDate,
  setSelectedDate,
  viewMode,
  setViewMode,
  listTab,
  setListTab,
  onOpenEvent,
  onSendToTelegram,
  isListening,
  isProcessingVoice,
  startListening
}) => {
  const isDarkMode = settings.theme === 'dark';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filterMemberId, setFilterMemberId] = useState<string | 'all' | 'common'>('all');

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const daysInMonthCount = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonthIndex = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 is Mon, 6 is Sun
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const handleDateClick = (year: number, month: number, day: number) => {
    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
  };

  // Helper for member avatar initial & background
  const getMemberMeta = (memberId: string) => {
    const m = members.find(x => x.id === memberId);
    return {
      name: m ? m.name : 'Семья',
      color: m?.color || '#4A7C59',
      initial: m?.name ? m.name.charAt(0).toUpperCase() : 'С'
    };
  };

  const isEventMatchingFilter = (e: FamilyEvent): boolean => {
    if (filterMemberId === 'all') return true;
    if (filterMemberId === 'common') {
      return !e.memberIds || e.memberIds.length === 0 || e.memberIds.length === members.length;
    }
    return Boolean(e.memberIds && e.memberIds.includes(filterMemberId));
  };

  // Member filter chips data with counts
  const memberFilterStats = useMemo(() => {
    const allCount = events.length;
    const stats: Array<{ id: string; label: string; count: number; color: string }> = [
      { id: 'all', label: 'Все', count: allCount, color: '#4A7C59' }
    ];

    members.forEach(m => {
      const count = events.filter(e => e.memberIds && e.memberIds.includes(m.id)).length;
      stats.push({
        id: m.id,
        label: m.name,
        count,
        color: m.color || '#D97706'
      });
    });

    const commonCount = events.filter(e => !e.memberIds || e.memberIds.length === 0 || e.memberIds.length === members.length).length;
    stats.push({
      id: 'common',
      label: 'Общие',
      count: commonCount,
      color: '#4A7C59'
    });

    return stats;
  }, [events, members]);

  // Selected Day calculations
  const selectedDateStr = formatDateKey(selectedDate);
  const isSelectedDateToday = formatDateKey(new Date()) === selectedDateStr;
  const eventsForSelectedDay = useMemo(() => {
    return events
      .filter(e => e.date === selectedDateStr && isEventMatchingFilter(e))
      .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }, [events, selectedDateStr, filterMemberId]);

  // Upcoming this week events
  const upcomingWeekEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    return events
      .filter(e => {
        const eDate = new Date(`${e.date}T${e.time || '00:00'}`);
        return eDate >= today && eDate <= endOfWeek && isEventMatchingFilter(e);
      })
      .sort((a, b) => {
        const da = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const db = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return da - db;
      });
  }, [events, filterMemberId]);

  // Selected day title formatting: e.g. "24 сентября, Четверг"
  const selectedDayFormattedTitle = useMemo(() => {
    const day = selectedDate.getDate();
    const month = selectedDate.toLocaleString('ru-RU', { month: 'long' });
    const weekday = selectedDate.toLocaleString('ru-RU', { weekday: 'long' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${day} ${month}, ${capitalizedWeekday}`;
  }, [selectedDate]);

  // Current month string: "Сентябрь 2026"
  const currentMonthTitle = useMemo(() => {
    const m = currentDate.toLocaleString('ru-RU', { month: 'long' });
    const y = currentDate.getFullYear();
    return `${m.charAt(0).toUpperCase() + m.slice(1)} ${y}`;
  }, [currentDate]);

  const daysCountInCurrentMonth = daysInMonthCount(currentDate.getFullYear(), currentDate.getMonth());

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
    return formatDateKey(todayMonday) === formatDateKey(selMonday);
  }, [selectedDate]);

  // Schedule events filtered strictly within current selected month
  const currentMonthEvents = useMemo(() => {
    const targetYear = currentDate.getFullYear();
    const targetMonth = currentDate.getMonth();

    return events.filter(e => {
      const [y, m] = (e.date || '').split('-').map(Number);
      return y === targetYear && (m - 1) === targetMonth && isEventMatchingFilter(e);
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

  // Render Calendar Grid
  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonthCount(year, month);
    const startOffset = firstDayOfMonthIndex(year, month);
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: React.ReactNode[] = [];
    const today = new Date();
    const isThisMonth = today.getMonth() === month && today.getFullYear() === year;
    const todayDay = today.getDate();

    // 1. Previous month trailing days
    for (let i = 0; i < startOffset; i++) {
      const prevDayNumber = daysInPrevMonth - startOffset + i + 1;
      const prevDate = new Date(year, month - 1, prevDayNumber);
      const prevDateStr = formatDateKey(prevDate);
      const isSel = selectedDateStr === prevDateStr;

      cells.push(
        <div
          key={`prev-${prevDayNumber}`}
          onClick={() => handleDateClick(prevDate.getFullYear(), prevDate.getMonth(), prevDayNumber)}
          className={`min-h-[58px] p-1 rounded-xl transition-all flex flex-col justify-between cursor-pointer opacity-35 ${
            isSel
              ? 'bg-[#EAE5DB] dark:bg-white/10 ring-1 ring-[#4A7C59]'
              : 'bg-[#F5F1EA]/50 dark:bg-white/5 hover:opacity-70'
          }`}
        >
          <span className="text-[11px] font-semibold text-graphite-muted dark:text-gray-400">
            {prevDayNumber}
          </span>
        </div>
      );
    }

    // 2. Current month days
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDateStr === dateStr;
      const isToday = isThisMonth && todayDay === day;

      // Filter events for this day
      const dayEvents = events.filter(e => e.date === dateStr && isEventMatchingFilter(e));
      const hasEvents = dayEvents.length > 0;
      const firstEvent = dayEvents[0];

      // Weekend check (Saturday = 5, Sunday = 6 in 0-indexed Mon-Sun)
      const dayOfWeek = (startOffset + day - 1) % 7;
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

      cells.push(
        <div
          key={`current-${day}`}
          onClick={() => handleDateClick(year, month, day)}
          className={`min-h-[58px] p-1 rounded-xl transition-all flex flex-col justify-between cursor-pointer select-none relative overflow-hidden active:scale-95 ${
            isSelected
              ? 'ring-2 ring-[#4A7C59] bg-[#EAE5DB] dark:bg-[#2C2C2E] shadow-sm z-10'
              : isToday
              ? 'bg-[#C8E8D0]/60 dark:bg-[#4A7C59]/30 ring-1 ring-[#4A7C59]/50 shadow-2xs'
              : 'bg-[#F5F1EA]/70 dark:bg-[#1E1E20] hover:bg-[#EAE6DE] dark:hover:bg-[#252528]'
          }`}
        >
          {/* Day Number */}
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold leading-none ${
                isSelected
                  ? 'text-[#4A7C59] dark:text-white'
                  : isToday
                  ? 'text-[#4A7C59] dark:text-green-300 font-extrabold'
                  : isWeekend
                  ? 'text-[#705C30] dark:text-amber-400'
                  : 'text-[#2E3230] dark:text-gray-200'
              }`}
            >
              {day}
            </span>
            {isToday && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] animate-pulse" />
            )}
          </div>

          {/* Day Events Visual: text pill or dots */}
          <div className="w-full flex flex-col items-center gap-0.5 mt-0.5">
            {isToday && !hasEvents ? (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEvent(null, { date: dateStr });
                }}
                className="w-full text-[9px] font-bold text-[#4A7C59] dark:text-green-300 flex items-center justify-center bg-white/80 dark:bg-[#252528] rounded py-0.5 shadow-2xs hover:bg-[#4A7C59] hover:text-white transition"
              >
                <Plus size={10} className="mr-0.5" />
                <span>план</span>
              </div>
            ) : hasEvents ? (
              firstEvent && firstEvent.title ? (
                <div 
                  className={`w-full text-[9px] font-bold truncate px-1 py-0.5 rounded leading-tight text-center ${
                    firstEvent.memberIds && firstEvent.memberIds.length > 0 && members.find(m => m.id === firstEvent.memberIds[0])
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-[#C8E8D0] text-[#1E5C32] dark:bg-[#4A7C59]/40 dark:text-green-200'
                  }`}
                  title={firstEvent.title}
                >
                  {firstEvent.title}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-0.5 py-1">
                  {dayEvents.slice(0, 3).map((ev, idx) => (
                    <span
                      key={idx}
                      className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]"
                    />
                  ))}
                </div>
              )
            ) : null}
          </div>
        </div>
      );
    }

    // 3. Next month leading days to complete standard grid (35 or 42 slots)
    const filledCount = startOffset + totalDays;
    const targetSlots = filledCount > 35 ? 42 : 35;
    const remainingSlots = targetSlots - filledCount;

    for (let day = 1; day <= remainingSlots; day++) {
      const nextDate = new Date(year, month + 1, day);
      const nextDateStr = formatDateKey(nextDate);
      const isSel = selectedDateStr === nextDateStr;

      cells.push(
        <div
          key={`next-${day}`}
          onClick={() => handleDateClick(nextDate.getFullYear(), nextDate.getMonth(), day)}
          className={`min-h-[58px] p-1 rounded-xl transition-all flex flex-col justify-between cursor-pointer opacity-35 ${
            isSel
              ? 'bg-[#EAE5DB] dark:bg-white/10 ring-1 ring-[#4A7C59]'
              : 'bg-[#F5F1EA]/50 dark:bg-white/5 hover:opacity-70'
          }`}
        >
          <span className="text-[11px] font-semibold text-graphite-muted dark:text-gray-400">
            {day}
          </span>
        </div>
      );
    }

    return cells;
  };

  // Render Day View Timeline
  const renderDayTimeline = () => {
    const startHour = settings.dayStartHour ?? 7;
    const endHour = settings.dayEndHour ?? 23;
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    return (
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#EAE5DB] dark:border-white/10">
          <div>
            <h3 className="text-base font-headline font-bold text-[#2E3230] dark:text-white">
              {selectedDayFormattedTitle}
            </h3>
            <p className="text-xs text-graphite-muted dark:text-gray-400">
              Почасовое расписание дня
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenEvent(null, { date: selectedDateStr })}
            className="px-3 py-1.5 rounded-xl bg-[#4A7C59] text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
          >
            <Plus size={14} />
            <span>Событие</span>
          </button>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar">
          {hours.map(hour => {
            const hourStr = `${String(hour).padStart(2, '0')}:00`;
            const matchingEvents = eventsForSelectedDay.filter(e => {
              const h = parseInt((e.time || '00:00').split(':')[0], 10);
              return h === hour;
            });

            return (
              <div 
                key={hour} 
                onClick={() => onOpenEvent(null, { date: selectedDateStr, time: hourStr })}
                className="flex items-start gap-3 p-2 rounded-xl hover:bg-[#F5F1EA] dark:hover:bg-white/5 transition cursor-pointer"
              >
                <span className="w-12 text-xs font-bold text-graphite-muted dark:text-gray-400 pt-1 shrink-0">
                  {hourStr}
                </span>
                <div className="flex-1 min-h-[36px] border-l-2 border-[#EAE5DB] dark:border-white/10 pl-3 flex flex-col gap-1.5">
                  {matchingEvents.map(ev => {
                    const primaryMemberId = ev.memberIds && ev.memberIds[0];
                    const memberMeta = primaryMemberId ? getMemberMeta(primaryMemberId) : null;
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEvent(ev);
                        }}
                        className="p-2.5 rounded-xl bg-[#F5F1EA] dark:bg-[#252528] border border-[#EAE5DB] dark:border-white/10 flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#2E3230] dark:text-white truncate">
                            {ev.title}
                          </h4>
                          <span className="text-[11px] text-graphite-muted dark:text-gray-400">
                            {ev.time} • {ev.duration || 1} ч {memberMeta ? `• ${memberMeta.name}` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendToTelegram(ev);
                          }}
                          className="text-[#4A7C59] p-1 hover:scale-110 transition"
                          title="Отправить в Telegram"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    );
                  })}
                  {matchingEvents.length === 0 && (
                    <div className="text-[11px] text-graphite-muted/40 italic py-1">
                      + добавить на {hourStr}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Week View (Текущая неделя со сменой периода недели и просмотром событий)
  const renderWeekView = () => {
    const today = new Date();
    const todayKey = formatDateKey(today);

    // События за всю выбранную неделю
    const weekStartDateStr = formatDateKey(currentWeekDays[0]);
    const weekEndDateStr = formatDateKey(currentWeekDays[6]);

    const weekAllEvents = events.filter(e => {
      return e.date >= weekStartDateStr && e.date <= weekEndDateStr && isEventMatchingFilter(e);
    });

    return (
      <div className="space-y-3.5">
        {/* 1. Week Strip: 7 Days Horizontal Bar */}
        <div className="bg-white dark:bg-[#1E1E20] rounded-2xl p-3 shadow-sm border border-[#EAE5DB]/60 dark:border-white/5 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-graphite-muted dark:text-gray-400 uppercase tracking-wider">
              Дни недели
            </span>
            {!isSelectedWeekCurrent && (
              <button
                type="button"
                onClick={resetToCurrentWeek}
                className="text-[11px] font-bold text-[#4A7C59] dark:text-green-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>К текущей неделе</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {currentWeekDays.map((dayDate, idx) => {
              const dateStr = formatDateKey(dayDate);
              const isSelected = selectedDateStr === dateStr;
              const isToday = dateStr === todayKey;
              const dayNum = dayDate.getDate();
              const dayName = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][idx];
              const isWeekend = idx >= 5;

              const dayEvents = events.filter(e => e.date === dateStr && isEventMatchingFilter(e));
              const eventCount = dayEvents.length;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(new Date(dayDate))}
                  className={`py-2 px-1 rounded-xl flex flex-col items-center justify-between min-h-[64px] transition-all cursor-pointer relative active:scale-95 ${
                    isSelected
                      ? 'bg-[#4A7C59] text-white shadow-md ring-2 ring-[#4A7C59]/30'
                      : isToday
                      ? 'bg-[#C8E8D0]/60 dark:bg-[#4A7C59]/30 text-[#4A7C59] dark:text-green-300 ring-1 ring-[#4A7C59]/50'
                      : 'bg-[#F5F1EA]/80 dark:bg-white/5 text-[#2E3230] dark:text-gray-200 hover:bg-[#EAE6DE]'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSelected ? 'text-white/80' : isWeekend ? 'text-[#705C30] dark:text-amber-400' : 'text-graphite-muted dark:text-gray-400'
                  }`}>
                    {dayName}
                  </span>

                  <span className={`text-sm font-extrabold my-0.5 leading-none ${
                    isSelected ? 'text-white' : ''
                  }`}>
                    {dayNum}
                  </span>

                  {/* Dot/Badge of events */}
                  <div className="h-2 flex items-center justify-center">
                    {eventCount > 0 ? (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#4A7C59]'}`} />
                    ) : isToday ? (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#4A7C59]'}`} />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Selected Day Timeline & Events for the Week */}
        <div className="bg-white dark:bg-[#1E1E20] rounded-2xl p-4 shadow-sm border border-[#EAE5DB]/60 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#EAE5DB] dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-headline font-bold text-[#2E3230] dark:text-white leading-tight">
                  {selectedDayFormattedTitle}
                </h3>
                {isSelectedDateToday && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C8E8D0] dark:bg-[#4A7C59]/30 text-[#2A6038] dark:text-green-200">
                    Сегодня
                  </span>
                )}
              </div>
              <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                {eventsForSelectedDay.length} {eventsForSelectedDay.length === 1 ? 'событие' : eventsForSelectedDay.length >= 2 && eventsForSelectedDay.length <= 4 ? 'события' : 'событий'} на этот день
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenEvent(null, { date: selectedDateStr })}
              className="px-3 py-1.5 rounded-xl bg-[#4A7C59] text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Добавить</span>
            </button>
          </div>

          {/* Events of Selected Day */}
          <div className="space-y-2">
            {eventsForSelectedDay.length > 0 ? (
              eventsForSelectedDay.map(ev => {
                const primaryMemberId = ev.memberIds && ev.memberIds[0];
                const memberMeta = primaryMemberId ? getMemberMeta(primaryMemberId) : null;

                return (
                  <div
                    key={ev.id}
                    onClick={() => onOpenEvent(ev)}
                    className="p-3 rounded-xl bg-[#F5F1EA] dark:bg-[#252528] border border-[#EAE5DB] dark:border-white/10 flex items-center justify-between gap-3 hover:bg-[#EAE6DE] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-bold text-[#4A7C59] dark:text-green-300 font-mono shrink-0">
                        {ev.time}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#2E3230] dark:text-white truncate">
                          {ev.title}
                        </h4>
                        <span className="text-[11px] text-graphite-muted dark:text-gray-400">
                          {ev.duration || 1} ч {memberMeta ? `• ${memberMeta.name}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendToTelegram(ev);
                        }}
                        className="p-1.5 text-graphite-muted hover:text-[#4A7C59] transition cursor-pointer"
                        title="В Telegram"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 rounded-xl bg-[#F5F1EA]/60 dark:bg-white/5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C8E8D0]/60 dark:bg-[#4A7C59]/30 text-[#4A7C59] dark:text-green-300 flex items-center justify-center shrink-0">
                  <Leaf size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#2E3230] dark:text-white">
                    Нет событий на этот день
                  </p>
                  <p className="text-[11px] text-graphite-muted dark:text-gray-400">
                    Нажмите «Добавить», чтобы запланировать
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Summary of all events in this week */}
        <div className="bg-white dark:bg-[#1E1E20] rounded-2xl p-4 shadow-sm border border-[#EAE5DB]/60 dark:border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">
              Всего за эту неделю: {weekAllEvents.length}
            </h4>
            <span className="text-xs font-semibold text-[#4A7C59] dark:text-green-300">
              {weekPeriodTitle}
            </span>
          </div>

          {weekAllEvents.length > 0 ? (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
              {weekAllEvents.map(e => {
                const d = new Date(e.date);
                const dayLabel = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
                return (
                  <div
                    key={e.id}
                    onClick={() => {
                      setSelectedDate(new Date(e.date));
                      onOpenEvent(e);
                    }}
                    className="p-2 rounded-lg bg-[#FAF6F0] dark:bg-white/5 flex items-center justify-between text-xs hover:bg-[#F5F1EA] cursor-pointer"
                  >
                    <span className="font-semibold text-graphite-muted dark:text-gray-400 shrink-0 w-24">
                      {dayLabel}
                    </span>
                    <span className="font-bold text-[#2E3230] dark:text-white truncate flex-1 px-2">
                      {e.title}
                    </span>
                    <span className="text-[11px] text-[#4A7C59] dark:text-green-300 font-mono shrink-0">
                      {e.time}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-graphite-muted dark:text-gray-400 italic">
              На этой неделе пока нет запланированных событий
            </p>
          )}
        </div>
      </div>
    );
  };

  // Render Schedule / List View (События строго в рамках текущего месяца)
  const renderScheduleList = () => {
    const displayEvents = listTab === 'upcoming' ? scheduleUpcomingEvents : schedulePastEvents;

    return (
      <div className="space-y-3.5">
        {/* Tab switch: Upcoming vs Past (в рамках выбранного месяца) */}
        <div className="grid grid-cols-2 bg-[#EAE6DE] dark:bg-[#252528] p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setListTab('upcoming')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              listTab === 'upcoming'
                ? 'bg-white dark:bg-[#1E1E20] text-[#4A7C59] dark:text-green-300 shadow-sm'
                : 'text-graphite-muted dark:text-gray-400 hover:text-[#2E3230]'
            }`}
          >
            <Sparkles size={14} />
            <span>Будущие</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              listTab === 'upcoming' ? 'bg-[#4A7C59]/15 text-[#4A7C59] dark:text-green-300' : 'bg-black/5 dark:bg-white/10'
            }`}>
              {scheduleUpcomingEvents.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setListTab('past')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              listTab === 'past'
                ? 'bg-white dark:bg-[#1E1E20] text-[#4A7C59] dark:text-green-300 shadow-sm'
                : 'text-graphite-muted dark:text-gray-400 hover:text-[#2E3230]'
            }`}
          >
            <History size={14} />
            <span>Прошедшие</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              listTab === 'past' ? 'bg-[#4A7C59]/15 text-[#4A7C59] dark:text-green-300' : 'bg-black/5 dark:bg-white/10'
            }`}>
              {schedulePastEvents.length}
            </span>
          </button>
        </div>

        {/* Current Month Context Banner */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-graphite-muted dark:text-gray-400">
            {listTab === 'upcoming' ? 'Предстоящие события:' : 'Прошедшие события:'} {currentMonthTitle}
          </span>
          <span className="text-[11px] font-semibold text-[#4A7C59] dark:text-green-300">
            {displayEvents.length} {displayEvents.length === 1 ? 'событие' : displayEvents.length >= 2 && displayEvents.length <= 4 ? 'события' : 'событий'}
          </span>
        </div>

        {/* Items List */}
        <div className="space-y-2.5">
          {displayEvents.length > 0 ? (
            displayEvents.map(e => {
              const primaryMemberId = e.memberIds && e.memberIds[0];
              const memberMeta = primaryMemberId ? getMemberMeta(primaryMemberId) : null;
              const dateObj = new Date(e.date);
              const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' });

              return (
                <div
                  key={e.id}
                  onClick={() => onOpenEvent(e)}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1E20] shadow-sm border border-[#EAE5DB] dark:border-white/5 flex items-start gap-3 transition-colors hover:bg-[#F5F1EA] cursor-pointer"
                >
                  <div
                    className="w-2 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: memberMeta?.color || '#4A7C59' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span 
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${memberMeta?.color || '#4A7C59'}20`,
                          color: memberMeta?.color || '#4A7C59'
                        }}
                      >
                        {memberMeta?.name || 'Общее'}
                      </span>
                      <span className="text-xs font-semibold text-graphite-muted dark:text-gray-400">
                        {formattedDate}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#2E3230] dark:text-white truncate">
                      {e.title}
                    </h4>
                    <p className="text-xs text-graphite-muted dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock size={12} />
                      <span>{e.time} • {e.duration || 1} ч</span>
                      {e.description && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="truncate">{e.description}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(evt) => {
                      evt.stopPropagation();
                      onSendToTelegram(e);
                    }}
                    className="text-graphite-muted hover:text-[#4A7C59] p-1.5 transition"
                    title="В Telegram"
                  >
                    <Send size={15} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center bg-white dark:bg-[#1E1E20] rounded-2xl p-6 border border-[#EAE5DB]/60 dark:border-white/5">
              <Check size={36} className="mx-auto text-graphite-muted/40 mb-2" />
              <p className="text-xs font-bold text-[#2E3230] dark:text-white uppercase tracking-wider">
                {listTab === 'upcoming' 
                  ? `В ${currentMonthTitle} нет запланированных событий` 
                  : `В ${currentMonthTitle} нет прошедших событий`}
              </p>
              {listTab === 'upcoming' && (
                <button
                  type="button"
                  onClick={() => onOpenEvent(null, { date: formatDateKey(new Date()) })}
                  className="mt-3 px-4 py-2 rounded-xl bg-[#4A7C59] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
                >
                  <Plus size={14} />
                  <span>Запланировать событие</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#FAF6F0] dark:bg-[#121214] overflow-y-auto no-scrollbar pb-28 text-[#2E3230] dark:text-gray-100 transition-colors">
      
      {/* Top Mobile Bar (Fixed look & feel matching Terra standard) */}
      <div className="sticky top-0 z-40 bg-[#FAF6F0]/90 dark:bg-[#121214]/90 backdrop-blur-md px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#EAE5DB]/60 dark:border-white/5">
        <div className="flex items-center gap-1">
          <span className="text-xl font-headline font-bold text-[#2E3230] dark:text-white">
            Планы
          </span>
          <ChevronDown size={18} className="text-[#4A7C59]" />
        </div>

        {/* Right Actions: Mic, Add Event (+), Profile */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={startListening}
            aria-label="Голосовой ввод"
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-md'
                : isProcessingVoice
                ? 'bg-amber-500 text-white'
                : 'text-graphite-muted dark:text-gray-400 hover:bg-[#EAE6DE] dark:hover:bg-white/10'
            }`}
            title="Голосовой ввод события"
          >
            {isProcessingVoice ? <Loader2 size={18} className="animate-spin" /> : <Mic size={19} />}
          </button>

          <button
            type="button"
            onClick={() => onOpenEvent(null, { date: selectedDateStr })}
            aria-label="Добавить событие"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#4A7C59] text-white shadow-[0_2px_12px_rgba(74,124,89,0.25)] hover:bg-[#3C6548] active:scale-95 transition-all cursor-pointer"
            title="Создать событие"
          >
            <Plus size={20} strokeWidth={2.4} />
          </button>

          <div
            className="w-10 h-10 rounded-full bg-[#4A7C59] text-white flex items-center justify-center font-bold text-sm shadow-2xs select-none"
            title="Семейный профиль"
          >
            <User size={19} strokeWidth={2.2} />
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3.5" ref={scrollRef}>
        
        {/* Card 1: Month & View Navigator Card */}
        <div className="bg-white dark:bg-[#1E1E20] rounded-2xl p-3.5 shadow-sm space-y-3 border border-[#EAE5DB]/60 dark:border-white/5">
          
          {/* Period Switcher & Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-lg sm:text-xl font-headline font-bold text-[#2E3230] dark:text-white tracking-tight truncate">
                {viewMode === 'week' ? weekPeriodTitle : currentMonthTitle}
              </h2>
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F1EA] dark:bg-white/10 text-graphite-muted dark:text-gray-300 shrink-0">
                {viewMode === 'week' 
                  ? (isSelectedWeekCurrent ? 'Текущая неделя' : 'Неделя')
                  : `${daysCountInCurrentMonth} дней`}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => viewMode === 'week' ? changeWeek(-1) : changeMonth(-1)}
                aria-label={viewMode === 'week' ? "Предыдущая неделя" : "Предыдущий месяц"}
                className="w-8 h-8 rounded-full bg-[#F5F1EA] dark:bg-white/10 flex items-center justify-center text-[#2E3230] dark:text-white hover:bg-[#EAE6DE] active:scale-95 transition-all cursor-pointer"
                title={viewMode === 'week' ? "Предыдущая неделя" : "Предыдущий месяц"}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => viewMode === 'week' ? changeWeek(1) : changeMonth(1)}
                aria-label={viewMode === 'week' ? "Следующая неделя" : "Следующий месяц"}
                className="w-8 h-8 rounded-full bg-[#F5F1EA] dark:bg-white/10 flex items-center justify-center text-[#2E3230] dark:text-white hover:bg-[#EAE6DE] active:scale-95 transition-all cursor-pointer"
                title={viewMode === 'week' ? "Следующая неделя" : "Следующий месяц"}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Segmented View Toggle (Месяц / Неделя / Расписание) */}
          <div className="grid grid-cols-3 bg-[#F5F1EA] dark:bg-[#252528] p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setViewMode('month');
                const now = new Date();
                setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDate(now);
              }}
              className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-[#1E1E20] text-[#4A7C59] dark:text-green-300 shadow-sm'
                  : 'text-graphite-muted dark:text-gray-400 hover:text-[#2E3230]'
              }`}
            >
              <LayoutGrid size={15} />
              <span>Месяц</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('week');
                resetToCurrentWeek();
              }}
              className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-[#1E1E20] text-[#4A7C59] dark:text-green-300 shadow-sm'
                  : 'text-graphite-muted dark:text-gray-400 hover:text-[#2E3230]'
              }`}
            >
              <Columns size={15} />
              <span>Неделя</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('list');
                setListTab('upcoming');
              }}
              className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#1E1E20] text-[#4A7C59] dark:text-green-300 shadow-sm'
                  : 'text-graphite-muted dark:text-gray-400 hover:text-[#2E3230]'
              }`}
            >
              <ListTodo size={15} />
              <span>Расписание</span>
            </button>
          </div>

          {/* Family Member Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {memberFilterStats.map(chip => {
              const isSelected = filterMemberId === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterMemberId(chip.id as any)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#4A7C59] text-white shadow-xs'
                      : 'bg-[#F5F1EA] dark:bg-white/10 hover:bg-[#EAE6DE] text-[#2E3230] dark:text-gray-200'
                  }`}
                >
                  {chip.id !== 'all' && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: chip.color }}
                    />
                  )}
                  <span>{chip.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-black/5 dark:bg-white/10 text-graphite-muted dark:text-gray-400'
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View mode router: Week vs Month (Standard Grid) vs Day (Timeline) vs List (Schedule) */}
        {viewMode === 'week' ? (
          renderWeekView()
        ) : viewMode === 'day' ? (
          renderDayTimeline()
        ) : viewMode === 'list' ? (
          renderScheduleList()
        ) : (
          <>
            {/* Card 2: Spacious, Highly Legible Calendar Grid */}
            <div className="bg-white dark:bg-[#1E1E20] rounded-2xl p-2.5 shadow-sm space-y-2 border border-[#EAE5DB]/60 dark:border-white/5">
              {/* Day-of-Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                <div className="text-[11px] font-bold text-graphite-muted/80 uppercase tracking-wider py-0.5">Пн</div>
                <div className="text-[11px] font-bold text-graphite-muted/80 uppercase tracking-wider py-0.5">Вт</div>
                <div className="text-[11px] font-bold text-graphite-muted/80 uppercase tracking-wider py-0.5">Ср</div>
                <div className="text-[11px] font-bold text-graphite-muted/80 uppercase tracking-wider py-0.5">Чт</div>
                <div className="text-[11px] font-bold text-graphite-muted/80 uppercase tracking-wider py-0.5">Пт</div>
                <div className="text-[11px] font-bold text-[#705C30] dark:text-amber-400 uppercase tracking-wider py-0.5">Сб</div>
                <div className="text-[11px] font-bold text-[#705C30] dark:text-amber-400 uppercase tracking-wider py-0.5">Вс</div>
              </div>

              {/* Month Days */}
              <div className="grid grid-cols-7 gap-1">
                {renderCalendarGrid()}
              </div>
            </div>

            {/* Card 3: Selected Day Inspector ("Инспектор выбранного дня") */}
            <div className="bg-white dark:bg-[#1E1E20] rounded-2xl p-4 shadow-sm space-y-3 border border-[#EAE5DB]/60 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#4A7C59]/10 text-[#4A7C59] dark:text-green-300 flex items-center justify-center font-bold font-headline text-base">
                    {selectedDate.getDate()}
                  </div>
                  <div>
                    <h3 className="text-base font-headline font-bold text-[#2E3230] dark:text-white leading-tight">
                      {selectedDayFormattedTitle}
                    </h3>
                    <p className="text-[11px] text-graphite-muted dark:text-gray-400">
                      Выбранный день {isSelectedDateToday ? '• Сегодня' : ''}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#F5F1EA] dark:bg-white/10 text-graphite-muted dark:text-gray-300 text-xs font-semibold">
                  {eventsForSelectedDay.length} {eventsForSelectedDay.length === 1 ? 'событие' : eventsForSelectedDay.length >= 2 && eventsForSelectedDay.length <= 4 ? 'события' : 'событий'}
                </span>
              </div>

              {/* Empty state or Day Events List */}
              {eventsForSelectedDay.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-[#F5F1EA]/70 dark:bg-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C8E8D0]/60 dark:bg-[#4A7C59]/30 text-[#4A7C59] dark:text-green-300 flex-shrink-0 flex items-center justify-center">
                    <Leaf size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#2E3230] dark:text-white">
                      День свободен для отдыха
                    </p>
                    <p className="text-[11px] text-graphite-muted dark:text-gray-400 leading-relaxed truncate">
                      Нет запланированных семейных дел на этот день.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {eventsForSelectedDay.map(ev => {
                    const primaryMemberId = ev.memberIds && ev.memberIds[0];
                    const memberMeta = primaryMemberId ? getMemberMeta(primaryMemberId) : null;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => onOpenEvent(ev)}
                        className="p-3 rounded-xl bg-[#F5F1EA] dark:bg-[#252528] border border-[#EAE5DB] dark:border-white/5 flex items-start gap-3 transition-colors hover:bg-[#EAE6DE] cursor-pointer"
                      >
                        <div
                          className="w-1.5 self-stretch rounded-full flex-shrink-0"
                          style={{ backgroundColor: memberMeta?.color || '#4A7C59' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span 
                              className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                              style={{
                                backgroundColor: `${memberMeta?.color || '#4A7C59'}25`,
                                color: memberMeta?.color || '#4A7C59'
                              }}
                            >
                              {memberMeta?.name || 'Общее'}
                            </span>
                            <span className="text-[11px] font-bold text-graphite-muted dark:text-gray-400">
                              {ev.time} ({ev.duration || 1} ч)
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#2E3230] dark:text-white truncate">
                            {ev.title}
                          </h4>
                          {ev.description && (
                            <p className="text-[11px] text-graphite-muted dark:text-gray-400 truncate mt-0.5">
                              {ev.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendToTelegram(ev);
                          }}
                          className="text-graphite-muted hover:text-[#4A7C59] p-1 transition"
                          title="Отправить в Telegram"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Event Button for selected day */}
              <button
                type="button"
                onClick={() => onOpenEvent(null, { date: selectedDateStr })}
                className="w-full py-2.5 px-4 rounded-xl bg-[#4A7C59] text-white text-xs font-bold shadow-sm hover:bg-[#3C6548] transition-all flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer"
              >
                <Plus size={16} />
                <span>+ Добавить событие на {selectedDate.getDate()} {selectedDate.toLocaleString('ru-RU', { month: 'short' })}</span>
              </button>
            </div>

            {/* Card 4: Upcoming This Week List */}
            <div className="bg-white dark:bg-[#1E1E20] rounded-2xl p-4 shadow-sm space-y-3 border border-[#EAE5DB]/60 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={18} className="text-[#4A7C59]" />
                  <h3 className="text-sm font-headline font-bold text-[#2E3230] dark:text-white">
                    Предстоящие на неделе
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#4A7C59] px-2 py-0.5 rounded-full bg-[#C8E8D0]/50 dark:bg-[#4A7C59]/30">
                  Все ({upcomingWeekEvents.length})
                </span>
              </div>

              <div className="space-y-2.5">
                {upcomingWeekEvents.length > 0 ? (
                  upcomingWeekEvents.map(e => {
                    const primaryMemberId = e.memberIds && e.memberIds[0];
                    const memberMeta = primaryMemberId ? getMemberMeta(primaryMemberId) : null;
                    const eDate = new Date(e.date);
                    const dateFormatted = eDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' });

                    return (
                      <div
                        key={e.id}
                        onClick={() => onOpenEvent(e)}
                        className="p-3 rounded-xl bg-[#F5F1EA]/80 dark:bg-white/5 flex items-start gap-3 transition-colors hover:bg-[#EAE6DE] cursor-pointer"
                      >
                        <div
                          className="w-1.5 self-stretch rounded-full flex-shrink-0"
                          style={{ backgroundColor: memberMeta?.color || '#4A7C59' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span 
                              className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                              style={{
                                backgroundColor: `${memberMeta?.color || '#4A7C59'}25`,
                                color: memberMeta?.color || '#4A7C59'
                              }}
                            >
                              {memberMeta?.name || 'Общее'}
                            </span>
                            <span className="text-xs font-semibold text-graphite-muted dark:text-gray-400">
                              {dateFormatted}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-[#2E3230] dark:text-white truncate">
                            {e.title}
                          </h4>
                          <p className="text-xs text-graphite-muted dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock size={12} />
                            <span>{e.time} • {e.duration || 1} ч</span>
                            {e.description && (
                              <>
                                <span className="mx-1">•</span>
                                <span className="truncate">{e.description}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-graphite-muted italic text-center py-2">
                    На ближайшие 7 дней событий не запланировано
                  </p>
                )}
              </div>
            </div>

            {/* Card 5: Family Calendar Sync Status */}
            <div className="bg-white dark:bg-[#1E1E20] rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3 border border-[#EAE5DB]/60 dark:border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#4A7C59]/10 text-[#4A7C59] flex-shrink-0 flex items-center justify-center">
                  <RefreshCw size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-[#2E3230] dark:text-white truncate">
                      Семейная синхронизация
                    </h4>
                    <span className="w-2 h-2 rounded-full bg-[#4A7C59] flex-shrink-0 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-graphite-muted dark:text-gray-400 truncate">
                    Google Calendar & Telegram бот подключены
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Настройки синхронизации"
                className="w-8 h-8 rounded-full bg-[#F5F1EA] dark:bg-white/10 hover:bg-[#EAE6DE] flex items-center justify-center text-graphite-muted dark:text-gray-300 transition cursor-pointer"
              >
                <Settings2 size={16} />
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default FamilyPlansMobile;
