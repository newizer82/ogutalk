import { formatMinutes } from '../../lib/alarmContext'
import { STAGES } from '../../data/missions'

// 오구 지수의 기준은 사용자의 것이다 — 남이 정한 "하루 2시간"과 비교하면 점수가 남의 잣대가 된다.
const STEP = 30, MIN = 30, MAX = 480

function GoalRow({ icon, label, desc, value, onChange, color }) {
  const set = v => onChange(Math.max(MIN, Math.min(MAX, v)))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#111111', fontSize: 14, fontWeight: 700 }}>{icon} {label}</div>
        <div style={{ color: '#9A9AA0', fontSize: 12, marginTop: 2 }}>{desc}</div>
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
  border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)',
  color: '#3A3A3E', fontSize: 17, fontWeight: 700, lineHeight: 1,
}

export default function ScoreGoalSection({
  produceTarget = 120, setProduceTarget,
  consumeLimit = 120, setConsumeLimit,
  lifeStage = null, setLifeStage,
}) {
  return (
    <div style={{
      marginBottom: 14, background: 'rgba(0,0,0,0.02)', borderRadius: 20,
      padding: 16, border: '1px solid rgba(0,0,0,0.035)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#3A3A3E', marginBottom: 4 }}>
        🎯 오구 지수 목표
      </div>
      <div style={{ color: '#9A9AA0', fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
        오구 지수 = <b style={{ color: '#3A3A3E' }}>성장 40 + 균형 20 + 실행 40</b><br />
        아래 두 값이 성장·균형 점수의 기준이 됩니다. 폰을 안 쓴 시간은 점수를 깎지 않아요.
      </div>
      <GoalRow
        icon="🌱" label="성장의 시간 목표" desc="업무·학습·AI·제작·구매·운동 — 채우면 만점 (40점)"
        value={produceTarget} onChange={setProduceTarget} color="#D9531B"
      />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.035)' }} />
      <GoalRow
        icon="🌿" label="힐링의 시간 한도" desc="영상·게임·검색 — 넘으면 균형에서 −10점"
        value={consumeLimit} onChange={setConsumeLimit} color="#B4740F"
      />
      <div style={{
        marginTop: 8, padding: '9px 11px', borderRadius: 10, lineHeight: 1.6,
        background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)',
        color: '#8E8E93', fontSize: 11.5,
      }}>
        <b style={{ color: '#3A3A3E' }}>⚖️ 균형 20점</b>은 설정이 없어요.
        성장·힐링·소통 세 가지가 모두 <b style={{ color: '#3A3A3E' }}>10분 이상</b>이면 만점,
        비는 쪽마다 −7점입니다. 힐링·소통은 많다고 점수가 오르지 않아요.
      </div>

      {/* 생애주기 — 오늘의 추천 미션을 고를 때만 쓴다. 성별로는 나누지 않는다(편견만 생기고 관리도 번거롭다) */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.035)', margin: '6px 0 12px' }} />
      <div style={{ color: '#111111', fontSize: 14, fontWeight: 700, marginBottom: 3 }}>🧩 오늘의 추천 미션 맞춤</div>
      <div style={{ color: '#9A9AA0', fontSize: 12, marginBottom: 10 }}>
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
                border: on ? '1.5px solid #D9531B' : '1px solid rgba(0,0,0,0.08)',
                background: on ? 'rgba(129,140,248,0.15)' : 'rgba(0,0,0,0.025)',
                color: on ? '#a5b4fc' : '#8E8E93',
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
