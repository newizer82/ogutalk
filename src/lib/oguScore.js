// ── 오구 지수 (0~100) — 5 : 9 구조 ──────────────────────────────
// 앱 이름(매시 59분)에서 그대로 온 구조다.
//   5 (50점) — 내가 정하고 해낸 것: 미션·할일·목표·알람 응답
//   9 (50점) — 폰으로 한 생산 활동 9분류: 업무·학습·AI·촬영제작·구매주문예약·건강운동·금융·소통·생활
//
// 설계 원칙 (이 넷이 다른 생산성 앱과의 차이다)
//  1. 잰 것만 점수로 쓴다 — 앱을 많이 열어서 오르는 점수는 만들지 않는다.
//  2. 폰을 안 쓴 시간은 감점하지 않는다 — 산책·수면·대면 대화는 측정되지 않을 뿐 좋은 시간이다.
//  3. 기준값은 사용자의 것이다 — 남이 정한 2시간이 아니라 내가 정한 목표와 비교한다.
//  4. 비교는 어제의 나뿐 — 타인 랭킹 없음.
import { CATEGORIES, groupOf } from '../data/appCategories.js'
import { todayTotals, minutesOf } from './alarmContext.js'

export const DEFAULT_GOALS = {
  produceTarget: 120,  // 9분류 합계 목표(분) — 채우면 시간 점수 만점
  consumeLimit:  120,  // 소비 한도(분) — 넘으면 감점
}

/**
 * 9분류 — 업무·학습·AI·촬영제작·구매주문예약·건강운동·메신저·금융·생활
 * 소비(동영상·게임·검색)는 당연히 빠지고, SNS 도 뺀다.
 * SNS 는 그룹상 소통이지만 하는 일은 대체로 보는 것이라, 9칸에 넣으면
 * 인스타를 켜는 것만으로 다양성 점수가 오른다. 대신 감점도 하지 않는 중립으로 둔다.
 */
export const NINE = Object.keys(CATEGORIES).filter(id => groupOf(id) !== 'consume' && id !== 'sns')

export const WEIGHTS = {
  // 5 — 내가 해낸 것 (각 10점)
  missionOne:  10,   // 오늘 미션 1개 이상 완료
  missionAll:  10,   // 미션 3개 완주
  todoDone:    10,   // 내 할일 1개 이상 완료
  goalKept:    10,   // 목표를 등록해두고 이번 주에 들여다봄
  alarmAnswer: 10,   // 알람에 한 번 이상 반응
  // 9 — 폰으로 한 생산 활동 (합 50점)
  time:        35,   // 9분류 합계 ÷ 목표
  variety:     15,   // 9칸 중 채운 칸 수 (4칸이면 만점)
}
export const VARIETY_FULL  = 4    // 이 칸 수를 채우면 다양성 만점
export const CONSUME_MAX_PENALTY = 10   // 소비 초과 감점 상한

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

/** 9분류별 오늘 사용 시간(분) */
export function nineMinutes(checkins = [], now = Date.now()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const out = {}
  for (const c of checkins) {
    const t = new Date(c.created_at).getTime()
    if (Number.isNaN(t) || t < start.getTime() || t > now) continue
    // 그룹으로 기록된 수동 체크인은 어느 칸인지 알 수 없다 → 다양성에는 넣지 않고 시간만 센다
    if (!NINE.includes(c.activity_type)) continue
    out[c.activity_type] = (out[c.activity_type] ?? 0) + minutesOf(c)
  }
  return out
}

/** 그룹 ID 로만 남은 수동 체크인 중 소비가 아닌 시간 (세부 칸을 알 수 없는 기록) */
function manualNonConsumeMinutes(checkins = [], now = Date.now()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  let sum = 0
  for (const c of checkins) {
    const t = new Date(c.created_at).getTime()
    if (Number.isNaN(t) || t < start.getTime() || t > now) continue
    if (CATEGORIES[c.activity_type]) continue          // 세부 분류는 nine 에서 이미 셌다
    const g = groupOf(c.activity_type)
    if (!g || g === 'consume') continue
    sum += minutesOf(c)
  }
  return sum
}

/** 9 영역 — 시간 35 + 다양성 15 − 소비 감점(최대 10) */
export function phoneScore(checkins = [], goals = DEFAULT_GOALS, now = Date.now()) {
  const g = { ...DEFAULT_GOALS, ...goals }
  const { byGroup } = todayTotals(checkins, now)
  const nine = nineMinutes(checkins, now)

  // 시간: 9분류 합계 + 그룹으로만 기록된 수동 체크인(소비 제외)
  // — 9칸으로만 세면 수동 체크인이 통째로 버려지고, 그룹 전체로 세면 SNS 가 섞인다
  const nineMin = Object.values(nine).reduce((a, b) => a + b, 0)
  const manualMin = manualNonConsumeMinutes(checkins, now)
  const produceMin = nineMin + manualMin
  const time = Math.round(clamp(produceMin / (g.produceTarget || 1), 0, 1) * WEIGHTS.time)

  const filled  = Object.keys(nine).length
  const variety = Math.round(clamp(filled / VARIETY_FULL, 0, 1) * WEIGHTS.variety)

  const over    = Math.max(0, byGroup.consume - g.consumeLimit)
  const penalty = over > 0 ? Math.min(CONSUME_MAX_PENALTY, Math.ceil(over / 30) * 5) : 0

  return {
    total: clamp(time + variety - penalty, 0, 50),
    time, variety, penalty, filled, produceMin, consumeMin: byGroup.consume, nine,
  }
}

/** 5 영역 — 내가 정하고 해낸 것 (각 10점) */
export function doneScore({
  missionDone = 0, missionTotal = 3, todoDone = 0, goalKept = false, actedOnAlarm = false,
} = {}) {
  const parts = {
    missionOne:  missionDone >= 1 ? WEIGHTS.missionOne : 0,
    missionAll:  missionTotal > 0 && missionDone >= missionTotal ? WEIGHTS.missionAll : 0,
    todoDone:    todoDone >= 1 ? WEIGHTS.todoDone : 0,
    goalKept:    goalKept ? WEIGHTS.goalKept : 0,
    alarmAnswer: actedOnAlarm ? WEIGHTS.alarmAnswer : 0,
  }
  return { total: Object.values(parts).reduce((a, b) => a + b, 0), parts }
}

const GRADES = [
  { min: 80, label: '오늘 잘 썼어요',        color: '#34d399' },
  { min: 60, label: '괜찮은 하루였어요',     color: '#818cf8' },
  { min: 40, label: '반반이었어요',          color: '#f59e0b' },
  { min: 0,  label: '오늘은 쉬어간 날이에요', color: '#f87171' },
]

export function oguScore({
  checkins = [], goals = DEFAULT_GOALS, measured = true, now = Date.now(),
  missionDone = 0, missionTotal = 3, todoDone = 0, goalKept = false, actedOnAlarm = false,
} = {}) {
  const phone = phoneScore(checkins, goals, now)
  const done  = doneScore({ missionDone, missionTotal, todoDone, goalKept, actedOnAlarm })
  const score = clamp(phone.total + done.total, 0, 100)
  const grade = GRADES.find(x => score >= x.min)
  const { total, byGroup } = todayTotals(checkins, now)

  return {
    score, phone, done, byGroup, measuredMinutes: total, measured,
    grade: grade.label, color: grade.color,
    advice: adviceFor({ phone, done, missionDone, missionTotal, goals: { ...DEFAULT_GOALS, ...goals } }),
  }
}

/** 조언 한 줄 — 점수를 가장 많이 깎은 곳이 아니라 "지금 바꿀 수 있는 것" 부터 */
export function adviceFor({ phone, done, missionDone, missionTotal, goals }) {
  if (phone.penalty > 0) {
    const over = Math.max(0, phone.consumeMin - goals.consumeLimit)
    return `오늘 ${over}분이 더 샜어요. 내일은 한 번만 덜 열어도 올라가요.`
  }
  if (missionDone < missionTotal) {
    const left = missionTotal - missionDone
    return `오늘의 미션 ${left}개가 남았어요. 하나에 5분이면 돼요.`
  }
  if (!done.parts.todoDone) return '내 할일을 하나만 끝내도 10점이 올라가요.'
  if (!done.parts.goalKept) return '이번 주 목표를 한 번 들여다보면 10점이에요.'
  if (phone.variety < WEIGHTS.variety) {
    return `오늘 채운 칸이 ${phone.filled}개예요. 다른 활동 하나만 더 하면 올라가요.`
  }
  if (phone.time < WEIGHTS.time) {
    const left = Math.max(0, goals.produceTarget - phone.produceMin)
    return `쌓은 시간이 ${left}분 모자라요. 읽기·쓰기 10분이면 한 칸 올라가요.`
  }
  return '다 채웠어요. 내일도 이대로 가요.'
}
