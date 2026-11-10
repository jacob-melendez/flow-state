/**
 * Pure helpers for syncing the water log with the server.
 * Conflicts are resolved "newest change wins" using each row's updatedAt.
 */
import { DrinkEntry } from '../domain/streaks';
import { dateKey } from '../domain/time';

/** Row shapes as stored in Supabase (snake_case, ISO timestamps). */
export interface RemoteEntry {
  id: string;
  logged_at: string;
  local_date: string;
  cups: number;
  updated_at: string;
  deleted_at: string | null;
  synced_at?: string;
}

export interface RemoteGoal {
  local_date: string;
  goal: number;
  updated_at: string;
  synced_at?: string;
}

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (s: string) => Date.parse(s);

export function toRemoteEntry(e: DrinkEntry): RemoteEntry {
  return {
    id: e.id,
    logged_at: iso(e.loggedAt),
    local_date: dateKey(e.loggedAt),
    cups: e.cups,
    updated_at: iso(e.updatedAt),
    deleted_at: e.deletedAt == null ? null : iso(e.deletedAt),
  };
}

export function fromRemoteEntry(r: RemoteEntry): DrinkEntry {
  return {
    id: r.id,
    loggedAt: ms(r.logged_at),
    cups: r.cups,
    updatedAt: ms(r.updated_at),
    deletedAt: r.deleted_at == null ? null : ms(r.deleted_at),
  };
}

export function toRemoteGoal(date: string, goal: number, updatedAt: number): RemoteGoal {
  return { local_date: date, goal, updated_at: iso(updatedAt) };
}

export interface EntryMergeResult {
  entries: DrinkEntry[];
  dirtyEntryIds: string[];
}

/**
 * Merges rows downloaded from the server into the local log. A remote row
 * replaces the local one when it is at least as new; a local row that is newer
 * stays (and stays dirty, so it's uploaded next).
 */
export function mergeRemoteEntries(local: DrinkEntry[], dirtyEntryIds: string[], remote: RemoteEntry[]): EntryMergeResult {
  if (remote.length === 0) return { entries: local, dirtyEntryIds };
  const byId = new Map(local.map((e) => [e.id, e]));
  const dirty = new Set(dirtyEntryIds);
  for (const row of remote) {
    const incoming = fromRemoteEntry(row);
    const existing = byId.get(incoming.id);
    if (!existing || incoming.updatedAt >= existing.updatedAt) {
      byId.set(incoming.id, incoming);
      dirty.delete(incoming.id);
    }
  }
  const entries = [...byId.values()].sort((a, b) => a.loggedAt - b.loggedAt);
  return { entries, dirtyEntryIds: [...dirty] };
}

export interface GoalState {
  goalByDay: Record<string, number>;
  goalUpdatedAt: Record<string, number>;
  dirtyGoalDates: string[];
}

export function mergeRemoteGoals(local: GoalState, remote: RemoteGoal[]): GoalState {
  if (remote.length === 0) return local;
  const goalByDay = { ...local.goalByDay };
  const goalUpdatedAt = { ...local.goalUpdatedAt };
  const dirty = new Set(local.dirtyGoalDates);
  for (const row of remote) {
    const updatedAt = ms(row.updated_at);
    if (goalByDay[row.local_date] === undefined || updatedAt >= (goalUpdatedAt[row.local_date] ?? 0)) {
      goalByDay[row.local_date] = row.goal;
      goalUpdatedAt[row.local_date] = updatedAt;
      dirty.delete(row.local_date);
    }
  }
  return { goalByDay, goalUpdatedAt, dirtyGoalDates: [...dirty] };
}

/**
 * After an upload succeeds, rows stop being dirty — unless they changed again
 * while the upload was in flight.
 */
export function clearPushed<K extends string>(
  dirty: K[],
  pushed: { key: K; updatedAt: number }[],
  currentUpdatedAt: (key: K) => number | undefined,
): K[] {
  const done = new Set(pushed.filter((p) => currentUpdatedAt(p.key) === p.updatedAt).map((p) => p.key));
  return dirty.filter((k) => !done.has(k));
}

/**
 * Cursor for the next download: the server timestamp of the last row in a page
 * (pages are ordered by synced_at). Kept as the server's exact string, which has
 * microsecond precision, so paging never stalls on rows written in the same millisecond.
 */
export function nextCursor(rows: { synced_at?: string }[], current: string | null): string | null {
  const last = rows[rows.length - 1]?.synced_at;
  return last ?? current;
}
