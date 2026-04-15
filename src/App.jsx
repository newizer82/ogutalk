import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTodos } from './hooks/useTodos'
import { useGoals } from './hooks/useGoals'
import { useAlarm } from './hooks/useAlarm'
import Layout from './components/layout/Layout'
import LoginForm from './components/auth/LoginForm'
import SignupForm from './components/auth/SignupForm'
import AlarmPopup from './components/alarm/AlarmPopup'
import HomePage from './pages/HomePage'
import GoalsPage from './pages/GoalsPage'
import TodosPage from './pages/TodosPage'
import KeywordsPage from './pages/KeywordsPage'
import SettingsPage from './pages/SettingsPage'
import { gradients, theme } from './styles/theme'

const authStyles = {
  root: {
    minHeight: '100vh',
    background: gradients.bg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    maxWidth: 420,
    margin: '0 auto',
    padding: '40px 0',
  },
  logoArea: { textAlign: 'center', marginBottom: 40 },
  logoIcon: { fontSize: 56, marginBottom: 8 },
  logoText: {
    fontSize: 36, fontWeight: 800,
    background: gradients.logo,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  tagline: { color: theme.text.muted, fontSize: 14, marginTop: 4 },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: gradients.bg,
    color: theme.text.muted,
    fontSize: 16,
    fontFamily: 'sans-serif',
  },
}

function AuthScreen() {
  const [showSignup, setShowSignup] = useState(false)
  return (
    <div style={authStyles.root}>
      <div style={authStyles.logoArea}>
        <div style={authStyles.logoIcon}>⏱️</div>
        <div style={authStyles.logoText}>오구톡</div>
        <p style={authStyles.tagline}>매시 59분, 시간 감각을 되찾아요</p>
      </div>
      {showSignup
        ? <SignupForm onToggle={() => setShowSignup(false)} />
        : <LoginForm onToggle={() => setShowSignup(true)} />
      }
    </div>
  )
}

export default function App() {
  const { user, loading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const { todos } = useTodos(user?.id)
  const { goals } = useGoals(user?.id)
  const { alarmCount, immersionMinutes, showPopup, closePopup, fireAlarm } = useAlarm()

  if (loading) {
    return <div style={authStyles.loading}>불러오는 중...</div>
  }

  if (!user) return <AuthScreen />

  const pendingTodos = todos.filter(t => !t.completed).length
  const todayGoals = goals.filter(g => g.period === 'daily')

  function renderPage() {
    switch (activeTab) {
      case 'home':
        return <HomePage
          pendingTodos={pendingTodos}
          alarmCount={alarmCount}
          immersionMinutes={immersionMinutes}
          todos={todos}
          todayGoals={todayGoals}
        />
      case 'goals':
        return <GoalsPage userId={user.id} />
      case 'todos':
        return <TodosPage userId={user.id} />
      case 'keywords':
        return <KeywordsPage userId={user.id} />
      case 'settings':
        return <SettingsPage userId={user.id} user={user} onTestAlarm={fireAlarm} />
      default:
        return <HomePage
          pendingTodos={pendingTodos}
          alarmCount={alarmCount}
          immersionMinutes={immersionMinutes}
          todos={todos}
          todayGoals={todayGoals}
        />
    }
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} onSignOut={signOut}>
      {renderPage()}
      {showPopup && (
        <AlarmPopup pendingTodos={pendingTodos} onClose={closePopup} />
      )}
    </Layout>
  )
}
