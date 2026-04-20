import { useState } from 'react'
import GlassCard from '../components/common/GlassCard'
import ProgressBar from '../components/common/ProgressBar'
import { S } from '../styles/theme'

const PERIOD_LABELS = { yearly: '연간', monthly: '월간', weekly: '주간', daily: '일간' }

function PremiumLock({ feature, onUnlock }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{feature}</div>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
        이 기능은 프리미엄 플랜에서만 사용할 수 있어요.<br />월 2,900원으로 모든 기능을 잠금 해제하세요.
      </div>
      <button style={{ ...S.primaryBtn, width: 'auto', padding: '12px 28px' }} onClick={onUnlock}>
        ✨ 프리미엄 시작하기
      </button>
    </div>
  )
}

export default function GoalsPage({ goals = {}, setGoals, isPremium, setIsPremium }) {
  const [period, setPeriod]   = useState('weekly')
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc,  setNewDesc]  = useState('')

  if (!isPremium) {
    return <PremiumLock feature="목표 관리" onUnlock={() => setIsPremium(true)} />
  }

  const list = goals[period] || []

  const addGoal = () => {
    if (!newTitle.trim()) return
    setGoals({ ...goals, [period]: [...list, { id: Date.now().toString(), title: newTitle, progress: 0, desc: newDesc }] })
    setNewTitle(''); setNewDesc(''); setShowForm(false)
  }

  const updateProgress = (id, delta) => {
    setGoals({
      ...goals,
      [period]: list.map(g => g.id === id
        ? { ...g, progress: Math.min(100, Math.max(0, g.progress + delta)) }
        : g),
    })
  }

  const removeGoal = id => setGoals({ ...goals, [period]: list.filter(g => g.id !== id) })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1' }}>🎯 목표 관리</div>
        <button style={S.accentSmallBtn} onClick={() => { setShowForm(!showForm); setNewTitle(''); setNewDesc('') }}>
          + 추가
        </button>
      </div>

      {/* 기간 탭 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {Object.entries(PERIOD_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setPeriod(key)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: `1px solid ${period === key ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
            background: period === key ? 'rgba(99,102,241,0.2)' : 'transparent',
            color: period === key ? '#818cf8' : '#94a3b8',
          }}>{label}</button>
        ))}
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <GlassCard style={{ marginBottom: 14, border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ color: '#818cf8', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            {PERIOD_LABELS[period]} 목표 추가
          </div>
          <input type="text" placeholder="목표 제목" value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && document.getElementById('goalDescInput')?.focus()}
            style={S.input} autoFocus />
          <input id="goalDescInput" type="text" placeholder="설명 (선택)" value={newDesc} onChange={e => setNewDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addGoal()} style={{ ...S.input, marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={S.accentSmallBtn} onClick={addGoal}>저장</button>
            <button style={S.ghostBtn} onClick={() => { setShowForm(false); setNewTitle(''); setNewDesc('') }}>취소</button>
          </div>
        </GlassCard>
      )}

      {/* 목표 카드 */}
      {list.map(g => (
        <GlassCard key={g.id} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, flex: 1, marginRight: 8 }}>{g.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#818cf8', fontWeight: 800, fontSize: 16 }}>{g.progress}%</span>
              <span style={{ color: '#475569', fontSize: 20, cursor: 'pointer', lineHeight: 1 }} onClick={() => removeGoal(g.id)}>×</span>
            </div>
          </div>
          <ProgressBar
            value={g.progress}
            color={g.progress >= 70 ? 'linear-gradient(90deg,#34d399,#6ee7b7)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)'}
          />
          {g.desc && <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>{g.desc}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {[-10, +10].map(d => (
              <button key={d} style={S.tinyBtn} onClick={() => updateProgress(g.id, d)}>{d > 0 ? '+10' : '−10'}</button>
            ))}
            {g.progress < 100 && (
              <button style={{ ...S.tinyBtn, background: 'rgba(52,211,153,0.15)', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}
                onClick={() => updateProgress(g.id, 100 - g.progress)}>완료!</button>
            )}
          </div>
        </GlassCard>
      ))}

      {list.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <div style={{ color: '#64748b', fontSize: 14 }}>목표를 추가해보세요!</div>
          <button style={{ ...S.accentSmallBtn, marginTop: 14 }} onClick={() => setShowForm(true)}>+ 첫 목표 만들기</button>
        </div>
      )}
    </div>
  )
}
