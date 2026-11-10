/**
 * The small set of server operations the sync needs. Kept behind an interface
 * so the sync logic can be tested against an in-memory fake server.
 */
import { SupabaseClient } from '@supabase/supabase-js';

import { RemoteEntry, RemoteGoal } from './merge';

export interface RemoteProfile {
  display_name: string | null;
  daily_goal: number;
  daily_goal_updated_at: string;
  timezone: string | null;
}

export interface SyncBackend {
  upsertEntries(userId: string, rows: RemoteEntry[]): Promise<void>;
  upsertGoals(userId: string, rows: RemoteGoal[]): Promise<void>;
  /** Rows changed after `since` (server time), oldest first. */
  fetchEntries(since: string | null, limit: number): Promise<RemoteEntry[]>;
  fetchGoals(since: string | null, limit: number): Promise<RemoteGoal[]>;
  getProfile(userId: string): Promise<RemoteProfile | null>;
  updateProfile(userId: string, patch: Partial<RemoteProfile>): Promise<void>;
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

export function supabaseBackend(client: SupabaseClient): SyncBackend {
  return {
    async upsertEntries(userId, rows) {
      if (rows.length === 0) return;
      check(await client.from('drink_entries').upsert(rows.map((r) => ({ ...r, user_id: userId })), { onConflict: 'id' }));
    },
    async upsertGoals(userId, rows) {
      if (rows.length === 0) return;
      check(
        await client
          .from('daily_goals')
          .upsert(rows.map((r) => ({ ...r, user_id: userId })), { onConflict: 'user_id,local_date' }),
      );
    },
    async fetchEntries(since, limit) {
      let q = client
        .from('drink_entries')
        .select('id, logged_at, local_date, cups, updated_at, deleted_at, synced_at')
        .order('synced_at', { ascending: true })
        .limit(limit);
      if (since) q = q.gt('synced_at', since);
      return check(await q) as RemoteEntry[];
    },
    async fetchGoals(since, limit) {
      let q = client
        .from('daily_goals')
        .select('local_date, goal, updated_at, synced_at')
        .order('synced_at', { ascending: true })
        .limit(limit);
      if (since) q = q.gt('synced_at', since);
      return check(await q) as RemoteGoal[];
    },
    async getProfile(userId) {
      const data = check(
        await client
          .from('profiles')
          .select('display_name, daily_goal, daily_goal_updated_at, timezone')
          .eq('id', userId)
          .maybeSingle(),
      );
      return (data as RemoteProfile | null) ?? null;
    },
    async updateProfile(userId, patch) {
      check(await client.from('profiles').update(patch).eq('id', userId));
    },
  };
}
