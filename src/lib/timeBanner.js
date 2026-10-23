// ── 시간대 배너 (순수 로직) ─────────────────────────────────────
// 문구만 바뀌는 배너는 사흘이면 안 본다. 각 시간대가 "내 숫자" 를 말해야 한다.
// "오전엔 성장 1시간 20분" 은 나만 볼 수 있는 문장이고,
// "오늘도 힘내세요" 는 누구나 받는 문장이다.
import { formatMinutes } from './alarmContext.js'

export const SLOTS = {
  morning:   { until: 9,  emoji: '🌅', from: '#FFB36B', to: '#FF6B2C' },
  noon:      { until: 13, emoji: '☀️', from: '#FFC56B', to: '#FF8A3D' },
  afternoon: { until: 18, emoji: '🔥', from: '#FFA96B', to: '#E8762C' },
  night:     { until: 24, emoji: '🌙', from: '#3A2A6B', to: '#7A4AB8' },
}

export function slotOf(hour) {
  if (hour < SLOTS.morning.until) return 'morning'
  if (hour < SLOTS.noon.until) return 'noon'
  if (hour < SLOTS.afternoon.until) return 'afternoon'
  return 'night'
}

/**
 * @returns { slot, emoji, title, sub, cta, tab, from, to, showsScore }
 *   tab = 눌렀을 때 갈 곳. 'home' 이면 탭을 바꾸지 않고 focus 가 가리키는 카드로 간다.
 *   showsScore = 제목이 이미 점수를 말하고 있다 → 체크 줄에서 숫자를 또 쓰지 않는다
 */
export function bannerFor({
  now = Date.now(), byGroup = {}, goals = {},
  missionLeft = 0, score = null, yesterday = null, streak = 0,
} = {}) {
  const hour = new Date(now).getHours()
  const slot = slotOf(hour)
  const look = SLOTS[slot]
  const produce = byGroup.produce ?? 0
  const consume = byGroup.consume ?? 0
  const limit = goals.consumeLimit ?? 120
  const target = goals.produceTarget ?? 120
  const base = { slot, emoji: look.emoji, from: look.from, to: look.to }

  if (slot === 'morning') {
    return produce > 0
      ? { ...base, title: `벌써 성장 ${formatMinutes(produce)}`,
          sub: '좋은 출발이에요. 이대로 가볼까요?', cta: '오늘 보기', tab: 'reports' }
      : { ...base, title: '오늘, 세 가지만 할까요?',
          sub: missionLeft > 0 ? `5분이면 끝나는 미션 ${missionLeft}개가 기다려요` : '오늘의 추천 미션을 먼저 보세요',
          cta: '미션 보기', tab: 'home', focus: 'missions' }
  }

  if (slot === 'noon') {
    if (produce <= 0) {
      return { ...base, title: '오전은 조용했네요',
        sub: '지금 10분이면 성장 한 칸이에요', cta: '할일 보기', tab: 'todos' }
    }
    const left = Math.max(0, target - produce)
    return { ...base, title: `오전엔 성장 ${formatMinutes(produce)}`,
      sub: left > 0 ? `점심 뒤 ${formatMinutes(left)}만 더 하면 목표예요` : '오늘 목표를 벌써 채웠어요',
      cta: '오늘 보기', tab: 'reports' }
  }

  if (slot === 'afternoon') {
    const over = consume - limit
    if (over > 0) {
      return { ...base, title: `힐링 ${formatMinutes(consume)}째예요`,
        sub: '10분만 성장으로 돌려볼까요?', cta: '지금 하나만', tab: 'todos' }
    }
    return { ...base, title: '오후 한 칸 남았어요',
      sub: produce > 0 ? `지금까지 성장 ${formatMinutes(produce)}. 제일 잘 되는 시간이에요`
                       : '지금이 제일 잘 되는 시간이에요',
      cta: '할일 보기', tab: 'todos' }
  }

  // 밤 — 하루를 닫는다
  if (typeof score === 'number') {
    const diff = typeof yesterday === 'number' ? score - yesterday : null
    // 한 줄에 들어갈 만큼만 — 셋을 다 붙이면 말줄임표가 되어 아무것도 안 읽힌다
    const parts = []
    if (diff !== null) parts.push(`어제보다 ${diff >= 0 ? '▲' : '▼'}${Math.abs(diff)}`)
    if (streak > 0) parts.push(`🔥 ${streak}일 연속`)
    if (!parts.length) parts.push('내일 할 일 한 줄만 적어둘까요?')
    return { ...base, title: `오늘 오구 지수 ${score}점`, sub: parts.join(' · '),
      cta: '리포트', tab: 'reports', showsScore: true }
  }
  return { ...base, title: '오늘 하루는 어땠나요?',
    sub: '기록을 보면 내일이 조금 달라져요', cta: '리포트', tab: 'reports' }
}
