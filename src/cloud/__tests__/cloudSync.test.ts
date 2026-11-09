import { DrinkEntry, countsByDay } from '../../domain/streaks';
import { EMPTY_LOG, LogData, migrateLog, useLog } from '../../state/logStore';
import { useSettings } from '../../state/settingsStore';
import { RemoteProfile, SyncBackend } from '../backend';
import { BATCH_SIZE, prepareLocalDataFor, replaceLocalDataWith, syncOnce } from '../cloudSync';
import { RemoteEntry, RemoteGoal, mergeRemoteEntries, nextCursor } from '../merge';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
let mockUuidCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => `00000000-0000-4000-8000-${String(++mockUuidCounter).padStart(12, '0')}`,
}));

// ---------------------------------------------------------------------------
// Fake server: same rules as supabase/migrations (newest wins, server-stamped
// synced_at with microsecond precision, per-user rows).
// ---------------------------------------------------------------------------
const toMicros = (iso: string) => {
  const m = iso.match(/^(.*T\d\d:\d\d:\d\d)(?:\.(\d+))?Z$/)!;
  const frac = (m[2] ?? '').padEnd(6, '0').slice(0, 6);
  return Date.parse(`${m[1]}Z`) * 1000 + Number(frac);
};

class FakeServer {
  entries = new Map<string, RemoteEntry & { user_id: string; synced_at: string }>();
  goals = new Map<string, RemoteGoal & { user_id: string; synced_at: string }>();
  profiles = new Map<string, RemoteProfile>();
  private micros = Date.parse('2026-11-10T20:00:00Z') * 1000;
  offline = false;
  calls = { fetchEntries: 0 };

  /** Server clock; many writes can land in the same millisecond. */
  stamp(): string {
    this.micros += 1;
    const ms = Math.floor(this.micros / 1000);
    const us = String(this.micros % 1000).padStart(3, '0');
    return new Date(ms).toISOString().replace('Z', `${us}Z`);
  }

  backend(): SyncBackend {
    const guard = () => {
      if (this.offline) throw new Error('Network request failed');
    };
    const since = <T extends { synced_at: string }>(rows: T[], cursor: string | null, limit: number): T[] =>
      rows
        .filter((r) => cursor === null || toMicros(r.synced_at) > toMicros(cursor))
        .sort((a, b) => toMicros(a.synced_at) - toMicros(b.synced_at))
        .slice(0, limit);
    return {
      upsertEntries: async (userId, rows) => {
        guard();
        for (const r of rows) {
          const old = this.entries.get(r.id);
          if (old && old.user_id !== userId) throw new Error('row-level security');
          if (old && Date.parse(r.updated_at) < Date.parse(old.updated_at)) continue;
          this.entries.set(r.id, { ...r, user_id: userId, synced_at: this.stamp() });
        }
      },
      upsertGoals: async (userId, rows) => {
        guard();
        for (const r of rows) {
          const key = `${userId}/${r.local_date}`;
          const old = this.goals.get(key);
          if (old && Date.parse(r.updated_at) < Date.parse(old.updated_at)) continue;
          this.goals.set(key, { ...r, user_id: userId, synced_at: this.stamp() });
        }
      },
      fetchEntries: async (cursor, limit) => {
        guard();
        this.calls.fetchEntries++;
        return since([...this.entries.values()].filter((r) => r.user_id === this.currentUser), cursor, limit).map(
          ({ user_id: _u, ...r }) => r,
        );
      },
      fetchGoals: async (cursor, limit) => {
        guard();
        return since([...this.goals.values()].filter((r) => r.user_id === this.currentUser), cursor, limit).map(
          ({ user_id: _u, ...r }) => r,
        );
      },
      getProfile: async (userId) => {
        guard();
        if (!this.profiles.has(userId)) {
          this.profiles.set(userId, { display_name: null, daily_goal: 8, daily_goal_updated_at: '1970-01-01T00:00:00Z', timezone: null });
        }
        return { ...this.profiles.get(userId)! };
      },
      updateProfile: async (userId, patch) => {
        guard();
        const p = this.profiles.get(userId)!;
        const next = { ...p, ...patch };
        if (Date.parse(next.daily_goal_updated_at) < Date.parse(p.daily_goal_updated_at)) {
          next.daily_goal = p.daily_goal;
          next.daily_goal_updated_at = p.daily_goal_updated_at;
        }
        this.profiles.set(userId, next);
      },
    };
  }

  currentUser = '';
}

// ---------------------------------------------------------------------------
// Each "phone" has its own copy of the on-device stores.
// ---------------------------------------------------------------------------
type Phone = { log: LogData; goal: number; goalAt: number };
const newPhone = (): Phone => ({ log: { ...EMPTY_LOG }, goal: 8, goalAt: 0 });
let active: Phone | null = null;

function use(phone: Phone) {
  if (active) save(active);
  active = phone;
  useLog.setState({ ...phone.log });
  useSettings.setState({ dailyGoal: phone.goal, dailyGoalUpdatedAt: phone.goalAt });
}
function save(phone: Phone) {
  const { logCup: _a, undoLastToday: _b, recordGoal: _c, patch: _d, ...log } = useLog.getState();
  phone.log = log;
  phone.goal = useSettings.getState().dailyGoal;
  phone.goalAt = useSettings.getState().dailyGoalUpdatedAt;
}
const liveCount = (day: string) => countsByDay(useLog.getState().entries)[day] ?? 0;

const ALICE = 'alice-id';
const BOB = 'bob-id';
const DAY = '2026-11-10';
const at = (h: number, m = 0) => new Date(2026, 10, 10, h, m).getTime();

let server: FakeServer;
async function sync(userId: string, now = at(20)) {
  server.currentUser = userId;
  await syncOnce(server.backend(), userId, 'America/Los_Angeles', now);
}

beforeEach(() => {
  server = new FakeServer();
  active = null;
});

describe('first sign-in', () => {
  it('uploads data logged before signing in (v1 data is kept)', async () => {
    const phone = newPhone();
    use(phone);
    useLog.getState().logCup(8, at(9));
    useLog.getState().logCup(8, at(10));
    expect(prepareLocalDataFor(ALICE)).toBe('claimed');
    await sync(ALICE);
    expect(server.entries.size).toBe(2);
    expect(server.goals.size).toBe(1);
    expect(useLog.getState().dirtyEntryIds).toEqual([]);
    expect(useLog.getState().lastSyncedAt).toBe(at(20));
  });

  it("asks before mixing another account's data", async () => {
    const phone = newPhone();
    use(phone);
    useLog.getState().logCup(8, at(9));
    prepareLocalDataFor(ALICE);
    await sync(ALICE);

    expect(prepareLocalDataFor(BOB)).toBe('other-account');
    await sync(BOB); // must not upload Alice's cups to Bob
    expect([...server.entries.values()].every((r) => r.user_id === ALICE)).toBe(true);

    replaceLocalDataWith(BOB);
    expect(useLog.getState().entries).toEqual([]);
    expect(prepareLocalDataFor(BOB)).toBe('same');
  });
});

describe('two phones', () => {
  it('a new phone downloads the log and goal', async () => {
    const a = newPhone();
    use(a);
    useLog.getState().logCup(10, at(9));
    useLog.getState().logCup(10, at(11));
    useSettings.setState({ dailyGoal: 10, dailyGoalUpdatedAt: at(8) });
    prepareLocalDataFor(ALICE);
    await sync(ALICE);

    const b = newPhone();
    use(b);
    prepareLocalDataFor(ALICE);
    await sync(ALICE);
    expect(liveCount(DAY)).toBe(2);
    expect(useLog.getState().goalByDay[DAY]).toBe(10);
    expect(useSettings.getState().dailyGoal).toBe(10);
  });

  it('cups logged on both phones while offline add up after syncing', async () => {
    const a = newPhone();
    const b = newPhone();
    use(a);
    prepareLocalDataFor(ALICE);
    use(b);
    prepareLocalDataFor(ALICE);

    use(a);
    useLog.getState().logCup(8, at(9));
    use(b);
    useLog.getState().logCup(8, at(10));
    useLog.getState().logCup(8, at(11));

    use(a);
    await sync(ALICE);
    use(b);
    await sync(ALICE);
    use(a);
    await sync(ALICE);
    expect(liveCount(DAY)).toBe(3);
    use(b);
    expect(liveCount(DAY)).toBe(3);
  });

  it('an undo on one phone removes the cup on the other', async () => {
    const a = newPhone();
    use(a);
    prepareLocalDataFor(ALICE);
    useLog.getState().logCup(8, at(9));
    await sync(ALICE);

    const b = newPhone();
    use(b);
    prepareLocalDataFor(ALICE);
    await sync(ALICE);
    expect(liveCount(DAY)).toBe(1);

    use(a);
    useLog.getState().undoLastToday(at(12));
    await sync(ALICE, at(12));
    use(b);
    await sync(ALICE, at(13));
    expect(liveCount(DAY)).toBe(0);
  });

  it('the newest goal wins', async () => {
    const a = newPhone();
    const b = newPhone();
    use(a);
    prepareLocalDataFor(ALICE);
    useSettings.setState({ dailyGoal: 12, dailyGoalUpdatedAt: at(9) });
    use(b);
    prepareLocalDataFor(ALICE);
    useSettings.setState({ dailyGoal: 6, dailyGoalUpdatedAt: at(10) });

    use(a);
    await sync(ALICE);
    use(b);
    await sync(ALICE);
    use(a);
    await sync(ALICE);
    expect(useSettings.getState().dailyGoal).toBe(6);
    expect(server.profiles.get(ALICE)!.daily_goal).toBe(6);
  });
});

describe('reliability', () => {
  it('keeps changes made while offline and uploads them later', async () => {
    const phone = newPhone();
    use(phone);
    prepareLocalDataFor(ALICE);
    useLog.getState().logCup(8, at(9));
    server.offline = true;
    await expect(sync(ALICE)).rejects.toThrow('Network request failed');
    expect(useLog.getState().dirtyEntryIds).toHaveLength(1);
    server.offline = false;
    await sync(ALICE);
    expect(server.entries.size).toBe(1);
    expect(useLog.getState().dirtyEntryIds).toEqual([]);
  });

  it('pages through large logs written within the same millisecond', async () => {
    const a = newPhone();
    use(a);
    for (let i = 0; i < BATCH_SIZE + 120; i++) useLog.getState().logCup(8, at(8) + i * 1000);
    prepareLocalDataFor(ALICE);
    await sync(ALICE);
    expect(server.entries.size).toBe(BATCH_SIZE + 120);

    const b = newPhone();
    use(b);
    prepareLocalDataFor(ALICE);
    server.calls.fetchEntries = 0;
    await sync(ALICE);
    expect(useLog.getState().entries).toHaveLength(BATCH_SIZE + 120);
    expect(server.calls.fetchEntries).toBeLessThanOrEqual(3);
  });

  it('a stale phone cannot undo a newer change on the server', async () => {
    const a = newPhone();
    use(a);
    prepareLocalDataFor(ALICE);
    const cup = useLog.getState().logCup(8, at(9));
    await sync(ALICE);
    const b = newPhone();
    use(b);
    prepareLocalDataFor(ALICE);
    await sync(ALICE);

    use(a);
    useLog.getState().undoLastToday(at(12)); // newer: removes the cup
    await sync(ALICE, at(12));
    use(b);
    // Phone B still has the old version and re-sends it (e.g. after a reinstall race).
    useLog.getState().patch({ dirtyEntryIds: [cup.id] });
    await sync(ALICE, at(13));
    expect(server.entries.get(cup.id)!.deleted_at).not.toBeNull();
    expect(liveCount(DAY)).toBe(0);
  });
});

describe('merge helpers', () => {
  const entry = (id: string, updatedAt: number, deletedAt: number | null = null): DrinkEntry => ({
    id,
    loggedAt: at(9),
    cups: 1,
    updatedAt,
    deletedAt,
  });
  const remote = (e: DrinkEntry): RemoteEntry => ({
    id: e.id,
    logged_at: new Date(e.loggedAt).toISOString(),
    local_date: DAY,
    cups: e.cups,
    updated_at: new Date(e.updatedAt).toISOString(),
    deleted_at: e.deletedAt == null ? null : new Date(e.deletedAt).toISOString(),
  });

  it('keeps a newer local edit and leaves it dirty', () => {
    const result = mergeRemoteEntries([entry('x', at(12), at(12))], ['x'], [remote(entry('x', at(9)))]);
    expect(result.entries[0].deletedAt).toBe(at(12));
    expect(result.dirtyEntryIds).toEqual(['x']);
  });

  it('takes a newer remote edit and clears dirty', () => {
    const result = mergeRemoteEntries([entry('x', at(9))], ['x'], [remote(entry('x', at(12), at(12)))]);
    expect(result.entries[0].deletedAt).toBe(at(12));
    expect(result.dirtyEntryIds).toEqual([]);
  });

  it('cursor follows the last row of a page', () => {
    expect(nextCursor([], 'c')).toBe('c');
    expect(nextCursor([{ synced_at: 'a' }, { synced_at: 'b' }], null)).toBe('b');
  });
});

describe('migrating data saved by v1', () => {
  it('adds sync fields and keeps every cup', () => {
    const v1 = {
      entries: [{ id: 'a', loggedAt: at(9), cups: 1 }],
      goalByDay: { [DAY]: 8 },
    };
    const v2 = migrateLog(v1, 1);
    expect(v2.entries).toEqual([{ id: 'a', loggedAt: at(9), cups: 1, updatedAt: at(9), deletedAt: null }]);
    expect(v2.goalByDay).toEqual({ [DAY]: 8 });
    expect(v2.goalUpdatedAt[DAY]).toBe(new Date(2026, 10, 10).getTime());
    expect(v2.ownerUserId).toBeNull();
    expect(v2.dirtyEntryIds).toEqual([]);
  });

  it('undo now soft-deletes so the removal can sync', () => {
    use(newPhone());
    useLog.getState().logCup(8, at(9));
    useLog.getState().undoLastToday(at(10));
    const [e] = useLog.getState().entries;
    expect(e.deletedAt).toBe(at(10));
    expect(liveCount(DAY)).toBe(0);
    expect(useLog.getState().dirtyEntryIds).toEqual([e.id]);
  });
});
