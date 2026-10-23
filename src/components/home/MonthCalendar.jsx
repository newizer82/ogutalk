import { useState, useEffect, useMemo } from 'react'
import { getEvents } from '../../lib/calendar'
import { dayScores } from '../../lib/dayLog'
import { monthCells, eventsByDay, todosByDay, spanSegments, scoreTint, dateKey, gridRange, spanRange } from '../../lib/monthGrid'

// 홈 하단 월간 캘린더 — 기기 일정 + 내 할일 마감 + 오구 지수를 한 장에 겹쳐 본다.
// "이번 달 내 시간이 어땠나"를 보여주는 자리지, 일정을 관리하는 자리가 아니다
// (일정 추가·수정은 기기 캘린더 앱의 몫 — 우리는 읽기만 한다).
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const EVENT_DOT = '#4B6BD4'   // 기기 캘린더 일정
const TODO_DOT  = '#FF6B2C'   // 📍 약속 · 할일 마감
const PLAN_DOT  = '#1E9E8A'   // 🗂 일정 · 📆 계획 (기간이 있는 것)

const isPlanLike = t => t?.todo_type === 'plan' || t?.todo_type === 'period' || !!t?.end_date
const dotColorOf = t => (isPlanLike(t) ? PLAN_DOT : TODO_DOT)

const hhmm = ms => {
  const d = new Date(ms)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function MonthCalendar({
  todos = [], calendarSync = false, calendarIds = [],
  onTabChange, onAddTodo, onUpdateTodo, onDeleteTodo,
  hidePeriod = false,          // 홈에서는 월·주간 계획을 숨긴다 (계획은 할일 탭에서 본다)
  compact = false,             // 홈: 칸을 낮추고 하루 목록을 접는다 (홈은 "이번 달이 어땠나" 를 보는 자리)
}) {
  const today = new Date()
  const [view, setView]   = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [picked, setPicked] = useState(dateKey(today))
  const [events, setEvents] = useState([])
  // 입력 중인 것 — null 이면 버튼 두 개만 보인다
  // kind: 'appointment' 하루 + 시각(시 단위) / 'plan' 2~6일·주간·월간
  const [draft, setDraft] = useState(null)
  const [failed, setFailed] = useState(false)   // 서버 저장 실패 — 조용히 사라지면 쓴 걸 잃는다
  const [editing, setEditing] = useState(null)  // 누른 항목 id (제목 수정 · 삭제)
  const [open, setOpen] = useState(false)       // compact 에서 하루 목록 펼침 — 날을 누르면 열린다

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
  const shownTodos = useMemo(
    () => (hidePeriod ? todos.filter(t => t.todo_type !== 'period') : todos),
    [todos, hidePeriod])
  const todoMap = useMemo(() => todosByDay(shownTodos), [shownTodos])
  // 여러 날짜리는 점이 아니라 띠로 — 점만 찍으면 "따로 있는 이틀" 로 보인다
  const segMap = useMemo(() => spanSegments(shownTodos), [shownTodos])
  // 마감일이 없으면 어느 칸에도 올라가지 못한다 → 달력이 모르는 할일이 된다
  const undated = useMemo(
    () => shownTodos.filter(t => !t.due_date && !(t.completed || t.done)),
    [shownTodos])

  const todayKey = dateKey(today)
  const move = step => {
    const d = new Date(view.y, view.m + step, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }
  const goToday = () => {
    setView({ y: today.getFullYear(), m: today.getMonth() })
    setPicked(todayKey)
  }

  const save = async () => {
    const title = (draft?.title ?? '').trim()
    if (!title) return
    setFailed(false)
    const ok = draft.kind === 'appointment'
      ? await onAddTodo?.(title, 'appointment', picked, {
          due_hour: draft.hour,                     // null 이면 종일
          place: draft.place?.trim() || null,
        })
      // 주간·월간은 고른 날이 아니라 "그 주/그 달" 전체다 → 시작일도 함께 맞춘다
      : await (() => {
          const { start, end } = spanRange(picked, draft.span)
          return onAddTodo?.(title, draft.kind, start, { end_date: end })
        })()
    // 로컬 저장(비로그인)은 아무것도 돌려주지 않는다 → undefined 는 성공으로 본다.
    // 서버가 거부했을 때만 입력창을 열어 둔다. 닫아버리면 쓴 내용을 잃는다.
    if (ok === false) { setFailed(true); return }
    setDraft(null)
  }

  const applyEdit = () => {
    const title = (editing?.title ?? '').trim()
    if (!title) return
    onUpdateTodo?.(editing.id, { title })
    setEditing(null)
  }

  const dayEvents = evMap[picked] ?? []
  const dayTodos  = todoMap[picked] ?? []
  const dayScore  = scores[picked]
  const dayCount  = dayEvents.length + dayTodos.length
  const bodyOpen  = !compact || open
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
          const dayItems = todoMap[cell.key] ?? []
          const hasTodo  = dayItems.some(t => !isPlanLike(t))
          const hasPlan  = dayItems.some(isPlanLike)
          const seg      = segMap[cell.key]
          return (
            <button
              key={cell.key}
              onClick={() => {
                setPicked(cell.key); setDraft(null); setEditing(null)
                // 빈 날을 눌러 "아무것도 없어요" 를 펼치게 하지 않는다
                setOpen(hasEv || dayItems.length > 0)
              }}
              style={{
                position: 'relative', overflow: 'visible',
                height: compact ? 34 : 44, padding: 0, cursor: 'pointer', borderRadius: compact ? 9 : 11,
                background: scoreTint(scores[cell.key]),
                border: isPicked ? '1.5px solid #FF6B2C' : isToday ? '1.5px solid #FFD2B8' : '1.5px solid transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: compact ? 1 : 3,
                opacity: cell.inMonth ? 1 : 0.32,
              }}
            >
              <span style={{
                fontSize: compact ? 12 : 12.5, fontWeight: isToday ? 800 : 600,
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
                {/* 여러 날짜리는 아래 띠가 말해준다 → 점을 겹쳐 찍지 않는다 */}
                {hasPlan && !seg && <span style={{ width: 4, height: 4, borderRadius: 2, background: PLAN_DOT }} />}
              </span>
              {/* 기간 띠 — 칸 사이 간격(2px)을 넘어가 이어 붙는다.
                  주 경계에서는 넘기지 않는다 (격자 밖으로 삐져나온다) */}
              {seg && (
                <span style={{
                  // 2px — 약속 점(4px)보다 가늘어야 같은 날 약속이 묻히지 않는다.
                  // 실기기에서 3px 은 칸 아래쪽을 꽉 채워 점과 경쟁했다.
                  position: 'absolute', bottom: compact ? 2 : 4, height: 2,
                  background: PLAN_DOT,
                  left:  seg.start || cell.weekday === 0 ? 4 : -2,
                  right: seg.end   || cell.weekday === 6 ? 4 : -2,
                  borderTopLeftRadius:    seg.start ? 1 : 0,
                  borderBottomLeftRadius: seg.start ? 1 : 0,
                  borderTopRightRadius:    seg.end ? 1 : 0,
                  borderBottomRightRadius: seg.end ? 1 : 0,
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* 점 색 안내 — 색만 다르고 설명이 없으면 알아볼 수 없다.
          compact 에서는 파란 점(기기 캘린더)이 섞일 때만 — 주황·초록은 아래 추가 버튼이 곧 설명이다 */}
      {(!compact || calendarSync) && (
      <div style={{ display: 'flex', gap: 10, marginTop: compact ? 6 : 8, fontSize: 10.5, color: '#9A9AA0' }}>
        <span><span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 3, background: TODO_DOT, marginRight: 3 }} />약속</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 2, borderRadius: 1, background: PLAN_DOT, marginRight: 3, verticalAlign: 'middle' }} />일정(기간)</span>
        {calendarSync && <span><span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 3, background: EVENT_DOT, marginRight: 3 }} />기기 캘린더</span>}
      </div>
      )}

      {/* 날짜 없는 할일 — 어느 칸에도 못 올라간다. 여기서 세지 않으면 달력의 "아무것도 없어요" 와
          홈 카드의 "2개 남음" 이 같은 화면에서 서로 다른 말을 한다 */}
      {compact && undated.length > 0 && (
        <button onClick={() => onTabChange?.('todos')} style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginTop: 8,
          border: '1px dashed #ECECEF', background: '#FAFAFB', borderRadius: 10,
          padding: '7px 10px', cursor: 'pointer', textAlign: 'left',
        }}>
          <span style={{ fontSize: 12, color: '#8E8E93', flex: 1 }}>
            날짜 없는 할일 {undated.length}개
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#D9531B' }}>할일 탭 ›</span>
        </button>
      )}

      {/* 선택한 날 — compact 에서는 접어 둔다 (날을 누르면 열린다) */}
      <div style={{
        marginTop: compact ? 10 : 12, paddingTop: compact ? 10 : 12, borderTop: '1px solid #F0F0F3',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: bodyOpen ? 8 : 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#111111' }}>{pickedLabel}</span>
          {typeof dayScore === 'number' && (
            <span style={{
              fontSize: 11, fontWeight: 800, color: '#D9531B',
              background: 'rgba(255,107,44,0.12)', borderRadius: 8, padding: '2px 7px',
            }}>
              오구 지수 {dayScore}
            </span>
          )}
          {compact && (
            <>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                style={{
                  border: 'none', background: 'transparent', color: dayCount ? '#D9531B' : '#9A9AA0',
                  fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: '2px 0',
                }}
              >
                {dayCount ? `${dayCount}건` : '없음'} {open ? '⌃' : '⌄'}
              </button>
            </>
          )}
        </div>

        {bodyOpen && (<>
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
          <div key={t.id}>
            {/* 누르면 수정·삭제가 열린다 — 잘못 넣은 약속을 지울 길이 없으면 달력이 쓰레기통이 된다 */}
            <button
              onClick={() => { setEditing(editing?.id === t.id ? null : { id: t.id, title: t.title || t.text || '' }) }}
              style={{ ...row, width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 3, background: dotColorOf(t), flexShrink: 0 }} />
              <span style={{
                fontSize: 11.5, flexShrink: 0, minWidth: 42,
                color: isPlanLike(t) ? PLAN_DOT : '#8E8E93',
                fontWeight: isPlanLike(t) ? 700 : 400,
              }}>
                {t.todo_type === 'appointment'
                  ? (t.due_hour != null ? `📍${t.due_hour}시` : '📍종일')
                  : t.todo_type === 'period' ? '📆계획'
                  : t.end_date ? '🗂일정' : '마감'}
              </span>
              <span style={{
                fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: (t.completed || t.done) ? '#B0B0B6' : '#3A3A3E',
                textDecoration: (t.completed || t.done) ? 'line-through' : 'none',
              }}>
                {t.title || t.text}
                {t.place && <span style={{ color: '#9A9AA0', fontWeight: 400 }}> · {t.place}</span>}
              </span>
              <span style={{ fontSize: 13, color: '#C7C7CC', flexShrink: 0 }}>
                {editing?.id === t.id ? '▲' : '⋯'}
              </span>
            </button>

            {editing?.id === t.id && (
              <div style={{
                display: 'flex', gap: 6, margin: '2px 0 8px', padding: 10,
                borderRadius: 12, background: '#FAFAFB', border: '1px solid #ECECEF',
              }}>
                <input
                  autoFocus
                  value={editing.title}
                  onChange={e => setEditing(v => ({ ...v, title: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') applyEdit()
                    if (e.key === 'Escape') setEditing(null)
                  }}
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                />
                <button onClick={applyEdit} disabled={!editing.title.trim()} style={{
                  border: 'none', borderRadius: 10, padding: '0 12px', fontSize: 12, fontWeight: 800,
                  cursor: editing.title.trim() ? 'pointer' : 'default',
                  background: editing.title.trim() ? '#FF6B2C' : '#F1F1F4',
                  color: editing.title.trim() ? '#FFFFFF' : '#B0B0B6',
                }}>
                  수정
                </button>
                <button onClick={() => { onDeleteTodo?.(t.id); setEditing(null) }} style={{
                  border: '1px solid rgba(210,59,46,0.3)', borderRadius: 10, padding: '0 12px',
                  background: '#FFFFFF', color: '#D23B2E', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                }}>
                  삭제
                </button>
              </div>
            )}
          </div>
        ))}

        {!dayEvents.length && !dayTodos.length && (
          <div style={{ fontSize: 12.5, color: '#9A9AA0', padding: '4px 0' }}>
            {calendarSync ? '이 날은 아무것도 없어요' : '이 날은 약속도 일정도 없어요'}
          </div>
        )}
        </>)}

        {/* 약속 / 일정 추가 — 날짜를 고르는 행위가 곧 입력의 시작이다.
            지난 날짜에는 숨긴다 (만들자마자 "지난 것"이 되어 알람 제안까지 오염된다) */}
        {onAddTodo && (
          draft === null ? (
            <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
              <button onClick={() => setDraft({ kind: 'appointment', title: '', hour: null, place: '' })} style={addBtn}>
                📍 약속
              </button>
              <button onClick={() => setDraft({ kind: 'plan', title: '', span: '2' })} style={addBtn}>
                🗂 일정
              </button>
              {!hidePeriod && (
                <button onClick={() => setDraft({ kind: 'period', title: '', span: 'week' })} style={addBtn}>
                  📆 월·주간 계획
                </button>
              )}
            </div>
          ) : (
            <div style={{
              marginTop: 10, padding: 12, borderRadius: 14,
              background: '#FFF9F5', border: '1px solid #FFE1CE',
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#111111', marginBottom: 10 }}>
                {KIND_LABEL[draft.kind]} · {pickedLabel}
                {draft.kind !== 'appointment' && (() => {
                  const { start, end } = spanRange(picked, draft.span)
                  const fmt = k => k.slice(5).replace('-', '/')
                  return (
                    <span style={{ color: '#8E8E93', fontWeight: 600 }}>
                      {' '}→ {fmt(start)} ~ {fmt(end)}
                    </span>
                  )
                })()}
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
                  {(draft.kind === 'period'
                    ? [['week','주간'],['month','월간']]
                    : [['2','2일'],['3','3일'],['4','4일'],['5','5일'],['6','6일']]
                  ).map(([v, label]) => (
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
                placeholder={draft.kind === 'appointment' ? '약속 내용'
                  : draft.kind === 'period' ? '이번 주/달에 할 일' : '일정 내용'}
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

              {failed && (
                <div style={{
                  marginTop: 8, padding: '8px 10px', borderRadius: 10, fontSize: 11.5, lineHeight: 1.5,
                  background: 'rgba(210,59,46,0.08)', border: '1px solid rgba(210,59,46,0.25)', color: '#D23B2E',
                }}>
                  저장하지 못했어요. 인터넷을 확인하고 다시 눌러주세요.
                </div>
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
                <button onClick={() => { setDraft(null); setFailed(false) }} style={{
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
              marginTop: 8, width: '100%', borderRadius: 12, cursor: 'pointer',
              color: '#8E8E93', fontSize: 12, fontWeight: 700,
              // 홈에서는 테두리 없는 한 줄로 — 안내가 카드만큼 자리를 먹으면 안 된다
              border: compact ? 'none' : '1px solid #ECECEF',
              background: compact ? 'transparent' : '#FAFAFB',
              padding: compact ? '2px 0' : '9px 10px',
            }}
          >
            📅 캘린더를 연동하면 기기 일정도 함께 보여요
          </button>
        )}
      </div>
    </section>
  )
}

const KIND_LABEL = {
  appointment: '📍 약속',
  plan:        '🗂 일정',
  period:      '📆 월·주간 계획',
}

const addBtn = {
  flex: 1, border: '1px solid #FFD2B8', borderRadius: 12,
  background: 'rgba(255,107,44,0.08)', color: '#D9531B',
  fontSize: 11.5, fontWeight: 800, padding: '11px 4px', cursor: 'pointer',
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
