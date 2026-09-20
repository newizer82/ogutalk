// ── 자동 체크인 슬롯 계산 (순수 로직, 브라우저 의존성 없음) ──────
// 슬롯 = 30분, 정각 기준 :00~:29 / :30~:59

export const SLOT_MS         = 30 * 60 * 1000
export const MIN_ACTIVE_MS   = 5 * 60 * 1000        // 이 미만 사용한 슬롯은 기록 안 함
export const MAX_BACKFILL_MS = 24 * 60 * 60 * 1000  // 소급 상한

// 진행 중인 슬롯은 이 비율 이상 지났을 때만 기록 대상에 넣는다.
// (알람이 울리는 :59 에는 29/30분이 지나 포함되고, 임의 시점에 앱을 열었을 때는
//  반쪽짜리 슬롯이 기록돼 멱등 규칙에 막혀 영영 갱신되지 않는 일을 막는다)
const SLOT_COMPLETE_RATIO = 0.9

export function floorToSlot(ms) {
  const d = new Date(ms)
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30)
  return d.getTime()
}

export function slotKey(startMs) {
  const d = new Date(startMs)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
       + `T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function buildSlots(lastBackfillAt, now, existingKeys = new Set()) {
  const current = floorToSlot(now)
  const elapsed = now - current
  // 마지막으로 기록 가능한 슬롯
  const lastEligible = elapsed >= SLOT_MS * SLOT_COMPLETE_RATIO
    ? current
    : current - SLOT_MS

  const earliest = floorToSlot(now - MAX_BACKFILL_MS)
  let start = lastBackfillAt ? floorToSlot(lastBackfillAt) : earliest
  if (start < earliest) start = earliest

  const out = []
  for (let s = start; s <= lastEligible; s += SLOT_MS) {
    const key = slotKey(s)
    if (existingKeys.has(key)) continue
    out.push({ start: s, end: s + SLOT_MS, key, hour: new Date(s).getHours() })
  }

  // 24시간 상한 적용: 정확히 48슬롯 초과 방지
  while (out.length > 48) {
    out.shift()
  }

  return out
}
