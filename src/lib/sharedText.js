// ── 돌아올 다리로 들어온 글 다루기 (순수 로직) ─────────────────
// aiApps.js 에 두지 않는 이유: 거기는 네이티브를 import 하므로 node 로 못 돌린다.
// 이 프로젝트에서 순수 로직을 따로 떼는 이유와 같다 (monthGrid·promptPick·timeBanner).

/**
 * 공유로 받은 글의 첫 줄 — 할일 제목으로 쓴다.
 * AI 답은 여러 줄이다. 통째로 제목에 넣으면 할일 목록이 망가진다.
 * 자를 때는 말줄임표를 남긴다 — 자른 티를 안 내면 잘린 걸 모른다.
 */
export function firstLine(text = '', max = 60) {
  const line = String(text).split('\n').map(s => s.trim()).find(Boolean) ?? ''
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

// ── 기록을 남기면 그 시간이 성장이 된다 ─────────────────────────
// "유튜브로 강의를 들었다" 를 어떻게 성장으로 셀 것인가에 대한 답.
//
// 좋아요·댓글은 잴 수 없다. UsageStats 는 "YouTube 가 몇 분 떠 있었다" 만 준다.
// 접근성 서비스로 화면을 읽거나 YouTube API 를 붙이면 좋아요는 알 수 있지만,
// 1초짜리 좋아요가 1시간을 성장으로 바꾸는 구멍은 그대로 남는다.
//
// 그래서 다른 걸 잰다: 남겼는가. 요약을 메모로 남겼다는 건 실제로 소화했다는 증거다.
// 잴 수 없는 것 대신 잴 수 있는 것을 잰다 — "잰 것만 점수로 쓴다" 는 원칙 그대로.
import { groupOf } from '../data/appCategories.js'

/** 올릴 분류 — 업무가 아니라 학습이다 (영상으로 배운 시간이므로) */
export const PROMOTE_TO = 'learning'
/** 얼마나 거슬러 올라갈 것인가. 2시간 전에 본 영상을 지금 요약했을 수도 있다 */
export const PROMOTE_WINDOW_MIN = 120

/**
 * 기록을 남겼을 때 성장으로 올릴 체크인 하나 (순수).
 * 직전 구간 안의 힐링 슬롯 중 가장 최근 것. 없으면 null — 없는 걸 만들지 않는다.
 *
 * 이미 올린 슬롯은 힐링이 아니게 되므로 다시 걸리지 않는다 (한 슬롯은 한 번만).
 *
 * @returns created_at 문자열 | null
 */
export function pickSlotToPromote(checkins = [], now = Date.now(), windowMin = PROMOTE_WINDOW_MIN) {
  const from = now - windowMin * 60000
  let best = null, bestT = 0
  for (const c of checkins) {
    const t = new Date(c?.created_at).getTime()
    if (!Number.isFinite(t) || t < from || t > now) continue
    if (groupOf(c.activity_type) !== 'consume') continue
    if (t > bestT) { best = c.created_at; bestT = t }
  }
  return best
}
