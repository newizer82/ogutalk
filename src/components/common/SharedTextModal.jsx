import { useState, useEffect } from 'react'
import { logEvent } from '../../lib/firebase'
import { firstLine } from '../../lib/sharedText'

// 돌아올 다리 — 다른 앱(주로 AI)에서 공유로 넘어온 글을 할일·메모로 꽂는다.
//
// 오구 브리지가 건너가기만 되면 반쪽이다. AI 가 준 답을 어딘가에 남기지 않으면
// 매시간 깨달은 것이 증발한다. 이 모달이 그 "어딘가" 로 가는 유일한 길이다.
//
// 고치고 저장하게 한다 — AI 답은 길고, 내가 쓸 한 줄은 그 안 어딘가에 있다.
const NOTE_MAX = 200   // useNotes 가 자르는 길이. 미리 보여주지 않으면 잘린 걸 나중에 안다

export default function SharedTextModal({ text, isLoggedIn, onAddTodo, onAddNote, onSaved, onClose }) {
  const [draft, setDraft] = useState(text ?? '')
  const [saved, setSaved] = useState(null)
  const [promoted, setPromoted] = useState(false)   // 직전 힐링 시간이 성장으로 바뀌었는가

  useEffect(() => { setDraft(text ?? ''); setSaved(null); setPromoted(false) }, [text])
  useEffect(() => { if (text) logEvent('shared_in', { len: String(text).length }) }, [text])

  if (!text) return null

  const body = draft.trim()
  const title = firstLine(body)

  const done = async (where) => {
    logEvent('shared_saved', { where })
    setSaved(where)
    // 남겼으니 직전 힐링 시간을 성장으로 — 실제로 바뀐 경우에만 말한다
    const ok = await onSaved?.()
    if (ok) { setPromoted(true); logEvent('slot_promoted') }
    setTimeout(onClose, ok ? 1800 : 900)   // 바뀐 걸 읽을 시간은 줘야 한다
  }

  const toTodo = async () => {
    if (!title) return
    await onAddTodo?.(title, 'weekly', null)
    done('todo')
  }

  const toNote = async () => {
    if (!body) return
    await onAddNote?.(body.slice(0, NOTE_MAX))
    done('note')
  }

  const btn = (on) => ({
    flex: 1, padding: '12px 0', borderRadius: 13, cursor: on ? 'pointer' : 'default',
    border: 'none', fontSize: 13.5, fontWeight: 800,
    background: on ? '#FF6B2C' : '#F1F1F4',
    color: on ? '#FFFFFF' : '#B0B0B6',
  })

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(17,17,17,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, background: '#FFFFFF',
          borderRadius: '22px 22px 0 0', padding: 20,
          maxHeight: '86vh', overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900, color: '#111111', marginBottom: 4 }}>
          📥 오구톡으로 받았어요
        </div>
        <div style={{ fontSize: 12, color: '#8E8E93', marginBottom: 12, lineHeight: 1.5 }}>
          고쳐서 저장할 수 있어요. 쓸 한 줄만 남기면 됩니다.
        </div>

        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={7}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            border: '1px solid #ECECEF', borderRadius: 13, padding: 12,
            fontSize: 13.5, lineHeight: 1.6, color: '#111111', background: '#FAFAFB',
            fontFamily: 'inherit',
          }}
        />

        <div style={{ fontSize: 11, color: body.length > NOTE_MAX ? '#B4740F' : '#9A9AA0', margin: '6px 2px 14px' }}>
          {body.length > NOTE_MAX
            ? `메모는 앞 ${NOTE_MAX}자만 저장돼요 (지금 ${body.length}자)`
            : `${body.length}자`}
        </div>

        {saved ? (
          <div style={{
            padding: '12px 0', textAlign: 'center', borderRadius: 13,
            background: 'rgba(30,122,88,0.1)', color: '#1E7A58', fontSize: 13.5, fontWeight: 800,
          }}>
            {saved === 'todo' ? '할일에 담았어요' : '메모에 담았어요'}
            {promoted && (
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: '#1E7A58' }}>
                🌱 방금 그 시간이 성장으로 바뀌었어요
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={toTodo} disabled={!title} style={btn(!!title)}>
                할일로
              </button>
              <button onClick={toNote} disabled={!body || !isLoggedIn} style={btn(!!body && isLoggedIn)}>
                메모로
              </button>
            </div>
            {!isLoggedIn && (
              <div style={{ fontSize: 11.5, color: '#9A9AA0', marginTop: 8, textAlign: 'center' }}>
                메모는 로그인해야 저장돼요 (기기 간 동기화 때문이에요)
              </div>
            )}
            {/* 할일로 갈 때 제목이 어떻게 들어가는지 미리 보여준다 */}
            {title && title !== body && (
              <div style={{ fontSize: 11.5, color: '#9A9AA0', marginTop: 8, lineHeight: 1.5 }}>
                할일 제목: <span style={{ color: '#3A3A3E', fontWeight: 700 }}>{title}</span>
              </div>
            )}
          </>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 12, padding: 11, borderRadius: 12, cursor: 'pointer',
            border: 'none', background: 'transparent', color: '#8E8E93', fontSize: 13, fontWeight: 700,
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
