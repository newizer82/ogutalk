import { theme } from '../../styles/theme'

export default function EmptyState({ icon = '📭', title, description }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center',
      animation: 'fadeIn 0.3s ease',
    }}>
      <span style={{ fontSize: 40, marginBottom: 12 }}>{icon}</span>
      {title && <p style={{ fontSize: 15, fontWeight: 600, color: theme.text.secondary, marginBottom: 6 }}>{title}</p>}
      {description && <p style={{ fontSize: 13, color: theme.text.muted, lineHeight: 1.6 }}>{description}</p>}
    </div>
  )
}
