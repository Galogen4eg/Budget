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
import TerraMobileHeader from './TerraMobileHeader';
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
  onOpenNotifications
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
    const stats: Array<{ id: string; label: string; count: number; color: string; isConflict?: boolean }> = [
      { id: 'all', label: 'Все', count: allCount, color: '#4A7C59' }
    ];

    // Show member chip ONLY if they have at least 1 event
    members.forEach(m => {
      const count = events.filter(e => e.memberIds && e.memberIds.includes(m.id)).length;
      if (count > 0) {
        stats.push({
          id: m.id,
          label: m.name,
          count,
          color: m.color || '#4A7C59'
        });
      }
    });

    const commonCount = events.filter(e => !e.memberIds || e.memberIds.length === 0 || e.memberIds.length === members.length).length;
    if (commonCount > 0 && members.length > 1) {
      stats.push({
        id: 'common',
        label: 'Общие',
        count: commonCount,
        color: '#4A7C59'
      });
    }

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
        <div
          key={`prev-${prevDayNumber}`}
          onClick={() => {
            handleDateClick(prevDate.getFullYear(), prevDate.getMonth(), prevDayNumber);
            setCurrentDate(new Date(prevDate.getFullYear(), prevDate.getMonth(), 1));
          }}
          className="h-[52px] sm:h-[56px] p-1.5 rounded-2xl flex flex-col justify-between items-center transition-all cursor-pointer select-none opacity-40"
        >
          <span className="text-xs font-normal text-graphite-muted dark:text-gray-600 mt-1">
            {prevDayNumber}
          </span>
          <div className="h-2" />
        </div>
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
      const dayMemberIds = Array.from(new Set(dayEvents.flatMap(e => (e.memberIds && e.memberIds.length > 0) ? e.memberIds : [e.memberId || 'all'])));
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
        <div
          key={`current-${day}`}
          onClick={() => handleDateClick(year, month, day)}
          className={`h-[52px] sm:h-[56px] p-1.5 rounded-2xl flex flex-col justify-between items-center transition-all cursor-pointer select-none relative active:scale-95 ${
            isSelected
              ? 'ring-2 ring-[#4A7C59] bg-[#EEF5F0] dark:bg-[#4A7C59]/20 shadow-xs z-10'
              : 'bg-[#F5F2EB] dark:bg-white/5 hover:bg-[#EAE6DE] dark:hover:bg-white/10'
          }`}
        >
          {/* Day Number */}
          <span
            className={`text-xs font-bold leading-none mt-1 ${
              isSelected
                ? 'text-[#2A6038] dark:text-green-300 font-extrabold'
                : isToday
                ? 'text-[#4A7C59] dark:text-green-300 font-extrabold'
                : 'text-[#2E3230] dark:text-gray-200'
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
        </div>
      );
    }

    // 3. Leading days for next month to complete the row
    const totalRendered = startOffset + totalDays;
    const remainingInGrid = totalRendered % 7 === 0 ? 0 : 7 - (totalRendered % 7);

    for (let nextDay = 1; nextDay <= remainingInGrid; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay);
      cells.push(
        <div
          key={`next-${nextDay}`}
          onClick={() => {
            handleDateClick(nextDate.getFullYear(), nextDate.getMonth(), nextDay);
            setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
          }}
          className="h-[52px] sm:h-[56px] p-1.5 rounded-2xl flex flex-col justify-between items-center transition-all cursor-pointer select-none opacity-40"
        >
          <span className="text-xs font-normal text-graphite-muted dark:text-gray-600 mt-1">
            {nextDay}
          </span>
          <div className="h-2" />
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-[#1E1E20] rounded-[28px] p-4 shadow-sm border border-[#EAE5DB]/60 dark:border-white/5 space-y-2.5">
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
        <div className="bg-white dark:bg-[#1E1E20] rounded-[28px] p-4 shadow-sm border border-[#EAE5DB]/60 dark:border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">
              Дни недели
            </span>
            <span className="text-[11px] text-graphite-muted dark:text-gray-400 font-semibold">
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
                  className={`flex flex-col items-center justify-between py-2.5 px-0.5 rounded-2xl transition-all cursor-pointer relative active:scale-95 ${
                    isSelected
                      ? 'bg-[#4A7C59] text-white shadow-sm transform scale-[1.03]'
                      : 'bg-[#F5F2EB] dark:bg-white/5 hover:bg-[#EAE6DE] dark:hover:bg-white/10 text-[#2E3230] dark:text-gray-200'
                  }`}
                >
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
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
        <div className="bg-white dark:bg-[#1E1E20] rounded-[28px] p-4 shadow-sm border border-[#EAE5DB]/60 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-graphite-muted dark:text-gray-400">
                Всего на неделе
              </div>
              <div className="text-base font-headline font-bold text-[#2E3230] dark:text-white mt-0.5">
                {weekAllEvents.length} {weekAllEvents.length === 1 ? 'событие' : weekAllEvents.length >= 2 && weekAllEvents.length <= 4 ? 'события' : 'событий'}
              </div>
            </div>
          </div>

          {weekAllEvents.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto no-scrollbar">
              {weekAllEvents.map(e => {
                const primaryMemberId = e.memberIds && e.memberIds[0];
                const memberMeta = primaryMemberId ? getMemberMeta(primaryMemberId) : null;
                const d = new Date(e.date);
                const dayNum = d.getDate();
                const dayOfWeekNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
                const dayOfWeekLabel = dayOfWeekNames[d.getDay()];

                return (
                  <div
                    key={e.id}
                    onClick={() => {
                      setSelectedDate(new Date(e.date));
                      onOpenEvent(e);
                    }}
                    className="bg-[#F5F2EB] dark:bg-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 hover:bg-[#EAE6DE] dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#EAE6DE] dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-graphite-muted dark:text-gray-400 uppercase leading-none">
                          {dayOfWeekLabel}
                        </span>
                        <span className="text-xs font-bold text-[#2E3230] dark:text-white leading-none mt-0.5">
                          {dayNum}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#2E3230] dark:text-white truncate">
                          {e.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-graphite-muted dark:text-gray-400 mt-0.5">
                          <span className="font-semibold text-[#2E3230] dark:text-gray-200">{e.time}</span>
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
                      aria-label="Подробнее"
                      className="w-7 h-7 flex items-center justify-center text-graphite-muted dark:text-gray-400 hover:text-[#4A7C59] transition-colors cursor-pointer"
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
      <div className="bg-white dark:bg-[#1E1E20] rounded-[28px] p-4 shadow-sm border border-[#EAE5DB]/60 dark:border-white/5 space-y-3.5">
        {/* Tab Toggle: Предстоящие / Прошедшие */}
        <div className="flex items-center justify-between border-b border-[#EAE5DB]/60 dark:border-white/5 pb-3">
          <div className="flex bg-[#F0ECE4] dark:bg-[#252528] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setListTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                listTab === 'upcoming'
                  ? 'bg-white dark:bg-[#1E1E20] text-[#3B6347] dark:text-emerald-400 shadow-xs'
                  : 'text-[#6B6358] dark:text-gray-400'
              }`}
            >
              Предстоящие ({scheduleUpcomingEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setListTab('past')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                listTab === 'past'
                  ? 'bg-white dark:bg-[#1E1E20] text-[#3B6347] dark:text-emerald-400 shadow-xs'
                  : 'text-[#6B6358] dark:text-gray-400'
              }`}
            >
              Прошедшие ({schedulePastEvents.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenEvent(null, { date: formatDateKey(new Date()) })}
            className="w-8 h-8 rounded-full bg-[#4A7C59] text-white flex items-center justify-center shadow-xs active:scale-95 transition cursor-pointer"
            title="Новое событие"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Events List */}
        <div className="space-y-2.5 max-h-[450px] overflow-y-auto no-scrollbar">
          {listEvents.length > 0 ? (
            listEvents.map(e => {
              const primaryMemberId = e.memberIds && e.memberIds[0];
              const memberMeta = primaryMemberId ? getMemberMeta(primaryMemberId) : null;
              const d = new Date(e.date);
              const dayNum = d.getDate();
              const dayOfWeekNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
              const dayOfWeekLabel = dayOfWeekNames[d.getDay()];

              return (
                <div
                  key={e.id}
                  onClick={() => {
                    setSelectedDate(new Date(e.date));
                    onOpenEvent(e);
                  }}
                  className="bg-[#F5F2EB] dark:bg-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 hover:bg-[#EAE6DE] dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#EAE6DE] dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-graphite-muted dark:text-gray-400 uppercase leading-none">
                        {dayOfWeekLabel}
                      </span>
                      <span className="text-xs font-bold text-[#2E3230] dark:text-white leading-none mt-0.5">
                        {dayNum}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#2E3230] dark:text-white truncate">
                        {e.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-graphite-muted dark:text-gray-400 mt-0.5">
                        <span className="font-semibold text-[#2E3230] dark:text-gray-200">{e.time}</span>
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
                    className="w-8 h-8 rounded-full text-[#4A7C59] hover:bg-[#EDE8DD] dark:hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
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
    <div className="flex-1 flex flex-col min-w-0 bg-[#FAF6F0] dark:bg-[#121214] overflow-y-auto no-scrollbar pb-16 text-[#2E3230] dark:text-gray-100 transition-colors">
      
      {/* 1. UNIFIED MOBILE HEADER */}
      <TerraMobileHeader
        title="Планы"
        onAdd={() => onOpenEvent(null)}
        addTitle="Добавить событие"
        onOpenSettings={onOpenSettings}
        rightExtra={
          <button
            type="button"
            onClick={startListening}
            aria-label="Голосовой ввод"
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-md'
                : isProcessingVoice
                ? 'bg-amber-500 text-white'
                : 'bg-[#EAE6DD] dark:bg-[#252528] text-[#2E3230] dark:text-white hover:text-[#4A7C59] hover:bg-[#E0DBD0] dark:hover:bg-white/10 shadow-xs'
            }`}
            title="Голосовой ввод события"
          >
            {isProcessingVoice ? <Loader2 size={16} className="animate-spin" /> : <Mic size={18} />}
          </button>
        }
      />

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="px-3.5 pt-3 space-y-3.5 max-w-md mx-auto w-full">
        
        {/* Banner: Conflict Warning if overlapping events exist */}
        {conflictPairs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSelectedConflictPair(conflictPairs[0]);
              setIsConflictResolverOpen(true);
            }}
            className="w-full p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-left shadow-xs hover:bg-rose-100/80 transition cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-200 bg-rose-200/60 dark:bg-rose-900/80 px-2 py-0.5 rounded-full">
                    Конфликт расписания
                  </span>
                </div>
                <p className="text-xs font-bold text-stone-900 dark:text-white truncate mt-0.5">
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
        <div className="bg-white dark:bg-[#1E1E20] rounded-[28px] p-4 shadow-sm space-y-3.5 border border-[#EAE5DB]/60 dark:border-white/5">
          
          {/* Row 1: Month Title & Arrows */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xl sm:text-2xl font-headline font-bold text-[#2E3230] dark:text-white tracking-tight truncate">
                {viewMode === 'week' ? weekPeriodTitle : currentMonthTitle}
              </h2>
              {viewMode !== 'week' && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F0ECE4] dark:bg-white/10 text-[#6B6358] dark:text-gray-300 shrink-0">
                  {`${daysCountInCurrentMonth} дней`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => viewMode === 'week' ? changeWeek(-1) : changeMonth(-1)}
                aria-label={viewMode === 'week' ? "Предыдущая неделя" : "Предыдущий месяц"}
                className="w-9 h-9 rounded-full bg-[#F0ECE4] dark:bg-white/10 flex items-center justify-center text-[#2E3230] dark:text-white hover:bg-[#EAE6DE] active:scale-95 transition-all cursor-pointer"
                title={viewMode === 'week' ? "Предыдущая неделя" : "Предыдущий месяц"}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => viewMode === 'week' ? changeWeek(1) : changeMonth(1)}
                aria-label={viewMode === 'week' ? "Следующая неделя" : "Следующий месяц"}
                className="w-9 h-9 rounded-full bg-[#F0ECE4] dark:bg-white/10 flex items-center justify-center text-[#2E3230] dark:text-white hover:bg-[#EAE6DE] active:scale-95 transition-all cursor-pointer"
                title={viewMode === 'week' ? "Следующая неделя" : "Следующий месяц"}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Row 2: Segmented Switcher (Месяц / Неделя / Расписание) */}
          <div className="grid grid-cols-3 bg-[#F0ECE4] dark:bg-[#252528] p-1 rounded-2xl gap-1 w-full">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-[#1E1E20] text-[#3B6347] dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-[#6B6358] dark:text-gray-400 font-medium hover:text-[#2E3230]'
              }`}
            >
              <LayoutGrid size={15} />
              <span>Месяц</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-[#1E1E20] text-[#3B6347] dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-[#6B6358] dark:text-gray-400 font-medium hover:text-[#2E3230]'
              }`}
            >
              <Columns size={15} />
              <span>Неделя</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#1E1E20] text-[#3B6347] dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-[#6B6358] dark:text-gray-400 font-medium hover:text-[#2E3230]'
              }`}
            >
              <ListTodo size={15} />
              <span>Расписание</span>
            </button>
          </div>

          {/* Row 3: Chip Filters (Все, Папа, Мама, Пересечения) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {memberFilterStats.map(stat => {
              const isSelected = filterMemberId === stat.id;

              return (
                <button
                  key={stat.id}
                  type="button"
                  onClick={() => setFilterMemberId(stat.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[#3B6347] text-white shadow-xs font-bold'
                      : 'bg-[#F0ECE4] dark:bg-white/10 text-[#2E3230] dark:text-gray-200 hover:bg-[#EAE6DE]'
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
                    className={`px-1.5 py-0.2 rounded-full text-[11px] ${
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
          <div className="bg-white dark:bg-[#1E1E20] rounded-[28px] p-4 shadow-sm border border-[#EAE5DB]/60 dark:border-white/5 space-y-4">
            
            {/* Header: Circle Day Badge, Title, Today Badge & Add Button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[#C8E8D0] dark:bg-[#4A7C59]/30 text-[#2A6038] dark:text-green-200 font-headline font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
                  {selectedDate.getDate()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-headline font-bold text-base sm:text-lg text-[#2E3230] dark:text-white leading-tight">
                      {selectedDayFormattedTitle}
                    </h3>
                    {isSelectedDateToday && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#3B6347] text-white text-[11px] font-bold shrink-0">
                        Сегодня
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                    {eventsForSelectedDay.length} {eventsForSelectedDay.length === 1 ? 'запланированное событие семьи' : eventsForSelectedDay.length >= 2 && eventsForSelectedDay.length <= 4 ? 'запланированных события семьи' : 'запланированных событий семьи'}
                  </p>
                </div>
              </div>

              {/* Add Button (+) */}
              <button
                type="button"
                onClick={() => onOpenEvent(null, { date: selectedDateStr })}
                className="w-11 h-11 rounded-full bg-[#3B6347] hover:bg-[#32563D] active:scale-95 text-white flex items-center justify-center shadow-md transition-transform shrink-0 cursor-pointer"
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
                      className={`p-4 rounded-2xl bg-[#F5F2EB] dark:bg-white/5 border transition cursor-pointer space-y-2.5 ${
                        isConflict
                          ? 'border-amber-400/80 dark:border-amber-600/60'
                          : 'border-[#EAE5DB]/70 dark:border-white/10'
                      }`}
                    >
                      {/* Top Row: Color Dot + Time + Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-sans text-sm font-bold text-[#2E3230] dark:text-white">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: memberMeta?.color || '#D97706' }}
                          />
                          <span>
                            {ev.time} {ev.duration ? `— ${String(Math.floor(parseInt(ev.time.split(':')[0], 10) + (ev.duration || 1))).padStart(2, '0')}:${ev.time.split(':')[1] || '00'}` : ''}
                          </span>
                        </div>

                        {isConflict ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                            <AlertTriangle size={12} />
                            <span>Пересечение</span>
                          </span>
                        ) : isCommon ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#EDE8DD] text-[#5E5548] dark:bg-white/10 dark:text-gray-300">
                            <Users size={12} />
                            <span>Совместно</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Event Title */}
                      <h4 className="text-base font-bold text-[#2E3230] dark:text-white leading-snug">
                        {ev.title}
                      </h4>

                      {/* Description / Note */}
                      {ev.description && (
                        <p className="text-xs text-graphite-muted dark:text-gray-400 leading-relaxed">
                          {ev.description}
                        </p>
                      )}

                      {/* Bottom Row: Member Chips + Notification & Actions */}
                      <div className="flex items-center justify-between pt-1 gap-2 border-t border-[#EAE5DB]/60 dark:border-white/5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ev.memberIds && ev.memberIds.length > 0 ? (
                            ev.memberIds.map(mId => {
                              const m = getMemberMeta(mId);
                              return (
                                <span
                                  key={mId}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDE8DD] dark:bg-white/10 text-xs font-semibold text-[#2E3230] dark:text-gray-200"
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
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDE8DD] dark:bg-white/10 text-xs font-semibold text-[#2E3230] dark:text-gray-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] shrink-0 self-center" />
                              <span>Вся семья</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-graphite-muted dark:text-gray-400 inline-flex items-center gap-1">
                            <Bell size={13} />
                            <span>за 30 мин</span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendToTelegram(ev);
                            }}
                            className="w-7 h-7 flex items-center justify-center text-[#4A7C59] hover:bg-[#EDE8DD] dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
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
              <div className="bg-[#F5F2EB] dark:bg-white/5 rounded-2xl p-4 flex items-center gap-3.5 transition-colors">
                <div className="w-11 h-11 rounded-full bg-[#C8E8D0] dark:bg-[#4A7C59]/30 text-[#2A6038] dark:text-green-200 flex items-center justify-center shrink-0 shadow-xs">
                  <Leaf size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[#2E3230] dark:text-white leading-snug">
                    Нет событий на этот день
                  </h4>
                  <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5 leading-relaxed">
                    Нажмите «+», чтобы запланировать задачу или семейное дело
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Summary Bar (Image 1 Spec) */}
            <div className="bg-[#F0F7F2] dark:bg-emerald-950/20 rounded-2xl p-3 flex items-center justify-between text-xs border border-[#C8E8D0]/40 dark:border-emerald-800/20 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#C8E8D0]/60 dark:bg-emerald-800/40 text-[#2A6038] dark:text-green-300 flex items-center justify-center">
                  <Sparkles size={13} />
                </div>
                <span className="font-bold text-[#2E3230] dark:text-white">
                  Планы на месяц: <strong className="text-[#3B6347] dark:text-emerald-400">{monthStats.total} событий</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-[#6B6358] dark:text-gray-300">
                {monthStats.memberCounts.map(mc => (
                  <span key={mc.name}>
                    {mc.name}: <strong className="text-[#2E3230] dark:text-white">{mc.count}</strong>
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
