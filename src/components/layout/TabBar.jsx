const TABS = [
  { id: 'home',     icon: '🏠', label: '홈',    pro: false },
  { id: 'todos',    icon: '✅', label: '할일',   pro: true  },
  { id: 'goals',    icon: '🎯', label: '목표',   pro: true  },
  { id: 'reports',  icon: '📊', label: '리포트', pro: true  },
  { id: 'settings', icon: '⚙️', label: '설정',  pro: false },
]

export default function TabBar({ active, onChange, isPremium }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 420,
      display: 'flex', justifyContent: 'space-around',
      padding: '8px 8px 16px',
      background: 'rgba(8,15,30,0.92)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      zIndex: 100,
    }}>
      {TABS.map(tab => {
        const isActive = active === tab.id
        const locked   = tab.pro && !isPremium
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '6px 10px', border: 'none', borderRadius: 12,
              background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: isActive ? '#818cf8' : '#475569',
              cursor: 'pointer', position: 'relative', minWidth: 48,
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span style={{ fontSize: 9, marginTop: 1 }}>{tab.label}</span>
            {locked && (
              <span style={{ position: 'absolute', top: 4, right: 8, fontSize: 8 }}>🔒</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
