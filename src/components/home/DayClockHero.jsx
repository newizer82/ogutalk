import { useMemo } from 'react'
import { GROUPS } from '../../data/appCategories'
import { bannerFor } from '../../lib/timeBanner'
import { todayTotals, formatMinutes } from '../../lib/alarmContext'
import { todayMissions } from '../../lib/missionStore'
import { yesterdayScore, streakDays, todayLog } from '../../lib/dayLog'
import { oguScore, CHECKS, AXES, AXIS_LABEL } from '../../lib/oguScore'
import { dayCells, nowCell, alarmMarks, CELLS } from '../../lib/dayClock'
import { logEvent } from '../../lib/firebase'

// 홈의 주인공 — 하루 시계. 59분 알람이 울릴 때마다 한 칸씩 채워진다.
//
// 예전에는 맨 위 주황 배너("지금 내 숫자")와 그 아래 "오늘 내 시간" 카드가 같은 이야기를
// 두 번 했다. 한 장으로 합쳤다: 위 띠가 지금 할 말, 시계가 오늘 하루, 오른쪽이 세 축.
//
// 지킬 것
//  - 기록 없는 칸은 비워 둔다. 안 잰 시간에 색을 칠하면 거짓말이 된다
//  - 시계 가운데는 점수도 알람 카운트다운도 아니다. 알람은 수단이고 시간 감각이 목적이다
//  - 숫자는 "오구 지수 34점" 이 아니라 "오늘 34" — 덜 찬 숫자가 하루 종일 성적표가 되면 안 된다
const R_OUT = 98, R_IN = 77

const point = (deg, r) => {
  const t = (deg - 90) * Math.PI / 180
  return `${(100 + r * Math.cos(t)).toFixed(2)} ${(100 + r * Math.sin(t)).toFixed(2)}`
}

/** 30분 칸 하나. 시간 경계에만 틈을 둬서 두 칸이 한 시간으로 읽히게 한다 */
function cellPath(i) {
  const step = 360 / CELLS
  const a0 = i * step + (i % 2 === 0 ? 1.1 : 0)
  const a1 = (i + 1) * step - (i % 2 === 1 ? 1.1 : 0)
  return `M${point(a0, R_OUT)} A${R_OUT} ${R_OUT} 0 0 1 ${point(a1, R_OUT)} ` +
         `L${point(a1, R_IN)} A${R_IN} ${R_IN} 0 0 0 ${point(a0, R_IN)}Z`
}

/** 다음 알람 표기 — 밤에는 "464분 뒤" 가 되어 읽히지 않는다 */
function alarmLabel({ min, at }) {
  if (min < 1) return '곧 알람'   // "0분 뒤" 는 말이 안 된다
  if (min < 60) return `${min}분 뒤 알람`
  const d = new Date(at)
  const tomorrow = d.getDate() !== new Date().getDate()
  return `${tomorrow ? '내일 ' : ''}${d.getHours()}시 알람`
}

export default function DayClockHero({
  checkins = [], goals = {}, lifeStage = null, alarmHours = {}, nextAlarm = null, nowLabel = null, onTabChange,
}) {
  const minute = Math.floor(Date.now() / 60000)   // 홈은 1초마다 다시 그려진다 → 계산은 분마다만

  const data = useMemo(() => {
    // 개발 중 시간대별 모습을 확인하려고 시각을 바꿔 끼운다 (배포 빌드에서는 블록째 사라진다)
    let now = Date.now()
    if (import.meta.env.DEV) {
      const h = Number(localStorage.getItem('ogu_dev_hour') ?? NaN)
      if (Number.isFinite(h) && h >= 0 && h <= 23) {
        const d = new Date(); d.setHours(h, 30, 0, 0); now = d.getTime()
      }
    }
    const { byGroup, total } = todayTotals(checkins, now)
    const m = todayMissions(lifeStage, now)
    const log = todayLog(now)
    const hour = new Date(now).getHours()
    const result = oguScore({
      checkins, goals, now,
      missionDone: m.done.length, missionTotal: m.missions.length,
      todoDone: log.doneCount, actedOnAlarm: log.actedOnAlarm,
    })
    // 밤 띠의 제목에만 "오구 지수 NN점" 으로 쓴다 (하루를 닫는 숫자)
    const banner = bannerFor({
      now, byGroup, goals,
      missionLeft: Math.max(0, m.missions.length - m.done.length),
      score: hour >= 18 ? result.score : null,
      yesterday: yesterdayScore(now), streak: streakDays(60, now),
    })
    const axes = AXES.map(a => ({ key: a, label: AXIS_LABEL[a], min: byGroup[a] ?? 0, color: GROUPS[a].color }))
    return {
      banner, score: result.score, parts: result.done.parts,
      total, axes, other: Math.max(0, total - axes.reduce((s, a) => s + a.min, 0)),
      cells: dayCells(checkins, now), at: nowCell(now),
      nowMin: hour * 60 + new Date(now).getMinutes(),
      alarms: alarmMarks(alarmHours, now),
    }
  }, [checkins, goals, lifeStage, alarmHours, minute])

  const { banner } = data

  const go = () => {
    logEvent('time_banner_click', { slot: banner.slot })
    // 같은 화면 안의 카드로 보낼 때 — 탭을 바꾸면 안 되니 그 카드에 직접 알린다
    if (banner.tab === 'home') {
      if (banner.focus) window.dispatchEvent(new Event(`ogu:focus-${banner.focus}`))
      return
    }
    if (banner.tab) onTabChange?.(banner.tab)
  }

  return (
    <section style={{
      border: '1px solid #ECECEF', borderRadius: 24, marginBottom: 12, overflow: 'hidden',
      background: '#FFFFFF', boxShadow: '0 2px 10px rgba(255,107,44,0.10)',
    }}>
      <style>{`
        @keyframes oguBannerFlow {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes oguNowPulse { 50% { opacity: .55 } }
        @media (prefers-reduced-motion: reduce) {
          [data-ogu-banner], [data-ogu-now] { animation: none !important; }
        }
      `}</style>

      {/* 위 띠 — 시간대마다 "지금 내 숫자" 를 말한다. 닫기 버튼은 두지 않는다 */}
      <button
        data-ogu-banner
        onClick={go}
        style={{
          width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          background: `linear-gradient(110deg, ${banner.from}, ${banner.to}, ${banner.from})`,
          backgroundSize: '200% 100%',
          animation: 'oguBannerFlow 8s ease-in-out infinite',
        }}
      >
        <span style={{ fontSize: 24, flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}>
          {banner.emoji}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontSize: 15, fontWeight: 900, color: '#FFFFFF',
            letterSpacing: '-0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.18)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {banner.title}
          </span>
          <span style={{
            display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.92)', marginTop: 2,
            textShadow: '0 1px 2px rgba(0,0,0,0.15)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {banner.sub}
          </span>
        </span>
        <span style={{
          flexShrink: 0, fontSize: 11.5, fontWeight: 800, color: '#FFFFFF',
          background: 'rgba(255,255,255,0.22)', borderRadius: 999, padding: '7px 11px',
          whiteSpace: 'nowrap',
        }}>
          {banner.cta} ›
        </span>
      </button>

      <div style={{ padding: '16px 16px 12px' }}>
        {/* 시계와 세 축 — 누르면 리포트 */}
        <button
          onClick={() => onTabChange?.('reports')}
          aria-label={`오늘 기록 ${formatMinutes(data.total)}. 리포트 열기`}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, width: '100%',
            border: 0, background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <svg viewBox="0 0 200 200" aria-hidden="true" style={{ flex: '0 1 176px', minWidth: 0, display: 'block' }}>
            {data.cells.map((g, i) => (
              <path
                key={i}
                d={cellPath(i)}
                // 지나간 빈칸은 조금 진하게, 아직 오지 않은 칸은 옅게 — 하루가 얼마나 갔는지 보인다
                fill={g ? GROUPS[g].color : i <= data.at ? '#E4E4EA' : '#F6F6F8'}
              />
            ))}
            {/* 59분 알람이 켜진 시각 — 안쪽 점. 지나간 알람은 회색, 남은 알람은 주황, 다음 알람은 크게 */}
            {data.alarms.map(m => {
              const [cx, cy] = point(m.min / 4, R_IN - 6).split(' ')
              return (
                <circle
                  key={m.hour} cx={cx} cy={cy}
                  r={m.next ? 3.4 : 2.1}
                  fill={m.past ? '#CDCDD3' : '#FF6B2C'}
                />
              )
            })}
            {/* 지금 — 칸을 가로지르는 바늘. 알람 점과 헷갈리지 않게 모양을 달리한다 */}
            {[['#FFFFFF', 5.5], ['#111111', 2.4]].map(([stroke, w]) => {
              const [x1, y1] = point(data.nowMin / 4, R_IN - 1).split(' ')
              const [x2, y2] = point(data.nowMin / 4, R_OUT + 1).split(' ')
              return (
                <line
                  key={stroke} data-ogu-now={stroke === '#111111' ? '' : undefined}
                  x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={w} strokeLinecap="round"
                  style={stroke === '#111111' ? { animation: 'oguNowPulse 2s ease-in-out infinite' } : undefined}
                />
              )
            })}
            {/* 눈금 글자는 지금 점(안쪽 가장자리)과 겹치지 않게 한 칸 더 안쪽에 둔다 */}
            <text x="100" y="54" textAnchor="middle" style={{ fontSize: 11.5, fill: '#B0B0B6', fontWeight: 700 }}>0시</text>
            <text x="100" y="158" textAnchor="middle" style={{ fontSize: 11.5, fill: '#B0B0B6', fontWeight: 700 }}>12시</text>
            <text x="100" y="88" textAnchor="middle" style={{ fontSize: 13, fill: '#9A9AA0', fontWeight: 700 }}>오늘</text>
            <text x="100" y="116" textAnchor="middle" style={{
              fontSize: 23, fontWeight: 900, letterSpacing: '-0.8px',
              fill: data.total > 0 ? '#111111' : '#C7C7CC',
            }}>
              {formatMinutes(data.total)}
            </text>
            <text x="100" y="134" textAnchor="middle" style={{ fontSize: 11.5, fill: '#9A9AA0', fontWeight: 600 }}>
              {data.total > 0 ? '기록됨' : '첫 칸을 기다려요'}
            </text>
          </svg>

          <span style={{ flex: '1 0 96px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {data.axes.map(a => (
              <span key={a.key} style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: a.color, whiteSpace: 'nowrap' }}>
                  {a.label}
                </span>
                <span style={{
                  display: 'block', fontSize: 17, fontWeight: 900, marginTop: 1, whiteSpace: 'nowrap',
                  color: a.min > 0 ? '#111111' : '#C7C7CC',
                  letterSpacing: '-0.6px', fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatMinutes(a.min)}
                </span>
              </span>
            ))}
          </span>
        </button>

        {data.other > 0 && (
          <div style={{ fontSize: 11, color: '#B0B0B6', marginTop: 8 }}>
            그 외(금융·이동) {formatMinutes(data.other)} — 점수에는 넣지 않아요
          </div>
        )}

        {/* 오늘의 체크 — 이진 항목이라 정직하고, 빈 칸이 "남았다" 를 바로 말한다 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, marginTop: 12,
          paddingTop: 12, borderTop: '1px solid #F2F2F5',
        }}>
          <span style={{ fontSize: 11, color: '#9A9AA0', fontWeight: 700, flexShrink: 0 }}>체크</span>
          <span style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {CHECKS.map(it => (
              <span
                key={it.key}
                title={it.label}
                style={{
                  width: 13, height: 13, borderRadius: '50%', boxSizing: 'border-box',
                  background: data.parts[it.key] ? '#FF6B2C' : 'transparent',
                  border: data.parts[it.key] ? 'none' : '1.5px solid #D8D8DD',
                  transition: 'background .3s ease',
                }}
              />
            ))}
          </span>
          {/* 밤 띠는 제목에서 이미 점수를 말한다 → 두 번 쓰지 않는다 */}
          {!banner.showsScore && (
            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#111111', whiteSpace: 'nowrap' }}>
              오늘 {data.score}
            </span>
          )}
          <span style={{
            flex: 1, minWidth: 0, textAlign: 'right', fontSize: 11.5, color: '#9A9AA0', fontWeight: 600, marginRight: 3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {nowLabel && <>지금 <b style={{ color: '#3A3A3E', fontWeight: 800 }}>{nowLabel}</b></>}
          </span>
          {nextAlarm && (
            <button
              onClick={() => onTabChange?.('alarms')}
              style={{
                border: 0, background: 'transparent', padding: 0, cursor: 'pointer', flexShrink: 0,
                fontSize: 11.5, color: '#9A9AA0', fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >
              {/* 시계 안쪽 주황 점이 알람이라는 것을 여기서 알려준다 */}
              <span aria-hidden="true" style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: '#FF6B2C', marginRight: 5, verticalAlign: 1,
              }} />
              {alarmLabel(nextAlarm)}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
