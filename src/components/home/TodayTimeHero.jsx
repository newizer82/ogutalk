import { GROUPS, groupOf } from '../../data/appCategories'
import { AXES, AXIS_LABEL } from '../../lib/oguScore'
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

  // 점수와 같은 눈금으로 보여준다 — 홈 2축 / 분류 4그룹 / 지수 9분류 로 갈라져 있던 것을 하나로.
  // 생활(금융·이동)은 점수 밖이라 "그 외" 로 묶는다 (숨기면 합이 안 맞아 보인다)
  const axes = AXES.map(a => ({ key: a, label: AXIS_LABEL[a], min: byGroup[a] ?? 0, color: GROUPS[a].color }))
  const axisTotal = axes.reduce((s, a) => s + a.min, 0)
  const other = Math.max(0, total - axisTotal)

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

      {/* 세 축이 주인공 — 성장·힐링·소통 */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: '#F2F2F5' }}>
          {axisTotal > 0
            ? axes.map(a => (
                a.min > 0 && <div key={a.key} style={{
                  flexGrow: a.min, flexBasis: 0, background: a.color, transition: 'flex-grow .5s ease',
                }} />
              ))
            : null}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {axes.map(a => (
            <div key={a.key} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: a.color, whiteSpace: 'nowrap' }}>
                {a.label}
              </div>
              <div style={{
                fontSize: 17, fontWeight: 900, color: a.min > 0 ? '#111111' : '#C7C7CC',
                letterSpacing: '-0.6px', fontVariantNumeric: 'tabular-nums', marginTop: 2, whiteSpace: 'nowrap',
              }}>
                {a.min > 0 ? formatMinutes(a.min) : '0분'}
              </div>
            </div>
          ))}
        </div>
        {other > 0 && (
          <div style={{ fontSize: 11, color: '#B0B0B6', marginTop: 6 }}>
            그 외(금융·이동) {formatMinutes(other)} — 점수에는 넣지 않아요
          </div>
        )}
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
