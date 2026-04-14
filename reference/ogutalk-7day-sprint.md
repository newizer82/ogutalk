# 오구톡 — 7일 스프린트 실행 계획서

> 목표: 1주일 안에 실제 작동하는 MVP를 만들어 핸드폰에 설치하기  
> 전략: "완벽하게" 가 아니라 "작동하게" 만든다  
> 결과물: PWA (웹앱) — 핸드폰 홈화면에 설치 가능한 앱

---

## 🎯 1주일 MVP에 포함할 기능 (현실적 범위)

```
포함 ✅                              제외 ❌ (2주차 이후)
─────────────────────────────────────────────────────────
✅ 회원가입/로그인                    ❌ Google Calendar 연동
✅ 59분 알람 + 오구 사운드            ❌ AI 업무 요약 (Claude API)
✅ 시간대별 알람 설정                 ❌ 인앱 결제 (프리미엄)
✅ 할일 관리 (추가/완료/삭제)         ❌ SNS 사용시간 연동
✅ 연/월/주/일 목표관리 (기본)        ❌ 실시간 주식 시세
✅ 키워드 등록 + 뉴스 검색            ❌ 10시 업무 요약 알림
✅ 경제 상식 카드                    
✅ 7:20 할일 알림 (브라우저 알림)     
✅ 주식 요약 (샘플 + 무료 API)       
✅ PWA 배포 (핸드폰 설치 가능)       
```

> 💡 **MVP(Minimum Viable Product)** = 최소한의 기능으로 작동하는 제품.
> 완벽함보다 "빨리 만들고 빨리 피드백 받기"가 핵심입니다.

---

## 📅 Day 1 (월요일) — 개발 환경 세팅 + Supabase 구축

### 오전: 도구 설치 (약 1~2시간)

#### Step 1. Node.js 설치

```
1. https://nodejs.org 접속
2. "LTS" 버전 다운로드 (짝수 번호, 예: 20.x.x)
3. 설치 파일 실행 → 모두 "Next" 클릭
4. 설치 확인:
```

```bash
# 터미널(명령 프롬프트)을 열고 입력:
node --version    # v20.x.x 나오면 성공
npm --version     # 10.x.x 나오면 성공
```

> 💡 **터미널 여는 법:**
> - Windows: 시작 → "cmd" 검색 → 명령 프롬프트
> - Mac: Cmd+Space → "터미널" 검색

#### Step 2. VS Code 설치

```
1. https://code.visualstudio.com 접속
2. 다운로드 → 설치
3. 추천 확장 프로그램 설치:
   - Korean Language Pack (한국어)
   - ES7+ React/Redux/React-Native Snippets
   - Prettier (코드 자동 정리)
```

#### Step 3. Git 설치

```
1. https://git-scm.com 접속
2. 다운로드 → 설치 (기본 옵션 그대로)
3. 설치 확인:
```

```bash
git --version     # git version 2.x.x 나오면 성공
```

### 오후: Supabase 프로젝트 생성 (약 2~3시간)

#### Step 4. Supabase 가입 + 프로젝트 만들기

```
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인
   (GitHub 계정이 없으면 https://github.com 에서 먼저 가입)
4. "New Project" 클릭
5. 프로젝트 설정:
   - Organization: 기본값
   - Name: ogutalk
   - Database Password: 안전한 비밀번호 (반드시 메모!)
   - Region: Northeast Asia (Tokyo) ← 한국에서 가장 빠름
6. "Create new project" 클릭 → 2~3분 대기
```

#### Step 5. 데이터베이스 테이블 생성

```
1. Supabase 대시보드 → 왼쪽 메뉴 "SQL Editor" 클릭
2. "New query" 클릭
3. 아래 SQL을 복사해서 붙여넣기
4. "Run" 클릭
```

```sql
-- ============================================
-- 오구톡 데이터베이스 — Day 1 초기 설정
-- ============================================

-- 1. 사용자 프로필
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

-- 2. 알람 설정
CREATE TABLE public.alarm_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  alarm_type TEXT NOT NULL DEFAULT 'hourly_59',
  trigger_hour INTEGER,
  trigger_minute INTEGER DEFAULT 59,
  repeat_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
  content_types TEXT[] DEFAULT '{weather,economy,quotes,todos}',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 목표관리
CREATE TABLE public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  parent_goal_id UUID REFERENCES public.goals(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 할일 목록
CREATE TABLE public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_id UUID REFERENCES public.goals(id),
  due_date DATE,
  due_time TIME,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 관심 키워드
CREATE TABLE public.tracked_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  keyword_type TEXT DEFAULT 'stock',
  ticker_symbol TEXT,
  market TEXT,
  alert_on_change_pct NUMERIC,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 알림 기록
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

-- 7. 경제 상식
CREATE TABLE public.economic_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  difficulty TEXT DEFAULT 'beginner',
  source TEXT,
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. 사용자 설정
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
  hourly_alarm_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
  fcm_token TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 보안 정책 (RLS) — 매우 중요!
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- alarm_settings
CREATE POLICY "Users manage own alarms" ON public.alarm_settings FOR ALL USING (auth.uid() = user_id);

-- goals
CREATE POLICY "Users manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);

-- todos
CREATE POLICY "Users manage own todos" ON public.todos FOR ALL USING (auth.uid() = user_id);

-- tracked_keywords
CREATE POLICY "Users manage own keywords" ON public.tracked_keywords FOR ALL USING (auth.uid() = user_id);

-- notification_log
CREATE POLICY "Users view own notifications" ON public.notification_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notification_log FOR INSERT WITH CHECK (true);

-- economic_tips (공개 콘텐츠)
CREATE POLICY "Anyone can read published tips" ON public.economic_tips FOR SELECT USING (is_published = true);

-- user_preferences
CREATE POLICY "Users manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 자동 프로필 생성 트리거
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nickname');
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  -- 기본 알람 설정 (7시~23시 매시 59분)
  FOR h IN 7..23 LOOP
    INSERT INTO public.alarm_settings (user_id, alarm_type, trigger_hour)
    VALUES (NEW.id, 'hourly_59', h);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 초기 경제 상식 데이터
-- ============================================

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

> 💡 **하나씩 차근차근!**  
> SQL이 길어 보이지만, 복사해서 붙여넣고 Run만 누르면 됩니다.
> 에러가 나면 Claude에게 에러 메시지를 그대로 보내주세요.

#### Step 6. Supabase 인증 설정

```
1. Supabase 대시보드 → Authentication → Providers
2. "Email" 활성화 확인 (기본 활성화됨)
3. Settings → URL Configuration에서:
   - Site URL: http://localhost:5173 (개발 중)
   - 나중에 배포 후 실제 URL로 변경
```

#### Step 7. API 키 확인 (내일 사용)

```
1. Supabase 대시보드 → Settings → API
2. 두 가지 키를 메모:
   - Project URL: https://xxxxx.supabase.co
   - anon/public key: eyJhbGci... (긴 문자열)
3. 이 키들은 내일 코드에서 사용합니다
```

### ✅ Day 1 완료 체크리스트

```
□ Node.js 설치 완료 → node --version 확인
□ VS Code 설치 완료
□ Git 설치 완료 → git --version 확인
□ GitHub 계정 생성 완료
□ Supabase 프로젝트 생성 완료
□ SQL 실행으로 8개 테이블 생성 완료
□ 경제 상식 초기 데이터 10개 입력 완료
□ API 키 2개 메모 완료
```

---

## 📅 Day 2 (화요일) — React 프로젝트 + 로그인 구현

### 오전: React 프로젝트 생성 (약 2시간)

#### Step 1. 프로젝트 생성

```bash
# 원하는 위치로 이동 (예: 바탕화면)
cd Desktop

# Vite로 React 프로젝트 생성
npm create vite@latest ogutalk -- --template react

# 프로젝트 폴더로 이동
cd ogutalk

# 필요한 패키지 모두 설치
npm install @supabase/supabase-js    # Supabase 연결
npm install react-router-dom         # 페이지 이동
npm install lucide-react             # 아이콘
npm install date-fns                 # 날짜 처리
npm install -D vite-plugin-pwa       # PWA 지원

# 개발 서버 실행
npm run dev
```

```
브라우저에서 http://localhost:5173 열기
→ Vite + React 기본 화면이 보이면 성공!
```

#### Step 2. 폴더 구조 만들기

VS Code에서 ogutalk 폴더를 열고, 아래 구조로 파일/폴더를 생성:

```
ogutalk/
├── public/
│   └── sounds/
│       └── (Day 4에 추가)
├── src/
│   ├── components/          ← 폴더 생성
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── TabBar.jsx
│   │   │   └── Layout.jsx
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
│   │   ├── settings/
│   │   │   ├── AlarmSettings.jsx
│   │   │   ├── ContentSettings.jsx
│   │   │   └── ProfileSettings.jsx
│   │   └── auth/
│   │       ├── LoginForm.jsx
│   │       └── SignupForm.jsx
│   ├── hooks/               ← 폴더 생성
│   │   ├── useAlarm.js
│   │   ├── useSound.js
│   │   └── useAuth.js
│   ├── lib/                 ← 폴더 생성
│   │   └── supabase.js
│   ├── pages/               ← 폴더 생성
│   │   ├── HomePage.jsx
│   │   ├── GoalsPage.jsx
│   │   ├── TodosPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── AuthPage.jsx
│   ├── styles/              ← 폴더 생성
│   │   └── theme.js
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```

> 💡 **폴더만 먼저 만들고, 파일은 해당 날짜에 작성합니다.**
> 빈 파일이라도 괜찮아요. 구조를 먼저 잡는 게 중요합니다.

#### Step 3. Supabase 연결 파일 작성

```javascript
// src/lib/supabase.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://여기에-프로젝트URL.supabase.co'
const supabaseAnonKey = '여기에-anon-key-붙여넣기'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

> ⚠️ **Day 1에서 메모한 URL과 키를 여기에 넣으세요!**

### 오후: 로그인/회원가입 구현 (약 3~4시간)

#### Step 4. 인증 훅 만들기

```javascript
// src/hooks/useAuth.js

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 현재 로그인 상태 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 로그인/로그아웃 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 이메일 회원가입
  const signUp = async (email, password, nickname) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname }
      }
    })
    return { data, error }
  }

  // 이메일 로그인
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  // 로그아웃
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, signUp, signIn, signOut }
}
```

#### Step 5. 로그인 화면 만들기

```javascript
// src/components/auth/LoginForm.jsx

import { useState } from 'react'

export default function LoginForm({ onSignIn, onToggle }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { error } = await onSignIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.logoSection}>
        <span style={{ fontSize: 48 }}>⏱️</span>
        <h1 style={styles.logoText}>오구톡</h1>
        <p style={styles.subtitle}>59분의 알림, 시간을 되찾는 습관</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
        
        {error && <p style={styles.error}>{error}</p>}
        
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p style={styles.toggleText}>
        계정이 없으신가요?{' '}
        <span style={styles.toggleLink} onClick={onToggle}>
          회원가입
        </span>
      </p>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: 420, margin: '0 auto', padding: '60px 24px',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a, #1e293b)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  logoSection: { textAlign: 'center', marginBottom: 40 },
  logoText: {
    fontSize: 32, fontWeight: 800, margin: '8px 0 4px',
    background: 'linear-gradient(135deg, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  subtitle: { color: '#64748b', fontSize: 14 },
  form: { width: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '14px 16px', borderRadius: 12,
    border: '1px solid #334155', background: 'rgba(30,41,59,0.8)',
    color: '#e2e8f0', fontSize: 15, outline: 'none',
  },
  button: {
    padding: '14px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    marginTop: 8,
  },
  error: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  toggleText: { color: '#64748b', fontSize: 14, marginTop: 20 },
  toggleLink: { color: '#818cf8', cursor: 'pointer', fontWeight: 600 },
}
```

#### Step 6. App.jsx에 라우팅 설정

```javascript
// src/App.jsx

import { useAuth } from './hooks/useAuth'
import LoginForm from './components/auth/LoginForm'
// (다른 컴포넌트들은 해당 날짜에 추가)

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', display: 'flex', 
        alignItems: 'center', justifyContent: 'center',
        background: '#0f172a', color: '#818cf8', fontSize: 24 
      }}>
        ⏱️ 오구톡 로딩중...
      </div>
    )
  }

  if (!user) {
    return <LoginForm onSignIn={signIn} onToggle={() => {}} />
  }

  // 로그인 완료 후 메인 화면 (Day 3에 구현)
  return (
    <div style={{ 
      maxWidth: 420, margin: '0 auto', minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a, #1e293b)',
      color: '#e2e8f0', padding: 20, textAlign: 'center' 
    }}>
      <h1>⏱️ 오구톡</h1>
      <p>환영합니다, {user.email}님!</p>
      <p style={{ color: '#64748b', marginTop: 20 }}>
        메인 화면은 Day 3에 구현됩니다
      </p>
      <button onClick={signOut} style={{
        marginTop: 20, padding: '10px 20px', borderRadius: 10,
        border: '1px solid #334155', background: 'transparent',
        color: '#94a3b8', cursor: 'pointer'
      }}>
        로그아웃
      </button>
    </div>
  )
}
```

### ✅ Day 2 완료 체크리스트

```
□ React 프로젝트 생성 완료 (npm run dev 확인)
□ 폴더 구조 생성 완료
□ Supabase 연결 파일 작성 완료
□ 로그인/회원가입 화면 구현 완료
□ 실제로 회원가입 → 로그인 테스트 성공
□ Supabase 대시보드 → Authentication에서 사용자 확인
```

---

## 📅 Day 3 (수요일) — 메인 화면 + 할일 관리

### 오전: 메인 홈 화면 (약 2~3시간)

기존 프로토타입(ogutalk.jsx)의 홈 탭을 컴포넌트 단위로 분리하여 구현합니다.

```
구현할 컴포넌트:
├── Layout.jsx     — 전체 레이아웃 (헤더 + 탭바)
├── Header.jsx     — 로고, 사용자 이름
├── TabBar.jsx     — 하단 탭 (홈/할일/목표/설정)
├── Clock.jsx      — 실시간 시계 (프로토타입에서 가져오기)
└── StatusCards.jsx — 다음 알람, 몰입시간, 오늘 알람 횟수
```

### 오후: 할일 CRUD (약 3~4시간)

```
CRUD란? 데이터의 4가지 기본 동작:
  C = Create (만들기)  → 할일 추가
  R = Read (읽기)     → 할일 목록 보기
  U = Update (수정)   → 할일 완료 체크
  D = Delete (삭제)   → 할일 삭제
```

```javascript
// src/hooks/useTodos.js — 할일 관리 로직

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTodos() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)

  // 할일 목록 가져오기 (R = Read)
  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false })
    
    if (!error) setTodos(data)
    setLoading(false)
  }

  // 할일 추가 (C = Create)
  const addTodo = async (title, dueDate, priority = 'medium') => {
    const { data, error } = await supabase
      .from('todos')
      .insert({ title, due_date: dueDate, priority })
      .select()
      .single()
    
    if (!error) setTodos(prev => [data, ...prev])
    return { data, error }
  }

  // 할일 완료/미완료 토글 (U = Update)
  const toggleTodo = async (id, isCompleted) => {
    const { error } = await supabase
      .from('todos')
      .update({ 
        is_completed: !isCompleted,
        completed_at: !isCompleted ? new Date().toISOString() : null
      })
      .eq('id', id)
    
    if (!error) {
      setTodos(prev => prev.map(t => 
        t.id === id 
          ? { ...t, is_completed: !isCompleted }
          : t
      ))
    }
  }

  // 할일 삭제 (D = Delete)
  const deleteTodo = async (id) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
    
    if (!error) setTodos(prev => prev.filter(t => t.id !== id))
  }

  useEffect(() => { fetchTodos() }, [])

  return { todos, loading, addTodo, toggleTodo, deleteTodo, fetchTodos }
}
```

### ✅ Day 3 완료 체크리스트

```
□ 메인 홈 화면 표시 (시계, 상태 카드)
□ 하단 탭 바 동작 (홈/할일/목표/설정)
□ 할일 추가 기능 동작
□ 할일 완료 체크 동작
□ 할일 삭제 동작
□ 새로고침 해도 할일이 유지되는지 확인 (DB 저장)
```

---

## 📅 Day 4 (목요일) — 목표관리 + 알람 시스템

### 오전: 연/월/주/일 목표관리 (약 3~4시간)

```javascript
// src/hooks/useGoals.js — 목표 관리 로직

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useGoals() {
  const [goals, setGoals] = useState([])

  const fetchGoals = async (goalType) => {
    const { data } = await supabase
      .from('goals')
      .select('*, todos(*)')  // 목표에 연결된 할일도 함께 가져오기
      .eq('goal_type', goalType)
      .eq('status', 'active')
      .order('sort_order')
    
    if (data) setGoals(data)
  }

  const addGoal = async (goal) => {
    const { data, error } = await supabase
      .from('goals')
      .insert(goal)
      .select()
      .single()
    
    if (!error) setGoals(prev => [...prev, data])
    return { data, error }
  }

  const updateProgress = async (goalId, progress) => {
    await supabase
      .from('goals')
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', goalId)
  }

  return { goals, fetchGoals, addGoal, updateProgress }
}
```

```
구현할 화면:
├── GoalsPage.jsx  — 탭 전환 (연간/월간/주간/일간)
├── GoalList.jsx   — 목표 카드 리스트
├── GoalForm.jsx   — 새 목표 추가 모달
└── GoalProgress.jsx — 진행률 바 + 하위 목표 표시
```

### 오후: 알람 시스템 (약 2~3시간)

```javascript
// src/hooks/useAlarm.js — 알람 로직

import { useState, useEffect, useRef, useCallback } from 'react'

// Web Audio API로 "오구" 사운드 생성
const playOguSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, ctx.currentTime)
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch (e) {
    console.log('Audio not available')
  }
}

// 브라우저 알림 권한 요청
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

// 브라우저 알림 보내기
const showBrowserNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png'
    })
  }
}

export function useAlarm(alarmSettings, soundEnabled) {
  const [alarmTriggered, setAlarmTriggered] = useState(false)
  const lastAlarmHour = useRef(-1)

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const hour = now.getHours()
      const min = now.getMinutes()
      const sec = now.getSeconds()

      if (min === 59 && sec === 0 && lastAlarmHour.current !== hour) {
        // 이 시간에 알람이 설정되어 있는지 확인
        const isEnabled = alarmSettings?.some(
          a => a.trigger_hour === hour && a.is_enabled
        )
        
        if (isEnabled) {
          lastAlarmHour.current = hour
          if (soundEnabled) playOguSound()
          showBrowserNotification(
            '⏰ 오구!',
            `${hour + 1}시 정각이 다가옵니다. 잠시 쉬어가세요!`
          )
          setAlarmTriggered(true)
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [alarmSettings, soundEnabled])

  const dismissAlarm = () => setAlarmTriggered(false)

  return { alarmTriggered, dismissAlarm, playOguSound }
}
```

### ✅ Day 4 완료 체크리스트

```
□ 연간 목표 추가/조회 동작
□ 월간/주간/일간 목표 탭 전환 동작
□ 목표 진행률 표시
□ 59분 알람 동작 (테스트 버튼으로 확인)
□ "오구" 사운드 재생 확인
□ 브라우저 알림 표시 확인
```

---

## 📅 Day 5 (금요일) — 키워드/경제 + 설정 화면

### 오전: 키워드 추적 + 뉴스 (약 3시간)

```javascript
// src/hooks/useKeywords.js

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useKeywords() {
  const [keywords, setKeywords] = useState([])
  const [news, setNews] = useState({})

  const fetchKeywords = async () => {
    const { data } = await supabase
      .from('tracked_keywords')
      .select('*')
      .order('sort_order')
    if (data) setKeywords(data)
  }

  const addKeyword = async (keyword, type = 'stock', ticker = null) => {
    const { data, error } = await supabase
      .from('tracked_keywords')
      .insert({
        keyword,
        keyword_type: type,
        ticker_symbol: ticker,
        market: ticker?.includes('.KS') ? 'KR' : 'US'
      })
      .select()
      .single()
    
    if (!error) setKeywords(prev => [...prev, data])
    return { data, error }
  }

  // 뉴스 검색 (Naver API를 직접 호출하려면 CORS 문제로
  // Supabase Edge Function을 거쳐야 합니다.
  // MVP에서는 간단한 대안을 사용)
  const fetchNewsForKeyword = async (keyword) => {
    // MVP: RSS 피드 또는 무료 뉴스 API 활용
    // 추후: Supabase Edge Function에서 Naver API 호출
    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword)}&pageSize=5&apiKey=YOUR_KEY`
      )
      const data = await response.json()
      setNews(prev => ({ ...prev, [keyword]: data.articles || [] }))
    } catch (e) {
      console.log('News fetch error:', e)
    }
  }

  useEffect(() => { fetchKeywords() }, [])

  return { keywords, news, addKeyword, fetchNewsForKeyword }
}
```

```
구현할 화면:
├── KeywordList.jsx — 관심 키워드 목록 + 추가 버튼
│   예: [테슬라 TSLA] [삼성전자 005930] [비트코인]
│
└── KeywordNews.jsx — 키워드 터치 시 최신 뉴스 표시
    예: "테슬라, 자율주행 FSD v13 업데이트 발표 — 2시간 전"
```

### 오후: 경제 상식 + 설정 화면 (약 3시간)

```javascript
// 경제 상식 가져오기 (Day 1에 넣은 데이터)
const fetchDailyTip = async () => {
  const { data } = await supabase
    .from('economic_tips')
    .select('*')
    .eq('is_published', true)
    .limit(1)
    .order('view_count', { ascending: true })  // 가장 적게 본 것
  
  return data?.[0]
}

// 설정 화면에 구현할 것:
// ├── 알람 시간대 설정 (시간별 토글)
// ├── 콘텐츠 선택 (날씨/경제/명언/할일 토글)
// ├── 사운드 설정
// ├── 키워드 관리
// └── 프로필 수정
```

### ✅ Day 5 완료 체크리스트

```
□ 키워드 추가/삭제 동작
□ 키워드별 뉴스 표시 (최소 샘플 데이터)
□ 경제 상식 카드 표시
□ 설정 화면 — 알람 시간대 토글 동작
□ 설정 화면 — 콘텐츠 선택 토글 동작
□ 설정 변경이 DB에 저장되는지 확인
```

---

## 📅 Day 6 (토요일) — PWA 설정 + UI 다듬기

### 오전: PWA 설정 (약 2시간)

```javascript
// vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '오구톡 - 59분의 알림',
        short_name: '오구톡',
        description: '59분에 정각을 알려주는 과몰입 방지 앱',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // 오프라인에서도 기본 기능 동작하도록 캐시
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 }
            }
          }
        ]
      }
    })
  ]
})
```

```
앱 아이콘 만들기:
1. https://www.canva.com 에서 512x512 정사각형 디자인
   - 배경: #0f172a (다크 네이비)
   - 가운데: ⏱️ 또는 "59" 텍스트 + 보라색 그라데이션
2. 다운로드 → icon-512.png 으로 저장
3. https://realfavicongenerator.net 에서 192x192 버전도 생성
4. public/ 폴더에 저장
```

### 오후: UI 완성도 높이기 (약 4시간)

```
집중할 부분:
1. 로딩 상태 — 데이터 불러올 때 스켈레톤 or 스피너 표시
2. 빈 상태 — 할일이 없을 때 "할일을 추가해보세요!" 표시
3. 에러 처리 — 네트워크 오류 시 사용자 친화적 메시지
4. 애니메이션 — 탭 전환, 알람 팝업에 부드러운 전환 효과
5. 반응형 — 작은 폰에서도 잘 보이도록 확인
```

### ✅ Day 6 완료 체크리스트

```
□ PWA 설정 완료
□ 앱 아이콘 제작 완료
□ npm run build 에러 없이 성공
□ 로딩/빈 상태/에러 화면 구현
□ 전체 화면 흐름 테스트
   └ 회원가입 → 로그인 → 홈 → 할일추가 → 목표설정 
     → 키워드등록 → 설정변경 → 알람테스트 → 로그아웃
```

---

## 📅 Day 7 (일요일) — 배포 + 테스트

### 오전: GitHub + Vercel 배포 (약 2시간)

#### Step 1. GitHub에 코드 올리기

```bash
# ogutalk 폴더에서 실행
git init
git add .
git commit -m "오구톡 v1.0 MVP"

# GitHub에서 새 저장소 만들기:
# 1. github.com → New repository
# 2. 이름: ogutalk
# 3. Private (비공개) 선택
# 4. Create repository

# 연결 및 업로드
git remote add origin https://github.com/여기에-유저명/ogutalk.git
git branch -M main
git push -u origin main
```

#### Step 2. Vercel에 배포하기

```
1. https://vercel.com 접속
2. "Sign up" → GitHub 계정으로 로그인
3. "Add New Project" 클릭
4. GitHub 저장소 목록에서 "ogutalk" 선택
5. Framework Preset: Vite (자동 감지됨)
6. 환경 변수 설정 (중요!):
   - VITE_SUPABASE_URL = https://xxxxx.supabase.co
   - VITE_SUPABASE_ANON_KEY = eyJhbGci...
7. "Deploy" 클릭 → 1~2분 대기
8. 완료! https://ogutalk.vercel.app 같은 URL 생성
```

> ⚠️ **환경 변수를 쓰려면 코드도 수정 필요:**
> ```javascript
> // src/lib/supabase.js 를 이렇게 변경:
> const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
> const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
> ```

#### Step 3. Supabase URL 업데이트

```
Supabase 대시보드 → Authentication → URL Configuration
  - Site URL: https://ogutalk.vercel.app (배포된 주소로 변경)
  - Redirect URLs: https://ogutalk.vercel.app/** 추가
```

### 오후: 실제 테스트 (약 3~4시간)

#### 핸드폰에 설치하기

```
안드로이드:
1. Chrome으로 https://ogutalk.vercel.app 접속
2. 주소창 옆 "설치" 아이콘 또는 메뉴 → "홈 화면에 추가"
3. 홈 화면에 오구톡 아이콘 생성!

iPhone:
1. Safari로 https://ogutalk.vercel.app 접속
2. 하단 공유 버튼 (□↑) 탭
3. "홈 화면에 추가" 선택
4. 홈 화면에 오구톡 아이콘 생성!
```

#### 테스트 체크리스트

```
기능 테스트:
□ 회원가입 정상 동작
□ 로그인/로그아웃 정상 동작
□ 할일 추가 → DB에 저장 확인
□ 할일 완료 체크 → 상태 변경 확인
□ 목표 추가 (연/월/주/일)
□ 키워드 등록
□ 경제 상식 카드 표시
□ 알람 테스트 버튼 → 소리 + 팝업
□ 설정 변경 → 저장 확인

디바이스 테스트:
□ 내 핸드폰에서 정상 표시
□ 다른 사람 핸드폰에서 테스트
□ PC 브라우저에서 테스트
□ 가로 모드에서도 깨지지 않는지

성능 테스트:
□ 첫 로딩 3초 이내
□ 페이지 전환 부드러운지
□ 알람 소리 볼륨 적절한지
```

### ✅ Day 7 완료 체크리스트

```
□ GitHub에 코드 업로드 완료
□ Vercel 배포 완료 → URL 확인
□ 핸드폰에 PWA 설치 완료
□ 전체 기능 테스트 통과
□ 최소 2명에게 공유해서 피드백 받기
□ 발견된 버그 목록 작성 (2주차에 수정)
```

---

## 📋 1주차 이후 — 2주차 계획 미리보기

```
Day 8~9:   버그 수정 + 피드백 반영
Day 10~11: Supabase Edge Function으로 주식 API 연동
Day 12:    7:10 주식 알림, 7:20 할일 알림 자동화
Day 13:    Claude API 연동 → 업무 요약 기능
Day 14:    Google Calendar 연동 시작
```

---

## ⚠️ 주의사항 및 팁

### 막힐 때 대처법

```
1. 에러 메시지를 그대로 복사해서 Claude에게 물어보기
2. 에러 메시지를 Google에 검색하기
3. Supabase 공식 문서: https://supabase.com/docs
4. React 공식 문서: https://react.dev
5. 하루 진도가 안 나가면, 그 단계를 더 작게 쪼개기
```

### 자주 만나는 에러와 해결법

```
"CORS error" 
→ Supabase URL이 올바른지 확인
→ Supabase Dashboard → Settings → API에서 URL 재확인

"Invalid API key"
→ anon key를 정확히 복사했는지 확인 (앞뒤 공백 주의)

"Row level security policy violation"
→ RLS 정책 SQL이 제대로 실행되었는지 확인
→ Supabase → Table Editor → 해당 테이블 → RLS 탭 확인

"npm run dev에서 에러"
→ node_modules 삭제 후 npm install 다시 실행:
   rm -rf node_modules package-lock.json
   npm install

"Notification permission denied"
→ 브라우저 설정에서 알림 허용으로 변경
→ Chrome: 주소창 왼쪽 자물쇠 아이콘 → 알림 → 허용
```

### 매일 습관

```
코딩 시작 전:
  git pull (최신 코드 받기)

코딩 끝날 때:
  git add .
  git commit -m "Day N: 작업 내용 요약"
  git push

Vercel은 GitHub push 시 자동 배포됩니다!
```
