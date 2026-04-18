import { useState } from 'react'
import { theme, gradients } from '../../styles/theme'

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '11px 14px',
    background: theme.bg.elevated,
    border: '1px solid #334155',
    borderRadius: 12,
    color: theme.text.primary,
    fontSize: 14,
    outline: 'none',
  },
  addBtn: {
    padding: '11px 16px',
    background: gradients.button,
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    lineHeight: 1,
  },
  select: {
    width: '100%',
    padding: '9px 14px',
    background: theme.bg.elevated,
    border: '1px solid #334155',
    borderRadius: 12,
    color: theme.text.secondary,
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
  },
}

export default function TodoForm({ onAdd, goals = [] }) {
  const [value, setValue] = useState('')
  const [goalId, setGoalId] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed, goalId || null)
    setValue('')
    setGoalId('')
  }

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="할일을 입력하세요"
        />
        <button style={styles.addBtn} type="submit">+</button>
      </div>
      {goals.length > 0 && (
        <select
          style={styles.select}
          value={goalId}
          onChange={e => setGoalId(e.target.value)}
        >
          <option value="">🗂️ 목표 연결 (선택사항)</option>
          {goals.map(g => (
            <option key={g.id} value={g.id}>
              🎯 {g.title}
            </option>
          ))}
        </select>
      )}
    </form>
  )
}
