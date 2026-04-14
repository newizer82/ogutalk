import { useState } from 'react'
import { theme } from '../../styles/theme'
import GoalProgress from './GoalProgress'
import GoalForm from './GoalForm'

const styles = {
  item: {
    background: theme.bg.secondary,
    borderRadius: 14,
    padding: '14px 16px',
    marginBottom: 10,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    color: theme.text.primary,
    fontWeight: 600,
    flex: 1,
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#475569',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 2px',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  progressWrap: { flex: 1 },
  input: {
    width: 48,
    padding: '4px 6px',
    background: theme.bg.elevated,
    border: '1px solid #334155',
    borderRadius: 6,
    color: theme.text.primary,
    fontSize: 12,
    textAlign: 'center',
    outline: 'none',
  },
  empty: {
    textAlign: 'center',
    color: theme.text.muted,
    fontSize: 14,
    padding: '24px 0',
  },
}

export default function GoalList({ goals, onAdd, onUpdateProgress, onDelete, period }) {
  const filtered = goals.filter(g => g.period === period)

  return (
    <div>
      <GoalForm period={period} onAdd={onAdd} />
      {filtered.length === 0
        ? <p style={styles.empty}>아직 목표가 없어요. 추가해보세요!</p>
        : filtered.map(goal => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onUpdateProgress={onUpdateProgress}
              onDelete={onDelete}
            />
          ))
      }
    </div>
  )
}

function GoalItem({ goal, onUpdateProgress, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(String(goal.progress ?? 0))

  function handleProgressBlur() {
    const n = parseInt(inputVal, 10)
    if (!isNaN(n)) onUpdateProgress(goal.id, n)
    setEditing(false)
  }

  return (
    <div style={styles.item}>
      <div style={styles.row}>
        <span style={styles.title}>{goal.title}</span>
        <button style={styles.deleteBtn} onClick={() => onDelete(goal.id)}>×</button>
      </div>
      <div style={styles.progressRow}>
        <div style={styles.progressWrap}>
          <GoalProgress progress={goal.progress ?? 0} />
        </div>
        {editing
          ? (
            <input
              style={styles.input}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={handleProgressBlur}
              onKeyDown={e => e.key === 'Enter' && handleProgressBlur()}
              autoFocus
              type="number"
              min="0"
              max="100"
            />
          )
          : (
            <span
              style={{ ...styles.input, cursor: 'pointer', userSelect: 'none' }}
              onClick={() => { setInputVal(String(goal.progress ?? 0)); setEditing(true) }}
            >
              {goal.progress ?? 0}%
            </span>
          )
        }
      </div>
    </div>
  )
}
