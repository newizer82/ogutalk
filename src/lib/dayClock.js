// ── 하루 시계 (순수 로직) ───────────────────────────────────────
// 홈 히어로의 24시간 시계가 그릴 칸. node scripts/check-autocheckin.mjs 로 검증한다.
import { groupOf } from '../data/appCategories.js'
import { minutesOf } from './alarmContext.js'

export const CELLS = 48   // 30분 한 칸. 화면에서는 두 칸을 붙여 한 시간으로 보인다

/**
 * 오늘 0시부터 30분 단위 48칸 — 각 칸의 그룹(produce·connect·consume·living) 또는 null.
 * 기록 없는 칸은 null 이다. 안 잰 시간에 색을 칠하면 거짓말이 된다.
 *
 * 자동 기록(:00/:30)은 그 30분 칸 하나를, 알람 때 고른 기록은 그 한 시간(두 칸)을 채운다.
 * 둘이 겹치면 자동 기록이 이긴다 — 잰 값이 고른 값보다 정확하다.
 */
export function dayCells(checkins = [], now = Date.now()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const cells = Array(CELLS).fill(null)
  const manual = []

  for (const c of checkins) {
    const t = new Date(c.created_at).getTime()
    const g = groupOf(c.activity_type)
    if (!g || Number.isNaN(t) || t > now) continue
    if (minutesOf(c) === 30) {
      const i = Math.floor((t - start.getTime()) / 1800000)
      if (i >= 0 && i < CELLS) cells[i] = g
      continue
    }
    // 59분 알람의 답은 "끝나가는 한 시간" 이야기다. 정각을 넘겨 답했으면 직전 시간에 칠한다.
    // ponytail: 30분 넘게 늦은 답은 그 시간 것으로 본다. 기록에 대상 시각이 생기면 그 값을 쓸 것
    const d = new Date(t)
    const hourStart = d.setMinutes(0, 0, 0) - (new Date(t).getMinutes() < 30 ? 3600000 : 0)
    manual.push({ i: Math.floor((hourStart - start.getTime()) / 1800000), g })
  }
  for (const { i, g } of manual) {
    for (const k of [i, i + 1]) if (k >= 0 && k < CELLS && cells[k] === null) cells[k] = g
  }
  return cells
}

/**
 * 59분 알람이 켜진 시각 — 시계 안쪽에 점으로 찍는다.
 * alarmHours[h] 가 켜져 있으면 (h-1)시 59분에 울린다 ("곧 h시예요").
 * @returns [{ hour, min, past, next }]  min = 오늘 0시부터 울리는 시각까지의 분, 울리는 순서대로
 */
export function alarmMarks(alarmHours = {}, now = Date.now()) {
  const d = new Date(now)
  const nowMin = d.getHours() * 60 + d.getMinutes()
  const marks = []
  for (let h = 0; h < 24; h++) {
    if (!alarmHours[h]) continue
    const min = ((h + 23) % 24) * 60 + 59
    marks.push({ hour: h, min, past: min <= nowMin, next: false })
  }
  marks.sort((a, b) => a.min - b.min)
  const next = marks.find(m => !m.past)
  if (next) next.next = true
  return marks
}

/** 지금이 몇 번째 칸인가 (0~47) */
export function nowCell(now = Date.now()) {
  const d = new Date(now)
  return d.getHours() * 2 + (d.getMinutes() >= 30 ? 1 : 0)
}
