import { useState } from 'react'
import { theme, gradients } from '../../styles/theme'

const styles = {
  form: {
    background: theme.bg.secondary,
    borderRadius: 16,
    padding: '16px',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: theme.text.muted,
    marginBottom: 6,
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    background: theme.bg.elevated,
    border: '1px solid #334155',
    borderRadius: 10,
    color: theme.text.primary,
    fontSize: 14,
    outline: 'none',
    marginBottom: 10,
    boxSizing: 'border-box',
  },
  addBtn: {
    width: '100%',
    padding: '11px',
    background: gradients.button,
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
}

export default function GoalForm({ period, onAdd }) {
  const [title, setTitle] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd({ title: trimmed, period })
    setTitle('')
  }

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <label style={styles.label}>새 목표 추가</label>
      <input
        style={styles.input}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="목표를 입력하세요"
      />
      <button style={styles.addBtn} type="submit">추가</button>
    </form>
  )
}
