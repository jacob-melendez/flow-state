import { TodayAssessment, assessToday } from '../domain/today';
import { useLog } from './logStore';
import { useSettings } from './settingsStore';

/** Today's assessment from the current on-device data. */
export function currentToday(now = Date.now()): TodayAssessment {
  const s = useSettings.getState();
  const log = useLog.getState();
  return assessToday(
    {
      entries: log.entries,
      goal: s.dailyGoal,
      calculator: s.calculatorProfile,
      window: { activeStartMin: s.activeStartMin, activeEndMin: s.activeEndMin },
      pausedUntil: s.pausedUntil,
      afterGoal: s.afterGoal,
    },
    now,
  );
}
