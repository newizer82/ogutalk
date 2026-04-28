# 오구톡 (OguTalk) — Claude Code 프로젝트 컨텍스트

> ⚡ Claude Code가 이 파일을 자동으로 읽습니다.
> 프로젝트 폴더 최상단(ogutalk/)에 반드시 두세요.
>
> 마지막 업데이트: 2026-04-28 (대규모 정리 후)

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
🟡 정리    몰입시간 알람 / 키워드 탭 / 죽은 코드 1차 정리 완료
⏳ 다음    localStorage 통합, LoginModal 분리, DB 정리
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
public.economic_tips     - 경제 상식 (10건 입력됨)       [사용]
public.user_preferences  - 사용자 환경설정               [사용]

public.tracked_keywords  - 키워드                        [⚠️ 미사용 — 추후 마이그레이션 예정]
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

다크 테마 고정. `src/styles/theme.js` 의 `theme` / `gradients` / `S` 객체 사용.

```javascript
const theme = {
  bg:     { primary: '#0f172a', secondary: '#1e293b', elevated: '#334155' },
  accent: { primary: '#6366f1', secondary: '#818cf8', purple: '#8b5cf6' },
  text:   { primary: '#e2e8f0', secondary: '#94a3b8', muted: '#64748b' },
  status: { success: '#34d399', warning: '#f59e0b', error: '#ef4444' },
}

// 그라데이션
배경:    'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
로고:    'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)'
주요버튼: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
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
```

### 5. 알람 팝업 콘텐츠

```
명언       - QUOTES 하드코딩 (5건)
경제 상식  - TIPS 하드코딩 (3건) — economic_tips 테이블 활용으로 확장 가능
할일       - todos 테이블에서 미완료 카운트
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
5. 다크 테마 고정 (라이트 모드 미지원)
6. localStorage 키 prefix 는 'ogu_' 통일
7. 모든 src 파일 끝에 NULL 바이트 패딩이 붙기 쉬움 (윈도우↔리눅스 마운트)
   → 빌드 실패 시 `tr -d '\000'` 로 정리 필요
```

---

## 🚧 다음 작업 후보 (정리 단계)

```
[5] localStorage 6개 키 → 단일 settings 객체로 통합
[6] App.jsx 에 인라인된 LoginModal 분리 (~100줄 → 별도 파일)
[7] DB의 tracked_keywords 테이블 마이그레이션으로 제거
[8] SettingsPage.jsx 460줄 분할 (사운드/알람시간/커스텀알람/계정 등)
[9] reference/ 폴더의 미사용 자료 