import { useState, useEffect } from 'react'
import MissionCard from '../components/todos/MissionCard'
import TimeBanner from '../components/home/TimeBanner'
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
  scoreGoals = {},   // 오구 지수 기준 (연·월 목표용 goals 와 다른 값이다)
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
  // 홈의 "오늘의 약속·일정" — 월·주간 계획은 여기 넣지 않는다 (할일 탭에서 본다)
  const shown        = todos.filter(t => t.todo_type !== 'period')
  const doneTodos    = shown.filter(t => t.completed || t.done)
  // 기한 없는 것 먼저, 그 다음 날짜 순. 등록 순서로 두면 어제 적어둔 게 맨 위에 남는다.
  // 날짜는 'YYYY-MM-DD' 문자열 그대로 비교한다 — new Date() 로 돌리면 UTC 로 읽혀 하루가 밀린다
  const pendingTodos = shown
    .filter(t => !t.completed && !t.done)
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0      // 같은 그룹 안에서는 원래 순서 (sort 는 안정적이다)
      if (!a.due_date) return -1
      if (!b.due_date) return 1
      return String(a.due_date).localeCompare(String(b.due_date))
    })
  const todoPct      = shown.length ? Math.round(doneTodos.length / shown.length * 100) : 0

  // 알람 통계

  return (
    <div>
      {/* ── 시간대 배너 — 지금 내 숫자로 말한다 (닫기 없음) ── */}
      <TimeBanner checkins={checkins} goals={scoreGoals} lifeStage={lifeStage} onTabChange={onTabChange} />

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
        hidePeriod compact
      />


      {/* ── 카드 2: 할일 현황 ── */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>✅</span>
            <span style={{ color: '#3A3A3E', fontSize: 13, fontWeight: 700 }}>약속 · 일정</span>
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
              {t.due_date && (() => {
                // 지난 것은 D--6 이 아니라 "6일 지남" — 마이너스 두 개는 아무 뜻도 아니다
                const d = Math.ceil((new Date(t.due_date) - new Date()) / 86400000)
                return (
                  <span style={{
                    fontSize: 10, flexShrink: 0, fontWeight: d < 0 ? 800 : 400,
                    color: d < 0 ? theme.status.error : theme.text.muted,
                  }}>
                    {d < 0 ? `${-d}일 지남` : d === 0 ? 'D-DAY' : `D-${d}`}
                  </span>
                )
              })()}
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
