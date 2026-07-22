const CACHE_NAME = 'wetravel-v78';
const ASSETS = [
  './index.html',
  './manifest.json',
  './vendor/tailwind-3.4.16.js',
  './vendor/vue-3.5.13.esm-browser.prod.js',
  './vendor/sortable-1.15.6.min.js',
  './vendor/phosphor/bold/style.css',
  './vendor/phosphor/bold/Phosphor-Bold.woff2',
  './vendor/phosphor/fill/style.css',
  './vendor/phosphor/fill/Phosphor-Fill.woff2',
  './vendor/phosphor/duotone/style.css',
  './vendor/phosphor/duotone/Phosphor-Duotone.woff2',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+JP:wght@400;500;700;900&family=Noto+Sans+TC:wght@300;400;500;700&display=swap'
];

// 不快取的網址模式（API、Firestore、動態資源）
const NO_CACHE_PATTERNS = [
  'firestore.googleapis.com',
  'www.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'nominatim.openstreetmap.org',
  'api.open-meteo.com',
  'api.exchangerate-api.com',
  'firebase',
  'app.js',
  'checklist-data.js'
];

// 需要 Network First 的檔案（確保每次開啟都拿最新版）
const NETWORK_FIRST_PATTERNS = [
  'index.html',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  // 清除舊版快取
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => clients.claim())
      .then(() => {
        // 通知所有客戶端（頁面）新版本已啟用，觸發重載
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 如果請求符合不快取的模式，直接走網路
  const shouldSkipCache = NO_CACHE_PATTERNS.some(pattern => url.includes(pattern));
  if (shouldSkipCache) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // index.html 和 manifest.json：Network First（優先拿最新版，離線時用快取）
  const isNetworkFirst = NETWORK_FIRST_PATTERNS.some(pattern => url.includes(pattern));
  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 拿到新版後更新快取
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 其餘靜態資源（字體、圖示庫等）：快取優先，找不到再走網路
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
