/**
 * Watches for drinking too much (see src/domain/hydrationSafety.ts) and tells
 * the student to take a break: an alert if the app is open, otherwise a
 * notification (e.g. after logging from a reminder's "I drank a cup" button).
 * Each rule (fast drinking / daily total) warns at most once per day.
 */
import { Alert, AppState, Platform } from 'react-native';

import { dateKey } from './domain/time';
import { presentNow } from './notifications/adapter';
import { SAFETY_MESSAGES } from './notifications/messages';
import { useLog } from './state/logStore';
import { useSettings } from './state/settingsStore';
import { currentToday } from './state/today';

let bound = false;

export function bindHydrationWatch(): void {
  if (bound) return;
  bound = true;
  let lastCount = currentToday().cups;
  useLog.subscribe(() => {
    const today = currentToday();
    const grew = today.cups > lastCount;
    lastCount = today.cups;
    if (!grew || today.intake.level !== 'warning' || !today.intake.reason) return;
    warnOnce(today.intake.reason);
  });
}

function warnOnce(reason: 'total' | 'fast'): void {
  const day = dateKey(Date.now());
  const { lastSafetyWarning } = useSettings.getState();
  if (lastSafetyWarning.some((w) => w.day === day && w.reason === reason)) return;
  useSettings.setState({
    lastSafetyWarning: [...lastSafetyWarning.filter((w) => w.day === day), { day, reason }],
  });

  const { title, body } = SAFETY_MESSAGES[reason];
  if (Platform.OS === 'web' || AppState.currentState === 'active') {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(`${title}\n\n${body}`);
    else Alert.alert(title, body);
  } else {
    presentNow(title, body).catch(() => {});
  }
}
