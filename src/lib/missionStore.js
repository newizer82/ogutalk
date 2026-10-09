// ── 오늘의 미션 저장소 (로컬 전용) ──────────────────────────────
// 미션은 사용자가 만든 할일과 섞지 않는다 — 매일 3개씩 todos 에 쌓이면
// 내 할일 목록이 오염되고 완료율도 망가진다. 별도 칸에서 하루치만 산다.
import { pickMissions, RECENT_DAYS } from './missionPick'
import { missionById } from '../data/missions'

const KEY = 'ogu_missions'

const dayKey = (ms = Date.now()) => {
  const d = new Date(ms)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
}

/** 하루가 바뀌면: 안 한 미션은 건너뛴 것으로 세고, 오늘 것을 새로 뽑는다 */
function rollover(state, stage, now) {
  const today = dayKey(now)
  if (state.date === today && state.ids?.length) return state

  const recent = { ...(state.recent ?? {}) }
  const skips  = { ...(state.skips ?? {}) }

  for (const id of state.ids ?? []) {
    recent[id] = state.date
    if (state.done?.includes(id)) skips[id] = 0          // 해낸 미션은 건너뛴 기록을 지운다
    else skips[id] = (skips[id] ?? 0) + 1
  }
  // 오래된 recent 는 버린다 (14일만 보면 된다)
  const cutoff = dayKey(now - (RECENT_DAYS + 1) * 86400000)
  for (const [id, d] of Object.entries(recent)) if (d < cutoff) delete recent[id]

  const picked = pickMissions(today, { recent, skips }, stage, 0)
  return { date: today, ids: picked.map(m => m.id), done: [], shuffled: false, recent, skips }
}

/** 오늘의 미션 — 없으면 뽑아서 저장한다 */
export function todayMissions(stage = null, now = Date.now()) {
  const next = rollover(read(), stage, now)
  if (next !== read()) write(next)
  return {
    missions: next.ids.map(missionById).filter(Boolean),
    done:     next.done ?? [],
    shuffled: !!next.shuffled,
  }
}

export function completeMission(id, now = Date.now()) {
  const s = read()
  if (s.date !== dayKey(now)) return
  const done = new Set(s.done ?? [])
  done.add(id)
  write({ ...s, done: [...done] })
}

export function undoMission(id, now = Date.now()) {
  const s = read()
  if (s.date !== dayKey(now)) return
  write({ ...s, done: (s.done ?? []).filter(x => x !== id) })
}

/** 셔플은 하루 한 번만 — 마음에 안 든다고 계속 돌리면 미루기가 된다 */
export function shuffleMissions(stage = null, now = Date.now()) {
  const s = read()
  if (s.date !== dayKey(now) || s.shuffled) return false
  const picked = pickMissions(s.date, { recent: s.recent, skips: s.skips }, stage, 1)
  write({ ...s, ids: picked.map(m => m.id), done: [], shuffled: true })
  return true
}
