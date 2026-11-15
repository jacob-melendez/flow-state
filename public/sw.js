// Flow State website service worker.
// Only used to show the "Send a test notification" preview: some browsers
// (Android Chrome) can show notifications only through a service worker.
// It doesn't cache anything or work offline.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Tapping the notification brings the site to the front (or opens it).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => 'focus' in w);
      return open ? open.focus() : self.clients.openWindow('/');
    }),
  );
});
