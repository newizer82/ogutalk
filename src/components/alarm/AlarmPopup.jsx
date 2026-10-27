import { useState, useEffect } from 'react'
import GlassCard from '../common/GlassCard'
import { gradients } from '../../styles/theme'
import { GROUPS, groupOf, labelOf } from '../../data/appCategories'
import { moodHeadline, formatMinutes, todoHint, todoDetail, eventLine, shortPlace, withJosa } from '../../lib/alarmContext'
import { mapUrlFor } from '../../lib/calendar'
import { openUrl } from '../../lib/capacitor'
import { sendToAi, resultMessage, activeAiApp } from '../../lib/aiApps'
import { logEvent } from '../../lib/firebase'

const pad = n => String(n).padStart(2, '0')

// 수동 팝업은 그룹 4개만 보여준다 — 알람이 뜬 순간 세부 11개 중 고르는 건 부담이 크다
// (수동 체크인을 안 누르는 것이 애초의 문제였다). 세부 분류는 자동 기록이 채운다.
const ACTIVITIES = Object.entries(GROUPS).map(([id, g]) => ({ id, label: g.label, color: g.color }))

// 세부 분류만 보이면 "검색·정보"가 어느 그룹(소비)인지 몰라 사용자가 굳이 다시 고르게 된다 → 그룹을 앞에 붙인다
const summaryLabel = c => (GROUPS[c] ? labelOf(c) : `${labelOf(groupOf(c))} · ${labelOf(c)}`)

// 상태별 머리말 색 — 순삭은 경고색, 집중은 성공색, 평소는 기본
const MOOD_COLOR = { binge: '#fbbf24', focus: '#34d399', normal: '#f1f5f9' }

export default function AlarmPopup({
  alarmContent, onClose, onCheckin,
  autoSummary = null, autoMode = false,
  mood = null, todayTotals = null, nextTodo = null, dayScore = null,
  nextEvent = null, nextMission = null, missionIntro = null,
  promptCard = null,
}) {
  // 팝업이 열린 순간에 멈춘다. 매 렌더 new Date() 를 읽으면 닫지 않고 둔 팝업이
  // "22:08 / 곧 11시예요" 처럼 시계와 문구가 서로 다른 말을 한다 (실기기에서 그랬다).
  const [now] = useState(() => new Date())
  const HH  = pad(now.getHours())
  const MM  = pad(now.getMinutes())

  // "🌱 성장 · 🤖 AI 도구" — 뒤에 붙는 조사가 받침을 따라가야 한다
  const recordedAs = autoSummary?.category ? summaryLabel(autoSummary.category) : ''

  const [selected, setSelected] = useState(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [bridge, setBridge] = useState(null)   // AI 로 건넌 결과 한 줄
  // 버튼에 진짜 앱 이름을 쓴다 — "내 AI" 보다 "Gemini" 가 어디로 가는지 분명하다
  const [aiName, setAiName] = useState(null)
  useEffect(() => { activeAiApp().then(a => setAiName(a?.label ?? null)) }, [])

  // 제안은 언제나 하나다: 내 할일이 남아 있으면 할일, 없으면 아직 안 한 오늘의 추천 미션.
  // 집중 중에는 아무것도 들이밀지 않는다 — 59분 알람의 가장 큰 불만이 "집중을 깬다" 였다.
  // v1.21.0: 알람 순간에 "완료" 를 누르게 하지 않는다 — 1분 개입은 보는 것으로 충분하다.
  // 완료는 할일 탭·미션 카드에서 (알람 중 체크는 점수를 벌려고 누르는 행위가 되기 쉽다)
  const suggestTodo    = !!nextTodo
  const suggestMission = !suggestTodo && !!nextMission
  const showTodo = (suggestTodo || suggestMission) && mood?.mood !== 'focus' && !checkedIn

  // 자동 기록 모드에서는 고를 버튼이 없다 → 평소 상태에서 질문을 던지면 답할 곳이 없어 보인다
  // 분류가 잡힌 자동 요약이 있으면 보여주기만 한다 (고치기는 리포트의 "오늘 시간이 어디로 갔나" 에서)
  const autoView = !!autoSummary && !!autoSummary.category
  const headline = {
    text:  autoView && mood?.mood !== 'binge' && mood?.mood !== 'focus' ? '지난 1시간' : moodHeadline(mood),
    color: MOOD_COLOR[mood?.mood] ?? MOOD_COLOR.normal,
  }

  // 집중 중엔 재촉하지 않고, 순삭 중엔 다음 행동을 가리킨다
  const subline = mood?.mood === 'focus' ? '방해하지 않을게요, 계속 가세요'
    : mood?.mood === 'binge' ? '한 가지만 끝내고 다시 보셔도 돼요'
    : '폰을 안 썼다면 그냥 닫아도 돼요'

  const handleCheckin = (activityId) => {
    if (checkedIn) return
    setSelected(activityId)
    setCheckedIn(true)
    if (onCheckin) onCheckin(activityId)
    // 선택 즉시 닫기 (피드백을 위한 짧은 200ms만 유지)
    setTimeout(onClose, 200)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999, padding: 20,
      background: 'radial-gradient(ellipse at 50% 30%, rgba(255,107,44,0.22) 0%, rgba(0,0,0,0.95) 70%)',
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
        border: '1px solid rgba(255,107,44,0.28)',
        boxShadow: '0 0 80px rgba(255,107,44,0.18)',
      }}>
        <div style={{
          fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: '-2px',
          background: gradients.logo,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {HH}:{MM}
        </div>
        <div style={{ color: '#9aa3b8', fontSize: 13.5, fontWeight: 600, margin: '8px 0 20px' }}>
          오구! 곧 {((now.getHours() + 1) % 12) || 12}시예요
        </div>

        {/* ── 체크인 섹션 ── */}
        <div style={{
          marginBottom: 20,
          background: 'rgba(255,107,44,0.07)',
          border: '1px solid rgba(255,107,44,0.3)',
          borderRadius: 20, padding: '18px 14px',
          boxShadow: '0 0 24px rgba(255,107,44,0.1)',
        }}>
          {autoMode && !autoSummary ? (
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
          ) : autoView ? (
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
              <div style={{ color: '#34d399', fontSize: 13, fontWeight: 700 }}>
                ✓ {recordedAs}{withJosa(recordedAs)} 기록했어요
              </div>
            </>
          ) : (
            /* 수동 모드 (권한 없음·기능 OFF) 또는 자동 요약이 미분류인 경우 —
               미분류 앱은 기록되지 않으므로 그 시간이 통째로 사라지지 않게 직접 고르게 한다 */
            <>
              <div style={{
                // 상태 문구는 기본 문구보다 길다 → 한 글자만 넘어가는 줄바꿈을 막는다
                fontSize: 18, fontWeight: 900, marginBottom: 6, textAlign: 'center',
                letterSpacing: '-0.5px', wordBreak: 'keep-all', lineHeight: 1.35,
                color: headline.color,
              }}>
                {headline.text}
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 14, textAlign: 'center' }}>
                {subline}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {ACTIVITIES.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleCheckin(a.id)}
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

          {/* 오늘 누적 — "지금 1시간"만 보면 하루가 어디로 샜는지 안 보인다.
              라벨을 반드시 붙인다: 위 제목이 "지난 1시간" 인데 여기 7시간이 적혀 있으면
              카드 전체가 거짓말로 읽힌다 (실기기에서 실제로 그렇게 보였다). */}
          {todayTotals?.total > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{
                color: '#64748b', fontSize: 11, fontWeight: 800, textAlign: 'left', marginBottom: 7,
                letterSpacing: '0.2px',
              }}>
                오늘 전체 · {formatMinutes(todayTotals.total)}
              </div>
              <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
                {Object.entries(GROUPS).map(([id, g]) => {
                  const w = (todayTotals.byGroup[id] / todayTotals.total) * 100
                  return w > 0
                    ? <div key={id} style={{ width: `${w}%`, background: g.color }} />
                    : null
                })}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 6,
                color: '#9aa3b8', fontSize: 11.5, fontVariantNumeric: 'tabular-nums',
              }}>
                {['produce', 'consume', 'connect'].map(g => (
                  <span key={g} style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ color: GROUPS[g].color, fontWeight: 800 }}>{labelOf(g)}</span>
                    {' '}{formatMinutes(todayTotals.byGroup[g] ?? 0)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하루 첫 알람에만 — 오늘 미션이 준비됐다는 것만 한 줄로 알린다 */}
        {missionIntro && (
          <div style={{
            marginBottom: 10, padding: '9px 12px', borderRadius: 12,
            background: 'rgba(255,107,44,0.1)', border: '1px solid rgba(255,107,44,0.28)',
            color: '#FFCFAE', fontSize: 12.5, fontWeight: 700, textAlign: 'left',
          }}>
            🎯 {missionIntro}
          </div>
        )}

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
                <div style={{
                color: '#94a3b8', fontSize: 12, marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                  {nextEvent.startsInMin}분 뒤{nextEvent.location ? ` · ${shortPlace(nextEvent.location)}` : ''}
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

        {/* 지금 하나만 — 알람은 가리키기만 한다. 누르게 하지 않는다.
            완료 버튼이 있던 자리였는데, 알람 중 체크는 "점수를 벌려고" 누르는 행위가 되기 쉽다. */}
        {showTodo && (
          <div style={{
            marginBottom: 12, padding: '12px 14px', borderRadius: 16, textAlign: 'left',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ color: '#FFB37A', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
              {suggestTodo ? '지금 하나만' : '🎯 오늘의 추천 미션'}
            </div>
            <div style={{ color: '#e8eaf0', fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }}>
              {suggestTodo ? nextTodo.title : nextMission.text}
            </div>
            <div style={{ color: '#8b93a7', fontSize: 11, marginTop: 4 }}>
              {suggestTodo ? (todoDetail(nextTodo) || '끝내면 할일 탭에서 체크하세요') : '5분이면 돼요'}
            </div>
          </div>
        )}

        {/* 오구 브리지 — 폰을 실행 도구로.
            오구톡은 AI를 품지 않는다. 폰에 이미 있다. 희소한 건 지능이 아니라
            "맞는 순간의 질문" 이고, 그건 매시 59분에 우리만 가지고 있다.
            집중 중에는 띄우지 않는다 (알람의 최대 불만이 "집중을 깬다" 였다). */}
        {promptCard && mood?.mood !== 'focus' && !checkedIn && (
          <div style={{
            marginBottom: 12, padding: '12px 14px', borderRadius: 16, textAlign: 'left',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ color: '#7DD3C0', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
              🤖 오구가 고른 질문
            </div>
            <div style={{ color: '#e8eaf0', fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }}>
              {promptCard.title}
            </div>
            <div style={{ color: '#8b93a7', fontSize: 11, marginTop: 4 }}>
              {bridge ?? promptCard.hint}
            </div>
            {!bridge && (
              <button
                onClick={async () => {
                  logEvent('bridge_tap', { card: promptCard.id })
                  setBridge('여는 중…')
                  setBridge(resultMessage(await sendToAi(promptCard.prompt)))
                }}
                style={{
                  marginTop: 9, width: '100%', padding: '9px 0', borderRadius: 11, cursor: 'pointer',
                  border: '1px solid rgba(125,211,192,0.35)', background: 'rgba(125,211,192,0.12)',
                  color: '#9BE7D6', fontSize: 12.5, fontWeight: 800,
                }}
              >
                {aiName ? `${aiName}로 물어보기` : 'AI에게 물어보기'} ›
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
