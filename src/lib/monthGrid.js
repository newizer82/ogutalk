// ── 월간 캘린더 격자 (순수 로직) ────────────────────────────────
// 화면은 여기서 만든 배열만 그린다 — node 로 검증할 수 있게 떼어 둔다.

export const dateKey = (d) => {
  const x = d instanceof Date ? d : new Date(d)
  const p = n => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
}

/**
 * 해당 월 격자 — 일요일 시작, 주 단위 배열.
 * 앞뒤 달 날짜로 칸을 채우되 필요한 주(4~6)만 만든다. 빈 줄은 남기지 않는다.
 */
export function monthCells(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const weeks = []
  let cur = new Date(year, month, 1 - first.getDay())
  while (cur <= last) {
    const row = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + i)
      row.push({ key: dateKey(d), day: d.getDate(), inMonth: d.getMonth() === month, weekday: i })
    }
    weeks.push(row)
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7)
  }
  return weeks
}

/**
 * 같은 일정 중복 제거 — 계정을 여러 개 붙이면(구글·삼성·카카오) 같은 일정이
 * 캘린더마다 하나씩 들어온다. 제목+시작시각이 같으면 한 건으로 본다.
 * 먼저 온 것(= 사용자가 고른 캘린더 순서상 앞선 것)을 남긴다.
 */
export function dedupeEvents(events = []) {
  const seen = new Set()
  const out = []
  for (const e of events) {
    const k = `${(e?.title ?? '').trim()}|${e?.startMs ?? ''}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(e)
  }
  return out
}

/** 기기 일정을 날짜별로 묶는다. 여러 날에 걸친 일정은 시작일에만 센다 (ponytail: 칸이 작다) */
export function eventsByDay(events = []) {
  const map = {}
  for (const e of events) {
    if (!e?.startMs) continue
    const k = dateKey(e.startMs)
    if (!map[k]) map[k] = []
    map[k].push(e)
  }
  for (const k of Object.keys(map)) map[k].sort((a, b) => a.startMs - b.startMs)
  return map
}

/** 'YYYY-MM-DD' 는 그대로 쓴다 — new Date() 로 돌리면 UTC 로 읽혀 하루가 밀린다 */
const dayOf = v => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : dateKey(v))

/** 기간 일정이 덮는 날짜들. 하루짜리면 한 칸, end_date 가 있으면 그 사이 전부 */
export function spanDays(todo) {
  const start = todo?.due_date ? dayOf(todo.due_date) : null
  if (!start) return []
  const end = todo?.end_date ? dayOf(todo.end_date) : start
  if (end <= start) return [start]
  const out = []
  // 로컬 자정으로 만든다 (new Date('2026-10-15') 는 UTC 라 하루가 밀린다)
  for (let d = new Date(`${start}T00:00:00`); dateKey(d) <= end; d.setDate(d.getDate() + 1)) {
    out.push(dateKey(d))
    if (out.length > 366) break        // 잘못된 end_date 로 무한 루프에 빠지지 않게
  }
  return out
}

/** 할일·약속·일정을 날짜별로 묶는다. 기간 일정은 덮는 날짜마다 들어간다 */
export function todosByDay(todos = []) {
  const map = {}
  for (const t of todos) {
    for (const k of spanDays(t)) {
      if (!map[k]) map[k] = []
      map[k].push(t)
    }
  }
  return map
}

/**
 * 기간 선택 → 실제 구간 { start, end }.
 *   주간  고른 날이 속한 주의 일요일~토요일
 *   월간  고른 날이 속한 달의 1일~말일
 *   2~6일 고른 날부터 N일
 * 주간·월간은 고른 날이 아니라 "그 주/그 달" 전체다 — 10/15 에 월간을 고르면 10/1~10/31.
 */
export function spanRange(startKey, span) {
  const d = new Date(`${startKey}T00:00:00`)
  if (span === 'week') {
    const sun = new Date(d); sun.setDate(d.getDate() - d.getDay())
    const sat = new Date(sun); sat.setDate(sun.getDate() + 6)
    return { start: dateKey(sun), end: dateKey(sat) }
  }
  if (span === 'month') {
    const first = new Date(d.getFullYear(), d.getMonth(), 1)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return { start: dateKey(first), end: dateKey(last) }
  }
  const days = Number(span)
  if (!Number.isFinite(days) || days < 2) return { start: startKey, end: startKey }
  const end = new Date(d); end.setDate(d.getDate() + days - 1)
  return { start: startKey, end: dateKey(end) }
}

/** 오구 지수 → 칸 배경. 점수가 없는 날은 투명 (0점과 '안 쟀음'은 다르다) */
export function scoreTint(score) {
  if (typeof score !== 'number') return 'transparent'
  if (score >= 80) return 'rgba(255,107,44,0.30)'
  if (score >= 60) return 'rgba(255,107,44,0.18)'
  if (score > 0) return 'rgba(255,107,44,0.08)'
  return 'transparent'
}

/** 격자 전체가 덮는 구간 [시작, 끝] — 일정 조회 범위 (앞뒤 달 칸까지 포함) */
export function gridRange(weeks) {
  const firstKey = weeks[0][0].key
  const lastKey = weeks[weeks.length - 1][6].key
  return [
    new Date(`${firstKey}T00:00:00`).getTime(),
    new Date(`${lastKey}T23:59:59`).getTime(),
  ]
}

/**
 * 여러 날에 걸친 일정을 띠로 그리기 위한 조각 (순수).
 *
 * 점만 찍으면 10/25~26 짜리가 "따로 있는 이틀" 로 보인다.
 * 띠는 날과 날을 이어 붙여야 하루짜리와 구별된다.
 *
 * 하루짜리는 넣지 않는다 — 점으로 충분하고, 띠로 그리면 점과 구분이 안 된다.
 *
 * @returns { 'YYYY-MM-DD': { start, end } }
 *   start/end = 그 칸이 띠의 시작/끝인가 (가운데면 둘 다 false → 양옆으로 이어진다)
 */
export function spanSegments(todos = []) {
  const map = {}
  for (const t of todos) {
    const days = spanDays(t)
    if (days.length < 2) continue
    days.forEach((k, i) => {
      const cur = map[k] ?? { start: false, end: false }
      if (i === 0) cur.start = true
      if (i === days.length - 1) cur.end = true
      map[k] = cur
    })
  }
  return map
}
