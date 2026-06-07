import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTodos } from './hooks/useTodos'
import { useGoals } from './hooks/useGoals'
import { useAlarm, playOguSound, unlockAudio } from './hooks/useAlarm'
import { useCustomAlarms } from './hooks/useCustomAlarms'
import { loadSettings, saveSettings } from './lib/settings'
import { IS_NATIVE } from './lib/capacitor'
import { initAdMob, showBanner, hideBanner, resumeBanner, isAdFree, BANNER_HEIGHT_PX } from './lib/admob'
import Layout from './components/layout/Layout'
import AlarmPopup from './components/alarm/AlarmPopup'
import HomePage from './pages/HomePage'
import GoalsPage from './pages/GoalsPage'
import TodosPage from './pages/TodosPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import AlarmsPage from './pages/AlarmsPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { gradients, S } from './styles/theme'

// ── 뒤로가기 더블 프레스 종료 패턴 ────────────────────────────────
// React state로 두면 클로저 함정에 빠질 수 있어 모듈 스코프 일반 변수로 관리
let lastBackPressAt = 0
const EXIT_DOUBLE_PRESS_WINDOW = 2000   // 2초

// ── 로그인 모달 (바텀시트)
function LoginModal({ open, onClose, onLogin }) {
  const [authMode, setAuthMode] = useState('login')  // 'login' | 'signup' | 'reset'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')      // 성공 안내 메시지
  const { signIn, signUp, signInWithKakao, resetPassword } = useAuth()

  if (!open) return null

  const handleSubmit = async () => {
    setError(''); setInfo('')

    // 비밀번호 재설정 모드 — 이메일만 필요
    if (authMode === 'reset') {
      if (!email) { setError('이메일을 입력해주세요.'); return }
      try {
        await resetPassword(email)
        setInfo('재설정 메일을 보냈습니다. 메일함을 확인해주세요.')
      } catch (err) {
        setError(err.message)
      }
      return
    }

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
            {authMode === 'login'  && '로그인하고 모든 기능을 사용하세요'}
            {authMode === 'signup' && '새 계정을 만들어 시작하세요'}
            {authMode === 'reset'  && '가입하신 이메일을 입력하시면 재설정 링크를 보내드려요'}
          </div>
        </div>

        <input
          type="email" placeholder="이메일" value={email}
          onChange={e => setEmail(e.target.value)} style={S.input}
          onKeyDown={e => e.key === 'Enter' && authMode === 'reset' && handleSubmit()}
        />
        {authMode !== 'reset' && (
          <input
            type="password" placeholder="비밀번호" value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ ...S.input, marginTop: 8 }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        )}
        {authMode === 'signup' && (
          <input type="password" placeholder="비밀번호 확인" style={{ ...S.input, marginTop: 8 }} />
        )}
        {error && (
          <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{error}</div>
        )}
        {info && (
          <div style={{ color: '#34d399', fontSize: 12, marginTop: 8 }}>{info}</div>
        )}

        <button style={{ ...S.primaryBtn, marginTop: 16 }} onClick={handleSubmit}>
          {authMode === 'login'  && '로그인'}
          {authMode === 'signup' && '회원가입'}
          {authMode === 'reset'  && '재설정 메일 보내기'}
        </button>

        {/* 로그인 모드일 때만 비밀번호 찾기 링크 노출 */}
        {authMode === 'login' && (
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <span
              style={{ color: '#64748b', fontSize: 11, cursor: 'pointer' }}
              onClick={() => { setAuthMode('reset'); setError(''); setInfo('') }}
            >
              비밀번호를 잊으셨나요?
            </span>
          </div>
        )}

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
          {authMode === 'login' && (
            <span style={{ color: '#64748b', fontSize: 12 }}>
              계정이 없으신가요?{' '}
              <span style={{ color: '#818cf8', cursor: 'pointer' }} onClick={() => setAuthMode('signup')}>회원가입</span>
            </span>
          )}
          {authMode === 'signup' && (
            <span style={{ color: '#64748b', fontSize: 12 }}>
              이미 계정이 있으신가요?{' '}
              <span style={{ color: '#818cf8', cursor: 'pointer' }} onClick={() => setAuthMode('login')}>로그인</span>
            </span>
          )}
          {authMode === 'reset' && (
            <span style={{ color: '#64748b', fontSize: 12 }}>
              <span style={{ color: '#818cf8', cursor: 'pointer' }} onClick={() => { setAuthMode('login'); setError(''); setInfo('') }}>← 로그인으로 돌아가기</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 메인 App ───────────────────────────────────────────────────
export default function App() {
  // 비밀번호 재설정 메일 링크로 진입한 경우 → 전용 페이지만 렌더
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/reset-password')) {
    return <ResetPasswordPage />
  }

  const [activeTab, setActiveTab] = useState('home')

  // 인증 (옵션 — 비로그인도 앱 사용 가능)
  const { user, signOut, deleteAccount } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [localEmail, setLocalEmail] = useState('')
  const isLoggedIn = !!user || !!localEmail

  // 프리미엄 = 로그인 상태와 연동 (로그인하면 모든 기능 사용 가능)
  const isPremium    = isLoggedIn
  const setIsPremium = () => {}  // 추후 결제 연동 시 활성화

  // ── 사용자 설정 (단일 객체로 통합 — 마이그레이션 자동 처리) ─
  const [settings, setSettings] = useState(loadSettings)
  const { oguTone, oguAlarmTone, oguRepeat, alarmMode, customAlarmDefaultMode, volume, vibStrength, alarmHours } = settings

  // 한 필드만 갱신하면서 localStorage에도 즉시 반영
  const updateSetting = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
  }

  // 개별 setter (SettingsPage 호환을 위해 그대로 유지)
  const setOguTone      = v => updateSetting('oguTone', v)
  const setOguAlarmTone = v => updateSetting('oguAlarmTone', v)
  const setOguRepeat    = v => updateSetting('oguRepeat', v)
  const setAlarmMode   = v => updateSetting('alarmMode', v)
  const setVolume      = v => updateSetting('volume', v)
  const setVibStrength = v => updateSetting('vibStrength', v)
  const setAlarmHours  = v => updateSetting('alarmHours', v)
  const setCustomAlarmDefaultMode = v => updateSetting('customAlarmDefaultMode', v)

  // 기능 활성화 (프리미엄)
  const [premiumFeatures, setPremiumFeatures] = useState({
    todos: true, goals: true, scheduleAlerts: false,
  })

  // Supabase 훅 (로그인 시)
  const userId = user?.id ?? null
  const { todos, addTodo, toggleTodo, updateTodo, deleteTodo } = useTodos(userId)
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useGoals(userId)

  // 커스텀 알람 (앱 최상위에서 관리 — 로그인 시 Supabase 동기화)
  const { alarms: customAlarms, addAlarm, toggleAlarm, deleteAlarm } = useCustomAlarms(userId)

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
    alarmCount, showAlarmPopup, alarmContent, closeAlarmPopup, fireAlarm,
    saveCheckin,
  } = useAlarm({ oguTone, oguRepeat, alarmMode, alarmHours, userId, volume, vibStrength })

  // 모바일 AudioContext unlock — 첫 터치 시 소리 활성화
  useEffect(() => {
    const handler = () => { unlockAudio(); document.removeEventListener('touchstart', handler) }
    document.addEventListener('touchstart', handler, { once: true })
    return () => document.removeEventListener('touchstart', handler)
  }, [])

  // 배너가 표시될 환경이면 하단 공간을 항상 예약 (탭바 침범 방지)
  // bannerAdLoaded 이벤트 누락 시에도 레이아웃이 어긋나지 않도록 로드 이벤트에 의존하지 않음
  // 로그인(isPremium) 사용자는 광고 제거 → 공간 예약 안 함
  const showAdBanner = IS_NATIVE && !isAdFree(isPremium)

  // AdMob 초기화 (앱 시작 시 1회만)
  useEffect(() => {
    if (!IS_NATIVE) return
    initAdMob().catch(() => {})
  }, [])

  // AdMob 배너: isAdFree() 단일 판단 지점 — 로그인 시 광고 제거
  useEffect(() => {
    if (!IS_NATIVE) return
    if (isAdFree(isPremium)) hideBanner().catch(() => {})
    else                     showBanner().catch(() => {})
  }, [isPremium])

  // 팝업/모달이 떠 있는 동안엔 배너 숨김 (네이티브 배너는 항상 최상단 레이어라
  // 인앱 팝업 위에 겹쳐 보임 → 모달 동안 숨기고 닫히면 다시 표시)
  useEffect(() => {
    if (!IS_NATIVE || isAdFree(isPremium)) return
    const modalOpen = showAlarmPopup || loginOpen
    if (modalOpen) hideBanner().catch(() => {})
    else           resumeBanner().catch(() => {})
  }, [showAlarmPopup, loginOpen, isPremium])

  // 로그인 성공 시 모달 자동 닫기 (카카오 OAuth 딥링크 콜백 케이스)
  useEffect(() => {
    if (isLoggedIn && loginOpen) setLoginOpen(false)
  }, [isLoggedIn, loginOpen])

  // ── 안드로이드 뒤로가기 처리 — 단일 등록 + ref 기반 ─────────────────
  // 핵심:
  //  • addListener를 **한 번만** 등록 (deps=[]). React state는 ref로 읽음 → 클로저 함정 회피.
  //  • Toast 모듈 import는 핸들러 안에서 지연 로드 (실패해도 listener 등록은 안전).
  //  • Capacitor backButton에 listener가 하나도 없으면 안드로이드 기본 동작(앱 종료)이 실행됨.
  //    → 등록 자체가 절대 실패하지 않도록 try/catch 위치를 조정.
  // 우선순위:
  //  1) 오구 알람 팝업 → 닫고 홈 탭으로
  //  2) 로그인 모달 → 닫기
  //  3) 페이지 내 오버레이(모달/바텀시트/펼침) → 이벤트 디스패치로 해당 페이지가 닫음
  //  4) 비-홈 탭 → 홈 탭
  //  5) 홈 탭 → "한 번 더 누르면 종료" 토스트 + 2초 내 두 번째 누름 → exitApp
  const activeTabRef       = useRef(activeTab)
  const showAlarmPopupRef  = useRef(showAlarmPopup)
  const loginOpenRef       = useRef(loginOpen)
  const closeAlarmPopupRef = useRef(closeAlarmPopup)
  useEffect(() => { activeTabRef.current       = activeTab },       [activeTab])
  useEffect(() => { showAlarmPopupRef.current  = showAlarmPopup },  [showAlarmPopup])
  useEffect(() => { loginOpenRef.current       = loginOpen },       [loginOpen])
  useEffect(() => { closeAlarmPopupRef.current = closeAlarmPopup }, [closeAlarmPopup])

  useEffect(() => {
    if (!IS_NATIVE) return
    let removeHandle = null
    let canceled = false

    ;(async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app')
        if (canceled) return

        const handle = await CapApp.addListener('backButton', async () => {
          // 1) 오구 알람 팝업
          if (showAlarmPopupRef.current) {
            closeAlarmPopupRef.current?.()
            setActiveTab('home')
            return
          }
          // 2) 로그인 모달
          if (loginOpenRef.current) {
            setLoginOpen(false)
            return
          }
          // 3) 페이지 내 오버레이
          const overlayEvent = new CustomEvent('ogu:backRequest', { detail: { handled: false } })
          window.dispatchEvent(overlayEvent)
          if (overlayEvent.detail.handled) return
          // 4) 비-홈 탭 → 홈
          if (activeTabRef.current !== 'home') {
            setActiveTab('home')
            return
          }
          // 5) 홈 탭 — 더블 백 종료
          const now = Date.now()
          if (now - lastBackPressAt < EXIT_DOUBLE_PRESS_WINDOW) {
            try { CapApp.exitApp() } catch (_) { /* ignore */ }
          } else {
            lastBackPressAt = now
            // Toast는 지연 import — 실패해도 listener엔 영향 없음
            try {
              const { Toast } = await import('@capacitor/toast')
              await Toast.show({
                text:     '한 번 더 누르면 종료됩니다',
                duration: 'short',
                position: 'bottom',
              })
            } catch (_) { /* 토스트 실패는 무시 */ }
          }
        })

        if (canceled) { handle.remove(); return }
        removeHandle = handle
      } catch (e) {
        console.warn('[backButton] 등록 실패:', e)
      }
    })()

    return () => {
      canceled = true
      if (removeHandle) { try { removeHandle.remove() } catch (_) {} }
    }
  }, [])   // ← 단일 등록

  const handleLogin = useCallback((email) => {
    setLocalEmail(email)
  }, [])

  const handleSignOut = useCallback(() => {
    if (user) signOut()
    setLocalEmail('')
    setIsPremium(false)
  }, [user, signOut])

  // 계정 삭제 — Edge Function 호출 + 로컬 상태 정리
  const handleDeleteAccount = useCallback(async () => {
    await deleteAccount()
    setLocalEmail('')
    setIsPremium(false)
    setActiveTab('home')
  }, [deleteAccount])

  const displayEmail = user?.email || localEmail

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
        bannerHeight={showAdBanner ? BANNER_HEIGHT_PX : 0}
      >
        {activeTab === 'home' && (
          <HomePage
            alarmCount={alarmCount}
            todos={activeTodos}
            goals={localGoals}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            premiumFeatures={premiumFeatures}
            onTabChange={setActiveTab}
            alarmHours={alarmHours}
            oguTone={oguTone}
            onTestAlarm={fireAlarm}
            customAlarms={customAlarms}
          />
        )}
        {activeTab === 'todos' && (
          <TodosPage
            todos={activeTodos}
            userId={userId}  // ← 추가
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            onAdd={userId
              ? addTodo
              : (title, todoType, dueDate) => setLocalTodos(p => [{
                  id: Date.now().toString(),
                  title,
                  completed: false,
                  priority: 'medium',
                  todo_type: todoType || 'weekly',
                  due_date: dueDate || null,
                }, ...p])
            }
            onToggle={userId ? toggleTodo : id => setLocalTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t))}
            onUpdate={userId
              ? updateTodo
              : (id, updates) => setLocalTodos(p => p.map(t => t.id === id ? { ...t, ...updates } : t))
            }
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
        {activeTab === 'alarms' && (
          <AlarmsPage
            alarmMode={alarmMode}
            vibStrength={vibStrength}
            volume={volume}
            customAlarms={customAlarms}
            onAddAlarm={addAlarm}
            onToggleAlarm={toggleAlarm}
            onDeleteAlarm={deleteAlarm}
            customAlarmDefaultMode={customAlarmDefaultMode}
            setCustomAlarmDefaultMode={setCustomAlarmDefaultMode}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsPage userId={userId} />
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
            alarmMode={alarmMode}
            setAlarmMode={setAlarmMode}
            volume={volume}
            setVolume={setVolume}
            vibStrength={vibStrength}
            setVibStrength={setVibStrength}
            alarmHours={alarmHours}
            setAlarmHours={setAlarmHours}
            onTestAlarm={fireAlarm}
            todos={activeTodos}
            goals={localGoals}
            onLoginOpen={() => setLoginOpen(true)}
            onSignOut={handleSignOut}
            onDeleteAccount={handleDeleteAccount}
            playSound={playOguSound}
            userId={userId}
          />
        )}
      </Layout>

      {/* 알람 팝업 */}
      {showAlarmPopup && alarmContent && (
        <AlarmPopup
          alarmContent={alarmContent}
          pendingCount={activeTodosForAlarm}
          oguTone={oguTone}
          onClose={() => { closeAlarmPopup(); setActiveTab('home') }}
          onCheckin={saveCheckin}
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
