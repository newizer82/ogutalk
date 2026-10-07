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
export function pickNextTodo(todos = [], now = Date.now()) {
  const open = todos.filter(t => t && !t.completed && !t.done && t.title)
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

/** 분 → "3시간 10분" / "40분" */
export function formatMinutes(min) {
  if (!min) return '0분'
  const h = Math.floor(min / 60), m = min % 60
  if (!h) return `${m}분`
  return m ? `${h}시간 ${m}분` : `${h}시간`
}
