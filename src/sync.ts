/**
 * Keeps the OS's pending notifications in line with the student's settings:
 * store → buildSchedule → adapter. Safe to call often; it skips work when
 * nothing changed and never runs two syncs at once.
 */
import * as Notifications from 'expo-notifications';

import { ACTION_LOG_CUP, ACTION_SNOOZE_1H } from './config';
import { applyPlan, getPermission, getScheduledReminderIds } from './notifications/adapter';
import { buildSchedule, pauseForHours, planSignature } from './scheduling/buildSchedule';
import { waitForHydration } from './state/hydration';
import { useLog } from './state/logStore';
import { reminderSettingsOf, useSettings } from './state/settingsStore';
import { currentToday } from './state/today';
import { dateKey } from './domain/time';

let queue: Promise<void> = Promise.resolve();
let lastAppliedSignature: string | null = null;

export function syncReminders(): Promise<void> {
  queue = queue.then(runSync).catch((e) => console.warn('Reminder sync failed', e));
  return queue;
}

async function runSync(): Promise<void> {
  await waitForHydration();
  const now = Date.now();

  const { pausedUntil, resume } = useSettings.getState();
  if (pausedUntil != null && pausedUntil <= now) resume();

  const permission = await getPermission();
  const today = currentToday(now);
  const plan =
    permission === 'granted'
      ? buildSchedule(reminderSettingsOf(useSettings.getState()), now, {
          cups: today.cups,
          goal: today.goal,
          quietUntil: today.quietUntil,
        })
      : [];
  const signature = planSignature(plan);

  const scheduled = await getScheduledReminderIds();
  const sameIds = scheduled.length === plan.length && plan.every((r) => scheduled.includes(r.id));
  if (signature === lastAppliedSignature && sameIds) return;

  await applyPlan(plan);
  lastAppliedSignature = signature;
}

let bound = false;

/**
 * Re-sync whenever schedule-related settings change, and whenever today's cups
 * change (logging, undo, a notification action or a cloud merge), so goal-met,
 * catch-up check-ins and drinking-too-much breaks apply right away.
 * Also records goal changes for streak history.
 */
export function bindStoreSync(): void {
  if (bound) return;
  bound = true;
  useSettings.subscribe((s, prev) => {
    if (
      s.enabled !== prev.enabled ||
      s.intervalMinutes !== prev.intervalMinutes ||
      s.activeStartMin !== prev.activeStartMin ||
      s.activeEndMin !== prev.activeEndMin ||
      s.pausedUntil !== prev.pausedUntil ||
      s.afterGoal !== prev.afterGoal ||
      s.checkIns !== prev.checkIns ||
      s.dailyGoal !== prev.dailyGoal ||
      s.calculatorProfile !== prev.calculatorProfile
    ) {
      syncReminders();
    }
    if (s.dailyGoal !== prev.dailyGoal) useLog.getState().recordGoal(s.dailyGoal);
  });
  let lastKey = todayKey();
  useLog.subscribe(() => {
    const key = todayKey();
    if (key !== lastKey) {
      lastKey = key;
      syncReminders();
    }
  });
}

/** Today's live cups and the time of the latest one; changes when cups are logged or removed. */
function todayKey(): string {
  const now = Date.now();
  const t = currentToday(now);
  return `${dateKey(now)}:${t.cups}:${t.lastCupAt ?? ''}`;
}

const handledResponses = new Set<string>();

/** Handles taps on the notification's action buttons. */
export async function handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
  const key = `${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
  if (handledResponses.has(key)) return;
  handledResponses.add(key);

  await waitForHydration();
  const now = Date.now();

  if (response.actionIdentifier === ACTION_LOG_CUP) {
    useLog.getState().logCup(useSettings.getState().dailyGoal, now);
  } else if (response.actionIdentifier === ACTION_SNOOZE_1H) {
    const { pausedUntil, pauseUntil } = useSettings.getState();
    pauseUntil(Math.max(pausedUntil ?? 0, pauseForHours(now, 1)));
  }

  try {
    await Notifications.dismissNotificationAsync(response.notification.request.identifier);
    await Notifications.clearLastNotificationResponseAsync();
  } catch {
    // Not supported everywhere; harmless.
  }
}
