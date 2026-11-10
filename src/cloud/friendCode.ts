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

/** Text for the Share sheet. */
export function friendShareMessage(code: string): string {
  return (
    `Add me on Flow State and let's stay hydrated together! 💧\n` +
    `My friend code: ${formatFriendCode(code)}\n` +
    `${INVITE_LINK_PREFIX}${normalizeFriendCode(code)}`
  );
}
