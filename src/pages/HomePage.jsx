import { useState, useEffect } from 'react'
import MissionCard from '../components/todos/MissionCard'
import TodayTimeHero from '../components/home/TodayTimeHero'
import BannerCarousel from '../components/home/BannerCarousel'
import TextWithLinks from '../components/common/TextWithLinks'
import ShareButton from '../components/common/ShareButton'
import SnsShareButtons from '../components/common/SnsShareButtons'
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
              ? 'linear-gradient(180deg,#D9531B,#FF6B2C)'
              : isActive ? activeColor : 'rgba(0,0,0,0.03)',
            transition: 'height 0.3s ease',
          }} />
        )
      })}
    </div>
  )
}

// ── 카드 공통 스타일 ───────────────────────────────────────
const cardStyle = {
  background: 'rgba(0,0,0,0.03)',
  border:     '1px solid rgba(0,0,0,0.05)',
  borderRadius: 20,
  padding:    '16px 18px',
  marginBottom: 14,
}

// 다음 활성 알람(×시 59분)까지 남은 분. 켜진 시간대가 없으면 null
function minutesToNextAlarm(now, alarmHours = {}) {
  for (let i = 0; i < 24; i++) {
    const t = new Date(now)
    t.setMinutes(59, 0, 0)
    t.setHours(now.getHours() + i)
    if (t <= now) continue
    const targetHour = (t.getHours() + 1) % 24
    if (alarmHours[targetHour]) return { min: Math.round((t - now) / 60000), at: t }
  }
  return null
}

export default function HomePage({
  lifeStage = null,
  checkins = [],
  nowLabel = null,
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
      {/* ── 히어로: 오늘 내 시간 (알람 카운트다운이 아니라 "시간이 어디로 갔나") ── */}
      <TodayTimeHero
        checkins={checkins}
        nextAlarm={minutesToNextAlarm(now, alarmHours)}
        nowLabel={nowLabel}
        onOpenReport={() => onTabChange('report')}
      />

      {/* 배너 — 자리는 홈에 하나뿐 */}
      <BannerCarousel onTabChange={onTabChange} />

      {/* 알람 시간대 한 줄 — 설정으로 가는 입구만 남긴다 */}
      <button
        onClick={() => onTabChange('alarms')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          border: '1px solid #ECECEF', borderRadius: 20, padding: '13px 16px',
          background: '#fff', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16 }}>🔔</span>
        <span style={{ flex: 1, fontSize: 13.5, color: '#3A3A3E', fontWeight: 600 }}>
          오늘 알람 {totalActiveHours}시간대 · {alarmCount}회 울림
        </span>
        <span style={{ fontSize: 16, color: '#C7C7CC' }}>›</span>
      </button>

      {/* ── 오늘의 추천 미션 (접을 수 있음) ── */}
      <MissionCard stage={lifeStage} collapsible />

      {/* ── 카드 2: 할일 현황 ── */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>✅</span>
            <span style={{ color: '#3A3A3E', fontSize: 13, fontWeight: 700 }}>할일 현황</span>
            {pendingTodos.length > 0 && (
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 10,
                background: 'rgba(248,113,113,0.15)', color: '#D23B2E', fontWeight: 700,
              }}>
                {pendingTodos.length}개 남음
              </span>
            )}
          </div>
          <button onClick={() => onTabChange('todos')} style={{
            padding: '4px 10px', borderRadius: 10, border: 'none',
            background: 'rgba(255,107,44,0.14)', color: theme.accent.secondary,
            fontSize: 11, cursor: 'pointer',
          }}>
            전체 →
          </button>
        </div>

        {/* 진행률 바 */}
        <div style={{
          position: 'relative', height: 8, borderRadius: 4,
          background: 'rgba(0,0,0,0.035)', marginBottom: 10,
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4,
            width: `${todoPct}%`,
            background: 'linear-gradient(90deg,#FF6B2C,#D9531B)',
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
              background: 'rgba(255,107,44,0.14)', color: theme.accent.secondary,
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
              borderBottom: i < pendingTodos.length - 1 ? '1px solid rgba(0,0,0,0.025)' : 'none',
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

      {/* ── 카카오 공유 + SNS 공유 ── */}
      <ShareButton progress={todoPct} />
      <SnsShareButtons />
    </div>
  )
}
