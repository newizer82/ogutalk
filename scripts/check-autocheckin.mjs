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
  pickUpcomingEvent, eventLine,
} from '../src/lib/alarmContext.js'
import {
  oguScore, produceScore, restraintScore, actionScore, DEFAULT_GOALS,
} from '../src/lib/oguScore.js'

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

// ── 오구 지수 ────────────────────────────────────────────────────
{
  const D = (h, m) => new Date(2026, 9, 8, h, m, 0, 0).getTime()
  const now = D(22, 0)
  const slot = (h, m, type) => ({ activity_type: type, created_at: new Date(D(h, m)).toISOString() })
  // 자동 기록 1건 = 30분
  const slots = (type, n, startH) => Array.from({ length: n }, (_, i) =>
    slot(startH + Math.floor(i / 2), (i % 2) * 30, type))

  // 생산 점수: 목표(120분) 대비 비율
  assert.equal(produceScore(0), 0)
  assert.equal(produceScore(60), 20)
  assert.equal(produceScore(120), 40)
  assert.equal(produceScore(300), 40, '목표를 넘겨도 만점까지만')

  // 절제 점수: 한도 이하 만점, 초과 30분마다 -5
  assert.equal(restraintScore(0), 30)
  assert.equal(restraintScore(120), 30)
  assert.equal(restraintScore(150), 25)
  assert.equal(restraintScore(121), 25, '1분만 넘어도 한 칸 깎인다')
  assert.equal(restraintScore(330), 0)
  assert.equal(restraintScore(600), 0, '0점 아래로는 내려가지 않는다')

  // 실행 점수: 할일 최대 3건 + 알람 반응
  assert.equal(actionScore({}), 0)
  assert.equal(actionScore({ doneCount: 2 }), 14)
  assert.equal(actionScore({ doneCount: 9 }), 21, '할일은 3건까지만')
  assert.equal(actionScore({ doneCount: 3, actedOnAlarm: true }), 30)

  // 전체: 생산 2시간(4슬롯) + 소비 1시간(2슬롯) + 할일 2건 + 알람 반응
  {
    const r = oguScore({
      checkins: [...slots('work', 4, 9), ...slots('video', 2, 20)],
      doneCount: 2, actedOnAlarm: true, now,
    })
    assert.equal(r.parts.produce, 40)
    assert.equal(r.parts.restraint, 30)
    assert.equal(r.parts.action, 23)
    assert.equal(r.score, 93)
    assert.equal(r.grade, '오늘 잘 썼어요')
  }

  // 폰을 거의 안 쓴 날: 감점 대상이 아니다 (절제 만점, 생산은 0)
  {
    const r = oguScore({ checkins: [], now })
    assert.equal(r.parts.restraint, 30, '폰을 안 쓴 시간은 벌점이 아니다')
    assert.equal(r.score, 30)
  }

  // 소비만 5시간: 절제 0점, 조언은 소비를 짚는다
  {
    const r = oguScore({ checkins: slots('video', 10, 13), now })
    assert.equal(r.parts.restraint, 0)
    assert.ok(r.advice.includes('소비'), r.advice)
    assert.equal(r.grade, '오늘은 쉬어간 날이에요')
  }

  // 목표를 사용자가 바꾸면 점수도 따라간다
  assert.equal(
    oguScore({ checkins: slots('work', 2, 9), goals: { produceTarget: 60, consumeLimit: 120 }, now }).parts.produce,
    40, '목표 60분이면 1시간으로 만점')

  // 만점이면 잔소리 대신 격려
  assert.ok(oguScore({
    checkins: [...slots('work', 4, 9)], doneCount: 3, actedOnAlarm: true, now,
  }).advice.includes('내일도'))
}
console.log('✓ oguScore 검증 통과')

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
