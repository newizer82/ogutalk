import { useMemo } from 'react'
import { bannerFor } from '../../lib/timeBanner'
import { todayTotals } from '../../lib/alarmContext'
import { todayMissions } from '../../lib/missionStore'
import { yesterdayScore, streakDays, todayLog } from '../../lib/dayLog'
import { oguScore } from '../../lib/oguScore'
import { logEvent } from '../../lib/firebase'

// 홈 맨 위 — 시간대마다 "지금 내 숫자" 를 말한다.
// 닫기 버튼은 두지 않는다. 닫히는 순간 이 배너의 목적(복귀 유도)이 사라진다.
// 대신 높이를 84px 로 묶어 히어로("오늘 내 시간")를 밀어내지 않는다.
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
    // 점수는 밤에만 쓴다 — 낮에 계산해봐야 아직 덜 찬 숫자다
    const score = hour >= 18
      ? oguScore({ checkins, goals, now, missionDone: m.done.length, missionTotal: m.missions.length,
                   todoDone: log.doneCount, actedOnAlarm: log.actedOnAlarm }).score
      : null
    return bannerFor({
      now, byGroup, goals,
      missionLeft: Math.max(0, m.missions.length - m.done.length),
      score, yesterday: yesterdayScore(now), streak: streakDays(60, now),
    })
  }, [checkins, goals, lifeStage])

  const go = () => {
    logEvent('time_banner_click', { slot: data.slot })
    if (data.tab && data.tab !== 'home') onTabChange?.(data.tab)
  }

  return (
    <button
      onClick={go}
      style={{
        width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
        borderRadius: 20, padding: '14px 16px', marginBottom: 12, height: 84,
        display: 'flex', alignItems: 'center', gap: 13, overflow: 'hidden',
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
    </button>
  )
}
