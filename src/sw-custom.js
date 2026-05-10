// ============================================
// 오구톡 Service Worker v5
// - Workbox 프리캐싱
// - 웹 환경 백그라운드 알람 타이머 (정확한 setTimeout 방식)
// - 활성화 시 모든 옛 캐시 완전 삭제 + 클라이언트 재로드 명령
// ============================================

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 옛 캐시 완전 삭제 (workbox 프리캐시 포함 — 새 매니페스트가 다시 채움)
    const keys = await caches.keys()
    await Promise.all(keys.map(k => caches.delete(k)))
    await self.clients.claim()
    // 핵심: 모든 클라이언트를 강제 navigate 시켜 새 번들 로드
    // postMessage 방식은 옛 번들에 리스너가 없으면 무시되므로 SW 자체가 reload 트리거
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      try { await c.navigate(c.url) } catch (_) {
        try { c.postMessage({ type: 'SW_FORCE_RELOAD' }) } catch (__) {}
      }
    }
  })())
})

// ── 웹 백그라운드 알람 관리 ──────────────────────────────────────
// 앱→SW: postMessage({ type: 'OGU_SYNC_HOURS', alarmHours: {...} })
// SW→앱: postMessage({ type: 'OGU_ALARM_FIRED', hour: N })

let _alarmHours = {}
let _timerId    = null
let _lastFiredHour = -1

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data) return
  if (data.type === 'OGU_SYNC_HOURS') {
    _alarmHours = data.alarmHours || {}
    _scheduleNext()
  }
})

function _scheduleNext() {
  if (_timerId !== null) { clearTimeout(_timerId); _timerId = null }

  const next = _findNext(_alarmHours)
  if (!next) return

  const delay = next.fireAt - Date.now()
  // 과거이거나 25시간 초과면 건너뜀
  if (delay < 0 || delay > 25 * 3_600_000) return

  _timerId = setTimeout(async () => {
    _timerId = null
    const fireHour    = new Date(next.fireAt).getHours()
    const targetHour  = next.targetHour

    if (_lastFiredHour !== fireHour) {
      _lastFiredHour = fireHour
      try {
        await self.registration.showNotification(`⏱️ 곧 ${targetHour}시!`, {
          body:    `잠깐, 곧 ${targetHour}시가 됩니다. 잠깐 쉬어가세요.`,
          icon:    '/icon-192.png',
          badge:   '/icon-192.png',
          tag:     'ogu-alarm',
          renotify: true,
        })
      } catch (_) {}

      // 앱이 열려있으면 팝업 트리거
      const cs = await self.clients.matchAll({ type: 'window' })
      cs.forEach(c => c.postMessage({ type: 'OGU_ALARM_FIRED', hour: targetHour }))
    }

    // 61초 후 다음 알람 예약 (같은 59분에 중복 발동 방지)
    setTimeout(() => _scheduleNext(), 61_000)
  }, delay)
}

// 다음 활성 시간대의 59분 시각 탐색 (최대 25시간 앞)
// alarmHours[7]=true → fireAt = 6:59 (targetHour=7)
function _findNext(alarmHours) {
  const now = Date.now()
  const base = new Date()
  for (let i = 0; i <= 24; i++) {
    const t = new Date(base)
    t.setHours(base.getHours() + i, 59, 0, 0)
    if (t.getTime() <= now) continue
    const fireHour   = t.getHours()
    const targetHour = (fireHour + 1) % 24
    if (alarmHours[targetHour]) return { fireAt: t.getTime(), targetHour }
  }
  return null
}
