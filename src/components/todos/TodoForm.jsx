import { useState } from 'react'
import { theme, gradients } from '../../styles/theme'

const styles = {
  form: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
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
}

export default function TodoForm({ onAdd }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <input
        style={styles.input}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="할일을 입력하세요"
      />
      <button style={styles.addBtn} type="submit">+</button>
    </form>
  )
}
