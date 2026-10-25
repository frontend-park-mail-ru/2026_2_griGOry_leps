const CACHE_PREFIX = 'goget-offline-';
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const OFFLINE_URL = '/offline.html';
const OFFLINE_ICON_URL = '/img/sparkles.svg';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([OFFLINE_URL, OFFLINE_ICON_URL]);
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
        })(),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
    if (url.pathname === OFFLINE_ICON_URL) {
        event.respondWith(
            (async () =>{
                const cache = await caches.open(CACHE_NAME);
                const cached = await cache.match(OFFLINE_ICON_URL);
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
