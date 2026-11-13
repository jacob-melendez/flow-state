import { DrinkEntry } from '../streaks';
import { checkInMinutes, expectedCupsByNow, paceStatus, windowProgress } from '../pace';
import { cupsInLast, dailyNeed, intakeLevel, reminderQuietUntil, ringStatus, SAFETY } from '../hydrationSafety';
import { DEFAULT_CALCULATOR_INPUT } from '../waterCalculator';

const at = (h: number, m = 0, d = 14) => new Date(2026, 10, d, h, m).getTime();
const W = { activeStartMin: 9 * 60, activeEndMin: 21 * 60 }; // 9 AM–9 PM

describe('pace', () => {
  it('spreads the goal across the active hours', () => {
    expect(windowProgress(W, at(8))).toBe(0);
    expect(windowProgress(W, at(9))).toBe(0);
    expect(windowProgress(W, at(15))).toBeCloseTo(0.5);
    expect(windowProgress(W, at(22))).toBe(1);
    expect(expectedCupsByNow(8, W, at(12))).toBeCloseTo(2);
  });

  it('starts counting at the window start even when it crosses midnight', () => {
    const late = { activeStartMin: 20 * 60, activeEndMin: 60 }; // 8 PM–1 AM
    expect(windowProgress(late, at(19))).toBe(0);
    expect(windowProgress(late, at(22, 30))).toBeCloseTo(0.5);
    // After midnight the day's count has reset, so nothing is expected yet.
    expect(windowProgress(late, at(0, 30, 15))).toBe(0);
  });

  it('classifies pace', () => {
    expect(paceStatus(0, 0.5)).toBe('onTrack'); // too early to tell
    expect(paceStatus(3, 3.5)).toBe('onTrack'); // less than a cup short
    expect(paceStatus(3, 4)).toBe('onTrack'); // 75%
    expect(paceStatus(2, 4)).toBe('behind'); // 50%
    expect(paceStatus(1, 4)).toBe('farBehind'); // 25%, 3 cups short
    expect(paceStatus(0, 2.5)).toBe('farBehind');
    expect(paceStatus(0, 1.5)).toBe('behind'); // short, but not by 2 cups
    expect(paceStatus(10, 4)).toBe('onTrack'); // ahead
  });

  it('places check-ins halfway and three-quarters through the day', () => {
    expect(checkInMinutes(W)).toEqual([15 * 60, 18 * 60]);
    expect(checkInMinutes({ activeStartMin: 8 * 60, activeEndMin: 23 * 60 })).toEqual([15 * 60 + 30, 19 * 60 + 15]);
    expect(checkInMinutes({ activeStartMin: 22 * 60, activeEndMin: 2 * 60 })).toEqual([0, 60]);
  });
});

describe('hydration safety', () => {
  const entry = (time: number, cups = 1, deleted = false): DrinkEntry => ({
    id: String(time),
    loggedAt: time,
    cups,
    updatedAt: time,
    deletedAt: deleted ? time : null,
  });

  it('bases thresholds on the larger of the goal and the calculator estimate', () => {
    expect(dailyNeed(8, null)).toBe(8);
    const tall = { ...DEFAULT_CALCULATOR_INPUT, weight: 90, weightUnit: 'kg' as const, sex: 'male' as const };
    expect(dailyNeed(6, tall)).toBeGreaterThan(6);
    expect(dailyNeed(20, tall)).toBe(20);
  });

  it('counts recent cups, ignoring removed ones', () => {
    const now = at(12);
    expect(cupsInLast([entry(at(11, 30)), entry(at(11, 45)), entry(at(10)), entry(at(11, 50), 1, true)], now)).toBe(2);
  });

  it('flags drinking a lot in total or fast', () => {
    expect(intakeLevel(8, 8, 1)).toEqual({ level: 'ok', reason: null });
    expect(intakeLevel(12, 8, 1)).toEqual({ level: 'caution', reason: null });
    expect(intakeLevel(16, 8, 1)).toEqual({ level: 'warning', reason: 'total' });
    expect(intakeLevel(5, 8, SAFETY.fastCups)).toEqual({ level: 'warning', reason: 'fast' });
  });

  it('combines pace and safety into one ring color', () => {
    expect(ringStatus('onTrack', 'ok', false)).toBe('good');
    expect(ringStatus('behind', 'ok', false)).toBe('caution');
    expect(ringStatus('farBehind', 'ok', false)).toBe('alert');
    expect(ringStatus('farBehind', 'ok', true)).toBe('good'); // goal met wins over late-day pace
    expect(ringStatus('onTrack', 'caution', true)).toBe('caution');
    expect(ringStatus('onTrack', 'warning', true)).toBe('alert');
  });
});

describe('reminderQuietUntil', () => {
  const base = {
    window: W,
    pausedUntil: null,
    afterGoal: 'keep' as const,
    goalMet: false,
    intake: { level: 'ok' as const, reason: null },
    lastCupAt: null,
  };
  const now = at(14);
  const tomorrow9 = at(9, 0, 15);

  it('is not quiet by default', () => {
    expect(reminderQuietUntil(base, now)).toBeNull();
  });

  it('respects a manual pause', () => {
    expect(reminderQuietUntil({ ...base, pausedUntil: at(15) }, now)).toBe(at(15));
    expect(reminderQuietUntil({ ...base, pausedUntil: at(13) }, now)).toBeNull();
  });

  it('stops until tomorrow after the goal only if the student chose that', () => {
    expect(reminderQuietUntil({ ...base, goalMet: true }, now)).toBeNull();
    expect(reminderQuietUntil({ ...base, goalMet: true, afterGoal: 'stop' }, now)).toBe(tomorrow9);
  });

  it('goes quiet when drinking far too much', () => {
    expect(reminderQuietUntil({ ...base, intake: { level: 'warning', reason: 'total' } }, now)).toBe(tomorrow9);
    const fast = { ...base, intake: { level: 'warning' as const, reason: 'fast' as const }, lastCupAt: at(13, 50) };
    expect(reminderQuietUntil(fast, now)).toBe(at(14, 50));
  });

  it('uses the latest of several reasons', () => {
    expect(reminderQuietUntil({ ...base, pausedUntil: at(16), goalMet: true, afterGoal: 'stop' }, now)).toBe(tomorrow9);
  });
});
