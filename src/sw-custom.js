// ============================================
// 오구톡 커스텀 Service Worker
// vite-plugin-pwa injectManifest 모드
// ============================================

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

// Workbox 자동 캐싱 (빌드 시 __WB_MANIFEST 주입)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Push 이벤트 수신 ──────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Push received')

  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = {
      title: '⏱️ 오구!',
      body: '벌써 59분이에요! 잠깐 쉬어가세요.',
    }
  }

  const options = {
    body: data.body || '벌써 59분이에요! 잠깐 쉬어가세요.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'ogutalk-alarm',
    requireInteraction: false,
    vibrate: [250, 120, 250, 120, 400],
    data: {
      hour: data.hour,
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'checkin', title: '✅ 체크인' },
      { action: 'dismiss', title: '닫기' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || '⏱️ 오구!',
      options
    )
  )
})

// ── 알림 클릭 핸들러 ─────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'
  const hour = event.notification.data?.hour

  // 체크인 액션 시 쿼리 파라미터 추가
  const fullUrl = event.action === 'checkin' && hour !== undefined
    ? `${urlToOpen}?action=checkin&hour=${hour}`
    : urlToOpen

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(fullUrl)
          return
        }
      }
      // 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(fullUrl)
      }
    })
  )
})

// ── 푸시 구독 변경 감지 ────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed')
  // 재구독 처리 — 앱 열릴 때 usePushNotification에서 감지해 DB 업데이트
})
