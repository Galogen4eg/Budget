import type { FamilyEvent } from '../types';
import { eventDateTime } from './calendarDates.ts';

/**
 * Two events conflict when their actual local time intervals overlap
 * and at least one participant is shared. Empty memberIds means family-wide.
 */
export function findEventConflicts(events: FamilyEvent[]): {
  conflictingEventIds: Set<string>;
  conflictPairs: Array<{ eventA: FamilyEvent; eventB: FamilyEvent }>;
} {
  const conflictingEventIds = new Set<string>();
  const conflictPairs: Array<{ eventA: FamilyEvent; eventB: FamilyEvent }> = [];
  const windows = events.map(event => {
    try {
      const start = eventDateTime(event.date, event.time || '00:00').getTime();
      const hours = Number(event.duration ?? 1);
      if (!Number.isFinite(hours) || hours <= 0) return null;
      return { start, end: start + hours * 3600000 };
    } catch {
      return null;
    }
  });

  for (let i = 0; i < events.length; i++) {
    const aWindow = windows[i];
    if (!aWindow) continue;
    for (let j = i + 1; j < events.length; j++) {
      const bWindow = windows[j];
      if (!bWindow) continue;
      const a = events[i];
      const b = events[j];
      const aMembers = a.memberIds || [];
      const bMembers = b.memberIds || [];
      const sameMembers = !aMembers.length || !bMembers.length ||
        aMembers.some(id => bMembers.includes(id));
      if (!sameMembers) continue;
      if (aWindow.start < bWindow.end && aWindow.end > bWindow.start) {
        conflictingEventIds.add(a.id);
        conflictingEventIds.add(b.id);
        conflictPairs.push({ eventA: a, eventB: b });
      }
    }
  }
  return { conflictingEventIds, conflictPairs };
}
