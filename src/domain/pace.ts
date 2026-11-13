/**
 * Pace: is the student on track for this point in their day? Pure; no I/O.
 *
 * The day's goal is spread evenly across the active hours (e.g. 9 AM–9 PM).
 * Cups are counted per calendar day, so "expected by now" is 0 before today's
 * window opens and the full goal once it has closed.
 */
import { addDays, atMinuteOfDay, normalizeMinuteOfDay, windowLength } from './time';

export interface ActiveWindow {
  activeStartMin: number;
  activeEndMin: number;
}

export type PaceStatus = 'onTrack' | 'behind' | 'farBehind';

/** Tunable thresholds (fractions of the cups expected by now). */
export const PACE = {
  /** At least this share of the expected cups counts as on track. */
  onTrackRatio: 0.75,
  /** Below this share (and at least `farBehindMinShortfall` cups short) is far behind. */
  farBehindRatio: 0.4,
  /** Being less than this many cups short is always on track. */
  graceCups: 1,
  farBehindMinShortfall: 2,
};

/** Fraction of today's active window that has passed at `now` (0–1). */
export function windowProgress(window: ActiveWindow, now: number): number {
  const start = atMinuteOfDay(new Date(now), window.activeStartMin).getTime();
  const lengthMs = Math.max(1, windowLength(window.activeStartMin, window.activeEndMin)) * 60_000;
  if (now <= start) return 0;
  return Math.min(1, (now - start) / lengthMs);
}

/** Cups the student would have had by `now` drinking evenly through their active hours. */
export function expectedCupsByNow(goal: number, window: ActiveWindow, now: number): number {
  return goal * windowProgress(window, now);
}

export function paceStatus(cups: number, expected: number): PaceStatus {
  if (expected < PACE.graceCups) return 'onTrack';
  const shortfall = expected - cups;
  if (shortfall < PACE.graceCups) return 'onTrack';
  const ratio = cups / expected;
  if (ratio >= PACE.onTrackRatio) return 'onTrack';
  if (ratio < PACE.farBehindRatio && shortfall >= PACE.farBehindMinShortfall) return 'farBehind';
  return 'behind';
}

/** Times of day for "you're behind" check-ins: halfway and ¾ through the active hours (15-min steps). */
export function checkInMinutes(window: ActiveWindow): number[] {
  const length = windowLength(window.activeStartMin, window.activeEndMin);
  const at = (fraction: number) => normalizeMinuteOfDay(window.activeStartMin + Math.round((length * fraction) / 15) * 15);
  return [...new Set([at(0.5), at(0.75)])];
}

/** The moment today's check-in at `minute` happens (or happened). */
export function checkInTimeToday(minute: number, now: number): number {
  return atMinuteOfDay(new Date(now), minute).getTime();
}

/** When tomorrow's active window opens (used for "quiet for the rest of today"). */
export function tomorrowWindowStart(window: ActiveWindow, now: number): number {
  return atMinuteOfDay(addDays(new Date(now), 1), window.activeStartMin).getTime();
}
