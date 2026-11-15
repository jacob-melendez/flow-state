/** Friend codes: 8 characters from an alphabet without look-alikes (no I, L, O, 0, 1). */
export const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const FRIEND_CODE_LENGTH = 8;
export const INVITE_LINK_PREFIX = 'flowstate://add-friend/';

/** Uppercases and strips spaces/dashes, so "abcd-efgh" and "ABCD EFGH" both work. */
export function normalizeFriendCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidFriendCode(input: string): boolean {
  const code = normalizeFriendCode(input);
  return code.length === FRIEND_CODE_LENGTH && [...code].every((c) => FRIEND_CODE_ALPHABET.includes(c));
}

/** "ABCDEFGH" → "ABCD-EFGH" for display. */
export function formatFriendCode(code: string): string {
  const c = normalizeFriendCode(code);
  return c.length === FRIEND_CODE_LENGTH ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/**
 * Web invite link: the site's home page with ?add=CODE. A query on the home
 * page works on every static host (deep paths need host rewrites); the app
 * turns it into the Add friends screen with the code filled in.
 */
export function webInviteLink(code: string, webUrl: string): string {
  return `${webUrl.replace(/\/+$/, '')}/?add=${normalizeFriendCode(code)}`;
}

/**
 * Text for the Share sheet. With the website's address, the invite also has a
 * web link that works for anyone; the app link opens the installed app.
 */
export function friendShareMessage(code: string, webUrl: string | null = null): string {
  const c = normalizeFriendCode(code);
  const lines = [`Add me on Flow State and let's stay hydrated together! 💧`, `My friend code: ${formatFriendCode(code)}`];
  if (webUrl) lines.push(webInviteLink(c, webUrl));
  lines.push(`${INVITE_LINK_PREFIX}${c}`);
  return lines.join('\n');
}

let inviteTaken = false;

/**
 * On the website, the friend code from a ?add=CODE invite link, once per page
 * load (so closing Add friends doesn't reopen it). Null elsewhere.
 */
export function takeWebInviteCode(search: string | null = typeof window !== 'undefined' ? window.location?.search ?? null : null): string | null {
  if (inviteTaken || !search) return null;
  const raw = new URLSearchParams(search).get('add');
  if (!raw || !isValidFriendCode(raw)) return null;
  inviteTaken = true;
  return normalizeFriendCode(raw);
}

/** For tests. */
export function resetWebInviteForTests(): void {
  inviteTaken = false;
}
