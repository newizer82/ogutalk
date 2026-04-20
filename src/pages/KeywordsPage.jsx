import { useState } from 'react'
import GlassCard from '../components/common/GlassCard'
import { KW_DATA, TRENDING_DATA, CATEGORY_COLOR, SENTIMENT_STYLE, KW_SUMMARIES } from '../data/oguData'
import { S } from '../styles/theme'

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

// 상단 메인 탭 + 기간 탭
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

// ── 트렌딩 분석 탭
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
      {/* 🔥 핫 키워드 배지 */}
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

      {/* 분야별 2×2 그리드 */}
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

      {/* HOT TOP 10 */}
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

// ── 내 키워드 상세 뷰
function KeywordDetail({ kw, period, onBack }) {
  const p   = kw[period]
  const cat = CATEGORY_COLOR[kw.category] || '#818cf8'
  const posN = p.headlines.filter(h => h.sentiment === 'positive').length
  const negN = p.headlines.filter(h => h.sentiment === 'negative').length
  const neuN = p.headlines.filter(h => h.sentiment === 'neutral').length
  const tot  = p.headlines.length

  return (
    <>
      <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#818cf8', fontSize: 13, cursor: 'pointer', marginBottom: 14, padding: 0 }}
        onClick={onBack}>← 목록으로</button>

      <GlassCard style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#f1f5f9' }}>{kw.keyword}</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: `${cat}22`, border: `1px solid ${cat}44`, color: cat }}>{kw.category}</span>
            </div>
            {kw.ticker !== 'PERSON' && kw.ticker !== 'SECTOR' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>{kw.price}</span>
                <span style={{ color: kw.pos ? '#34d399' : '#f87171', fontSize: 13, fontWeight: 700 }}>{kw.chg}</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: p.trend >= 0 ? '#34d399' : '#f87171', fontSize: 22, fontWeight: 900 }}>
              {p.trend >= 0 ? '▲' : '▼'}{Math.abs(p.trend)}%
            </div>
            <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{period === 'weekly' ? '주간' : '월간'} 트렌드</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
          {[
            { label: '언급량', value: `${p.count}건`, color: cat },
            { label: '중요도', value: `${p.importance}점`, color: '#f59e0b' },
            { label: '감성지수', value: posN > negN ? '긍정 우세' : '부정 우세', color: posN > negN ? '#34d399' : '#f87171' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ color: s.color, fontSize: 13, fontWeight: 800 }}>{s.value}</div>
              <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 감성 분포 바 */}
      <GlassCard style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 10 }}>📊 뉴스 감성 분포</div>
        <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${posN/tot*100}%`, background: '#34d399' }} />
          <div style={{ width: `${neuN/tot*100}%`, background: '#94a3b8' }} />
          <div style={{ width: `${negN/tot*100}%`, background: '#f87171' }} />
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[['긍정','#34d399',posN],['중립','#94a3b8',neuN],['부정','#f87171',negN]].map(([l,c,n]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: c }} />
              <span style={{ color: '#94a3b8', fontSize: 11 }}>{l} {n}건</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 10 }}>
        📰 헤드라인 뉴스 요약 ({period === 'weekly' ? '이번 주' : '이번 달'})
      </div>
      {p.headlines.map((h, i) => {
        const ss      = SENTIMENT_STYLE[h.sentiment]
        const summary = KW_SUMMARIES[`${kw.id}.${period}.${i}`] || null
        return (
          <GlassCard key={i} style={{ marginBottom: 10, padding: '13px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: summary ? 8 : 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, lineHeight: 1.5, marginBottom: 5 }}>{h.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#475569', fontSize: 10 }}>{h.source}</span>
                  <span style={{ color: '#334155', fontSize: 10 }}>·</span>
                  <span style={{ color: '#475569', fontSize: 10 }}>{h.date}</span>
                </div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 8, flexShrink: 0, background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color }}>
                {ss.label}
              </span>
            </div>
            {summary && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 2 }}>
                <div style={{ color: '#64748b', fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 5 }}>AI 요약</div>
                <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.7 }}>{summary}</div>
              </div>
            )}
          </GlassCard>
        )
      })}
    </>
  )
}

// ── 내 키워드 목록
function MyKeywordsTab({ userKeywords, setUserKeywords, period }) {
  const [input, setInput]       = useState('')
  const [selectedKw, setSelectedKw] = useState(null)

  const detailKw = selectedKw ? KW_DATA.find(k => k.id === selectedKw) : null
  if (detailKw) {
    return <KeywordDetail kw={detailKw} period={period} onBack={() => setSelectedKw(null)} />
  }

  return (
    <>
      <GlassCard style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 10 }}>🔖 내 관심 키워드</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input type="text" placeholder="키워드 추가 (예: 현대차, 금리…)" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && input.trim()) {
                setUserKeywords([...userKeywords, { id: Date.now().toString(), text: input.trim(), ticker: '' }])
                setInput('')
              }
            }}
            style={{ ...S.input, flex: 1 }} />
          <button style={{ ...S.accentSmallBtn, whiteSpace: 'nowrap' }}
            onClick={() => {
              if (input.trim()) {
                setUserKeywords([...userKeywords, { id: Date.now().toString(), text: input.trim(), ticker: '' }])
                setInput('')
              }
            }}>+ 추가</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {userKeywords.map(k => (
            <span key={k.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 16, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 12 }}>
              {k.text}
              <span onClick={() => setUserKeywords(userKeywords.filter(u => u.id !== k.id))}
                style={{ color: '#475569', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>×</span>
            </span>
          ))}
        </div>
      </GlassCard>

      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>
        탭하면 헤드라인 뉴스 + AI 요약을 볼 수 있습니다
      </div>

      {KW_DATA.map(kw => {
        const p       = kw[period]
        const cat     = CATEGORY_COLOR[kw.category] || '#818cf8'
        const posCount = p.headlines.filter(h => h.sentiment === 'positive').length
        const negCount = p.headlines.filter(h => h.sentiment === 'negative').length
        const dominant = posCount > negCount ? '긍정' : negCount > posCount ? '부정' : '중립'
        const domColor = posCount > negCount ? '#34d399' : negCount > posCount ? '#f87171' : '#94a3b8'
        return (
          <GlassCard key={kw.id} style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => setSelectedKw(kw.id)}>
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
                <div style={{ color: '#475569', fontSize: 10, marginTop: 4 }}>+ {p.headlines.length - 2}개 더 보기 →</div>
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
        : <MyKeywordsTab userKeywords={userKeywords} setUserKeywords={setUserKeywords} period={period} />
      }
    </div>
  )
}
