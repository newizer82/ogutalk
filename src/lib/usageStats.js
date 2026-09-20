// ── UsageStats 브릿지 (안드로이드 전용) ─────────────────────────
// 웹/미지원 환경에서는 모두 안전한 기본값을 반환한다.
import { IS_NATIVE } from './capacitor'

// registerPlugin() 이 반환하는 Proxy 를 async 함수의 반환값으로 내보내면
// Promise 이행 절차가 Proxy.then 접근 → 네이티브에 없는 then() 호출로 이어져 항상 실패한다.
// (capacitor.js 의 requestAudioFocus() 와 동일하게, 모듈 변수에 캐시만 하고
//  절대 async 함수 밖으로 Proxy 자체를 반환하지 않는다.)
let _plugin = null
async function ensurePlugin() {
  if (!IS_NATIVE) return false
  if (!_plugin) {
    const { registerPlugin } = await import('@capacitor/core')
    _plugin = registerPlugin('UsageStats')
  }
  return true
}

export async function hasUsageAccess() {
  try {
    if (!(await ensurePlugin())) return false
    const { granted } = await _plugin.hasAccess()
    return !!granted
  } catch (e) {
    console.warn('[UsageStats] hasUsageAccess 실패:', e)
    return false
  }
}

export async function openUsageSettings() {
  try {
    if (!(await ensurePlugin())) return
    await _plugin.openSettings()
  } catch (e) { console.warn('[UsageStats] 설정 열기 실패:', e) }
}

/** @returns [{pkg, label, seconds}] — 사용시간 내림차순. 실패 시 [] */
export async function getUsage(startMs, endMs, limit = 5) {
  try {
    if (!(await ensurePlugin())) return []
    const { apps } = await _plugin.getUsage({ startMs, endMs, limit })
    return apps || []
  } catch (e) {
    // NO_ACCESS 는 정상적인 미허용 상태 — 조용히 빈 배열
    if (e?.message !== 'NO_ACCESS') console.warn('[UsageStats] getUsage 실패:', e)
    return []
  }
}
