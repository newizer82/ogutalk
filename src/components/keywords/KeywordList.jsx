import { useState } from 'react'
import { theme, gradients } from '../../styles/theme'

const SUGGESTIONS = ['삼성전자', '테슬라', '비트코인', '애플', '엔비디아', 'ETF', '부동산']

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
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    background: active ? theme.bg.elevated : theme.bg.secondary,
    border: `1px solid ${active ? theme.accent.primary : '#334155'}`,
    borderRadius: 20,
    color: active ? theme.accent.secondary : theme.text.secondary,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
  }),
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#475569',
    fontSize: 16,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  suggestLabel: {
    fontSize: 12,
    color: theme.text.muted,
    marginBottom: 8,
  },
  suggestChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestChip: {
    padding: '5px 10px',
    background: 'transparent',
    border: '1px dashed #334155',
    borderRadius: 16,
    color: theme.text.muted,
    fontSize: 12,
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    color: theme.text.muted,
    fontSize: 13,
    padding: '16px 0',
  },
}

export default function KeywordList({ keywords, loading, onAdd, onDelete }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onAdd(value)
    setValue('')
  }

  const keywordSet = new Set(keywords.map(k => k.keyword))

  return (
    <div>
      <form style={styles.form} onSubmit={handleSubmit}>
        <input
          style={styles.input}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="키워드 입력 (예: 삼성전자)"
        />
        <button style={styles.addBtn} type="submit">+</button>
      </form>

      {loading
        ? <p style={styles.empty}>불러오는 중...</p>
        : keywords.length === 0
          ? <p style={styles.empty}>관심 키워드를 추가해보세요</p>
          : (
            <div style={styles.chips}>
              {keywords.map(k => (
                <div key={k.id} style={styles.chip(true)}>
                  <span>{k.keyword}</span>
                  <button style={styles.deleteBtn} onClick={() => onDelete(k.id)}>×</button>
                </div>
              ))}
            </div>
          )
      }

      <p style={styles.suggestLabel}>추천 키워드</p>
      <div style={styles.suggestChips}>
        {SUGGESTIONS.filter(s => !keywordSet.has(s)).map(s => (
          <button key={s} style={styles.suggestChip} onClick={() => onAdd(s)}>
            + {s}
          </button>
        ))}
      </div>
    </div>
  )
}
