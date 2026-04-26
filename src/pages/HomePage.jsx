import { useState, useEffect } from 'react'
import GlassCard from '../components/common/GlassCard'
import { OGU_TONES, QUOTES } from '../data/oguData'
import { gradients } from '../styles/theme'

const pad = n => String(n).padStart(2, '0')

// ── SVG 원형 링 진행률
function RingProgress({ value = 0, size = 72, stroke = 7, color = '#818cf8', bg = 'rgba(255,255,255,0.06)', children }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const filled = circ * Math.min(value, 100) / 100
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <foreignObject x={0} y={0} width={size} height={size}>
        <div xmlns="http://www.w3.org/1999/xhtml"
          style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      </foreignObject>
    </svg>
  )
}

// ── 알람 활성 시간대 바 (24칸 히트맵)
function AlarmTimeline({ alarmHours = {}, currentHour }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 24 }}>
      {Array.from({ length: 24 }, (_, h) => {
        const active = alarmHours[h]
        const isCur  = h === currentHour
        return (
          <div key={h} style={{
            flex: 1, borderRadius: 2,
            height: isCur ? 24 : active ? 14 : 6,
            background: isCur
              ? 'linear-gradient(180deg,#818cf8,#6366f1)'
              : active
                ? 'rgba(99,102,241,0.45)'
                : 'rgba(255,255,255,0.05)',
            transition: 'height 0.3s ease',
          }} />
        )
      })}
    </div>
  )
}

export default function HomePage({
  alarmCount = 0,
  immersionSec = 0,
  todos = [],
  goals = {},
  isPremium = false,
  setIsPremium,
  premiumFeatures = {},
  onTabChange,
  alarmHours = {},
  oguTone = '오구',
  onTestAlarm,
}) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const H = now.getHours(), M = now.getMinutes(), Sec = now.getSeconds()
  const HH = pad(H), MM = pad(M), SS = pad(Sec)
  const weekday = ['일','월','화','수','목','금','토'][now.getDay()]
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 (${weekday})`

  // 다음 알람
  const nextAlarm = (() => {
    for (let i = 0; i < 24; i++) {
      const ch = (H + i) % 24
      if (alarmHours[ch] && (i > 0 || M < 59)) {
        const diff = ((ch * 60 + 59) - (H * 60 + M) + 1440) % 1440
        const dh = Math.floor(diff / 60), dm = diff % 60
        return { time: `${pad(ch)}:59`, diffStr: dh > 0 ? `${dh}시간 ${dm}분` : `${dm}분`, diffMin: diff }
      }
    }
    return { time: '--:--', diffStr: '--', diffMin: 60 }
  })()

  const secondsLeft = (59 - M) * 60 + (60 - Sec)
  const minutesLeft = Math.floor(secondsLeft / 60)
  const secsLeft    = secondsLeft % 60

  // 링 진행률 — 현재 시각 기준 59분까지 카운트다운
  const countdownPct = Math.round((1 - secondsLeft / 3600) * 100)

  // 할일 stats
  const doneTodos    = todos.filter(t => t.completed || t.done)
  const pendingTodos = todos.filter(t => !t.completed && !t.done)
  const todoPct      = todos.length ? Math.round(doneTodos.length / todos.length * 100) : 0

  // 몰입 시간
  const immMins = Math.floor(immersionSec / 60)
  const immSecs = Math.floor(immersionSec % 60)
  const immPct  = Math.min(100, Math.round(immMins / 60 * 100))
  const immColor = immMins >= 60 ? '#ef4444' : immMins >= 30 ? '#f59e0b' : '#34d399'

  // 알람 달성률 (오늘 목표 알람 수 대비)
  const totalActiveHours = Object.values(alarmHours).filter(Boolean).length
  const alarmPct = totalActiveHours ? Math.min(100, Math.round(alarmCount / Math.max(1, H - 6) * 100)) : 0

  // 명언
  const quoteObj = QUOTES[Math.floor(now.getTime() / 60000) % QUOTES.length]

  // 우선순위 할일 (상위 3개)
  const topTodos = pendingTodos.slice(0, 3)

  return (
    <div>

      {/* ── 1. 시계 헤더 ── */}
      <div style={{ textAlign: 'center', paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', lineHeight: 1, marginBottom: 4 }}>
          <span style={{ fontSize: 76, fontWeight: 900, color: '#f1f5f9', letterSpacing: -4 }}>{HH}</span>
          <span style={{ fontSize: 52, color: '#6366f1', fontWeight: 200, marginBottom: 8, marginInline: 1 }}>:</span>
          <span style={{
            fontSize: 76, fontWeight: 900, letterSpacing: -4,
            background: gradients.logo, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{MM}</span>
        </div>
        <div style={{ color: '#475569', fontSize: 11 }}>{dateStr} · {SS}초</div>
      </div>

      {/* ── 2. 카운트다운 링 + 다음 오구 ── */}
      <GlassCard style={{ marginBottom: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* 링 */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <RingProgress value={countdownPct} size={84} stroke={8} color="#818cf8">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#818cf8', lineHeight: 1 }}>{minutesLeft}</div>
                <div style={{ fontSize: 8, color: '#475569', marginTop: 1 }}>분 후</div>
              </div>
            </RingProgress>
          </div>
          {/* 텍스트 */}
          <div style={{ flex: 1 }}>
            <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>다음 오구 알람</div>
            <div style={{
              fontSize: 28, fontWeight: 900, lineHeight: 1,
              background: gradients.logo, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {nextAlarm.time}
            </div>
            <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
              {minutesLeft}분 {pad(secsLeft)}초 남음
            </div>
          </div>
          {/* 테스트 버튼 */}
          <button onClick={onTestAlarm} style={{
            flexShrink: 0, width: 44, height: 44, borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {OGU_TONES[oguTone]?.emoji || '⏱️'}
          </button>
        </div>

        {/* 알람 시간대 타임라인 */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#475569', fontSize: 9 }}>00시</span>
            <span style={{ color: '#818cf8', fontSize: 9, fontWeight: 700 }}>현재 {HH}시</span>
            <span style={{ color: '#475569', fontSize: 9 }}>23시</span>
          </div>
          <AlarmTimeline alarmHours={alarmHours} currentHour={H} />
          <div style={{ color: '#334155', fontSize: 9, marginTop: 5, textAlign: 'center' }}>
            오늘 활성 알람 {totalActiveHours}시간대 · {alarmCount}회 울림
          </div>
        </div>
      </GlassCard>

      {/* ── 3. 스탯 3링 인포그래픽 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>

        {/* 알람 링 */}
        <GlassCard style={{ padding: '14px 8px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <RingProgress value={Math.min(100, alarmCount * 12)} size={60} stroke={6} color="#818cf8">
              <span style={{ fontSize: 14, fontWeight: 900, color: '#818cf8' }}>{alarmCount}</span>
            </RingProgress>
          </div>
          <div style={{ color: '#475569', fontSize: 9, fontWeight: 600 }}>오늘 알람</div>
          <div style={{ color: '#818cf8', fontSize: 9, marginTop: 2 }}>회</div>
        </GlassCard>

        {/* 몰입 링 */}
        <GlassCard style={{ padding: '14px 8px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <RingProgress value={immPct} size={60} stroke={6} color={immColor}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: immColor, lineHeight: 1 }}>{pad(immMins)}</div>
                <div style={{ fontSize: 7, color: '#475569' }}>:{pad(immSecs)}</div>
              </div>
            </RingProgress>
          </div>
          <div style={{ color: '#475569', fontSize: 9, fontWeight: 600 }}>몰입 시간</div>
          <div style={{ color: immColor, fontSize: 9, marginTop: 2 }}>
            {immMins >= 60 ? '⚠️ 과몰입' : immMins >= 30 ? '주의' : '양호'}
          </div>
        </GlassCard>

        {/* 할일 링 */}
        <GlassCard style={{ padding: '14px 8px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <RingProgress value={todoPct} size={60} stroke={6} color="#34d399">
              <span style={{ fontSize: 11, fontWeight: 900, color: '#34d399' }}>{todoPct}%</span>
            </RingProgress>
          </div>
          <div style={{ color: '#475569', fontSize: 9, fontWeight: 600 }}>할일 완료</div>
          <div style={{ color: '#34d399', fontSize: 9, marginTop: 2 }}>
            {doneTodos.length}/{todos.length}개
          </div>
        </GlassCard>
      </div>

      {/* ── 4. 오늘의 할일 인포그래픽 ── */}
      <GlassCard style={{ marginBottom: 14, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>✅</span>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>할일 현황</span>
            {pendingTodos.length > 0 && (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10,
                background: 'rgba(248,113,113,0.15)', color: '#f87171', fontWeight: 700 }}>
                {pendingTodos.length}개 남음
              </span>
            )}
          </div>
          <button onClick={() => onTabChange('todos')} style={{
            padding: '4px 10px', borderRadius: 10, border: 'none',
            background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 11, cursor: 'pointer',
          }}>전체 →</button>
        </div>

        {/* 완료율 그라데이션 바 */}
        <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 10 }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4,
            width: `${todoPct}%`,
            background: todoPct >= 80
              ? 'linear-gradient(90deg,#34d399,#6ee7b7)'
              : todoPct >= 50
                ? 'linear-gradient(90deg,#818cf8,#a78bfa)'
                : 'linear-gradient(90deg,#6366f1,#818cf8)',
            transition: 'width 0.8s ease',
          }} />
        </div>

        {/* 할일 리스트 */}
        {todos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#475569', fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📝</div>
            할일을 추가해보세요
            <br />
            <button onClick={() => onTabChange('todos')} style={{
              marginTop: 10, padding: '6px 16px', borderRadius: 10, border: 'none',
              background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 12, cursor: 'pointer',
            }}>+ 추가</button>
          </div>
        ) : pendingTodos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '12px 0', color: '#34d399', fontSize: 14, fontWeight: 800 }}>
            🎉 모든 할일 완료!
          </div>
        ) : (
          topTodos.map((t, i) => (
            <div key={t.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0',
              borderBottom: i < topTodos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#475569',
              }} />
              <span style={{ color: '#e2e8f0', fontSize: 13, flex: 1, lineHeight: 1.4 }}>
                {t.title || t.text}
              </span>
              {t.due_date && (
                <span style={{ color: '#475569', fontSize: 10, flexShrink: 0 }}>
                  D-{Math.ceil((new Date(t.due_date) - new Date()) / 86400000)}
                </span>
              )}
            </div>
          ))
        )}

        {pendingTodos.length > 3 && (
          <div style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 10, cursor: 'pointer' }}
            onClick={() => onTabChange('todos')}>
            + {pendingTodos.length - 3}개 더 보기
          </div>
        )}
      </GlassCard>

      {/* ── 5. 빠른 이동 버튼 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { id: 'todos',    icon: '✅', label: '할일 관리',    desc: `${pendingTodos.length}개 진행 중`,    color: '#34d399' },
          { id: 'keywords', icon: '📈', label: '트렌딩 분석',  desc: '경제·AI·사회·글로벌',               color: '#818cf8' },
          { id: 'reports',  icon: '📊', label: '주간 리포트',  desc: '성과 돌아보기',                      color: '#a78bfa' },
          { id: 'settings', icon: '⚙️', label: '알람 설정',    desc: `${totalActiveHours}시간대 활성`,     color: '#f59e0b' },
        ].map(item => (
          <button key={item.id} onClick={() => onTabChange(item.id)} style={{
            padding: '14px', borderRadius: 16, border: `1px solid ${item.color}22`,
            background: `${item.color}0d`, cursor: 'pointer', textAlign: 'left',
            transition: 'background 0.2s',
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ color: item.color, fontSize: 13, fontWeight: 700 }}>{item.label}</div>
            <div style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>{item.desc}</div>
          </button>
        ))}
      </div>

      {/* ── 6. 오늘의 명언 ── */}
      <div style={{
        padding: '14px 16px', borderRadius: 16,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
        marginBottom: 4,
      }}>
        <div style={{ color: '#334155', fontSize: 20, lineHeight: 1, marginBottom: 6 }}>"</div>
        <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.7, fontStyle: 'italic' }}>
          {quoteObj?.text || '오늘도 한 걸음씩.'}
        </div>
        <div style={{ color: '#334155', fontSize: 10, marginTop: 6, textAlign: 'right' }}>
          — {quoteObj?.author || ''}
        </div>
      </div>

    </div>
  )
}
