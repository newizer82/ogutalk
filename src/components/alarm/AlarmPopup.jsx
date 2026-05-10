import { useState } from 'react'
import GlassCard from '../common/GlassCard'
import { OGU_TONES } from '../../data/oguData'
import { gradients } from '../../styles/theme'

const pad = n => String(n).padStart(2, '0')

const ACTIVITIES = [
  { id: 'goal_work', label: '🎯 목표 할일',    color: '#8b5cf6' },
  { id: 'study',     label: '📚 공부/업무',     color: '#6366f1' },
  { id: 'sns',       label: '📱 SNS/유튜브',    color: '#f59e0b' },
  { id: 'rest',      label: '😴 휴식/식사',     color: '#10b981' },
]

export default function AlarmPopup({ alarmContent, pendingCount = 0, oguTone = '유쾌', onClose, onCheckin }) {
  const now = new Date()
  const HH  = pad(now.getHours())
  const MM  = pad(now.getMinutes())

  const [selected, setSelected] = useState(null)
  const [checkedIn, setCheckedIn] = useState(false)

  const handleCheckin = (activityId) => {
    if (checkedIn) return
    setSelected(activityId)
    setCheckedIn(true)
    if (onCheckin) onCheckin(activityId)
    setTimeout(onClose, 2000)
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

        {pendingCount > 0 && (
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
          <div style={{
            fontSize: 15, fontWeight: 800, color: '#e2e8f0',
            marginBottom: 4, textAlign: 'center',
          }}>
            ⏱️ 이번 시간 뭐 하셨어요?
          </div>
          <div style={{ color: '#475569', fontSize: 11, marginBottom: 14, textAlign: 'center' }}>
            선택하면 알람이 종료됩니다
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
          {checkedIn && (
            <div style={{ marginTop: 12, color: '#34d399', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
              ✓ 기록됐어요! 잠시 후 닫힙니다
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
