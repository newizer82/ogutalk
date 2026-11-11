// ── 프롬프트 카드 고르기 (순수 로직) ───────────────────────────
// node scripts/check-autocheckin.mjs 로 검증한다. 화면은 여기 결과만 그린다.
//
// 규칙 두 개가 전부다.
//  1. 끼울 값이 없는 카드는 후보에서 뺀다 — "{todos}" 가 그대로 박힌 프롬프트를
//     건네면 그 순간 사용자는 이 기능을 다시 쓰지 않는다.
//  2. 같은 시각이면 같은 카드가 나온다 — 리렌더마다 바뀌면 읽다 말고 놓친다.
//     (missionPick 과 같은 이유로 시각을 씨앗으로 쓴다)
import { PROMPT_CARDS } from '../data/promptCards.js'
import { slotOf } from './timeBanner.js'
import { seedOf } from './missionPick.js'

/**
 * 프롬프트에 끼울 값 만들기.
 * todos 는 미완료만, 최대 7개 — 20개를 통째로 붙이면 AI 답이 뭉개진다.
 */
export function buildContext({
  todos = [], byGroup = {}, event = null, measured = false, now = Date.now(),
} = {}) {
  const pending = todos
    .filter(t => !t.completed && !t.done && t.todo_type !== 'period')
    .slice(0, 7)
    .map(t => t.title || t.text)
    .filter(Boolean)

  return {
    todos:   pending.length ? pending.map(t => `- ${t}`).join('\n') : '',
    topTodo: pending[0] ?? '',
    event:   event?.title ?? '',
    produce: String(Math.round(byGroup.produce ?? 0)),
    consume: String(Math.round(byGroup.consume ?? 0)),
    connect: String(Math.round(byGroup.connect ?? 0)),
    date:    new Date(now).toLocaleDateString('ko-KR'),
  }
}

/** 카드가 요구하는 것이 ctx 에 다 있는가 */
export function canUse(card, ctx = {}, opts = {}) {
  for (const need of card.need ?? []) {
    if (need === 'todos'       && !ctx.todos)   return false
    if (need === 'topTodo'     && !ctx.topTodo) return false
    if (need === 'event'       && !ctx.event)   return false
    if (need === 'measured'    && !opts.measured) return false
    if (need === 'consumeHigh' && !opts.consumeHigh) return false
  }
  return true
}

/** 프롬프트에 값 채우기 — 남은 빈칸이 있으면 null (그 카드는 쓰지 않는다) */
export function fill(template, ctx = {}) {
  const out = template.replace(/\{(\w+)\}/g, (m, k) => (ctx[k] ? ctx[k] : m))
  return /\{\w+\}/.test(out) ? null : out
}

/**
 * 지금 꺼낼 카드 하나.
 * 최근 쓴 것을 따로 기억하지 않는다 — 매시간 한 칸씩 넘어가므로
 * pool 을 순서대로 돈다. 무작위보다 겹침이 적다.
 *
 * @returns { id, title, hint, prompt } | null
 */
export function pickPrompt({
  now = Date.now(), ctx = {}, measured = false, consumeHigh = false,
  cards = PROMPT_CARDS,
} = {}) {
  const slot = slotOf(new Date(now).getHours())
  const opts = { measured, consumeHigh }
  const usable = cards.filter(c => canUse(c, ctx, opts) && fill(c.prompt, ctx))

  // 지금 시간대 카드와 '언제나' 카드를 번갈아 놓는다.
  // 시간대 카드만 쓰면 '언제나' 카드는 영영 안 나오고, 다 섞으면 오전에 "오늘 돌아보기" 가 나온다
  const mine = usable.filter(c => c.slot === slot)
  const any = usable.filter(c => c.slot === 'any')
  const pool = []
  for (let i = 0; i < Math.max(mine.length, any.length); i++) {
    if (mine[i]) pool.push(mine[i])
    if (any[i]) pool.push(any[i])
  }
  if (!pool.length) return null

  // 한 시간 안에서는 같은 카드, 다음 시간에는 다음 카드.
  // 시작점은 날짜로 흩는다 — 시각만 쓰면 카드 수가 24의 약수일 때 매일 같은 시각에 같은 카드가 나온다
  const d = new Date(now)
  const start = seedOf(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)
  const card = pool[(start + d.getHours()) % pool.length]

  return { id: card.id, title: card.title, hint: card.hint, prompt: fill(card.prompt, ctx) }
}
