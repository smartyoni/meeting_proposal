// 미팅 매물 제안서 PWA - Service Worker
const CACHE_NAME = 'meeting-proposal-v1.0.0';
const OFFLINE_URL = '/';

// 캐시할 리소스들
const CACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/config.js',
  '/js/firebase.js',
  '/manifest.json',
  '/icons/icon.svg',
  // CDN 리소스
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Service Worker 설치
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell and resources');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Install complete');
        // 즉시 활성화
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Service Worker 활성화
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 이전 버전 캐시 삭제
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      // 모든 클라이언트 제어
      return self.clients.claim();
    })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', event => {
  // POST 요청은 캐시하지 않음
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 캐시 반환
        if (response) {
          console.log('[SW] Cache hit:', event.request.url);
          return response;
        }

        console.log('[SW] Fetching:', event.request.url);
        
        // 네트워크 요청
        return fetch(event.request)
          .then(response => {
            // 유효한 응답이 아니면 그대로 반환
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답 복사 (스트림은 한 번만 읽을 수 있음)
            const responseToCache = response.clone();

            // 새로운 리소스를 캐시에 추가
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('[SW] Fetch failed:', error);
            
            // 오프라인 상태에서 HTML 요청 시 메인 페이지 반환
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
            
            // 다른 리소스는 에러 반환
            throw error;
          });
      })
  );
});

// 백그라운드 동기화 (미래 확장용)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'proposal-sync') {
    event.waitUntil(
      // 저장된 제안서 데이터를 Firebase에 동기화
      syncProposalData()
    );
  }
});

// 푸시 알림 (미래 확장용)
self.addEventListener('push', event => {
  console.log('[SW] Push received');
  
  const options = {
    body: event.data ? event.data.text() : '새로운 알림이 있습니다.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'meeting-reminder',
    actions: [
      {
        action: 'open',
        title: '앱 열기'
      },
      {
        action: 'close',
        title: '닫기'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('미팅 매물 제안서', options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 제안서 데이터 동기화 함수 (미래 확장용)
async function syncProposalData() {
  try {
    // 로컬 스토리지에서 저장된 제안서 데이터 확인
    // Firebase가 활성화된 경우 동기화 수행
    console.log('[SW] Syncing proposal data...');
    
    // 실제 동기화 로직은 Firebase 설정 후 구현
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    return Promise.reject(error);
  }
}