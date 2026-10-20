import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { openUrl } from '../../lib/capacitor'
import { logEvent } from '../../lib/firebase'
import { BANNER_KINDS, DEFAULT_BANNERS } from '../../data/banners'
import { pickBanners, hiddenToday } from '../../lib/bannerPick'

// 홈 배너 — 좌우 스와이프 + 5초 자동 전환.
// 자리는 홈에 하나뿐이다. 알람 앱의 홈이 광고판이 되면 "지금 하나만"이 가려진다.
const CACHE_KEY  = 'ogu_banners_cache'
const HIDDEN_KEY = 'ogu_banner_hidden'
const ROTATE_MS  = 5000

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
  const railRef = useRef(null)
  const pausedRef = useRef(false)

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

  // 자동 전환 — 손을 대면 멈추고, "애니메이션 줄이기" 설정이면 아예 돌리지 않는다
  useEffect(() => {
    if (hidden || banners.length < 2) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduce) return
    const id = setInterval(() => {
      const el = railRef.current
      if (!el || pausedRef.current) return
      const w = el.clientWidth + 10
      const next = Math.round(el.scrollLeft / w) + 1
      el.scrollTo({ left: (next >= banners.length ? 0 : next) * w, behavior: 'smooth' })
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [hidden, banners.length])

  const [index, setIndex] = useState(0)
  const onScroll = () => {
    const el = railRef.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / (el.clientWidth + 10)))
  }

  useEffect(() => {
    if (!hidden && banners.length) logEvent('banner_shown', { count: banners.length })
  }, [hidden, banners.length])

  if (hidden || !banners.length) return null   // 빈 껍데기를 남기지 않는다

  const open = (b) => {
    logEvent('banner_click', { id: String(b.id), kind: b.kind })
    const action = b.action ?? (b.link_url ? { url: b.link_url } : null)
    if (action?.tab) onTabChange?.(action.tab)
    else if (action?.url) openUrl(action.url)
  }

  const hideToday = () => {
    try { localStorage.setItem(HIDDEN_KEY, todayKey()) } catch {}
    setHidden(true)
  }

  return (
    // 배너 영역만 옅은 주황 바탕 — 흰 카드가 흰 배경에 묻히지 않게 한다
    <div style={{
      marginBottom: 12, padding: '7px 7px 3px', borderRadius: 18,
      background: '#FFF4EC', border: '1px solid #FFE1CE',
    }}>
      <div
        ref={railRef}
        onScroll={onScroll}
        onPointerDown={() => { pausedRef.current = true }}
        onPointerUp={() => { pausedRef.current = false }}
        role="region"
        aria-label="오구톡 소식"
        style={{
          display: 'flex', gap: 10, overflowX: 'auto',
          scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
        }}
      >
        {banners.map(b => {
          const kind = BANNER_KINDS[b.kind] ?? BANNER_KINDS.notice
          const isEvent = b.kind === 'event'
          return (
            <button
              key={b.id}
              onClick={() => open(b)}
              style={{
                flex: '0 0 100%', scrollSnapAlign: 'center', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
                padding: '9px 11px', minHeight: 48, boxSizing: 'border-box',
                borderRadius: 13,
                background: isEvent ? '#FF6B2C' : '#FFFFFF',
                border: `1px solid ${isEvent ? '#FF6B2C' : '#ECECEF'}`,
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
                {/* 태그는 공지·카드뉴스에만. 본문과 같은 줄에 둬서 카드 높이를 건드리지 않는다 */}
                {(b.kind === 'notice' || b.kind === 'news') && (
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
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '0 3px' }}>
        {banners.map((b, i) => (
          <span key={b.id} style={{
            width: i === index ? 14 : 4, height: 4, borderRadius: 2,
            background: i === index ? '#FF6B2C' : '#E2E2E6', transition: 'width .2s ease',
          }} />
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
