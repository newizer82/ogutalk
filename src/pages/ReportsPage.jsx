import { useState } from 'react'
import GlassCard from '../components/common/GlassCard'
import { useWeeklyReport } from '../hooks/useWeeklyReport'
import { useCheckinReport } from '../hooks/useCheckinReport'
import { S, gradients } from '../styles/theme'

const ACTIVITY_LABEL = {
  goal_work: '🎯 목표 할일',
  study:     '📚 공부/업무',
  sns:       '📱 SNS/유튜브',
  rest:      '😴 휴식/식사',
}

const ACTIVITY_COLOR = {
  goal_work: '#8b5cf6',
  study:     '#6366f1',
  sns:       '#f59e0b',
  rest:      '#10b981',
}

const ACTIVITY_EMOJI = {
  goal_work: '🎯',
  study:     '📚',
  sns:       '📱',
  rest:      '😴',
}

const pad = n => String(n).padStart(2, '0')

export default function ReportsPage({ userId }) {
  const { reports, loading, error, generateReport } = useWeeklyReport(userId)
  const { checkins, todayCheckins, activityCount, hourCount, loading: checkinLoading } = useCheckinReport(userId)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const report = reports[selectedIdx] ?? null

  const handleGenerate = async () => {
    if (!userId) return
    const result = await generateReport()
    if (result) setSelectedIdx(0)
  }

  // ── 비로그인: 체크인 리포트만 표시 ──
  if (!userId) {
    return (
      <div>
        <CheckinReport
          checkins={checkins}
          todayCheckins={todayCheckins}
          activityCount={activityCount}
          hourCount={hourCount}
          loading={checkinLoading}
        />
        <div style={{
          marginTop: 8, padding: '14px 18px', borderRadius: 14, textAlign: 'center',
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>주간 리포트</div>
          <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.7, marginBottom: 12 }}>
            로그인하면 할일·활동 패턴을<br />자동 분석한 주간 리포트를 받을 수 있어요.
          </div>
          <div style={{ color: '#818cf8', fontSize: 12, fontWeight: 700 }}>
            🔐 설정 탭에서 로그인해주세요
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── 오구 체크인 리포트 ── */}
      <CheckinReport
        checkins={checkins}
        todayCheckins={todayCheckins}
        activityCount={activityCount}
        hourCount={hourCount}
        loading={checkinLoading}
      />

      {/* ── 주간 리포트 헤더 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1' }}>📊 주간 리포트</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>나의 한 주를 자동 분석합니다</div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            ...S.primaryBtn,
            padding: '8px 14px',
            fontSize: 12,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? '⏳ 생성 중...' : '✨ 리포트 생성'}
        </button>
      </div>

      {/* ── 에러 메시지 ── */}
      {error && (
        <div style={{
          marginBottom: 12, padding: '14px 16px', borderRadius: 14,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        }}>
          <div style={{ color: '#f87171', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>⚠️ 리포트 생성 실패</div>
          <div style={{ color: '#fca5a5', fontSize: 12, lineHeight: 1.6 }}>{error}</div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 8, lineHeight: 1.6 }}>
            💡 Supabase 대시보드 → SQL Editor에서<br />
            <code style={{ color: '#818cf8', fontSize: 10 }}>v0.7.0_weekly_reports.sql</code> 마이그레이션이 실행됐는지 확인하세요.
          </div>
        </div>
      )}

      {/* ── 리포트 없을 때 ── */}
      {!loading && reports.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>📊</div>
          <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
            아직 리포트가 없어요.<br />
            버튼을 눌러 이번 주 리포트를 생성해보세요!
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{ ...S.primaryBtn, fontSize: 14 }}
          >
            ✨ 첫 리포트 생성하기
          </button>
        </div>
      )}

      {/* ── 리포트 목록 탭 (2개 이상일 때) ── */}
      {reports.length > 1 && (
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          marginBottom: 14, paddingBottom: 4,
        }}>
          {reports.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setSelectedIdx(i)}
              style={{
                flexShrink: 0,
                padding: '5px 12px', borderRadius: 20, border: 'none',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: selectedIdx === i
                  ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                  : 'rgba(255,255,255,0.06)',
                color: selectedIdx === i ? 'white' : '#64748b',
              }}
            >
              {r.year}년 {r.week_number}주차
            </button>
          ))}
        </div>
      )}

      {/* ── 리포트 상세 ── */}
      {report && (
        <>
          {/* 주차 헤더 */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              background: gradients.logo,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {report.year}년 {report.week_number}주차
            </div>
            <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
              {report.start_date} ~ {report.end_date}
            </div>
          </div>

          {/* 완료율 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <StatBox label="할일 완료율" value={`${report.completion_rate}%`} color="#a78bfa" />
            <StatBox
              label="완료 / 전체"
              value={`${report.todos_completed} / ${report.todos_total}`}
              color="#34d399"
            />
          </div>

          {/* 활동 시간 분석 */}
          {report.activity_minutes && Object.keys(report.activity_minutes).length > 0 && (
            <GlassCard style={{ marginBottom: 12, padding: 18 }}>
              <div style={{ color: '#60a5fa', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
                📈 시간 활용 분석
              </div>
              {Object.entries(report.activity_minutes).map(([key, mins]) => {
                const hours = Math.floor(Number(mins) / 60)
                const m     = Number(mins) % 60
                const total = Object.values(report.activity_minutes).reduce(
                  (s, v) => s + Number(v), 0
                )
                const pct = total > 0 ? Math.round(Number(mins) / total * 100) : 0
                return (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#cbd5e1', fontSize: 12 }}>
                        {ACTIVITY_LABEL[key] ?? key}
                      </span>
                      <span style={{ color: '#64748b', fontSize: 11 }}>
                        {hours > 0 ? `${hours}시간 ` : ''}{m}분
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: ACTIVITY_COLOR[key] ?? '#6366f1',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </GlassCard>
          )}

          {/* 하이라이트 */}
          {report.highlights && (
            <GlassCard style={{ marginBottom: 12, padding: 20 }}>
              <div style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                ✨ 이번 주 하이라이트
              </div>
              <div style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.7 }}>
                {report.highlights}
              </div>
            </GlassCard>
          )}

          {/* 스토리 */}
          {report.story && (
            <GlassCard style={{ marginBottom: 12, padding: 20 }}>
              <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                📖 이번 주 이야기
              </div>
              <div style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.7 }}>
                {report.story}
              </div>
            </GlassCard>
          )}

          {/* 제안 */}
          {report.suggestions && (
            <GlassCard style={{
              marginBottom: 20,
              padding: 20,
              background: 'rgba(251,191,36,0.06)',
              border: '1px solid rgba(251,191,36,0.18)',
            }}>
              <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                💡 다음 주 제안
              </div>
              <div style={{ color: '#fef3c7', fontSize: 14, lineHeight: 1.7 }}>
                {report.suggestions}
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <GlassCard style={{ textAlign: 'center', padding: 14 }}>
      <div style={{ color: '#475569', fontSize: 10, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{value}</div>
    </GlassCard>
  )
}

// ── 오구 체크인 리포트 컴포넌트 ──────────────────────────────────
function CheckinReport({ checkins, todayCheckins, activityCount, hourCount, loading }) {
  const total = checkins.length
  const todayTotal = todayCheckins.length

  // 활동별 비율 계산
  const activities = Object.entries(ACTIVITY_LABEL).map(([key, label]) => ({
    key, label,
    count: activityCount[key] || 0,
    color: ACTIVITY_COLOR[key],
    emoji: ACTIVITY_EMOJI[key],
  })).sort((a, b) => b.count - a.count)

  // 24시간 시간대 활동 맵
  const maxHourCount = Math.max(...Object.values(hourCount), 1)

  return (
    <GlassCard style={{ marginBottom: 14, padding: 18 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>⏱️ 오구 체크인 기록</div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>알람 시 활동 선택 기록 (최근 1주일)</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#818cf8', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>총 체크인</div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, padding: '20px 0' }}>⏳ 불러오는 중...</div>
      )}

      {!loading && total === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏱️</div>
          <div style={{ color: '#475569', fontSize: 12 }}>
            아직 체크인 기록이 없어요.<br />
            알람이 울릴 때 활동을 선택해보세요!
          </div>
        </div>
      )}

      {!loading && total > 0 && (
        <>
          {/* 오늘 요약 */}
          {todayTotal > 0 && (
            <div style={{
              marginBottom: 14, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <div>
                <div style={{ color: '#818cf8', fontSize: 12, fontWeight: 700 }}>오늘 체크인 {todayTotal}회</div>
                <div style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>
                  {todayCheckins.map(c => ACTIVITY_EMOJI[c.activity_type] || '?').join('  ')}
                </div>
              </div>
            </div>
          )}

          {/* 활동 분포 바 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>📊 활동별 분포</div>
            {activities.map(a => {
              const pct = total > 0 ? Math.round(a.count / total * 100) : 0
              return (
                <div key={a.key} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: '#cbd5e1', fontSize: 11 }}>{a.emoji} {a.label.replace(/^[^\s]+ /, '')}</span>
                    <span style={{ color: '#64748b', fontSize: 10 }}>{a.count}회 ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 3,
                      background: a.color,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 시간대별 히트맵 (6~23시) */}
          {Object.keys(hourCount).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>🕐 시간대별 알람 활동</div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
                {Array.from({ length: 24 }, (_, h) => {
                  const cnt = hourCount[h] || 0
                  const heightPct = cnt > 0 ? Math.max(0.25, cnt / maxHourCount) : 0
                  return (
                    <div key={h} title={`${pad(h)}시 ${cnt}회`} style={{
                      flex: 1, borderRadius: 2,
                      height: cnt > 0 ? `${Math.round(heightPct * 24)}px` : '4px',
                      background: cnt > 0
                        ? `rgba(129,140,248,${0.3 + heightPct * 0.7})`
                        : 'rgba(255,255,255,0.04)',
                      transition: 'height 0.3s ease',
                    }} />
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontSize: 8, marginTop: 3 }}>
                <span>00시</span><span>12시</span><span>23시</span>
              </div>
            </div>
          )}

        </>
      )}
    </GlassCard>
  )
}
