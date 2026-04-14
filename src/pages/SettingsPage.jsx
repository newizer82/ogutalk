import { theme, gradients } from '../styles/theme'
import AlarmSettings from '../components/settings/AlarmSettings'
import ContentSettings from '../components/settings/ContentSettings'
import ProfileSettings from '../components/settings/ProfileSettings'

const styles = {
  wrapper: { padding: '16px 16px 8px' },
  testSection: {
    background: theme.bg.secondary,
    borderRadius: 16,
    padding: '16px',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.text.muted,
    marginBottom: 10,
  },
  testBtn: {
    width: '100%',
    padding: '12px',
    background: gradients.button,
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  note: {
    fontSize: 12,
    color: theme.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
}

export default function SettingsPage({ userId, user, onTestAlarm }) {
  return (
    <div style={styles.wrapper}>
      <ProfileSettings user={user} />
      <AlarmSettings userId={userId} />
      <ContentSettings userId={userId} />
      <div style={styles.testSection}>
        <p style={styles.sectionTitle}>🔔 알람 테스트</p>
        <button style={styles.testBtn} onClick={onTestAlarm}>
          오구 사운드 테스트
        </button>
        <p style={styles.note}>버튼을 누르면 알람 팝업이 즉시 실행됩니다</p>
      </div>
    </div>
  )
}
