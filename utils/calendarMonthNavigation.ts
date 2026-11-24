/**
 * Shift the calendar month while keeping the selected day whenever possible.
 * Setting month directly on Jan 31 can overflow February and jump to March.
 */
export function shiftCalendarMonth(date: Date, delta: number): Date {
  if (!Number.isInteger(delta)) throw new Error('Month offset must be an integer');
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + delta);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

/** Preserve the selected day, clamped to the target month. */
export function selectedDayInMonth(selected: Date, target: Date): Date {
  const lastDay=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();
  return new Date(target.getFullYear(),target.getMonth(),Math.min(selected.getDate(),lastDay));
}
