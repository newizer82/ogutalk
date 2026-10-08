import { formatMinutes } from '../../lib/alarmContext'

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
        icon="⚡" label="생산 목표" desc="이만큼 채우면 만점 (40점)"
        value={produceTarget} onChange={setProduceTarget} color="#818cf8"
      />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <GoalRow
        icon="🍿" label="소비 한도" desc="넘으면 30분마다 5점씩 (30점)"
        value={consumeLimit} onChange={setConsumeLimit} color="#f59e0b"
      />
    </div>
  )
}
