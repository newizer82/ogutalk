// ─ 오구톡 사용자 설정 (localStorage) ──────────────────────────────
// 단일 키 'ogu_settings' 객체로 통합 저장.
// 옛 6개 키(ogu_oguTone, ogu_oguRepeat, ogu_alarmMode, ogu_volume,
// ogu_vibStrength, ogu_alarmHours)는 첫 로드 시 자동 마이그레이션 후
// 즉시 삭제됨. 커스텀 알람(ogu_custom_alarms)은 별도 관리(엔티티 리스트).

const SETTINGS_KEY = 'ogu_settings'
const OLD_KEYS = ['oguTone', 'oguRepeat', 'alarmMode', 'volume', 'vibStrength', 'alarmHours']

// 7~23시 활성을 기본값으로
function buildDefaultAlarmHours() {
  const h = {}
  for (let i = 7; i <= 23; i++) h[i] = true
  return h
}

export const DEFAULT_SETTINGS = {
  oguTone:     '오구',
  oguRepeat:   2,
  alarmMode:   'both',     // 'sound' | 'vibrate' | 'both'
  volume:      0.8,        // 0.0 ~ 1.0
  vibStrength: 'medium',   // 'weak' | 'medium' | 'strong'
  alarmHours:  buildDefaultAlarmHours(),
}

// ── 마이그레이션: 옛 6개 키 → 새 통합 키 ───────────────────────
function migrateOldKeys() {
  const merged = { ...DEFAULT_SETTINGS }
  let foundOld = false

  for (const key of OLD_KEYS) {
    try {
      const v = localStorage.getItem('ogu_' + key)
      if (v !== null) {
        merged[key] = JSON.parse(v)
        foundOld = true
      }
    } catch { /* 손상된 값은 기본값 유지 */ }
  }

  if (foundOld) {
    // 새 키에 저장
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged)) } catch {}
    // 옛 키는 즉시 삭제 (한 군데로 정돈)
    for (const key of OLD_KEYS) {
      try { localStorage.removeItem('ogu_' + key) } catch {}
    }
  }

  return { merged, foundOld }
}

// ── 로드: 새 키 우선 → 옛 키 마이그레이션 → 기본값 ────────────
export function loadSettings() {
  // 1) 새 키가 이미 있으면 그대로 사용 (병합으로 누락 필드 방어)
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      return { ...DEFAULT_SETTINGS, ...saved }
    }
  } catch { /* 손상된 새 키는 무시 → 마이그레이션으로 fallback */ }

  // 2) 옛 키 마이그레이션 시도
  const { merged } = migrateOldKeys()
  return merged
}

// ── 저장: 통째로 ──────────────────────────────────────────────
export function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch {}
}
