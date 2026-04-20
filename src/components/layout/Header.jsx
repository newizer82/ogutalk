import { gradients, S } from '../../styles/theme'

export default function Header({
  isLoggedIn, displayEmail, isPremium,
  onLoginOpen, onSignOut, onSettingsClick,
}) {
  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(8,15,30,0.85)',
    }}>
      {/* 로고 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>⏱️</span>
        <span style={{
          fontSize: 18, fontWeight: 800,
          background: gradients.logo,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>오구톡</span>
        {isPremium && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
            background: gradients.gold, color: 'white',
          }}>PRO</span>
        )}
      </div>

      {/* 우측 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isLoggedIn ? (
          <div
            style={{
              width: 32, height: 32, borderRadius: 16,
              background: gradients.purple,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
            onClick={onSettingsClick}
            title={displayEmail}
          >
            {displayEmail ? displayEmail[0].toUpperCase() : 'U'}
          </div>
        ) : (
          <button style={S.loginBtn} onClick={onLoginOpen}>로그인</button>
        )}
      </div>
    </header>
  )
}
