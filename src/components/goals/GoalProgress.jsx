import { theme } from '../../styles/theme'

const styles = {
  bar: {
    height: 6,
    background: theme.bg.elevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: (pct) => ({
    height: '100%',
    width: `${pct}%`,
    background: pct >= 100
      ? theme.status.success
      : `linear-gradient(90deg, #6366f1, #8b5cf6)`,
    borderRadius: 4,
    transition: 'width 0.4s ease',
  }),
  label: {
    fontSize: 11,
    color: theme.text.muted,
    textAlign: 'right',
    marginTop: 2,
  },
}

export default function GoalProgress({ progress = 0, height }) {
  const pct = Math.min(100, Math.max(0, progress))
  return (
    <div>
      <div style={{ ...styles.bar, ...(height ? { height } : {}) }}>
        <div style={styles.fill(pct)} />
      </div>
      <p style={styles.label}>{pct}%</p>
    </div>
  )
}
