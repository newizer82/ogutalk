// ── 기기 캘린더 브릿지 (안드로이드 전용) ────────────────────────
// 웹/미지원 환경에서는 안전한 기본값을 돌려준다.
// usageStats.js 와 같은 규칙: registerPlugin() 의 Proxy 를 async 함수 밖으로 내보내지 않는다.
// (내보내면 Promise 이행 절차가 Proxy.then 을 건드려 네이티브 호출이 항상 실패한다)
import { IS_NATIVE } from './capacitor'

let _plugin = null
async function ensurePlugin() {
  if (!IS_NATIVE) return false
  if (!_plugin) {
    const { registerPlugin } = await import('@capacitor/core')
    _plugin = registerPlugin('OguCalendar')
  }
  return true
}

export async function hasCalendarPermission() {
  try {
    if (!(await ensurePlugin())) return false
    const { granted } = await _plugin.hasPermission()
    return !!granted
  } catch (e) {
    console.warn('[캘린더] 권한 확인 실패:', e)
    return false
  }
}

export async function requestCalendarPermission() {
  try {
    if (!(await ensurePlugin())) return false
    const { granted } = await _plugin.requestPermission()
    return !!granted
  } catch (e) {
    console.warn('[캘린더] 권한 요청 실패:', e)
    return false
  }
}

/** @returns [{id,title,startMs,endMs,location,allDay,calendar}] 시작 시각 오름차순. 실패 시 [] */
export async function getEvents(startMs, endMs, limit = 5) {
  try {
    // 개발 중 화면 확인용 — 네이티브가 없는 브라우저에서 가짜 일정을 넣는다.
    // import.meta.env.DEV 는 배포 빌드에서 false 로 접혀 이 블록째 사라진다.
    if (import.meta.env.DEV) {
      const raw = localStorage.getItem('ogu_dev_events')
      if (raw) return JSON.parse(raw)
    }
    if (!(await ensurePlugin())) return []
    const { events } = await _plugin.getEvents({ startMs, endMs, limit })
    return events || []
  } catch (e) {
    if (e?.message !== 'NO_PERMISSION') console.warn('[캘린더] 일정 조회 실패:', e)
    return []
  }
}

/** 지도 앱으로 길찾기 — 설치된 앱이 가로채고, 없으면 웹 지도로 열린다 */
export function mapUrlFor(location) {
  return `https://map.naver.com/p/search/${encodeURIComponent(location)}`
}
