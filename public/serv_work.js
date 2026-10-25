const CACHE_PREFIX = 'goget-offline-';
const CACHE_NAME = `${CACHE_PREFIX}v4`;
const OFFLINE_URL = '/offline.html';
const OFFLINE_ASSETS = [
    '/img/antenna.png',
    '/img/goget.svg',
    '/img/goget-mono.svg',
    '/img/search_icon.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            const requests = [OFFLINE_URL, ...OFFLINE_ASSETS].map((url) =>
                new Request(url, { cache: 'reload' }));
            return cache.addAll(requests);
        }),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();

            for (const name of cacheNames) {
                if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) {
                    await caches.delete(name);
                }
            }
            await self.clients.claim();
        })(),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
    if (OFFLINE_ASSETS.includes(url.pathname)) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(CACHE_NAME);
                const cached = await cache.match(url.pathname);
                return cached ?? fetch(request);
            })(),
        );
        return;
    }

    if (request.mode !== 'navigate') return;

    event.respondWith(
        (async () => {
            try {
                return await fetch(request);
            } catch {
                const cache = await caches.open(CACHE_NAME);
                const offlinePage = await cache.match(OFFLINE_URL);
                return offlinePage ?? Response.error();
            }
        })(),
    );
});
