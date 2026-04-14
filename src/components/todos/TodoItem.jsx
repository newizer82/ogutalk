import { theme } from '../../styles/theme'

const styles = {
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '13px 16px',
    background: theme.bg.secondary,
    borderRadius: 12,
    marginBottom: 8,
  },
  checkbox: (done) => ({
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: `2px solid ${done ? theme.status.success : '#475569'}`,
    background: done ? theme.status.success : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s',
  }),
  title: (done) => ({
    flex: 1,
    fontSize: 15,
    color: done ? theme.text.muted : theme.text.primary,
    textDecoration: done ? 'line-through' : 'none',
    transition: 'all 0.15s',
  }),
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#475569',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
}

export default function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <div style={styles.item}>
      <div style={styles.checkbox(todo.completed)} onClick={() => onToggle(todo.id, todo.completed)}>
        {todo.completed && <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>✓</span>}
      </div>
      <span style={styles.title(todo.completed)}>{todo.title}</span>
      <button style={styles.deleteBtn} onClick={() => onDelete(todo.id)}>×</button>
    </div>
  )
}
