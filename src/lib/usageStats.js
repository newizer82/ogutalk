// ── UsageStats 브릿지 (안드로이드 전용) ─────────────────────────
// 웹/미지원 환경에서는 모두 안전한 기본값을 반환한다.
import { IS_NATIVE } from './capacitor'

let _plugin = null
async function plugin() {
  if (!IS_NATIVE) return null
  if (!_plugin) {
    const { registerPlugin } = await import('@capacitor/core')
    _plugin = registerPlugin('UsageStats')
  }
  return _plugin
}

export async function hasUsageAccess() {
  try {
    const p = await plugin()
    if (!p) return false
    const { granted } = await p.hasAccess()
    return !!granted
  } catch { return false }
}

export async function openUsageSettings() {
  try {
    const p = await plugin()
    await p?.openSettings()
  } catch (e) { console.warn('[UsageStats] 설정 열기 실패:', e) }
}

/** @returns [{pkg, label, seconds}] — 사용시간 내림차순. 실패 시 [] */
export async function getUsage(startMs, endMs, limit = 5) {
  try {
    const p = await plugin()
    if (!p) return []
    const { apps } = await p.getUsage({ startMs, endMs, limit })
    return apps || []
  } catch (e) {
    // NO_ACCESS 는 정상적인 미허용 상태 — 조용히 빈 배열
    return []
  }
}
