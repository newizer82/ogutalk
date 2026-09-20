import assert from 'node:assert/strict'
import {
  SLOT_MS, MAX_BACKFILL_MS, floorToSlot, slotKey, buildSlots,
} from '../src/lib/checkinSlots.js'
import { categoryForApp } from '../src/data/appCategories.js'

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

// 내장 매핑
assert.equal(categoryForApp('com.google.android.youtube'), 'sns')
assert.equal(categoryForApp('com.google.android.gm'), 'study')

// 모르는 앱은 null (기록하지 않음)
assert.equal(categoryForApp('com.unknown.app'), null)

// 카카오톡은 의도적으로 내장 매핑에 없다 (업무/잡담 구분 불가)
assert.equal(categoryForApp('com.kakao.talk'), null)

// 사용자 지정이 내장 매핑보다 우선
assert.equal(
  categoryForApp('com.google.android.youtube', { 'com.google.android.youtube': 'study' }),
  'study',
)

// 사용자 지정으로 goal_work 부여 가능 (자동 판정으로는 절대 안 나옴)
assert.equal(categoryForApp('com.unknown.app', { 'com.unknown.app': 'goal_work' }), 'goal_work')
assert.ok(!Object.values((await import('../src/data/appCategories.js')).BUILTIN_CATEGORY)
  .includes('goal_work'), '내장 매핑에 goal_work 가 있으면 안 됨')

console.log('✓ appCategories 검증 통과')
