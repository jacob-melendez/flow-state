/**
 * Best-effort background re-sync (e.g. to restore daily reminders after a
 * pause ends without the app being opened, and to back up the water log). iOS decides when this runs, often
 * overnight, so the app never depends on it.
 *
 * Must be imported at app startup so the task is defined before iOS runs it.
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { runCloudSync } from './cloud/account';
import { reportImpactStats } from './cloud/impact';
import { BACKGROUND_SYNC_TASK } from './config';
import { syncReminders } from './sync';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    await syncReminders();
    await runCloudSync(); // no-op when signed out or without a backend
    await reportImpactStats(); // no-op when turned off or without a backend
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK)) return;
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, { minimumInterval: 6 * 60 });
  } catch (e) {
    // Not available in Expo Go or on web; reminders work without it.
    console.warn('Background sync unavailable', e);
  }
}
