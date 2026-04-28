import { theme } from '../../styles/theme'

const styles = {
  row: {
    display: 'flex',
    gap: 10,
    padding: '0 16px',
  },
  card: {
    flex: 1,
    background: theme.bg.secondary,
    borderRadius: 14,
    padding: '14px 10px',
    textAlign: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: 800,
    color: theme.accent.secondary,
    lineHeight: 1,
  },
  label: {
    fontSize: 11,
    color: theme.text.muted,
    marginTop: 5,
  },
}

export default function StatusCards({ alarmCount = 0, pendingTodos = 0 }) {
  return (
    <div style={styles.row}>
      <div style={styles.card}>
        <div style={styles.value}>{alarmCount}</div>
        <div style={styles.label}>오늘 알람 횟수</div>
      </div>
      <div style={styles.card}>
        <div style={{ ...styles.value, color: pendingTodos > 0 ? theme.status.warning : theme.status.success }}>
          {pendingTodos}
        </div>
        <div style={styles.label}>미완료 할일</div>
      </div>
    </div>
  )
}
