/*
 * hq-sw.js — the QuizPe admin's phone alerts (admin revamp, 2026-10-05).
 * Shows a push from the server as a notification; a tap opens the panel.
 * It caches nothing and touches no page — push only.
 */
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'QuizPe admin', body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'QuizPe admin', {
    body: d.body || '', tag: d.tag || undefined, data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
