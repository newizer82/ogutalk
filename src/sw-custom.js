// ============================================
// 오구톡 Service Worker v3 (Capacitor 전용)
// 푸시 알람은 Capacitor LocalNotifications 사용
// ============================================

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

// Workbox 자동 캐싱 (빌드 시 __WB_MANIFEST 주입)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// 새 서비스 워커 즉시 활성화 (구버전 대기 없이 바로 교체)
self.addEventListener('install', () => self.skipWaiting())

// 활성화 시: 구버전 캐시 전체 삭제 후 클라이언트 즉시 장악
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !k.includes('workbox-precache-v2'))
          .map(k => {
            console.log('[SW] 구버전 캐시 삭제:', k)
            return caches.delete(k)
          })
      )
    ).then(() => clients.claim())
  )
})
