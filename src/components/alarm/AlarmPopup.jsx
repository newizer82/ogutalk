import { useState } from 'react'
import GlassCard from '../common/GlassCard'
import { OGU_TONES } from '../../data/oguData'
import { gradients } from '../../styles/theme'
import { GROUPS, groupOf, labelOf } from '../../data/appCategories'
import { moodHeadline, formatMinutes, todoHint, eventLine } from '../../lib/alarmContext'
import { mapUrlFor } from '../../lib/calendar'
import { openUrl } from '../../lib/capacitor'

const pad = n => String(n).padStart(2, '0')

// 수동 팝업은 그룹 4개만 보여준다 — 알람이 뜬 순간 세부 11개 중 고르는 건 부담이 크다
// (수동 체크인을 안 누르는 것이 애초의 문제였다). 세부 분류는 자동 기록이 채운다.
const ACTIVITIES = Object.entries(GROUPS).map(([id, g]) => ({ id, label: g.label, color: g.color }))

// 세부 분류만 보이면 "검색·정보"가 어느 그룹(소비)인지 몰라 사용자가 굳이 다시 고르게 된다 → 그룹을 앞에 붙인다
const summaryLabel = c => (GROUPS[c] ? labelOf(c) : `${labelOf(groupOf(c))} · ${labelOf(c)}`)

// 상태별 머리말 색 — 순삭은 경고색, 집중은 성공색, 평소는 기본
const MOOD_COLOR = { binge: '#fbbf24', focus: '#34d399', normal: '#f1f5f9' }

export default function AlarmPopup({
  alarmContent, pendingCount = 0, oguTone = '유쾌', onClose, onCheckin,
  autoSummary = null, onCorrect = null, autoMode = false,
  mood = null, todayTotals = null, nextTodo = null, onTodoDone = null, dayScore = null,
  nextEvent = null,
}) {
  const now = new Date()
  const HH  = pad(now.getHours())
  const MM  = pad(now.getMinutes())

  const [selected, setSelected] = useState(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [todoDone, setTodoDone]   = useState(false)
  const [correcting, setCorrecting] = useState(false)

  // 집중 중이면 할일을 들이밀지 않는다 — 59분 알람의 가장 큰 불만이 "집중을 깬다" 였다.
  // 분류를 고치는 중이거나 이미 체크인한 뒤에도 감춘다 (팝업이 곧 닫힘).
  const showTodo = !!nextTodo && !!onTodoDone
    && mood?.mood !== 'focus' && !correcting && !checkedIn

  // 자동 기록 모드에서는 고를 버튼이 없다 → 평소 상태에서 질문을 던지면 답할 곳이 없어 보인다
  const autoView = !!autoSummary && !correcting
  const headline = {
    text:  autoView && mood?.mood !== 'binge' && mood?.mood !== 'focus' ? '지난 1시간' : moodHeadline(mood),
    color: MOOD_COLOR[mood?.mood] ?? MOOD_COLOR.normal,
  }

  // 집중 중엔 재촉하지 않고, 순삭 중엔 다음 행동을 가리킨다
  const subline = !correcting && mood?.mood === 'focus' ? '방해하지 않을게요, 계속 가세요'
    : !correcting && mood?.mood === 'binge' ? '한 가지만 끝내고 다시 보셔도 돼요'
    : '폰을 안 썼다면 그냥 닫아도 돼요'

  const handleTodoDone = () => {
    if (todoDone) return
    setTodoDone(true)
    onTodoDone(nextTodo)
    setTimeout(onClose, 900)
  }

  const handleCheckin = (activityId) => {
    if (checkedIn) return
    setSelected(activityId)
    setCheckedIn(true)
    if (onCheckin) onCheckin(activityId)
    // 선택 즉시 닫기 (피드백을 위한 짧은 200ms만 유지)
    setTimeout(onClose, 200)
  }

  const handleCorrect = (activityId) => {
    onCorrect?.(activityId)
    setCorrecting(false)
    setCheckedIn(true)
    setTimeout(onClose, 200)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999, padding: 20,
      background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.25) 0%, rgba(0,0,0,0.95) 70%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 펄스 링 */}
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        border: '1px solid rgba(99,102,241,0.2)',
        animation: 'pulse 2s ease-out infinite',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        border: '1px solid rgba(99,102,241,0.1)',
        animation: 'pulse 2s ease-out infinite 0.5s',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 380, position: 'relative', zIndex: 1,
        background: 'linear-gradient(180deg,rgba(30,41,59,0.9),rgba(8,15,30,0.95))',
        backdropFilter: 'blur(20px)',
        borderRadius: 28, padding: 28, textAlign: 'center',
        border: '1px solid rgba(99,102,241,0.3)',
        boxShadow: '0 0 80px rgba(99,102,241,0.2)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 4 }}>⏰</div>
        <div style={{
          fontSize: 56, fontWeight: 900, lineHeight: 1,
          background: gradients.logo,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {HH}:{MM}
        </div>
        <div style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 24px' }}>
          {OGU_TONES[oguTone]?.emoji} 오구! 정각이 다가옵니다
        </div>

        {pendingCount > 0 && !showTodo && mood?.mood !== 'focus' && (
          <GlassCard style={{
            marginBottom: 10, textAlign: 'left',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <div style={{ color: '#f87171', fontSize: 13 }}>
              ✅ 미완료 할일 {pendingCount}개 남아있어요
            </div>
          </GlassCard>
        )}

        {/* ── 체크인 섹션 ── */}
        <div style={{
          marginBottom: 20,
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: 20, padding: '18px 14px',
          boxShadow: '0 0 24px rgba(99,102,241,0.12)',
        }}>
          {autoMode && !autoSummary && !correcting ? (
            /* 자동 모드지만 아직 소급 계산이 끝나지 않음 — 수동 4버튼이 잠깐 떴다 사라지며
               같은 슬롯에 중복 기록되는 것을 막기 위해 계산이 끝날 때까지 버튼을 감춘다 */
            <div style={{ padding: '10px 0 4px' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#cbd5e1' }}>
                기록 확인 중…
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                잠시만요, 방금 쓴 앱을 확인하고 있어요
              </div>
            </div>
          ) : autoSummary && !correcting ? (
            /* 자동 기록 모드 — 아무것도 누르지 않아도 이미 기록됨 */
            <>
              <div style={{
                fontSize: 17, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px',
                color: headline.color,
              }}>
                {headline.text}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {headline.text === '지난 1시간' ? '' : '지난 1시간 · '}{autoSummary.label} {autoSummary.minutes}분
              </div>
              <div style={{ color: autoSummary.category ? '#34d399' : '#fb923c', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                {autoSummary.category
                  ? `✓ ${summaryLabel(autoSummary.category)} 으로 기록했어요`
                  : '아직 분류되지 않은 앱이에요'}
              </div>
              <button
                onClick={() => setCorrecting(true)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                  color: '#cbd5e1', fontSize: 13, fontWeight: 700,
                }}
              >
                {autoSummary.category ? '다르게 기록' : '분류 선택하기'}
              </button>
            </>
          ) : (
            /* 수동 모드 (권한 없음·기능 OFF) 또는 수정 중 */
            <>
              <div style={{
                // 상태 문구는 기본 문구보다 길다 → 한 글자만 넘어가는 줄바꿈을 막는다
                fontSize: 18, fontWeight: 900, marginBottom: 6, textAlign: 'center',
                letterSpacing: '-0.5px', wordBreak: 'keep-all', lineHeight: 1.35,
                color: correcting ? '#f1f5f9' : headline.color,
              }}>
                {correcting ? '⏱️ 이번 시간 뭐 하셨어요?' : headline.text}
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 14, textAlign: 'center' }}>
                {subline}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {ACTIVITIES.map(a => (
                  <button
                    key={a.id}
                    onClick={() => (correcting ? handleCorrect(a.id) : handleCheckin(a.id))}
                    style={{
                      padding: '14px 6px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, lineHeight: 1.3,
                      background: selected === a.id ? `${a.color}33` : 'rgba(255,255,255,0.06)',
                      color: selected === a.id ? a.color : '#cbd5e1',
                      outline: selected === a.id ? `2px solid ${a.color}` : '1.5px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.15s ease',
                      transform: selected === a.id ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: selected === a.id ? `0 0 16px ${a.color}44` : 'none',
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {checkedIn && (
            <div style={{ marginTop: 10, color: '#34d399', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
              ✓ 기록 완료!
            </div>
          )}

          {/* 오늘 누적 — "지금 1시간"만 보면 하루가 어디로 샜는지 안 보인다 */}
          {todayTotals?.total > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
                {Object.entries(GROUPS).map(([id, g]) => {
                  const w = (todayTotals.byGroup[id] / todayTotals.total) * 100
                  return w > 0
                    ? <div key={id} style={{ width: `${w}%`, background: g.color }} />
                    : null
                })}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: 7,
                color: '#94a3b8', fontSize: 12, fontVariantNumeric: 'tabular-nums',
              }}>
                <span>오늘 {labelOf('produce')} {formatMinutes(todayTotals.byGroup.produce)}</span>
                <span>{labelOf('consume')} {formatMinutes(todayTotals.byGroup.consume)}</span>
              </div>
            </div>
          )}
        </div>

        {/* 다음 일정 — 오구톡 할일에는 시각·장소가 없다. 캘린더가 그 빈칸을 메운다 */}
        {nextEvent && (
          <div style={{
            marginBottom: 12, padding: '12px 14px', borderRadius: 14, textAlign: 'left',
            background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.35)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, wordBreak: 'keep-all' }}>
                {eventLine(nextEvent)}
              </div>
              {!nextEvent.ongoing && (
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                  {nextEvent.startsInMin}분 뒤{nextEvent.location ? ` · ${nextEvent.location}` : ''}
                </div>
              )}
            </div>
            {nextEvent.location && (
              <button
                onClick={() => openUrl(mapUrlFor(nextEvent.location))}
                style={{
                  flexShrink: 0, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)',
                  color: '#cbd5e1', fontSize: 12, fontWeight: 700,
                }}
              >
                길찾기
              </button>
            )}
          </div>
        )}

        {/* 하루 마감(22시) — 리포트를 열지 않아도 오늘 점수를 한 번은 본다 */}
        {dayScore && (
          <div style={{
            marginBottom: 12, padding: '14px 16px', borderRadius: 16, textAlign: 'left',
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${dayScore.color}55`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              fontSize: 30, fontWeight: 900, color: dayScore.color, lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {dayScore.score}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 800, wordBreak: 'keep-all' }}>
                오늘의 오구 지수 · {dayScore.grade}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 3, lineHeight: 1.45 }}>
                {dayScore.advice}
              </div>
            </div>
          </div>
        )}

        {/* 지금 하나만 — 팝업이 "몇 분 썼다"로 끝나지 않고 다음 행동 하나로 이어지게 한다.
            탭 한 번으로 끝내고 앱 화면으로 보내지 않는다 (1분 개입 유지). */}
        {showTodo && (
          <div style={{
            marginBottom: 12, padding: '14px', borderRadius: 16, textAlign: 'left',
            background: todoDone ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${todoDone ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                {todoDone ? '✓ 하나 해냈어요' : '지금 하나만'}
              </div>
              <div style={{
                color: '#e2e8f0', fontSize: 14, fontWeight: 700, lineHeight: 1.35,
                textDecoration: todoDone ? 'line-through' : 'none', opacity: todoDone ? 0.6 : 1,
              }}>
                {nextTodo.title}
              </div>
              {!todoDone && todoHint(nextTodo) && (
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{todoHint(nextTodo)}</div>
              )}
            </div>
            {!todoDone && (
              <button
                onClick={handleTodoDone}
                style={{
                  flexShrink: 0, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: gradients.button, color: '#fff', fontSize: 13, fontWeight: 800,
                }}
              >
                완료
              </button>
            )}
          </div>
        )}

        {/* 모든 모드 공통 닫기 — 이전엔 팝업 안에 닫기가 없어서
            수동은 "무엇이든 골라야" 닫혔고(폰을 안 쓴 시간이 틀린 기록으로 남음),
            자동·"기록 확인 중…"은 하드웨어 뒤로가기만이 탈출구였다.
            수동에서 안 고르고 닫으면 기록이 남지 않는다 = 폰을 안 쓴 시간의 정직한 표현. */}
        {!checkedIn && (
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '10px', borderRadius: 12, cursor: 'pointer',
              border: 'none', background: 'transparent',
              color: '#64748b', fontSize: 13, fontWeight: 600,
            }}
          >
            닫기
          </button>
        )}
      </div>
    </div>
  )
}
