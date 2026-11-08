/**
 * Thin wrapper around expo-notifications. All scheduling decisions are made by
 * the pure `buildSchedule`; this file only talks to the OS.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import {
  ACTIONS_OPEN_APP,
  ACTION_LOG_CUP,
  ACTION_SNOOZE_1H,
  ANDROID_CHANNEL_ID,
  NOTIFICATION_CATEGORY,
  REMINDER_ID_PREFIX,
} from '../config';
import { PlannedReminder } from '../scheduling/buildSchedule';
import { messageForSlot } from './messages';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

let configured = false;

/** Call once at startup: foreground display behaviour, action buttons, Android channel. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Water reminders',
      importance: AndroidImportance.HIGH,
    });
  }

  try {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
      { identifier: ACTION_LOG_CUP, buttonTitle: 'I drank a cup 💧', options: { opensAppToForeground: ACTIONS_OPEN_APP } },
      { identifier: ACTION_SNOOZE_1H, buttonTitle: 'Snooze 1 hr', options: { opensAppToForeground: ACTIONS_OPEN_APP } },
    ]);
  } catch (e) {
    // Categories aren't available on every platform (e.g. web); reminders still work.
    console.warn('Could not register notification actions', e);
  }
}

function toPermissionState(p: Notifications.NotificationPermissionsStatus): PermissionState {
  if (p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermission(): Promise<PermissionState> {
  return toPermissionState(await Notifications.getPermissionsAsync());
}

export async function requestPermission(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return toPermissionState(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
}

function toTrigger(r: PlannedReminder): Notifications.NotificationTriggerInput {
  const channelId = Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined;
  if (r.trigger.kind === 'daily') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: r.trigger.hour,
      minute: r.trigger.minute,
      channelId,
    };
  }
  return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.trigger.at, channelId };
}

/** IDs of reminder notifications currently pending with the OS. */
export async function getScheduledReminderIds(): Promise<string[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.map((n) => n.identifier).filter((id) => id.startsWith(REMINDER_ID_PREFIX));
}

/** Replace all pending reminders with `plan`. Leaves other notifications (e.g. tests) alone. */
export async function applyPlan(plan: PlannedReminder[]): Promise<void> {
  const existing = await getScheduledReminderIds();
  await Promise.all(existing.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  for (const r of plan) {
    const { title, body } = messageForSlot(r.slotIndex);
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title, body, sound: true, categoryIdentifier: NOTIFICATION_CATEGORY, data: { kind: 'reminder' } },
      trigger: toTrigger(r),
    });
  }
}

/** Sends a reminder in a few seconds so students can see what they look like. */
export async function sendTestReminder(seconds = 10): Promise<void> {
  const { title, body } = messageForSlot(0);
  await Notifications.scheduleNotificationAsync({
    identifier: `test-${Date.now()}`,
    content: { title, body, sound: true, categoryIdentifier: NOTIFICATION_CATEGORY, data: { kind: 'test' } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
    },
  });
}
