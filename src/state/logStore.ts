import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DrinkEntry } from '../domain/streaks';
import { dateKey } from '../domain/time';
import { deviceStorage } from './storage';

/** The persisted part of the log (also what the cloud sync reads and writes). */
export interface LogData {
  /** Every logged cup, including removed ones (soft-deleted so removals sync). */
  entries: DrinkEntry[];
  /** The goal in effect on each day, so goal changes don't rewrite history. */
  goalByDay: Record<string, number>;
  /** When each day's goal last changed (epoch ms), for sync conflict resolution. */
  goalUpdatedAt: Record<string, number>;

  /** Cloud sync bookkeeping. */
  dirtyEntryIds: string[];
  dirtyGoalDates: string[];
  entriesCursor: string | null;
  goalsCursor: string | null;
  /** Account this phone's log belongs to; null if it was never synced. */
  ownerUserId: string | null;
  lastSyncedAt: number | null;
}

export interface LogState extends LogData {
  logCup: (goal: number, at?: number) => DrinkEntry;
  undoLastToday: (now?: number) => void;
  recordGoal: (goal: number, now?: number) => void;
  /** Used by the cloud sync to write merged results. */
  patch: (data: Partial<LogData>) => void;
}

export const EMPTY_LOG: LogData = {
  entries: [],
  goalByDay: {},
  goalUpdatedAt: {},
  dirtyEntryIds: [],
  dirtyGoalDates: [],
  entriesCursor: null,
  goalsCursor: null,
  ownerUserId: null,
  lastSyncedAt: null,
};

const addUnique = <T,>(list: T[], item: T) => (list.includes(item) ? list : [...list, item]);

export const useLog = create<LogState>()(
  persist(
    (set, get) => ({
      ...EMPTY_LOG,

      logCup: (goal, at = Date.now()) => {
        const entry: DrinkEntry = { id: randomUUID(), loggedAt: at, cups: 1, updatedAt: at, deletedAt: null };
        const day = dateKey(at);
        const s = get();
        const goalChanged = s.goalByDay[day] !== goal;
        set({
          entries: [...s.entries, entry],
          dirtyEntryIds: addUnique(s.dirtyEntryIds, entry.id),
          ...(goalChanged && {
            goalByDay: { ...s.goalByDay, [day]: goal },
            goalUpdatedAt: { ...s.goalUpdatedAt, [day]: at },
            dirtyGoalDates: addUnique(s.dirtyGoalDates, day),
          }),
        });
        return entry;
      },

      undoLastToday: (now = Date.now()) => {
        const today = dateKey(now);
        const entries = get().entries;
        for (let i = entries.length - 1; i >= 0; i--) {
          const e = entries[i];
          if (e.deletedAt == null && dateKey(e.loggedAt) === today) {
            const updated = [...entries];
            updated[i] = { ...e, deletedAt: now, updatedAt: now };
            set({ entries: updated, dirtyEntryIds: addUnique(get().dirtyEntryIds, e.id) });
            return;
          }
        }
      },

      recordGoal: (goal, now = Date.now()) => {
        const day = dateKey(now);
        const s = get();
        if (s.goalByDay[day] === goal) return;
        set({
          goalByDay: { ...s.goalByDay, [day]: goal },
          goalUpdatedAt: { ...s.goalUpdatedAt, [day]: now },
          dirtyGoalDates: addUnique(s.dirtyGoalDates, day),
        });
      },

      patch: (data) => set(data),
    }),
    {
      name: 'flow-state/log',
      storage: deviceStorage,
      version: 2,
      partialize: (s): LogData => ({
        entries: s.entries,
        goalByDay: s.goalByDay,
        goalUpdatedAt: s.goalUpdatedAt,
        dirtyEntryIds: s.dirtyEntryIds,
        dirtyGoalDates: s.dirtyGoalDates,
        entriesCursor: s.entriesCursor,
        goalsCursor: s.goalsCursor,
        ownerUserId: s.ownerUserId,
        lastSyncedAt: s.lastSyncedAt,
      }),
      migrate: (persisted, version) => migrateLog(persisted, version) as unknown as LogState,
    },
  ),
);

/** Upgrades data saved by older app versions. Exported for tests. */
export function migrateLog(persisted: unknown, version: number): LogData {
  const old = (persisted ?? {}) as Partial<LogData> & { entries?: Partial<DrinkEntry>[] };
  if (version < 2) {
    // v1 → v2: entries gain updatedAt/deletedAt; goals gain timestamps; sync bookkeeping added.
    const entries = (old.entries ?? []).map((e) => ({
      id: e.id!,
      loggedAt: e.loggedAt!,
      cups: e.cups ?? 1,
      updatedAt: e.updatedAt ?? e.loggedAt!,
      deletedAt: e.deletedAt ?? null,
    }));
    const goalByDay = old.goalByDay ?? {};
    const goalUpdatedAt: Record<string, number> = {};
    for (const day of Object.keys(goalByDay)) {
      const [y, m, d] = day.split('-').map(Number);
      goalUpdatedAt[day] = new Date(y, m - 1, d).getTime();
    }
    return { ...EMPTY_LOG, entries, goalByDay, goalUpdatedAt };
  }
  return { ...EMPTY_LOG, ...(old as Partial<LogData>) } as LogData;
}
