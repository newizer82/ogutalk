import { GROUPS, labelOf } from '../../data/appCategories'
import { formatMinutes } from '../../lib/alarmContext'
import { WEIGHTS } from '../../lib/oguScore'

// 점수를 숫자 하나로만 주면 "왜 이 점수인지" 를 모른다 → 세 칸을 항상 함께 보여준다.
// 이름 그대로 5 : 9 구조로 보여준다 (매시 59분)
const DONE_ITEMS = [
  { key: 'missionOne',  label: '미션 1개' },
  { key: 'missionAll',  label: '미션 완주' },
  { key: 'todoDone',    label: '내 할일' },
  { key: 'goalKept',    label: '이번 주 목표' },
  { key: 'alarmAnswer', label: '알람 응답' },
]

const SIZE = 132, STROKE = 11
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

export default function OguScoreCard({ result, yesterday = null, streak = 0, onOpenApps }) {
  if (!result) return null
  const { score, phone, done, grade, color, advice, byGroup, measured, measuredMinutes } = result
  const diff = yesterday === null ? null : score - yesterday

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(99,102,241,0.12), rgba(30,41,59,0.35))',
      border: '1px solid rgba(99,102,241,0.28)',
      borderRadius: 20, padding: 20, marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        {/* 점수 링 */}
        <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
          <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
              stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} />
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
              stroke={color} strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)}
              style={{ transition: 'stroke-dashoffset .6s ease' }} />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 38, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {score}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>오구 지수</div>
          </div>
        </div>

        {/* 등급 · 어제 대비 · 세 칸 */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>{grade}</span>
            {streak >= 2 && (
              <span style={{
                fontSize: 12, fontWeight: 800, color: '#fbbf24',
                background: 'rgba(251,191,36,0.12)', padding: '2px 8px', borderRadius: 99,
              }}>
                🔥 {streak}일 연속
              </span>
            )}
            {diff !== null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: diff >= 0 ? '#34d399' : '#f87171' }}>
                어제보다 {diff >= 0 ? '▲' : '▼'}{Math.abs(diff)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 12 }}>
            {/* 9 — 폰으로 한 생산 활동 */}
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 12,
                color: '#94a3b8', marginBottom: 3, fontVariantNumeric: 'tabular-nums',
              }}>
                <span>📱 폰 활용 <span style={{ color: '#64748b' }}>9분류</span></span>
                <span>{phone.total} / 50</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{
                  width: `${(phone.total / 50) * 100}%`, height: '100%', borderRadius: 3,
                  background: GROUPS.produce.color, transition: 'width .5s ease',
                }} />
              </div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                시간 {phone.time}/{WEIGHTS.time} · 다양성 {phone.filled}칸 {phone.variety}/{WEIGHTS.variety}
                {phone.penalty > 0 && <span style={{ color: '#fb923c' }}> · 소비 −{phone.penalty}</span>}
              </div>
            </div>

            {/* 5 — 내가 해낸 것 */}
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 12,
                color: '#94a3b8', marginBottom: 3, fontVariantNumeric: 'tabular-nums',
              }}>
                <span>✅ 해낸 것 <span style={{ color: '#64748b' }}>5가지</span></span>
                <span>{done.total} / 50</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {DONE_ITEMS.map(it => (
                  <div key={it.key} style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: done.parts[it.key] ? GROUPS.connect.color : 'rgba(255,255,255,0.08)',
                    transition: 'background .3s ease',
                  }} />
                ))}
              </div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                {DONE_ITEMS.filter(it => done.parts[it.key]).map(it => it.label).join(' · ') || '아직 없어요'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 조언 한 줄 — 세 줄짜리 잔소리는 아무도 읽지 않는다 */}
      <div style={{
        marginTop: 16, padding: '11px 13px', borderRadius: 12,
        background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', fontSize: 13, lineHeight: 1.5,
      }}>
        💡 {advice}
      </div>

      {/* 근거 — 점수를 매기려면 무엇이 생산으로 잡혔는지 보여줘야 한다 */}
      <div style={{
        marginTop: 10, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ color: '#64748b', fontSize: 12 }}>
          오늘 측정 {formatMinutes(measuredMinutes)} · {labelOf('produce')} {formatMinutes(byGroup.produce)} · {labelOf('consume')} {formatMinutes(byGroup.consume)}
          {!measured && ' · 추정치'}
        </div>
        {onOpenApps && (
          <button
            onClick={onOpenApps}
            style={{
              border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
              color: '#cbd5e1', fontSize: 12, fontWeight: 700,
              padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
            }}
          >
            무엇이 생산으로 잡혔나 →
          </button>
        )}
      </div>

      {!measured && (
        <div style={{ marginTop: 8, color: '#fb923c', fontSize: 12 }}>
          자동 활동 기록이 꺼져 있어 체크인만으로 계산했어요. 켜면 실제 사용시간으로 잽니다.
        </div>
      )}
    </div>
  )
}
