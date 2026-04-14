import { theme } from '../../styles/theme'

const tabs = [
  { id: 'home',     icon: '⏱️', label: '홈' },
  { id: 'goals',    icon: '🎯', label: '목표' },
  { id: 'todos',    icon: '✅', label: '할일' },
  { id: 'keywords', icon: '📰', label: '키워드' },
  { id: 'settings', icon: '⚙️', label: '설정' },
]

const styles = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    background: theme.bg.secondary,
    borderTop: '1px solid #1e293b',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  tab: (active) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 0 8px',
    cursor: 'pointer',
    gap: 3,
  }),
  icon: (active) => ({
    fontSize: 22,
    opacity: active ? 1 : 0.5,
    transition: 'opacity 0.15s',
  }),
  label: (active) => ({
    fontSize: 10,
    fontWeight: active ? 700 : 400,
    color: active ? theme.accent.secondary : theme.text.muted,
    transition: 'color 0.15s',
  }),
}

export default function TabBar({ active, onChange }) {
  return (
    <nav style={styles.bar}>
      {tabs.map(tab => (
        <div key={tab.id} style={styles.tab(active === tab.id)} onClick={() => onChange(tab.id)}>
          <span style={styles.icon(active === tab.id)}>{tab.icon}</span>
          <span style={styles.label(active === tab.id)}>{tab.label}</span>
        </div>
      ))}
    </nav>
  )
}
