import { useMemo } from 'react'
import { bannerFor } from '../../lib/timeBanner'
import { todayTotals } from '../../lib/alarmContext'
import { todayMissions } from '../../lib/missionStore'
import { yesterdayScore, streakDays, todayLog } from '../../lib/dayLog'
import { oguScore, STAMPS } from '../../lib/oguScore'
import { logEvent } from '../../lib/firebase'

// 홈 맨 위 — 시간대마다 "지금 내 숫자" 를 말하고, 아래 줄에 오늘의 도장을 찍는다.
// 닫기 버튼은 두지 않는다. 닫히는 순간 이 배너의 목적(복귀 유도)이 사라진다.
//
// 도장을 여기 붙인 이유: 배너("지금 내 숫자")와 도장("지금 할 수 있는 것")은
// 같은 이야기를 하고 있었다. 따로 두면 홈이 두 번 말한다. 높이는 84 → 108px.
//
// 숫자는 "오구 지수 34점" 이 아니라 "오늘 34" 로 쓴다 — "점수" 라고 적는 순간
// 덜 찬 숫자가 하루 종일 성적표가 된다. 차오르는 것은 꾸짖지 않는다.
export default function TimeBanner({ checkins = [], goals = {}, lifeStage = null, onTabChange }) {
  const data = useMemo(() => {
    // 개발 중 네 가지 상태를 확인하려고 시각을 바꿔 끼운다 (배포 빌드에서는 블록째 사라진다)
    let now = Date.now()
    if (import.meta.env.DEV) {
      const h = Number(localStorage.getItem('ogu_dev_hour'))
      if (Number.isFinite(h) && h >= 0 && h <= 23) {
        const d = new Date(); d.setHours(h, 30, 0, 0); now = d.getTime()
      }
    }
    const { byGroup } = todayTotals(checkins, now)
    const m = todayMissions(lifeStage, now)
    const log = todayLog(now)
    const hour = new Date(now).getHours()
    // 이제 하루 종일 계산한다 — 도장과 "오늘 NN" 이 차오르는 걸 보여줘야 하므로.
    // 다만 밤 배너의 제목에만 "오구 지수 NN점" 으로 쓴다 (하루를 닫는 숫자).
    const result = oguScore({
      checkins, goals, now,
      missionDone: m.done.length, missionTotal: m.missions.length,
      todoDone: log.doneCount, actedOnAlarm: log.actedOnAlarm,
    })
    const banner = bannerFor({
      now, byGroup, goals,
      missionLeft: Math.max(0, m.missions.length - m.done.length),
      score: hour >= 18 ? result.score : null,
      yesterday: yesterdayScore(now), streak: streakDays(60, now),
    })
    return { ...banner, score: result.score, parts: result.done.parts }
  }, [checkins, goals, lifeStage])

  const go = () => {
    logEvent('time_banner_click', { slot: data.slot })
    // 같은 화면 안의 카드로 보낼 때 — 탭을 바꾸면 안 되니 그 카드에 직접 알린다.
    // (예전엔 tab === 'home' 을 그냥 걸러내서 "미션 보기" 가 아무 일도 하지 않았다)
    if (data.tab === 'home') {
      if (data.focus) window.dispatchEvent(new Event(`ogu:focus-${data.focus}`))
      return
    }
    if (data.tab) onTabChange?.(data.tab)
  }

  return (
    <button
      onClick={go}
      style={{
        width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
        borderRadius: 20, padding: '12px 16px', marginBottom: 12, height: 108,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 9,
        overflow: 'hidden', boxSizing: 'border-box',
        background: `linear-gradient(110deg, ${data.from}, ${data.to}, ${data.from})`,
        backgroundSize: '200% 100%',
        animation: 'oguBannerFlow 8s ease-in-out infinite',
        boxShadow: '0 2px 10px rgba(255,107,44,0.18)',
      }}
    >
      <style>{`
        @keyframes oguBannerFlow {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          button[data-ogu-banner] { animation: none !important; }
        }
      `}</style>
      <span style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%' }}>
      <span style={{ fontSize: 26, flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}>
        {data.emoji}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block', fontSize: 15, fontWeight: 900, color: '#FFFFFF',
          letterSpacing: '-0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.18)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {data.title}
        </span>
        <span style={{
          display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.92)', marginTop: 3,
          textShadow: '0 1px 2px rgba(0,0,0,0.15)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {data.sub}
        </span>
      </span>
      <span style={{
        flexShrink: 0, fontSize: 11.5, fontWeight: 800, color: '#FFFFFF',
        background: 'rgba(255,255,255,0.22)', borderRadius: 999, padding: '7px 11px',
        whiteSpace: 'nowrap',
      }}>
        {data.cta} ›
      </span>
      </span>

      {/* 오늘의 도장 — 이진 항목이라 정직하고, 빈 칸이 "남았다" 를 바로 말한다 */}
      <span style={{
        display: 'flex', alignItems: 'center', gap: 7, width: '100%',
        paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.25)',
      }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.92)', fontWeight: 700, flexShrink: 0 }}>
          도장
        </span>
        <span style={{ display: 'flex', gap: 5 }}>
          {STAMPS.map(it => (
            <span
              key={it.key}
              title={it.label}
              style={{
                width: 13, height: 13, borderRadius: '50%',
                background: data.parts[it.key] ? '#FFFFFF' : 'transparent',
                border: data.parts[it.key] ? 'none' : '1.5px solid rgba(255,255,255,0.55)',
                boxSizing: 'border-box', transition: 'background .3s ease',
              }}
            />
          ))}
        </span>
        <span style={{ flex: 1 }} />
        {/* 밤 배너는 제목에서 이미 점수를 말한다 → 두 번 쓰지 않는다 */}
        {!data.showsScore && (
          <span style={{
            fontSize: 11.5, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(0,0,0,0.15)',
          }}>
            오늘 {data.score}
          </span>
        )}
      </span>
    </button>
  )
}
