// ── 오늘 오구톡이 직접 본 행동 (로컬 전용) ──────────────────────
// 오구 지수의 "실행" 점수용. todos 테이블에 완료 시각이 없어서
// 완료 개수만으로는 "오늘 끝낸 것"을 셀 수 없다 → 앱이 관찰한 행동만 날짜별로 센다.
// ponytail: 스키마를 건드리지 않는 대신 설치 이후부터 집계된다. 과거는 0으로 둔다.
const KEY = 'ogu_day_log'
const KEEP_DAYS = 14

const dayKey = (ms = Date.now()) => {
  const d = new Date(ms)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

function write(map) {
  // 오래된 날짜는 버린다 (지수는 어제와만 비교한다)
  const keep = new Set(
    Array.from({ length: KEEP_DAYS }, (_, i) => dayKey(Date.now() - i * 86400000)))
  const trimmed = Object.fromEntries(Object.entries(map).filter(([k]) => keep.has(k)))
  try { localStorage.setItem(KEY, JSON.stringify(trimmed)) } catch {}
}

export function todayLog(now = Date.now()) {
  return { doneCount: 0, actedOnAlarm: false, ...read()[dayKey(now)] }
}

export function yesterdayScore(now = Date.now()) {
  return read()[dayKey(now - 86400000)]?.score ?? null
}

/** 할일 1건 완료 (팝업·할일 탭 공용) */
export function logTodoDone(now = Date.now()) {
  const map = read()
  const k = dayKey(now)
  const cur = { doneCount: 0, actedOnAlarm: false, ...map[k] }
  map[k] = { ...cur, doneCount: cur.doneCount + 1, actedOnAlarm: true }
  write(map)
}

/** 알람 팝업에서 무언가를 눌렀다 (체크인·분류 수정 포함) */
export function logAlarmAction(now = Date.now()) {
  const map = read()
  const k = dayKey(now)
  map[k] = { doneCount: 0, ...map[k], actedOnAlarm: true }
  write(map)
}

/** 연속 달성 일수 — 오늘(없으면 어제)부터 거슬러 threshold 이상인 날을 센다 */
export function streakDays(threshold = 60, now = Date.now()) {
  const map = read()
  let n = 0
  // 오늘 점수가 아직 기준 미만이어도 어제까지의 연속은 살아 있다 → 오늘은 건너뛸 수 있게 한다
  for (let i = (map[dayKey(now)]?.score ?? 0) >= threshold ? 0 : 1; i < KEEP_DAYS; i++) {
    const s = map[dayKey(now - i * 86400000)]?.score
    if (s === undefined || s < threshold) break
    n++
  }
  return n
}

/** 하루 점수 확정분을 남겨 둔다 (내일 "어제보다" 비교용) */
export function saveDayScore(score, now = Date.now()) {
  const map = read()
  const k = dayKey(now)
  map[k] = { doneCount: 0, actedOnAlarm: false, ...map[k], score }
  write(map)
}
