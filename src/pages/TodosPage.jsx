import { useState, useEffect } from 'react'
import GlassCard from '../components/common/GlassCard'
import TextWithLinks from '../components/common/TextWithLinks'
import { S } from '../styles/theme'
import MissionCard from '../components/todos/MissionCard'
import WeeklyGoalCard from '../components/todos/WeeklyGoalCard'

function PremiumLock({ onUnlock }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <div style={{ color: '#111111', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>할일 관리</div>
      <div style={{ color: '#8E8E93', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
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
  if (diff === 0)  return { label: '오늘',   color: '#B4740F' }
  if (diff === 1)  return { label: '내일',   color: '#1E7A58' }
  if (diff < 0)   return { label: `${Math.abs(diff)}일 지남`, color: '#D23B2E' }
  return { label: `D-${diff}`, color: '#8E8E93' }
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
            border: isDone ? 'none' : '2px solid #B0B0B6',
            background: isDone ? '#FF6B2C' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isDone && <span style={{ color: 'white', fontSize: 13 }}>✓</span>}
        </div>

        {/* 제목 */}
        <div style={{ flex: 1 }}>
          <div style={{
            color: isDone ? '#B0B0B6' : '#111111',
            fontSize: 14, fontWeight: 500,
            textDecoration: isDone ? 'line-through' : 'none',
          }}>
            <TextWithLinks text={todo.title || todo.text} />
            {/* 기한 있는 할일 — 제목 옆에 (M/D) 표시 */}
            {todo.due_date && (() => {
              const dt = new Date(todo.due_date)
              return (
                <span style={{ color: isDone ? '#B0B0B6' : '#8E8E93', fontWeight: 400, marginLeft: 4 }}>
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
            style={{ color: '#B0B0B6', fontSize: 15, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
          >✎</span>
        )}

        {/* 삭제 */}
        <span
          onClick={() => onDelete(todo.id)}
          style={{ color: '#9A9AA0', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
        >×</span>
      </div>
    </GlassCard>
  )
}

export default function TodosPage({ todos = [], userId, isPremium, setIsPremium, onAdd, onToggle, onUpdate, onDelete, lifeStage = null }) {
  const [showForm, setShowForm]   = useState(false)
  const [todoType, setTodoType]   = useState('weekly')  // 'weekly' | 'task'
  const [input, setInput]         = useState('')
  const [dueDate, setDueDate]     = useState('')
  const [editingId, setEditingId] = useState(null)      // null=추가 / id=수정

  // ── 안드로이드 뒤로가기 — 페이지 오버레이 닫기 ──────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.handled) return
      if (showForm) {
        setShowForm(false)
        setEditingId(null)
        e.detail.handled = true
      }
    }
    window.addEventListener('ogu:backRequest', handler)
    return () => window.removeEventListener('ogu:backRequest', handler)
  }, [showForm])

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
      {/* 오늘의 미션 — 내가 만든 할일과 섞지 않는다 (매일 3개씩 쌓이면 목록이 오염된다) */}
      <MissionCard stage={lifeStage} />
      <WeeklyGoalCard />

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#3A3A3E' }}>✅ 할일 관리</div>
        <button style={S.accentSmallBtn} onClick={toggleForm}>+ 추가</button>
      </div>

      {/* 추가/수정 폼 */}
      {showForm && (
        <GlassCard style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#3A3A3E', marginBottom: 10 }}>
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
                border: `1px solid ${todoType === t.id ? '#D9531B' : 'rgba(0,0,0,0.05)'}`,
                background: todoType === t.id ? 'rgba(255,107,44,0.14)' : 'rgba(0,0,0,0.02)',
                color: todoType === t.id ? '#D9531B' : '#9A9AA0',
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
        background: 'rgba(0,0,0,0.02)',
        border: '1px solid rgba(0,0,0,0.035)',
      }}>
        {[
          { label: '주간', count: weekly.length,    color: '#D9531B' },
          { label: '기한', count: tasks.length,     color: '#B4740F' },
          { label: '완료', count: completed.length, color: '#1E7A58' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: s.color, fontSize: 18, fontWeight: 800 }}>{s.count}</div>
            <div style={{ color: '#B0B0B6', fontSize: 10 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 📌 기한 있는 할일 — 우선순위 상단 */}
      {tasks.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#B4740F', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📌 기한 있는 할일</span>
            <span style={{ color: '#9A9AA0', fontWeight: 400 }}>({tasks.length})</span>
          </div>
          {tasks.map(t => (
            <TodoItem key={t.id} todo={t} onToggle={onToggle} onEdit={startEdit} onDelete={onDelete} />
          ))}
        </>
      )}

      {/* 📅 주간 할일 */}
      {(weekly.length > 0 || todos.filter(t => !t.todo_type && !t.due_date).length === 0) && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#D9531B', margin: tasks.length > 0 ? '16px 0 8px' : '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📅 이번 주 할일</span>
            <span style={{ color: '#9A9AA0', fontWeight: 400 }}>({weekly.length})</span>
          </div>
          {weekly.length === 0 ? (
            <div style={{ color: '#9A9AA0', fontSize: 12, textAlign: 'center', padding: '16px 0', marginBottom: 8 }}>
              주간 할일을 추가해보세요
            </div>
          ) : (
            weekly.map(t => (
              <TodoItem key={t.id} todo={t} onToggle={onToggle} onEdit={startEdit} onDelete={onDelete} />
            ))
          )}
        </>
      )}

      {/* ✅ 완료됨 */}
      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1E7A58', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✅ 완료됨</span>
            <span style={{ color: '#9A9AA0', fontWeight: 400 }}>({completed.length})</span>
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
          <div style={{ color: '#9A9AA0', fontSize: 14, marginBottom: 6 }}>할일을 추가해보세요!</div>
          <div style={{ color: '#B0B0B6', fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
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
