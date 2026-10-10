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

/** 할일을 마감일별로 묶는다 */
export function todosByDay(todos = []) {
  const map = {}
  for (const t of todos) {
    const due = t?.due_date
    if (!due) continue
    // 'YYYY-MM-DD' 는 그대로 쓴다 — new Date() 로 돌리면 UTC 로 읽혀 하루가 밀린다
    const k = /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : dateKey(due)
    if (!map[k]) map[k] = []
    map[k].push(t)
  }
  return map
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
