/**
 * Sign-in state and account actions, plus when to run the cloud sync.
 * Everything here is a no-op when the app has no backend configured.
 */
import { getCalendars } from 'expo-localization';
import { create } from 'zustand';

import { waitForHydration } from '../state/hydration';
import { useLog } from '../state/logStore';
import { useSettings } from '../state/settingsStore';
import { supabaseBackend } from './backend';
import { supabase } from './client';
import { OwnershipResult, prepareLocalDataFor, releaseLocalData, syncOnce } from './cloudSync';
import { normalizeEmail } from './email';

export type AuthStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in';

interface AccountState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  syncing: boolean;
  syncError: string | null;
}

export const useAccount = create<AccountState>()(() => ({
  status: supabase ? 'loading' : 'disabled',
  userId: null,
  email: null,
  displayName: null,
  syncing: false,
  syncError: null,
}));

function deviceTimezone(): string | null {
  try {
    return getCalendars()[0]?.timeZone ?? null;
  } catch {
    return null;
  }
}

/** Turns Supabase/network errors into messages students can act on. */
export function friendlyError(e: unknown): string {
  const err = e as { message?: string; code?: string; status?: number } | null;
  const message = err?.message ?? String(e);
  const code = err?.code ?? '';
  if (/network|fetch|timed out|offline/i.test(message)) return 'No internet connection. Try again when you’re online.';
  if (code === 'otp_expired' || /expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(message))
    return 'That code is wrong or has expired. Check the latest email or send a new code.';
  if (code.startsWith('over_') || /rate limit|too many/i.test(message))
    return 'Too many attempts. Please wait a minute and try again.';
  if (/stanford\.edu|database error saving new user/i.test(message)) return 'Only @stanford.edu email addresses can sign up.';
  if (/signups not allowed/i.test(message)) return 'New sign-ups are turned off right now.';
  return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Sync scheduling
// ---------------------------------------------------------------------------
let queue: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | null = null;

/** Runs a sync now (or after `delayMs`), if signed in. Safe to call often. */
export function requestCloudSync(delayMs = 0): void {
  if (!supabase) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    runCloudSync();
  }, delayMs);
}

/** One sync; never runs two at once. Also used by the background task. */
export function runCloudSync(): Promise<void> {
  queue = queue.then(doSync, doSync);
  return queue;
}

async function doSync(): Promise<void> {
  if (!supabase) return;
  await waitForHydration();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId || useLog.getState().ownerUserId !== userId) return;
  useAccount.setState({ syncing: true });
  try {
    await syncOnce(supabaseBackend(supabase), userId, deviceTimezone());
    useAccount.setState({ syncError: null });
  } catch (e) {
    useAccount.setState({ syncError: friendlyError(e) });
  } finally {
    useAccount.setState({ syncing: false });
  }
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
let started = false;

/** Call once at app start: restores the login and keeps sync running. */
export function startCloud(): void {
  if (!supabase || started) return;
  started = true;
  const client = supabase;

  client.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    if (!user) {
      useAccount.setState({ status: 'signed-out', userId: null, email: null, displayName: null, syncError: null });
      return;
    }
    const changedUser = useAccount.getState().userId !== user.id;
    useAccount.setState({ status: 'signed-in', userId: user.id, email: user.email ?? null });
    if (changedUser) {
      // Supabase advises not to await other Supabase calls inside this callback.
      setTimeout(async () => {
        loadProfile();
        // Claim never-synced data for this account (e.g. the app closed mid-sign-in).
        // Another account's data is never touched here; the UI asks about it.
        await waitForHydration();
        if (useLog.getState().ownerUserId === null) prepareLocalDataFor(user.id);
        requestCloudSync();
      }, 0);
    }
  });

  // Upload soon after the student logs a cup or changes their goal.
  useLog.subscribe((s, prev) => {
    if (s.dirtyEntryIds.length > prev.dirtyEntryIds.length || s.dirtyGoalDates.length > prev.dirtyGoalDates.length) {
      requestCloudSync(2000);
    }
  });
  useSettings.subscribe((s, prev) => {
    if (s.dailyGoal !== prev.dailyGoal) requestCloudSync(2000);
  });
}

async function loadProfile(): Promise<void> {
  const userId = useAccount.getState().userId;
  if (!supabase || !userId) return;
  const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  if (data) useAccount.setState({ displayName: (data as { display_name: string | null }).display_name });
}

// ---------------------------------------------------------------------------
// Account actions (all return an error message, or null on success)
// ---------------------------------------------------------------------------
export async function sendCode(email: string): Promise<string | null> {
  if (!supabase) return 'Accounts aren’t set up in this version of the app.';
  const { error } = await supabase.auth.signInWithOtp({ email: normalizeEmail(email), options: { shouldCreateUser: true } });
  return error ? friendlyError(error) : null;
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<{ error: string } | { error: null; userId: string; ownership: OwnershipResult; needsName: boolean }> {
  if (!supabase) return { error: 'Accounts aren’t set up in this version of the app.' };
  const { data, error } = await supabase.auth.verifyOtp({ email: normalizeEmail(email), token: code.trim(), type: 'email' });
  if (error || !data.user) return { error: friendlyError(error ?? new Error('invalid token')) };
  const userId = data.user.id;
  useAccount.setState({ status: 'signed-in', userId, email: data.user.email ?? null });
  await loadProfile();
  const ownership = prepareLocalDataFor(userId);
  return { error: null, userId, ownership, needsName: !useAccount.getState().displayName };
}

export async function updateDisplayName(name: string): Promise<string | null> {
  const userId = useAccount.getState().userId;
  if (!supabase || !userId) return 'You’re not signed in.';
  const display_name = name.trim().slice(0, 30);
  if (!display_name) return 'Please enter a name.';
  const { error } = await supabase.from('profiles').update({ display_name }).eq('id', userId);
  if (error) return friendlyError(error);
  useAccount.setState({ displayName: display_name });
  return null;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  // Local sign-out works offline; the water log stays on this phone.
  await supabase.auth.signOut({ scope: 'local' });
}

export async function deleteAccount(): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return friendlyError(error);
  releaseLocalData();
  await supabase.auth.signOut({ scope: 'local' });
  return null;
}
