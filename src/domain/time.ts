/**
 * Pure local-time helpers. All "minute of day" values are minutes after local
 * midnight (0–1439). Dates are built from local calendar components so they
 * stay correct across daylight-saving changes.
 */

export const MINUTES_PER_DAY = 24 * 60;
export const HOUR_MS = 60 * 60 * 1000;

export function normalizeMinuteOfDay(minute: number): number {
  return ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** `YYYY-MM-DD` for the local calendar day containing `date`. */
export function dateKey(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses a `YYYY-MM-DD` key into local midnight of that day. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local calendar day `days` away from `date` (keeps time of day = midnight). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function previousDateKey(key: string): string {
  return dateKey(addDays(parseDateKey(key), -1));
}

/** The local date on `day`'s calendar date at the given minute of day. */
export function atMinuteOfDay(day: Date, minute: number): Date {
  const m = normalizeMinuteOfDay(minute);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60, 0, 0);
}

/**
 * First moment at the given local time of day that is strictly after `after`
 * (or at/after when `inclusive`).
 */
export function nextOccurrence(minute: number, after: number, inclusive = false): number {
  const base = new Date(after);
  for (let offset = 0; offset <= 2; offset++) {
    const t = atMinuteOfDay(addDays(base, offset), minute).getTime();
    if (inclusive ? t >= after : t > after) return t;
  }
  // Unreachable in practice: a given time of day always recurs within 2 days.
  return atMinuteOfDay(addDays(base, 3), minute).getTime();
}

/** Length of the active window in minutes, handling windows that cross midnight. */
export function windowLength(startMin: number, endMin: number): number {
  return normalizeMinuteOfDay(endMin - startMin);
}

/**
 * Reminder times of day within the active window, starting at `startMin` and
 * stepping by `intervalMin` up to and including `endMin`. Windows may cross
 * midnight (e.g. 22:00–01:00).
 */
export function slotMinutes(startMin: number, endMin: number, intervalMin: number): number[] {
  const length = windowLength(startMin, endMin);
  const slots: number[] = [];
  for (let offset = 0; offset <= length; offset += intervalMin) {
    slots.push(normalizeMinuteOfDay(startMin + offset));
  }
  return slots;
}

export function slotCount(startMin: number, endMin: number, intervalMin: number): number {
  return Math.floor(windowLength(startMin, endMin) / intervalMin) + 1;
}

/** "9:00 AM" style label for a minute of day. */
export function formatMinuteOfDay(minute: number): string {
  const m = normalizeMinuteOfDay(minute);
  const h24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}
