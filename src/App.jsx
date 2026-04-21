import { useState, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTodos } from './hooks/useTodos'
import { useGoals } from './hooks/useGoals'
import { useAlarm, playOguSound, speakTime } from './hooks/useAlarm'
import Layout from './components/layout/Layout'
import ImmersionPopup from './components/alarm/ImmersionPopup'
import AlarmPopup from './components/alarm/AlarmPopup'
import HomePage from './pages/HomePage'
import GoalsPage from './pages/GoalsPage'
import TodosPage from './pages/TodosPage'
import KeywordsPage from './pages/KeywordsPage'
import SettingsPage from './pages/SettingsPage'
import { gradients, S } from './styles/theme'

// ── 로그인 모달 (바텀시트)
function LoginModal({ open, onClose, onLogin }) {
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const { signIn, signUp, signInWithKakao } = useAuth()

  if (!open) return null

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return }
    try {
      if (authMode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      onLogin(email)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={S.modalBg} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⏱️</div>
          <div style={{
            fontSize: 22, fontWeight: 800,
            background: gradients.logo,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>오구톡</div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            {authMode === 'login' ? '로그인하고 모든 기능을 사용하세요' : '새 계정을 만들어 시작하세요'}
          </div>
        </div>

        <input
          type="email" placeholder="이메일" value={email}
          onChange={e => setEmail(e.target.value)} style={S.input}
        />
        <input
          type="password" placeholder="비밀번호" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ ...S.input, marginTop: 8 }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        {authMode === 'signup' && (
          <input type="password" placeholder="비밀번호 확인" style={{ ...S.input, marginTop: 8 }} />
        )}
        {error && (
          <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{error}</div>
        )}

        <button style={{ ...S.primaryBtn, marginTop: 16 }} onClick={handleSubmit}>
          {authMode === 'login' ? '로그인' : '회원가입'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#475569', fontSize: 11 }}>또는</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* 카카오 로그인 UI */}
        <button
          style={{
            width: '100%', padding: '12px', borderRadius: 14, border: 'none',
            background: '#FEE500', color: '#3A1D1D', fontWeight: 800, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onClick={async () => { try { await signInWithKakao() } catch(e) { setError(e.message) } }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1C4.582 1 1 3.79 1 7.237c0 2.178 1.454 4.092 3.644 5.201l-.928 3.455c-.083.308.266.55.533.37L8.47 13.48A9.17 9.17 0 009 13.474c4.418 0 8-2.79 8-6.237C17 3.789 13.418 1 9 1z" fill="#3A1D1D"/>
          </svg>
          카카오로 시작하기
        </button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          {authMode === 'login' ? (
            <span style={{ color: '#64748b', fontSize: 12 }}>
              계정이 없으신가요?{' '}
              <span style={{ color: '#818cf8', cursor: 'pointer' }} onClick={() => setAuthMode('signup')}>회원가입</span>
            </span>
          ) : (
            <span style={{ color: '#64748b', fontSize: 12 }}>
              이미 계정이 있으신가요?{' '}
              <span style={{ color: '#818cf8', cursor: 'pointer' }} onClick={() => setAuthMode('login')}>로그인</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 메인 App ───────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('home')

  // 인증 (옵션 — 비로그인도 앱 사용 가능)
  const { user, signOut } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [localEmail, setLocalEmail] = useState('')
  const isLoggedIn = !!user || !!localEmail

  // 프리미엄
  const [isPremium, setIsPremium] = useState(false)

  // 알람 설정 (전역 상태)
  const [oguTone, setOguTone]           = useState('유쾌')
  const [oguRepeat, setOguRepeat]       = useState(2)
  const [voiceChar, setVoiceChar]       = useState('girl')
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [alarmMode, setAlarmMode]       = useState('both')
  const [alarmHours, setAlarmHours]     = useState(() => {
    const h = {}; for (let i = 7; i <= 23; i++) h[i] = true; return h
  })
  const [immersionAlerts, setImmersionAlerts] = useState({ m30: true, m60: true })

  // 기능 활성화 (프리미엄)
  const [premiumFeatures, setPremiumFeatures] = useState({
    todos: true, goals: true, keywords: true, scheduleAlerts: false,
  })

  // Supabase 훅 (로그인 시)
  const userId = user?.id ?? null
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos(userId)
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useGoals(userId)

  // 로컬 todos/goals (비로그인 fallback)
  const [localTodos, setLocalTodos] = useState([
    { id: '1', title: '기획서 작성', completed: false, priority: 'high'   },
    { id: '2', title: '운동 30분',   completed: false, priority: 'medium' },
    { id: '3', title: '독서 20분',   completed: true,  priority: 'low'    },
  ])
  const [localGoals, setLocalGoals] = useState({
    yearly:  [{ id: 'y1', title: '건강한 몸 만들기', progress: 68, desc: '주 4회 운동 목표' }],
    monthly: [{ id: 'm1', title: '4월 운동 20회',    progress: 60, desc: '현재 12/20회' }],
    weekly:  [
      { id: 'w1', title: '이번 주 운동 5회',   progress: 60, desc: '현재 3/5회' },
      { id: 'w2', title: '경제 뉴스 매일 읽기', progress: 71, desc: '5/7일 완료' },
    ],
    daily: [{ id: 'd1', title: '오늘 러닝 30분', progress: 0, desc: '오늘의 운동' }],
  })

  // 키워드
  const [userKeywords, setUserKeywords] = useState([
    { id: 'k1', text: '테슬라',   ticker: 'TSLA'   },
    { id: 'k2', text: '삼성전자', ticker: '005930' },
    { id: 'k3', text: '비트코인', ticker: 'BTC'    },
    { id: 'k4', text: '엔비디아', ticker: 'NVDA'   },
  ])

  // 실제 사용할 todos/goals (로그인 여부에 따라 분기)
  const activeTodos = userId
    ? todos.map(t => ({ ...t, priority: t.priority || 'medium' }))
    : localTodos
  const activeTodosForAlarm = activeTodos.filter(t => !t.completed).length

  // goals를 배열로 flatten (홈 화면용)
  const allGoalsList = userId
    ? goals
    : Object.values(localGoals).flat()

  // 알람 훅
  const {
    alarmCount, immersionSec, showAlarmPopup, alarmContent, closeAlarmPopup,
    immersionPopup, immersionLevel, closeImmersionPopup, resetImmersion, fireAlarm,
  } = useAlarm({ oguTone, oguRepeat, voiceChar, voiceEnabled, alarmMode, alarmHours, immersionAlerts })

  const handleLogin = useCallback((email) => {
    setLocalEmail(email)
  }, [])

  const handleSignOut = useCallback(() => {
    if (user) signOut()
    setLocalEmail('')
    setIsPremium(false)
  }, [user, signOut])

  const displayEmail = user?.email || localEmail

  // 몰입 경고 팝업 (전체화면)
  if (immersionPopup) {
    return (
      <ImmersionPopup
        level={immersionLevel}
        immersionSec={immersionSec}
        onReset={resetImmersion}
        onDismiss={closeImmersionPopup}
      />
    )
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isLoggedIn={isLoggedIn}
        displayEmail={displayEmail}
        isPremium={isPremium}
        onLoginOpen={() => setLoginOpen(true)}
        onSignOut={handleSignOut}
      >
        {activeTab === 'home' && (
          <HomePage
            alarmCount={alarmCount}
            immersionSec={immersionSec}
            todos={activeTodos}
            goals={localGoals}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            premiumFeatures={premiumFeatures}
            onTabChange={setActiveTab}
            alarmHours={alarmHours}
            oguTone={oguTone}
            onTestAlarm={fireAlarm}
          />
        )}
        {activeTab === 'todos' && (
          <TodosPage
            todos={activeTodos}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            onAdd={userId ? addTodo : t => setLocalTodos(p => [{ id: Date.now().toString(), title: t, completed: false, priority: 'medium' }, ...p])}
            onToggle={userId ? toggleTodo : id => setLocalTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t))}
            onDelete={userId ? deleteTodo : id => setLocalTodos(p => p.filter(t => t.id !== id))}
          />
        )}
        {activeTab === 'goals' && (
          <GoalsPage
            goals={localGoals}
            setGoals={setLocalGoals}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
          />
        )}
        {activeTab === 'keywords' && (
          <KeywordsPage
            userKeywords={userKeywords}
            setUserKeywords={setUserKeywords}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsPage
            isLoggedIn={isLoggedIn}
            displayEmail={displayEmail}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            premiumFeatures={premiumFeatures}
            setPremiumFeatures={setPremiumFeatures}
            oguTone={oguTone}
            setOguTone={setOguTone}
            oguRepeat={oguRepeat}
            setOguRepeat={setOguRepeat}
            voiceChar={voiceChar}
            setVoiceChar={setVoiceChar}
            voiceEnabled={voiceEnabled}
            setVoiceEnabled={setVoiceEnabled}
            alarmMode={alarmMode}
            setAlarmMode={setAlarmMode}
            alarmHours={alarmHours}
            setAlarmHours={setAlarmHours}
            immersionAlerts={immersionAlerts}
            setImmersionAlerts={setImmersionAlerts}
            immersionSec={immersionSec}
            onResetImmersion={resetImmersion}
            onTestAlarm={fireAlarm}
            todos={activeTodos}
            goals={localGoals}
            userKeywords={userKeywords}
            onLoginOpen={() => setLoginOpen(true)}
            onSignOut={handleSignOut}
            playSound={playOguSound}
            speakTimePreview={() => speakTime(voiceChar, new Date().getHours(), oguRepeat)}
          />
        )}
      </Layout>

      {/* 알람 팝업 */}
      {showAlarmPopup && alarmContent && (
        <AlarmPopup
          alarmContent={alarmContent}
          pendingCount={activeTodosForAlarm}
          oguTone={oguTone}
          onClose={closeAlarmPopup}
        />
      )}

      {/* 로그인 모달 */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
      />
    </>
  )
}
