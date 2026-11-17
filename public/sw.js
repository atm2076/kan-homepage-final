// 구버전 검색 페이지가 홈페이지 캐시에 덮어쓰이지 않도록 네비게이션을 분리합니다.
const CACHE_NAME = 'khan-homepage-pwa-v3';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png'
];
const SHELL_FILES = new Set(APP_SHELL.filter((path) => path !== '/'));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    // 상세 매물/검색 전용 페이지를 '/'로 캐시하지 않습니다.
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok && url.pathname === '/') {
          const type = response.headers.get('content-type') || '';
          if (type.includes('text/html')) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put('/', copy))
              .catch(() => {});
          }
        }
        return response;
      }).catch(async () => {
        if (url.pathname === '/' || url.pathname === '/index.html') {
          const cached = await caches.match('/');
          if (cached) return cached;
        }
        // 오프라인에서 잘못된 매물 페이지/홈페이지를 보여주지 않습니다.
        return new Response('<!doctype html><html lang="ko"><meta charset="utf-8"><title>연결 확인</title><body><h1>인터넷 연결이 필요합니다.</h1><p>연결을 확인한 후 다시 시도해 주세요.</p></body></html>', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      })
    );
    return;
  }

  // 버전이 붙은 빌드 자산과 앱 아이콘만 캐시합니다.
  // 매물 사진·검색 응답·API 결과는 장기간 캐시하지 않습니다.
  const cacheable = SHELL_FILES.has(url.pathname)
    || /^\/assets\/[^/]+\.[a-f0-9]{8,}\.(?:js|css)$/iu.test(url.pathname);
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(request, copy))
          .catch(() => {});
      }
      return response;
    }))
  );
});
