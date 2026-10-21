// ── 59분 팝업의 "지금 상황" 판정 (순수 로직, node 에서 검증 가능) ──
// v1.8: 팝업이 "몇 분 썼다"만 알려주고 닫히던 것을 "지금 상태 + 다음 행동 하나"로 바꾼다.
//
// 상태 3종:
//   binge  (순삭)  — 소비가 길게 이어짐 → 끊어줄 할일 1개 제안
//   focus  (집중)  — 생산이 이어짐      → 칭찬만, 할일 제안 안 함 (방해 금지)
//   normal (평소)  — 기본 문구 + 할일 1개 제안
import { groupOf, labelOf } from '../data/appCategories.js'

export const BINGE_APP_MIN   = 40   // 자동 요약 기준: 한 앱을 이만큼 썼으면 순삭
export const STREAK_SLOTS    = 2    // 기록 기준: 최근 N건이 같은 그룹이면 연속으로 본다
const STREAK_WINDOW_MS       = 100 * 60 * 1000  // 연속 판정에 쓸 최근 구간 (슬롯 2칸 + 여유)

/**
 * 체크인 1건이 대표하는 시간(분).
 * 자동 기록은 30분 슬롯 시각(:00/:30)에 저장되고, 수동 체크인은 알람 시점(:59 전후)에 저장된다.
 * ponytail: 레코드에 source 컬럼이 없어 분 단위로 추정한다(notification_log 스키마 불변 제약).
 *           정확한 구분이 필요해지면 그때 컬럼을 추가할 것.
 */
export function minutesOf(entry) {
  const m = new Date(entry.created_at).getMinutes()
  return (m === 0 || m === 30) ? 30 : 60
}

/**
 * 최근 며칠간 축별 시간(분) — 리포트의 "추세" 는 이것뿐이다.
 * 홈이 오늘 하루를 보여주니, 리포트가 같은 걸 또 보여줄 이유가 없다.
 * @returns [{ key:'2026-10-14', label:'14', produce, consume, connect, other, total }] 옛날 → 오늘 순
 */
export function axisMinutesByDay(checkins = [], days = 7, now = Date.now()) {
  const p = n => String(n).padStart(2, '0')
  const keyOf = ms => {
    const d = new Date(ms)
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    out.push({
      key: keyOf(d.getTime()),
      label: String(d.getDate()),
      produce: 0, consume: 0, connect: 0, other: 0, total: 0,
    })
  }
  const index = Object.fromEntries(out.map((r, i) => [r.key, i]))
  for (const c of checkins) {
    const t = new Date(c.created_at).getTime()
    if (Number.isNaN(t)) continue
    const row = out[index[keyOf(t)]]
    if (!row) continue
    const g = groupOf(c.activity_type)
    const min = minutesOf(c)
    if (g === 'produce' || g === 'consume' || g === 'connect') row[g] += min
    else if (g) row.other += min      // 생활 — 점수 밖이지만 잰 시간이다
    else continue
    row.total += min
  }
  return out
}

/** 오늘(자정 이후) 그룹별 누적 분 */
export function todayTotals(checkins = [], now = Date.now()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const byGroup = { produce: 0, connect: 0, consume: 0, living: 0 }
  let total = 0
  for (const c of checkins) {
    const t = new Date(c.created_at).getTime()
    if (Number.isNaN(t) || t < start.getTime() || t > now) continue
    const g = groupOf(c.activity_type)
    if (!g) continue
    const min = minutesOf(c)
    byGroup[g] += min
    total += min
  }
  return { total, byGroup }
}

/** 최근 기록이 같은 그룹으로 몇 건 이어지는지 (시간 창 안에서만) */
export function recentStreak(checkins = [], now = Date.now()) {
  const recent = checkins
    .map(c => ({ g: groupOf(c.activity_type), t: new Date(c.created_at).getTime() }))
    .filter(r => r.g && !Number.isNaN(r.t) && r.t <= now && now - r.t <= STREAK_WINDOW_MS)
    .sort((a, b) => b.t - a.t)
  if (!recent.length) return { group: null, count: 0 }

  const group = recent[0].g
  let count = 0
  for (const r of recent) {
    if (r.g !== group) break
    count++
  }
  return { group, count }
}

/**
 * 팝업에 쓸 상태 판정.
 * autoSummary(지난 1시간 최다 사용 앱)가 있으면 앱 이름까지 쓸 수 있어 우선한다.
 */
export function alarmMood({ checkins = [], autoSummary = null, now = Date.now() } = {}) {
  const streak = recentStreak(checkins, now)

  if (autoSummary?.category) {
    const g = groupOf(autoSummary.category)
    const min = autoSummary.minutes ?? 0
    if (g === 'consume' && min >= BINGE_APP_MIN) {
      return { mood: 'binge', group: g, appLabel: autoSummary.label, appMinutes: min }
    }
    if (g === 'produce' && (min >= BINGE_APP_MIN || streak.count >= STREAK_SLOTS)) {
      return { mood: 'focus', group: g, streak: streak.count }
    }
  }

  if (streak.count >= STREAK_SLOTS) {
    if (streak.group === 'consume') return { mood: 'binge', group: 'consume', streak: streak.count }
    if (streak.group === 'produce') return { mood: 'focus',  group: 'produce', streak: streak.count }
  }
  return { mood: 'normal', group: streak.group, streak: streak.count }
}

/** 상태별 머리말 한 줄 */
export function moodHeadline(m) {
  if (!m) return '이번 시간 뭐 하셨어요?'
  if (m.mood === 'binge') {
    if (m.appLabel && m.appMinutes) return `${m.appLabel} ${m.appMinutes}분째예요`
    return `${labelOf('consume')}가 1시간 넘게 이어지고 있어요`
  }
  if (m.mood === 'focus') {
    const hours = m.streak >= 4 ? '2시간째' : '1시간째'
    return `${hours} 집중 중이에요 👏`
  }
  return '이번 시간 뭐 하셨어요?'
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

/**
 * "지금 하나만" 으로 제안할 할일 1개.
 * 순서: 마감이 지났거나 가까운 것 → 우선순위 → 먼저 만든 것
 */
// 달력에서 넣은 약속·일정·계획은 "지금 하나만" 후보가 아니다.
// 지난 날짜로도 기록할 수 있게 되면서, 마감 지난 항목이 제안을 독차지하게 된다.
const CALENDAR_KINDS = new Set(['appointment', 'plan', 'period'])

export function pickNextTodo(todos = [], now = Date.now()) {
  const open = todos.filter(t => t && !t.completed && !t.done && t.title && !CALENDAR_KINDS.has(t.todo_type))
  if (!open.length) return null

  const score = t => {
    const due = t.due_date ? new Date(t.due_date).getTime() : null
    return {
      hasDue: due !== null && !Number.isNaN(due) ? 0 : 1,
      due:    due !== null && !Number.isNaN(due) ? due : Infinity,
      prio:   PRIORITY_RANK[t.priority] ?? 1,
      made:   new Date(t.created_at ?? 0).getTime() || 0,
    }
  }
  return [...open].sort((a, b) => {
    const x = score(a), y = score(b)
    return x.hasDue - y.hasDue || x.due - y.due || x.prio - y.prio || x.made - y.made
  })[0]
}

/** 할일 마감 라벨 (D-day) — 없으면 우선순위 라벨 */
export function todoHint(t, now = Date.now()) {
  if (!t) return ''
  if (t.due_date) {
    const d0 = new Date(now); d0.setHours(0, 0, 0, 0)
    const d1 = new Date(t.due_date); d1.setHours(0, 0, 0, 0)
    const days = Math.round((d1 - d0) / 86400000)
    if (days < 0)  return `${-days}일 지남`
    if (days === 0) return '오늘 마감'
    if (days === 1) return '내일 마감'
    return `D-${days}`
  }
  return { high: '우선순위 높음', medium: '', low: '' }[t.priority] ?? ''
}

/**
 * "지금 하나만" 한 줄 — 마감만 적으면 뭘 하라는 건지 알 수 없다.
 * 약속에는 시각과 장소가 있는데 팝업이 그걸 버리고 있었다.
 * 예: "오늘 마감 · 14시 · 강남역"
 */
export function todoDetail(t, now = Date.now()) {
  if (!t) return ''
  const parts = [todoHint(t, now)]
  if (t.due_hour != null) parts.push(`${t.due_hour}시`)
  if (t.place) parts.push(shortPlace(t.place))
  return parts.filter(Boolean).join(' · ')
}

/** 분 → "3시간 10분" / "40분" */
export function formatMinutes(min) {
  if (!min) return '0분'
  const h = Math.floor(min / 60), m = min % 60
  if (!h) return `${m}분`
  return m ? `${h}시간 ${m}분` : `${h}시간`
}

// ── 캘린더 일정 (v1.10) ──────────────────────────────────────────
// 팝업은 "다음 1시간"을 책임진다 → 지금 진행 중이거나 곧 시작하는 일정 하나만 고른다.

/** 지금 진행 중 > 곧 시작 순으로 일정 1건. 종일 일정은 알람에 띄우지 않는다(시각이 없다) */
export function pickUpcomingEvent(events = [], now = Date.now(), withinMs = 90 * 60 * 1000) {
  const usable = events.filter(e => e && !e.allDay && e.title && e.endMs > now)
  if (!usable.length) return null
  const ongoing = usable
    .filter(e => e.startMs <= now)
    .sort((a, b) => a.endMs - b.endMs)
  if (ongoing.length) return { ...ongoing[0], ongoing: true, startsInMin: 0 }

  const soon = usable
    .filter(e => e.startMs > now && e.startMs - now <= withinMs)
    .sort((a, b) => a.startMs - b.startMs)
  if (!soon.length) return null
  return { ...soon[0], ongoing: false, startsInMin: Math.round((soon[0].startMs - now) / 60000) }
}

/** "15:00 강남 미팅" 처럼 한 줄로 */
export function eventLine(e) {
  if (!e) return ''
  const d = new Date(e.startMs)
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return e.ongoing ? `${e.title} 진행 중` : `${hhmm} ${e.title}`
}

/**
 * 장소를 알람 카드 한 줄에 맞게 줄인다.
 * 캘린더 장소는 "대구 달서구청, 대한민국 대구광역시 달서구 월성2동 학산로 45" 처럼
 * 이름 + 전체 주소가 통째로 들어와 카드가 세 줄로 불어난다 → 쉼표 앞(장소 이름)만 쓴다.
 */
export function shortPlace(location = '', max = 18) {
  // location 이 null 로 올 수 있다 — 기본값은 undefined 일 때만 쓰이므로 String(null)="null" 이 된다
  const head = String(location ?? '').split(',')[0].trim()
  if (!head) return ''
  return head.length > max ? head.slice(0, max - 1) + '…' : head
}
