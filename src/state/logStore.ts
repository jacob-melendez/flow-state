import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DrinkEntry } from '../domain/streaks';
import { dateKey } from '../domain/time';
import { deviceStorage } from './storage';

export interface LogState {
  /** Every logged cup. Each has a UUID + timestamp so it can be synced later. */
  entries: DrinkEntry[];
  /** The goal in effect on each day a cup was logged, so goal changes don't rewrite history. */
  goalByDay: Record<string, number>;

  logCup: (goal: number, at?: number) => DrinkEntry;
  undoLastToday: (now?: number) => void;
  recordGoal: (goal: number, now?: number) => void;
}

export const useLog = create<LogState>()(
  persist(
    (set, get) => ({
      entries: [],
      goalByDay: {},

      logCup: (goal, at = Date.now()) => {
        const entry: DrinkEntry = { id: randomUUID(), loggedAt: at, cups: 1 };
        set({
          entries: [...get().entries, entry],
          goalByDay: { ...get().goalByDay, [dateKey(at)]: goal },
        });
        return entry;
      },
      undoLastToday: (now = Date.now()) => {
        const today = dateKey(now);
        const entries = get().entries;
        for (let i = entries.length - 1; i >= 0; i--) {
          if (dateKey(entries[i].loggedAt) === today) {
            set({ entries: [...entries.slice(0, i), ...entries.slice(i + 1)] });
            return;
          }
        }
      },
      recordGoal: (goal, now = Date.now()) => set({ goalByDay: { ...get().goalByDay, [dateKey(now)]: goal } }),
    }),
    {
      name: 'flow-state/log',
      storage: deviceStorage,
      version: 1,
      partialize: ({ entries, goalByDay }) => ({ entries, goalByDay }),
      migrate: (persisted) => persisted as LogState,
    },
  ),
);
