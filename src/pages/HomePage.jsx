import Clock from '../components/home/Clock'
import StatusCards from '../components/home/StatusCards'
import { useEconomicTips } from '../hooks/useEconomicTips'
import { theme } from '../styles/theme'

const styles = {
  section: {
    margin: '16px 16px 0',
    padding: 16,
    background: theme.bg.secondary,
    borderRadius: 16,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.text.muted,
  },
  refreshBtn: {
    background: 'transparent',
    border: 'none',
    color: theme.accent.secondary,
    fontSize: 18,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: theme.text.primary,
    marginBottom: 6,
  },
  tipContent: {
    fontSize: 13,
    color: theme.text.secondary,
    lineHeight: 1.6,
  },
  tipCategory: {
    display: 'inline-block',
    marginTop: 8,
    padding: '3px 8px',
    background: theme.bg.elevated,
    borderRadius: 6,
    fontSize: 11,
    color: theme.accent.secondary,
  },
}

export default function HomePage({ pendingTodos = 0, alarmCount = 0, immersionMinutes = 0 }) {
  const { current, nextTip } = useEconomicTips()

  return (
    <div style={{ paddingBottom: 8 }}>
      <Clock />
      <StatusCards
        alarmCount={alarmCount}
        immersionMinutes={immersionMinutes}
        pendingTodos={pendingTodos}
      />
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>💡 오늘의 경제 상식</span>
          <button style={styles.refreshBtn} onClick={nextTip} title="다음 상식">↻</button>
        </div>
        {current ? (
          <>
            <p style={styles.tipTitle}>{current.title}</p>
            <p style={styles.tipContent}>{current.content}</p>
            {current.category && <span style={styles.tipCategory}>{current.category}</span>}
          </>
        ) : (
          <p style={styles.tipContent}>경제 상식을 불러오는 중...</p>
        )}
      </div>
    </div>
  )
}
