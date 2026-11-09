// ── 오늘의 미션 3개 고르기 (순수 로직) ──────────────────────────
// 몸·정리·머리에서 하나씩. 같은 날이면 몇 번을 다시 계산해도 같은 결과가 나와야 한다
// (렌더할 때마다 미션이 바뀌면 "아까 그거 뭐였지?" 가 된다) → 날짜를 씨앗으로 쓴다.
import { MISSIONS, AREAS } from '../data/missions.js'

export const RECENT_DAYS = 14   // 최근 N일에 나온 미션은 다시 뽑지 않는다 (중복이 질림의 1순위)
export const SKIP_LIMIT  = 3    // 연속 N번 건너뛴 미션은 당분간 제외

/** 날짜 문자열 → 0 이상의 정수 (같은 날 같은 결과를 보장하는 씨앗) */
export function seedOf(dateKey, salt = 0) {
  let h = 2166136261 ^ salt
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * @param dateKey  'YYYY-MM-DD'
 * @param state    { recent: {id: dateKey}, skips: {id: count}, exclude: [id] }
 * @param stage    생애주기 (없으면 공통 풀만)
 * @param salt     셔플 횟수 (하루 1회 허용 → 1 이 들어온다)
 */
export function pickMissions(dateKey, state = {}, stage = null, salt = 0) {
  const { recent = {}, skips = {}, exclude = [] } = state
  const out = new Set(exclude)
  const recentCutoff = dayOffsetKey(dateKey, -RECENT_DAYS)

  const usable = MISSIONS.filter(m => {
    if (m.stage && m.stage !== stage) return false
    if (out.has(m.id)) return false
    if ((skips[m.id] ?? 0) >= SKIP_LIMIT) return false
    const seen = recent[m.id]
    return !seen || seen < recentCutoff
  })

  return Object.keys(AREAS).map((area, i) => {
    let pool = usable.filter(m => m.area === area)
    // 쓸 수 있는 게 다 떨어지면 조건을 풀어 준다 — 빈칸보다는 다시 나오는 편이 낫다
    if (!pool.length) pool = MISSIONS.filter(m => m.area === area && (!m.stage || m.stage === stage) && !out.has(m.id))
    if (!pool.length) return null
    return pool[seedOf(dateKey, salt * 31 + i) % pool.length]
  }).filter(Boolean)
}

/**
 * 다시 뽑기 — 해낸 미션은 두고 나머지만 다른 미션으로 바꾼다. 바꿀 게 없으면 null.
 * 지금 보이는 것을 반드시 뺀다: 14일 제외로 영역별 풀이 1~2개만 남으면 씨앗을 바꿔도
 * 같은 미션이 다시 나와서, 눌러도 아무 일 없는 버튼이 됐다.
 */
export function rerollIds({ date, ids = [], done = [], recent, skips }, stage = null) {
  const kept = new Set(done)
  if (ids.every(id => kept.has(id))) return null
  const picked = pickMissions(date, { recent, skips, exclude: ids }, stage, 1)
  return ids.map(id => {
    if (kept.has(id)) return id
    const area = MISSIONS.find(m => m.id === id)?.area
    return picked.find(m => m.area === area)?.id ?? id
  })
}

/** 'YYYY-MM-DD' 에서 n일 이동 */
export function dayOffsetKey(dateKey, n) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  const p = v => String(v).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}
