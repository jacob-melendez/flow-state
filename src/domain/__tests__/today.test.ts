import { DrinkEntry } from '../streaks';
import { assessToday } from '../today';

const at = (h: number, m = 0, d = 14) => new Date(2026, 10, d, h, m).getTime();
const cupsAt = (...times: number[]): DrinkEntry[] =>
  times.map((t, i) => ({ id: `e${i}`, loggedAt: t, cups: 1, updatedAt: t, deletedAt: null }));
const base = {
  goal: 8,
  calculator: null,
  window: { activeStartMin: 9 * 60, activeEndMin: 21 * 60 },
  pausedUntil: null,
  afterGoal: 'keep' as const,
};

describe('assessToday', () => {
  it('is green and quiet-free when on pace', () => {
    const t = assessToday({ ...base, entries: cupsAt(at(9), at(10), at(11), at(12)) }, at(15));
    expect(t).toMatchObject({ cups: 4, goalMet: false, pace: 'onTrack', ring: 'good', quietUntil: null });
  });

  it('turns yellow, then red, when falling behind', () => {
    expect(assessToday({ ...base, entries: cupsAt(at(9), at(10)) }, at(15)).ring).toBe('caution');
    expect(assessToday({ ...base, entries: [] }, at(15)).ring).toBe('alert');
  });

  it('stays green all day once the goal is met, and quiets reminders if asked', () => {
    const eight = cupsAt(...[9, 10, 11, 12, 13, 14, 15, 16].map((h) => at(h)));
    expect(assessToday({ ...base, entries: eight }, at(17)).ring).toBe('good');
    expect(assessToday({ ...base, entries: eight, afterGoal: 'stop' }, at(17)).quietUntil).toBe(at(9, 0, 15));
  });

  it('warns and goes quiet after drinking a lot quickly', () => {
    const fast = cupsAt(at(12), at(12, 10), at(12, 20), at(12, 30));
    const t = assessToday({ ...base, entries: fast }, at(12, 40));
    expect(t.intake).toEqual({ level: 'warning', reason: 'fast' });
    expect(t.ring).toBe('alert');
    expect(t.quietUntil).toBe(at(13, 30));
  });

  it('cautions at 1.5× the daily need', () => {
    const twelve = cupsAt(...Array.from({ length: 12 }, (_, i) => at(8 + i)));
    expect(assessToday({ ...base, entries: twelve }, at(20, 30)).ring).toBe('caution');
  });
});
