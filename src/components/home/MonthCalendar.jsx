import { useState, useEffect, useMemo } from 'react'
import { getEvents } from '../../lib/calendar'
import { dayScores } from '../../lib/dayLog'
import { monthCells, eventsByDay, todosByDay, scoreTint, dateKey, gridRange, endDateFor } from '../../lib/monthGrid'

// 홈 하단 월간 캘린더 — 기기 일정 + 내 할일 마감 + 오구 지수를 한 장에 겹쳐 본다.
// "이번 달 내 시간이 어땠나"를 보여주는 자리지, 일정을 관리하는 자리가 아니다
// (일정 추가·수정은 기기 캘린더 앱의 몫 — 우리는 읽기만 한다).
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const EVENT_DOT = '#4B6BD4'
const TODO_DOT  = '#FF6B2C'

const hhmm = ms => {
  const d = new Date(ms)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function MonthCalendar({ todos = [], calendarSync = false, calendarIds = [], onTabChange, onAddTodo }) {
  const today = new Date()
  const [view, setView]   = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [picked, setPicked] = useState(dateKey(today))
  const [events, setEvents] = useState([])
  // 입력 중인 것 — null 이면 버튼 두 개만 보인다
  // kind: 'appointment' 하루 + 시각(시 단위) / 'plan' 2~6일·주간·월간
  const [draft, setDraft] = useState(null)

  const weeks  = useMemo(() => monthCells(view.y, view.m), [view])
  const scores = useMemo(() => dayScores(), [view])

  // 기기 일정 — 연동을 켰을 때만, 달을 넘길 때마다 한 번씩 조회한다
  useEffect(() => {
    if (!calendarSync) { setEvents([]); return }
    let alive = true
    const [from, to] = gridRange(weeks)
    getEvents(from, to, 300, calendarIds).then(rows => { if (alive) setEvents(rows) })
    return () => { alive = false }
  }, [calendarSync, calendarIds, weeks])

  const evMap   = useMemo(() => eventsByDay(events), [events])
  const todoMap = useMemo(() => todosByDay(todos), [todos])

  const todayKey = dateKey(today)
  const move = step => {
    const d = new Date(view.y, view.m + step, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }
  const goToday = () => {
    setView({ y: today.getFullYear(), m: today.getMonth() })
    setPicked(todayKey)
  }

  const save = () => {
    const title = (draft?.title ?? '').trim()
    if (!title) return
    if (draft.kind === 'appointment') {
      onAddTodo?.(title, 'appointment', picked, {
        due_hour: draft.hour,                       // null 이면 종일
        place: draft.place?.trim() || null,
      })
    } else {
      onAddTodo?.(title, 'plan', picked, { end_date: endDateFor(picked, draft.span) })
    }
    setDraft(null)
  }

  const dayEvents = evMap[picked] ?? []
  const dayTodos  = todoMap[picked] ?? []
  const dayScore  = scores[picked]
  const pickedLabel = (() => {
    const [, mm, dd] = picked.split('-')
    const wd = WEEKDAYS[new Date(`${picked}T00:00:00`).getDay()]
    return `${Number(mm)}월 ${Number(dd)}일 (${wd})`
  })()

  return (
    <section style={{
      marginBottom: 14, padding: 16, borderRadius: 20,
      background: '#FFFFFF', border: '1px solid #ECECEF',
    }}>
      {/* 헤더: 월 이동 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <button onClick={() => move(-1)} aria-label="이전 달" style={navBtn}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#111111', minWidth: 96, textAlign: 'center' }}>
          {view.y}년 {view.m + 1}월
        </span>
        <button onClick={() => move(1)} aria-label="다음 달" style={navBtn}>›</button>
        <span style={{ flex: 1 }} />
        <button onClick={goToday} style={{
          border: 'none', background: 'rgba(255,107,44,0.12)', color: '#D9531B',
          fontSize: 11.5, fontWeight: 800, borderRadius: 9, padding: '5px 10px', cursor: 'pointer',
        }}>
          오늘
        </button>
      </div>

      {/* 요일 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <span key={w} style={{
            textAlign: 'center', fontSize: 11, fontWeight: 700,
            color: i === 0 ? '#D23B2E' : i === 6 ? '#4B6BD4' : '#9A9AA0',
          }}>{w}</span>
        ))}
      </div>

      {/* 격자 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {weeks.flat().map(cell => {
          const isToday  = cell.key === todayKey
          const isPicked = cell.key === picked
          const hasEv    = !!evMap[cell.key]?.length
          const hasTodo  = !!todoMap[cell.key]?.length
          return (
            <button
              key={cell.key}
              onClick={() => { setPicked(cell.key); setDraft(null) }}
              style={{
                height: 44, padding: 0, cursor: 'pointer', borderRadius: 11,
                background: scoreTint(scores[cell.key]),
                border: isPicked ? '1.5px solid #FF6B2C' : isToday ? '1.5px solid #FFD2B8' : '1.5px solid transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                opacity: cell.inMonth ? 1 : 0.32,
              }}
            >
              <span style={{
                fontSize: 12.5, fontWeight: isToday ? 800 : 600,
                color: isToday ? '#D9531B'
                  : cell.weekday === 0 ? '#D23B2E'
                  : cell.weekday === 6 ? '#4B6BD4' : '#3A3A3E',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {cell.day}
              </span>
              <span style={{ display: 'flex', gap: 3, height: 4 }}>
                {hasEv   && <span style={{ width: 4, height: 4, borderRadius: 2, background: EVENT_DOT }} />}
                {hasTodo && <span style={{ width: 4, height: 4, borderRadius: 2, background: TODO_DOT }} />}
              </span>
            </button>
          )
        })}
      </div>

      {/* 선택한 날 */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F0F3' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#111111' }}>{pickedLabel}</span>
          {typeof dayScore === 'number' && (
            <span style={{
              fontSize: 11, fontWeight: 800, color: '#D9531B',
              background: 'rgba(255,107,44,0.12)', borderRadius: 8, padding: '2px 7px',
            }}>
              오구 지수 {dayScore}
            </span>
          )}
        </div>

        {dayEvents.map(e => (
          <div key={`${e.id}-${e.startMs}`} style={row}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: EVENT_DOT, flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: '#8E8E93', flexShrink: 0, minWidth: 38 }}>
              {e.allDay ? '종일' : hhmm(e.startMs)}
            </span>
            <span style={{ fontSize: 13, color: '#3A3A3E', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.title || '(제목 없음)'}
            </span>
          </div>
        ))}

        {dayTodos.map(t => (
          <div key={t.id} style={row}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: TODO_DOT, flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: '#8E8E93', flexShrink: 0, minWidth: 38 }}>
              {t.todo_type === 'appointment'
                ? (t.due_hour != null ? `${t.due_hour}시` : '종일')
                : t.end_date ? '기간' : '마감'}
            </span>
            <span style={{
              fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: (t.completed || t.done) ? '#B0B0B6' : '#3A3A3E',
              textDecoration: (t.completed || t.done) ? 'line-through' : 'none',
            }}>
              {t.title || t.text}
              {t.place && <span style={{ color: '#9A9AA0', fontWeight: 400 }}> · {t.place}</span>}
            </span>
          </div>
        ))}

        {!dayEvents.length && !dayTodos.length && (
          <div style={{ fontSize: 12.5, color: '#9A9AA0', padding: '4px 0' }}>
            {calendarSync ? '이 날은 일정도 마감도 없어요' : '이 날 마감인 할일이 없어요'}
          </div>
        )}

        {/* 약속 / 일정 추가 — 날짜를 고르는 행위가 곧 입력의 시작이다.
            지난 날짜에는 숨긴다 (만들자마자 "지난 것"이 되어 알람 제안까지 오염된다) */}
        {onAddTodo && picked >= todayKey && (
          draft === null ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={() => setDraft({ kind: 'appointment', title: '', hour: null, place: '' })} style={addBtn}>
                📍 약속 추가
              </button>
              <button onClick={() => setDraft({ kind: 'plan', title: '', span: '2' })} style={addBtn}>
                🗂 일정 추가
              </button>
            </div>
          ) : (
            <div style={{
              marginTop: 10, padding: 12, borderRadius: 14,
              background: '#FFF9F5', border: '1px solid #FFE1CE',
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#111111', marginBottom: 10 }}>
                {draft.kind === 'appointment' ? '📍 약속' : '🗂 일정'} · {pickedLabel}
                {draft.kind === 'plan' && (
                  <span style={{ color: '#8E8E93', fontWeight: 600 }}>
                    {' '}~ {endDateFor(picked, draft.span).slice(5).replace('-', '/')}
                  </span>
                )}
              </div>

              {draft.kind === 'appointment' ? (
                <>
                  {/* 시각 — 분 단위는 쓰지 않는다. 고르지 않으면 종일 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4, marginBottom: 8 }}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <button
                        key={h}
                        onClick={() => setDraft(d => ({ ...d, hour: d.hour === h ? null : h }))}
                        style={{
                          padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
                          border: `1px solid ${draft.hour === h ? '#FF6B2C' : '#ECECEF'}`,
                          background: draft.hour === h ? '#FF6B2C' : '#FFFFFF',
                          color: draft.hour === h ? '#FFFFFF' : '#8E8E93',
                        }}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#9A9AA0', marginBottom: 10 }}>
                    {draft.hour == null ? '시각을 고르지 않으면 종일로 저장돼요' : `${draft.hour}시 약속`}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {[['2','2일'],['3','3일'],['4','4일'],['5','5일'],['6','6일'],['week','주간'],['month','월간']].map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setDraft(d => ({ ...d, span: v }))}
                      style={{
                        padding: '7px 11px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        border: `1px solid ${draft.span === v ? '#FF6B2C' : '#ECECEF'}`,
                        background: draft.span === v ? '#FF6B2C' : '#FFFFFF',
                        color: draft.span === v ? '#FFFFFF' : '#8E8E93',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <input
                autoFocus
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setDraft(null) }}
                placeholder={draft.kind === 'appointment' ? '약속 내용' : '일정 내용'}
                style={inputStyle}
              />

              {draft.kind === 'appointment' && (
                <input
                  value={draft.place}
                  onChange={e => setDraft(d => ({ ...d, place: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setDraft(null) }}
                  placeholder="장소 (선택)"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button onClick={save} disabled={!draft.title.trim()} style={{
                  flex: 1, border: 'none', borderRadius: 12, padding: '10px', fontSize: 12.5, fontWeight: 800,
                  cursor: draft.title.trim() ? 'pointer' : 'default',
                  background: draft.title.trim() ? '#FF6B2C' : '#F1F1F4',
                  color: draft.title.trim() ? '#FFFFFF' : '#B0B0B6',
                }}>
                  저장
                </button>
                <button onClick={() => setDraft(null)} style={{
                  border: '1px solid #ECECEF', borderRadius: 12, padding: '10px 14px', cursor: 'pointer',
                  background: '#FFFFFF', color: '#9A9AA0', fontSize: 12.5, fontWeight: 700,
                }}>
                  취소
                </button>
              </div>
            </div>
          )
        )}

        {!calendarSync && (
          <button
            onClick={() => onTabChange?.('settings')}
            style={{
              marginTop: 8, width: '100%', border: '1px solid #ECECEF', borderRadius: 12,
              background: '#FAFAFB', color: '#8E8E93', fontSize: 12, fontWeight: 700,
              padding: '9px 10px', cursor: 'pointer',
            }}
          >
            📅 캘린더를 연동하면 기기 일정도 함께 보여요
          </button>
        )}
      </div>
    </section>
  )
}

const addBtn = {
  flex: 1, border: '1px solid #FFD2B8', borderRadius: 12,
  background: 'rgba(255,107,44,0.08)', color: '#D9531B',
  fontSize: 12.5, fontWeight: 800, padding: '11px 8px', cursor: 'pointer',
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #ECECEF', borderRadius: 12,
  padding: '10px 12px', fontSize: 13, color: '#111111', background: '#FFFFFF',
}

const navBtn = {
  border: 'none', background: 'transparent', color: '#8E8E93',
  fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: '2px 8px',
}

const row = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
}
