import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  LayoutGrid, 
  Columns, 
  ListTodo, 
  Send, 
  Leaf, 
  Mic, 
  Loader2,
  Users,
  Bell,
  Sparkles,
  AlertTriangle,
  Check
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';
import { findEventConflicts } from '../utils/eventConflicts';
import { formatReminderLabel } from './EventModal';
import { parseLocalCalendarDate, calendarEndTime, filterEventsForCalendarMonth, matchesCalendarMember } from '../utils/calendarDates';
import { shiftCalendarMonth, selectedDayInMonth } from '../utils/calendarMonthNavigation';
import TerraMobileHeader from './TerraMobileHeader';
import { FILTER_RAIL, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_IDLE, SURFACE_CARD, SECTION_HEADING } from './filterUiTokens';
import { ConflictResolverModal } from './ConflictResolverModal';

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
  
  calendarData?: any[];
  selectedDayEvents?: FamilyEvent[];
  groupedListEvents?: Record<string, FamilyEvent[]>;
  
  onOpenEvent: (event?: FamilyEvent | null, prefill?: any) => void;
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
  onUpdateEvent?: (e: FamilyEvent) => void;
  
  isListening: boolean;
  isProcessingVoice: boolean;
  startListening: () => void;
  
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  beforeContent?: React.ReactNode;
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
  onUpdateEvent,
  isListening,
  isProcessingVoice,
  startListening,
  onOpenSettings,
  onOpenNotifications,
  beforeContent
}) => {
  const [filterMemberId, setFilterMemberId] = useState<string | 'all' | 'common'>('all');
  const [isConflictResolverOpen, setIsConflictResolverOpen] = useState(false);
  const [selectedConflictPair, setSelectedConflictPair] = useState<{ eventA: FamilyEvent; eventB: FamilyEvent } | null>(null);

  const { conflictingEventIds, conflictPairs } = useMemo(() => {
    return findEventConflicts(events);
  }, [events]);

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
    const newDate = shiftCalendarMonth(currentDate, increment);
    setCurrentDate(newDate);
    setSelectedDate(selectedDayInMonth(selectedDate,newDate));
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

  const memberIds=useMemo(()=>members.map(member=>member.id),[members]);
  const isEventMatchingFilter = (e: FamilyEvent): boolean => matchesCalendarMember(e,filterMemberId,memberIds);

  // Member filter chips data with counts
  const memberFilterStats = useMemo(() => {
    const allCount = events.length;
    const stats: Array<{ id: string; label: string; count: number; color: string; isConflict?: boolean }> = [
      { id: 'all', label: 'Все', count: allCount, color: '#4A7C59' }
    ];

    // Show member chip ONLY if they have at least 1 event
    members.forEach(m => {
      const count = events.filter(e => e.memberIds && e.memberIds.includes(m.id)).length;
      {
        stats.push({
          id: m.id,
          label: m.name,
          count,
          color: m.color || '#4A7C59'
        });
      }
    });

    const commonCount = events.filter(e => matchesCalendarMember(e,'common',memberIds)).length;
    if (members.length > 1) {
      stats.push({
        id: 'common',
        label: 'Общие',
        count: commonCount,
        color: '#4A7C59'
      });
    }

    return stats;
  }, [events, members, memberIds]);

  // Selected Day calculations
  const selectedDateStr = formatDateKey(selectedDate);
  const isSelectedDateToday = formatDateKey(new Date()) === selectedDateStr;
  
  const eventsForSelectedDay = useMemo(() => {
    return events
      .filter(e => e.date === selectedDateStr && isEventMatchingFilter(e))
      .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }, [events, selectedDateStr, filterMemberId, memberIds]);

  // Selected Day title (e.g., "24 сентября, Четверг")
  const selectedDayFormattedTitle = useMemo(() => {
    const day = selectedDate.getDate();
    const monthName = selectedDate.toLocaleString('ru-RU', { month: 'long' });
    const weekday = selectedDate.toLocaleString('ru-RU', { weekday: 'long' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${day} ${monthName}, ${capitalizedWeekday}`;
  }, [selectedDate]);

  // Month title & days count
  const currentMonthTitle = useMemo(() => {
    const month = currentDate.toLocaleString('ru-RU', { month: 'long' });
    const year = currentDate.getFullYear();
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${capitalizedMonth} ${year}`;
  }, [currentDate]);

  const daysCountInCurrentMonth = useMemo(() => {
    return daysInMonthCount(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  // Monthly stats calculations for bottom bar
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthEvents = events.filter(e => {
      const [y, m] = (e.date || '').split('-').map(Number);
      return y === year && (m - 1) === month;
    });

    const total = monthEvents.length;
    const memberCounts = members.map(m => ({
      name: m.name,
      count: monthEvents.filter(e => e.memberIds && e.memberIds.includes(m.id)).length
    }));
    const commonCount = monthEvents.filter(e => !e.memberIds || e.memberIds.length === 0 || e.memberIds.length === members.length).length;

    return { total, memberCounts, commonCount };
  }, [events, currentDate, members]);

  // Week View Calculations
  const currentWeekDays = useMemo(() => {
    const curr = new Date(selectedDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(curr.setDate(diff));

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  }, [selectedDate]);

  const changeDay = (increment: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate()+increment);
    setSelectedDate(nextDate);
    setCurrentDate(new Date(nextDate.getFullYear(),nextDate.getMonth(),1));
  };

  const changeWeek = (increment: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + increment * 7);
    setSelectedDate(nextDate);
    setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  };

  const isSelectedWeekCurrent = useMemo(() => {
    const todayStr = formatDateKey(new Date());
    return currentWeekDays.some(d => formatDateKey(d) === todayStr);
  }, [currentWeekDays]);

  const weekPeriodTitle = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const start = currentWeekDays[0];
    const end = currentWeekDays[6];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleString('ru-RU', { month: 'long' });
    const endMonth = end.toLocaleString('ru-RU', { month: 'long' });

    if (start.getMonth() === end.getMonth()) {
      return `${startDay} — ${endDay} ${endMonth}`;
    }
    return `${startDay} ${startMonth} — ${endDay} ${endMonth}`;
  }, [currentWeekDays]);

  const weekMonthYearTitle = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const midDay = currentWeekDays[3] || selectedDate;
    const m = midDay.toLocaleString('ru-RU', { month: 'long' });
    const y = midDay.getFullYear();
    return `${m.charAt(0).toUpperCase() + m.slice(1)} ${y}`;
  }, [currentWeekDays, selectedDate]);

  const weekSummaryBadgeTitle = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const start = currentWeekDays[0];
    const end = currentWeekDays[6];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const endMonth = end.toLocaleString('ru-RU', { month: 'short' }).replace('.', '');
    const year = end.getFullYear();
    return `${startDay} — ${endDay} ${endMonth} ${year}`;
  }, [currentWeekDays]);

  // Schedule / List events
  const currentMonthEvents = useMemo(() => {
    const targetYear = currentDate.getFullYear();
    const targetMonth = currentDate.getMonth();

    return events.filter(e => {
      const [y, m] = (e.date || '').split('-').map(Number);
      return y === targetYear && (m - 1) === targetMonth && isEventMatchingFilter(e);
    });
  }, [events, currentDate, filterMemberId, memberIds]);

  const scheduleUpcomingEvents = filterEventsForCalendarMonth(currentMonthEvents,currentDate,'upcoming');
  const schedulePastEvents = filterEventsForCalendarMonth(currentMonthEvents,currentDate,'past');

  // ==========================================
  // RENDER 1: MONTH CALENDAR GRID (Image Spec)
  // ==========================================
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

    // 1. Trailing days from previous month
    for (let i = 0; i < startOffset; i++) {
      const prevDayNumber = daysInPrevMonth - startOffset + i + 1;
      const prevDate = new Date(year, month - 1, prevDayNumber);

      cells.push(
        <button
          type="button"
          aria-label={`Выбрать ${prevDayNumber} число предыдущего месяца`}
          key={`prev-${prevDayNumber}`}
          onClick={() => {
            handleDateClick(prevDate.getFullYear(), prevDate.getMonth(), prevDayNumber);
            setCurrentDate(new Date(prevDate.getFullYear(), prevDate.getMonth(), 1));
          }}
          className="min-h-[48px] sm:min-h-[56px] p-1.5 rounded-xl flex flex-col justify-between items-center cursor-pointer select-none opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="text-xs font-normal text-graphite-muted dark:text-gray-600 mt-1">
            {prevDayNumber}
          </span>
          <div className="h-2" />
        </button>
      );
    }

    // 2. Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDateStr === dateStr;
      const isToday = isThisMonth && todayDay === day;

      // Filter events for this day
      const dayEvents = events.filter(e => e.date === dateStr && isEventMatchingFilter(e));
      const hasEvents = dayEvents.length > 0;

      // Participant member colors for this day
      const dayMemberIds = Array.from(new Set(dayEvents.flatMap(e => (e.memberIds && e.memberIds.length > 0) ? e.memberIds : ['all'])));
      const dayMemberColors: string[] = [];
      dayMemberIds.forEach(id => {
        const mem = members.find(m => m.id === id);
        if (mem?.color && !dayMemberColors.includes(mem.color)) {
          dayMemberColors.push(mem.color);
        }
      });
      if (hasEvents && dayMemberColors.length === 0) {
        dayMemberColors.push('#4A7C59');
      }

      cells.push(
        <button
          type="button"
          aria-label={`Выбрать ${day} число месяца`}
          aria-pressed={isSelected}
          key={`current-${day}`}
          onClick={() => handleDateClick(year, month, day)}
          className={`min-h-[48px] sm:min-h-[56px] p-1.5 rounded-xl flex flex-col justify-between items-center cursor-pointer select-none relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary  motion-reduce:transform-none ${
            isSelected
              ? 'ring-2 ring-[#4A7C59] bg-[#EEF5F0] dark:bg-[#4A7C59]/20 shadow-xs z-10'
              : 'bg-[var(--terra-soft)] dark:bg-white/5 hover:bg-[var(--terra-soft)] dark:hover:bg-white/10'
          }`}
        >
          {/* Day Number */}
          <span
            className={`text-xs font-bold leading-none mt-1 ${
              isSelected
                ? 'text-[#2A6038] dark:text-green-300 font-extrabold'
                : isToday
                ? 'text-[var(--terra-primary)] dark:text-green-300 font-extrabold'
                : 'text-[var(--terra-ink)] dark:text-gray-200'
            }`}
          >
            {day}
          </span>

          {/* Participant Colored Dots */}
          <div className="flex items-center justify-center gap-1 min-h-[6px] mb-1">
            {hasEvents ? (
              dayMemberColors.slice(0, 4).map((color, cIdx) => (
                <span
                  key={cIdx}
                  className="w-1.5 h-1.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: color }}
                />
              ))
            ) : (
              <span className="w-1.5 h-1.5 opacity-0" />
            )}
          </div>
        </button>
      );
    }

    // 3. Leading days for next month to complete the row
    const totalRendered = startOffset + totalDays;
    const remainingInGrid = totalRendered % 7 === 0 ? 0 : 7 - (totalRendered % 7);

    for (let nextDay = 1; nextDay <= remainingInGrid; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay);
      cells.push(
        <button
          type="button"
          aria-label={`Выбрать ${nextDay} число следующего месяца`}
          key={`next-${nextDay}`}
          onClick={() => {
            handleDateClick(nextDate.getFullYear(), nextDate.getMonth(), nextDay);
            setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
          }}
          className="min-h-[48px] sm:min-h-[56px] p-1.5 rounded-xl flex flex-col justify-between items-center cursor-pointer select-none opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="text-xs font-normal text-graphite-muted dark:text-gray-600 mt-1">
            {nextDay}
          </span>
          <div className="h-2" />
        </button>
      );
    }

    return (
      <div className={`${SURFACE_CARD} space-y-2.5`}>
        {/* Weekday Header */}
        <div className="grid grid-cols-7 text-center text-xs font-bold text-graphite-muted/80 dark:text-gray-400 py-1">
          <span>ПН</span>
          <span>ВТ</span>
          <span>СР</span>
          <span>ЧТ</span>
          <span>ПТ</span>
          <span>СБ</span>
          <span>ВС</span>
        </div>

        {/* 7-Column Month Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells}
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER 2: WEEK VIEW (Matching Terra Spec)
  // ==========================================
  const renderWeekView = () => {
    const today = new Date();
    const todayKey = formatDateKey(today);

    const weekStartDateStr = formatDateKey(currentWeekDays[0]);
    const weekEndDateStr = formatDateKey(currentWeekDays[6]);

    const weekAllEvents = events.filter(e => {
      return e.date >= weekStartDateStr && e.date <= weekEndDateStr && isEventMatchingFilter(e);
    });

    return (
      <div className="space-y-3.5">
        {/* Week Strip / 7-Day Grid */}
        <div className={`${SURFACE_CARD} space-y-2.5`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">
              Дни недели
            </span>
            <span className="text-xs text-graphite-muted dark:text-gray-400 font-semibold">
              {weekMonthYearTitle}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {currentWeekDays.map((dayDate, idx) => {
              const dateStr = formatDateKey(dayDate);
              const isSelected = selectedDateStr === dateStr;
              const isToday = dateStr === todayKey;
              const dayNum = dayDate.getDate();
              const dayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
              const dayName = dayNames[idx];
              const isWeekend = idx >= 5;

              const dayEvents = events.filter(e => e.date === dateStr && isEventMatchingFilter(e));
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(new Date(dayDate))}
                  className={`flex flex-col items-center justify-between py-2.5 px-0.5 rounded-2xl transition-colors cursor-pointer relative  ${
                    isSelected
                      ? 'bg-[#4A7C59] text-white shadow-sm transform scale-[1.03]'
                      : 'bg-[var(--terra-soft)] dark:bg-white/5 hover:bg-[var(--terra-soft)] dark:hover:bg-white/10 text-[var(--terra-ink)] dark:text-gray-200'
                  }`}
                >
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isSelected 
                      ? 'text-white/90' 
                      : isWeekend 
                      ? 'text-[#705C30] dark:text-amber-400' 
                      : 'text-graphite-muted dark:text-gray-400'
                  }`}>
                    {dayName}
                  </span>

                  <span className={`text-sm font-bold my-0.5 leading-none ${
                    isSelected ? 'font-extrabold text-white' : ''
                  }`}>
                    {dayNum}
                  </span>

                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-opacity ${
                      isSelected
                        ? hasEvents ? 'bg-white' : 'opacity-0'
                        : hasEvents
                        ? 'bg-[#4A7C59] dark:bg-emerald-400'
                        : isToday
                        ? 'bg-[#4A7C59]/40 opacity-70'
                        : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekly Summary Card */}
        <div className={`${SURFACE_CARD} space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">
                Всего на неделе
              </div>
              <div className="text-base font-headline font-bold text-[var(--terra-ink)] dark:text-white mt-0.5">
                {weekAllEvents.length} {weekAllEvents.length === 1 ? 'событие' : weekAllEvents.length >= 2 && weekAllEvents.length <= 4 ? 'события' : 'событий'}
              </div>
            </div>
          </div>

          {weekAllEvents.length > 0 ? (
            <div className="space-y-2">
              {weekAllEvents.map(e => {
                const primaryMemberId = e.memberIds && e.memberIds[0];
                const memberMeta = primaryMemberId ? getMemberMeta(primaryMemberId) : null;
                const d = parseLocalCalendarDate(e.date);
                const dayNum = d.getDate();
                const dayOfWeekNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
                const dayOfWeekLabel = dayOfWeekNames[d.getDay()];

                return (
                  <div
                    key={e.id}
                    onClick={() => {
                      setSelectedDate(parseLocalCalendarDate(e.date));
                      onOpenEvent(e);
                    }}
                    className="py-2.5 px-1 flex items-center justify-between gap-2 hover:bg-[var(--terra-soft)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[var(--terra-soft)] dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-graphite-muted dark:text-gray-400 uppercase leading-none">
                          {dayOfWeekLabel}
                        </span>
                        <span className="text-xs font-bold text-[var(--terra-ink)] dark:text-white leading-none mt-0.5">
                          {dayNum}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <button type="button" onClick={(event)=>{event.stopPropagation();setSelectedDate(parseLocalCalendarDate(e.date));onOpenEvent(e);}} aria-label={`Открыть событие: ${e.title}`} className="min-h-[44px] text-left text-sm font-semibold text-[var(--terra-ink)] break-words focus-visible:ring-2 focus-visible:ring-primary">{e.title}</button>
                        <div className="flex items-center gap-2 text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                          <span className="font-semibold text-[var(--terra-ink)] dark:text-gray-200">{e.time}</span>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: memberMeta?.color || '#4A7C59' }}
                            />
                            <span>{memberMeta?.name || 'Вся семья'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label={`Подробнее: ${e.title}`}
                      className="w-11 h-11 flex items-center justify-center text-graphite-muted dark:text-gray-400 hover:text-[var(--terra-primary)] transition-colors cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 bg-[#F5F1EA]/50 dark:bg-white/5 rounded-2xl">
              <p className="text-xs text-graphite-muted dark:text-gray-400 italic">
                На этой неделе пока нет запланированных событий
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER 3: SCHEDULE / LIST VIEW
  // ==========================================
  const renderScheduleList = () => {
    const listEvents = listTab === 'upcoming' ? scheduleUpcomingEvents : schedulePastEvents;

    return (
      <div className={`${SURFACE_CARD} space-y-3.5`}>
        {/* Tab Toggle: Предстоящие / Прошедшие */}
        <div className="flex items-center justify-between border-b border-[#EAE5DB]/60 dark:border-white/5 pb-3">
          <div className="flex bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setListTab('upcoming')}
              aria-pressed={listTab === 'upcoming'}
              className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${
                listTab === 'upcoming'
                  ? 'bg-white dark:bg-[var(--terra-surface)] text-[#3B6347] dark:text-emerald-400 shadow-xs'
                  : 'text-[var(--terra-muted)] dark:text-gray-400'
              }`}
            >
              Предстоящие ({scheduleUpcomingEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setListTab('past')}
              aria-pressed={listTab === 'past'}
              className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${
                listTab === 'past'
                  ? 'bg-white dark:bg-[var(--terra-surface)] text-[#3B6347] dark:text-emerald-400 shadow-xs'
                  : 'text-[var(--terra-muted)] dark:text-gray-400'
              }`}
            >
              Прошедшие ({schedulePastEvents.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenEvent(null, { date: formatDateKey(new Date()) })}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#4A7C59] text-white flex items-center justify-center shadow-xs  transition cursor-pointer"
            title="Новое событие"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Events List */}
        <div className="space-y-2.5">
          {listEvents.length > 0 ? (
            listEvents.map(e => {
              const primaryMemberId = e.memberIds && e.memberIds[0];
              const memberMeta = primaryMemberId ? getMemberMeta(primaryMemberId) : null;
              const d = parseLocalCalendarDate(e.date);
              const dayNum = d.getDate();
              const dayOfWeekNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
              const dayOfWeekLabel = dayOfWeekNames[d.getDay()];

              return (
                <div
                  key={e.id}
                  onClick={() => {
                    setSelectedDate(parseLocalCalendarDate(e.date));
                    onOpenEvent(e);
                  }}
                  className="py-2.5 px-1 flex items-center justify-between gap-2 hover:bg-[var(--terra-soft)] transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[var(--terra-soft)] dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-graphite-muted dark:text-gray-400 uppercase leading-none">
                        {dayOfWeekLabel}
                      </span>
                      <span className="text-xs font-bold text-[var(--terra-ink)] dark:text-white leading-none mt-0.5">
                        {dayNum}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <button type="button" onClick={(event)=>{event.stopPropagation();setSelectedDate(parseLocalCalendarDate(e.date));onOpenEvent(e);}} aria-label={`Открыть событие: ${e.title}`} className="min-h-[44px] text-left text-sm font-semibold text-[var(--terra-ink)] break-words focus-visible:ring-2 focus-visible:ring-primary">{e.title}</button>
                      <div className="flex items-center gap-2 text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                        <span className="font-semibold text-[var(--terra-ink)] dark:text-gray-200">{e.time}</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: memberMeta?.color || '#4A7C59' }}
                          />
                          <span>{memberMeta?.name || 'Вся семья'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(evt) => {
                      evt.stopPropagation();
                      onSendToTelegram(e);
                    }}
                    className="min-w-[44px] min-h-[44px] rounded-xl text-[var(--terra-primary)] hover:bg-[var(--terra-soft)] dark:hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
                    title="В Telegram"
                  >
                    <Send size={15} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center bg-[#F5F2EB]/50 dark:bg-white/5 rounded-2xl p-6">
              <Check size={32} className="mx-auto text-graphite-muted/40 mb-2" />
              <p className="text-xs font-bold text-[var(--terra-ink)] dark:text-white uppercase tracking-wider">
                {listTab === 'upcoming' 
                  ? `В ${currentMonthTitle} нет запланированных событий` 
                  : `В ${currentMonthTitle} нет прошедших событий`}
              </p>
              {listTab === 'upcoming' && (
                <button
                  type="button"
                  onClick={() => onOpenEvent(null, { date: formatDateKey(new Date()) })}
                  className="mt-3 px-4 py-2 rounded-xl bg-[#4A7C59] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer  transition"
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
    <div className="flex-none flex flex-col min-w-0 bg-[var(--terra-canvas)] dark:bg-[var(--terra-canvas)] overflow-visible text-[var(--terra-ink)] dark:text-gray-100 transition-colors">
      
      {/* 1. UNIFIED MOBILE HEADER */}
      <TerraMobileHeader
        title="Планы"
        onAdd={() => onOpenEvent(null, { date: selectedDateStr })}
        addTitle="Добавить событие"
        onOpenSettings={onOpenSettings}
        onOpenNotifications={onOpenNotifications}
        rightExtra={
          <button
            type="button"
            onClick={startListening}
            aria-label="Голосовой ввод"
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] cursor-pointer ${
              isListening
                ? 'bg-[var(--terra-danger-soft)] text-[var(--terra-danger-text)]'
                : isProcessingVoice
                ? 'bg-[var(--terra-pending-soft)] text-[var(--terra-pending-text)]'
                : 'bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] text-[var(--terra-ink)] dark:text-white hover:text-[var(--terra-primary)] hover:bg-[#E0DBD0] dark:hover:bg-white/10 shadow-xs'
            }`}
            title="Голосовой ввод события"
          >
            {isProcessingVoice ? <Loader2 size={16} className="animate-spin" /> : <Mic size={18} />}
          </button>
        }
      />

      {beforeContent}
      {/* Main scroll content */}
      <div className="px-4 pt-3 pb-4 md:pb-6 space-y-4 max-w-3xl mx-auto w-full">
        
        {/* Banner: Conflict Warning if overlapping events exist */}
        {conflictPairs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSelectedConflictPair(conflictPairs[0]);
              setIsConflictResolverOpen(true);
            }}
            className="w-full p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-left shadow-xs hover:bg-rose-100/80 transition cursor-pointer "
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--terra-danger-text)]">
                    Конфликт расписания
                  </span>
                </div>
                <p className="text-sm font-medium text-[var(--terra-ink)] break-words mt-0.5">
                  Обнаружено наложение по времени ({conflictPairs.length} {conflictPairs.length === 1 ? 'событие' : 'события'})
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300 shrink-0 flex items-center gap-1">
              <span>Разрешить</span>
              <ChevronRight size={16} />
            </span>
          </button>
        )}
        
        {/* CARD 1: Month Title & Filter Card (Image 1 Spec) */}
        <div className={`${SURFACE_CARD} space-y-3.5`}>
          
          {/* Row 1: Month Title & Arrows */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-lg sm:text-2xl font-headline font-semibold text-[var(--terra-ink)] dark:text-white tracking-tight break-words">
                {viewMode === 'day' ? selectedDayFormattedTitle : viewMode === 'week' ? weekPeriodTitle : currentMonthTitle}
              </h2>

            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => viewMode === 'day' ? changeDay(-1) : viewMode === 'week' ? changeWeek(-1) : changeMonth(-1)}
                aria-label={viewMode === 'day' ? "Предыдущий день" : viewMode === 'week' ? "Предыдущая неделя" : "Предыдущий месяц"}
                className="w-11 h-11 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-[var(--terra-soft)] dark:bg-white/10 flex items-center justify-center text-[var(--terra-ink)] dark:text-white hover:bg-[var(--terra-soft)]  transition-colors cursor-pointer"
                title={viewMode === 'day' ? "Предыдущий день" : viewMode === 'week' ? "Предыдущая неделя" : "Предыдущий месяц"}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => viewMode === 'day' ? changeDay(1) : viewMode === 'week' ? changeWeek(1) : changeMonth(1)}
                aria-label={viewMode === 'day' ? "Следующий день" : viewMode === 'week' ? "Следующая неделя" : "Следующий месяц"}
                className="w-11 h-11 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-[var(--terra-soft)] dark:bg-white/10 flex items-center justify-center text-[var(--terra-ink)] dark:text-white hover:bg-[var(--terra-soft)]  transition-colors cursor-pointer"
                title={viewMode === 'day' ? "Следующий день" : viewMode === 'week' ? "Следующая неделя" : "Следующий месяц"}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Row 2: Segmented Switcher (Месяц / Неделя / Расписание) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] p-1 rounded-2xl gap-1 w-full">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              aria-pressed={viewMode === 'month'}
              className={`min-h-[44px] py-2 px-1 rounded-xl text-xs flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-[var(--terra-surface)] text-[#3B6347] dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-[var(--terra-muted)] dark:text-gray-400 font-medium hover:text-[var(--terra-ink)]'
              }`}
            >
              <LayoutGrid size={15} />
              <span>Месяц</span>
            </button>

            <button
              type="button"
              onClick={() => {setViewMode('week');setCurrentDate(new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1));}}
              aria-pressed={viewMode === 'week'}
              className={`min-h-[44px] py-2 px-1 rounded-xl text-xs flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-[var(--terra-surface)] text-[#3B6347] dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-[var(--terra-muted)] dark:text-gray-400 font-medium hover:text-[var(--terra-ink)]'
              }`}
            >
              <Columns size={15} />
              <span>Неделя</span>
            </button>

            <button type="button" onClick={() => {setViewMode('day');setCurrentDate(new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1));}} aria-pressed={viewMode === 'day'}
              className={`min-h-[44px] px-2 rounded-xl text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors motion-reduce:transition-none ${viewMode === 'day' ? 'bg-white dark:bg-[var(--terra-surface)] text-[#3B6347] dark:text-emerald-400 shadow-xs' : 'text-[var(--terra-muted)] dark:text-gray-400'}`}>
              День
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`min-h-[44px] py-2 px-1 rounded-xl text-xs flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[var(--terra-surface)] text-[#3B6347] dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-[var(--terra-muted)] dark:text-gray-400 font-medium hover:text-[var(--terra-ink)]'
              }`}
            >
              <ListTodo size={15} />
              <span>Расписание</span>
            </button>
          </div>

          {/* Row 3: Chip Filters (Все, Папа, Мама, Пересечения) */}
          <div role="group" aria-label="Фильтр участников планов" className={FILTER_RAIL}>
            {memberFilterStats.map(stat => {
              const isSelected = filterMemberId === stat.id;

              return (
                <button
                  key={stat.id}
                  type="button"
                  onClick={() => setFilterMemberId(stat.id as any)}
                  aria-pressed={isSelected}
                  className={`${FILTER_CHIP} cursor-pointer ${
                    isSelected
                      ? FILTER_CHIP_ACTIVE
                      : FILTER_CHIP_IDLE
                  }`}
                >
                  {stat.id !== 'all' && (
                    stat.isConflict ? (
                      <span className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-800" />
                      </span>
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: stat.color }}
                      />
                    )
                  )}
                  <span>{stat.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-xs ${
                      isSelected
                        ? 'bg-white/20 text-white font-bold'
                        : 'bg-black/5 dark:bg-white/10 text-graphite-muted dark:text-gray-300'
                    }`}
                  >
                    {stat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CARD 2: Current View Content (Month Calendar / Week / Schedule) */}
        {viewMode === 'month' && renderCalendarGrid()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'list' && renderScheduleList()}

        {/* CARD 3: Selected Day Card & Monthly Summary (Image 1 Spec) */}
        {viewMode !== 'list' && (
          <div className={`${SURFACE_CARD} space-y-4`}>
            
            {/* Header: Circle Day Badge, Title, Today Badge & Add Button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[#C8E8D0] dark:bg-[#4A7C59]/30 text-[#2A6038] dark:text-green-200 font-headline font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
                  {selectedDate.getDate()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-headline font-bold text-base sm:text-lg text-[var(--terra-ink)] dark:text-white leading-tight">
                      {selectedDayFormattedTitle}
                    </h3>
                    {isSelectedDateToday && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#3B6347] text-white text-xs font-bold shrink-0">
                        Сегодня
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                    Событий: {eventsForSelectedDay.length}
                  </p>
                </div>
              </div>

              {/* Add Button (+) */}
              <button
                type="button"
                onClick={() => onOpenEvent(null, { date: selectedDateStr })}
                className="w-11 h-11 rounded-xl bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-primary shrink-0 cursor-pointer"
                title="Добавить событие"
              >
                <Plus size={22} strokeWidth={2.4} />
              </button>
            </div>

            {/* Selected Day Events List */}
            {eventsForSelectedDay.length > 0 ? (
              <div className="space-y-3">
                {eventsForSelectedDay.map(ev => {
                  const primaryMemberId = ev.memberIds && ev.memberIds[0];
                  const memberMeta = primaryMemberId ? getMemberMeta(primaryMemberId) : null;
                  const isConflict = conflictingEventIds.has(ev.id);
                  const isCommon = !ev.memberIds || ev.memberIds.length === 0 || ev.memberIds.length === members.length;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => onOpenEvent(ev)}
                      className={`p-4 rounded-2xl bg-[var(--terra-soft)] dark:bg-white/5 border transition cursor-pointer space-y-2.5 ${
                        isConflict
                          ? 'border-amber-400/80 dark:border-amber-600/60'
                          : 'border-[#EAE5DB]/70 dark:border-white/10'
                      }`}
                    >
                      {/* Top Row: Color Dot + Time + Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-sans text-sm font-bold text-[var(--terra-ink)] dark:text-white">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: memberMeta?.color || '#D97706' }}
                          />
                          <span>
                            {ev.time || 'Весь день'} {ev.time && ev.duration ? `— ${calendarEndTime(ev.time,ev.duration)}` : ''}
                          </span>
                        </div>

                        {isConflict ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                            <AlertTriangle size={12} />
                            <span>Пересечение</span>
                          </span>
                        ) : isCommon ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--terra-soft)] text-[#5E5548] dark:bg-white/10 dark:text-gray-300">
                            <Users size={12} />
                            <span>Совместно</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Event Title */}
                      <button type="button" onClick={(event)=>{event.stopPropagation();onOpenEvent(ev);}} aria-label={`Открыть событие: ${ev.title}`} className="min-h-[44px] w-full text-left text-base font-semibold text-[var(--terra-ink)] break-words focus-visible:ring-2 focus-visible:ring-primary">{ev.title}</button>

                      {/* Description / Note */}
                      {ev.description && (
                        <p className="text-xs text-graphite-muted dark:text-gray-400 leading-relaxed">
                          {ev.description}
                        </p>
                      )}

                      {/* Bottom Row: Member Chips + Notification & Actions */}
                      <div className="flex flex-wrap items-center justify-between pt-1 gap-2 border-t border-[#EAE5DB]/60 dark:border-white/5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ev.memberIds && ev.memberIds.length > 0 ? (
                            ev.memberIds.map(mId => {
                              const m = getMemberMeta(mId);
                              return (
                                <span
                                  key={mId}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--terra-soft)] dark:bg-white/10 text-xs font-semibold text-[var(--terra-ink)] dark:text-gray-200"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0 self-center"
                                    style={{ backgroundColor: m.color }}
                                  />
                                  <span>{m.name}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--terra-soft)] dark:bg-white/10 text-xs font-semibold text-[var(--terra-ink)] dark:text-gray-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] shrink-0 self-center" />
                              <span>Вся семья</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 min-w-0 max-w-full">
                          <span className="text-xs text-graphite-muted dark:text-gray-400 inline-flex items-center gap-1 min-w-0 break-words">
                            <Bell size={13} />
                            <span>{ev.reminders?.length ? ev.reminders.map(formatReminderLabel).join(', ') : 'Без напоминаний'}</span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendToTelegram(ev);
                            }}
                            className="w-11 h-11 flex items-center justify-center text-[var(--terra-primary)] hover:bg-[var(--terra-soft)] dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                            title="В Telegram"
                          >
                            <Send size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[var(--terra-soft)] dark:bg-white/5 rounded-2xl p-4 flex items-center gap-3.5 transition-colors">
                <div className="w-11 h-11 rounded-full bg-[#C8E8D0] dark:bg-[#4A7C59]/30 text-[#2A6038] dark:text-green-200 flex items-center justify-center shrink-0 shadow-xs">
                  <Leaf size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[var(--terra-ink)] dark:text-white leading-snug">
                    Нет событий на этот день
                  </h4>
                  <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5 leading-relaxed">
                    Нажмите «+», чтобы запланировать задачу или семейное дело
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Summary Bar (Image 1 Spec) */}
            <div className="pt-3 border-t border-[var(--terra-border)] flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">

                <span className="font-bold text-[var(--terra-ink)] dark:text-white">
                  Планы на месяц: <strong className="text-[#3B6347] dark:text-emerald-400">{monthStats.total} событий</strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--terra-muted)] dark:text-gray-300">
                {monthStats.memberCounts.map(mc => (
                  <span key={mc.name}>
                    {mc.name}: <strong className="text-[var(--terra-ink)] dark:text-white">{mc.count}</strong>
                  </span>
                ))}
                {monthStats.commonCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-[#3B6347] dark:text-emerald-400 font-bold">
                      Общие: {monthStats.commonCount}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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

export default FamilyPlansMobile;
