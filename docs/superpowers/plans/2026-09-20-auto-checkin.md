# 자동 활동 기록 (UsageStats 기반 체크인) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매시간 수동 체크인 대신 안드로이드 앱 사용시간을 읽어 30분 슬롯마다 활동을 자동 기록하고, 알람 팝업이 지난 1시간 요약을 보여주게 한다.

**Architecture:** 네이티브 Capacitor 플러그인이 `UsageStatsManager`로 임의 구간의 앱별 포그라운드 시간을 반환한다. JS 측은 "마지막 처리 시각 ~ 현재"를 30분 슬롯으로 쪼개, 슬롯마다 가장 오래 쓴 앱을 카테고리로 변환해 **기존 체크인 저장소에 그대로** 기록한다(소급 기록). 리포트 탭·주간 리포트는 수정 없이 동작한다. 원시 사용시간은 저장하지 않는다.

**Tech Stack:** Capacitor 8 (커스텀 Java 플러그인), React 18 + Vite, Supabase JS, localStorage

**Spec:** `docs/superpowers/specs/2026-09-20-auto-checkin-usage-stats-design.md`

## Global Constraints

- 사용시간 데이터는 **기기 내에서만 처리**한다. 서버로 전송하지 않는다. (Play 데이터 안전 신고 회피 조건)
- 원시 앱 사용시간을 저장하지 않는다. 필요할 때 OS에서 다시 읽는다.
- 권한 미허용 또는 기능 OFF일 때 **앱은 현재와 완전히 동일하게 동작**해야 한다(수동 4버튼 팝업 유지).
- 기존 체크인 레코드 형식을 유지한다: `activity_type`, `alarm_hour`, `created_at`. 자동/수동 구분 필드를 추가하지 않는다. `notification_log` 스키마를 변경하지 않는다.
- 슬롯 = **30분**, 정각 기준 `:00~:29` / `:30~:59`.
- 슬롯 총 사용시간 **5분 미만이면 기록하지 않는다**.
- 소급은 **최대 24시간(48슬롯)**까지만 한다.
- 내장 매핑에 없는 앱은 **기록하지 않는다**. 사용자가 지정하면 그때부터 기록한다.
- 카테고리 ID는 기존 값 그대로: `goal_work` / `study` / `sns` / `rest`. `goal_work`는 자동 판정 대상이 아니다(사용자 지정 시에만).
- **테스트 프레임워크를 도입하지 않는다.** 순수 로직 검증은 `node`로 직접 실행하는 자체 체크 스크립트 하나만 쓴다.
- localStorage 키 prefix는 `ogu_`로 통일한다.
- 스타일은 인라인 JS 객체 + `src/styles/theme.js`의 `theme`/`gradients`/`S`를 따른다. 다크 테마 고정, 최대 너비 420px.
- 안드로이드 전용 기능이다. 웹 빌드에서는 모든 경로가 no-op이어야 한다(`IS_NATIVE` 가드).

---

### Task 1: 슬롯 계산 순수 로직

30분 슬롯 분할·멱등·상한 규칙을 브라우저 의존성 없는 순수 모듈로 만든다. `node`로 직접 import해 검증한다.

**Files:**
- Create: `src/lib/checkinSlots.js`
- Create: `scripts/check-autocheckin.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `SLOT_MS: number` (1800000)
  - `MIN_ACTIVE_MS: number` (300000)
  - `MAX_BACKFILL_MS: number` (86400000)
  - `floorToSlot(ms: number) => number` — 해당 시각이 속한 슬롯의 시작 epoch ms
  - `slotKey(startMs: number) => string` — `'2026-09-20T15:30'` 형식
  - `buildSlots(lastBackfillAt: number|null, now: number, existingKeys?: Set<string>) => Array<{start:number, end:number, key:string, hour:number}>` — 오래된 순 정렬

- [ ] **Step 1: 실패하는 체크 스크립트 작성**

`scripts/check-autocheckin.mjs`:

```js
import assert from 'node:assert/strict'
import {
  SLOT_MS, MAX_BACKFILL_MS, floorToSlot, slotKey, buildSlots,
} from '../src/lib/checkinSlots.js'

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

// 24시간 상한: 48슬롯을 넘지 않는다
{
  const now = at(15, 59)
  const slots = buildSlots(now - 72 * 60 * 60 * 1000, now)
  assert.ok(slots.length <= 48, `48슬롯 이하여야 하는데 ${slots.length}`)
  assert.ok(slots[0].start >= now - MAX_BACKFILL_MS - SLOT_MS)
}

// 멱등: 이미 기록된 키는 제외
{
  const existing = new Set(['2026-09-20T14:00'])
  const slots = buildSlots(at(14, 0), at(15, 10), existing)
  assert.deepEqual(slots.map(s => s.key), ['2026-09-20T14:30'])
}

// lastBackfillAt 이 null 이면 24시간 전부터
{
  const slots = buildSlots(null, at(15, 59))
  assert.ok(slots.length > 0 && slots.length <= 48)
}

console.log('✓ checkinSlots 검증 통과')
```

- [ ] **Step 2: 실패 확인**

Run: `node scripts/check-autocheckin.mjs`
Expected: FAIL — `Cannot find module '.../src/lib/checkinSlots.js'`

- [ ] **Step 3: 구현**

`src/lib/checkinSlots.js`:

```js
// ── 자동 체크인 슬롯 계산 (순수 로직, 브라우저 의존성 없음) ──────
// 슬롯 = 30분, 정각 기준 :00~:29 / :30~:59

export const SLOT_MS         = 30 * 60 * 1000
export const MIN_ACTIVE_MS   = 5 * 60 * 1000        // 이 미만 사용한 슬롯은 기록 안 함
export const MAX_BACKFILL_MS = 24 * 60 * 60 * 1000  // 소급 상한

// 진행 중인 슬롯은 이 비율 이상 지났을 때만 기록 대상에 넣는다.
// (알람이 울리는 :59 에는 29/30분이 지나 포함되고, 임의 시점에 앱을 열었을 때는
//  반쪽짜리 슬롯이 기록돼 멱등 규칙에 막혀 영영 갱신되지 않는 일을 막는다)
const SLOT_COMPLETE_RATIO = 0.9

export function floorToSlot(ms) {
  const d = new Date(ms)
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30)
  return d.getTime()
}

export function slotKey(startMs) {
  const d = new Date(startMs)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
       + `T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function buildSlots(lastBackfillAt, now, existingKeys = new Set()) {
  const current = floorToSlot(now)
  const elapsed = now - current
  // 마지막으로 기록 가능한 슬롯
  const lastEligible = elapsed >= SLOT_MS * SLOT_COMPLETE_RATIO
    ? current
    : current - SLOT_MS

  const earliest = floorToSlot(now - MAX_BACKFILL_MS)
  let start = lastBackfillAt ? floorToSlot(lastBackfillAt) : earliest
  if (start < earliest) start = earliest

  const out = []
  for (let s = start; s <= lastEligible; s += SLOT_MS) {
    const key = slotKey(s)
    if (existingKeys.has(key)) continue
    out.push({ start: s, end: s + SLOT_MS, key, hour: new Date(s).getHours() })
  }
  return out
}
```

- [ ] **Step 4: 통과 확인**

Run: `node scripts/check-autocheckin.mjs`
Expected: PASS — `✓ checkinSlots 검증 통과`

- [ ] **Step 5: 커밋**

```bash
git add src/lib/checkinSlots.js scripts/check-autocheckin.mjs
git commit -m "feat: 자동 체크인 슬롯 계산 로직 (30분 슬롯, 멱등, 24시간 상한)"
```

---

### Task 2: 앱 → 카테고리 매핑

패키지명을 기존 4개 활동 카테고리로 변환한다. 모르는 앱은 `null`을 반환해 "기록하지 않음"을 표현한다.

**Files:**
- Create: `src/data/appCategories.js`
- Modify: `scripts/check-autocheckin.mjs` (매핑 검증 추가)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `BUILTIN_CATEGORY: Record<string, 'sns'|'study'|'rest'>`
  - `categoryForApp(pkg: string, overrides?: Record<string,string>) => 'goal_work'|'study'|'sns'|'rest'|null`

- [ ] **Step 1: 실패하는 체크 추가**

`scripts/check-autocheckin.mjs` 파일 끝의 `console.log('✓ checkinSlots 검증 통과')` **앞에** 아래를 삽입한다. import 문은 파일 상단 import 블록 아래에 추가한다.

상단에 추가:

```js
import { categoryForApp } from '../src/data/appCategories.js'
```

`console.log` 앞에 추가:

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `node scripts/check-autocheckin.mjs`
Expected: FAIL — `Cannot find module '.../src/data/appCategories.js'`

- [ ] **Step 3: 구현**

`src/data/appCategories.js`:

```js
// ── 앱 패키지 → 활동 카테고리 내장 매핑 ─────────────────────────
// 카테고리 ID 는 기존 체크인과 동일: goal_work / study / sns / rest
//
// 원칙: 애매한 앱은 넣지 않는다. 틀린 분류를 지어내면 리포트 신뢰도가 무너진다.
//  - 카카오톡/문자: 업무인지 잡담인지 알 수 없음 → 미분류
//  - goal_work(목표 할일): 앱만으로 판정 불가 → 자동 매핑 대상 아님

export const BUILTIN_CATEGORY = {
  // 📱 SNS/유튜브
  'com.google.android.youtube':      'sns',
  'com.instagram.android':           'sns',
  'com.zhiliaoapp.musically':        'sns',   // TikTok
  'com.ss.android.ugc.trill':        'sns',   // TikTok (일부 지역)
  'com.facebook.katana':             'sns',
  'com.twitter.android':             'sns',
  'com.netflix.mediaclient':         'sns',
  'tv.twitch.android.app':           'sns',
  'com.reddit.frontpage':            'sns',

  // 📚 공부/업무
  'com.notion.id':                   'study',
  'com.google.android.apps.docs':    'study',
  'com.google.android.apps.docs.editors.docs': 'study',
  'com.google.android.gm':           'study',   // Gmail
  'com.google.android.calendar':     'study',
  'com.Slack':                       'study',
  'com.microsoft.teams':             'study',
  'com.microsoft.office.outlook':    'study',
  'com.android.chrome':              'study',   // 검색·문서 열람이 주용도
  'com.google.android.keep':         'study',

  // 😴 휴식/식사
  'com.sec.android.gallery3d':       'rest',    // 삼성 갤러리
  'com.google.android.apps.photos':  'rest',
  'com.google.android.apps.youtube.music': 'rest',
  'com.spotify.music':               'rest',
  'com.melon.melonplayer':           'rest',
  'com.sampleapp':                   'rest',    // 배달의민족
  'com.coupang.mobile':              'rest',
  'com.nhn.android.nmap':            'rest',    // 네이버 지도
  'com.locnall.KimGiSa':             'rest',    // 카카오내비
}

/**
 * 패키지명을 활동 카테고리로 변환한다.
 * @returns 카테고리 ID 또는 null(미분류 — 기록하지 않음)
 */
export function categoryForApp(pkg, overrides = {}) {
  if (!pkg) return null
  return overrides[pkg] ?? BUILTIN_CATEGORY[pkg] ?? null
}
```

- [ ] **Step 4: 통과 확인**

Run: `node scripts/check-autocheckin.mjs`
Expected: PASS — 두 줄 모두 출력

- [ ] **Step 5: 커밋**

```bash
git add src/data/appCategories.js scripts/check-autocheckin.mjs
git commit -m "feat: 앱 패키지 → 활동 카테고리 매핑 (미분류는 기록 안 함)"
```

---

### Task 3: 체크인 저장소 추출

현재 `useAlarm.js`의 `saveCheckin()`은 시각을 **호출 시점의 현재**로 고정한다. 소급 기록은 **슬롯의 시각**으로 저장해야 하므로 저장 로직을 별도 모듈로 빼고 시각을 인자로 받게 한다. 카테고리 수정 기능도 여기 둔다. 기존 동작은 그대로 유지된다.

**Files:**
- Create: `src/lib/checkinStore.js`
- Modify: `src/hooks/useAlarm.js:209-247` (`saveCheckin` 본문을 위임으로 교체)
- Modify: `scripts/check-autocheckin.mjs` (엔트리 생성 함수 검증 추가)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `buildCheckinEntry(activityType: string, atMs: number) => {activity_type, alarm_hour, created_at}` (순수)
  - `saveCheckin(activityType: string, userId: string|null, atMs?: number) => Promise<void>` — 로컬 저장 + 로그인 시 Supabase, `ogu:checkin` 이벤트 발사
  - `updateCheckinCategory(createdAtList: string[], newCategory: string, userId: string|null) => Promise<void>` — 로컬·서버 레코드의 `activity_type` 변경 후 `ogu:checkin` 이벤트(detail 없이) 발사
  - `loadLocalCheckins() => Array<{activity_type, alarm_hour, created_at}>`

- [ ] **Step 1: 실패하는 체크 추가**

`scripts/check-autocheckin.mjs` 상단 import 블록에 추가:

```js
import { buildCheckinEntry } from '../src/lib/checkinStore.js'
```

`console.log('✓ appCategories 검증 통과')` **뒤에** 추가:

```js
// 엔트리는 "현재 시각"이 아니라 "주어진 시각"으로 만들어져야 한다
{
  const e = buildCheckinEntry('sns', at(9, 30))
  assert.equal(e.activity_type, 'sns')
  assert.equal(e.alarm_hour, 9)
  assert.equal(new Date(e.created_at).getTime(), at(9, 30))
}

console.log('✓ checkinStore 검증 통과')
```

- [ ] **Step 2: 실패 확인**

Run: `node scripts/check-autocheckin.mjs`
Expected: FAIL — `Cannot find module '.../src/lib/checkinStore.js'`

- [ ] **Step 3: 구현**

`src/lib/checkinStore.js`:

```js
// ── 체크인 저장소 (로컬 + Supabase) ──────────────────────────────
// 수동 체크인(알람 팝업)과 자동 체크인(소급 기록)이 공유한다.
// 시각을 인자로 받는 것이 핵심 — 소급 기록은 슬롯 시각으로 저장해야 한다.
import { supabase } from './supabase'

const LOCAL_KEY   = 'ogu_local_checkins'
const KEEP_DAYS   = 30

/** 순수: 저장할 엔트리 1건을 만든다 */
export function buildCheckinEntry(activityType, atMs) {
  const d = new Date(atMs)
  return {
    activity_type: activityType,
    alarm_hour:    d.getHours(),
    created_at:    d.toISOString(),
  }
}

export function loadLocalCheckins() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function writeLocalCheckins(list) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)) } catch {}
}

export async function saveCheckin(activityType, userId = null, atMs = Date.now()) {
  const entry = buildCheckinEntry(activityType, atMs)

  // 항상 로컬 저장 (비로그인 fallback + 오프라인 대비)
  try {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - KEEP_DAYS)
    const trimmed = loadLocalCheckins().filter(c => new Date(c.created_at) >= cutoff)
    trimmed.unshift(entry)
    writeLocalCheckins(trimmed)
    // 리포트/홈이 즉시 반영되도록 새 엔트리를 실어 발사
    window.dispatchEvent(new CustomEvent('ogu:checkin', { detail: entry }))
  } catch {}

  if (!userId) return

  // notification_log 의 NOT NULL 컬럼(notification_type/title/body)을 함께 채움
  const { error } = await supabase.from('notification_log').insert({
    user_id:           userId,
    notification_type: 'checkin',
    title:             '오구 체크인',
    body:              `이번 시간 활동: ${activityType}`,
    ...entry,
  })
  if (error) {
    console.error('[체크인] Supabase 저장 실패:', error)
    window.dispatchEvent(new CustomEvent('ogu:checkin-error', {
      detail: { message: error.message, code: error.code },
    }))
  }
}

/** 이미 저장된 체크인들의 카테고리를 바꾼다 (사용자 수정 학습) */
export async function updateCheckinCategory(createdAtList, newCategory, userId = null) {
  if (!createdAtList?.length) return
  const targets = new Set(createdAtList)

  try {
    const list = loadLocalCheckins().map(c =>
      targets.has(c.created_at) ? { ...c, activity_type: newCategory } : c)
    writeLocalCheckins(list)
  } catch {}

  if (userId) {
    const { error } = await supabase
      .from('notification_log')
      .update({ activity_type: newCategory, body: `이번 시간 활동: ${newCategory}` })
      .eq('user_id', userId)
      .eq('notification_type', 'checkin')
      .in('created_at', createdAtList)
    if (error) console.error('[체크인] 카테고리 수정 실패:', error)
  }

  // detail 없이 발사 → 구독자가 전체 reload
  window.dispatchEvent(new CustomEvent('ogu:checkin'))
}
```

- [ ] **Step 4: `useAlarm.js`를 위임으로 교체**

`src/hooks/useAlarm.js` 상단 import에 추가:

```js
import { saveCheckin as saveCheckinToStore } from '../lib/checkinStore'
```

기존 `saveCheckin` 정의(209~247행 부근, `const saveCheckin = useCallback(async (activityType) => { ... }, [userId])` 전체)를 아래로 교체한다:

```js
  // 저장 로직은 checkinStore 가 담당 (자동 체크인과 공유)
  const saveCheckin = useCallback(
    (activityType, atMs) => saveCheckinToStore(activityType, userId, atMs),
    [userId],
  )
```

`supabase` import가 `useAlarm.js`의 다른 곳에서 더 이상 쓰이지 않으면 import를 제거한다. 다음으로 확인한다:

Run: `grep -n "supabase" src/hooks/useAlarm.js`
쓰이는 곳이 없으면 import 줄을 지운다.

- [ ] **Step 5: 통과 확인 + 회귀 확인**

Run: `node scripts/check-autocheckin.mjs`
Expected: PASS — 세 줄 모두 출력

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/lib/checkinStore.js src/hooks/useAlarm.js scripts/check-autocheckin.mjs
git commit -m "refactor: 체크인 저장 로직을 checkinStore 로 추출 (시각 인자화)"
```

---

### Task 4: 네이티브 플러그인 + JS 브리지

`spike/usage-stats`의 검증본을 **임의 구간(start~end)** 을 받도록 고쳐 정식 위치에 만든다. spike는 `minutes` 상대값만 받았지만 소급 기록은 과거의 특정 슬롯을 조회해야 한다.

**Files:**
- Create: `android/app/src/main/java/com/ogutalk/app/UsageStatsPlugin.java`
- Create: `src/lib/usageStats.js`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `android/app/src/main/java/com/ogutalk/app/MainActivity.java:45` (플러그인 등록)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `hasUsageAccess() => Promise<boolean>`
  - `openUsageSettings() => Promise<void>`
  - `getUsage(startMs: number, endMs: number, limit?: number) => Promise<Array<{pkg:string, label:string, seconds:number}>>` — 사용시간 내림차순. 네이티브가 아니거나 권한이 없으면 `[]`

- [ ] **Step 1: 네이티브 플러그인 작성**

spike 브랜치의 검증본을 기반으로 하되 **구간을 절대 시각으로 받도록** 바꾼다. `git show spike/usage-stats:android/app/src/main/java/com/ogutalk/app/UsageStatsPlugin.java` 로 원본을 확인할 수 있다.

`android/app/src/main/java/com/ogutalk/app/UsageStatsPlugin.java`:

```java
package com.ogutalk.app;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * 구간별 앱 포그라운드 사용시간 조회.
 *
 * 모델: "포그라운드 앱은 항상 1개" — RESUMED 가 오면 이전 세션을 닫고 새로 연다.
 * 조회창 이전부터 이어지던 세션을 잡기 위해 LOOKBACK_MS 만큼 앞에서부터 스캔한 뒤
 * 각 구간을 [start, end] 로 잘라서(clamp) 누적한다.
 *
 * 실기기 검증에서 고친 문제들:
 *  - 조회창 전체를 덮는 연속 세션이 0초로 집계되던 문제 → lookback + clamp
 *  - 화면이 꺼질 때 PAUSED 가 오지 않아 시간이 무한 누적되던 문제 → 화면 꺼짐 이벤트에서 세션 종료
 *  - 자기 패키지를 스캔에서 건너뛰어 직전 앱 시간이 부풀던 문제 → 출력 시에만 제외
 */
@CapacitorPlugin(name = "UsageStats")
public class UsageStatsPlugin extends Plugin {

    private static final long LOOKBACK_MS = 12L * 60 * 60 * 1000;

    private static final int EV_SCREEN_NON_INTERACTIVE = 16;
    private static final int EV_KEYGUARD_SHOWN         = 17;
    private static final int EV_DEVICE_SHUTDOWN        = 26;

    private boolean checkAccess() {
        Context ctx = getContext();
        AppOpsManager ops = (AppOpsManager) ctx.getSystemService(Context.APP_OPS_SERVICE);
        if (ops == null) return false;
        int mode;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            mode = ops.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ctx.getPackageName());
        } else {
            mode = ops.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ctx.getPackageName());
        }
        if (mode == AppOpsManager.MODE_DEFAULT) {
            return ctx.checkCallingOrSelfPermission(
                android.Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED;
        }
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    @PluginMethod
    public void hasAccess(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", checkAccess());
        call.resolve(ret);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        i.setData(Uri.parse("package:" + ctx.getPackageName()));
        try {
            ctx.startActivity(i);
        } catch (Exception ex) {
            Intent fallback = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { ctx.startActivity(fallback); } catch (Exception ignore) { }
        }
        call.resolve();
    }

    /** [startMs, endMs] 구간의 패키지별 포그라운드 시간(초), 상위 limit개 */
    @PluginMethod
    public void getUsage(PluginCall call) {
        if (!checkAccess()) { call.reject("NO_ACCESS"); return; }

        Long startArg = call.getLong("startMs");
        Long endArg   = call.getLong("endMs");
        if (startArg == null || endArg == null || endArg <= startArg) {
            call.reject("BAD_RANGE");
            return;
        }
        long begin = startArg;
        long end   = endArg;
        int  limit = call.getInt("limit", 5);

        Context ctx = getContext();
        UsageStatsManager usm = (UsageStatsManager) ctx.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) { call.reject("NO_SERVICE"); return; }

        UsageEvents events = usm.queryEvents(begin - LOOKBACK_MS, end);
        UsageEvents.Event e = new UsageEvents.Event();

        Map<String, Long> totalMs = new HashMap<>();
        String curPkg   = null;
        long   curStart = 0;

        while (events.hasNextEvent()) {
            events.getNextEvent(e);
            int  type = e.getEventType();
            long t    = e.getTimeStamp();
            String pkg = e.getPackageName();

            if (type == UsageEvents.Event.MOVE_TO_FOREGROUND) {          // ACTIVITY_RESUMED
                if (pkg == null) continue;
                if (curPkg != null) addClamped(totalMs, curPkg, curStart, t, begin, end);
                curPkg = pkg;
                curStart = t;
            } else if (type == UsageEvents.Event.MOVE_TO_BACKGROUND) {   // ACTIVITY_PAUSED
                if (curPkg != null && curPkg.equals(pkg)) {
                    addClamped(totalMs, curPkg, curStart, t, begin, end);
                    curPkg = null;
                }
            } else if (type == EV_SCREEN_NON_INTERACTIVE
                    || type == EV_KEYGUARD_SHOWN
                    || type == EV_DEVICE_SHUTDOWN) {
                if (curPkg != null) {
                    addClamped(totalMs, curPkg, curStart, t, begin, end);
                    curPkg = null;
                }
            }
        }
        if (curPkg != null) addClamped(totalMs, curPkg, curStart, end, begin, end);

        ArrayList<Map.Entry<String, Long>> sorted = new ArrayList<>(totalMs.entrySet());
        Collections.sort(sorted, (a, b) -> Long.compare(b.getValue(), a.getValue()));

        PackageManager pm = ctx.getPackageManager();
        String self = ctx.getPackageName();
        JSArray apps = new JSArray();
        int shown = 0;
        for (Map.Entry<String, Long> en : sorted) {
            if (shown >= limit) break;
            String pkg = en.getKey();
            if (pkg.equals(self)) continue;      // 오구톡 자신은 제외
            if (en.getValue() < 1000) continue;  // 1초 미만 노이즈 컷
            String label = pkg;
            try {
                label = pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString();
            } catch (Exception ignore) { /* 패키지 가시성 제한 시 패키지명 그대로 */ }
            JSObject o = new JSObject();
            o.put("pkg", pkg);
            o.put("label", label);
            o.put("seconds", en.getValue() / 1000);
            apps.put(o);
            shown++;
        }

        JSObject ret = new JSObject();
        ret.put("apps", apps);
        call.resolve(ret);
    }

    /** [s, t] 구간을 [begin, end] 로 잘라 누적 */
    private static void addClamped(Map<String, Long> acc, String pkg, long s, long t, long begin, long end) {
        long from = Math.max(s, begin);
        long to   = Math.min(t, end);
        if (to <= from) return;
        Long prev = acc.get(pkg);
        acc.put(pkg, (prev == null ? 0L : prev) + (to - from));
    }
}
```

- [ ] **Step 2: 매니페스트 수정**

`android/app/src/main/AndroidManifest.xml` 의 `<manifest>` 여는 태그를 아래로 교체한다:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- 설치된 앱의 표시 이름 조회 (QUERY_ALL_PACKAGES 없이 — 선언 양식 대상 회피) -->
    <queries>
        <intent>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent>
    </queries>
```

`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 권한 줄 **뒤에** 추가한다:

```xml
    <!-- 앱별 사용시간 조회 (사용자가 설정에서 '사용정보 접근'을 직접 허용해야 함) -->
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS"
        tools:ignore="ProtectedPermissions" />
```

- [ ] **Step 3: 플러그인 등록**

`android/app/src/main/java/com/ogutalk/app/MainActivity.java`의 `registerPlugin(AudioFocusPlugin.class);` 다음 줄에 추가:

```java
        registerPlugin(UsageStatsPlugin.class);
```

- [ ] **Step 4: JS 브리지 작성**

`src/lib/usageStats.js`:

```js
// ── UsageStats 브릿지 (안드로이드 전용) ─────────────────────────
// 웹/미지원 환경에서는 모두 안전한 기본값을 반환한다.
import { IS_NATIVE } from './capacitor'

let _plugin = null
async function plugin() {
  if (!IS_NATIVE) return null
  if (!_plugin) {
    const { registerPlugin } = await import('@capacitor/core')
    _plugin = registerPlugin('UsageStats')
  }
  return _plugin
}

export async function hasUsageAccess() {
  try {
    const p = await plugin()
    if (!p) return false
    const { granted } = await p.hasAccess()
    return !!granted
  } catch { return false }
}

export async function openUsageSettings() {
  try {
    const p = await plugin()
    await p?.openSettings()
  } catch (e) { console.warn('[UsageStats] 설정 열기 실패:', e) }
}

/** @returns [{pkg, label, seconds}] — 사용시간 내림차순. 실패 시 [] */
export async function getUsage(startMs, endMs, limit = 5) {
  try {
    const p = await plugin()
    if (!p) return []
    const { apps } = await p.getUsage({ startMs, endMs, limit })
    return apps || []
  } catch (e) {
    // NO_ACCESS 는 정상적인 미허용 상태 — 조용히 빈 배열
    return []
  }
}
```

- [ ] **Step 5: 컴파일 확인**

Run:
```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
```
Expected: `BUILD SUCCESSFUL`

(`JAVA_HOME`이 없으면 `export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"`)

런타임 동작은 UI가 생기는 Task 5에서 실기기로 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add android/app/src/main/java/com/ogutalk/app/UsageStatsPlugin.java \
        android/app/src/main/AndroidManifest.xml \
        android/app/src/main/java/com/ogutalk/app/MainActivity.java \
        src/lib/usageStats.js
git commit -m "feat: UsageStats 네이티브 플러그인 + JS 브릿지 (구간 조회)"
```

---

### Task 5: 설정 토글 + 사전 고지

Play 정책상 **권한을 요청하기 전에** 앱 내 고지와 명시적 동의가 필요하다. 설정 탭에 토글과 고지 UI를 추가한다. `SettingsPage.jsx`가 이미 524줄이라 새 섹션은 별도 컴포넌트로 만든다.

**Files:**
- Create: `src/components/settings/AutoCheckinSection.jsx`
- Modify: `src/lib/settings.js:17-28` (기본값 추가)
- Modify: `src/pages/SettingsPage.jsx` (섹션 삽입)
- Modify: `src/App.jsx` (설정값 전달)

**Interfaces:**
- Consumes: `hasUsageAccess()`, `openUsageSettings()` (Task 4)
- Produces:
  - `AutoCheckinSection({ enabled: boolean, onChange: (v:boolean)=>void })` — 기본 export
  - `settings.autoCheckin: boolean` (기본 `false`), `settings.lastBackfillAt: number|null` (기본 `null`)

- [ ] **Step 1: 설정 기본값 추가**

`src/lib/settings.js`의 `DEFAULT_SETTINGS` 객체에 두 줄을 추가한다(`alarmHours` 줄 뒤):

```js
  // 자동 활동 기록 (UsageStats) — 기본 꺼짐, 사용자가 고지 동의 후 켠다
  autoCheckin:    false,
  lastBackfillAt: null,     // 마지막 소급 기록 시각 (epoch ms)
```

- [ ] **Step 2: 섹션 컴포넌트 작성**

`src/components/settings/AutoCheckinSection.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react'
import Toggle from '../common/Toggle'
import { IS_NATIVE } from '../../lib/capacitor'
import { hasUsageAccess, openUsageSettings } from '../../lib/usageStats'

export default function AutoCheckinSection({ enabled, onChange }) {
  const [granted, setGranted] = useState(false)
  const [notice,  setNotice]  = useState(false)   // 고지 화면 표시 여부

  const refresh = useCallback(async () => {
    setGranted(await hasUsageAccess())
  }, [])

  // 시스템 설정에서 돌아왔을 때 권한 상태 재확인
  useEffect(() => {
    if (!IS_NATIVE) return
    refresh()
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  if (!IS_NATIVE) return null

  const handleToggle = (v) => {
    if (!v) { onChange(false); return }
    setNotice(true)          // 켤 때는 고지 먼저
  }

  const handleAgree = async () => {
    setNotice(false)
    onChange(true)
    if (!granted) await openUsageSettings()
  }

  return (
    <div style={{ marginBottom: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}>
        ⏱️ 자동 활동 기록
      </div>

      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
        앱 사용시간을 읽어 30분마다 활동을 자동으로 기록합니다.<br />
        <span style={{ color: '#475569' }}>켜두면 알람에서 따로 선택하지 않아도 리포트가 채워집니다.</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
        <span style={{ color: '#e2e8f0', fontSize: 13 }}>자동 기록 사용</span>
        {/* Toggle 의 props 는 on / onToggle 이다 (checked / onChange 아님) */}
        <Toggle on={enabled} onToggle={() => handleToggle(!enabled)} />
      </div>

      {enabled && !granted && (
        <button
          onClick={openUsageSettings}
          style={{
            width: '100%', marginTop: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)',
            color: '#f59e0b', fontSize: 12, fontWeight: 700,
          }}
        >
          ⚠️ 사용정보 접근 권한이 필요합니다 — 설정 열기
        </button>
      )}
      {enabled && granted && (
        <div style={{ color: '#34d399', fontSize: 12, marginTop: 8 }}>✓ 자동 기록 중</div>
      )}

      {/* ── 사전 고지 (Play 정책: 권한 요청 전 명시적 동의) ── */}
      {notice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, padding: 24,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '100%', maxWidth: 340, background: '#1e293b', borderRadius: 20, padding: 22,
            border: '1px solid rgba(99,102,241,0.3)',
          }}>
            <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
              오구톡이 앱 사용시간을 읽습니다
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
              매시간 무엇을 했는지 자동으로 기록해 리포트를 채우기 위해 사용합니다.<br /><br />
              이 정보는 <b style={{ color: '#818cf8' }}>기기 안에서만 처리되며 서버로 전송되지 않습니다.</b>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setNotice(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 700 }}
              >취소</button>
              <button
                onClick={handleAgree}
                style={{ flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 13, fontWeight: 800 }}
              >허용하고 계속</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: SettingsPage 에 삽입**

`src/pages/SettingsPage.jsx` 상단 import에 추가:

```jsx
import AutoCheckinSection from '../components/settings/AutoCheckinSection'
```

props 목록(`todoPct = 0,` 다음 줄)에 추가:

```jsx
  autoCheckin = false, setAutoCheckin,
```

`{/* ── 약관·정보 (제일 마지막에 배치) ── */}` **앞에** 삽입:

```jsx
      <AutoCheckinSection enabled={autoCheckin} onChange={setAutoCheckin} />
```

- [ ] **Step 4: App.jsx 배선**

`src/App.jsx:191`의 구조 분해에 두 값을 추가한다:

```jsx
  const { oguTone, oguAlarmTone, oguRepeat, alarmMode, customAlarmMode, volume, vibStrength, alarmHours,
          autoCheckin, lastBackfillAt } = settings
```

`src/App.jsx:206`의 `const setAlarmMode = v => updateSetting('alarmMode', v)` 아래에 추가한다:

```jsx
  const setAutoCheckin    = v => updateSetting('autoCheckin', v)
  const setLastBackfillAt = v => updateSetting('lastBackfillAt', v)
```

`<SettingsPage ... />`(515행 부근)에 아래 props를 넘긴다:

```jsx
            autoCheckin={autoCheckin}
            setAutoCheckin={setAutoCheckin}
```

- [ ] **Step 5: 빌드 + 실기기 확인**

Run:
```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

기기에서 확인:
1. 설정 탭 → "⏱️ 자동 활동 기록" 섹션이 보인다
2. 토글 ON → **고지 화면이 먼저 뜬다** (바로 시스템 설정으로 가면 정책 위반)
3. "허용하고 계속" → 시스템 사용정보 접근 화면으로 이동
4. 오구톡 허용 후 뒤로 → 섹션이 "✓ 자동 기록 중"으로 바뀐다
5. 토글 OFF → 고지 없이 바로 꺼진다

- [ ] **Step 6: 커밋**

```bash
git add src/components/settings/AutoCheckinSection.jsx src/lib/settings.js \
        src/pages/SettingsPage.jsx src/App.jsx
git commit -m "feat: 자동 활동 기록 설정 토글 + 권한 사전 고지 UI"
```

---

### Task 6: 소급 기록 훅

슬롯 계산·사용시간 조회·매핑·저장을 엮어 실제로 체크인을 채운다.

**Files:**
- Create: `src/hooks/useAutoCheckin.js`
- Modify: `src/App.jsx` (훅 호출 + 알람 팝업에 요약 전달)

**Interfaces:**
- Consumes: `buildSlots`, `slotKey`, `MIN_ACTIVE_MS` (Task 1) / `categoryForApp` (Task 2) / `saveCheckin`, `updateCheckinCategory`, `loadLocalCheckins` (Task 3) / `getUsage`, `hasUsageAccess` (Task 4)
- Produces:
  - `useAutoCheckin({ enabled, userId, lastBackfillAt, setLastBackfillAt }) => { runBackfill, lastHourSummary, correctLastHour }`
    - `runBackfill() => Promise<number>` — 기록한 슬롯 수
    - `lastHourSummary: {pkg, label, minutes, category} | null` — 알람 팝업 표시용
    - `correctLastHour(category: string) => Promise<void>` — 수정 학습

- [ ] **Step 1: 훅 작성**

`src/hooks/useAutoCheckin.js`:

```js
import { useState, useCallback, useRef, useEffect } from 'react'
import { buildSlots, slotKey, MIN_ACTIVE_MS } from '../lib/checkinSlots'
import { categoryForApp } from '../data/appCategories'
import { getUsage, hasUsageAccess } from '../lib/usageStats'
import { saveCheckin, updateCheckinCategory, loadLocalCheckins } from '../lib/checkinStore'

const OVERRIDE_KEY = 'ogu_app_category'

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') } catch { return {} }
}
function saveOverride(pkg, category) {
  try {
    const map = loadOverrides()
    map[pkg] = category
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map))
  } catch {}
}

/** 이미 기록된 슬롯 키 집합 (로컬 기록 기준 — 서버는 로컬의 상위집합) */
function recordedSlotKeys() {
  const set = new Set()
  for (const c of loadLocalCheckins()) {
    const t = new Date(c.created_at).getTime()
    if (!Number.isNaN(t)) set.add(slotKey(t))
  }
  return set
}

export function useAutoCheckin({ enabled, userId, lastBackfillAt, setLastBackfillAt }) {
  const [lastHourSummary, setLastHourSummary] = useState(null)
  const running = useRef(false)   // 중복 실행 방지

  // ⚠️ App.jsx 의 setLastBackfillAt 은 매 렌더 새로 만들어지는 화살표 함수다.
  // 의존성 배열에 그대로 넣으면 runBackfill 이 매 렌더 새로 생성되고,
  // 이를 구독하는 useEffect 가 계속 재실행되어 무한 소급 루프가 된다.
  // App.jsx 가 showAlarmPopupRef 등에서 쓰는 것과 같은 ref 패턴으로 고정한다.
  const lastRef    = useRef(lastBackfillAt)
  const setLastRef = useRef(setLastBackfillAt)
  useEffect(() => { lastRef.current    = lastBackfillAt    }, [lastBackfillAt])
  useEffect(() => { setLastRef.current = setLastBackfillAt }, [setLastBackfillAt])

  const runBackfill = useCallback(async () => {
    if (!enabled || running.current) return 0
    running.current = true
    try {
      if (!(await hasUsageAccess())) return 0

      const now       = Date.now()
      const overrides = loadOverrides()
      const slots     = buildSlots(lastRef.current, now, recordedSlotKeys())

      let saved = 0
      for (const slot of slots) {
        const apps = await getUsage(slot.start, slot.end, 3)
        if (!apps.length) continue
        const totalMs = apps.reduce((s, a) => s + a.seconds * 1000, 0)
        if (totalMs < MIN_ACTIVE_MS) continue        // 취침·미사용 구간

        const top = apps[0]
        const category = categoryForApp(top.pkg, overrides)
        if (!category) continue                       // 미분류 앱은 기록하지 않음

        await saveCheckin(category, userId, slot.start)
        saved++
      }

      // 지난 1시간 요약 (팝업 표시용 — 기록 여부와 무관하게 계산)
      const hourAgo = now - 60 * 60 * 1000
      const recent  = await getUsage(hourAgo, now, 3)
      if (recent.length) {
        const top = recent[0]
        setLastHourSummary({
          pkg:      top.pkg,
          label:    top.label,
          minutes:  Math.round(top.seconds / 60),
          category: categoryForApp(top.pkg, overrides),
        })
      } else {
        setLastHourSummary(null)
      }

      setLastRef.current?.(now)
      return saved
    } finally {
      running.current = false
    }
  }, [enabled, userId])   // ← 안정적인 값만. ref 패턴으로 루프를 막는다

  /** 사용자가 알람 팝업에서 분류를 고쳤을 때 */
  const correctLastHour = useCallback(async (category) => {
    const s = lastHourSummary
    if (!s) return
    saveOverride(s.pkg, category)

    // 직전 1시간에 그 앱으로 기록된 슬롯(최대 2건)을 모두 갱신
    const now     = Date.now()
    const hourAgo = now - 60 * 60 * 1000
    const targets = loadLocalCheckins()
      .filter(c => {
        const t = new Date(c.created_at).getTime()
        return t >= hourAgo && t <= now && c.activity_type === s.category
      })
      .map(c => c.created_at)

    if (targets.length) await updateCheckinCategory(targets, category, userId)
    else await saveCheckin(category, userId, now)   // 미분류라 기록이 없던 경우

    setLastHourSummary({ ...s, category })
  }, [lastHourSummary, userId])

  return { runBackfill, lastHourSummary, correctLastHour }
}
```

- [ ] **Step 2: App.jsx 배선**

`src/App.jsx`에 훅을 호출하고 두 지점에서 `runBackfill()`을 부른다.

import 추가:

```jsx
import { useAutoCheckin } from './hooks/useAutoCheckin'
```

`useAlarm` 호출부 근처에 추가(설정값은 Task 5에서 만든 `autoCheckin`, `lastBackfillAt` 사용):

```jsx
  const { runBackfill, lastHourSummary, correctLastHour } = useAutoCheckin({
    enabled: autoCheckin,
    userId,
    lastBackfillAt,
    setLastBackfillAt,
  })

  // 앱 복귀 시 + 알람 팝업이 뜰 때 소급 기록
  useEffect(() => {
    if (!autoCheckin) return
    runBackfill()
    const onVis = () => { if (document.visibilityState === 'visible') runBackfill() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [autoCheckin, runBackfill])

  useEffect(() => {
    if (autoCheckin && showAlarmPopup) runBackfill()
  }, [autoCheckin, showAlarmPopup, runBackfill])
```

- [ ] **Step 3: 빌드 + 실기기 확인**

Run:
```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

기기에서 확인:
1. 자동 기록 ON + 권한 허용 상태로 유튜브 등을 10분 이상 사용
2. 오구톡을 열고 **리포트 탭** → 오늘 체크인에 항목이 늘어나 있다
3. 앱을 닫고 30분 뒤 다시 열면 그 사이 슬롯이 추가로 채워진다
4. 폰을 오래 꺼뒀던 구간은 기록되지 않는다(5분 미만 스킵)
5. 자동 기록 OFF로 바꾸면 더 이상 늘지 않는다
6. **한 앱만 30분 넘게 연속 사용**한 뒤 확인 — 그 슬롯이 기록된다
   (스펙 2장의 미검증 항목. 슬롯 안에 이벤트가 하나도 없는 경우로, lookback + clamp 가
   동작하지 않으면 해당 슬롯이 통째로 비어 기록이 누락된다)
7. 앱을 열어둔 채 몇 분 지켜봐도 리포트 항목이 계속 늘어나지 않는다
   (무한 소급 루프가 없는지 — 훅의 ref 패턴 확인)

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/useAutoCheckin.js src/App.jsx
git commit -m "feat: 30분 슬롯 소급 기록 훅 (앱 복귀·알람 시 실행)"
```

---

### Task 7: 알람 팝업 분기

권한이 있으면 "지난 1시간 요약 + 자동 기록됨"을 보여주고(탭 0번), 없으면 지금의 수동 4버튼을 그대로 쓴다.

**Files:**
- Modify: `src/components/alarm/AlarmPopup.jsx:84-131` (체크인 섹션)
- Modify: `src/App.jsx:537-544` (props 전달)

**Interfaces:**
- Consumes: `lastHourSummary`, `correctLastHour` (Task 6)
- Produces: `AlarmPopup`에 props 추가 — `autoSummary: {label, minutes, category}|null`, `onCorrect: (category:string)=>void`

- [ ] **Step 1: 팝업 컴포넌트 수정**

`src/components/alarm/AlarmPopup.jsx`의 함수 시그니처에 두 props를 추가한다:

```jsx
export default function AlarmPopup({
  alarmContent, pendingCount = 0, oguTone = '유쾌', onClose, onCheckin,
  autoSummary = null, onCorrect = null,
}) {
```

`handleCheckin` 아래에 수정 핸들러를 추가한다:

```jsx
  const [correcting, setCorrecting] = useState(false)

  const handleCorrect = (activityId) => {
    onCorrect?.(activityId)
    setCorrecting(false)
    setCheckedIn(true)
    setTimeout(onClose, 200)
  }
```

체크인 섹션(`{/* ── 체크인 섹션 ── */}` 블록 전체)을 아래로 교체한다:

```jsx
        {/* ── 체크인 섹션 ── */}
        <div style={{
          marginBottom: 20,
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: 20, padding: '18px 14px',
          boxShadow: '0 0 24px rgba(99,102,241,0.12)',
        }}>
          {autoSummary && !correcting ? (
            /* 자동 기록 모드 — 아무것도 누르지 않아도 이미 기록됨 */
            <>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#f1f5f9', marginBottom: 8, letterSpacing: '-0.5px' }}>
                지난 1시간
              </div>
              <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                {autoSummary.label} {autoSummary.minutes}분
              </div>
              <div style={{ color: autoSummary.category ? '#34d399' : '#fb923c', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                {autoSummary.category
                  ? `✓ ${ACTIVITY_LABEL[autoSummary.category] ?? autoSummary.category} 으로 기록했어요`
                  : '아직 분류되지 않은 앱이에요'}
              </div>
              <button
                onClick={() => setCorrecting(true)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                  color: '#cbd5e1', fontSize: 13, fontWeight: 700,
                }}
              >
                {autoSummary.category ? '다르게 기록' : '분류 선택하기'}
              </button>
            </>
          ) : (
            /* 수동 모드 (권한 없음·기능 OFF) 또는 수정 중 */
            <>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#f1f5f9', marginBottom: 6, textAlign: 'center', letterSpacing: '-0.5px' }}>
                ⏱️ 이번 시간 뭐 하셨어요?
              </div>
              {!autoSummary && (
                <div style={{ color: '#fb923c', fontSize: 13, fontWeight: 700, marginBottom: 14, textAlign: 'center' }}>
                  👇 선택해야 알람이 종료됩니다
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {ACTIVITIES.map(a => (
                  <button
                    key={a.id}
                    onClick={() => (correcting ? handleCorrect(a.id) : handleCheckin(a.id))}
                    style={{
                      padding: '14px 6px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, lineHeight: 1.3,
                      background: selected === a.id ? `${a.color}33` : 'rgba(255,255,255,0.06)',
                      color: selected === a.id ? a.color : '#cbd5e1',
                      outline: selected === a.id ? `2px solid ${a.color}` : '1.5px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.15s ease',
                      transform: selected === a.id ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: selected === a.id ? `0 0 16px ${a.color}44` : 'none',
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {checkedIn && (
            <div style={{ marginTop: 10, color: '#34d399', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
              ✓ 기록 완료!
            </div>
          )}
        </div>
```

파일 상단 `ACTIVITIES` 배열 아래에 라벨 조회용 맵을 추가한다:

```jsx
const ACTIVITY_LABEL = ACTIVITIES.reduce((m, a) => { m[a.id] = a.label; return m }, {})
```

- [ ] **Step 2: App.jsx props 전달**

`<AlarmPopup ... />`에 두 줄을 추가한다:

```jsx
          autoSummary={autoCheckin ? lastHourSummary : null}
          onCorrect={correctLastHour}
```

- [ ] **Step 3: 빌드 + 실기기 확인**

Run:
```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

기기에서 확인(테스트 알람은 설정 탭의 알람 테스트로 30초 뒤 발생시킬 수 있다):
1. 자동 기록 ON + 권한 O → 팝업에 "지난 1시간 · 앱 이름 N분"과 기록된 카테고리가 보인다
2. 그냥 닫아도 리포트에 기록이 남아 있다 (탭 0번)
3. "다르게 기록" → 4버튼 → 선택하면 그 카테고리로 바뀐다
4. 같은 앱을 다시 쓴 다음 시간에는 **고친 카테고리로 자동 기록**된다 (수정 학습)
5. 자동 기록 OFF → 기존 수동 4버튼 팝업이 그대로 나온다

- [ ] **Step 4: 커밋**

```bash
git add src/components/alarm/AlarmPopup.jsx src/App.jsx
git commit -m "feat: 알람 팝업 자동 기록 표시 + 수정 학습 (수동 폴백 유지)"
```

---

### Task 8: 리포트 이모지 줄 조정

기록량이 하루 최대 17건 → 34건으로 약 2배가 되어 "오늘의 체크인" 이모지 줄이 한 줄을 넘친다.

**Files:**
- Modify: `src/pages/ReportsPage.jsx:337` 부근 (`todayCheckins.map(...).join('  ')`)

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: 줄바꿈 허용으로 변경**

`src/pages/ReportsPage.jsx:337` 부근의 아래 블록을 찾는다:

```jsx
                <div style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>
                  {todayCheckins.map(c => ACTIVITY_EMOJI[c.activity_type] || '?').join('  ')}
                </div>
```

아래로 교체한다(이모지가 카드 밖으로 넘치지 않고 여러 줄로 흐르게 한다):

```jsx
                <div style={{
                  color: '#475569', fontSize: 10, marginTop: 2,
                  lineHeight: 1.8, wordBreak: 'break-all', whiteSpace: 'normal',
                }}>
                  {todayCheckins.map(c => ACTIVITY_EMOJI[c.activity_type] || '?').join('  ')}
                </div>
```

바깥 카드가 `display: 'flex'`라 자식이 늘어나도 폭이 유지되도록, 이 `<div>`를 감싼
부모 `<div>`(`<span style={{ fontSize: 18 }}>📅</span>` 다음의 `<div>`)에 `minWidth: 0`을 준다:

```jsx
              <div style={{ minWidth: 0 }}>
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 성공

- [ ] **Step 3: 실기기 확인**

리포트 탭에서 오늘 체크인이 20건 이상일 때 이모지가 카드 밖으로 넘치지 않고 여러 줄로 표시되는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add src/pages/ReportsPage.jsx
git commit -m "fix: 자동 기록으로 늘어난 체크인 이모지 줄바꿈 처리"
```

---

### Task 9: 문서 갱신 및 마무리

**Files:**
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`
- Modify: `android/app/build.gradle:18-19` (versionCode/versionName)

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: CLAUDE.md 갱신**

다음을 반영한다:
- 핵심 기능에 "자동 활동 기록(UsageStats, 30분 슬롯, 기본 OFF)" 추가
- localStorage 키 목록에 `ogu_app_category` 추가
- 기술 스택에 "커스텀 네이티브 플러그인: AudioFocus, UsageStats" 추가

- [ ] **Step 2: CHANGELOG.md 에 항목 추가**

기존 형식을 따라 v1.7.0 항목을 추가한다:

```markdown
## v1.7.0 — 자동 활동 기록

- 앱 사용시간(UsageStats)으로 30분마다 활동을 자동 기록 (기본 OFF, 사용자가 설정에서 켬)
- 알람 팝업이 지난 1시간 요약을 보여주고, 탭 없이도 리포트가 채워짐
- 분류가 틀리면 한 번 고치면 그 앱은 다음부터 자동 적용 (수정 학습)
- 권한 미허용 시 기존 수동 체크인 그대로 동작
- 사용시간 데이터는 기기 내에서만 처리되며 서버로 전송하지 않음
```

- [ ] **Step 3: 버전 올리기**

`android/app/build.gradle`:
```gradle
        versionCode 15
        versionName "1.7.0"
```

- [ ] **Step 4: 전체 검증**

Run:
```bash
node scripts/check-autocheckin.mjs
npm run build
npx cap sync android && cd android && ./gradlew assembleRelease
```
Expected: 체크 통과, 빌드 성공, 서명된 AAB/APK 생성

- [ ] **Step 5: 커밋**

```bash
git add CLAUDE.md CHANGELOG.md android/app/build.gradle
git commit -m "docs: v1.7.0 자동 활동 기록 문서 갱신 + 버전 올림"
```

- [ ] **Step 6: spike 브랜치 정리**

기술 검증이 끝나 본 구현에 반영되었으므로 임시 브랜치를 지운다:

```bash
git branch -D spike/usage-stats
```

---

## 배포 전 체크리스트 (구현 범위 밖, 사람이 수행)

- [ ] **스토어 등록정보에 기능 명시** — Play 정책상 권한은 "등록정보에 홍보된 핵심 기능에 필요"해야 한다. 앱 설명에 자동 활동 기록 기능을 적는다.
- [ ] **데이터 안전 섹션은 변경 불필요** — 기기 내 처리만 하므로 신고 대상이 아니다. 단, 이후 서버 전송을 추가하면 반드시 갱신해야 한다.
- [ ] **개인정보 처리방침 확인** — 현재 방침에 "서비스 이용 정보(활동 체크인 기록)"가 이미 있다. 자동 수집으로 방식이 바뀐 점을 반영할지 검토한다.
- [ ] **별건**: `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM`의 Play Console 선언이 완료되어 있는지 점검(기존부터 사용 중인 권한).
