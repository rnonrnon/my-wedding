/* Service worker – makes the app open offline and hands calendar files to the iPhone calendar. */
const V = 'mw-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== V && k !== 'ics-v1').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // calendar file created inside the app (never leaves the phone)
  if (url.pathname.includes('/ics/')) {
    e.respondWith(caches.open('ics-v1').then(c => c.match(req.url)).then(r => r || new Response('', {status: 404})));
    return;
  }

  // the page itself: try network first (to get updates), fall back to the saved copy
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (!res.ok) return caches.match('./index.html').then(r => r || res);
      const copy = res.clone(); caches.open(V).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  // icons & files: saved copy first
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); }
    return res;
  })));
});
