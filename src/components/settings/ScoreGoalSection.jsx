import { formatMinutes } from '../../lib/alarmContext'
import { STAGES } from '../../data/missions'

// 오구 지수의 기준은 사용자의 것이다 — 남이 정한 "하루 2시간"과 비교하면 점수가 남의 잣대가 된다.
const STEP = 30, MIN = 30, MAX = 480

function GoalRow({ icon, label, desc, value, onChange, color }) {
  const set = v => onChange(Math.max(MIN, Math.min(MAX, v)))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700 }}>{icon} {label}</div>
        <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => set(value - STEP)} aria-label={`${label} 30분 줄이기`}
          style={btn}
        >−</button>
        <div style={{
          minWidth: 74, textAlign: 'center', color, fontSize: 14, fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatMinutes(value)}
        </div>
        <button
          onClick={() => set(value + STEP)} aria-label={`${label} 30분 늘리기`}
          style={btn}
        >+</button>
      </div>
    </div>
  )
}

const btn = {
  width: 32, height: 32, borderRadius: 9, cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
  color: '#cbd5e1', fontSize: 17, fontWeight: 700, lineHeight: 1,
}

export default function ScoreGoalSection({
  produceTarget = 120, setProduceTarget,
  consumeLimit = 120, setConsumeLimit,
  lifeStage = null, setLifeStage,
}) {
  return (
    <div style={{
      marginBottom: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 20,
      padding: 16, border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
        🎯 오구 지수 목표
      </div>
      <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6, marginBottom: 6 }}>
        리포트의 오구 지수는 이 기준과 비교해 매겨집니다.
        폰을 안 쓴 시간은 점수를 깎지 않아요.
      </div>
      <GoalRow
        icon="⚡" label="생산 목표" desc="9분류 합계 — 채우면 시간 점수 만점 (35점)"
        value={produceTarget} onChange={setProduceTarget} color="#818cf8"
      />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <GoalRow
        icon="🍿" label="소비 한도" desc="넘으면 30분마다 5점씩 (최대 10점)"
        value={consumeLimit} onChange={setConsumeLimit} color="#f59e0b"
      />

      {/* 생애주기 — 오늘의 미션을 고를 때만 쓴다. 성별로는 나누지 않는다(편견만 생기고 관리도 번거롭다) */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0 12px' }} />
      <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginBottom: 3 }}>🧩 오늘의 미션 맞춤</div>
      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 10 }}>
        고르면 그 시기에 맞는 미션이 섞여요. 안 골라도 괜찮아요.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {[['', '안 고름'], ...Object.entries(STAGES)].map(([id, label]) => {
          const on = (lifeStage ?? '') === id
          return (
            <button
              key={id || 'none'}
              onClick={() => setLifeStage?.(id || null)}
              style={{
                padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                border: on ? '1.5px solid #818cf8' : '1px solid rgba(255,255,255,0.12)',
                background: on ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.04)',
                color: on ? '#a5b4fc' : '#94a3b8',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
