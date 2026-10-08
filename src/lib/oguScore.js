// ── 오구 지수 (0~100) ────────────────────────────────────────────
// 설계 원칙 (이 네 줄이 다른 생산성 앱과의 차이다)
//  1. "계획한 것"이 아니라 "실제로 잰 것"으로만 점수를 낸다 — 앱을 많이 써서 오르는 점수는 만들지 않는다.
//  2. 폰을 안 쓴 시간은 감점하지 않는다 (산책·수면·대면 대화는 측정되지 않을 뿐 좋은 시간이다).
//  3. 기준값은 사용자의 것이다 — 남이 정한 "하루 2시간"이 아니라 내가 정한 목표와 비교한다.
//  4. 비교 대상은 어제의 나뿐이다 — 타인 랭킹 없음.
import { todayTotals } from './alarmContext.js'

export const DEFAULT_GOALS = {
  produceTarget: 120,  // 생산 목표(분) — 채우면 만점
  consumeLimit:  120,  // 소비 한도(분) — 넘으면 30분마다 감점
}

export const WEIGHTS = { produce: 40, restraint: 30, action: 30 }

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

/** 생산 시간 점수 (40) — 목표 대비 비율 */
export function produceScore(produceMin, target = DEFAULT_GOALS.produceTarget) {
  if (target <= 0) return WEIGHTS.produce
  return Math.round(clamp(produceMin / target, 0, 1) * WEIGHTS.produce)
}

/** 절제 점수 (30) — 한도 이하면 만점, 초과 30분마다 -5 */
export function restraintScore(consumeMin, limit = DEFAULT_GOALS.consumeLimit) {
  if (consumeMin <= limit) return WEIGHTS.restraint
  const over = Math.ceil((consumeMin - limit) / 30)
  return clamp(WEIGHTS.restraint - over * 5, 0, WEIGHTS.restraint)
}

/** 실행 점수 (30) — 끝낸 할일(최대 3건 × 7) + 알람에 반응했는가(9) */
export function actionScore({ doneCount = 0, actedOnAlarm = false } = {}) {
  return clamp(Math.min(doneCount, 3) * 7, 0, 21) + (actedOnAlarm ? 9 : 0)
}

const GRADES = [
  { min: 80, label: '오늘 잘 썼어요',       color: '#34d399' },
  { min: 60, label: '괜찮은 하루였어요',    color: '#818cf8' },
  { min: 40, label: '반반이었어요',         color: '#f59e0b' },
  { min: 0,  label: '오늘은 쉬어간 날이에요', color: '#f87171' },
]

/**
 * 하루 점수. checkins 는 오늘 것만 걸러서 쓴다.
 * measured=false 면 자동 기록이 꺼진 상태 — 수동 체크인으로 계산한 "추정치"다.
 */
export function oguScore({
  checkins = [], doneCount = 0, actedOnAlarm = false,
  goals = DEFAULT_GOALS, measured = true, now = Date.now(),
} = {}) {
  const { byGroup, total } = todayTotals(checkins, now)
  const g = { ...DEFAULT_GOALS, ...goals }

  const parts = {
    produce:   produceScore(byGroup.produce, g.produceTarget),
    restraint: restraintScore(byGroup.consume, g.consumeLimit),
    action:    actionScore({ doneCount, actedOnAlarm }),
  }
  const score = parts.produce + parts.restraint + parts.action
  const grade = GRADES.find(x => score >= x.min)

  return {
    score, parts, byGroup, measuredMinutes: total, measured,
    grade: grade.label, color: grade.color,
    advice: adviceFor({ parts, byGroup, doneCount, actedOnAlarm, goals: g }),
  }
}

/** 가장 많이 깎인 한 곳만 짚어준다 — 세 줄짜리 잔소리는 아무도 읽지 않는다 */
export function adviceFor({ parts, byGroup, doneCount, actedOnAlarm, goals }) {
  const lost = {
    produce:   WEIGHTS.produce   - parts.produce,
    restraint: WEIGHTS.restraint - parts.restraint,
    action:    WEIGHTS.action    - parts.action,
  }
  if (lost.produce === 0 && lost.restraint === 0 && lost.action === 0) {
    return '세 가지 다 채웠어요. 내일도 이대로 가요.'
  }

  // 한도를 넘긴 소비가 있으면 그것부터 짚는다 — 점수를 가장 많이 깎은 쪽보다
  // "내가 지금 바꿀 수 있는 것"이 먼저다. (생산 시간은 하루가 끝난 뒤엔 손쓸 수 없다)
  if (lost.restraint > 0) {
    const over = Math.max(0, byGroup.consume - goals.consumeLimit)
    return `소비가 한도보다 ${over}분 많았어요. 내일은 한 번만 덜 열어도 올라가요.`
  }

  const worst = Object.entries(lost).sort((a, b) => b[1] - a[1])[0]
  if (worst[0] === 'produce') {
    const left = Math.max(0, goals.produceTarget - byGroup.produce)
    return `생산 시간이 ${left}분 남았어요. 읽기·쓰기 10분이면 한 칸 올라가요.`
  }
  if (!doneCount) return '오늘은 끝낸 할일이 없었어요. 알람이 울릴 때 하나만 눌러보세요.'
  if (!actedOnAlarm) return '알람에서 한 번만 반응해도 9점이 올라가요.'
  return `할일 ${doneCount}건 완료했어요. 하나만 더 하면 7점이 올라가요.`
}
