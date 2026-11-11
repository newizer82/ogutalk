import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { openUrl } from '../../lib/capacitor'
import { logEvent } from '../../lib/firebase'
import { BANNER_KINDS, DEFAULT_BANNERS } from '../../data/banners'
import { pickBanners, hiddenToday } from '../../lib/bannerPick'

// 홈 배너 — 한 줄이 위로 말려 올라가며 바뀐다 (공지 롤링).
// 자리는 홈에 하나뿐이다. 알람 앱의 홈이 광고판이 되면 "지금 하나만"이 가려진다.
//
// 옆으로 미는 캐러셀을 버린 이유
//  - 마지막 장에서 첫 장으로 갈 때 네 장을 거꾸로 훑고 지나갔다
//  - 한 번 밀고 나면 자동 전환이 죽었다 (스크롤이 시작되면 pointerup 대신 pointercancel 이 온다)
//  - 화면 폭 전체가 5초마다 미끄러지는 건 한 줄짜리 소식에 비해 너무 큰 움직임이었다
const CACHE_KEY  = 'ogu_banners_cache'
const HIDDEN_KEY = 'ogu_banner_hidden'
const ROTATE_MS  = 5000
const SWIPE_PX   = 40

const todayKey = (now = Date.now()) => {
  const d = new Date(now)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    return Array.isArray(raw?.rows) ? raw.rows : null
  } catch { return null }
}

export default function BannerCarousel({ onTabChange }) {
  const [rows, setRows] = useState(() => readCache())
  const [hidden, setHidden] = useState(() => {
    try { return hiddenToday(localStorage.getItem(HIDDEN_KEY)) } catch { return false }
  })
  // at: 지금 장, from: 나가는 장(없으면 null), dir: 1 다음(위로) · -1 이전(아래로)
  const [roll, setRoll] = useState({ at: 0, from: null, dir: 1 })
  const [held, setHeld] = useState(false)   // 손을 대고 있는 동안은 넘기지 않는다
  const startX = useRef(null)
  const swiped = useRef(false)

  // 서버 배너 — 실패해도 내장 배너로 돌아간다 (테이블이 없어도 홈은 멀쩡해야 한다)
  useEffect(() => {
    let alive = true
    supabase.from('banners').select('*').then(({ data, error }) => {
      if (!alive || error || !Array.isArray(data)) return
      setRows(data)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows: data })) } catch {}
    })
    return () => { alive = false }
  }, [])

  const banners = useMemo(
    () => pickBanners([...(rows ?? []), ...DEFAULT_BANNERS]),
    [rows],
  )

  useEffect(() => {
    if (!hidden && banners.length) logEvent('banner_shown', { count: banners.length })
  }, [hidden, banners.length])

  if (hidden || !banners.length) return null   // 빈 껍데기를 남기지 않는다

  const n = banners.length
  const at = roll.at % n   // 서버 배너가 늦게 와서 장 수가 줄어도 범위를 벗어나지 않게
  const go = step => setRoll(r => ({ at: (r.at % n + step + n) % n, from: r.at % n, dir: step }))

  const open = (b) => {
    if (swiped.current) { swiped.current = false; return }   // 넘기려던 손짓이 누르기로 읽히지 않게
    logEvent('banner_click', { id: String(b.id), kind: b.kind })
    const action = b.action ?? (b.link_url ? { url: b.link_url } : null)
    if (action?.tab) onTabChange?.(action.tab)
    else if (action?.url) openUrl(action.url)
  }

  const hideToday = () => {
    try { localStorage.setItem(HIDDEN_KEY, todayKey()) } catch {}
    setHidden(true)
  }

  const release = () => { startX.current = null; setHeld(false) }

  const card = (b, leaving) => {
    const kind = BANNER_KINDS[b.kind] ?? BANNER_KINDS.notice
    const isEvent = b.kind === 'event'
    const name = `oguRoll${leaving ? 'Out' : 'In'}${roll.dir > 0 ? 'Up' : 'Down'}`
    return (
      <button
        key={`${leaving ? 'out' : 'in'}-${b.id}`}
        data-ogu-roll={leaving ? 'out' : 'in'}
        onClick={leaving ? undefined : () => open(b)}
        onAnimationEnd={leaving ? () => setRoll(r => ({ ...r, from: null })) : undefined}
        tabIndex={leaving ? -1 : 0}
        aria-hidden={leaving || undefined}
        style={{
          gridArea: '1 / 1', textAlign: 'left', width: '100%',
          display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
          padding: '9px 11px', minHeight: 48, boxSizing: 'border-box',
          borderRadius: 13,
          background: isEvent ? '#FF6B2C' : '#FFFFFF',
          border: `1px solid ${isEvent ? '#FF6B2C' : '#ECECEF'}`,
          pointerEvents: leaving ? 'none' : 'auto',
          // 첫 화면에서는 움직이지 않는다 — 들어오자마자 튀어 오르면 광고처럼 보인다
          animation: roll.from === null && !leaving ? 'none' : `${name} .45s cubic-bezier(.22,1,.36,1) both`,
        }}
      >
        <span style={{
          width: 28, height: 28, borderRadius: 9, flexShrink: 0,
          background: isEvent ? 'rgba(255,255,255,0.22)' : kind.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>
          {b.emoji ?? '📢'}
        </span>
        <span style={{
          flex: 1, minWidth: 0, fontSize: 13, fontWeight: 800, lineHeight: 1.35,
          color: isEvent ? '#FFFFFF' : '#111111',
        }}>
          {/* 태그는 공지·카드뉴스·서비스에만. 본문과 같은 줄에 둬서 카드 높이를 건드리지 않는다 */}
          {(b.kind === 'notice' || b.kind === 'news' || b.kind === 'store') && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 5px', borderRadius: 4, marginRight: 5,
              background: kind.tagBg, color: kind.tagText, whiteSpace: 'nowrap',
            }}>
              {kind.label}
            </span>
          )}
          {b.text}
        </span>
        <span style={{ fontSize: 15, color: isEvent ? 'rgba(255,255,255,0.85)' : '#C7C7CC', flexShrink: 0 }}>›</span>
      </button>
    )
  }

  return (
    // 배너 영역만 옅은 주황 바탕 — 흰 카드가 흰 배경에 묻히지 않게 한다
    <div style={{
      marginBottom: 12, padding: '7px 7px 3px', borderRadius: 18,
      background: '#FFF4EC', border: '1px solid #FFE1CE',
    }}>
      <style>{`
        @keyframes oguRollInUp    { from { transform: translateY(70%);  opacity: 0 } }
        @keyframes oguRollOutUp   { to   { transform: translateY(-70%); opacity: 0 } }
        @keyframes oguRollInDown  { from { transform: translateY(-70%); opacity: 0 } }
        @keyframes oguRollOutDown { to   { transform: translateY(70%);  opacity: 0 } }
        @keyframes oguDotFill     { from { transform: scaleX(0) } }
        @media (prefers-reduced-motion: reduce) {
          [data-ogu-roll] { animation: none !important; }
          [data-ogu-roll="out"] { display: none !important; }
        }
      `}</style>

      {/* 좌우로 밀면 다음·이전. 세로 스크롤은 페이지가 그대로 가져간다 (pan-y) */}
      <div
        role="region"
        aria-label="오구톡 소식"
        onPointerDown={e => { startX.current = e.clientX; swiped.current = false; setHeld(true) }}
        onPointerUp={e => {
          const dx = startX.current === null ? 0 : e.clientX - startX.current
          release()
          if (n > 1 && Math.abs(dx) > SWIPE_PX) { swiped.current = true; go(dx < 0 ? 1 : -1) }
        }}
        onPointerCancel={release}
        onPointerLeave={release}
        style={{ display: 'grid', overflow: 'hidden', borderRadius: 13, touchAction: 'pan-y' }}
      >
        {roll.from !== null && roll.from !== at && banners[roll.from] && card(banners[roll.from], true)}
        {card(banners[at], false)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '0 3px' }}>
        {banners.map((b, i) => (
          <span key={b.id} style={{
            width: i === at ? 14 : 4, height: 4, borderRadius: 2, overflow: 'hidden',
            background: i === at && n > 1 ? '#FFD3BD' : i === at ? '#FF6B2C' : '#E2E2E6',
            transition: 'width .2s ease',
          }}>
            {/* 차오르는 점이 곧 타이머다 — 다 차면 다음 장. 손을 대면 멈추고,
                "애니메이션 줄이기" 에서는 차오르지 않으니 자동으로 넘어가지도 않는다 */}
            {i === at && n > 1 && (
              <span
                key={at}
                data-ogu-roll="fill"
                onAnimationEnd={() => go(1)}
                style={{
                  display: 'block', height: '100%', background: '#FF6B2C', transformOrigin: 'left',
                  animation: `oguDotFill ${ROTATE_MS}ms linear`,
                  animationPlayState: held ? 'paused' : 'running',
                }}
              />
            )}
          </span>
        ))}
        <span style={{ flex: 1 }} />
        <button
          onClick={hideToday}
          aria-label="오늘 하루 안 보기"
          title="오늘 하루 안 보기"
          style={{
            border: 0, background: 'transparent', color: '#A0A0A6',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '2px 6px', lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
