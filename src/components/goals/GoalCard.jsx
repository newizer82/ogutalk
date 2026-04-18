import { useState } from 'react'
import { theme } from '../../styles/theme'
import GoalProgress from './GoalProgress'

const styles = {
  card: {
    background: theme.bg.secondary,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  header: {
    padding: '14px 16px',
    cursor: 'pointer',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    color: theme.text.primary,
    fontWeight: 600,
    flex: 1,
    marginRight: 8,
  },
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: theme.accent.secondary,
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#475569',
    fontSize: 20,
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  todoCount: {
    fontSize: 11,
    color: theme.text.muted,
  },
  expandIcon: {
    fontSize: 11,
    color: theme.text.muted,
  },
  todoList: {
    borderTop: `1px solid ${theme.bg.elevated}`,
    padding: '8px 16px 12px',
  },
  todoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 0',
    cursor: 'pointer',
    borderBottom: `1px solid ${theme.bg.elevated}`,
  },
  check: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  todoText: (done) => ({
    fontSize: 13,
    color: done ? theme.text.muted : theme.text.primary,
    textDecoration: done ? 'line-through' : 'none',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  emptyTodo: {
    fontSize: 12,
    color: theme.text.muted,
    textAlign: 'center',
    padding: '8px 0',
  },
}

export default function GoalCard({ goal, todos = [], onDelete, onToggleTodo }) {
  const [expanded, setExpanded] = useState(false)
  const linked = todos.filter(t => t.goal_id === goal.id)
  const doneCount = linked.filter(t => t.completed).length

  return (
    <div style={styles.card}>
      {/* 헤더 — 클릭하면 할일 펼치기 */}
      <div style={styles.header} onClick={() => setExpanded(v => !v)}>
        <div style={styles.titleRow}>
          <span style={styles.title}>{goal.title}</span>
          <div style={styles.rightActions}>
            <span style={styles.progressLabel}>{goal.progress ?? 0}%</span>
            <button
              style={styles.deleteBtn}
              onClick={e => { e.stopPropagation(); onDelete(goal.id) }}
              title="목표 삭제"
            >
              ×
            </button>
          </div>
        </div>
        <GoalProgress progress={goal.progress ?? 0} />
        <div style={styles.meta}>
          <span style={styles.todoCount}>
            📋 할일 {doneCount}/{linked.length} 완료
          </span>
          {linked.length > 0 && (
            <span style={styles.expandIcon}>{expanded ? '▲ 접기' : '▼ 펼치기'}</span>
          )}
        </div>
      </div>

      {/* 연결된 할일 목록 */}
      {expanded && (
        <div style={styles.todoList}>
          {linked.length === 0 ? (
            <p style={styles.emptyTodo}>연결된 할일이 없어요.</p>
          ) : (
            linked.map(todo => (
              <div
                key={todo.id}
                style={styles.todoRow}
                onClick={() => onToggleTodo && onToggleTodo(todo.id, !todo.completed)}
              >
                <div style={{
                  ...styles.check,
                  background: todo.completed ? theme.status.success : 'transparent',
                  border: todo.completed ? 'none' : `2px solid ${theme.text.muted}`,
                }} />
                <span style={styles.todoText(todo.completed)}>{todo.title}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
