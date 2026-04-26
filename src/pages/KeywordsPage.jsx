import { useState } from 'react'
import GlassCard from '../components/common/GlassCard'
import { KW_DATA, CATEGORY_COLOR, SENTIMENT_STYLE, KW_SUMMARIES } from '../data/oguData'
import { S } from '../styles/theme'
import { useNaverNews } from '../hooks/useNaverNews'
import { useTrendingData } from '../hooks/useTrendingData'

// ── 유틸
function stripHtml(str = '') {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function extractDomain(url = '') {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function formatPubDate(pubDate = '') {
  try {
    const d = new Date(pubDate)
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return pubDate }
}

// ── 프리미엄 잠금
function PremiumLock({ onUnlock }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>키워드 & 주식</div>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
        이 기능은 프리미엄 플랜에서만 사용할 수 있어요.<br />월 2,900원으로 모든 기능을 잠금 해제하세요.
      </div>
      <button style={{ ...S.primaryBtn, width: 'auto', padding: '12px 28px' }} onClick={onUnlock}>
        ✨ 프리미엄 시작하기
      </button>
    </div>
  )
}

// ── 탭 컴포넌트
function MainTabs({ value, onChange }) {
  return (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 }}>
      {[['trending','📊 트렌딩 분석'],['mine','🔍 내 키워드']].map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
          background: value === id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
          color: value === id ? '#fff' : '#64748b', transition: 'all 0.2s',
        }}>{label}</button>
      ))}
    </div>
  )
}

function PeriodTabs({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
      {[['weekly','📅 주간'],['monthly','📆 월간']].map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          border: `1px solid ${value === id ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
          background: value === id ? 'rgba(99,102,241,0.2)' : 'transparent',
          color: value === id ? '#818cf8' : '#94a3b8',
        }}>{label}</button>
      ))}
    </div>
  )
}

// ── SVG 도넛 차트
function DonutChart({ segments, size = 120 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38, stroke = size * 0.14
  let cumulative = 0
  const total = segments.reduce((s, sg) => s + sg.value, 0) || 1
  const circumference = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      {segments.map((sg, i) => {
        const pct    = sg.value / total
        const offset = circumference * (1 - cumulative)
        const dash   = circumference * pct
        cumulative  += pct
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={sg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.8s ease' }}
          />
        )
      })}
    </svg>
  )
}

// ── 레이더(거미줄) 차트 SVG
function RadarChart({ data, size = 200 }) {
  const cx = size / 2, cy = size / 2, maxR = size * 0.38
  const n = data.length
  if (!n) return null
  const angles = data.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2)
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const pts = data.map((d, i) => {
    const ratio = d.value / maxVal
    return {
      x: cx + maxR * ratio * Math.cos(angles[i]),
      y: cy + maxR * ratio * Math.sin(angles[i]),
      lx: cx + (maxR + 18) * Math.cos(angles[i]),
      ly: cy + (maxR + 18) * Math.sin(angles[i]),
    }
  })
  const polygon = pts.map(p => `${p.x},${p.y}`).join(' ')
  // 배경 격자 3단계
  const grids = [0.33, 0.66, 1].map(ratio =>
    data.map((_, i) => `${cx + maxR * ratio * Math.cos(angles[i])},${cy + maxR * ratio * Math.sin(angles[i])}`).join(' ')
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {grids.map((g, i) => <polygon key={i} points={g} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />)}
      {data.map((_, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + maxR * Math.cos(angles[i])} y2={cy + maxR * Math.sin(angles[i])}
          stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      <polygon points={polygon} fill="rgba(99,102,241,0.18)" stroke="#818cf8" strokeWidth={1.5} />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={data[i].color} />
      ))}
      {pts.map((p, i) => (
        <text key={i} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle"
          fontSize={9} fill={data[i].color} fontWeight="700">
          {data[i].label}
        </text>
      ))}
    </svg>
  )
}

// ── 트렌딩 탭 (인포그래픽 버전)
function TrendingTab({ period, trendData, trendLoading, trendUpdatedAt, isLive }) {
  const [selectedCat, setSelectedCat] = useState('전체')
  const td   = trendData[period] ?? {}
  const cats = Object.entries(td)

  const allItems = cats.flatMap(([cat, d]) =>
    d.items.map(it => ({ ...it, cat, color: d.color, icon: d.icon }))
  ).sort((a, b) => b.count - a.count)

  const hotItems = allItems.filter(it => it.hot)

  // 카테고리 선택 필터
  const catKeys = ['전체', ...cats.map(([c]) => c)]
  const filteredCat = selectedCat === '전체' ? null : td[selectedCat]
  const filteredItems = filteredCat
    ? filteredCat.items.map(it => ({ ...it, cat: selectedCat, color: filteredCat.color, icon: filteredCat.icon }))
    : allItems.slice(0, 10)
  const maxCount = filteredItems[0]?.count || 1

  // 도넛 차트용 세그먼트 (카테고리별 총합)
  const donutSegs = cats.map(([cat, d]) => ({
    label: cat, color: d.color,
    value: d.items.reduce((s, it) => s + it.count, 0),
  }))
  const totalCount = donutSegs.reduce((s, sg) => s + sg.value, 0) || 1

  // 레이더 차트용 데이터
  const radarData = cats.map(([cat, d]) => ({
    label: cat, color: d.color,
    value: d.items.reduce((s, it) => s + it.count, 0),
  }))

  return (
    <>
      {/* 상태 표시 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
          {isLive ? '📡 실시간' : trendLoading ? '🔄 로딩 중' : '📦 샘플 데이터'}
        </span>
        {isLive && trendUpdatedAt && (
          <span style={{ color: '#475569', fontSize: 10 }}>
            {new Date(trendUpdatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트
          </span>
        )}
      </div>

      {/* ── 카테고리 선택 칩 */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
        {catKeys.map(cat => {
          const isActive = selectedCat === cat
          const catColor = cat === '전체' ? '#818cf8' : (td[cat]?.color || '#818cf8')
          return (
            <button key={cat} onClick={() => setSelectedCat(cat)} style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: `1px solid ${isActive ? catColor : 'rgba(255,255,255,0.1)'}`,
              background: isActive ? `${catColor}22` : 'transparent',
              color: isActive ? catColor : '#64748b', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}>
              {cat === '전체' ? '🌐 전체' : `${td[cat]?.icon || ''} ${cat}`}
            </button>
          )
        })}
      </div>

      {/* ── 전체 보기: 도넛 + 레이더 인포그래픽 */}
      {selectedCat === '전체' && (
        <>
          {/* 도넛 + 카테고리 범례 */}
          <GlassCard style={{ marginBottom: 12, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 14 }}>
              📊 카테고리별 관심도 분포
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flexShrink: 0 }}>
                <DonutChart segments={donutSegs} size={110} />
              </div>
              <div style={{ flex: 1 }}>
                {donutSegs.map((sg, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: sg.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>{sg.label}</span>
                        <span style={{ color: sg.color, fontSize: 12, fontWeight: 800 }}>
                          {Math.round(sg.value / totalCount * 100)}%
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginTop: 4 }}>
                        <div style={{ width: `${Math.round(sg.value / totalCount * 100)}%`, height: '100%', borderRadius: 2, background: sg.color, transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* 레이더 차트 */}
          <GlassCard style={{ marginBottom: 12, padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8, textAlign: 'left' }}>
              🕸️ 카테고리 균형 지수
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={radarData} size={190} />
            </div>
          </GlassCard>

          {/* 🔥 HOT 키워드 버블 */}
          {hotItems.length > 0 && (
            <GlassCard style={{ marginBottom: 12, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}>
                🔥 지금 뜨는 키워드
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hotItems.map((it, i) => {
                  const scale = 0.8 + (it.count / (hotItems[0]?.count || 1)) * 0.5
                  return (
                    <span key={i} style={{
                      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                      padding: '8px 14px', borderRadius: 16, fontSize: Math.round(11 * scale),
                      fontWeight: 800, background: `${it.color}20`,
                      border: `1px solid ${it.color}60`, color: it.color,
                      lineHeight: 1.4,
                    }}>
                      {it.kw}
                      <span style={{ fontSize: 9, fontWeight: 400, color: '#94a3b8', marginTop: 2 }}>
                        ▲{it.trend}% · {it.count}건
                      </span>
                    </span>
                  )
                })}
              </div>
            </GlassCard>
          )}

          {/* TOP 10 전체 */}
          <GlassCard style={{ marginBottom: 12, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 14 }}>
              🏆 {period === 'weekly' ? '주간' : '월간'} TOP 10
            </div>
            {filteredItems.map((it, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: i < 3 ? '#f59e0b' : '#475569', minWidth: 22 }}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                  </span>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: `${it.color}20`, color: it.color, fontWeight: 700 }}>
                    {it.icon} {it.cat}
                  </span>
                  <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, flex: 1 }}>{it.kw}</span>
                  <span style={{ color: it.trend >= 0 ? '#34d399' : '#f87171', fontSize: 11, fontWeight: 800 }}>
                    {it.trend >= 0 ? '▲' : '▼'}{Math.abs(it.trend)}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{
                      width: `${Math.round(it.count / maxCount * 100)}%`, height: '100%', borderRadius: 3,
                      background: `linear-gradient(90deg,${it.color},${it.color}66)`,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                  <span style={{ color: '#475569', fontSize: 10, minWidth: 32, textAlign: 'right' }}>{it.count}건</span>
                </div>
              </div>
            ))}
          </GlassCard>
        </>
      )}

      {/* ── 특정 카테고리 상세 인포그래픽 */}
      {selectedCat !== '전체' && filteredCat && (
        <>
          {/* 카테고리 헤더 */}
          <GlassCard style={{ marginBottom: 12, padding: 20, background: `${filteredCat.color}10`, border: `1px solid ${filteredCat.color}30` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 32 }}>{filteredCat.icon}</div>
              <div>
                <div style={{ color: filteredCat.color, fontSize: 18, fontWeight: 900 }}>{selectedCat}</div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                  {filteredCat.items.length}개 키워드 · {period === 'weekly' ? '주간' : '월간'} 트렌드
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: filteredCat.color, fontSize: 22, fontWeight: 900 }}>
                  {filteredCat.items.reduce((s, it) => s + it.count, 0)}건
                </div>
                <div style={{ color: '#64748b', fontSize: 10 }}>총 언급량</div>
              </div>
            </div>

            {/* 미니 막대 비교 */}
            {filteredCat.items.map((it, i) => {
              const maxC = filteredCat.items[0]?.count || 1
              const pct  = Math.round(it.count / maxC * 100)
              return (
                <div key={i} style={{ marginBottom: i < filteredCat.items.length - 1 ? 14 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>#{i + 1}</span>
                      <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 800 }}>{it.kw}</span>
                      {it.hot && <span style={{ fontSize: 12 }}>🔥</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 800,
                        color: it.trend >= 0 ? '#34d399' : '#f87171',
                        background: it.trend >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                        padding: '2px 8px', borderRadius: 8,
                      }}>
                        {it.trend >= 0 ? '▲' : '▼'} {Math.abs(it.trend)}%
                      </span>
                      <span style={{ color: '#475569', fontSize: 11 }}>{it.count}건</span>
                    </div>
                  </div>
                  {/* 이중 레이어 바 */}
                  <div style={{ position: 'relative', height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${pct}%`, borderRadius: 5,
                      background: `linear-gradient(90deg, ${filteredCat.color}, ${filteredCat.color}66)`,
                      transition: 'width 0.8s ease',
                    }} />
                    <div style={{
                      position: 'absolute', left: `${pct - 2}%`, top: '50%', transform: 'translateY(-50%)',
                      width: 4, height: 4, borderRadius: '50%', background: 'white', opacity: 0.8,
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: '#475569' }}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </GlassCard>

          {/* 키워드 히트맵 */}
          <GlassCard style={{ marginBottom: 12, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 14 }}>
              🗺️ 키워드 히트맵
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {filteredCat.items.map((it, i) => {
                const maxC  = filteredCat.items[0]?.count || 1
                const alpha = 0.1 + (it.count / maxC) * 0.55
                return (
                  <div key={i} style={{
                    padding: '12px 14px', borderRadius: 14,
                    background: `${filteredCat.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`,
                    border: `1px solid ${filteredCat.color}40`,
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 800 }}>{it.kw}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: filteredCat.color, fontSize: 16, fontWeight: 900 }}>{it.count}<span style={{ fontSize: 9, marginLeft: 2 }}>건</span></span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                        color: it.trend >= 0 ? '#34d399' : '#f87171',
                        background: it.trend >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                      }}>
                        {it.trend >= 0 ? '▲' : '▼'}{Math.abs(it.trend)}%
                      </span>
                    </div>
                    {it.hot && <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>🔥 HOT</span>}
                  </div>
                )
              })}
            </div>
          </GlassCard>

          {/* 다른 카테고리 비교 */}
          <GlassCard style={{ padding: 18, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}>
              📈 전체 카테고리 비교
            </div>
            {donutSegs.map((sg, i) => {
              const isSelected = sg.label === selectedCat
              return (
                <div key={i} style={{ marginBottom: 10, opacity: isSelected ? 1 : 0.5, cursor: 'pointer' }}
                  onClick={() => setSelectedCat(sg.label)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: isSelected ? sg.color : '#94a3b8', fontSize: 12, fontWeight: isSelected ? 800 : 600 }}>
                      {isSelected ? '▶ ' : ''}{sg.label}
                    </span>
                    <span style={{ color: sg.color, fontSize: 11, fontWeight: 700 }}>
                      {Math.round(sg.value / totalCount * 100)}%
                    </span>
                  </div>
                  <div style={{ height: isSelected ? 8 : 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', transition: 'height 0.2s' }}>
                    <div style={{
                      width: `${Math.round(sg.value / totalCount * 100)}%`, height: '100%', borderRadius: 3,
                      background: sg.color, transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </GlassCard>
        </>
      )}
    </>
  )
}

// ── 네이버 뉴스 아이템
function NaverNewsItem({ item }) {
  const title  = stripHtml(item.title)
  const desc   = stripHtml(item.description || '')
  const domain = extractDomain(item.originallink || item.link)
  const date   = formatPubDate(item.pubDate)
  const url    = item.originallink || item.link

  return (
    <GlassCard style={{ marginBottom: 10, padding: '13px 14px' }}>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, lineHeight: 1.5, marginBottom: 6 }}>
          {title}
        </div>
        {desc && (
          <div style={{
            color: '#64748b', fontSize: 11, lineHeight: 1.5, marginBottom: 6,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {desc}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#475569', fontSize: 10 }}>{domain}</span>
          {domain && <span style={{ color: '#334155', fontSize: 10 }}>·</span>}
          <span style={{ color: '#475569', fontSize: 10 }}>{date}</span>
          <span style={{ color: '#6366f1', fontSize: 10, marginLeft: 'auto' }}>보기 →</span>
        </div>
      </a>
    </GlassCard>
  )
}

// ── 네이버 뉴스 상세 뷰
function NaverNewsDetail({ keyword, news, loading, error, onBack }) {
  return (
    <>
      <button
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#818cf8', fontSize: 13, cursor: 'pointer', marginBottom: 14, padding: 0 }}
        onClick={onBack}
      >
        ← 목록으로
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#f1f5f9' }}>{keyword}</span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 8,
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
          color: '#818cf8', fontWeight: 700,
        }}>
          네이버 뉴스 실시간
        </span>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
          뉴스를 검색하는 중...
        </div>
      )}

      {!loading && error && (
        <GlassCard style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
        </GlassCard>
      )}

      {!loading && !error && news.length === 0 && (
        <GlassCard style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
          <div style={{ color: '#64748b', fontSize: 13 }}>검색 결과가 없습니다.</div>
        </GlassCard>
      )}

      {!loading && news.map((item, i) => (
        <NaverNewsItem key={i} item={item} />
      ))}
    </>
  )
}

// ── 내 키워드 탭
function MyKeywordsTab({ userKeywords, onAddKeyword, onDeleteKeyword }) {
  const [input, setInput] = useState('')
  const [selectedKw, setSelectedKw] = useState(null)
  const { news, loading, error, fetchNews, clearNews } = useNaverNews()

  function handleSelect(text) {
    setSelectedKw(text)
    fetchNews(text)
  }

  function handleBack() {
    setSelectedKw(null)
    clearNews()
  }

  function addKeyword() {
    const text = input.trim()
    if (!text) return
    onAddKeyword(text)
    setInput('')
  }

  if (selectedKw) {
    return <NaverNewsDetail keyword={selectedKw} news={news} loading={loading} error={error} onBack={handleBack} />
  }

  return (
    <>
      {/* 키워드 관리 */}
      <GlassCard style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 10 }}>🔖 내 관심 키워드</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            type="text" placeholder="키워드 추가 (예: 현대차, 금리…)" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            style={{ ...S.input, flex: 1 }}
          />
          <button style={{ ...S.accentSmallBtn, whiteSpace: 'nowrap' }} onClick={addKeyword}>+ 추가</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {userKeywords.map(k => (
            <span
              key={k.id}
              onClick={() => handleSelect(k.text)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 16,
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#818cf8', fontSize: 12, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {k.text}
              <span
                onClick={e => { e.stopPropagation(); onDeleteKeyword(k.id) }}
                style={{ color: '#475569', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}
              >×</span>
            </span>
          ))}
        </div>
      </GlassCard>

      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>
        탭하면 네이버 뉴스 실시간 검색 결과를 볼 수 있습니다
      </div>

      {/* 추천 키워드 카드 (KW_DATA) */}
      {KW_DATA.map(kw => {
        const cat      = CATEGORY_COLOR[kw.category] || '#818cf8'
        const p        = kw.weekly
        const posCount = p.headlines.filter(h => h.sentiment === 'positive').length
        const negCount = p.headlines.filter(h => h.sentiment === 'negative').length
        const dominant = posCount > negCount ? '긍정' : negCount > posCount ? '부정' : '중립'
        const domColor = posCount > negCount ? '#34d399' : negCount > posCount ? '#f87171' : '#94a3b8'
        return (
          <GlassCard key={kw.id} style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => handleSelect(kw.keyword)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9' }}>{kw.keyword}</span>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 8, background: `${cat}18`, border: `1px solid ${cat}44`, color: cat, fontWeight: 700 }}>{kw.category}</span>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 8, background: `${domColor}15`, border: `1px solid ${domColor}40`, color: domColor, fontWeight: 700 }}>{dominant} 우세</span>
                </div>
                {p.headlines.slice(0, 2).map((h, i) => {
                  const ss = SENTIMENT_STYLE[h.sentiment]
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 5, background: ss.bg, color: ss.color, flexShrink: 0, marginTop: 2 }}>{ss.label}</span>
                      <span style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5 }}>{h.title}</span>
                    </div>
                  )
                })}
                <div style={{ color: '#6366f1', fontSize: 10, marginTop: 6 }}>📰 실시간 뉴스 검색 →</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                <div style={{ color: p.trend >= 0 ? '#34d399' : '#f87171', fontSize: 16, fontWeight: 900 }}>
                  {p.trend >= 0 ? '▲' : '▼'}{Math.abs(p.trend)}%
                </div>
                <div style={{ color: '#64748b', fontSize: 9, marginTop: 2 }}>{p.count}건</div>
                <div style={{ color: '#f59e0b', fontSize: 9, marginTop: 4 }}>★{p.importance}</div>
              </div>
            </div>
          </GlassCard>
        )
      })}
    </>
  )
}

// ── 메인 컴포넌트
export default function KeywordsPage({ userKeywords, onAddKeyword, onDeleteKeyword, isPremium, setIsPremium }) {
  const [mainTab, setMainTab] = useState('trending')
  const [period, setPeriod]   = useState('weekly')
  const { data: trendData, loading: trendLoading, updatedAt: trendUpdatedAt, isLive } = useTrendingData()

  if (!isPremium) return <PremiumLock onUnlock={() => setIsPremium(true)} />

  return (
    <div>
      <MainTabs value={mainTab} onChange={t => setMainTab(t)} />
      <PeriodTabs value={period} onChange={setPeriod} />

      {mainTab === 'trending'
        ? <TrendingTab period={period} trendData={trendData} trendLoading={trendLoading} trendUpdatedAt={trendUpdatedAt} isLive={isLive} />
        : <MyKeywordsTab userKeywords={userKeywords} onAddKeyword={onAddKeyword} onDeleteKeyword={onDeleteKeyword} />
      }
    </div>
  )
}
