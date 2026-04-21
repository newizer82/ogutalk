import { useState } from 'react'
import GlassCard from '../components/common/GlassCard'
import { KW_DATA, TRENDING_DATA, CATEGORY_COLOR, SENTIMENT_STYLE, KW_SUMMARIES } from '../data/oguData'
import { S } from '../styles/theme'
import { useNaverNews } from '../hooks/useNaverNews'

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

// ── 트렌딩 탭 (기존 유지)
function TrendingTab({ period }) {
  const td    = TRENDING_DATA[period]
  const cats  = Object.entries(td)
  const allHot = cats.flatMap(([cat, d]) =>
    d.items.filter(it => it.hot).map(it => ({ ...it, cat, color: d.color }))
  ).sort((a, b) => b.count - a.count)

  const top10 = cats.flatMap(([cat, d]) =>
    d.items.map(it => ({ ...it, cat, color: d.color }))
  ).sort((a, b) => b.count - a.count).slice(0, 10)
  const maxTop = top10[0]?.count || 1

  return (
    <>
      {allHot.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {allHot.map((it, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: `${it.color}20`, border: `1px solid ${it.color}50`, color: it.color,
            }}>
              🔥 {it.kw}
              <span style={{ color: '#94a3b8', fontSize: 9, fontWeight: 400 }}>{it.count}건</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {cats.map(([catName, d]) => {
          const maxC = d.items[0]?.count || 1
          return (
            <GlassCard key={catName} style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{d.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: d.color }}>{catName}</span>
              </div>
              {d.items.map((it, i) => (
                <div key={i} style={{ marginBottom: i < d.items.length - 1 ? 8 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: '#475569', fontSize: 9, fontWeight: 700, minWidth: 10 }}>#{i+1}</span>
                      <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>{it.kw}</span>
                      {it.hot && <span style={{ fontSize: 8, color: '#f59e0b' }}>🔥</span>}
                    </div>
                    <span style={{ color: it.trend >= 0 ? '#34d399' : '#f87171', fontSize: 10, fontWeight: 700 }}>
                      {it.trend >= 0 ? '▲' : '▼'}{Math.abs(it.trend)}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ width: `${Math.round(it.count / maxC * 100)}%`, height: '100%', borderRadius: 2, background: d.color, opacity: 0.7 }} />
                  </div>
                  <div style={{ color: '#475569', fontSize: 9, marginTop: 2 }}>{it.count.toLocaleString()}건</div>
                </div>
              ))}
            </GlassCard>
          )
        })}
      </div>
      <GlassCard>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 14 }}>
          🏆 {period === 'weekly' ? '주간' : '월간'} 전체 HOT TOP 10
        </div>
        {top10.map((it, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: i < 3 ? '#f59e0b' : '#475569', fontSize: 11, fontWeight: 800, minWidth: 18 }}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                </span>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: `${it.color}18`, color: it.color, fontWeight: 700 }}>{it.cat}</span>
                <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>{it.kw}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: it.trend >= 0 ? '#34d399' : '#f87171', fontSize: 10, fontWeight: 700 }}>
                  {it.trend >= 0 ? '▲' : '▼'}{Math.abs(it.trend)}%
                </span>
                <span style={{ color: '#64748b', fontSize: 10 }}>{it.count.toLocaleString()}건</span>
              </div>
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ width: `${Math.round(it.count / maxTop * 100)}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg,${it.color},${it.color}88)`, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        ))}
      </GlassCard>
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
function MyKeywordsTab({ userKeywords, setUserKeywords }) {
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
    if (userKeywords.some(k => k.text === text)) return
    setUserKeywords([...userKeywords, { id: Date.now().toString(), text, ticker: '' }])
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
                onClick={e => { e.stopPropagation(); setUserKeywords(userKeywords.filter(u => u.id !== k.id)) }}
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
export default function KeywordsPage({ userKeywords, setUserKeywords, isPremium, setIsPremium }) {
  const [mainTab, setMainTab] = useState('trending')
  const [period, setPeriod]   = useState('weekly')

  if (!isPremium) return <PremiumLock onUnlock={() => setIsPremium(true)} />

  return (
    <div>
      <MainTabs value={mainTab} onChange={t => setMainTab(t)} />
      <PeriodTabs value={period} onChange={setPeriod} />

      {mainTab === 'trending'
        ? <TrendingTab period={period} />
        : <MyKeywordsTab userKeywords={userKeywords} setUserKeywords={setUserKeywords} />
      }
    </div>
  )
}
