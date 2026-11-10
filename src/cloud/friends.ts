/**
 * Friends: thin wrappers around the server functions in
 * supabase/migrations/20261111000000_friends.sql, plus a small store for the
 * Friends tab. The server enforces every rule; this file only presents results.
 */
import { create } from 'zustand';

import { friendlyError, useAccount } from './account';
import { supabase } from './client';
import { normalizeEmail } from './email';
import { normalizeFriendCode } from './friendCode';

export interface FriendRow {
  user_id: string;
  display_name: string | null;
  status: 'friend' | 'incoming' | 'outgoing';
  request_id: string;
  /** Only for incoming requests, so you know who's asking. */
  email: string | null;
  /** Only for friends. */
  today_cups: number | null;
  today_goal: number | null;
  streak: number | null;
}

interface FriendsState {
  friends: FriendRow[];
  incoming: FriendRow[];
  outgoing: FriendRow[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useFriends = create<FriendsState>()((set) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  loaded: false,
  loading: false,
  error: null,
  refresh: async () => {
    if (!supabase || useAccount.getState().status !== 'signed-in') return;
    set({ loading: true });
    const { data, error } = await supabase.rpc('get_friends');
    if (error) {
      set({ loading: false, error: friendlyError(error) });
      return;
    }
    const rows = (data ?? []) as FriendRow[];
    set({
      friends: rows.filter((r) => r.status === 'friend'),
      incoming: rows.filter((r) => r.status === 'incoming'),
      outgoing: rows.filter((r) => r.status === 'outgoing'),
      loaded: true,
      loading: false,
      error: null,
    });
  },
}));

export type SendResult =
  | 'sent'
  | 'accepted'
  | 'already_friends'
  | 'already_requested'
  | 'self'
  | 'needs_name'
  | 'too_many'
  | 'not_found';

const SEND_MESSAGES: Record<SendResult, { ok: boolean; text: (via: 'code' | 'email') => string }> = {
  sent: { ok: true, text: () => 'Friend request sent! You’ll see their progress once they accept.' },
  accepted: { ok: true, text: () => 'They had already sent you a request, so you’re now friends!' },
  already_friends: { ok: true, text: () => 'You’re already friends.' },
  already_requested: { ok: true, text: () => 'You’ve already sent them a request.' },
  self: { ok: false, text: (via) => (via === 'code' ? 'That’s your own code!' : 'That’s your own email!') },
  needs_name: { ok: false, text: () => 'Add your name first (Settings → Account) so friends know who you are.' },
  too_many: { ok: false, text: () => 'You have a lot of pending requests. Wait for some to be answered first.' },
  not_found: {
    ok: false,
    text: (via) =>
      via === 'code'
        ? 'No one found with that code. Check it and try again.'
        : 'No one found with that email. They may not have an account yet, or they’ve turned off email search. Ask for their friend code instead.',
  },
};

/** Sends a request by code or Stanford email. Returns whether it worked and a message to show. */
export async function sendFriendRequest(
  target: { code: string } | { email: string },
): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: 'Accounts aren’t set up in this version of the app.' };
  const via = 'code' in target ? 'code' : 'email';
  const { data, error } = await supabase.rpc('send_friend_request', {
    p_code: 'code' in target ? normalizeFriendCode(target.code) : null,
    p_email: 'email' in target ? normalizeEmail(target.email) : null,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  const result = SEND_MESSAGES[data as SendResult] ?? { ok: false, text: () => 'Something went wrong. Please try again.' };
  useFriends.getState().refresh();
  return { ok: result.ok, message: result.text(via) };
}

export async function respondToRequest(requestId: string, accept: boolean): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.rpc('respond_friend_request', { p_request_id: requestId, p_accept: accept });
  await useFriends.getState().refresh();
  return error ? friendlyError(error) : null;
}

/** Unfriend, cancel a sent request, or decline; optionally block. */
export async function removeFriend(userId: string, block = false): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.rpc('remove_friend', { p_user_id: userId, p_block: block });
  await useFriends.getState().refresh();
  return error ? friendlyError(error) : null;
}

export async function setDiscoverableByEmail(value: boolean): Promise<string | null> {
  const userId = useAccount.getState().userId;
  if (!supabase || !userId) return null;
  const previous = useAccount.getState().discoverableByEmail;
  useAccount.setState({ discoverableByEmail: value });
  const { error } = await supabase.from('profiles').update({ discoverable_by_email: value }).eq('id', userId);
  if (error) {
    useAccount.setState({ discoverableByEmail: previous });
    return friendlyError(error);
  }
  return null;
}

// Forget the previous account's friends when someone signs out or switches accounts.
useAccount.subscribe((s, prev) => {
  if (s.userId !== prev.userId) {
    useFriends.setState({ friends: [], incoming: [], outgoing: [], loaded: false, error: null });
  }
});
