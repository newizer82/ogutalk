# 오구톡 (OguTalk) — Claude Code 프로젝트 컨텍스트

> ⚡ Claude Code가 이 파일을 자동으로 읽습니다.
> 프로젝트 폴더 최상단(ogutalk/)에 반드시 두세요.
>
> 마지막 업데이트: 2026-10-09 (v1.13.2 — 공유·배너 문구를 성장·힐링으로 통일)

---

## 🎯 프로젝트 개요

**앱 이름**: 오구톡 (OguTalk)
**핵심 콘셉트**: 매시 **59분**에 짧은 "오구" 사운드와 함께 알림을 울려 시간 감각을 되찾게 해주는 앱
**타겟**: 스마트폰 사용 중에 시간 가는 줄 모르는 사람들
**수익 모델**: 프리미엄 구독 (월 2,900원) + 광고

---

## 📊 현재 진행 상태 (2026-04-28)

```
✅ Day 1   개발 환경 + Supabase DB + 인증 (2026-04-14)
✅ Day 2~7 React + PWA + Supabase 연동, 핵심 기능 구현
✅ 추가    Capacitor 안드로이드 빌드, 카카오 로그인
✅ 추가    커스텀 알람, 주간 리포트(템플릿), 백그라운드 알림
✅ 추가    자동 활동 기록 (UsageStats, 30분 슬롯, 기본 OFF) — v1.7.0
🟡 정리    몰입시간 알람 / 키워드 탭 / 죽은 코드 1차 정리 완료
⏳ 다음    LoginModal 분리, SettingsPage 분할, DB 정리
```

### 최근 정리 작업 (2026-04-28 세션)

```
1단계  몰입시간 알람 기능 통째 제거           -377줄
2단계  키워드 탭 통째 제거                    -1,681줄
3단계  홈 화면 슬림화 (스탯·빠른이동 제거)    -48줄
4단계  죽은 코드 17개 + voice 잔재 정리       -1,372줄
─────────────────────────────────────────────────────
원본 4,824줄 → 현재 3,501줄 (-27%)
파일 50개 → 33개, 탭 5개 → 4개, 훅 14개 → 8개
```

---

## 🛠️ 기술 스택

```
프런트엔드:  React + Vite (PWA)
모바일 빌드: Capacitor (Android)
백엔드:      Supabase (PostgreSQL, Auth, RLS)
인증:        이메일/비번 + 카카오 OAuth
배포:        Vercel (웹) / Capacitor (안드로이드 APK)
스타일:      인라인 CSS + theme.js 디자인 토큰
사운드:      Web Audio API (오실레이터로 직접 생성)
알림:        브라우저 Notification API + Capacitor Local Notifications
네이티브 플러그인: 커스텀 Capacitor 플러그인 (AudioFocus, UsageStats)
```

추후 연동 예정:
- Firebase FCM (원격 푸시)
- RevenueCat (결제)

---

## 🗄️ Supabase

> 실제 키는 `.env.local` 에. 아래는 구조만.

```
환경변수:
  VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### DB 테이블 (8개 — 정리 후 7개 활용)

```
public.profiles          - 사용자 프로필                 [사용]
public.alarm_settings    - 알람 시간대 (7~23시 기본)     [사용]
public.goals             - 연/월/주/일 목표              [사용]
public.todos             - 할일                          [사용]
public.notification_log  - 알림 기록 (체크인 저장)       [사용]
                           ※ 리포트는 서버+로컬을 mergeCheckins 로 합쳐 읽는다 (서버 저장 실패 대비)
public.economic_tips     - 경제 상식 (10건 입력됨)       [사용]
public.banners           - 홈 배너 (공개 읽기)           [사용, v1.13.0]
public.user_preferences  - 사용자 환경설정               [사용]
```

### 트리거

```
on_auth_user_created     - 가입 시 profiles + user_preferences + alarm_settings 자동 생성
set_*_updated_at         - updated_at 자동 갱신 (4개 테이블)
```

---

## 📁 현재 프로젝트 구조 (실제)

```
ogutalk/
├── CLAUDE.md                       ← 이 파일
├── PRD.md                          ← 제품 요구사항
├── STACK.md                        ← 기술 스택 상세
├── CHANGELOG.md                    ← 변경 이력
├── .env.local                      ← Supabase 키 (Git 제외)
├── .gitignore
├── index.html
├── vite.config.js                  ← PWA 설정
├── capacitor.config.ts             ← Capacitor (Android)
├── package.json
├── vercel.json
├── public/
│   ├── icon-192.png, icon-512.png
│   └── sounds/
├── android/                        ← Capacitor Android 프로젝트
├── supabase/                       ← Supabase migrations
├── src/
│   ├── main.jsx
│   ├── App.jsx                     ← 메인 (LoginModal 인라인, ~330줄)
│   ├── sw-custom.js                ← Service Worker
│   ├── lib/
│   │   ├── supabase.js
│   │   └── capacitor.js            ← 네이티브 알림 브리지
│   ├── hooks/                      (8개)
│   │   ├── useAuth.js              ← 로그인/회원가입/카카오
│   │   ├── useAlarm.js             ← 59분 알람 + 오구 사운드
│   │   ├── useTodos.js
│   │   ├── useGoals.js
│   │   ├── useCustomAlarms.js      ← 커스텀 시간 알람 (localStorage)
│   │   └── useWeeklyReport.js      ← 주간 리포트 (템플릿)
│   ├── components/
│   │   ├── alarm/
│   │   │   └── AlarmPopup.jsx
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx, SignupForm.jsx
│   │   ├── common/
│   │   │   ├── GlassCard.jsx, EmptyState.jsx
│   │   │   ├── LoadingSpinner.jsx, ProgressBar.jsx, Toggle.jsx
│   │   ├── layout/
│   │   │   ├── Layout.jsx, Header.jsx, TabBar.jsx (4탭)
│   │   └── todos/
│   │       └── TodoList.jsx, TodoForm.jsx, TodoItem.jsx
│   ├── pages/                      (6개)
│   │   ├── HomePage.jsx            ← 시계 / 카운트다운+타임라인 / 할일 / 명언
│   │   ├── TodosPage.jsx
│   │   ├── GoalsPage.jsx           ← (탭에서 빠짐, 코드는 보존)
│   │   ├── ReportsPage.jsx
│   │   ├── SettingsPage.jsx        ← ~460줄, 분리 후보
│   │   └── AuthCallbackPage.jsx    ← 카카오 OAuth 콜백
│   ├── data/
│   │   └── oguData.js              ← OGU_TONES, TONE_CONFIGS, ECONOMIC_TIPS, QUOTES
│   └── styles/
│       └── theme.js
└── reference/                      ← 참고 (빌드 제외)
```

---

## 🎨 디자인 시스템

화이트 테마. `src/styles/theme.js` 의 `theme` / `gradients` / `S` 객체 사용.
**알람 팝업(AlarmPopup.jsx)만 어두운 배경을 유지한다** — 밤 알람에 화면이 번쩍하면 안 되므로
일괄 색 변환에서도 이 파일은 제외했다. 색을 바꿀 때 같이 건드리지 말 것.

```javascript
const theme = {
  bg:     { primary: '#FFFFFF', elevated: '#F7F7F8' },
  accent: { primary: '#FF6B2C', secondary: '#D9531B' },  // secondary = 흰 바탕 위 글자용
  text:   { primary: '#111111', secondary: '#8E8E93', muted: '#9A9AA0', dim: '#B0B0B6' },
  status: { success: '#1E7A58', warning: '#B4740F', error: '#D23B2E' },
  border: { subtle: '#F0F0F3', normal: '#ECECEF' },
  night:  { scrim: 'rgba(26,18,12,0.92)', card: '#FFFCF8' },  // 알람 팝업 전용
}

// 그라데이션
로고·버튼: 'linear-gradient(135deg, #FF6B2C, #E8762C)'
배경:      '#FFFFFF' (그라데이션 없음 — 흰 바탕에 테두리로만 나눈다)
```

앱 최대 너비 420px, 모바일 우선.

---

## ⚡ 핵심 기능 (현재 활성)

### 1. 59분 알람 ⭐

```
- setTimeout 체인으로 다음 59분 시각 예약 (탭 복귀 시 재예약)
- 활성 시간대(alarmHours)일 때만 발동
- 오구 사운드: Web Audio API 오실레이터 (TONE_CONFIGS 5종)
- 진동: weak / medium / strong 패턴 선택
- 모드: 'sound' | 'vibrate' | 'both'
- 발동 시 알람 팝업: 명언 + 경제 상식 + 미완료 할일 수
- 네이티브: Capacitor Local Notifications 으로 백그라운드 알람
```

### 2. 커스텀 알람

```
- 사용자가 원하는 시간(시:분)에 매일 반복 알람
- localStorage 저장 (향후 Supabase 이전 가능)
- 프리셋 5종 (경제 브리핑/스트레칭/점심/오후 리셋/마무리)
```

### 3. 할일 (Todos)

```
- daily / weekly / monthly 타입
- 우선순위 (high/medium/low)
- due_date (D-day 표시)
- 비로그인: localStorage / 로그인: Supabase
```

### 4. 주간 리포트

```
- 템플릿 기반 자동 생성 (Claude API 미사용)
- 알람 횟수 / 할일 완료율 / 주간 활동 패턴
- 서버 함수(generate-weekly-report)는 src/ 를 import 못 해 그룹 매핑 사본(GROUP_OF)을 둔다 → 분류를 바꾸면 함께 수정 + 별도 배포
```

### 5. 알람 팝업 콘텐츠

```
명언       - QUOTES 하드코딩 (5건)
경제 상식  - TIPS 하드코딩 (3건) — economic_tips 테이블 활용으로 확장 가능
할일       - todos 테이블에서 미완료 카운트
```

### 6. 자동 활동 기록 (UsageStats, 기본 OFF)

```
- 안드로이드 UsageStats 권한으로 앱별 사용시간을 조회해 30분 슬롯(정각/30분) 단위로 체크인 자동 기록
- 기본값 OFF — 설정 > 자동 활동 기록에서 사용자가 직접 켜야 함 (Play 정책상 사전 고지 후 권한 이동)
- 앱 패키지 → 세부 분류: 사용자 수정 > 내장 매핑(BUILTIN_CATEGORY) > 안드로이드 OS 앱 분류(ApplicationInfo.category) 순, 셋 다 없으면 기록하지 않음
- 런처·시스템 UI·설정·공유 시트 등은 집계 출력 단계에서만 제외 (스캔에서 빼면 직전 앱 시간이 부풂)
- 분류가 틀리면 리포트 > "무엇이 생산으로 잡혔나" > 오늘 많이 쓴 앱 에서 고친다(ogu_app_category)
  (v1.10.1: 알람 팝업의 "다르게 기록" 은 제거 — 알람 순간에 고르게 하는 것이 부담이었다)
- 소급 기록은 앱 복귀·알람 발동 시점에 실행 (useAutoCheckin), 최대 24시간(48슬롯) 상한
- 권한 미허용/미지원(iOS·웹) 시 기존 수동 체크인 그대로 동작
- 사용시간 데이터는 기기 내에서만 처리되며 서버로 전송하지 않음
```

### 7. 활동 분류 (src/data/appCategories.js)

```
그룹 4개 (수동 팝업 선택지 + 리포트 헤드라인)
  🌱 성장  업무(문서·시트·메일) · 학습 · AI · 촬영·제작 · 구매·주문·예약 · 건강·운동
  💬 소통  메신저(전화·문자 포함) · SNS
  🌿 힐링  동영상 · 게임 · 검색·정보(NAVER·Google·Chrome)
  🧭 생활  금융·투자 · 생활·이동
- 기준: 성장 = 만들거나 끝낸 행위(운동 포함), 힐링 = 보고 읽으며 쉰 시간
- 힐링은 나쁜 시간이 아니다 — 꾸짖는 문구를 쓰지 말 것 (한도를 넘을 때만 알린다)
- activity_type 한 칸에 그룹 ID·세부 ID 모두 저장, 리포트는 groupOf() 로 묶음 (DB 변경 없음)
- 옛 값(goal_work·study→생산, rest→생활, sns→소통)은 LEGACY 로 계속 표시
- 옛 4분류 팝업에서 저장된 앱 수정값(goal_work 등)은 무시 — 새 기준을 덮지 않게
- 수동 팝업은 그룹 4개만, 안 고르고 닫으면 기록 없음 (폰을 안 쓴 시간)
- BUILTIN_CATEGORY 187개 (v1.9.1) — 미분류 앱은 아예 기록되지 않으므로, 누락은 곧 점수 왜곡이다.
  새 분류를 추가하면 generate-weekly-report 의 GROUP_OF 사본도 함께 고칠 것
```

### 8. 59분 코치 (v1.8.0, src/lib/alarmContext.js)

```
팝업이 상태를 판정해 문구와 제안을 바꾼다 (순수 로직 — node 검증 대상)
  binge  소비 앱 40분↑ 또는 소비 기록 2슬롯 연속 → 경고 문구 + 할일 1개 제안
  focus  생산이 이어짐 → 칭찬 문구, 할일 제안·미완료 수 숨김 (알람의 최대 불만이 "집중을 깬다")
  normal 기본 문구 + 할일 1개 제안
- "지금 하나만": pickNextTodo = 마감 지남 > 마감 가까움 > 우선순위 > 먼저 만든 것
  탭 1회로 완료하고 팝업을 닫는다 (앱 화면으로 이동 금지 — 1분 개입 유지)
- 오늘 누적: minutesOf() = 자동 기록(:00/:30) 30분, 수동 체크인 60분으로 추정
  ponytail: 레코드에 source 컬럼이 없어 분 단위로 추정 — 정확도가 필요해지면 컬럼 추가
- 측정 이벤트: todo_done_from_popup
- 네이티브 제약: 시스템 알림이 미리 예약돼 있어 "집중 중엔 소리 줄이기"는 불가 (문구만 조정)
```

### 9. 오구 지수 — 5 : 9 (v1.11.0, src/lib/oguScore.js · dayLog.js)

```
하루 점수 0~100, 앱 이름(매시 59분) 그대로의 구조
  9 (50) 폰으로 한 생산 활동 9분류
         시간 35 = (9분류 합 + 그룹으로만 기록된 수동 체크인) / produceTarget
         다양성 15 = 채운 칸 수 / 4
         소비 감점 = 한도 초과 30분당 -5, 최대 -10
         NINE 에서 SNS 제외 (켜는 것만으로 다양성이 오르면 안 된다)
  5 (50) 미션 1개 / 미션 완주 / 내 할일 / 이번 주 목표 / 알람 응답, 각 10
- 설계 원칙: 잰 것만 점수로 / 폰 안 쓴 시간은 감점 아님 / 기준은 사용자 것 / 비교는 어제의 나뿐
- dayLog.js(ogu_day_log): 앱이 직접 본 행동만 집계 (todos 에 완료 시각이 없다)
- 점수 저장은 21시 이후에만, 스트릭은 60점 이상 연속 일수
- 근거 화면(ScoreBasisModal): 분류별 시간 + "오늘 많이 쓴 앱" 에서 분류 수정
```

### 10. 캘린더 연동 (v1.10.0, 기본 OFF)

```
오구톡 할일에는 시각·장소가 없다 → 캘린더가 그 빈칸을 메운다.
- CalendarPlugin(네이티브): CalendarContract.Instances 로 [start,end] 구간 조회
  Events 가 아니라 Instances 인 이유는 반복 일정의 회차를 펼쳐 받기 위함
- src/lib/calendar.js: usageStats.js 와 같은 규칙 — registerPlugin Proxy 를 async 밖으로 내보내지 않는다
- pickUpcomingEvent(): 진행 중 > 90분 내 시작 순, 종일 일정 제외
- 팝업이 열릴 때만 1회 조회 (매 렌더 조회 금지 — 배터리·권한 노출 최소화)
- READ_CALENDAR 는 실행 중 요청 권한. 사전 고지 모달 → 허용 → calendarSync=true
- 일정 내용은 저장하지 않고 화면에만 쓴다. 서버 전송 없음 (처리방침에 명시)
- 측정 이벤트: calendar_connected
```

### 11. 오늘의 미션 (v1.11.0)

```
src/data/missions.js (60개) + missionPick.js(순수) + missionStore.js(localStorage)
- 몸·정리·머리에서 하나씩 = 3개. 무작위 3개면 머리 쓰는 일만 셋이 걸려 질린다.
- 같은 날이면 몇 번을 계산해도 같은 결과 — 날짜를 씨앗으로 쓴다(렌더마다 바뀌면 안 된다)
- recent 14일 제외 / skips 3회 제외 / 셔플 하루 1회(salt=1)
- 풀이 마르면 조건을 풀어서라도 3개를 채운다 (빈칸보다 낫다)
- 미션은 todos 에 넣지 않는다 — 매일 3개씩 쌓이면 내 할일 목록과 완료율이 오염된다
- 생애주기(lifeStage)는 선택. 성별 분리는 하지 않는다.
- 노출: 홈(접기 가능) + 할일 탭 + 알람("지금 하나만" 이 할일 없을 때 미션으로 폴백)
- 첫 알람 안내는 claimFirstAlarm() — "묻는 순간 소모되는" 함수다.
  useMemo 안에서 부르면 리렌더 때 두 번째 호출이 false 를 받아 안내가 사라진다 → useEffect 에서만 부를 것
```

### 12. 홈 배너 (v1.13.0)

```
src/data/banners.js(내장 기본) + bannerPick.js(순수) + BannerCarousel.jsx
- 자리는 홈에 하나뿐 — 알람 앱의 홈이 광고판이 되면 "지금 하나만"이 가려진다
- 외부 광고는 넣지 않는다 (AdMob 배너와 별개. 이 자리는 오구톡 자체 소식 전용)
- 최대 4장, 이벤트는 동시에 한 장만, ends_at 지나면 자동 소멸
- Supabase banners 테이블 → 실패/미생성 시 DEFAULT_BANNERS 로 폴백 (홈이 비지 않게)
- 자동 전환 5초, 터치 중 정지, prefers-reduced-motion 이면 정지
- 테이블은 공개 읽기(RLS SELECT true) — 비로그인 사용자도 본다. 쓰기는 대시보드에서만
```

---

## ❌ 제거된 기능 (이전엔 있었지만 지금은 없음)

```
- 몰입시간 측정 / 30·60분 경고 알람
  → 앱이 켜진 시간을 셀 뿐 실제 폰 사용을 측정 못해서 제거

- 키워드 탭 (트렌딩 분석, 내 키워드)
  → KeywordsPage / KeywordList / KeywordNews / useKeywords /
    useNaverNews / useTrendingData 모두 삭제

- 음성 안내 (캐릭터별 TTS)
  → VOICE_CHARACTERS / VOICE_TEXTS / speakTime() 제거

- 미사용 컴포넌트 11개 / 미사용 훅 4개
  → StatusCards, Clock, AlarmSettings(짝꿍), ContentSettings,
    ProfileSettings, GoalCard/List/Form/Progress, OguCheckin 등
```

---

## 🔑 코딩 컨벤션

```javascript
// 파일명: PascalCase (컴포넌트) / camelCase (훅, 유틸)
// 훅: use로 시작
// 스타일: 인라인 JS 객체 또는 theme.js 의 S
// 에러 처리: try/catch + 사용자 친화 메시지
// Supabase: 항상 error 체크

const { data, error } = await supabase.from('todos').select('*')
if (error) {
  console.error('할일 로딩 실패:', error)
  setErrorMsg('데이터를 불러오지 못했어요.')
  return
}
```

---

## 🧠 상태 관리

App.jsx 가 사실상 전역 상태 컨테이너입니다.

```
localStorage 키 (현재 6개 — 통합 후보):
  ogu_oguTone, ogu_oguRepeat, ogu_alarmMode,
  ogu_volume, ogu_vibStrength, ogu_alarmHours

추가 키:
  ogu_customAlarms (커스텀 알람 목록)
  ogu_app_category (자동 활동 기록 — 앱→카테고리 사용자 수정 학습)

설정 값 (settings.js, autoCheckin 기본 false):
  autoCheckin (자동 활동 기록 on/off), lastBackfillAt (마지막 소급 기록 시각)
  calendarSync (캘린더 연동 on/off), produceTarget·consumeLimit (오구 지수 목표)

서버 상태:
  user (Supabase Auth) → todos, goals 가 자동으로 user_id 분기
  비로그인 시 localTodos / localGoals 로 fallback
```

---

## ⚠️ 주의사항

```
1. .env.local 절대 Git 커밋 금지 (.gitignore 에 포함됨)
2. Supabase service_role key 프런트엔드 사용 금지 (anon key만 사용)
3. RLS 활성화로 anon key 노출 OK
4. 앱 최대 너비 420px, 모바일 우선
5. 화이트 테마 고정 (다크 모드 미지원). 알람 팝업만 예외로 어두운 배경
6. localStorage 키 prefix 는 'ogu_' 통일
7. 모든 src 파일 끝에 NULL 바이트 패딩이 붙기 쉬움 (윈도우↔리눅스 마운트)
   → 빌드 실패 시 `tr -d '\000'` 로 정리 필요
8. 안드로이드 릴리즈 빌드는 JDK 21로 해야 함 — Gradle 8.14.3은 JDK 25에서 실행 불가
   (`Unsupported class file major version 69`). Android Studio 번들 JBR이 25로 올라가 있으면
   그대로 못 씀 → `JAVA_HOME` 을 JDK 21로 지정(이 머신은 `~/.jdks/jbr-21.0.11`) 하거나
   Android Studio의 Gradle JDK 설정을 21로 맞출 것
```

---

## 🚧 다음 작업 후보 (정리 단계)

```
[6] App.jsx 에 인라인된 LoginModal 분리 (~100줄 → 별도 파일)
[8] SettingsPage.jsx 524줄 분할 (사운드/알람시간/커스텀알람/계정 등)

완료됨: [5] localStorage 통합(src/lib/settings.js) · [7] tracked_keywords 테이블 제거 · [9] reference/ 폴더 정리 