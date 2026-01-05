
const CACHE_NAME = 'family-budget-v3-offline';

// Files to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // CRITICAL: Exclude Firebase Auth, Firestore, Storage, and Google APIs from Service Worker interception.
  // Intercepting 'identitytoolkit' or 'securetoken' causes 'auth/network-request-failed'.
  if (
      url.includes('firestore.googleapis.com') || 
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('firebasestorage.googleapis.com') ||
      url.includes('google.com') ||
      url.includes('googleapis.com') || // Catch-all for other Google APIs
      url.includes('chrome-extension') ||
      event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Stale-While-Revalidate strategy
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache valid responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed (offline)
      });

      return cachedResponse || fetchPromise;
    })
  );
});
