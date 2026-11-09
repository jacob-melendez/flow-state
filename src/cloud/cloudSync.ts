/**
 * Two-way sync of the water log and goal with the server.
 *
 * Offline-first: the phone's data is always the source the UI reads; the sync
 * uploads local changes ("dirty" rows), downloads rows changed elsewhere since
 * the last download, and merges them (newest change wins).
 */
import { useLog } from '../state/logStore';
import { useSettings } from '../state/settingsStore';
import { SyncBackend } from './backend';
import {
  clearPushed,
  mergeRemoteEntries,
  mergeRemoteGoals,
  nextCursor,
  toRemoteEntry,
  toRemoteGoal,
} from './merge';

export const BATCH_SIZE = 500;
/**
 * Each sync's first download re-reads a short window before the cursor, so a row
 * written by a slow concurrent request isn't skipped. Re-reading is harmless
 * (merging is idempotent). Later pages continue from the exact cursor.
 */
export const CURSOR_OVERLAP_MS = 30_000;

export type OwnershipResult = 'claimed' | 'same' | 'other-account';

/**
 * Decides what to do with this phone's log when `userId` signs in:
 * - never synced → claim it (everything is uploaded, so v1 data isn't lost)
 * - already this account's → nothing to do
 * - another account's → the caller must ask before replacing it
 */
export function prepareLocalDataFor(userId: string): OwnershipResult {
  const log = useLog.getState();
  if (log.ownerUserId === userId) return 'same';
  if (log.ownerUserId !== null) return 'other-account';
  log.patch({
    ownerUserId: userId,
    dirtyEntryIds: log.entries.map((e) => e.id),
    dirtyGoalDates: Object.keys(log.goalByDay),
    entriesCursor: null,
    goalsCursor: null,
  });
  return 'claimed';
}

/** Clears another account's data from this phone and hands the log to `userId`. */
export function replaceLocalDataWith(userId: string): void {
  useLog.getState().patch({
    entries: [],
    goalByDay: {},
    goalUpdatedAt: {},
    dirtyEntryIds: [],
    dirtyGoalDates: [],
    entriesCursor: null,
    goalsCursor: null,
    ownerUserId: userId,
    lastSyncedAt: null,
  });
  useSettings.setState({ dailyGoalUpdatedAt: 0 });
}

/** Marks the log as no longer belonging to any account (after deleting it). */
export function releaseLocalData(): void {
  useLog.getState().patch({ ownerUserId: null, entriesCursor: null, goalsCursor: null, lastSyncedAt: null });
}

function cursorWithOverlap(cursor: string | null): string | null {
  return cursor ? new Date(Date.parse(cursor) - CURSOR_OVERLAP_MS).toISOString() : null;
}

/**
 * One full sync. Throws on network/server errors (nothing is lost; dirty rows
 * stay dirty and are retried next time).
 */
export async function syncOnce(backend: SyncBackend, userId: string, timezone: string | null, now = Date.now()): Promise<void> {
  if (useLog.getState().ownerUserId !== userId) return; // never mix accounts

  // 1. Upload changed entries.
  for (;;) {
    const log = useLog.getState();
    const byId = new Map(log.entries.map((e) => [e.id, e]));
    const batch = log.dirtyEntryIds
      .map((id) => byId.get(id))
      .filter((e) => e !== undefined)
      .slice(0, BATCH_SIZE);
    if (batch.length === 0) break;
    await backend.upsertEntries(userId, batch.map(toRemoteEntry));
    const after = useLog.getState();
    const current = new Map(after.entries.map((e) => [e.id, e.updatedAt]));
    const remaining = clearPushed(
      after.dirtyEntryIds,
      batch.map((e) => ({ key: e.id, updatedAt: e.updatedAt })),
      (id) => current.get(id),
    );
    after.patch({ dirtyEntryIds: remaining.filter((id) => current.has(id)) });
    if (batch.length < BATCH_SIZE) break;
  }

  // 2. Upload changed daily goals.
  {
    const log = useLog.getState();
    const dates = log.dirtyGoalDates.filter((d) => log.goalByDay[d] !== undefined);
    for (let i = 0; i < dates.length; i += BATCH_SIZE) {
      const chunk = dates.slice(i, i + BATCH_SIZE);
      const pushed = chunk.map((d) => ({ key: d, updatedAt: log.goalUpdatedAt[d] ?? now }));
      await backend.upsertGoals(
        userId,
        chunk.map((d) => toRemoteGoal(d, log.goalByDay[d], log.goalUpdatedAt[d] ?? now)),
      );
      const after = useLog.getState();
      after.patch({ dirtyGoalDates: clearPushed(after.dirtyGoalDates, pushed, (d) => after.goalUpdatedAt[d] ?? now) });
    }
  }

  // 3. Download entries changed elsewhere.
  for (let page = 0; ; page++) {
    const since = useLog.getState().entriesCursor;
    const rows = await backend.fetchEntries(page === 0 ? cursorWithOverlap(since) : since, BATCH_SIZE);
    const latest = useLog.getState();
    const merged = mergeRemoteEntries(latest.entries, latest.dirtyEntryIds, rows);
    latest.patch({ ...merged, entriesCursor: nextCursor(rows, since) });
    if (rows.length < BATCH_SIZE) break;
  }

  // 4. Download daily goals changed elsewhere.
  for (let page = 0; ; page++) {
    const since = useLog.getState().goalsCursor;
    const rows = await backend.fetchGoals(page === 0 ? cursorWithOverlap(since) : since, BATCH_SIZE);
    const latest = useLog.getState();
    latest.patch({ ...mergeRemoteGoals(latest, rows), goalsCursor: nextCursor(rows, since) });
    if (rows.length < BATCH_SIZE) break;
  }

  // 5. Current daily goal and timezone live on the profile (newest goal wins).
  const profile = await backend.getProfile(userId);
  const settings = useSettings.getState();
  if (profile) {
    const remoteAt = Date.parse(profile.daily_goal_updated_at);
    const patch: Record<string, unknown> = {};
    if (remoteAt > settings.dailyGoalUpdatedAt) {
      settings.applyRemoteGoal(profile.daily_goal, remoteAt);
    } else if (settings.dailyGoalUpdatedAt > remoteAt) {
      patch.daily_goal = settings.dailyGoal;
      patch.daily_goal_updated_at = new Date(settings.dailyGoalUpdatedAt).toISOString();
    }
    if (timezone && profile.timezone !== timezone) patch.timezone = timezone;
    if (Object.keys(patch).length > 0) await backend.updateProfile(userId, patch);
  }

  useLog.getState().patch({ lastSyncedAt: now });
}
