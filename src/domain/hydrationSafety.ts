/**
 * Drinking too much: gentle "take a break" guidance. Pure; no I/O.
 *
 * Over-hydration is mainly a risk when a lot of water is drunk quickly (healthy
 * kidneys clear very roughly 0.8–1 L, about 4 cups, per hour) or far beyond
 * what the body needs. These are conservative app defaults, NOT medical
 * advice; the SENSA Health & Wellness team should review them.
 */
import { DrinkEntry } from './streaks';
import { CalculatorInput, estimateDailyWater } from './waterCalculator';
import { ActiveWindow, PaceStatus, tomorrowWindowStart } from './pace';

export const SAFETY = {
  /** Caution (yellow) at this multiple of the daily need. */
  cautionMultiplier: 1.5,
  /** Warning (red, notification) at this multiple of the daily need. */
  warningMultiplier: 2,
  /** Warning when this many cups are logged within `fastWindowMinutes`. */
  fastCups: 4,
  fastWindowMinutes: 60,
};

export type IntakeLevel = 'ok' | 'caution' | 'warning';
export type WarningReason = 'total' | 'fast';

export interface IntakeAssessment {
  level: IntakeLevel;
  /** Why it's a warning (null unless level is 'warning'). */
  reason: WarningReason | null;
}

/**
 * The daily amount the safety checks are based on: the larger of the goal and
 * the calculator's estimate, so choosing a low goal never triggers false alarms.
 */
export function dailyNeed(goal: number, calculator: CalculatorInput | null): number {
  const estimate = calculator ? estimateDailyWater(calculator)?.cups : undefined;
  return Math.max(goal, estimate ?? 0);
}

/** Cups logged in the last `minutes` (default: the fast-drinking window). */
export function cupsInLast(entries: DrinkEntry[], now: number, minutes = SAFETY.fastWindowMinutes): number {
  const since = now - minutes * 60_000;
  return entries.filter((e) => e.deletedAt == null && e.loggedAt > since && e.loggedAt <= now).reduce((n, e) => n + e.cups, 0);
}

export function intakeLevel(cupsToday: number, need: number, cupsLastHour: number): IntakeAssessment {
  if (cupsLastHour >= SAFETY.fastCups) return { level: 'warning', reason: 'fast' };
  if (need > 0 && cupsToday >= need * SAFETY.warningMultiplier) return { level: 'warning', reason: 'total' };
  if (need > 0 && cupsToday >= need * SAFETY.cautionMultiplier) return { level: 'caution', reason: null };
  return { level: 'ok', reason: null };
}

export type RingStatus = 'good' | 'caution' | 'alert';

/** One color for the progress ring, combining pace (too little) and safety (too much). */
export function ringStatus(pace: PaceStatus, intake: IntakeLevel, goalMet: boolean): RingStatus {
  if (intake === 'warning') return 'alert';
  if (intake === 'caution') return 'caution';
  if (goalMet) return 'good';
  if (pace === 'farBehind') return 'alert';
  if (pace === 'behind') return 'caution';
  return 'good';
}

export interface QuietInputs {
  window: ActiveWindow;
  pausedUntil: number | null;
  afterGoal: 'keep' | 'stop';
  goalMet: boolean;
  intake: IntakeAssessment;
  lastCupAt: number | null;
}

/**
 * Until when water reminders should stay quiet, or null:
 * - a pause the student chose;
 * - goal reached and they asked to stop until tomorrow;
 * - far too much water today (rest of today);
 * - drinking fast (an hour after the latest cup).
 */
export function reminderQuietUntil(q: QuietInputs, now: number): number | null {
  const candidates: number[] = [];
  if (q.pausedUntil != null && q.pausedUntil > now) candidates.push(q.pausedUntil);
  if (q.goalMet && q.afterGoal === 'stop') candidates.push(tomorrowWindowStart(q.window, now));
  if (q.intake.level === 'warning' && q.intake.reason === 'total') candidates.push(tomorrowWindowStart(q.window, now));
  if (q.intake.level === 'warning' && q.intake.reason === 'fast' && q.lastCupAt != null) {
    const until = q.lastCupAt + SAFETY.fastWindowMinutes * 60_000;
    if (until > now) candidates.push(until);
  }
  return candidates.length ? Math.max(...candidates) : null;
}
