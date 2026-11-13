/**
 * Everything about "how is today going?" in one place: cups so far, pace,
 * drinking-too-much checks, ring color and whether reminders should be quiet.
 * Pure; used by the Today screen, the reminder scheduler and the safety watcher.
 */
import { ActiveWindow, PaceStatus, expectedCupsByNow, paceStatus } from './pace';
import {
  IntakeAssessment,
  RingStatus,
  cupsInLast,
  dailyNeed,
  intakeLevel,
  reminderQuietUntil,
  ringStatus,
} from './hydrationSafety';
import { DrinkEntry, countsByDay } from './streaks';
import { dateKey } from './time';
import { CalculatorInput } from './waterCalculator';

export interface TodayInputs {
  entries: DrinkEntry[];
  goal: number;
  calculator: CalculatorInput | null;
  window: ActiveWindow;
  pausedUntil: number | null;
  afterGoal: 'keep' | 'stop';
}

export interface TodayAssessment {
  cups: number;
  goal: number;
  goalMet: boolean;
  expected: number;
  pace: PaceStatus;
  need: number;
  intake: IntakeAssessment;
  ring: RingStatus;
  lastCupAt: number | null;
  quietUntil: number | null;
}

export function assessToday(input: TodayInputs, now: number): TodayAssessment {
  const today = dateKey(now);
  const cups = countsByDay(input.entries)[today] ?? 0;
  const goalMet = cups >= input.goal;
  const expected = expectedCupsByNow(input.goal, input.window, now);
  const pace = paceStatus(cups, expected);
  const need = dailyNeed(input.goal, input.calculator);
  const intake = intakeLevel(cups, need, cupsInLast(input.entries, now));
  let lastCupAt: number | null = null;
  for (const e of input.entries) {
    if (e.deletedAt == null && e.loggedAt <= now && (lastCupAt === null || e.loggedAt > lastCupAt)) lastCupAt = e.loggedAt;
  }
  const quietUntil = reminderQuietUntil(
    { window: input.window, pausedUntil: input.pausedUntil, afterGoal: input.afterGoal, goalMet, intake, lastCupAt },
    now,
  );
  return {
    cups,
    goal: input.goal,
    goalMet,
    expected,
    pace,
    need,
    intake,
    ring: ringStatus(pace, intake.level, goalMet),
    lastCupAt,
    quietUntil,
  };
}
