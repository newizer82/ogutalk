import { useState } from 'react'
import TextWithLinks from '../common/TextWithLinks'
import { theme } from '../../styles/theme'
import { NOTES_MAX } from '../../hooks/useNotes'

// 클립보드 복사 (웹·네이티브 공통)
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch { return false }
}

const cardStyle = {
  background: 'rgba(255,255,255,0.05)',
  border:     '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
  padding:    '16px 18px',
  marginBottom: 14,
}

export default function NotesCard({
  isLoggedIn,
  notes = [],
  onAdd,
  onDelete,
  onLoginOpen,
}) {
  const [input, setInput]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // 비로그인 안내
  if (!isLoggedIn) {
    return (
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 15 }}>📝</span>
          <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>빠른 메모</span>
        </div>
        <div style={{ color: theme.text.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
          링크·간단 메모를 저장하려면 로그인이 필요해요 (다기기 동기화).
        </div>
        <button onClick={onLoginOpen} style={{
          padding: '6px 14px', borderRadius: 10, border: 'none',
          background: 'rgba(99,102,241,0.2)', color: theme.accent.secondary,
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          로그인하기 →
        </button>
      </section>
    )
  }

  const handleAdd = async () => {
    if (!input.trim()) return
    await onAdd(input)
    setInput('')
    setShowForm(false)
  }

  const handleCopy = async (note) => {
    const ok = await copyToClipboard(note.text)
    if (ok) {
      setCopiedId(note.id)
      setTimeout(() => setCopiedId(null), 1500)
    }
  }

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>📝</span>
          <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>빠른 메모</span>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 10,
            background: 'rgba(148,163,184,0.15)', color: theme.text.secondary, fontWeight: 700,
          }}>
            {notes.length}/{NOTES_MAX}
          </span>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={{
            padding: '4px 10px', borderRadius: 10, border: 'none',
            background: 'rgba(99,102,241,0.2)', color: theme.accent.secondary,
            fontSize: 11, cursor: 'pointer',
          }}>
            + 추가
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="링크 or 짧은 메모 (최대 200자)"
            maxLength={200}
            rows={2}
            autoFocus
            style={{
              width: '100%', padding: 10, borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.25)',
              color: theme.text.primary, fontSize: 12,
              resize: 'none', outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button onClick={() => { setShowForm(false); setInput('') }} style={{
              flex: 1, padding: '6px 10px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.05)', color: theme.text.secondary,
              fontSize: 12, cursor: 'pointer',
            }}>
              취소
            </button>
            <button onClick={handleAdd} disabled={!input.trim()} style={{
              flex: 1, padding: '6px 10px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              opacity: input.trim() ? 1 : 0.4,
            }}>
              저장
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        !showForm && (
          <div style={{ textAlign: 'center', padding: '12px 0', color: theme.text.muted, fontSize: 12 }}>
            자주 쓰는 링크·메모를 저장해두세요
          </div>
        )
      ) : (
        <div>
          {notes.map((n, i) => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 0',
              borderBottom: i < notes.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{
                flex: 1, color: theme.text.primary, fontSize: 13, lineHeight: 1.5,
                wordBreak: 'break-all',
              }}>
                <TextWithLinks text={n.text} />
              </span>
              <button onClick={() => handleCopy(n)} title="복사" style={{
                padding: '2px 6px', borderRadius: 6, border: 'none',
                background: copiedId === n.id ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)',
                color: copiedId === n.id ? theme.status.success : theme.text.secondary,
                fontSize: 11, cursor: 'pointer', flexShrink: 0,
              }}>
                {copiedId === n.id ? '✓' : '📋'}
              </button>
              <button onClick={() => onDelete(n.id)} title="삭제" style={{
                padding: '2px 6px', borderRadius: 6, border: 'none',
                background: 'transparent', color: theme.text.muted,
                fontSize: 13, cursor: 'pointer', flexShrink: 0,
              }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
