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

  // 소급 루프가 어떤 슬롯을 어떤 앱으로 처리했는지 기억한다 (수정 학습이 앱 단위로 대상을 찾기 위함).
  // 메모리에만 두고 저장하지 않는다 — 원시 사용시간을 영속화하지 않는다는 제약을 지킨다.
  const slotOriginRef = useRef([])   // [{ start, pkg, category, saved }]

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

        // 미분류 앱은 기록하지 않지만, 출처는 남긴다 (사용자가 나중에 분류하면 이 슬롯에 채워 넣는다)
        slotOriginRef.current.push({
          start:    slot.start,
          pkg:      top.pkg,
          category,
          saved:    !!category,
        })

        if (!category) continue                       // 미분류 앱은 기록하지 않음

        await saveCheckin(category, userId, slot.start)
        saved++
      }

      // 최근 2시간치만 유지
      const keepFrom = now - 2 * 60 * 60 * 1000
      slotOriginRef.current = slotOriginRef.current.filter(o => o.start >= keepFrom)

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

    // 스펙 6.3: "직전 한 시간에 그 앱으로 기록된 슬롯 전부"를 갱신한다.
    // 체크인 레코드에는 pkg가 없으므로(레코드 형식 불변 제약) 소급 루프가 남긴 출처로 대상을 특정한다.
    const now     = Date.now()
    const hourAgo = now - 60 * 60 * 1000
    const mine    = slotOriginRef.current.filter(
      o => o.pkg === s.pkg && o.start >= hourAgo && o.start <= now,
    )

    // 이미 기록된 슬롯 → 카테고리 갱신
    const toUpdate = mine.filter(o => o.saved).map(o => new Date(o.start).toISOString())
    if (toUpdate.length) await updateCheckinCategory(toUpdate, category, userId)

    // 미분류라 건너뛴 슬롯 → 그 슬롯 시각으로 새로 저장 (슬롯 정렬 유지)
    for (const o of mine.filter(o => !o.saved)) {
      await saveCheckin(category, userId, o.start)
    }

    setLastHourSummary({ ...s, category })
  }, [lastHourSummary, userId])

  return { runBackfill, lastHourSummary, correctLastHour }
}
