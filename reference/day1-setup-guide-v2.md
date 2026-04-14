# 오구톡 Day 1 — 개발환경 + Supabase 세팅 (최신 UI 반영 v2)

> 업데이트: 2026-04-14 기준 Supabase 최신 UI 반영  
> 주요 변경사항: API 키 용어 변경, 메뉴 위치 재구성, SQL 호환성 점검

---

## ✅ 현재 확인된 환경 상태

```
확인 완료 (추가 설치 불필요):
✅ VS Code 1.115.0 — 정상 설치
   경로: C:\Users\newizer\AppData\Local\Programs\Microsoft VS Code\
   PATH 등록: 정상

✅ Node.js v22.15.0 — 정상 설치 (LTS 최신)

✅ Git — 설치됨

✅ Supabase API 키 — 확인 완료
```

**Part 1(도구 설치) 전체 스킵 가능!** 바로 Part 2로 진행하세요.

---

## Part 2. Supabase 프로젝트 생성 (최신 UI)

### 2-1. 프로젝트 생성 화면 (변경 없음)

```
1. https://supabase.com 접속
2. "Start your project" 또는 "Sign in" 클릭
3. GitHub 계정으로 로그인
4. 대시보드 → "New Project" 클릭

5. 프로젝트 정보 입력:
   ┌──────────────────────────────────────┐
   │ Organization: 기본값                   │
   │                                       │
   │ Project Name: ogutalk                 │
   │                                       │
   │ Database Password:                    │
   │ [강력한 비밀번호 입력 + 반드시 메모!]     │
   │ → "Generate a password" 버튼으로       │
   │   자동 생성 추천                       │
   │                                       │
   │ Region: Northeast Asia (Seoul)        │
   │ ⚠️ 최근 서울 리전이 추가되었어요!        │
   │ (기존 Tokyo도 OK, Seoul이 더 빠름)     │
   │                                       │
   │ Plan: Free                            │
   └──────────────────────────────────────┘

6. "Create new project" 클릭 → 2~3분 대기
```

> 💡 **Seoul 리전 추가됨**  
> 2025년 말부터 한국 서울 리전이 추가되어 더 빠른 응답이 가능해졌어요.
> 있으면 Seoul 선택, 없으면 Tokyo 선택하면 됩니다.

---

## Part 3. 테이블 생성 (SQL 실행) — 최신 문법 점검

### 3-1. SQL Editor 위치 (최신 UI)

```
왼쪽 사이드바 메뉴 구조 (2026년 4월 기준):

🏠 Project Home
📊 Table Editor
🔧 SQL Editor        ← 여기!
🗄️ Database
🔐 Authentication
📦 Storage
⚡ Edge Functions
📡 Realtime
🤖 AI Assistants (신규)
🎛️ Advisors (신규)

Reports
Logs
API Docs
⚙️ Project Settings
```

### 3-2. SQL 실행 방법

```
1. "SQL Editor" 클릭
2. 상단 "+ New query" 또는 "New SQL snippet" 클릭
3. 에디터에 SQL 복사 → 붙여넣기
4. 실행 방법 (3가지 중 선택):
   • 오른쪽 하단 "Run" 버튼
   • 키보드 Ctrl + Enter (Windows) / Cmd + Enter (Mac)
   • 상단 ▶️ 재생 아이콘
```

### 3-3. 최신 버전 호환 SQL (업데이트됨)

아래 SQL은 Supabase 최신 PostgreSQL 17 버전에 맞춰 점검된 버전입니다.

```sql
-- ==========================================================
-- 오구톡 데이터베이스 — v2 (PostgreSQL 17 호환)
-- ==========================================================

-- ────────────────────────────────
-- 1. 사용자 프로필
-- ────────────────────────────────
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'Asia/Seoul',
  sound_enabled BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  premium_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────
-- 2. 알람 설정
-- ────────────────────────────────
CREATE TABLE public.alarm_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  alarm_type TEXT NOT NULL DEFAULT 'hourly_59',
  trigger_hour INTEGER,
  trigger_minute INTEGER DEFAULT 59,
  repeat_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],
  content_types TEXT[] DEFAULT ARRAY['weather','economy','quotes','todos'],
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────
-- 3. 목표관리
-- ────────────────────────────────
CREATE TABLE public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('yearly','monthly','weekly','daily')),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused','cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  parent_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────
-- 4. 할일 목록
-- ────────────────────────────────
CREATE TABLE public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  due_date DATE,
  due_time TIME,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────
-- 5. 관심 키워드
-- ────────────────────────────────
CREATE TABLE public.tracked_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  keyword_type TEXT DEFAULT 'stock' CHECK (keyword_type IN ('stock','crypto','general')),
  ticker_symbol TEXT,
  market TEXT,
  alert_on_change_pct NUMERIC,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────
-- 6. 알림 기록
-- ────────────────────────────────
CREATE TABLE public.notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────
-- 7. 경제 상식 (공유)
-- ────────────────────────────────
CREATE TABLE public.economic_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  source TEXT,
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────
-- 8. 사용자 환경설정
-- ────────────────────────────────
CREATE TABLE public.user_preferences (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  show_weather BOOLEAN DEFAULT true,
  show_economy BOOLEAN DEFAULT true,
  show_quotes BOOLEAN DEFAULT true,
  show_todos BOOLEAN DEFAULT true,
  show_economic_tips BOOLEAN DEFAULT true,
  stock_summary_time TIME DEFAULT '07:10',
  todo_remind_time TIME DEFAULT '07:20',
  work_summary_time TIME DEFAULT '22:00',
  hourly_alarm_start INTEGER DEFAULT 7,
  hourly_alarm_end INTEGER DEFAULT 23,
  hourly_alarm_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],
  fcm_token TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- 성능 최적화 인덱스 (신규 추가)
-- ==========================================================

CREATE INDEX idx_todos_user_date ON public.todos(user_id, due_date);
CREATE INDEX idx_todos_user_completed ON public.todos(user_id, is_completed);
CREATE INDEX idx_goals_user_type ON public.goals(user_id, goal_type);
CREATE INDEX idx_goals_parent ON public.goals(parent_goal_id);
CREATE INDEX idx_keywords_user ON public.tracked_keywords(user_id);
CREATE INDEX idx_notifications_user_sent ON public.notification_log(user_id, sent_at DESC);
CREATE INDEX idx_alarms_user_hour ON public.alarm_settings(user_id, trigger_hour);

-- ==========================================================
-- RLS (Row Level Security) 정책
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- alarm_settings
CREATE POLICY "alarms_all_own" ON public.alarm_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- goals
CREATE POLICY "goals_all_own" ON public.goals
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- todos
CREATE POLICY "todos_all_own" ON public.todos
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- tracked_keywords
CREATE POLICY "keywords_all_own" ON public.tracked_keywords
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- notification_log
CREATE POLICY "notifications_select_own" ON public.notification_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_system" ON public.notification_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- economic_tips (공개 콘텐츠)
CREATE POLICY "tips_select_published" ON public.economic_tips
  FOR SELECT TO anon, authenticated USING (is_published = true);

-- user_preferences
CREATE POLICY "prefs_all_own" ON public.user_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- ==========================================================
-- 자동 프로필 생성 트리거
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  FOR h IN 7..23 LOOP
    INSERT INTO public.alarm_settings (user_id, alarm_type, trigger_hour)
    VALUES (NEW.id, 'hourly_59', h);
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================
-- updated_at 자동 갱신 트리거
-- ==========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_prefs_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================================
-- 경제 상식 초기 데이터 (10건)
-- ==========================================================

INSERT INTO public.economic_tips (title, content, category, difficulty) VALUES
('복리의 마법', '복리는 원금뿐만 아니라 이자에도 이자가 붙는 방식입니다. 매년 7% 수익이면 약 10년 후 원금이 2배가 됩니다. 워런 버핏은 "복리는 세계 8번째 불가사의"라고 했습니다.', '투자기초', 'beginner'),
('72의 법칙', '투자 원금이 2배가 되는 기간을 쉽게 계산하는 법: 72 ÷ 수익률(%) = 원금 2배 걸리는 해. 예: 연 8% 수익률이면 72÷8=9년.', '투자기초', 'beginner'),
('ETF란?', 'ETF(상장지수펀드)는 주식처럼 거래되는 펀드입니다. 개별 주식보다 위험이 분산되고, 펀드보다 수수료가 저렴해서 초보 투자자에게 추천됩니다.', '투자기초', 'beginner'),
('비상금의 중요성', '전문가들은 월 생활비의 3~6개월분을 비상금으로 준비하라고 합니다. 갑작스러운 실직이나 의료비에 대비하는 최소한의 안전장치입니다.', '재무관리', 'beginner'),
('인플레이션과 현금', '인플레이션이 3%면 100만원의 실질가치는 1년 후 97만원입니다. 현금을 그냥 갖고 있으면 매년 가치가 줄어드는 셈이에요.', '경제개념', 'beginner'),
('PER(주가수익비율)', 'PER = 주가 ÷ 주당순이익. PER 10이면 투자금 회수에 10년 걸린다는 뜻. 같은 업종 내에서 PER이 낮으면 상대적으로 저평가된 주식일 수 있습니다.', '주식용어', 'intermediate'),
('분산투자의 원칙', '"달걀을 한 바구니에 담지 마라." 주식, 채권, 부동산 등 다양한 자산에 나눠 투자하면 하나가 떨어져도 전체 손실을 줄일 수 있습니다.', '투자기초', 'beginner'),
('연금저축의 세금 혜택', '연금저축에 연 600만원까지 넣으면 최대 99만원의 세액공제를 받을 수 있습니다. 16.5%의 확정 수익률과 같은 효과예요.', '세금', 'intermediate'),
('환율과 해외투자', '해외 주식 투자 시 환율도 수익에 영향을 줍니다. 주식이 10% 올라도 원화가 10% 강세면 환차손으로 수익이 0이 될 수 있어요.', '해외투자', 'intermediate'),
('적립식 투자의 힘', '매월 일정 금액을 정기적으로 투자하면 주가가 높을 때 적게, 낮을 때 많이 사게 되어 평균 매입단가가 낮아집니다. 이를 "코스트 애버리징"이라 합니다.', '투자기초', 'beginner');
```

### 🔄 v1 대비 개선 포인트

```
✅ ARRAY[1,2,3,4,5,6,7] 문법 (v1의 '{1,2,3}' 보다 안전)
✅ CHECK 제약조건 추가 (잘못된 데이터 삽입 방지)
✅ 성능 인덱스 7개 추가 (조회 속도 향상)
✅ DROP TRIGGER IF EXISTS (재실행 안전)
✅ SECURITY DEFINER + search_path (보안 강화)
✅ updated_at 자동 갱신 트리거 (수동 관리 불필요)
✅ TO authenticated/anon 명시 (RLS 정책 명확화)
✅ 닉네임 자동 생성 (이메일에서 추출)
✅ ON DELETE SET NULL (관계 삭제 시 데이터 보존)
```

---

## Part 4. 인증 설정 — 최신 UI

### 4-1. 이메일 인증 설정

```
1. 왼쪽 사이드바 → "Authentication" 클릭

2. 왼쪽 서브메뉴 (최신 순서):
   ├── Users
   ├── Policies
   ├── Providers       ← 클릭!
   ├── Rate Limits
   ├── Email Templates
   ├── Multi-Factor
   ├── Sessions
   ├── Attack Protection (신규)
   ├── Hooks (신규)
   └── URL Configuration

3. "Providers" → "Email" 섹션 확장

4. 설정:
   ✅ Enable Email provider: ON (기본값)
   ☐ Confirm email: OFF 추천 (개발 중)
     → 개발 편의성을 위해 꺼두기
     → 배포 전에 반드시 ON으로 변경!
   ☐ Secure email change: OFF (개발 중)
   ☐ Secure password change: OFF (개발 중)

5. 하단 "Save" 클릭
```

### 4-2. URL Configuration

```
1. Authentication → URL Configuration 클릭

2. Site URL:
   http://localhost:5173

3. Redirect URLs (+ Add URL 버튼):
   http://localhost:5173/**
   http://localhost:5173/auth/callback

   → Day 7에 추가 예정:
   https://ogutalk.vercel.app/**
```

---

## Part 5. API 키 확인 — 최신 UI (중요 변경사항)

### 5-1. Publishable Key (앱에서 사용 — 안전)

```
1. 왼쪽 사이드바 맨 아래 → "Project Settings" (⚙️ 톱니바퀴)

2. Settings 서브메뉴 (최신):
   ├── General
   ├── Compute and Disk
   ├── Infrastructure
   ├── Integrations
   ├── API Keys        ← 클릭!
   ├── Data API        ← URL은 여기!
   ├── JWT Keys (신규)
   ├── Database
   ├── Auth
   ├── Edge Functions
   └── ...

3. "API Keys" 페이지:
   
   ┌─────────────────────────────────────────────┐
   │ 📗 Publishable key                           │
   │ (또는 anon key — 이름이 전환 중)              │
   │                                              │
   │ sb_publishable_xxxxxxxxxxxx                  │
   │ 또는                                          │
   │ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...      │
   │                                              │
   │ ✅ [Copy] → 메모장에 저장                     │
   │                                              │
   │ 용도: 프런트엔드 앱에서 사용 (안전)             │
   └─────────────────────────────────────────────┘

4. "Data API" 페이지:
   
   ┌─────────────────────────────────────────────┐
   │ 🌐 Project URL                               │
   │                                              │
   │ https://xxxxxxxxxx.supabase.co               │
   │                                              │
   │ ✅ [Copy] → 메모장에 저장                     │
   └─────────────────────────────────────────────┘
```

### 5-2. ⚠️ 절대 복사하지 말아야 할 키

```
❌ secret key (또는 service_role key)
   sb_secret_xxxxxxxxxxxx

→ 이 키는 모든 RLS 보안을 무시하는 마스터 키!
→ 프런트엔드 코드에 넣으면 해킹당할 수 있어요
→ 나중에 Edge Functions에서 서버 내부용으로만 사용
```

### 5-3. 메모 템플릿

VS Code에서 새 파일을 만들어 저장하세요:

```
파일명: ogutalk-credentials.txt
저장 위치: 바탕화면 또는 문서 폴더
(GitHub에는 절대 올리지 말 것!)

──────────────────────────────────
오구톡 Supabase 자격증명
생성일: 2026-04-14
──────────────────────────────────

Project Name: ogutalk
Region: Northeast Asia (Seoul 또는 Tokyo)

Project URL:
https://여기에-붙여넣기.supabase.co

Publishable Key:
여기에-붙여넣기

DB Password:
여기에-비밀번호

──────────────────────────────────
⚠️ 이 파일은 절대 GitHub에 올리지 마세요
⚠️ Day 2에서 .env 파일로 옮길 예정
──────────────────────────────────
```

---

## Part 6. 검증 체크리스트 — 꼭 확인!

### 6-1. 테이블 검증

```sql
-- SQL Editor에서 실행 → 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

예상 결과 (8개):
```
alarm_settings
economic_tips
goals
notification_log
profiles
todos
tracked_keywords
user_preferences
```

### 6-2. 경제 상식 데이터 검증

```sql
SELECT COUNT(*) as tip_count FROM public.economic_tips;
-- 결과: 10
```

### 6-3. RLS 정책 검증

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

예상 결과: 10개 이상의 정책이 표시되어야 함

### 6-4. 트리거 검증

```sql
SELECT event_object_table, trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema IN ('public', 'auth')
  AND trigger_name LIKE 'on_auth%' 
    OR trigger_name LIKE 'set_%'
ORDER BY event_object_table;
```

예상 결과 (5개):
```
users           | on_auth_user_created
profiles        | set_profiles_updated_at
goals           | set_goals_updated_at
todos           | set_todos_updated_at
user_preferences | set_prefs_updated_at
```

### 6-5. 인덱스 검증

```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename;
```

예상 결과: 7개 인덱스

---

## ✅ Day 1 최종 점검표

```
환경 (이미 완료):
  ✅ Node.js v22.15.0
  ✅ VS Code 1.115.0
  ✅ Git (설치 확인됨)
  ✅ GitHub 계정

Supabase 프로젝트:
  □ 프로젝트 "ogutalk" 생성
  □ Region: Seoul (또는 Tokyo)
  □ DB 비밀번호 메모 완료

데이터베이스:
  □ SQL 스크립트 실행 성공
  □ 8개 테이블 생성 확인
  □ 7개 인덱스 생성 확인
  □ 10개 RLS 정책 생성 확인
  □ 5개 트리거 생성 확인
  □ 10개 경제상식 데이터 확인

인증:
  □ Email provider 활성화
  □ Confirm email: OFF (개발 중)
  □ Site URL: http://localhost:5173
  □ Redirect URLs 추가 완료

자격증명 메모 (ogutalk-credentials.txt):
  □ Project URL
  □ Publishable Key (anon key)
  □ DB Password
```

---

## 🆕 Supabase 최신 주요 변경사항 요약

```
┌──────────────────────────────────────────────────┐
│ 변경된 점                                          │
├──────────────────────────────────────────────────┤
│ 1. API 키 이름:                                    │
│    anon → publishable (전환 중, 둘 다 유효)        │
│    service_role → secret                          │
│                                                    │
│ 2. 메뉴 분리:                                      │
│    Settings → API (과거, 한 곳에)                  │
│    → Settings → API Keys (키)                      │
│    → Settings → Data API (URL)                     │
│    → Settings → JWT Keys (새로 분리)                │
│                                                    │
│ 3. 신규 기능:                                      │
│    • Seoul 리전 추가                              │
│    • AI Assistants 메뉴                          │
│    • Advisors (성능/보안 조언)                    │
│    • Attack Protection                           │
│    • Auth Hooks                                  │
│                                                    │
│ 4. PostgreSQL 17 지원                             │
│    • 더 빠른 성능                                 │
│    • JSON 기능 강화                               │
└──────────────────────────────────────────────────┘
```

---

## 🚀 다음 단계 (Day 2 미리보기)

내일은 Day 1에서 만든 백엔드 위에 React 프런트엔드를 연결합니다.

```
Day 2 준비물:
  ✅ Supabase Project URL (메모함)
  ✅ Supabase Publishable Key (메모함)
  ✅ 개발 환경 (완료)

Day 2 첫 명령어:
  cd Desktop (또는 원하는 폴더)
  npm create vite@latest ogutalk -- --template react
```

Day 1 모든 체크리스트를 통과했다면 **완벽!** 🎉
