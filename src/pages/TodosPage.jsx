import { useState } from 'react'
import GlassCard from '../components/common/GlassCard'
import { S } from '../styles/theme'
import { openUrl } from '../lib/capacitor'

// 텍스트 안의 URL을 감지해 클릭 가능한 링크로 렌더
// (http(s):// 로 시작하거나 www. 로 시작하는 토큰)
const URL_RE = /((?:https?:\/\/|www\.)[^\s]+)/gi

function TextWithLinks({ text }) {
  const str = String(text || '')
  const parts = str.split(URL_RE)
  return (
    <>
      {parts.map((part, i) => {
        if (URL_RE.test(part)) {
          URL_RE.lastIndex = 0   // split 후 test용 lastIndex 리셋
          return (
            <span
              key={i}
              onClick={(e) => { e.stopPropagation(); openUrl(part) }}
              style={{ color: '#818cf8', textDecoration: 'underline', cursor: 'pointer', wordBreak: 'break-all' }}
            >{part}</span>
          )
        }
        URL_RE.lastIndex = 0
        return part
      })}
    </>
  )
}

function PremiumLock({ onUnlock }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>할일 관리</div>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
        이 기능은 프리미엄 플랜에서만 사용할 수 있어요.<br />월 2,900원으로 모든 기능을 잠금 해제하세요.
      </div>
      <button style={{ ...S.primaryBtn, width: 'auto', padding: '12px 28px' }} onClick={onUnlock}>
        ✨ 프리미엄 시작하기
      </button>
    </div>
  )
}

// 날짜 포맷 (4/30, 오늘, D-3 등)
function formatDue(dateStr) {
  if (!dateStr) return null
  const due  = new Date(dateStr)
  const now  = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due - now) / 86400000)
  if (diff === 0)  return { label: '오늘',   color: '#f59e0b' }
  if (diff === 1)  return { label: '내일',   color: '#34d399' }
  if (diff < 0)   return { label: `${Math.abs(diff)}일 지남`, color: '#ef4444' }
  return { label: `D-${diff}`, color: '#94a3b8' }
}

function TodoItem({ todo, onToggle, onEdit, onDelete }) {
  const due    = formatDue(todo.due_date)
  const isDone = todo.completed || todo.done
  return (
    <GlassCard style={{ marginBottom: 8, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* 체크박스 */}
        <div
          onClick={() => onToggle(todo.id, !isDone)}
          style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0, cursor: 'pointer',
            border: isDone ? 'none' : '2px solid #475569',
            background: isDone ? '#6366f1' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isDone && <span style={{ color: 'white', fontSize: 13 }}>✓</span>}
        </div>

        {/* 제목 */}
        <div style={{ flex: 1 }}>
          <div style={{
            color: isDone ? '#475569' : '#e2e8f0',
            fontSize: 14, fontWeight: 500,
            textDecoration: isDone ? 'line-through' : 'none',
          }}>
            <TextWithLinks text={todo.title || todo.text} />
            {/* 기한 있는 할일 — 제목 옆에 (M/D) 표시 */}
            {todo.due_date && (() => {
              const dt = new Date(todo.due_date)
              return (
                <span style={{ color: isDone ? '#475569' : '#94a3b8', fontWeight: 400, marginLeft: 4 }}>
                  ({dt.getMonth() + 1}/{dt.getDate()})
                </span>
              )
            })()}
          </div>
          {due && !isDone && (
            <div style={{ fontSize: 11, color: due.color, marginTop: 3, fontWeight: 600 }}>
              📅 {due.label}
            </div>
          )}
        </div>

        {/* 수정 (onEdit 전달된 경우만 — 완료 목록은 제외) */}
        {onEdit && (
          <span
            onClick={() => onEdit(todo)}
            style={{ color: '#475569', fontSize: 15, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
          >✎</span>
        )}

        {/* 삭제 */}
        <span
          onClick={() => onDelete(todo.id)}
          style={{ color: '#334155', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
        >×</span>
      </div>
    </GlassCard>
  )
}

export default function TodosPage({ todos = [], userId, isPremium, setIsPremium, onAdd, onToggle, onUpdate, onDelete }) {
  const [showForm, setShowForm]   = useState(false)
  const [todoType, setTodoType]   = useState('weekly')  // 'weekly' | 'task'
  const [input, setInput]         = useState('')
  const [dueDate, setDueDate]     = useState('')
  const [editingId, setEditingId] = useState(null)      // null=추가 / id=수정

  if (!isPremium) return <PremiumLock onUnlock={() => setIsPremium(true)} />

  // 타입별 분류
  const weekly    = todos.filter(t => (t.todo_type === 'weekly' || !t.todo_type) && !t.due_date && !(t.completed || t.done))
  const tasks     = todos.filter(t => (t.todo_type === 'task'   ||  t.due_date)  && !(t.completed || t.done))
    .sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })
  const completed = todos.filter(t => t.completed || t.done)

  const resetForm = () => {
    setInput(''); setDueDate(''); setEditingId(null)
  }

  // 기존 할일 편집 시작 → 폼을 수정 모드로 열기
  const startEdit = (todo) => {
    setEditingId(todo.id)
    setInput(todo.title || todo.text || '')
    const isTask = todo.todo_type === 'task' || !!todo.due_date
    setTodoType(isTask ? 'task' : 'weekly')
    setDueDate(todo.due_date || '')
    setShowForm(true)
  }

  const handleSave = () => {
    if (!input.trim()) return
    if (editingId) {
      // 수정 모드
      onUpdate(editingId, {
        title:     input.trim(),
        todo_type: todoType,
        due_date:  todoType === 'task' ? (dueDate || null) : null,
      })
    } else {
      // 추가 모드
      onAdd(input.trim(), todoType, todoType === 'task' ? dueDate || null : null)
    }
    resetForm()
    setShowForm(false)
  }

  // 헤더 "+ 추가" 토글 — 새로 열 땐 항상 추가 모드로 초기화
  const toggleForm = () => {
    if (showForm) { setShowForm(false); resetForm() }
    else          { resetForm(); setShowForm(true) }
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1' }}>✅ 할일 관리</div>
        <button style={S.accentSmallBtn} onClick={toggleForm}>+ 추가</button>
      </div>

      {/* 추가/수정 폼 */}
      {showForm && (
        <GlassCard style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 10 }}>
            {editingId ? '✎ 할일 수정' : '+ 새 할일'}
          </div>
          {/* 타입 선택 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { id: 'weekly', label: '📅 주간 할일', desc: '이번 주 안에' },
              { id: 'task',   label: '📌 기한 있는',  desc: '마감일 설정' },
            ].map(t => (
              <button key={t.id} onClick={() => setTodoType(t.id)} style={{
                flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${todoType === t.id ? '#818cf8' : 'rgba(255,255,255,0.08)'}`,
                background: todoType === t.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                color: todoType === t.id ? '#818cf8' : '#64748b',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>

          {/* 할일 입력 */}
          <input
            type="text" placeholder="할일을 입력하세요"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={S.input} autoFocus
          />

          {/* 마감일 (task 타입일 때만) */}
          {todoType === 'task' && (
            <input
              type="date" value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                ...S.input, marginTop: 8,
                colorScheme: 'dark',
              }}
            />
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={S.accentSmallBtn} onClick={handleSave}>{editingId ? '수정 완료' : '저장'}</button>
            <button style={S.ghostBtn} onClick={() => { setShowForm(false); resetForm() }}>취소</button>
          </div>
        </GlassCard>
      )}

      {/* 통계 바 */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
        padding: '10px 14px', borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { label: '주간', count: weekly.length,    color: '#818cf8' },
          { label: '기한', count: tasks.length,     color: '#f59e0b' },
          { label: '완료', count: completed.length, color: '#34d399' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: s.color, fontSize: 18, fontWeight: 800 }}>{s.count}</div>
            <div style={{ color: '#475569', fontSize: 10 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 📅 주간 할일 */}
      {(weekly.length > 0 || todos.filter(t => !t.todo_type && !t.due_date).length === 0) && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📅 이번 주 할일</span>
            <span style={{ color: '#334155', fontWeight: 400 }}>({weekly.length})</span>
          </div>
          {weekly.length === 0 ? (
            <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: '16px 0', marginBottom: 8 }}>
              주간 할일을 추가해보세요
            </div>
          ) : (
            weekly.map(t => (
              <TodoItem key={t.id} todo={t} onToggle={onToggle} onEdit={startEdit} onDelete={onDelete} />
            ))
          )}
        </>
      )}

      {/* 📌 기한 있는 할일 */}
      {tasks.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📌 기한 있는 할일</span>
            <span style={{ color: '#334155', fontWeight: 400 }}>({tasks.length})</span>
          </div>
          {tasks.map(t => (
            <TodoItem key={t.id} todo={t} onToggle={onToggle} onEdit={startEdit} onDelete={onDelete} />
          ))}
        </>
      )}

      {/* ✅ 완료됨 */}
      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✅ 완료됨</span>
            <span style={{ color: '#334155', fontWeight: 400 }}>({completed.length})</span>
          </div>
          {completed.map(t => (
            <TodoItem key={t.id} todo={t} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </>
      )}

      {/* 빈 상태 */}
      {todos.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 6 }}>할일을 추가해보세요!</div>
          <div style={{ color: '#475569', fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
            이번 주 할일과 마감이 있는 할일을<br />나눠서 관리할 수 있어요
          </div>
          <button style={{ ...S.accentSmallBtn, marginTop: 4 }} onClick={() => setShowForm(true)}>
            + 첫 할일 추가
          </button>
        </div>
      )}
    </div>
  )
}
