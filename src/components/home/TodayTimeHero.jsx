import { GROUPS, groupOf } from '../../data/appCategories'
import { todayTotals, minutesOf, formatMinutes } from '../../lib/alarmContext'

// 홈의 주인공 — "오늘 내 시간이 어디로 갔나".
// 이전 히어로는 "다음 알람까지 38분" 이었는데, 알람은 수단이고 시간 감각이 목적이다.
// 체중계가 "다음 측정까지 38분" 을 보여주지 않는 것과 같다.
const DAY_START = 6   // 띠는 6시부터 그린다 (그 전 시간은 대부분 비어 있다)

/** 다음 알람 표기 — 밤에는 "464분 뒤" 가 되어 읽히지 않는다 */
function alarmLabel({ min, at }) {
  if (min < 60) return `${min}분 뒤 알람`
  const d = new Date(at)
  const tomorrow = d.getDate() !== new Date().getDate()
  return `${tomorrow ? '내일 ' : ''}${d.getHours()}시 알람`
}

/** 오늘 기록을 시간 순 블록으로 — 같은 그룹이 이어지면 한 덩어리로 합친다 */
function buildBlocks(checkins = [], now = Date.now()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const rows = checkins
    .map(c => ({ t: new Date(c.created_at).getTime(), g: groupOf(c.activity_type), min: minutesOf(c) }))
    .filter(r => r.g && !Number.isNaN(r.t) && r.t >= start.getTime() && r.t <= now)
    .sort((a, b) => a.t - b.t)

  const out = []
  for (const r of rows) {
    const last = out[out.length - 1]
    if (last && last.g === r.g) last.min += r.min
    else out.push({ g: r.g, min: r.min })
  }
  return out
}

export default function TodayTimeHero({
  checkins = [], nextAlarm = null, nowLabel = null, onOpenReport,
}) {
  const now = Date.now()
  const { byGroup, total } = todayTotals(checkins, now)
  const blocks = buildBlocks(checkins, now)
  const hour = new Date(now).getHours()

  const healing = byGroup.consume
  const growth  = byGroup.produce

  return (
    <section style={{
      border: '1px solid #ECECEF', borderRadius: 24, padding: 20, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#111111' }}>오늘 내 시간</div>
        <div style={{ fontSize: 12, color: '#9A9AA0', fontWeight: 600 }}>
          {total > 0 ? `${formatMinutes(total)} 기록됨` : '아직 기록이 없어요'}
        </div>
      </div>

      {/* 두 숫자가 주인공 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1, background: '#FFF4EE', borderRadius: 18, padding: '14px 15px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#C2521C' }}>🌿 힐링의 시간</div>
          <div style={{
            fontSize: 25, fontWeight: 900, color: '#FF6B2C', lineHeight: 1.15,
            letterSpacing: '-1.2px', fontVariantNumeric: 'tabular-nums', marginTop: 4, whiteSpace: 'nowrap',
          }}>
            {formatMinutes(healing)}
          </div>
        </div>
        <div style={{ flex: 1, background: '#F4F6FB', borderRadius: 18, padding: '14px 15px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#3A51A8' }}>🌱 성장의 시간</div>
          <div style={{
            fontSize: 25, fontWeight: 900, color: '#4B6BD4', lineHeight: 1.15,
            letterSpacing: '-1.2px', fontVariantNumeric: 'tabular-nums', marginTop: 4, whiteSpace: 'nowrap',
          }}>
            {formatMinutes(growth)}
          </div>
        </div>
      </div>

      {/* 하루 띠 — 오후에 무너졌는지가 한 줄로 보인다 */}
      {blocks.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
            {blocks.map((b, i) => (
              <div key={i} style={{
                flexGrow: b.min, flexBasis: 0, minWidth: 4,
                background: GROUPS[b.g].color,
              }} />
            ))}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 6,
            fontSize: 10.5, color: '#B0B0B6', fontVariantNumeric: 'tabular-nums',
          }}>
            <span>{DAY_START}시</span>
            <span>{Math.max(DAY_START, Math.round((DAY_START + hour) / 2))}시</span>
            <span>{hour}시</span>
          </div>
        </div>
      )}

      {/* 지금 이 시간 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, marginTop: 14,
        paddingTop: 14, borderTop: '1px solid #F2F2F5',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: 5, background: '#FF6B2C', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: '#3A3A3E', fontWeight: 600 }}>
          {nowLabel
            ? <>지금 <b style={{ color: '#111', fontWeight: 800 }}>{nowLabel}</b></>
            : <span style={{ color: '#9A9AA0' }}>지금은 기록이 없어요</span>}
        </div>
        {nextAlarm && (
          <button
            onClick={onOpenReport}
            style={{
              border: 0, background: 'transparent', padding: 0, cursor: 'pointer',
              fontSize: 12, color: '#9A9AA0', fontWeight: 600,
            }}
          >
            {alarmLabel(nextAlarm)}
          </button>
        )}
      </div>
    </section>
  )
}
