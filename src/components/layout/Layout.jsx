import Header from './Header'
import TabBar from './TabBar'
import { gradients } from '../../styles/theme'

const styles = {
  root: {
    minHeight: '100vh',
    background: gradients.bg,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 420,
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    position: 'relative',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: 80,
  },
}

export default function Layout({ children, activeTab, onTabChange, onSignOut }) {
  return (
    <div style={styles.root}>
      <Header onSignOut={onSignOut} />
      <main style={styles.content}>
        {children}
      </main>
      <TabBar active={activeTab} onChange={onTabChange} />
    </div>
  )
}
