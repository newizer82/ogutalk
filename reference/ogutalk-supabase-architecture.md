# 오구톡 — Supabase 백엔드 아키텍처 설계서

> 버전: v2.0 설계  
> 백엔드: Supabase (메인) + Firebase FCM (푸시 전용)  
> 대상: 수익형 앱 구축을 위한 전체 설계

---

## 1. 전체 시스템 구조

```
┌─────────────────────────────────────────────────┐
│              사용자 핸드폰 (프런트엔드)              │
│         React Native (Expo) 또는 PWA              │
│                                                   │
│  [홈]  [알림센터]  [목표관리]  [설정]  [프리미엄]     │
└──────────────────┬────────────────────────────────┘
                   │ HTTPS (API 호출)
                   ▼
┌─────────────────────────────────────────────────┐
│              Supabase (메인 백엔드)                │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth     │  │ Database │  │ Edge Functions │  │
│  │ (인증)   │  │ (저장소)  │  │ (서버 로직)    │  │
│  └──────────┘  └──────────┘  └───────┬───────┘  │
│                                       │          │
│  ┌──────────┐  ┌──────────┐          │          │
│  │ Storage  │  │ Realtime │          │          │
│  │ (파일)   │  │ (실시간)  │          │          │
│  └──────────┘  └──────────┘          │          │
└──────────────────────────────────────┼──────────┘
                                       │
                   ┌───────────────────┼────────────────────┐
                   ▼                   ▼                    ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │  외부 API     │  │  Google API  │  │  AI API      │
          │              │  │              │  │              │
          │ • 주식 시세   │  │ • Calendar   │  │ • Claude API │
          │ • 뉴스 검색   │  │ • OAuth 인증  │  │ • 업무 요약   │
          │ • 날씨 정보   │  │              │  │ • 뉴스 요약   │
          └──────────────┘  └──────────────┘  └──────────────┘
```

### 각 부분이 하는 일 (초보자용 설명)

```
Supabase Auth    = 회원가입/로그인을 처리하는 경비원
Supabase Database = 모든 데이터를 저장하는 창고 (PostgreSQL)
Edge Functions   = 특정 시간에 자동으로 일하는 직원
                   (7:10 주식 가져오기, 10:00 요약 만들기 등)
Storage          = 이미지, 파일을 보관하는 사물함
Realtime         = 데이터가 바뀌면 즉시 앱에 알려주는 전달자
```

---

## 2. 데이터베이스 설계 (가장 중요!)

### 왜 이게 중요한가?

데이터베이스 설계는 건물의 기초 공사와 같아요.  
나중에 바꾸려면 비용이 엄청나게 들기 때문에  
처음부터 제대로 설계하는 게 핵심입니다.

### 전체 테이블 관계도

```
users (사용자)
  │
  ├── 1:N → alarm_settings (알람 설정)
  │
  ├── 1:N → goals (목표관리)
  │           ├── type: yearly (연간)
  │           ├── type: monthly (월간)
  │           ├── type: weekly (주간)
  │           └── type: daily (일간)
  │
  ├── 1:N → todos (할일 목록)
  │
  ├── 1:N → tracked_keywords (관심 키워드)
  │           ├── "테슬라"
  │           ├── "삼성전자"
  │           └── "비트코인"
  │
  ├── 1:N → notification_log (알림 기록)
  │
  ├── 1:1 → user_preferences (환경설정)
  │
  └── 1:1 → subscriptions (구독 상태)

economic_tips (경제 상식) ← 모든 사용자 공유
daily_stocks (일일 주식 캐시) ← 모든 사용자 공유
```

> 💡 **1:N 이란?** 한 명의 사용자(1)가 여러 개의 할일(N)을 가질 수 있다는 뜻

### 각 테이블 상세 설계

#### ① users — 사용자 기본 정보

```sql
-- Supabase Auth가 자동으로 만드는 auth.users 외에,
-- 추가 프로필 정보를 저장하는 테이블

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  
  -- 기본 정보
  nickname TEXT,                    -- 닉네임
  avatar_url TEXT,                  -- 프로필 이미지 URL
  
  -- 앱 설정
  timezone TEXT DEFAULT 'Asia/Seoul',
  sound_enabled BOOLEAN DEFAULT true,
  
  -- 구독 상태
  is_premium BOOLEAN DEFAULT false,
  premium_until TIMESTAMPTZ,        -- 프리미엄 만료일
  
  -- 메타
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

> 💡 **UUID란?** `550e8400-e29b-41d4-a716-446655440000` 같은 고유 식별자.
> 숫자 1, 2, 3보다 안전해요 (추측 불가능).

#### ② alarm_settings — 알람 설정

```sql
CREATE TABLE public.alarm_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- 알람 시간 설정
  alarm_type TEXT NOT NULL,
  -- 'hourly_59'     = 매시 59분 기본 알람
  -- 'stock_summary' = 7:10 해외주식 요약
  -- 'todo_remind'   = 7:20 할일 알림
  -- 'work_summary'  = 10:00 업무 요약
  -- 'custom'        = 사용자 지정 시간
  
  trigger_hour INTEGER,            -- 0~23 (시)
  trigger_minute INTEGER,          -- 0~59 (분)
  
  -- 반복 설정
  repeat_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
  -- 1=월, 2=화 ... 7=일
  -- 예: '{1,2,3,4,5}' = 평일만
  
  -- 콘텐츠 설정
  content_types TEXT[] DEFAULT '{}',
  -- '{weather,economy,quotes,todos}'
  
  is_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### ③ goals — 연/월/주/일 목표관리

```sql
CREATE TABLE public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- 목표 유형과 기간
  goal_type TEXT NOT NULL,
  -- 'yearly', 'monthly', 'weekly', 'daily'
  
  title TEXT NOT NULL,              -- "올해 매출 1억 달성"
  description TEXT,                 -- 상세 설명
  
  -- 기간
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- 진행 상태
  status TEXT DEFAULT 'active',
  -- 'active', 'completed', 'paused', 'cancelled'
  
  progress INTEGER DEFAULT 0,      -- 0~100 (%)
  
  -- 상위 목표 연결 (핵심!)
  parent_goal_id UUID REFERENCES public.goals(id),
  -- 예: 일간 목표 → 주간 목표 → 월간 목표 → 연간 목표
  
  -- 정렬 순서
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

> 💡 **parent_goal_id가 핵심이에요!**  
> 이걸로 목표 간 연결이 가능합니다:
> ```
> 연간: "건강한 몸 만들기"
>   └── 월간: "4월 운동 20회"
>         └── 주간: "이번 주 5회 운동"
>               └── 일간: "오늘 30분 러닝"
> ```

#### ④ todos — 할일 목록

```sql
CREATE TABLE public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,              -- "기획서 작성"
  description TEXT,
  
  -- 연결
  goal_id UUID REFERENCES public.goals(id),  -- 어떤 목표의 할일인지
  
  -- 시간
  due_date DATE,                    -- 마감일
  due_time TIME,                    -- 마감 시각
  remind_at TIMESTAMPTZ,            -- 알림 시각 (7:20 등)
  
  -- 상태
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- 우선순위
  priority TEXT DEFAULT 'medium',
  -- 'high', 'medium', 'low'
  
  -- 반복
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,             -- 'daily', 'weekdays', 'weekly'
  
  -- 정렬
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### ⑤ tracked_keywords — 관심 키워드 (테슬라, 삼성전자 등)

```sql
CREATE TABLE public.tracked_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  keyword TEXT NOT NULL,            -- "테슬라", "삼성전자"
  
  -- 키워드 유형
  keyword_type TEXT DEFAULT 'stock',
  -- 'stock'   = 주식 종목
  -- 'crypto'  = 암호화폐
  -- 'general' = 일반 키워드 (뉴스)
  
  -- 주식 종목 정보 (주식인 경우)
  ticker_symbol TEXT,               -- "TSLA", "005930.KS"
  market TEXT,                      -- "US", "KR", "CRYPTO"
  
  -- 알림 조건 (선택)
  alert_on_change_pct NUMERIC,      -- 5% 이상 변동 시 알림
  
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### ⑥ notification_log — 알림 기록

```sql
CREATE TABLE public.notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- 알림 정보
  notification_type TEXT NOT NULL,
  -- 'hourly_59', 'stock_summary', 'todo_remind',
  -- 'work_summary', 'keyword_alert'
  
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,                       -- 추가 데이터 (주식 정보 등)
  
  -- 상태
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  
  sent_at TIMESTAMPTZ DEFAULT now()
);
```

#### ⑦ economic_tips — 경제 상식 (공유 콘텐츠)

```sql
CREATE TABLE public.economic_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  title TEXT NOT NULL,              -- "복리의 마법"
  content TEXT NOT NULL,            -- 상세 설명
  category TEXT,                    -- "투자기초", "세금", "부동산"
  difficulty TEXT DEFAULT 'beginner',
  -- 'beginner', 'intermediate', 'advanced'
  
  -- 출처
  source TEXT,
  source_url TEXT,
  
  -- 관리
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 💡 이 테이블은 관리자(나)가 미리 콘텐츠를 넣어두고,
--    사용자들에게 매일 하나씩 보여주는 방식입니다.
```

#### ⑧ daily_stock_cache — 일일 주식 캐시

```sql
CREATE TABLE public.daily_stock_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  ticker_symbol TEXT NOT NULL,      -- "TSLA"
  market TEXT NOT NULL,             -- "US"
  
  -- 시세 정보
  current_price NUMERIC,
  change_pct NUMERIC,               -- 변동률 (%)
  volume BIGINT,
  
  -- 요약 (AI 생성)
  ai_summary TEXT,                  -- "테슬라, 자율주행 발표로 5% 상승"
  key_news JSONB,                   -- 관련 주요 뉴스 배열
  
  -- 갱신
  fetched_at TIMESTAMPTZ DEFAULT now(),
  
  -- 하루에 한 종목은 하나의 행만
  UNIQUE(ticker_symbol, fetched_at::date)
);

-- 💡 캐시란? 외부 API에서 가져온 데이터를 임시 저장하는 것.
--    같은 데이터를 여러 번 요청하지 않아서 비용을 절약합니다.
```

#### ⑨ user_preferences — 사용자 환경설정

```sql
CREATE TABLE public.user_preferences (
  user_id UUID REFERENCES public.profiles(id) PRIMARY KEY,
  
  -- 알림 콘텐츠 설정
  show_weather BOOLEAN DEFAULT true,
  show_economy BOOLEAN DEFAULT true,
  show_quotes BOOLEAN DEFAULT true,
  show_todos BOOLEAN DEFAULT true,
  show_economic_tips BOOLEAN DEFAULT true,
  
  -- 주식 알림 설정
  stock_summary_time TIME DEFAULT '07:10',
  todo_remind_time TIME DEFAULT '07:20',
  work_summary_time TIME DEFAULT '22:00',
  
  -- 59분 알람 범위
  hourly_alarm_start INTEGER DEFAULT 7,   -- 시작 시각
  hourly_alarm_end INTEGER DEFAULT 23,    -- 종료 시각
  hourly_alarm_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
  
  -- Google Calendar
  google_calendar_connected BOOLEAN DEFAULT false,
  google_refresh_token TEXT,        -- 암호화 저장 필수!
  
  -- FCM 토큰 (푸시 알림용)
  fcm_token TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 3. Edge Functions (서버 로직)

### Edge Function이 뭔가요?

```
일반 서버:  24시간 켜져있는 컴퓨터 → 안 쓸 때도 돈 나감
Edge Function: 필요할 때만 실행되는 코드 → 쓴 만큼만 돈 나감

비유: 정규직 직원 vs 필요할 때 부르는 프리랜서
```

### 필요한 Edge Functions 목록

#### ① 7:10 해외 주식 요약 알림

```typescript
// supabase/functions/stock-summary/index.ts
// 매일 오전 7:10에 자동 실행

import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js"

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  
  // 1. 모든 사용자의 관심 키워드 가져오기
  const { data: keywords } = await supabase
    .from('tracked_keywords')
    .select('*, profiles(*)')
    .eq('is_enabled', true)
    .eq('keyword_type', 'stock')

  // 2. 종목별 최신 시세 가져오기 (외부 API)
  for (const kw of keywords) {
    const stockData = await fetchStockPrice(kw.ticker_symbol)
    
    // 3. AI로 한 줄 요약 생성
    const summary = await generateSummary(stockData)
    
    // 4. 캐시에 저장
    await supabase.from('daily_stock_cache').upsert({
      ticker_symbol: kw.ticker_symbol,
      current_price: stockData.price,
      change_pct: stockData.changePct,
      ai_summary: summary
    })
    
    // 5. 푸시 알림 보내기 (Firebase FCM)
    await sendPushNotification(kw.profiles.fcm_token, {
      title: `📈 ${kw.keyword} ${stockData.changePct > 0 ? '▲' : '▼'}${stockData.changePct}%`,
      body: summary
    })
  }
})
```

#### ② 7:20 해야할 일 알림

```typescript
// supabase/functions/todo-reminder/index.ts
// 매일 오전 7:20에 자동 실행

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  
  const today = new Date().toISOString().split('T')[0]
  
  // 1. 오늘 할일이 있는 사용자 조회
  const { data: todos } = await supabase
    .from('todos')
    .select('*, profiles(*)')
    .eq('due_date', today)
    .eq('is_completed', false)
    .order('priority', { ascending: true })

  // 2. 사용자별로 그룹핑
  const userTodos = groupByUser(todos)
  
  // 3. 각 사용자에게 알림
  for (const [userId, items] of Object.entries(userTodos)) {
    const highPriority = items.filter(t => t.priority === 'high')
    
    await sendPushNotification(items[0].profiles.fcm_token, {
      title: `✅ 오늘 할일 ${items.length}개`,
      body: highPriority.length > 0 
        ? `중요: ${highPriority[0].title} 외 ${items.length - 1}건`
        : `${items[0].title} 외 ${items.length - 1}건`
    })
  }
})
```

#### ③ 10:00 업무 요약 및 내일 계획

```typescript
// supabase/functions/work-summary/index.ts
// 매일 밤 10:00에 자동 실행

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  
  // 프리미엄 사용자만 (수익 기능!)
  const { data: users } = await supabase
    .from('profiles')
    .select('*, user_preferences(*)')
    .eq('is_premium', true)

  for (const user of users) {
    // 1. 오늘 완료한 할일
    const { data: completed } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .gte('completed_at', todayStart)

    // 2. 미완료 할일
    const { data: remaining } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)

    // 3. 내일 캘린더 일정 (Google Calendar 연동)
    const tomorrowEvents = user.user_preferences.google_calendar_connected
      ? await fetchGoogleCalendar(user, tomorrow)
      : []

    // 4. Claude API로 AI 업무 요약 생성
    const summary = await callClaudeAPI({
      prompt: `
        오늘 완료: ${completed.map(t => t.title).join(', ')}
        미완료: ${remaining.map(t => t.title).join(', ')}
        내일 일정: ${tomorrowEvents.map(e => e.summary).join(', ')}
        
        위 내용을 바탕으로:
        1) 오늘의 성과를 2줄로 요약
        2) 내일 우선 처리할 3가지를 추천
        3) 짧은 응원 메시지
      `
    })

    // 5. 알림 보내기
    await sendPushNotification(user.user_preferences.fcm_token, {
      title: "📋 오늘의 업무 요약",
      body: summary.todaySummary
    })

    // 6. 알림 기록 저장
    await supabase.from('notification_log').insert({
      user_id: user.id,
      notification_type: 'work_summary',
      title: "오늘의 업무 요약",
      body: summary.todaySummary,
      data: summary
    })
  }
})
```

#### ④ 키워드 최신 동향 (수시)

```typescript
// supabase/functions/keyword-trends/index.ts
// 2시간마다 실행

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  
  // 1. 활성 키워드 전체 조회
  const { data: keywords } = await supabase
    .from('tracked_keywords')
    .select('keyword, ticker_symbol, keyword_type')
    .eq('is_enabled', true)
  
  // 2. 중복 제거 (여러 사용자가 같은 키워드 추적 가능)
  const uniqueKeywords = [...new Set(keywords.map(k => k.keyword))]
  
  // 3. 각 키워드별 뉴스 검색
  for (const keyword of uniqueKeywords) {
    const news = await fetchNews(keyword)  // Naver 검색 API
    const stockData = await fetchStockIfApplicable(keyword)
    
    // 4. AI 요약
    const trend = await callClaudeAPI({
      prompt: `"${keyword}" 관련 최신 뉴스 3건을 1줄씩 요약해줘: 
               ${news.map(n => n.title).join('\n')}`
    })
    
    // 5. 캐시 업데이트
    await supabase.from('daily_stock_cache').upsert({
      ticker_symbol: keyword,
      ai_summary: trend,
      key_news: news.slice(0, 5),
      fetched_at: new Date()
    })
  }
})
```

### Cron 스케줄 설정

```sql
-- Supabase에서 Edge Function을 정해진 시간에 자동 실행하는 설정
-- supabase/config.toml 또는 대시보드에서 설정

[functions.stock-summary]
schedule = "10 7 * * *"      -- 매일 07:10 (한국시간)

[functions.todo-reminder]
schedule = "20 7 * * *"      -- 매일 07:20

[functions.work-summary]
schedule = "0 22 * * *"      -- 매일 22:00

[functions.keyword-trends]
schedule = "0 */2 * * *"     -- 2시간마다

[functions.hourly-59-alarm]
schedule = "59 * * * *"      -- 매시 59분
```

> 💡 **Cron 표현식 읽는 법:**
> ```
> "10 7 * * *"
>  │  │ │ │ │
>  │  │ │ │ └── 요일 (* = 매일)
>  │  │ │ └──── 월 (* = 매월)
>  │  │ └────── 일 (* = 매일)
>  │  └──────── 시 (7시)
>  └────────── 분 (10분)
> ```

---

## 4. 외부 API 연동 상세

### 해외 주식 데이터

```
추천: Alpha Vantage API
  • 무료: 하루 25건 / 분당 5건
  • 유료: 월 $49.99 (하루 무제한)
  • 제공: 실시간 시세, 일별 차트, 기업 정보
  
  요청 예시:
  GET https://www.alphavantage.co/query
    ?function=GLOBAL_QUOTE
    &symbol=TSLA
    &apikey=YOUR_KEY
  
  응답:
  {
    "Global Quote": {
      "01. symbol": "TSLA",
      "05. price": "178.2300",
      "10. change percent": "3.4500%"
    }
  }

대안: Polygon.io
  • 무료: 5건/분
  • 유료: 월 $29~ (실시간 데이터)
  • 장점: WebSocket 실시간 스트리밍 지원
```

### 국내 주식 데이터

```
추천: 한국투자증권 Open API
  • 무료 (계좌 개설 필요)
  • 제공: 실시간 시세, 체결가, 호가
  
대안: KRX(한국거래소) 데이터
  • 공공데이터포털에서 무료 제공
  • 실시간은 아닌 일별 데이터
```

### 뉴스/키워드 동향

```
추천: Naver 검색 API
  • 무료: 하루 25,000건
  • 한국 뉴스에 최적화
  
  요청:
  GET https://openapi.naver.com/v1/search/news.json
    ?query=테슬라
    &display=5
    &sort=date

대안: NewsAPI.org
  • 무료: 하루 100건 (해외 뉴스)
  • 유료: 월 $449~ (상업용)
```

### Google Calendar 연동

```
Google Calendar API v3
  • 무료 (OAuth 인증 필요)
  • 사용자가 "Google로 로그인" 후 캘린더 접근 허용
  
  필요한 권한(scope):
  • https://www.googleapis.com/auth/calendar.readonly
    (읽기만 — 일정 가져오기)
  • https://www.googleapis.com/auth/calendar.events
    (쓰기도 — 할일을 캘린더에 추가)

  연동 흐름:
  1. 사용자가 "Google Calendar 연동" 버튼 클릭
  2. Google 로그인 화면으로 이동
  3. "오구톡이 캘린더에 접근합니다" 동의
  4. 인증 코드 → refresh_token 발급
  5. refresh_token을 Supabase에 암호화 저장
  6. 이후 자동으로 캘린더 데이터 가져오기
```

### AI 요약 (Claude API)

```
Anthropic Claude API
  • 비용: 입력 $3/백만토큰, 출력 $15/백만토큰 (Sonnet)
  • 업무 요약 1건 ≈ 약 2,000토큰 ≈ 약 10원
  • 하루 1만명 × 1건 = 약 10만원/일
  
  사용처:
  • 업무 요약 및 내일 계획 생성
  • 주식 뉴스 한 줄 요약
  • 키워드별 동향 분석
  
  비용 절감 팁:
  • Haiku 모델 사용 시 비용 1/10
  • 결과를 캐시해서 동일 요청 방지
  • 프리미엄 사용자에게만 AI 기능 제공 (수익으로 비용 충당)
```

---

## 5. Google Calendar 연동 상세 흐름

```
[사용자 앱]                [Supabase]              [Google]
    │                         │                       │
    │  1. "캘린더 연동" 클릭   │                       │
    ├────────────────────────>│                       │
    │                         │  2. OAuth URL 생성     │
    │                         ├──────────────────────>│
    │  3. Google 로그인 화면  │                       │
    │<────────────────────────────────────────────────┤
    │                         │                       │
    │  4. 동의 + 인증코드     │                       │
    ├────────────────────────>│                       │
    │                         │  5. 토큰 교환          │
    │                         ├──────────────────────>│
    │                         │  6. refresh_token     │
    │                         │<──────────────────────┤
    │                         │  7. DB에 암호화 저장   │
    │  8. "연동 완료!" 표시   │                       │
    │<────────────────────────┤                       │
    │                         │                       │
    │     [이후 매일 자동]      │                       │
    │                         │  9. 오늘 일정 요청     │
    │                         ├──────────────────────>│
    │                         │  10. 일정 데이터       │
    │                         │<──────────────────────┤
    │  11. 알림에 일정 포함    │                       │
    │<────────────────────────┤                       │
```

---

## 6. 연/월/주/일 목표관리 화면 구조

```
┌──────────────────────────────────┐
│  🎯 목표관리                      │
│                                  │
│  [연간] [월간] [주간] [일간]       │  ← 탭 전환
│  ─────────────────────────────── │
│                                  │
│  📅 2026년 목표                   │
│  ┌────────────────────────────┐  │
│  │ ▶ 건강한 몸 만들기      68% │  │  ← 연간 목표
│  │   ████████████░░░░░░       │  │  ← 진행률 바
│  │                            │  │
│  │   📌 4월 목표:             │  │
│  │   • 운동 20회 (12/20) 60%  │  │  ← 월간 하위 목표
│  │   • 체중 75kg 달성   진행중 │  │
│  │                            │  │
│  │   📌 이번 주:              │  │
│  │   • 운동 5회 (3/5)    60%  │  │  ← 주간 하위 목표
│  │                            │  │
│  │   📌 오늘:                 │  │
│  │   ☐ 30분 러닝             │  │  ← 일간 할일
│  │   ☑ 스트레칭 10분    완료  │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ ▶ 재테크 목표          45% │  │  ← 또 다른 연간 목표
│  │   ██████████░░░░░░░░░░░    │  │
│  │   ...                      │  │
│  └────────────────────────────┘  │
│                                  │
│  [+ 새 목표 추가]                 │
└──────────────────────────────────┘
```

---

## 7. 보안 설정 (Row Level Security)

### 이게 뭔가요?

```
RLS = "내 데이터는 나만 볼 수 있게" 하는 보안 규칙

RLS 없으면: A 사용자가 B 사용자의 할일 목록을 볼 수 있음 😱
RLS 있으면: 각 사용자는 자기 데이터만 접근 가능 🔒
```

### 설정 방법

```sql
-- 모든 테이블에 RLS 활성화 (필수!)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 데이터만 읽기/쓰기 가능
CREATE POLICY "Users can view own data" ON public.todos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON public.todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON public.todos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON public.todos
  FOR DELETE USING (auth.uid() = user_id);

-- economic_tips는 모든 사용자가 읽기 가능 (공유 콘텐츠)
ALTER TABLE public.economic_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tips" ON public.economic_tips
  FOR SELECT USING (is_published = true);
```

---

## 8. 프런트엔드에서 Supabase 사용하는 법

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xxxxx.supabase.co',  // 프로젝트 URL
  'eyJhbGci...'                  // 공개 키 (anon key)
)

export default supabase
```

```javascript
// 예시: 오늘의 할일 가져오기
const { data: todos, error } = await supabase
  .from('todos')
  .select('*')
  .eq('due_date', '2026-04-12')
  .eq('is_completed', false)
  .order('priority', { ascending: true })

// 예시: 새 목표 추가하기
const { data, error } = await supabase
  .from('goals')
  .insert({
    title: '올해 매출 1억 달성',
    goal_type: 'yearly',
    start_date: '2026-01-01',
    end_date: '2026-12-31'
  })

// 예시: 할일 완료 처리
const { error } = await supabase
  .from('todos')
  .update({ 
    is_completed: true, 
    completed_at: new Date() 
  })
  .eq('id', todoId)

// 예시: 실시간 구독 (할일이 변경되면 즉시 반영)
supabase
  .channel('todos-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'todos' },
    (payload) => {
      console.log('할일 변경됨!', payload)
      // 화면 자동 업데이트
    }
  )
  .subscribe()
```

---

## 9. 비용 예측 상세

### 월별 비용 시뮬레이션

```
사용자 100명 (테스트 단계):
  Supabase Free          ₩0
  Alpha Vantage Free     ₩0
  Naver API Free         ₩0
  Claude API (Haiku)     ₩3,000/월
  ──────────────────────────
  합계:                   약 ₩3,000/월

사용자 5,000명 (성장기):
  Supabase Pro           ₩33,000/월
  Alpha Vantage 유료      ₩65,000/월
  Claude API             ₩150,000/월
  Vercel Pro             ₩26,000/월
  Firebase (FCM만)       ₩0
  ──────────────────────────
  합계:                   약 ₩274,000/월
  
  수익 (프리미엄 5%):
  5,000 × 5% = 250명 × ₩2,900 = ₩725,000
  광고 수익:              약 ₩150,000
  ──────────────────────────
  순이익:                 약 ₩601,000/월 ✅

사용자 50,000명 (안정기):
  인프라 비용 합계:        약 ₩1,500,000/월
  
  수익 (프리미엄 5%):
  50,000 × 5% = 2,500명 × ₩2,900 = ₩7,250,000
  광고 수익:              약 ₩1,500,000
  ──────────────────────────
  순이익:                 약 ₩7,250,000/월 ✅
```

---

## 10. 구현 우선순위 (추천 순서)

```
Sprint 1 (2주): 기초 백엔드
  ☐ Supabase 프로젝트 생성
  ☐ DB 테이블 생성 (위 SQL 실행)
  ☐ RLS 보안 정책 설정
  ☐ 회원가입/로그인 구현
  ☐ 할일 CRUD 구현

Sprint 2 (2주): 목표관리
  ☐ 연/월/주/일 목표 CRUD
  ☐ 목표 간 연결 (parent_goal_id)
  ☐ 진행률 자동 계산 로직
  ☐ 목표관리 UI 구현

Sprint 3 (2주): 알림 시스템
  ☐ Firebase FCM 연동
  ☐ 59분 알람 Edge Function
  ☐ 7:20 할일 알림 Edge Function
  ☐ 알림 기록 저장

Sprint 4 (2주): 주식/키워드
  ☐ Alpha Vantage API 연동
  ☐ Naver 검색 API 연동
  ☐ 키워드 추적 기능
  ☐ 7:10 주식 요약 Edge Function

Sprint 5 (2주): AI + 캘린더
  ☐ Claude API 연동
  ☐ 10:00 업무 요약 기능
  ☐ Google Calendar OAuth 연동
  ☐ 캘린더 일정 표시

Sprint 6 (2주): 수익화
  ☐ Revenue Cat 인앱 결제 연동
  ☐ 프리미엄/무료 기능 분리
  ☐ 경제 상식 콘텐츠 관리
  ☐ 앱스토어 출시 준비
```
