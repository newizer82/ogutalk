import { theme, gradients } from '../../styles/theme'

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '0 0 20px',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    background: theme.bg.secondary,
    borderRadius: '24px 24px 0 0',
    padding: '24px 20px 20px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  handle: {
    width: 40,
    height: 4,
    background: theme.bg.elevated,
    borderRadius: 2,
    margin: '0 auto 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 40,
    display: 'block',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: theme.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.text.secondary,
    lineHeight: 1.5,
  },
  divider: {
    height: 1,
    background: theme.bg.elevated,
    margin: '16px 0',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.text.muted,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  todoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: `1px solid ${theme.bg.elevated}`,
    cursor: 'pointer',
  },
  check: (done) => ({
    width: 20,
    height: 20,
    borderRadius: '50%',
    flexShrink: 0,
    background: done ? theme.status.success : 'transparent',
    border: done ? 'none' : `2px solid ${theme.text.muted}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    color: '#fff',
    transition: 'all 0.15s',
  }),
  todoText: (done) => ({
    fontSize: 14,
    color: done ? theme.text.muted : theme.text.primary,
    textDecoration: done ? 'line-through' : 'none',
    flex: 1,
  }),
  emptyMsg: {
    fontSize: 13,
    color: theme.text.muted,
    textAlign: 'center',
    padding: '16px 0',
  },
  closeBtn: {
    marginTop: 20,
    width: '100%',
    padding: '14px',
    background: gradients.button,
    border: 'none',
    borderRadius: 14,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
}

export default function OguCheckin({ todos = [], onToggle, onClose }) {
  const pending = todos.filter(t => !t.completed)
  const doneCount = todos.filter(t => t.completed).length

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheet} onClick={e => e.stopPropagation()}>
        <div style={styles.handle} />

        <div style={styles.header}>
          <span style={styles.emoji}>⏱️</span>
          <div style={styles.title}>오구! 벌써 59분이에요</div>
          <div style={styles.subtitle}>
            지난 1시간 동안 완료한 할일을 체크하세요.<br />
            오늘 {doneCount}개 완료했어요!
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.sectionLabel}>📋 미완료 할일 ({pending.length}개)</div>

        {pending.length === 0 ? (
          <p style={styles.emptyMsg}>모든 할일을 완료했어요! 🎉</p>
        ) : (
          pending.slice(0, 10).map(todo => (
            <div
              key={todo.id}
              style={styles.todoRow}
              onClick={() => onToggle(todo.id, true)}
            >
              <div style={styles.check(false)} />
              <span style={styles.todoText(false)}>{todo.title}</span>
            </div>
          ))
        )}

        <button style={styles.closeBtn} onClick={onClose}>
          확인하고 닫기
        </button>
      </div>
    </div>
  )
}
