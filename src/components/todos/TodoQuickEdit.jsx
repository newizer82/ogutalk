import { useState } from 'react'
import { draftOf, editError, editPatch } from '../../lib/todoEdit'

const input = {
  width: '100%', height: 40, boxSizing: 'border-box', border: '1px solid #ECECEF', borderRadius: 10,
  padding: '0 10px', fontSize: 13, color: '#111111', background: '#FFFFFF',
}
const label = { display: 'block', fontSize: 11, fontWeight: 700, color: '#8E8E93', marginBottom: 4 }
const HOURS = Array.from({ length: 24 }, (_, h) => h)

// 약속·일정 한 건을 그 자리에서 고치거나 지운다 — 홈 목록과 달력이 같이 쓴다.
export default function TodoQuickEdit({ todo, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(() => draftOf(todo))
  const [failed, setFailed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)   // 지우면 되돌릴 수 없다 → 두 번 누르게
  const set = (k, v) => { setFailed(false); setDraft(d => ({ ...d, [k]: v })) }

  const isAppointment = todo.todo_type === 'appointment'
  const hasRange = !!todo.end_date
  const error = editError(todo, draft)

  const save = async () => {
    if (error) return
    const patch = editPatch(todo, draft)
    if (Object.keys(patch).length === 0) { onClose(); return }
    // 로컬 저장은 아무것도 돌려주지 않는다. 서버가 거부했을 때만 창을 열어 둔다 — 고친 내용을 잃지 않게
    if (await onSave(patch) === false) { setFailed(true); return }
    onClose()
  }

  return (
    <div style={{ margin: '2px 0 8px', padding: 10, borderRadius: 12, background: '#FAFAFB', border: '1px solid #ECECEF' }}>
      <input
        autoFocus
        aria-label="내용"
        value={draft.title}
        onChange={e => set('title', e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') onClose()
        }}
        style={input}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={label}>{hasRange ? '시작' : '날짜'}
            <input type="date" value={draft.due_date} onChange={e => set('due_date', e.target.value)} style={{ ...input, marginTop: 4 }} />
          </label>
        </div>
        {hasRange && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={label}>끝
              <input type="date" value={draft.end_date} min={draft.due_date} onChange={e => set('end_date', e.target.value)} style={{ ...input, marginTop: 4 }} />
            </label>
          </div>
        )}
        {isAppointment && (
          <div style={{ width: 96, flexShrink: 0 }}>
            <label style={label}>시각
              <select
                value={draft.due_hour ?? ''}
                onChange={e => set('due_hour', e.target.value === '' ? null : Number(e.target.value))}
                style={{ ...input, marginTop: 4 }}
              >
                <option value="">종일</option>
                {HOURS.map(h => <option key={h} value={h}>{h}시</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      {isAppointment && (
        <input
          aria-label="장소"
          placeholder="장소 (선택)"
          value={draft.place}
          onChange={e => set('place', e.target.value)}
          style={{ ...input, marginTop: 8 }}
        />
      )}

      {(error || failed) && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: '#D23B2E' }}>
          {failed ? '저장하지 못했어요. 다시 시도해 주세요' : error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button
          onClick={() => { if (confirmDelete) { onDelete(); onClose() } else setConfirmDelete(true) }}
          style={{
            border: '1px solid rgba(210,59,46,0.3)', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            background: confirmDelete ? '#D23B2E' : '#FFFFFF', color: confirmDelete ? '#FFFFFF' : '#D23B2E',
          }}
        >
          {confirmDelete ? '한 번 더 누르면 삭제' : '삭제'}
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} style={{
          border: '1px solid #ECECEF', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 700,
          background: '#FFFFFF', color: '#8E8E93', cursor: 'pointer',
        }}>
          닫기
        </button>
        <button onClick={save} disabled={!!error} style={{
          border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 800,
          cursor: error ? 'default' : 'pointer',
          background: error ? '#F1F1F4' : '#FF6B2C', color: error ? '#B0B0B6' : '#FFFFFF',
        }}>
          저장
        </button>
      </div>
    </div>
  )
}
