import { useState, useCallback, useRef, useEffect } from 'react'
import { buildSlots, slotKey, floorToSlot, MIN_ACTIVE_MS } from '../lib/checkinSlots'
import { categoryForApp } from '../data/appCategories'
import { getUsage, hasUsageAccess } from '../lib/usageStats'
import { saveCheckin, updateCheckinCategory, loadLocalCheckins } from '../lib/checkinStore'
import { logEvent } from '../lib/firebase'

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
  // null=미확인, true/false=확인됨 — 팝업이 "기록 확인 중…" 을 얼마나 보여줄지 판단하는 데 쓰인다.
  // (권한이 아직 없는 상태(null)로 보이면 자동 모드로 간주해 깜빡임을 막고, false 로 확정되면 즉시 수동으로 폴백한다)
  const [hasAccess, setHasAccess] = useState(null)
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
      const access = await hasUsageAccess()
      setHasAccess(access)
      if (!access) return 0

      const now       = Date.now()
      const overrides = loadOverrides()

      // 지난 1시간 요약 — 슬롯 루프 결과와 무관하므로 루프보다 앞에서 계산한다.
      // (네이티브 getUsage 호출을 1회로 줄여 팝업이 "준비 중" 상태로 노출되는 시간을 최소화한다)
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

      const slots = buildSlots(lastRef.current, now, recordedSlotKeys())

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

      // 소급 1회당 1건 — 슬롯마다 남기면 소급 때 최대 48건이 쏟아져 "몇 번 돌았나"가 가려진다.
      // 0건이면 남기지 않는다(앱을 열 때마다 찍히는 노이즈 방지).
      if (saved > 0) logEvent('checkin_saved', { source: 'auto', slots: saved })

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

    // 이미 기록된 슬롯 → 카테고리 갱신 (삽입 루프가 saved를 바꾸기 전에 먼저 확정)
    const updated = mine.filter(o => o.saved)
    const toUpdate = updated.map(o => new Date(o.start).toISOString())
    if (toUpdate.length) {
      await updateCheckinCategory(toUpdate, category, userId)
      for (const o of updated) o.category = category
    }

    // 미분류라 건너뛴 슬롯 → 그 슬롯 시각으로 새로 저장 (슬롯 정렬 유지)
    for (const o of mine.filter(o => !o.saved)) {
      await saveCheckin(category, userId, o.start)
      // 같은 슬롯에 중복 삽입되지 않도록 소비 표시 — 재수정 시에는 갱신 경로를 타게 된다
      o.saved    = true
      o.category = category
    }

    // 대상이 하나도 없다 (5분 컷에 걸렸거나, 앱 재시작으로 ref가 비었거나, 슬롯 최다앱과 1시간 최다앱이 다름).
    // 사용자가 명시적으로 고른 분류이므로 말없이 사라지면 안 된다 — 현재 슬롯에 1건은 남긴다.
    if (!mine.length) {
      const slotStart = floorToSlot(now)
      await saveCheckin(category, userId, slotStart)
      // 같은 호출이 다시 와도(예: 중복 탭) 위 갱신 경로를 타도록 출처를 남겨 멱등성을 지킨다
      slotOriginRef.current.push({ start: slotStart, pkg: s.pkg, category, saved: true })
    }

    setLastHourSummary({ ...s, category })
  }, [lastHourSummary, userId])

  return { runBackfill, lastHourSummary, correctLastHour, hasAccess }
}
