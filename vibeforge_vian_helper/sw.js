/* Vian Helper SW — self-destruct to clear broken registrations */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Delete all caches left by v1–v15
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
    // Unregister THIS SW so Vian runs like Vvwn — no SW at all
    await self.registration.unregister();
  })());
});
// No fetch handler = pass-through