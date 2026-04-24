import { useState, useEffect } from 'react'
import GlassCard from '../components/common/GlassCard'
import ProgressBar from '../components/common/ProgressBar'
import { OGU_TONES, QUOTES } from '../data/oguData'
import { gradients } from '../styles/theme'

const pad = n => String(n).padStart(2, '0')

export default function HomePage({
  alarmCount = 0,
  immersionSec = 0,
  todos = [],
  goals = {},            // { yearly:[], monthly:[], weekly:[], daily:[] }
  isPremium = false,
  setIsPremium,
  premiumFeatures = {},
  onTabChange,
  alarmHours = {},
  oguTone = '유쾌',
  onTestAlarm,
}) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const HH = pad(now.getHours())
  const MM = pad(now.getMinutes())
  const SS = pad(now.getSeconds())
  const weekday = ['일','월','화','수','목','금','토'][now.getDay()]
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 (${weekday})`

  // 다음 알람 계산
  const nextAlarm = (() => {
    const h = now.getHours(), m = now.getMinutes()
    for (let i = 0; i < 24; i++) {
      const ch = (h + i) % 24
      if (alarmHours[ch] && (i > 0 || m < 59)) {
        const diff = ((ch * 60 + 59) - (h * 60 + m) + 1440) % 1440
        const dh = Math.floor(diff / 60), dm = diff % 60
        return { time: `${pad(ch)}:59`, diff: dh > 0 ? `${dh}시간 ${dm}분 후` : `${dm}분 후` }
      }
    }
    return { time: '없음', diff: '' }
  })()

  // 다음 오구까지 초
  const secondsLeft = 60 - now.getSeconds() + (59 - now.getMinutes()) * 60
  const mLeft = Math.floor(secondsLeft / 60)
  const sLeft = secondsLeft % 60

  // stats
  const doneTodos    = todos.filter(t => t.completed || t.done)
  const pendingTodos = todos.filter(t => !t.completed && !t.done)
  const immMins      = Math.floor(immersionSec / 60)
  const immSecs      = Math.floor(immersionSec % 60)

  // 일간 목표
  const dailyGoals         = goals?.daily || []
  const totalDailyProgress = dailyGoals.length
    ? Math.round(dailyGoals.reduce((s, g) => s + g.progress, 0) / dailyGoals.length)
    : 0

  // 명언
  const quoteObj = QUOTES[Math.floor(now.getMinutes() / 12) % QUOTES.length]

  // ── 오늘의 기여 계산 ──
  const todayStr = new Date().toDateString()
  const todayCompletedWithGoal = todos.filter(t => {
    const isDone = t.completed || t.is_completed || t.done
    const hasGoal = !!t.goal_id
    const ts = t.updated_at || t.completed_at || t.created_at
    const isToday = ts ? new Date(ts).toDateString() === todayStr : false
    return isDone && hasGoal && isToday
  })
  const contributedGoalIds = [...new Set(todayCompletedWithGoal.map(t => t.goal_id))]
  const todayDoneCount = todayCompletedWithGoal.length
  const contributedGoalCount = contributedGoalIds.length

  return (
    <div>
      {/* ── 대형 시계 + 다음 오구 카운트다운 ── */}
      <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', lineHeight: 1, marginBottom: 4 }}>
          <span style={{ fontSize: 80, fontWeight: 900, color: '#f1f5f9', letterSpacing: -5 }}>{HH}</span>
          <span style={{ fontSize: 60, color: '#6366f1', fontWeight: 200, marginBottom: 6, marginInline: 2 }}>:</span>
          <span style={{
            fontSize: 80, fontWeight: 900, letterSpacing: -5,
            background: gradients.logo, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{MM}</span>
        </div>
        <div style={{ color: '#475569', fontSize: 12 }}>
          {dateStr} &nbsp;·&nbsp; <span style={{ color: '#64748b' }}>{SS}초</span>
        </div>

        {/* 다음 오구 카운트다운 */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 16,
          padding: '10px 20px', borderRadius: 24,
          background: 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.12))',
          border: '1px solid rgba(99,102,241,0.3)',
        }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#818cf8', fontSize: 12, fontWeight: 700 }}>
              다음 오구 · {nextAlarm.time}
            </div>
            <div style={{ color: '#475569', fontSize: 11, marginTop: 1 }}>
              {mLeft}분 {pad(sLeft)}초 후
            </div>
          </div>
          <button
            style={{
              padding: '6px 14px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
            onClick={onTestAlarm}
          >
            {OGU_TONES[oguTone]?.emoji} 테스트
          </button>
        </div>
      </div>

      {/* ── 스탯 3칸 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
        {[
          { label: '오늘 알람',  value: `${alarmCount}회`,        icon: '📢', color: '#818cf8', bar: Math.min(100, alarmCount * 10) },
          { label: '몰입 시간',  value: `${pad(immMins)}:${pad(immSecs)}`, icon: '⏱️', color: '#f59e0b', bar: Math.min(100, immMins * 5) },
          { label: '할일 완료',  value: `${doneTodos.length}/${todos.length}`, icon: '✅', color: '#34d399',
            bar: todos.length ? Math.round(doneTodos.length / todos.length * 100) : 0 },
        ].map(s => (
          <GlassCard key={s.label} style={{ textAlign: 'center', padding: '12px 6px' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ color: s.color, fontSize: 17, fontWeight: 900 }}>{s.value}</div>
            <div style={{ color: '#475569', fontSize: 9, marginTop: 2, marginBottom: 6 }}>{s.label}</div>
            <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ width: `${s.bar}%`, height: '100%', borderRadius: 2, background: s.color, opacity: 0.6 }} />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ── 오늘의 기여 카드 ── */}
      <GlassCard style={{
        marginBottom: 16,
        background: 'linear-gradient(135deg,rgba(99,102,241,0.13),rgba(139,92,246,0.10))',
        border: '1px solid rgba(139,92,246,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 14 }}>🔥</span>
          <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>오늘의 기여</span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
            목표 연결 할일 기준
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: 14,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <div style={{
              fontSize: 32, fontWeight: 900, lineHeight: 1,
              background: 'linear-gradient(135deg,#818cf8,#a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{todayDoneCount}</div>
            <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>완료한 할일</div>
          </div>
          <div style={{
            flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: 14,
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <div style={{
              fontSize: 32, fontWeight: 900, lineHeight: 1,
              background: 'linear-gradient(135deg,#a78bfa,#c084fc)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{contributedGoalCount}</div>
            <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>기여한 목표</div>
          </div>
        </div>
        <div style={{ marginTop: 10, color: '#475569', fontSize: 11, textAlign: 'center' }}>
          {todayDoneCount === 0
            ? '목표와 연결된 할일을 완료하면 여기에 기록돼요 💪'
            : contributedGoalCount > 0
              ? `${contributedGoalCount}개 목표에 진전이 있었어요 🎉`
              : `오늘 ${todayDoneCount}개 완료! 목표에 연결해보세요`}
        </div>
      </GlassCard>

      {/* ── 오늘의 목표 (일간) ── */}
      {isPremium && premiumFeatures.goals ? (
        <GlassCard style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>🎯</span>
              <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>오늘의 목표</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                일간 {dailyGoals.length}개
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#6366f1', fontSize: 13, fontWeight: 800 }}>{totalDailyProgress}%</span>
              <button
                style={{ padding: '4px 10px', borderRadius: 10, border: 'none', background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 11, cursor: 'pointer' }}
                onClick={() => onTabChange('goals')}
              >전체 →</button>
            </div>
          </div>

          <ProgressBar
            value={totalDailyProgress}
            color={totalDailyProgress >= 70 ? 'linear-gradient(90deg,#34d399,#6ee7b7)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)'}
            height={6}
          />

          <div style={{ marginTop: 14 }}>
            {dailyGoals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#475569', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
                오늘의 목표를 추가해보세요
                <br />
                <button
                  style={{ marginTop: 10, padding: '6px 14px', borderRadius: 10, border: 'none', background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 12, cursor: 'pointer' }}
                  onClick={() => onTabChange('goals')}
                >+ 목표 추가</button>
              </div>
            ) : (
              dailyGoals.slice(0, 3).map(g => (
                <div key={g.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{g.title}</span>
                    <span style={{ color: g.progress >= 100 ? '#34d399' : '#818cf8', fontSize: 12, fontWeight: 800 }}>
                      {g.progress}%
                    </span>
                  </div>
                  <ProgressBar
                    value={g.progress}
                    color={g.progress >= 100 ? 'linear-gradient(90deg,#34d399,#6ee7b7)' : g.progress >= 50 ? 'linear-gradient(90deg,#818cf8,#a78bfa)' : 'linear-gradient(90deg,#6366f1,#818cf8)'}
                  />
                </div>
              ))
            )}
            {dailyGoals.length > 3 && (
              <div style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 4, cursor: 'pointer' }} onClick={() => onTabChange('goals')}>
                + {dailyGoals.length - 3}개 더 보기
              </div>
            )}
          </div>
        </GlassCard>
      ) : (
        /* 프리미엄 잠금 목표 미리보기 */
        <GlassCard style={{ marginBottom: 16, opacity: 0.75 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>🎯 오늘의 목표</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: 'white', fontWeight: 700 }}>PRO</span>
          </div>
          {['독서 30분', '운동 1시간', '코딩 공부'].map((t, i) => (
            <div key={i} style={{ padding: '7px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <ProgressBar value={[60, 35, 80][i]} />
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{t}</div>
            </div>
          ))}
          <button
            style={{ width: '100%', marginTop: 12, padding: '8px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => setIsPremium(true)}
          >✨ 잠금 해제 · 월 2,900원</button>
        </GlassCard>
      )}

      {/* ── 오늘의 할일 미리보기 (프리미엄) ── */}
      {isPremium && premiumFeatures.todos && (
        <GlassCard style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>오늘의 할일</span>
              {pendingTodos.length > 0 && (
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(248,113,113,0.15)', color: '#f87171', fontWeight: 700 }}>
                  {pendingTodos.length}개 남음
                </span>
              )}
            </div>
            <button
              style={{ padding: '4px 10px', borderRadius: 10, border: 'none', background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 11, cursor: 'pointer' }}
              onClick={() => onTabChange('todos')}
            >전체 →</button>
          </div>

          {pendingTodos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '12px 0', color: '#34d399', fontSize: 13, fontWeight: 700 }}>
              🎉 모든 할일 완료!
            </div>
          ) : (
            pendingTodos.slice(0, 4).map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: i < Math.min(pendingTodos.length, 4) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: '1.5px solid #334155', flexShrink: 0 }} />
                <span style={{ width: 6, height: 6, borderRadius: 3, flexShrink: 0, background: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#475569' }} />
                <span style={{ color: '#e2e8f0', fontSize: 13, flex: 1 }}>{t.title || t.text}</span>
              </div>
            ))
          )}
          {pendingTodos.length > 4 && (
            <div style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 8, cursor: 'pointer' }} onClick={() => onTabChange('todos')}>
              + {pendingTodos.length - 4}개 더 보기
            </div>
          )}
        </GlassCard>
      )}

      {/* ── 업그레이드 배너 (무료) ── */}
      {!isPremium && (
        <GlassCard style={{
          marginBottom: 16,
          background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))',
          border: '1px solid rgba(99,102,241,0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>✨ 프리미엄 업그레이드</div>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 3 }}>목표·할일·키워드·특별 목소리 잠금 해제</div>
              <div style={{ color: '#818cf8', fontSize: 13, fontWeight: 800, marginTop: 4 }}>월 2,900원</div>
            </div>
            <button
              style={{ padding: '10px 16px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              onClick={() => setIsPremium(true)}
            >시작하기</button>
          </div>
        </GlassCard>
      )}

      {/* ── 오늘의 명언 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: '#334155', fontSize: 18 }}>"</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' }}>{quoteObj.text}</div>
          <div style={{ color: '#334155', fontSize: 10, marginTop: 3 }}>— {quoteObj.author}</div>
        </div>
      </div>
    </div>
  )
}
