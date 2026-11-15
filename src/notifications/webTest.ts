import { REMINDER_MESSAGE } from './messages';

/**
 * Website preview of a reminder. Browsers can show a notification while the
 * site is open, but real scheduled reminders need the phone app (or a push
 * server), so this is only a "what it looks like" test.
 */
export type WebNotificationSupport = 'supported' | 'needs-home-screen' | 'unsupported';
export type WebTestResult = 'sent' | 'blocked' | 'needs-home-screen' | 'unsupported' | 'error';

export interface BrowserInfo {
  hasNotificationApi: boolean;
  userAgent: string;
  maxTouchPoints: number;
}

function currentBrowser(): BrowserInfo {
  const hasWindow = typeof window !== 'undefined';
  return {
    hasNotificationApi: hasWindow && 'Notification' in window,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0,
  };
}

/** iPhone/iPad Safari only allows notifications for sites added to the Home Screen. */
export function webNotificationSupport(info: BrowserInfo = currentBrowser()): WebNotificationSupport {
  if (info.hasNotificationApi) return 'supported';
  const ios = /iPhone|iPad|iPod/.test(info.userAgent) || (/Macintosh/.test(info.userAgent) && info.maxTouchPoints > 1);
  return ios ? 'needs-home-screen' : 'unsupported';
}

const ICON = '/icon-192.png';

/** Asks for permission if needed, then shows the reminder after `seconds`. */
export async function sendWebTestNotification(seconds = 5): Promise<WebTestResult> {
  const support = webNotificationSupport();
  if (support !== 'supported') return support;
  try {
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return 'blocked';

    // Register first (while the click still counts as the user's action), show later.
    const registration =
      'serviceWorker' in navigator ? await navigator.serviceWorker.register('/sw.js').catch(() => null) : null;
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

    const { title } = REMINDER_MESSAGE;
    if (registration) {
      await navigator.serviceWorker.ready;
      await registration.showNotification(title, { icon: ICON, badge: ICON, tag: 'flow-state-reminder' });
    } else {
      new Notification(title, { icon: ICON, tag: 'flow-state-reminder' });
    }
    return 'sent';
  } catch {
    return 'error';
  }
}
