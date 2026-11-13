import { MAX_DAILY_SLOTS, normalizeInterval, INTERVAL_CHOICES } from '../../config';
import {
  ReminderSettings,
  buildSchedule,
  clampWindow,
  maxWindowMinutes,
  nextReminderAt,
  pauseForHours,
  pauseUntilTomorrow,
  planSignature,
  reminderId,
} from '../buildSchedule';

// Tests run with TZ=America/Los_Angeles (see package.json).
const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const NOW = at(2026, 10, 14, 12, 7); // Wed Oct 14 2026, 12:07 PM

const base: ReminderSettings = {
  enabled: true,
  intervalMinutes: 60,
  activeStartMin: 9 * 60,
  activeEndMin: 21 * 60,
  pausedUntil: null,
};

const hm = (h: number, m = 0) => h * 60 + m;

describe('buildSchedule', () => {
  it('returns nothing when disabled', () => {
    expect(buildSchedule({ ...base, enabled: false }, NOW)).toEqual([]);
  });

  it('creates one daily trigger per hour, ends inclusive', () => {
    const plan = buildSchedule(base, NOW);
    expect(plan).toHaveLength(13); // 9:00 … 21:00
    expect(plan[0]).toEqual({
      id: 'hydrate-0900',
      kind: 'reminder',
      minuteOfDay: hm(9),
      slotIndex: 0,
      trigger: { kind: 'daily', hour: 9, minute: 0 },
    });
    expect(plan[12].trigger).toEqual({ kind: 'daily', hour: 21, minute: 0 });
    expect(plan.every((r) => r.trigger.kind === 'daily')).toBe(true);
  });

  it.each([
    [15, 49],
    [30, 25],
    [60, 13],
  ] as const)('interval %i min over 9:00–21:00 gives %i slots', (interval, count) => {
    const plan = buildSchedule({ ...base, intervalMinutes: interval }, NOW);
    expect(plan).toHaveLength(count);
    const mins = plan.map((r) => r.minuteOfDay);
    for (let i = 1; i < mins.length; i++) expect(mins[i] - mins[i - 1]).toBe(interval);
  });

  it('does not land past the end time when the window is not a multiple of the interval', () => {
    const plan = buildSchedule({ ...base, activeEndMin: hm(10, 50) }, NOW);
    expect(plan.map((r) => r.id)).toEqual(['hydrate-0900', 'hydrate-1000']);
  });

  it('supports windows that cross midnight', () => {
    const plan = buildSchedule({ ...base, activeStartMin: hm(22), activeEndMin: hm(1) }, NOW);
    expect(plan.map((r) => r.minuteOfDay)).toEqual([hm(22), hm(23), hm(0), hm(1)]);
    expect(plan[2].trigger).toEqual({ kind: 'daily', hour: 0, minute: 0 });
  });

  it('never exceeds the iOS slot cap, even with an oversized stored window', () => {
    const plan = buildSchedule(
      { ...base, intervalMinutes: 15, activeStartMin: hm(6), activeEndMin: hm(23, 59) },
      NOW,
    );
    expect(plan.length).toBeLessThanOrEqual(MAX_DAILY_SLOTS);
    expect(plan).toHaveLength(MAX_DAILY_SLOTS);
    expect(plan[plan.length - 1].minuteOfDay).toBe(hm(20, 15)); // 6:00 + 14 h 15 m
  });

  it('gives every slot a unique id', () => {
    const plan = buildSchedule({ ...base, intervalMinutes: 15, activeStartMin: hm(8), activeEndMin: hm(23) }, NOW);
    expect(new Set(plan.map((r) => r.id)).size).toBe(plan.length);
  });

  describe('pausing', () => {
    it('ignores a pause that already ended', () => {
      const plan = buildSchedule({ ...base, pausedUntil: NOW - 1000 }, NOW);
      expect(plan.every((r) => r.trigger.kind === 'daily')).toBe(true);
    });

    it('pause for 1 hour moves only the slot inside the pause to tomorrow', () => {
      const plan = buildSchedule({ ...base, pausedUntil: pauseForHours(NOW, 1) }, NOW); // until 1:07 PM
      const once = plan.filter((r) => r.trigger.kind === 'once');
      expect(once.map((r) => r.id)).toEqual(['hydrate-1300']);
      expect(once[0].trigger).toEqual({ kind: 'once', at: at(2026, 10, 15, 13) });
      expect(plan.filter((r) => r.trigger.kind === 'daily')).toHaveLength(12);
    });

    it('pause for 2 hours at 15-min interval skips 8 reminders', () => {
      const plan = buildSchedule({ ...base, intervalMinutes: 15, pausedUntil: pauseForHours(NOW, 2) }, NOW);
      const once = plan.filter((r) => r.trigger.kind === 'once');
      // 12:15 … 14:00 fall inside 12:07–14:07
      expect(once.map((r) => r.minuteOfDay)).toEqual([
        hm(12, 15), hm(12, 30), hm(12, 45), hm(13), hm(13, 15), hm(13, 30), hm(13, 45), hm(14),
      ]);
      for (const r of once) {
        expect(r.trigger).toEqual({ kind: 'once', at: at(2026, 10, 15, Math.floor(r.minuteOfDay / 60), r.minuteOfDay % 60) });
      }
    });

    it('rest of today: remaining slots fire once tomorrow, earlier slots stay daily', () => {
      const pausedUntil = pauseUntilTomorrow(NOW, base.activeStartMin);
      expect(pausedUntil).toBe(at(2026, 10, 15, 9));
      const plan = buildSchedule({ ...base, pausedUntil }, NOW);
      const once = plan.filter((r) => r.trigger.kind === 'once');
      expect(once.map((r) => r.minuteOfDay)).toEqual([13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => hm(h)));
      // Tomorrow's 9:00 is exactly when the pause ends, so it is not paused.
      const nine = plan.find((r) => r.id === 'hydrate-0900')!;
      expect(nine.trigger.kind).toBe('daily');
      expect(nextReminderAt(plan, NOW)).toBe(at(2026, 10, 15, 9));
    });

    it('handles a pause spanning midnight in a window that crosses midnight', () => {
      const now = at(2026, 10, 14, 23, 30);
      const settings: ReminderSettings = { ...base, activeStartMin: hm(22), activeEndMin: hm(2), pausedUntil: at(2026, 10, 15, 1, 15) };
      const plan = buildSchedule(settings, now);
      const byId = Object.fromEntries(plan.map((r) => [r.id, r.trigger]));
      expect(byId['hydrate-2200']).toEqual({ kind: 'daily', hour: 22, minute: 0 });
      expect(byId['hydrate-2300']).toEqual({ kind: 'daily', hour: 23, minute: 0 });
      expect(byId['hydrate-0000']).toEqual({ kind: 'once', at: at(2026, 10, 16, 0) });
      expect(byId['hydrate-0100']).toEqual({ kind: 'once', at: at(2026, 10, 16, 1) });
      expect(byId['hydrate-0200']).toEqual({ kind: 'daily', hour: 2, minute: 0 });
    });

    it('keeps the plan within the cap while paused', () => {
      const plan = buildSchedule(
        { ...base, intervalMinutes: 15, activeStartMin: hm(8), activeEndMin: hm(23), pausedUntil: pauseUntilTomorrow(NOW, hm(8)) },
        NOW,
      );
      expect(plan.length).toBeLessThanOrEqual(MAX_DAILY_SLOTS);
    });
  });

  describe('daylight saving time (America/Los_Angeles)', () => {
    it('one-time triggers keep the local wall-clock time across the fall-back change', () => {
      // DST ends Sun Nov 1 2026 at 2:00 AM. Pause from Sat 8 PM until Sun 10 AM.
      const now = at(2026, 10, 31, 20, 30);
      const plan = buildSchedule({ ...base, pausedUntil: at(2026, 11, 1, 10) }, now);
      const nine = plan.find((r) => r.id === 'hydrate-0900')!;
      expect(nine.trigger).toEqual({ kind: 'once', at: at(2026, 11, 2, 9) });
      expect(new Date((nine.trigger as { at: number }).at).getHours()).toBe(9);
      const ninePm = plan.find((r) => r.id === 'hydrate-2100')!;
      expect(ninePm.trigger).toEqual({ kind: 'once', at: at(2026, 11, 1, 21) });
      expect(new Date((ninePm.trigger as { at: number }).at).getHours()).toBe(21);
    });

    it('next reminder is correct the morning after spring-forward', () => {
      // DST starts Sun Mar 8 2026 at 2:00 AM.
      const now = at(2026, 3, 8, 1, 30);
      const plan = buildSchedule(base, now);
      const next = nextReminderAt(plan, now)!;
      expect(new Date(next).getHours()).toBe(9);
      expect(new Date(next).getDate()).toBe(8);
    });
  });
});

describe('nextReminderAt', () => {
  it('finds the next daily slot', () => {
    expect(nextReminderAt(buildSchedule(base, NOW), NOW)).toBe(at(2026, 10, 14, 13));
  });

  it('wraps to tomorrow after the window closes', () => {
    const late = at(2026, 10, 14, 21, 30);
    expect(nextReminderAt(buildSchedule(base, late), late)).toBe(at(2026, 10, 15, 9));
  });

  it('returns null with no reminders', () => {
    expect(nextReminderAt([], NOW)).toBeNull();
  });
});

describe('planSignature', () => {
  it('is stable for the same settings and changes when the plan changes', () => {
    expect(planSignature(buildSchedule(base, NOW))).toBe(planSignature(buildSchedule(base, NOW + 60_000)));
    expect(planSignature(buildSchedule(base, NOW))).not.toBe(
      planSignature(buildSchedule({ ...base, pausedUntil: pauseForHours(NOW, 1) }, NOW)),
    );
  });
});

describe('clampWindow', () => {
  it('leaves valid windows alone', () => {
    expect(clampWindow(hm(9), hm(21), 15)).toEqual({ activeStartMin: hm(9), activeEndMin: hm(21), intervalMinutes: 15, clamped: false });
  });

  it('caps a 15-minute window at 14 h 15 m (iOS notification budget)', () => {
    expect(maxWindowMinutes(15)).toBe(14 * 60 + 15);
    expect(clampWindow(hm(7), hm(23, 30), 15)).toMatchObject({ activeEndMin: hm(21, 15), clamped: true });
  });

  it('never needs clamping at 1 hour or longer', () => {
    expect(clampWindow(hm(0), hm(23), 60).clamped).toBe(false);
    expect(clampWindow(hm(6), hm(23), 180).clamped).toBe(false);
  });

  it('allows up to 23 hours at hourly reminders', () => {
    expect(clampWindow(hm(0), hm(23), 60).clamped).toBe(false);
  });

  it('fixes an empty window', () => {
    expect(clampWindow(hm(9), hm(9), 30)).toMatchObject({ activeEndMin: hm(10), clamped: true });
  });
});

describe('reminderId', () => {
  it('zero-pads hours and minutes', () => {
    expect(reminderId(hm(7, 5))).toBe('hydrate-0705');
    expect(reminderId(hm(23, 45))).toBe('hydrate-2345');
  });
});

describe('any interval from 15 minutes to 3 hours', () => {
  it.each([
    [45, [hm(9), hm(9, 45), hm(10, 30)]],
    [90, [hm(9), hm(10, 30), hm(12)]],
    [180, [hm(9), hm(12), hm(15), hm(18), hm(21)]],
  ] as const)('%i-minute interval', (interval, firstSlots) => {
    const plan = buildSchedule({ ...base, intervalMinutes: interval }, NOW);
    expect(plan.slice(0, firstSlots.length).map((r) => r.minuteOfDay)).toEqual(firstSlots);
  });

  it('rounds and clamps intervals to the wheel', () => {
    expect(normalizeInterval(5)).toBe(15);
    expect(normalizeInterval(50)).toBe(45);
    expect(normalizeInterval(500)).toBe(180);
    expect(INTERVAL_CHOICES[0]).toBe(15);
    expect(INTERVAL_CHOICES[INTERVAL_CHOICES.length - 1]).toBe(180);
    expect(INTERVAL_CHOICES).toHaveLength(12);
  });
});

describe('today-aware scheduling', () => {
  const withCheckIns = { ...base, checkIns: true };
  const today = (cups: number, quietUntil: number | null = null) => ({ cups, goal: 8, quietUntil });
  const checkins = (plan: ReturnType<typeof buildSchedule>) => plan.filter((r) => r.kind === 'checkin');
  const morning = at(2026, 10, 14, 10); // 10 AM; check-ins at 3 PM and 6 PM for 9 AM–9 PM

  it('adds catch-up check-ins halfway and ¾ through the day', () => {
    const plan = buildSchedule(withCheckIns, morning, today(0));
    expect(checkins(plan).map((r) => [r.id, r.minuteOfDay])).toEqual([
      ['hydrate-checkin-1500', hm(15)],
      ['hydrate-checkin-1800', hm(18)],
    ]);
    // Behind with no cups: both fire today (daily triggers).
    expect(checkins(plan).every((r) => r.trigger.kind === 'daily')).toBe(true);
  });

  it('skips a check-in today once the student would be on pace for it', () => {
    // 3 PM expects 4 cups (on track from 3); 6 PM expects 6 (on track from 4.5).
    const plan = buildSchedule(withCheckIns, morning, today(4));
    const [three, six] = checkins(plan);
    expect(three.trigger).toEqual({ kind: 'once', at: at(2026, 10, 15, 15) });
    expect(six.trigger).toEqual({ kind: 'daily', hour: 18, minute: 0 });
  });

  it('skips check-ins that already passed, or once the goal is met', () => {
    const evening = at(2026, 10, 14, 16);
    const [three] = checkins(buildSchedule(withCheckIns, evening, today(0)));
    expect(three.trigger).toEqual({ kind: 'once', at: at(2026, 10, 15, 15) });
    const met = checkins(buildSchedule(withCheckIns, morning, today(8)));
    expect(met.every((r) => r.trigger.kind === 'once')).toBe(true);
  });

  it('has no check-ins when turned off', () => {
    expect(checkins(buildSchedule(base, morning, today(0)))).toEqual([]);
  });

  it('goal reached with "stop until tomorrow": remaining reminders and check-ins move to tomorrow', () => {
    const quietUntil = at(2026, 10, 15, 9);
    const plan = buildSchedule(withCheckIns, at(2026, 10, 14, 14, 30), today(8, quietUntil));
    const reminders = plan.filter((r) => r.kind === 'reminder');
    expect(reminders.filter((r) => r.trigger.kind === 'once').map((r) => r.minuteOfDay)).toEqual(
      [15, 16, 17, 18, 19, 20, 21].map((h) => hm(h)),
    );
    expect(reminders.find((r) => r.id === 'hydrate-0900')!.trigger.kind).toBe('daily');
    expect(checkins(plan).map((r) => r.trigger)).toEqual([
      { kind: 'once', at: at(2026, 10, 15, 15) },
      { kind: 'once', at: at(2026, 10, 15, 18) },
    ]);
  });

  it('drinking fast: reminders pause for an hour after the last cup', () => {
    const now = at(2026, 10, 14, 12, 5);
    const plan = buildSchedule(withCheckIns, now, today(5, at(2026, 10, 14, 13, 5)));
    const one = plan.find((r) => r.id === 'hydrate-1300')!;
    expect(one.trigger).toEqual({ kind: 'once', at: at(2026, 10, 15, 13) });
    expect(plan.find((r) => r.id === 'hydrate-1400')!.trigger.kind).toBe('daily');
  });

  it('the next-reminder label ignores check-ins', () => {
    const plan = buildSchedule(withCheckIns, at(2026, 10, 14, 14, 30), today(0));
    expect(nextReminderAt(plan, at(2026, 10, 14, 14, 30))).toBe(at(2026, 10, 14, 15));
  });

  it('stays within the iOS notification budget with check-ins', () => {
    const plan = buildSchedule(
      { ...withCheckIns, intervalMinutes: 15, activeStartMin: hm(6), activeEndMin: hm(23) },
      morning,
      today(0),
    );
    expect(plan.length).toBeLessThanOrEqual(60);
  });
});
