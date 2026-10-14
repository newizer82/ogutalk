import { useState, useEffect } from 'react'
import MissionCard from '../components/todos/MissionCard'
import TodayTimeHero from '../components/home/TodayTimeHero'
import BannerCarousel from '../components/home/BannerCarousel'
import InstallPrompt from '../components/common/InstallPrompt'
import MonthCalendar from '../components/home/MonthCalendar'
import TextWithLinks from '../components/common/TextWithLinks'
import ShareButton from '../components/common/ShareButton'
import SnsShareButtons from '../components/common/SnsShareButtons'
import NotesCard from '../components/notes/NotesCard'
import { theme } from '../styles/theme'

const pad = n => String(n).padStart(2, '0')

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
  todos = [],
  onTabChange,
  alarmHours = {},
  isLoggedIn = false,
  calendarSync = false,
  calendarIds = [],
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
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

      {/* 웹에서만: PC 는 PWA 설치, 폰 웹은 Play 앱 (네이티브에서는 아무것도 안 뜬다) */}
      <InstallPrompt />

      {/* ── 오늘의 추천 미션 (접을 수 있음) ── */}
      <MissionCard stage={lifeStage} collapsible />

      {/* ── 월간 캘린더 — 일정·마감·오구 지수를 한 장에 ── */}
      <MonthCalendar
        todos={todos} calendarSync={calendarSync} calendarIds={calendarIds}
        onTabChange={onTabChange} onAddTodo={onAddTodo}
        onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo}
      />


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
