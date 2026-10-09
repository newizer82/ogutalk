import assert from 'node:assert/strict'
import {
  SLOT_MS, MAX_BACKFILL_MS, floorToSlot, slotKey, buildSlots,
} from '../src/lib/checkinSlots.js'
import {
  categoryForApp, groupOf, labelOf, emojiOf, colorOf,
  GROUPS, CATEGORIES, BUILTIN_CATEGORY,
} from '../src/data/appCategories.js'
import { buildCheckinEntry, mergeCheckins } from '../src/lib/checkinEntry.js'
import {
  minutesOf, todayTotals, alarmMood, moodHeadline, pickNextTodo, todoHint, formatMinutes,
  pickUpcomingEvent, eventLine, shortPlace,
} from '../src/lib/alarmContext.js'
import {
  oguScore, phoneScore, doneScore, nineMinutes, NINE, WEIGHTS,
} from '../src/lib/oguScore.js'
import { pickMissions, seedOf, dayOffsetKey } from '../src/lib/missionPick.js'
import { MISSIONS, AREAS } from '../src/data/missions.js'
import { pickBanners, hiddenToday } from '../src/lib/bannerPick.js'
import { DEFAULT_BANNERS, BANNER_KINDS } from '../src/data/banners.js'

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
assert.equal(categoryForApp('com.nhn.android.search', { 'com.nhn.android.search': 'goal_work' }, 7), 'search')  // 옛 수정값은 무시
assert.equal(categoryForApp('com.nhn.android.search', { 'com.nhn.android.search': 'produce' }, 7), 'produce')   // 새 수정값은 존중
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
assert.equal(colorOf('nonsense'), '#B0B0B6')

console.log('✓ appCategories 검증 통과')

// 엔트리는 "현재 시각"이 아니라 "주어진 시각"으로 만들어져야 한다
{
  const e = buildCheckinEntry('sns', at(9, 30))
  assert.equal(e.activity_type, 'sns')
  assert.equal(e.alarm_hour, 9)
  assert.equal(new Date(e.created_at).getTime(), at(9, 30))
}

console.log('✓ checkinStore 검증 통과')

// ── v1.8 알람 컨텍스트: 상태 판정 · 오늘 누적 · 다음 할일 ──────────
{
  const H = (h, m) => new Date(2026, 9, 7, h, m, 0, 0).getTime()
  const rec = (type, h, m) => ({ activity_type: type, created_at: new Date(H(h, m)).toISOString() })
  const now = H(20, 59)

  // 1건이 대표하는 시간: 자동(:00/:30)=30분, 수동(그 외)=60분
  assert.equal(minutesOf(rec('video', 20, 30)), 30)
  assert.equal(minutesOf(rec('video', 20, 0)),  30)
  assert.equal(minutesOf(rec('consume', 19, 59)), 60)

  // 오늘 누적: 어제 기록과 모르는 값은 빼고 센다
  {
    const yesterday = { activity_type: 'video', created_at: new Date(H(20, 30) - 86400000).toISOString() }
    const { total, byGroup } = todayTotals(
      [rec('video', 20, 30), rec('work', 10, 0), rec('nonsense', 11, 0), yesterday], now)
    assert.equal(byGroup.consume, 30)
    assert.equal(byGroup.produce, 30)
    assert.equal(total, 60, '모르는 값은 누적에서 제외')
  }

  // 순삭: 자동 요약의 소비 앱 40분 이상
  {
    const m = alarmMood({ checkins: [], autoSummary: { category: 'video', label: '유튜브', minutes: 52 }, now })
    assert.equal(m.mood, 'binge')
    assert.equal(moodHeadline(m), '유튜브 52분째예요')
  }
  // 같은 소비라도 짧으면 순삭이 아니다 (기록 연속도 없음)
  assert.equal(
    alarmMood({ checkins: [], autoSummary: { category: 'video', label: '유튜브', minutes: 12 }, now }).mood,
    'normal')
  // 자동 기록이 꺼져 있어도 최근 2슬롯이 소비면 순삭
  assert.equal(alarmMood({ checkins: [rec('video', 20, 30), rec('sns', 20, 0)], now }).mood, 'normal',
    'SNS는 소통 — 연속 소비가 아니다')
  assert.equal(alarmMood({ checkins: [rec('video', 20, 30), rec('game', 20, 0)], now }).mood, 'binge')

  // 집중: 생산이 2슬롯 이상 이어짐 → 칭찬 문구
  {
    const m = alarmMood({ checkins: [rec('work', 20, 30), rec('ai', 20, 0)], now })
    assert.equal(m.mood, 'focus')
    assert.ok(moodHeadline(m).includes('집중'))
  }
  // 오래된 기록은 연속으로 치지 않는다 (100분 창)
  assert.equal(alarmMood({ checkins: [rec('work', 17, 0), rec('work', 17, 30)], now }).mood, 'normal')

  // 다음 할일: 마감 지난 것 > 마감 가까운 것 > 우선순위 > 먼저 만든 것
  {
    const todos = [
      { id: 'a', title: '마감 없음·높음', priority: 'high',   created_at: '2026-10-01' },
      { id: 'b', title: '내일 마감',      priority: 'low',    due_date: '2026-10-08' },
      { id: 'c', title: '어제 마감',      priority: 'medium', due_date: '2026-10-06' },
      { id: 'd', title: '완료됨',         priority: 'high',   due_date: '2026-10-01', completed: true },
    ]
    assert.equal(pickNextTodo(todos, now).id, 'c')
    assert.equal(pickNextTodo(todos.filter(t => t.id !== 'c'), now).id, 'b')
    assert.equal(pickNextTodo([todos[0]], now).id, 'a')
    assert.equal(pickNextTodo([todos[3]], now), null, '완료된 할일은 제안하지 않는다')
    assert.equal(pickNextTodo([], now), null)
    assert.equal(todoHint(todos[2], now), '1일 지남')
    assert.equal(todoHint(todos[1], now), '내일 마감')
    assert.equal(todoHint(todos[0], now), '우선순위 높음')
  }

  assert.equal(formatMinutes(0), '0분')
  assert.equal(formatMinutes(40), '40분')
  assert.equal(formatMinutes(190), '3시간 10분')
  assert.equal(formatMinutes(120), '2시간')
}
console.log('✓ alarmContext 검증 통과')


// ── 스트릭 (dayLog 는 localStorage 를 쓰므로 최소 스텁으로 검증) ──
{
  const store = {}
  globalThis.localStorage = {
    getItem: k => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v) },
  }
  const { streakDays, saveDayScore, logTodoDone, todayLog } = await import('../src/lib/dayLog.js')
  const day = n => Date.now() - n * 86400000

  // 오늘 아직 기준 미만이어도 어제까지의 연속은 유지된다
  saveDayScore(70, day(1)); saveDayScore(80, day(2)); saveDayScore(40, day(3))
  assert.equal(streakDays(60), 2, '어제·그제 2일 연속')

  saveDayScore(90, day(0))
  assert.equal(streakDays(60), 3, '오늘까지 3일 연속')

  saveDayScore(30, day(0))
  assert.equal(streakDays(60), 2, '오늘 점수가 낮으면 어제까지만 센다')

  // 할일 완료는 오늘 로그에 쌓이고 알람 반응도 함께 표시된다
  logTodoDone(); logTodoDone()
  assert.equal(todayLog().doneCount, 2)
  assert.equal(todayLog().actedOnAlarm, true)
  delete globalThis.localStorage
}
console.log('✓ dayLog 검증 통과')

// ── 분류표 확장 (v1.9.1): 생산적 활용 앱이 미분류로 새지 않는지 ──
{
  // 독서·강의는 학습(생산) — 미분류면 리포트와 오구 지수에서 통째로 사라진다
  for (const pkg of ['kr.co.millie.millieshelf', 'kr.co.influential.youngkangapp',
                     'com.initialcoms.ridi', 'com.inflab.inflearn', 'net.pedaling.class101',
                     'com.udemy.android', 'org.coursera.android']) {
    assert.equal(categoryForApp(pkg), 'learning', pkg)
    assert.equal(groupOf(categoryForApp(pkg)), 'produce', pkg)
  }

  // 기록·제작
  assert.equal(categoryForApp('com.naver.clova.minute'), 'create')        // 클로바노트
  assert.equal(categoryForApp('com.psma.videospeedchanger'), 'create')    // 편집 도구 (video → create 교정)
  assert.equal(categoryForApp('com.adobe.scan.android'), 'create')

  // 업무·정리
  assert.equal(categoryForApp('com.todoist'), 'work')
  assert.equal(categoryForApp('com.alt.goodmorning'), 'work')            // 루티너리
  assert.equal(categoryForApp('com.rainist.banksalad2'), 'finance')      // 뱅크샐러드

  // 건강·운동 신설 — 운동 시간은 소비가 아니다
  assert.ok(CATEGORIES.health, 'health 분류가 있어야 한다')
  assert.equal(groupOf('health'), 'produce', '운동은 해낸 일 — 생산으로 센다')
  assert.equal(categoryForApp('com.sec.android.app.shealth'), 'health')
  assert.equal(categoryForApp('com.strava'), 'health')
  assert.equal(categoryForApp('com.golfzon.android'), 'health')          // 골프 (daily → health 교정)
  assert.equal(groupOf(categoryForApp('com.strava')), 'produce')         // 운동 시간은 생산 점수에 들어간다
  assert.equal(categoryForApp('com.golfzon.booking'), 'shopping', '예약은 구매·주문·예약 그대로')

  // 소비 쪽 누락도 메웠는지 (소비가 과소평가되면 절제 점수가 거짓이 된다)
  for (const pkg of ['com.cjenm.tving', 'com.wavve.pooq', 'com.nhn.android.webtoon', 'me.zepeto.main']) {
    assert.equal(groupOf(categoryForApp(pkg)), 'consume', pkg)
  }
  assert.equal(groupOf(categoryForApp('com.linkedin.android')), 'connect')

  // 내장 목록 전체가 유효한 분류를 가리키는지 + 중복 키가 없는지
  const entries = Object.entries(BUILTIN_CATEGORY)
  for (const [pkg, cat] of entries) assert.ok(CATEGORIES[cat], `${pkg} → ${cat}`)
  assert.ok(entries.length >= 180, `매핑 수 ${entries.length}`)
}
console.log('✓ 분류표 확장 검증 통과')

// ── 서버·로컬 기록 합치기 (팝업과 리포트가 다른 말을 하지 않도록) ──
{
  const server = [{ activity_type: 'work',  created_at: '2026-10-09T08:00:00+00:00' }]
  const local  = [
    { activity_type: 'video', created_at: '2026-10-09T08:00:00.000Z' },  // 같은 시각 → 서버 우선
    { activity_type: 'game',  created_at: '2026-10-09T09:00:00.000Z' },  // 서버에 없는 기록
  ]
  const merged = mergeCheckins(server, local)
  assert.equal(merged.length, 2, '같은 시각은 한 건으로')
  assert.equal(merged.find(r => r.created_at.startsWith('2026-10-09T08')).activity_type, 'work', '서버 우선')
  assert.ok(merged.some(r => r.activity_type === 'game'), '서버에 없는 로컬 기록도 남는다')
  assert.ok(new Date(merged[0].created_at) >= new Date(merged[1].created_at), '최신순 정렬')
  assert.deepEqual(mergeCheckins([], []), [])
  assert.equal(mergeCheckins([], [{ activity_type: 'x', created_at: 'bad' }]).length, 0, '깨진 시각은 버린다')
}
console.log('✓ mergeCheckins 검증 통과')

// ── 캘린더 일정 고르기 (v1.10) ───────────────────────────────────
{
  const T = (h, m) => new Date(2026, 9, 9, h, m, 0, 0).getTime()
  const now = T(14, 59)
  const ev = (title, sh, sm, eh, em, extra = {}) =>
    ({ title, startMs: T(sh, sm), endMs: T(eh, em), allDay: false, location: '', ...extra })

  // 곧 시작하는 일정을 고른다
  {
    const e = pickUpcomingEvent([ev('강남 미팅', 15, 0, 16, 0)], now)
    assert.equal(e.title, '강남 미팅')
    assert.equal(e.startsInMin, 1)
    assert.equal(eventLine(e), '15:00 강남 미팅')
  }
  // 진행 중인 일정이 곧 시작할 일정보다 먼저다
  {
    const e = pickUpcomingEvent([ev('다음 회의', 15, 30, 16, 0), ev('진행 중 회의', 14, 0, 15, 30)], now)
    assert.equal(e.title, '진행 중 회의')
    assert.equal(e.ongoing, true)
    assert.equal(eventLine(e), '진행 중 회의 진행 중')
  }
  // 끝난 일정, 종일 일정, 너무 먼 일정은 제외
  assert.equal(pickUpcomingEvent([ev('끝난 회의', 13, 0, 14, 0)], now), null)
  assert.equal(pickUpcomingEvent([ev('생일', 0, 0, 23, 59, { allDay: true })], now), null, '종일 일정은 알람에 안 띄운다')
  assert.equal(pickUpcomingEvent([ev('내일 준비', 18, 0, 19, 0)], now), null, '90분 밖은 아직 알릴 때가 아니다')
  assert.equal(pickUpcomingEvent([], now), null)
  assert.equal(pickUpcomingEvent([{ title: '', startMs: T(15, 0), endMs: T(16, 0) }], now), null, '제목 없는 데이터는 버린다')
}
console.log('✓ 캘린더 일정 검증 통과')

// ── 장소 한 줄 줄이기 ────────────────────────────────────────────
{
  assert.equal(shortPlace('대구 달서구청, 대한민국 대구광역시 달서구 월성2동 학산로 45'), '대구 달서구청')
  assert.equal(shortPlace('강남역'), '강남역')
  assert.equal(shortPlace(''), '')
  assert.equal(shortPlace(null), '')
  assert.equal(shortPlace('아주아주아주아주아주아주아주긴장소이름입니다'), '아주아주아주아주아주아주아주긴장소…')
  assert.equal(shortPlace('  스타벅스 역삼점  , 서울'), '스타벅스 역삼점')
}
console.log('✓ shortPlace 검증 통과')

// ── 오구 지수 5:9 ────────────────────────────────────────────────
{
  const D = (h, m) => new Date(2026, 9, 9, h, m, 0, 0).getTime()
  const now = D(22, 0)
  // 자동 기록 1건 = 30분
  const slots = (type, n, startH) => Array.from({ length: n }, (_, i) => ({
    activity_type: type,
    created_at: new Date(D(startH + Math.floor(i / 2), (i % 2) * 30)).toISOString(),
  }))

  // 9분류에 소비(동영상·게임·검색)는 들어가지 않는다
  assert.ok(NINE.includes('work') && NINE.includes('health') && NINE.includes('messenger'))
  assert.ok(!NINE.includes('video') && !NINE.includes('game') && !NINE.includes('search'))
  assert.equal(NINE.length, 9, `9분류여야 한다 (현재 ${NINE.length})`)

  // 9 영역: 시간 35 + 다양성 15
  {
    // 업무 2시간(목표 달성) + 학습·운동·금융 각 30분 → 4칸 = 다양성 만점
    const checkins = [...slots('work', 4, 9), ...slots('learning', 1, 13),
                      ...slots('health', 1, 14), ...slots('finance', 1, 15)]
    const p = phoneScore(checkins, { produceTarget: 120, consumeLimit: 120 }, now)
    assert.equal(p.time, 35, '목표를 넘기면 시간 만점')
    assert.equal(p.filled, 4)
    assert.equal(p.variety, 15, '4칸이면 다양성 만점')
    assert.equal(p.penalty, 0)
    assert.equal(p.total, 50)
  }
  // 한 가지만 길게 하면 시간은 차도 다양성이 빈다
  {
    const p = phoneScore(slots('work', 8, 9), { produceTarget: 120, consumeLimit: 120 }, now)
    assert.equal(p.time, 35)
    assert.equal(p.variety, Math.round(15 / 4), '1칸이면 다양성 1/4')
  }
  // 소비 초과 감점은 10점까지만
  {
    const p = phoneScore([...slots('work', 4, 9), ...slots('video', 12, 13)],
                         { produceTarget: 120, consumeLimit: 120 }, now)
    assert.equal(p.penalty, 10, '초과가 아무리 커도 감점은 10점 상한')
    assert.ok(p.total < 50)
  }
  // 폰을 안 쓴 날은 감점 없음 (0점일 뿐)
  assert.equal(phoneScore([], {}, now).penalty, 0)

  // 5 영역: 각 10점
  {
    const d = doneScore({ missionDone: 3, missionTotal: 3, todoDone: 1, goalKept: true, actedOnAlarm: true })
    assert.equal(d.total, 50, '다섯 가지를 다 하면 50점')
    const one = doneScore({ missionDone: 1, missionTotal: 3 })
    assert.equal(one.parts.missionOne, 10)
    assert.equal(one.parts.missionAll, 0, '3개 완주해야 두 번째 10점')
    assert.equal(doneScore({}).total, 0)
  }

  // 전체: 5 와 9 가 반반
  {
    const r = oguScore({
      checkins: [...slots('work', 4, 9), ...slots('learning', 1, 13),
                 ...slots('health', 1, 14), ...slots('ai', 1, 15)],
      goals: { produceTarget: 120, consumeLimit: 120 },
      missionDone: 3, missionTotal: 3, todoDone: 2, goalKept: true, actedOnAlarm: true, now,
    })
    assert.equal(r.phone.total, 50)
    assert.equal(r.done.total, 50)
    assert.equal(r.score, 100)
    assert.equal(r.grade, '오늘 잘 썼어요')
  }

  // 조언: 소비 초과 > 미션 > 할일 > 목표 순으로 "지금 바꿀 수 있는 것"
  {
    const over = oguScore({ checkins: slots('video', 12, 10), now })
    assert.ok(over.advice.includes('힐링'), over.advice)
    const noMission = oguScore({ checkins: slots('work', 4, 9), missionDone: 1, now })
    assert.ok(noMission.advice.includes('미션'), noMission.advice)
    const noTodo = oguScore({ checkins: slots('work', 4, 9), missionDone: 3, now })
    assert.ok(noTodo.advice.includes('할일'), noTodo.advice)
  }

  // nineMinutes: 그룹으로 기록된 수동 체크인은 다양성 칸에 넣지 않는다
  {
    const n = nineMinutes([...slots('produce', 2, 9), ...slots('work', 1, 11)], now)
    assert.deepEqual(Object.keys(n), ['work'], '그룹 기록은 어느 칸인지 알 수 없다')
  }
  // 그래도 시간 점수에는 들어간다 (수동 기록이 버려지면 안 된다)
  assert.ok(phoneScore(slots('produce', 4, 9), { produceTarget: 120 }, now).time > 0)
}
console.log('✓ 오구 지수 5:9 검증 통과')

// ── 오늘의 미션 고르기 ───────────────────────────────────────────
{
  const day = '2026-10-09'
  const areas = Object.keys(AREAS)

  // 몸·정리·머리에서 하나씩
  {
    const picked = pickMissions(day, {}, null)
    assert.equal(picked.length, 3)
    assert.deepEqual(picked.map(m => m.area).sort(), [...areas].sort())
  }
  // 같은 날이면 몇 번을 돌려도 같은 결과 (렌더마다 바뀌면 안 된다)
  assert.deepEqual(pickMissions(day, {}, null).map(m => m.id),
                   pickMissions(day, {}, null).map(m => m.id))
  // 날이 바뀌면 조합도 바뀐다
  assert.notDeepEqual(pickMissions(day, {}, null).map(m => m.id),
                      pickMissions('2026-10-10', {}, null).map(m => m.id))
  // 셔플(salt)하면 다른 조합
  assert.notDeepEqual(pickMissions(day, {}, null, 0).map(m => m.id),
                      pickMissions(day, {}, null, 1).map(m => m.id))

  // 생애주기를 안 고르면 전용 미션은 안 나온다
  {
    const ids = pickMissions(day, {}, null).map(m => m.id)
    assert.ok(ids.every(id => !MISSIONS.find(m => m.id === id)?.stage))
  }
  // 고르면 해당 단계 미션만 섞인다 (남의 단계는 안 나온다)
  {
    const picked = pickMissions(day, {}, 'senior')
    assert.ok(picked.every(m => !m.stage || m.stage === 'senior'))
  }

  // 최근 14일에 나온 미션은 다시 안 뽑는다
  {
    const first = pickMissions(day, {}, null)
    const recent = Object.fromEntries(first.map(m => [m.id, day]))
    const second = pickMissions('2026-10-10', { recent }, null)
    assert.ok(second.every(m => !recent[m.id]), '최근 미션 재등장 금지')
  }
  // 15일 전 기록은 풀린다
  {
    const old = dayOffsetKey(day, -15)
    const m0 = pickMissions(day, {}, null)[0]
    const again = pickMissions(day, { recent: { [m0.id]: old } }, null)
    assert.equal(again[0].id, m0.id, '14일이 지나면 다시 나올 수 있다')
  }
  // 3번 건너뛴 미션은 제외
  {
    const m0 = pickMissions(day, {}, null)[0]
    const after = pickMissions(day, { skips: { [m0.id]: 3 } }, null)
    assert.notEqual(after[0].id, m0.id)
    assert.equal(after.length, 3, '제외해도 세 개는 채운다')
  }
  // 풀이 말라도 빈칸을 만들지 않는다
  {
    const allRecent = Object.fromEntries(MISSIONS.map(m => [m.id, day]))
    assert.equal(pickMissions(day, { recent: allRecent }, null).length, 3)
  }

  // id 중복 금지 (최근 기록·건너뛴 횟수가 id 로 남는다)
  {
    const ids = MISSIONS.map(m => m.id)
    assert.equal(new Set(ids).size, ids.length)
    assert.ok(MISSIONS.length >= 55, `미션 수 ${MISSIONS.length}`)
  }
  assert.equal(seedOf('2026-10-09'), seedOf('2026-10-09'))
  assert.equal(dayOffsetKey('2026-03-01', -1), '2026-02-28')
}
console.log('✓ 오늘의 미션 검증 통과')

// ── 배너 고르기 ──────────────────────────────────────────────────
{
  const now = new Date(2026, 9, 9, 12, 0, 0).getTime()
  const day = 86400000
  const b = (id, extra = {}) => ({ id, text: id, kind: 'notice', ...extra })

  // 기간이 지난 배너는 코드 수정 없이 사라진다 (이 기능의 가장 큰 위험)
  assert.deepEqual(
    pickBanners([b('지남', { ends_at: new Date(now - day).toISOString() }), b('상시')], now).map(x => x.id),
    ['상시'])
  assert.deepEqual(
    pickBanners([b('아직', { starts_at: new Date(now + day).toISOString() }), b('지금')], now).map(x => x.id),
    ['지금'])
  assert.equal(pickBanners([b('끈것', { active: false })], now).length, 0)
  assert.equal(pickBanners([{ id: 'x', kind: 'notice' }], now).length, 0, '문구 없는 행은 버린다')

  // 이벤트는 한 장만
  {
    const picked = pickBanners([b('e1', { kind: 'event', sort: 1 }), b('e2', { kind: 'event', sort: 2 }), b('n1', { sort: 3 })], now)
    assert.deepEqual(picked.map(x => x.id), ['e1', 'n1'])
  }
  // 최대 4장, sort 순
  {
    const many = [5, 4, 3, 2, 1].map(n => b('b' + n, { sort: n }))
    assert.deepEqual(pickBanners(many, now).map(x => x.id), ['b1', 'b2', 'b3', 'b4'])
  }
  // 오늘 하루 안 보기는 날짜가 바뀌면 풀린다
  assert.equal(hiddenToday('2026-10-09', now), true)
  assert.equal(hiddenToday('2026-10-08', now), false)
  assert.equal(hiddenToday(null, now), false)

  // 내장 배너는 모두 유효해야 한다 (기본값이 깨지면 홈이 빈다)
  assert.ok(pickBanners(DEFAULT_BANNERS, now).length >= 3)
  for (const d of DEFAULT_BANNERS) assert.ok(BANNER_KINDS[d.kind], `${d.id} → ${d.kind}`)
}
console.log('✓ 배너 검증 통과')
