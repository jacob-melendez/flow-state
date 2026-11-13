/**
 * The water buddy: a little droplet character on the Today screen that grows,
 * fills with water and gets happier as cups are logged. Pure; no UI.
 */
export type BuddyMood = 'thirsty' | 'okay' | 'happy' | 'thrilled' | 'overfull';

export interface BuddyState {
  mood: BuddyMood;
  /** Size relative to full size (MIN_SCALE when empty → 1 at the goal). */
  scale: number;
  /** How full the droplet is with water, 0–1. */
  fill: number;
  /** Short caption under the buddy. */
  caption: string;
}

export const MIN_SCALE = 0.55;

/**
 * @param overfull true when the student is drinking too much (see hydrationSafety):
 * the buddy looks dizzy and asks for a break.
 */
export function buddyState(cups: number, goal: number, overfull = false): BuddyState {
  const progress = goal > 0 ? Math.max(0, cups) / goal : 0;
  const p = Math.min(1, progress);

  let mood: BuddyMood;
  let caption: string;
  if (cups <= 0) {
    mood = 'thirsty';
    caption = 'I’m thirsty! Log your first cup.';
  } else if (p < 0.5) {
    mood = 'okay';
    caption = 'Good start. Keep sipping!';
  } else if (p < 1) {
    mood = 'happy';
    caption = goal - cups === 1 ? 'One more cup to go!' : 'Over halfway there!';
  } else {
    mood = 'thrilled';
    caption = progress > 1 ? 'Goal smashed! 💧' : 'Goal reached! You’re in flow.';
  }

  if (overfull) {
    mood = 'overfull';
    caption = 'Whoa, that’s a lot! Let’s take a break.';
  }

  return {
    mood,
    scale: MIN_SCALE + (1 - MIN_SCALE) * p,
    // A little water shows from the first cup; full at the goal.
    fill: cups <= 0 ? 0.04 : 0.12 + 0.88 * p,
    caption,
  };
}
