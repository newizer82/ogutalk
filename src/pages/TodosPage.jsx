import { useState } from 'react'
import GlassCard from '../components/common/GlassCard'
import { S } from '../styles/theme'
import { useGoals } from '../hooks/useGoals'  // ← 추가

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

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#475569' }

export default function TodosPage({ todos = [], userId, isPremium, setIsPremium, onAdd, onToggle, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [input, setInput]       = useState('')
  const [priority, setPriority] = useState('medium')
  const [selectedGoalId, setSelectedGoalId] = useState('')  // ← 추가

  const { goals } = useGoals(userId)  // ← 추가
  const activeGoals = goals.filter(g => !g.is_completed)  // ← 추가

  if (!isPremium) return <PremiumLock onUnlock={() => setIsPremium(true)} />

  const pending   = todos.filter(t => !t.completed && !t.done)
  const completed = todos.filter(t =>  t.completed ||  t.done)

  const handleAdd = () => {
    if (!input.trim()) return
    onAdd(input.trim(), selectedGoalId || null)  // ← priority 대신 goalId 전달
    setInput('')
    setSelectedGoalId('')  // ← 초기화 추가
    setShowForm(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1' }}>✅ 할일 관리</div>
        <button style={S.accentSmallBtn} onClick={() => setShowForm(!showForm)}>+ 추가</button>
      </div>

      {showForm && (
        <GlassCard style={{ marginBottom: 12 }}>
          <input type="text" placeholder="할일을 입력하세요" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={S.input} autoFocus />
          {/* 우선순위 */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {[['high','높음','#ef4444'],['medium','보통','#f59e0b'],['low','낮음','#475569']].map(([val,label,color]) => (
              <button key={val} onClick={() => setPriority(val)} style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${priority === val ? color : 'rgba(255,255,255,0.1)'}`,
                background: priority === val ? `${color}22` : 'transparent',
                color: priority === val ? color : '#64748b',
              }}>{label}</button>
            ))}
          </div>
          
          {/* ▼ 목표 선택 드롭다운 추가 */}
          <select 
            value={selectedGoalId}
            onChange={(e) => setSelectedGoalId(e.target.value)}
            style={{
              width: '100%',
              marginTop: 10,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(99, 102, 241, 0.3)',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#cbd5e1',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">🎯 목표 선택 (선택사항)</option>
            {activeGoals.map(goal => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
          
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={S.accentSmallBtn} onClick={handleAdd}>저장</button>
            <button style={S.ghostBtn} onClick={() => setShowForm(false)}>취소</button>
          </div>
        </GlassCard>
      )}

      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12 }}>
        미완료 {pending.length}개 · 완료 {completed.length}개
      </div>

      {/* 미완료 */}
      {pending.map(t => {
        const linkedGoal = goals.find(g => g.id === t.goal_id)  // ← 연결된 목표 찾기
        return (
          <GlassCard key={t.id} style={{ marginBottom: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, border: '2px solid #475569', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => onToggle(t.id)} />
              <span style={{ width: 8, height: 8, borderRadius: 4, background: PRIORITY_COLOR[t.priority || 'medium'], flexShrink: 0 }} />
              <div style={{ flex: 1, color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>{t.title || t.text}</div>
              <span style={{ color: '#475569', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
                onClick={() => onDelete(t.id)}>×</span>
            </div>
            
            {/* ▼ 목표 뱃지 추가 */}
            {linkedGoal && (
              <div style={{ 
                marginTop: 6, 
                fontSize: 11, 
                padding: '3px 8px', 
                borderRadius: 6, 
                background: 'rgba(139, 92, 246, 0.15)', 
                color: '#a78bfa',
                display: 'inline-block',
                fontWeight: 500,
              }}>
                🎯 {linkedGoal.title}
              </div>
            )}
          </GlassCard>
        )
      })}

      {/* 완료 */}
      {completed.length > 0 && (
        <>
          <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, margin: '16px 0 8px' }}>완료됨</div>
          {completed.map(t => (
            <GlassCard key={t.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', opacity: 0.5 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, cursor: 'pointer' }}
                onClick={() => onToggle(t.id)}>✓</div>
              <span style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'line-through', flex: 1 }}>{t.title || t.text}</span>
            </GlassCard>
          ))}
        </>
      )}

      {todos.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
          <div style={{ color: '#64748b', fontSize: 14 }}>할일을 추가해보세요!</div>
          <button style={{ ...S.accentSmallBtn, marginTop: 14 }} onClick={() => setShowForm(true)}>+ 첫 할일 추가</button>
        </div>
      )}
    </div>
  )
}
