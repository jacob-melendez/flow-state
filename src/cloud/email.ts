export const STANFORD_DOMAIN = '@stanford.edu';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** True for a plausible address ending in exactly @stanford.edu. */
export function isStanfordEmail(email: string): boolean {
  const e = normalizeEmail(email);
  return /^[^\s@]+@stanford\.edu$/.test(e);
}

/** Lets students type just their SUNet ID ("jdoe" → "jdoe@stanford.edu"). */
export function completeStanfordEmail(input: string): string {
  const e = normalizeEmail(input);
  return e.includes('@') || e === '' ? e : `${e}${STANFORD_DOMAIN}`;
}
