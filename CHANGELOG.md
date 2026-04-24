# CHANGELOG — 오구톡

모든 주요 변경 이력을 기록합니다. 날짜는 커밋 시각 기준(KST)입니다.

---

## [0.7.0] — 2026-04-25

### Added
- **주간 리포트 자동 생성** — Claude API 활용
  - `supabase/functions/generate-weekly-report/index.ts` Edge Function 작성
  - 지난 주 할일·체크인·목표 데이터를 수집해 Claude Sonnet에게 전달
  - Claude가 하이라이트·이번 주 이야기·다음 주 제안을 한국어로 생성
  - JSON 파싱 안전 처리 (정규식 추출)로 응답 오류 방어
- **`useWeeklyReport` 훅** (`src/hooks/useWeeklyReport.js`)
  - `fetchReports` — 최근 10주 리포트 조회
  - `generateReport` — Edge Function 호출 + 결과 자동 갱신
  - `error` state로 친절한 오류 메시지 표시
- **`ReportsPage` 컴포넌트** (`src/pages/ReportsPage.jsx`)
  - 주차별 탭 전환, 완료율·할일 수 StatBox 카드
  - 활동 시간 분석 바 차트 (goal_work / study / sns / rest)
  - 하이라이트·이야기·제안 카드, 수동 생성 버튼
- **TabBar에 📊 리포트 탭 추가** (키워드 탭 대체)
- **`weekly_reports` 테이블** (`supabase/migrations/v0.7.0_weekly_reports.sql`)
  - RLS 정책 3개 (SELECT / INSERT / UPDATE)
  - UNIQUE(user_id, year, week_number)로 중복 방지 + upsert 지원

### 배포 순서
1. Supabase SQL Editor → `v0.7.0_weekly_reports.sql` 실행
2. Anthropic Console에서 API 키 발급 → Supabase Edge Function Secrets에 `ANTHROPIC_API_KEY` 등록
3. `npx supabase functions deploy generate-weekly-report` 실행
4. `git add . && git commit -m "feat: v0.7.0 주간 리포트" && git push`

---

## [0.6.0] — 2026-04-24

### Added
- **홈 화면 "오늘의 기여" 카드** (`src/pages/HomePage.jsx`)
  - mock 데이터 제거 → `todos` props 기반 실시간 계산
  - 오늘 완료된 목표 연결 할일 수 + 기여한 목표 수를 숫자 카드로 표시
  - 2칸 그리드 레이아웃, 인디고·퍼플 그라데이션 스타일
- **알람 체크인 UI** (`src/components/alarm/AlarmPopup.jsx`)
  - 알람 팝업 하단에 "이번 시간 뭐 하셨어요?" 섹션 추가
  - 4개 선택지: 🎯 목표 할일 / 📚 공부·업무 / 📱 SNS·유튜브 / 😴 휴식·식사
  - 선택 시 색상 하이라이트 + "✓ 체크인 완료" 메시지 → 1.2초 후 자동 닫기
- **체크인 데이터 저장** (`src/hooks/useAlarm.js`, `src/App.jsx`)
  - `useAlarm`에 `userId` 파라미터 추가, `saveCheckin(activityType)` 함수 구현
  - `notification_log` 테이블에 `alarm_hour` + `activity_type` 저장 (Supabase)
  - `App.jsx` → `AlarmPopup`의 `onCheckin` prop으로 연결 완료

### DB 마이그레이션 필요
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE notification_log
ADD COLUMN IF NOT EXISTS activity_type TEXT;

COMMENT ON COLUMN notification_log.activity_type IS
'goal_work | study | sns | rest';
```

---

## [0.5.0] — 2026-04-24

### Added
- **알람 정확도 개선**: `setInterval` → `setTimeout` 체인 방식으로 변경, `visibilitychange` 탭 복귀 시 재예약
- **목표 ↔ 할일 연결**: 할일 추가 시 목표 선택 드롭다운, 완료 시 `syncGoalProgress`로 진행률 자동 업데이트

---

## [0.4.0] — 2026-04-22

### Added
- **네이버 데이터랩 실시간 트렌드 연동** (`supabase/functions/naver-datalab`)
  - 경제·AI·사회·글로벌 4개 카테고리 × 주간(14일)·월간(60일) 2기간을 8개 병렬 요청으로 처리
  - 일별 데이터 포인트를 전반/후반으로 분할해 트렌드 % 자동 계산
  - `--no-verify-jwt` 플래그로 공개 배포
- **`useTrendingData` hook** (`src/hooks/useTrendingData.js`)
  - 앱 로드 시 mock 데이터 즉시 표시 → 실시간 데이터 수신 시 교체
  - `isLive` 플래그와 `updatedAt` 타임스탬프 노출
- **트렌딩 탭 실시간 배지**: `📡 실시간 · HH:MM 업데이트` 표시, 로딩 중 스피너 문구

---

## [0.3.0] — 2026-04-22

### Added
- **네이버 뉴스 API 실시간 연동** (`supabase/functions/naver-news`)
  - Deno Edge Function으로 CORS 우회 프록시 구현
  - 요청/응답 로깅, 에러 상세 반환
  - `--no-verify-jwt` 플래그로 공개 배포
- **`useNaverNews` hook** (`src/hooks/useNaverNews.js`)
  - `supabase.functions.invoke`로 Edge Function 호출
  - FunctionsHttpError 본문 파싱해 상세 에러 메시지 표시
- **키워드 탭 뉴스 뷰**: 키워드 클릭 → 네이버 뉴스 실시간 결과 (`NaverNewsDetail`, `NaverNewsItem`)
  - HTML 태그 제거(`stripHtml`), 도메인 추출(`extractDomain`), 날짜 포맷(`formatPubDate`)
- **카카오 OAuth**: `supabase.auth.signInWithOAuth({ provider: 'kakao' })` 연동
- **`AuthCallbackPage`** (`src/pages/AuthCallbackPage.jsx`): PKCE `?code=` 교환 처리

### Fixed
- `App.jsx` `handleSubmit`: `signIn()`이 throw하는 방식인데 `{ error }` 구조분해로 받던 버그 수정 → try/catch 패턴으로 변경
- `.gitignore`에 `supabase/.temp/`, `*.txt` 추가, 기존 캐시된 파일 git index에서 제거

---

## [0.2.0] — 2026-04-20

### Added
- **글래스모피즘 UI 전면 적용** (v3 데모 이식)
  - `GlassCard`, `Toggle`, `ProgressBar`, `LoadingSpinner`, `EmptyState` 공통 컴포넌트
  - 다크 테마 인디고 그라데이션 디자인 시스템 (`src/styles/theme.js`)
- **5탭 레이아웃**: 홈·할일·목표·키워드·설정 (`Layout`, `Header`, `TabBar`)
- **홈 화면**: 실시간 시계(`Clock`), 상태 카드(`StatusCards` — 다음 알람·몰입 시간·알람 횟수), 오구 체크인(`OguCheckin`)
- **할일 페이지** (`TodosPage`): Supabase `todos` CRUD, `useTodos` hook
- **목표 페이지** (`GoalsPage`): 연/월/주/일 계층 탭, `GoalCard`, `GoalProgress`, `useGoals` hook
- **키워드 페이지** (`KeywordsPage`): 트렌딩 분석 탭(mock 데이터), 내 키워드 탭, 프리미엄 잠금
- **설정 페이지** (`SettingsPage`): 알람 시간 설정, 사운드 설정, 프로필, 콘텐츠 설정
- **알람 시스템** (`useAlarm`): 매시 59분 Web Audio API 사운드 + 브라우저 Notification
- **알람 팝업** (`AlarmPopup`, `ImmersionPopup`): 명언·경제상식·할일 수 표시
- **경제 상식** (`useEconomicTips`): Supabase `economic_tips` 랜덤 표시
- **PWA 설정** (`vite.config.js`): manifest, Workbox NetworkFirst 캐시 전략

---

## [0.1.1] — 2026-04-18

### Fixed
- `goals`/`todos` INSERT 시 `user_id` 누락으로 RLS 위반하던 버그 수정
- `OguCheckin` 컴포넌트 추가 (홈 화면 체크인 UI)
- `GoalCard` 컴포넌트 분리

---

## [0.1.0] — 2026-04-15

### Added
- 홈 화면에 할일·목표 요약 카드 추가
- 훅 데이터 로딩 안정성 개선 (race condition, cleanup)

---

## [0.0.1] — 2026-04-14

### Added
- **Initial commit**: 오구톡 MVP 기반 구축
  - Supabase 프로젝트 생성 (ogutalk, Seoul 리전)
  - DB 테이블 8개, RLS 정책, 트리거 5개 (`on_auth_user_created` 등)
  - 경제 상식 초기 데이터 10개 입력
  - React + Vite 프로젝트 초기화
  - `@supabase/supabase-js` 연결 (`src/lib/supabase.js`)
  - `useAuth` hook (이메일 로그인·회원가입·로그아웃)
  - `LoginForm`, `SignupForm` 컴포넌트
  - `App.jsx` 인증 상태 기반 라우팅 기초
