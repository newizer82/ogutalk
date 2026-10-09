import { useState, useEffect } from 'react'

// 이번 주 목표 — 오구 지수의 "5" 중 한 칸.
// 목표 탭을 되살리는 대신 할일 탭 맨 위에 둔다(탭을 늘리지 않는다).
// 로컬 전용: 목표 하나와 "이번 주에 들여다봤는지"만 기록한다.
const KEY = 'ogu_weekly_goal'

/** ISO 주차 키 — 'YYYY-Www' */
export function weekKey(now = Date.now()) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))          // 그 주의 목요일
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function loadWeeklyGoal() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function save(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {}
}

/** 이번 주 목표가 있고, 이번 주에 한 번이라도 열어봤는가 */
export function goalKeptThisWeek(now = Date.now()) {
  const g = loadWeeklyGoal()
  return !!g.text && g.seenWeek === weekKey(now)
}

export default function WeeklyGoalCard({ onChange }) {
  const [goal, setGoal]       = useState(loadWeeklyGoal)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')

  // 화면에 떴다 = 들여다봤다 (이번 주 한 번만 기록하면 된다)
  useEffect(() => {
    const wk = weekKey()
    if (goal.text && goal.seenWeek !== wk) {
      const next = { ...goal, seenWeek: wk }
      save(next); setGoal(next); onChange?.()
    }
  }, [goal, onChange])

  const commit = () => {
    const text = draft.trim()
    if (!text) { setEditing(false); return }
    const next = { text, week: weekKey(), seenWeek: weekKey(), createdAt: Date.now() }
    save(next); setGoal(next); setEditing(false); onChange?.()
  }

  const stale = goal.text && goal.week !== weekKey()

  return (
    <div style={{
      marginBottom: 14, padding: 16, borderRadius: 20,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>🎯 이번 주 목표</span>
        <span style={{ flex: 1 }} />
        {goal.text && !editing && (
          <button
            onClick={() => { setDraft(goal.text); setEditing(true) }}
            style={{ border: 'none', background: 'transparent', color: '#818cf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            바꾸기
          </button>
        )}
      </div>

      {editing || !goal.text ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="weekly-goal-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit() }}
            placeholder="예: 주 3회 운동하기"
            style={{
              flex: 1, minWidth: 0, padding: '11px 12px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
              color: '#e2e8f0', fontSize: 14,
            }}
          />
          <button
            onClick={commit}
            style={{
              padding: '11px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
              fontSize: 13, fontWeight: 800, flexShrink: 0,
            }}
          >
            저장
          </button>
        </div>
      ) : (
        <>
          <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>
            {goal.text}
          </div>
          <div style={{ color: stale ? '#fb923c' : '#64748b', fontSize: 12, marginTop: 6 }}>
            {stale ? '지난주에 세운 목표예요. 이번 주 목표로 바꿔보세요.' : '✓ 이번 주 목표를 확인했어요 (오구 지수 10점)'}
          </div>
        </>
      )}
    </div>
  )
}
