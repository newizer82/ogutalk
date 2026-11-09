// ── 볼 캘린더 고르기 (순수 로직) ────────────────────────────────
// calendarIds 가 빈 배열이면 "전체" 다 — 새 캘린더가 생겨도 자동으로 들어온다.

/** 계정 이름. 삼성 계정은 ACCOUNT_NAME 이 숫자라 그대로 보여주면 뜻도 없고 개인정보만 노출된다 */
export function accountLabel(c) {
  const type = c.accountType || ''
  if (/samsung|osp\.app/i.test(type)) return '삼성 계정'
  if (/local/i.test(type)) return '내 휴대폰'
  return c.account || '기타'
}

/** 계정별로 묶는다 → [{ key, label, items }] (캘린더가 많은 계정이 위) */
export function groupCalendars(cals) {
  const groups = new Map()
  for (const c of cals) {
    const key = `${c.accountType || ''}|${c.account || ''}`
    if (!groups.has(key)) groups.set(key, { key, label: accountLabel(c), items: [] })
    groups.get(key).items.push(c)
  }
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length)
}

export const isCalendarOn = (calendarIds, id) => calendarIds.length === 0 || calendarIds.includes(id)

/**
 * ids 를 켜거나 끈 다음 상태. 전부 끄게 되면 null (아무 일정도 안 보이게 되므로 거절).
 * 처음 손대는 순간 "전체"를 실제 목록으로 펼친다 — 하나만 끄려던 건데 하나만 켜지면 당황한다.
 */
export function nextCalendarIds(cals, calendarIds, ids, on) {
  const base = new Set(calendarIds.length ? calendarIds : cals.map(c => c.id))
  for (const id of ids) on ? base.add(id) : base.delete(id)
  if (base.size === 0) return null
  return base.size === cals.length ? [] : cals.map(c => c.id).filter(id => base.has(id))
}
