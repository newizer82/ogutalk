import { useState } from 'react'
import { theme, gradients } from '../../styles/theme'
import { useVoiceInput, cleanTodoTitle } from '../../hooks/useVoiceInput'

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  inputRow: {
    display: 'flex',
    gap: 6,
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

  const { isListening, isSupported, error, start } = useVoiceInput({
    onResult: (text) => {
      const clean = cleanTodoTitle(text)
      setValue(clean)
    },
  })

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
          placeholder={isListening ? '🎙️ 듣는 중...' : '할일을 입력하세요'}
        />

        {/* 마이크 버튼 — 지원 기기만 표시 */}
        {isSupported && (
          <button
            type="button"
            onClick={start}
            title="음성으로 입력"
            style={{
              padding: '11px 13px',
              border: `1px solid ${isListening ? '#ef4444' : 'rgba(99,102,241,0.4)'}`,
              borderRadius: 12,
              background: isListening
                ? 'rgba(239,68,68,0.15)'
                : 'rgba(99,102,241,0.1)',
              color: isListening ? '#ef4444' : '#818cf8',
              fontSize: 16,
              cursor: 'pointer',
              lineHeight: 1,
              // 듣는 중 맥동 애니메이션
              animation: isListening ? 'micPulse 1s infinite' : 'none',
            }}
          >
            🎙️
          </button>
        )}

        <button style={styles.addBtn} type="submit">+</button>
      </div>

      {/* 음성 오류 메시지 */}
      {error && (
        <div style={{
          color: '#ef4444', fontSize: 11,
          padding: '6px 10px', borderRadius: 8,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          ⚠️ {error}
        </div>
      )}

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

      <style>{`
        @keyframes micPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </form>
  )
}
