/**
 * Pure reminder scheduler: turns settings + "now" into a list of notifications
 * to register with the OS. No side effects; fully unit tested.
 *
 * Strategy (see README "How reminders are scheduled"):
 * - Every reminder time of day ("slot") becomes a DAILY repeating trigger, so
 *   reminders keep firing indefinitely even if the app is never reopened.
 * - iOS allows 64 pending notifications, so the active window is capped at
 *   MAX_DAILY_SLOTS slots (see clampWindow).
 * - While paused, a slot whose next occurrence falls inside the pause gets a
 *   one-time DATE trigger at its first occurrence after the pause instead.
 *   The next sync after the pause ends restores its daily trigger. If the app
 *   is never reopened, only those paused slots stop; all others keep going.
 */
import { IntervalMinutes, MAX_DAILY_SLOTS, REMINDER_ID_PREFIX } from '../config';
import {
  MINUTES_PER_DAY,
  addDays,
  atMinuteOfDay,
  nextOccurrence,
  normalizeMinuteOfDay,
  slotCount,
  slotMinutes,
  windowLength,
} from '../domain/time';

export interface ReminderSettings {
  enabled: boolean;
  intervalMinutes: IntervalMinutes;
  /** Minutes after local midnight. */
  activeStartMin: number;
  /** Minutes after local midnight. May be earlier than start (crosses midnight). */
  activeEndMin: number;
  /** Epoch ms; reminders are paused until this moment. */
  pausedUntil: number | null;
}

export type PlannedTrigger =
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'once'; at: number };

export interface PlannedReminder {
  /** Stable per time of day, e.g. "hydrate-0915". */
  id: string;
  minuteOfDay: number;
  /** Position within the day's window; used to rotate message copy. */
  slotIndex: number;
  trigger: PlannedTrigger;
}

export function reminderId(minute: number): string {
  const h = String(Math.floor(minute / 60)).padStart(2, '0');
  const m = String(minute % 60).padStart(2, '0');
  return `${REMINDER_ID_PREFIX}${h}${m}`;
}

export function isPaused(settings: Pick<ReminderSettings, 'pausedUntil'>, now: number): boolean {
  return settings.pausedUntil != null && settings.pausedUntil > now;
}

export function buildSchedule(settings: ReminderSettings, now: number): PlannedReminder[] {
  if (!settings.enabled) return [];

  const { activeStartMin, activeEndMin, intervalMinutes } = clampWindow(
    settings.activeStartMin,
    settings.activeEndMin,
    settings.intervalMinutes,
  );
  const paused = isPaused(settings, now);

  return slotMinutes(activeStartMin, activeEndMin, intervalMinutes).map((minute, slotIndex) => {
    const base = { id: reminderId(minute), minuteOfDay: minute, slotIndex };
    if (paused && nextOccurrence(minute, now) < settings.pausedUntil!) {
      // Skip occurrences inside the pause; fire once at the first one after it.
      return { ...base, trigger: { kind: 'once', at: nextOccurrence(minute, settings.pausedUntil!, true) } };
    }
    return { ...base, trigger: { kind: 'daily', hour: Math.floor(minute / 60), minute: minute % 60 } };
  });
}

/** When the next reminder will fire, or null if none are scheduled. */
export function nextReminderAt(plan: PlannedReminder[], now: number): number | null {
  let best: number | null = null;
  for (const r of plan) {
    const t = r.trigger.kind === 'once' ? r.trigger.at : nextOccurrence(r.minuteOfDay, now);
    if (t > now && (best === null || t < best)) best = t;
  }
  return best;
}

/** Stable string describing a plan, used to skip redundant rescheduling. */
export function planSignature(plan: PlannedReminder[]): string {
  return plan
    .map((r) => (r.trigger.kind === 'daily' ? `${r.id}@d` : `${r.id}@${r.trigger.at}`))
    .join('|');
}

/** Longest allowed active window (minutes) for an interval, given the slot cap. */
export function maxWindowMinutes(intervalMinutes: number): number {
  return Math.min((MAX_DAILY_SLOTS - 1) * intervalMinutes, MINUTES_PER_DAY - intervalMinutes);
}

/**
 * Makes a window valid: non-empty and within the slot cap. If it's too long,
 * the end time is pulled in. Returns whether anything changed.
 */
export function clampWindow(
  activeStartMin: number,
  activeEndMin: number,
  intervalMinutes: IntervalMinutes,
): { activeStartMin: number; activeEndMin: number; intervalMinutes: IntervalMinutes; clamped: boolean } {
  const start = normalizeMinuteOfDay(activeStartMin);
  let end = normalizeMinuteOfDay(activeEndMin);
  let clamped = false;

  if (windowLength(start, end) === 0) {
    end = normalizeMinuteOfDay(start + 60);
    clamped = true;
  }
  if (slotCount(start, end, intervalMinutes) > MAX_DAILY_SLOTS) {
    end = normalizeMinuteOfDay(start + maxWindowMinutes(intervalMinutes));
    clamped = true;
  }
  return { activeStartMin: start, activeEndMin: end, intervalMinutes, clamped };
}

/** Pause presets offered in the UI. Each returns the `pausedUntil` epoch ms. */
export function pauseForHours(now: number, hours: number): number {
  return now + hours * 60 * 60 * 1000;
}

/** "Rest of today": pause until the active window opens tomorrow (e.g. 9:00 AM). */
export function pauseUntilTomorrow(now: number, activeStartMin: number): number {
  return atMinuteOfDay(addDays(new Date(now), 1), activeStartMin).getTime();
}
