/**
 * FlowPass — Firebase Messaging Service Worker
 *
 * Handles background push notifications when the browser tab
 * is closed or the app is not in focus. Tapping the notification
 * opens the attendee's live pass directly.
 *
 * Google Service: Firebase Cloud Messaging (Free — Unlimited)
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

/**
 * Firebase config is injected at build time via the VAPID key.
 * The service worker only needs minimal config for message handling.
 * Full config is read from the query param set during SW registration.
 */
firebase.initializeApp({
  apiKey: self.__FIREBASE_CONFIG__?.apiKey || '',
  projectId: self.__FIREBASE_CONFIG__?.projectId || '',
  messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId || '',
  appId: self.__FIREBASE_CONFIG__?.appId || '',
});

const messaging = firebase.messaging();

/**
 * Handle background messages (when the tab is closed / app not in focus).
 * FCM auto-displays notifications if the payload contains a `notification` key.
 * For data-only messages, we construct the notification manually.
 */
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || '🟢 FlowPass Exit Alert';
  const body = data.body || 'Your zone is now open! Check your pass.';

  const options = {
    body,
    icon: '/flowpass-icon.png',
    badge: '/flowpass-badge.png',
    tag: `flowpass-${data.zoneId || 'alert'}`,
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.passUrl || '/',
    },
    actions: [
      { action: 'open', title: '🎫 Open My Pass' },
    ],
  };

  self.registration.showNotification(title, options);
});

/**
 * Handle notification click — open the attendee's pass URL
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a FlowPass tab is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('/pass/') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new tab
      return self.clients.openWindow(targetUrl);
    })
  );
});
