import { GROUPS, labelOf } from '../../data/appCategories'
import { formatMinutes } from '../../lib/alarmContext'
import { WEIGHTS, AXIS_LABEL, STAMPS } from '../../lib/oguScore'
import { sharePromoImage } from '../../lib/promoShare'

// 점수를 숫자 하나로만 주면 "왜 이 점수인지" 를 모른다 → 세 칸을 항상 함께 보여준다.
// 성장 40 + 균형 20 + 실행 40 (v1.20.0 — 9칸 다양성은 설명해도 알 수 없어서 걷어냈다)
const SIZE = 132, STROKE = 11
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

export default function OguScoreCard({ result, yesterday = null, formulaChanged = false, streak = 0, onOpenApps }) {
  if (!result) return null
  const { score, produce, balance, done, grade, color, advice, byGroup, measured, measuredMinutes } = result
  const diff = yesterday === null ? null : score - yesterday

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #ECECEF',
      borderRadius: 20, padding: 20, marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        {/* 점수 링 */}
        <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
          <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
              stroke="rgba(0,0,0,0.05)" strokeWidth={STROKE} />
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
            <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>오구 지수</div>
          </div>
        </div>

        {/* 등급 · 어제 대비 · 세 칸 */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#111111' }}>{grade}</span>
            {streak >= 2 && (
              <span style={{
                fontSize: 12, fontWeight: 800, color: '#B4740F',
                background: 'rgba(242,153,74,0.14)', padding: '2px 8px', borderRadius: 99,
              }}>
                🔥 {streak}일 연속
              </span>
            )}
            {diff !== null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: diff >= 0 ? '#1E7A58' : '#D23B2E' }}>
                어제보다 {diff >= 0 ? '▲' : '▼'}{Math.abs(diff)}
              </span>
            )}
            {diff === null && formulaChanged && (
              <span style={{ fontSize: 11.5, color: '#9A9AA0' }}>
                점수 기준이 바뀌어 어제와 비교하지 않아요
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 12 }}>
            {/* 성장 — 내가 정한 목표 대비 */}
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 12,
                color: '#8E8E93', marginBottom: 3, fontVariantNumeric: 'tabular-nums',
              }}>
                <span>🌱 성장 <span style={{ color: '#9A9AA0' }}>{formatMinutes(produce.minutes)} / {formatMinutes(produce.target)}</span></span>
                <span>{produce.points} / {WEIGHTS.produce}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.05)' }}>
                <div style={{
                  width: `${(produce.points / WEIGHTS.produce) * 100}%`, height: '100%', borderRadius: 3,
                  background: GROUPS.produce.color, transition: 'width .5s ease',
                }} />
              </div>
            </div>

            {/* 균형 — 세 축이 모두 있고 힐링이 한도 안인가 */}
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 12,
                color: '#8E8E93', marginBottom: 3, fontVariantNumeric: 'tabular-nums',
              }}>
                <span>⚖️ 균형 <span style={{ color: '#9A9AA0' }}>성장·힐링·소통</span></span>
                <span>{balance.points} / {WEIGHTS.balance}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.05)' }}>
                <div style={{
                  width: `${(balance.points / WEIGHTS.balance) * 100}%`, height: '100%', borderRadius: 3,
                  background: GROUPS.connect.color, transition: 'width .5s ease',
                }} />
              </div>
              <div style={{ color: '#9A9AA0', fontSize: 11, marginTop: 4 }}>
                {balance.empty.length === 0 && balance.overHeal === 0
                  ? '세 가지가 고르게 있었어요'
                  : [
                      balance.empty.length ? `${balance.empty.map(a => AXIS_LABEL[a].slice(2)).join('·')} 없음` : null,
                      balance.overHeal > 0 ? `힐링 ${balance.overHeal}분 초과` : null,
                    ].filter(Boolean).join(' · ')}
              </div>
            </div>

            {/* 5 — 내가 해낸 것 */}
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 12,
                color: '#8E8E93', marginBottom: 3, fontVariantNumeric: 'tabular-nums',
              }}>
                <span>🏅 오늘의 도장</span>
                <span>{STAMPS.filter(it => done.parts[it.key]).length} / {STAMPS.length}</span>
              </div>
              {/* 막대 4개보다 도장 4개가 빠르다 — 빈 동그라미는 "남았다" 가 바로 읽힌다 */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {STAMPS.map(it => {
                  const on = !!done.parts[it.key]
                  return (
                    <div key={it.key} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{
                        width: 30, height: 30, margin: '0 auto 4px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: '#FFFFFF',
                        background: on ? '#FF6B2C' : 'transparent',
                        border: on ? 'none' : '1.5px dashed #D8D8DE',
                        transition: 'background .3s ease',
                      }}>
                        {on ? '✓' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: on ? '#3A3A3E' : '#9A9AA0' }}>{it.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 조언 한 줄 — 세 줄짜리 잔소리는 아무도 읽지 않는다 */}
      <div style={{
        marginTop: 16, padding: '11px 13px', borderRadius: 12,
        background: 'rgba(0,0,0,0.03)', color: '#3A3A3E', fontSize: 13, lineHeight: 1.5,
      }}>
        💡 {advice}
      </div>

      {/* 근거 — 점수를 매기려면 무엇이 성장으로 잡혔는지 보여줘야 한다 */}
      <div style={{
        marginTop: 10, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ color: '#9A9AA0', fontSize: 12 }}>
          오늘 측정 {formatMinutes(measuredMinutes)} · {labelOf('produce')} {formatMinutes(byGroup.produce)} · {labelOf('consume')} {formatMinutes(byGroup.consume)}
          {!measured && ' · 추정치'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* 공유는 자랑할 것이 생긴 자리에 둔다 — 홈에 혼자 떠 있던 버튼을 여기로 옮겼다 */}
          <button
            onClick={() => sharePromoImage({ score, grade, color })}
            aria-label="오늘 점수 이미지로 공유"
            style={{
              border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)',
              color: '#3A3A3E', fontSize: 12, fontWeight: 700,
              padding: '6px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            📷 공유
          </button>
          {onOpenApps && (
            <button
              onClick={onOpenApps}
              style={{
                border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)',
                color: '#3A3A3E', fontSize: 12, fontWeight: 700,
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              오늘 시간이 어디로 갔나 →
            </button>
          )}
        </div>
      </div>

      {!measured && (
        <div style={{ marginTop: 8, color: '#C2521C', fontSize: 12 }}>
          자동 활동 기록이 꺼져 있어 체크인만으로 계산했어요. 켜면 실제 사용시간으로 잽니다.
        </div>
      )}
    </div>
  )
}
