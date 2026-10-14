// ── 분류되지 않아 버려진 시간 (기기 안에만) ─────────────────────
// 내장 매핑·OS 분류·사용자 수정 셋 다 없으면 그 슬롯은 기록하지 않는다.
// 그런데 "얼마나 버려지는지" 를 모르면 분류표를 늘릴지 말지 판단할 수 없다.
// 추측으로 외부 분류 모델을 붙이기 전에, 구멍의 크기를 먼저 잰다.
//
// 패키지명은 기기 밖으로 나가지 않는다 (사용시간과 같은 약속).
const KEY = 'ogu_unmapped'
const KEEP_DAYS = 14
const MAX_APPS = 50          // 목록이 끝없이 길어지지 않게

const dayKey = (ms = Date.now()) => {
  const d = new Date(ms)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function write(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {}
}

/**
 * 분류 못 한 앱의 시간을 더한다 (순수 — 저장은 noteUnmapped 가 한다).
 * 같은 앱이 여러 날 걸쳐 나오므로 날짜도 함께 센다 (하루 평균을 내려면 며칠치인지 알아야 한다).
 */
export function addUnmapped(store = {}, { pkg, label, minutes }, now = Date.now()) {
  if (!pkg || !(minutes > 0)) return store
  const day = dayKey(now)
  const apps = { ...(store.apps ?? {}) }
  const cur = apps[pkg] ?? { label: label || pkg, min: 0, days: [] }
  apps[pkg] = {
    label: label || cur.label,
    min: cur.min + minutes,
    days: cur.days.includes(day) ? cur.days : [...cur.days, day].slice(-KEEP_DAYS),
  }
  // 오래 안 보인 앱부터 버린다 (목록 상한)
  const trimmed = Object.entries(apps)
    .sort((a, b) => b[1].min - a[1].min)
    .slice(0, MAX_APPS)
  return { since: store.since ?? day, apps: Object.fromEntries(trimmed) }
}

/** 요약 — 화면에 그대로 쓰는 모양 (순수) */
export function summarize(store = {}, now = Date.now()) {
  const apps = Object.entries(store.apps ?? {})
    .map(([pkg, v]) => ({ pkg, label: v.label || pkg, min: Math.round(v.min) }))
    .sort((a, b) => b.min - a.min)
  const totalMin = apps.reduce((s, a) => s + a.min, 0)
  // 며칠 동안 모은 것인가 — 하루 평균을 내려면 분모가 필요하다
  const days = new Set()
  for (const v of Object.values(store.apps ?? {})) for (const d of v.days ?? []) days.add(d)
  const dayCount = Math.max(days.size, 1)
  return {
    apps,
    totalMin,
    dayCount,
    perDayMin: Math.round(totalMin / dayCount),
  }
}

/** 기록 (분류 실패 시점에 부른다) */
export function noteUnmapped(entry, now = Date.now()) {
  write(addUnmapped(read(), entry, now))
}

export function loadUnmapped() {
  return read()
}

/** 분류표를 보강했거나 사용자가 다 고쳤을 때 */
export function clearUnmapped() {
  write({})
}
