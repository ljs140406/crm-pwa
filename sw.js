// 客户跟进管理系统 — Service Worker（PWA 离线缓存）
// 仅缓存同源 GET 请求；Gist 等外部请求直接走网络，不缓存。
const CACHE = 'crm-pwa-v1';
const PRECACHE = ['./', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(PRECACHE.map((u) => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 只处理同源请求；外部（Gist 同步等）放行走网络
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      if (resp && resp.status === 200 && resp.type === 'basic') {
        cache.put(req, resp.clone());
      }
      return resp;
    } catch (err) {
      const fallback = await cache.match('./');
      return fallback || new Response('离线且无可用的缓存内容', {
        status: 503,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
    }
  })());
});
