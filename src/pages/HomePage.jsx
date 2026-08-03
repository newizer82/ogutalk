import { useState, useEffect } from 'react'
import TextWithLinks from '../components/common/TextWithLinks'
import ShareButton from '../components/common/ShareButton'
import NotesCard from '../components/notes/NotesCard'
import { theme } from '../styles/theme'

const pad = n => String(n).padStart(2, '0')

// ── 24시간 타임라인 한 행 ─────────────────────────────────
function TimelineRow({ hours, currentHour, activeColor, showCurrent }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 18 }}>
      {Array.from({ length: 24 }, (_, h) => {
        const isActive = hours.has ? hours.has(h) : !!hours[h]
        const isCur    = showCurrent && h === currentHour
        return (
          <div key={h} style={{
            flex: 1, borderRadius: 2,
            height: isCur ? 18 : isActive ? 14 : 6,
            background: isCur
              ? 'linear-gradient(180deg,#818cf8,#6366f1)'
              : isActive ? activeColor : 'rgba(255,255,255,0.05)',
            transition: 'height 0.3s ease',
          }} />
        )
      })}
    </div>
  )
}

// ── 카드 공통 스타일 ───────────────────────────────────────
const cardStyle = {
  background: 'rgba(255,255,255,0.05)',
  border:     '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
  padding:    '16px 18px',
  marginBottom: 14,
}

export default function HomePage({
  alarmCount = 0,
  todos = [],
  onTabChange,
  alarmHours = {},
  customAlarms = [],
  isLoggedIn = false,
  notes = [],
  onAddNote,
  onDeleteNote,
  onLoginOpen,
}) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const H = now.getHours(), M = now.getMinutes()

  // 할일 계산
  const doneTodos    = todos.filter(t => t.completed || t.done)
  const pendingTodos = todos.filter(t => !t.completed && !t.done)
  const todoPct      = todos.length ? Math.round(doneTodos.length / todos.length * 100) : 0

  // 알람 통계
  const totalActiveHours = Object.values(alarmHours).filter(Boolean).length
  const customAlarmHours = new Set(customAlarms.filter(a => a.isEnabled).map(a => a.hour))

  return (
    <div>
      {/* ── 카드 1: 히어로 (오구 설정 · 시각 · 알람 설정 + 타임라인) ── */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => onTabChange('settings')}
            style={{
              flex: 1, padding: '6px 4px', borderRadius: 14, border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>⏱️</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>오구 설정</span>
          </button>

          <div style={{ flex: 1, textAlign: 'center', padding: '0 4px' }}>
            <span style={{
              fontSize: 34, fontWeight: 900, color: '#f1f5f9',
              letterSpacing: -1, fontVariantNumeric: 'tabular-nums',
            }}>
              {pad(H)}:{pad(M)}
            </span>
          </div>

          <button
            onClick={() => onTabChange('alarms')}
            style={{
              flex: 1, padding: '6px 4px', borderRadius: 14, border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              background: 'linear-gradient(135deg,#f59e0b,#fb923c)',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>🔔</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>알람 설정</span>
          </button>
        </div>

        {/* 타임라인 */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <span style={{ color: theme.accent.secondary, fontSize: 9, fontWeight: 700 }}>현재 {H}시</span>
          </div>

          <TimelineRow
            hours={alarmHours} currentHour={H}
            activeColor="rgba(99,102,241,0.55)" showCurrent
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            {['0시', '6시', '12시', '18시', '24시'].map(l => (
              <span key={l} style={{ color: theme.text.muted, fontSize: 8 }}>{l}</span>
            ))}
          </div>

          <TimelineRow
            hours={customAlarmHours} currentHour={H}
            activeColor="rgba(251,146,60,0.75)" showCurrent={false}
          />

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(99,102,241,0.55)' }} />
              <span style={{ color: '#6366f1', fontSize: 9, fontWeight: 700 }}>오구 알람</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(251,146,60,0.75)' }} />
              <span style={{ color: '#fb923c', fontSize: 9, fontWeight: 700 }}>커스텀 알람</span>
            </div>
          </div>

          <div style={{ color: '#334155', fontSize: 9, marginTop: 6, textAlign: 'center' }}>
            오늘 활성 알람 {totalActiveHours}시간대 · {alarmCount}회 울림
          </div>
        </div>
      </section>

      {/* ── 카드 2: 할일 현황 ── */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>✅</span>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>할일 현황</span>
            {pendingTodos.length > 0 && (
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 10,
                background: 'rgba(248,113,113,0.15)', color: '#f87171', fontWeight: 700,
              }}>
                {pendingTodos.length}개 남음
              </span>
            )}
          </div>
          <button onClick={() => onTabChange('todos')} style={{
            padding: '4px 10px', borderRadius: 10, border: 'none',
            background: 'rgba(99,102,241,0.2)', color: theme.accent.secondary,
            fontSize: 11, cursor: 'pointer',
          }}>
            전체 →
          </button>
        </div>

        {/* 진행률 바 */}
        <div style={{
          position: 'relative', height: 8, borderRadius: 4,
          background: 'rgba(255,255,255,0.06)', marginBottom: 10,
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4,
            width: `${todoPct}%`,
            background: 'linear-gradient(90deg,#6366f1,#818cf8)',
            transition: 'width 0.8s ease',
          }} />
        </div>

        {/* 할일 목록 */}
        {todos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: theme.text.muted, fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📝</div>
            할일을 추가해보세요<br />
            <button onClick={() => onTabChange('todos')} style={{
              marginTop: 10, padding: '6px 16px', borderRadius: 10, border: 'none',
              background: 'rgba(99,102,241,0.2)', color: theme.accent.secondary,
              fontSize: 12, cursor: 'pointer',
            }}>+ 추가</button>
          </div>
        ) : pendingTodos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '12px 0', color: theme.status.success, fontSize: 14, fontWeight: 800 }}>
            🎉 모든 할일 완료!
          </div>
        ) : (
          pendingTodos.map((t, i) => (
            <div key={t.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
              borderBottom: i < pendingTodos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background:
                  t.priority === 'high'   ? theme.status.error   :
                  t.priority === 'medium' ? theme.status.warning : theme.text.muted,
              }} />
              <span style={{ color: theme.text.primary, fontSize: 13, flex: 1, lineHeight: 1.4 }}>
                <TextWithLinks text={t.title || t.text} />
                {t.due_date && (() => {
                  const dt = new Date(t.due_date)
                  return (
                    <span style={{ color: theme.text.secondary, fontWeight: 400, marginLeft: 4 }}>
                      ({dt.getMonth() + 1}/{dt.getDate()})
                    </span>
                  )
                })()}
              </span>
              {t.due_date && (
                <span style={{ color: theme.text.muted, fontSize: 10, flexShrink: 0 }}>
                  D-{Math.ceil((new Date(t.due_date) - new Date()) / 86400000)}
                </span>
              )}
            </div>
          ))
        )}
      </section>

      {/* ── 카드 3: 빠른 메모 ── */}
      <NotesCard
        isLoggedIn={isLoggedIn}
        notes={notes}
        onAdd={onAddNote}
        onDelete={onDeleteNote}
        onLoginOpen={onLoginOpen}
      />

      {/* ── 카카오 공유 ── */}
      <ShareButton progress={todoPct} />
    </div>
  )
}
