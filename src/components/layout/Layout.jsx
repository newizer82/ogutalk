import Header from './Header'
import TabBar from './TabBar'
import { gradients } from '../../styles/theme'

export default function Layout({
  children, activeTab, onTabChange,
  isLoggedIn, displayEmail, isPremium,
  onLoginOpen, onSignOut,
  bannerHeight = 0,
}) {
  // 탭바 높이 ~74px + 배너 높이
  const bottomPad = 90 + bannerHeight

  return (
    <div style={{
      maxWidth: 420, margin: '0 auto', minHeight: '100vh',
      background: gradients.bg,
      fontFamily: "'Segoe UI', -apple-system, 'Apple SD Gothic Neo', sans-serif",
      color: '#e2e8f0', position: 'relative', overflowX: 'hidden',
    }}>
      <Header
        isLoggedIn={isLoggedIn}
        displayEmail={displayEmail}
        isPremium={isPremium}
        onLoginOpen={onLoginOpen}
        onSignOut={onSignOut}
        onSettingsClick={() => onTabChange('settings')}
      />
      <main style={{ padding: `16px 18px ${bottomPad}px` }}>
        {children}
      </main>
      <TabBar
        active={activeTab}
        onChange={onTabChange}
        isPremium={isPremium}
        bottomOffset={bannerHeight}
      />
    </div>
  )
}
