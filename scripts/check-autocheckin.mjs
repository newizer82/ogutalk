import assert from 'node:assert/strict'
import {
  SLOT_MS, MAX_BACKFILL_MS, floorToSlot, slotKey, buildSlots,
} from '../src/lib/checkinSlots.js'
import {
  categoryForApp, groupOf, labelOf, emojiOf, colorOf,
  GROUPS, CATEGORIES, BUILTIN_CATEGORY,
} from '../src/data/appCategories.js'
import { buildCheckinEntry } from '../src/lib/checkinEntry.js'

const at = (h, m) => new Date(2026, 8, 20, h, m, 0, 0).getTime()

// floorToSlot: :00~:29 → :00, :30~:59 → :30
assert.equal(floorToSlot(at(15, 10)), at(15, 0))
assert.equal(floorToSlot(at(15, 29)), at(15, 0))
assert.equal(floorToSlot(at(15, 30)), at(15, 30))
assert.equal(floorToSlot(at(15, 59)), at(15, 30))

// slotKey 형식
assert.equal(slotKey(at(15, 30)), '2026-09-20T15:30')
assert.equal(slotKey(at(9, 0)),   '2026-09-20T09:00')

// 진행 중 슬롯은 90% 이상 지났을 때만 포함한다.
// 15:10 → 현재 슬롯(15:00)은 10분밖에 안 지났으므로 제외
{
  const slots = buildSlots(at(14, 0), at(15, 10))
  assert.deepEqual(slots.map(s => s.key), [
    '2026-09-20T14:00', '2026-09-20T14:30',
  ])
}

// 15:59 → 현재 슬롯(15:30)은 29분 지났으므로 포함 (알람 시점)
{
  const slots = buildSlots(at(15, 0), at(15, 59))
  assert.deepEqual(slots.map(s => s.key), [
    '2026-09-20T15:00', '2026-09-20T15:30',
  ])
}

// 한 시간의 두 슬롯은 같은 hour 를 갖는다
{
  const slots = buildSlots(at(15, 0), at(15, 59))
  assert.deepEqual(slots.map(s => s.hour), [15, 15])
}

// 24시간 상한: 정확히 48슬롯이어야 한다
{
  const now = at(15, 59)
  const slots = buildSlots(now - 72 * 60 * 60 * 1000, now)
  assert.equal(slots.length, 48, `정확히 48슬롯이어야 하는데 ${slots.length}`)
  // 49개에서 첫 개를 자르므로 첫 슬롯은 어제 16:00 (경계 점검)
  assert.equal(slots[0].key, '2026-09-19T16:00', `첫 슬롯이 정확한 경계에서 잘려야 함`)
}

// 멱등: 이미 기록된 키는 제외
{
  const existing = new Set(['2026-09-20T14:00'])
  const slots = buildSlots(at(14, 0), at(15, 10), existing)
  assert.deepEqual(slots.map(s => s.key), ['2026-09-20T14:30'])
}

// lastBackfillAt 이 null 이면 24시간 전부터, 정확히 48슬롯
{
  const slots = buildSlots(null, at(15, 59))
  assert.equal(slots.length, 48, `null fallback은 정확히 48슬롯이어야 하는데 ${slots.length}`)
}

console.log('✓ checkinSlots 검증 통과')

// ── 내장 매핑: 이전엔 합쳐져 있던 것들이 분리됐는가 ──
assert.equal(categoryForApp('com.google.android.youtube'), 'video')   // 유튜브 ≠ SNS
assert.equal(categoryForApp('com.instagram.android'), 'sns')
assert.equal(categoryForApp('com.google.android.gm'), 'work')
assert.equal(categoryForApp('com.openai.chatgpt'), 'ai')
assert.equal(categoryForApp('com.android.chrome'), 'search')
assert.equal(categoryForApp('viva.republica.toss'), 'finance')

// 카카오톡: 이전엔 "업무/잡담 구분 불가"로 일부러 뺐지만, 메신저 칸이 생겨 분류된다
assert.equal(categoryForApp('com.kakao.talk'), 'messenger')

// 모르는 앱은 null (기록하지 않음)
assert.equal(categoryForApp('com.unknown.app'), null)

// ── OS 분류 폴백: 내장 목록에 없는 앱 ──
assert.equal(categoryForApp('com.some.game', {}, 0), 'game')    // CATEGORY_GAME
assert.equal(categoryForApp('com.some.video', {}, 2), 'video')  // CATEGORY_VIDEO
assert.equal(categoryForApp('com.some.app', {}, -1), null)      // CATEGORY_UNDEFINED → 미분류
assert.equal(categoryForApp('com.some.app', {}, undefined), null)

// 우선순위: 사용자 지정 > 내장 > OS
assert.equal(categoryForApp('com.google.android.youtube', {}, 7), 'video',
  '내장 목록이 OS 분류보다 우선해야 함')
assert.equal(
  categoryForApp('com.google.android.youtube', { 'com.google.android.youtube': 'produce' }, 2),
  'produce', '사용자 지정이 최우선')

// 이전 Minor: overrides 에 null 이 와도 throw 하지 않아야 함
assert.equal(categoryForApp('com.google.android.youtube', null), 'video')

// ── 내장 목록의 모든 값이 실제로 정의된 세부 분류인가 (오타 방지) ──
for (const [pkg, cat] of Object.entries(BUILTIN_CATEGORY)) {
  assert.ok(CATEGORIES[cat], `${pkg} → '${cat}' 는 정의되지 않은 분류`)
}

// ── 그룹 묶기: 세부·그룹·옛 값 모두 처리 ──
assert.equal(groupOf('video'), 'consume')
assert.equal(groupOf('messenger'), 'connect')
assert.equal(groupOf('finance'), 'living')
assert.equal(groupOf('search'), 'consume')       // 검색·포털은 소비
assert.equal(groupOf('shopping'), 'produce')     // 구매·주문·예약은 생산
assert.equal(groupOf('create'), 'produce')       // 촬영·제작
assert.equal(categoryForApp('com.sec.android.app.camera'), 'create')
assert.equal(categoryForApp('com.sampleapp'), 'shopping')          // 배민 = 주문
assert.equal(categoryForApp('com.google.android.apps.docs.editors.sheets'), 'work')
assert.equal(groupOf('consume'), 'consume')     // 수동 기록 = 그룹 그대로
// 옛 기록이 리포트에서 사라지지 않아야 한다
assert.equal(groupOf('goal_work'), 'produce')
assert.equal(groupOf('study'), 'produce')
assert.equal(groupOf('rest'), 'living')
assert.equal(groupOf('sns'), 'connect')          // 옛 'sns' 는 새 SNS 로 합쳐짐
assert.equal(groupOf('nonsense'), null)

// 모든 세부 분류가 실재하는 그룹에 속하는가
for (const [id, c] of Object.entries(CATEGORIES)) {
  assert.ok(GROUPS[c.group], `${id} 의 그룹 '${c.group}' 가 없음`)
}

// 라벨·이모지·색: 모르는 값도 렌더가 깨지지 않아야 함
assert.equal(labelOf('video'), '📺 동영상')
assert.equal(labelOf('rest'), '😴 휴식/식사')   // 옛 값도 라벨 유지
assert.equal(labelOf('nonsense'), 'nonsense')   // 모르면 원문
assert.equal(emojiOf('nonsense'), '?')
assert.equal(colorOf('video'), GROUPS.consume.color)   // 세부는 그룹 색을 따른다
assert.equal(colorOf('nonsense'), '#6366f1')

console.log('✓ appCategories 검증 통과')

// 엔트리는 "현재 시각"이 아니라 "주어진 시각"으로 만들어져야 한다
{
  const e = buildCheckinEntry('sns', at(9, 30))
  assert.equal(e.activity_type, 'sns')
  assert.equal(e.alarm_hour, 9)
  assert.equal(new Date(e.created_at).getTime(), at(9, 30))
}

console.log('✓ checkinStore 검증 통과')
