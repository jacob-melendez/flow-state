import { DrinkEntry, bestStreak, countsByDay, currentStreak, lastNDays } from '../streaks';
import { dateKey, slotMinutes, slotCount, formatMinuteOfDay, nextOccurrence } from '../time';

const at = (y: number, mo: number, d: number, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

let n = 0;
const cups = (time: number, count: number): DrinkEntry[] =>
  Array.from({ length: count }, () => ({ id: `e${n++}`, loggedAt: time, cups: 1, updatedAt: time, deletedAt: null }));

describe('countsByDay', () => {
  it('groups by local day, including late-night entries', () => {
    const counts = countsByDay([...cups(at(2026, 10, 14, 23, 59), 2), ...cups(at(2026, 10, 15, 0, 1), 1)]);
    expect(counts).toEqual({ '2026-10-14': 2, '2026-10-15': 1 });
  });

  it('ignores deleted entries', () => {
    const [kept, removed] = cups(at(2026, 10, 14), 2);
    expect(countsByDay([kept, { ...removed, deletedAt: at(2026, 10, 14, 13) }])).toEqual({ '2026-10-14': 1 });
  });
});

describe('streaks', () => {
  const now = at(2026, 10, 14, 15);
  const counts = countsByDay([
    ...cups(at(2026, 10, 10), 8), // met
    ...cups(at(2026, 10, 11), 8), // met
    ...cups(at(2026, 10, 12), 3), // missed
    ...cups(at(2026, 10, 13), 8), // met
    ...cups(at(2026, 10, 14), 2), // today, in progress
  ]);

  it("counts through yesterday while today's goal isn't met yet", () => {
    expect(currentStreak(counts, {}, 8, now)).toBe(1);
  });

  it('includes today once the goal is met', () => {
    const more = { ...counts, '2026-10-14': 8 };
    expect(currentStreak(more, {}, 8, now)).toBe(2);
  });

  it('is zero when yesterday was missed', () => {
    expect(currentStreak({ '2026-10-12': 8 }, {}, 8, now)).toBe(0);
  });

  it('uses the goal recorded on each day, so changing the goal keeps history', () => {
    // Goal was 3 on Oct 12, raised to 8 afterwards.
    const goalByDay = { '2026-10-12': 3 };
    expect(currentStreak(counts, goalByDay, 8, now)).toBe(4); // 10, 11, 12, 13
  });

  it('finds the best streak', () => {
    expect(bestStreak(counts, {}, 8)).toBe(2);
    expect(bestStreak({}, {}, 8)).toBe(0);
  });

  it('summarizes the last 7 days oldest first', () => {
    const days = lastNDays(7, counts, {}, 8, now);
    expect(days.map((d) => d.key)).toEqual([
      '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14',
    ]);
    expect(days.map((d) => d.count)).toEqual([0, 0, 8, 8, 3, 8, 2]);
    expect(days[6]).toEqual({ key: '2026-10-14', count: 2, goal: 8, met: false });
  });

  it('counts streaks across the fall-back DST change', () => {
    const c = { '2026-10-31': 8, '2026-11-01': 8, '2026-11-02': 8 };
    expect(currentStreak(c, {}, 8, at(2026, 11, 2, 20))).toBe(3);
  });
});

describe('time helpers', () => {
  it('formats times of day', () => {
    expect(formatMinuteOfDay(0)).toBe('12:00 AM');
    expect(formatMinuteOfDay(9 * 60 + 5)).toBe('9:05 AM');
    expect(formatMinuteOfDay(12 * 60)).toBe('12:00 PM');
    expect(formatMinuteOfDay(21 * 60 + 30)).toBe('9:30 PM');
  });

  it('generates slots across midnight', () => {
    expect(slotMinutes(23 * 60, 30, 15)).toEqual([1380, 1395, 1410, 1425, 0, 15, 30]);
    expect(slotCount(23 * 60, 30, 15)).toBe(7);
  });

  it('nextOccurrence is strictly after by default and inclusive on request', () => {
    const t = at(2026, 10, 14, 9, 0);
    expect(nextOccurrence(9 * 60, t)).toBe(at(2026, 10, 15, 9, 0));
    expect(nextOccurrence(9 * 60, t, true)).toBe(t);
  });

  it('builds local date keys', () => {
    expect(dateKey(at(2026, 1, 5))).toBe('2026-01-05');
  });
});
