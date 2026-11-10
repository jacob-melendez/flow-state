import { daysToReport, lastCompletedDay } from '../impact';

const at = (y: number, mo: number, d: number, h = 12) => new Date(y, mo - 1, d, h).getTime();
const NOW = at(2026, 11, 12, 9); // Thu Nov 12 2026, 9 AM

describe('daysToReport', () => {
  const counts = {
    '2026-11-03': 4, // more than 7 days ago
    '2026-11-06': 8,
    '2026-11-09': 3,
    '2026-11-11': 9, // yesterday
    '2026-11-12': 2, // today, not finished
  };

  it('reports completed days with cups in the last week, never today', () => {
    expect(daysToReport(counts, {}, 8, null, NOW, 7)).toEqual([
      { date: '2026-11-06', cups: 8, goal: 8 },
      { date: '2026-11-09', cups: 3, goal: 8 },
      { date: '2026-11-11', cups: 9, goal: 8 },
    ]);
  });

  it('skips days already reported', () => {
    expect(daysToReport(counts, {}, 8, '2026-11-09', NOW, 7).map((d) => d.date)).toEqual(['2026-11-11']);
    expect(daysToReport(counts, {}, 8, '2026-11-11', NOW, 7)).toEqual([]);
  });

  it("uses each day's recorded goal", () => {
    expect(daysToReport(counts, { '2026-11-09': 3 }, 8, '2026-11-08', NOW, 7)[0]).toEqual({ date: '2026-11-09', cups: 3, goal: 3 });
  });

  it('skips days with no cups', () => {
    expect(daysToReport({}, {}, 8, null, NOW, 7)).toEqual([]);
  });

  it('works across the fall-back DST change', () => {
    const now = at(2026, 11, 2, 9);
    expect(daysToReport({ '2026-10-31': 2, '2026-11-01': 5 }, {}, 8, null, now, 7).map((d) => d.date)).toEqual([
      '2026-10-31',
      '2026-11-01',
    ]);
  });
});

describe('lastCompletedDay', () => {
  it('is yesterday', () => {
    expect(lastCompletedDay(NOW)).toBe('2026-11-11');
    expect(lastCompletedDay(at(2026, 11, 1, 0))).toBe('2026-10-31');
  });
});
