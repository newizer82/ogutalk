import { useState } from 'react'
import { AREAS } from '../../data/missions'
import { todayMissions, completeMission, undoMission, shuffleMissions } from '../../lib/missionStore'
import { logEvent } from '../../lib/firebase'

// 오늘의 추천 미션 — 무엇을 할지 고민하지 않게 매일 3개를 대신 골라준다.
// 몸·정리·머리에서 하나씩, 모두 5분 컷.
export default function MissionCard({ stage = null, onChange, collapsible = false }) {
  // 홈에서는 접을 수 있게 — 홈은 시계와 할일이 먼저 보여야 한다.
  // 접힘 여부는 이 기기에서만 기억한다 (없거나 못 읽으면 펼친 상태)
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('ogu_mission_collapsed') !== '1' } catch { return true }
  })
  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    try { localStorage.setItem('ogu_mission_collapsed', next ? '0' : '1') } catch {}
  }
  const [state, setState] = useState(() => todayMissions(stage))

  const refresh = () => {
    const next = todayMissions(stage)
    setState(next)
    onChange?.(next.done.length, next.missions.length)
  }

  const toggle = (id) => {
    const isDone = state.done.includes(id)
    if (isDone) undoMission(id)
    else {
      completeMission(id)
      logEvent('mission_done')
    }
    refresh()
  }

  const handleShuffle = () => {
    if (shuffleMissions(stage)) {
      logEvent('mission_shuffled')
      refresh()
    }
  }

  const doneCount = state.done.length
  const total = state.missions.length
  if (!total) return null

  return (
    <div style={{
      marginBottom: 14, padding: 16, borderRadius: 20,
      background: '#FFFFFF', border: '1px solid #ECECEF',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#111111' }}>🎯 오늘의 추천 미션</span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: doneCount === total ? '#1E7A58' : '#8E8E93',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {doneCount}/{total}
        </span>
        <span style={{ flex: 1 }} />
        {collapsible && (
          <button
            onClick={toggleOpen}
            aria-label={open ? '오늘의 추천 미션 접기' : '오늘의 추천 미션 펼치기'}
            style={{ border: 'none', background: 'transparent', color: '#9A9AA0', fontSize: 13, cursor: 'pointer', padding: '2px 6px' }}
          >
            {open ? '▲' : '▼'}
          </button>
        )}
        <button
          onClick={handleShuffle}
          disabled={state.shuffled}
          style={{
            border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700,
            color: state.shuffled ? '#B0B0B6' : '#D9531B',
            cursor: state.shuffled ? 'default' : 'pointer', padding: '2px 4px',
          }}
        >
          {state.shuffled ? '오늘 셔플 완료' : '🎲 다시 뽑기'}
        </button>
      </div>
      {(!collapsible || open) && (
        <div style={{ color: '#9A9AA0', fontSize: 11, marginBottom: 12 }}>
          하나에 5분이면 돼요. 몸·정리·머리에서 하나씩 골랐어요.
        </div>
      )}

      {(!collapsible || open) && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {state.missions.map(m => {
          const done = state.done.includes(m.id)
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '12px 12px', borderRadius: 12, cursor: 'pointer',
                background: done ? 'rgba(47,125,98,0.1)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${done ? 'rgba(47,125,98,0.35)' : 'rgba(0,0,0,0.07)'}`,
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                border: `2px solid ${done ? '#1E7A58' : 'rgba(0,0,0,0.15)'}`,
                background: done ? '#1E7A58' : 'transparent',
                color: '#FFFFFF', fontSize: 13, fontWeight: 900, lineHeight: '17px', textAlign: 'center',
              }}>
                {done ? '✓' : ''}
              </span>
              <span style={{ fontSize: 15 }}>{AREAS[m.area].emoji}</span>
              <span style={{
                flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.4,
                color: done ? '#9A9AA0' : '#111111',
                textDecoration: done ? 'line-through' : 'none',
              }}>
                {m.text}
              </span>
            </button>
          )
        })}
      </div>
      )}

      {doneCount === total && (!collapsible || open) && (
        <div style={{ marginTop: 10, color: '#1E7A58', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
          ✓ 오늘 미션 완주! 오구 지수 20점
        </div>
      )}
    </div>
  )
}
