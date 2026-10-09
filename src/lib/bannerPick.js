// ── 배너 고르기 (순수 로직) ─────────────────────────────────────
// 기간이 지난 배너가 홈에 남아 있는 것이 이 기능의 가장 큰 위험이다.
// 종료일을 넘기면 코드 수정 없이 사라지게 하고, 수도 제한한다.
export const MAX_BANNERS = 4

const ms = v => (v == null ? null : new Date(v).getTime())

/**
 * @param list 내장 + 서버 배너
 * @param now  지금 (ms)
 * @returns 노출할 배너 (정렬·개수 제한 적용)
 */
export function pickBanners(list = [], now = Date.now()) {
  const live = list.filter(b => {
    if (!b || !b.text || b.active === false) return false
    const s = ms(b.starts_at ?? b.starts)
    const e = ms(b.ends_at ?? b.ends)
    if (s !== null && !Number.isNaN(s) && now < s) return false
    if (e !== null && !Number.isNaN(e) && now > e) return false
    return true
  })

  // 이벤트는 동시에 한 장만 — 두 장이면 둘 다 안 읽힌다
  const seenEvent = []
  const kept = []
  for (const b of live.slice().sort(bySort)) {
    if (b.kind === 'event') {
      if (seenEvent.length) continue
      seenEvent.push(b)
    }
    kept.push(b)
  }
  return kept.slice(0, MAX_BANNERS)
}

function bySort(a, b) {
  const sa = a.sort ?? 100, sb = b.sort ?? 100
  if (sa !== sb) return sa - sb
  return String(a.id).localeCompare(String(b.id))
}

/** 오늘 하루 안 보기 — 날짜가 바뀌면 자동으로 풀린다 */
export function hiddenToday(storedDate, now = Date.now()) {
  if (!storedDate) return false
  const d = new Date(now)
  const p = n => String(n).padStart(2, '0')
  return storedDate === `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
