import { theme } from '../../styles/theme'

export default function LoadingSpinner({ text = '불러오는 중...' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 0', gap: 12,
    }}>
      <div style={{
        width: 32, height: 32,
        border: `3px solid ${theme.bg.elevated}`,
        borderTop: `3px solid ${theme.accent.primary}`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: theme.text.muted, fontSize: 13 }}>{text}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
