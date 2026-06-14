const CACHE = 'bothlingo-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logomark.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
      // Precache the current build's hashed JS/CSS so the offline shell can boot
      // immediately after first install, before any controlled reload.
      try {
        const res = await fetch('/index.html', { cache: 'no-cache' });
        const html = await res.text();
        const assets = Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)).map((m) => m[1]);
        await Promise.all(assets.map((url) => cache.add(url).catch(() => {})));
      } catch {
        // Offline during install: assets get cached lazily by the fetch handler.
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // stale-while-revalidate for same-origin GET assets
  event.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request).then((resp) => {
          // Only cache real asset responses. The SPA server returns index.html
          // (200, text/html) for missing assets, so skip text/html here to avoid
          // poisoning a JS/CSS/image URL with the HTML fallback after a deploy.
          const contentType = resp.headers.get('Content-Type') || '';
          if (resp.ok && !contentType.includes('text/html')) {
            c.put(event.request, resp.clone());
          }
          return resp;
        }).catch(() => cached);

        return cached || networkFetch;
      })
    )
  );
});
