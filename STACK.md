# STACK — 오구톡 기술 스택

## 런타임 & 도구

| 항목 | 버전 / 내용 |
|---|---|
| Node.js | v22.15.0 |
| 패키지 매니저 | npm (package-lock.json) |
| 번들러 | Vite 5.4.2 |
| 언어 | JavaScript (ESM), JSX |

## 프런트엔드

| 패키지 | 버전 | 용도 |
|---|---|---|
| react | ^18.3.1 | UI 렌더링 |
| react-dom | ^18.3.1 | DOM 마운트 |
| lucide-react | ^1.8.0 | 아이콘 |
| date-fns | ^4.1.0 | 날짜 포맷 |
| @vitejs/plugin-react | ^4.3.1 | Vite React 플러그인 (Babel) |
| vite-plugin-pwa | ^0.20.5 | PWA manifest + Workbox SW 생성 |

**스타일**: 인라인 CSS JS 객체 (`src/styles/theme.js` 디자인 토큰), 외부 CSS 프레임워크 미사용

**라우팅**: 커스텀 (pathname 분기, `window.location`) — React Router 미사용

## 백엔드 & 데이터

| 항목 | 버전 / 내용 |
|---|---|
| @supabase/supabase-js | ^2.103.0 |
| Supabase Auth | 이메일/비밀번호 + 카카오 OAuth (PKCE) |
| Supabase PostgreSQL | 테이블 8개, RLS 정책, 트리거 5개 |
| Supabase Edge Functions | Deno 런타임 (std@0.168.0) |

### DB 테이블

```
profiles          — 사용자 프로필
alarm_settings    — 알람 시간 설정
goals             — 목표 (연/월/주/일 계층)
todos             — 할일 목록
tracked_keywords  — 관심 키워드
notification_log  — 알림 기록
economic_tips     — 경제 상식 (공유 콘텐츠)
user_preferences  — 사용자 환경설정
```

### Edge Functions

| 함수명 | 설명 |
|---|---|
| `naver-news` | 네이버 뉴스 검색 API 프록시 (CORS 우회) |
| `naver-datalab` | 네이버 데이터랩 검색어 트렌드 (4카테고리 × 2기간, 8 병렬 요청) |

## 외부 API

| API | 용도 | 인증 방식 |
|---|---|---|
| 네이버 검색 API | 뉴스 실시간 검색 | Client ID + Secret (Edge Function 환경변수) |
| 네이버 데이터랩 | 검색어 트렌드 분석 | Client ID + Secret (Edge Function 환경변수) |
| Kakao OAuth | 소셜 로그인 | Supabase OAuth provider |

## 배포 & 인프라

| 항목 | 내용 |
|---|---|
| 호스팅 | Vercel (무료 플랜, GitHub push → 자동 CD) |
| 도메인 | ogutalk.vercel.app |
| Supabase 리전 | Northeast Asia (Seoul / Tokyo) |
| PWA | `registerType: autoUpdate`, Workbox NetworkFirst for Supabase |
| 환경변수 | `.env.local` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

## 개발 도구

| 항목 | 내용 |
|---|---|
| IDE | VS Code 1.115.0 |
| 버전 관리 | Git + GitHub |
| CI/CD | Vercel GitHub 연동 |
| Supabase CLI | npx supabase (함수 배포) |
| 기타 | qrcode ^1.5.4 (devDep, QR 생성) |
