import { gradients, theme } from '../../styles/theme'

const styles = {
  header: {
    width: '100%',
    padding: '16px 20px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
  },
  logo: {
    fontSize: 22,
    fontWeight: 800,
    background: gradients.logo,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  signOutBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: 8,
    color: theme.text.muted,
    fontSize: 12,
    padding: '5px 10px',
    cursor: 'pointer',
  },
}

export default function Header({ onSignOut }) {
  return (
    <header style={styles.header}>
      <span style={styles.logo}>오구톡</span>
      <button style={styles.signOutBtn} onClick={onSignOut}>로그아웃</button>
    </header>
  )
}
