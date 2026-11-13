/**
 * Pure reminder scheduler: turns settings + "now" into a list of notifications
 * to register with the OS. No side effects; fully unit tested.
 *
 * Strategy (see README "How reminders are scheduled"):
 * - Every reminder time of day ("slot") becomes a DAILY repeating trigger, so
 *   reminders keep firing indefinitely even if the app is never reopened.
 * - iOS allows 64 pending notifications, so the active window is capped at
 *   MAX_DAILY_SLOTS slots (see clampWindow).
 * - While quiet (a pause, goal reached with "stop until tomorrow", or a
 *   drinking-too-much break), a slot whose next occurrence falls inside the
 *   quiet time gets a one-time DATE trigger at its first occurrence after it
 *   instead. The next sync restores its daily trigger. If the app is never
 *   reopened, only those slots stop; all others keep going.
 * - Catch-up check-ins ("you're behind on water") use the same trick: today's
 *   check-in is skipped (moved to tomorrow) unless the student would still be
 *   behind at that time with the cups logged so far. Every logged cup re-runs
 *   the schedule, so a check-in only fires if they haven't caught up.
 */
import { CHECK_IN_ID_PREFIX, IntervalMinutes, MAX_DAILY_SLOTS, REMINDER_ID_PREFIX } from '../config';
import { checkInMinutes, expectedCupsByNow, paceStatus } from '../domain/pace';
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
  /** Send "you're behind on water" check-ins (default off when omitted). */
  checkIns?: boolean;
}

/** What's happened today, which decides which of today's notifications still make sense. */
export interface TodayState {
  cups: number;
  goal: number;
  /** Reminders stay quiet until this moment (pause, goal reached, too much water). */
  quietUntil: number | null;
}

export type PlannedTrigger =
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'once'; at: number };

export interface PlannedReminder {
  /** Stable per time of day, e.g. "hydrate-0915" or "hydrate-checkin-1500". */
  id: string;
  kind: 'reminder' | 'checkin';
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

export function checkInId(minute: number): string {
  const h = String(Math.floor(minute / 60)).padStart(2, '0');
  const m = String(minute % 60).padStart(2, '0');
  return `${CHECK_IN_ID_PREFIX}${h}${m}`;
}

export function isPaused(settings: Pick<ReminderSettings, 'pausedUntil'>, now: number): boolean {
  return settings.pausedUntil != null && settings.pausedUntil > now;
}

export function buildSchedule(settings: ReminderSettings, now: number, today?: TodayState): PlannedReminder[] {
  if (!settings.enabled) return [];

  const { activeStartMin, activeEndMin, intervalMinutes } = clampWindow(
    settings.activeStartMin,
    settings.activeEndMin,
    settings.intervalMinutes,
  );
  const quietUntil = today ? today.quietUntil : settings.pausedUntil;
  const quiet = quietUntil != null && quietUntil > now;
  const daily = (minute: number): PlannedTrigger => ({ kind: 'daily', hour: Math.floor(minute / 60), minute: minute % 60 });

  const reminders: PlannedReminder[] = slotMinutes(activeStartMin, activeEndMin, intervalMinutes).map((minute, slotIndex) => {
    const base = { id: reminderId(minute), kind: 'reminder' as const, minuteOfDay: minute, slotIndex };
    if (quiet && nextOccurrence(minute, now) < quietUntil!) {
      // Skip occurrences inside the quiet time; fire once at the first one after it.
      return { ...base, trigger: { kind: 'once', at: nextOccurrence(minute, quietUntil!, true) } };
    }
    return { ...base, trigger: daily(minute) };
  });

  if (!settings.checkIns || !today) return reminders;

  const window = { activeStartMin, activeEndMin };
  const goalMet = today.cups >= today.goal;
  const checkIns: PlannedReminder[] = checkInMinutes(window).map((minute, i) => {
    const base = { id: checkInId(minute), kind: 'checkin' as const, minuteOfDay: minute, slotIndex: i };
    const todayAt = atMinuteOfDay(new Date(now), minute).getTime();
    const skipToday =
      todayAt <= now ||
      goalMet ||
      (quietUntil != null && quietUntil > todayAt) ||
      paceStatus(today.cups, expectedCupsByNow(today.goal, window, todayAt)) === 'onTrack';
    if (skipToday) {
      // Next chance is tomorrow (or the first time after the quiet period).
      const after = Math.max(todayAt, (quietUntil ?? 0) - 1);
      return { ...base, trigger: { kind: 'once', at: nextOccurrence(minute, after) } };
    }
    return { ...base, trigger: daily(minute) };
  });

  return [...reminders, ...checkIns];
}

/** When the next reminder will fire, or null if none are scheduled. */
export function nextReminderAt(plan: PlannedReminder[], now: number): number | null {
  let best: number | null = null;
  for (const r of plan) {
    if (r.kind !== 'reminder') continue;
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
