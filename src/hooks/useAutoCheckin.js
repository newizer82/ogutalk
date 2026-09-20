import { useState, useCallback, useRef, useEffect } from 'react'
import { buildSlots, slotKey, MIN_ACTIVE_MS } from '../lib/checkinSlots'
import { categoryForApp } from '../data/appCategories'
import { getUsage, hasUsageAccess } from '../lib/usageStats'
import { saveCheckin, updateCheckinCategory, loadLocalCheckins } from '../lib/checkinStore'

const OVERRIDE_KEY = 'ogu_app_category'

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') } catch { return {} }
}
function saveOverride(pkg, category) {
  try {
    const map = loadOverrides()
    map[pkg] = category
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map))
  } catch {}
}

/** 이미 기록된 슬롯 키 집합 (로컬 기록 기준 — 서버는 로컬의 상위집합) */
function recordedSlotKeys() {
  const set = new Set()
  for (const c of loadLocalCheckins()) {
    const t = new Date(c.created_at).getTime()
    if (!Number.isNaN(t)) set.add(slotKey(t))
  }
  return set
}

export function useAutoCheckin({ enabled, userId, lastBackfillAt, setLastBackfillAt }) {
  const [lastHourSummary, setLastHourSummary] = useState(null)
  const running = useRef(false)   // 중복 실행 방지

  // ⚠️ App.jsx 의 setLastBackfillAt 은 매 렌더 새로 만들어지는 화살표 함수다.
  // 의존성 배열에 그대로 넣으면 runBackfill 이 매 렌더 새로 생성되고,
  // 이를 구독하는 useEffect 가 계속 재실행되어 무한 소급 루프가 된다.
  // App.jsx 가 showAlarmPopupRef 등에서 쓰는 것과 같은 ref 패턴으로 고정한다.
  const lastRef    = useRef(lastBackfillAt)
  const setLastRef = useRef(setLastBackfillAt)
  useEffect(() => { lastRef.current    = lastBackfillAt    }, [lastBackfillAt])
  useEffect(() => { setLastRef.current = setLastBackfillAt }, [setLastBackfillAt])

  const runBackfill = useCallback(async () => {
    if (!enabled || running.current) return 0
    running.current = true
    try {
      if (!(await hasUsageAccess())) return 0

      const now       = Date.now()
      const overrides = loadOverrides()
      const slots     = buildSlots(lastRef.current, now, recordedSlotKeys())

      let saved = 0
      for (const slot of slots) {
        const apps = await getUsage(slot.start, slot.end, 3)
        if (!apps.length) continue
        const totalMs = apps.reduce((s, a) => s + a.seconds * 1000, 0)
        if (totalMs < MIN_ACTIVE_MS) continue        // 취침·미사용 구간

        const top = apps[0]
        const category = categoryForApp(top.pkg, overrides)
        if (!category) continue                       // 미분류 앱은 기록하지 않음

        await saveCheckin(category, userId, slot.start)
        saved++
      }

      // 지난 1시간 요약 (팝업 표시용 — 기록 여부와 무관하게 계산)
      const hourAgo = now - 60 * 60 * 1000
      const recent  = await getUsage(hourAgo, now, 3)
      if (recent.length) {
        const top = recent[0]
        setLastHourSummary({
          pkg:      top.pkg,
          label:    top.label,
          minutes:  Math.round(top.seconds / 60),
          category: categoryForApp(top.pkg, overrides),
        })
      } else {
        setLastHourSummary(null)
      }

      setLastRef.current?.(now)
      return saved
    } finally {
      running.current = false
    }
  }, [enabled, userId])   // ← 안정적인 값만. ref 패턴으로 루프를 막는다

  /** 사용자가 알람 팝업에서 분류를 고쳤을 때 */
  const correctLastHour = useCallback(async (category) => {
    const s = lastHourSummary
    if (!s) return
    saveOverride(s.pkg, category)

    // 직전 1시간에 그 앱으로 기록된 슬롯(최대 2건)을 모두 갱신
    const now     = Date.now()
    const hourAgo = now - 60 * 60 * 1000
    const targets = loadLocalCheckins()
      .filter(c => {
        const t = new Date(c.created_at).getTime()
        return t >= hourAgo && t <= now && c.activity_type === s.category
      })
      .map(c => c.created_at)

    if (targets.length) await updateCheckinCategory(targets, category, userId)
    else await saveCheckin(category, userId, now)   // 미분류라 기록이 없던 경우

    setLastHourSummary({ ...s, category })
  }, [lastHourSummary, userId])

  return { runBackfill, lastHourSummary, correctLastHour }
}
