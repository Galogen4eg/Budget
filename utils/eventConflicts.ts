import { FamilyEvent } from '../types';

/**
 * Finds all conflicting/overlapping events in a list of family events.
 * Two events conflict if they are on the same date, share at least one member (or are family-wide),
 * and their time windows overlap.
 */
export function findEventConflicts(events: FamilyEvent[]): {
  conflictingEventIds: Set<string>;
  conflictPairs: Array<{ eventA: FamilyEvent; eventB: FamilyEvent }>;
} {
  const conflictingEventIds = new Set<string>();
  const conflictPairs: Array<{ eventA: FamilyEvent; eventB: FamilyEvent }> = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];

      if (a.date !== b.date) continue;

      // Check member overlap (if either has no specific members, it is considered family-wide)
      const aMembers = a.memberIds || [];
      const bMembers = b.memberIds || [];
      let shareParticipants = true;
      if (aMembers.length > 0 && bMembers.length > 0) {
        shareParticipants = aMembers.some(id => bMembers.includes(id));
      }

      if (!shareParticipants) continue;

      // Calculate time overlap
      const [aH, aM] = (a.time || '00:00').split(':').map(Number);
      const [bH, bM] = (b.time || '00:00').split(':').map(Number);
      const aStart = (isNaN(aH) ? 0 : aH) * 60 + (isNaN(aM) ? 0 : aM);
      const aEnd = aStart + ((a.duration || 1) * 60);
      const bStart = (isNaN(bH) ? 0 : bH) * 60 + (isNaN(bM) ? 0 : bM);
      const bEnd = bStart + ((b.duration || 1) * 60);

      // Overlap condition
      if (aStart < bEnd && aEnd > bStart) {
        conflictingEventIds.add(a.id);
        conflictingEventIds.add(b.id);
        conflictPairs.push({ eventA: a, eventB: b });
      }
    }
  }

  return { conflictingEventIds, conflictPairs };
}
