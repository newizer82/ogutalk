import assert from 'node:assert/strict'

// TabBar.jsx 의 id 와 같아야 한다. 틀린 id 로 탭을 바꾸면 예외 없이 조용히 무시된다.
const TAB_IDS = ['home', 'todos', 'alarms', 'reports', 'settings']
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
  const { streakDays, saveDayScore, logTodoDone, logAlarmAction, todayLog } = await import('../src/lib/dayLog.js')
  const day = n => Date.now() - n * 86400000

  // 오늘 아직 기준 미만이어도 어제까지의 연속은 유지된다
  saveDayScore(70, day(1)); saveDayScore(80, day(2)); saveDayScore(40, day(3))
  assert.equal(streakDays(60), 2, '어제·그제 2일 연속')

  saveDayScore(90, day(0))
  assert.equal(streakDays(60), 3, '오늘까지 3일 연속')

  saveDayScore(30, day(0))
  assert.equal(streakDays(60), 2, '오늘 점수가 낮으면 어제까지만 센다')

  // 할일 완료는 오늘 로그에 쌓이되, 알람 응답 체크은 찍지 않는다.
  // v1.21.0 에서 알람 팝업의 완료 버튼을 없앴다 — 그대로 두면 알람을 한 번도 안 보고
  // 할일 하나만 끝내도 20점이 들어온다 (내 할일 10 + 알람 응답 10).
  logTodoDone(); logTodoDone()
  assert.equal(todayLog().doneCount, 2)
  assert.equal(todayLog().actedOnAlarm, false, '할일 완료가 알람 응답까지 찍으면 실행 40점의 절반이 한 번에 들어온다')

  // 알람에 실제로 반응했을 때만 찍힌다
  logAlarmAction()
  assert.equal(todayLog().actedOnAlarm, true, '알람 반응은 여전히 기록돼야 한다')
  assert.equal(todayLog().doneCount, 2, '알람 반응이 할일 수를 건드리면 안 된다')
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
// ── spanSegments — 여러 날 일정을 띠로 ──────────────────────────
{
  const { spanSegments } = await import('../src/lib/monthGrid.js')

  // 하루짜리는 띠가 아니다 — 점으로 충분하고 띠로 그리면 점과 구분이 안 된다
  assert.deepEqual(spanSegments([{ due_date: '2026-10-31' }]), {})
  assert.deepEqual(spanSegments([{ due_date: '2026-10-31', end_date: '2026-10-31' }]), {})
  assert.deepEqual(spanSegments([]), {})

  // 10/25~26 — 시작과 끝만 있고 가운데는 없다
  const two = spanSegments([{ due_date: '2026-10-25', end_date: '2026-10-26' }])
  assert.deepEqual(two['2026-10-25'], { start: true, end: false })
  assert.deepEqual(two['2026-10-26'], { start: false, end: true })
  assert.equal(Object.keys(two).length, 2)

  // 가운데 날은 start·end 가 모두 false → 양옆으로 이어 붙는다
  const four = spanSegments([{ due_date: '2026-10-14', end_date: '2026-10-17' }])
  assert.deepEqual(four['2026-10-15'], { start: false, end: false })
  assert.deepEqual(four['2026-10-16'], { start: false, end: false })
  assert.equal(Object.keys(four).length, 4)

  // 한 칸이 어떤 띠의 끝이면서 다른 띠의 시작일 수 있다
  const touching = spanSegments([
    { due_date: '2026-10-10', end_date: '2026-10-12' },
    { due_date: '2026-10-12', end_date: '2026-10-14' },
  ])
  assert.deepEqual(touching['2026-10-12'], { start: true, end: true })
}
console.log('✓ spanSegments 검증 통과')
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
// ── todoDetail — "지금 하나만" 한 줄 ────────────────────────────
{
  const { todoDetail } = await import('../src/lib/alarmContext.js')
  const today = new Date(2026, 9, 22, 12, 0)
  const d = (y, m, dd) => `${y}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}`

  // 마감만 있으면 마감만
  assert.equal(todoDetail({ due_date: d(2026,10,22) }, today.getTime()), '오늘 마감')
  // 약속이면 시각·장소까지 — 팝업이 이걸 버리고 있었다
  assert.equal(
    todoDetail({ due_date: d(2026,10,22), due_hour: 14, place: '강남역' }, today.getTime()),
    '오늘 마감 · 14시 · 강남역')
  // 0시는 떨어뜨리지 않는다 (null 과 0 을 구분해야 한다)
  assert.ok(todoDetail({ due_date: d(2026,10,22), due_hour: 0 }, today.getTime()).includes('0시'))
  // 마감이 없으면 있는 것만
  assert.equal(todoDetail({ due_hour: 9 }, today.getTime()), '9시')
  assert.equal(todoDetail({}, today.getTime()), '')
  assert.equal(todoDetail(null), '')
}
console.log('✓ todoDetail 검증 통과')

// ── dateRangeLabel — 기간 일정은 끝까지 보여준다 ────────────────
{
  const { dateRangeLabel } = await import('../src/lib/alarmContext.js')
  // "11번가 행사 (10/25)" 는 하루짜리로 읽힌다. 26일까지인데.
  assert.equal(dateRangeLabel({ due_date: '2026-10-25', end_date: '2026-10-26' }), '10/25~26')
  assert.equal(dateRangeLabel({ due_date: '2026-10-25' }), '10/25')
  assert.equal(dateRangeLabel({ due_date: '2026-10-25', end_date: '2026-10-25' }), '10/25', '같은 날은 범위가 아니다')
  // 달을 넘기면 월까지 쓴다
  assert.equal(dateRangeLabel({ due_date: '2026-10-28', end_date: '2026-11-02' }), '10/28~11/2')
  // 9월은 09 로 저장되지만 9 로 보여준다 (0 을 떼지 않으면 "09/5" 가 된다)
  assert.equal(dateRangeLabel({ due_date: '2026-09-05', end_date: '2026-09-07' }), '9/5~7')
  // 타임스탬프가 섞여 들어와도 날짜만 읽는다
  assert.equal(dateRangeLabel({ due_date: '2026-10-25T00:00:00+09:00' }), '10/25')
  assert.equal(dateRangeLabel({}), '')
  assert.equal(dateRangeLabel(null), '')
}
console.log('✓ dateRangeLabel 검증 통과')
console.log('✓ shortPlace 검증 통과')

// ── 오구 지수 — 성장 40 + 균형 20 + 실행 40 ──────────────────────
{
  const {
    oguScore, produceScore, balanceScore, doneScore, WEIGHTS,
    AXIS_MIN_MINUTES, EMPTY_AXIS_PENALTY, OVER_HEAL_PENALTY, DEFAULT_GOALS,
  } = await import('../src/lib/oguScore.js')

  // 성장 — 내가 정한 목표 대비. 넘겨도 만점에서 멈춘다
  assert.equal(produceScore({ produce: 0 }).points, 0)
  assert.equal(produceScore({ produce: 60 }).points, 20)      // 목표 120 의 절반
  assert.equal(produceScore({ produce: 120 }).points, 40)
  assert.equal(produceScore({ produce: 600 }).points, 40, '넘쳐도 만점까지만')
  // 기준은 사용자의 것
  assert.equal(produceScore({ produce: 60 }, { produceTarget: 60 }).points, 40)

  // 균형 — 세 축이 모두 있고 힐링이 한도 안이면 만점
  const full = { produce: 60, consume: 60, connect: 30 }
  assert.equal(balanceScore(full).points, WEIGHTS.balance)
  // 한 축이 비면 깎인다
  assert.equal(balanceScore({ ...full, connect: 0 }).points, WEIGHTS.balance - EMPTY_AXIS_PENALTY)
  // 1분 스친 것은 "있다" 로 치지 않는다
  assert.equal(balanceScore({ ...full, connect: AXIS_MIN_MINUTES - 1 }).points,
    WEIGHTS.balance - EMPTY_AXIS_PENALTY)
  assert.equal(balanceScore({ ...full, connect: AXIS_MIN_MINUTES }).points, WEIGHTS.balance)
  // 힐링 초과는 따로 감점, 바닥은 0
  const over = balanceScore({ ...full, consume: DEFAULT_GOALS.consumeLimit + 45 })
  assert.equal(over.overHeal, 45)
  assert.equal(over.points, WEIGHTS.balance - OVER_HEAL_PENALTY)
  assert.equal(balanceScore({}).points, 0, '아무것도 없으면 0 (음수 아님)')

  // 실행 — 각 10점, 목표(goalKept)는 빠졌다
  assert.equal(doneScore({ missionDone: 3, missionTotal: 3, todoDone: 1, actedOnAlarm: true }).total, 40)
  assert.equal(doneScore({ missionDone: 1, missionTotal: 3 }).total, 10)
  assert.equal(doneScore({}).total, 0)

  // 합산 — 폰을 안 쓴 날이라고 음수가 되지 않는다
  const empty = oguScore({ checkins: [] })
  assert.ok(empty.score >= 0 && empty.score <= 100, String(empty.score))
  assert.equal(empty.produce.points, 0)

  // 만점 경로
  const D = (h) => new Date(2026, 9, 9, h, 0, 0, 0).getTime()
  const c = (type, h) => ({ activity_type: type, created_at: new Date(D(h)).toISOString() })
  const perfect = oguScore({
    // 자동 기록(:00) 한 칸 = 30분 → 성장 4칸 = 120분
    checkins: [c('work', 9), c('learning', 10), c('ai', 11), c('health', 12),
               c('video', 13), c('messenger', 14)],
    missionDone: 3, missionTotal: 3, todoDone: 2, actedOnAlarm: true,
    now: D(22),
  })
  assert.equal(perfect.produce.points, 40, JSON.stringify(perfect.produce))
  assert.equal(perfect.balance.points, 20, JSON.stringify(perfect.balance))
  assert.equal(perfect.done.total, 40)
  assert.equal(perfect.score, 100)

  // 조언: 힐링 초과 > 미션 > 할일 > 빈 축 순으로 "지금 바꿀 수 있는 것"
  const binge = oguScore({
    checkins: Array.from({ length: 12 }, (_, i) => c('video', 9 + i)),
    missionDone: 3, missionTotal: 3, todoDone: 1, actedOnAlarm: true, now: D(22),
  })
  assert.ok(binge.advice.includes('힐링'), binge.advice)
  assert.ok(binge.balance.overHeal > 0)
}
  // 체크 — 실행 40점과 어긋나면 화면이 거짓말을 한다
  {
    const { CHECKS, WEIGHTS, doneScore } = await import('../src/lib/oguScore.js')
    // 등급 문구 — 끝난 하루를 채점하지 않고 앞을 본다
    const { oguScore: score1 } = await import('../src/lib/oguScore.js')
    for (const pts of [0, 45, 70, 90]) {
      const g = score1({ checkins: [], missionDone: pts >= 70 ? 3 : 0,
        todoDone: pts >= 45 ? 1 : 0, actedOnAlarm: pts >= 90 })
      assert.ok(!/었어요|았어요|웠어요/.test(g.grade), `과거형 평가 문구: ${g.grade}`)
      assert.notEqual(g.color, '#D23B2E', `점수가 낮다고 경고색을 쓰면 꾸짖는 화면이 된다: ${g.grade}`)
      assert.ok(g.grade.length <= 12, `등급 문구가 길다(${g.grade.length}자): ${g.grade}`)
    }

    assert.equal(CHECKS.length, 4, '체크는 넷이다')
    assert.equal(new Set(CHECKS.map(s => s.key)).size, 4, 'key 중복')
    const full = doneScore({ missionDone: 3, missionTotal: 3, todoDone: 1, actedOnAlarm: true })
    for (const st of CHECKS) {
      assert.ok(st.key in full.parts, `${st.key} 가 doneScore 에 없다`)
      assert.equal(WEIGHTS[st.key], 10, `${st.key} 는 10점이어야 한다`)
      assert.ok(st.short.length <= 3, `${st.key} short 가 길다: ${st.short}`)
    }
    assert.equal(full.total, 40, '체크 넷을 다 채우면 40점')
    const none = doneScore({})
    assert.equal(CHECKS.filter(st => none.parts[st.key]).length, 0, '아무것도 안 했으면 0개')
  }
console.log('✓ 오구 지수(성장·균형·실행) 검증 통과')

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
  // 실제 배너 목록 — 여섯 장이 네 칸에 어떻게 들어가는가 (v1.21.0)
  {
    const { DEFAULT_BANNERS, BANNER_KINDS } = await import('../src/data/banners.js')
    const before = new Date('2026-11-01T12:00:00+09:00').getTime()
    const sameDay = new Date('2026-11-07T20:00:00+09:00').getTime()
    const after   = new Date('2026-11-08T09:00:00+09:00').getTime()

    for (const b of DEFAULT_BANNERS) {
      assert.ok(BANNER_KINDS[b.kind], `${b.id} 의 kind 가 없다: ${b.kind}`)
      // 23자가 실기기에서 한 줄에 들어가는 것을 확인한 상한 (auto-record 가 그 길이다).
      // 넘으면 48px 카드에서 두 줄이 되고 캐러셀 높이가 장마다 튄다.
      assert.ok(b.text && b.text.length <= 23, `${b.id} 문구가 길다(${b.text.length}자): ${b.text}`)
      assert.ok(b.action?.tab || b.action?.url, `${b.id} 에 눌렀을 때 갈 곳이 없다`)
      // 'report' 로 적어도 조용히 아무 일도 안 일어난다 (실제 id 는 'reports')
      if (b.action?.tab) assert.ok(TAB_IDS.includes(b.action.tab), `${b.id} 의 탭 id 가 틀렸다: ${b.action.tab}`)
      if (b.action?.url) assert.ok(b.action.url.startsWith('https://'), `${b.id} 는 https 여야 한다`)
    }
    assert.equal(new Set(DEFAULT_BANNERS.map(b => b.id)).size, DEFAULT_BANNERS.length, 'id 중복')

    // 행사 기간 — 이벤트가 맨 앞, 미션은 자리 밖으로 밀린다
    const during = pickBanners(DEFAULT_BANNERS, before)
    assert.equal(during.length, 4)
    assert.equal(during[0].id, 'damda-2026', '이벤트가 맨 앞이어야 한다')
    assert.ok(!during.some(b => b.id === 'mission'), '네 칸을 넘으면 뒤는 대기')

    // 행사 당일 20시 — 아직 떠 있어야 한다 (당일까지라고 했다)
    assert.ok(pickBanners(DEFAULT_BANNERS, sameDay).some(b => b.id === 'damda-2026'),
      '행사 당일에 배너가 사라지면 안 된다')

    // 다음 날 — 사라지고 뒤에 있던 것이 올라온다
    const later = pickBanners(DEFAULT_BANNERS, after)
    assert.ok(!later.some(b => b.id === 'damda-2026'), '지난 행사가 홈에 남으면 안 된다')
    assert.ok(later.some(b => b.id === 'stamps'), '빈자리를 뒤에 있던 배너가 채워야 한다')
    assert.equal(later[0].id, 'ai-bridge')

    // 윈클리니는 상시 — 둘 다에 있어야 한다
    for (const [when, list] of [['행사중', during], ['이후', later]]) {
      assert.ok(list.some(b => b.id === 'wincleany'), `${when} 에 윈클리니가 빠졌다`)
    }
  }
console.log('✓ 배너 검증 통과')

// ── 26. 링크 미리보기 — 주소 대신 읽을 수 있는 이름 ─────────────
{
  const { hostOf, parseTitle, decodeEntities, isFresh } = await import('../src/lib/linkPreview.js')

  // 호스트 — 2차(제목 가져오기)가 실패해도 이게 남는다
  assert.equal(hostOf('https://smartstore.naver.com/wincleany?NaPm=ct%3Dx'), 'smartstore.naver.com')
  assert.equal(hostOf('www.instagram.com/p/abc/'), 'instagram.com', 'www. 는 떼고 보여준다')
  assert.equal(hostOf('http://example.com'), 'example.com')
  assert.equal(hostOf(''), '')

  // og:title 이 <title> 보다 먼저 — <title> 에는 "- 사이트명" 꼬리가 붙는다
  assert.equal(
    parseTitle('<title>글 제목 - 네이버 블로그</title><meta property="og:title" content="글 제목">'),
    '글 제목')
  // content 가 property 앞에 오는 경우도 있다
  assert.equal(parseTitle('<meta content="뒤집힌 순서" property="og:title">'), '뒤집힌 순서')
  assert.equal(parseTitle('<title>그냥 제목</title>'), '그냥 제목')
  assert.equal(parseTitle('<html><body>제목 없음</body></html>'), null)
  assert.equal(parseTitle(''), null)

  // 남의 페이지에서 온 글자다 — 줄바꿈·제어문자가 화면을 깨면 안 된다
  assert.equal(parseTitle('<title>  두 줄\n짜리   제목  </title>'), '두 줄 짜리 제목')
  assert.equal(parseTitle('<title>   </title>'), null, '공백뿐이면 제목이 없는 것이다')
  // 길면 자르고 자른 티를 낸다
  const long = parseTitle(`<title>${'가'.repeat(200)}</title>`)
  assert.equal(long.length, 60)
  assert.ok(long.endsWith('…'))

  assert.equal(decodeEntities('A&amp;B &lt;tag&gt; &quot;q&quot; &#39;s&#39;'), `A&B <tag> "q" 's'`)
  assert.equal(decodeEntities('&unknown;'), '&unknown;', '모르는 엔티티는 건드리지 않는다')

  // 캐시 — 실패는 짧게 기억한다 (잠깐 죽은 사이트일 수 있다)
  const now = Date.now()
  assert.equal(isFresh(null, now), false)
  assert.equal(isFresh({ title: '있음', at: now - 24 * 3600 * 1000 }, now), true)
  assert.equal(isFresh({ title: null,  at: now - 24 * 3600 * 1000 }, now), false, '실패는 6시간')
  assert.equal(isFresh({ title: null,  at: now - 3600 * 1000 }, now), true)
}
console.log('✓ 링크 미리보기 검증 통과')

// ── 월간 캘린더 격자 ─────────────────────────────────────────────
{
  const { monthCells, eventsByDay, todosByDay, scoreTint, dateKey, gridRange, dedupeEvents }
    = await import('../src/lib/monthGrid.js')

  // 2026-10: 1일이 목요일 → 5주, 첫 칸은 9/27(일), 마지막 칸은 10/31(토)
  const oct = monthCells(2026, 9)
  assert.equal(oct.length, 5, `주 수 ${oct.length}`)
  assert.equal(oct[0][0].key, '2026-09-27')
  assert.equal(oct[0][0].inMonth, false)
  assert.equal(oct[4][6].key, '2026-10-31')
  assert.equal(oct[4][6].inMonth, true)
  // 모든 주는 7칸, 달의 모든 날이 정확히 한 번씩 들어간다
  for (const w of oct) assert.equal(w.length, 7)
  const inMonth = oct.flat().filter(c => c.inMonth).map(c => c.day)
  assert.deepEqual(inMonth, Array.from({ length: 31 }, (_, i) => i + 1))

  // 2026-02 (28일, 1일이 일요일) → 딱 4주, 빈 줄 없음
  const feb = monthCells(2026, 1)
  assert.equal(feb.length, 4)
  assert.equal(feb[0][0].key, '2026-02-01')
  assert.equal(feb[3][6].key, '2026-02-28')

  // 6주가 필요한 달도 만든다 (2026-08: 1일 토요일, 31일)
  assert.equal(monthCells(2026, 7).length, 6)

  // 격자 조회 범위는 앞뒤 달 칸까지 덮는다
  const [from, to] = gridRange(oct)
  assert.equal(dateKey(from), '2026-09-27')
  assert.equal(dateKey(to), '2026-10-31')
  assert.ok(to > from)

  // 일정은 시작일에 묶이고 시각 순으로 정렬된다
  const t9 = new Date(2026, 9, 10, 9, 0).getTime()
  const t14 = new Date(2026, 9, 10, 14, 0).getTime()
  const ev = eventsByDay([{ id: 'b', startMs: t14 }, { id: 'a', startMs: t9 }, { id: 'x' }])
  assert.deepEqual(ev['2026-10-10'].map(e => e.id), ['a', 'b'])
  assert.equal(Object.keys(ev).length, 1)   // startMs 없는 건 버린다

  // 'YYYY-MM-DD' 마감일은 시간대 때문에 하루 밀리면 안 된다
  const td = todosByDay([{ id: 1, due_date: '2026-10-10' }, { id: 2, due_date: null }])
  assert.deepEqual(Object.keys(td), ['2026-10-10'])

  // 계정이 여러 개면 같은 일정이 캘린더마다 들어온다 — 제목+시작시각이 같으면 한 건
  {
    const t = new Date(2026, 9, 10, 14, 0).getTime()
    const dup = dedupeEvents([
      { id: 1, title: '팀 회의', startMs: t, calendar: 'Google' },
      { id: 2, title: '팀 회의', startMs: t, calendar: 'Samsung' },
      { id: 3, title: '팀 회의', startMs: t + 3600000, calendar: 'Google' },  // 시각 다르면 남긴다
      { id: 4, title: '헬스장',  startMs: t, calendar: 'Google' },            // 제목 다르면 남긴다
    ])
    assert.deepEqual(dup.map(e => e.id), [1, 3, 4])
    assert.equal(dup[0].calendar, 'Google', '먼저 온 것을 남긴다')
    assert.deepEqual(dedupeEvents([]), [])
    assert.deepEqual(dedupeEvents(), [])
  }

  // 점수 없는 날과 0점은 다르다
  assert.equal(scoreTint(undefined), 'transparent')
  assert.equal(scoreTint(0), 'transparent')
  assert.ok(scoreTint(85).includes('0.30'))
  assert.ok(scoreTint(65).includes('0.18'))
  assert.ok(scoreTint(20).includes('0.08'))
}
console.log('✓ 월간 캘린더 검증 통과')

// ── 시간 안내 음성 ───────────────────────────────────────────────
{
  const { hour12, hourChannelId, hourSoundSrc } = await import('../src/lib/hourVoice.js')

  // 0시·12시는 "열두 시", 13시는 "한 시"
  assert.equal(hour12(0), 12)
  assert.equal(hour12(12), 12)
  assert.equal(hour12(13), 1)
  assert.equal(hour12(23), 11)
  assert.equal(hour12(7), 7)
  // 알람은 X:59 에 울리고 다음 정각을 알린다 → 23시+1 = 24 를 넘겨도 12시가 나와야 한다
  assert.equal(hour12(24), 12)
  assert.equal(hour12(25), 1)

  // 채널 ID 는 MainActivity.hourChannelId() 와 형식이 같아야 한다 (ogu-hour-v1-01)
  assert.equal(hourChannelId(13), 'ogu-hour-v1-01')
  assert.equal(hourChannelId(0),  'ogu-hour-v1-12')
  assert.equal(hourChannelId(9),  'ogu-hour-v1-09')

  // 음원 경로 — public/sounds/hours/ogu_h01.mp3 … ogu_h12.mp3
  assert.equal(hourSoundSrc(1),  '/sounds/hours/ogu_h01.mp3')
  assert.equal(hourSoundSrc(22), '/sounds/hours/ogu_h10.mp3')

  // 12개 음원과 res/raw 사본이 실제로 있어야 한다 (하나라도 없으면 그 시각이 무음)
  const fs = await import('node:fs')
  for (let h = 1; h <= 12; h++) {
    const name = `ogu_h${String(h).padStart(2, '0')}.mp3`
    assert.ok(fs.existsSync(`public/sounds/hours/${name}`), `public 누락: ${name}`)
    assert.ok(fs.existsSync(`android/app/src/main/res/raw/${name}`), `res/raw 누락: ${name}`)
  }
}
console.log('✓ 시간 안내 음성 검증 통과')

// ── 기기 간 동기화 ───────────────────────────────────────────────
{
  const { mergeDayLog } = await import('../src/lib/dayLog.js')

  // 각 기기가 자기가 본 것만 안다 — 덮어쓰면 한쪽이 지워진다
  const phone = { '2026-10-12': { doneCount: 2, actedOnAlarm: true, score: 71 } }
  const pc    = { '2026-10-12': { doneCount: 5, actedOnAlarm: false },
                  '2026-10-11': { doneCount: 1, actedOnAlarm: true, score: 64 } }
  const m = mergeDayLog(phone, pc)
  assert.equal(m['2026-10-12'].doneCount, 5, '많이 센 쪽을 남긴다')
  assert.equal(m['2026-10-12'].actedOnAlarm, true, '한쪽이라도 응답했으면 응답이다')
  assert.equal(m['2026-10-12'].score, 71, '점수는 하루가 갈수록 커진다 → 큰 값')
  assert.equal(m['2026-10-11'].score, 64, '한쪽에만 있는 날도 살아남는다')
  assert.equal(Object.keys(m).length, 2)

  // 점수가 없는 날에 0 을 만들어내면 안 된다 (안 잰 날 ≠ 0점)
  const noScore = mergeDayLog({ '2026-10-10': { doneCount: 1 } }, {})
  assert.ok(!('score' in noScore['2026-10-10']), '없던 점수를 만들지 않는다')

  // 빈 입력에도 깨지지 않는다 (첫 로그인: 서버가 비어 있다)
  assert.deepEqual(mergeDayLog(), {})
  assert.deepEqual(mergeDayLog({}, undefined), {})
  assert.equal(Object.keys(mergeDayLog({ a: { doneCount: 1 } }, null)).length, 1)
}
console.log('✓ 기기 간 동기화 검증 통과')

// ── 설정 동기화: 어느 쪽이 이기나 ────────────────────────────────
{
  const { pickSettings } = await import('../src/lib/settings.js')
  const L = at => ({ alarmHours: { 7: true }, updatedAt: at })
  const R = { alarmHours: {} }

  // 웹에서 로그인만 해도 올라간 기본값이, 폰에서 맞춘 설정을 덮으면 안 된다
  assert.equal(pickSettings(L(2000), R, 1000).use, 'local', '로컬이 더 최근이면 로컬')
  assert.equal(pickSettings(L(1000), R, 2000).use, 'remote', '서버가 더 최근이면 서버')
  // 한 번도 고친 적 없는 기기는 양보한다 (갓 설치한 PC 가 폰 설정을 덮지 않게)
  assert.equal(pickSettings({ alarmHours: {} }, R, 2000).use, 'remote', '로컬 수정 이력 없음')
  // 서버가 비었으면 로컬 (첫 로그인)
  assert.equal(pickSettings(L(1000), null, 0).use, 'local', '서버에 없음')
  assert.equal(pickSettings(L(1000), R, 0).use, 'local', '서버 시각 없음')
  // 같은 시각이면 서버 — 되돌아가는 쪽이 덜 놀랍다
  assert.equal(pickSettings(L(1000), R, 1000).use, 'remote')
}
console.log('✓ 설정 동기화 우선순위 검증 통과')

// ── 약속·일정 (달력에서 추가) ────────────────────────────────────
{
  const { spanDays, todosByDay, spanRange } = await import('../src/lib/monthGrid.js')

  // 하루짜리는 한 칸
  assert.deepEqual(spanDays({ due_date: '2026-10-15' }), ['2026-10-15'])
  assert.deepEqual(spanDays({}), [])

  // 기간 일정은 덮는 날짜마다 들어간다 (달력에 띠처럼 보여야 한다)
  assert.deepEqual(spanDays({ due_date: '2026-10-15', end_date: '2026-10-17' }),
    ['2026-10-15', '2026-10-16', '2026-10-17'])
  // 달을 넘겨도 끊기지 않는다
  assert.equal(spanDays({ due_date: '2026-10-30', end_date: '2026-11-02' }).length, 4)
  // end_date 가 start 보다 앞서면 하루로 (잘못 들어온 값에 무한 루프 금지)
  assert.deepEqual(spanDays({ due_date: '2026-10-15', end_date: '2026-10-01' }), ['2026-10-15'])

  // 2~6일은 고른 날부터
  assert.deepEqual(spanRange('2026-10-15', '2'), { start: '2026-10-15', end: '2026-10-16' })
  assert.deepEqual(spanRange('2026-10-15', '6'), { start: '2026-10-15', end: '2026-10-20' })

  // 주간 = 고른 날이 속한 주의 일요일~토요일 (고른 날부터 7일이 아니다)
  // 2026-10-15 는 목요일 → 10/11(일) ~ 10/17(토)
  assert.deepEqual(spanRange('2026-10-15', 'week'), { start: '2026-10-11', end: '2026-10-17' })
  // 일요일을 고르면 그 날이 시작
  assert.deepEqual(spanRange('2026-10-11', 'week'), { start: '2026-10-11', end: '2026-10-17' })
  // 토요일을 고르면 그 주의 일요일로 당겨진다
  assert.deepEqual(spanRange('2026-10-17', 'week'), { start: '2026-10-11', end: '2026-10-17' })
  // 주가 달을 넘어도 끊기지 않는다 (2026-11-01 은 일요일)
  assert.deepEqual(spanRange('2026-10-31', 'week'), { start: '2026-10-25', end: '2026-10-31' })

  // 월간 = 그 달 1일~말일
  assert.deepEqual(spanRange('2026-10-15', 'month'), { start: '2026-10-01', end: '2026-10-31' })
  assert.deepEqual(spanRange('2026-02-20', 'month'), { start: '2026-02-01', end: '2026-02-28' })
  assert.deepEqual(spanRange('2024-02-10', 'month'), { start: '2024-02-01', end: '2024-02-29' })  // 윤년

  // 날짜별 묶기 — 기간 일정이 3일에 모두 걸린다
  const map = todosByDay([
    { id: 1, due_date: '2026-10-15', todo_type: 'appointment', due_hour: 14 },
    { id: 2, due_date: '2026-10-15', end_date: '2026-10-17', todo_type: 'plan' },
  ])
  assert.equal(map['2026-10-15'].length, 2)
  assert.equal(map['2026-10-16'].length, 1)
  assert.equal(map['2026-10-17'].length, 1)
  assert.ok(!map['2026-10-18'])
}
console.log('✓ 약속·일정 검증 통과')

// ── 분류 안 된 앱 집계 ───────────────────────────────────────────
{
  const { addUnmapped, summarize } = await import('../src/lib/unmapped.js')
  const d1 = new Date(2026, 9, 12, 10).getTime()
  const d2 = new Date(2026, 9, 13, 10).getTime()

  let st = {}
  st = addUnmapped(st, { pkg: 'com.foo', label: '포토에디터', minutes: 30 }, d1)
  st = addUnmapped(st, { pkg: 'com.foo', label: '포토에디터', minutes: 20 }, d2)
  st = addUnmapped(st, { pkg: 'com.bar', label: '은행', minutes: 10 }, d2)

  const s = summarize(st)
  assert.equal(s.apps.length, 2)
  assert.equal(s.apps[0].pkg, 'com.foo')          // 많이 쓴 순
  assert.equal(s.apps[0].min, 50)                 // 같은 앱은 더한다
  assert.equal(s.totalMin, 60)
  assert.equal(s.dayCount, 2, '이틀치')
  assert.equal(s.perDayMin, 30, '하루 평균 = 총합 / 날짜 수')

  // 0분·빈 패키지는 세지 않는다 (슬롯은 잡혔는데 사용시간이 0인 경우)
  assert.deepEqual(addUnmapped({}, { pkg: 'x', minutes: 0 }), {})
  assert.deepEqual(addUnmapped({}, { pkg: '', minutes: 5 }), {})

  // 기록이 없으면 0으로 나눈 NaN 이 아니라 0 이 나와야 한다
  const empty = summarize({})
  assert.equal(empty.perDayMin, 0)
  assert.equal(empty.dayCount, 1)
  assert.deepEqual(empty.apps, [])
}
console.log('✓ 분류 안 된 앱 집계 검증 통과')

// ── 공식이 바뀐 날을 넘어 비교하지 않는다 ─────────────────────────
{
  // dayLog 는 localStorage 를 쓰므로 최소한의 흉내를 내준다 (node 에는 없다)
  const store = {}
  globalThis.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: k => { delete store[k] },
  }
  const { yesterdayScore, yesterdayIncomparable, streakDays, saveDayScore } =
    await import('../src/lib/dayLog.js')
  const { FORMULA } = await import('../src/lib/oguScore.js')

  const DAY = 86400000
  // write() 는 실제 오늘을 기준으로 오래된 날을 버린다 → 고정 미래 날짜를 쓰면 저장이 사라진다
  const now = Date.now()
  const key = ms => {
    const d = new Date(ms); const p = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }

  // 옛 공식으로 적힌 어제 — 비교하지 않는다 (formula 표시가 없는 옛 기록 포함)
  store['ogu_day_log'] = JSON.stringify({ [key(now - DAY)]: { score: 72 } })
  assert.equal(yesterdayScore(now), null, '옛 공식 점수와는 비교하지 않는다')
  assert.equal(yesterdayIncomparable(now), true, '이유를 알려줄 수 있어야 한다')

  // 같은 공식이면 비교한다
  store['ogu_day_log'] = JSON.stringify({ [key(now - DAY)]: { score: 72, formula: FORMULA } })
  assert.equal(yesterdayScore(now), 72)
  assert.equal(yesterdayIncomparable(now), false)

  // 기록이 아예 없으면 비교 대상이 없을 뿐, "기준이 바뀌었다" 가 아니다
  store['ogu_day_log'] = JSON.stringify({})
  assert.equal(yesterdayScore(now), null)
  assert.equal(yesterdayIncomparable(now), false)

  // 스트릭 — 옛 공식 날에서 끊긴다
  store['ogu_day_log'] = JSON.stringify({
    [key(now)]:           { score: 80, formula: FORMULA },
    [key(now - DAY)]:     { score: 75, formula: FORMULA },
    [key(now - 2 * DAY)]: { score: 90 },                   // 옛 공식 → 여기서 끊김
    [key(now - 3 * DAY)]: { score: 95, formula: FORMULA },
  })
  assert.equal(streakDays(60, now), 2, '옛 공식 날을 건너뛰어 잇지 않는다')

  // 저장하면 공식 번호가 함께 남는다
  store['ogu_day_log'] = JSON.stringify({})
  saveDayScore(88, now)
  assert.equal(JSON.parse(store['ogu_day_log'])[key(now)].formula, FORMULA)

  delete globalThis.localStorage
}
console.log('✓ 점수 공식 전환 검증 통과')

// ── 주간 축별 추이 ───────────────────────────────────────────────
{
  const { axisMinutesByDay } = await import('../src/lib/alarmContext.js')
  const now = new Date(2026, 9, 14, 20, 0).getTime()
  const at = (dayOffset, h) => new Date(2026, 9, 14 - dayOffset, h, 0, 0, 0).toISOString()
  const rows = axisMinutesByDay([
    { activity_type: 'work',      created_at: at(0, 9) },   // 오늘 성장 30
    { activity_type: 'video',     created_at: at(0, 11) },  // 오늘 힐링 30
    { activity_type: 'messenger', created_at: at(2, 10) },  // 이틀 전 소통 30
    { activity_type: 'finance',   created_at: at(2, 11) },  // 이틀 전 생활 → other
    { activity_type: 'work',      created_at: at(30, 9) },  // 한 달 전 — 창 밖이라 버린다
  ], 7, now)

  assert.equal(rows.length, 7)
  assert.equal(rows[6].key, '2026-10-14', '마지막이 오늘')
  assert.equal(rows[0].key, '2026-10-08', '7일 전부터')
  assert.equal(rows[6].produce, 30)
  assert.equal(rows[6].consume, 30)
  assert.equal(rows[6].total, 60)
  assert.equal(rows[4].connect, 30, '이틀 전 소통')
  assert.equal(rows[4].other, 30, '생활은 other 로 — 점수 밖이지만 잰 시간이다')
  assert.equal(rows[4].total, 60)
  // 창 밖 기록은 어느 칸에도 들어가지 않는다
  assert.equal(rows.reduce((s, r) => s + r.total, 0), 120)
  // 기록이 없어도 날짜 칸은 다 나온다 (빈 날이 보여야 추세다)
  assert.equal(axisMinutesByDay([], 7, now).length, 7)
}
console.log('✓ 주간 축별 추이 검증 통과')

// ── 시간대 배너 ──────────────────────────────────────────────────
{
  const { bannerFor, slotOf } = await import('../src/lib/timeBanner.js')
  const at = h => new Date(2026, 9, 14, h, 30, 0, 0).getTime()

  // 경계 — ~9 / ~13 / ~18 / 그 이후
  assert.equal(slotOf(8), 'morning')
  assert.equal(slotOf(9), 'noon')
  assert.equal(slotOf(12), 'noon')
  assert.equal(slotOf(13), 'afternoon')
  assert.equal(slotOf(17), 'afternoon')
  assert.equal(slotOf(18), 'night')
  assert.equal(slotOf(23), 'night')
  assert.equal(slotOf(0), 'morning')

  // 아침 — 기록이 없으면 미션으로, 있으면 내 숫자로
  const m0 = bannerFor({ now: at(7), missionLeft: 3 })
  assert.ok(m0.sub.includes('3개'), m0.sub)
  const m1 = bannerFor({ now: at(7), byGroup: { produce: 30 } })
  assert.ok(m1.title.includes('30분'), m1.title)

  // 점심 — 목표까지 남은 양을 말한다
  const n = bannerFor({ now: at(12), byGroup: { produce: 80 }, goals: { produceTarget: 120 } })
  assert.ok(n.title.includes('1시간 20분'), n.title)
  assert.ok(n.sub.includes('40분'), n.sub)
  // 오전이 비면 다른 말을 한다
  assert.ok(bannerFor({ now: at(12) }).title.includes('조용'), '빈 오전')

  // 오후 — 힐링 한도를 넘었을 때만 경고로 바뀐다 (이탈 방지의 핵심)
  const over = bannerFor({ now: at(15), byGroup: { consume: 150 }, goals: { consumeLimit: 120 } })
  assert.ok(over.title.includes('힐링'), over.title)
  assert.equal(over.cta, '지금 하나만')
  const ok = bannerFor({ now: at(15), byGroup: { consume: 60 }, goals: { consumeLimit: 120 } })
  assert.ok(!ok.title.includes('힐링'), ok.title)

  // 밤 — 점수가 있으면 점수, 없으면 일반 문구 (없는 점수를 지어내지 않는다)
  const night = bannerFor({ now: at(21), score: 72, yesterday: 64, streak: 3 })
  assert.ok(night.title.includes('72점'), night.title)
  assert.ok(night.sub.includes('▲8') && night.sub.includes('3일'), night.sub)
  // 한 줄 안에 들어가야 한다 — 말줄임표가 되면 아무것도 안 읽힌다
  for (const h of [7, 12, 15, 21]) {
    const b = bannerFor({ now: at(h), byGroup: { produce: 90, consume: 150 },
      goals: { produceTarget: 120, consumeLimit: 120 }, score: 72, yesterday: 64, streak: 3 })
    assert.ok(b.title.length <= 18, `${h}시 제목 김: ${b.title}`)
    assert.ok(b.sub.length <= 30, `${h}시 보조 김: ${b.sub}`)
  }
  assert.ok(!bannerFor({ now: at(21) }).title.includes('점'), '점수가 없으면 점수를 말하지 않는다')

  // showsScore — 제목이 점수를 말하면 체크 줄에서 "오늘 NN" 을 또 쓰지 않는다
  assert.equal(bannerFor({ now: at(21), score: 72 }).showsScore, true)
  for (const h of [7, 12, 15]) {
    assert.ok(!bannerFor({ now: at(h), score: 72 }).showsScore, `${h}시 배너가 점수를 말하면 안 된다`)
  }
  assert.ok(!bannerFor({ now: at(21) }).showsScore, '점수가 없으면 showsScore 도 아니다')

  // 눌렀을 때 실제로 가는가 — 'report'(단수)로 적으면 조용히 아무 일도 안 일어난다.
  // v1.21.0 에서 네 시간대 CTA 가 전부 이렇게 죽어 있었다.
  for (const h of [7, 12, 15, 21]) {
    for (const extra of [{}, { score: 72 }, { byGroup: { produce: 90, consume: 200 }, goals: { consumeLimit: 120 } }]) {
      const b = bannerFor({ now: at(h), ...extra })
      assert.ok(TAB_IDS.includes(b.tab), `${h}시 CTA 의 탭 id 가 틀렸다: ${b.tab}`)
      // 'home' 은 같은 화면 안이라 어디로 갈지(focus)가 반드시 있어야 한다
      if (b.tab === 'home') assert.ok(b.focus, `${h}시 CTA 가 home 인데 focus 가 없다 — 눌러도 아무 일이 없다`)
    }
  }

  // 네 상태 모두 제목·보조·CTA·색이 채워져 있어야 한다 (빈 배너는 자리만 먹는다)
  for (const h of [7, 12, 15, 21]) {
    const b = bannerFor({ now: at(h) })
    for (const k of ['title', 'sub', 'cta', 'emoji', 'from', 'to']) {
      assert.ok(b[k], `${h}시 ${k} 비어 있음`)
    }
  }
}
console.log('✓ 시간대 배너 검증 통과')

// ── 22. 오구 브리지 — 프롬프트 카드 고르기 ──────────────────────
{
  const { buildContext, canUse, fill, pickPrompt } = await import('../src/lib/promptPick.js')
  const { PROMPT_CARDS } = await import('../src/data/promptCards.js')
  const at = (h, d = 20) => new Date(2026, 9, d, h, 59).getTime()

  // 빈칸이 남은 프롬프트는 쓰지 않는다 — 이게 이 기능의 생사다
  assert.equal(fill('오늘 {todos} 정리', {}), null)
  assert.equal(fill('오늘 {todos} 정리', { todos: '- 보고서' }), '오늘 - 보고서 정리')

  const ctx = buildContext({
    todos: [
      { title: '보고서 초안', completed: false },
      { title: '끝난 것', completed: true },
      { title: '주간 계획', todo_type: 'period' },
    ],
    byGroup: { produce: 80, consume: 150, connect: 20 },
  })
  assert.ok(ctx.todos.includes('보고서 초안'))
  assert.ok(!ctx.todos.includes('끝난 것'), '완료된 할일은 AI에 넘기지 않는다')
  assert.ok(!ctx.todos.includes('주간 계획'), '월·주간 계획은 할일 목록이 아니다')
  assert.equal(ctx.topTodo, '보고서 초안')
  assert.equal(ctx.consume, '150')

  // 할일이 없으면 할일을 요구하는 카드는 후보에서 빠진다
  const empty = buildContext({ todos: [] })
  const needsTodos = PROMPT_CARDS.find(c => c.need.includes('todos'))
  assert.ok(!canUse(needsTodos, empty), '할일 없이 할일 카드를 꺼내면 빈 프롬프트가 나간다')
  assert.ok(canUse(needsTodos, ctx))

  // 할일이 하나도 없어도 뭔가는 나온다 (조건 없는 카드가 받쳐준다)
  const bare = pickPrompt({ now: at(8), ctx: empty })
  assert.ok(bare && bare.prompt && !/\{\w+\}/.test(bare.prompt), bare?.prompt)

  // 시간대에 맞는 카드를 먼저 고른다
  const morning = pickPrompt({ now: at(8), ctx })
  const card = PROMPT_CARDS.find(c => c.id === morning.id)
  assert.ok(['morning', 'any'].includes(card.slot), `아침에 ${card.slot} 카드`)

  // 같은 시각이면 같은 카드 (리렌더마다 바뀌면 읽다 말고 놓친다)
  assert.equal(pickPrompt({ now: at(8), ctx }).id, pickPrompt({ now: at(8) + 59_000, ctx }).id)
  // 시간이 지나면 넘어간다 — 같은 카드를 하루 종일 보여주지 않는다
  const slotIds = new Set([14, 15, 16, 17].map(h => pickPrompt({ now: at(h), ctx, consumeHigh: true }).id))
  assert.ok(slotIds.size > 1, '오후 내내 같은 카드만 나온다')

  // 모든 카드가 조건만 갖추면 빈칸 없이 채워져야 한다
  const full = { ...ctx, event: '팀 회의' }
  for (const c of PROMPT_CARDS) {
    if (!canUse(c, full, { measured: true, consumeHigh: true })) continue
    assert.ok(fill(c.prompt, full), `${c.id} 의 빈칸이 안 채워진다`)
    assert.ok(c.title.length <= 12, `${c.id} 제목 김: ${c.title}`)
    assert.ok(c.hint.length <= 20, `${c.id} 힌트 김: ${c.hint}`)
  }
  assert.ok(PROMPT_CARDS.length >= 12, '카드가 12장은 돼야 하루가 돈다')
  assert.equal(new Set(PROMPT_CARDS.map(c => c.id)).size, PROMPT_CARDS.length, 'id 중복')
}
console.log('✓ 오구 브리지 검증 통과')

// ── 23. 돌아올 다리 — 공유로 들어온 글의 첫 줄 ──────────────────
{
  const { firstLine } = await import('../src/lib/sharedText.js')

  // AI 답은 여러 줄이다. 통째로 할일 제목에 넣으면 목록이 망가진다
  assert.equal(firstLine('첫 줄\n둘째 줄\n셋째'), '첫 줄')
  assert.equal(firstLine('\n\n  앞이 빈 줄  \n다음'), '앞이 빈 줄')
  assert.equal(firstLine(''), '')
  assert.equal(firstLine('   \n  '), '')
  // 길면 자르고 말줄임 — 자른 티를 내지 않으면 잘린 걸 모른다
  const long = 'ㄱ'.repeat(80)
  assert.equal(firstLine(long).length, 60)
  assert.ok(firstLine(long).endsWith('…'))
  assert.equal(firstLine('짧은 줄'), '짧은 줄', '짧으면 건드리지 않는다')
}
console.log('✓ 돌아올 다리 검증 통과')

// ── 24. 기록을 남기면 그 시간이 성장이 된다 ─────────────────────
{
  const { pickSlotToPromote, PROMOTE_TO, PROMOTE_WINDOW_MIN } =
    await import('../src/lib/sharedText.js')
  const { groupOf } = await import('../src/data/appCategories.js')

  const now = new Date(2026, 9, 21, 15, 0).getTime()
  const ago = m => new Date(now - m * 60000).toISOString()
  const ck = (m, type) => ({ created_at: ago(m), activity_type: type })

  // 올릴 분류는 성장이어야 한다 (이게 틀리면 기능 전체가 거짓말이 된다)
  assert.equal(groupOf(PROMOTE_TO), 'produce', `${PROMOTE_TO} 가 성장이 아니다`)

  // 직전 힐링 슬롯 중 가장 최근 것
  const list = [ck(90, 'video'), ck(30, 'game'), ck(10, 'work')]
  assert.equal(pickSlotToPromote(list, now), ago(30), '가장 최근 힐링을 골라야 한다')

  // 힐링이 없으면 아무것도 올리지 않는다 — 없는 걸 만들지 않는다
  assert.equal(pickSlotToPromote([ck(20, 'work'), ck(40, 'messenger')], now), null)
  assert.equal(pickSlotToPromote([], now), null)

  // 구간 밖은 안 본다 (어제 본 영상이 오늘 메모로 성장이 되면 안 된다)
  assert.equal(pickSlotToPromote([ck(PROMOTE_WINDOW_MIN + 5, 'video')], now), null)
  assert.equal(pickSlotToPromote([ck(PROMOTE_WINDOW_MIN - 5, 'video')], now), ago(PROMOTE_WINDOW_MIN - 5))

  // 미래 기록은 무시 (기기 시계가 틀어졌을 때)
  assert.equal(pickSlotToPromote([{ created_at: new Date(now + 60000).toISOString(), activity_type: 'video' }], now), null)
  assert.equal(pickSlotToPromote([{ created_at: 'not-a-date', activity_type: 'video' }], now), null)

  // 한 슬롯은 한 번만 — 올리고 나면 힐링이 아니라서 다시 안 걸린다
  const once = [ck(30, 'video')]
  const first = pickSlotToPromote(once, now)
  assert.ok(first)
  const after = once.map(c => c.created_at === first ? { ...c, activity_type: PROMOTE_TO } : c)
  assert.equal(pickSlotToPromote(after, now), null, '같은 슬롯을 두 번 올리면 점수가 부푼다')
}
console.log('✓ 시간 승격 검증 통과')
