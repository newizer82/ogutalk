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
    marginBottom: 10,
  },
  email: {
    fontSize: 14,
    color: theme.text.primary,
  },
  version: {
    fontSize: 12,
    color: theme.text.muted,
    marginTop: 4,
  },
}

export default function ProfileSettings({ user }) {
  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>👤 계정</p>
      <p style={styles.email}>{user?.email}</p>
      <p style={styles.version}>오구톡 v0.1.0</p>
    </div>
  )
}
