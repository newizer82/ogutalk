import { useAlarmSettings } from '../../hooks/useAlarmSettings'
import { theme } from '../../styles/theme'

const styles = {
  section: {
    background: theme.bg.secondary,
    borderRadius: 16,
    padding: '16px',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.text.muted,
    marginBottom: 14,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  cell: (enabled) => ({
    padding: '10px 0',
    borderRadius: 10,
    background: enabled ? theme.bg.elevated : theme.bg.primary,
    border: `1px solid ${enabled ? theme.accent.primary : '#1e293b'}`,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  hour: (enabled) => ({
    fontSize: 14,
    fontWeight: enabled ? 700 : 400,
    color: enabled ? theme.accent.secondary : theme.text.muted,
  }),
  ampm: (enabled) => ({
    fontSize: 10,
    color: enabled ? theme.text.secondary : '#334155',
    marginTop: 2,
  }),
  note: {
    fontSize: 12,
    color: theme.text.muted,
    marginTop: 10,
    textAlign: 'center',
  },
  loading: {
    textAlign: 'center',
    color: theme.text.muted,
    fontSize: 13,
    padding: 16,
  },
}

export default function AlarmSettings({ userId }) {
  const { settings, loading, toggleHour } = useAlarmSettings(userId)

  if (loading) return <p style={styles.loading}>불러오는 중...</p>

  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>⏰ 알람 시간대 설정</p>
      <div style={styles.grid}>
        {settings.map(s => (
          <div key={s.id} style={styles.cell(s.is_enabled)} onClick={() => toggleHour(s.id, s.is_enabled)}>
            <p style={styles.hour(s.is_enabled)}>{String(s.trigger_hour).padStart(2, '0')}시</p>
            <p style={styles.ampm(s.is_enabled)}>{s.trigger_hour < 12 ? 'AM' : 'PM'}</p>
          </div>
        ))}
      </div>
      <p style={styles.note}>선택한 시간대의 59분에만 알람이 울립니다</p>
    </div>
  )
}
