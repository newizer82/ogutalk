# 오구톡 (OguTalk) — Claude Code 프로젝트 컨텍스트

> ⚡ Claude Code가 이 파일을 자동으로 읽습니다.
> 프로젝트 폴더 최상단(ogutalk/)에 이 파일을 반드시 넣어두세요.

---

## 🎯 프로젝트 개요

**앱 이름**: 오구톡 (OguTalk)  
**핵심 콘셉트**: 매시 **59분**에 짧은 "오구" 사운드와 함께 알림을 울려서, 스마트폰 과몰입을 방지하고 시간 감각을 되찾게 해주는 앱  
**타겟**: 스마트폰에 몰입해서 시간 감각을 잃는 사람들  
**수익 모델**: 프리미엄 구독 (월 2,900원) + 광고

---

## 📊 현재 진행 상태

```
✅ Day 1 완료 (2026-04-14)
   ✅ 개발 환경 세팅 (Node.js v22.15.0, VS Code 1.115.0, Git)
   ✅ Supabase 프로젝트 생성 (ogutalk, Seoul 리전)
   ✅ DB 테이블 8개 생성 완료
   ✅ RLS 보안 정책 설정 완료
   ✅ 트리거 5개 생성 완료 (handle_new_user 등)
   ✅ 경제 상식 초기 데이터 10개 입력
   ✅ 테스트 유저 생성 확인 (test@example.com)
   ✅ Supabase API 키 확인 완료

🔄 Day 2 진행 중 (React 프로젝트 + Supabase 연결 + 로그인)
⏳ Day 3~7 예정
```

---

## 🛠️ 기술 스택

```
프런트엔드:  React + Vite (PWA)
백엔드:      Supabase (PostgreSQL, Auth, Edge Functions)
푸시 알림:   Firebase FCM (추후 연동)
결제:        Revenue Cat (추후 연동)
배포:        Vercel (무료)
스타일:      인라인 CSS (Tailwind 추후 고려)
```

---

## 🗄️ Supabase 설정 정보

> ⚠️ 실제 키는 .env.local 파일에 저장. 아래는 구조만 표시.

```
프로젝트명: ogutalk
리전: Northeast Asia (Seoul 또는 Tokyo)

환경변수 (.env.local):
  VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### DB 테이블 목록 (8개)

```
public.profiles          - 사용자 프로필
public.alarm_settings    - 알람 시간 설정 (7~23시 기본 생성)
public.goals             - 연/월/주/일 목표관리
public.todos             - 할일 목록
public.tracked_keywords  - 관심 키워드 (테슬라, 삼성전자 등)
public.notification_log  - 알림 기록
public.economic_tips     - 경제 상식 (공유 콘텐츠, 10개 입력됨)
public.user_preferences  - 사용자 환경설정
```

### 주요 트리거

```
on_auth_user_created     - 가입 시 profiles + user_preferences + alarm_settings 자동 생성
set_profiles_updated_at  - updated_at 자동 갱신
set_goals_updated_at
set_todos_updated_at
set_prefs_updated_at
```

---

## 📁 프로젝트 폴더 구조 (목표)

```
ogutalk/
├── CLAUDE.md                  ← 이 파일 (Claude Code 컨텍스트)
├── .env.local                 ← Supabase 키 (Git 제외!)
├── .gitignore
├── index.html
├── vite.config.js             ← PWA 설정 포함
├── package.json
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── sounds/
├── src/
│   ├── main.jsx
│   ├── App.jsx                ← 라우팅, 인증 상태
│   ├── lib/
│   │   └── supabase.js        ← Supabase 클라이언트
│   ├── hooks/
│   │   ├── useAuth.js         ← 로그인/회원가입/로그아웃
│   │   ├── useAlarm.js        ← 59분 알람 로직 + 오구 사운드
│   │   ├── useTodos.js        ← 할일 CRUD
│   │   ├── useGoals.js        ← 목표 CRUD
│   │   └── useKeywords.js     ← 키워드 관리
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx
│   │   │   └── SignupForm.jsx
│   │   ├── layout/
│   │   │   ├── Layout.jsx
│   │   │   ├── Header.jsx
│   │   │   └── TabBar.jsx
│   │   ├── home/
│   │   │   ├── Clock.jsx
│   │   │   ├── StatusCards.jsx
│   │   │   └── ContentPreview.jsx
│   │   ├── alarm/
│   │   │   └── AlarmPopup.jsx
│   │   ├── goals/
│   │   │   ├── GoalList.jsx
│   │   │   ├── GoalForm.jsx
│   │   │   └── GoalProgress.jsx
│   │   ├── todos/
│   │   │   ├── TodoList.jsx
│   │   │   ├── TodoForm.jsx
│   │   │   └── TodoItem.jsx
│   │   ├── keywords/
│   │   │   ├── KeywordList.jsx
│   │   │   └── KeywordNews.jsx
│   │   └── settings/
│   │       ├── AlarmSettings.jsx
│   │       ├── ContentSettings.jsx
│   │       └── ProfileSettings.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── GoalsPage.jsx
│   │   ├── TodosPage.jsx
│   │   ├── KeywordsPage.jsx
│   │   └── SettingsPage.jsx
│   └── styles/
│       └── theme.js           ← 색상, 폰트 등 디자인 토큰
└── reference/                 ← 참고 파일 (빌드 제외)
    ├── ogutalk-v2.jsx         ← 완성된 프로토타입 (UI 참고용)
    ├── ogutalk-supabase-architecture.md
    └── ogutalk-7day-sprint.md
```

---

## 🎨 디자인 시스템

```javascript
// 핵심 색상 (다크 테마)
const theme = {
  bg: {
    primary: '#0f172a',    // 메인 배경
    secondary: '#1e293b',  // 카드 배경
    elevated: '#334155',   // 활성 요소
  },
  accent: {
    primary: '#6366f1',    // 인디고 (메인 포인트)
    secondary: '#818cf8',  // 연한 인디고
    purple: '#8b5cf6',     // 퍼플 (그라데이션)
  },
  text: {
    primary: '#e2e8f0',    // 주요 텍스트
    secondary: '#94a3b8',  // 보조 텍스트
    muted: '#64748b',      // 흐린 텍스트
  },
  status: {
    success: '#34d399',    // 완료/성공
    warning: '#f59e0b',    // 주의
    error: '#ef4444',      // 에러/삭제
  }
}

// 그라데이션 배경
background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'

// 로고 텍스트 그라데이션
background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)'

// 주요 버튼
background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
```

---

## ⚡ 핵심 기능 명세

### 1. 59분 알람 (핵심!)

```javascript
// 매초 확인 → 59분 0초에 발동
// 오구 사운드: Web Audio API (0.5초, C5→E5 두 음)
// 브라우저 Notification API로 푸시
// 알람 팝업: 명언 + 경제상식 + 미완료 할일 수 표시
// 발동 후 immersionMinutes 초기화
```

### 2. 목표 계층 구조

```
연간 목표 (yearly)
  └── 월간 목표 (monthly)  [parent_goal_id → yearly.id]
        └── 주간 목표 (weekly)  [parent_goal_id → monthly.id]
              └── 일간 목표 (daily)  [parent_goal_id → weekly.id]
```

### 3. 스케줄 알림 (Edge Functions으로 구현 예정)

```
07:10  해외 주식 요약 (Alpha Vantage API)
07:20  오늘의 할일 알림
22:00  업무 요약 + 내일 계획 (Claude API)
매시   키워드 뉴스 갱신 (Naver 검색 API)
```

### 4. 콘텐츠 카드 (알람 시 랜덤 표시)

```
날씨       - OpenWeatherMap API (추후)
경제/주식  - Alpha Vantage API (추후)
명언       - 하드코딩 배열 (MVP)
할일       - Supabase todos 테이블
경제 상식  - Supabase economic_tips 테이블 (10개 입력됨)
```

---

## 📋 Day별 작업 목록

### ✅ Day 1 (완료)
- 개발환경, Supabase DB, 인증 설정

### 🔄 Day 2 (진행 중)
```
□ npm create vite@latest ogutalk -- --template react
□ 의존성 설치: @supabase/supabase-js, lucide-react, date-fns
□ PWA 플러그인 설치: vite-plugin-pwa
□ .env.local 생성 (Supabase URL + Key)
□ src/lib/supabase.js 작성
□ src/hooks/useAuth.js 작성
□ LoginForm.jsx + SignupForm.jsx 작성
□ App.jsx 라우팅 설정
□ 실제 회원가입 → 로그인 테스트
□ Supabase dashboard에서 유저 생성 확인
```

### ⏳ Day 3
```
□ Layout.jsx, Header.jsx, TabBar.jsx (하단 5탭)
□ Clock.jsx (실시간 시계)
□ StatusCards.jsx (다음알람, 몰입시간, 알람횟수)
□ useTodos.js (Supabase CRUD)
□ TodoList + TodoForm + TodoItem
```

### ⏳ Day 4
```
□ useGoals.js
□ GoalsPage (연/월/주/일 탭)
□ GoalProgress (진행률 바)
□ useAlarm.js (59분 타이머 + 오구 사운드)
□ AlarmPopup.jsx
□ 브라우저 Notification 권한 요청
```

### ⏳ Day 5
```
□ useKeywords.js
□ KeywordList + KeywordNews
□ 경제 상식 카드
□ AlarmSettings (시간대 토글)
□ ContentSettings (콘텐츠 선택)
```

### ⏳ Day 6
```
□ vite-plugin-pwa 설정
□ 앱 아이콘 (512x512, 192x192)
□ 로딩/빈상태/에러 UI
□ 애니메이션 polish
□ npm run build 성공 확인
```

### ⏳ Day 7
```
□ GitHub push
□ Vercel 배포
□ PWA 핸드폰 설치
□ 전체 기능 테스트
□ 피드백 수집
```

---

## 🔑 코딩 컨벤션

```javascript
// 파일명: PascalCase (컴포넌트), camelCase (훅/유틸)
// 훅: use로 시작 (useAuth, useTodos...)
// 스타일: 인라인 JS 객체 (styles.xxx 패턴)
// 에러 처리: try/catch + 사용자 친화적 메시지
// Supabase 쿼리: 항상 error 체크

// 예시 패턴
const { data, error } = await supabase.from('todos').select('*')
if (error) {
  console.error('할일 로딩 실패:', error)
  setErrorMsg('데이터를 불러오지 못했어요. 다시 시도해주세요.')
  return
}
```

---

## ⚠️ 주의사항

```
1. .env.local 은 절대 Git에 커밋하지 말 것 (.gitignore에 포함)
2. Supabase service_role key는 절대 프런트엔드에 사용 금지
3. RLS가 설정되어 있어 anon key는 안전함
4. 앱 최대 너비: 420px (모바일 우선)
5. 다크 테마 고정 (라이트 모드는 v2에서 추가 예정)
```

---

## 📞 Cowork와 역할 분담

```
Claude Code (코딩 작업):
  ✅ 파일 생성 및 편집
  ✅ npm 명령어 실행
  ✅ 버그 수정 및 디버깅
  ✅ Git 커밋/푸시
  ✅ 테스트 실행

Cowork (기획/설계 작업):
  ✅ 새 기능 아이디어 정리
  ✅ 아키텍처 설계 문서
  ✅ 사업 계획서, PPT 작성
  ✅ API 연동 방법 조사
  ✅ Google Calendar 일정 관리
  ✅ 개념 설명 및 학습
```

---

## 🚀 Claude Code 시작 명령어 (복사해서 사용)

```
이 프로젝트는 오구톡 알람 앱입니다.
CLAUDE.md를 읽고 현재 상태를 파악해주세요.
오늘은 Day 2 작업을 진행합니다:
React 프로젝트 생성 → Supabase 연결 → 로그인/회원가입 구현.
내 Supabase URL과 Key는 .env.local에 넣을 예정입니다.
작업 시작해주세요.
```
