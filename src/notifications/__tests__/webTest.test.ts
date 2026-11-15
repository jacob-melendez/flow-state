import { webNotificationSupport } from '../webTest';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_MODE = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const CHROME = 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';

describe('webNotificationSupport', () => {
  it('is supported wherever the Notification API exists (desktop, Android Chrome, Home Screen web apps)', () => {
    expect(webNotificationSupport({ hasNotificationApi: true, userAgent: CHROME, maxTouchPoints: 5 })).toBe('supported');
    expect(webNotificationSupport({ hasNotificationApi: true, userAgent: IPHONE, maxTouchPoints: 5 })).toBe('supported');
  });

  it('asks iPhone and iPad Safari users to add the site to the Home Screen', () => {
    expect(webNotificationSupport({ hasNotificationApi: false, userAgent: IPHONE, maxTouchPoints: 5 })).toBe('needs-home-screen');
    expect(webNotificationSupport({ hasNotificationApi: false, userAgent: IPAD_DESKTOP_MODE, maxTouchPoints: 5 })).toBe(
      'needs-home-screen',
    );
  });

  it('is unsupported elsewhere without the API', () => {
    expect(webNotificationSupport({ hasNotificationApi: false, userAgent: CHROME, maxTouchPoints: 0 })).toBe('unsupported');
    expect(webNotificationSupport({ hasNotificationApi: false, userAgent: IPAD_DESKTOP_MODE, maxTouchPoints: 0 })).toBe(
      'unsupported',
    );
  });
});
