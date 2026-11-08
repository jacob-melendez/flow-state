/**
 * Pure intake/streak calculations over the drink log.
 */
import { dateKey, previousDateKey } from './time';

export interface DrinkEntry {
  /** UUID, so entries can be synced/merged across devices in the future. */
  id: string;
  /** Epoch ms when the cup was logged. */
  loggedAt: number;
  /** Number of cups (always 1 today; kept for future serving sizes). */
  cups: number;
}

export interface DaySummary {
  key: string;
  count: number;
  goal: number;
  met: boolean;
}

/** Total cups per local day. */
export function countsByDay(entries: DrinkEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    const k = dateKey(e.loggedAt);
    counts[k] = (counts[k] ?? 0) + e.cups;
  }
  return counts;
}

/** The goal for a day: the goal recorded that day, else the current goal. */
export function goalForDay(key: string, goalByDay: Record<string, number>, currentGoal: number): number {
  return goalByDay[key] ?? currentGoal;
}

export function summarizeDay(
  key: string,
  counts: Record<string, number>,
  goalByDay: Record<string, number>,
  currentGoal: number,
): DaySummary {
  const count = counts[key] ?? 0;
  const goal = goalForDay(key, goalByDay, currentGoal);
  return { key, count, goal, met: count >= goal };
}

/**
 * Consecutive days the goal was met, ending today. If today's goal isn't met
 * yet, the streak still counts through yesterday (today isn't over).
 */
export function currentStreak(
  counts: Record<string, number>,
  goalByDay: Record<string, number>,
  currentGoal: number,
  now: number,
): number {
  let key = dateKey(now);
  if (!summarizeDay(key, counts, goalByDay, currentGoal).met) key = previousDateKey(key);
  let streak = 0;
  while (summarizeDay(key, counts, goalByDay, currentGoal).met) {
    streak++;
    key = previousDateKey(key);
  }
  return streak;
}

/** Longest run of consecutive goal-met days ever. */
export function bestStreak(
  counts: Record<string, number>,
  goalByDay: Record<string, number>,
  currentGoal: number,
): number {
  const metDays = Object.keys(counts)
    .filter((k) => summarizeDay(k, counts, goalByDay, currentGoal).met)
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of metDays) {
    run = prev !== null && previousDateKey(k) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

/** Summaries for the last `n` days, oldest first, ending today. */
export function lastNDays(
  n: number,
  counts: Record<string, number>,
  goalByDay: Record<string, number>,
  currentGoal: number,
  now: number,
): DaySummary[] {
  const days: DaySummary[] = [];
  let key = dateKey(now);
  for (let i = 0; i < n; i++) {
    days.unshift(summarizeDay(key, counts, goalByDay, currentGoal));
    key = previousDateKey(key);
  }
  return days;
}
