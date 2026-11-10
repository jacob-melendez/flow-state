/**
 * Which past days to include in anonymous impact stats. Pure; no I/O.
 *
 * Only completed days (yesterday and earlier) on which at least one cup was
 * logged are reported, at most `lookbackDays` back, and never a day that was
 * already reported.
 */
import { goalForDay } from './streaks';
import { addDays, dateKey, parseDateKey } from './time';

export interface DayReport {
  date: string;
  cups: number;
  goal: number;
}

export function daysToReport(
  counts: Record<string, number>,
  goalByDay: Record<string, number>,
  currentGoal: number,
  reportedThrough: string | null,
  now: number,
  lookbackDays: number,
): DayReport[] {
  const today = parseDateKey(dateKey(now));
  const earliestAllowed = addDays(today, -lookbackDays);
  const afterReported = reportedThrough ? addDays(parseDateKey(reportedThrough), 1) : earliestAllowed;
  let day = afterReported > earliestAllowed ? afterReported : earliestAllowed;

  const reports: DayReport[] = [];
  while (day < today) {
    const key = dateKey(day);
    const cups = counts[key] ?? 0;
    if (cups > 0) reports.push({ date: key, cups, goal: goalForDay(key, goalByDay, currentGoal) });
    day = addDays(day, 1);
  }
  return reports;
}

/** The last completed day (yesterday), which becomes the new "reported through" mark. */
export function lastCompletedDay(now: number): string {
  return dateKey(addDays(parseDateKey(dateKey(now)), -1));
}
