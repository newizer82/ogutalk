// ── 오구 지수 (0~100) — 성장 40 + 균형 20 + 실행 40 ─────────────
// v1.20.0 에서 5:9 구조를 걷어냈다. "9칸 중 4칸을 채우면 다양성 15점" 은
// 설명을 읽어도 왜 그 점수인지 알 수 없었다. 한 줄로 말할 수 있어야 한다:
//   "성장에 쓴 시간 + 치우치지 않았나 + 실제로 한 것"
//
// 축은 셋뿐이다 (분류의 네 그룹 중 생활은 점수 밖 — 은행 5분은 성장도 힐링도 아니다).
//   🌱 성장  업무·학습·AI·촬영제작·구매주문예약·건강운동
//   🌿 힐링  동영상·게임·검색
//   💬 소통  메신저·SNS
//
// 설계 원칙 (이 다섯이 다른 생산성 앱과의 차이다)
//  1. 잰 것만 점수로 쓴다 — 앱을 많이 열어서 오르는 점수는 만들지 않는다.
//  2. 폰을 안 쓴 시간은 감점하지 않는다 — 산책·수면·대면 대화는 측정되지 않을 뿐 좋은 시간이다.
//  3. 기준값은 사용자의 것이다 — 남이 정한 2시간이 아니라 내가 정한 목표와 비교한다.
//  4. 비교는 어제의 나뿐 — 타인 랭킹 없음.
//  5. 힐링·소통은 "많을수록 좋음" 이 아니다 — 많이 해서 오르는 점수를 두면
//     점수를 벌려고 카톡을 켜게 되고, 그 순간 측정이 오염된다.
import { groupOf } from '../data/appCategories.js'
import { todayTotals } from './alarmContext.js'

export const DEFAULT_GOALS = {
  produceTarget: 120,  // 성장 목표(분) — 채우면 성장 점수 만점
  consumeLimit:  120,  // 힐링 한도(분) — 넘으면 감점 (힐링이 나쁜 게 아니라, 하루의 대부분이 되는 것을 막는 선)
}

/** 점수에 쓰는 세 축. 생활(금융·이동)은 중립이라 빠진다 */
export const AXES = ['produce', 'consume', 'connect']
export const AXIS_LABEL = { produce: '🌱 성장', consume: '🌿 힐링', connect: '💬 소통' }

export const WEIGHTS = {
  produce:     40,   // 성장 시간 ÷ 내 목표
  balance:     20,   // 세 축이 모두 0 이 아닌가 + 힐링이 한도 안인가
  // 실행 40 — 각 10점
  missionOne:  10,   // 오늘 미션 1개 이상 완료
  missionAll:  10,   // 미션 3개 완주
  todoDone:    10,   // 내 할일 1개 이상 완료
  alarmAnswer: 10,   // 알람에 한 번 이상 반응
}

/**
 * 오늘의 도장 — 실행 40점의 얼굴.
 * "실행 4가지 10/40" 은 읽고 계산해야 하지만, 빈 동그라미 셋은 보자마자 읽힌다.
 * 이진 항목이라 게임화해도 정직하다 — 찍혔거나 안 찍혔거나.
 * (성장 40점은 잰 시간이라 게임 화폐로 만들지 않는다. 점수를 벌려고 앱을 켜게 된다.)
 * short 는 홈 배너용, label 은 리포트용.
 */
export const STAMPS = [
  { key: 'missionOne',  short: '미션', label: '미션 1개' },
  { key: 'missionAll',  short: '완주', label: '미션 완주' },
  { key: 'todoDone',    short: '할일', label: '내 할일' },
  { key: 'alarmAnswer', short: '알람', label: '알람 응답' },
]

export const EMPTY_AXIS_PENALTY = 7     // 비어 있는 축 하나당
export const OVER_HEAL_PENALTY  = 10    // 힐링이 한도를 넘었을 때
/** 축이 "있다" 고 볼 최소 시간(분) — 1분 스친 것으로 균형 점수를 주지 않는다 */
export const AXIS_MIN_MINUTES = 10

/**
 * 공식 버전. 1 = 5:9 (v1.11~1.19), 2 = 성장·균형·실행 (v1.20~)
 * 공식이 바뀌면 과거 점수는 다른 잣대로 잰 값이다 — "어제보다 ▲8" 이 거짓말이 된다.
 * 숫자로 두는 이유: 날짜로 가르면 기기 시계·시간대에 따라 경계가 흔들린다.
 */
export const FORMULA = 2

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

/** 성장 — 내가 정한 목표 대비 (40점) */
export function produceScore(byGroup = {}, goals = DEFAULT_GOALS) {
  const target = goals.produceTarget || DEFAULT_GOALS.produceTarget
  const min = byGroup.produce ?? 0
  return {
    points: Math.round(clamp(min / target, 0, 1) * WEIGHTS.produce),
    minutes: min,
    target,
  }
}

/**
 * 균형 — 세 축이 모두 있고 힐링이 한도 안이면 만점 (20점)
 * "성장만 15시간" 도 "힐링만 15시간" 도 좋은 하루가 아니다.
 */
export function balanceScore(byGroup = {}, goals = DEFAULT_GOALS) {
  const limit = goals.consumeLimit || DEFAULT_GOALS.consumeLimit
  const empty = AXES.filter(a => (byGroup[a] ?? 0) < AXIS_MIN_MINUTES)
  const overHeal = Math.max(0, (byGroup.consume ?? 0) - limit)
  const points = clamp(
    WEIGHTS.balance - empty.length * EMPTY_AXIS_PENALTY - (overHeal > 0 ? OVER_HEAL_PENALTY : 0),
    0, WEIGHTS.balance)
  return { points, empty, overHeal, limit }
}

/** 실행 — 내가 실제로 한 것 (각 10점) */
export function doneScore({
  missionDone = 0, missionTotal = 3, todoDone = 0, actedOnAlarm = false,
} = {}) {
  const parts = {
    missionOne:  missionDone >= 1 ? WEIGHTS.missionOne : 0,
    missionAll:  missionTotal > 0 && missionDone >= missionTotal ? WEIGHTS.missionAll : 0,
    todoDone:    todoDone >= 1 ? WEIGHTS.todoDone : 0,
    alarmAnswer: actedOnAlarm ? WEIGHTS.alarmAnswer : 0,
  }
  return { total: Object.values(parts).reduce((a, b) => a + b, 0), parts }
}

const GRADES = [
  { min: 80, label: '오늘 잘 썼어요',        color: '#1E7A58' },
  { min: 60, label: '괜찮은 하루였어요',     color: '#D9531B' },
  { min: 40, label: '반반이었어요',          color: '#B4740F' },
  { min: 0,  label: '오늘은 쉬어간 날이에요', color: '#D23B2E' },
]

export function oguScore({
  checkins = [], goals = DEFAULT_GOALS, measured = true, now = Date.now(),
  missionDone = 0, missionTotal = 3, todoDone = 0, actedOnAlarm = false,
} = {}) {
  const g = { ...DEFAULT_GOALS, ...goals }
  const { total, byGroup } = todayTotals(checkins, now)

  const produce = produceScore(byGroup, g)
  const balance = balanceScore(byGroup, g)
  const done    = doneScore({ missionDone, missionTotal, todoDone, actedOnAlarm })
  const score   = clamp(produce.points + balance.points + done.total, 0, 100)
  const grade   = GRADES.find(x => score >= x.min)

  return {
    score, produce, balance, done, byGroup, measuredMinutes: total, measured,
    grade: grade.label, color: grade.color,
    advice: adviceFor({ produce, balance, done, missionDone, missionTotal }),
  }
}

/** 조언 한 줄 — 점수를 가장 많이 깎은 곳이 아니라 "지금 바꿀 수 있는 것" 부터 */
export function adviceFor({ produce, balance, done, missionDone, missionTotal }) {
  if (balance.overHeal > 0) {
    return `힐링이 오늘 정한 만큼보다 ${balance.overHeal}분 길었어요. 내일은 한 번만 덜 열어도 올라가요.`
  }
  if (missionDone < missionTotal) {
    const left = missionTotal - missionDone
    return `오늘의 추천 미션 ${left}개가 남았어요. 하나에 5분이면 돼요.`
  }
  if (!done.parts.todoDone) return '내 할일을 하나만 끝내도 10점이 올라가요.'
  if (balance.empty.includes('produce')) return '성장에 10분만 써도 균형 점수가 올라가요.'
  if (balance.empty.includes('connect')) return '오늘 연락 한 통도 하루의 일부예요.'
  if (balance.empty.includes('consume')) return '쉬는 시간도 하루에 필요해요. 쉬었다면 기록해 주세요.'
  if (produce.points < WEIGHTS.produce) {
    const left = Math.max(0, produce.target - produce.minutes)
    return `성장의 시간이 ${left}분 남았어요. 읽기·쓰기 10분이면 한 칸 올라가요.`
  }
  return '다 채웠어요. 내일도 이대로 가요.'
}
