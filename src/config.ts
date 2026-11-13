/**
 * App-wide constants. Product decisions live here so they're easy to change.
 */

/** Name shown on the home screen (also set as `expo.name` in app.json). */
export const APP_NAME = 'Flow State';

/**
 * Full name used inside the app. Kept in one place while the team confirms
 * how the Stanford name may be used.
 */
export const APP_FULL_NAME = 'Stanford Flow State';

export const ORG_NAME = 'SENSA Impact Labs · Health & Wellness';

/** SENSA's website, shown in Settings → About when set. */
export const SENSA_URL: string | null = null;

/** Reminder interval: any multiple of 15 minutes from 15 min to 3 hours (scroll wheel). */
export const INTERVAL_MIN = 15;
export const INTERVAL_MAX = 180;
export const INTERVAL_STEP = 15;
export type IntervalMinutes = number;

/** Rounds to the 15-minute grid and keeps it within 15 min – 3 h. */
export function normalizeInterval(minutes: number): IntervalMinutes {
  const rounded = Math.round(minutes / INTERVAL_STEP) * INTERVAL_STEP;
  return Math.min(INTERVAL_MAX, Math.max(INTERVAL_MIN, Number.isFinite(rounded) ? rounded : DEFAULT_INTERVAL));
}

/** Every allowed interval, for the picker. */
export const INTERVAL_CHOICES: IntervalMinutes[] = Array.from(
  { length: (INTERVAL_MAX - INTERVAL_MIN) / INTERVAL_STEP + 1 },
  (_, i) => INTERVAL_MIN + i * INTERVAL_STEP,
);

/** One logged "cup" is 8 fl oz (~237 mL). */
export const CUP_OZ = 8;

export const DEFAULT_GOAL_CUPS = 8;
export const MIN_GOAL_CUPS = 1;
export const MAX_GOAL_CUPS = 20;

export const DEFAULT_INTERVAL: IntervalMinutes = 60;
/** Minutes after midnight, local time. */
export const DEFAULT_ACTIVE_START = 9 * 60; // 9:00 AM
export const DEFAULT_ACTIVE_END = 21 * 60; // 9:00 PM

/**
 * iOS keeps at most 64 pending local notifications per app. Budget:
 * up to 58 reminder times a day + 2 catch-up check-ins + 1 test reminder,
 * with a little room to spare. 58 slots = a 14 h 15 min window at 15-minute
 * intervals (both ends inclusive); at the default 1 hour it's never reached.
 */
export const MAX_DAILY_SLOTS = 58;
export const CHECK_IN_ID_PREFIX = 'hydrate-checkin-';

/** Prefix for every reminder notification identifier we schedule. */
export const REMINDER_ID_PREFIX = 'hydrate-';

export const NOTIFICATION_CATEGORY = 'hydration-reminder';
export const ANDROID_CHANNEL_ID = 'hydration-reminders';

export const ACTION_LOG_CUP = 'log-cup';
export const ACTION_SNOOZE_1H = 'snooze-1h';

/**
 * Whether tapping a notification action button opens the app.
 * iOS doesn't deliver action taps to the app when it has been fully closed
 * unless the action opens the app, so we open it to be reliable. Set to
 * `false` for silent actions once tested on devices (works when the app is
 * backgrounded, but taps are lost if the app was killed).
 */
export const ACTIONS_OPEN_APP = true;

export const BACKGROUND_SYNC_TASK = 'flow-state-reminder-sync';

/**
 * Anonymous impact stats (see supabase/migrations/20261112000000_impact_stats.sql).
 * On by default with disclosure in onboarding and Settings. If the team's
 * advisor/IRB requires opt-in, set this to false.
 */
export const IMPACT_STATS_DEFAULT = true;
/** How many past days the app will catch up on if it wasn't opened for a while. */
export const IMPACT_LOOKBACK_DAYS = 7;

/**
 * Public URL of the privacy policy (PRIVACY.md), shown in Settings when set.
 * The App Store requires one; host it (e.g. GitHub Pages or a Google Doc) and paste the link here.
 */
export const PRIVACY_POLICY_URL: string | null = null;

/** Store links shown on the website's "Get the app" card once the apps are published. */
export const APP_STORE_URL: string | null = null;
export const PLAY_STORE_URL: string | null = null;

/**
 * Public URL of the Flow State website (no trailing slash), e.g.
 * "https://flowstate.example.org". When set, friend invites include a web link
 * (https://…/add-friend/CODE) that works for anyone, with or without the app.
 */
export const WEB_URL: string | null = null;
